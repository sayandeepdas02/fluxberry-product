'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Bold, Italic, List, ListOrdered, Link2, Sparkles } from 'lucide-react';
import { CAMPAIGN_MERGE_TAGS } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * WYSIWYG campaign composer (Tiptap). Edits render live, but the value is stored
 * as markdown (via tiptap-markdown) so the body stays a portable string that the
 * send pipeline renders to safe HTML. Merge tags (`{{firstName}}`) and spintax
 * (`{Hi|Hey}`) are inserted as literal text and expanded per-recipient on send.
 */
export function EmailEditor({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  onGenerate,
  generating,
  hasDraft,
}: {
  subject: string;
  onSubjectChange: (v: string) => void;
  body: string;
  onBodyChange: (v: string) => void;
  onGenerate?: () => void;
  generating?: boolean;
  hasDraft?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noreferrer' } }),
      Placeholder.configure({
        placeholder: 'Write your outreach… use {{firstName}} to personalize and {Hi|Hey} for spintax.',
      }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: body,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-3 py-2.5 focus:outline-none prose-p:my-2 prose-headings:text-foreground prose-p:text-foreground',
      },
    },
    onUpdate: ({ editor }) => onBodyChange(editor.storage.markdown.getMarkdown()),
  });

  // Sync external changes (AI draft, loading a saved campaign) without a loop:
  // only reset when the incoming markdown differs from what the editor holds.
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (body !== current) editor.commands.setContent(body || '');
  }, [body, editor]);

  const insertBody = (text: string) => editor?.chain().focus().insertContent(text).run();

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
          Subject
          <MergeTagMenu onPick={(t) => onSubjectChange(subject + `{{${t}}}`)} label="Insert tag" />
        </label>
        <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} placeholder="e.g. {{firstName}} — a role at {{company}}" />
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold"><Bold className="size-4" /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><Italic className="size-4" /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list"><List className="size-4" /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list"><ListOrdered className="size-4" /></ToolbarBtn>
          <ToolbarBtn onClick={() => setLink(editor)} active={editor?.isActive('link')} title="Link"><Link2 className="size-4" /></ToolbarBtn>
          <span className="mx-1 h-4 w-px bg-border" />
          <MergeTagMenu onPick={(t) => insertBody(`{{${t}}}`)} label="Merge tag" />
          {onGenerate && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-xs text-primary" onClick={onGenerate} loading={generating}>
              <Sparkles className="size-3.5" /> {hasDraft ? 'Refine with AI' : 'Write with AI'}
            </Button>
          )}
        </div>

        <EditorContent editor={editor} />
      </div>

      <p className="text-xs text-muted-foreground">
        An unsubscribe link + sender identity are added automatically on send. Merge tags:{' '}
        {CAMPAIGN_MERGE_TAGS.map((t) => `{{${t}}}`).join(', ')}.
      </p>
    </div>
  );
}

function setLink(editor: Editor | null) {
  if (!editor) return;
  const prev = editor.getAttributes('link').href as string | undefined;
  const url = window.prompt('Link URL', prev ?? 'https://');
  if (url === null) return;
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

function ToolbarBtn({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn('rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground', active && 'bg-secondary text-foreground')}
    >
      {children}
    </button>
  );
}

function MergeTagMenu({ onPick, label }: { onPick: (tag: string) => void; label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          {'{ }'} {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {CAMPAIGN_MERGE_TAGS.map((t) => (
          <DropdownMenuItem key={t} onSelect={() => onPick(t)}>{`{{${t}}}`}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
