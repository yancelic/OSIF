import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { fonts, springs } from './theme';

const PAPER = '#F2ECE1';
const BRICK = '#B2412A';
const INK = '#1C1917';

const FONT_SIZE = 40;

const COLLAPSE_DELAY = 800;
const COLLAPSE_DURATION = 700;
const EXIT_DELAY = 1800;
const EXIT_DURATION = 400;

interface Props {
  onAnimationComplete: () => void;
}

/** Baş harf: kiremit, kalın, display (serif) */
const Initial: React.FC<{ ch: string }> = ({ ch }) => <Text style={styles.initial}>{ch}</Text>;

/**
 * Daralan ara segment. Metin ölçülür (absolute, genişliği wrapper'ı etkilemez),
 * sonra wrapper genişliği ölçülen değerden 0'a çöker.
 */
const Collapsing: React.FC<{
  text: string;
  progress: SharedValue<number>; // 0 = açık, 1 = kapalı
}> = ({ text, progress }) => {
  // Tahmini başlangıç genişliği; onTextLayout gerçek değeri verince güncellenir.
  const width = useSharedValue(text.length * FONT_SIZE * 0.5);
  const style = useAnimatedStyle(() => ({
    width: width.value * (1 - progress.value),
    opacity: Math.max(0, 1 - progress.value * 1.4),
  }));

  return (
    <Animated.View style={[styles.segment, style]}>
      <Text
        numberOfLines={1}
        style={styles.rest}
        onTextLayout={(e) => {
          const w = e.nativeEvent.lines[0]?.width;
          if (w) width.value = Math.ceil(w) + 1;
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
};

/** Kelime boşluğu: ara harflerle birlikte sıfıra çöker */
const Gap: React.FC<{ progress: SharedValue<number> }> = ({ progress }) => {
  const style = useAnimatedStyle(() => ({ width: FONT_SIZE * 0.3 * (1 - progress.value) }));
  return <Animated.View style={style} />;
};

export const OSIFSplash: React.FC<Props> = ({ onAnimationComplete }) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);

  const lock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  useEffect(() => {
    // Daralma: harfler birbirine doğru çöker
    progress.value = withDelay(
      COLLAPSE_DELAY,
      withTiming(1, { duration: COLLAPSE_DURATION, easing: Easing.bezier(0.65, 0, 0.35, 1) }, (finished) => {
        if (finished) {
          runOnJS(lock)();
          // Mekanik kilitlenme: yaylı geri tepme
          scale.value = withSpring(1.04, springs.stamp);
        }
      }),
    );
    // Çıkış: nefes (1.04 -> 0.98) + perde erimesi
    scale.value = withDelay(EXIT_DELAY, withTiming(0.98, { duration: EXIT_DURATION, easing: Easing.out(Easing.quad) }));
    fade.value = withDelay(
      EXIT_DELAY,
      withTiming(0, { duration: EXIT_DURATION, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onAnimationComplete)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const wordStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="auto">
      <Animated.View style={[styles.row, wordStyle]}>
        <Initial ch="O" />
        <Collapsing text="h" progress={progress} />
        <Gap progress={progress} />
        <Initial ch="S" />
        <Collapsing text="hit" progress={progress} />
        <Gap progress={progress} />
        <Initial ch="I" />
        <Gap progress={progress} />
        <Initial ch="F" />
        <Collapsing text="orgot" progress={progress} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  segment: { overflow: 'hidden', height: FONT_SIZE * 1.3 },
  initial: {
    fontFamily: fonts.serif,
    fontSize: FONT_SIZE,
    fontWeight: '800',
    lineHeight: FONT_SIZE * 1.3,
    color: BRICK,
    letterSpacing: -0.5,
  },
  rest: {
    fontFamily: fonts.serif,
    fontSize: FONT_SIZE,
    fontWeight: '400',
    color: INK,
    letterSpacing: -0.5,
    position: 'absolute', left: 0, top: 0, width: 400, lineHeight: FONT_SIZE * 1.3,
  },
});






