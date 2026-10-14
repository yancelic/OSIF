import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { GiftStatusSwitch } from './GiftStatusSwitch';
import { fonts, getThemeColors, hairlineWidth, space, type } from './theme';
import { GiftStatus } from '../types/index';
import { useApp } from '../context/AppContext';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export const formatEventDate = (iso: string): string => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m || 1) - 1]}`;
};

interface Props {
  name: string;
  eventDate: string;
  tier: string;
  daysRemaining: number;
  giftStatus: GiftStatus;
  onOpen: () => void;
  onCycleStatus: () => void;
}

/** Kartsız satır: büyük serif sayaç, isim, hairline alt ayraç, sağda mekanik anahtar. */
export const ContactRow: React.FC<Props> = ({
  name,
  eventDate,
  tier,
  daysRemaining,
  giftStatus,
  onOpen,
  onCycleStatus,
}) => {
  const { themeMode } = useApp();
  const colors = getThemeColors(themeMode);

  const imminent = daysRemaining <= 7;
  const today = daysRemaining === 0;

  return (
    <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
      <PressableScale onPress={onOpen} scaleTo={0.985} hapticProfile="light" style={styles.main} accessibilityRole="button">
        <View style={styles.counter}>
          {today ? (
            <Text style={[styles.today, { color: colors.accent }]}>Bugün</Text>
          ) : (
            <>
              <Text style={[type.numeral, { color: colors.ink }, imminent && { color: colors.accent }]}>{daysRemaining}</Text>
              <Text style={[styles.unit, { color: colors.inkFaint }]}>gün</Text>
            </>
          )}
        </View>
        <View style={styles.body}>
          <Text style={[type.title, { color: colors.ink }]} numberOfLines={1}>{name}</Text>
          <Text style={[type.meta, { marginTop: 2, color: colors.inkMuted }]}>
            {formatEventDate(eventDate)}
            <Text style={{ color: colors.inkFaint }}>{'   ·   '}</Text>
            {tier}
          </Text>
        </View>
      </PressableScale>
      <GiftStatusSwitch status={giftStatus} onCycle={onCycleStatus} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.lg,
    borderBottomWidth: hairlineWidth,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: space.md },
  counter: { width: 72, justifyContent: 'center' },
  unit: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 2 },
  today: { fontFamily: fonts.serif, fontSize: 20, fontStyle: 'italic' },
  body: { flex: 1 },
});
