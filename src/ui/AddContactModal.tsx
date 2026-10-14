import React, { useMemo, useState } from 'react';
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
import { EventType, PriorityTier } from '../types/index';
import { PressableScale } from './PressableScale';
import { haptic } from './haptics';
import { TIER_OPTIONS, formatDateInput, getDeviceDateConfig, parseDateInput } from './labels';
import { fonts, getThemeColors, space, type } from './theme';

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
  const { addContact, currentSystemDate, themeMode } = useApp();
  const colors = getThemeColors(themeMode);

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formEventType, setFormEventType] = useState<EventType>('birthday');
  const [formTier, setFormTier] = useState<PriorityTier>(2);
  const [formClothing, setFormClothing] = useState('');
  const [formShoes, setFormShoes] = useState('');
  const [formTargetBudget, setFormTargetBudget] = useState('');

  const dateConfig = useMemo(() => getDeviceDateConfig(), []);

  const handleCreate = async () => {
    const date = parseDateInput(formDate, dateConfig.order);
    if (!formName.trim() || !date) {
      haptic('medium');
      Alert.alert('Eksik bilgi', `İsim ve geçerli bir tarih (${dateConfig.placeholder}) gerekli.`);
      return;
    }
    try {
      const budgetNum = formTargetBudget.trim() ? parseFloat(formTargetBudget.replace(',', '.')) : null;

      await addContact({
        name: formName.trim(),
        birth_year: date.year,
        birth_month: date.month,
        birth_day: date.day,
        priority_tier: formTier,
        gift_status: 'not_started',
        clothing_size: formClothing.trim() || null,
        shoe_size: formShoes.trim() || null,
        event_type: formEventType,
        target_budget: isNaN(budgetNum as number) ? null : budgetNum,
        spent_amount: 0,
      });
      haptic('success');
      setFormName('');
      setFormDate('');
      setFormClothing('');
      setFormShoes('');
      setFormTargetBudget('');
      setFormEventType('birthday');
      onClose();
      if (onCreated) onCreated();
    } catch (e) {
      haptic('medium');
      Alert.alert('Kaydedilemedi', e instanceof Error ? e.message : String(e));
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
            <View style={styles.modalTop}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Yeni kayıt</Text>
              <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
                <Feather name="x" size={22} color={colors.ink} />
              </PressableScale>
            </View>
            <Text style={[type.display, { marginVertical: space.lg, color: colors.ink }]}>Kimin için?</Text>

            {/* İsim */}
            <View style={{ marginTop: space.lg }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>İsim</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="Ad Soyad"
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
            <Text style={[type.eyebrow, { marginTop: space.lg, color: colors.inkMuted }]}>Etkinlik Türü</Text>
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
            <Text style={[type.eyebrow, { marginTop: space.lg, color: colors.inkMuted }]}>Yakınlık</Text>
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

            {/* Hedef Bütçe */}
            <View style={{ marginTop: space.lg }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Hedef Bütçe (TL - İsteğe Bağlı)</Text>
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

            <PressableScale
              onPress={handleCreate}
              hapticProfile="none"
              style={[styles.fab, { backgroundColor: colors.ink, alignSelf: 'stretch', justifyContent: 'center', marginTop: space.xl }]}
            >
              <Text style={[styles.fabText, { color: colors.canvas }]}>Kaydet</Text>
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
});
