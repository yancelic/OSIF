/**
 * Öncelik Kademesi (Priority Tier)
 * 1: En Yakın (Aile, Çok Yakın Dostlar)
 * 2: Arkadaş
 * 3: Tanıdık / İş Çevresi
 */
export type PriorityTier = 1 | 2 | 3;

/**
 * Hediye Durumu (Gift Status)
 * - 'not_started': Henüz başlanmadı / düşünülmedi
 * - 'searching': Hediye araştırma aşamasında
 * - 'ready': Hediye hazır / alındı
 */
export type GiftStatus = 'not_started' | 'searching' | 'ready';

/**
 * Etkinlik Türü (Event Type)
 * - 'birthday': Doğum günü
 * - 'anniversary': Yıldönümü (Evlilik, Tanışma vb.)
 * - 'special': Diğer Özel Günler
 */
export type EventType = 'birthday' | 'anniversary' | 'special';

/**
 * Hediye Etiket Tipi (Gift Tag Type)
 * - 'like': Sevdiği şeyler / ilgi alanları
 * - 'dislike': Sevmediği / alınmaması gerekenler
 * - 'wishlist_item': Doğrudan istediği spesifik hediye
 */
export type GiftTagType = 'like' | 'dislike' | 'wishlist_item';

/**
 * SQLite 'contacts' tablosunun ana model tanımı
 */
export interface Contact {
  id: string;
  name: string;
  birth_month: number; // 1 - 12
  birth_day: number;   // 1 - 31
  birth_year: number | null;
  priority_tier: PriorityTier;
  gift_status: GiftStatus;
  clothing_size: string | null;
  shoe_size: string | null;
  notes: string | null;
  event_type?: EventType;
  target_budget?: number | null;
  spent_amount?: number | null;
  custom_notification_days?: string | null; // JSON dizisi örn: "[14, 7, 0]"
  custom_notification_time?: string | null; // Örn: "10:00"
}

/**
 * SQLite 'gift_tags' tablosunun ana model tanımı
 */
export interface GiftTag {
  id: string;
  contact_id: string;
  type: GiftTagType;
  title: string;
  url: string | null;
}

/**
 * SQLite 'gift_history' tablosu (Geçmiş Yıllarda Alınan Hediyeler)
 */
export interface GiftHistoryItem {
  id: string;
  contact_id: string;
  year: number;
  title: string;
  price: number | null;
  notes: string | null;
  created_at: string;
}

/**
 * Yeni etiket oluşturma girdisi
 */
export interface CreateGiftTagInput {
  id?: string;
  contact_id?: string;
  type: GiftTagType;
  title: string;
  url?: string | null;
}

/**
 * Yeni geçmiş hediye girdisi
 */
export interface CreateGiftHistoryInput {
  id?: string;
  contact_id?: string;
  year: number;
  title: string;
  price?: number | null;
  notes?: string | null;
}

/**
 * Yeni kişi oluşturma girdisi
 */
export interface CreateContactInput {
  id?: string;
  name: string;
  birth_month: number;
  birth_day: number;
  birth_year?: number | null;
  priority_tier: PriorityTier;
  gift_status?: GiftStatus; // Varsayılan: 'not_started'
  clothing_size?: string | null;
  shoe_size?: string | null;
  notes?: string | null;
  event_type?: EventType;
  target_budget?: number | null;
  spent_amount?: number | null;
  custom_notification_days?: string | null;
  custom_notification_time?: string | null;
  gift_tags?: Omit<CreateGiftTagInput, 'contact_id'>[];
}

/**
 * Kişi güncelleme girdisi
 */
export interface UpdateContactInput {
  name?: string;
  birth_month?: number;
  birth_day?: number;
  birth_year?: number | null;
  priority_tier?: PriorityTier;
  gift_status?: GiftStatus;
  clothing_size?: string | null;
  shoe_size?: string | null;
  notes?: string | null;
  event_type?: EventType;
  target_budget?: number | null;
  spent_amount?: number | null;
  custom_notification_days?: string | null;
  custom_notification_time?: string | null;
}

/**
 * Burç bilgisi
 */
export interface ZodiacSign {
  name: string;
  symbol: string;
  dateRange: string;
}

/**
 * Hesaplanan alanlarla, etiketlerle ve geçmişle zenginleştirilmiş kişi modeli
 */
export interface ContactWithDetails extends Contact {
  gift_tags: GiftTag[];
  gift_history?: GiftHistoryItem[];
  days_until_next_birthday: number;
  upcoming_age: number | null;
  next_birthday_date: string; // ISO date formatında (YYYY-MM-DD)
  zodiac_sign?: ZodiacSign;
}

/**
 * Doğum günü hesaplama çıktısı
 */
export interface BirthdayCalculationResult {
  nextBirthdayDate: Date;
  daysUntilNextBirthday: number;
  upcomingAge: number | null;
  isLeapYearBaby: boolean;
  celebratedOnLeapFallback: boolean;
}

/**
 * Bildirim ve mock prototip tipleri
 */
export interface PendingNotification {
  id: string;
  contactId: string;
  contactName: string;
  scheduledTime: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'triggered' | 'cancelled';
}

export type ScreenType = 'dashboard' | 'contact_detail' | 'settings' | 'debug';

export type ThemeMode = 'light' | 'dark';

export interface AppState {
  contacts: Contact[];
  selectedContactId: string | null;
  activeScreen: ScreenType;
  mockDate: string;
  isMockActive: boolean;
  themeMode: ThemeMode;
  pendingNotifications: PendingNotification[];
  lastTriggeredNotification: PendingNotification | null;
}
