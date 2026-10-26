import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { PressableScale } from '../ui/PressableScale';
import { haptic } from '../ui/haptics';
import { fonts, getThemeColors, hairlineWidth, space, type } from '../ui/theme';
import { GIFT_STATUS_LABEL } from '../ui/labels';
import { pinOSIFWidget } from '../widgets/widgetTaskHandler';
import { t } from '../utils/i18n';
import { CalendarImportModal } from '../ui/CalendarImportModal';
import { CulturalCatalogModal } from '../ui/CulturalCatalogModal';

const MONTH_NAMES = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export const SettingsScreen: React.FC = () => {
  const {
    contacts,
    themeMode,
    setThemeMode,
    exportDataJSON,
    importDataJSON,
    language,
    setLanguage,
    isDevMode,
    toggleDevMode,
  } = useApp();
  const colors = getThemeColors(themeMode);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isAddingWidget, setIsAddingWidget] = useState(false);

  const tapCountRef = React.useRef(0);
  const lastTapTimeRef = React.useRef(0);

  const handleDevTrigger = async () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current > 2500) {
      tapCountRef.current = 0;
    }
    lastTapTimeRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      const next = await toggleDevMode();
      haptic('success');
      Alert.alert(
        next
          ? (language === 'en' ? 'Developer Mode Enabled' : 'Geliştirici Modu Açıldı')
          : (language === 'en' ? 'Developer Mode Disabled' : 'Geliştirici Modu Gizlendi'),
        next
          ? (language === 'en'
              ? 'The "Developer" tab is now visible in the navigation bar.'
              : 'Geliştirici sekmesi alt menüde görünür hale getirildi.')
          : (language === 'en'
              ? 'The "Developer" tab is now hidden.'
              : 'Geliştirici sekmesi alt menüden gizlendi.')
      );
    } else if (tapCountRef.current >= 2) {
      haptic('selection');
    }
  };

  const handleAddWidget = async () => {
    if (isAddingWidget) return;
    setIsAddingWidget(true);
    haptic('medium');
    try {
      const pinned = await pinOSIFWidget();
      if (pinned) {
        Alert.alert(
          language === 'en' ? 'Widget Request Sent' : 'Widget İsteği Gönderildi',
          language === 'en'
            ? 'The system prompt to add the widget has been triggered on your home screen.'
            : 'Ana ekrana widget ekleme sistemi açıldı. Onaylayarak widget’ı yerleştirebilirsiniz.'
        );
      } else {
        Alert.alert(
          language === 'en' ? 'Widget Support' : 'Widget Desteği',
          language === 'en'
            ? 'Your launcher does not support direct widget pinning. You can add the OSIF widget directly by long-pressing your device home screen and selecting Widgets.'
            : 'Başlatıcınız doğrudan butonla eklemeyi desteklemiyor olabilir. Telefon ana ekranına basılı tutup Widget menüsünden OSIF widget’ını seçerek de ekleyebilirsiniz.'
        );
      }
    } catch {
      Alert.alert(
        language === 'en' ? 'Widget' : 'Widget Bilgisi',
        language === 'en'
          ? 'Widget can be added via the home screen widget menu on your Android device.'
          : 'Telefon ana ekranına basılı tutup Widget menüsünden OSIF Hızlı Bakış widget’ını ekleyebilirsiniz.'
      );
    } finally {
      setIsAddingWidget(false);
    }
  };

  // 12 aylık dağılım
  const monthDistribution = useMemo(() => {
    const counts = new Array(12).fill(0);
    contacts.forEach((c) => {
      if (c.birth_month >= 1 && c.birth_month <= 12) {
        counts[c.birth_month - 1] += 1;
      }
    });
    const max = Math.max(...counts, 1);
    return counts.map((count, index) => ({
      name: MONTH_NAMES[index],
      count,
      ratio: count / max,
    }));
  }, [contacts]);

  // Burç dağılımı
  const zodiacDistribution = useMemo(() => {
    const map = new Map<string, { symbol: string; count: number }>();
    contacts.forEach((c) => {
      if (c.zodiac_sign) {
        const existing = map.get(c.zodiac_sign.name);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(c.zodiac_sign.name, { symbol: c.zodiac_sign.symbol, count: 1 });
        }
      }
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [contacts]);

  // Hızlı Bakış Widget Önizlemesi için en yakın 2 kişi
  const upcomingForWidget = useMemo(() => {
    return contacts
      .slice()
      .sort((a, b) => (a.days_until_next_birthday ?? 999) - (b.days_until_next_birthday ?? 999))
      .slice(0, 2);
  }, [contacts]);

  // JSON Dışa Aktarma (Paylaşım)
  const handleExport = async () => {
    try {
      haptic('light');
      const jsonStr = await exportDataJSON();
      await Share.share({
        title: 'OSIF Veri Yedeği (JSON)',
        message: jsonStr,
      });
    } catch (e) {
      haptic('medium');
      Alert.alert('Dışa aktarılamadı', e instanceof Error ? e.message : String(e));
    }
  };

  // JSON İçe Aktarma
  const handleImport = async () => {
    if (!importJsonText.trim()) {
      haptic('medium');
      Alert.alert('Eksik Veri', 'Lütfen geçerli bir JSON yedek metni yapıştırın.');
      return;
    }
    try {
      haptic('selection');
      const result = await importDataJSON(importJsonText.trim());
      haptic('success');
      setImportStatus(`${result.contactsCount} kişi başarıyla içe aktarıldı/güncellendi.`);
      setImportJsonText('');
      setTimeout(() => {
        setImportModalVisible(false);
        setImportStatus(null);
      }, 1500);
    } catch (e) {
      haptic('medium');
      Alert.alert('İçe Aktarma Hatası', e instanceof Error ? e.message : 'Geçersiz JSON formatı.');
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Yapılandırma</Text>
        <PressableScale
          onLongPress={async () => {
            const next = await toggleDevMode();
            haptic('success');
            Alert.alert(
              next
                ? (language === 'en' ? 'Developer Mode Enabled' : 'Geliştirici Modu Açıldı')
                : (language === 'en' ? 'Developer Mode Disabled' : 'Geliştirici Modu Gizlendi'),
              next
                ? (language === 'en'
                    ? 'The "Developer" tab is now visible in the navigation bar.'
                    : 'Geliştirici sekmesi alt menüde görünür hale getirildi.')
                : (language === 'en'
                    ? 'The "Developer" tab is now hidden.'
                    : 'Geliştirici sekmesi alt menüden gizlendi.')
            );
          }}
          delayLongPress={800}
          hapticProfile="light"
        >
          <Text style={[type.display, { marginTop: space.sm, color: colors.ink }]}>Ayarlar</Text>
        </PressableScale>

        {/* 1. Tema & Görünüm */}
        <View style={styles.section}>
          <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Görünüm & Tema</Text>
          <View style={[styles.themeRow, { marginTop: space.md }]}>
            <PressableScale
              onPress={() => {
                haptic('selection');
                setThemeMode('light');
              }}
              style={[
                styles.themeCard,
                {
                  backgroundColor: '#F2ECE1',
                  borderColor: themeMode === 'light' ? colors.accent : colors.hairline,
                },
              ]}
            >
              <Text style={[styles.themeCardTitle, { color: '#1E1B17' }]}>Sıcak Kâğıt</Text>
              <Text style={[styles.themeCardMeta, { color: '#6E655A' }]}>Açık Gündüz</Text>
              {themeMode === 'light' && (
                <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
              )}
            </PressableScale>

            <PressableScale
              onPress={() => {
                haptic('selection');
                setThemeMode('dark');
              }}
              style={[
                styles.themeCard,
                {
                  backgroundColor: '#161412',
                  borderColor: themeMode === 'dark' ? colors.accent : colors.hairline,
                },
              ]}
            >
              <Text style={[styles.themeCardTitle, { color: '#EDE7DC' }]}>Koyu Mürekkep</Text>
              <Text style={[styles.themeCardMeta, { color: '#A09789' }]}>Gece Modu</Text>
              {themeMode === 'dark' && (
                <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
              )}
            </PressableScale>
          </View>
        </View>

        {/* 2. Dil Seçeneği */}
        <View style={[styles.section, { borderTopWidth: hairlineWidth, borderTopColor: colors.hairline }]}>
          <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
            {language === 'en' ? 'Language' : 'Dil Seçeneği'}
          </Text>
          <View style={[styles.themeRow, { marginTop: space.md }]}>
            <PressableScale
              onPress={() => {
                haptic('selection');
                setLanguage('tr');
              }}
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.bone,
                  borderColor: language === 'tr' ? colors.accent : colors.hairline,
                },
              ]}
            >
              <Text style={[styles.themeCardTitle, { color: colors.ink }]}>Türkçe</Text>
              <Text style={[styles.themeCardMeta, { color: colors.inkMuted }]}>Varsayılan</Text>
              {language === 'tr' && (
                <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
              )}
            </PressableScale>

            <PressableScale
              onPress={() => {
                haptic('selection');
                setLanguage('en');
              }}
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.bone,
                  borderColor: language === 'en' ? colors.accent : colors.hairline,
                },
              ]}
            >
              <Text style={[styles.themeCardTitle, { color: colors.ink }]}>English</Text>
              <Text style={[styles.themeCardMeta, { color: colors.inkMuted }]}>International</Text>
              {language === 'en' && (
                <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
              )}
            </PressableScale>
          </View>
        </View>

        {/* 3. Veri Yedekleme & Geri Yükleme */}
        <View style={[styles.section, { borderTopWidth: hairlineWidth, borderTopColor: colors.hairline }]}>
          <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Veri Yedekleme & Aktarım</Text>
          <Text style={[type.meta, { color: colors.inkMuted, marginTop: space.xs }]}>
            Cihazlar arası veri transferi ve güvenli yedekleme için JSON desteği.
          </Text>

          <PressableScale
            onPress={handleExport}
            style={[styles.actionRow, { borderBottomColor: colors.hairline }]}
          >
            <View>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Verileri Dışa Aktar (JSON)</Text>
              <Text style={[type.meta, { color: colors.inkFaint, fontSize: 12 }]}>
                Tüm kişileri, etiketleri ve geçmişi paylaşın
              </Text>
            </View>
            <Feather name="share" size={18} color={colors.ink} />
          </PressableScale>

          <PressableScale
            onPress={() => setImportModalVisible(true)}
            style={[styles.actionRow, { borderBottomColor: colors.hairline }]}
          >
            <View>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Verileri İçe Aktar (Geri Yükle)</Text>
              <Text style={[type.meta, { color: colors.inkFaint, fontSize: 12 }]}>
                Daha önce alınan JSON yedeğini yükleyin
              </Text>
            </View>
            <Feather name="download" size={18} color={colors.ink} />
          </PressableScale>

          <PressableScale
            onPress={() => setCalendarModalVisible(true)}
            style={[styles.actionRow, { borderBottomColor: colors.hairline }]}
          >
            <View>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Takvim & Rehberden İçe Aktar</Text>
              <Text style={[type.meta, { color: colors.inkFaint, fontSize: 12 }]}>
                Cihaz takvimindeki ve rehberdeki doğum günlerini tara
              </Text>
            </View>
            <Feather name="calendar" size={18} color={colors.accent} />
          </PressableScale>

          <PressableScale
            onPress={() => setCatalogModalVisible(true)}
            style={[styles.actionRow, { borderBottomColor: colors.hairline }]}
          >
            <View>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Kültürel Özel Günler Kataloğu</Text>
              <Text style={[type.meta, { color: colors.inkFaint, fontSize: 12 }]}>
                Anneler Günü, Babalar Günü, Sevgililer Günü, Yılbaşı şablonları
              </Text>
            </View>
            <Feather name="gift" size={18} color={colors.accent} />
          </PressableScale>
        </View>

        {/* 3. Yıllık Doğum Günü Dağılım Matrisi */}
        <View style={[styles.section, { borderTopWidth: hairlineWidth, borderTopColor: colors.hairline }]}>
          <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Yıllık Doğum Günü Dağılımı</Text>
          <Text style={[type.meta, { color: colors.inkMuted, marginTop: space.xs, marginBottom: space.md }]}>
            Aylara göre kayıtlı kişi yoğunluğu
          </Text>

          <View style={styles.histogram}>
            {monthDistribution.map((m) => (
              <View key={m.name} style={styles.histCol}>
                <View style={styles.histTrack}>
                  <View
                    style={[
                      styles.histBar,
                      {
                        height: `${Math.max(12, m.ratio * 100)}%`,
                        backgroundColor: m.count > 0 ? colors.ink : colors.hairline,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.histLabel, { color: colors.inkFaint }]}>{m.name}</Text>
                <Text style={[styles.histCount, { color: m.count > 0 ? colors.accent : colors.inkFaint }]}>
                  {m.count}
                </Text>
              </View>
            ))}
          </View>

          {/* Burç Dağılımı */}
          {zodiacDistribution.length > 0 && (
            <View style={{ marginTop: space.xl }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Burç Dağılımı</Text>
              <View style={styles.zodiacGrid}>
                {zodiacDistribution.map((z) => (
                  <View key={z.name} style={[styles.zodiacItem, { backgroundColor: colors.bone }]}>
                    <Text style={[styles.zodiacSymbol, { color: colors.accent }]}>{z.symbol}</Text>
                    <Text style={[styles.zodiacName, { color: colors.ink }]}>{z.name}</Text>
                    <Text style={[styles.zodiacCount, { color: colors.inkMuted }]}>{z.count} kişi</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 4. Ana Ekran Widget Rehberi & Canlı Önizleme */}
        <View style={[styles.section, { borderTopWidth: hairlineWidth, borderTopColor: colors.hairline }]}>
          <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Ana Ekran Widget'ı</Text>

          {/* Mini Canlı Widget Önizleme Kartı */}
          <View style={[styles.widgetCard, { backgroundColor: colors.bone, borderColor: colors.hairline }]}>
            <View style={styles.widgetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="calendar" size={14} color={colors.accent} />
                <Text style={[styles.widgetHeaderTitle, { color: colors.ink }]}>OSIF Hızlı Bakış</Text>
              </View>
              <Text style={[type.meta, { fontSize: 11, color: colors.inkMuted }]}>Önizleme</Text>
            </View>

            {upcomingForWidget.length === 0 ? (
              <View style={{ paddingVertical: space.md, alignItems: 'center' }}>
                <Text style={[type.meta, { color: colors.inkMuted }]}>Henüz yaklaşan bir özel gün yok.</Text>
              </View>
            ) : (
              upcomingForWidget.map((c, idx) => {
                const days = c.days_until_next_birthday ?? 0;
                const daysText = days === 0 ? 'Bugün!' : `${days} gün`;
                const statusLabel = GIFT_STATUS_LABEL[c.gift_status] || c.gift_status;
                const isReady = c.gift_status === 'ready';

                return (
                  <View
                    key={c.id}
                    style={[
                      styles.widgetRow,
                      idx < upcomingForWidget.length - 1 && { borderBottomWidth: hairlineWidth, borderBottomColor: colors.hairline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.widgetContactName, { color: colors.ink }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={[type.meta, { fontSize: 11, color: colors.inkMuted }]}>
                        {c.upcoming_age ? `${c.upcoming_age}. yaş  ·  ` : ''}{statusLabel}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.widgetBadge,
                        { backgroundColor: days === 0 ? colors.accent : isReady ? '#E0F2FE' : colors.canvas },
                      ]}
                    >
                      <Text
                        style={[
                          styles.widgetBadgeText,
                          { color: days === 0 ? '#FFF' : isReady ? '#0369A1' : colors.ink },
                        ]}
                      >
                        {daysText}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Widget Ekle Butonu */}
          <PressableScale
            onPress={handleAddWidget}
            hapticProfile="medium"
            scaleTo={0.97}
            style={[styles.addWidgetBtn, { backgroundColor: colors.ink }]}
          >
            <Feather name="plus-circle" size={16} color={colors.canvas} />
            <Text style={[styles.addWidgetBtnText, { color: colors.canvas }]}>
              {language === 'en' ? 'Add Widget to Home Screen' : 'Ana Ekrana Widget Ekle'}
            </Text>
          </PressableScale>

          {/* Açıklama & Durum Bilgilendirmesi */}
          <View style={[styles.widgetInfoBox, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}>
            <Feather name="info" size={16} color={colors.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.widgetInfoTitle, { color: colors.ink }]}>
                {language === 'en' ? 'Home Screen Widget Guide' : 'Ana Ekran Widget Rehberi'}
              </Text>
              <Text style={[type.meta, { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 4 }]}>
                {language === 'en'
                  ? 'Tap the button above to add the widget directly to your home screen. You can also press and hold on an empty area of your phone screen and add "OSIF" from the Widgets menu.'
                  : 'Yukarıdaki butona basarak widget\'ı doğrudan ana ekranınıza ekleyebilirsiniz. Ayrıca telefonunuzun ana ekranında boş bir alana basılı tutup "Widget\'lar" menüsünden "OSIF Hızlı Bakış"ı seçerek de ekleyebilirsiniz.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sürüm & 5-Dokunuş Geliştirici Kısayolu */}
        <View style={styles.versionFooter}>
          <PressableScale onPress={handleDevTrigger} hitSlop={12} hapticProfile="none">
            <Text style={[styles.versionText, { color: colors.inkFaint }]}>
              OSIF v2.0.0{isDevMode ? '  ·  Dev Mode' : ''}
            </Text>
          </PressableScale>
        </View>

        <View style={{ height: space.xxl }} />
      </ScrollView>

      {/* JSON İçe Aktarma Modalı */}
      <Modal visible={importModalVisible} animationType="slide" onRequestClose={() => setImportModalVisible(false)}>
        <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
          <View style={[styles.content, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Geri Yükle</Text>
              <PressableScale onPress={() => setImportModalVisible(false)} hitSlop={12}>
                <Feather name="x" size={22} color={colors.ink} />
              </PressableScale>
            </View>

            <Text style={[type.display, { marginVertical: space.md, color: colors.ink }]}>JSON Yedeği</Text>
            <Text style={[type.meta, { color: colors.inkMuted }]}>
              Daha önce dışa aktardığınız JSON metnini buraya yapıştırarak kişileri geri yükleyebilirsiniz.
            </Text>

            <TextInput
              value={importJsonText}
              onChangeText={setImportJsonText}
              placeholder='{"version": "1.1.0", "contacts": [...] }'
              placeholderTextColor={colors.inkFaint}
              multiline
              autoCapitalize="none"
              style={[
                styles.jsonTextInput,
                {
                  color: colors.ink,
                  backgroundColor: colors.bone,
                  borderColor: colors.hairline,
                },
              ]}
            />

            {importStatus && (
              <Text style={[type.body, { color: colors.accent, marginVertical: space.sm }]}>{importStatus}</Text>
            )}

            <PressableScale
              onPress={handleImport}
              style={[styles.importBtn, { backgroundColor: colors.ink }]}
            >
              <Text style={[styles.importBtnText, { color: colors.canvas }]}>İçe Aktar ve Birleştir</Text>
            </PressableScale>
          </View>
        </SafeAreaView>
      </Modal>

      <CalendarImportModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
      />

      <CulturalCatalogModal
        visible={catalogModalVisible}
        onClose={() => setCatalogModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl },
  section: { marginTop: space.xl, paddingTop: space.lg },
  themeRow: { flexDirection: 'row', gap: space.md },
  themeCard: {
    flex: 1,
    padding: space.md,
    borderRadius: 8,
    borderWidth: 2,
    position: 'relative',
  },
  themeCardTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '600' },
  themeCardMeta: { fontFamily: fonts.sans, fontSize: 12, marginTop: 4 },
  activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
  },
  actionTitle: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '500' },
  histogram: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: space.md,
  },
  histCol: { flex: 1, alignItems: 'center' },
  histTrack: { height: 80, width: 8, justifyContent: 'flex-end', alignItems: 'center' },
  histBar: { width: 6, borderRadius: 3 },
  histLabel: { fontFamily: fonts.sans, fontSize: 10, marginTop: 6 },
  histCount: { fontFamily: fonts.serif, fontSize: 10, marginTop: 2 },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  zodiacItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  zodiacSymbol: { fontSize: 14 },
  zodiacName: { fontFamily: fonts.sans, fontSize: 12 },
  zodiacCount: { fontFamily: fonts.sans, fontSize: 11 },
  widgetCard: {
    marginTop: space.md,
    borderRadius: 10,
    borderWidth: 1,
    padding: space.md,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
    paddingBottom: 6,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  widgetHeaderTitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  widgetContactName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
  widgetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  widgetBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
  },
  addWidgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: space.md,
  },
  addWidgetBtnText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  widgetInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: space.md,
  },
  widgetInfoTitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  jsonTextInput: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 6,
    padding: space.md,
    marginVertical: space.md,
    textAlignVertical: 'top',
  },
  importBtn: {
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnText: { fontFamily: fonts.sans, fontSize: 14, letterSpacing: 0.6, fontWeight: '600' },
  versionFooter: {
    alignItems: 'center',
    paddingVertical: space.xl,
    marginTop: space.md,
  },
  versionText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
