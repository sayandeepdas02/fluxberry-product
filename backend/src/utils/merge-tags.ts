/**
 * Render a campaign subject/body: expand {a|b|c} spintax deterministically (so a
 * retry produces the identical email) then substitute {{mergeTag}} tokens.
 * Unknown tokens collapse to empty string. Only the whitelisted merge tags are
 * meaningful (firstName, lastName, fullName, title, company, location).
 */

export interface MergeContext {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
}

/** Small stable hash → used to pick a spintax option deterministically per seed. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function expandSpintax(template: string, seed: string): string {
  const re = /\{([^{}]*\|[^{}]*)\}/; // innermost group with at least one pipe
  let out = template;
  let guard = 0;
  let idx = 0;
  while (re.test(out) && guard < 200) {
    out = out.replace(re, (_match, group: string) => {
      const options = group.split('|');
      const pick = hash(`${seed}:${idx++}`) % options.length;
      return options[pick];
    });
    guard++;
  }
  return out;
}

export function firstNameOf(fullName?: string | null): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

export function renderTemplate(template: string, ctx: MergeContext, seed = ''): string {
  const expanded = expandSpintax(template, seed);
  return expanded.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const v = (ctx as Record<string, unknown>)[key];
    return v != null && v !== '' ? String(v) : '';
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Inline markdown → HTML on already-escaped text (bold/italic/code/links). */
function renderInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
      const safe = /^(https?:|mailto:)/i.test(url) ? url : '#';
      return `<a href="${safe}" style="color:#2f4bd0">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');
}

/**
 * Render recruiter-authored markdown to a safe HTML email body. HTML is escaped
 * first (so any pasted/injected markup is inert), then a controlled subset of
 * markdown — paragraphs, line breaks, bold, italic, code, links, bullet lists —
 * is applied. There is no HTML sanitizer in this codebase, so this escape-first
 * approach is what keeps outreach bodies XSS-safe.
 */
export function markdownToSafeHtml(md: string): string {
  const escaped = escapeHtml((md ?? '').trim());
  if (!escaped) return '';
  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      const isList = lines.some((l) => /^\s*[-*]\s+/.test(l)) && lines.every((l) => l.trim() === '' || /^\s*[-*]\s+/.test(l));
      if (isList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li>${renderInline(l.replace(/^\s*[-*]\s+/, ''))}</li>`)
          .join('');
        return `<ul style="margin:0 0 12px;padding-left:20px">${items}</ul>`;
      }
      return `<p style="margin:0 0 12px">${lines.map(renderInline).join('<br>')}</p>`;
    })
    .join('');
}

/**
 * Build a safe HTML email body from recruiter-authored plain text (escaped,
 * newlines → <br>), with the compliance footer (sender identity + one-click
 * unsubscribe) that every cold-outreach email must carry.
 */
export function outreachHtml(
  bodyMarkdown: string,
  opts?: { unsubscribeUrl?: string; senderIdentity?: string; openPixelUrl?: string },
): string {
  const body = markdownToSafeHtml(bodyMarkdown);
  const footerParts: string[] = [];
  if (opts?.senderIdentity) footerParts.push(escapeHtml(opts.senderIdentity));
  if (opts?.unsubscribeUrl) footerParts.push(`<a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#8a93a2">Unsubscribe</a>`);
  const footer = footerParts.length
    ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/><p style="color:#8a93a2;font-size:12px;line-height:1.5">${footerParts.join(' · ')}</p>`
    : '';
  const pixel = opts?.openPixelUrl
    ? `<img src="${escapeHtml(opts.openPixelUrl)}" width="1" height="1" alt="" style="display:none"/>`
    : '';
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a">${body}${footer}${pixel}</div>`;
}
