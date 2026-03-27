import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { projectApi } from "../api";
import { useAuth } from "../contexts/AuthContext";

function formatDate(dateString) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinForm, setJoinForm] = useState({
    strengths: "",
    preferred_role: "",
    message: ""
  });
  const [announcementContent, setAnnouncementContent] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [editMode, setEditMode] = useState(false);

  async function loadProject() {
    setLoading(true);
    try {
      const data = await projectApi.get(projectId, token);
      setProject(data);
      setEditForm({
        title: data.title,
        short_description: data.short_description,
        description: data.description,
        max_members: data.max_members,
        is_open: data.is_open
      });
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
  }, [projectId, token]);

  async function handleJoin(event) {
    event.preventDefault();
    try {
      await projectApi.join(projectId, joinForm, token);
      setJoinForm({ strengths: "", preferred_role: "", message: "" });
      await loadProject();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReview(requestId, decision) {
    try {
      const updated = await projectApi.review(projectId, requestId, decision, token);
      setProject(updated);
      setEditForm({
        title: updated.title,
        short_description: updated.short_description,
        description: updated.description,
        max_members: updated.max_members,
        is_open: updated.is_open
      });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveMember(memberId) {
    try {
      const updated = await projectApi.removeMember(projectId, memberId, token);
      setProject(updated);
      setEditForm({
        title: updated.title,
        short_description: updated.short_description,
        description: updated.description,
        max_members: updated.max_members,
        is_open: updated.is_open
      });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAnnouncement(event) {
    event.preventDefault();
    try {
      const updated = await projectApi.addAnnouncement(projectId, announcementContent, token);
      setProject(updated);
      setAnnouncementContent("");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleProjectUpdate(event) {
    event.preventDefault();
    try {
      const updated = await projectApi.update(
        projectId,
        {
          ...editForm,
          max_members: Number(editForm.max_members)
        },
        token
      );
      setProject(updated);
      setEditForm({
        title: updated.title,
        short_description: updated.short_description,
        description: updated.description,
        max_members: updated.max_members,
        is_open: updated.is_open
      });
      setEditMode(false);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteProject() {
    const accepted = window.confirm("Czy na pewno chcesz usunąć ten projekt?");
    if (!accepted) {
      return;
    }

    try {
      await projectApi.remove(projectId, token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="panel empty-state">Ładowanie szczegółów projektu...</div>;
  }

  if (error && !project) {
    return <div className="panel error-box">{error}</div>;
  }

  return (
    <div className="stack-lg">
      {error ? <div className="panel error-box">{error}</div> : null}

      <section className="project-hero">
        <div className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Projekt #{project.id}</span>
              <h1>{project.title}</h1>
            </div>
            <div className="badge-group">
              <span className="slot-pill">Wolne miejsca: {project.available_slots}</span>
              <span className={project.is_open ? "status-badge open" : "status-badge closed"}>
                {project.is_open ? "Otwarty" : "Zamknięty"}
              </span>
            </div>
          </div>

          <p className="lead">{project.short_description}</p>
          <p>{project.description}</p>

          <dl className="project-meta project-meta-expanded">
            <div>
              <dt>Właściciel</dt>
              <dd>{project.owner.full_name}</dd>
            </div>
            <div>
              <dt>Kontakt</dt>
              <dd>{project.owner.email}</dd>
            </div>
            <div>
              <dt>Skład</dt>
              <dd>
                {project.member_count}/{project.max_members}
              </dd>
            </div>
            <div>
              <dt>Aktualizacja</dt>
              <dd>{formatDate(project.updated_at)}</dd>
            </div>
          </dl>
        </div>

        <aside className="stack-md">
          {!isAuthenticated ? (
            <div className="panel info-box">
              <strong>Zaloguj się, aby dołączyć.</strong>
              <p>Po zalogowaniu wyślesz zgłoszenie i uzupełnisz informacje o swoim doświadczeniu.</p>
              <Link className="button" to="/auth">
                Przejdź do logowania
              </Link>
            </div>
          ) : null}

          {isAuthenticated &&
          !project.can_manage &&
          !project.is_member &&
          !project.has_pending_request &&
          project.available_slots > 0 &&
          project.is_open ? (
            <form className="panel stack-md" onSubmit={handleJoin}>
              <h2>Zgłoszenie do projektu</h2>
              <div className="field">
                <label htmlFor="join_strengths">W czym jesteś dobry?</label>
                <textarea
                  id="join_strengths"
                  minLength={10}
                  onChange={(event) => setJoinForm({ ...joinForm, strengths: event.target.value })}
                  required
                  rows={4}
                  value={joinForm.strengths}
                />
              </div>
              <div className="field">
                <label htmlFor="join_role">Gdzie odnajdziesz się najlepiej?</label>
                <input
                  id="join_role"
                  onChange={(event) => setJoinForm({ ...joinForm, preferred_role: event.target.value })}
                  required
                  value={joinForm.preferred_role}
                />
              </div>
              <div className="field">
                <label htmlFor="join_message">Dodatkowa wiadomość</label>
                <textarea
                  id="join_message"
                  onChange={(event) => setJoinForm({ ...joinForm, message: event.target.value })}
                  rows={4}
                  value={joinForm.message}
                />
              </div>
              <button className="button" type="submit">
                Wyślij zgłoszenie
              </button>
            </form>
          ) : null}

          {project.has_pending_request ? (
            <div className="panel info-box">Twoje zgłoszenie czeka na decyzję właściciela projektu.</div>
          ) : null}

          {project.is_member ? (
            <form className="panel stack-md" onSubmit={handleAnnouncement}>
              <h2>Dodaj ogłoszenie</h2>
              <div className="field">
                <label htmlFor="announcement">Wiadomość dla zespołu</label>
                <textarea
                  id="announcement"
                  onChange={(event) => setAnnouncementContent(event.target.value)}
                  required
                  rows={4}
                  value={announcementContent}
                />
              </div>
              <button className="button button-secondary" type="submit">
                Opublikuj
              </button>
            </form>
          ) : null}
        </aside>
      </section>

      <section className="detail-grid">
        <div className="panel stack-md">
          <div className="section-header">
            <h2>Członkowie projektu</h2>
          </div>
          <div className="stack-sm">
            {project.memberships.map((membership) => (
              <div className="member-row" key={membership.id}>
                <div>
                  <strong>{membership.user.full_name}</strong>
                  <p>
                    {membership.role_label} - {membership.user.preferred_role || "brak preferowanej roli"}
                  </p>
                </div>
                {project.can_manage && membership.user.id !== project.owner.id ? (
                  <button
                    className="button button-ghost"
                    onClick={() => handleRemoveMember(membership.id)}
                    type="button"
                  >
                    Usuń
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="panel stack-md">
          <div className="section-header">
            <h2>Tablica ogłoszeń</h2>
          </div>
          {project.announcements.length === 0 ? (
            <div className="empty-state">Brak wpisów na tablicy.</div>
          ) : (
            <div className="stack-sm">
              {project.announcements.map((announcement) => (
                <article className="announcement-card" key={announcement.id}>
                  <p>{announcement.content}</p>
                  <small>
                    {announcement.author.full_name} - {formatDate(announcement.created_at)}
                  </small>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {project.can_manage ? (
        <section className="detail-grid">
          <div className="panel stack-md">
            <div className="section-header">
              <h2>Wnioski kandydatów</h2>
            </div>
            {project.join_requests.length === 0 ? (
              <div className="empty-state">Na razie nie ma nowych zgłoszeń.</div>
            ) : (
              <div className="stack-sm">
                {project.join_requests.map((request) => (
                  <article className="request-card" key={request.id}>
                    <strong>{request.user.full_name}</strong>
                    <p>
                      Preferowana rola: {request.preferred_role}
                      <br />
                      Mocne strony: {request.strengths}
                    </p>
                    {request.message ? <p>Wiadomość: {request.message}</p> : null}
                    <small>Status: {request.status}</small>
                    {request.status === "pending" ? (
                      <div className="button-row">
                        <button
                          className="button"
                          onClick={() => handleReview(request.id, "accepted")}
                          type="button"
                        >
                          Akceptuj
                        </button>
                        <button
                          className="button button-ghost"
                          onClick={() => handleReview(request.id, "rejected")}
                          type="button"
                        >
                          Odrzuć
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel stack-md">
            <div className="section-header">
              <h2>Zarządzanie projektem</h2>
              <button className="button button-secondary" onClick={() => setEditMode(!editMode)} type="button">
                {editMode ? "Zwiń edycję" : "Edytuj projekt"}
              </button>
            </div>

            {editMode && editForm ? (
              <form className="stack-md" onSubmit={handleProjectUpdate}>
                <div className="field">
                  <label htmlFor="edit_title">Nazwa projektu</label>
                  <input
                    id="edit_title"
                    onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                    value={editForm.title}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit_short_description">Krótki opis</label>
                  <textarea
                    id="edit_short_description"
                    onChange={(event) => setEditForm({ ...editForm, short_description: event.target.value })}
                    rows={3}
                    value={editForm.short_description}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit_description">Opis</label>
                  <textarea
                    id="edit_description"
                    onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                    rows={6}
                    value={editForm.description}
                  />
                </div>
                <div className="inline-fields">
                  <div className="field">
                    <label htmlFor="edit_max_members">Limit członków</label>
                    <input
                      id="edit_max_members"
                      min={2}
                      onChange={(event) => setEditForm({ ...editForm, max_members: event.target.value })}
                      type="number"
                      value={editForm.max_members}
                    />
                  </div>
                  <label className="checkbox-field">
                    <input
                      checked={editForm.is_open}
                      onChange={(event) => setEditForm({ ...editForm, is_open: event.target.checked })}
                      type="checkbox"
                    />
                    Przyjmuj nowe zgłoszenia
                  </label>
                </div>
                <button className="button" type="submit">
                  Zapisz zmiany
                </button>
              </form>
            ) : null}

            <button className="button button-danger" onClick={handleDeleteProject} type="button">
              Usuń projekt
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
