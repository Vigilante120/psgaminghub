import Image from "next/image";

const PALETTES = [
  ["#1b3cff", "#36d6ff"],
  ["#7b2bff", "#ff3d6e"],
  ["#00a37a", "#36d6ff"],
  ["#ff7a1a", "#ff3d6e"],
  ["#2f6bff", "#8b5cf6"],
  ["#d61f4b", "#ffb020"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Product image, or a generated gradient cover when no image has been uploaded yet. */
export default function Cover({
  title,
  url,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
}: {
  title: string;
  url: string | null;
  sizes?: string;
  priority?: boolean;
}) {
  if (url) {
    return <Image src={url} alt={title} fill sizes={sizes} priority={priority} className="object-cover" />;
  }
  const [a, b] = PALETTES[hash(title) % PALETTES.length];
  return (
    <div
      className="absolute inset-0 flex items-end p-4"
      style={{ background: `radial-gradient(120% 90% at 100% 0%, ${b}55, transparent 60%), linear-gradient(160deg, ${a}, #070912 85%)` }}
      aria-label={title}
      role="img"
    >
      <div className="absolute inset-0 bg-grid opacity-60" />
      <span className="relative line-clamp-3 font-display text-xl font-bold uppercase leading-tight tracking-wide text-white drop-shadow">
        {title}
      </span>
    </div>
  );
}
