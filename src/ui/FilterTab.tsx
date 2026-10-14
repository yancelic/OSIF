import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { fonts, getThemeColors, springs } from './theme';
import { useApp } from '../context/AppContext';

interface Props {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}

/** Kutusuz filtre: sadece tipografi + yay ile açılan ince alt çizgi. */
export const FilterTab: React.FC<Props> = ({ label, count, active, onPress }) => {
  const { themeMode } = useApp();
  const colors = getThemeColors(themeMode);
  const line = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    line.value = withSpring(active ? 1 : 0, springs.press);
  }, [active, line]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: line.value }], opacity: line.value }));

  return (
    <PressableScale onPress={onPress} hapticProfile="light" scaleTo={0.94} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Text style={[styles.text, { color: colors.inkFaint }, active && { color: colors.ink }]}>
        {label}
        <Text style={[styles.count, { color: colors.inkFaint }]}>{`  ${count}`}</Text>
      </Text>
      <View style={styles.lineSlot}>
        <Animated.View style={[styles.line, { backgroundColor: colors.accent }, lineStyle]} />
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  tab: { marginRight: 24, paddingVertical: 8 },
  text: { fontFamily: fonts.sans, fontSize: 14 },
  count: { fontSize: 11 },
  lineSlot: { height: 2, marginTop: 6 },
  line: { height: 2 },
});
