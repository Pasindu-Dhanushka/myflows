"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiError = {
  message?: string | string[];
};

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailIsValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email],
  );
  const canSubmit = emailIsValid && password.length > 0 && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiError;

      if (!response.ok) {
        const message = Array.isArray(payload.message)
          ? payload.message.join(" ")
          : payload.message;
        setError(message ?? "Login failed. Please check your credentials.");
        return;
      }

      router.push("/login-success");
    } catch {
      setError("Unable to reach the login service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signin-page">
      <section className="signin-form-panel" aria-label="Sign in">
        <div className="signin-create-row">
          New to BizFlows? <Link href="/signup">Create an account</Link>
        </div>

        <div className="signin-card">
          <div className="signin-card-header">
            <h2>Welcome back</h2>
            <p>Sign in with your registered email address and password.</p>
          </div>

          <form className="signin-form" onSubmit={handleSubmit} noValidate>
            <label>
              Email address
              <span
                className={`signin-input-wrap ${
                  email ? (emailIsValid ? "valid" : "invalid") : ""
                }`}
              >
                <Mail size={18} />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </span>
              {email && !emailIsValid && (
                <span className="field-message error">
                  Enter a valid email address.
                </span>
              )}
            </label>

            <label>
              <span className="password-label-row">
                <span>Password</span>
              </span>
              <span className="signin-input-wrap">
                <LockKeyhole size={18} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <label className="remember-check">
              <input
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                type="checkbox"
              />
              <span>Remember me on this device</span>
            </label>

            {error && (
              <p
                className="field-message error"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}

            <button
              className="signin-main-button"
              type="submit"
              disabled={!canSubmit}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
