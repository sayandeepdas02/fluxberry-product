import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  requireRole,
  requireFeature,
  requirePlanFeature,
} from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { aiLimiter } from '../middleware/rate-limit';
import { sourcingController } from '../controllers/sourcing.controller';
import {
  sourcingParseInputSchema,
  sourcingSearchInputSchema,
  updateSearchCriteriaSchema,
  exportContactsSchema,
  sourcingContactListQuerySchema,
  convertContactSchema,
  createListSchema,
  updateListSchema,
  addToListSchema,
  createCampaignSchema,
  updateCampaignSchema,
  sendCampaignSchema,
  testCampaignSchema,
  draftCampaignSchema,
} from '../shared';

export const sourcingRouter = Router();

// Talent Sourcing is a MAX-plan feature; every route sits behind the subscription
// gate, the global kill-switch, and the per-plan entitlement check.
sourcingRouter.use(
  '/sourcing',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  requireFeature('TALENT_SOURCING'),
  requirePlanFeature('TALENT_SOURCING'),
);

// Search & contacts
sourcingRouter.post(
  '/sourcing/parse',
  requireRole('recruiter'),
  aiLimiter,
  validateBody(sourcingParseInputSchema),
  sourcingController.parse,
);
sourcingRouter.post(
  '/sourcing/search',
  requireRole('recruiter'),
  aiLimiter,
  validateBody(sourcingSearchInputSchema),
  sourcingController.search,
);
sourcingRouter.get('/sourcing/searches', sourcingController.listSearches);
sourcingRouter.get('/sourcing/searches/:searchId', sourcingController.getSearch);
sourcingRouter.post(
  '/sourcing/searches/:searchId/more',
  requireRole('recruiter'),
  aiLimiter,
  sourcingController.loadMore,
);
sourcingRouter.patch(
  '/sourcing/searches/:searchId/criteria',
  requireRole('recruiter'),
  aiLimiter,
  validateBody(updateSearchCriteriaSchema),
  sourcingController.updateCriteria,
);
sourcingRouter.get('/sourcing/contacts', validateQuery(sourcingContactListQuerySchema), sourcingController.listContacts);
sourcingRouter.post(
  '/sourcing/contacts/export',
  requireRole('recruiter'),
  validateBody(exportContactsSchema),
  sourcingController.exportContacts,
);
sourcingRouter.get('/sourcing/contacts/:contactId', sourcingController.getContact);
sourcingRouter.get('/sourcing/contacts/:contactId/compensation', sourcingController.getCompensation);
sourcingRouter.post(
  '/sourcing/contacts/:contactId/convert',
  requireRole('recruiter'),
  validateBody(convertContactSchema),
  sourcingController.convertContact,
);

// Lists (talent pools)
sourcingRouter.get('/sourcing/lists', sourcingController.listLists);
sourcingRouter.post('/sourcing/lists', requireRole('recruiter'), validateBody(createListSchema), sourcingController.createList);
sourcingRouter.get('/sourcing/lists/:listId', sourcingController.getList);
sourcingRouter.patch(
  '/sourcing/lists/:listId',
  requireRole('recruiter'),
  validateBody(updateListSchema),
  sourcingController.updateList,
);
sourcingRouter.delete('/sourcing/lists/:listId', requireRole('recruiter'), sourcingController.deleteList);
sourcingRouter.get('/sourcing/lists/:listId/contacts', sourcingController.listMembers);
sourcingRouter.post(
  '/sourcing/lists/:listId/contacts',
  requireRole('recruiter'),
  validateBody(addToListSchema),
  sourcingController.addToList,
);
sourcingRouter.delete(
  '/sourcing/lists/:listId/contacts/:contactId',
  requireRole('recruiter'),
  sourcingController.removeFromList,
);

// Campaigns (single-shot outreach)
sourcingRouter.get('/sourcing/campaigns', sourcingController.listCampaigns);
sourcingRouter.post('/sourcing/campaigns', requireRole('recruiter'), validateBody(createCampaignSchema), sourcingController.createCampaign);
sourcingRouter.post(
  '/sourcing/campaigns/draft',
  requireRole('recruiter'),
  aiLimiter,
  validateBody(draftCampaignSchema),
  sourcingController.draftEmail,
);
sourcingRouter.get('/sourcing/campaigns/:campaignId', sourcingController.getCampaign);
sourcingRouter.patch(
  '/sourcing/campaigns/:campaignId',
  requireRole('recruiter'),
  validateBody(updateCampaignSchema),
  sourcingController.updateCampaign,
);
sourcingRouter.delete('/sourcing/campaigns/:campaignId', requireRole('recruiter'), sourcingController.deleteCampaign);
sourcingRouter.get('/sourcing/campaigns/:campaignId/recipients', sourcingController.listRecipients);
sourcingRouter.post(
  '/sourcing/campaigns/:campaignId/test',
  requireRole('recruiter'),
  validateBody(testCampaignSchema),
  sourcingController.testCampaign,
);
sourcingRouter.post(
  '/sourcing/campaigns/:campaignId/send',
  requireRole('recruiter'),
  validateBody(sendCampaignSchema),
  sourcingController.sendCampaign,
);
