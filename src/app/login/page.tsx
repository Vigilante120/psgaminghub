import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { NO_INDEX } from "@/lib/seo";

export const metadata = { title: "Sign in", robots: NO_INDEX };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
