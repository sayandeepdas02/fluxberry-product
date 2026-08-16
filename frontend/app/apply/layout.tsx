// Public candidate layout — no recruiter navigation, minimal branding (spec §77).
export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30">{children}</div>;
}
