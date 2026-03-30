# Python Chat Service (Starter)

FastAPI + Socket.IO chat microservice for USER/Admin realtime messaging with PostgreSQL persistence.

## Features
- Socket namespace: `/chat`
- Events: `join_conversation`, `leave_conversation`, `send_message`, `typing_start`, `typing_stop`
- Auth at socket connect:
  - User JWT via `auth.token`
  - Admin key via `auth.adminKey`
- Stores messages in `chat_messages`
- Updates `chat_conversations.last_message_at`
- Uses `pg8000` (pure Python) so Windows setup does not require C++ build tools

## Requirements
- Python 3.11+
- Same PostgreSQL schema currently used by Node backend

## Setup
1. Create a virtual environment and activate it.
2. Install packages:
   - `pip install -r requirements.txt`
3. Copy env template:
   - `.env.example` -> `.env`
4. Update env values (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_KEY`).

## Run
From this folder:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 5100 --reload
```

Health check:
- `GET http://localhost:5100/health`

Socket endpoint:
- `http://localhost:5100/chat`

## Frontend Wiring
Set in `frontend/.env`:

```env
VITE_CHAT_SOCKET_URL=http://localhost:5100
```

If omitted, frontend defaults to the existing API base URL.

## Notes
- This starter focuses on realtime transport and DB writes.
- Existing REST chat endpoints can stay on Node during migration.
