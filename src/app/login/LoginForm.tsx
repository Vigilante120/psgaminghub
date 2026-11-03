"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-redirect";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link" ? "That link has expired or was already used. Request a new one." : null
  );
  const [info, setInfo] = useState<string | null>(null);

  function switchMode(m: typeof mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) setError(error.message);
      else setInfo("If an account exists for that email, we've sent a link to reset your password.");
    } else if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.replace(next);
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.replace(next);
        router.refresh();
      } else setInfo("Check your inbox and click the confirmation link to finish signing up.");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-3xl border border-line bg-panel p-5 sm:p-8">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "signin"
          ? "Sign in to check out and track your orders."
          : mode === "signup"
            ? "It takes 20 seconds. You'll use it to track orders."
            : "Enter your account email and we'll send you a reset link."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        {mode !== "forgot" && (
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            {mode === "signin" && (
              <button type="button" onClick={() => switchMode("forgot")} className="-my-3 inline-flex min-h-11 items-center text-xs text-brand-2 hover:underline lg:min-h-0">
                Forgot password?
              </button>
            )}
          </div>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>
        )}

        {error && <p className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}
        {info && <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{info}</p>}

        <button className="btn btn-primary w-full py-3.5" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "signin" ? "New here?" : mode === "signup" ? "Already have an account?" : "Remembered it?"}{" "}
        <button onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} className="inline-flex min-h-11 items-center font-semibold text-brand-2 hover:underline lg:min-h-0">
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
