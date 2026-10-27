"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";

export type AuthFormState = { error?: string; email?: string; name?: string };

const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const SignUpSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = SignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your email and password.", email };

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (err) {
    // One message for unknown email and wrong password, so accounts can't be enumerated.
    if (isAPIError(err)) return { error: "Invalid email or password.", email };
    throw err;
  }
  redirect("/");
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");
  const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue?.path[0] === "password" ? issue.message : `Enter a valid ${String(issue?.path[0] ?? "value")}.`;
    return { error: message, email, name };
  }

  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
  } catch (err) {
    if (isAPIError(err)) return { error: err.message || "Could not create the account.", email, name };
    throw err;
  }
  redirect("/");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
