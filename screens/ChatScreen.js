import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { API_BASE, useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { setActiveChat, playIncomingSound } from '../notifications';
import { tr } from '../i18n';

import { imageUrl } from '../imageUrl';
function IconBack() {
  const COLORS = useTheme();
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={COLORS.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function IconSend() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="#0a0d12">
      <Path d="M3 20l18-8L3 4v6l12 2-12 2z" />
    </Svg>
  );
}

// Stav pod menom v hlavičke (ako WhatsApp): "píše…", "online", alebo kedy bol naposledy.
function presenceText(lastActiveAt) {
  if (!lastActiveAt) return '';
  const d = new Date(lastActiveAt);
  const diff = Date.now() - d.getTime();
  if (diff < 5 * 60 * 1000) return 'online';
  const time = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return tr('naposledy_dnes_v_x', [time]);
  if (d.toDateString() === yesterday.toDateString()) return tr('naposledy_vcera_v_x', [time]);
  return tr('naposledy_x', [d.toLocaleDateString('cs-CZ')]);
}

// Tri poskakujúce bodky v bubline — druhá strana práve píše.
function TypingBubble({ styles }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 150 + 200)
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={styles.bubbleRow}>
      <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
        {dots.map((v, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
          />
        ))}
      </View>
    </View>
  );
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

