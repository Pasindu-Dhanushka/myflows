"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

type ApiResponse = {
  message?: string | string[];
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const emailIsValid = useMemo(
    () =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim(),
      ),
    [email],
  );

  const canSubmit =
    emailIsValid && !isSubmitting;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSubmit) return;

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as ApiResponse;

      const responseMessage = Array.isArray(
        payload.message,
      )
        ? payload.message.join(" ")
        : payload.message;

      if (!response.ok) {
        setError(
          responseMessage ??
            "Unable to request a password reset.",
        );
        return;
      }

      setMessage(
        responseMessage ??
          "If an account exists for that email, a password reset link has been sent.",
      );
    } catch {
      setError(
        "Unable to reach the password reset service. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signin-page">
      <section
        className="signin-form-panel"
        aria-label="Forgot password"
      >
        <div className="signin-card">
          <div className="signin-card-header">
            <h2>Forgot your password?</h2>
            <p>
              Enter your email address and we&apos;ll
              send you a password reset link.
            </p>
          </div>

          <form
            className="signin-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <label>
              Email address

              <span
                className={`signin-input-wrap ${
                  email
                    ? emailIsValid
                      ? "valid"
                      : "invalid"
                    : ""
                }`}
              >
                <Mail size={18} />

                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
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

            {message && (
              <p
                className="field-message success"
                role="status"
              >
                {message}
              </p>
            )}

            {error && (
              <p
                className="field-message error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="signin-main-button"
              type="submit"
              disabled={!canSubmit}
            >
              {isSubmitting
                ? "Sending..."
                : "Send reset link"}

              {!isSubmitting && (
                <ArrowRight size={18} />
              )}
            </button>
          </form>

          <p className="signup-prompt">
            Remember your password?{" "}
            <Link href="/signin">
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}