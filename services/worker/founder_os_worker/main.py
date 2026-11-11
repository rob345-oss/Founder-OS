"""
Worker entrypoint — poll or dequeue jobs (Cloud Tasks / PubSub) in a later milestone.

For now: demonstrates standalone process and health ping to API.
"""

from __future__ import annotations

import logging
import os
import time

import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("founder_os_worker")

API_BASE = os.getenv("FO_OS_API_URL", "http://localhost:8000")


def main() -> None:
    logger.info("Founder OS worker started (stub loop)")
    while True:
        try:
            r = httpx.get(f"{API_BASE}/health", timeout=10.0)
            logger.info("API health: %s", r.status_code)
        except Exception as e:
            logger.warning("Health check failed: %s", e)
        time.sleep(60)


if __name__ == "__main__":
    main()
