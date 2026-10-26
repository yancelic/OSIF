import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ContactDetailScreen } from './src/screens/ContactDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DebugScreen } from './src/screens/DebugScreen';
import { OSIFSplash } from './src/ui/OSIFSplash';
import { PressableScale } from './src/ui/PressableScale';
import { getThemeColors, fonts, hairlineWidth, space } from './src/ui/theme';
import { t } from './src/utils/i18n';

const SCREENS = ['dashboard', 'contact_detail', 'settings', 'debug'] as const;
const SCREEN_INDEXES: Record<string, number> = {
  dashboard: 0,
  contact_detail: 1,
  settings: 2,
  debug: 3,
};

const TabItem: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof getThemeColors>;
}> = ({ label, active, onPress, colors }) => (
  <PressableScale
    onPress={onPress}
    hitSlop={14}
    hapticProfile="light"
    scaleTo={0.94}
    style={styles.tab}
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
  >
    <Text style={[styles.tabText, { color: colors.inkFaint }, active && { color: colors.ink, fontWeight: '600' }]}>
      {label}
    </Text>
    <View style={[styles.tabLine, active && { backgroundColor: colors.accent }]} />
  </PressableScale>
);

const MainNavigator: React.FC = () => {
  const { activeScreen, navigateTo, selectContact, selectedContactId, themeMode, language, isDevMode } = useApp();
  const colors = getThemeColors(themeMode);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);

  const screens = isDevMode
    ? (['dashboard', 'contact_detail', 'settings', 'debug'] as const)
    : (['dashboard', 'contact_detail', 'settings'] as const);

  const screenIndexes: Record<string, number> = {
    dashboard: 0,
    contact_detail: 1,
    settings: 2,
    ...(isDevMode ? { debug: 3 } : {}),
  };

  // Eğer geliştirici modu kapalıysa ve aktif ekran debug ise Dashboard'a yönlendir
  useEffect(() => {
    if (!isDevMode && activeScreen === 'debug') {
      navigateTo('dashboard');
    }
  }, [isDevMode, activeScreen, navigateTo]);

  // Sekme veya kişi tıklamalarında hedefe animasyonlu kay
  useEffect(() => {
    const targetIndex = screenIndexes[activeScreen];
    if (targetIndex !== undefined && scrollRef.current && width > 0) {
      isProgrammaticScroll.current = true;
      scrollRef.current.scrollTo({ x: targetIndex * width, animated: true });
    }
  }, [activeScreen, width, isDevMode]);

  // Android Donanım Geri Tuşu: İç menüdeysek (seçili kişi) dışa dön, değilse ve ana menüde değilsek Dashboard'a dön
  useEffect(() => {
    const onBackPress = () => {
      if (selectedContactId) {
        selectContact(null);
        return true;
      }
      if (activeScreen !== 'dashboard') {
        navigateTo('dashboard');
        return true;
      }
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [selectedContactId, activeScreen, selectContact, navigateTo]);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / width);
    const target = screens[pageIndex];
    if (target && target !== activeScreen) {
      navigateTo(target);
    }
    isProgrammaticScroll.current = false;
  };

  const handleContactsTabPress = () => {
    if (activeScreen === 'contact_detail' && selectedContactId) {
      selectContact(null);
    } else {
      navigateTo('contact_detail');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={true}
        directionalLockEnabled={true}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled={!selectedContactId}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: width * screens.length }}
      >
        <View style={{ width, flex: 1 }}>
          <DashboardScreen />
        </View>
        <View style={{ width, flex: 1 }}>
          <ContactDetailScreen />
        </View>
        <View style={{ width, flex: 1 }}>
          <SettingsScreen />
        </View>
        {isDevMode && (
          <View style={{ width, flex: 1 }}>
            <DebugScreen />
          </View>
        )}
      </ScrollView>

      <SafeAreaView style={[styles.tabBar, { backgroundColor: colors.canvas, borderTopColor: colors.hairline }]} edges={['bottom', 'left', 'right']}>
        <View style={styles.tabRow}>
          <TabItem label={t('tabUpcoming', language)} active={activeScreen === 'dashboard'} onPress={() => navigateTo('dashboard')} colors={colors} />
          <TabItem label={t('tabContacts', language)} active={activeScreen === 'contact_detail'} onPress={handleContactsTabPress} colors={colors} />
          <TabItem label={t('tabSettings', language)} active={activeScreen === 'settings'} onPress={() => navigateTo('settings')} colors={colors} />
          {isDevMode && (
            <TabItem label={t('tabDeveloper', language)} active={activeScreen === 'debug'} onPress={() => navigateTo('debug')} colors={colors} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainNavigator />
        {!splashDone && (
          <View style={styles.splashLayer} pointerEvents="auto">
            <OSIFSplash onAnimationComplete={() => setSplashDone(true)} />
          </View>
        )}
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splashLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 },
  tabBar: { borderTopWidth: hairlineWidth },
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: space.sm },
  tab: { alignItems: 'center', paddingVertical: space.sm, paddingHorizontal: space.sm },
  tabText: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.4 },
  tabLine: { height: 2, width: 16, marginTop: 6, backgroundColor: 'transparent' },
});
