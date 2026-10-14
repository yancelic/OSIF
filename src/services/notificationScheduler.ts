import * as Notifications from './safeNotifications';
import { Platform } from 'react-native';
import { Contact, PriorityTier, GiftStatus } from '../types';
import { isLeapYear } from '../utils/birthday';
import { getTurkishPossessive } from '../ui/labels';

// ---------------------------------------------------------------------------
// Tipler & Arayüzler (Types & Interfaces)
// ---------------------------------------------------------------------------

export type { Contact, PriorityTier, GiftStatus };

export type ContactTier =
  | PriorityTier
  | 1
  | 2
  | 3
  | 'tier1'
  | 'tier2'
  | 'tier3'
  | 'Tier 1'
  | 'Tier 2'
  | 'Tier 3'
  | '1'
  | '2'
  | '3';

export type ReminderType = 'T10' | 'T7' | 'T3' | 'T0';

export interface NotificationRule {
  type: ReminderType;
  daysBefore: number;
  hour: number;
  minute: number;
  title: string;
  getBody: (name: string) => string;
  isGiftReminder: boolean;
}

export interface ScheduledNotificationResult {
  identifier: string;
  triggerDate: Date;
  daysBefore: number;
  type: ReminderType;
  title: string;
  body: string;
}

export interface PendingNotificationSummary {
  identifier: string;
  title?: string | null;
  body?: string | null;
  triggerDate?: Date | null;
  triggerDateFormatted?: string | null;
  contactId?: string;
  type?: ReminderType | string;
  priority_tier?: PriorityTier;
  tier?: PriorityTier | number | string;
  data?: Record<string, unknown>;
  raw: Notifications.NotificationRequest;
}

// ---------------------------------------------------------------------------
// Yapılandırma & Bildirim Matrisi (Rules Matrix)
// ---------------------------------------------------------------------------

export const NOTIFICATION_CHANNEL_ID = 'birthday-reminders';

// Uygulama ön plandayken (foreground) bildirimlerin nasıl davranacağını belirler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Expo Go (SDK 53+) üzerinde bildirim işleyicisi kısıtlı olabilir
}

/**
 * 1. Bildirim Matrisi:
 * - Tier 1 (En Yakınlar):
 *   * T-10 gün sabah 10:00: "Hediye düşünmeye başladın mı? [İsim]'in zevklerine göz at."
 *   * T-3 gün sabah 10:00: "Hediye hazır mı? [İsim]'in doğum gününe 3 gün kaldı."
 *   * T-0 gün sabah 09:00: "Bugün [İsim]'in doğum günü! Kutlamayı unutma."
 * - Tier 2 (Arkadaşlar):
 *   * T-7 gün sabah 10:00: "Gelecek hafta [İsim]'in doğum günü. Bir plan veya hediye düşünüyor musun?"
 *   * T-0 gün sabah 09:00: "Bugün [İsim]'in doğum günü."
 * - Tier 3 (Tanıdıklar):
 *   * Sadece T-0 gün sabah 09:00: "Bugün [İsim]'in doğum günü."
 */
