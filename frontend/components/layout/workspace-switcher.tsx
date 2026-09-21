'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, LogOut } from 'lucide-react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CreateWorkspaceDialog } from '@/components/workspace/create-workspace-dialog';
import { useClerk } from '@clerk/nextjs';
import { initials, cn } from '@/lib/utils';

export function WorkspaceSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const { signOut } = useClerk();

  const logout = async () => {
    queryClient.clear();
    window.localStorage.removeItem('fluxberry_test_token');
    window.localStorage.removeItem('fluxberry_workspace_id');
    await signOut({ redirectUrl: '/' });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-7 w-7 rounded-md">
            {currentWorkspace.logoUrl && (
              <AvatarImage src={currentWorkspace.logoUrl} alt={currentWorkspace.name} className="rounded-md object-contain" />
            )}
            <AvatarFallback className="rounded-md bg-primary/10 text-primary">
              {initials(currentWorkspace.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{currentWorkspace.name}</div>
            <div className="text-xs capitalize text-muted-foreground">
              {currentWorkspace.plan.toLowerCase()} plan
            </div>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((ws) => (
            <DropdownMenuItem key={ws.id} onSelect={() => switchWorkspace(ws.id)}>
              <Avatar className="h-6 w-6 rounded-md">
                {ws.logoUrl && (
                  <AvatarImage src={ws.logoUrl} alt={ws.name} className="rounded-md object-contain" />
                )}
                <AvatarFallback className="rounded-md text-[10px]">{initials(ws.name)}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{ws.name}</span>
              <Check
                className={cn('size-4', ws.id === currentWorkspace.id ? 'opacity-100' : 'opacity-0')}
              />
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New workspace
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={logout}>
            <LogOut className="size-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
