/**
 * Importing this module registers every Mongoose model. Slices append their
 * models here so migrations can sync all indexes in one place.
 */
export { JobQueueModel } from './job-queue.model';
export { EventModel } from './event.model';
export { UserModel } from './user.model';
export { AccountModel } from './account.model';
export { AccountMemberModel } from './account-member.model';
export { CreditTransactionModel } from './credit-transaction.model';
export { WorkspaceModel } from './workspace.model';
export { WorkspaceMemberModel } from './workspace-member.model';
export { AuditLogModel } from './audit-log.model';
export { JobModel } from './job.model';
export { CandidateModel } from './candidate.model';
export { ApplicationModel } from './application.model';
export { ApplicationFormModel } from './application-form.model';
export { ApplicationAnswersModel } from './application-answers.model';
export { ScreeningResultModel } from './screening-result.model';
export { CareersPageModel } from './careers-page.model';
export { OfferModel } from './offer.model';
export { GdprRequestModel } from './gdpr-request.model';
export { WebhookEndpointModel } from './webhook-endpoint.model';
export { WebhookDeliveryModel } from './webhook-delivery.model';
export { BulkImportModel } from './bulk-import.model';
export { SourcedContactModel } from './sourced-contact.model';
export { SourcingSearchModel } from './sourcing-search.model';
export { SourcingListModel } from './sourcing-list.model';
export { SourcingListMemberModel } from './sourcing-list-member.model';
export { SourcingCampaignModel } from './sourcing-campaign.model';
export { SourcingCampaignRecipientModel } from './sourcing-campaign-recipient.model';
export { SourcingSuppressionModel } from './sourcing-suppression.model';
export { OutreachDailyUsageModel } from './outreach-daily-usage.model';
// Later: JobAnalytics (precomputed) ...
