from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from founder_os_api.audit import record_audit
from founder_os_api.deps import get_db_session
from founder_os_api.models import Project, Venture
from founder_os_api.schemas import ProjectCreate, ProjectOut
from founder_os_api.security import FounderPrincipal, get_founder_principal

router = APIRouter(prefix="/ventures/{venture_id}/projects", tags=["projects"])


async def _get_owned_venture(
    session: AsyncSession, venture_id: uuid.UUID, owner_id: uuid.UUID
) -> Venture:
    v = await session.get(Venture, venture_id)
    if not v or v.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Venture not found")
    return v


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    venture_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> list[Project]:
    await _get_owned_venture(session, venture_id, principal.user_id)
    q = await session.execute(
        select(Project).where(Project.venture_id == venture_id).order_by(Project.name)
    )
    return list(q.scalars().all())


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    venture_id: uuid.UUID,
    body: ProjectCreate,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Project:
    await _get_owned_venture(session, venture_id, principal.user_id)
    p = Project(venture_id=venture_id, name=body.name, description=body.description)
    session.add(p)
    await session.flush()
    await record_audit(
        session,
        user_id=principal.user_id,
        action="project.create",
        resource_type="project",
        resource_id=p.id,
        metadata={"venture_id": str(venture_id)},
    )
    return p


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Project:
    await _get_owned_venture(session, venture_id, principal.user_id)
    p = await session.get(Project, project_id)
    if not p or p.venture_id != venture_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    body: ProjectCreate,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Project:
    await _get_owned_venture(session, venture_id, principal.user_id)
    p = await session.get(Project, project_id)
    if not p or p.venture_id != venture_id:
        raise HTTPException(status_code=404, detail="Project not found")
    p.name = body.name
    p.description = body.description
    await record_audit(
        session,
        user_id=principal.user_id,
        action="project.update",
        resource_type="project",
        resource_id=p.id,
    )
    return p


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await _get_owned_venture(session, venture_id, principal.user_id)
    p = await session.get(Project, project_id)
    if not p or p.venture_id != venture_id:
        raise HTTPException(status_code=404, detail="Project not found")
    await session.delete(p)
    await record_audit(
        session,
        user_id=principal.user_id,
        action="project.delete",
        resource_type="project",
        resource_id=project_id,
    )
