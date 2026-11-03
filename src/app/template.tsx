// Re-mounts on every navigation, so each page fades up into place.
// The animation fills backwards only, so once it settles no transform is left on this wrapper
// and fixed-position children inside pages aren't affected.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
