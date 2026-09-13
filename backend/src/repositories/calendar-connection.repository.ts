import { CalendarConnectionModel } from '../models/calendar-connection.model';

// A user has at most one calendar connection, whichever provider it's for —
// the filter never includes `provider` (that's part of the $set payload), so
// reconnecting with a different provider replaces the existing doc instead of
// colliding with it under the unique (workspaceId, userId) index.
export const calendarConnectionRepository = {
  findForUser: (workspaceId: string, userId: string) => CalendarConnectionModel.findOne({ workspaceId, userId }),
  upsert: (workspaceId: string, userId: string, data: Record<string, any>) =>
    CalendarConnectionModel.findOneAndUpdate(
      { workspaceId, userId },
      { $set: data },
      { new: true, upsert: true },
    ),
  delete: (workspaceId: string, userId: string) => CalendarConnectionModel.deleteOne({ workspaceId, userId }),
};
