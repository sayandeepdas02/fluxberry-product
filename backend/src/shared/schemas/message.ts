import { z } from 'zod';

export const sendMessageSchema = z.object({
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(20000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type MessageDto = {
  id: string;
  applicationId: string;
  sender: 'recruiter' | 'candidate';
  senderUserId?: string | null;
  subject?: string | null;
  body: string;
  direction: 'outbound' | 'inbound';
  readByRecruiter: boolean;
  createdAt: string;
};
