import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const linkSchema = new Schema({ label: String, url: String }, { _id: false });
const memberSchema = new Schema(
  { name: String, role: { type: String, default: '' }, avatarUrl: { type: String, default: '' } },
  { _id: false },
);
const benefitSchema = new Schema(
  { emoji: String, label: String, description: { type: String, default: '' } },
  { _id: false },
);

/** Careers-page configuration, one per workspace. */
const careersPageSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    published: { type: Boolean, default: false },
    headline: { type: String, default: '' },
    tagline: { type: String, default: '' },
    about: {
      enabled: { type: Boolean, default: true },
      content: { type: String, default: '' },
    },
    links: {
      enabled: { type: Boolean, default: false },
      items: { type: [linkSchema], default: [] },
    },
    team: {
      enabled: { type: Boolean, default: false },
      members: { type: [memberSchema], default: [] },
    },
    jobs: {
      enabled: { type: Boolean, default: true },
      heading: { type: String, default: 'Open roles' },
    },
    benefits: {
      enabled: { type: Boolean, default: false },
      items: { type: [benefitSchema], default: [] },
    },
    sectionOrder: { type: [String], default: ['about', 'links', 'team', 'jobs'] },
    accentColor: { type: String, default: null },
    coverImageUrl: { type: String, default: null },
  },
  { timestamps: true, collection: 'careers_pages' },
);

export type CareersPageDoc = InferSchemaType<typeof careersPageSchema>;
export const CareersPageModel =
  (models.CareersPage as Model<CareersPageDoc>) || model<CareersPageDoc>('CareersPage', careersPageSchema);
