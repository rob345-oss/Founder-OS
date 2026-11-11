from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import time

import jwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from founder_os_api.deps import get_db_session
from founder_os_api.models import SCHEMA, Base


TEST_USER_ID = uuid.uuid4()
TEST_SECRET = "test-secret-key-32-bytes-minimum"


@pytest_asyncio.fixture
async def async_client(monkeypatch: pytest.MonkeyPatch) -> AsyncGenerator[AsyncClient, None]:
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setenv("FOUNDER_USER_IDS", "")
    monkeypatch.setenv("FOUNDER_EMAIL_ALLOWLIST", "founder@test.dev")
    monkeypatch.setenv("APP_ENV", "development")

    from founder_os_api import config

    config.get_settings.cache_clear()

    from founder_os_api.main import create_app

    app = create_app()

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        execution_options={"schema_translate_map": {SCHEMA: None}},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _override_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = _override_db

    monkeypatch.setattr("founder_os_api.database._engine", engine, raising=False)
    monkeypatch.setattr("founder_os_api.database._session_factory", session_factory, raising=False)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await engine.dispose()
    config.get_settings.cache_clear()


def make_token(*, sub: str | None = None, email: str | None = "founder@test.dev") -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "sub": sub or str(TEST_USER_ID),
            "email": email,
            "aud": "authenticated",
            "exp": now + 3600,
            "iat": now,
        },
        TEST_SECRET,
        algorithm="HS256",
    )
