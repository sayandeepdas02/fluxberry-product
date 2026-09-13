'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import {
  useCandidateProfile,
  useApplicationDetail,
  useApplicationTimeline,
  useShortlist,
  useReject,
  useMoveStage,
  useRescreen,
  fetchResumeUrl,
} from '@/hooks/use-candidates';
import { useApplicationForm } from '@/hooks/use-form';
import { useJobStages } from '@/hooks/use-jobs';
import { useApplicationAssessments } from '@/hooks/use-assessments';
import { useApplicationInterviews, useSendInterview } from '@/hooks/use-interview';
import { useFeature } from '@/hooks/use-features';
import { useHotkey } from '@/hooks/use-hotkey';
import { SendAssessmentDialog } from '@/components/candidates/send-assessment-dialog';
import { InterviewCard } from '@/components/candidates/interview-card';
import { WorkflowRunCard } from '@/components/candidates/workflow-run-card';
import { RejectDialog } from '@/components/candidates/reject-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from '@/components/ui/field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Kbd } from '@/components/ui/kbd';
import { StageBadge } from '@/components/candidates/stage-badge';
import { LabelPicker, LabelChips } from '@/components/candidates/label-picker';
import { Badge } from '@/components/ui/badge';
import { ScreeningCard } from '@/components/candidates/screening-card';
import { Timeline } from '@/components/candidates/timeline';
import { MessageThread } from '@/components/candidates/message-thread';
import { toast } from '@/components/ui/sonner';
import { stageLabel } from '@/lib/labels';
import { formatSalary, initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * The candidate profile content, shared by the full-page route
 * (`candidates/[candidateId]/page.tsx`, used for direct/deep links) and the
 * modal overlay that intercepts navigation from the candidates list (spec
 * item 4.1) — one implementation, two shells around it.
 */
export function CandidateDetailPanel({
  candidateId,
  onNavigate,
  hasPrev = false,
  hasNext = false,
  hotkeysEnabled = true,
}: {
  candidateId: string;
  /** Move to the previous/next candidate in the list this panel was opened from (modal context only). */
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  hotkeysEnabled?: boolean;
}) {
  const { data: profile, isLoading } = useCandidateProfile(candidateId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
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
  const dialogOpen = rejectOpen || sendOpen;

  useHotkey('s', () => {
    if (canShortlist) {
      shortlist.mutate({ applicationId: activeApp!.id }, { onSuccess: () => toast.success('Candidate shortlisted') });
    }
  }, hotkeysEnabled && !dialogOpen && canShortlist);
  useHotkey('a', () => { if (canReject) setRejectOpen(true); }, hotkeysEnabled && !dialogOpen && canReject);
  useHotkey('ArrowLeft', () => onNavigate?.('prev'), hotkeysEnabled && !dialogOpen && hasPrev && Boolean(onNavigate));
  useHotkey('ArrowRight', () => onNavigate?.('next'), hotkeysEnabled && !dialogOpen && hasNext && Boolean(onNavigate));

  if (isLoading || !profile) return <Skeleton className="h-96 w-full" />;

  const candidate = profile.candidate;
  const parsed = candidate.parsedProfile;
  const answers = detail.data?.answers.answers ?? [];
  const labelById = new Map((form.data?.questions ?? []).map((q) => [q.id, q.label]));

  const openResume = async () => {
    try {
      const url = await fetchResumeUrl(candidateId);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('No resume available');
    }
  };

  const doMove = (stage: string) => {
    if (!activeApp) return;
    moveStage.mutate(
      { applicationId: activeApp.id, body: { stage } },
      { onSuccess: () => toast.success(`Moved to ${stageLabel(jobStages.data, stage)}`) },
    );
  };

  return (
    <div className="space-y-6">
      {profile.applications.length > 1 && (
        <Tabs value={activeApp?.id} onValueChange={setSelectedApplicationId}>
          <TabsList>
            {profile.applications.map((a) => (
              <TabsTrigger key={a.id} value={a.id}>{a.jobTitle}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback>{initials(candidate.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-page-title">{candidate.name}</h1>
              {activeApp && <StageBadge stage={activeApp.stage} stages={jobStages.data} />}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeApp?.jobTitle} · {candidate.email}
            </p>
            {activeApp && activeApp.labels.length > 0 && (
              <div className="mt-1.5"><LabelChips labels={activeApp.labels} /></div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeApp && <LabelPicker applicationId={activeApp.id} selected={activeApp.labels} />}
          <Button variant="outline" onClick={openResume} disabled={!candidate.resume}>
            <FileText className="size-4" /> Resume
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ScreeningCard
            screening={activeApp?.screeningResult}
            retrying={rescreen.isPending}
            onRetry={
              activeApp
                ? () => rescreen.mutate({ applicationId: activeApp.id }, { onSuccess: () => toast.success('Re-screening queued') })
                : undefined
            }
          />

          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Location" value={candidate.location} />
              <Detail label="Phone" value={candidate.phone} />
              <Detail label="Current salary" value={formatSalary({ min: candidate.currentSalary })} />
              <Detail label="Expected salary" value={formatSalary({ min: candidate.expectedSalary })} />
              <Detail label="Experience" value={parsed?.yearsExperience != null ? `${parsed.yearsExperience} years` : null} />
              <Detail label="LinkedIn" value={candidate.linkedinUrl} />
            </CardContent>
          </Card>

          {parsed?.skills?.length ? (
            <Card>
              <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {parsed.skills.map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{s}</span>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {activeApp && (
            <Card>
              <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
              <CardContent>
                <MessageThread applicationId={activeApp.id} />
              </CardContent>
            </Card>
          )}

          {answers.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Application responses</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {answers.map((a) => (
                  <div key={a.questionId}>
                    <div className="text-xs font-medium text-muted-foreground">{labelById.get(a.questionId) ?? 'Question'}</div>
                    <div>{Array.isArray(a.value) ? a.value.join(', ') : String(a.value)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Next action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => setSendOpen(true)} disabled={!activeApp}>
                Send assessment
              </Button>
              {aiInterviewEnabled && (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!activeApp || sendInterview.isPending}
                  loading={sendInterview.isPending}
                  onClick={() =>
                    activeApp &&
                    sendInterview.mutate(
                      { applicationId: activeApp.id, input: { expiresInHours: 168 } },
                      {
                        onSuccess: () => toast.success('AI interview sent'),
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not send'),
                      },
                    )
                  }
                >
                  Send AI interview
                </Button>
              )}
            </CardContent>
          </Card>

          {(assessments.data?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle>Assessments</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {assessments.data!.map((ca) => {
                  const cases = ca.codingResults?.reduce(
                    (acc, r) => ({ passed: acc.passed + r.passed, total: acc.total + r.total }),
                    { passed: 0, total: 0 },
                  );
                  return (
                    <div key={ca.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{ca.assessmentName}</span>
                          {ca.type === 'CODING' && <Badge variant="outline">Coding</Badge>}
                        </div>
                        <div className="text-xs capitalize text-muted-foreground">
                          {ca.status === 'GRADING' ? 'grading…' : ca.status.toLowerCase()}
                          {cases && cases.total > 0 && ca.status === 'COMPLETED' ? ` · ${cases.passed}/${cases.total} cases` : ''}
                        </div>
                      </div>
                      {ca.status === 'COMPLETED' ? (
                        <span className="font-semibold tabular-nums">{ca.score}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {(interviews.data?.length ?? 0) > 0 && <InterviewCard interviews={interviews.data!} />}

          {activeApp && <WorkflowRunCard applicationId={activeApp.id} />}

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              {timeline.isLoading ? <Skeleton className="h-24 w-full" /> : <Timeline entries={timeline.data ?? []} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {activeApp && (
        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-2 border-t border-border bg-card/95 px-1 py-3 backdrop-blur">
          <Field label="Move to stage" className="w-44">
            <Select value={activeApp.stage} onValueChange={(v) => doMove(v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(jobStages.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="ml-auto flex items-center gap-2">
            {canShortlist && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => shortlist.mutate({ applicationId: activeApp.id }, { onSuccess: () => toast.success('Candidate shortlisted') })}
              >
                Shortlist <Kbd>S</Kbd>
              </Button>
            )}
            {canReject && (
              <Button variant="outline" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setRejectOpen(true)}>
                Reject <Kbd>A</Kbd>
              </Button>
            )}
          </div>
        </div>
      )}

      {activeApp && (
        <RejectDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          onReject={(reason, note) =>
            reject.mutate(
              { applicationId: activeApp.id, body: { reason, note } },
              { onSuccess: () => { toast.success('Candidate rejected and notified'); setRejectOpen(false); } },
            )
          }
          loading={reject.isPending}
        />
      )}
      {activeApp && (
        <SendAssessmentDialog applicationId={activeApp.id} open={sendOpen} onOpenChange={setSendOpen} />
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value || '—'}</div>
    </div>
  );
}
