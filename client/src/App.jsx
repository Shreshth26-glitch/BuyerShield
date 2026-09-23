import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { AdminSyncPage } from './pages/AdminSyncPage';
import { AdminInterestRatesPage } from './pages/AdminInterestRatesPage';
import { AdminPrecedentsPage } from './pages/AdminPrecedentsPage';
import { SmoothScroll } from './components/SmoothScroll';
import { PageTransition } from './components/PageTransition';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-page">
        <div className="font-mono text-xs uppercase tracking-eyebrow text-text-secondary">
          Checking statutory credentials...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route (redirects to dashboard if already logged in)
const PublicAuthRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-page text-text-primary">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <PageTransition>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={
                <PublicAuthRoute>
                  <LoginPage />
                </PublicAuthRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicAuthRoute>
                  <RegisterPage />
                </PublicAuthRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cases/:id"
              element={
                <ProtectedRoute>
                  <CaseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync"
              element={
                <ProtectedRoute>
                  <AdminSyncPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/interest-rates"
              element={
                <ProtectedRoute>
                  <AdminInterestRatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/precedents"
              element={
                <ProtectedRoute>
                  <AdminPrecedentsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <SmoothScroll>
          <AppRoutes />
        </SmoothScroll>
      </Router>
    </AuthProvider>
  );
}

