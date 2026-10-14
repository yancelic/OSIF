import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { GiftHistoryItem, GiftTag, GiftTagType } from '../types/index';
import { GiftStatusSwitch } from '../ui/GiftStatusSwitch';
import { PressableScale } from '../ui/PressableScale';
import { formatEventDate } from '../ui/ContactRow';
import { haptic } from '../ui/haptics';
import { getComposerPlaceholder, TIER_LABEL } from '../ui/labels';
import { AddContactModal } from '../ui/AddContactModal';
import { EditContactModal } from '../ui/EditContactModal';
import { fonts, getThemeColors, hairlineWidth, space, type } from '../ui/theme';

const COMPOSER_TYPES: { key: GiftTagType; label: string }[] = [
  { key: 'wishlist_item', label: 'Hediye fikri' },
  { key: 'like', label: 'Zevk' },
  { key: 'dislike', label: 'Hoşlanmaz' },
];

export const ContactDetailScreen: React.FC = () => {
  const {
    selectedContact,
    selectContact,
    updateContactSizes,
    addTag,
    removeTag,
    cycleGiftStatus,
    deleteContact,
    contacts,
    addGiftHistoryItem,
    deleteGiftHistoryItem,
    themeMode,
  } = useApp();

  const colors = getThemeColors(themeMode);
  const insets = useSafeAreaInsets();

  const [editingSizes, setEditingSizes] = useState(false);
  const [clothingInput, setClothingInput] = useState('');
  const [shoesInput, setShoesInput] = useState('');
  const [draft, setDraft] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [draftType, setDraftType] = useState<GiftTagType>('wishlist_item');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Geçmiş hediye ekleme paneli
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [histYear, setHistYear] = useState(String(new Date().getFullYear() - 1));
  const [histTitle, setHistTitle] = useState('');
  const [histPrice, setHistPrice] = useState('');

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setClothingInput(selectedContact.clothing_size ?? '');
      setShoesInput(selectedContact.shoe_size ?? '');
    }
  }, [selectedContact?.id, selectedContact?.clothing_size, selectedContact?.shoe_size]);

  // Arama filtresi
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, searchQuery]);

  // Kişi seçili değilse: Bütün kişilerin listelendiği Rehber ekranı
  if (!selectedContact) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]} edges={['top', 'left', 'right']}>
        <View style={[styles.content, { flex: 1, paddingBottom: 0 }]}>
          <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Rehber  ·  {contacts.length} kişi</Text>
          <Text style={[type.display, { marginTop: space.xs, color: colors.ink }]}>Kişiler</Text>

          {/* Arama Kutusu */}
          <View style={[styles.searchWrap, { backgroundColor: colors.bone }]}>
            <Feather name="search" size={16} color={colors.inkFaint} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="İsim ile ara…"
              placeholderTextColor={colors.inkFaint}
              selectionColor={colors.accent}
              clearButtonMode="while-editing"
              style={[styles.searchInput, { color: colors.ink }]}
            />
            {searchQuery ? (
              <PressableScale onPress={() => setSearchQuery('')} hitSlop={8}>
                <Feather name="x" size={16} color={colors.inkFaint} />
              </PressableScale>
            ) : null}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110, paddingTop: space.sm }}
            keyboardShouldPersistTaps="handled"
            directionalLockEnabled={true}
          >
            {filteredContacts.length === 0 ? (
              <Text style={[styles.empty, { marginTop: space.xl, color: colors.inkFaint }]}>
                {searchQuery ? 'Eşleşen kişi bulunamadı.' : 'Henüz kayıtlı kişi yok.'}
              </Text>
            ) : (
              filteredContacts.map((item) => (
                <PressableScale
                  key={item.id}
                  onPress={() => selectContact(item.id)}
                  hapticProfile="light"
                  scaleTo={0.985}
                  style={[styles.directoryRow, { borderBottomColor: colors.hairline }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Text style={[type.title, { color: colors.ink }]} numberOfLines={1}>{item.name}</Text>
                      {item.event_type && item.event_type !== 'birthday' && (
                        <Text style={[styles.eventBadge, { color: colors.accent, borderColor: colors.accent }]}>
                          {item.event_type === 'anniversary' ? 'Yıldönümü' : 'Özel'}
                        </Text>
                      )}
                    </View>
                    <Text style={[type.meta, { marginTop: 3, color: colors.inkMuted }]}>
                      {formatEventDate(item.next_birthday_date)}
                      <Text style={{ color: colors.inkFaint }}>{'   ·   '}</Text>
                      {TIER_LABEL[item.priority_tier]}
                      {item.zodiac_sign && (
                        <>
                          <Text style={{ color: colors.inkFaint }}>{'   ·   '}</Text>
                          {item.zodiac_sign.symbol} {item.zodiac_sign.name}
                        </>
                      )}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.inkFaint} />
                </PressableScale>
              ))
            )}
          </ScrollView>

          {/* FAB: Yeni kişi ekle */}
          <View style={styles.fabWrap} pointerEvents="box-none">
            <PressableScale
              onPress={() => setIsAddModalOpen(true)}
              hapticProfile="medium"
              style={[styles.fab, { backgroundColor: colors.ink }]}
              accessibilityRole="button"
              accessibilityLabel="Yeni kişi ekle"
            >
              <Feather name="plus" size={18} color={colors.canvas} />
              <Text style={[styles.fabText, { color: colors.canvas }]}>Yeni kişi</Text>
            </PressableScale>
          </View>
        </View>

        <AddContactModal
          visible={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      </SafeAreaView>
    );
  }

  const c = selectedContact;
  const tagsOf = (t: GiftTagType) => c.gift_tags.filter((g) => g.type === t);
  const days = c.days_until_next_birthday;
  const imminent = days <= 7;

  const eventLabel =
    c.event_type === 'anniversary' ? 'yıldönümü' : c.event_type === 'special' ? 'özel gün' : 'doğum günü';

  const saveSizes = async () => {
    try {
      await updateContactSizes(c.id, clothingInput, shoesInput);
      haptic('success');
      setEditingSizes(false);
    } catch (e) {
      haptic('medium');
      Alert.alert('Kaydedilemedi', e instanceof Error ? e.message : String(e));
    }
  };

  const submitDraft = async () => {
    if (!draft.trim()) {
      haptic('medium');
      return;
    }
    try {
      await addTag(c.id, draftType, draft, draftUrl.trim() || null);
      haptic('light');
      setDraft('');
      setDraftUrl('');
      setShowUrlInput(false);
    } catch (e) {
      haptic('medium');
      Alert.alert('Eklenemedi', e instanceof Error ? e.message : String(e));
    }
  };

  const handleAddHistory = async () => {
    if (!histTitle.trim()) {
      haptic('medium');
      Alert.alert('Eksik bilgi', 'Hediye başlığı gerekli.');
      return;
    }
    try {
      const yr = parseInt(histYear, 10) || new Date().getFullYear();
      const pr = histPrice.trim() ? parseFloat(histPrice.replace(',', '.')) : null;
      await addGiftHistoryItem(c.id, yr, histTitle.trim(), isNaN(pr as number) ? null : pr);
      haptic('success');
      setHistTitle('');
      setHistPrice('');
      setShowAddHistory(false);
    } catch (e) {
      haptic('medium');
      Alert.alert('Hata', e instanceof Error ? e.message : String(e));
    }
  };

  const confirmDelete = () => {
    haptic('medium');
    Alert.alert(`${c.name} silinsin mi?`, 'Kişi ve tüm hediye notları kalıcı olarak silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteContact(c.id);
          selectContact(null);
        },
      },
    ]);
  };

  const openUrl = async (url: string | null) => {
    if (!url) return;
    try {
      const validUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      await Linking.openURL(validUrl);
    } catch {
      Alert.alert('Açılamadı', 'Bağlantı açılamıyor: ' + url);
    }
  };

  const composerBottomPadding = isKeyboardVisible
    ? space.xs
    : (insets.bottom > 0 ? insets.bottom : space.sm);

  // Bütçe hesabı
  const hasBudget = c.target_budget != null && c.target_budget > 0;
  const spent = c.spent_amount || 0;
  const budgetRatio = hasBudget ? Math.min(1, spent / c.target_budget!) : 0;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          key={c.id}
          contentContainerStyle={[styles.content, { paddingBottom: isKeyboardVisible ? space.xxl : space.xl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {/* Üst Navigasyon & Düzenle Butonu */}
          <View style={styles.topNavRow}>
            <BackLink onPress={() => selectContact(null)} label="Kişiler" color={colors.ink} />
            <PressableScale
              onPress={() => setIsEditModalOpen(true)}
              hitSlop={12}
              style={[styles.editBtn, { borderColor: colors.hairline }]}
            >
              <Feather name="edit-2" size={14} color={colors.ink} />
              <Text style={[styles.editBtnText, { color: colors.ink }]}>Düzenle</Text>
            </PressableScale>
          </View>

          {/* Kimlik & Burç */}
          <View style={{ marginTop: space.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>
                {TIER_LABEL[c.priority_tier]}  ·  {formatEventDate(c.next_birthday_date)}
              </Text>
              {c.zodiac_sign && (
                <Text style={[type.eyebrow, { color: colors.accent }]}>
                  ·  {c.zodiac_sign.symbol} {c.zodiac_sign.name}
                </Text>
              )}
            </View>
            <Text style={[type.display, { marginTop: space.sm, color: colors.ink }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
              {c.name}
            </Text>
          </View>

          {/* Gün sayısı ve yaş */}
          <View style={styles.figures}>
            <View style={styles.figure}>
              {days === 0 ? (
                <Text style={[styles.bigNumber, { color: colors.accent, fontStyle: 'italic', fontSize: 40 }]}>Bugün</Text>
              ) : (
                <Text style={[styles.bigNumber, { color: colors.ink }, imminent && { color: colors.accent }]}>{days}</Text>
              )}
              <Text style={[styles.figureLabel, { color: colors.inkMuted }]}>{days === 0 ? eventLabel : 'gün kaldı'}</Text>
            </View>
            <View style={[styles.vRule, { backgroundColor: colors.hairline }]} />
            <View style={styles.figure}>
              <Text style={[styles.bigNumber, { color: colors.ink }]}>{c.upcoming_age ?? '—'}</Text>
              <Text style={[styles.figureLabel, { color: colors.inkMuted }]}>
                {c.upcoming_age != null
                  ? c.event_type === 'anniversary'
                    ? `${c.upcoming_age}. yıldönümü`
                    : `${c.upcoming_age} yaşına giriyor`
                  : 'yaş bilinmiyor'}
              </Text>
            </View>
          </View>

          {/* Bütçe Kartı */}
          {hasBudget && (
            <View style={[styles.budgetCard, { backgroundColor: colors.bone, borderColor: colors.hairline }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Hediye Bütçesi</Text>
                <Text style={[styles.budgetNumbers, { color: colors.ink }]}>
                  {spent.toLocaleString('tr-TR')} TL / <Text style={{ color: colors.inkMuted }}>{c.target_budget?.toLocaleString('tr-TR')} TL</Text>
                </Text>
              </View>
              <View style={[styles.budgetTrack, { backgroundColor: colors.stone }]}>
                <View style={[styles.budgetFill, { width: `${budgetRatio * 100}%`, backgroundColor: budgetRatio >= 1 ? colors.accent : colors.ink }]} />
              </View>
            </View>
          )}

          {c.notes ? <Text style={[styles.notes, { color: colors.inkMuted }]}>{c.notes}</Text> : null}

          {/* Hediye durumu */}
          <View style={[styles.sectionRow, { borderTopColor: colors.hairline, borderBottomColor: colors.hairline }]}>
            <View>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Hediye Durumu</Text>
              <Text style={[type.meta, { marginTop: 4, color: colors.inkMuted }]}>Dokunarak ilerlet</Text>
            </View>
            <GiftStatusSwitch status={c.gift_status} onCycle={() => cycleGiftStatus(c.id)} />
          </View>

          {/* Bedenler */}
          <View style={[styles.sectionHead, { borderBottomColor: colors.hairline }]}>
            <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Bedenler</Text>
            <PressableScale
              onPress={() => (editingSizes ? saveSizes() : setEditingSizes(true))}
              hapticProfile={editingSizes ? 'none' : 'light'}
              hitSlop={12}
            >
              <Text style={[styles.action, { color: colors.accent }]}>{editingSizes ? 'Kaydet' : 'Düzenle'}</Text>
            </PressableScale>
          </View>
          {editingSizes ? (
            <View style={styles.sizeEdit}>
              <SizeInput label="Üst" value={clothingInput} onChangeText={setClothingInput} placeholder="L" colors={colors} />
              <SizeInput label="Ayakkabı" value={shoesInput} onChangeText={setShoesInput} placeholder="43" colors={colors} />
            </View>
          ) : (
            <Text style={[styles.sizes, { color: colors.ink }]}>
              <Text style={[styles.sizeKey, { color: colors.inkMuted }]}>ÜST </Text>
              {c.clothing_size || '—'}
              <Text style={[styles.sizeSep, { color: colors.inkFaint }]}>{'   •   '}</Text>
              <Text style={[styles.sizeKey, { color: colors.inkMuted }]}>AYAKKABI </Text>
              {c.shoe_size || '—'}
            </Text>
          )}

          {/* Hediye Fikirleri (Bağlantı Açılabilir) */}
          <TagSection
            title="Hediye fikirleri"
            tags={tagsOf('wishlist_item')}
            empty="Henüz bir fikir yok."
            onRemove={removeTag}
            onOpenUrl={openUrl}
            colors={colors}
          />
          <TagSection
            title="Zevkler"
            tags={tagsOf('like')}
            empty="Henüz bir şey eklenmedi."
            onRemove={removeTag}
            colors={colors}
          />
          <TagSection
            title="Hoşlanmadıkları"
            tags={tagsOf('dislike')}
            empty="Henüz bir şey eklenmedi."
            onRemove={removeTag}
            colors={colors}
          />

          {/* Geçmiş Yıllar Hediyeleri */}
          <View style={{ marginTop: space.xl }}>
            <View style={[styles.sectionHead, { borderBottomColor: colors.hairline }]}>
              <Text style={[type.eyebrow, { color: colors.inkMuted }]}>Geçmiş Hediyeler</Text>
              <PressableScale
                onPress={() => setShowAddHistory(!showAddHistory)}
                hitSlop={10}
              >
                <Text style={[styles.action, { color: colors.accent }]}>
                  {showAddHistory ? 'Kapat' : '+ Hediye Ekle'}
                </Text>
              </PressableScale>
            </View>

            {showAddHistory && (
              <View style={[styles.addHistoryPanel, { backgroundColor: colors.bone, borderColor: colors.hairline }]}>
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <TextInput
                    value={histYear}
                    onChangeText={setHistYear}
                    placeholder="2025"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="numeric"
                    style={[styles.histYearInput, { color: colors.ink, borderBottomColor: colors.ink }]}
                  />
                  <TextInput
                    value={histTitle}
                    onChangeText={setHistTitle}
                    placeholder="Alınan hediye adı..."
                    placeholderTextColor={colors.inkFaint}
                    style={[styles.histTitleInput, { color: colors.ink, borderBottomColor: colors.ink }]}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm, alignItems: 'center' }}>
                  <TextInput
                    value={histPrice}
                    onChangeText={setHistPrice}
                    placeholder="Tutar (TL)"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="numeric"
                    style={[styles.histPriceInput, { color: colors.ink, borderBottomColor: colors.ink }]}
                  />
                  <PressableScale
                    onPress={handleAddHistory}
                    style={[styles.histSaveBtn, { backgroundColor: colors.ink }]}
                  >
                    <Text style={[styles.histSaveBtnText, { color: colors.canvas }]}>Kaydet</Text>
                  </PressableScale>
                </View>
              </View>
            )}

            {c.gift_history && c.gift_history.length > 0 ? (
              c.gift_history.map((hist) => (
                <View key={hist.id} style={[styles.historyRow, { borderBottomColor: colors.hairline }]}>
                  <Text style={[styles.historyYear, { color: colors.accent }]}>{hist.year}</Text>
                  <View style={{ flex: 1, paddingHorizontal: space.sm }}>
                    <Text style={[styles.historyTitle, { color: colors.ink }]}>{hist.title}</Text>
                    {hist.price != null && (
                      <Text style={[type.meta, { color: colors.inkMuted, fontSize: 12 }]}>
                        {hist.price.toLocaleString('tr-TR')} TL
                      </Text>
                    )}
                  </View>
                  <PressableScale onPress={() => deleteGiftHistoryItem(hist.id)} hitSlop={10}>
                    <Feather name="trash-2" size={14} color={colors.inkFaint} />
                  </PressableScale>
                </View>
              ))
            ) : (
              <Text style={[styles.empty, { color: colors.inkFaint }]}>Kayıtlı geçmiş hediye yok.</Text>
            )}
          </View>

          {/* Kişiyi Sil */}
          <PressableScale onPress={confirmDelete} hapticProfile="none" style={styles.danger} hitSlop={8}>
            <Text style={[styles.dangerText, { color: colors.accent }]}>Kişiyi sil</Text>
          </PressableScale>
          <View style={{ height: space.xl }} />
        </ScrollView>

        {/* Hızlı ekleme Barı */}
        <View style={[styles.composer, { backgroundColor: colors.canvas, borderTopColor: colors.hairline, paddingBottom: composerBottomPadding }]}>
          <View style={styles.composerTypes}>
            {COMPOSER_TYPES.map((t) => (
              <PressableScale key={t.key} onPress={() => setDraftType(t.key)} hapticProfile="selection" scaleTo={0.94} style={styles.composerType}>
                <Text style={[styles.composerTypeText, { color: colors.inkFaint }, draftType === t.key && { color: colors.ink }]}>
                  {t.label}
                </Text>
                <View style={[styles.tierLine, draftType === t.key && { backgroundColor: colors.accent }]} />
              </PressableScale>
            ))}
          </View>

          {draftType === 'wishlist_item' && showUrlInput && (
            <TextInput
              value={draftUrl}
              onChangeText={setDraftUrl}
              placeholder="Web linki (https://...)"
              placeholderTextColor={colors.inkFaint}
              selectionColor={colors.accent}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.urlInput, { color: colors.ink, borderBottomColor: colors.hairline }]}
            />
          )}

          <View style={styles.composerRow}>
            {draftType === 'wishlist_item' && (
              <PressableScale
                onPress={() => setShowUrlInput(!showUrlInput)}
                hitSlop={8}
                style={[styles.linkToggle, { backgroundColor: showUrlInput ? colors.bone : 'transparent' }]}
              >
                <Feather name="link" size={16} color={showUrlInput ? colors.accent : colors.inkFaint} />
              </PressableScale>
            )}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitDraft}
              returnKeyType="done"
              placeholder={getComposerPlaceholder(draftType, c.name)}
              placeholderTextColor={colors.inkFaint}
              selectionColor={colors.accent}
              style={[styles.composerInput, { color: colors.ink, borderBottomColor: colors.ink }]}
            />
            <PressableScale onPress={submitDraft} hapticProfile="none" hitSlop={10} style={[styles.send, { backgroundColor: colors.ink }]} accessibilityLabel="Ekle">
              <Feather name="arrow-up" size={18} color={colors.canvas} />
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>

      <EditContactModal
        visible={isEditModalOpen}
        contact={c}
        onClose={() => setIsEditModalOpen(false)}
      />
    </SafeAreaView>
  );
};

const BackLink: React.FC<{ onPress: () => void; label?: string; color: string }> = ({ onPress, label = 'Kişiler', color }) => (
  <PressableScale onPress={onPress} hitSlop={12} scaleTo={0.94} style={styles.back} accessibilityRole="button" accessibilityLabel="Geri">
    <Feather name="arrow-left" size={18} color={color} />
    <Text style={[styles.backText, { color }]}>{label}</Text>
  </PressableScale>
);

const SizeInput: React.FC<{ label: string; value: string; onChangeText: (t: string) => void; placeholder: string; colors: any }> = ({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
}) => (
  <View style={{ flex: 1 }}>
    <Text style={[styles.sizeKey, { color: colors.inkMuted }]}>{label.toUpperCase()}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.inkFaint}
      selectionColor={colors.accent}
      style={[styles.sizeInput, { color: colors.ink, borderBottomColor: colors.ink }]}
    />
  </View>
);

const TagSection: React.FC<{
  title: string;
  tags: GiftTag[];
  empty: string;
  onRemove: (id: string) => void;
  onOpenUrl?: (url: string | null) => void;
  colors: any;
}> = ({ title, tags, empty, onRemove, onOpenUrl, colors }) => (
  <View>
    <View style={[styles.sectionHead, { borderBottomColor: colors.hairline }]}>
      <Text style={[type.eyebrow, { color: colors.inkMuted }]}>{title}</Text>
      <Text style={[styles.count, { color: colors.inkFaint }]}>{tags.length}</Text>
    </View>
    {tags.length === 0 ? (
      <Text style={[styles.empty, { color: colors.inkFaint }]}>{empty}</Text>
    ) : (
      tags.map((tag, i) => (
        <Animated.View
          key={tag.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutLeft.duration(180)}
          layout={LinearTransition.springify().damping(18)}
          style={[styles.tagRow, { borderBottomColor: colors.hairline }]}
        >
          <Text style={[styles.tagIndex, { color: colors.inkFaint }]}>{String(i + 1).padStart(2, '0')}</Text>
          <View style={{ flex: 1, paddingRight: space.md }}>
            <Text style={[styles.tagTitle, { color: colors.ink }]} numberOfLines={2}>{tag.title}</Text>
            {tag.url && (
              <PressableScale onPress={() => onOpenUrl && onOpenUrl(tag.url)} style={styles.tagLinkRow}>
                <Feather name="external-link" size={12} color={colors.accent} />
                <Text style={[styles.tagLinkText, { color: colors.accent }]} numberOfLines={1}>
                  {tag.url.replace(/^https?:\/\//, '')}
                </Text>
              </PressableScale>
            )}
          </View>
          <PressableScale
            onPress={() => onRemove(tag.id)}
            hapticProfile="light"
            hitSlop={14}
            scaleTo={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${tag.title} sil`}
          >
            <Feather name="x" size={16} color={colors.inkFaint} />
          </PressableScale>
        </Animated.View>
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg },
  topNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  backText: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.4 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 4,
  },
  editBtnText: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0.4 },
  figures: { flexDirection: 'row', alignItems: 'stretch', marginTop: space.xl },
  figure: { flex: 1 },
  vRule: { width: hairlineWidth, marginHorizontal: space.lg },
  bigNumber: { fontFamily: fonts.serif, fontSize: 72, lineHeight: 78, letterSpacing: -2 },
  figureLabel: { ...type.eyebrow, marginTop: 4 },
  notes: { ...type.body, fontFamily: fonts.serif, fontStyle: 'italic', marginTop: space.xl },
  budgetCard: {
    marginTop: space.lg,
    padding: space.md,
    borderRadius: 6,
    borderWidth: hairlineWidth,
  },
  budgetNumbers: { fontFamily: fonts.serif, fontSize: 15 },
  budgetTrack: { height: 4, borderRadius: 2, marginTop: space.sm, overflow: 'hidden' },
  budgetFill: { height: 4, borderRadius: 2 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xl,
    paddingVertical: space.lg,
    borderTopWidth: hairlineWidth,
    borderBottomWidth: hairlineWidth,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: space.xl,
    paddingBottom: space.sm,
    borderBottomWidth: hairlineWidth,
  },
  action: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.4 },
  count: { fontFamily: fonts.serif, fontSize: 14 },
  sizes: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 32, marginTop: space.md },
  sizeKey: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.6 },
  sizeSep: {},
  sizeEdit: { flexDirection: 'row', gap: space.lg, marginTop: space.md },
  sizeInput: {
    fontFamily: fonts.serif,
    fontSize: 22,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
  },
  empty: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 15, paddingVertical: space.md },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: hairlineWidth,
  },
  tagIndex: { width: 32, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 13 },
  tagTitle: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 26 },
  tagLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tagLinkText: { fontFamily: fonts.sans, fontSize: 12, textDecorationLine: 'underline' },
  addHistoryPanel: {
    padding: space.md,
    borderRadius: 6,
    borderWidth: hairlineWidth,
    marginVertical: space.md,
  },
  histYearInput: { width: 60, fontFamily: fonts.serif, fontSize: 16, borderBottomWidth: 1, paddingVertical: 4 },
  histTitleInput: { flex: 1, fontFamily: fonts.serif, fontSize: 16, borderBottomWidth: 1, paddingVertical: 4 },
  histPriceInput: { width: 90, fontFamily: fonts.serif, fontSize: 14, borderBottomWidth: 1, paddingVertical: 4 },
  histSaveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4 },
  histSaveBtnText: { fontFamily: fonts.sans, fontSize: 12 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: hairlineWidth,
  },
  historyYear: { fontFamily: fonts.serif, fontSize: 16, width: 45 },
  historyTitle: { fontFamily: fonts.serif, fontSize: 16 },
  danger: { alignSelf: 'flex-start', marginTop: space.xxl },
  dangerText: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.4, textDecorationLine: 'underline' },
  composer: {
    paddingHorizontal: space.lg,
    paddingTop: 6,
    borderTopWidth: hairlineWidth,
  },
  composerTypes: { flexDirection: 'row' },
  composerType: { marginRight: space.lg, paddingVertical: 6 },
  composerTypeText: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0.4 },
  tierLine: { height: 2, marginTop: 4, backgroundColor: 'transparent' },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  linkToggle: { padding: 8, borderRadius: 4 },
  urlInput: {
    fontFamily: fonts.sans,
    fontSize: 13,
    paddingVertical: 4,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  composerInput: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 18,
    paddingTop: space.xs,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: 6,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    padding: 0,
  },
  directoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    borderBottomWidth: hairlineWidth,
  },
  eventBadge: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space.lg,
    alignItems: 'center',
  },
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
