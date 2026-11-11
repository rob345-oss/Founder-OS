from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from founder_os_api.audit import record_audit
from founder_os_api.deps import get_db_session
from founder_os_api.models import Project, Task, Venture
from founder_os_api.schemas import TaskCreate, TaskOut, TaskUpdate
from founder_os_api.security import FounderPrincipal, get_founder_principal

router = APIRouter(
    prefix="/ventures/{venture_id}/projects/{project_id}/tasks",
    tags=["tasks"],
)


async def _get_owned_project(
    session: AsyncSession,
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    owner_id: uuid.UUID,
) -> Project:
    v = await session.get(Venture, venture_id)
    if not v or v.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Venture not found")
    p = await session.get(Project, project_id)
    if not p or p.venture_id != venture_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> list[Task]:
    await _get_owned_project(session, venture_id, project_id, principal.user_id)
    q = await session.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.created_at.desc())
    )
    return list(q.scalars().all())


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    body: TaskCreate,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Task:
    await _get_owned_project(session, venture_id, project_id, principal.user_id)
    t = Task(
        project_id=project_id,
        title=body.title,
        description=body.description,
        status=body.status,
    )
    session.add(t)
    await session.flush()
    await record_audit(
        session,
        user_id=principal.user_id,
        action="task.create",
        resource_type="task",
        resource_id=t.id,
        metadata={"project_id": str(project_id)},
    )
    return t


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Task:
    await _get_owned_project(session, venture_id, project_id, principal.user_id)
    t = await session.get(Task, task_id)
    if not t or t.project_id != project_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    body: TaskUpdate,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> Task:
    await _get_owned_project(session, venture_id, project_id, principal.user_id)
    t = await session.get(Task, task_id)
    if not t or t.project_id != project_id:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.title is not None:
        t.title = body.title
    if body.description is not None:
        t.description = body.description
    if body.status is not None:
        t.status = body.status
    await record_audit(
        session,
        user_id=principal.user_id,
        action="task.update",
        resource_type="task",
        resource_id=t.id,
    )
    return t


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    venture_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await _get_owned_project(session, venture_id, project_id, principal.user_id)
    t = await session.get(Task, task_id)
    if not t or t.project_id != project_id:
        raise HTTPException(status_code=404, detail="Task not found")
    await session.delete(t)
    await record_audit(
        session,
        user_id=principal.user_id,
        action="task.delete",
        resource_type="task",
        resource_id=task_id,
    )
