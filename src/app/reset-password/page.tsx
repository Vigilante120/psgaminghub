import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "Set a new password" };

// Reached from the reset email via /auth/callback, which signs the user in first.
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-16">
      <ResetPasswordForm />
    </div>
  );
}
