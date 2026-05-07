import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    app.router.on_startup.clear()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    payload = {
        "email": "alice@example.com",
        "full_name": "Alice Example",
        "password": "strongpass123",
        "bio": "Studentka informatyki.",
        "strengths": "Frontend, organizacja pracy i prototypowanie.",
        "preferred_role": "Frontend Developer",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    return {
        "payload": payload,
        "token": data["access_token"],
        "user": data["user"],
    }


@pytest.fixture()
def second_user(client):
    payload = {
        "email": "bob@example.com",
        "full_name": "Bob Example",
        "password": "strongpass123",
        "bio": "Interesuje sie backendem i bazami danych.",
        "strengths": "Python, SQL, modelowanie danych.",
        "preferred_role": "Backend Developer",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    return {
        "payload": payload,
        "token": data["access_token"],
        "user": data["user"],
    }
