"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CourseOffering, TeamCreationResult } from "@/types";
import {
  registerTeamMultiStepAction,
  getAvailablePresentationNumbersAction,
} from "@/lib/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Crown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Check,
  Plus,
  Trash2,
  Layers,
  UploadCloud,
  FileText,
  UserPlus,
} from "lucide-react";
import { formatStudentId } from "@/lib/utils";

interface Props {
  offerings: CourseOffering[];
  initialOfferingId?: string;
}

interface MemberInput {
  name: string;
  studentId: string;
}

export function TeamRegistrationWizard({ offerings, initialOfferingId }: Props) {
  // Active step: 1, 2, or 3
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selected Offering
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(
    initialOfferingId || offerings[0]?.id || ""
  );

  const selectedOffering = useMemo(() => {
    return offerings.find((o) => o.id === selectedOfferingId) || offerings[0];
  }, [offerings, selectedOfferingId]);

  // Step 1: Presentation Details
  const [teamName, setTeamName] = useState("");
  const [teamSize, setTeamSize] = useState<number>(
    selectedOffering?.max_team_capacity || 5
  );
  const [teamTopic, setTeamTopic] = useState("");

  // Step 2: Team Members
  const [leaderName, setLeaderName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [members, setMembers] = useState<MemberInput[]>([
    { name: "", studentId: "" },
  ]);

  // Step 3: Presentation Team Number Slots
  const [presentationNumber, setPresentationNumber] = useState<number>(1);
  const [availableSlots, setAvailableSlots] = useState<
    { number: number; label: string; isTaken: boolean; takenByTeam?: string }[]
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TeamCreationResult | null>(null);

  // Pattern strictly checking 252-35-242
  const idRegex = /^\d{3}-\d{2}-\d{3}$/;

  // Open for new members toggle (available ONLY when chosen team size is less than max capacity)
  const [isOpenForMembers, setIsOpenForMembers] = useState(false);

  // Compute filled members count
  const filledMembersCount = useMemo(() => {
    return 1 + members.filter((m) => m.name.trim() && m.studentId.trim()).length;
  }, [members]);

  // Max team capacity for this offering (e.g. 5)
  const maxTeamMembers = selectedOffering?.max_team_capacity || 5;

  // Available ONLY when chosen team size is less than max capacity (e.g. size 2, 3, or 4 when max is 5).
  // When team size is 5 (max capacity), this is false: never shown, never enabling open requests!
  const canOpenForMembers = teamSize < maxTeamMembers;

  // When selected offering changes, update default team size to max capacity and reset topic if disabled
  useEffect(() => {
    if (selectedOffering) {
      setTeamSize(selectedOffering.max_team_capacity || 5);
      if (selectedOffering.topic_enabled !== true) {
        setTeamTopic("");
      }
    }
  }, [selectedOffering]);

  // Adjust number of member input rows when teamSize changes
  useEffect(() => {
    const requiredMemberSlots = Math.max(0, teamSize - 1);
    setMembers((prev) => {
      if (prev.length < requiredMemberSlots) {
        const needed = requiredMemberSlots - prev.length;
        const newSlots = Array.from({ length: needed }, () => ({
          name: "",
          studentId: "",
        }));
        return [...prev, ...newSlots];
      } else if (prev.length > requiredMemberSlots) {
        return prev.slice(0, requiredMemberSlots);
      }
      return prev;
    });
  }, [teamSize]);

  // Fetch available presentation team number slots when entering Step 3 or changing offering
  useEffect(() => {
    if (selectedOffering) {
      setLoadingSlots(true);
      getAvailablePresentationNumbersAction(selectedOffering.id)
        .then((res) => {
          if (res.success && res.data) {
            setAvailableSlots(res.data);
            // Default to the first available slot (1st, 2nd, etc.)
            const firstAvailable = res.data.find((s) => !s.isTaken);
            if (firstAvailable) {
              setPresentationNumber(firstAvailable.number);
            }
          }
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedOffering, step]);

  // Step 1 Validation
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedOffering) {
      setErrorMessage("Please select a presentation subject/course.");
      return;
    }
    if (selectedOffering.registration_status !== "OPEN") {
      setErrorMessage("Registration is not currently open for this subject.");
      return;
    }
    if (
      teamSize < selectedOffering.min_team_capacity ||
      teamSize > selectedOffering.max_team_capacity
    ) {
      setErrorMessage(
        `Team size must be between ${selectedOffering.min_team_capacity} and ${selectedOffering.max_team_capacity}.`
      );
      return;
    }
    setStep(2);
  };

  // Step 2 Validation
  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Auto-format leader ID
    const formattedLeaderId = formatStudentId(leaderId);
    setLeaderId(formattedLeaderId);

    // Leader validation
    if (!leaderName.trim()) {
      setErrorMessage("Team Leader Name is required.");
      return;
    }
    if (!idRegex.test(formattedLeaderId)) {
      setErrorMessage(
        "Leader Student ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242)."
      );
      return;
    }

    const seenIds = new Set<string>();
    seenIds.add(formattedLeaderId);

    // Validate members
    const updatedMembers = [...members];
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (teamSize === maxTeamMembers || !canOpenForMembers) {
        if (!m.name.trim() || !m.studentId.trim()) {
          setErrorMessage(`Please fill in all member details (Member #${i + 2}) for your ${teamSize}-member team.`);
          return;
        }
      }

      if (m.name.trim() || m.studentId.trim()) {
        if (!m.name.trim()) {
          setErrorMessage(`Member #${i + 2} name is required.`);
          return;
        }
        const formattedMemId = formatStudentId(m.studentId);
        updatedMembers[i] = { ...m, studentId: formattedMemId };
        if (!idRegex.test(formattedMemId)) {
          setErrorMessage(
            `Member #${i + 2} ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242).`
          );
          return;
        }
        if (seenIds.has(formattedMemId)) {
          setErrorMessage(
            `Duplicate Student ID detected: ${formattedMemId}. Each student must have a unique ID.`
          );
          return;
        }
        seenIds.add(formattedMemId);
      }
    }
    setMembers(updatedMembers);

    setStep(3);
  };

  // Final Submission
  const handleSubmit = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const formattedLeaderId = formatStudentId(leaderId);
      // Filter only members with name and ID filled
      const activeMembers = members
        .filter((m) => m.name.trim() && m.studentId.trim())
        .map((m) => ({
          name: m.name.trim(),
          studentId: formatStudentId(m.studentId),
        }));

      const res = await registerTeamMultiStepAction({
        courseOfferingId: selectedOffering.id,
        teamName: teamName.trim() || undefined,
        capacity: canOpenForMembers && isOpenForMembers ? Number(maxTeamMembers) : Number(teamSize),
        topic: selectedOffering.topic_enabled === true ? teamTopic.trim() || undefined : undefined,
        presentation_number: Number(presentationNumber),
        leaderName: leaderName.trim(),
        leaderStudentId: formattedLeaderId,
        members: activeMembers,
        isOpenForMembers: canOpenForMembers ? isOpenForMembers : false,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to register team.");
      } else {
        setResult(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for member input changes
  const updateMember = (
    index: number,
    field: "name" | "studentId",
    value: string
  ) => {
    setMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // SUCCESS CONFIRMATION STATE
  if (result) {
    const formattedTeamNumber =
      result.presentationNumber === 1
        ? "1st Team"
        : result.presentationNumber === 2
        ? "2nd Team"
        : result.presentationNumber === 3
        ? "3rd Team"
        : `${result.presentationNumber}th Team`;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="inline-block text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Registration Completed
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-diu-navy font-heading">
            Team Successfully Registered!
          </h1>
          <p className="text-sm text-diu-slate max-w-md mx-auto">
            Your presentation team has been confirmed for{" "}
            <strong className="text-diu-navy">
              {selectedOffering.course?.code} ({selectedOffering.course?.name})
            </strong>{" "}
            Section {selectedOffering.section}.
          </p>
        </div>

        {/* Presentation Team Number Card */}
        <Card className="border-2 border-diu-blue/30 shadow-md bg-gradient-to-br from-white to-blue-50/50">
          <CardHeader className="text-center pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-diu-blue">
              Official Presentation Assignment
            </CardDescription>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-diu-navy font-heading">
              {formattedTeamNumber}
            </CardTitle>
            <p className="text-xs text-diu-slate mt-1 font-mono">
              Slot #{result.presentationNumber} • Team: {result.teamName}
            </p>
          </CardHeader>

          <CardContent className="pt-2 pb-4 text-xs space-y-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Team Leader:</span>
                <span className="font-semibold text-diu-navy font-mono">
                  {leaderName} ({leaderId})
                </span>
              </div>
              {teamTopic && (
                <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-1.5">
                  <span>Topic:</span>
                  <span className="font-medium text-slate-800 italic">
                    {teamTopic}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-1.5">
                <span>Capacity / Members:</span>
                <span className="font-medium text-slate-800">
                  {1 + members.filter((m) => m.name && m.studentId).length} /{" "}
                  {teamSize} Members
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-diu-blue shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-diu-navy">
                  Login &amp; Presentation Slide Upload
                </p>
                <p className="text-blue-800 leading-relaxed text-[11px]">
                  Team Leader can login anytime from{" "}
                  <strong className="text-diu-navy font-medium">Manage My Team</strong> using{" "}
                  <strong>Leader Name ({leaderName})</strong> and{" "}
                  <strong>Student ID ({leaderId})</strong> to upload slides, paste slide links, edit team name, or accept new members.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/manage" className="w-full">
              <Button className="w-full gap-2 font-semibold shadow-sm">
                <UploadCloud className="w-4 h-4" />
                Go to Team Management / Upload Slides
              </Button>
            </Link>
            <Link href="/courses" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-xs">
                Browse Courses
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // WIZARD FORM
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-diu-navy font-heading">
          Team Registration
        </h1>
        <p className="text-xs sm:text-sm text-diu-slate">
          Register your presentation team in 3 simple steps
        </p>
      </div>

      {/* 3-Step Indicator */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => step > 1 && setStep(1)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
            step === 1
              ? "bg-white text-diu-blue shadow-sm font-bold"
              : step > 1
              ? "text-emerald-700 bg-emerald-50/50 hover:bg-white"
              : "text-slate-400 cursor-not-allowed"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
              step === 1
                ? "bg-diu-blue text-white"
                : step > 1
                ? "bg-emerald-600 text-white"
                : "bg-slate-300 text-white"
            }`}
          >
            {step > 1 ? <Check className="w-3 h-3" /> : "1"}
          </span>
          <span className="hidden sm:inline">Step 1: Details</span>
          <span className="sm:hidden">Details</span>
        </button>

        <button
          type="button"
          onClick={() => step > 2 && setStep(2)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
            step === 2
              ? "bg-white text-diu-blue shadow-sm font-bold"
              : step > 2
              ? "text-emerald-700 bg-emerald-50/50 hover:bg-white"
              : "text-slate-400 cursor-not-allowed"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
              step === 2
                ? "bg-diu-blue text-white"
                : step > 2
                ? "bg-emerald-600 text-white"
                : "bg-slate-300 text-white"
            }`}
          >
            {step > 2 ? <Check className="w-3 h-3" /> : "2"}
          </span>
          <span className="hidden sm:inline">Step 2: Members</span>
          <span className="sm:hidden">Members</span>
        </button>

        <button
          type="button"
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
            step === 3
              ? "bg-white text-diu-blue shadow-sm font-bold"
              : "text-slate-400 cursor-not-allowed"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
              step === 3
                ? "bg-diu-blue text-white"
                : "bg-slate-300 text-white"
            }`}
          >
            3
          </span>
          <span className="hidden sm:inline">Step 3: Slot</span>
          <span className="sm:hidden">Slot</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Presentation Details */}
      {step === 1 && (
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-diu-blue" />
              Step 1: Presentation Subject &amp; Team Setup
            </CardTitle>
            <CardDescription className="text-xs">
              Select your presentation course, choose team size, and configure initial details.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleNextStep1}>
            <CardContent className="pt-5 space-y-4">
              {/* Presentation Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs font-semibold text-slate-700">
                  Presentation Subject *
                </Label>
                <select
                  id="subject"
                  value={selectedOfferingId}
                  onChange={(e) => setSelectedOfferingId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                  required
                >
                  {offerings.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.course?.code} — {o.course?.name} (Section {o.section})
                    </option>
                  ))}
                </select>
                {selectedOffering && (
                  <p className="text-[11px] text-diu-slate">
                    Allowed team size: <strong>{selectedOffering.min_team_capacity}</strong> to{" "}
                    <strong>{selectedOffering.max_team_capacity}</strong> members.
                  </p>
                )}
              </div>

              {/* Team Name (Optional) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="teamName" className="text-xs font-semibold text-slate-700">
                    Team Name (Optional)
                  </Label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <Input
                  id="teamName"
                  type="text"
                  placeholder="e.g. CodeCrafters (Leave empty for default Team #)"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={50}
                  className="text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  If left blank, your team will be named automatically (e.g. Team 1, Team 2).
                </p>
              </div>

              {/* Team Size */}
              <div className="space-y-1.5">
                <Label htmlFor="teamSize" className="text-xs font-semibold text-slate-700">
                  Team Size *
                </Label>
                <select
                  id="teamSize"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-diu-blue"
                  required
                >
                  {Array.from(
                    {
                      length:
                        (selectedOffering?.max_team_capacity || 5) -
                        (selectedOffering?.min_team_capacity || 2) +
                        1,
                    },
                    (_, idx) => {
                      const size = (selectedOffering?.min_team_capacity || 2) + idx;
                      return (
                        <option key={size} value={size}>
                          {size} Members
                        </option>
                      );
                    }
                  )}
                </select>
                <p className="text-[11px] text-diu-slate">
                  Selected by Superadmin: Min {selectedOffering?.min_team_capacity || 2}, Max{" "}
                  {selectedOffering?.max_team_capacity || 5} members.
                </p>
              </div>

              {/* Team Topic: ONLY visible if superadmin explicitly enabled presentation topic input */}
              {selectedOffering?.topic_enabled === true && (
                <div className="space-y-1.5">
                  <Label htmlFor="topic" className="text-xs font-semibold text-slate-700">
                    Team Topic
                  </Label>
                  <Input
                    id="topic"
                    type="text"
                    placeholder="e.g. Dynamic Programming in Network Routing"
                    value={teamTopic}
                    onChange={(e) => setTeamTopic(e.target.value)}
                    maxLength={120}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-diu-slate">
                    Enter the presentation topic agreed with your course instructor.
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between items-center border-t border-slate-100 bg-slate-50/40 pt-4">
              <Link href="/courses">
                <Button variant="ghost" size="sm" type="button" className="text-xs text-slate-600">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="sm" className="gap-1.5 font-semibold text-xs">
                Next: Step 2 (Team Members)
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* STEP 2: Team Members */}
      {step === 2 && (
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy flex items-center gap-2">
              <Users className="w-4 h-4 text-diu-blue" />
              Step 2: Team Leader &amp; Members
            </CardTitle>
            <CardDescription className="text-xs">
              Provide student names and student IDs.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleNextStep2}>
            <CardContent className="pt-5 space-y-5">
              {/* Leader Section */}
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-diu-navy">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Team Leader (Required)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="leaderName" className="text-xs font-medium text-slate-700">
                      Leader Name *
                    </Label>
                    <Input
                      id="leaderName"
                      type="text"
                      placeholder="e.g. Tanvir Ahmed"
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value)}
                      required
                      className="text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="leaderId" className="text-xs font-medium text-slate-700">
                      Leader ID *
                    </Label>
                    <Input
                      id="leaderId"
                      type="text"
                      placeholder="Student ID"
                      value={leaderId}
                      onChange={(e) => setLeaderId(e.target.value)}
                      onBlur={() => {
                        if (leaderId) setLeaderId(formatStudentId(leaderId));
                      }}
                      required
                      className="text-xs bg-white font-mono"
                    />
                    {leaderId && !idRegex.test(formatStudentId(leaderId)) && (
                      <p className="text-[11px] text-red-600 font-medium mt-1">
                        ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Members Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Team Members ({members.length} slot{members.length > 1 ? "s" : ""} for {teamSize} total capacity)
                  </h3>
                  <span className="text-[11px] text-diu-slate">
                    {canOpenForMembers
                      ? "Enter your team members. You can optionally open remaining slots for other students to join."
                      : `Enter details for all ${teamSize} team members.`}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {members.map((mem, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 items-center text-xs"
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600 font-medium">
                          Member #{idx + 2} Name *
                        </Label>
                        <Input
                          type="text"
                          placeholder={`Member #${idx + 2} Name`}
                          value={mem.name}
                          onChange={(e) => updateMember(idx, "name", e.target.value)}
                          className="text-xs bg-white"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600 font-medium">
                          Member #{idx + 2} ID *
                        </Label>
                        <Input
                          type="text"
                          placeholder="Student ID"
                          value={mem.studentId}
                          onChange={(e) => updateMember(idx, "studentId", e.target.value)}
                          onBlur={() => {
                            if (mem.studentId) {
                              updateMember(idx, "studentId", formatStudentId(mem.studentId));
                            }
                          }}
                          className="text-xs bg-white font-mono"
                          required
                        />
                        {mem.studentId && !idRegex.test(formatStudentId(mem.studentId)) && (
                          <p className="text-[11px] text-red-600 font-medium mt-1">
                            ID must follow DIU pattern: XXX-XX-XXX (e.g. 252-35-242)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enable/Disable Open for New Members Toggle Bar (ONLY available when chosen team size < max capacity) */}
                {canOpenForMembers && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-diu-navy">
                          Open for New Members to Join?
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isOpenForMembers
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-200 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {isOpenForMembers ? "Open (Accepting Requests)" : "Closed (Private)"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Your team has {teamSize} members (maximum course capacity is {maxTeamMembers} members).
                        {isOpenForMembers
                          ? ` Your team will accept join requests for the remaining ${maxTeamMembers - teamSize} slot${maxTeamMembers - teamSize > 1 ? "s" : ""} on the Course Directory.`
                          : ` Your team will be registered as a closed, private team of ${teamSize} members.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-semibold text-slate-700">
                        {isOpenForMembers ? "Open" : "Closed"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOpenForMembers}
                        onClick={() => setIsOpenForMembers(!isOpenForMembers)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-diu-blue focus:ring-offset-2 ${
                          isOpenForMembers ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isOpenForMembers ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center border-t border-slate-100 bg-slate-50/40 pt-4">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setStep(1)}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Step 1
              </Button>
              <Button type="submit" size="sm" className="gap-1.5 font-semibold text-xs">
                Next: Step 3 (Presentation Slot)
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* STEP 3: Review & Presentation Team Number */}
      {step === 3 && (
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-diu-navy flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-diu-blue" />
              Step 3: Presentation Team Number &amp; Final Review
            </CardTitle>
            <CardDescription className="text-xs">
              Select your presentation team number from the available slots and confirm registration.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {/* Presentation Slot Selection */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="slot" className="text-xs font-bold text-diu-navy uppercase tracking-wider">
                  Select Presentation Team Number *
                </Label>
                <span className="text-[11px] text-diu-blue font-semibold">
                  Max Limit: {selectedOffering?.max_teams_limit || 20} Teams
                </span>
              </div>

              {loadingSlots ? (
                <div className="text-xs text-diu-slate py-2">Loading available slots...</div>
              ) : (
                <select
                  id="slot"
                  value={presentationNumber}
                  onChange={(e) => setPresentationNumber(Number(e.target.value))}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-diu-blue shadow-sm"
                  required
                >
                  {availableSlots.map((slot) => (
                    <option
                      key={slot.number}
                      value={slot.number}
                      disabled={slot.isTaken}
                      className={slot.isTaken ? "text-slate-400 bg-slate-100" : "text-slate-800"}
                    >
                      {slot.label} {slot.isTaken ? `(Unavailable — Taken by ${slot.takenByTeam})` : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-500">
                1st team gets 1st slot by default. Already claimed slots are unavailable.
              </p>
            </div>

            {/* Registration Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Team Summary &amp; Members Review
              </h3>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">SUBJECT</span>
                    <span className="font-semibold text-slate-800">
                      {selectedOffering.course?.code} (Sec {selectedOffering.section})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">TEAM NAME</span>
                    <span className="font-semibold text-slate-800">
                      {teamName.trim() || `Team ${presentationNumber} (Default)`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">TEAM SIZE / CAPACITY</span>
                    <span className="font-semibold text-slate-800">
                      {teamSize} {canOpenForMembers && isOpenForMembers ? `of ${maxTeamMembers} Max Capacity (${maxTeamMembers - teamSize} Vacant)` : `Members`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">JOIN STATUS</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                      canOpenForMembers && isOpenForMembers
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : canOpenForMembers
                        ? "bg-slate-200 text-slate-700 border border-slate-300"
                        : "bg-blue-100 text-diu-blue"
                    }`}>
                      {canOpenForMembers && isOpenForMembers
                        ? "Open (Accepting Join Requests)"
                        : canOpenForMembers
                        ? "Closed (Private Team)"
                        : "Full Team"}
                    </span>
                  </div>
                </div>

                {selectedOffering?.topic_enabled === true && teamTopic && (
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-slate-400 block text-[10px]">TOPIC</span>
                    <span className="font-medium text-slate-800 italic">{teamTopic}</span>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block text-[10px] mb-1.5 font-bold uppercase">
                    Team Members
                  </span>
                  <ul className="space-y-1.5">
                    <li className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 font-medium text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        {leaderName} (Leader)
                      </span>
                      <span className="font-mono text-slate-500 text-[11px]">{leaderId}</span>
                    </li>
                    {members
                      .filter((m) => m.name.trim() && m.studentId.trim())
                      .map((m, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-slate-700"
                        >
                          <span>{m.name}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{m.studentId}</span>
                        </li>
                      ))}
                    {members.filter((m) => !m.name.trim() || !m.studentId.trim()).length > 0 && (
                      <li className="p-2 rounded border border-dashed border-slate-300 text-slate-400 text-center text-[11px]">
                        + {members.filter((m) => !m.name.trim() || !m.studentId.trim()).length} vacant slot(s) open for students to request join
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center border-t border-slate-100 bg-slate-50/40 pt-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setStep(2)}
              disabled={submitting}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Step 2
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              size="sm"
              className="gap-2 font-semibold text-xs shadow-sm bg-diu-blue hover:bg-diu-navy"
            >
              {submitting ? (
                "Registering Team..."
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm &amp; Register Team
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
