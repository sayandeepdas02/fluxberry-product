'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, ArrowUp, ArrowDown, Trash2, ArrowDownIcon, Sparkles, GitBranch, ClipboardCheck, Clock, MoveRight, Mail, Code2 } from 'lucide-react';
import {
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  APPLICATION_STAGES,
  type WorkflowNodeDto,
  type WorkflowNodeType,
  type ConditionField,
  type ConditionOperator,
  type ApplicationStage,
} from '@fluxberry/shared';
import { useWorkflow, useSaveWorkflow } from '@/hooks/use-workflow';
import { useAssessments } from '@/hooks/use-assessments';
import { useFeature } from '@/hooks/use-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { STAGE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const NODE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  AI_SCREEN: { label: 'AI screening', icon: <Sparkles className="size-4" /> },
  CONDITION: { label: 'Condition', icon: <GitBranch className="size-4" /> },
  SEND_ASSESSMENT: { label: 'Send assessment', icon: <ClipboardCheck className="size-4" /> },
  CODING_ASSESSMENT: { label: 'Send coding test', icon: <Code2 className="size-4" /> },
  WAIT: { label: 'Wait', icon: <Clock className="size-4" /> },
  MOVE_STAGE: { label: 'Move to stage', icon: <MoveRight className="size-4" /> },
  SEND_EMAIL: { label: 'Send email', icon: <Mail className="size-4" /> },
};
const ADDABLE: WorkflowNodeType[] = ['AI_SCREEN', 'CONDITION', 'SEND_ASSESSMENT', 'WAIT', 'MOVE_STAGE', 'SEND_EMAIL'];

const FIELD_LABELS: Record<ConditionField, string> = {
  screening_score: 'Screening score',
  assessment_score: 'Assessment score',
  years_experience: 'Years of experience',
  expected_salary: 'Expected salary',
  location: 'Location',
  stage: 'Stage',
};
const OP_LABELS: Record<ConditionOperator, string> = { gte: '≥', lte: '≤', gt: '>', lt: '<', eq: '=', neq: '≠' };

const uid = () => Math.random().toString(36).slice(2, 9);

export default function WorkflowBuilderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: workflow, isLoading } = useWorkflow(jobId);
  const save = useSaveWorkflow(jobId);
  const { data: assessments } = useAssessments();
  const codingEnabled = useFeature('CODING_ASSESSMENT');
  const addable: WorkflowNodeType[] = codingEnabled
    ? ['AI_SCREEN', 'CONDITION', 'SEND_ASSESSMENT', 'CODING_ASSESSMENT', 'WAIT', 'MOVE_STAGE', 'SEND_EMAIL']
    : ADDABLE;

  const [nodes, setNodes] = useState<WorkflowNodeDto[] | null>(null);
  const [active, setActive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (workflow && nodes === null) {
      setNodes(workflow.nodes);
      setActive(workflow.status === 'ACTIVE');
    }
  }, [workflow, nodes]);

  if (isLoading || nodes === null) return <Skeleton className="h-80 w-full" />;

  const assessmentName = (id?: string) => assessments?.find((a) => a.id === id)?.name ?? 'an assessment';
  const summarize = (n: WorkflowNodeDto): string => {
    const c = n.config as any;
    switch (n.type) {
      case 'AI_SCREEN': return 'Score the candidate with AI';
      case 'CONDITION': return c.condition ? `${FIELD_LABELS[c.condition.field as ConditionField]} ${OP_LABELS[c.condition.op as ConditionOperator]} ${c.condition.value}` : 'No condition set';
      case 'SEND_ASSESSMENT': return `Send "${assessmentName(c.assessmentId)}"`;
      case 'CODING_ASSESSMENT': return `Send coding test "${assessmentName(c.assessmentId)}"`;
      case 'WAIT': return `Wait ${c.durationHours ?? 0} hours`;
      case 'MOVE_STAGE': return `Move to ${STAGE_LABELS[c.stage as ApplicationStage] ?? c.stage}`;
      case 'SEND_EMAIL': return c.subject ? `Email: ${c.subject}` : 'Send an email';
      default: return '';
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= nodes.length) return;
    const next = [...nodes];
    [next[i], next[j]] = [next[j], next[i]];
    setNodes(next);
  };
  const remove = (id: string) => setNodes(nodes.filter((n) => n.id !== id));

  const onSave = async () => {
    try {
      await save.mutateAsync({
        status: active ? 'ACTIVE' : 'DRAFT',
        nodes: nodes.map((n, i) => ({ ...n, position: { x: 0, y: i } })) as any,
        edges: [],
      });
      toast.success(active ? 'Workflow activated' : 'Workflow saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Automate this job&apos;s hiring — steps run top to bottom when a candidate applies.</p>
      </div>

      <Trigger />
      {nodes.map((n, i) => (
        <div key={n.id} className="space-y-3">
          <Connector />
          <StepCard
            meta={NODE_META[n.type]}
            summary={summarize(n)}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
            onRemove={() => remove(n.id)}
            first={i === 0}
            last={i === nodes.length - 1}
          />
        </div>
      ))}
      <Connector />
      <Button variant="outline" className="w-full border-dashed" onClick={() => setAddOpen(true)}>
        <Plus className="size-4" /> Add step
      </Button>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <div className="text-sm font-medium">Activate workflow</div>
          <div className="text-xs text-muted-foreground">Runs automatically for new applicants.</div>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} loading={save.isPending} disabled={nodes.length === 0}>Save workflow</Button>
      </div>

      <AddStepDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        addable={addable}
        assessments={(assessments ?? []).filter((a) => a.status === 'PUBLISHED').map((a) => ({ id: a.id, name: a.name, type: a.type }))}
        onAdd={(node) => setNodes([...nodes, node])}
      />
    </div>
  );
}

