import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectApi } from "../api";
import { useAuth } from "../contexts/AuthContext";

const initialState = {
  title: "",
  short_description: "",
  description: "",
  max_members: 4,
  is_open: true
};

function validateProjectForm(form) {
  if (form.title.trim().length < 3) {
    return "Nazwa projektu musi mieć co najmniej 3 znaki.";
  }
  if (form.short_description.trim().length < 10) {
    return "Krótki opis musi mieć co najmniej 10 znaków.";
  }
  if (form.description.trim().length < 30) {
    return "Szczegóły projektu muszą mieć co najmniej 30 znaków.";
  }

  const maxMembers = Number(form.max_members);
  if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 20) {
    return "Maksymalna liczba osób musi mieścić się w przedziale 2-20.";
  }

  return null;
}

export default function CreateProjectPage() {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { token } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const validationError = validateProjectForm(form);
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      const project = await projectApi.create(
        {
          ...form,
          title: form.title.trim(),
          short_description: form.short_description.trim(),
          description: form.description.trim(),
          max_members: Number(form.max_members)
        },
        token
      );
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel form-panel">
      <div className="section-header">
        <div>
          <span className="eyebrow">Nowy projekt</span>
          <h1>Opisz pomysł i zaproś do niego odpowiednie osoby.</h1>
        </div>
      </div>

      <form className="stack-md" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="title">Nazwa projektu</label>
          <input
            id="title"
            minLength={3}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
            value={form.title}
          />
        </div>

        <div className="field">
          <label htmlFor="short_description">Krótki opis</label>
          <textarea
            id="short_description"
            minLength={10}
            onChange={(event) => setForm({ ...form, short_description: event.target.value })}
            required
            rows={3}
            value={form.short_description}
          />
        </div>

        <div className="field">
          <label htmlFor="description">Szczegóły projektu</label>
          <textarea
            id="description"
            minLength={30}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            required
            rows={7}
            value={form.description}
          />
        </div>

        <div className="inline-fields">
          <div className="field">
            <label htmlFor="max_members">Maksymalna liczba osób</label>
            <input
              id="max_members"
              max={20}
              min={2}
              onChange={(event) => setForm({ ...form, max_members: event.target.value })}
              required
              type="number"
              value={form.max_members}
            />
          </div>

          <label className="checkbox-field">
            <input
              checked={form.is_open}
              onChange={(event) => setForm({ ...form, is_open: event.target.checked })}
              type="checkbox"
            />
            Projekt jest otwarty na nowe zgłoszenia
          </label>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        <button className="button" disabled={submitting} type="submit">
          {submitting ? "Tworzenie..." : "Utwórz projekt"}
        </button>
      </form>
    </section>
  );
}
