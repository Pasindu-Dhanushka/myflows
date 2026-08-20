import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  ClipboardList,
  Database,
  Mail,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Webhook,
  Zap
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CountUpStat } from "@/components/count-up-stat";

type Feature = {
  title: string;
  description: string;
  tone: string;
  Icon: LucideIcon;
};

const features: Feature[] = [
  {
    title: "Visual Workflow Builder",
    description: "Drag-and-drop canvas to build complex automation flows without writing code.",
    tone: "blue",
    Icon: Zap
  },
  {
    title: "AI-Powered Automation",
    description: "Integrate Claude, GPT-4o, and other AI models directly into your workflows.",
    tone: "purple",
    Icon: Bot
  },
  {
    title: "Universal Data Layer",
    description: "Connect to any database, spreadsheet, or data warehouse in seconds.",
    tone: "green",
    Icon: Database
  },
  {
    title: "Real-Time Webhooks",
    description: "Trigger workflows instantly from any HTTP event, MQTT, or websocket.",
    tone: "sky",
    Icon: Webhook
  },
  {
    title: "Analytics & Monitoring",
    description: "Track every execution with detailed logs, metrics, and failure alerts.",
    tone: "amber",
    Icon: BarChart3
  },
  {
    title: "Enterprise Security",
    description: "SSO, RBAC, audit logs, and SOC 2 Type II compliance built in.",
    tone: "red",
    Icon: ShieldCheck
  }
];

const testimonials = [
  {
    quote:
      "BizFlows cut our automation development time by 80%. We shipped 3x faster within the first month.",
    name: "Sarah Lin",
    role: "CTO, Nexus Corp",
    initials: "SL",
    tone: "violet"
  },
  {
    quote:
      "The AI nodes are incredible. We automated our entire support triage pipeline with zero code.",
    name: "Marcus Webb",
    role: "VP Engineering, Apex",
    initials: "MW",
    tone: "teal"
  },
  {
    quote:
      "Finally a platform that scales from prototype to 10M executions/month without breaking a sweat.",
    name: "Priya Nair",
    role: "Head of Ops, Orbit AI",
    initials: "PN",
    tone: "orange"
  }
];

const pricing = [
  {
    plan: "Starter",
    price: "Free",
    features: ["5 workflows", "1,000 executions/mo", "3 team members", "Community support", "Basic analytics"],
    action: "Get started",
    href: "/signup"
  },
  {
    plan: "Professional",
    price: "$49",
    suffix: "/month",
    popular: true,
    features: [
      "Unlimited workflows",
      "50,000 executions/mo",
      "20 team members",
      "Priority support",
      "Advanced analytics",
      "AI nodes included"
    ],
    action: "Get started",
    href: "/signup"
  },
  {
    plan: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited everything",
      "SLA guarantee",
      "Custom integrations",
      "Dedicated support",
      "SSO / SAML",
      "Audit logs"
    ],
    action: "Contact sales",
    href: "#enterprise"
  }
];

