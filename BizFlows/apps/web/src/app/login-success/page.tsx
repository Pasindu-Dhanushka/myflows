"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginSuccessPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function checkAuth() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          router.replace("/signin");
          return;
        }

        setCheckingAuth(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        router.replace("/signin");
      }
    }

    void checkAuth();

    return () => controller.abort();
  }, [router]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok && response.status !== 401) {
        throw new Error("Logout request failed.");
      }

      router.replace("/signin");
      router.refresh();
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="signin-page">
        <p role="status">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="signin-page">
      <section className="signin-form-panel" aria-label="Login successful">
        <div className="signin-card">
          <div className="signin-card-header">
            <CheckCircle2 size={48} color="#22c55e" aria-hidden="true" />
            <h2>Login successful</h2>
            <p>
              You are authenticated. This temporary page will become the
              dashboard.
            </p>
          </div>

          <div className="signin-form">
            {logoutError && (
              <p className="field-message error" role="alert">
                {logoutError}
              </p>
            )}

            <button
              className="signin-main-button"
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
