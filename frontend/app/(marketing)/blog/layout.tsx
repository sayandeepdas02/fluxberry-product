/**
 * The marketing header floats (fixed 26px from the top, 61px tall), so blog
 * pages reserve its 87px and let their own top padding add the breathing room.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <div className="pt-[87px]">{children}</div>;
}
