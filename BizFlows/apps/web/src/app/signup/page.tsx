"use client";

import { useMemo, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  User
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function SignUpLogo() {
  return (
    <div className="signin-logo-mark" aria-hidden="true">
      <Image src="/bizflows-logo.png" alt="" width={38} height={38} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="brand-auth-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.52Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.45l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.88A6.01 6.01 0 0 1 6.1 12c0-.65.11-1.28.31-1.88V7.53H3.06A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.06 4.47l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 3.01 14.7 2 12 2a9.99 9.99 0 0 0-8.94 5.53l3.35 2.59C7.2 7.76 9.4 6 12 6Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="brand-auth-icon github-brand-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 7c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={met ? "met" : ""}>
      {met ? <CheckCircle2 size={15} /> : <Circle size={15} />}
      {label}
    </li>
  );
}

function getStrengthLabel(score: number) {
  if (score <= 1) return "Weak password";
  if (score === 2) return "Fair password";
  if (score === 3) return "Good password";
  return "Strong password";
}

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();


    try {
      const response = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password
        })
      });


      const data = await response.json();


      if (!response.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      alert("Registration successful!");
      window.location.href = "/signin";
      } catch (error) {
        console.log("Could not connect to backend:", error);
        alert("Could not connect to backend");
      }
    }
  

  const validation = useMemo(() => {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const hasNumber = /\d/.test(password);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passwordsMatch = password.length > 0 && password === confirmPassword;
    const firstNameValid = firstName.trim().length >= 2;
    const lastNameValid = lastName.trim().length >= 2;
    const strengthScore = [hasLength, hasUppercase, hasSpecial, hasNumber].filter(Boolean).length;

    return {
      emailValid,
      firstNameValid,
      lastNameValid,
      hasLength,
      hasUppercase,
      hasSpecial,
      hasNumber,
      passwordsMatch,
      strengthScore,
      canSubmit:
        firstNameValid &&
        lastNameValid &&
        emailValid &&
        hasLength &&
        hasUppercase &&
        hasSpecial &&
        passwordsMatch &&
        acceptedTerms
    };
  }, [acceptedTerms, confirmPassword, email, firstName, lastName, password]);

  return (
    <main className="signin-page">
      <section className="signin-layout">
        <aside className="signin-visual" aria-label="BizFlows workspace preview">
          <Link className="signin-home-link" href="/">
            <ArrowLeft size={17} />
            Back to home
          </Link>

          <div className="signin-brand">
            <SignUpLogo />
            <span>BizFlows</span>
          </div>

          <div className="signin-preview-card">
            <div className="preview-status">
              <span />
              1,284 runs today
            </div>
            <div className="preview-flow">
              <svg className="preview-connectors" viewBox="0 0 280 96" aria-hidden="true">
                <path d="M78 48 C88 48 90 30 100 30" />
                <path d="M78 48 C88 48 90 72 100 72" />
                <path d="M150 30 C162 30 164 48 173 48" />
                <path d="M150 72 C162 72 164 48 173 48" />
                <path d="M219 48 H232" />
              </svg>
              <div className="preview-node form-node">Form</div>
              <div className="preview-node api-node">API</div>
              <div className="preview-node db-node">DB</div>
              <div className="preview-node ai-node">AI</div>
              <div className="preview-node send-node">Send</div>
            </div>
            <div className="preview-success">99.2% success rate</div>
          </div>

          <div className="signin-visual-copy">
            <div className="signin-kicker">
              <Sparkles size={16} />
              Visual workflow platform
            </div>
            <h1>Build powerful workflows without writing code</h1>
            <p>
              Connect apps, automate processes, and ship secure internal tools with
              a workspace built for teams.
            </p>
          </div>

          <ul className="signin-benefits">
            <li><CheckCircle2 size={17} /> Visual workflow builder with reusable nodes</li>
            <li><CheckCircle2 size={17} /> AI-powered automation and smart decisions</li>
            <li><CheckCircle2 size={17} /> Real-time monitoring and execution logs</li>
            <li><CheckCircle2 size={17} /> Enterprise-grade security and access control</li>
          </ul>
        </aside>

        <section className="signin-form-panel signup-form-panel" aria-label="Create account">
          <div className="signup-card">
            <div className="signin-card-header">
              <SignUpLogo />
              <h2>Create your account</h2>
              <p>Join 50,000+ teams already automating with BizFlows.</p>
            </div>

            <div className="oauth-stack">
              <button type="button">
                <GoogleIcon />
                Sign up with Google
              </button>
              <button type="button">
                <GitHubIcon />
                Sign up with GitHub
              </button>
              <button type="button">
                <span className="microsoft-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                Sign up with Microsoft
              </button>
            </div>

            <div className="email-divider">
              <span />
              Or continue with email
              <span />
            </div>
    
            <form className="signin-form signup-form" onSubmit={handleSubmit}>
              <div className="name-row">
                <label>
                  First name
                  <span className={`signin-input-wrap ${firstName && validation.firstNameValid ? "valid" : ""}`}>
                    <User size={18} />
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      type="text"
                      placeholder="Jane"
                      autoComplete="given-name"
                    />
                  </span>
                </label>

                <label>
                  Last name
                  <span className={`signin-input-wrap ${lastName && validation.lastNameValid ? "valid" : ""}`}>
                    <User size={18} />
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      type="text"
                      placeholder="Smith"
                      autoComplete="family-name"
                    />
                  </span>
                </label>
              </div>

              <label>
                Work email
                <span
                  className={`signin-input-wrap ${
                    email ? (validation.emailValid ? "valid" : "invalid") : ""
                  }`}
                >
                  <Mail size={18} />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="jane@company.com"
                    autoComplete="email"
                  />
                </span>
                {email && !validation.emailValid && (
                  <span className="field-message error">Enter a valid work email address.</span>
                )}
              </label>

              <label>
                Password
                <span
                  className={`signin-input-wrap ${
                    password && validation.hasLength && validation.hasUppercase && validation.hasSpecial
                      ? "valid"
                      : ""
                  }`}
                >
                  <LockKeyhole size={18} />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((isVisible) => !isVisible)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {password && (
                <div className={`password-meter score-${validation.strengthScore}`}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {password && (
                <div className="password-feedback">
                  <strong className={`strength-label score-${validation.strengthScore}`}>
                    {getStrengthLabel(validation.strengthScore)}
                  </strong>
                  <ul>
                    <RequirementItem met={validation.hasLength} label="8+ characters" />
                    <RequirementItem met={validation.hasUppercase} label="Uppercase letter" />
                    <RequirementItem met={validation.hasSpecial} label="Special character" />
                    <RequirementItem met={validation.hasNumber} label="Number" />
                  </ul>
                </div>
              )}

              <label>
                Confirm password
                <span
                  className={`signin-input-wrap ${
                    confirmPassword ? (validation.passwordsMatch ? "valid" : "invalid") : ""
                  }`}
                >
                  <LockKeyhole size={18} />
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((isVisible) => !isVisible)}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
                {confirmPassword && (
                  <span className={`field-message ${validation.passwordsMatch ? "success" : "error"}`}>
                    {validation.passwordsMatch ? "Passwords match." : "Passwords do not match."}
                  </span>
                )}
              </label>

              <label className="remember-check terms-check">
                <input
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </span>
              </label>

              <button className="signin-main-button" type="submit" disabled={!validation.canSubmit}>
                Create free account
                <ArrowRight size={18} />
              </button>
            </form>

            <p className="signup-prompt">
              Already have an account? <a href="/signin">Sign in</a>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
