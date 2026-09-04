'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import {
  APPLICATION_STAGES,
  REJECTION_REASONS,
  type ApplicationStage,
  type RejectionReason,
} from '@fluxberry/shared';
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
import { useApplicationAssessments } from '@/hooks/use-assessments';
import { useApplicationInterviews, useSendInterview } from '@/hooks/use-interview';
import { useFeature } from '@/hooks/use-features';
import { SendAssessmentDialog } from '@/components/candidates/send-assessment-dialog';
import { InterviewCard } from '@/components/candidates/interview-card';
import { WorkflowRunCard } from '@/components/candidates/workflow-run-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageBadge } from '@/components/candidates/stage-badge';
import { Badge } from '@/components/ui/badge';
import { ScreeningCard } from '@/components/candidates/screening-card';
import { Timeline } from '@/components/candidates/timeline';
import { toast } from '@/components/ui/sonner';
import { STAGE_LABELS } from '@/lib/labels';
import { formatSalary, initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const REASON_LABELS: Record<RejectionReason, string> = {
  NOT_ENOUGH_EXPERIENCE: 'Not enough experience',
  SKILL_MISMATCH: 'Skill mismatch',
  COMPENSATION_MISMATCH: 'Compensation mismatch',
  LOCATION_MISMATCH: 'Location mismatch',
  OTHER: 'Other',
};

export default function CandidateProfilePage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { data: profile, isLoading } = useCandidateProfile(candidateId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(undefined);

  const activeApp =
    profile?.applications.find((a) => a.id === selectedApplicationId) ?? profile?.applications[0];
  const detail = useApplicationDetail(activeApp?.id ?? '');
  const timeline = useApplicationTimeline(activeApp?.id ?? '');
  const form = useApplicationForm(activeApp?.jobId ?? '');
  const assessments = useApplicationAssessments(activeApp?.id ?? '');
  const interviews = useApplicationInterviews(activeApp?.id ?? '');
  const sendInterview = useSendInterview();
  const aiInterviewEnabled = useFeature('AI_INTERVIEW');
  const shortlist = useShortlist();
  const reject = useReject();
  const moveStage = useMoveStage();
  const rescreen = useRescreen();

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

  const doMove = (stage: ApplicationStage) => {
    if (!activeApp) return;
    moveStage.mutate(
      { applicationId: activeApp.id, body: { stage } },
      { onSuccess: () => toast.success(`Moved to ${STAGE_LABELS[stage]}`) },
    );
  };

  return (
    <div className="space-y-6">
      <Link href="/app/candidates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Candidates
      </Link>

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
              {activeApp && <StageBadge stage={activeApp.stage} />}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeApp?.jobTitle} · {candidate.email}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openResume} disabled={!candidate.resume}>
            <FileText className="size-4" /> Resume
          </Button>
          {activeApp && activeApp.stage !== 'SCREENING' && activeApp.status === 'ACTIVE' && (
            <Button variant="outline" onClick={() => shortlist.mutate({ applicationId: activeApp.id }, { onSuccess: () => toast.success('Shortlisted') })}>
              Shortlist
            </Button>
          )}
          {activeApp && activeApp.status === 'ACTIVE' && (
            <Button variant="outline" className="text-muted-foreground hover:text-destructive" onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          )}
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
              <Field label="Move to stage">
                <Select value={activeApp?.stage} onValueChange={(v) => doMove(v as ApplicationStage)} disabled={!activeApp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
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
        <RejectDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          onReject={(reason, note) =>
            reject.mutate(
              { applicationId: activeApp.id, body: { reason, note } },
              { onSuccess: () => { toast.success('Candidate rejected'); setRejectOpen(false); } },
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

function RejectDialog({
  open,
  onOpenChange,
  onReject,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReject: (reason: RejectionReason, note?: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState<RejectionReason>('OTHER');
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Reason">
            <Select value={reason} onValueChange={(v) => setReason(v as RejectionReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Note (internal)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => onReject(reason, note || undefined)} loading={loading}>
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
