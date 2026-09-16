'use client';

import { useState } from 'react';
import {
  useCandidateProfile,
  useApplicationDetail,
  useApplicationTimeline,
  useShortlist,
  useReject,
  useMoveStage,
  useRescreen,
} from '@/hooks/use-candidates';
import { useApplicationForm } from '@/hooks/use-form';
import { useJobStages } from '@/hooks/use-jobs';
import { useApplicationAssessments } from '@/hooks/use-assessments';
import { useApplicationInterviews, useSendInterview } from '@/hooks/use-interview';
import { useFeature } from '@/hooks/use-features';
import { useHotkey } from '@/hooks/use-hotkey';
import { toast } from '@/components/ui/sonner';
import { stageLabel } from '@/lib/labels';

/**
 * All state and mutations behind the candidate detail view, shared by the
 * body content and the "Move to stage" action bar so they can be rendered as
 * DOM siblings (e.g. inside `SheetBody`/`SheetFooter`) instead of nesting the
 * action bar inside the same scrollable region as the content above it.
 */
export function useCandidateDetail(
  candidateId: string,
  opts: {
    onNavigate?: (direction: 'prev' | 'next') => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    hotkeysEnabled?: boolean;
  } = {},
) {
  const { onNavigate, hasPrev = false, hasNext = false, hotkeysEnabled = true } = opts;

  const { data: profile, isLoading } = useCandidateProfile(candidateId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(undefined);

  const activeApp =
    profile?.applications.find((a) => a.id === selectedApplicationId) ?? profile?.applications[0];
  const detail = useApplicationDetail(activeApp?.id ?? '');
  const timeline = useApplicationTimeline(activeApp?.id ?? '');
  const form = useApplicationForm(activeApp?.jobId ?? '');
  const jobStages = useJobStages(activeApp?.jobId ?? '');
  const assessments = useApplicationAssessments(activeApp?.id ?? '');
  const interviews = useApplicationInterviews(activeApp?.id ?? '');
  const sendInterview = useSendInterview();
  const aiInterviewEnabled = useFeature('AI_INTERVIEW');
  const assessmentsEnabled = useFeature('ASSESSMENTS');
  const shortlist = useShortlist();
  const reject = useReject();
  const moveStage = useMoveStage();
  const rescreen = useRescreen();

  const canShortlist = Boolean(activeApp) && activeApp!.stage !== 'SCREENING' && activeApp!.status === 'ACTIVE';
  const canReject = Boolean(activeApp) && activeApp!.status === 'ACTIVE';
  // useHotkey only ignores keystrokes while focus is on a text input — a Radix
  // Select trigger or dialog button doesn't count, so without this a keypress
  // meant for an open dialog (e.g. typeahead in the reject-reason select) can
  // still fire a panel-level shortcut behind it.
  const dialogOpen = rejectOpen || sendOpen || interviewDialogOpen || resumeOpen;

  useHotkey('s', () => {
    if (canShortlist) {
      shortlist.mutate({ applicationId: activeApp!.id }, { onSuccess: () => toast.success('Candidate shortlisted') });
    }
  }, hotkeysEnabled && !dialogOpen && canShortlist);
  useHotkey('a', () => { if (canReject) setRejectOpen(true); }, hotkeysEnabled && !dialogOpen && canReject);
  useHotkey('ArrowLeft', () => onNavigate?.('prev'), hotkeysEnabled && !dialogOpen && hasPrev && Boolean(onNavigate));
  useHotkey('ArrowRight', () => onNavigate?.('next'), hotkeysEnabled && !dialogOpen && hasNext && Boolean(onNavigate));

  const doMove = (stage: string) => {
    if (!activeApp) return;
    moveStage.mutate(
      { applicationId: activeApp.id, body: { stage } },
      { onSuccess: () => toast.success(`Moved to ${stageLabel(jobStages.data, stage)}`) },
    );
  };

  return {
    candidateId,
    profile,
    isLoading,
    activeApp,
    selectedApplicationId,
    setSelectedApplicationId,
    detail,
    timeline,
    form,
    jobStages,
    assessments,
    interviews,
    sendInterview,
    aiInterviewEnabled,
    assessmentsEnabled,
    shortlist,
    reject,
    moveStage,
    rescreen,
    canShortlist,
    canReject,
    rejectOpen,
    setRejectOpen,
    sendOpen,
    setSendOpen,
    interviewDialogOpen,
    setInterviewDialogOpen,
    resumeOpen,
    setResumeOpen,
    doMove,
  };
}

export type CandidateDetailState = ReturnType<typeof useCandidateDetail>;
