"""MongoDB connection. Set MONGODB_URI in .env or use default for local dev."""
import os
from pymongo import MongoClient
from pymongo.database import Database

# Default URI (password 1234). Override with MONGODB_URI in .env for production.
DEFAULT_URI = "mongodb+srv://Task:1234@cluster0.lnxh7gs.mongodb.net/?retryWrites=true&w=majority"
URI = os.getenv("MONGODB_URI", DEFAULT_URI)
DB_NAME = os.getenv("MONGODB_DB_NAME", "garg")

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(URI)
    return _client


def get_db() -> Database:
    return get_client()[DB_NAME]
