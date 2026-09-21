'use client';

import { FileText, Paperclip, Video } from 'lucide-react';
import { fetchAnswerFileUrl } from '@/hooks/use-candidates';
import type { CandidateDetailState } from '@/hooks/use-candidate-detail';
import { ResumeViewerDialog } from '@/components/candidates/resume-viewer-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageBadge } from '@/components/candidates/stage-badge';
import { LabelPicker, LabelChips } from '@/components/candidates/label-picker';
import { ScreeningCard } from '@/components/candidates/screening-card';
import { Timeline } from '@/components/candidates/timeline';
import { MessageThread } from '@/components/candidates/message-thread';
import { toast } from '@/components/ui/sonner';
import { formatSalary, initials, reserveTab } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * Candidate profile content — header, screening, details, skills, messages,
 * and timeline. Excludes the "Move to stage"/Shortlist/Reject action bar
 * (see `CandidateActionBar`), so it can be rendered as a plain scrollable
 * body without a footer competing for the same scroll region.
 */
export function CandidateDetailBody({ state }: { state: CandidateDetailState }) {
  const {
    candidateId,
    profile,
    isLoading,
    activeApp,
    selectedApplicationId,
    setSelectedApplicationId,
    detail,
    timeline,
    form,
    rescreen,
    resumeOpen,
    setResumeOpen,
  } = state;

  if (isLoading || !profile) return <Skeleton className="h-96 w-full" />;

  const candidate = profile.candidate;
  const parsed = candidate.parsedProfile;
  const answers = detail.data?.answers.answers ?? [];
  const questionById = new Map((form.data?.questions ?? []).map((q) => [q.id, q]));

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
              {activeApp && <StageBadge stage={activeApp.stage} stages={state.jobStages.data} />}
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
          <Button variant="outline" onClick={() => setResumeOpen(true)} disabled={!candidate.resume}>
            <FileText className="size-4" /> View Resume
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h2 className="sr-only">Candidate details</h2>
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
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
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
                {answers.map((a) => {
                  const question = questionById.get(a.questionId);
                  const isFileAnswer = a.value != null && typeof a.value === 'object' && !Array.isArray(a.value) && 'storageKey' in a.value;
                  return (
                    <div key={a.questionId}>
                      <div className="text-xs font-medium text-muted-foreground">{question?.label ?? 'Question'}</div>
                      {isFileAnswer && activeApp ? (
                        <AnswerFileLink
                          applicationId={activeApp.id}
                          questionId={a.questionId}
                          fileName={(a.value as { fileName?: string }).fileName}
                          isVideo={question?.type === 'VIDEO_RECORDING'}
                        />
                      ) : (
                        <div>{Array.isArray(a.value) ? a.value.join(', ') : String(a.value)}</div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="sr-only">Actions</h2>

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              {timeline.isLoading ? <Skeleton className="h-24 w-full" /> : <Timeline entries={timeline.data ?? []} />}
            </CardContent>
          </Card>
        </div>
      </div>

      <ResumeViewerDialog
        candidateId={candidateId}
        candidateName={candidate.name}
        open={resumeOpen}
        onOpenChange={setResumeOpen}
      />
    </div>
  );
}

function AnswerFileLink({
  applicationId,
  questionId,
  fileName,
  isVideo,
}: {
  applicationId: string;
  questionId: string;
  fileName?: string;
  isVideo: boolean;
}) {
  const open = async () => {
    const tab = reserveTab();
    try {
      const url = await fetchAnswerFileUrl(applicationId, questionId);
      tab.navigate(url);
    } catch {
      tab.close();
      toast.error('Could not open file');
    }
  };
  return (
    <button type="button" onClick={open} className="mt-0.5 flex items-center gap-1.5 text-primary hover:underline">
      {isVideo ? <Video className="size-3.5" /> : <Paperclip className="size-3.5" />}
      {fileName ?? (isVideo ? 'Watch video' : 'Download file')}
    </button>
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
