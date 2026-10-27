"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthFormState } from "./actions";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    isSignUp ? signUp : signIn,
    {},
  );

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {isSignUp ? "Create account" : "Sign in"}
      </h1>
      <form action={formAction} className="card space-y-4 p-6">
        {isSignUp && (
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required autoComplete="name" defaultValue={state.name} className="input" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.email}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isSignUp ? 8 : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="input"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full justify-center" disabled={pending}>
          {pending ? "…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        {isSignUp ? (
          <>
            Have an account?{" "}
            <Link href="/sign-in" className="text-foreground hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/sign-up" className="text-foreground hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
