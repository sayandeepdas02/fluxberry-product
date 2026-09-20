/**
 * Importing this module registers every Mongoose model. Slices append their
 * models here so migrations can sync all indexes in one place.
 */
export { JobQueueModel } from './job-queue.model';
export { EventModel } from './event.model';
export { UserModel } from './user.model';
export { WorkspaceModel } from './workspace.model';
export { WorkspaceMemberModel } from './workspace-member.model';
export { AuditLogModel } from './audit-log.model';
export { JobModel } from './job.model';
export { CandidateModel } from './candidate.model';
export { ApplicationModel } from './application.model';
export { ApplicationFormModel } from './application-form.model';
export { ApplicationAnswersModel } from './application-answers.model';
export { ScreeningResultModel } from './screening-result.model';
export { QuestionModel } from './question.model';
export { AssessmentModel } from './assessment.model';
export { CandidateAssessmentModel } from './candidate-assessment.model';
export { WorkflowModel, WorkflowRunModel, WorkflowStepModel } from './workflow.model';
export { CareersPageModel } from './careers-page.model';
export { AiInterviewConfigModel } from './ai-interview-config.model';
export { InterviewModel } from './interview.model';
export { OfferModel } from './offer.model';
export { GdprRequestModel } from './gdpr-request.model';
export { WebhookEndpointModel } from './webhook-endpoint.model';
export { WebhookDeliveryModel } from './webhook-delivery.model';
export { BulkImportModel } from './bulk-import.model';
// Later: JobAnalytics (precomputed) ...
