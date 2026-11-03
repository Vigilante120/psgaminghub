/** Only allow same-site paths like "/orders/PSG-1001"; anything else goes to the fallback. */
export function safeNext(raw: string | null | undefined, fallback = "/orders") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
