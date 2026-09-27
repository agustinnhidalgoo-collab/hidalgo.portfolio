export function Arrow({ className = "arrow" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 5.5 19.5 12 13 18.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
