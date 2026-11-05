"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-redirect";
import PasswordInput from "@/components/PasswordInput";
import Spinner from "@/components/Spinner";

const BUSY_LABEL = { signin: "Signing in…", signup: "Creating account…", forgot: "Sending link…" };
const IDLE_LABEL = { signin: "Sign in", signup: "Create account", forgot: "Send reset link" };

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // busy: request in flight. done: signed in, waiting for the redirect; the form stays locked.
  // google: on the way to Google's sign-in page.
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "google">("idle");
  const inFlight = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link"
      ? "That link has expired or was already used. Request a new one."
      : params.get("error") === "oauth"
        ? "Google sign-in was cancelled or didn't finish. Try again, or use your email below."
        : null
  );
  const [info, setInfo] = useState<string | null>(null);

  const locked = status !== "idle";

  // Restart the shake even when the same error shows twice in a row.
  function fail(message: string) {
    setError(message);
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove("animate-shake");
    void el.offsetWidth;
    el.classList.add("animate-shake");
  }

  function signedIn() {
    setStatus("done");
    router.replace(next);
    router.refresh();
    // If the client-side navigation stalls, fall back to a full page load.
    setTimeout(() => window.location.assign(next), 6000);
  }

  // Google signs people in and creates the account on first use; the callback route finishes it.
  async function continueWithGoogle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setInfo(null);
    setStatus("google");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // On success the browser is already leaving for Google; only failures land here.
    if (error) {
      fail(error.message);
      inFlight.current = false;
      setStatus("idle");
    }
  }

  function switchMode(m: typeof mode) {
    if (locked) return;
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setError(null);
    setInfo(null);
    if (mode === "signup") {
      const digits = whatsapp.replace(/\D/g, "").length;
      if (digits < 10 || digits > 15) return fail("Enter a valid WhatsApp number with country code, e.g. +91 98765 43210.");
      if (password !== confirm) return fail("The two passwords don't match.");
    }
    inFlight.current = true;
    setStatus("busy");
    const supabase = createClient();

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) fail(error.message);
        else setInfo("If an account exists for that email, we've sent a link to reset your password.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) fail(error.message);
        else return signedIn();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim(), whatsapp: whatsapp.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) fail(error.message);
        else if (data.session) return signedIn();
        else setInfo("Check your inbox and click the confirmation link to finish signing up.");
      }
    } catch {
      fail("Couldn't reach the server. Check your connection and try again.");
    }
    inFlight.current = false;
    setStatus("idle");
  }

  return (
    // Entrance on the wrapper, shake on the card: two elements, so ending one never replays the other.
    <div className="animate-rise">
    <div
      ref={cardRef}
      onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove("animate-shake")}
      className="rounded-3xl border border-line bg-panel p-5 sm:p-8"
    >
      <h1 key={mode} className="animate-fade-in font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "signin"
          ? "Sign in to check out and track your orders."
          : mode === "signup"
            ? "It takes 20 seconds. You'll use it to track orders."
            : "Enter your account email and we'll send you a reset link."}
      </p>

      {mode !== "forgot" && (
        <>
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={locked}
            aria-busy={status === "google"}
            className="btn mt-6 w-full border border-line bg-white py-3.5 text-[#1f1f1f] normal-case tracking-normal hover:bg-zinc-100"
          >
            {status === "google" ? <Spinner /> : <GoogleIcon />}
            {status === "google" ? "Opening Google…" : "Continue with Google"}
          </button>
          <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-line" />
            or with email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className={mode === "forgot" ? "mt-6" : "mt-5"} aria-busy={locked}>
        <fieldset disabled={locked} className={`space-y-4 transition-opacity duration-200 ${locked ? "opacity-60" : ""}`}>
        {mode === "signup" && (
          <div className="animate-rise">
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        {mode === "signup" && (
          <div className="animate-rise">
            <label className="label" htmlFor="whatsapp">WhatsApp number</label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              className="input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+91 98765 43210"
              required
              maxLength={20}
              autoComplete="tel"
            />
            <p className="mt-1.5 text-xs text-muted">We'll message you here to deliver your games.</p>
          </div>
        )}
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
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {mode === "signup" && <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>}
        </div>
        )}
        {mode === "signup" && (
          <div className="animate-rise">
            <label className="label" htmlFor="confirm">Confirm password</label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        )}

        </fieldset>

        <div aria-live="polite" className="mt-4 space-y-4 empty:mt-0">
          {error && (
            <p role="alert" className="animate-rise rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">
              {error}
            </p>
          )}
          {info && <p className="animate-rise rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{info}</p>}
        </div>

        <button
          className={`btn mt-4 w-full py-3.5 ${status === "done" ? "bg-emerald-500 text-white disabled:opacity-100" : "btn-primary"}`}
          disabled={locked}
          aria-busy={status === "busy"}
        >
          {status === "busy" ? (
            <>
              <Spinner />
              {BUSY_LABEL[mode]}
            </>
          ) : status === "done" ? (
            <>
              <svg viewBox="0 0 24 24" className="animate-pop h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Signed in — redirecting…
            </>
          ) : (
            IDLE_LABEL[mode]
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "signin" ? "New here?" : mode === "signup" ? "Already have an account?" : "Remembered it?"}{" "}
        <button
          type="button"
          disabled={locked}
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="inline-flex min-h-11 items-center font-semibold text-brand-2 transition-opacity hover:underline disabled:opacity-50 lg:min-h-0"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
    </div>
  );
}

// Google's four-colour "G", as their sign-in branding asks for.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
