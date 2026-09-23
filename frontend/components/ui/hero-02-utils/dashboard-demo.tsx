'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const stages = [
  {
    name: 'Applied',
    count: 24,
    candidates: [
      { name: 'A. Rahman', role: 'Frontend', score: 61 },
      { name: 'J. Okafor', role: 'Frontend', score: 58 },
      { name: 'M. Lindqvist', role: 'Frontend', score: 44 },
    ],
  },
  {
    name: 'Screened',
    count: 11,
    candidates: [
      { name: 'P. Nair', role: 'Frontend', score: 88 },
      { name: 'S. Mehta', role: 'Frontend', score: 82 },
    ],
  },
  {
    name: 'Interview',
    count: 4,
    candidates: [{ name: 'D. Alvarez', role: 'Frontend', score: 94 }],
  },
];

export function DashboardDemo() {
  return (
    <Card className="w-full max-w-4xl border-border/60 bg-card/80 shadow-lg backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">
              Senior Frontend Engineer
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Open
            </Badge>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">
            39 candidates
          </span>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stages.map((stage) => (
            <div key={stage.name} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {stage.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stage.count}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {stage.candidates.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5"
                  >
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">
                        {c.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium">
                        {c.name}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {c.role}
                      </span>
                    </div>
                    <span className="shrink-0 rounded border px-1.5 py-px text-[10px] font-medium tabular-nums">
                      {c.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
