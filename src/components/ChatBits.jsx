import { Icon } from './UI.jsx';

// Safe renderer for AI replies: parses **bold**, "## heading"-style lines and
// "- " bullets into React elements — no HTML injection possible.
export default function Markdown({ text }) {
  if (!text) return null;
  const lines = String(text).split('\n');
  const out = [];
  let bullets = [];

  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`ul-${out.length}`}>{bullets.map((b, i) => <li key={i}>{rich(b)}</li>)}</ul>);
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,4}\s+/.test(line) || /^\*\*(.+)\*\*:?$/.test(line.trim())) {
      flush();
      const heading = line.replace(/^#{1,4}\s+/, '').replace(/^\*\*|\*\*$/g, '').replace(/:$/, '');
      out.push(<h4 key={`h-${out.length}`}>{rich(heading)}</h4>);
    } else if (/^[-*•]\s+/.test(line.trim())) {
      bullets.push(line.trim().replace(/^[-*•]\s+/, ''));
    } else if (line.trim() === '') {
      flush();
    } else {
      flush();
      out.push(<p key={`p-${out.length}`} style={{ margin: '4px 0' }}>{rich(line)}</p>);
    }
  }
  flush();
  return <div>{out}</div>;
}

function rich(s) {
  // Safe inline markdown: formatting is rendered as React elements, and links
  // are restricted to http(s) so a model reply cannot create javascript: URLs.
  const parts = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1]) parts.push(<a key={k++} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>);
    else if (m[3]) parts.push(<b key={k++}>{m[3]}</b>);
    else if (m[4]) parts.push(<i key={k++} style={{ color: 'var(--muted)' }}>{m[4]}</i>);
    else parts.push(<code key={k++} style={{ background: '#f1f5fb', borderRadius: 5, padding: '1px 5px', fontSize: '0.9em' }}>{m[5]}</code>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

/* Complaint progress timeline — shared by Track page, dashboards and admin */
export const STATUS_ORDER = ['Submitted', 'Received', 'Assigned', 'Under Review', 'Resolved'];

export function ComplaintTimeline({ status, updates = [], t }) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  const updateMap = {};
  for (const u of updates) if (!updateMap[u.status]) updateMap[u.status] = u;

  return (
    <div className="timeline">
      {STATUS_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const u = updateMap[s];
        return (
          <div key={s} className={`tl-item ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
            <span className="tl-dot">{done ? <Icon name="check" size={12} /> : current ? '●' : ''}</span>
            <div className="tl-title">{t ? t(`st.${s}`) : s}</div>
            {u && (
              <div className="tl-meta">
                {new Date(u.created_at + 'Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                {u.created_by ? ` · ${u.created_by}` : ''}
              </div>
            )}
            {u?.note && <div className="tl-note">{u.note}</div>}
          </div>
        );
      })}
    </div>
  );
}
