export function SpotifyMark({ className = "size-6" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center rounded-full bg-[#1ed760] text-black ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M4.5 8.3c4.9-1.4 10.8-.8 15 1.5" strokeWidth="2.2" />
        <path d="M5.4 12.1c4.3-1.1 9.4-.5 13 1.4" strokeWidth="2" />
        <path d="M6.2 15.7c3.6-.8 7.6-.3 10.7 1.2" strokeWidth="1.8" />
      </svg>
    </span>
  );
}
