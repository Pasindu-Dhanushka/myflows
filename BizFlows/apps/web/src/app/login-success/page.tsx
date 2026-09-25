import { CheckCircle2 } from "lucide-react";

export default function LoginSuccessPage() {
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
        </div>
      </section>
    </main>
  );
}
