"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    async function verifyEmail() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Verification link is invalid.");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/verify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setStatus("error");

          setMessage(
            Array.isArray(data.message)
              ? data.message.join(" ")
              : (data.message ?? "Email verification failed."),
          );

          return;
        }

        setStatus("success");

        setMessage(data.message ?? "Email verified successfully.");
      } catch {
        setStatus("error");

        setMessage("Unable to contact the verification service.");
      }
    }

    void verifyEmail();
  }, []);

  return (
    <main className="signin-page">
      <section className="signin-form-panel" aria-label="Verify email">
        <div className="signin-card">
          <div className="signin-card-header">
            <h2>
              {status === "verifying"
                ? "Verifying email..."
                : status === "success"
                  ? "Email verified"
                  : "Verification failed"}
            </h2>

            <p>{message}</p>
          </div>

          {status === "success" && (
            <Link className="signin-main-button" href="/signin">
              Continue to sign in
            </Link>
          )}

          {status === "error" && (
            <Link className="signin-main-button" href="/verify-email-pending">
              Request another email
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
