import { getEmailProvider } from '../../integrations';
import { CandidateAssessmentModel } from '../../models/candidate-assessment.model';
import { ScheduledInterviewModel } from '../../models/scheduled-interview.model';
import type { JobHandler } from './index';

export const sendEmailHandler: JobHandler = async (payload) => {
  // Conditional send: skip if the referenced entity no longer meets the required status.
  if (payload.conditionCheck?.type === 'candidate_assessment_status') {
    const ca = await CandidateAssessmentModel.findById(payload.conditionCheck.candidateAssessmentId)
      .select('status')
      .lean();
    const allowed: string[] = payload.conditionCheck.allowedStatuses ?? [];
    if (!ca || !allowed.includes(ca.status as string)) return;
  }

  // Interview reminder: skip if the interview was cancelled (hard-deleted) before this fired.
  if (payload.conditionCheck?.type === 'scheduled_interview_active') {
    const exists = await ScheduledInterviewModel.exists({ _id: payload.conditionCheck.scheduledInterviewId });
    if (!exists) return;
  }

  await getEmailProvider().send({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    from: payload.from,
    replyTo: payload.replyTo,
  });
};
