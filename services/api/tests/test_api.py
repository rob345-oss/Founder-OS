from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import make_token


@pytest.mark.asyncio
async def test_health(async_client: AsyncClient) -> None:
    r = await async_client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_me_requires_auth(async_client: AsyncClient) -> None:
    r = await async_client.get("/api/v1/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_with_token(async_client: AsyncClient) -> None:
    token = make_token()
    r = await async_client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "founder@test.dev"


@pytest.mark.asyncio
async def test_venture_and_task_flow(async_client: AsyncClient) -> None:
    token = make_token()
    h = {"Authorization": f"Bearer {token}"}

    r = await async_client.post(
        "/api/v1/ventures", json={"name": "Acme", "description": "Test"}, headers=h
    )
    assert r.status_code == 201
    vid = r.json()["id"]

    r = await async_client.get("/api/v1/dashboard/summary", headers=h)
    assert r.status_code == 200
    assert r.json()["venture_count"] == 1

    r = await async_client.post(
        f"/api/v1/ventures/{vid}/projects",
        json={"name": "Alpha", "description": None},
        headers=h,
    )
    assert r.status_code == 201
    pid = r.json()["id"]

    r = await async_client.post(
        f"/api/v1/ventures/{vid}/projects/{pid}/tasks",
        json={"title": "Ship MVP", "description": None, "status": "in_progress"},
        headers=h,
    )
    assert r.status_code == 201

    r = await async_client.get("/api/v1/dashboard/summary", headers=h)
    body = r.json()
    assert body["task_open_count"] == 1
