import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toast } from './components/layout/Toast';
import { BottomNav } from './components/layout/BottomNav';
import { SplashScreen } from './components/layout/SplashScreen';
import { useAccessibility } from './hooks/useAccessibility';
import { useTheme } from './hooks/useTheme';

import { useAuth } from './stores/auth';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Home } from './pages/Home';
import { NewProject } from './pages/NewProject';
import { Project } from './pages/Project';
import { Intake } from './pages/Intake';
import { Contacts } from './pages/Contacts';
import { Settings } from './pages/Settings';
import { Dashboard } from './pages/Dashboard';
import { Lots } from './pages/Lots';
import { ProfileSettings } from './pages/settings/ProfileSettings';
import { CommunitiesSettings } from './pages/settings/CommunitiesSettings';
import { TemplatesSettings } from './pages/settings/TemplatesSettings';
import { NotificationsSettings } from './pages/settings/NotificationsSettings';
import { FieldLanguageSettings } from './pages/settings/FieldLanguageSettings';
import { AccessibilitySettings } from './pages/settings/AccessibilitySettings';

const SPLASH_SESSION_KEY = 'condenser_splash_seen_v1';

function RequireAuth() {
  const token = useAuth((s) => s.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function AppShell() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}

function AppShellWide() {
  return (
    <div className="app-shell-wide">
      <Outlet />
    </div>
  );
}

function AppShellHome() {
  return (
    <div className="app-shell-home">
      <Outlet />
    </div>
  );
}

export default function App() {
  useAccessibility();
  useTheme();

  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!showSplash) return;
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {}
  }, [showSplash]);

  return (
    <BrowserRouter>
      <Toast />
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
      <main className="pb-24">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShellHome />}>
              <Route path="/" element={<Home />} />
            </Route>
            <Route element={<AppShell />}>
            <Route path="/new" element={<NewProject />} />
            <Route path="/project/:id" element={<Project />} />
            <Route path="/project/:id/intake" element={<Intake />} />
            <Route path="/contacts" element={<Navigate to="/settings/contacts" replace />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/profile" element={<ProfileSettings />} />
            <Route path="/settings/communities" element={<CommunitiesSettings />} />
            <Route path="/settings/templates" element={<TemplatesSettings />} />
            <Route path="/settings/notifications" element={<NotificationsSettings />} />
            <Route path="/settings/field-language" element={<FieldLanguageSettings />} />
            <Route path="/settings/contacts" element={<Contacts />} />
            <Route path="/settings/accessibility" element={<AccessibilitySettings />} />
            <Route path="/lots" element={<Lots />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
            <Route element={<AppShellWide />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Route>
        </Routes>
      </main>
      <BottomNav />
    </BrowserRouter>
  );
}
