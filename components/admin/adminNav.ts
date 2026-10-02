// Navigácia administrácie — sekcie zoskupené podľa účelu (ako v profesionálnych
// administráciách). editor: true = vidí aj redaktor (ostatné len admin).
export type AdminNavItem = { href: string; label: string; icon: string; editor?: boolean; exact?: boolean };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'Přehled',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'home', exact: true },
      { href: '/admin/prehlad', label: 'Stav obsahu', icon: 'check' },
      { href: '/admin/analytics', label: 'Analytika', icon: 'chart' },
      { href: '/admin/vykon', label: 'Výkon databáze', icon: 'bolt' }
    ]
  },
  {
    label: 'Obsah',
    items: [
      { href: '/admin/movies', label: 'Filmy a seriály', icon: 'film' },
      { href: '/admin/people', label: 'Osobnosti', icon: 'user' },
      { href: '/admin/reviews', label: 'Recenze', icon: 'star' },
      { href: '/admin/news', label: 'Novinky', icon: 'news', editor: true },
      { href: '/admin/sdileni', label: 'Sdílení článků', icon: 'link' },
      { href: '/admin/trailers', label: 'Trailery', icon: 'play' }
    ]
  },
  {
    label: 'Profil filmu',
    items: [
      { href: '/admin/premieres', label: 'Premiéry', icon: 'calendar' },
      { href: '/admin/tagy', label: 'Tagy', icon: 'tag' },
      { href: '/admin/online', label: 'Online', icon: 'tv' },
      { href: '/admin/kde-sledovat', label: 'Kde sledovat', icon: 'stream' },
      { href: '/admin/odkazy', label: 'Odkazy', icon: 'link' },
      { href: '/admin/lokalizacia', label: 'Dabing a titulky', icon: 'globe' },
      { href: '/admin/zaujimavosti', label: 'Zajímavosti', icon: 'bulb' }
    ]
  },
  {
    label: 'Komunita',
    items: [
      { href: '/admin/users', label: 'Uživatelé', icon: 'users' },
      { href: '/admin/navrhy-obsahu', label: 'Návrhy obsahu', icon: 'inbox' },
      { href: '/admin/nahlasenia', label: 'Nahlášení', icon: 'flag' },
      { href: '/admin/upozornenia', label: 'Upozornění', icon: 'bell' },
      { href: '/admin/clenstvo', label: 'Členství', icon: 'ticket' }
    ]
  },
  {
    label: 'Obchod',
    items: [
      { href: '/admin/obchod/produkty', label: 'Produkty', icon: 'bag' },
      { href: '/admin/obchod/kategorie', label: 'Kategorie', icon: 'folder' }
    ]
  },
  {
    label: 'Nastavení',
    items: [
      { href: '/admin/settings', label: 'Vzhled webu', icon: 'brush' },
      { href: '/admin/preklad', label: 'Překlad', icon: 'translate' },
      { href: '/admin/prava', label: 'Práva', icon: 'shield' },
      { href: '/admin/audit-log', label: 'Audit log', icon: 'list' },
      { href: '/admin/zadosti-organu', label: 'Žádosti orgánů', icon: 'shield' },
      { href: '/admin/system', label: 'Systém', icon: 'cog' }
    ]
  }
];

export function isNavActive(item: AdminNavItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
