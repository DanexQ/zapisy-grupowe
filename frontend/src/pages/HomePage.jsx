import { useEffect, useState } from "react";
import { projectApi } from "../api";
import ProjectCard from "../components/ProjectCard";

export default function HomePage() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [minSlots, setMinSlots] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await projectApi.list({ q: search, minSlots });
        if (isActive) {
          setProjects(data);
          setError("");
        }
      } catch (err) {
        if (isActive) {
          setError(err.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [search, minSlots]);

  return (
    <div className="stack-lg">
      <section className="hero">
        <div>
          <span className="eyebrow">Panel rekrutacji do projektów grupowych</span>
          <h1>Znajdź zespół, który potrzebuje dokładnie Twoich umiejętności.</h1>
          <p>
            Przeglądaj otwarte projekty, składaj dopracowane zgłoszenia i zarządzaj składem zespołu z jednego
            miejsca.
          </p>
        </div>

        <div className="hero-card">
          <strong>Jak to działa?</strong>
          <ol>
            <li>Zakładasz konto i uzupełniasz profil.</li>
            <li>Wyszukujesz projekt i wysyłasz zgłoszenie.</li>
            <li>Właściciel akceptuje kandydatów i prowadzi tablicę ogłoszeń.</li>
          </ol>
        </div>
      </section>

      <section className="panel filters">
        <div className="field">
          <label htmlFor="search">Szukaj projektu lub prowadzącego</label>
          <input
            id="search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="np. aplikacja mobilna, UX, analiza danych"
            value={search}
          />
        </div>

        <div className="field">
          <label htmlFor="slots">Minimalna liczba wolnych miejsc</label>
          <select id="slots" onChange={(event) => setMinSlots(Number(event.target.value))} value={minSlots}>
            <option value={1}>Przynajmniej 1 miejsce</option>
            <option value={2}>Przynajmniej 2 miejsca</option>
            <option value={3}>Przynajmniej 3 miejsca</option>
          </select>
        </div>
      </section>

      {error ? <div className="panel error-box">{error}</div> : null}

      <section className="project-grid">
        {loading ? <div className="panel empty-state">Ładowanie projektów...</div> : null}
        {!loading && projects.length === 0 ? (
          <div className="panel empty-state">Brak projektów spełniających wybrane kryteria.</div>
        ) : null}
        {!loading ? projects.map((project) => <ProjectCard key={project.id} project={project} />) : null}
      </section>
    </div>
  );
}
