const API_BASE = "/api";

const fieldLabels = {
  title: "Nazwa projektu",
  short_description: "Krótki opis",
  description: "Szczegóły projektu",
  max_members: "Maksymalna liczba osób",
  is_open: "Status projektu",
  full_name: "Imię i nazwisko",
  email: "E-mail",
  password: "Hasło",
  strengths: "Mocne strony",
  preferred_role: "Preferowana rola",
  message: "Wiadomość",
  content: "Treść"
};

function translateValidationMessage(message) {
  if (message.includes("at least 3 characters")) {
    return "musi mieć co najmniej 3 znaki.";
  }
  if (message.includes("at least 8 characters")) {
    return "musi mieć co najmniej 8 znaków.";
  }
  if (message.includes("at least 10 characters")) {
    return "musi mieć co najmniej 10 znaków.";
  }
  if (message.includes("at least 30 characters")) {
    return "musi mieć co najmniej 30 znaków.";
  }
  if (message.includes("greater than or equal to 2")) {
    return "musi wynosić co najmniej 2.";
  }
  if (message.includes("less than or equal to 20")) {
    return "nie może być większa niż 20.";
  }
  if (message.includes("valid email address")) {
    return "musi być poprawnym adresem e-mail.";
  }
  if (message.includes("Field required")) {
    return "jest wymagane.";
  }
  return message;
}

function formatValidationErrors(detail) {
  if (!Array.isArray(detail)) {
    return null;
  }

  return detail
    .map((item) => {
      const fieldName = item.loc?.[item.loc.length - 1];
      const fieldLabel = fieldLabels[fieldName] || fieldName || "Pole";
      return `${fieldLabel}: ${translateValidationMessage(item.msg || "niepoprawna wartość.")}`;
    })
    .join(" ");
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const validationMessage =
      typeof payload === "object" && payload !== null ? formatValidationErrors(payload.detail) : null;
    const message =
      validationMessage ||
      (typeof payload === "object" && payload !== null
        ? payload.detail || payload.message || "Wystąpił błąd."
        : payload || "Wystąpił błąd.");
    throw new Error(message);
  }

  return payload;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body
  });

  if (response.status === 204) {
    return null;
  }

  return parseResponse(response);
}

export const authApi = {
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: payload }),
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload }),
  me: (token) => apiRequest("/auth/me", { token })
};

export const projectApi = {
  list: ({ q = "", minSlots = 1 } = {}) => {
    const params = new URLSearchParams();
    if (q.trim()) {
      params.set("q", q.trim());
    }
    params.set("min_slots", String(minSlots));
    return apiRequest(`/projects?${params.toString()}`);
  },
  get: (projectId, token) =>
    apiRequest(`/projects/${projectId}`, {
      token
    }),
  create: (payload, token) =>
    apiRequest("/projects", {
      method: "POST",
      body: payload,
      token
    }),
  update: (projectId, payload, token) =>
    apiRequest(`/projects/${projectId}`, {
      method: "PATCH",
      body: payload,
      token
    }),
  remove: (projectId, token) =>
    apiRequest(`/projects/${projectId}`, {
      method: "DELETE",
      token
    }),
  join: (projectId, payload, token) =>
    apiRequest(`/projects/${projectId}/requests`, {
      method: "POST",
      body: payload,
      token
    }),
  review: (projectId, requestId, decision, token) =>
    apiRequest(`/projects/${projectId}/requests/${requestId}/review`, {
      method: "POST",
      body: { decision },
      token
    }),
  removeMember: (projectId, memberId, token) =>
    apiRequest(`/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
      token
    }),
  addAnnouncement: (projectId, content, token) =>
    apiRequest(`/projects/${projectId}/announcements`, {
      method: "POST",
      body: { content },
      token
    })
};
