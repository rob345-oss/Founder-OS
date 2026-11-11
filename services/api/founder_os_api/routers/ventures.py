from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from founder_os_api.audit import record_audit
from founder_os_api.deps import get_db_session
from founder_os_api.models import Venture
from founder_os_api.schemas import VentureCreate, VentureOut
from founder_os_api.security import FounderPrincipal, get_founder_principal

router = APIRouter(prefix="/ventures", tags=["ventures"])


@router.get("", response_model=list[VentureOut])
async def list_ventures(
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> list[Venture]:
    q = await session.execute(
        select(Venture).where(Venture.owner_id == principal.user_id).order_by(Venture.name)
    )
    return list(q.scalars().all())


@router.post("", response_model=VentureOut, status_code=status.HTTP_201_CREATED)
async def create_venture(
    body: VentureCreate,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Venture:
    v = Venture(name=body.name, description=body.description, owner_id=principal.user_id)
    session.add(v)
    await session.flush()
    await record_audit(
        session,
        user_id=principal.user_id,
        action="venture.create",
        resource_type="venture",
        resource_id=v.id,
        metadata={"name": body.name},
    )
    return v


@router.get("/{venture_id}", response_model=VentureOut)
async def get_venture(
    venture_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Venture:
    v = await session.get(Venture, venture_id)
    if not v or v.owner_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Venture not found")
    return v


@router.patch("/{venture_id}", response_model=VentureOut)
async def update_venture(
    venture_id: uuid.UUID,
    body: VentureCreate,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Venture:
    v = await session.get(Venture, venture_id)
    if not v or v.owner_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Venture not found")
    v.name = body.name
    v.description = body.description
    await record_audit(
        session,
        user_id=principal.user_id,
        action="venture.update",
        resource_type="venture",
        resource_id=v.id,
    )
    return v


@router.delete("/{venture_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_venture(
    venture_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    v = await session.get(Venture, venture_id)
    if not v or v.owner_id != principal.user_id:
        raise HTTPException(status_code=404, detail="Venture not found")
    await session.delete(v)
    await record_audit(
        session,
        user_id=principal.user_id,
        action="venture.delete",
        resource_type="venture",
        resource_id=venture_id,
    )
