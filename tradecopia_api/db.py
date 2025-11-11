import os
from datetime import datetime, timedelta, timezone
from typing import Optional, TypedDict
from uuid import uuid4
from dotenv import load_dotenv
from pymongo import MongoClient, ReturnDocument
from pymongo.collection import Collection

load_dotenv()


class VpsRecord(TypedDict, total=False):
    id: str
    email: str
    ip_address: Optional[str]
    password: Optional[str]
    create_date: datetime
    delete_date: Optional[datetime]


_UTC_MINUS_FIVE = timezone(timedelta(hours=-5))

_MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongo_uri",
)
_MONGO_DB = os.getenv("MONGO_DB", "tradecopia")
_MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "vps_records")

_client = MongoClient(_MONGO_URI, tz_aware=True)
_collection: Collection[VpsRecord] = _client[_MONGO_DB][_MONGO_COLLECTION]


def _utc_minus_five_now() -> datetime:
    return datetime.now(_UTC_MINUS_FIVE)


def _serialize(record: Optional[VpsRecord]) -> Optional[dict]:
    if not record:
        return None

    return {
        "id": record.get("id"),
        "email": record.get("email"),
        "ip_address": record.get("ip_address"),
        "password": record.get("password"),
        "create_date": (
            record.get("create_date").isoformat() if record.get("create_date") else None
        ),
        "delete_date": (
            record.get("delete_date").isoformat() if record.get("delete_date") else None
        ),
    }


def save_vps_creation(email: str, ip_address: str, password: str) -> dict:
    """Create or update a VPS record with the latest provisioning details."""
    record: VpsRecord = {
        "id": uuid4().hex,
        "email": email,
        "ip_address": ip_address,
        "password": password,
        "create_date": _utc_minus_five_now(),
        "delete_date": None,
    }

    _collection.update_one({"email": email}, {"$set": record}, upsert=True)
    persisted = _collection.find_one({"email": email})
    return _serialize(persisted)


def mark_vps_deleted(email: str) -> Optional[dict]:
    """Remove VPS credentials and mark the record as deleted."""
    updates = {
        "$set": {"delete_date": _utc_minus_five_now()},
        "$unset": {"ip_address": "", "password": ""},
        "$setOnInsert": {
            "id": uuid4().hex,
            "email": email,
            "create_date": None,
        },
    }

    updated = _collection.find_one_and_update(
        {"email": email},
        updates,
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return _serialize(updated)
