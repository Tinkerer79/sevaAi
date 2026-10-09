import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Icon } from '../components/UI.jsx';

export default function AuthCallback() {
  const { user, ready, authMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const error = hash.get('error_description') || new URLSearchParams(location.search).get('error_description');

  useEffect(() => {
    if (user) navigate('/schemes', { replace: true });
  }, [user, navigate]);

  const failed = ready && (!user || authMode !== 'supabase');
  return (
    <div className="page container modal-center" style={{ paddingTop: 80, textAlign: 'center' }}>
      <div className="card" style={{ maxWidth: 480, margin: '0 auto', padding: 28 }}>
        {failed ? <>
          <Icon name="alert" size={24} style={{ color: 'var(--red-600)' }} />
          <h2 style={{ marginTop: 12 }}>Sign-in did not complete</h2>
          <p style={{ color: 'var(--muted)' }}>{error || 'Please check the provider setup and try again.'}</p>
          <Link className="btn btn-primary" to="/login">Back to sign in</Link>
        </> : <>
          <div className="skeleton" style={{ height: 6, width: '42%', margin: '0 auto 18px' }} />
          <h2>Finishing sign-in…</h2>
          <p style={{ color: 'var(--muted)' }}>You’ll be redirected when your account is ready.</p>
        </>}
      </div>
    </div>
  );
}
