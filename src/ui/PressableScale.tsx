import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from './theme';
import { haptic, HapticProfile } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Basılı durumdaki ölçek (varsayılan 0.96) */
  scaleTo?: number;
  /** onPress anında tetiklenen haptic profili (varsayılan light) */
  hapticProfile?: HapticProfile;
}

/**
 * Mekanik düğme hissi: basıldığı anda UI thread'de ezilir,
 * bırakılınca yay ile geri tepip yerine oturur.
 */
export const PressableScale: React.FC<Props> = ({
  style,
  scaleTo = 0.96,
  hapticProfile = 'light',
  onPress,
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, springs.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, springs.press);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        haptic(hapticProfile);
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};
