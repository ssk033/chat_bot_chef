"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthButton } from "@/components/auth/auth-button";
import { InputField } from "@/components/auth/input-field";
import { setStoredUser } from "@/lib/client-auth";

const MIN_PASSWORD = 8;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySuffix = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [attempted, setAttempted] = useState(false);

  const emailError = useMemo(() => {
    if (!attempted || !email.trim()) return attempted ? "Email is required." : undefined;
    if (!isValidEmail(email)) return "Enter a valid email address.";
    return undefined;
  }, [attempted, email]);

  const passwordError = useMemo(() => {
    if (!attempted || !password) return attempted ? "Password is required." : undefined;
    if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
    return undefined;
  }, [attempted, password]);

  const confirmError = useMemo(() => {
    if (!attempted || !confirm) return attempted ? "Confirm your password." : undefined;
    if (password !== confirm) return "Passwords do not match.";
    return undefined;
  }, [attempted, confirm, password]);

  const formValid =
    isValidEmail(email) && password.length >= MIN_PASSWORD && password === confirm && confirm.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      setAttempted(true);
      return;
    }
    setStoredUser(email);
    const nextPath = searchParams.get("next");
    router.push(nextPath || "/dashboard");
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--accent-muted)_55%,transparent)] to-[color-mix(in_srgb,var(--foreground)_8%,transparent)] opacity-50 dark:opacity-35"
        aria-hidden
      />
      <AppNavbar showAuth={false} />
      <main className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <AuthCard>
            <h1 className="text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Create account
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-[var(--muted-text)]">
              Join Meal-IT!! to save chats, meal plans, and preferences across devices.
            </p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
              <InputField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
                error={emailError}
                required
              />
              <InputField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={`At least ${MIN_PASSWORD} characters`}
                autoComplete="new-password"
                error={passwordError}
                showPasswordToggle
                required
              />
              <InputField
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat password"
                autoComplete="new-password"
                error={confirmError}
                showPasswordToggle
                required
              />

              <AuthButton disabled={!formValid}>Register</AuthButton>

              <p className="text-center text-sm text-[var(--muted-text)]">
                Already have an account?{" "}
                <Link
                  href={`/auth/login${querySuffix}`}
                  className="font-medium text-[var(--accent)] underline-offset-4 transition-colors duration-200 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </AuthCard>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
          <AppNavbar showAuth={false} />
          <div className="flex flex-1 items-center justify-center px-6 py-8 text-sm text-[var(--muted-text)]">
            Loading…
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
