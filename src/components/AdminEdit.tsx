"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext } from "react";

// Lets the store pages show admin-only shortcuts without every product card
// checking the session itself. The root layout says once whether this visitor is an admin.

const AdminCtx = createContext(false);

export function AdminProvider({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  return <AdminCtx.Provider value={isAdmin}>{children}</AdminCtx.Provider>;
}

/** "Edit" shortcut to a product's admin form. Renders nothing for customers. */
export function AdminEditButton({ productId, variant = "card" }: { productId: string; variant?: "card" | "page" }) {
  const isAdmin = useContext(AdminCtx);
  const pathname = usePathname();
  const router = useRouter();
  if (!isAdmin) return null;

  // Come back to this page after saving. The query string (collection filters) is added on
  // click, which avoids useSearchParams and the Suspense boundary it would need.
  const base = `/admin/products/${productId}?back=`;
  const href = base + encodeURIComponent(pathname);
  const withQuery = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" work
    e.preventDefault();
    router.push(base + encodeURIComponent(window.location.pathname + window.location.search));
  };

  if (variant === "page") {
    return (
      <Link href={href} onClick={withQuery} className="btn btn-ghost min-h-11 gap-2 border-amber-400/40 px-4 py-2 text-sm text-amber-200 hover:bg-amber-400/10 lg:min-h-0">
        <PencilIcon /> Edit product
      </Link>
    );
  }
  return (
    <Link
      href={href}
      onClick={withQuery}
      aria-label="Edit product"
      className="mt-2 flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/10 active:scale-95"
    >
      <PencilIcon /> Edit
    </Link>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
