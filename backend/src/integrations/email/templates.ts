import { config } from '../../config/env';

/**
 * Minimal, mobile-friendly transactional templates (spec §54). Inline styles,
 * single-column, safe across email clients.
 */
function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1220">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:600;font-size:18px;margin-bottom:20px">${config.appName}</div>
    <div style="background:#ffffff;border:1px solid #e6e8eb;border-radius:12px;padding:24px;line-height:1.5;font-size:15px">
      ${body}
    </div>
    <div style="color:#8a93a2;font-size:12px;margin-top:16px">Sent by ${config.appName}</div>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#EC4899;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;font-size:14px">${label}</a>`;
}

export type TemplateResult = { subject: string; html: string; text: string };

export const emailTemplates = {
  applicationConfirmation(p: { candidateName: string; jobTitle: string; companyName: string }): TemplateResult {
    return {
      subject: `We received your application — ${p.jobTitle}`,
      html: layout(
        `<p>Hi ${escape(p.candidateName)},</p>
         <p>Thanks for applying to <strong>${escape(p.jobTitle)}</strong> at ${escape(p.companyName)}. We've received your application and will be in touch if your profile is selected.</p>`,
      ),
      text: `Hi ${p.candidateName}, thanks for applying to ${p.jobTitle} at ${p.companyName}. We'll be in touch if your profile is selected.`,
    };
  },

  candidateAdvanced(p: { candidateName: string; jobTitle: string; stage: string }): TemplateResult {
    return {
      subject: `Update on your application — ${p.jobTitle}`,
      html: layout(
        `<p>Hi ${escape(p.candidateName)},</p>
         <p>Good news — your application for <strong>${escape(p.jobTitle)}</strong> has moved to the <strong>${escape(p.stage)}</strong> stage.</p>`,
      ),
      text: `Hi ${p.candidateName}, your application for ${p.jobTitle} moved to ${p.stage}.`,
    };
  },

  candidateRejected(p: { candidateName: string; jobTitle: string; companyName: string }): TemplateResult {
    return {
      subject: `Update on your application — ${p.jobTitle}`,
      html: layout(
        `<p>Hi ${escape(p.candidateName)},</p>
         <p>Thank you for your interest in <strong>${escape(p.jobTitle)}</strong> at ${escape(p.companyName)}. After careful review, we won't be moving forward at this time. We appreciate the time you invested and wish you the best.</p>`,
      ),
      text: `Hi ${p.candidateName}, thank you for applying to ${p.jobTitle} at ${p.companyName}. We won't be moving forward at this time.`,
    };
  },

  offerSent(p: { candidateName: string; jobTitle: string; companyName: string; offerLink: string }): TemplateResult {
    return {
      subject: `You have an offer — ${p.jobTitle}`,
      html: layout(
        `<p>Hi ${escape(p.candidateName)},</p>
         <p>Great news! ${escape(p.companyName)} has extended an offer for the <strong>${escape(p.jobTitle)}</strong> role.</p>
         <p style="margin:20px 0">${button(p.offerLink, 'View offer')}</p>
         <p style="color:#8a93a2;font-size:13px">Or paste this link into your browser:<br>${escape(p.offerLink)}</p>`,
      ),
      text: `Hi ${p.candidateName}, ${p.companyName} has extended an offer for ${p.jobTitle}. View it here: ${p.offerLink}`,
    };
  },

  candidateHired(p: { candidateName: string; jobTitle: string; companyName: string }): TemplateResult {
    return {
      subject: `Welcome aboard — ${p.jobTitle}`,
      html: layout(
        `<p>Hi ${escape(p.candidateName)},</p>
         <p>Congratulations! We're thrilled to confirm that you've been hired for the <strong>${escape(p.jobTitle)}</strong> position at ${escape(p.companyName)}. We'll be in touch with next steps soon.</p>`,
      ),
      text: `Hi ${p.candidateName}, congratulations! You've been hired for ${p.jobTitle} at ${p.companyName}. We'll be in touch with next steps.`,
    };
  },

  workspaceInvite(p: { inviterName: string; workspaceName: string; role: string; link: string }): TemplateResult {
    return {
      subject: `${p.inviterName} invited you to join ${p.workspaceName} on ${config.appName}`,
      html: layout(
        `<p>Hi,</p>
         <p><strong>${escape(p.inviterName)}</strong> invited you to join <strong>${escape(p.workspaceName)}</strong> as a <strong>${escape(p.role)}</strong> on ${escape(config.appName)}.</p>
         <p style="margin:20px 0">${button(p.link, 'View invite')}</p>
         <p style="color:#8a93a2;font-size:13px">Or paste this link into your browser:<br>${escape(p.link)}</p>
         <p style="color:#8a93a2;font-size:13px">This invite expires in 7 days.</p>`,
      ),
      text: `${p.inviterName} invited you to join ${p.workspaceName} as a ${p.role} on ${config.appName}. Accept here: ${p.link}`,
    };
  },

  custom(p: { subject: string; body: string }): TemplateResult {
    return {
      subject: p.subject,
      html: layout(p.body.replace(/\n/g, '<br>')),
      text: p.body,
    };
  },
};

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
