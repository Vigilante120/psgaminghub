"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-hot/30 bg-hot/10 p-8">
      <h2 className="font-display text-xl font-bold uppercase">That didn't work</h2>
      <p className="mt-2 text-sm text-muted">
        {process.env.NODE_ENV === "development" ? error.message : "Check the form (e.g. receipt attached, price filled) and try again."}
      </p>
      <button onClick={reset} className="btn btn-primary mt-5">Try again</button>
    </div>
  );
}
