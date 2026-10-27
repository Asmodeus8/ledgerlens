"use client";

import Link from "next/link";
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthFormState } from "./actions";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    isSignUp ? signUp : signIn,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{isSignUp ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-1.5 text-sm text-muted">
        {isSignUp ? (
          <>
            Already have one?{" "}
            <Link href="/sign-in" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Ledgerlens?{" "}
            <Link href="/sign-up" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        {isSignUp && (
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required autoComplete="name" defaultValue={state.name} className="input h-10" />
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
            aria-invalid={state.error ? true : undefined}
            className="input h-10"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={isSignUp ? 8 : undefined}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={isSignUp ? "password-hint" : undefined}
              className="input h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {isSignUp && (
            <p id="password-hint" className="mt-1.5 text-xs text-subtle">
              At least 8 characters
            </p>
          )}
        </div>

        {state.error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}

        <button type="submit" className="btn-primary h-10 w-full" disabled={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
