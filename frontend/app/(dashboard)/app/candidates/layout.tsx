import { CandidateListProvider } from './candidate-list-context';

/**
 * Adds the `@modal` parallel-route slot so navigating to a candidate from
 * this list intercepts into an overlay instead of a full-page navigation,
 * while `/app/candidates/[candidateId]` still works as a real, deep-linkable
 * route for direct visits (spec item 4.1).
 */
export default function CandidatesLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <CandidateListProvider>
      {children}
      {modal}
    </CandidateListProvider>
  );
}
