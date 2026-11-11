from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    supabase_jwt_secret: str = ""
    # Comma-separated allowlist (Supabase Auth user UUIDs)
    founder_user_ids: str = ""
    # Comma-separated lowercased emails
    founder_email_allowlist: str = ""
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    # Comma-separated origins for CORS (production). Empty = allow none in non-dev.
    cors_origins: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


def parse_founder_user_ids(raw: str) -> set[str]:
    if not raw.strip():
        return set()
    return {x.strip() for x in raw.split(",") if x.strip()}


def parse_founder_emails(raw: str) -> set[str]:
    if not raw.strip():
        return set()
    return {x.strip().lower() for x in raw.split(",") if x.strip()}


def parse_cors_origins(raw: str) -> list[str]:
    if not raw.strip():
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]
