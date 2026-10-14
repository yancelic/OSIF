import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { GiftStatus } from '../types/index';
import { ContactRow, formatEventDate } from '../ui/ContactRow';
import { FilterTab } from '../ui/FilterTab';
import { PressableScale } from '../ui/PressableScale';
import { TIER_LABEL } from '../ui/labels';
import { fonts, getThemeColors, hairlineWidth, space, springs, type } from '../ui/theme';

type Filter = 'all' | GiftStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'not_started', label: 'Başlanmadı' },
  { key: 'searching', label: 'Araştırılıyor' },
  { key: 'ready', label: 'Hazır' },
];

const bucketOf = (days: number): string => (days <= 7 ? 'Bu hafta' : days <= 30 ? 'Bu ay' : 'Sonrasında');

export const DashboardScreen: React.FC = () => {
  const { sortedContacts, cycleGiftStatus, navigateTo, currentSystemDate, isMockActive, dbError, themeMode } = useApp();
  const colors = getThemeColors(themeMode);

  const [filter, setFilter] = useState<Filter>('all');

  const readyCount = sortedContacts.filter((c) => c.gift_status === 'ready').length;
  const total = sortedContacts.length;

  const counts = useMemo(() => {
    const base: Record<Filter, number> = { all: total, not_started: 0, searching: 0, ready: 0 };
    sortedContacts.forEach((c) => { base[c.gift_status] += 1; });
    return base;
  }, [sortedContacts, total]);

  const sections = useMemo(() => {
    const visible = sortedContacts.filter((c) => filter === 'all' || c.gift_status === filter);
    const map = new Map<string, typeof visible>();
    visible.forEach((c) => {
      const k = bucketOf(c.days_until_next_birthday);
      map.set(k, [...(map.get(k) ?? []), c]);
    });
    return ['Bu hafta', 'Bu ay', 'Sonrasında']
      .filter((k) => map.has(k))
      .map((k) => ({ title: k, data: map.get(k)! }));
  }, [sortedContacts, filter]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(total ? readyCount / total : 0, springs.detent);
  }, [total, readyCount, progress]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, progress.value)) * 100}%` }));

  const Header = (
    <View>
      <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
        {formatEventDate(currentSystemDate)} {currentSystemDate.slice(0, 4)}
        {isMockActive ? '  ·  Simüle' : ''}
      </Text>
      <Text style={[type.display, { marginTop: space.sm, color: colors.ink }]}>Yaklaşan{'\n'}doğum günleri</Text>
      {dbError ? <Text style={[type.meta, { color: colors.accent, marginTop: space.sm }]}>{dbError}</Text> : null}

      <View style={styles.summary}>
        <Text style={[type.meta, { color: colors.inkMuted }]}>
          <Text style={[styles.summaryNum, { color: colors.ink }]}>{readyCount}</Text> / {total} hediye hazır
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.bone }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: colors.ink }, progressStyle]} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingRight: space.lg }}>
        {FILTERS.map((f) => (
          <FilterTab key={f.key} label={f.label} count={counts[f.key]} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>
      <View style={[styles.rule, { backgroundColor: colors.hairline }]} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={Header}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled={true}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <ContactRow
            name={item.name}
            eventDate={item.next_birthday_date}
            tier={TIER_LABEL[item.priority_tier]}
            daysRemaining={item.days_until_next_birthday}
            giftStatus={item.gift_status}
            onOpen={() => navigateTo('contact_detail', item.id)}
            onCycleStatus={() => cycleGiftStatus(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[type.title, { color: colors.ink }]}>{total === 0 ? 'Henüz kimse yok.' : 'Bu durumda kimse yok.'}</Text>
            <Text style={[type.meta, { marginTop: space.sm, color: colors.inkMuted }]}>
              {total === 0 ? 'Kişiler sekmesinden yeni kişi ekleyebilirsiniz.' : 'Başka bir filtre seçin.'}
            </Text>
            {total === 0 && (
              <PressableScale
                onPress={() => navigateTo('contact_detail')}
                style={[styles.emptyBtn, { backgroundColor: colors.ink, marginTop: space.lg }]}
                hapticProfile="light"
              >
                <Feather name="arrow-right" size={16} color={colors.canvas} />
                <Text style={[styles.emptyBtnText, { color: colors.canvas }]}>Kişilere git</Text>
              </PressableScale>
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl },
  summary: { marginTop: space.lg },
  summaryNum: { fontFamily: fonts.serif, fontSize: 18 },
  progressTrack: { height: 2, marginTop: space.sm },
  progressFill: { height: 2 },
  filters: { marginTop: space.xl, flexGrow: 0 },
  rule: { height: hairlineWidth },
  sectionLabel: { ...type.eyebrow, marginTop: space.xl, marginBottom: -space.sm },
  empty: { paddingTop: space.xxl },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  emptyBtnText: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.4 },
});
