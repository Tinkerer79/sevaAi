import { Link } from 'react-router-dom';
import { useLang } from '../i18n.jsx';
import { BrandMark } from './Navbar.jsx';
import { Icon } from './UI.jsx';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid grid-4" style={{ gap: 30 }}>
          <div>
            <div className="brandline">
              <BrandMark size={28} />
              <span className="brand-name">SevaManipur <span className="brand-ai">AI</span></span>
            </div>
            <p style={{ margin: '0 0 12px' }}>{t('footer.tagline')}</p>
            <div className="helpline">
              <span><Icon name="phone" size={12} style={{ verticalAlign: '-2px' }} /> 112 · Police</span>
              <span><Icon name="phone" size={12} style={{ verticalAlign: '-2px' }} /> 108 · Ambulance</span>
              <span><Icon name="phone" size={12} style={{ verticalAlign: '-2px' }} /> 1098 · Child</span>
            </div>
          </div>

          <div>
            <h4>{t('foot.popular')}</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              <Link to="/services?search=income%20certificate">Income Certificate</Link>
              <Link to="/services?category=Education">{t('foot.scholarships')}</Link>
              <Link to="/schemes">{t('nav.schemes')}</Link>
              <Link to="/services?category=Social%20Welfare">{t('foot.welfare')}</Link>
            </div>
          </div>

          <div>
            <h4>{t('foot.quick')}</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              <Link to="/services">{t('nav.services')}</Link>
              <Link to="/documents">{t('nav.documents')}</Link>
              <Link to="/report">{t('nav.report')}</Link>
              <Link to="/track">{t('nav.track')}</Link>
              <Link to="/contacts">{t('nav.contacts')}</Link>
              <Link to="/assistant">{t('common.askAI')}</Link>
            </div>
          </div>

          <div>
            <h4>{t('foot.info')}</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              <Link to="/about">{t('foot.about')}</Link>
              <Link to="/privacy">{t('foot.privacy')}</Link>
              <Link to="/terms">{t('foot.terms')}</Link>
              <Link to="/accessibility">{t('foot.accessibility')}</Link>
              <Link to="/admin/login">{t('auth.adminLink')}</Link>
            </div>
          </div>
        </div>

        <div className="disclaimer">
          <span aria-hidden="true">ⓘ</span>
          <span>{t('footer.disclaimer')}</span>
        </div>
        <div className="bottom">
          <span>© 2026 SevaManipur · {t('hero.badge')}</span>
          <span>{t('foot.made')}</span>
        </div>
      </div>
    </footer>
  );
}
