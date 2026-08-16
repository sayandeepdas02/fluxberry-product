import { interviewService } from '../../services/interview.service';
import type { JobHandler } from './index';

/** PROCESS_INTERVIEW: fetch the transcript and evaluate the interview. */
export const evaluateInterviewHandler: JobHandler = async (payload) => {
  await interviewService.evaluate(payload);
};
