from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, projects


settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
