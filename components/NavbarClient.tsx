'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import SignOutButton from './SignOutButton';
import SearchBar from './SearchBar';
import Logo from './Logo';
import NotificationsBell from './NotificationsBell';
import MessagesDropdown from './MessagesDropdown';
import WatchlistDropdown from './WatchlistDropdown';
import { useT } from './TranslationProvider';
import LanguageSwitcher from './LanguageSwitcher';
import AccountMenu from './AccountMenu';
import AvatarMenu from './AvatarMenu';
import { IconUser } from './Icons';

export default function NavbarClient({
  role,
  userName,
  userId,
  userAvatar,
  isLoggedIn,
  unreadMessages
}: {
  role: string | null;
  userName: string | null;
  userId: string | null;
  userAvatar: string | null;
  isLoggedIn: boolean;
  unreadMessages: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const t = useT();
  const secondaryLinks = [
    { href: '/novinky', label: t('nav.novinky') },
    { href: '/kino', label: t('nav.kino') },
    { href: '/recenzie?types=Film', label: t('nav.filmy') },
    { href: '/recenzie?types=Seriál', label: t('nav.serialy') },
    { href: '/rebricky', label: t('nav.rebricky') },
    { href: '/zanre', label: t('nav.zanre') },
    { href: '/box-office', label: t('nav.box_office') },
    { href: '/pouzivatelia', label: t('nav.pouzivatelia') },
    { href: '/diskusie', label: t('nav.diskusie') }
  ];

  function isActive(href: string) {
    const [hrefPath, hrefQuery] = href.split('?');
    if (hrefPath === '/') return pathname === '/';
    if (!pathname.startsWith(hrefPath)) return false;
    if (!hrefQuery) return true;
    const hrefParams = new URLSearchParams(hrefQuery);
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }

  return (
    <>
      <div className="sticky top-0 z-30">
        <div className="max-w-6xl mx-auto bg-card border-b border-line">
          <div className="px-5 sm:px-6 py-3.5 flex items-center gap-3 sm:gap-4 justify-between">
            <button
              onClick={() => setOpen(true)}
              aria-label="Otvoriť menu"
              className="w-9 h-9 flex flex-col justify-center gap-[5px] sm:hidden flex-none"
            >
              <span className="block h-[2px] w-6 bg-ink" />
              <span className="block h-[2px] w-6 bg-ink" />
            </button>

            <Link href="/" className="flex items-center flex-none">
              <Logo className="h-20 w-auto -my-2" />
            </Link>

            <div className="hidden sm:block flex-1 max-w-xl">
              <SearchBar />
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 flex-none">
              {isLoggedIn ? (
                <>
                  <MessagesDropdown unreadTotal={unreadMessages} />
                  <NotificationsBell />
                  <WatchlistDropdown />
                  <div className="ml-1">
                    <AvatarMenu userId={userId!} userName={userName} userAvatar={userAvatar} />
                  </div>
                </>
              ) : (
                <>
                  <LanguageSwitcher />
                  <AccountMenu />
                </>
              )}
            </div>
          </div>

          <div className="sm:hidden px-5 pb-3">
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="hidden sm:block sticky top-[65px] z-20">
        <div className="max-w-6xl mx-auto bg-card border-b border-line">
          <div className="px-5 sm:px-6 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 overflow-x-auto">
              {secondaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`text-[13px] font-semibold px-3 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
                    isActive(l.href) ? 'text-accent border-accent' : 'text-ink border-transparent hover:text-accent hover:border-line'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
          </div>
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              className="flex-none text-[12px] font-semibold px-3 py-1.5 rounded-full bg-night text-white hover:bg-night/85 transition-colors my-1.5"
            >
              {t('nav.administracia')}
            </Link>
          )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-[#15171A] text-white flex flex-col">
          <div className="flex justify-end p-5">
            <button onClick={() => setOpen(false)} aria-label="Zavrieť menu" className="text-3xl leading-none">×</button>
          </div>
          <nav className="flex flex-col px-8 gap-1 overflow-y-auto">
            {secondaryLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3.5 border-b border-white/10 text-lg font-display font-semibold">
                {l.label}
              </Link>
            ))}
            {role === 'ADMIN' && (
              <Link href="/admin" onClick={() => setOpen(false)} className="py-3.5 border-b border-white/10 text-lg font-display font-semibold text-accent">
                {t('nav.administracia')}
              </Link>
            )}
            {isLoggedIn ? (
              <>
                <Link href="/messages" onClick={() => setOpen(false)} className="py-3.5 border-b border-white/10 text-lg font-display font-semibold flex items-center justify-between mt-4">
                  {t('panel.posta')}
                  {unreadMessages > 0 && (
                    <span className="w-6 h-6 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link href={`/profile/${userId}`} onClick={() => setOpen(false)} className="py-3.5 border-b border-white/10 text-lg font-display font-semibold flex items-center gap-3">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName || ''} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <IconUser className="w-4 h-4" />
                    </span>
                  )}
                  {t('panel.moj_profil')}
                </Link>
                <SignOutButton
                  className="py-3.5 border-b border-white/10 text-lg font-display font-semibold text-left text-white w-full block"
                  label={t('panel.odhlasit')}
                />
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="py-3.5 border-b border-white/10 text-lg font-display font-semibold mt-4">
                  {t('auth.prihlasit')}
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="py-3.5 border-b border-white/10 text-lg font-display font-semibold text-accent">
                  {t('auth.registracia')}
                </Link>
                <Link href="/zabudnute-heslo" onClick={() => setOpen(false)} className="py-3.5 border-b border-white/10 text-sm text-white/60">
                  {t('auth.zabudnute_heslo')}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
