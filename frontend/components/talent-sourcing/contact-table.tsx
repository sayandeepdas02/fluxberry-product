'use client';

import { Linkedin, Github, Eye, Download, Mail, MailX, UserPlus, ListPlus, Trash2, CheckCircle2 } from 'lucide-react';
import type { SourcedContactDto } from '@/lib/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { RecordMenu } from '@/components/ui/record-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initials } from '@/lib/utils';
import { MatchScoreBadge } from './match-score-badge';

export function ContactTable({
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpen,
  onExport,
  onConvert,
  onAddToList,
  onRemove,
}: {
  items: SourcedContactDto[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpen: (id: string) => void;
  onExport: (id: string) => void;
  onConvert?: (id: string) => void;
  onAddToList?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const allSelected = selectedIds.size === items.length && items.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={onSelectAll}
                className="cursor-pointer"
              />
            </TableHead>
            <TableHead>Candidate</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-32">Location</TableHead>
            <TableHead className="w-16">Match</TableHead>
            <TableHead>Why</TableHead>
            <TableHead className="w-28">Contact</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <TableRow
                key={c.id}
                data-clickable="true"
                data-selected={isSelected}
                className={isSelected ? 'bg-accent/40' : undefined}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('input,a,button')) return;
                  onOpen(c.id);
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(c.id)}
                    className="cursor-pointer"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">{initials(c.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-foreground">{c.fullName}</span>
                        {c.linkedinUrl && (
                          <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                            <Linkedin className="size-3.5" />
                          </a>
                        )}
                        {c.githubUrl && (
                          <a href={c.githubUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <Github className="size-3.5" />
                          </a>
                        )}
                      </div>
                      {c.yearsExperience != null && (
                        <div className="text-xs text-muted-foreground">{c.yearsExperience} yrs experience</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-foreground">{c.title ?? '—'}</div>
                    {c.company && <div className="truncate text-xs text-muted-foreground">{c.company}</div>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.location ?? '—'}</TableCell>
                <TableCell><MatchScoreBadge score={c.matchScore} reasons={c.matchReasons} /></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.matchReasons.slice(0, 2).map((r) => (
                      <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{r}</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {c.hasEmail ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <Mail className="size-3.5" /> Email
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MailX className="size-3.5" /> No email
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <RecordMenu
                    actions={[
                      { label: 'View profile', icon: <Eye className="size-4" />, onSelect: () => onOpen(c.id) },
                      {
                        label: c.addedToJob ? 'In a pipeline' : 'Add to job',
                        icon: c.addedToJob ? <CheckCircle2 className="size-4" /> : <UserPlus className="size-4" />,
                        hidden: !onConvert,
                        disabled: Boolean(c.addedToJob),
                        onSelect: () => onConvert?.(c.id),
                      },
                      { label: 'Add to list', icon: <ListPlus className="size-4" />, hidden: !onAddToList, onSelect: () => onAddToList?.(c.id) },
                      { label: 'Export CSV', icon: <Download className="size-4" />, onSelect: () => onExport(c.id) },
                      { label: 'Remove from list', icon: <Trash2 className="size-4" />, variant: 'destructive', separated: true, hidden: !onRemove, onSelect: () => onRemove?.(c.id) },
                    ]}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
