import * as Calendar from 'expo-calendar';
import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import { PriorityTier } from '../types';
import { extractNameFromEventTitle } from '../utils/calendarUtils';

export { extractNameFromEventTitle };

export interface ImportedBirthdayCandidate {
  id: string;
  name: string;
  birthMonth: number; // 1 - 12
  birthDay: number;   // 1 - 31
  birthYear: number | null;
  source: 'calendar' | 'contacts' | 'both';
  isAlreadyInDb: boolean;
  existingContactId?: string;
  selectedPriorityTier: PriorityTier;
  selected: boolean;
}

export interface PermissionStatusResult {
  calendarGranted: boolean;
  contactsGranted: boolean;
}

/**
 * Cihazın takvim ve rehber izinlerini sorgular ve talep eder.
 */
export async function requestImportPermissions(): Promise<PermissionStatusResult> {
  let calendarGranted = false;
  let contactsGranted = false;

  try {
    const calStatus = await Calendar.requestCalendarPermissionsAsync();
    calendarGranted = calStatus.status === 'granted';
  } catch (err) {
    console.warn('[CalendarImport] Takvim izni alınamadı:', err);
  }

  try {
    const contactStatus = await Contacts.requestPermissionsAsync();
    contactsGranted = contactStatus.status === 'granted';
  } catch (err) {
    console.warn('[CalendarImport] Rehber izni alınamadı:', err);
  }

  return { calendarGranted, contactsGranted };
}



/**
 * Telefon rehberindeki kayıtlı doğum günlerini tarar.
 */
export async function scanContactsBirthdays(): Promise<Omit<ImportedBirthdayCandidate, 'isAlreadyInDb' | 'selected' | 'selectedPriorityTier'>[]> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') return [];

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.Birthday],
    });

    if (!data || data.length === 0) return [];

    const results: Omit<ImportedBirthdayCandidate, 'isAlreadyInDb' | 'selected' | 'selectedPriorityTier'>[] = [];

    for (const contact of data) {
      if (!contact.name || !contact.birthday) continue;

      const bday: any = contact.birthday;
      let month: number | null = null;
      let day: number | null = null;
      let year: number | null = null;

      if (bday && typeof bday.month === 'number' && typeof bday.day === 'number') {
        // expo-contacts bazı platformlarda 0-indexli, bazılarında 1-indexli dönebilir.
        // Genellikle JS Date standardında 0-11, ancak bazen 1-12 olabilir.
        month = bday.month === 0 ? 1 : bday.month;
        day = bday.day;
        year = bday.year ?? null;
      } else if (bday && typeof bday.date === 'string') {
        const d = new Date(bday.date);
        if (!isNaN(d.getTime())) {
          month = d.getMonth() + 1;
          day = d.getDate();
          year = d.getFullYear() > 1900 && d.getFullYear() <= new Date().getFullYear() ? d.getFullYear() : null;
        }
      }

      if (month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        results.push({
          id: `contact_${contact.id || Math.random().toString(36).substring(2, 9)}`,
          name: contact.name.trim(),
          birthMonth: month,
          birthDay: day,
          birthYear: year,
          source: 'contacts',
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('[CalendarImport] Rehber taranırken hata:', err);
    return [];
  }
}

/**
 * Cihaz takvimindeki doğum günü etkinliklerini tarar.
 */
export async function scanCalendarBirthdays(): Promise<Omit<ImportedBirthdayCandidate, 'isAlreadyInDb' | 'selected' | 'selectedPriorityTier'>[]> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    if (status !== 'granted') return [];

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (!calendars || calendars.length === 0) return [];

    // Özellikle "birthdays", "doğum günleri", "contacts" takvimlerini ve genel takvimleri tespit et
    const targetCalendarIds: string[] = [];
    for (const cal of calendars) {
      const titleLower = (cal.title || '').toLowerCase();
      const nameLower = (cal.name || '').toLowerCase();
      if (
        titleLower.includes('birthday') ||
        titleLower.includes('doğum') ||
        nameLower.includes('birthday') ||
        nameLower.includes('doğum') ||
        cal.isPrimary
      ) {
        targetCalendarIds.push(cal.id);
      }
    }

    // Eğer özel takvim bulunamazsa tüm takvimleri tara
    const idsToSearch = targetCalendarIds.length > 0 ? targetCalendarIds : calendars.map((c) => c.id);

    // Tüm bir yıllık aralığı tara (mevcut yılın 1 Ocağı ile 31 Aralığı)
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1, 0, 0, 0);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    const rawEvents = await Calendar.getEventsAsync(idsToSearch, startDate, endDate);
    if (!rawEvents || rawEvents.length === 0) return [];

    const results: Omit<ImportedBirthdayCandidate, 'isAlreadyInDb' | 'selected' | 'selectedPriorityTier'>[] = [];

    for (const evt of rawEvents) {
      const title = evt.title || '';
      const titleLower = title.toLowerCase();

      // Etkinliğin doğum günü olup olmadığını anla
      const isBirthdayEvent =
        titleLower.includes('doğum günü') ||
        titleLower.includes('birthday') ||
        (evt.notes && evt.notes.toLowerCase().includes('birthday')) ||
        (evt.recurrenceRule && evt.recurrenceRule.frequency === Calendar.Frequency.YEARLY);

      if (!isBirthdayEvent) continue;

      const eventDate = new Date(evt.startDate);
      if (isNaN(eventDate.getTime())) continue;

      const birthMonth = eventDate.getMonth() + 1;
      const birthDay = eventDate.getDate();
      const extractedName = extractNameFromEventTitle(title);

      results.push({
        id: `cal_${evt.id || Math.random().toString(36).substring(2, 9)}`,
        name: extractedName,
        birthMonth,
        birthDay,
        birthYear: null, // Takvim etkinliklerinde doğum yılı genelde etkinlik başlangıç yılıdır, null bırakıp kullanıcıya bırakmak daha güvenlidir
        source: 'calendar',
      });
    }

    return results;
  } catch (err) {
    console.warn('[CalendarImport] Takvim taranırken hata:', err);
    return [];
  }
}

