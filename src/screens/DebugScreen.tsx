import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { PressableScale } from '../ui/PressableScale';
import { formatDateInput } from '../ui/labels';
import { fonts, getThemeColors, hairlineWidth, space, type } from '../ui/theme';

export const DebugScreen: React.FC = () => {
  const {
    currentSystemDate,
    isMockActive,
    setMockDate,
    resetMockDate,
    shiftDate,
    contacts,
    resetDatabase,
    seedDatabase,
    triggerTestNotifications,
    pendingNotifications,
    refreshPendingNotifications,
    cancelNotification,
    clearAllNotifications,
    lastTriggeredAlert,
    dbError,
    themeMode,
  } = useApp();

  const colors = getThemeColors(themeMode);
  const [dateInput, setDateInput] = useState(currentSystemDate);
  const [showPayloads, setShowPayloads] = useState(false);

  const applyDate = () => {
    if (dateInput.trim()) setMockDate(dateInput.trim());
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Geliştirici</Text>
        <Text style={[type.display, { marginTop: space.sm, color: colors.ink }]}>Test{'\n'}merkezi</Text>
        {dbError ? <Text style={[type.meta, { color: colors.accent, marginTop: space.sm }]}>{dbError}</Text> : null}

        {/* 1. Zaman yolculuğu */}
        <Section title="Zaman yolculuğu" colors={colors}>
          <Text style={[styles.value, { color: colors.ink }]}>{currentSystemDate}</Text>
          <Text style={[type.meta, { color: colors.inkMuted }]}>{isMockActive ? 'Simüle edilen tarih aktif' : 'Gerçek tarih'}</Text>

          <TextInput
            value={dateInput}
            onChangeText={(text) =>
              setDateInput(formatDateInput(text, { order: 'YMD', separator: '-', label: '', placeholder: '2026-11-15' }))
            }
            placeholder="2026-11-15"
            placeholderTextColor={colors.inkFaint}
            selectionColor={colors.accent}
            keyboardType="numeric"
            maxLength={10}
            style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
          />
          <Action label="Bu tarihi uygula" onPress={applyDate} colors={colors} />
          <Action
            label="15 Kasım 2026'ya git"
            onPress={() => {
              setDateInput('2026-11-15');
              setMockDate('2026-11-15');
            }}
            colors={colors}
          />
          <View style={styles.chipRow}>
            <Inline label="+1 gün" onPress={() => shiftDate(1)} colors={colors} />
            <Inline label="+7 gün" onPress={() => shiftDate(7)} colors={colors} />
            <Inline label="+30 gün" onPress={() => shiftDate(30)} colors={colors} />
          </View>
          <Action
            label="Gerçek bugüne dön"
            onPress={() => {
              resetMockDate();
            }}
            colors={colors}
          />
        </Section>

        {/* 2. Bildirim testi */}
        <Section title="Bildirim testi" colors={colors}>
          <Text style={[type.meta, { marginBottom: space.sm, color: colors.inkMuted, fontSize: 12 }]}>
            Expo Go (SDK 53+) bildirim modülünü kısıtladığı için testler güvenli simülasyon ve haptic titreşim ile çalışır. Gerçek sistem banner'ları Development Build gerektirir.
          </Text>
          <Action label="Tümünü 5 saniye sonraya kur" onPress={() => triggerTestNotifications(5)} colors={colors} />
          <Action label="Tümünü 2 saniye sonraya kur" onPress={() => triggerTestNotifications(2)} colors={colors} />
          <Text style={[type.meta, { marginTop: space.md, color: colors.inkMuted }]}>{lastTriggeredAlert || 'Henüz bir test tetiklenmedi.'}</Text>
        </Section>

        {/* 3. Veritabanı */}
        <Section title="Veritabanı (SQLite)" colors={colors}>
          <Text style={[styles.value, { color: colors.ink }]}>{contacts.length}</Text>
          <Text style={[type.meta, { color: colors.inkMuted }]}>kayıtlı kişi</Text>
          <Action label="Örnek veriyi yükle" onPress={() => seedDatabase()} colors={colors} />
          <Action label="Tüm verileri sil" danger onPress={() => resetDatabase()} colors={colors} />
        </Section>

        {/* 4. Kuyruk */}
        <Section title="Bildirim kuyruğu" colors={colors}>
          <Text style={[styles.value, { color: colors.ink }]}>{pendingNotifications.length}</Text>
          <Text style={[type.meta, { color: colors.inkMuted }]}>kuyrukta</Text>
          <Action label="Listeyi yenile" onPress={() => refreshPendingNotifications()} colors={colors} />
          <Action label="Bekleyenlerin hepsini iptal et" danger onPress={() => clearAllNotifications()} colors={colors} />

          {pendingNotifications.length > 0 && (
            <Action
              label={showPayloads ? 'Teknik JSON verilerini gizle' : 'Teknik JSON verilerini göster'}
              onPress={() => setShowPayloads(!showPayloads)}
              colors={colors}
            />
          )}

          {pendingNotifications.length === 0 ? (
            <Text style={[styles.empty, { color: colors.inkFaint }]}>Planlanmış bildirim yok.</Text>
          ) : (
            pendingNotifications.map((item) => {
              const isPending = item.status === 'pending';
              const dateObj = new Date(item.scheduledTime);
              const timeDisplay = isNaN(dateObj.getTime())
                ? item.scheduledTime
                : dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <View key={item.id} style={[styles.notif, { borderBottomColor: colors.hairline }]}>
                  <Text style={[styles.notifTitle, { color: colors.ink }]}>{item.title}</Text>
                  <View style={styles.notifBadgeRow}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isPending ? colors.bone : '#E0E7FF' },
                      ]}
                    >
                      <Text style={[type.meta, { fontSize: 11, color: colors.ink }]}>
                        {isPending ? 'Bekliyor' : 'Tetiklendi'}
                      </Text>
                    </View>
                    <Text style={[type.meta, { color: colors.inkMuted, fontSize: 12 }]}>
                      {timeDisplay}
                    </Text>
                  </View>
                  <Text style={[type.meta, { marginTop: 6, color: colors.ink, fontSize: 13, lineHeight: 18 }]}>
                    {item.body}
                  </Text>
                  {showPayloads && (
                    <Text style={[styles.mono, { color: colors.inkMuted }]}>
                      {JSON.stringify(item.payload, null, 2)}
                    </Text>
                  )}
                  {isPending && (
                    <Inline label="Bu bildirimi iptal et" onPress={() => cancelNotification(item.id)} colors={colors} />
                  )}
                </View>
              );
            })
          )}
        </Section>
        <View style={{ height: space.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode; colors: any }> = ({ title, children, colors }) => (
  <View style={{ marginTop: space.xl }}>
    <View style={[styles.sectionHead, { borderBottomColor: colors.hairline }]}>
      <Text style={[type.eyebrow, { color: colors.inkMuted }]}>{title}</Text>
    </View>
    {children}
  </View>
);

const Action: React.FC<{ label: string; onPress: () => void; danger?: boolean; colors: any }> = ({ label, onPress, danger, colors }) => (
  <PressableScale onPress={onPress} scaleTo={0.985} hapticProfile={danger ? 'medium' : 'light'} style={[styles.action, { borderBottomColor: colors.hairline }]} accessibilityRole="button">
    <Text style={[styles.actionText, { color: danger ? colors.accent : colors.ink }]}>{label}</Text>
    <Feather name="arrow-right" size={16} color={danger ? colors.accent : colors.inkMuted} />
  </PressableScale>
);

const Inline: React.FC<{ label: string; onPress: () => void; colors: any }> = ({ label, onPress, colors }) => (
  <PressableScale onPress={onPress} scaleTo={0.92} hapticProfile="light" hitSlop={8} style={styles.inline}>
    <Text style={[styles.inlineText, { color: colors.ink }]}>{label}</Text>
  </PressableScale>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl },
  sectionHead: { paddingBottom: space.sm, borderBottomWidth: hairlineWidth },
  value: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, marginTop: space.md },
  input: {
    fontFamily: fonts.serif,
    fontSize: 20,
    marginTop: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
  },
  actionText: { fontFamily: fonts.sans, fontSize: 15 },
  chipRow: { flexDirection: 'row', paddingVertical: space.md, gap: space.lg },
  inline: { paddingVertical: 4 },
  inlineText: { fontFamily: fonts.sans, fontSize: 14, textDecorationLine: 'underline' },
  empty: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 15, paddingVertical: space.md },
  notif: { paddingVertical: space.md, borderBottomWidth: hairlineWidth },
  notifTitle: { fontFamily: fonts.serif, fontSize: 18, marginBottom: 2 },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
    marginVertical: space.sm,
  },
  notifBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
  },
});
