"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";
import { setStoredUser } from "@/lib/client-auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredUser(email);
    const nextPath = searchParams.get("next");
    router.push(nextPath || "/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar showAuth={false} />
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <h1 className="mb-6 text-3xl font-bold">Sign In</h1>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3"
          />
          <button className="w-full rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)]">
            Continue
          </button>
          <p className="text-sm text-[var(--muted-text)]">
            New here?{" "}
            <Link href="/auth/register" className="text-[var(--accent)]">
              Create account
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