export const NOTIFICATION_MATRIX: Record<PriorityTier, NotificationRule[]> = {
  // Tier 1: En Yakınlar
  1: [
    {
      type: 'T10',
      daysBefore: 10,
      hour: 10,
      minute: 0,
      title: 'Hediye Hatırlatması',
      getBody: (name: string) =>
        `Hediye düşünmeye başladın mı? ${getTurkishPossessive(name)} zevklerine göz at.`,
      isGiftReminder: true,
    },
    {
      type: 'T3',
      daysBefore: 3,
      hour: 10,
      minute: 0,
      title: 'Hediye Hazır mı?',
      getBody: (name: string) =>
        `Hediye hazır mı? ${getTurkishPossessive(name)} doğum gününe 3 gün kaldı.`,
      isGiftReminder: true,
    },
    {
      type: 'T0',
      daysBefore: 0,
      hour: 9,
      minute: 0,
      title: 'Doğum Günü Kutlaması!',
      getBody: (name: string) =>
        `Bugün ${getTurkishPossessive(name)} doğum günü! Kutlamayı unutma.`,
      isGiftReminder: false,
    },
  ],

  // Tier 2: Arkadaşlar
  2: [
    {
      type: 'T7',
      daysBefore: 7,
      hour: 10,
      minute: 0,
      title: 'Doğum Günü Yaklaşıyor',
      getBody: (name: string) =>
        `Gelecek hafta ${getTurkishPossessive(name)} doğum günü. Bir plan veya hediye düşünüyor musun?`,
      isGiftReminder: true,
    },
    {
      type: 'T0',
      daysBefore: 0,
      hour: 9,
      minute: 0,
      title: 'Doğum Günü',
      getBody: (name: string) => `Bugün ${getTurkishPossessive(name)} doğum günü.`,
      isGiftReminder: false,
    },
  ],

  // Tier 3: Tanıdıklar
  3: [
    {
      type: 'T0',
      daysBefore: 0,
      hour: 9,
      minute: 0,
      title: 'Doğum Günü',
      getBody: (name: string) => `Bugün ${getTurkishPossessive(name)} doğum günü.`,
      isGiftReminder: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tarih ve Yardımcı Fonksiyonlar (Date Helpers)
// ---------------------------------------------------------------------------

/**
 * Tier değerini standart 1 | 2 | 3 formatına normalleştirir.
 */
export function normalizeTier(tier?: ContactTier | number | string | null): PriorityTier {
  if (tier === 1 || tier === 'tier1' || tier === 'Tier 1' || tier === '1') return 1;
  if (tier === 2 || tier === 'tier2' || tier === 'Tier 2' || tier === '2') return 2;
  return 3;
}

/**
 * Doğum tarihi girdisinden Ay (1-12) ve Gün (1-31) bilgilerini saat dilimi (timezone)
 * sapmalarından etkilenmeden güvenle ayrıştırır. (Legacy desteği)
 */
export function parseBirthday(
  birthDate: string | Date
): { month: number; day: number } {
  if (birthDate instanceof Date) {
    if (isNaN(birthDate.getTime())) {
      throw new Error(`[NotificationScheduler] Geçersiz Date nesnesi: ${birthDate}`);
    }
    return { month: birthDate.getMonth() + 1, day: birthDate.getDate() };
  }

  if (typeof birthDate === 'string') {
    // "YYYY-MM-DD" veya "YYYY/MM/DD"
    const isoMatch = birthDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return {
        month: parseInt(isoMatch[2], 10),
        day: parseInt(isoMatch[3], 10),
      };
    }

    // "DD.MM.YYYY" veya "DD/MM/YYYY"
    const euroMatch = birthDate.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (euroMatch) {
      return {
        month: parseInt(euroMatch[2], 10),
        day: parseInt(euroMatch[1], 10),
      };
    }

    // "MM-DD" veya "MM/DD"
    const monthDayMatch = birthDate.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (monthDayMatch) {
      return {
        month: parseInt(monthDayMatch[1], 10),
        day: parseInt(monthDayMatch[2], 10),
      };
    }

    // Standart Date parse alternatifi
    const parsed = new Date(birthDate);
    if (!isNaN(parsed.getTime())) {
      return { month: parsed.getMonth() + 1, day: parsed.getDate() };
    }
  }

  throw new Error(`[NotificationScheduler] Desteklenmeyen doğum tarihi biçimi: ${birthDate}`);
}

/**
 * Doğum ayı (1-12) ve gününe (1-31) göre bir sonraki doğum gününün tarihini hesaplar.
 * Eğer bu yılki doğum günü (ve sabah 09:00 bildirim saati) geçmişse,
 * sonraki yılın doğum gününü döndürür.
 * 29 Şubat artık yıl doğum günlerini artık olmayan yıllarda 28 Şubat olarak yönetir.
 *
 * Contact nesnesi ve legacy string/Date formatları için aşırı yüklemeler (overloads) içerir.
 */
export function getNextBirthday(
  birthMonth: number,
  birthDay: number,
  referenceDate?: Date
): Date;
export function getNextBirthday(
  contact: Contact,
  referenceDate?: Date
): Date;
export function getNextBirthday(
  birthDate: string | Date,
  referenceDate?: Date
): Date;
export function getNextBirthday(
  arg1: number | Contact | string | Date,
  arg2?: number | Date,
  arg3?: Date
): Date {
  let birthMonth: number;
  let birthDay: number;
  let referenceDate: Date;

  if (typeof arg1 === 'number') {
    birthMonth = arg1;
    birthDay = arg2 as number;
    referenceDate = arg3 instanceof Date ? arg3 : new Date();
  } else if (typeof arg1 === 'object' && arg1 !== null && !(arg1 instanceof Date) && 'birth_month' in arg1) {
    const contact = arg1 as Contact;
    birthMonth = contact.birth_month;
    birthDay = contact.birth_day;
    referenceDate = arg2 instanceof Date ? arg2 : new Date();
  } else {
    // string | Date desteği (legacy / geriye dönük uyumluluk)
    const parsed = parseBirthday(arg1 as string | Date);
    birthMonth = parsed.month;
    birthDay = parsed.day;
    referenceDate = arg2 instanceof Date ? arg2 : new Date();
  }

  const getSafeDay = (year: number, m: number, d: number) => {
    if (m === 2 && d === 29) {
      return isLeapYear(year) ? 29 : 28;
    }
    return d;
  };

  const currentYear = referenceDate.getFullYear();
  const safeDayThisYear = getSafeDay(currentYear, birthMonth, birthDay);

  // Bu yılki doğum gününün T-0 saati (sabah 09:00)
  // JS Date'de ay indeksi 0-tabanlıdır: birthMonth - 1
  const birthdayThisYearAt09 = new Date(
    currentYear,
    birthMonth - 1,
    safeDayThisYear,
    9,
    0,
    0,
    0
  );

  // Eğer bugünün referans saati, bu yılın T-0 saatinden ilerideyse sonraki yıla geçilir
  const targetYear =
    referenceDate.getTime() > birthdayThisYearAt09.getTime()
      ? currentYear + 1
      : currentYear;

  const safeDayTargetYear = getSafeDay(targetYear, birthMonth, birthDay);
  return new Date(targetYear, birthMonth - 1, safeDayTargetYear, 0, 0, 0, 0);
}

/**
 * Doğum gününden `daysBefore` gün önce, belirtilen `hour` ve `minute` için
 * tetikleme Date nesnesini üretir.
 */
export function calculateTriggerDate(
  nextBirthday: Date,
  daysBefore: number,
  hour: number,
  minute: number
): Date {
  const trigger = new Date(nextBirthday.getTime());
  trigger.setDate(trigger.getDate() - daysBefore);
  trigger.setHours(hour, minute, 0, 0);
  return trigger;
}

// ---------------------------------------------------------------------------
// Ana Bildirim Yönetim Fonksiyonları (Core Functions)
// ---------------------------------------------------------------------------

/**
 * Bildirim izinlerinin durumunu denetler; verilmemişse kullanıcıdan talep eder.
 * Android için yüksek öncelikli bildirim kanalını (notification channel) yapılandırır.
 *
 * @returns {Promise<boolean>} İzin verilip verilmediği (granted)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationScheduler] Bildirim izni kullanıcı tarafından reddedildi.');
      return false;
    }

    // Android için özel bildirim kanalı tanımlama
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Doğum Günü ve Hediye Hatırlatıcıları',
        description: 'Yakınlarınızın doğum günleri ve hediye hazırlık alarmları',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF5722',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    return true;
  } catch (error) {
    console.error('[NotificationScheduler] İzin alınırken hata oluştu:', error);
    return false;
  }
}

/**
 * Kişinin priority_tier'ına ve hesaplanan sonraki doğum gününe göre ilgili yerel bildirimleri kurar.
 * Bildirim identifier'ları `contactId_T10`, `contactId_T7`, `contactId_T3`, `contactId_T0` formatındadır.
 *
 * Kurallar:
 * 1. Önceden var olan çakışmaları önlemek için önce o kişiye ait mevcut bildirimler temizlenir.
 * 2. Geçmişe dönük tetikleyiciler (trigger tarihi şimdiki zamandan önce olanlar) kurulmaz.
 * 3. Eğer kişinin hediye durumu 'ready' (hediye hazır) ise, T-10, T-7, T-3 ara alarmları atlanır, sadece T-0 kurulur.
 *
 * @param contact Contact tipinde kişi nesnesi (src/types/index.ts)
 * @returns Planlanan bildirim detayları listesi
 */
export async function scheduleContactNotifications(
  contact: Contact
): Promise<ScheduledNotificationResult[]> {
  try {
    if (
      !contact ||
      !contact.id ||
      contact.birth_month == null ||
      contact.birth_day == null ||
      contact.birth_month < 1 ||
      contact.birth_month > 12 ||
      contact.birth_day < 1 ||
      contact.birth_day > 31
    ) {
      console.warn('[NotificationScheduler] Geçersiz kişi nesnesi:', contact);
      return [];
    }

    // 1. Olası mükerrer bildirimleri engellemek için önce mevcut alarmları temizle
    await cancelContactNotifications(contact.id);

    // 2. İzin kontrolü
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn(
        `[NotificationScheduler] ${contact.name} için bildirim kurulamadı: İzin yok.`
      );
      return [];
    }

    // 3. Bir sonraki doğum gününü hesapla (birth_month ve birth_day ile)
    const now = new Date();
    const nextBirthday = getNextBirthday(contact.birth_month, contact.birth_day, now);
    const tier: PriorityTier = normalizeTier(contact.priority_tier);

    // Etkinlik türüne göre metin üreticileri
    const eventType = contact.event_type || 'birthday';
    const eventLabel =
      eventType === 'anniversary' ? 'yıldönümü' : eventType === 'special' ? 'özel günü' : 'doğum günü';
    const eventTitle =
      eventType === 'anniversary' ? 'Yıldönümü' : eventType === 'special' ? 'Özel Gün' : 'Doğum Günü';

    // Özel bildirim saatini ayrıştır (varsayılan: 09:00 / 10:00)
    let customHour = 9;
    let customMinute = 0;
    if (contact.custom_notification_time) {
      const parts = contact.custom_notification_time.split(':');
      if (parts.length >= 2) {
        customHour = parseInt(parts[0], 10) || 9;
        customMinute = parseInt(parts[1], 10) || 0;
      }
    }

    // Özel gün listesi ayrıştırma (Örn: [14, 7, 0])
    let customDays: number[] | null = null;
    if (contact.custom_notification_days) {
      try {
        const parsed = JSON.parse(contact.custom_notification_days);
        if (Array.isArray(parsed) && parsed.length > 0) {
          customDays = parsed.map((n) => Number(n)).filter((n) => !isNaN(n));
        }
      } catch (e) {
        // Hatalı JSON ise varsayılan matrise dön
      }
    }

    // Kuralları belirle: Kişiye özel varsa dinamik oluştur, yoksa matrisi kullan
    let rules: NotificationRule[];
    if (customDays && customDays.length > 0) {
      rules = customDays.map((days) => ({
        type: `T${days}` as ReminderType,
        daysBefore: days,
        hour: customHour,
        minute: customMinute,
        title: days === 0 ? eventTitle : `${eventTitle} Hatırlatıcısı`,
        getBody: (name: string) =>
          days === 0
            ? `Bugün ${getTurkishPossessive(name)} ${eventLabel}! Kutlamayı unutma.`
            : `${getTurkishPossessive(name)} ${eventLabel}ne ${days} gün kaldı. Hazırlık yapmayı unutma.`,
        isGiftReminder: days > 0,
      }));
    } else {
      // Varsayılan matris
      rules = NOTIFICATION_MATRIX[tier] || NOTIFICATION_MATRIX[3];
      if (eventType !== 'birthday') {
        rules = rules.map((r) => ({
          ...r,
          title: r.daysBefore === 0 ? eventTitle : `${eventTitle} Hatırlatıcısı`,
          getBody: (name: string) =>
            r.daysBefore === 0
              ? `Bugün ${getTurkishPossessive(name)} ${eventLabel}!`
              : `${getTurkishPossessive(name)} ${eventLabel}ne ${r.daysBefore} gün kaldı.`,
        }));
      }
    }

    const scheduledResults: ScheduledNotificationResult[] = [];

    for (const rule of rules) {
      // Eğer kişi için hediye takibi kapalıysa (buy_gift === 0), tüm hediye alarmlarını atla, sadece doğum gününü kur
      if (contact.buy_gift === 0 && rule.isGiftReminder) {
        continue;
      }

      // Eğer hediye durumu 'ready' ise, ara hediye bildirimlerini kurma
      const isGiftReady =
        contact.gift_status === 'ready' || (contact as any).giftStatus === 'ready';
      if (isGiftReady && rule.isGiftReminder) {
        continue;
      }

      // Tetiklenme zamanını hesapla
      const triggerDate = calculateTriggerDate(
        nextBirthday,
        rule.daysBefore,
        rule.hour,
        rule.minute
      );

      // Geçmiş zamana ait bildirim kurulmaz
      if (triggerDate.getTime() <= now.getTime()) {
        continue;
      }

      // İstenen identifier formatı: contactId_T10, contactId_T3, contactId_T0 vb.
      const identifier = `${contact.id}_${rule.type}`;
      const title = rule.title;
      const body = rule.getBody(contact.name);

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android'
            ? { channelId: NOTIFICATION_CHANNEL_ID }
            : {}),
          data: {
            contactId: contact.id,
            contactName: contact.name,
            priority_tier: tier,
            tier,
            type: rule.type,
            daysBefore: rule.daysBefore,
            targetBirthday: nextBirthday.toISOString(),
            isGiftReminder: rule.isGiftReminder,
            gift_status: contact.gift_status,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        } as unknown as Notifications.DateTriggerInput,
      });

      scheduledResults.push({
        identifier,
        triggerDate,
        daysBefore: rule.daysBefore,
        type: rule.type,
        title,
        body,
      });
    }

    return scheduledResults;
  } catch (error) {
    console.error(
      `[NotificationScheduler] ${contact.name} bildirimleri planlanırken hata:`,
      error
    );
    throw error;
  }
}

