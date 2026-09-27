"use client";

import { FormEvent, useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function VerifyEmailPendingPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    "Check your inbox and click the verification link."
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialEmail = params.get("email");

    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, []);

  async function handleResend(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSending(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      setMessage(
        Array.isArray(data.message)
          ? data.message.join(" ")
          : data.message ?? "Verification email requested."
      );
    } catch {
      setMessage(
        "Unable to request another verification email."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="signin-page">
      <section
        className="signin-form-panel"
        aria-label="Email verification"
      >
        <div className="signin-card">
          <div className="signin-card-header">
            <h2>Verify your email</h2>
            <p>{message}</p>
          </div>

          <form
            className="signin-form"
            onSubmit={handleResend}
          >
            <label>
              Email address

              <span className="signin-input-wrap">
                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  type="email"
                  required
                />
              </span>
            </label>

            <button
              className="signin-main-button"
              type="submit"
              disabled={sending}
            >
              {sending
                ? "Sending..."
                : "Resend verification email"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}