import re
from typing import Any
from datetime import date, datetime

import socketio
from dotenv import load_dotenv
from fastapi import FastAPI
from jose import JWTError, jwt

from app.config import settings
from app.db import close_pool, execute, fetchrow, init_pool

load_dotenv()


def sanitize_message(message: Any) -> str:
    if not isinstance(message, str):
        return ""
    value = message.strip()
    value = re.sub(r"[<>]", "", value)
    value = re.sub(r"\s+", " ", value)
    return value[:1000]


def parse_positive_int(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None

    return parsed if parsed > 0 else None


def jsonify_row(row: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            payload[key] = value.isoformat()
        else:
            payload[key] = value
    return payload


sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.cors_origins,
)

api = FastAPI(title="Python Chat Service", version="0.1.0")


@api.on_event("startup")
async def on_startup() -> None:
    await init_pool(settings.database_url)


@api.on_event("shutdown")
async def on_shutdown() -> None:
    await close_pool()


@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@sio.event(namespace="/chat")
async def connect(sid: str, environ: dict, auth: dict | None) -> bool:
    auth = auth or {}

    if auth.get("adminKey") == settings.admin_key:
        await sio.save_session(sid, {"role": "admin"}, namespace="/chat")
        return True

    token = auth.get("token")
    if token:
        try:
            decoded = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
            user_id = decoded.get("userId")
            if user_id:
                await sio.save_session(
                    sid,
                    {"role": "user", "user_id": int(user_id)},
                    namespace="/chat",
                )
                return True
        except (JWTError, ValueError):
            return False

    return False


@sio.event(namespace="/chat")
async def disconnect(sid: str) -> None:
    return None


@sio.on("join_conversation", namespace="/chat")
async def join_conversation(sid: str, conversation_id: Any) -> None:
    parsed_id = parse_positive_int(conversation_id)
    if parsed_id is None:
        return
    room = f"conversation_{parsed_id}"
    await sio.enter_room(sid, room, namespace="/chat")


@sio.on("leave_conversation", namespace="/chat")
async def leave_conversation(sid: str, conversation_id: Any) -> None:
    parsed_id = parse_positive_int(conversation_id)
    if parsed_id is None:
        return
    room = f"conversation_{parsed_id}"
    await sio.leave_room(sid, room, namespace="/chat")


@sio.on("typing_start", namespace="/chat")
async def typing_start(sid: str, data: dict[str, Any]) -> None:
    parsed_id = parse_positive_int(data.get('conversationId'))
    if parsed_id is None:
        return
    room = f"conversation_{parsed_id}"
    await sio.emit(
        "user_typing",
        {
            "userId": data.get("userId"),
            "userName": data.get("userName"),
            "isTyping": True,
        },
        room=room,
        namespace="/chat",
        skip_sid=sid,
    )


@sio.on("typing_stop", namespace="/chat")
async def typing_stop(sid: str, data: dict[str, Any]) -> None:
    parsed_id = parse_positive_int(data.get('conversationId'))
    if parsed_id is None:
        return
    room = f"conversation_{parsed_id}"
    await sio.emit(
        "user_typing",
        {
            "userId": data.get("userId"),
            "userName": data.get("userName"),
            "isTyping": False,
        },
        room=room,
        namespace="/chat",
        skip_sid=sid,
    )


@sio.on("send_message", namespace="/chat")
async def send_message(sid: str, data: dict[str, Any]) -> None:
    session = await sio.get_session(sid, namespace="/chat")

    conversation_id = parse_positive_int(data.get("conversationId"))
    if conversation_id is None:
        await sio.emit("message_error", {"error": "Invalid conversationId"}, to=sid, namespace="/chat")
        return

    message = sanitize_message(data.get("message"))
    if not message:
        await sio.emit("message_error", {"error": "Message is required"}, to=sid, namespace="/chat")
        return

    role = session.get("role")
    if role == "admin":
        sender_type = "admin"
        sender_id = int(data.get("senderId") or 0)

        conv = await fetchrow("SELECT id FROM chat_conversations WHERE id = $1", conversation_id)
        if conv is None:
            await sio.emit("message_error", {"error": "Conversation not found"}, to=sid, namespace="/chat")
            return
    else:
        sender_type = "user"
        sender_id = int(session.get("user_id") or 0)

        conv = await fetchrow(
            "SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2",
            conversation_id,
            sender_id,
        )
        if conv is None:
            await sio.emit("message_error", {"error": "Conversation access denied"}, to=sid, namespace="/chat")
            return

    row = await fetchrow(
        """
        INSERT INTO chat_messages (conversation_id, sender_id, sender_type, message)
        VALUES ($1, $2, $3, $4)
        RETURNING id, conversation_id, sender_id, sender_type, message, is_read, created_at, updated_at,
          CASE WHEN $3 = 'admin' THEN 'Admin' ELSE (SELECT name FROM users WHERE id = $2) END AS sender_name
        """,
        conversation_id,
        sender_id,
        sender_type,
        message,
    )

    await execute(
        """
        UPDATE chat_conversations
        SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        """,
        conversation_id,
    )

    payload = jsonify_row(row)
    room = f"conversation_{conversation_id}"
    await sio.emit("new_message", payload, room=room, namespace="/chat")


app = socketio.ASGIApp(sio, api)
