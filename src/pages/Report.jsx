import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon, useToast } from '../components/UI.jsx';

const CAT_ICONS = { road_damage: '🛣️', garbage_waste: '🗑️', streetlight: '💡', water_supply: '💧', drainage: '🌊', public_infrastructure: '🏗️', other: '📋' };

export default function Report() {
  const { t } = useLang();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ categories: [], districts: [] });
  const [form, setForm] = useState({ category: 'road_damage', description: '', location: '', district: 'Imphal West', name: '', phone: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api('/api/complaints/meta').then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, phone: f.phone || user.phone || '' }));
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (form.description.trim().length < 10) e.description = 'Please describe the problem (at least 10 characters).';
    if (form.location.trim().length < 3) e.location = 'Please enter the location.';
    if (form.name.trim().length < 2) e.name = 'Please enter your name.';
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) e.phone = 'Enter a valid 10-digit mobile number.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.set('phone', form.phone.replace(/\D/g, '').slice(-10));
      if (photo) fd.append('photo', photo);
      const d = await api('/api/complaints', { method: 'POST', formData: fd });
      setSuccess(d);
      toast(t('report.notify', { id: d.complaintId }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusy(false);
  };

  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('Image must be under 5 MB', 'error'); return; }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  if (success) {
    return (
      <div className="page container" style={{ paddingTop: 60, maxWidth: 620 }}>
        <div className="card" style={{ padding: 44, textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--green-50)', color: 'var(--green-600)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Icon name="check" size={38} />
          </div>
          <h2>{t('report.success')}</h2>
          <p style={{ color: 'var(--muted)' }}>{t('report.successSub')}</p>
          <div style={{ background: 'var(--blue-50)', border: '1.5px dashed var(--blue-500)', borderRadius: 13, padding: '14px 20px', margin: '14px 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <b style={{ fontSize: 24, letterSpacing: '0.03em', color: 'var(--blue-700)' }}>{success.complaintId}</b>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard?.writeText(success.complaintId); toast(t('common.copied')); }}>
              <Icon name="copy" size={13} /> {t('common.copy')}
            </button>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 0 }}>
            <Icon name="building" size={14} style={{ verticalAlign: '-3px' }} /> {t('common.department')}: {success.department}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/track?id=${success.complaintId}`)}>
              <Icon name="pin" size={17} /> {t('report.trackNow')}
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => { setSuccess(null); setForm({ ...form, description: '', location: '' }); setPhoto(null); setPreview(null); }}>
              {t('report.another')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 760 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Civic Grievance</div>
          <h2>{t('report.title')}</h2>
          <p>{t('report.sub')}</p>
        </div>
      </div>

      <form className="card" style={{ padding: 26 }} onSubmit={submit}>
        <div className="field">
          <span className="label">{t('common.category')}</span>
          <div className="radio-row">
            {meta.categories.map((c) => (
              <button type="button" key={c.key} className={`radio-pill ${form.category === c.key ? 'active' : ''}`} onClick={() => set('category', c.key)}>
                <span>{CAT_ICONS[c.key]}</span> {t(`cat.${c.key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="desc">{t('report.desc')}</label>
          <textarea id="desc" className="textarea" maxLength={2000} value={form.description}
            onChange={(e) => set('description', e.target.value)} placeholder={t('report.descHint')} />
          {errors.description && <div className="err">{errors.description}</div>}
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label className="label" htmlFor="loc">{t('common.location')}</label>
            <input id="loc" className="input" maxLength={200} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Street / ward / landmark" />
            {errors.location && <div className="err">{errors.location}</div>}
          </div>
          <div className="field">
            <label className="label" htmlFor="dist">{t('common.district')}</label>
            <select id="dist" className="select" value={form.district} onChange={(e) => set('district', e.target.value)}>
              {meta.districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="photo">{t('report.photo')}</label>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              <Icon name="camera" size={16} /> Choose image
              <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onPhoto} />
            </label>
            {preview && (
              <div style={{ position: 'relative' }}>
                <img src={preview} alt="preview" style={{ height: 58, borderRadius: 9, border: '1px solid var(--border)' }} />
                <button type="button" onClick={() => { setPhoto(null); setPreview(null); }}
                  style={{ position: 'absolute', top: -7, right: -7, background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Icon name="x" size={12} />
                </button>
              </div>
            )}
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>JPG / PNG / WebP · max 5 MB</span>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label className="label" htmlFor="nm">{t('common.name')}</label>
            <input id="nm" className="input" maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
            {errors.name && <div className="err">{errors.name}</div>}
          </div>
          <div className="field">
            <label className="label" htmlFor="ph">{t('common.phone')}</label>
            <input id="ph" className="input" inputMode="numeric" maxLength={14} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" />
            {errors.phone && <div className="err">{errors.phone}</div>}
          </div>
        </div>

        <button className="btn btn-primary btn-lg" type="submit" disabled={busy} style={{ width: '100%' }}>
          <Icon name="send" size={17} /> {busy ? t('common.loading') : t('report.submit')}
        </button>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '12px 0 0', textAlign: 'center' }}>
          <Icon name="info" size={13} style={{ verticalAlign: '-2px' }} /> Prototype: complaints are stored in the demo database and routed to the matching department.
        </p>
      </form>
    </div>
  );
}