/**
 * Kişiye ait planlanmış tüm alarmları siler.
 * Hem bilinen identifier listesini hem de `contactId_` ön eki taşıyan
 * tüm bekleyen bildirimleri iptal eder.
 *
 * @param contactId Kişi ID'si
 */
export async function cancelContactNotifications(
  contactId: string
): Promise<void> {
  try {
    if (!contactId) return;

    // 1. Bilinen standart formatlardaki ID'leri doğrudan iptal et
    const standardIdentifiers: ReminderType[] = ['T10', 'T7', 'T3', 'T0'];
    await Promise.all(
      standardIdentifiers.map((type) =>
        Notifications.cancelScheduledNotificationAsync(`${contactId}_${type}`).catch(
          () => {}
        )
      )
    );

    // 2. Cihazdaki tüm bekleyen bildirimleri tara ve bu kişiye ait olanları temizle
    const allPending = await Notifications.getAllScheduledNotificationsAsync();
    const matchingNotifications = allPending.filter((n: any) => {
      const matchPrefix = n.identifier?.startsWith(`${contactId}_`);
      const matchData =
        n.content &&
        n.content.data &&
        (n.content.data as Record<string, unknown>).contactId === contactId;
      return matchPrefix || matchData;
    });

    await Promise.all(
      matchingNotifications.map((n: any) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})
      )
    );
  } catch (error) {
    console.error(
      `[NotificationScheduler] ${contactId} bildirimleri silinirken hata:`,
      error
    );
    throw error;
  }
}

