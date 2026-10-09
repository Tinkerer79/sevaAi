import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon } from '../components/UI.jsx';
import googleIcon from '../assets/google-icon.svg';

function AuthShell({ title, sub, children, alt }) {
  const { t } = useLang();
  return (
    <div className="page container modal-center" style={{ paddingTop: 56, display: 'flex', minHeight: '70vh', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="card" style={{ width: 'min(440px, 100%)', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="logo" style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--primary-600)', display: 'grid', placeItems: 'center', color: '#fff', margin: '0 auto 14px' }}>
            <Icon name={title.includes('Admin') || t('auth.adminTitle') === title ? 'lock' : 'user'} size={22} />
          </div>
          <h2 style={{ marginBottom: 4 }}>{title}</h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>{sub}</p>
        </div>
        {children}
        {alt && <div style={{ marginTop: 18, textAlign: 'center', fontSize: 14 }}>{alt}</div>}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to={title === t('auth.adminTitle') ? '/login' : '/admin/login'} style={{ fontSize: 13 }}>
            {title === t('auth.adminTitle') ? t('auth.citizenLink') : t('auth.adminLink')} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function DemoHint({ cred }) {
  const { t } = useLang();
  return (
    <div style={{ background: 'var(--amber-50)', border: '1px dashed #f0d9a8', borderRadius: 11, padding: '10px 14px', marginTop: 16, fontSize: 12.5, color: '#92700c' }}>
      <b><Icon name="info" size={12} style={{ verticalAlign: '-2px' }} /> {t('auth.demoHint')}:</b>{' '}
      <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 6 }}>{cred}</code>
    </div>
  );
}

function SocialLoginButtons({ onSignIn, disabled, t }) {
  return (
    <div style={{ display: 'grid', gap: 9, margin: '18px 0' }}>
      <button type="button" className="btn btn-outline btn-lg" disabled={disabled} onClick={() => onSignIn('google')}>
        <img aria-hidden="true" src={googleIcon} width="17" height="17" style={{ marginRight: 7, flexShrink: 0 }} />
        {t('auth.continueGoogle')}
      </button>
      <button type="button" className="btn btn-outline btn-lg" disabled={disabled} onClick={() => onSignIn('github')}>
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 32.58 32.58" style={{ marginRight: 7, flexShrink: 0 }}>
          <path d="M16.29,0a16.29,16.29,0,0,0-5.15,31.75c.82.15,1.11-.36,1.11-.79s0-1.41,0-2.77C7.7,29.18,6.74,26,6.74,26a4.36,4.36,0,0,0-1.81-2.39c-1.47-1,.12-1,.12-1a3.43,3.43,0,0,1,2.49,1.68,3.48,3.48,0,0,0,4.74,1.36,3.46,3.46,0,0,1,1-2.18c-3.62-.41-7.42-1.81-7.42-8a6.3,6.3,0,0,1,1.67-4.37,5.94,5.94,0,0,1,.16-4.31s1.37-.44,4.48,1.67a15.41,15.41,0,0,1,8.16,0c3.11-2.11,4.47-1.67,4.47-1.67A5.91,5.91,0,0,1,25,11.07a6.3,6.3,0,0,1,1.67,4.37c0,6.26-3.81,7.63-7.44,8a3.85,3.85,0,0,1,1.11,3c0,2.18,0,3.94,0,4.47s.29.94,1.12.78A16.29,16.29,0,0,0,16.29,0Z" fill="currentColor" />
        </svg>
        {t('auth.continueGithub')}
      </button>
    </div>
  );
}

function AuthDivider({ t }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 12, margin: '16px 0' }}><span style={{ height: 1, background: 'var(--border)', flex: 1 }} />{t('auth.orEmail')}<span style={{ height: 1, background: 'var(--border)', flex: 1 }} /></div>;
}

function runProviderSignIn(signInWithProvider, provider, setBusy, setErr) {
  setBusy(true); setErr('');
  signInWithProvider(provider).catch((error) => {
    setErr(error.message || 'Could not start sign-in.');
    setBusy(false);
  });
}

export function LoginPage() {
  const { t } = useLang();
  const { login, authMode, ready, user, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : (authMode === 'supabase' ? '/schemes' : '/dashboard'), { replace: true });
  }, [user, authMode, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const u = await login(email, password);
      navigate(u.role === 'admin' ? '/admin' : (authMode === 'supabase' ? '/schemes' : '/dashboard'));
    } catch (error) { setErr(error.message); }
    setBusy(false);
  };

  const socialSignIn = (provider) => runProviderSignIn(signInWithProvider, provider, setBusy, setErr);

  return (
    <AuthShell title={t('auth.loginTitle')} sub={t('auth.loginSub')}
      alt={<span>{t('auth.noAccount')} <Link to="/register">{t('auth.registerTitle').split(' ').slice(0, 3).join(' ')}</Link></span>}>
      {authMode === 'supabase' && <>
        <SocialLoginButtons onSignIn={socialSignIn} disabled={!ready || busy} t={t} />
        <AuthDivider t={t} />
      </>}
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="em">{t('common.email')}</label>
          <input id="em" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw">{t('common.password')}</label>
          <input id="pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {err && <div className="err" style={{ marginBottom: 10 }}><Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {err}</div>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy || !ready}>{busy ? t('common.loading') : t('nav.login')}</button>
      </form>
      {authMode === 'legacy' && <DemoHint cred="demo@citizen.in · Demo@2026" />}
    </AuthShell>
  );
}

export function RegisterPage() {
  const { t } = useLang();
  const { register, authMode, ready, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const result = await register(form);
      if (result.needsEmailConfirmation) setNotice('Account created. Check your email to confirm it, then sign in.');
      else navigate(authMode === 'supabase' ? '/schemes' : '/dashboard');
    } catch (error) { setErr(error.message); }
    setBusy(false);
  };

  const socialSignIn = (provider) => runProviderSignIn(signInWithProvider, provider, setBusy, setErr);

  return (
    <AuthShell title={t('auth.registerTitle')} sub={t('auth.registerSub')}
      alt={<span>{t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link></span>}>
      {authMode === 'supabase' && <>
        <SocialLoginButtons onSignIn={socialSignIn} disabled={!ready || busy} t={t} />
        <AuthDivider t={t} />
      </>}
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="nm">{t('common.name')}</label>
          <input id="nm" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} />
        </div>
        <div className="field">
          <label className="label" htmlFor="em">{t('common.email')}</label>
          <input id="em" className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="ph">{t('common.phone')}</label>
          <input id="ph" className="input" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder={t('auth.phonePlaceholder')} />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw">{t('common.password')}</label>
          <input id="pw" className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>
        {err && <div className="err" style={{ marginBottom: 10 }}><Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {err}</div>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy || !ready}>{busy ? t('common.loading') : t('auth.registerTitle')}</button>
      </form>
      {notice && <div className="tile-green" role="status" style={{ marginTop: 14, padding: 12, borderRadius: 8, fontSize: 13 }}>{notice}</div>}
    </AuthShell>
  );
}

export function AdminLoginPage() {
  const { t } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const u = await login(email, password);
      if (u.role !== 'admin') setErr('This account does not have admin access.');
      else navigate('/admin');
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.adminTitle')} sub={t('auth.adminSub')}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="aem">{t('common.email')}</label>
          <input id="aem" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="apw">{t('common.password')}</label>
          <input id="apw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <div className="err" style={{ marginBottom: 10 }}><Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {err}</div>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy ? t('common.loading') : t('auth.adminTitle')}</button>
      </form>
      <DemoHint cred="admin@sevamanipur.in · Admin@2026" />
    </AuthShell>
  );
}
