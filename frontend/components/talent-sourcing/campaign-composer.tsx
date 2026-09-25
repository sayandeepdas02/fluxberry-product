'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Save, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  useLists,
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useDraftEmail,
  useTestCampaign,
  useSendCampaign,
} from '@/hooks/use-talent-sourcing';
import { EmailEditor } from './email-editor';

export function CampaignComposer({ campaignId }: { campaignId?: string }) {
  const router = useRouter();
  const { data: lists } = useLists();
  const { data: existing, isLoading } = useCampaign(campaignId ?? null);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const draftEmail = useDraftEmail();
  const testCampaign = useTestCampaign();
  const sendCampaign = useSendCampaign();

  const [name, setName] = useState('');
  const [listId, setListId] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [aiOpen, setAiOpen] = useState(false);
  const [aiRole, setAiRole] = useState('');
  const [aiBrief, setAiBrief] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setListId(existing.listId);
      setFromName(existing.fromName ?? '');
      setReplyToEmail(existing.replyToEmail ?? '');
      setSubject(existing.subject);
      setBody(existing.body);
    }
  }, [existing]);

  const readOnly = Boolean(existing && existing.status !== 'DRAFT');
  const canSave = name.trim() && listId && subject.trim() && body.trim();

  const save = async (): Promise<string | null> => {
    try {
      if (campaignId) {
        await updateCampaign.mutateAsync({
          campaignId,
          input: { name, subject, body, fromName: fromName || undefined, replyToEmail: replyToEmail || undefined },
        });
        toast.success('Draft saved');
        return campaignId;
      }
      const created = await createCampaign.mutateAsync({
        name, listId, subject, body,
        fromName: fromName || undefined,
        replyToEmail: replyToEmail || undefined,
      });
      toast.success('Draft created');
      router.push(`/app/talent-sourcing/campaigns/${created.id}`);
      return created.id;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
      return null;
    }
  };

  const generate = async () => {
    try {
      const res = await draftEmail.mutateAsync({
        role: aiRole.trim() || name.trim() || 'this role',
        brief: aiBrief.trim() || undefined,
        refine: body.trim() || undefined,
      });
      setSubject(res.subject);
      setBody(res.body);
      setAiOpen(false);
      toast.success('Draft ready — review and edit');
    } catch {
      toast.error('Could not generate a draft');
    }
  };

  const runTest = async () => {
    if (!campaignId) { toast.error('Save the draft first'); return; }
    if (!testEmail.trim()) return;
    testCampaign.mutate(
      { campaignId, toEmail: testEmail.trim() },
      { onSuccess: () => toast.success(`Test sent to ${testEmail}`), onError: () => toast.error('Test failed') },
    );
  };

  const send = (scheduledAt?: string) => {
    if (!campaignId) return;
    sendCampaign.mutate(
      { campaignId, scheduledAt },
      {
        onSuccess: () => {
          toast.success(scheduledAt ? 'Campaign scheduled' : 'Campaign sending');
          setSendOpen(false);
          router.push(`/app/talent-sourcing/campaigns/${campaignId}`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not send'),
      },
    );
  };

  if (campaignId && isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <Link href="/app/talent-sourcing/campaigns" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> All campaigns
      </Link>

      <Card className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Campaign name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rust engineers — Q3" disabled={readOnly} />
          </Field>
          <Field label="Send to list">
            <Select value={listId} onValueChange={setListId} disabled={Boolean(campaignId)}>
              <SelectTrigger><SelectValue placeholder="Select a list" /></SelectTrigger>
              <SelectContent>
                {(lists ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} · {l.contactCount}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="From name (optional)">
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="e.g. Sam at Acme" disabled={readOnly} />
          </Field>
          <Field label="Reply-to email (optional)">
            <Input value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} placeholder="you@company.com" disabled={readOnly} />
          </Field>
        </div>

        <EmailEditor
          subject={subject}
          onSubjectChange={setSubject}
          body={body}
          onBodyChange={setBody}
          onGenerate={readOnly ? undefined : () => { setAiRole(name); setAiOpen(true); }}
          generating={draftEmail.isPending}
          hasDraft={Boolean(body.trim())}
        />
      </Card>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={save} loading={createCampaign.isPending || updateCampaign.isPending} disabled={!canSave}>
            <Save className="size-4" /> {campaignId ? 'Save draft' : 'Save draft'}
          </Button>

          {campaignId && (
            <>
              <div className="flex items-center gap-1">
                <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@company.com" className="h-9 w-52" />
                <Button variant="ghost" onClick={runTest} loading={testCampaign.isPending}>
                  <Mail className="size-4" /> Send test
                </Button>
              </div>
              <Button className="ml-auto" onClick={() => setSendOpen(true)} disabled={!canSave}>
                <Send className="size-4" /> Send campaign
              </Button>
            </>
          )}
        </div>
      )}

      {/* AI draft dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Write with AI</DialogTitle></DialogHeader>
          <Field label="Role you're pitching">
            <Input value={aiRole} onChange={(e) => setAiRole(e.target.value)} placeholder="e.g. Senior Rust Engineer" autoFocus />
          </Field>
          <Field label="Anything to emphasize? (optional)">
            <Textarea value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} rows={3} placeholder="e.g. Recently raised a seed round, fully remote, strong systems work." />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)}>Cancel</Button>
            <Button onClick={generate} loading={draftEmail.isPending}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send / schedule dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send campaign</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Contacts without an email or who have unsubscribed are skipped automatically.
          </p>
          <Field label="Schedule for later (optional)">
            <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>Cancel</Button>
            {scheduleAt ? (
              <Button onClick={() => send(new Date(scheduleAt).toISOString())} loading={sendCampaign.isPending}>Schedule</Button>
            ) : (
              <Button onClick={() => send()} loading={sendCampaign.isPending}>Send now</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