/**
 * Hediye durumu güncellendiğinde tetiklenir.
 * Eğer durum 'ready' (hediye alındı/hazır) yapılırsa, T-10, T-7 ve T-3 ara bildirimlerini siler,
 * sadece T-0 günü kutlama bildirimini korur.
 *
 * @param contactId Kişi ID'si
 * @param status Yeni hediye durumu ('ready' | 'searching' | 'not_started')
 * @param contact (Opsiyonel) Durum 'ready' dışına çıkarıldığında bildirimleri yeniden kurmak için Contact nesnesi
 */
export async function onGiftStatusChanged(
  contactId: string,
  status: GiftStatus,
  contact?: Contact
): Promise<void> {
  try {
    if (!contactId) return;

    if (status === 'ready') {
      // Ara hediye hatırlatma bildirimleri (T-10, T-7, T-3)
      const intermediateIdentifiers = [
        `${contactId}_T10`,
        `${contactId}_T7`,
        `${contactId}_T3`,
      ];

      // Doğrudan hedef bildirimleri sil
      await Promise.all(
        intermediateIdentifiers.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
        )
      );

      // Ek koruma: Bekleyen bildirimler taranır, bu contact'e ait ve T0 OLMAYANLAR silinir
      const allPending = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = allPending.filter((item: any) => {
        const belongsToContact =
          item.identifier?.startsWith(`${contactId}_`) ||
          item.content?.data?.contactId === contactId;

        const isT0 =
          item.identifier?.endsWith('_T0') || item.content?.data?.type === 'T0';

        return belongsToContact && !isT0;
      });

      await Promise.all(
        toCancel.map((item: any) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier).catch(
            () => {}
          )
        )
      );

      console.log(
        `[NotificationScheduler] Kişi (${contactId}) hediyesi hazırlandı. Ara bildirimler iptal edildi, T-0 korundu.`
      );
    } else if (contact) {
      // Eğer hediye durumu 'ready' dışına alındıysa ve contact verildiyse tüm alarmları yeniden planla
      await scheduleContactNotifications(contact);
    }
  } catch (error) {
    console.error(
      `[NotificationScheduler] onGiftStatusChanged (${contactId}) hatası:`,
      error
    );
    throw error;
  }
}