// Konkrétna konverzácia — natívna verzia webovej stránky /messages/[userId].
// Zatiaľ len text (appka neposiela fotky, to je zatiaľ len na webe).
export default function ChatScreen({ route, navigation }) {
  const COLORS = useTheme();
  const styles = createStyles(COLORS);
  const { userId, name, avatar } = route.params;
  const { token, user: me } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pendingInfo, setPendingInfo] = useState({});
  const listRef = useRef(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState(null);
  const knownIds = useRef(null); // id správ z posledného načítania — na zvuk pri novej prijatej
  const lastTypingPing = useRef(0);
  const stopTypingTimer = useRef(null);

  function load(showSpinner) {
    if (showSpinner) setLoading(true);
    fetch(`${API_BASE}/api/mobile/messages/thread?userId=${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const list = data.messages || [];
        if (knownIds.current) {
          const incomingNew = list.some((m) => m.senderId !== me?.id && !knownIds.current.has(m.id));
          if (incomingNew) {
            playIncomingSound();
            setOtherTyping(false);
          }
        }
        knownIds.current = new Set(list.map((m) => m.id));
        if (data.other?.lastActiveAt) setLastActiveAt(data.other.lastActiveAt);
        setMessages(list);
        setPendingInfo({ isPendingForMe: data.isPendingForMe, isPendingWaiting: data.isPendingWaiting, isDeclined: data.isDeclined });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Vlákno sa načíta pri otvorení a potom LEN keď sa zmení "verzia"
  // konverzácie (hlási ju kontrola "píše…" nižšie) — nie naslepo každé 4 s.
  // Poistka: raz za 30 s aj tak.
  const lastVersion = useRef(null);
  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // Tento chat je otvorený → notifikácie od tejto osoby len zvukom, bez bannera.
  useEffect(() => {
    const onFocus = navigation.addListener('focus', () => setActiveChat(userId));
    const onBlur = navigation.addListener('blur', () => setActiveChat(null));
    setActiveChat(userId);
    return () => {
      onFocus();
      onBlur();
      setActiveChat(null);
      sendTyping(false);
    };
  }, [userId]);

  // "Píše…" druhej strany — kontrola každé 2 s
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const res = await fetch(`${API_BASE}/api/mobile/messages/typing?userId=${userId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!alive) return;
        setOtherTyping(!!data.typing);
        if (data.lastActiveAt) setLastActiveAt(data.lastActiveAt);
        if (data.version) {
          if (lastVersion.current !== null && lastVersion.current !== data.version) load(false);
          lastVersion.current = data.version;
        }
      } catch {
        /* skúsi znova */
      }
    }
    check();
    const id = setInterval(check, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId]);

  useEffect(() => {
    if (otherTyping) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [otherTyping]);

  function sendTyping(typing) {
    fetch(`${API_BASE}/api/mobile/messages/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, typing })
    }).catch(() => {});
  }

  // Ja píšem → druhá strana to uvidí. Ping najviac raz za 2,5 s, po 4 s ticha koniec.
  function onChangeText(value) {
    setText(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingPing.current > 2500) {
      lastTypingPing.current = now;
      sendTyping(true);
    }
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      lastTypingPing.current = 0;
      sendTyping(false);
    }, 4000);
  }

  async function sendMessage() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/mobile/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: userId, body })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || tr('zpravu_se_nepodarilo_odeslat'));
        return;
      }
      setText('');
      if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
      lastTypingPing.current = 0;
      load(false);
    } catch {
      setErrorMsg(tr('zpravu_se_nepodarilo_odeslat'));
    } finally {
      setSending(false);
    }
  }

  async function respond(action) {
    await fetch(`${API_BASE}/api/mobile/messages/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ otherId: userId, action })
    });
    load(false);
  }

  const canType = !pendingInfo.isDeclined && !pendingInfo.isPendingWaiting;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerTappable} onPress={() => navigation.navigate('UserProfile', { userId })}>
          <View style={styles.headerAvatarBox}>
            {avatar ? <Image source={{ uri: imageUrl(avatar) }} style={styles.headerAvatarImage} /> : <Text style={styles.headerAvatarLetter}>{name?.[0]?.toUpperCase()}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
            {otherTyping ? (
              <Text style={[styles.headerSub, styles.headerSubTyping]}>{tr('pise')}</Text>
            ) : presenceText(lastActiveAt) ? (
              <Text style={[styles.headerSub, presenceText(lastActiveAt) === 'online' && styles.headerSubOnline]} numberOfLines={1}>
                {presenceText(lastActiveAt)}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={otherTyping ? <TypingBubble styles={styles} /> : null}
          renderItem={({ item }) => {
            const isMine = item.senderId === me?.id;
            return (
              <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {item.body ? (
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
                  ) : (
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine, { fontStyle: 'italic' }]}>{tr('fotka_zobrazit_lze_zatim_jen_na_webu')}</Text>
                  )}
                  <View style={styles.bubbleFooter}>
                    <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(item.createdAt)}</Text>
                    {isMine && (
                      <Text style={[styles.readTicks, item.read ? styles.readTicksRead : styles.readTicksUnread]}>✓✓</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {pendingInfo.isPendingForMe && (
        <View style={styles.consentBar}>
          <Text style={styles.consentText}>{name}{tr('ti_chce_napsat_chces_prijmout_konverzaci')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.consentButtonAccept} onPress={() => respond('accept')}>
              <Text style={styles.consentButtonAcceptText}>{tr('prijmout')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.consentButtonDecline} onPress={() => respond('decline')}>
              <Text style={styles.consentButtonDeclineText}>{tr('odmitnout')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {pendingInfo.isPendingWaiting && (
        <View style={styles.consentBar}>
          <Text style={styles.consentText}>{tr('ceka_se_az')}{name}{tr('potvrdi_konverzaci')}</Text>
        </View>
      )}
      {pendingInfo.isDeclined && (
        <View style={styles.consentBar}>
          <Text style={styles.consentText}>{tr('tato_osoba_odmitla_komunikovat')}</Text>
        </View>
      )}

      {canType && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={onChangeText}
              placeholder={tr('napis_zpravu')}
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sending || !text.trim()}>
              {sending ? <ActivityIndicator size="small" color="#0a0d12" /> : <IconSend />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function createStyles(COLORS) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTappable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  headerAvatarImage: { width: '100%', height: '100%' },
  headerAvatarLetter: { color: COLORS.accent, fontWeight: '800' },
  headerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 1 },
  headerSubOnline: { color: '#22c55e', fontWeight: '600' },
  headerSubTyping: { color: COLORS.accent, fontWeight: '700', fontStyle: 'italic' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 13, marginTop: 10 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.textMuted },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleTheirs: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: COLORS.accent, borderBottomRightRadius: 4 },
  bubbleText: { color: COLORS.text, fontSize: 14.5, lineHeight: 19 },
  bubbleTextMine: { color: '#0a0d12' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  bubbleTime: { color: COLORS.textMuted, fontSize: 10 },
  readTicks: { fontSize: 11, fontWeight: '700' },
  readTicksUnread: { color: 'rgba(10,13,18,0.5)' },
  readTicksRead: { color: '#0a0d12' },
  bubbleTimeMine: { color: 'rgba(10,13,18,0.6)' },
  consentBar: { padding: 14, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10 },
  consentText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  consentButtonAccept: { flex: 1, backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  consentButtonAcceptText: { color: '#0a0d12', fontWeight: '700' },
  consentButtonDecline: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  consentButtonDeclineText: { color: COLORS.textMuted, fontWeight: '700' },
  errorText: { color: '#ff6b6b', fontSize: 12.5, textAlign: 'center', paddingTop: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14.5,
    maxHeight: 100
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
}
