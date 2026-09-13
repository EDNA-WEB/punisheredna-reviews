// Vzhľad konverzácie (farba bublín) je čisto lokálne nastavenie — ukladá sa len
// v prehliadači daného zariadenia (nie na server), takže druhá strana ho nevidí
// a každý si môže mať svoje bubliny nafarbené inak.
export type ChatTheme = { bubbleColor: string };

const DEFAULT_THEME: ChatTheme = { bubbleColor: '' };

function key(otherId: string) {
  return `chat_theme_${otherId}`;
}

export function getChatTheme(otherId: string): ChatTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(key(otherId));
    return raw ? { ...DEFAULT_THEME, ...JSON.parse(raw) } : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setChatTheme(otherId: string, theme: ChatTheme) {
  localStorage.setItem(key(otherId), JSON.stringify(theme));
}
