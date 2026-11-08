"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import { QR_LIMIT, deliveryLine, inr, splitForQr, upiLink } from "@/lib/store";
import type { Slot } from "@/lib/types";

const MAX_MB = 5;
/** Matches submit_payment_proof in SQL (migration 010). */
const MAX_FILES = 10;

type Method = "qr" | "upi";

export default function PaymentPanel({
  orderId,
  orderNumber,
  amount,
  userId,
  resubmit,
  items,
  defaultName,
  defaultPhone,
}: {
  orderId: string;
  orderNumber: string;
  amount: number;
  userId: string;
  resubmit: boolean;
  items: { title: string; platform: string; slot: Slot }[];
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? "";
  // QR payments are capped at ₹2,000 a scan, so bigger totals become several payments.
  const parts = splitForQr(amount);
  // More QR payments than screenshots we accept (over ₹20,000): steer straight to the UPI ID.
  const tooManyParts = parts.length > MAX_FILES;
  const [method, setMethod] = useState<Method>(tooManyParts ? "upi" : "qr");
  // Locks synchronously, so a double tap can't send the proof twice (the second would fail and show an error).
  const inFlight = useRef(false);
  const [part, setPart] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const note = parts.length > 1 ? `${orderNumber} (${part + 1}/${parts.length})` : orderNumber;
  const link = upiLink({ amount: parts[part], orderNumber, note });

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    // Copy now: the input is cleared right after (so the same file can be picked again), which empties the live FileList.
    const picked = Array.from(list);
    const next = [...files, ...picked];
    setError(next.length > MAX_FILES ? `You can attach up to ${MAX_FILES} screenshots.` : null);
    setFiles(next.slice(0, MAX_FILES));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (files.length === 0) return setError("Please attach the screenshot of your payment.");
    for (const f of files) {
      if (!f.type.startsWith("image/")) return setError(`${f.name} isn't an image. Attach PNG or JPG screenshots.`);
      if (f.size > MAX_MB * 1024 * 1024) return setError(`${f.name} is over ${MAX_MB} MB.`);
    }
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Please enter a valid phone number with country code.");

    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const fail = (message: string) => {
      setError(message);
      setBusy(false);
      inFlight.current = false;
    };
    const supabase = createClient();
    const paths: string[] = [];
    for (const [n, f] of files.entries()) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${orderId}/${Date.now()}-${n + 1}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, f, { contentType: f.type });
      if (upErr) return fail(upErr.message);
      paths.push(path);
    }

    const { error: rpcErr } = await supabase.rpc("submit_payment_proof", {
      p_order_id: orderId,
      p_screenshot_paths: paths,
      p_delivery_name: name,
      p_delivery_phone: phone,
    });
    if (rpcErr) return fail(rpcErr.message);
    // Email the store owner. The payment is already saved, so a failed email doesn't block the customer.
    await fetch("/api/notify-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }).catch(() => {});
    router.refresh();
  }

  const tab = (m: Method, label: string) => (
    <button
      type="button"
      onClick={() => setMethod(m)}
      className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        method === m ? "bg-brand text-white shadow-[0_0_18px_-6px] shadow-brand" : "text-muted hover:text-white"
      }`}
      aria-pressed={method === m}
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-brand/40 bg-panel">
      <div className="border-b border-line bg-brand/10 px-4 py-4 sm:px-6">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">
          {resubmit ? "Send your payment again" : `Pay ${inr(amount)}`}
        </h2>
        <p className="text-sm text-muted">
          Choose how to pay, then attach the screenshot and confirm with us on WhatsApp.
        </p>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex gap-1 rounded-2xl border border-line bg-ink/60 p-1">
          {tab("qr", "Scan QR code")}
          {tab("upi", "Pay to UPI ID")}
        </div>

        {method === "qr" ? (
          <div className="animate-fade-in space-y-4">
            {tooManyParts && (
              <p className="rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">
                That's {parts.length} QR payments for {inr(amount)}. Please use <b>Pay to UPI ID</b> to send it in one payment instead.
              </p>
            )}
            {parts.length > 1 && !tooManyParts && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                QR payments are limited to <b>{inr(QR_LIMIT)} per transaction</b>. Pay your {inr(amount)} in{" "}
                <b>{parts.length} payments</b>: {parts.map((p) => inr(p)).join(" + ")}.
                <span className="mt-1 block text-xs text-amber-200/80">
                  No time for that? Use <b>Pay to UPI ID</b> to send it all in one go.
                </span>
              </div>
            )}

            {parts.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {parts.map((p, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPart(n)}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition ${
                      part === n ? "border-brand bg-brand/15 text-white" : "border-line text-muted hover:text-white"
                    }`}
                  >
                    <span className="block font-semibold uppercase tracking-wider">Payment {n + 1}</span>
                    <span className="font-display text-sm font-bold">{inr(p)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="rounded-2xl bg-white p-3">
                <QRCodeSVG key={part} value={link} size={176} level="M" />
              </div>
              <div className="w-full space-y-2 text-center sm:text-left">
                <p className="font-display text-2xl font-bold">
                  {inr(parts[part])}
                  {parts.length > 1 && <span className="ml-2 text-sm font-normal text-muted">payment {part + 1} of {parts.length}</span>}
                </p>
                <p className="text-xs text-muted">Scan with GPay, PhonePe, Paytm or BHIM. The amount fills in by itself.</p>
                <a href={link} className="btn btn-primary w-full sm:hidden">
                  Pay {inr(parts[part])} in UPI app
                </a>
                {parts.length > 1 && part < parts.length - 1 && (
                  <button type="button" onClick={() => setPart(part + 1)} className="btn btn-ghost w-full sm:w-auto">
                    Done, show payment {part + 2} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in space-y-3">
            <p className="text-sm text-muted">
              Send the <b className="text-white">exact amount in one payment</b> straight to our UPI ID. There's no {inr(QR_LIMIT)} limit this way.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => copy("upi", upiId)}
                className="rounded-xl border border-line bg-panel-2 px-4 py-3 text-left transition hover:border-brand/50"
              >
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted">UPI ID</span>
                <span className="block break-all font-mono text-base font-semibold">{upiId}</span>
                <span className="mt-1 block text-xs text-brand-2">{copied === "upi" ? "Copied!" : "Tap to copy"}</span>
              </button>
              <button
                type="button"
                onClick={() => copy("amount", String(Math.round(amount)))}
                className="rounded-xl border border-line bg-panel-2 px-4 py-3 text-left transition hover:border-brand/50"
              >
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted">Exact amount</span>
                <span className="block font-display text-xl font-bold">{inr(amount)}</span>
                <span className="mt-1 block text-xs text-brand-2">{copied === "amount" ? "Copied!" : "Tap to copy"}</span>
              </button>
            </div>
            <p className="text-xs text-muted">
              Add <b className="text-white">{orderNumber}</b> in the payment note so we can match it quickly.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 border-t border-line pt-5">
          <div>
            <label className="label" htmlFor="shot">
              Payment screenshot{method === "qr" && parts.length > 1 ? "s (one for each payment)" : ""}
            </label>
            <input
              id="shot"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/20 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-brand-2 hover:file:bg-brand/30"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, n) => (
                  <li key={n} className="flex items-center justify-between gap-2 rounded-lg bg-panel-2 px-3 py-1.5 text-xs">
                    <span className="truncate">🧾 {f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, i) => i !== n))}
                      className="shrink-0 text-muted hover:text-hot"
                      aria-label={`Remove ${f.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted">
              <b className="text-white">Your details for delivery</b>, sent to us in this format:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="dname">Name</label>
                <input id="dname" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="dphone">Phone number</label>
                <input
                  id="dphone"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 6239689030"
                  inputMode="tel"
                  required
                />
              </div>
            </div>
            <ul className="space-y-1 break-words rounded-xl border border-line bg-panel-2 p-3 font-mono text-xs sm:text-sm">
              {items.map((i, n) => (
                <li key={n}>{deliveryLine(i, name || "Name", phone || "Phone number")}</li>
              ))}
            </ul>
          </div>

          {error && <p role="alert" className="animate-rise rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}

          <button className="btn btn-primary w-full py-3.5" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <Spinner />
                Sending…
              </>
            ) : (
              "I've paid, send screenshot"
            )}
          </button>
          <p className="text-center text-xs text-muted">Next, you'll confirm the payment with us on WhatsApp.</p>
        </form>
      </div>
    </div>
  );
}
