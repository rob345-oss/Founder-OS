from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from founder_os_api.models import AuditEvent, UsageRecord


async def record_audit(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    row = AuditEvent(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    session.add(row)


async def record_usage(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    category: str,
    units: float = 1.0,
    metadata: dict[str, Any] | None = None,
) -> None:
    row = UsageRecord(
        user_id=user_id,
        category=category,
        units=units,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    session.add(row)


async def usage_tokens_estimate(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> float:
    """Sum usage records for rough cost/token tracking (extend with real pricing later)."""
    q = await session.execute(
        select(UsageRecord.units).where(UsageRecord.user_id == user_id)
    )
    rows = q.scalars().all()
    return float(sum(rows))
