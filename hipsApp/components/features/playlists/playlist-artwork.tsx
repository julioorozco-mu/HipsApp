import { Music2 } from "lucide-react";

const gradients = [
  "from-fuchsia-500 via-violet-600 to-indigo-700",
  "from-orange-400 via-rose-500 to-fuchsia-600",
  "from-cyan-400 via-teal-500 to-emerald-600",
  "from-lime-400 via-emerald-500 to-cyan-600",
];

export function PlaylistArtwork({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const index = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} text-white shadow-sm ${
        size === "sm" ? "size-12" : size === "lg" ? "size-24" : "size-16"
      }`}
    >
      <Music2 className={size === "sm" ? "size-6" : size === "lg" ? "size-11" : "size-8"} />
    </span>
  );
}
