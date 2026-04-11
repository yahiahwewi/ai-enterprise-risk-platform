"""
CRUD operations for AI analysis results.

Uses a simple JSON file as storage (production would use MongoDB/PostgreSQL).
This keeps the AI module self-contained with zero external dependencies.
"""

import json
import os
import uuid
from datetime import datetime
from app.core.config import RESULTS_DB_PATH


def _load_db() -> list[dict]:
    if not os.path.exists(RESULTS_DB_PATH):
        return []
    with open(RESULTS_DB_PATH, "r") as f:
        return json.load(f)


def _save_db(records: list[dict]):
    os.makedirs(os.path.dirname(RESULTS_DB_PATH), exist_ok=True)
    with open(RESULTS_DB_PATH, "w") as f:
        json.dump(records, f, indent=2, default=str)


def create_result(result: dict) -> dict:
    """Store a new AI analysis result."""
    records = _load_db()
    result["id"] = str(uuid.uuid4())
    result["timestamp"] = datetime.utcnow().isoformat()
    records.append(result)
    _save_db(records)
    return result


def get_all_results(limit: int = 50, offset: int = 0) -> dict:
    """Get paginated results, newest first."""
    records = _load_db()
    records.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    total = len(records)
    page = records[offset:offset + limit]
    return {"results": page, "total": total, "has_more": offset + limit < total}


def get_results_by_user(user_id: str, limit: int = 20) -> list[dict]:
    """Filter results by user_id."""
    records = _load_db()
    filtered = [r for r in records if r.get("user_id") == user_id]
    filtered.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return filtered[:limit]


def get_results_by_company(company_id: str, limit: int = 20) -> list[dict]:
    """Filter results by company_id."""
    records = _load_db()
    filtered = [r for r in records if r.get("company_id") == company_id]
    filtered.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return filtered[:limit]
