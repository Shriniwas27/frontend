import { Link } from 'react-router-dom';
import {
  Activity, Bot, Cloud, Cpu, Download, Layers, Lock, ShieldCheck,
} from 'lucide-react';
import Brand from '../components/Brand';
import androidArtwork from '../assets/vantome-android-hero.webp';

const features = [
  {
    icon: ShieldCheck,
    title: 'Self-healing infrastructure',
    description: 'Detect, diagnose, and resolve microservice failures with AI agents.',
    tone: 'blue',
    layout: 'wide',
    steps: ['Detect', 'Diagnose', 'Resolve'],
  },
  { icon: Bot, title: 'Multi-agent orchestration', description: 'Deploy agents across your services and choose how each one operates.', tone: 'green' },
  { icon: Cloud, title: 'Google Cloud integration', description: 'Connect to Cloud Run, import projects, and manage services from your dashboard.', tone: 'red' },
  { icon: Activity, title: 'Real-time monitoring', description: 'Track latency, watch live events, and get notified when something goes wrong.', tone: 'yellow', layout: 'wide' },
  { icon: Layers, title: 'Service groups', description: 'Organize microservices by project or create groups for your own environments.', tone: 'blue' },
  { icon: Lock, title: 'Granular permissions', description: 'Choose which agents can observe, restart, or scale your services.', tone: 'green' },
];

const workflow = [
  { icon: Cloud, title: 'Connect your cloud', description: 'Add credentials for your Google Cloud service account.', tone: 'blue' },
  { icon: Cpu, title: 'Import services', description: 'Choose a project and import the Cloud Run services you want to monitor.', tone: 'green' },
  { icon: Bot, title: 'Deploy AI agents', description: 'Set permissions, schedules, and operation modes for your agents.', tone: 'yellow' },
  { icon: Activity, title: 'Monitor and recover', description: 'Agents watch for incidents and respond in real time.', tone: 'red' },
];

const androidApkUrl = 'https://storage.googleapis.com/vantomeapk/app-debug.apk';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" aria-label="Vantome home"><Brand /></Link>
          <nav className="landing-nav-links" aria-label="Main navigation">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how-it-works" className="landing-nav-link">How it works</a>
            <a href="#mobile-app" className="landing-nav-link landing-nav-mobile-app">Mobile app</a>
            <Link to="/login" state={{ authMode: 'login' }} className="brand-button brand-button-outline">Sign in</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-content">
              <p className="landing-eyebrow"><Cloud aria-hidden="true" /> For Google Cloud Run</p>
              <h1>Keep your services <span>running.</span></h1>
              <p className="landing-hero-subtitle">
                Monitor your Google Cloud microservices and let AI agents detect, diagnose, and resolve incidents in real time.
              </p>
              <div className="landing-hero-actions">
                <Link to="/login" className="brand-button brand-button-primary">Get started</Link>
                <a href="#features" className="brand-button brand-button-outline">Explore features</a>
              </div>
            </div>
            <section id="mobile-app" className="landing-hero-download" aria-labelledby="android-download-title">
              <div className="landing-download-content">
                <div className="landing-download-copy">
                  <h2 id="android-download-title">Vantome for Android</h2>
                  <p>Download the APK and open it on your Android device to install Vantome.</p>
                </div>
                <a href={androidApkUrl} className="brand-button brand-button-primary">
                  <Download className="size-4 shrink-0" aria-hidden="true" /> Download Android APK
                </a>
              </div>
              <img src={androidArtwork} className="landing-download-art" alt="" width="780" height="780" fetchPriority="high" />
            </section>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section-inner">
            <div className="landing-section-header">
              <h2>Manage your services in one place</h2>
              <p>See what’s running, spot issues as they happen, and decide how your agents respond.</p>
            </div>
            <div className="landing-features-grid">
              {features.map(({ icon: Icon, title, description, tone, layout, steps }) => (
                <article key={title} className="landing-feature" data-tone={tone} data-layout={layout}>
                  <span className="landing-feature-icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  {steps && (
                    <ol className="landing-feature-flow" aria-label="Automatic incident response">
                      {steps.map(step => <li key={step}>{step}</li>)}
                    </ol>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-workflow">
          <div className="landing-section-inner">
            <div className="landing-section-header">
              <h2>From setup to self-healing</h2>
            </div>
            <ol className="landing-steps">
              {workflow.map(({ icon: Icon, title, description, tone }) => (
                <li key={title} data-tone={tone}>
                  <span className="landing-feature-icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-cta">
          <div className="landing-section-inner">
            <div>
              <h2>Start monitoring your services</h2>
              <p>Connect your Google Cloud account and deploy your first agent.</p>
            </div>
            <Link to="/login" className="brand-button brand-button-primary">Get started</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-section-inner">
          <Link to="/" aria-label="Vantome home"><Brand /></Link>
          <p>© 2026 Vantome</p>
        </div>
      </footer>
    </div>
  );
}
