/**
 * The lockdown assessment has no global chrome (PRD §15): no nav, no way out
 * except submitting. The root layout renders <NavBar> above {children}, so this
 * nested layout cannot remove it — instead it covers the viewport, which is the
 * behaviour that matters once the page is fullscreen anyway.
 */
export default function AssessmentTakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-paper overflow-auto">{children}</div>
  );
}
