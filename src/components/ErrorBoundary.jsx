import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../i18n.jsx';
import { Empty } from './UI.jsx';

// Catches render crashes inside routed pages. Without it, an exception while
// rendering unmounts the whole app and the citizen sees a blank page at the
// new URL. App.jsx remounts this boundary on pathname change, so navigating
// anywhere else clears the error automatically.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[SevaManipur] Page failed to render:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) return <BoundaryFallback onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}

function BoundaryFallback({ onRetry }) {
  const { t } = useLang();
  return (
    <div className="page container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <Empty
        icon="alert"
        title={t('common.error')}
        sub={t('error.boundarySub')}
      />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onRetry}>{t('common.retry')}</button>
        <Link className="btn btn-outline" to="/">{t('nav.home')}</Link>
      </div>
    </div>
  );
}

export default ErrorBoundary;
