import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { GiftStatus } from '../types/index';
import { PressableScale } from './PressableScale';
import { fonts, getThemeColors, springs } from './theme';
import { haptic } from './haptics';
import { useApp } from '../context/AppContext';

const ORDER: GiftStatus[] = ['not_started', 'searching', 'ready'];

export const GIFT_STATUS_LABEL: Record<GiftStatus, string> = {
  not_started: 'Başlanmadı',
  searching: 'Araştırılıyor',
  ready: 'Hazır',
};

const TRACK_W = 58;
const KNOB = 22;
const PAD = 3;
const STEP = (TRACK_W - PAD * 2 - KNOB) / 2; // 3 duraklı mekanik anahtar

interface Props {
  status: GiftStatus;
  /** Durumu bir sonraki konuma döndürür (context.cycleGiftStatus) */
  onCycle: () => void;
}

/**
 * Üç duraklı mekanik anahtar: başlanmadı -> araştırılıyor -> hazır.
 * "Hazır" konumunda iz is siyahına dolar, düğme kiremit damga rengine geçer,
 * onay işareti belirir ve success haptic tetiklenir.
 */
export const GiftStatusSwitch: React.FC<Props> = ({ status, onCycle }) => {
  const { themeMode } = useApp();
  const colors = getThemeColors(themeMode);

  const index = ORDER.indexOf(status);
  const progress = useSharedValue(index);
  const stamp = useSharedValue(1);
  const mounted = useRef(false);

  useEffect(() => {
    progress.value = withSpring(index, springs.detent);
    if (mounted.current && status === 'ready') {
      stamp.value = withSequence(
        withTiming(1.18, { duration: 60 }),
        withSpring(1, springs.stamp)
      );
    }
    mounted.current = true;
  }, [index, status, progress, stamp]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1, 2],
      [colors.bone, colors.stone, colors.ink]
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * STEP }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1, 2],
      [colors.canvas, colors.canvas, colors.accent]
    ),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1.4, 2], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [1.4, 2], [0.4, 1], 'clamp') }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stamp.value }],
    color: interpolateColor(progress.value, [0, 1.6, 2], [colors.inkFaint, colors.inkMuted, colors.accent]),
  }));

  const handlePress = () => {
    const next = ORDER[(index + 1) % ORDER.length];
    haptic(next === 'ready' ? 'success' : next === 'searching' ? 'medium' : 'light');
    onCycle();
  };

  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={handlePress}
        hapticProfile="none"
        scaleTo={0.92}
        hitSlop={12}
        accessibilityRole="switch"
        accessibilityLabel={`Hediye durumu: ${GIFT_STATUS_LABEL[status]}`}
        accessibilityState={{ checked: status === 'ready' }}
      >
        <Animated.View style={[styles.track, trackStyle]}>
          <Animated.View style={[styles.knob, knobStyle]}>
            <Animated.View style={checkStyle}>
              <Feather name="check" size={13} color={colors.canvas} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </PressableScale>
      <Animated.Text style={[styles.label, labelStyle]}>{GIFT_STATUS_LABEL[status]}</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end' },
  track: {
    width: TRACK_W,
    height: KNOB + PAD * 2,
    borderRadius: (KNOB + PAD * 2) / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
  },
  label: {
    marginTop: 6,
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
