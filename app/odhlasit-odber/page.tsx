import AuthCard from '@/components/email/AuthCard';
import UnsubscribeButton from '@/components/email/UnsubscribeButton';
import { verifyUnsubscribe } from '@/lib/email/util';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Odhlásenie odberu z odkazu v pätičke e-mailu (bez prihlásenia).
export default async function UnsubscribePage(props: { searchParams: Promise<{ u?: string; t?: string; s?: string }> }) {
  const { u = '', t: topic = '', s = '' } = await props.searchParams;
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const valid = verifyUnsubscribe(u, topic, s);

  const labels: Record<string, string> = {
    news: t('unsub.news', 'Novinky z KrálFilmu'),
    online: t('unsub.online', 'Film z Chci vidět nebo Oblíbených je online'),
    messages: t('unsub.messages', 'Nová zpráva v poště'),
    all: t('unsub.all', 'Všechna e-mailová oznámení')
  };

  if (!valid) {
    return (
      <AuthCard icon="warn" title={t('unsub.neplatny', 'Neplatný odkaz')}>
        <p>{t('unsub.chyba', 'Odkaz je neplatný. Odběr můžeš vypnout v Nastavení → Oznámení.')}</p>
      </AuthCard>
    );
  }

  const query = new URLSearchParams({ u, t: topic, s }).toString();
  return (
    <AuthCard icon="mail" title={t('unsub.nadpis', 'Odhlásit odběr')}>
      <p>
        {t('unsub.text', 'Přestaneme ti posílat e-maily:')} <b className="text-white">{labels[topic]}</b>
      </p>
      <UnsubscribeButton query={query} />
    </AuthCard>
  );
}
