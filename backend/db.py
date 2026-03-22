"""MongoDB connection. Set MONGODB_URI and MONGODB_DB_NAME in .env"""
import os
from pymongo import MongoClient
from pymongo.database import Database

# Never commit credentials. Copy backend/.env.example to backend/.env and add your MongoDB URI.
# Default is local MongoDB (no credentials). For Atlas, set MONGODB_URI in .env
URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "garg")

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(URI)
    return _client


def get_db() -> Database:
    return get_client()[DB_NAME]
