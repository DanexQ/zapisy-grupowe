import { Link } from "react-router-dom";

function formatDate(dateString) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium"
  }).format(new Date(dateString));
}

export default function ProjectCard({ project }) {
  return (
    <article className="project-card">
      <div className="project-card-top">
        <span className="eyebrow">Projekt otwarty</span>
        <span className="slot-pill">
          Wolne: {project.available_slots} / {project.max_members}
        </span>
      </div>

      <h3>{project.title}</h3>
      <p>{project.short_description}</p>

      <dl className="project-meta">
        <div>
          <dt>Właściciel</dt>
          <dd>{project.owner.full_name}</dd>
        </div>
        <div>
          <dt>Zespół</dt>
          <dd>
            {project.member_count}/{project.max_members}
          </dd>
        </div>
        <div>
          <dt>Dodano</dt>
          <dd>{formatDate(project.created_at)}</dd>
        </div>
      </dl>

      <Link className="button" to={`/projects/${project.id}`}>
        Zobacz szczegóły
      </Link>
    </article>
  );
}
