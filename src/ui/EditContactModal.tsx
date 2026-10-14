import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { ContactWithDetails, EventType, PriorityTier } from '../types/index';
import { PressableScale } from './PressableScale';
import { haptic } from './haptics';
import { TIER_OPTIONS, formatDateInput, getDeviceDateConfig, parseDateInput } from './labels';
import { getThemeColors, fonts, hairlineWidth, space, type } from './theme';

interface Props {
  visible: boolean;
  contact: ContactWithDetails | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const EVENT_TYPE_OPTIONS: { key: EventType; label: string }[] = [
  { key: 'birthday', label: 'Doğum Günü' },
  { key: 'anniversary', label: 'Yıldönümü' },
  { key: 'special', label: 'Özel Gün' },
];

const REMINDER_DAY_OPTIONS = [
  { days: 14, label: '14 gün önce' },
  { days: 7, label: '7 gün önce' },
  { days: 3, label: '3 gün önce' },
  { days: 1, label: '1 gün önce' },
  { days: 0, label: 'Günün kendisi' },
];

export const EditContactModal: React.FC<Props> = ({ visible, contact, onClose, onUpdated }) => {
  const { updateContactFull, themeMode } = useApp();
  const colors = getThemeColors(themeMode);

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formEventType, setFormEventType] = useState<EventType>('birthday');
  const [formTier, setFormTier] = useState<PriorityTier>(2);
  const [formClothing, setFormClothing] = useState('');
  const [formShoes, setFormShoes] = useState('');
  const [formTargetBudget, setFormTargetBudget] = useState('');
  const [formSpentAmount, setFormSpentAmount] = useState('');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [customTime, setCustomTime] = useState('09:00');
  const [useCustomReminders, setUseCustomReminders] = useState(false);

  const dateConfig = useMemo(() => getDeviceDateConfig(), []);

