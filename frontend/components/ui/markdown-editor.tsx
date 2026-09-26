'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * General-purpose WYSIWYG editor (Tiptap) whose value is stored as markdown,
 * so content stays a portable string rendered elsewhere with react-markdown.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 200,
  ariaLabel,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-3 py-2.5 focus:outline-none prose-p:my-2 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground',
        style: `min-height:${minHeight}px`,
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
  });

  // Sync external changes (initial load, reset) without a loop: only reset when
  // the incoming markdown differs from what the editor already holds.
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (value !== current) editor.commands.setContent(value || '');
  }, [value, editor]);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading"><Heading2 className="size-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Subheading"><Heading3 className="size-4" /></ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold"><Bold className="size-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><Italic className="size-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list"><List className="size-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list"><ListOrdered className="size-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => setLink(editor)} active={editor?.isActive('link')} title="Link"><Link2 className="size-4" /></ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
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
      aria-label={title}
      aria-pressed={active ?? false}
      className={cn('rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground', active && 'bg-secondary text-foreground')}
    >
      {children}
    </button>
  );
}
