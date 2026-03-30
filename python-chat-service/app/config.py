import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str
    admin_key: str
    cors_origins: list[str]



def _parse_origins(value: str) -> list[str]:
    if not value:
        return ["http://localhost:5173"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


settings = Settings(
    database_url=os.getenv("DATABASE_URL", ""),
    jwt_secret=os.getenv("JWT_SECRET", "change_this"),
    admin_key=os.getenv("ADMIN_KEY", "admin-key"),
    cors_origins=_parse_origins(os.getenv("CORS_ORIGINS", "")),
)