  useEffect(() => {
    if (contact) {
      setFormName(contact.name || '');
      // Format birth date into input format
      const y = contact.birth_year ? String(contact.birth_year) : '';
      const m = String(contact.birth_month).padStart(2, '0');
      const d = String(contact.birth_day).padStart(2, '0');
      let dateStr = '';
      if (dateConfig.order === 'DMY') {
        dateStr = y ? `${d}.${m}.${y}` : `${d}.${m}`;
      } else if (dateConfig.order === 'MDY') {
        dateStr = y ? `${m}/${d}/${y}` : `${m}/${d}`;
      } else {
        dateStr = y ? `${y}-${m}-${d}` : `${m}-${d}`;
      }
      setFormDate(dateStr);

      setFormEventType(contact.event_type || 'birthday');
      setFormTier(contact.priority_tier || 2);
      setFormClothing(contact.clothing_size || '');
      setFormShoes(contact.shoe_size || '');
      setFormTargetBudget(contact.target_budget != null ? String(contact.target_budget) : '');
      setFormSpentAmount(contact.spent_amount != null ? String(contact.spent_amount) : '');

      if (contact.custom_notification_days) {
        try {
          const parsed = JSON.parse(contact.custom_notification_days);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomDays(parsed);
            setUseCustomReminders(true);
          } else {
            setCustomDays([7, 0]);
            setUseCustomReminders(false);
          }
        } catch {
          setCustomDays([7, 0]);
          setUseCustomReminders(false);
        }
      } else {
        setCustomDays([7, 0]);
        setUseCustomReminders(false);
      }

      setCustomTime(contact.custom_notification_time || '09:00');
    }
  }, [contact, dateConfig.order]);

  const toggleDayOption = (days: number) => {
    haptic('selection');
    if (customDays.includes(days)) {
      setCustomDays(customDays.filter((d) => d !== days));
    } else {
      setCustomDays([...customDays, days].sort((a, b) => b - a));
    }
  };

  const handleSave = async () => {
    if (!contact) return;
    const date = parseDateInput(formDate, dateConfig.order);
    if (!formName.trim() || !date) {
      haptic('medium');
      Alert.alert('Eksik bilgi', `İsim ve geçerli bir tarih (${dateConfig.placeholder}) gerekli.`);
      return;
    }

    try {
      const budgetNum = formTargetBudget.trim() ? parseFloat(formTargetBudget.replace(',', '.')) : null;
      const spentNum = formSpentAmount.trim() ? parseFloat(formSpentAmount.replace(',', '.')) : null;

      await updateContactFull(contact.id, {
        name: formName.trim(),
        birth_year: date.year,
        birth_month: date.month,
        birth_day: date.day,
        event_type: formEventType,
        priority_tier: formTier,
        clothing_size: formClothing.trim() || null,
        shoe_size: formShoes.trim() || null,
        target_budget: isNaN(budgetNum as number) ? null : budgetNum,
        spent_amount: isNaN(spentNum as number) ? null : spentNum,
        custom_notification_days: useCustomReminders ? JSON.stringify(customDays) : null,
        custom_notification_time: useCustomReminders ? customTime.trim() || '09:00' : null,
      });

      haptic('success');
      onClose();
      if (onUpdated) onUpdated();
    } catch (e) {
      haptic('medium');
      Alert.alert('Güncellenemedi', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: space.xxl * 2 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            {/* Üst Bar */}
            <View style={styles.modalTop}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Kişiyi Düzenle</Text>
              <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
                <Feather name="x" size={22} color={colors.ink} />
              </PressableScale>
            </View>

            <Text style={[type.display, { marginVertical: space.md, color: colors.ink }]}>Bilgileri{'\n'}güncelle</Text>

            {/* İsim */}
            <View style={{ marginTop: space.md }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>İsim</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="Ad Soyad"
                placeholderTextColor={colors.inkFaint}
                selectionColor={colors.accent}
                style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink, fontSize: 24 }]}
              />
            </View>

            {/* Tarih */}
            <View style={{ marginTop: space.lg }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>{dateConfig.label}</Text>
              <TextInput
                value={formDate}
                onChangeText={(text) => setFormDate(formatDateInput(text, dateConfig))}
                placeholder={dateConfig.placeholder}
                placeholderTextColor={colors.inkFaint}
                selectionColor={colors.accent}
                keyboardType="numeric"
                maxLength={10}
                style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
              />
            </View>

            {/* Etkinlik Türü */}
            <Text style={[type.eyebrow, { marginTop: space.lg, color: colors.inkMuted }]}>Etkinlik Türü</Text>
            <View style={styles.tabRow}>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <PressableScale
                  key={opt.key}
                  hapticProfile="selection"
                  onPress={() => setFormEventType(opt.key)}
                  style={styles.tabItem}
                >
                  <Text style={[styles.tabText, { color: colors.inkFaint }, formEventType === opt.key && { color: colors.ink, fontFamily: fonts.serif }]}>
                    {opt.label}
                  </Text>
                  <View style={[styles.tabLine, formEventType === opt.key && { backgroundColor: colors.accent }]} />
                </PressableScale>
              ))}
            </View>

            {/* Yakınlık Derecesi */}
            <Text style={[type.eyebrow, { marginTop: space.lg, color: colors.inkMuted }]}>Yakınlık</Text>
            <View style={styles.tabRow}>
              {TIER_OPTIONS.map((t) => (
                <PressableScale
                  key={t.value}
                  hapticProfile="selection"
                  onPress={() => setFormTier(t.value)}
                  style={styles.tabItem}
                >
                  <Text style={[styles.tabText, { color: colors.inkFaint }, formTier === t.value && { color: colors.ink, fontFamily: fonts.serif }]}>
                    {t.label}
                  </Text>
                  <View style={[styles.tabLine, formTier === t.value && { backgroundColor: colors.accent }]} />
                </PressableScale>
              ))}
            </View>

            {/* Bütçe & Harcama */}
            <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Hedef Bütçe (TL)</Text>
                <TextInput
                  value={formTargetBudget}
                  onChangeText={setFormTargetBudget}
                  placeholder="örn: 1500"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="numeric"
                  selectionColor={colors.accent}
                  style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Harcanan (TL)</Text>
                <TextInput
                  value={formSpentAmount}
                  onChangeText={setFormSpentAmount}
                  placeholder="örn: 1200"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="numeric"
                  selectionColor={colors.accent}
                  style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                />
              </View>
            </View>

            {/* Özel Hatırlatma Ayarları */}
            <View style={{ marginTop: space.xl, paddingVertical: space.md, borderTopWidth: hairlineWidth, borderTopColor: colors.hairline }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Özel Bildirim Günleri</Text>
                <PressableScale
                  onPress={() => {
                    haptic('selection');
                    setUseCustomReminders(!useCustomReminders);
                  }}
                  style={styles.toggleBtn}
                >
                  <Text style={[styles.toggleText, { color: useCustomReminders ? colors.accent : colors.inkFaint }]}>
                    {useCustomReminders ? 'Özel Aktif' : 'Varsayılan Kurallar'}
                  </Text>
                </PressableScale>
              </View>

              {useCustomReminders && (
                <View style={{ marginTop: space.md }}>
                  <Text style={[type.meta, { color: colors.inkMuted, marginBottom: space.sm, fontSize: 12 }]}>
                    Bildirim almak istediğiniz günleri seçin:
                  </Text>
                  <View style={styles.chipRow}>
                    {REMINDER_DAY_OPTIONS.map((item) => {
                      const selected = customDays.includes(item.days);
                      return (
                        <PressableScale
                          key={item.days}
                          onPress={() => toggleDayOption(item.days)}
                          style={[
                            styles.chip,
                            { borderColor: selected ? colors.accent : colors.hairline, backgroundColor: selected ? colors.bone : 'transparent' },
                          ]}
                        >
                          <Text style={[styles.chipText, { color: selected ? colors.accent : colors.inkMuted }]}>
                            {item.label}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>

                  <View style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <Text style={[type.meta, { color: colors.ink }]}>Hatırlatma Saati:</Text>
                    <TextInput
                      value={customTime}
                      onChangeText={setCustomTime}
                      placeholder="09:00"
                      placeholderTextColor={colors.inkFaint}
                      maxLength={5}
                      style={[styles.timeInput, { color: colors.ink, borderBottomColor: colors.ink }]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Beden & Ayakkabı */}
            <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Beden</Text>
                <TextInput
                  value={formClothing}
                  onChangeText={setFormClothing}
                  placeholder="M"
                  placeholderTextColor={colors.inkFaint}
                  style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Ayakkabı</Text>
                <TextInput
                  value={formShoes}
                  onChangeText={setFormShoes}
                  placeholder="42"
                  placeholderTextColor={colors.inkFaint}
                  style={[styles.input, { color: colors.ink, borderBottomColor: colors.ink }]}
                />
              </View>
            </View>

            {/* Kaydet Butonu */}
            <PressableScale
              onPress={handleSave}
              hapticProfile="medium"
              style={[styles.saveBtn, { backgroundColor: colors.ink, marginTop: space.xxl }]}
            >
              <Text style={[styles.saveBtnText, { color: colors.canvas }]}>Değişiklikleri Kaydet</Text>
            </PressableScale>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
  },
  timeInput: {
    fontFamily: fonts.serif,
    fontSize: 18,
    width: 70,
    textAlign: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
  tabItem: { marginRight: space.lg, paddingVertical: space.sm },
  tabText: { fontFamily: fonts.sans, fontSize: 15 },
  tabLine: { height: 2, marginTop: 4, backgroundColor: 'transparent' },
  toggleBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  toggleText: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
  },
  chipText: { fontFamily: fonts.sans, fontSize: 12 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 4,
  },
  saveBtnText: { fontFamily: fonts.sans, fontSize: 14, letterSpacing: 0.6, fontWeight: '600' },
});
