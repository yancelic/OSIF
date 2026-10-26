import React, { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
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
import { EventType, PriorityTier } from '../types/index';
import { PressableScale } from './PressableScale';
import { haptic } from './haptics';
import { TIER_OPTIONS, formatDateInput, getDeviceDateConfig, parseDateInput } from './labels';
import { fonts, getThemeColors, hairlineWidth, space, type } from './theme';
import { CulturalCatalogModal } from './CulturalCatalogModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: (contactId?: string) => void;
}

const EVENT_TYPE_OPTIONS: { key: EventType; label: string }[] = [
  { key: 'birthday', label: 'Doğum Günü' },
  { key: 'anniversary', label: 'Yıldönümü' },
  { key: 'special', label: 'Özel Gün' },
];

export const AddContactModal: React.FC<Props> = ({ visible, onClose, onCreated }) => {
  const { addContact, currentSystemDate, themeMode, language } = useApp();
  const colors = getThemeColors(themeMode);

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formEventType, setFormEventType] = useState<EventType>('birthday');
  const [formTier, setFormTier] = useState<PriorityTier>(2);
  const [formBuyGift, setFormBuyGift] = useState(true);
  const [formClothing, setFormClothing] = useState('');
  const [formShoes, setFormShoes] = useState('');
  const [formTargetBudget, setFormTargetBudget] = useState('');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateConfig = useMemo(() => getDeviceDateConfig(), []);

  const handleCreate = async () => {
    if (isSubmitting) return;
    Keyboard.dismiss();

    const date = parseDateInput(formDate, dateConfig.order);
    if (!formName.trim() || !date) {
      haptic('medium');
      Alert.alert(
        language === 'en' ? 'Missing info' : 'Eksik bilgi',
        language === 'en'
          ? `Name and valid date (${dateConfig.placeholder}) required.`
          : `İsim ve geçerli bir tarih (${dateConfig.placeholder}) gerekli.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const budgetNum = formBuyGift && formTargetBudget.trim() ? parseFloat(formTargetBudget.replace(',', '.')) : null;

      await addContact({
        name: formName.trim(),
        birth_year: date.year,
        birth_month: date.month,
        birth_day: date.day,
        priority_tier: formTier,
        gift_status: 'not_started',
        clothing_size: formBuyGift ? (formClothing.trim() || null) : null,
        shoe_size: formBuyGift ? (formShoes.trim() || null) : null,
        event_type: formEventType,
        target_budget: isNaN(budgetNum as number) ? null : budgetNum,
        spent_amount: 0,
        buy_gift: formBuyGift ? 1 : 0,
      });
      haptic('success');
      setFormName('');
      setFormDate('');
      setFormClothing('');
      setFormShoes('');
      setFormTargetBudget('');
      setFormEventType('birthday');
      setFormBuyGift(true);
      onClose();
      if (onCreated) onCreated();
    } catch (e) {
      haptic('medium');
      Alert.alert(language === 'en' ? 'Could not save' : 'Kaydedilemedi', e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: space.xxl * 2 }]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalTop}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                {language === 'en' ? 'New Contact' : 'Yeni kayıt'}
              </Text>
              <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
                <Feather name="x" size={22} color={colors.ink} />
              </PressableScale>
            </View>
            <Text style={[type.display, { marginVertical: space.lg, color: colors.ink }]}>
              {language === 'en' ? 'For whom?' : 'Kimin için?'}
            </Text>

            {/* Kültürel Özel Gün Kısayolu */}
            <PressableScale
              onPress={() => {
                haptic('light');
                setIsCatalogOpen(true);
              }}
              style={[styles.catalogShortcutPill, { backgroundColor: colors.bone, borderColor: colors.hairline }]}
            >
              <Feather name="gift" size={14} color={colors.accent} />
              <Text style={[styles.catalogShortcutText, { color: colors.ink }]}>
                {language === 'en'
                  ? 'Pick from Special Days (Mother\'s Day, New Year…)'
                  : 'Özel Gün Seç (Anneler Günü, Yılbaşı…)'}
              </Text>
            </PressableScale>

            {/* İsim */}
            <View style={{ marginTop: space.lg }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                {language === 'en' ? 'Name' : 'İsim'}
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder={language === 'en' ? 'Full Name' : 'Ad Soyad'}
                placeholderTextColor={colors.inkFaint}
                selectionColor={colors.accent}
                style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink, fontSize: 26, lineHeight: 34 }]}
              />
            </View>

            {/* Tarih */}
            <View style={{ marginTop: space.lg }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>{dateConfig.label}</Text>
              <TextInput
                value={formDate}
                onChangeText={(text) => setFormDate(formatDateInput(text, dateConfig, currentSystemDate))}
                placeholder={dateConfig.placeholder}
                placeholderTextColor={colors.inkFaint}
                selectionColor={colors.accent}
                keyboardType="numeric"
                maxLength={10}
                style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
              />
            </View>

            {/* Etkinlik Türü */}
            <Text style={[type.eyebrow, { marginTop: space.lg, color: colors.inkMuted }]}>
              {language === 'en' ? 'Event Type' : 'Etkinlik Türü'}
            </Text>
            <View style={styles.tierRow}>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <PressableScale
                  key={opt.key}
                  hapticProfile="selection"
                  onPress={() => setFormEventType(opt.key)}
                  style={styles.tierItem}
                >
                  <Text style={[styles.tierText, { color: colors.inkFaint }, formEventType === opt.key && { color: colors.ink, fontFamily: fonts.serif }]}>
                    {opt.label}
                  </Text>
                  <View style={[styles.tierLine, formEventType === opt.key && { backgroundColor: colors.accent }]} />
                </PressableScale>
              ))}
            </View>

            {/* Yakınlık */}
            <Text style={[type.eyebrow, { marginTop: space.lg, color: colors.inkMuted }]}>
              {language === 'en' ? 'Relationship Tier' : 'Yakınlık'}
            </Text>
            <View style={styles.tierRow}>
              {TIER_OPTIONS.map((t) => (
                <PressableScale
                  key={t.value}
                  hapticProfile="selection"
                  scaleTo={0.94}
                  onPress={() => setFormTier(t.value)}
                  style={styles.tierItem}
                >
                  <Text style={[styles.tierText, { color: colors.inkFaint }, formTier === t.value && { color: colors.ink, fontFamily: fonts.serif }]}>
                    {t.label}
                  </Text>
                  <View style={[styles.tierLine, formTier === t.value && { backgroundColor: colors.accent }]} />
                </PressableScale>
              ))}
            </View>

            {/* Hediye Alınacak mı? Seçeneği */}
            <PressableScale
              onPress={() => {
                haptic('selection');
                setFormBuyGift(!formBuyGift);
              }}
              style={[styles.giftToggleBox, { backgroundColor: colors.bone }]}
            >
              <View style={{ flex: 1, paddingRight: space.md }}>
                <Text style={[styles.giftToggleTitle, { color: colors.ink }]}>
                  {language === 'en' ? 'Buy a gift for this person?' : 'Bu kişi için hediye alınacak mı?'}
                </Text>
                <Text style={[type.meta, { fontSize: 12, color: colors.inkMuted, marginTop: 2 }]}>
                  {formBuyGift
                    ? (language === 'en' ? 'Gift & birthday reminders will be sent.' : 'Hediye ve doğum günü hatırlatması gönderilir.')
                    : (language === 'en' ? 'Only birthday reminder will be sent.' : 'Yalnızca doğum günü hatırlatması gönderilir.')}
                </Text>
              </View>
              <Feather
                name={formBuyGift ? 'check-square' : 'square'}
                size={22}
                color={formBuyGift ? colors.accent : colors.inkMuted}
              />
            </PressableScale>

            {/* Yalnızca hediye alınacaksa Bütçe ve Bedenler görünür */}
            {formBuyGift && (
              <>
                {/* Hedef Bütçe */}
                <View style={{ marginTop: space.lg }}>
                  <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                    {language === 'en' ? 'Target Budget (Optional)' : 'Hedef Bütçe (TL - İsteğe Bağlı)'}
                  </Text>
                  <TextInput
                    value={formTargetBudget}
                    onChangeText={setFormTargetBudget}
                    placeholder="örn: 1000"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="numeric"
                    selectionColor={colors.accent}
                    style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                  />
                </View>

                {/* Beden & Ayakkabı */}
                <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.lg }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                      {language === 'en' ? 'Clothing Size' : 'Kıyafet Bedeni'}
                    </Text>
                    <TextInput
                      value={formClothing}
                      onChangeText={setFormClothing}
                      placeholder="M"
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                      {language === 'en' ? 'Shoe Size' : 'Ayakkabı Numarası'}
                    </Text>
                    <TextInput
                      value={formShoes}
                      onChangeText={setFormShoes}
                      placeholder="42"
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                    />
                  </View>
                </View>
              </>
            )}

            <PressableScale
              onPress={handleCreate}
              disabled={isSubmitting}
              hapticProfile="light"
              style={[
                styles.fab,
                { backgroundColor: colors.ink, alignSelf: 'stretch', justifyContent: 'center', marginTop: space.xl },
                isSubmitting && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.fabText, { color: colors.canvas }]}>
                {isSubmitting
                  ? (language === 'en' ? 'Saving…' : 'Kaydediliyor…')
                  : (language === 'en' ? 'Save' : 'Kaydet')}
              </Text>
            </PressableScale>
          </ScrollView>
        </KeyboardAvoidingView>

        <CulturalCatalogModal
          visible={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onAdded={() => {
            setIsCatalogOpen(false);
            onClose();
            if (onCreated) onCreated();
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catalogShortcutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: hairlineWidth,
    marginBottom: space.sm,
  },
  catalogShortcutText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
  },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
  tierItem: { marginRight: space.lg, paddingVertical: space.sm },
  tierText: { fontFamily: fonts.sans, fontSize: 15 },
  tierLine: { height: 2, marginTop: 4, backgroundColor: 'transparent' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { fontFamily: fonts.sans, fontSize: 14, letterSpacing: 0.6 },
  giftToggleBox: {
    padding: space.md,
    borderRadius: 8,
    marginTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  giftToggleTitle: { fontFamily: fonts.serif, fontSize: 15 },
});
