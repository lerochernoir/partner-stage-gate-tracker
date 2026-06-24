import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <div className="card-body">
          <p className="brand-kicker">Blue Yonder Alliances</p>
          <h1 className="page-title">Sign in</h1>
          <p className="page-description">
            Access the Partner Stage Gate Tracker.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
