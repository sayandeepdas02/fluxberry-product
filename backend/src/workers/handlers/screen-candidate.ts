import { screeningService } from '../../services/screening.service';
import type { JobHandler } from './index';

export const screenCandidateHandler: JobHandler = async (payload) => {
  await screeningService.screen(payload);
};
