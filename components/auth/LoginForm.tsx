"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const next = searchParams.get("next") ?? "/partners";

  return (
    <form action={formAction} className="form">
      <input name="next" type="hidden" value={next} />
      <div className="field">
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="input"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="input"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state.error ? <p className="error">{state.error}</p> : null}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
