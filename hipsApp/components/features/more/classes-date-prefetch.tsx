"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const prefetchOffsets = [-5, 1, 2, 3, 4, 5] as const;

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function ClassesDatePrefetch({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();

  useEffect(() => {
    const selected = parseDate(selectedDate);
    const prefetch = () => {
      for (const offset of prefetchOffsets) {
        router.prefetch(`/clases?fecha=${dateKey(addDays(selected, offset))}`);
      }
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(prefetch, 300);
    return () => window.clearTimeout(id);
  }, [router, selectedDate]);

  return null;
}