/**
 * Cihazda kurulu bekleyen bildirimlerin dökümünü verir (Debug ve Denetim için).
 * Hem geliştirici konsoluna anlaşılır bir tablo yazar hem de yapılandırılmış döküm nesnelerini döner.
 *
 * @returns {Promise<PendingNotificationSummary[]>} Bekleyen bildirimlerin özeti
 */
export async function getAllPendingNotifications(): Promise<
  PendingNotificationSummary[]
> {
  try {
    const rawList = await Notifications.getAllScheduledNotificationsAsync();

    const summaries: PendingNotificationSummary[] = rawList.map((item: any) => {
      let triggerDate: Date | null = null;
      const trigger = item.trigger as any;

      if (trigger) {
        if (trigger.date) {
          triggerDate = new Date(trigger.date);
        } else if (typeof trigger.value === 'number') {
          triggerDate = new Date(trigger.value);
        } else if (trigger instanceof Date) {
          triggerDate = trigger;
        } else if (typeof trigger === 'number') {
          triggerDate = new Date(trigger);
        }
      }

      const data = (item.content?.data || {}) as Record<string, unknown>;

      // Identifier'dan fallback çıkarım
      let contactId = data.contactId as string | undefined;
      let reminderType = data.type as ReminderType | undefined;

      if (!contactId && item.identifier?.includes('_T')) {
        const parts = item.identifier.split('_T');
        contactId = parts[0];
        reminderType = `T${parts[1]}` as ReminderType;
      }

      const rawTier = data.priority_tier ?? data.tier;
      const priorityTier = rawTier != null ? normalizeTier(rawTier as any) : undefined;

      return {
        identifier: item.identifier,
        title: item.content?.title ?? null,
        body: item.content?.body ?? null,
        triggerDate,
        triggerDateFormatted: triggerDate
          ? triggerDate.toLocaleString('tr-TR')
          : 'Belirsiz',
        contactId,
        type: reminderType,
        priority_tier: priorityTier,
        tier: priorityTier,
        data,
        raw: item,
      };
    });

    // Debug amaçlı konsol dökümü
    console.log(
      `\n================ [NotificationScheduler DEBUG] ================`
    );
    console.log(`Cihazda Bekleyen Bildirim Sayısı: ${summaries.length}`);

    if (summaries.length > 0 && typeof console.table === 'function') {
      console.table(
        summaries.map((s) => ({
          Identifier: s.identifier,
          'Kişi ID': s.contactId || 'N/A',
          Tip: s.type || 'N/A',
          'Öncelik Kademesi': s.priority_tier ?? s.tier ?? 'N/A',
          'Tetiklenme Zamanı': s.triggerDateFormatted,
          Başlık: s.title,
          Mesaj: s.body,
        }))
      );
    } else if (summaries.length === 0) {
      console.log('Şu an bekleyen herhangi bir bildirim bulunmuyor.');
    }
    console.log(
      `=================================================================\n`
    );

    return summaries;
  } catch (error) {
    console.error(
      '[NotificationScheduler] Bekleyen bildirimler alınırken hata:',
      error
    );
    throw error;
  }
}

/**
 * Toplu senkronizasyon: Birden fazla kişiyi tek seferde planlar.
 * Uygulama açılışında veya arka plan görevinde (Background Fetch) çalıştırılmak için uygundur.
 */
export async function syncAllContactsNotifications(
  contacts: Contact[]
): Promise<Record<string, ScheduledNotificationResult[]>> {
  const results: Record<string, ScheduledNotificationResult[]> = {};

  for (const contact of contacts) {
    try {
      results[contact.id] = await scheduleContactNotifications(contact);
    } catch (err) {
      console.error(
        `[NotificationScheduler] Toplu senkronizasyonda ${contact.name} için hata:`,
        err
      );
    }
  }

  return results;
}

/**
 * Cihazdaki tüm planlanmış bildirimleri sıfırlar (Debug ve testler için yararlıdır).
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[NotificationScheduler] Cihazdaki tüm bekleyen bildirimler temizlendi.');
}
