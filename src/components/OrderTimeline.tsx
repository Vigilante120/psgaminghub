import type { Order } from "@/lib/types";
import { formatDate } from "@/lib/store";

export default function OrderTimeline({ order }: { order: Order }) {
  const failed = order.status === "rejected" || order.status === "cancelled";
  const steps = [
    { label: "Order placed", at: order.created_at, done: true },
    { label: "Payment submitted", at: order.payment_submitted_at, done: Boolean(order.payment_submitted_at) && order.status !== "awaiting_payment" },
    { label: "Payment verified", at: order.verified_at, done: Boolean(order.verified_at) },
    { label: "Delivered", at: order.delivered_at, done: order.status === "delivered" },
  ];

  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-start gap-3 sm:flex-col sm:gap-2">
          <div className="flex items-center gap-2 sm:w-full">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                s.done ? "bg-brand text-white" : failed && i === 1 ? "bg-hot/20 text-hot" : "border border-line text-muted"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            {i < steps.length - 1 && <span className={`hidden h-px flex-1 sm:block ${s.done ? "bg-brand" : "bg-line"}`} />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${s.done ? "" : "text-muted"}`}>{s.label}</p>
            {s.done && s.at && <p className="text-xs text-muted">{formatDate(s.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
