"use client";

import {
  ArrowRight,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

type ApiResponse = {
  message?: string | string[];
};

type TokenState =
  | "checking"
  | "valid"
  | "invalid";

export function ResetPasswordForm({
  token,
}: {
  token: string;
}) {
  const router = useRouter();

  const [tokenState, setTokenState] =
    useState<TokenState>("checking");

  const [tokenError, setTokenError] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setTokenState("invalid");
        setTokenError(
          "This password reset link is invalid.",
        );
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
        );

        const payload =
          (await response
            .json()
            .catch(() => ({}))) as ApiResponse;

        if (!response.ok) {
          const message = Array.isArray(
            payload.message,
          )
            ? payload.message.join(" ")
            : payload.message;

          setTokenState("invalid");

          setTokenError(
            message ??
              "This password reset link is invalid or has expired.",
          );

          return;
        }

        setTokenState("valid");
      } catch {
        setTokenState("invalid");

        setTokenError(
          "Unable to validate this password reset link.",
        );
      }
    }

    void validateToken();
  }, [token]);

  const passwordsMatch =
    newPassword.length > 0 &&
    newPassword === confirmPassword;

  const passwordIsValid =
    newPassword.length >= 8 &&
    newPassword.length <= 128;

  const canSubmit = useMemo(
    () =>
      tokenState === "valid" &&
      passwordIsValid &&
      passwordsMatch &&
      !isSubmitting,
    [
      tokenState,
      passwordIsValid,
      passwordsMatch,
      isSubmitting,
    ],
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        const message = Array.isArray(
          payload.message,
        )
          ? payload.message.join(" ")
          : payload.message;

        setError(
          message ??
            "Unable to reset your password.",
        );

        return;
      }

      router.replace("/signin");
    } catch {
      setError(
        "Unable to reach the password reset service.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (tokenState === "checking") {
    return (
      <main className="signin-page">
        <section className="signin-form-panel">
          <div className="signin-card">
            <div className="signin-card-header">
              <h2>Checking reset link...</h2>
              <p>
                Please wait while BizFlows validates
                your password reset request.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (tokenState === "invalid") {
    return (
      <main className="signin-page">
        <section className="signin-form-panel">
          <div className="signin-card">
            <div className="signin-card-header">
              <h2>Reset link unavailable</h2>

              <p>{tokenError}</p>

              <Link href="/forgot-password">
                Request a new reset link
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="signin-page">
      <section
        className="signin-form-panel"
        aria-label="Reset password"
      >
        <div className="signin-card">
          <div className="signin-card-header">
            <h2>Create a new password</h2>

            <p>
              Enter and confirm your new BizFlows
              password.
            </p>
          </div>

          <form
            className="signin-form"
            onSubmit={handleSubmit}
          >
            <label>
              New password

              <span className="signin-input-wrap">
                <LockKeyhole size={18} />

                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Enter new password"
                />
              </span>

              {newPassword &&
                !passwordIsValid && (
                  <span className="field-message error">
                    Password must be between 8 and
                    128 characters.
                  </span>
                )}
            </label>

            <label>
              Confirm new password

              <span className="signin-input-wrap">
                <LockKeyhole size={18} />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                />
              </span>

              {confirmPassword &&
                !passwordsMatch && (
                  <span className="field-message error">
                    Passwords do not match.
                  </span>
                )}
            </label>

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
                ? "Resetting password..."
                : "Reset password"}

              {!isSubmitting && (
                <ArrowRight size={18} />
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}