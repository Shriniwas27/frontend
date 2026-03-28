import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Cloud, 
  ArrowRight, 
  Zap, 
  Eye, 
  Bot,
  GitBranch,
  Lock,
  BarChart3,
  Layers
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: ShieldCheck,
      title: 'Self-Healing Infrastructure',
      desc: 'AI agents autonomously detect, diagnose, and resolve microservice failures before they impact users.',
      color: '#1a73e8'
    },
    {
      icon: Bot,
      title: 'Multi-Agent Orchestration',
      desc: 'Deploy multiple AI agents across your services with customizable operation modes and permissions.',
      color: '#34a853'
    },
    {
      icon: Cloud,
      title: 'Native GCP Integration',
      desc: 'Seamlessly connect to Google Cloud Run, import projects, and manage services directly from the dashboard.',
      color: '#ea4335'
    },
    {
      icon: Activity,
      title: 'Real-Time Monitoring',
      desc: 'Live event streams, latency tracking, and instant alerts keep you informed of every system event.',
      color: '#fbbc04'
    },
    {
      icon: Layers,
      title: 'Smart Grouping',
      desc: 'Organize microservices by project or create custom environment groups for logical boundaries.',
      color: '#1a73e8'
    },
    {
      icon: Lock,
      title: 'Granular Permissions',
      desc: 'Control exactly what each agent can do – from observation-only to full autonomous restart and scaling.',
      color: '#34a853'
    }
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime Guarantee' },
    { value: '<2s', label: 'Incident Response' },
    { value: '1.2k+', label: 'Auto-Heals / Day' },
    { value: '24/7', label: 'Continuous Monitoring' }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="landing-logo-text">Vantome</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how-it-works" className="landing-nav-link">How it Works</a>
            <button 
              onClick={() => navigate('/login')}
              className="landing-nav-cta"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-hero-grid"></div>
          <div className="landing-hero-glow"></div>
        </div>

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Zap className="w-3.5 h-3.5" />
            <span>AI-Powered Infrastructure Management</span>
          </div>

          <h1 className="landing-hero-title">
            Self-Healing Microservices.<br />
            <span className="landing-hero-gradient">Powered by AI Agents.</span>
          </h1>

          <p className="landing-hero-subtitle">
            Deploy intelligent agents that monitor, diagnose, and automatically resolve 
            infrastructure issues across your Google Cloud microservices — in real time.
          </p>

          <div className="landing-hero-actions">
            <button 
              onClick={() => navigate('/login')}
              className="landing-btn-primary"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#features" className="landing-btn-secondary">
              <Eye className="w-5 h-5" /> Learn More
            </a>
          </div>

          {/* Stats */}
          <div className="landing-stats">
            {stats.map((stat, i) => (
              <div key={i} className="landing-stat">
                <div className="landing-stat-value">{stat.value}</div>
                <div className="landing-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Visual */}
        <div className="landing-hero-visual">
          <div className="landing-dashboard-preview">
            <div className="landing-preview-header">
              <div className="landing-preview-dots">
                <span className="dot-red"></span>
                <span className="dot-yellow"></span>
                <span className="dot-green"></span>
              </div>
              <span className="landing-preview-title">Vantome Dashboard</span>
            </div>
            <div className="landing-preview-body">
              <div className="landing-preview-sidebar">
                <div className="preview-nav-item active"><BarChart3 className="w-3 h-3" /> Dashboard</div>
                <div className="preview-nav-item"><Cpu className="w-3 h-3" /> Services</div>
                <div className="preview-nav-item"><GitBranch className="w-3 h-3" /> Topology</div>
              </div>
              <div className="landing-preview-main">
                <div className="preview-card green">
                  <div className="preview-card-dot green"></div>
                  <span>Auth-Service</span>
                  <span className="preview-status">Operational</span>
                </div>
                <div className="preview-card blue">
                  <div className="preview-card-dot blue"></div>
                  <span>Payment-Gate</span>
                  <span className="preview-status">Healing...</span>
                </div>
                <div className="preview-card green">
                  <div className="preview-card-dot green"></div>
                  <span>User-Profile</span>
                  <span className="preview-status">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-badge">CAPABILITIES</span>
            <h2 className="landing-section-title">Everything you need for<br />resilient infrastructure</h2>
            <p className="landing-section-desc">AI-driven tools that work together to keep your microservices healthy and performant.</p>
          </div>

          <div className="landing-features-grid">
            {features.map((feature, i) => (
              <div key={i} className="landing-feature-card" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="landing-feature-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-how-it-works">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-badge">WORKFLOW</span>
            <h2 className="landing-section-title">Get up and running in minutes</h2>
          </div>

          <div className="landing-steps">
            {[
              { step: '01', title: 'Connect Your Cloud', desc: 'Upload your GCP service account credentials to securely connect your infrastructure.', icon: Cloud },
              { step: '02', title: 'Import Services', desc: 'Select your GCP project and import Cloud Run microservices with one click.', icon: Cpu },
              { step: '03', title: 'Deploy AI Agents', desc: 'Assign agents with custom permissions, schedules, and operation modes.', icon: Bot },
              { step: '04', title: 'Self-Healing Begins', desc: 'Agents monitor, diagnose, and heal issues autonomously in real time.', icon: Activity }
            ].map((item, i) => (
              <div key={i} className="landing-step">
                <div className="landing-step-number">{item.step}</div>
                <div className="landing-step-icon">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="landing-step-title">{item.title}</h3>
                <p className="landing-step-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2 className="landing-cta-title">Ready to make your infrastructure self-healing?</h2>
          <p className="landing-cta-desc">Connect your Google Cloud account and deploy AI agents in minutes.</p>
          <button 
            onClick={() => navigate('/login')}
            className="landing-btn-primary large"
          >
            Start Now — It's Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon small">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="landing-logo-text small">Vantome</span>
          </div>
          <p className="landing-footer-text">© 2026 Vantome. Built for resilient cloud infrastructure.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
