import { getAllPosts, getPost } from '@/lib/blog';
import { OG_SIZE, OGPostLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'An article on the Fluxberry blog';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getAllPosts().map(({ slug }) => ({ slug }));
}

/** Each post's share card: its category, title and byline, so a shared link reads on its own. */
export default async function OpengraphImage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPost(slug);

  return ogImage(
    <OGPostLayout
      category={post?.category ?? 'Blog'}
      title={post?.title ?? 'The Fluxberry blog'}
      byline={post ? `By ${post.author} · ${post.readingTime} min read` : 'Insights on hiring AI Talent'}
    />,
  );
}
