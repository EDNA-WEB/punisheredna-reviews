import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { API_BASE, useAuth } from '../AuthContext';
import { loadPrefs, registerForPush, isPushReady, getActiveChat, showLocalMessageNotification } from '../notifications';

// Neviditeľná súčasť App.js: po prihlásení zaregistruje push, klik na
// notifikáciu otvorí príslušný chat, a ak push na zariadení nefunguje,
// kontroluje nové správy (kým je appka otvorená) a upozorní sama.
export default function MessageNotifier({ navigationRef }) {
  const { token } = useAuth();
  const lastSeenId = useRef(undefined);

  // Registrácia po prihlásení
  useEffect(() => {
    if (!token) return;
    loadPrefs().then(() => registerForPush(token));
  }, [token]);

  // Klik na notifikáciu → otvor chat
  useEffect(() => {
    function openFrom(response) {
      const data = response?.notification?.request?.content?.data || {};
      if (data.type !== 'message' || !data.userId) return;
      const go = () => navigationRef.navigate('Chat', { userId: data.userId, name: data.name, avatar: data.avatar });
      if (navigationRef.isReady()) go();
      else setTimeout(go, 800);
    }
    const sub = Notifications.addNotificationResponseReceivedListener(openFrom);
    Notifications.getLastNotificationResponseAsync()
      .then((r) => r && openFrom(r))
      .catch(() => {});
    return () => sub.remove();
  }, [navigationRef]);

  // Záložný režim bez push: každých 45 s (len keď je appka na popredí)
  useEffect(() => {
    if (!token) return;
    lastSeenId.current = undefined;
    async function check() {
      if (AppState.currentState !== 'active' || isPushReady()) return;
      try {
        const res = await fetch(`${API_BASE}/api/mobile/messages/unread-latest`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const latest = data.latest;
        if (lastSeenId.current === undefined) {
          lastSeenId.current = latest?.id || null; // prvé načítanie — neupozorňuj na staré
          return;
        }
        if (latest && latest.id !== lastSeenId.current) {
          lastSeenId.current = latest.id;
          // V otvorenom chate s touto osobou zvuk rieši samotný chat.
          if (getActiveChat() !== latest.sender.id) showLocalMessageNotification(latest.sender, latest.preview);
        }
      } catch {
        /* skúsi znova */
      }
    }
    check();
    const id = setInterval(check, 45000);
    return () => clearInterval(id);
  }, [token]);

  return null;
}
