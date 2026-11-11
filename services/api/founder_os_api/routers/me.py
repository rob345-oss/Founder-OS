from __future__ import annotations

from fastapi import APIRouter, Depends

from founder_os_api.schemas import FounderMe
from founder_os_api.security import FounderPrincipal, get_founder_principal

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=FounderMe)
async def read_me(principal: FounderPrincipal = Depends(get_founder_principal)) -> FounderMe:
    return FounderMe(user_id=principal.user_id, email=principal.email)
