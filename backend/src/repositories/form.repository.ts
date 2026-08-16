import { ApplicationFormModel, type ApplicationFormDoc } from '../models/application-form.model';

export const formRepository = {
  findByJob: (jobId: string) => ApplicationFormModel.findOne({ jobId }),
  create: (data: Record<string, any>) => ApplicationFormModel.create(data),
  setQuestions: (jobId: string, questions: unknown[]) =>
    ApplicationFormModel.findOneAndUpdate({ jobId }, { questions }, { new: true }),
};
