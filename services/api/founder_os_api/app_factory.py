from __future__ import annotations

"""Application factory (import without side effects for tests)."""

from founder_os_api.main import create_app

# Uvicorn: `uvicorn founder_os_api.app_factory:app`
app = create_app()
