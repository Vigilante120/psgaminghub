"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The two passwords don't match.");

    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace("/orders");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-line bg-panel p-5 sm:p-8">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">New password</h1>
      <p className="mt-2 text-sm text-muted">Choose a new password for your account. At least 8 characters.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
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

        {error && <p className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}

        <button className="btn btn-primary w-full py-3.5" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
