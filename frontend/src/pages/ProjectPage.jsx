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

  function syncProjectState(data) {
    setProject(data);
    setEditForm({
      title: data.title,
      short_description: data.short_description,
      description: data.description,
      max_members: data.max_members,
      is_open: data.is_open
    });
  }

  async function loadProject() {
    setLoading(true);
    try {
      const data = await projectApi.get(projectId, token);
      syncProjectState(data);
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
      syncProjectState(updated);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveMember(memberId) {
    try {
      const updated = await projectApi.removeMember(projectId, memberId, token);
      syncProjectState(updated);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAnnouncement(event) {
    event.preventDefault();
    try {
      const updated = await projectApi.addAnnouncement(projectId, announcementContent, token);
      syncProjectState(updated);
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
      syncProjectState(updated);
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

      <section className="panel classroom-banner">
        <span className="eyebrow">Projekt #{project.id}</span>
        <div className="classroom-banner-top">
          <div>
            <h1>{project.title}</h1>
            <p className="classroom-subtitle">{project.short_description}</p>
          </div>
          <div className="badge-group">
            <span className="slot-pill">Wolne miejsca: {project.available_slots}</span>
            <span className={project.is_open ? "status-badge open" : "status-badge closed"}>
              {project.is_open ? "Otwarty" : "Zamknięty"}
            </span>
          </div>
        </div>
      </section>

      <div className="classroom-shell">
        <div className="classroom-main">
          <section className="classroom-overview">
            <article className="classroom-stat-card">
              <span>Właściciel</span>
              <strong>{project.owner.full_name}</strong>
              <small>{project.owner.email}</small>
            </article>
            <article className="classroom-stat-card">
              <span>Zespół</span>
              <strong>
                {project.member_count}/{project.max_members}
              </strong>
              <small>aktywnych miejsc w projekcie</small>
            </article>
            <article className="classroom-stat-card">
              <span>Aktualizacja</span>
              <strong>{formatDate(project.updated_at)}</strong>
              <small>ostatnia zmiana informacji</small>
            </article>
          </section>

          <section className="panel section-card">
            <div className="section-heading">
              <h2>O projekcie</h2>
            </div>
            <p className="section-description">{project.description}</p>
          </section>

          <section className="panel section-card">
            <div className="section-heading">
              <h2>Tablica ogłoszeń</h2>
              <span>{project.announcements.length} wpisów</span>
            </div>

            {project.is_member ? (
              <form className="announcement-form" onSubmit={handleAnnouncement}>
                <div className="field">
                  <label htmlFor="announcement">Nowa wiadomość dla zespołu</label>
                  <textarea
                    id="announcement"
                    onChange={(event) => setAnnouncementContent(event.target.value)}
                    required
                    rows={4}
                    value={announcementContent}
                  />
                </div>
                <button className="button button-secondary" type="submit">
                  Opublikuj ogłoszenie
                </button>
              </form>
            ) : null}

            {project.announcements.length === 0 ? (
              <div className="empty-state">Brak wpisów na tablicy. Gdy pojawią się ogłoszenia, zobaczysz je tutaj.</div>
            ) : (
              <div className="stack-sm">
                {project.announcements.map((announcement) => (
                  <article className="announcement-card" key={announcement.id}>
                    <p>{announcement.content}</p>
                    <small>
                      {announcement.author.full_name} • {formatDate(announcement.created_at)}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel section-card">
            <div className="section-heading">
              <h2>Zespół projektowy</h2>
              <span>{project.memberships.length} osób</span>
            </div>
            <div className="stack-sm">
              {project.memberships.map((membership) => (
                <div className="member-row" key={membership.id}>
                  <div>
                    <strong>{membership.user.full_name}</strong>
                    <p>{membership.role_label}</p>
                    <small>{membership.user.preferred_role || "Brak preferowanej roli"}</small>
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
          </section>

          {project.can_manage ? (
            <section className="panel section-card">
              <div className="section-heading">
                <h2>Wnioski kandydatów</h2>
                <span>{project.join_requests.length} zgłoszeń</span>
              </div>
              {project.join_requests.length === 0 ? (
                <div className="empty-state">Na razie nie ma nowych zgłoszeń.</div>
              ) : (
                <div className="stack-sm">
                  {project.join_requests.map((request) => (
                    <article className="request-card" key={request.id}>
                      <div className="request-header">
                        <div>
                          <strong>{request.user.full_name}</strong>
                          <small>{request.user.email}</small>
                        </div>
                        <span className={`status-badge ${request.status === "pending" ? "open" : "closed"}`}>
                          {request.status}
                        </span>
                      </div>
                      <p>
                        <strong>Preferowana rola:</strong> {request.preferred_role}
                      </p>
                      <p>
                        <strong>Mocne strony:</strong> {request.strengths}
                      </p>
                      {request.message ? (
                        <p>
                          <strong>Wiadomość:</strong> {request.message}
                        </p>
                      ) : null}
                      {request.status === "pending" ? (
                        <div className="button-row">
                          <button className="button" onClick={() => handleReview(request.id, "accepted")} type="button">
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
            </section>
          ) : null}
        </div>

        <aside className="classroom-sidebar">
          <section className="panel sidebar-card">
            <div className="section-heading">
              <h2>Informacje</h2>
            </div>
            <ul className="subtle-list">
              <li>Status naboru: {project.is_open ? "otwarty" : "zamknięty"}</li>
              <li>Wolne miejsca: {project.available_slots}</li>
              <li>Właściciel: {project.owner.full_name}</li>
              <li>Ostatnia aktualizacja: {formatDate(project.updated_at)}</li>
            </ul>
          </section>

          {!isAuthenticated ? (
            <section className="panel sidebar-card">
              <h2>Dołącz do projektu</h2>
              <p className="sidebar-note">Zaloguj się, aby wysłać zgłoszenie i zostawić kilka słów o sobie.</p>
              <Link className="button" to="/auth">
                Przejdź do logowania
              </Link>
            </section>
          ) : null}

          {isAuthenticated &&
          !project.can_manage &&
          !project.is_member &&
          !project.has_pending_request &&
          project.available_slots > 0 &&
          project.is_open ? (
            <form className="panel sidebar-card stack-md" onSubmit={handleJoin}>
              <h2>Zgłoszenie</h2>
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
                <label htmlFor="join_role">Najlepsza rola</label>
                <input
                  id="join_role"
                  onChange={(event) => setJoinForm({ ...joinForm, preferred_role: event.target.value })}
                  required
                  value={joinForm.preferred_role}
                />
              </div>
              <div className="field">
                <label htmlFor="join_message">Krótka wiadomość</label>
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
            <section className="panel sidebar-card">
              <h2>Status zgłoszenia</h2>
              <p className="sidebar-note">Twoje zgłoszenie czeka na decyzję właściciela projektu.</p>
            </section>
          ) : null}

          {project.can_manage ? (
            <section className="panel sidebar-card stack-md">
              <div className="section-heading">
                <h2>Zarządzanie</h2>
                <button className="button button-secondary" onClick={() => setEditMode(!editMode)} type="button">
                  {editMode ? "Zwiń" : "Edytuj"}
                </button>
              </div>

              {editMode ? (
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
                  <button className="button" type="submit">
                    Zapisz zmiany
                  </button>
                </form>
              ) : (
                <p className="sidebar-note">
                  W tym miejscu możesz szybko zaktualizować opis projektu, liczbę miejsc i status rekrutacji.
                </p>
              )}

              <button className="button button-danger" onClick={handleDeleteProject} type="button">
                Usuń projekt
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
