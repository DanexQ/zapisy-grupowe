import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const initialRegisterState = {
  full_name: "",
  email: "",
  password: "",
  bio: "",
  strengths: "",
  preferred_role: ""
};

const initialLoginState = {
  email: "",
  password: ""
};

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { authenticate, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();


  return (
    <section className="auth-layout">
      <div className="auth-side">
        <span className="eyebrow">Dla członków i liderów zespołów</span>
        <h1>Jedno konto, wiele projektów i uporządkowana rekrutacja.</h1>
        <p>
          Kandydaci opisują swoje mocne strony, a właściciel projektu podejmuje decyzje na podstawie konkretnych
          informacji zamiast chaotycznych wiadomości.
        </p>
      </div>

      <div className="panel auth-panel">
        <div className="segmented-control">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Logowanie
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
            Rejestracja
          </button>
        </div>

        <form className="stack-md">
          {mode === "register" ? (
            <>
              <div className="field">
                <label htmlFor="full_name">Imię i nazwisko</label>
                <input
                  id="full_name"
                  onChange={(event) => setRegisterForm({ ...registerForm, full_name: event.target.value })}
                  required
                  value={registerForm.full_name}
                />
              </div>

              <div className="field">
                <label htmlFor="reg_email">E-mail</label>
                <input
                  id="reg_email"
                  onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                  required
                  type="email"
                  value={registerForm.email}
                />
              </div>

              <div className="field">
                <label htmlFor="reg_password">Hasło</label>
                <input
                  id="reg_password"
                  minLength={8}
                  onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                  required
                  type="password"
                  value={registerForm.password}
                />
              </div>

              <div className="field">
                <label htmlFor="strengths">W czym jesteś najmocniejszy?</label>
                <textarea
                  id="strengths"
                  onChange={(event) => setRegisterForm({ ...registerForm, strengths: event.target.value })}
                  rows={3}
                  value={registerForm.strengths}
                />
              </div>

              <div className="field">
                <label htmlFor="preferred_role">Jaka rola najbardziej Ci odpowiada?</label>
                <input
                  id="preferred_role"
                  onChange={(event) => setRegisterForm({ ...registerForm, preferred_role: event.target.value })}
                  placeholder="np. frontend, analiza, badania, PM"
                  value={registerForm.preferred_role}
                />
              </div>

              <div className="field">
                <label htmlFor="bio">Kilka słów o sobie</label>
                <textarea
                  id="bio"
                  onChange={(event) => setRegisterForm({ ...registerForm, bio: event.target.value })}
                  rows={4}
                  value={registerForm.bio}
                />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="login_email">E-mail</label>
                <input
                  id="login_email"
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  required
                  type="email"
                  value={loginForm.email}
                />
              </div>

              <div className="field">
                <label htmlFor="login_password">Hasło</label>
                <input
                  id="login_password"
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  required
                  type="password"
                  value={loginForm.password}
                />
              </div>
            </>
          )}

          {error ? <div className="error-box">{error}</div> : null}

          <button className="button" disabled={submitting} type="submit">
            {submitting ? "Trwa wysyłanie..." : mode === "login" ? "Zaloguj się" : "Utwórz konto"}
          </button>
        </form>
      </div>
    </section>
  );
}
