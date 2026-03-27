import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api";

const AuthContext = createContext(null);
const TOKEN_KEY = "group-projects-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const profile = await authApi.me(token);
        if (isActive) {
          setUser(profile);
        }
      } catch (error) {
        if (isActive) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [token]);

  async function authenticate(mode, payload) {
    const response = mode === "login" ? await authApi.login(payload) : await authApi.register(payload);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        authenticate,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
