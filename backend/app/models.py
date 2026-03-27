from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JoinRequestStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    strengths: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owned_projects: Mapped[list[Project]] = relationship("Project", back_populates="owner")
    memberships: Mapped[list[Membership]] = relationship("Membership", back_populates="user", cascade="all, delete-orphan")
    join_requests: Mapped[list[JoinRequest]] = relationship("JoinRequest", back_populates="user", cascade="all, delete-orphan")
    announcements: Mapped[list[Announcement]] = relationship("Announcement", back_populates="author")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    short_description: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    max_members: Mapped[int] = mapped_column(Integer)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner: Mapped[User] = relationship("User", back_populates="owned_projects")
    memberships: Mapped[list[Membership]] = relationship("Membership", back_populates="project", cascade="all, delete-orphan")
    join_requests: Mapped[list[JoinRequest]] = relationship("JoinRequest", back_populates="project", cascade="all, delete-orphan")
    announcements: Mapped[list[Announcement]] = relationship("Announcement", back_populates="project", cascade="all, delete-orphan")


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_membership_project_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role_label: Mapped[str] = mapped_column(String(255), default="Członek zespołu")
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship("Project", back_populates="memberships")
    user: Mapped[User] = relationship("User", back_populates="memberships")


class JoinRequest(Base):
    __tablename__ = "join_requests"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_join_request_project_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    strengths: Mapped[str] = mapped_column(Text)
    preferred_role: Mapped[str] = mapped_column(String(255))
    status: Mapped[JoinRequestStatus] = mapped_column(SqlEnum(JoinRequestStatus), default=JoinRequestStatus.pending)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship("Project", back_populates="join_requests")
    user: Mapped[User] = relationship("User", back_populates="join_requests")


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship("Project", back_populates="announcements")
    author: Mapped[User] = relationship("User", back_populates="announcements")
