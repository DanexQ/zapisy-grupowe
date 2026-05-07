from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import JoinRequest, Membership, Project, User
from app.schemas import (
    LoginRequest,
    ProjectListItem,
    TokenResponse,
    UserCreate,
    UserJoinRequestPublic,
    UserProjectCollections,
    UserPublic,
    UserUpdate,
)


router = APIRouter(prefix="/auth", tags=["auth"])


def _build_project_list_item(project: Project) -> ProjectListItem:
    member_count = len(project.memberships)
    return ProjectListItem.model_validate(
        {
            "id": project.id,
            "title": project.title,
            "short_description": project.short_description,
            "description": project.description,
            "max_members": project.max_members,
            "is_open": project.is_open,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "owner": project.owner,
            "member_count": member_count,
            "available_slots": max(project.max_members - member_count, 0),
        }
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Użytkownik z takim e-mailem już istnieje.")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        bio=payload.bio,
        strengths=payload.strengths,
        preferred_role=payload.preferred_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Niepoprawny e-mail lub hasło.")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserPublic:
    updates = payload.model_dump(exclude_unset=True)

    new_email = updates.get("email")
    if new_email and new_email != current_user.email:
        existing_user = db.query(User).filter(User.email == new_email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Użytkownik z takim adresem e-mail już istnieje.")

    for field, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        if field in {"bio", "strengths", "preferred_role"} and value == "":
            value = None
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserPublic.model_validate(current_user)


@router.get("/me/projects", response_model=UserProjectCollections)
def my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProjectCollections:
    owned_projects = (
        db.query(Project)
        .options(joinedload(Project.owner), joinedload(Project.memberships))
        .filter(Project.owner_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )

    member_projects = (
        db.query(Project)
        .options(joinedload(Project.owner), joinedload(Project.memberships))
        .join(Membership, Membership.project_id == Project.id)
        .filter(Membership.user_id == current_user.id, Project.owner_id != current_user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )

    return UserProjectCollections(
        owned_projects=[_build_project_list_item(project) for project in owned_projects],
        member_projects=[_build_project_list_item(project) for project in member_projects],
    )


@router.get("/me/requests", response_model=list[UserJoinRequestPublic])
def my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserJoinRequestPublic]:
    requests = (
        db.query(JoinRequest)
        .options(joinedload(JoinRequest.project).joinedload(Project.owner))
        .filter(JoinRequest.user_id == current_user.id)
        .order_by(JoinRequest.created_at.desc())
        .all()
    )
    return [UserJoinRequestPublic.model_validate(request_item) for request_item in requests]
