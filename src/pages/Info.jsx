import { Link } from 'react-router-dom';
import { useLang } from '../i18n.jsx';
import { Icon } from '../components/UI.jsx';

function InfoShell({ title, updated, children }) {
  return (
    <div className="page container info-page" style={{ paddingTop: 40 }}>
      <h1>{title}</h1>
      <p className="updated">Last reviewed: {updated} · SevaManipur (AI4SEVA Hackathon 2026 prototype)</p>
      {children}
      <div className="callout" style={{ marginTop: 30 }}>
        <Icon name="info" size={14} style={{ verticalAlign: '-2px' }} /> Questions about this platform? The
        <Link to="/assistant"> Seva AI assistant</Link> can explain any service, or browse the
        <Link to="/services"> service directory</Link>.
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <InfoShell title="About SevaManipur" updated="October 2026">
      <p>
        SevaManipur is a citizen-services platform that brings government services, schemes and
        documents for Manipur into one place — so people can find what they need, understand the
        eligibility and paperwork, and get guidance in their own language.
      </p>
      <h2>What it does</h2>
      <ul>
        <li>A searchable directory of government services with eligibility, documents and step-by-step processes.</li>
        <li>A scheme finder that matches citizens with schemes they may qualify for.</li>
        <li>A document assistant that explains exactly what to carry for each service.</li>
        <li>Civic issue reporting with a trackable complaint ID.</li>
        <li><strong>Seva AI</strong>, an assistant that answers questions about services in English, Hindi and Meiteilon.</li>
      </ul>
      <h2>What this platform is</h2>
      <p>
        SevaManipur is a <strong>prototype developed for the AI4SEVA Hackathon 2026</strong> (National
        Innovation Challenge on AI &amp; Digital Governance – Manipur). It is not an official website of
        the Government of Manipur and does not process any official application or payment.
      </p>
      <h2>Data honesty</h2>
      <p>
        Service and scheme listings marked <strong>Demo Data</strong> are realistic reference entries created
        for the hackathon demonstration. Wherever a well-known official portal exists (for example
        Parivahan, the National Scholarship Portal, PM-KISAN), the listing links to it. Always confirm
        details with the concerned department before applying.
      </p>
    </InfoShell>
  );
}

export function PrivacyPage() {
  return (
    <InfoShell title="Privacy" updated="October 2026">
      <p>This page explains, in plain language, what the prototype stores and what it does not.</p>
      <h2>What we store</h2>
      <ul>
        <li><strong>Account details</strong> (if you register): name, email, optional phone number, and a securely hashed password.</li>
        <li><strong>Complaints</strong> you submit: description, location, district, contact name/phone and an optional photo — so they can be tracked and managed.</li>
        <li><strong>AI conversations</strong> (only if you are logged in): questions and answers, so you can revisit them in your dashboard.</li>
        <li><strong>Saved services and schemes</strong> you bookmark.</li>
      </ul>
      <h2>What we do not do</h2>
      <ul>
        <li>No advertising, no analytics trackers, no data selling.</li>
        <li>No payments, no Aadhaar/ID numbers, no bank details — the prototype never asks for them.</li>
      </ul>
      <h2>AI processing</h2>
      <p>
        Questions you send to Seva AI are processed by the Google Gemini API on the server to generate
        an answer. Keys are held only in server environment variables and are never exposed to your
        browser. Avoid sharing sensitive personal information in chat — this is a demo service.
      </p>
      <p>
        Because this is a hackathon prototype running on a local/demo database, do not enter real
        sensitive personal data into complaint forms — use the demo dataset for demonstrations.
      </p>
    </InfoShell>
  );
}

export function TermsPage() {
  return (
    <InfoShell title="Terms of Use" updated="October 2026">
      <h2>1. Prototype status</h2>
      <p>
        SevaManipur is a hackathon prototype built for AI4SEVA Hackathon 2026. It is not operated by,
        endorsed by, or affiliated with the Government of Manipur unless official authorisation is
        granted in the future.
      </p>
      <h2>2. Information accuracy</h2>
      <p>
        Listings marked <strong>Demo Data</strong> are illustrative. Even for entries that link to official
        portals, rules and requirements change — always verify with the concerned department or the
        official website before acting. Seva AI answers can contain mistakes and must not be treated as
        official advice.
      </p>
      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not submit false complaints, abuse the assistant, or attempt to disrupt the service.</li>
        <li>Rate limits and moderation are in place; access may be restricted for misuse.</li>
      </ul>
      <h2>4. Complaints</h2>
      <p>
        Complaints submitted here are stored in the prototype database for demonstration of tracking
        workflows. They are not routed to real government systems until official integration exists.
      </p>
      <h2>5. Changes</h2>
      <p>As a prototype, SevaManipur may change or be taken offline at any time during the hackathon period.</p>
    </InfoShell>
  );
}

export function AccessibilityPage() {
  return (
    <InfoShell title="Accessibility" updated="October 2026">
      <p>SevaManipur is built to be usable by everyone — including elderly users, first-time internet users and people using assistive technology.</p>
      <h2>What we do</h2>
      <ul>
        <li><strong>Three languages</strong> — switch between English, हिन्दी and মৈতৈলোন্ from the header.</li>
        <li><strong>Keyboard support</strong> — every action is reachable by keyboard, with visible focus outlines.</li>
        <li><strong>Contrast</strong> — text meets WCAG AA contrast on its background.</li>
        <li><strong>Semantic HTML</strong> — real headings, labels, landmarks and form labels for screen readers.</li>
        <li><strong>Reduced motion</strong> — animations are disabled automatically if your device requests it.</li>
        <li><strong>Simple language</strong> — short sentences and a structure that works on slow connections and small phones.</li>
      </ul>
      <h2>Known gaps</h2>
      <p>
        Meiteilon (Manipuri) translations are still incomplete in places — untranslated strings fall
        back to English. Voice input uses your browser's built-in speech recognition and may not
        support Meiteilon. These will improve with the official deployment.
      </p>
    </InfoShell>
  );
}