/**
 * Hem takvim hem rehber kaynaklarını birleştirir, mükerrerleri tekilleştirir
 * ve mevcut kayıtlı kişilerle karşılaştırarak tam aday listesini döndürür.
 */
export async function getConsolidatedBirthdayCandidates(
  existingContacts: { id: string; name: string; birth_month: number; birth_day: number }[]
): Promise<ImportedBirthdayCandidate[]> {
  const [calItems, contactItems] = await Promise.all([
    scanCalendarBirthdays(),
    scanContactsBirthdays(),
  ]);

  const candidateMap = new Map<string, Omit<ImportedBirthdayCandidate, 'isAlreadyInDb' | 'selected' | 'selectedPriorityTier'>>();

  // 1. Önce rehber kişilerini ekle (Rehberde doğum yılı bilgisi daha güvenilirdir)
  for (const item of contactItems) {
    const key = `${item.name.toLowerCase().trim()}_${item.birthMonth}_${item.birthDay}`;
    candidateMap.set(key, item);
  }

  // 2. Takvim etkinliklerini birleştir
  for (const item of calItems) {
    const key = `${item.name.toLowerCase().trim()}_${item.birthMonth}_${item.birthDay}`;
    const existing = candidateMap.get(key);
    if (existing) {
      existing.source = 'both';
    } else {
      candidateMap.set(key, item);
    }
  }

  // 3. Mevcut veritabanındaki kişilerle kıyasla
  const existingKeysMap = new Map<string, string>(); // key -> contactId
  for (const c of existingContacts) {
    const key = `${c.name.toLowerCase().trim()}_${c.birth_month}_${c.birth_day}`;
    existingKeysMap.set(key, c.id);
    // İsim benzerliği için de ad kontrolü
    existingKeysMap.set(c.name.toLowerCase().trim(), c.id);
  }

  const output: ImportedBirthdayCandidate[] = [];

  for (const item of candidateMap.values()) {
    const exactKey = `${item.name.toLowerCase().trim()}_${item.birthMonth}_${item.birthDay}`;
    const nameOnlyKey = item.name.toLowerCase().trim();

    const existingId = existingKeysMap.get(exactKey) || existingKeysMap.get(nameOnlyKey);
    const isAlreadyInDb = !!existingId;

    output.push({
      ...item,
      isAlreadyInDb,
      existingContactId: existingId,
      selectedPriorityTier: 2, // Varsayılan: Arkadaş
      selected: !isAlreadyInDb, // Zaten kayıtlı olanlar varsayılan olarak seçili gelmez
    });
  }

  // Alfabetik sırala
  output.sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));

  return output;
}
