import { Link } from 'react-router-dom';
import { useLang } from '../i18n.jsx';
import { Icon } from '../components/UI.jsx';

function InfoShell({ title, updated, children }) {
  const { t } = useLang();
  return (
    <div className="page container info-page" style={{ paddingTop: 40 }}>
      <h1>{title}</h1>
      <p className="updated">{t('info.lastReviewed')}: {updated} · SevaManipur ({t('info.prototypeTag')})</p>
      {children}
      <div className="callout" style={{ marginTop: 30 }}>
        <Icon name="info" size={14} style={{ verticalAlign: '-2px' }} /> {t('info.questionsAbout')}
        <Link to="/assistant"> {t('info.assistantLink')}</Link> {t('info.orBrowse')}
        <Link to="/services"> {t('info.servicesLink')}</Link>.
      </div>
    </div>
  );
}

export function AboutPage() {
  const { t } = useLang();
  return (
    <InfoShell title={t('info.aboutTitle')} updated={t('info.updated')}>
      <p>{t('info.aboutIntro')}</p>
      <h2>{t('info.whatItDoes')}</h2>
      <ul>
        <li>{t('info.aboutFeature1')}</li>
        <li>{t('info.aboutFeature2')}</li>
        <li>{t('info.aboutFeature3')}</li>
        <li>{t('info.aboutFeature4')}</li>
        <li>{t('info.aboutFeature5')}</li>
      </ul>
      <h2>{t('info.platformHeading')}</h2>
      <p>{t('info.platformText')}</p>
      <h2>{t('info.dataHonestyHeading')}</h2>
      <p>{t('info.dataHonestyText')}</p>
    </InfoShell>
  );
}

export function PrivacyPage() {
  const { t } = useLang();
  return (
    <InfoShell title={t('foot.privacy')} updated={t('info.updated')}>
      <p>{t('info.privacyIntro')}</p>
      <h2>{t('info.whatWeStore')}</h2>
      <ul>
        <li>{t('info.storeAccount')}</li>
        <li>{t('info.storeComplaints')}</li>
        <li>{t('info.storeConversations')}</li>
        <li>{t('info.storeSaved')}</li>
      </ul>
      <h2>{t('info.whatWeDoNot')}</h2>
      <ul>
        <li>{t('info.noAds')}</li>
        <li>{t('info.noSensitiveIds')}</li>
      </ul>
      <h2>{t('info.aiProcessing')}</h2>
      <p>{t('info.aiProcessingText')}</p>
      <p>{t('info.sensitiveDataNote')}</p>
    </InfoShell>
  );
}

export function TermsPage() {
  const { t } = useLang();
  return (
    <InfoShell title={t('foot.terms')} updated={t('info.updated')}>
      <h2>{t('info.termPrototypeHeading')}</h2>
      <p>{t('info.termPrototypeText')}</p>
      <h2>{t('info.termAccuracyHeading')}</h2>
      <p>{t('info.termAccuracyText')}</p>
      <h2>{t('info.termUseHeading')}</h2>
      <ul>
        <li>{t('info.termUse1')}</li>
        <li>{t('info.termUse2')}</li>
      </ul>
      <h2>{t('info.termComplaintsHeading')}</h2>
      <p>{t('info.termComplaintsText')}</p>
      <h2>{t('info.termChangesHeading')}</h2>
      <p>{t('info.termChangesText')}</p>
    </InfoShell>
  );
}

export function AccessibilityPage() {
  const { t } = useLang();
  return (
    <InfoShell title={t('foot.accessibility')} updated={t('info.updated')}>
      <p>{t('info.accessibilityIntro')}</p>
      <h2>{t('info.accessibilityFeatures')}</h2>
      <ul>
        <li>{t('info.accessibilityLanguages')}</li>
        <li>{t('info.accessibilityKeyboard')}</li>
        <li>{t('info.accessibilityContrast')}</li>
        <li>{t('info.accessibilitySemantics')}</li>
        <li>{t('info.accessibilityMotion')}</li>
        <li>{t('info.accessibilitySimple')}</li>
      </ul>
      <h2>{t('info.accessibilityGaps')}</h2>
      <p>{t('info.accessibilityGapsText')}</p>
    </InfoShell>
  );
}
