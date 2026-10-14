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

const MONTH_NAMES = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export const SettingsScreen: React.FC = () => {
  const { contacts, themeMode, setThemeMode, exportDataJSON, importDataJSON } = useApp();
  const colors = getThemeColors(themeMode);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

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
        <Text style={[type.display, { marginTop: space.sm, color: colors.ink }]}>Ayarlar</Text>

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

        {/* 2. Veri Yedekleme & Geri Yükleme */}
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

        {/* 4. Ana Ekran Widget Rehberi */}
        <View style={[styles.section, { borderTopWidth: hairlineWidth, borderTopColor: colors.hairline }]}>
          <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Ana Ekran Widget'ı</Text>
          <View style={[styles.widgetBox, { backgroundColor: colors.bone }]}>
            <Feather name="layout" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.widgetBoxTitle, { color: colors.ink }]}>Hızlı Bakış Widget'ı</Text>
              <Text style={[type.meta, { color: colors.inkMuted, fontSize: 13, marginTop: 2 }]}>
                OSIF verileriniz SQLite üzerinde yerel saklanır. Cihaz widget'ı kurularak yaklaşan doğum günleri ve kalan günler ana ekranda görüntülenebilir.
              </Text>
            </View>
          </View>
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
  widgetBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.md,
    borderRadius: 6,
    marginTop: space.md,
  },
  widgetBoxTitle: { fontFamily: fonts.serif, fontSize: 16 },
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
});
