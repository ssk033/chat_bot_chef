"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";
import { setStoredUser } from "@/lib/client-auth";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setStoredUser(email);
    const nextPath = searchParams.get("next");
    router.push(nextPath || "/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar showAuth={false} />
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <h1 className="mb-6 text-3xl font-bold">Create Account</h1>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" required className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3" />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button className="w-full rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)]">
            Register
          </button>
          <p className="text-sm text-[var(--muted-text)]">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[var(--accent)]">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
