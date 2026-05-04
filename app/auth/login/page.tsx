"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthButton } from "@/components/auth/auth-button";
import { InputField } from "@/components/auth/input-field";
import { setStoredUser } from "@/lib/client-auth";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySuffix = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);

  const emailError = useMemo(() => {
    if (!attempted || !email.trim()) return attempted ? "Email is required." : undefined;
    if (!isValidEmail(email)) return "Enter a valid email address.";
    return undefined;
  }, [attempted, email]);

  const passwordError = useMemo(() => {
    if (!attempted) return undefined;
    if (!password) return "Password is required.";
    return undefined;
  }, [attempted, password]);

  const formValid = isValidEmail(email) && password.length > 0;

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
            <h1 className="text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]">Sign in</h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-[var(--muted-text)]">
              Welcome back — continue to your dashboard and chef assistant.
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
                placeholder="••••••••"
                autoComplete="current-password"
                error={passwordError}
                showPasswordToggle
                required
              />

              <AuthButton disabled={!formValid}>Continue</AuthButton>

              <p className="text-center text-sm text-[var(--muted-text)]">
                New here?{" "}
                <Link
                  href={`/auth/register${querySuffix}`}
                  className="font-medium text-[var(--accent)] underline-offset-4 transition-colors duration-200 hover:underline"
                >
                  Create account
                </Link>
              </p>
            </form>
          </AuthCard>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
