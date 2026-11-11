from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from founder_os_api.config import get_settings, parse_cors_origins
from founder_os_api.routers import dashboard, health, me, platform, projects, tasks, ventures


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Optionally: verify DB connectivity
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Founder OS API", version="0.1.0", lifespan=lifespan)
    origins = ["*"] if settings.app_env == "development" else parse_cors_origins(settings.cors_origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = settings.api_prefix
    app.include_router(health.router)
    app.include_router(me.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)
    app.include_router(ventures.router, prefix=prefix)
    app.include_router(projects.router, prefix=prefix)
    app.include_router(tasks.router, prefix=prefix)
    app.include_router(platform.router, prefix=prefix)
    return app
