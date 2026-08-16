import { screeningService } from '../../services/screening.service';
import type { JobHandler } from './index';

export const parseResumeHandler: JobHandler = async (payload) => {
  await screeningService.parseResume(payload);
};