function Trigger() {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm font-medium">
      When a candidate applies
    </div>
  );
}
function Connector() {
  return <div className="ml-5 h-4 w-px bg-border" />;
}

function StepCard({ meta, summary, onUp, onDown, onRemove, first, last }: {
  meta: { label: string; icon: React.ReactNode };
  summary: string;
  onUp: () => void; onDown: () => void; onRemove: () => void; first: boolean; last: boolean;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{meta.label}</div>
        <div className="truncate text-xs text-muted-foreground">{summary}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={onUp} disabled={first}><ArrowUp className="size-4" /></Button>
      <Button variant="ghost" size="icon" onClick={onDown} disabled={last}><ArrowDown className="size-4" /></Button>
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2 className="size-4" /></Button>
    </Card>
  );
}

function AddStepDialog({ open, onOpenChange, onAdd, assessments, addable }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onAdd: (n: WorkflowNodeDto) => void;
  assessments: { id: string; name: string; type: string }[];
  addable: WorkflowNodeType[];
}) {
  const [type, setType] = useState<WorkflowNodeType>('AI_SCREEN');
  const [field, setField] = useState<ConditionField>('screening_score');
  const [op, setOp] = useState<ConditionOperator>('gte');
  const [value, setValue] = useState('7');
  const [assessmentId, setAssessmentId] = useState('');
  const [hours, setHours] = useState('24');
  const [stage, setStage] = useState<ApplicationStage>('INTERVIEW');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const isAssessmentStep = type === 'SEND_ASSESSMENT' || type === 'CODING_ASSESSMENT';
  // Send-assessment picks MCQ assessments; coding-test picks CODING ones.
  const eligibleAssessments = assessments.filter((a) =>
    type === 'CODING_ASSESSMENT' ? a.type === 'CODING' : a.type !== 'CODING',
  );

  const add = () => {
    let config: Record<string, unknown> = {};
    if (type === 'CONDITION') config = { condition: { field, op, value: /^\d+$/.test(value) ? Number(value) : value } };
    else if (type === 'SEND_ASSESSMENT' || type === 'CODING_ASSESSMENT') config = { assessmentId };
    else if (type === 'WAIT') config = { durationHours: Number(hours) || 0 };
    else if (type === 'MOVE_STAGE') config = { stage };
    else if (type === 'SEND_EMAIL') config = { template: 'custom', subject, body };
    onAdd({ id: uid(), type, config, position: { x: 0, y: 0 } });
    onOpenChange(false);
    setType('AI_SCREEN');
    setAssessmentId('');
  };

  const valid = !isAssessmentStep || Boolean(assessmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add step</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Step type">
            <Select value={type} onValueChange={(v) => { setType(v as WorkflowNodeType); setAssessmentId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{addable.map((t) => <SelectItem key={t} value={t}>{NODE_META[t].label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          {type === 'CONDITION' && (
            <div className="grid grid-cols-3 gap-2">
              <Select value={field} onValueChange={(v) => setField(v as ConditionField)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_FIELDS.map((f) => <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={op} onValueChange={(v) => setOp(v as ConditionOperator)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_OPERATORS.map((o) => <SelectItem key={o} value={o}>{OP_LABELS[o]}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          )}
          {isAssessmentStep && (
            <Field label={type === 'CODING_ASSESSMENT' ? 'Coding assessment' : 'Assessment'}>
              <Select value={assessmentId} onValueChange={setAssessmentId}>
                <SelectTrigger><SelectValue placeholder="Choose a published assessment" /></SelectTrigger>
                <SelectContent>
                  {eligibleAssessments.length === 0 ? <div className="px-2 py-2 text-sm text-muted-foreground">No published {type === 'CODING_ASSESSMENT' ? 'coding ' : ''}assessments</div> : eligibleAssessments.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          {type === 'WAIT' && (
            <Field label="Duration (hours)"><Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
          )}
          {type === 'MOVE_STAGE' && (
            <Field label="Stage">
              <Select value={stage} onValueChange={(v) => setStage(v as ApplicationStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{APPLICATION_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          {type === 'SEND_EMAIL' && (
            <>
              <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
              <Field label="Body"><Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={add} disabled={!valid}>Add step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
