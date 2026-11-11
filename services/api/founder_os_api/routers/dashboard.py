from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends

from founder_os_api.deps import get_db_session
from founder_os_api.models import Project, Task, TaskStatus, Venture
from founder_os_api.schemas import DashboardSummary
from founder_os_api.security import FounderPrincipal, get_founder_principal

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    principal: FounderPrincipal = Depends(get_founder_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DashboardSummary:
    v = await session.scalar(
        select(func.count()).select_from(Venture).where(Venture.owner_id == principal.user_id)
    )
    p = await session.scalar(
        select(func.count())
        .select_from(Project)
        .join(Venture, Venture.id == Project.venture_id)
        .where(Venture.owner_id == principal.user_id)
    )
    open_q = (
        select(func.count())
        .select_from(Task)
        .join(Project, Project.id == Task.project_id)
        .join(Venture, Venture.id == Project.venture_id)
        .where(
            Venture.owner_id == principal.user_id,
            Task.status.in_([TaskStatus.backlog, TaskStatus.in_progress]),
        )
    )
    open_n = await session.scalar(open_q)
    done_q = (
        select(func.count())
        .select_from(Task)
        .join(Project, Project.id == Task.project_id)
        .join(Venture, Venture.id == Project.venture_id)
        .where(Venture.owner_id == principal.user_id, Task.status == TaskStatus.done)
    )
    done_n = await session.scalar(done_q)

    return DashboardSummary(
        venture_count=int(v or 0),
        project_count=int(p or 0),
        task_open_count=int(open_n or 0),
        task_done_count=int(done_n or 0),
    )
