import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api";
import { useAuth } from "../contexts/AuthContext";

function normalizeValue(value) {
  return value ?? "";
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

function DashboardProjectCard({ project, label }) {
  return (
    <article className="dashboard-card">
      <div className="dashboard-card-top">
        <span className="dashboard-label">{label}</span>
        <span className="slot-pill">
          {project.member_count}/{project.max_members}
        </span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.short_description}</p>
      <small>
        Wlasciciel: {project.owner.full_name} | Aktualizacja: {formatDate(project.updated_at)}
      </small>
      <Link className="button button-ghost" to={`/projects/${project.id}`}>
        Otworz projekt
      </Link>
    </article>
  );
}

export default function AccountPage() {
  const { user, token, updateProfile } = useAuth();
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    bio: "",
    strengths: "",
    preferred_role: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [ownedProjects, setOwnedProjects] = useState([]);
  const [memberProjects, setMemberProjects] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      email: normalizeValue(user.email),
      full_name: normalizeValue(user.full_name),
      bio: normalizeValue(user.bio),
      strengths: normalizeValue(user.strengths),
      preferred_role: normalizeValue(user.preferred_role)
    });
  }, [user]);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (!token) {
        return;
      }

      setDashboardLoading(true);
      try {
        const [projectsData, requestsData] = await Promise.all([authApi.myProjects(token), authApi.myRequests(token)]);
        if (!isActive) {
          return;
        }
        setOwnedProjects(projectsData.owned_projects);
        setMemberProjects(projectsData.member_projects);
        setRequests(requestsData);
      } catch (err) {
        if (isActive) {
          setError(err.message);
        }
      } finally {
        if (isActive) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSuccess("");
    setError("");

    try {
      await updateProfile({
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        bio: form.bio.trim(),
        strengths: form.strengths.trim(),
        preferred_role: form.preferred_role.trim()
      });
      setSuccess("Zmiany zostaly zapisane.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-lg">
      <div className="account-layout">
        <section className="panel account-summary">
          <span className="eyebrow">Twoje konto</span>
          <h1>{user?.full_name}</h1>
          <p>
            Utrzymuj aktualny opis swoich kompetencji, aby wlasciciele projektow szybciej rozumieli, do jakiej roli
            najlepiej pasujesz.
          </p>

          <dl className="project-meta project-meta-expanded">
            <div>
              <dt>E-mail</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Preferowana rola</dt>
              <dd>{user?.preferred_role || "Nie ustawiono"}</dd>
            </div>
          </dl>
        </section>

        <section className="panel form-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Edycja profilu</span>
              <h1>Uzupelnij swoje informacje</h1>
            </div>
          </div>

          <form className="stack-md" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="account_full_name">Imie i nazwisko</label>
              <input
                id="account_full_name"
                minLength={2}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                required
                value={form.full_name}
              />
            </div>

            <div className="field">
              <label htmlFor="account_email">E-mail</label>
              <input
                id="account_email"
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                type="email"
                value={form.email}
              />
            </div>

            <div className="field">
              <label htmlFor="account_preferred_role">Preferowana rola</label>
              <input
                id="account_preferred_role"
                onChange={(event) => setForm({ ...form, preferred_role: event.target.value })}
                placeholder="np. frontend, backend, UX, analityk"
                value={form.preferred_role}
              />
            </div>

            <div className="field">
              <label htmlFor="account_strengths">Mocne strony</label>
              <textarea
                id="account_strengths"
                onChange={(event) => setForm({ ...form, strengths: event.target.value })}
                rows={4}
                value={form.strengths}
              />
            </div>

            <div className="field">
              <label htmlFor="account_bio">Krotko o sobie</label>
              <textarea
                id="account_bio"
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                rows={5}
                value={form.bio}
              />
            </div>

            {success ? <div className="panel success-box">{success}</div> : null}
            {error ? <div className="panel error-box">{error}</div> : null}

            <button className="button" disabled={submitting} type="submit">
              {submitting ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </form>
        </section>
      </div>

      <section className="panel section-card">
        <div className="section-heading">
          <h2>Moje projekty</h2>
          <span>
            {ownedProjects.length + memberProjects.length} pozycji
          </span>
        </div>

        {dashboardLoading ? <div className="empty-state">Ladowanie projektow...</div> : null}

        {!dashboardLoading && ownedProjects.length === 0 && memberProjects.length === 0 ? (
          <div className="empty-state">Nie masz jeszcze zadnych projektow powiazanych z kontem.</div>
        ) : null}

        {!dashboardLoading && ownedProjects.length > 0 ? (
          <div className="stack-sm">
            <h3 className="subsection-title">Projekty, ktorymi zarzadzasz</h3>
            <div className="dashboard-grid">
              {ownedProjects.map((project) => (
                <DashboardProjectCard key={project.id} label="Wlasciciel" project={project} />
              ))}
            </div>
          </div>
        ) : null}

        {!dashboardLoading && memberProjects.length > 0 ? (
          <div className="stack-sm">
            <h3 className="subsection-title">Projekty, w ktorych uczestniczysz</h3>
            <div className="dashboard-grid">
              {memberProjects.map((project) => (
                <DashboardProjectCard key={project.id} label="Czlonek zespolu" project={project} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel section-card">
        <div className="section-heading">
          <h2>Moje zgloszenia</h2>
          <span>{requests.length} pozycji</span>
        </div>

        {dashboardLoading ? <div className="empty-state">Ladowanie zgloszen...</div> : null}

        {!dashboardLoading && requests.length === 0 ? (
          <div className="empty-state">Nie wyslales jeszcze zadnych zgloszen do projektow.</div>
        ) : null}

        {!dashboardLoading && requests.length > 0 ? (
          <div className="stack-sm">
            {requests.map((request) => (
              <article className="request-card" key={request.id}>
                <div className="request-header">
                  <div>
                    <strong>{request.project.title}</strong>
                    <small>Wlasciciel: {request.project.owner.full_name}</small>
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
                    <strong>Wiadomosc:</strong> {request.message}
                  </p>
                ) : null}
                <small>Wyslano: {formatDate(request.created_at)}</small>
                <div>
                  <Link className="button button-ghost" to={`/projects/${request.project.id}`}>
                    Przejdz do projektu
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
