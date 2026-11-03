"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-redirect";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "signin") {
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
    <div className="rounded-3xl border border-line bg-panel p-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
        {mode === "signin" ? "Welcome back" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "signin" ? "Sign in to check out and track your orders." : "It takes 20 seconds. You'll use it to track orders."}
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
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>

        {error && <p className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}
        {info && <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{info}</p>}

        <button className="btn btn-primary w-full py-3.5" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-brand-2 hover:underline">
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
