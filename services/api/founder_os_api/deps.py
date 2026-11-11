from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from founder_os_api.database import get_session_factory, init_schema_binding


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    fac = get_session_factory()
    async with fac() as session:
        await init_schema_binding(session)
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
