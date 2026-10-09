import { createContext, useCallback, useContext, useState } from 'react';
import { useLang } from '../i18n.jsx';

/* ── Icons (inline SVG, lucide-style strokes) ── */
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  chat: 'M21 12a8 8 0 0 1-8 8H4l2.2-3A8 8 0 1 1 21 12z',
  shield: 'M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z M9 12l2 2 4-4.5',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  alert: 'M12 3 2.5 20h19zM12 10v4M12 17.5v.5',
  pin: 'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  phone: 'M5 4h4l1.5 4.5-2.3 1.7a12 12 0 0 0 5.6 5.6l1.7-2.3L20 15v4a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 6.2 2 2 0 0 1 5 4z',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.5 6.5 12 13l8.5-6.5',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7.5a4 4 0 0 1 8 0V11',
  menu: 'M4 7h16M4 12h16M4 17h16',
  x: 'M6 6l12 12M18 6 6 18',
  send: 'M4 12 20 4l-3 16-5.5-5.5L4 12zM11.5 14.5 20 4',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17.5V21M9 21h6',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM4 15V4a1 1 0 0 1 1-1h10',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4',
  trash: 'M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6',
  check: 'M4.5 12.5 10 18 19.5 6.5',
  chevron: 'M9 5l7 7-7 7',
  arrow: 'M4 12h15M13 5.5 19.5 12 13 18.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12c0-.5 0-1-.1-1.4l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.4-1.4L13.7 2h-3.4L9.9 4.9a7.6 7.6 0 0 0-2.4 1.4l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2.8l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.4 1.4l.4 2.9h3.4l.4-2.9a7.6 7.6 0 0 0 2.4-1.4l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.4z',
  key: 'M14.5 10.5a4.5 4.5 0 1 0-4.3 4.5l1.3-1.3 2 2 2-2 2 2 3-3-6-6zM8.5 9.5v.5',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  bookmark: 'M7 3h10a1 1 0 0 1 1 1v17l-6-4.5L6 21V4a1 1 0 0 1 1-1z',
  layers: 'M12 3 2.5 8 12 13l9.5-5zM4 12.5 12 17l8-4.5M4 17 12 21.5 20 17',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h3a1 1 0 0 1 1 1v11M8 7h4M8 11h4M8 15h4',
  sparkle: 'M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5v.5',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  plus: 'M12 5v14M5 12h14',
};

export function Icon({ name, size = 20, style, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={PATHS[name] || PATHS.info} />
    </svg>
  );
}

/* ── Toast ── */
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <Icon name={t.type === 'error' ? 'alert' : 'check'} size={17} /> {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

/* ── Small building blocks ── */
export const Spinner = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </svg>
);

export const DemoChip = () => {
  const { t } = useLang();
  return <span className="demo-chip"><Icon name="info" size={12} /> {t('common.demo')}</span>;
};

export const Empty = ({ icon = 'search', title, sub }) => (
  <div className="empty">
    <div className="big"><Icon name={icon} size={42} style={{ opacity: 0.4 }} /></div>
    <h3 style={{ marginBottom: 4 }}>{title}</h3>
    {sub && <p style={{ margin: 0 }}>{sub}</p>}
  </div>
);

export const Skeleton = ({ h = 90, style }) => <div className="skeleton" style={{ height: h, ...style }} />;

export const StatusBadge = ({ status }) => {
  const { t } = useLang();
  const map = {
    Submitted: 'badge-grey', Received: 'badge-blue', Assigned: 'badge-cyan',
    'Under Review': 'badge-amber', Resolved: 'badge-green',
  };
  return <span className={`badge ${map[status] || 'badge-grey'}`}>{t(`st.${status}`)}</span>;
};

export const PriorityBadge = ({ priority }) => {
  const { t } = useLang();
  const map = { Low: 'badge-grey', Medium: 'badge-blue', High: 'badge-amber', Critical: 'badge-red' };
  return <span className={`badge ${map[priority] || 'badge-grey'}`}>{t(`pr.${priority}`)}</span>;
};

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); ta.remove();
  return Promise.resolve();
}
