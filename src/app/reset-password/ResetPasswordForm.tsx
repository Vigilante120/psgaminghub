"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import Spinner from "@/components/Spinner";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The two passwords don't match.");
    if (busy) return;

    setBusy(true);
    const { error } = await createClient()
      .auth.updateUser({ password })
      .catch(() => ({ error: new Error("Couldn't reach the server. Check your connection and try again.") }));
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setDone(true);
    router.replace("/orders");
    router.refresh();
  }

  return (
    <div className="animate-rise rounded-3xl border border-line bg-panel p-5 sm:p-8">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">New password</h1>
      <p className="mt-2 text-sm text-muted">Choose a new password for your account. At least 8 characters.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy}>
        <fieldset disabled={busy} className={`space-y-4 transition-opacity duration-200 ${busy ? "opacity-60" : ""}`}>
        <div>
          <label className="label" htmlFor="password">New password</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        </fieldset>

        {error && (
          <p key={error} role="alert" className="animate-shake rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">
            {error}
          </p>
        )}

        <button
          className={`btn w-full py-3.5 ${done ? "bg-emerald-500 text-white disabled:opacity-100" : "btn-primary"}`}
          disabled={busy}
          aria-busy={busy && !done}
        >
          {done ? (
            <>
              <svg viewBox="0 0 24 24" className="animate-pop h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved — redirecting…
            </>
          ) : busy ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            "Save new password"
          )}
        </button>
      </form>
    </div>
  );
}
