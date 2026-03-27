import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import HomePage from "./pages/HomePage";
import ProjectPage from "./pages/ProjectPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<AuthPage />} path="/auth" />
        <Route element={<ProjectPage />} path="/projects/:projectId" />
        <Route
          element={
            <ProtectedRoute>
              <CreateProjectPage />
            </ProtectedRoute>
          }
          path="/projects/new"
        />
      </Routes>
    </Layout>
  );
}
