import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Layout({ children }) {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">ZG</span>
          <div>
            <strong>Zapisy Grupowe</strong>
            <span>projekty, kandydaci i szybka organizacja zespołu</span>
          </div>
        </Link>

        <nav className="topnav">
          <NavLink to="/">Projekty</NavLink>
          {isAuthenticated ? <NavLink to="/projects/new">Dodaj projekt</NavLink> : null}
          {isAuthenticated ? <NavLink to="/account">Konto</NavLink> : null}
          {!isAuthenticated ? <NavLink to="/auth">Logowanie / rejestracja</NavLink> : null}
        </nav>

        <div className="topbar-actions">
          {isAuthenticated ? (
            <>
              <Link className="user-chip" to="/account">
                <span>{user.full_name}</span>
                <small>{user.preferred_role || "Uczestnik projektów"}</small>
              </Link>
              <button className="button button-secondary" onClick={logout} type="button">
                Wyloguj
              </button>
            </>
          ) : (
            <Link className="button" to="/auth">
              Zacznij teraz
            </Link>
          )}
        </div>
      </header>

      <main className="page-content">{children}</main>
    </div>
  );
}
