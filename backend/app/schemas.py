from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import JoinRequestStatus


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    bio: str | None = None
    strengths: str | None = None
    preferred_role: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=255)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    bio: str | None = Field(default=None, max_length=2000)
    strengths: str | None = Field(default=None, max_length=2000)
    preferred_role: str | None = Field(default=None, max_length=255)


class UserPublic(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProjectBase(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    short_description: str = Field(min_length=10, max_length=500)
    description: str = Field(min_length=30)
    max_members: int = Field(ge=2, le=20)
    is_open: bool = True


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    short_description: str | None = Field(default=None, min_length=10, max_length=500)
    description: str | None = Field(default=None, min_length=30)
    max_members: int | None = Field(default=None, ge=2, le=20)
    is_open: bool | None = None


class MembershipPublic(BaseModel):
    id: int
    role_label: str
    joined_at: datetime
    user: UserPublic

    model_config = ConfigDict(from_attributes=True)


class AnnouncementCreate(BaseModel):
    content: str = Field(min_length=2, max_length=2000)


class AnnouncementPublic(BaseModel):
    id: int
    content: str
    created_at: datetime
    author: UserPublic

    model_config = ConfigDict(from_attributes=True)


class JoinRequestCreate(BaseModel):
    strengths: str = Field(min_length=10, max_length=2000)
    preferred_role: str = Field(min_length=2, max_length=255)
    message: str | None = Field(default=None, max_length=2000)


class JoinRequestReview(BaseModel):
    decision: JoinRequestStatus


class JoinRequestPublic(BaseModel):
    id: int
    message: str | None
    strengths: str
    preferred_role: str
    status: JoinRequestStatus
    created_at: datetime
    reviewed_at: datetime | None
    user: UserPublic

    model_config = ConfigDict(from_attributes=True)


class ProjectListItem(BaseModel):
    id: int
    title: str
    short_description: str
    description: str
    max_members: int
    is_open: bool
    created_at: datetime
    updated_at: datetime
    owner: UserPublic
    member_count: int
    available_slots: int

    model_config = ConfigDict(from_attributes=True)


class ProjectDetail(ProjectListItem):
    memberships: list[MembershipPublic]
    announcements: list[AnnouncementPublic]
    join_requests: list[JoinRequestPublic] = Field(default_factory=list)
    can_manage: bool = False
    is_member: bool = False
    has_pending_request: bool = False


class UserProjectCollections(BaseModel):
    owned_projects: list[ProjectListItem]
    member_projects: list[ProjectListItem]


class UserJoinRequestProjectInfo(BaseModel):
    id: int
    title: str
    short_description: str
    is_open: bool
    owner: UserPublic

    model_config = ConfigDict(from_attributes=True)


class UserJoinRequestPublic(BaseModel):
    id: int
    message: str | None
    strengths: str
    preferred_role: str
    status: JoinRequestStatus
    created_at: datetime
    reviewed_at: datetime | None
    project: UserJoinRequestProjectInfo

    model_config = ConfigDict(from_attributes=True)
