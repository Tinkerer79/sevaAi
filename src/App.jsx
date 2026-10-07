import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LanguageProvider } from './i18n.jsx';
import { AuthProvider, useAuth } from './auth.jsx';
import { ToastProvider, Icon, Empty } from './components/UI.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import { ServicesPage, ServiceDetailPage } from './pages/Services.jsx';
import Assistant from './pages/Assistant.jsx';
import Schemes from './pages/Schemes.jsx';
import DocumentAssistant from './pages/DocumentAssistant.jsx';
import Report from './pages/Report.jsx';
import Track from './pages/Track.jsx';
import Contacts from './pages/Contacts.jsx';
import { LoginPage, RegisterPage, AdminLoginPage } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import { AboutPage, PrivacyPage, TermsPage, AccessibilityPage } from './pages/Info.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Protected({ children, admin = false }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="page container"><div className="skeleton" style={{ height: 200 }} /></div>;
  if (!user) return <Navigate to={admin ? '/admin/login' : '/login'} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
}

function Layout() {
  const location = useLocation();
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        {/* Re-keyed per path so any render crash shows a recoverable error
            card instead of a blank page, and clears when the citizen moves on. */}
        <ErrorBoundary key={location.pathname}>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/ai" element={<Navigate to="/assistant" replace />} />
          <Route path="/schemes" element={<Schemes />} />
          <Route path="/documents" element={<DocumentAssistant />} />
          <Route path="/report" element={<Report />} />
          <Route path="/track" element={<Track />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/accessibility" element={<AccessibilityPage />} />
          <Route path="*" element={
            <div className="page container" style={{ paddingTop: 80, textAlign: 'center' }}>
              <Empty icon="search" title="Page not found" sub="The link may be broken or the page may have moved." />
            </div>
          } />
        </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Layout />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
