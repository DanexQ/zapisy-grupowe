from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Announcement, JoinRequest, JoinRequestStatus, Membership, Project, User
from app.schemas import (
    AnnouncementCreate,
    JoinRequestCreate,
    JoinRequestPublic,
    JoinRequestReview,
    ProjectCreate,
    ProjectDetail,
    ProjectListItem,
    ProjectUpdate,
)


router = APIRouter(prefix="/projects", tags=["projects"])
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user_optional(
    token: str | None = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None

    from jose import JWTError, jwt

    from app.auth import settings

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        subject = payload.get("sub")
        if not subject:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.id == int(subject)).first()


def _member_count(project: Project) -> int:
    return len(project.memberships)


def _available_slots(project: Project) -> int:
    return max(project.max_members - _member_count(project), 0)


def _build_project_list_item(project: Project) -> ProjectListItem:
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
            "member_count": _member_count(project),
            "available_slots": _available_slots(project),
        }
    )


def _build_project_detail(project: Project, viewer: User | None) -> ProjectDetail:
    is_member = bool(viewer and any(membership.user_id == viewer.id for membership in project.memberships))
    can_manage = bool(viewer and project.owner_id == viewer.id)
    has_pending_request = bool(
        viewer and any(request.user_id == viewer.id and request.status == JoinRequestStatus.pending for request in project.join_requests)
    )
    join_requests = project.join_requests if can_manage else []

    return ProjectDetail.model_validate(
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
            "member_count": _member_count(project),
            "available_slots": _available_slots(project),
            "memberships": project.memberships,
            "announcements": sorted(project.announcements, key=lambda announcement: announcement.created_at, reverse=True),
            "join_requests": sorted(join_requests, key=lambda request: request.created_at, reverse=True),
            "can_manage": can_manage,
            "is_member": is_member,
            "has_pending_request": has_pending_request,
        }
    )


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = (
        db.query(Project)
        .options(
            joinedload(Project.owner),
            joinedload(Project.memberships).joinedload(Membership.user),
            joinedload(Project.join_requests).joinedload(JoinRequest.user),
            joinedload(Project.announcements).joinedload(Announcement.author),
        )
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono projektu.")
    return project


def _ensure_owner(project: Project, user: User) -> None:
    if project.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tylko właściciel projektu może wykonać tę akcję.")


@router.get("", response_model=list[ProjectListItem])
def list_projects(
    q: str | None = Query(default=None, min_length=1),
    min_slots: int = Query(default=1, ge=1, le=20),
    db: Session = Depends(get_db),
) -> list[ProjectListItem]:
    projects = (
        db.query(Project)
        .options(joinedload(Project.owner), joinedload(Project.memberships))
        .filter(Project.is_open.is_(True))
        .order_by(Project.created_at.desc())
        .all()
    )

    if q:
        lowered = q.lower()
        projects = [
            project
            for project in projects
            if lowered in project.title.lower()
            or lowered in project.short_description.lower()
            or lowered in project.description.lower()
            or lowered in project.owner.full_name.lower()
        ]

    visible_projects = [project for project in projects if _available_slots(project) >= min_slots]
    return [_build_project_list_item(project) for project in visible_projects]


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetail:
    project = Project(
        title=payload.title,
        short_description=payload.short_description,
        description=payload.description,
        max_members=payload.max_members,
        is_open=payload.is_open,
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()

    db.add(
        Membership(
            project_id=project.id,
            user_id=current_user.id,
            role_label="Właściciel projektu",
        )
    )
    db.commit()
    db.refresh(project)

    return _build_project_detail(_get_project_or_404(db, project.id), current_user)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> ProjectDetail:
    project = _get_project_or_404(db, project_id)
    return _build_project_detail(project, current_user)


@router.patch("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetail:
    project = _get_project_or_404(db, project_id)
    _ensure_owner(project, current_user)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)

    if project.max_members < _member_count(project):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Limit miejsc nie może być mniejszy od aktualnej liczby członków.")

    db.add(project)
    db.commit()
    return _build_project_detail(_get_project_or_404(db, project_id), current_user)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    project = _get_project_or_404(db, project_id)
    _ensure_owner(project, current_user)
    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{project_id}/requests", response_model=JoinRequestPublic, status_code=status.HTTP_201_CREATED)
def request_to_join(
    project_id: int,
    payload: JoinRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JoinRequestPublic:
    project = _get_project_or_404(db, project_id)
    if project.owner_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Właściciel jest już w projekcie.")
    if any(membership.user_id == current_user.id for membership in project.memberships):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Jesteś już członkiem tego projektu.")
    if _available_slots(project) <= 0 or not project.is_open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Projekt nie przyjmuje już nowych osób.")

    existing_request = (
        db.query(JoinRequest)
        .filter(JoinRequest.project_id == project_id, JoinRequest.user_id == current_user.id)
        .first()
    )
    if existing_request and existing_request.status == JoinRequestStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Masz już aktywne zgłoszenie do tego projektu.")

    if existing_request:
        existing_request.message = payload.message
        existing_request.strengths = payload.strengths
        existing_request.preferred_role = payload.preferred_role
        existing_request.status = JoinRequestStatus.pending
        existing_request.reviewed_at = None
        join_request = existing_request
    else:
        join_request = JoinRequest(
            project_id=project_id,
            user_id=current_user.id,
            message=payload.message,
            strengths=payload.strengths,
            preferred_role=payload.preferred_role,
        )
        db.add(join_request)

    db.commit()
    db.refresh(join_request)
    return JoinRequestPublic.model_validate(join_request)


@router.post("/{project_id}/requests/{request_id}/review", response_model=ProjectDetail)
def review_request(
    project_id: int,
    request_id: int,
    payload: JoinRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetail:
    project = _get_project_or_404(db, project_id)
    _ensure_owner(project, current_user)

    join_request = (
        db.query(JoinRequest)
        .filter(JoinRequest.id == request_id, JoinRequest.project_id == project_id)
        .first()
    )
    if not join_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono zgłoszenia.")
    if join_request.status != JoinRequestStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="To zgłoszenie zostało już rozpatrzone.")

    if payload.decision == JoinRequestStatus.accepted:
        if _available_slots(project) <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Projekt osiągnął już limit członków.")
        membership = Membership(
            project_id=project.id,
            user_id=join_request.user_id,
            role_label=join_request.preferred_role,
        )
        db.add(membership)
    elif payload.decision != JoinRequestStatus.rejected:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Można tylko zaakceptować lub odrzucić wniosek.")

    join_request.status = payload.decision
    join_request.reviewed_at = datetime.utcnow()
    db.add(join_request)
    db.commit()

    return _build_project_detail(_get_project_or_404(db, project_id), current_user)


@router.delete("/{project_id}/members/{member_id}", response_model=ProjectDetail)
def remove_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetail:
    project = _get_project_or_404(db, project_id)
    _ensure_owner(project, current_user)

    membership = (
        db.query(Membership)
        .filter(Membership.id == member_id, Membership.project_id == project_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono członka projektu.")
    if membership.user_id == project.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nie można usunąć właściciela projektu.")

    db.delete(membership)
    db.commit()
    return _build_project_detail(_get_project_or_404(db, project_id), current_user)


@router.post("/{project_id}/announcements", response_model=ProjectDetail)
def create_announcement(
    project_id: int,
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetail:
    project = _get_project_or_404(db, project_id)
    if not any(membership.user_id == current_user.id for membership in project.memberships):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tylko członkowie projektu mogą dodawać ogłoszenia.")

    announcement = Announcement(project_id=project_id, author_id=current_user.id, content=payload.content)
    db.add(announcement)
    db.commit()
    return _build_project_detail(_get_project_or_404(db, project_id), current_user)
