import { referralService } from '../../services/referral.service';
import type { JobHandler } from './index';

export const linkReferralApplicationHandler: JobHandler = async (payload) => {
  const { referralId, applicationId } = payload as { referralId: string; applicationId: string };
  await referralService.recordApplication(referralId, applicationId);
};
