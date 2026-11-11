from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from founder_os_api.audit import record_audit
from founder_os_api.deps import get_db_session
from founder_os_api.security import FounderPrincipal, get_founder_principal

router = APIRouter(prefix="/platform", tags=["platform"])


@router.post("/emergency-stop")
async def emergency_stop(
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """
    Records an emergency stop request. Future: enqueue worker to pause agents / drain queue.
    """
    await record_audit(
        session,
        user_id=principal.user_id,
        action="platform.emergency_stop",
        resource_type="platform",
        resource_id=None,
    )
    return {"status": "recorded"}
