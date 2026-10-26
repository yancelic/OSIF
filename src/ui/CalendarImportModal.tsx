import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { PriorityTier } from '../types';
import {
  ImportedBirthdayCandidate,
  getConsolidatedBirthdayCandidates,
  requestImportPermissions,
} from '../services/calendarImportService';
import { PressableScale } from './PressableScale';
import { haptic } from './haptics';
import { fonts, getThemeColors, hairlineWidth, space, type } from './theme';
import { TIER_OPTIONS } from './labels';

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onImportSuccess?: (count: number) => void;
}

export const CalendarImportModal: React.FC<Props> = ({ visible, onClose, onImportSuccess }) => {
  const { contacts, importCalendarContacts, themeMode, language } = useApp();
  const colors = getThemeColors(themeMode);

  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [candidates, setCandidates] = useState<ImportedBirthdayCandidate[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const loadCandidates = async () => {
    setLoading(true);
    setPermissionDenied(false);

    try {
      const perms = await requestImportPermissions();
      if (!perms.calendarGranted && !perms.contactsGranted) {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      const found = await getConsolidatedBirthdayCandidates(contacts);
      setCandidates(found);
    } catch (err) {
      console.warn('[CalendarImportModal] Adaylar yüklenirken hata:', err);
      Alert.alert(
        language === 'en' ? 'Scanning Error' : 'Tarama Hatası',
        language === 'en'
          ? 'An error occurred while scanning calendar or contacts.'
          : 'Takvim veya rehber taranırken bir sorun oluştu.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadCandidates();
    } else {
      setCandidates([]);
      setPermissionDenied(false);
    }
  }, [visible]);

  const selectedCount = candidates.filter((c) => c.selected).length;

  const toggleCandidate = (id: string) => {
    haptic('selection');
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const setCandidateTier = (id: string, tier: PriorityTier) => {
    haptic('light');
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selectedPriorityTier: tier } : c))
    );
  };

  const toggleSelectAll = () => {
    haptic('selection');
    const allSelected = candidates.every((c) => c.selected);
    setCandidates((prev) => prev.map((c) => ({ ...c, selected: !allSelected })));
  };

  const handleImport = async () => {
    const toImport = candidates.filter((c) => c.selected);
    if (toImport.length === 0) {
      haptic('medium');
      Alert.alert(
        language === 'en' ? 'No Selection' : 'Seçim Yapılmadı',
        language === 'en'
          ? 'Please select at least one contact to import.'
          : 'Lütfen içe aktarmak için en az bir kişi seçin.'
      );
      return;
    }

    setIsImporting(true);
    try {
      const result = await importCalendarContacts(toImport);
      haptic('success');
      onClose();

      const totalEffect = result.insertedCount + result.updatedCount;
      if (onImportSuccess) {
        onImportSuccess(totalEffect);
      }

      Alert.alert(
        language === 'en' ? 'Import Successful' : 'İçe Aktarma Tamamlandı',
        language === 'en'
          ? `${result.insertedCount} new contacts added, ${result.updatedCount} existing contacts updated.`
          : `${result.insertedCount} yeni kişi eklendi, ${result.updatedCount} kayıtlı kişi güncellendi.`
      );
    } catch (e) {
      haptic('medium');
      Alert.alert(
        language === 'en' ? 'Import Failed' : 'İçe Aktarılamadı',
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
        <View style={styles.header}>
          <View>
            <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
              {language === 'en' ? 'Calendar & Contacts' : 'Takvim & Rehber'}
            </Text>
            <Text style={[type.display, { marginTop: 4, color: colors.ink, fontSize: 26 }]}>
              {language === 'en' ? 'Import Birthdays' : 'Doğum Günlerini Aktar'}
            </Text>
          </View>
          <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
            <Feather name="x" size={22} color={colors.ink} />
          </PressableScale>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.statusText, { color: colors.inkMuted, marginTop: space.md }]}>
              {language === 'en'
                ? 'Scanning calendar and contacts…'
                : 'Cihaz takvimi ve rehber taranıyor…'}
            </Text>
          </View>
        ) : permissionDenied ? (
          <View style={[styles.centered, { paddingHorizontal: space.xl }]}>
            <Feather name="lock" size={36} color={colors.accent} />
            <Text style={[type.title, { color: colors.ink, marginTop: space.md, textAlign: 'center' }]}>
              {language === 'en' ? 'Permissions Required' : 'İzin Gerekli'}
            </Text>
            <Text style={[type.meta, { color: colors.inkMuted, textAlign: 'center', marginTop: space.xs }]}>
              {language === 'en'
                ? 'To import birthdays automatically, please grant calendar or contacts permission.'
                : 'Doğum günlerini otomatik aktarmak için takvim veya rehber erişim izni vermelisiniz.'}
            </Text>
            <PressableScale
              onPress={loadCandidates}
              style={[styles.primaryBtn, { backgroundColor: colors.ink, marginTop: space.lg }]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.canvas }]}>
                {language === 'en' ? 'Grant Permission' : 'İzinleri Ver'}
              </Text>
            </PressableScale>
          </View>
        ) : candidates.length === 0 ? (
          <View style={[styles.centered, { paddingHorizontal: space.xl }]}>
            <Feather name="calendar" size={36} color={colors.inkFaint} />
            <Text style={[type.title, { color: colors.ink, marginTop: space.md, textAlign: 'center' }]}>
              {language === 'en' ? 'No Birthdays Found' : 'Doğum Günü Bulunamadı'}
            </Text>
            <Text style={[type.meta, { color: colors.inkMuted, textAlign: 'center', marginTop: space.xs }]}>
              {language === 'en'
                ? 'No birthdays were found in your device calendar or contacts.'
                : 'Cihazınızdaki takvimlerde veya rehberinizde kayıtlı doğum günü bulunamadı.'}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Ara Araç Çubuğu: Seçim durumu & Tümünü seç */}
            <View style={[styles.toolBar, { borderBottomColor: colors.hairline }]}>
              <Text style={[type.meta, { color: colors.inkMuted }]}>
                {candidates.length} {language === 'en' ? 'found' : 'kişi bulundu'}  ·  {selectedCount}{' '}
                {language === 'en' ? 'selected' : 'seçildi'}
              </Text>
              <PressableScale onPress={toggleSelectAll} hitSlop={8}>
                <Text style={[styles.selectAllText, { color: colors.accent }]}>
                  {candidates.every((c) => c.selected)
                    ? (language === 'en' ? 'Deselect All' : 'Seçimi Kaldır')
                    : (language === 'en' ? 'Select All' : 'Tümünü Seç')}
                </Text>
              </PressableScale>
            </View>

            {/* Aday Listesi */}
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {candidates.map((item) => {
                const monthName = MONTH_NAMES_TR[item.birthMonth - 1] || `${item.birthMonth}. ay`;
                const dateDisplay = `${item.birthDay} ${monthName}${item.birthYear ? ` ${item.birthYear}` : ''}`;
                const sourceDisplay =
                  item.source === 'both'
                    ? (language === 'en' ? 'Calendar & Contacts' : 'Takvim & Rehber')
                    : item.source === 'contacts'
                    ? (language === 'en' ? 'Contacts' : 'Rehber')
                    : (language === 'en' ? 'Calendar' : 'Takvim');

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.candidateCard,
                      {
                        backgroundColor: item.selected ? colors.bone : 'transparent',
                        borderColor: item.selected ? colors.accent : colors.hairline,
                      },
                    ]}
                  >
                    <PressableScale
                      onPress={() => toggleCandidate(item.id)}
                      style={styles.cardHeaderRow}
                    >
                      <Feather
                        name={item.selected ? 'check-square' : 'square'}
                        size={20}
                        color={item.selected ? colors.accent : colors.inkFaint}
                      />
                      <View style={{ flex: 1, marginLeft: space.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.candidateName, { color: colors.ink }]}>{item.name}</Text>
                          {item.isAlreadyInDb && (
                            <View style={[styles.alreadyBadge, { borderColor: colors.inkMuted }]}>
                              <Text style={[styles.alreadyBadgeText, { color: colors.inkMuted }]}>
                                {language === 'en' ? 'In App' : 'Kayıtlı'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[type.meta, { fontSize: 12, color: colors.inkMuted, marginTop: 2 }]}>
                          {dateDisplay}  ·  {sourceDisplay}
                        </Text>
                      </View>
                    </PressableScale>

                    {/* Öncelik Kademesi Seçimi (Satır İçi) */}
                    {item.selected && (
                      <View style={[styles.tierRow, { borderTopColor: colors.hairline }]}>
                        <Text style={[styles.tierRowLabel, { color: colors.inkMuted }]}>
                          {language === 'en' ? 'Tier:' : 'Kademe:'}
                        </Text>
                        <View style={styles.tierPills}>
                          {TIER_OPTIONS.map((t) => {
                            const isTierSelected = item.selectedPriorityTier === t.value;
                            return (
                              <PressableScale
                                key={t.value}
                                onPress={() => setCandidateTier(item.id, t.value)}
                                style={[
                                  styles.tierPill,
                                  {
                                    backgroundColor: isTierSelected ? colors.ink : 'transparent',
                                    borderColor: isTierSelected ? colors.ink : colors.hairline,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.tierPillText,
                                    { color: isTierSelected ? colors.canvas : colors.inkMuted },
                                  ]}
                                >
                                  {t.label}
                                </Text>
                              </PressableScale>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Alt İşlem Çubuğu */}
            <View style={[styles.footer, { borderTopColor: colors.hairline, backgroundColor: colors.canvas }]}>
              <PressableScale
                onPress={handleImport}
                disabled={isImporting || selectedCount === 0}
                style={[
                  styles.importBtn,
                  { backgroundColor: colors.ink },
                  (isImporting || selectedCount === 0) && { opacity: 0.5 },
                ]}
              >
                <Feather name="download" size={16} color={colors.canvas} />
                <Text style={[styles.importBtnText, { color: colors.canvas }]}>
                  {isImporting
                    ? (language === 'en' ? 'Importing…' : 'Aktarılıyor…')
                    : language === 'en'
                    ? `Import Selected (${selectedCount})`
                    : `Seçilenleri İçe Aktar (${selectedCount})`}
                </Text>
              </PressableScale>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  toolBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: hairlineWidth,
  },
  selectAllText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  candidateCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: space.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  candidateName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
  alreadyBadge: {
    borderWidth: hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  alreadyBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: hairlineWidth,
  },
  tierRowLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tierPills: {
    flexDirection: 'row',
    gap: 6,
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: hairlineWidth,
  },
  tierPillText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: hairlineWidth,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 14,
    borderRadius: 6,
  },
  importBtnText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  primaryBtn: {
    paddingHorizontal: space.xl,
    paddingVertical: 12,
    borderRadius: 4,
  },
  primaryBtnText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
});