function Logo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <Image src="/bizflows-logo.png" alt="" width={42} height={42} />
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#">
          <Logo />
          <span>BizFlows</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#solutions">Solutions</a>
          <a href="#pricing">Pricing</a>
          <a href="#enterprise">Enterprise</a>
          <a href="#blog">Blog</a>
        </nav>
        <div className="header-actions">
          <a className="signin-link" href="/signin">Sign in</a>
          <Link className="primary-pill" href="/signup">Get started free</Link>
        </div>
      </header>

      <section className="hero-section" id="product">
        <div className="hero-inner">
          <div className="announcement">
            <Sparkles size={16} strokeWidth={2.4} />
            Now with Claude AI and GPT-4o integration
          </div>
          <h1>
            The enterprise workflow
            <strong>platform that scales</strong>
          </h1>
          <p>
            Build, automate, and monitor complex business workflows visually.
            <br />
            No code required. From prototype to production in minutes.
          </p>
          <div className="hero-actions">
            <Link className="primary-button magnetic-button" href="/signup">
              Start for free <ArrowRight size={22} strokeWidth={2.6} />
            </Link>
            <a className="secondary-button magnetic-button" href="#">
              <Play size={19} strokeWidth={2.4} />
              Watch demo
            </a>
          </div>
          <p className="hero-note">Free forever - No credit card - 5-minute setup</p>
        </div>
      </section>

      <section className="builder-preview" aria-label="Workflow builder preview">
        <div className="browser-window">
          <div className="window-bar">
            <div className="window-dots" aria-hidden="true">
              <span className="red" />
              <span className="yellow" />
              <span className="green" />
            </div>
            <div className="address-pill">
              <span aria-hidden="true">@</span> app.bizflows.io/workflow-builder
            </div>
          </div>
          <div className="workflow-canvas">
            <div className="runs-card">
              <span>Today&apos;s runs</span>
              <strong>1,284</strong>
              <small><TrendingUp size={14} /> 98% success</small>
            </div>
            <div className="workflow-row">
              <div className="workflow-node node-blue"><ClipboardList size={22} /> Form Trigger</div>
              <ChevronRight className="connector" aria-hidden="true" />
              <div className="workflow-node node-green"><Check size={22} /> Validate Data</div>
              <ChevronRight className="connector" aria-hidden="true" />
              <div className="workflow-node node-purple"><Bot size={22} /> Claude AI</div>
              <ChevronRight className="connector" aria-hidden="true" />
              <div className="workflow-node node-red"><Mail size={22} /> Send Email</div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          <CountUpStat value={50000} suffix="+" label="Workflows created" />
          <CountUpStat value={2.4} suffix="B+" decimals={1} label="Executions monthly" />
          <CountUpStat value={99.9} suffix="%" decimals={1} label="Uptime SLA" />
          <CountUpStat value={140} suffix="+" label="Countries" />
        </div>
      </section>

      <section className="features-section" id="solutions">
        <div className="section-heading">
          <h2>Everything you need to automate</h2>
          <p>A complete platform for building, deploying, and monitoring business workflows at any scale.</p>
        </div>
        <div className="feature-grid">
          {features.map(({ Icon, ...feature }) => (
            <article className="feature-card" key={feature.title}>
              <div className={`feature-icon ${feature.tone}`}>
                <Icon size={27} strokeWidth={2.2} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="testimonial-section">
        <div className="section-heading">
          <h2>Trusted by engineering teams worldwide</h2>
          <p>Join 50,000+ companies that automate with BizFlows.</p>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.name}>
              <div className="stars" aria-label="5-star rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={18} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p>&quot;{testimonial.quote}&quot;</p>
              <div className="person">
                <span className={`avatar ${testimonial.tone}`}>{testimonial.initials}</span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="section-heading">
          <h2>Simple, transparent pricing</h2>
          <p>Start for free, scale as you grow. No hidden fees.</p>
        </div>
        <div className="pricing-grid">
          {pricing.map((tier) => (
            <article className={`pricing-card ${tier.popular ? "popular" : ""}`} key={tier.plan}>
              {tier.popular && <span className="popular-badge">Most Popular</span>}
              <h3>{tier.plan}</h3>
              <div className="price">
                {tier.price}
                {tier.suffix && <span>{tier.suffix}</span>}
              </div>
              <ul>
                {tier.features.map((item) => (
                  <li key={item}>
                    <span className="check-icon"><Check size={13} strokeWidth={3} /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <a className={tier.popular ? "pricing-action primary" : "pricing-action"} href={tier.href}>
                {tier.action}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-wrap">
        <div className="cta-panel">
          <h2>Ready to automate everything?</h2>
          <p>Join 50,000+ teams shipping automation 10x faster.</p>
          <div>
            <Link className="cta-button magnetic-button" href="/signup">Start for free <ArrowRight size={21} /></Link>
            <a className="sales-link" href="#">Talk to sales</a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <a className="footer-brand" href="#">
            <Logo />
            <span>BizFlows</span>
          </a>
          <nav aria-label="Footer navigation">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="#">Status</a>
          </nav>
          <p>(c) 2024 BizFlows, Inc. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
