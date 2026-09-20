'use client';

import { useMemo, useState } from 'react';
import { Users, MapPin, AlignLeft, X, Info } from 'lucide-react';
import type { InterviewerInput, ScheduledInterviewLocationType } from '@fluxberry/shared';
import { useCreateScheduledInterview } from '@/hooks/use-scheduled-interviews';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
import { useCalendarConnectionStatus, useConnectCalendar } from '@/hooks/use-calendar-integration';
import { useOrganizerAvailability } from '@/hooks/use-organizer-availability';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { DatePickerPopover, TimeSelect } from './date-time-picker';

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function roundToNextQuarterHour(d: Date): Date {
  const next = new Date(d);
  next.setSeconds(0, 0);
  const mins = next.getMinutes();
  next.setMinutes(Math.ceil(mins / 15) * 15);
  return next;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  applicationId,
  candidateName,
  candidateEmail,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
}) {
  const { currentWorkspace } = useWorkspace();
  const create = useCreateScheduledInterview();
  const { data: calendarStatus } = useCalendarConnectionStatus();
  const connectCalendar = useConnectCalendar();

  const defaultStart = useMemo(() => roundToNextQuarterHour(new Date(Date.now() + 30 * 60 * 1000)), []);
  const defaultEnd = useMemo(() => new Date(defaultStart.getTime() + 60 * 60 * 1000), [defaultStart]);

  const [title, setTitle] = useState(`Interview with ${currentWorkspace.name}`);
  const [interviewers, setInterviewers] = useState<InterviewerInput[]>([]);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [locationType, setLocationType] = useState<ScheduledInterviewLocationType>('ONLINE');
  const [locationDetail, setLocationDetail] = useState('');
  const [description, setDescription] = useState('');
  const [shareInterviewerLink, setShareInterviewerLink] = useState(true);
  const [shareCandidateDetails, setShareCandidateDetails] = useState(true);
  const [shareFeedbackForm, setShareFeedbackForm] = useState(true);
  const [sharePastFeedback, setSharePastFeedback] = useState(false);

  const availabilityEnabled = Boolean(calendarStatus?.connected);
  const { data: availability } = useOrganizerAvailability(start, availabilityEnabled);
  const busyBlocks = availability?.busy ?? [];
  const hasConflict = availabilityEnabled && busyBlocks.some((b) => start < new Date(b.end) && end > new Date(b.start));

  const setStartDate = (d: Date) => {
    setStart(d);
    const nextEnd = new Date(end);
    nextEnd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setEnd(nextEnd);
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Add a title');
      return;
    }
    if (end.getTime() <= start.getTime()) {
      toast.error('End time must be after start time');
      return;
    }
    try {
      await create.mutateAsync({
        applicationId,
        input: {
          title: title.trim(),
          interviewers,
          start: start.toISOString(),
          end: end.toISOString(),
          locationType,
          locationDetail: locationType === 'IN_PERSON' ? locationDetail.trim() || undefined : undefined,
          description: description.trim() || undefined,
          shareInterviewerLink,
          shareCandidateDetails,
          shareFeedbackForm,
          feedbackTemplate: 'BASIC',
          sharePastFeedback,
        },
      });
      toast.success('Interview scheduled');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule interview');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle className="sr-only">Schedule interview</DialogTitle>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-none bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/50"
          placeholder="Add title"
        />

        <InterviewerPicker
          interviewers={interviewers}
          onChange={setInterviewers}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
        />

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
            <DatePickerPopover value={start} onChange={setStartDate} />
            <span className="text-muted-foreground">·</span>
            <TimeSelect value={start} onChange={setStart} />
            <span className="text-muted-foreground">–</span>
            <TimeSelect value={end} onChange={setEnd} />
            {hasConflict && <span className="text-xs text-amber-600">This overlaps your calendar</span>}
          </div>
          {availabilityEnabled && busyBlocks.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Busy: {busyBlocks.map((b) => `${formatTime(b.start)}–${formatTime(b.end)}`).join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 border-t border-border pt-4">
          <MapPin className="mt-2 size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-1.5">
            <Select value={locationType} onValueChange={(v) => setLocationType(v as ScheduledInterviewLocationType)}>
              <SelectTrigger className="h-8 w-36 border-none bg-transparent px-0 text-sm font-medium shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="IN_PERSON">In-person</SelectItem>
              </SelectContent>
            </Select>
            {locationType === 'ONLINE' ? (
              <p className="text-xs text-muted-foreground">
                {calendarStatus?.connected
                  ? 'A Google Meet link will be added automatically.'
                  : 'A meeting link will be added automatically.'}
              </p>
            ) : (
              <input
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="Add an address"
                className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border pt-4">
          <AlignLeft className="mt-2 size-4 shrink-0 text-muted-foreground" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description"
            rows={2}
            className="border-none px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <Switch checked={shareInterviewerLink} onCheckedChange={setShareInterviewerLink} />
            Add a link that only interviewer can access
          </label>
          {shareInterviewerLink && (
            <div className="space-y-1.5 pl-1 text-xs text-muted-foreground">
              <p>On clicking the link, interviewer will see:</p>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={shareCandidateDetails} onChange={(e) => setShareCandidateDetails(e.target.checked)} />
                Candidate details
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={shareFeedbackForm} onChange={(e) => setShareFeedbackForm(e.target.checked)} />
                Feedback form. Template: Basic
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={sharePastFeedback} onChange={(e) => setSharePastFeedback(e.target.checked)} />
                Past interview feedbacks
              </label>
            </div>
          )}
        </div>

        {!calendarStatus?.connected && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            <span>
              <button
                type="button"
                onClick={() => connectCalendar.mutate()}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Connect
              </button>{' '}
              your Google Calendar to sync this interview and get a real Meet link (optional — it&apos;ll be scheduled either way).
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} loading={create.isPending}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InterviewerPicker({
  interviewers,
  onChange,
  candidateName,
  candidateEmail,
}: {
  interviewers: InterviewerInput[];
  onChange: (list: InterviewerInput[]) => void;
  candidateName: string;
  candidateEmail: string;
}) {
  const { data: members } = useWorkspaceMembers();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
  const alreadyAdded = interviewers.some((i) => i.email.toLowerCase() === query.trim().toLowerCase());
  const available = (members ?? []).filter(
    (m) => m.user.email !== candidateEmail && !interviewers.some((i) => i.email === m.user.email),
  );
  const filtered = query.trim()
    ? available.filter(
        (m) =>
          m.user.name.toLowerCase().includes(query.trim().toLowerCase()) ||
          m.user.email.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : available;

  const add = (i: InterviewerInput) => {
    onChange([...interviewers, i]);
    setQuery('');
    setOpen(false);
  };
  const remove = (email: string) => onChange(interviewers.filter((i) => i.email !== email));

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Add interviewer"
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </PopoverTrigger>
          <PopoverContent className="w-72 p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => add({ userId: m.userId, email: m.user.email, name: m.user.name })}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <Avatar className="size-6"><AvatarFallback className="text-[10px]">{initials(m.user.name)}</AvatarFallback></Avatar>
                <span className="truncate">{m.user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{m.user.email}</span>
              </button>
            ))}
            {query.trim() && !alreadyAdded && isValidEmail && (
              <button
                type="button"
                onClick={() => add({ email: query.trim() })}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                Add &quot;{query.trim()}&quot;
              </button>
            )}
            {filtered.length === 0 && !(query.trim() && isValidEmail) && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Type a name or email</div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1 pl-6">
        {interviewers.map((i) => (
          <div key={i.email} className="group flex items-center gap-2 text-sm">
            <Avatar className="size-6"><AvatarFallback className="text-[10px]">{initials(i.name ?? i.email)}</AvatarFallback></Avatar>
            <span>{i.name ?? i.email}</span>
            <button type="button" onClick={() => remove(i.email)} className="ml-auto text-muted-foreground/50 opacity-0 hover:text-destructive group-hover:opacity-100">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="size-6"><AvatarFallback className="text-[10px]">{initials(candidateName)}</AvatarFallback></Avatar>
          <span>{candidateName}</span>
          <span className="text-xs text-muted-foreground">(Candidate)</span>
        </div>
      </div>
    </div>
  );
}
