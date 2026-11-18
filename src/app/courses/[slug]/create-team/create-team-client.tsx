"use client";

import React from "react";
import { CourseOffering } from "@/types";
import { TeamRegistrationWizard } from "@/components/teams/TeamRegistrationWizard";

interface Props {
  offering: CourseOffering;
}

export function CreateTeamClient({ offering }: Props) {
  return (
    <TeamRegistrationWizard
      offerings={[offering]}
      initialOfferingId={offering.id}
    />
  );
}
