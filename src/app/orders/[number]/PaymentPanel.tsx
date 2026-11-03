"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import { deliveryLine, inr, upiLink } from "@/lib/store";
import type { Slot } from "@/lib/types";

const MAX_MB = 5;

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
  const link = upiLink({ amount, orderNumber });
  const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? "";
  const [utr, setUtr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Please attach your payment screenshot.");
    if (!file.type.startsWith("image/")) return setError("The screenshot must be an image (PNG or JPG).");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The screenshot must be under ${MAX_MB} MB.`);
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Please enter a valid phone number with country code.");

    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${orderId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, { contentType: file.type });
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }

    const { error: rpcErr } = await supabase.rpc("submit_payment", {
      p_order_id: orderId,
      p_utr: utr,
      p_screenshot_path: path,
      p_delivery_name: name,
      p_delivery_phone: phone,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setBusy(false);
      return;
    }
    // Email the store owner. The payment is already saved, so a failed email doesn't block the customer.
    await fetch("/api/notify-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand/40 bg-panel">
      <div className="border-b border-line bg-brand/10 px-4 py-4 sm:px-6">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">
          {resubmit ? "Submit your payment again" : "Pay with UPI"}
        </h2>
        <p className="text-sm text-muted">
          Pay exactly <b className="text-white">{inr(amount)}</b> and keep <b className="text-white">{orderNumber}</b> in the note.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:gap-8 sm:p-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-white p-3">
            <QRCodeSVG value={link} size={176} level="M" />
          </div>
          <p className="text-center text-xs text-muted">Scan with GPay, PhonePe, Paytm or BHIM</p>
          <a href={link} className="btn btn-primary w-full md:hidden">
            Pay {inr(amount)} with UPI app
          </a>
          <button type="button" onClick={copy} className="min-h-11 break-all px-2 text-xs text-brand-2 hover:underline lg:min-h-0">
            {copied ? "Copied!" : `UPI ID: ${upiId} (copy)`}
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted">
            <b className="text-white">After paying:</b> enter the UTR / UPI reference number, upload the payment screenshot and confirm your details.
          </p>
          <div>
            <label className="label" htmlFor="utr">UTR / Transaction ID</label>
            <input
              id="utr"
              className="input font-mono tracking-wider"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. 428517396204"
              required
              minLength={8}
            />
            <p className="mt-1.5 text-xs text-muted">Usually 12 digits. Find it in your UPI app's payment details.</p>
          </div>
          <div>
            <label className="label" htmlFor="shot">Payment screenshot</label>
            <input
              id="shot"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/20 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-brand-2 hover:file:bg-brand/30"
              required
            />
          </div>

          <div className="space-y-3 border-t border-line pt-4">
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
                Submitting…
              </>
            ) : (
              "I've paid — submit proof"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
