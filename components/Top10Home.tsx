import { getTop10 } from '@/lib/top10';
import Top10Section from './Top10Section';

// Top 10 tento týden na hlavnej stránke — dáta si načíta sám.
export default async function Top10Home({ viewerId }: { viewerId?: string | null }) {
  const { items } = await getTop10(viewerId);
  if (!items.length) return null;
  return <Top10Section initialItems={items} />;
}
