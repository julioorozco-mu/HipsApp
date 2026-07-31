"use client";

import { useFormStatus } from "react-dom";
import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

export function QueueActionButton({
  paused,
}: {
  paused: boolean;
}) {
  const { pending } = useFormStatus();
  const Icon = paused ? Play : Pause;

  return (
    <Button
      type="submit"
      variant="secondary"
      disabled={pending}
      className="min-h-20 w-full rounded-2xl text-base font-semibold"
    >
      <Icon className="size-6" fill="currentColor" />
      {pending ? "Actualizando..." : paused ? "Reanudar" : "Pausar"}
    </Button>
  );
}
