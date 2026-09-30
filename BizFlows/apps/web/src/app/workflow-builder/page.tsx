"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    void fetch(`${API_URL}/auth/me`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return router.replace("/signin");
        const { user } = await response.json() as { user: { roles: string[] } };
        if (!user.roles.some((role) => role === "USER" || role === "OWNER")) return router.replace("/login-success");
        setAllowed(true);
      })
      .catch(() => router.replace("/signin"));
  }, [router]);

  if (!allowed) return <main className="signin-page"><p className="route-status">Checking access...</p></main>;

  return (
    <main className="signin-page">
      <section className="signin-form-panel">
        <div className="signin-card">
          <div className="signin-card-header">
            <h2>Workflow Builder</h2>
            <p>Create and run your BizFlows automations.</p>
          </div>
          <Link className="signin-main-button" href="/login-success">Back to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
