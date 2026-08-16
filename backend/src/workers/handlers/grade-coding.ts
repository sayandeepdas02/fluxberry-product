import { codingGradingService } from '../../services/coding-grading.service';
import type { JobHandler } from './index';

/** PROCESS_ASSESSMENT: grade a coding submission via Judge0 (submit + poll). */
export const gradeCodingHandler: JobHandler = async (payload) => {
  await codingGradingService.grade(payload);
};
