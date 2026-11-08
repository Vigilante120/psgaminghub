const STEPS = [
  { n: "01", title: "Pick your game", body: "Choose your console (PS5 or PS4) and your slot: Primary, Secondary, or Rent for 30 days." },
  { n: "02", title: "Pay with UPI", body: "Scan our QR or tap Pay with any UPI app. The amount and order number are filled in for you." },
  { n: "03", title: "Pay & send proof", body: "Scan the QR (₹2,000 per payment) or pay the exact amount to our UPI ID. Attach the screenshot on your order page and confirm with us on WhatsApp." },
  { n: "04", title: "Get your game", body: "We verify the payment and complete delivery with you on WhatsApp. You get the purchase receipt on your order page." },
];

export default function HowItWorks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
      {STEPS.map((s) => (
        <div key={s.n} className="relative overflow-hidden rounded-2xl border border-line bg-panel p-5">
          <span className="font-display text-4xl font-bold text-white/10">{s.n}</span>
          <h3 className="mt-2 font-display text-lg font-bold uppercase tracking-wide">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
