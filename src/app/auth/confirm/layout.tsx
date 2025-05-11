/**
 * Layout component for the account confirmation related pages.
 * Provides a minimal structure, ensuring the content takes up the full screen height.
 */
export default function ConfirmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
} 