import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="font-display text-7xl font-bold text-gradient">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold uppercase">Game over — page not found</h1>
      <Link href="/" className="btn btn-primary mt-8">Back to home</Link>
    </div>
  );
}
