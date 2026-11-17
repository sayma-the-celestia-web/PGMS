import React from "react";
import { Badge } from "./badge";
import { RegistrationStatus, TeamStatus } from "@/types";
import { CheckCircle2, Clock, PauseCircle, XCircle, Users } from "lucide-react";

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  switch (status) {
    case "OPEN":
      return (
        <Badge variant="success" className="gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Registration Open
        </Badge>
      );
    case "PAUSED":
      return (
        <Badge variant="warning" className="gap-1 font-medium">
          <PauseCircle className="w-3.5 h-3.5" />
          Paused
        </Badge>
      );
    case "UPCOMING":
      return (
        <Badge variant="info" className="gap-1 font-medium">
          <Clock className="w-3.5 h-3.5" />
          Upcoming
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge variant="destructive" className="gap-1 font-medium">
          <XCircle className="w-3.5 h-3.5" />
          Closed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  switch (status) {
    case "OPEN":
      return (
        <Badge variant="success" className="gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Open
        </Badge>
      );
    case "FULL":
      return (
        <Badge variant="warning" className="gap-1 font-medium">
          <Users className="w-3.5 h-3.5" />
          Full
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge variant="destructive" className="gap-1 font-medium">
          <XCircle className="w-3.5 h-3.5" />
          Closed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
