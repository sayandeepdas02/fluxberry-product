'use client';

import { useState } from 'react';
import { Linkedin, Github, Download, ChevronLeft, ChevronRight, Briefcase, GraduationCap, Sparkles, UserPlus, ListPlus, CheckCircle2, DollarSign } from 'lucide-react';
import type { SourcedContactDto, CompensationBandDto } from '@/lib/shared';
import { Sheet, SheetContent, SheetBody, SheetFooter, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { initials } from '@/lib/utils';
import { useContact, useCompensationBand } from '@/hooks/use-talent-sourcing';
import { MatchScoreBadge } from './match-score-badge';

export function ContactDrawer({
  contactId,
  onOpenChange,
  onExport,
  onConvert,
  onAddToList,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  contactId: string | null;
  onOpenChange: (open: boolean) => void;
  onExport?: (id: string) => void;
  onConvert?: (id: string) => void;
  onAddToList?: (id: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const { data: contact, isLoading } = useContact(contactId);

  return (
    <Sheet open={Boolean(contactId)} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl" showClose={false}>
        {isLoading || !contact ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : (
          <>
            <Header contact={contact} onPrev={onPrev} onNext={onNext} hasPrev={hasPrev} hasNext={hasNext} />
            <SheetBody>
              <Body contact={contact} />
            </SheetBody>
            <SheetFooter>
              {onConvert && (
                contact.addedToJob ? (
                  <Button variant="secondary" size="sm" disabled>
                    <CheckCircle2 className="size-4" /> In pipeline
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => onConvert(contact.id)}>
                    <UserPlus className="size-4" /> Add to job
                  </Button>
                )
              )}
              {onAddToList && (
                <Button variant="outline" size="sm" onClick={() => onAddToList(contact.id)}>
                  <ListPlus className="size-4" /> Add to list
                </Button>
              )}
              {onExport && (
                <Button variant="ghost" size="sm" onClick={() => onExport(contact.id)}>
                  <Download className="size-4" /> Export
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {contact.addedToJob ? `In pipeline: ${contact.addedToJob.jobTitle ?? 'a job'}` : 'Not yet contacted'}
              </span>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Header({
  contact,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  contact: SourcedContactDto;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          <AvatarFallback>{initials(contact.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="truncate">{contact.fullName}</SheetTitle>
            <MatchScoreBadge score={contact.matchScore} reasons={contact.matchReasons} />
          </div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {[contact.title, contact.company].filter(Boolean).join(' · ') || '—'}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
            {contact.location && <span className="text-xs">{contact.location}</span>}
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-primary">
                <Linkedin className="size-4" />
              </a>
            )}
            {contact.githubUrl && (
              <a href={contact.githubUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">
                <Github className="size-4" />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={onPrev}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={onNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Body({ contact }: { contact: SourcedContactDto }) {
  const email = contact.workEmail || contact.personalEmail;
  const [activeTab, setActiveTab] = useState('overview');
  const { data: compResult, isLoading: compLoading } = useCompensationBand(contact.id, activeTab === 'compensation');

  return (
    <div className="space-y-5">
      {contact.matchReasons.length > 0 && (
        <div className="rounded-lg border border-border bg-primary/5 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> Why this match
          </div>
          <ul className="space-y-0.5 text-sm text-foreground">
            {contact.matchReasons.map((r) => <li key={r}>· {r}</li>)}
          </ul>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <dl className="space-y-3 text-sm">
            <Row label="Email">
              {email ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : <span className="text-muted-foreground">No email found</span>}
            </Row>
            <Row label="Phone">
              {contact.phone ? <span>{contact.phone}</span> : <span className="text-muted-foreground">No phone</span>}
            </Row>
            <Row label="Company">{contact.company ?? '—'}</Row>
            <Row label="Industry">{contact.industry ?? '—'}</Row>
            <Row label="Experience">{contact.yearsExperience != null ? `${contact.yearsExperience} years` : '—'}</Row>
          </dl>
        </TabsContent>

        <TabsContent value="experience">
          {contact.experience.length === 0 ? (
            <p className="text-sm text-muted-foreground">No experience data.</p>
          ) : (
            <ul className="space-y-3">
              {contact.experience.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <Briefcase className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.title ?? 'Role'}</div>
                    <div className="text-xs text-muted-foreground">
                      {[e.company, [e.start, e.end].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="education">
          {contact.education.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education data.</p>
          ) : (
            <ul className="space-y-3">
              {contact.education.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <GraduationCap className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.school ?? 'School'}</div>
                    <div className="text-xs text-muted-foreground">{[e.degree, e.major].filter(Boolean).join(', ')}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="skills">
          {contact.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills data.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {contact.skills.map((s) => (
                <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{s}</span>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compensation">
          {compLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : compResult?.band ? (
            <CompensationBandView band={compResult.band} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No compensation data available for this company/role.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompensationBandView({ band }: { band: CompensationBandDto }) {
  const fmt = (n?: number) =>
    n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: band.currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-primary/5 px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
          <DollarSign className="size-3.5" /> Estimated market compensation (Levels.fyi, aggregate data)
        </div>
        <p className="text-sm text-foreground">
          Crowd-sourced pay data for {band.jobFamilyName ?? 'this role'} at {band.companyName ?? 'this company'} —
          not this candidate&apos;s actual salary.
        </p>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Total compensation</div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Row label="P25">{fmt(band.totalComp.p25)}</Row>
          <Row label="Median">{fmt(band.totalComp.p50)}</Row>
          <Row label="P75">{fmt(band.totalComp.p75)}</Row>
        </dl>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Base salary</div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Row label="P25">{fmt(band.base.p25)}</Row>
          <Row label="Median">{fmt(band.base.p50)}</Row>
          <Row label="P75">{fmt(band.base.p75)}</Row>
        </dl>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-foreground">{children}</dd>
    </div>
  );
}
