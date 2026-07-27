"use client";

import { useTransition } from "react";

import { renewMembership } from "@/app/actions/memberships";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceStudent } from "@/components/features/attendance/attendance-list";
import { cn } from "@/lib/utils";
import {
  MEMBERSHIP_STATUS_BADGE_CLASS,
  MEMBERSHIP_STATUS_LABEL,
  getMembershipStatus,
} from "@/lib/membership";

export function StudentCard({
  student,
  marked,
  onMark,
}: {
  student: AttendanceStudent;
  marked: boolean;
  onMark: () => void;
}) {
  const [isRenewing, startRenewing] = useTransition();
  const membershipStatus = getMembershipStatus(
    student.membership?.fecha_vencimiento
  );

  function handleRenew() {
    startRenewing(async () => {
      await renewMembership(student.id);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{student.nombre}</CardTitle>
            <Badge
              className={cn(
                "border-0",
                MEMBERSHIP_STATUS_BADGE_CLASS[membershipStatus]
              )}
            >
              {MEMBERSHIP_STATUS_LABEL[membershipStatus]}
            </Badge>
          </div>
          <Badge variant={marked ? "default" : "outline"}>
            🔥 {student.current_streak}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          onClick={onMark}
          disabled={marked}
          className="h-16 w-full rounded-xl text-lg font-semibold"
        >
          {marked ? "Registrado ✅" : "Marcar Asistencia"}
        </Button>
        <Button
          onClick={handleRenew}
          disabled={isRenewing}
          variant="outline"
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          {isRenewing ? "Procesando..." : "Registrar Pago"}
        </Button>
      </CardContent>
    </Card>
  );
}
