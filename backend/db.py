"""MongoDB connection. Set MONGODB_URI and MONGODB_DB_NAME in backend/.env or the environment."""
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database

# Load backend/.env regardless of current working directory (uvicorn, tests, scripts).
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

# Never commit credentials in this file — use .env (gitignored) or Render env vars.
# Default is local MongoDB when MONGODB_URI is unset.
URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "garg")

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(URI, serverSelectionTimeoutMS=10_000)
    return _client


def get_db() -> Database:
    return get_client()[DB_NAME]
