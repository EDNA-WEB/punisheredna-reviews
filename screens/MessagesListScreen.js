import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { API_BASE, useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { tr } from '../i18n';

import { imageUrl } from '../imageUrl';
function IconSearch({ color }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3" />
    </Svg>
  );
}
function IconPen({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}

function IconBack() {
  const COLORS = useTheme();
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={COLORS.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return tr('prave_ted');
  if (minutes < 60) return tr('x_min', [minutes]);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return tr('x_dny', [days]);
}

// Zoznam konverzácií — natívna verzia webovej stránky /messages. Text
// posledná správy prichádza už dešifrovaný z backendu.
export default function MessagesListScreen({ navigation }) {
  const COLORS = useTheme();
  const styles = createStyles(COLORS);
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  // Nová zpráva — vyhľadávanie používateľov podľa začiatku prezývky.
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);
  const searchSeq = useRef(0);

  function onSearch(value) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = value.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    // Krátke oneskorenie — nehľadá sa pri každom písmene zvlášť (šetrí databázu).
    searchTimer.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const res = await fetch(`${API_BASE}/api/mobile/users-search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (seq === searchSeq.current) setResults(data.users || []);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 280);
  }

  function openChat(user) {
    Keyboard.dismiss();
    setQuery('');
    setResults([]);
    navigation.navigate('Chat', { userId: user.id, name: user.name, avatar: user.avatar });
  }

  const [loading, setLoading] = useState(true);

  function load() {
    fetch(`${API_BASE}/api/mobile/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr('zpravy')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBox}>
        <IconSearch color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onSearch}
          placeholder={tr('nova_zprava_hledat_uzivatele')}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => onSearch('')} hitSlop={10}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 4 }}
          ListEmptyComponent={
            <View style={styles.searchEmpty}>
              {searching ? <ActivityIndicator color={COLORS.accent} /> : <Text style={styles.emptyText}>{tr('nikdo_s_takovou_prezdivkou_nenalezen')}</Text>}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => openChat(item)}>
              <View style={styles.avatarBox}>
                {item.avatar ? (
                  <Image source={{ uri: imageUrl(item.avatar) }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarLetter}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  <Text style={{ color: COLORS.accent }}>{item.name.slice(0, query.trim().length)}</Text>
                  {item.name.slice(query.trim().length)}
                </Text>
                {item.role === 'ADMIN' && <Text style={styles.lastText}>{tr('redakce')}</Text>}
              </View>
              <View style={styles.writePill}>
                <IconPen color={COLORS.accent} />
                <Text style={styles.writePillText}>{tr('napsat')}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ padding: 16, gap: 4 }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>{tr('zatim_zadne_zpravy')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Chat', { userId: item.userId, name: item.name, avatar: item.avatar })}
            >
              <View style={styles.avatarBox}>
                {item.avatar ? (
                  <Image source={{ uri: imageUrl(item.avatar) }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarLetter}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.isTyping ? (
                  <Text style={styles.typingText} numberOfLines={1}>{tr('pise')}</Text>
                ) : (
                  <Text style={[styles.lastText, item.unread > 0 && styles.lastTextUnread]} numberOfLines={1}>{item.lastText}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.time}>{timeAgo(item.lastAt)}</Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(COLORS) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  typingText: { color: COLORS.accent, fontSize: 12.5, fontStyle: 'italic', fontWeight: '700', marginTop: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14.5, paddingVertical: 0 },
  searchClear: { color: COLORS.textMuted, fontSize: 15, fontWeight: '700', paddingHorizontal: 4 },
  searchEmpty: { paddingVertical: 30, alignItems: 'center' },
  writePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  writePillText: { color: COLORS.accent, fontSize: 12.5, fontWeight: '700' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { color: COLORS.accent, fontSize: 17, fontWeight: '800' },
  name: { color: COLORS.text, fontSize: 14.5, fontWeight: '700', marginBottom: 3 },
  lastText: { color: COLORS.textMuted, fontSize: 13 },
  lastTextUnread: { color: COLORS.text, fontWeight: '650' },
  time: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
  unreadBadge: { backgroundColor: COLORS.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadBadgeText: { color: '#0a0d12', fontSize: 11, fontWeight: '800' }
});
}
