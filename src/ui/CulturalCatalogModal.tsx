import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { PriorityTier } from '../types';
import {
  CULTURAL_EVENT_TEMPLATES,
  CulturalEventTemplate,
  getTemplateEventDate,
} from '../utils/culturalDates';
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
  onAdded?: () => void;
}

export const CulturalCatalogModal: React.FC<Props> = ({ visible, onClose, onAdded }) => {
  const { addContact, themeMode, language } = useApp();
  const colors = getThemeColors(themeMode);

  const [selectedTemplate, setSelectedTemplate] = useState<CulturalEventTemplate | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [selectedTier, setSelectedTier] = useState<PriorityTier>(1);
  const [targetBudget, setTargetBudget] = useState('');
  const [buyGift, setBuyGift] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectTemplate = (tmpl: CulturalEventTemplate) => {
    haptic('selection');
    setSelectedTemplate(tmpl);
    setRecipientName(tmpl.defaultRecipientPlaceholder);
    setSelectedTier(tmpl.category === 'family' || tmpl.category === 'romantic' ? 1 : 2);
    setTargetBudget('');
    setBuyGift(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    const finalName = recipientName.trim() || selectedTemplate.title;
    const eventDate = getTemplateEventDate(selectedTemplate);

    setIsSubmitting(true);
    try {
      const budgetNum = buyGift && targetBudget.trim() ? parseFloat(targetBudget.replace(',', '.')) : null;

      await addContact({
        name: finalName,
        birth_month: eventDate.month,
        birth_day: eventDate.day,
        birth_year: null,
        priority_tier: selectedTier,
        gift_status: 'not_started',
        event_type: 'special',
        target_budget: isNaN(budgetNum as number) ? null : budgetNum,
        spent_amount: 0,
        buy_gift: buyGift ? 1 : 0,
        notes: `${selectedTemplate.title} özel günü (${selectedTemplate.description}).`,
      });

      haptic('success');
      setSelectedTemplate(null);
      onClose();
      if (onAdded) onAdded();

      Alert.alert(
        language === 'en' ? 'Event Added' : 'Özel Gün Eklendi',
        language === 'en'
          ? `"${finalName}" has been successfully added to your list.`
          : `"${finalName}" başarıyla listenize eklendi.`
      );
    } catch (err) {
      haptic('medium');
      Alert.alert(
        language === 'en' ? 'Could Not Add' : 'Eklenemedi',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
        <View style={styles.header}>
          <View>
            <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
              {language === 'en' ? 'Catalog' : 'Katalog'}
            </Text>
            <Text style={[type.display, { marginTop: 4, color: colors.ink, fontSize: 26 }]}>
              {language === 'en' ? 'Cultural Events' : 'Özel Günler'}
            </Text>
          </View>
          <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
            <Feather name="x" size={22} color={colors.ink} />
          </PressableScale>
        </View>

        {!selectedTemplate ? (
          /* 1. Şablon Listesi */
          <ScrollView contentContainerStyle={styles.catalogList} showsVerticalScrollIndicator={false}>
            <Text style={[type.meta, { color: colors.inkMuted, marginBottom: space.sm }]}>
              {language === 'en'
                ? 'Select a special day to track gifts and reminders:'
                : 'Hediye ve bildirim takibi yapmak istediğiniz özel günü seçin:'}
            </Text>

            {CULTURAL_EVENT_TEMPLATES.map((tmpl) => {
              const eventDate = getTemplateEventDate(tmpl);
              const monthName = MONTH_NAMES_TR[eventDate.month - 1];
              const dateDisplay = `${eventDate.day} ${monthName} ${eventDate.year}`;

              return (
                <PressableScale
                  key={tmpl.key}
                  onPress={() => handleSelectTemplate(tmpl)}
                  style={[styles.templateCard, { backgroundColor: colors.bone, borderColor: colors.hairline }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.templateTitle, { color: colors.ink }]}>{tmpl.title}</Text>
                      {tmpl.isDynamic && (
                        <View style={[styles.dynamicBadge, { borderColor: colors.accent }]}>
                          <Text style={[styles.dynamicBadgeText, { color: colors.accent }]}>
                            {language === 'en' ? 'Dynamic Date' : 'Dinamik Tarih'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[type.meta, { fontSize: 12, color: colors.inkMuted, marginTop: 4 }]}>
                      {tmpl.description}  ·  <Text style={{ color: colors.ink, fontWeight: '600' }}>{dateDisplay}</Text>
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.inkFaint} />
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : (
          /* 2. Seçilen Şablonu Özelleştirme & Ekleme Ekranı */
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            <PressableScale
              onPress={() => setSelectedTemplate(null)}
              style={styles.backBtn}
              hitSlop={8}
            >
              <Feather name="arrow-left" size={16} color={colors.ink} />
              <Text style={[styles.backBtnText, { color: colors.ink }]}>
                {language === 'en' ? 'All Events' : 'Tüm Özel Günler'}
              </Text>
            </PressableScale>

            <View style={{ marginTop: space.md }}>
              <Text style={[type.eyebrow, { color: colors.accent }]}>{selectedTemplate.description}</Text>
              <Text style={[type.display, { color: colors.ink, fontSize: 24, marginTop: 4 }]}>
                {selectedTemplate.title}
              </Text>
            </View>

            {/* Tarih Özeti */}
            {(() => {
              const dt = getTemplateEventDate(selectedTemplate);
              const mName = MONTH_NAMES_TR[dt.month - 1];
              return (
                <View style={[styles.dateBadgeBox, { backgroundColor: colors.bone, borderColor: colors.hairline }]}>
                  <Feather name="calendar" size={16} color={colors.accent} />
                  <Text style={[styles.dateBadgeText, { color: colors.ink }]}>
                    {dt.day} {mName} {dt.year} {dt.isNextYear ? `(${language === 'en' ? 'Next Year' : 'Gelecek Yıl'})` : ''}
                  </Text>
                </View>
              );
            })()}

            {/* Kimin İçin? */}
            <View style={{ marginTop: space.lg }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                {language === 'en' ? 'For whom? (e.g. Mom, Dad, Darling)' : 'Kimin için? (örn. Annem, Babam, Sevgilim)'}
              </Text>
              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder={selectedTemplate.defaultRecipientPlaceholder}
                placeholderTextColor={colors.inkFaint}
                selectionColor={colors.accent}
                style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
              />
            </View>

            {/* Öncelik Kademesi */}
            <Text style={[type.eyebrow, { marginTop: space.lg, color: colors.inkMuted }]}>
              {language === 'en' ? 'Relationship Tier' : 'Yakınlık'}
            </Text>
            <View style={styles.tierRow}>
              {TIER_OPTIONS.map((t) => (
                <PressableScale
                  key={t.value}
                  onPress={() => setSelectedTier(t.value)}
                  style={styles.tierItem}
                >
                  <Text
                    style={[
                      styles.tierText,
                      { color: colors.inkFaint },
                      selectedTier === t.value && { color: colors.ink, fontFamily: fonts.serif },
                    ]}
                  >
                    {t.label}
                  </Text>
                  <View style={[styles.tierLine, selectedTier === t.value && { backgroundColor: colors.accent }]} />
                </PressableScale>
              ))}
            </View>

            {/* Hediye Takibi Aç/Kapa */}
            <PressableScale
              onPress={() => {
                haptic('selection');
                setBuyGift(!buyGift);
              }}
              style={[styles.giftToggleBox, { backgroundColor: colors.bone }]}
            >
              <View style={{ flex: 1, paddingRight: space.md }}>
                <Text style={[styles.giftToggleTitle, { color: colors.ink }]}>
                  {language === 'en' ? 'Track gift preparation?' : 'Hediye hazırlığı takip edilsin mi?'}
                </Text>
                <Text style={[type.meta, { fontSize: 12, color: colors.inkMuted, marginTop: 2 }]}>
                  {buyGift
                    ? (language === 'en' ? 'Gift status & reminders active.' : 'Hediye durumu ve hatırlatıcılar devrede.')
                    : (language === 'en' ? 'Only date reminder.' : 'Yalnızca gün hatırlatması.')}
                </Text>
              </View>
              <Feather
                name={buyGift ? 'check-square' : 'square'}
                size={22}
                color={buyGift ? colors.accent : colors.inkMuted}
              />
            </PressableScale>

            {/* Hedef Bütçe (Opsiyonel) */}
            {buyGift && (
              <View style={{ marginTop: space.lg }}>
                <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                  {language === 'en' ? 'Target Budget (Optional)' : 'Hedef Bütçe (TL - İsteğe Bağlı)'}
                </Text>
                <TextInput
                  value={targetBudget}
                  onChangeText={setTargetBudget}
                  placeholder="örn: 1000"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="numeric"
                  selectionColor={colors.accent}
                  style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                />
              </View>
            )}

            {/* Ekle Butonu */}
            <PressableScale
              onPress={handleSave}
              disabled={isSubmitting}
              style={[
                styles.saveBtn,
                { backgroundColor: colors.ink, marginTop: space.xl },
                isSubmitting && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.saveBtnText, { color: colors.canvas }]}>
                {isSubmitting
                  ? (language === 'en' ? 'Adding…' : 'Ekleniyor…')
                  : language === 'en'
                  ? 'Add to My Special Days'
                  : 'Özel Günlerime Ekle'}
              </Text>
            </PressableScale>
          </ScrollView>
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
  catalogList: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.md,
    borderRadius: 8,
    borderWidth: hairlineWidth,
  },
  templateTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
  dynamicBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: hairlineWidth,
  },
  dynamicBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
  },
  formContent: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    paddingBottom: space.xxl * 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  dateBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: 6,
    borderWidth: hairlineWidth,
    marginTop: space.md,
  },
  dateBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    fontFamily: fonts.serif,
    fontSize: 18,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
  },
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: space.sm,
  },
  tierItem: {
    marginRight: space.lg,
    paddingVertical: space.sm,
  },
  tierText: {
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  tierLine: {
    height: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  giftToggleBox: {
    padding: space.md,
    borderRadius: 8,
    marginTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  giftToggleTitle: {
    fontFamily: fonts.serif,
    fontSize: 15,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 4,
  },
  saveBtnText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
});
