import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/** Join row linking a sourced contact to a talent pool (list). */
const sourcingListMemberSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    listId: { type: Schema.Types.ObjectId, ref: 'SourcingList', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'SourcedContact', required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: null },
  },
  { timestamps: true, collection: 'sourcing_list_members' },
);

// One membership per (list, contact).
sourcingListMemberSchema.index({ listId: 1, contactId: 1 }, { unique: true });
sourcingListMemberSchema.index({ workspaceId: 1, listId: 1 });

export type SourcingListMemberDoc = InferSchemaType<typeof sourcingListMemberSchema>;
export const SourcingListMemberModel =
  (models.SourcingListMember as Model<SourcingListMemberDoc>) ||
  model<SourcingListMemberDoc>('SourcingListMember', sourcingListMemberSchema);
