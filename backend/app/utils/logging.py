"""Logging helper that never prints secrets."""
from __future__ import annotations

import logging
import os
import re

_CONFIGURED = False
_KEY = re.compile(r"(nvapi-[A-Za-z0-9_\-]{6})[A-Za-z0-9_\-]+")


class _RedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = _KEY.sub(r"\1…", str(record.msg))
        return True


def get_logger(name: str) -> logging.Logger:
    global _CONFIGURED
    if not _CONFIGURED:
        logging.basicConfig(
            level=os.getenv("LOG_LEVEL", "INFO"),
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )
        logging.getLogger().addFilter(_RedactFilter())
        _CONFIGURED = True
    return logging.getLogger(name)
