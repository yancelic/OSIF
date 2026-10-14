import * as SQLite from 'expo-sqlite';
import {
  Contact,
  GiftTag,
  GiftHistoryItem,
  CreateContactInput,
  UpdateContactInput,
  CreateGiftTagInput,
  CreateGiftHistoryInput,
  ContactWithDetails,
  GiftStatus,
  EventType,
} from './types';
import { calculateBirthdayDetails, validateBirthDate } from './utils/birthday';
import { generateId } from './utils/id';
import { getZodiacSign } from './utils/astrology';

const DATABASE_NAME = 'birthdays.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Yerel takvim gününü YYYY-MM-DD olarak biçimlendirir.
 */
function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Singleton SQLite veritabanı bağlantısı sağlar.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await configurePragmas(dbInstance);
  }
  return dbInstance;
}

/**
 * SQLite PRAGMA ayarlarını konfigüre eder.
 */
async function configurePragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);
}

/**
 * Veritabanı tablolarını, performans index'lerini ve geriye dönük migration'ları başlatır.
 */
export async function initDatabase(customDb?: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> {
  const db = customDb || (await getDatabase());
  await configurePragmas(db);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      birth_month INTEGER NOT NULL CHECK (birth_month >= 1 AND birth_month <= 12),
      birth_day INTEGER NOT NULL CHECK (birth_day >= 1 AND birth_day <= 31),
      birth_year INTEGER,
      priority_tier INTEGER NOT NULL CHECK (priority_tier IN (1, 2, 3)),
      gift_status TEXT NOT NULL CHECK (gift_status IN ('not_started', 'searching', 'ready')),
      clothing_size TEXT,
      shoe_size TEXT,
      notes TEXT,
      event_type TEXT DEFAULT 'birthday',
      target_budget REAL,
      spent_amount REAL,
      custom_notification_days TEXT,
      custom_notification_time TEXT
    );

    CREATE TABLE IF NOT EXISTS gift_tags (
      id TEXT PRIMARY KEY NOT NULL,
      contact_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('like', 'dislike', 'wishlist_item')),
      title TEXT NOT NULL,
      url TEXT,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gift_history (
      id TEXT PRIMARY KEY NOT NULL,
      contact_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      title TEXT NOT NULL,
      price REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_birthday ON contacts(birth_month, birth_day);
    CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority_tier);
    CREATE INDEX IF NOT EXISTS idx_gift_tags_contact_id ON gift_tags(contact_id);
    CREATE INDEX IF NOT EXISTS idx_gift_history_contact_id ON gift_history(contact_id);
  `);

  // Migration: Var olan contacts tablosuna yeni sütunları güvenli şekilde ekle
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(contacts)');
    const columnNames = new Set(tableInfo.map((col) => col.name));

    if (!columnNames.has('event_type')) {
      await db.execAsync("ALTER TABLE contacts ADD COLUMN event_type TEXT DEFAULT 'birthday'");
    }
    if (!columnNames.has('target_budget')) {
      await db.execAsync('ALTER TABLE contacts ADD COLUMN target_budget REAL');
    }
    if (!columnNames.has('spent_amount')) {
      await db.execAsync('ALTER TABLE contacts ADD COLUMN spent_amount REAL');
    }
    if (!columnNames.has('custom_notification_days')) {
      await db.execAsync('ALTER TABLE contacts ADD COLUMN custom_notification_days TEXT');
    }
    if (!columnNames.has('custom_notification_time')) {
      await db.execAsync('ALTER TABLE contacts ADD COLUMN custom_notification_time TEXT');
    }
  } catch (err) {
    // Migration hatası olursa sessizce logla
    console.warn('Migration kontrolü sırasında uyarı:', err);
  }

  return db;
}

/**
 * Tüm kişileri yaklaşan doğum gününe göre sıralı getirir.
 */
export async function getAllContactsSortedByUpcoming(
  fromDate: Date = new Date()
): Promise<ContactWithDetails[]> {
  const db = await getDatabase();
  await initDatabase(db);

  // 1. Tüm kişileri çek
  const contacts = await db.getAllAsync<Contact>('SELECT * FROM contacts');
  if (contacts.length === 0) {
    return [];
  }

  // 2. Tüm etiketleri çekip map'le
  const tags = await db.getAllAsync<GiftTag>('SELECT * FROM gift_tags');
  const tagsByContactId = new Map<string, GiftTag[]>();
  for (const tag of tags) {
    const list = tagsByContactId.get(tag.contact_id) ?? [];
    list.push(tag);
    tagsByContactId.set(tag.contact_id, list);
  }

  // 3. Tüm geçmiş hediyeleri çekip map'le
  const historyItems = await db.getAllAsync<GiftHistoryItem>('SELECT * FROM gift_history ORDER BY year DESC');
  const historyByContactId = new Map<string, GiftHistoryItem[]>();
  for (const item of historyItems) {
    const list = historyByContactId.get(item.contact_id) ?? [];
    list.push(item);
    historyByContactId.set(item.contact_id, list);
  }

  // 4. Matematiksel hesaplama ve burç bilgileri ile zenginleştir
  const enrichedContacts: ContactWithDetails[] = contacts.map((c) => {
    const details = calculateBirthdayDetails(c.birth_month, c.birth_day, c.birth_year, fromDate);
    const dateFormatted = toLocalISODate(details.nextBirthdayDate);
    const zodiac = getZodiacSign(c.birth_day, c.birth_month);

    return {
      ...c,
      event_type: c.event_type || 'birthday',
      target_budget: c.target_budget ?? null,
      spent_amount: c.spent_amount ?? null,
      custom_notification_days: c.custom_notification_days ?? null,
      custom_notification_time: c.custom_notification_time ?? null,
      gift_tags: tagsByContactId.get(c.id) ?? [],
      gift_history: historyByContactId.get(c.id) ?? [],
      days_until_next_birthday: details.daysUntilNextBirthday,
      upcoming_age: details.upcomingAge,
      next_birthday_date: dateFormatted,
      zodiac_sign: zodiac,
    };
  });

  // 5. Sıralama algoritması
  enrichedContacts.sort((a, b) => {
    if (a.days_until_next_birthday !== b.days_until_next_birthday) {
      return a.days_until_next_birthday - b.days_until_next_birthday;
    }
    if (a.priority_tier !== b.priority_tier) {
      return a.priority_tier - b.priority_tier;
    }
    return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
  });

  return enrichedContacts;
}

/**
 * ID'ye göre tekil kişi ve detaylarını getirir.
 */
export async function getContactById(
  id: string,
  fromDate: Date = new Date()
): Promise<ContactWithDetails | null> {
  const db = await getDatabase();
  await initDatabase(db);

  const contact = await db.getFirstAsync<Contact>(
    'SELECT * FROM contacts WHERE id = ?',
    [id]
  );

  if (!contact) {
    return null;
  }

  const tags = await db.getAllAsync<GiftTag>(
    'SELECT * FROM gift_tags WHERE contact_id = ?',
    [id]
  );

  const history = await db.getAllAsync<GiftHistoryItem>(
    'SELECT * FROM gift_history WHERE contact_id = ? ORDER BY year DESC',
    [id]
  );

  const details = calculateBirthdayDetails(contact.birth_month, contact.birth_day, contact.birth_year, fromDate);
  const zodiac = getZodiacSign(contact.birth_day, contact.birth_month);

  return {
    ...contact,
    event_type: contact.event_type || 'birthday',
    target_budget: contact.target_budget ?? null,
    spent_amount: contact.spent_amount ?? null,
    custom_notification_days: contact.custom_notification_days ?? null,
    custom_notification_time: contact.custom_notification_time ?? null,
    gift_tags: tags,
    gift_history: history,
    days_until_next_birthday: details.daysUntilNextBirthday,
    upcoming_age: details.upcomingAge,
    next_birthday_date: toLocalISODate(details.nextBirthdayDate),
    zodiac_sign: zodiac,
  };
}

/**
 * Dahili kişi ve etiket ekleme yardımcısı.
 */
async function insertContactInternal(
  db: SQLite.SQLiteDatabase,
  data: CreateContactInput
): Promise<Contact & { gift_tags: GiftTag[] }> {
  validateBirthDate(data.birth_month, data.birth_day, data.birth_year);

  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Kişi adı boş olamaz.');
  }

  if (![1, 2, 3].includes(data.priority_tier)) {
    throw new Error(`Geçersiz öncelik kademesi: ${data.priority_tier}. 1, 2 veya 3 olmalıdır.`);
  }

  const giftStatus: GiftStatus = data.gift_status ?? 'not_started';
  if (!['not_started', 'searching', 'ready'].includes(giftStatus)) {
    throw new Error(`Geçersiz hediye durumu: ${giftStatus}`);
  }

  const eventType: EventType = data.event_type ?? 'birthday';
  const contactId = data.id || generateId();

  await db.runAsync(
    `INSERT INTO contacts (
      id, name, birth_month, birth_day, birth_year, priority_tier, gift_status, clothing_size, shoe_size, notes,
      event_type, target_budget, spent_amount, custom_notification_days, custom_notification_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contactId,
      data.name.trim(),
      data.birth_month,
      data.birth_day,
      data.birth_year ?? null,
      data.priority_tier,
      giftStatus,
      data.clothing_size ?? null,
      data.shoe_size ?? null,
      data.notes ?? null,
      eventType,
      data.target_budget ?? null,
      data.spent_amount ?? null,
      data.custom_notification_days ?? null,
      data.custom_notification_time ?? null,
    ]
  );

  const savedTags: GiftTag[] = [];
  if (data.gift_tags && data.gift_tags.length > 0) {
    for (const tagInput of data.gift_tags) {
      if (!tagInput.title || tagInput.title.trim().length === 0) {
        continue;
      }
      const tagId = tagInput.id || generateId();
      await db.runAsync(
        `INSERT INTO gift_tags (id, contact_id, type, title, url) VALUES (?, ?, ?, ?, ?)`,
        [tagId, contactId, tagInput.type, tagInput.title.trim(), tagInput.url ?? null]
      );
      savedTags.push({
        id: tagId,
        contact_id: contactId,
        type: tagInput.type,
        title: tagInput.title.trim(),
        url: tagInput.url ?? null,
      });
    }
  }

  return {
    id: contactId,
    name: data.name.trim(),
    birth_month: data.birth_month,
    birth_day: data.birth_day,
    birth_year: data.birth_year ?? null,
    priority_tier: data.priority_tier,
    gift_status: giftStatus,
    clothing_size: data.clothing_size ?? null,
    shoe_size: data.shoe_size ?? null,
    notes: data.notes ?? null,
    event_type: eventType,
    target_budget: data.target_budget ?? null,
    spent_amount: data.spent_amount ?? null,
    custom_notification_days: data.custom_notification_days ?? null,
    custom_notification_time: data.custom_notification_time ?? null,
    gift_tags: savedTags,
  };
}

/**
 * Yeni bir kişi oluşturur.
 */
export async function createContact(
  data: CreateContactInput
): Promise<Contact & { gift_tags: GiftTag[] }> {
  const db = await getDatabase();
  await initDatabase(db);
  let createdResult: (Contact & { gift_tags: GiftTag[] }) | null = null;

  await db.withTransactionAsync(async () => {
    createdResult = await insertContactInternal(db, data);
  });

  return createdResult!;
}

/**
 * Mevcut bir kişiyi günceller.
 */
export async function updateContact(
  id: string,
  data: UpdateContactInput
): Promise<Contact> {
  const db = await getDatabase();
  await initDatabase(db);

  const existing = await db.getFirstAsync<Contact>(
    'SELECT * FROM contacts WHERE id = ?',
    [id]
  );

  if (!existing) {
    throw new Error(`Güncellenecek kişi bulunamadı (ID: ${id})`);
  }

  const targetMonth = data.birth_month ?? existing.birth_month;
  const targetDay = data.birth_day ?? existing.birth_day;
  const targetYear = data.birth_year !== undefined ? data.birth_year : existing.birth_year;
  validateBirthDate(targetMonth, targetDay, targetYear);

  if (data.priority_tier !== undefined && ![1, 2, 3].includes(data.priority_tier)) {
    throw new Error(`Geçersiz öncelik kademesi: ${data.priority_tier}`);
  }

  if (data.gift_status !== undefined && !['not_started', 'searching', 'ready'].includes(data.gift_status)) {
    throw new Error(`Geçersiz hediye durumu: ${data.gift_status}`);
  }

  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.birth_month !== undefined) {
    fields.push('birth_month = ?');
    params.push(data.birth_month);
  }
  if (data.birth_day !== undefined) {
    fields.push('birth_day = ?');
    params.push(data.birth_day);
  }
  if (data.birth_year !== undefined) {
    fields.push('birth_year = ?');
    params.push(data.birth_year);
  }
  if (data.priority_tier !== undefined) {
    fields.push('priority_tier = ?');
    params.push(data.priority_tier);
  }
  if (data.gift_status !== undefined) {
    fields.push('gift_status = ?');
    params.push(data.gift_status);
  }
  if (data.clothing_size !== undefined) {
    fields.push('clothing_size = ?');
    params.push(data.clothing_size);
  }
  if (data.shoe_size !== undefined) {
    fields.push('shoe_size = ?');
    params.push(data.shoe_size);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    params.push(data.notes);
  }
  if (data.event_type !== undefined) {
    fields.push('event_type = ?');
    params.push(data.event_type);
  }
  if (data.target_budget !== undefined) {
    fields.push('target_budget = ?');
    params.push(data.target_budget);
  }
  if (data.spent_amount !== undefined) {
    fields.push('spent_amount = ?');
    params.push(data.spent_amount);
  }
  if (data.custom_notification_days !== undefined) {
    fields.push('custom_notification_days = ?');
    params.push(data.custom_notification_days);
  }
  if (data.custom_notification_time !== undefined) {
    fields.push('custom_notification_time = ?');
    params.push(data.custom_notification_time);
  }

  if (fields.length > 0) {
    params.push(id);
    await db.runAsync(
      `UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
  }

  const updated = await db.getFirstAsync<Contact>(
    'SELECT * FROM contacts WHERE id = ?',
    [id]
  );

  return updated!;
}

/**
 * Kişiyi siler. Foreign key CASCADE sayesinde bağlı hediye etiketleri ve geçmişi de otomatik silinir.
 */
export async function deleteContact(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM contacts WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Kişinin hediye durumunu günceller.
 */
export async function updateGiftStatus(
  contactId: string,
  status: GiftStatus
): Promise<boolean> {
  if (!['not_started', 'searching', 'ready'].includes(status)) {
    throw new Error(`Geçersiz hediye durumu: ${status}`);
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE contacts SET gift_status = ? WHERE id = ?',
    [status, contactId]
  );

  return result.changes > 0;
}

/**
 * Kişiye yeni bir hediye etiketi ekler.
 */
export async function addGiftTag(
  contactId: string,
  tag: Omit<CreateGiftTagInput, 'contact_id'>
): Promise<GiftTag> {
  const db = await getDatabase();
  await initDatabase(db);

  const contact = await db.getFirstAsync<Contact>(
    'SELECT id FROM contacts WHERE id = ?',
    [contactId]
  );

  if (!contact) {
    throw new Error(`Etiket eklenecek kişi bulunamadı (ID: ${contactId})`);
  }

  if (!tag.title || tag.title.trim().length === 0) {
    throw new Error('Etiket başlığı boş olamaz.');
  }

  if (!['like', 'dislike', 'wishlist_item'].includes(tag.type)) {
    throw new Error(`Geçersiz etiket tipi: ${tag.type}`);
  }

  const tagId = tag.id || generateId();
  await db.runAsync(
    `INSERT INTO gift_tags (id, contact_id, type, title, url) VALUES (?, ?, ?, ?, ?)`,
    [tagId, contactId, tag.type, tag.title.trim(), tag.url ?? null]
  );

  return {
    id: tagId,
    contact_id: contactId,
    type: tag.type,
    title: tag.title.trim(),
    url: tag.url ?? null,
  };
}

/**
 * Etiket siler.
 */
export async function removeGiftTag(tagId: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM gift_tags WHERE id = ?', [tagId]);
  return result.changes > 0;
}

/**
 * Kişiye geçmiş yıl hediyesi ekler.
 */
export async function addGiftHistory(
  contactId: string,
  item: CreateGiftHistoryInput
): Promise<GiftHistoryItem> {
  const db = await getDatabase();
  await initDatabase(db);

  if (!item.title || item.title.trim().length === 0) {
    throw new Error('Hediye başlığı boş olamaz.');
  }

  const id = item.id || generateId();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO gift_history (id, contact_id, year, title, price, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, contactId, item.year, item.title.trim(), item.price ?? null, item.notes ?? null, createdAt]
  );

  return {
    id,
    contact_id: contactId,
    year: item.year,
    title: item.title.trim(),
    price: item.price ?? null,
    notes: item.notes ?? null,
    created_at: createdAt,
  };
}

/**
 * Geçmiş yıl hediyesini siler.
 */
export async function deleteGiftHistory(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM gift_history WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Veritabanının tamamını (Kişiler, Etiketler, Geçmiş) JSON olarak dışa aktarır.
 */
export async function exportFullDatabaseJSON(): Promise<string> {
  const db = await getDatabase();
  await initDatabase(db);

  const contacts = await db.getAllAsync<Contact>('SELECT * FROM contacts');
  const tags = await db.getAllAsync<GiftTag>('SELECT * FROM gift_tags');
  const history = await db.getAllAsync<GiftHistoryItem>('SELECT * FROM gift_history');

  const exportPayload = {
    version: '1.1.0',
    exportedAt: new Date().toISOString(),
    contacts,
    gift_tags: tags,
    gift_history: history,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * JSON formatındaki yedeği veritabanına aktarır (mevcutları koruyarak veya birleştirerek).
 */
export async function importFullDatabaseJSON(jsonString: string): Promise<{ contactsCount: number }> {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !Array.isArray(parsed.contacts)) {
    throw new Error('Geçersiz yedek dosyası: contacts dizisi bulunamadı.');
  }

  const db = await getDatabase();
  await initDatabase(db);

  let insertedCount = 0;

  await db.withTransactionAsync(async () => {
    for (const c of parsed.contacts) {
      if (!c.id || !c.name || !c.birth_month || !c.birth_day) continue;

      // Zaten var mı kontrol et
      const existing = await db.getFirstAsync<Contact>('SELECT id FROM contacts WHERE id = ?', [c.id]);
      if (existing) {
        await updateContact(c.id, {
          name: c.name,
          birth_month: c.birth_month,
          birth_day: c.birth_day,
          birth_year: c.birth_year,
          priority_tier: c.priority_tier,
          gift_status: c.gift_status,
          clothing_size: c.clothing_size,
          shoe_size: c.shoe_size,
          notes: c.notes,
          event_type: c.event_type,
          target_budget: c.target_budget,
          spent_amount: c.spent_amount,
          custom_notification_days: c.custom_notification_days,
          custom_notification_time: c.custom_notification_time,
        });
      } else {
        await db.runAsync(
          `INSERT INTO contacts (
            id, name, birth_month, birth_day, birth_year, priority_tier, gift_status, clothing_size, shoe_size, notes,
            event_type, target_budget, spent_amount, custom_notification_days, custom_notification_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id,
            c.name,
            c.birth_month,
            c.birth_day,
            c.birth_year ?? null,
            c.priority_tier ?? 2,
            c.gift_status ?? 'not_started',
            c.clothing_size ?? null,
            c.shoe_size ?? null,
            c.notes ?? null,
            c.event_type ?? 'birthday',
            c.target_budget ?? null,
            c.spent_amount ?? null,
            c.custom_notification_days ?? null,
            c.custom_notification_time ?? null,
          ]
        );
        insertedCount++;
      }
    }

    if (Array.isArray(parsed.gift_tags)) {
      for (const t of parsed.gift_tags) {
        if (!t.id || !t.contact_id || !t.title) continue;
        const existTag = await db.getFirstAsync('SELECT id FROM gift_tags WHERE id = ?', [t.id]);
        if (!existTag) {
          await db.runAsync(
            `INSERT INTO gift_tags (id, contact_id, type, title, url) VALUES (?, ?, ?, ?, ?)`,
            [t.id, t.contact_id, t.type ?? 'wishlist_item', t.title, t.url ?? null]
          );
        }
      }
    }

    if (Array.isArray(parsed.gift_history)) {
      for (const h of parsed.gift_history) {
        if (!h.id || !h.contact_id || !h.title || !h.year) continue;
        const existHist = await db.getFirstAsync('SELECT id FROM gift_history WHERE id = ?', [h.id]);
        if (!existHist) {
          await db.runAsync(
            `INSERT INTO gift_history (id, contact_id, year, title, price, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [h.id, h.contact_id, h.year, h.title, h.price ?? null, h.notes ?? null, h.created_at ?? new Date().toISOString()]
          );
        }
      }
    }
  });

  return { contactsCount: parsed.contacts.length };
}

/**
 * Dummy veriler
 */
export async function seedDummyData(): Promise<void> {
  const db = await getDatabase();
  await initDatabase(db);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const dummyContacts: CreateContactInput[] = [
    {
      id: 'dummy-contact-1-closest',
      name: 'Zeynep Yılmaz',
      birth_month: currentMonth,
      birth_day: currentDay > 26 ? currentDay : currentDay + 2,
      birth_year: 1996,
      priority_tier: 1,
      gift_status: 'searching',
      clothing_size: 'S',
      shoe_size: '37',
      notes: 'Nitelikli kahve demleme ekipmanlarına ve mimari tasarım kitaplarına bayılır.',
      event_type: 'birthday',
      target_budget: 3500,
      spent_amount: 0,
      gift_tags: [
        { type: 'like', title: 'Specialty Coffee / V60 Çekirdek' },
        { type: 'like', title: 'Minimalist Gümüş Takı' },
        {
          type: 'wishlist_item',
          title: 'Moccamaster Filtre Kahve Makinesi',
          url: 'https://moccamaster.com',
        },
        { type: 'dislike', title: 'Gürültülü desenli kıyafetler' },
      ],
    },
    {
      id: 'dummy-contact-2-leapyear',
      name: 'Kerem Aksoy (Artık Yıl)',
      birth_month: 2,
      birth_day: 29,
      birth_year: 2000,
      priority_tier: 1,
      gift_status: 'not_started',
      clothing_size: 'L',
      shoe_size: '43',
      notes: '4 yılda bir gerçek doğum günü var; normal yıllarda 28 Şubat kutluyoruz.',
      event_type: 'birthday',
      target_budget: 2000,
      spent_amount: 0,
      gift_tags: [
        { type: 'like', title: 'Mekanik Klavye Tuş Takımları' },
        {
          type: 'wishlist_item',
          title: 'Keychron Q1 Pro Kablosuz Klavye',
          url: 'https://keychron.com',
        },
        { type: 'dislike', title: 'Sentetik kumaş kazaklar' },
      ],
    },
    {
      id: 'dummy-contact-3-friend-ready',
      name: 'Deniz Kaya',
      birth_month: ((currentMonth % 12) + 1),
      birth_day: 10,
      birth_year: 1993,
      priority_tier: 2,
      gift_status: 'ready',
      clothing_size: 'M',
      shoe_size: '41',
      notes: 'Hafta sonları kamp ve doğa yürüyüşü yapar.',
      event_type: 'anniversary',
      target_budget: 1500,
      spent_amount: 1450,
      gift_tags: [
        { type: 'like', title: 'Outdoor Kamp Malzemeleri' },
        {
          type: 'wishlist_item',
          title: 'Stanley Klasik Termos 1L',
          url: 'https://stanley1913.com',
        },
      ],
    },
    {
      id: 'dummy-contact-4-friend-searching',
      name: 'Can Demir',
      birth_month: (((currentMonth + 2) % 12) + 1),
      birth_day: 18,
      birth_year: 1998,
      priority_tier: 2,
      gift_status: 'searching',
      clothing_size: 'XL',
      shoe_size: '44',
      notes: 'Plak koleksiyonu yapıyor ve analog fotoğrafçılıkla ilgileniyor.',
      event_type: 'birthday',
      target_budget: 1000,
      spent_amount: 0,
      gift_tags: [
        { type: 'like', title: 'Caz / Funk Plakları' },
        { type: 'like', title: '35mm Ilford HP5 Film' },
      ],
    },
    {
      id: 'dummy-contact-5-acquaintance',
      name: 'Elif Şahin',
      birth_month: (((currentMonth + 5) % 12) + 1),
      birth_day: 5,
      birth_year: 1990,
      priority_tier: 3,
      gift_status: 'not_started',
      clothing_size: null,
      shoe_size: null,
      notes: 'İş yerinden proje yöneticisi arkadaş.',
      event_type: 'special',
      target_budget: 500,
      spent_amount: 0,
      gift_tags: [
        { type: 'like', title: 'Masa bitkileri / Sukulent' },
      ],
    },
  ];

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM gift_history');
    await db.runAsync('DELETE FROM gift_tags');
    await db.runAsync('DELETE FROM contacts');

    for (const contact of dummyContacts) {
      await insertContactInternal(db, contact);
    }

    // Örnek geçmiş hediye ekle
    await db.runAsync(
      `INSERT INTO gift_history (id, contact_id, year, title, price, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['hist-1', 'dummy-contact-1-closest', 2025, 'Hario V60 Cam Demleyici Seti', 850, 'Çok beğendi, her sabah kullanıyor.', new Date().toISOString()]
    );
  });
}

/**
 * Tüm kayıtları siler.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM gift_history');
    await db.runAsync('DELETE FROM gift_tags');
    await db.runAsync('DELETE FROM contacts');
  });
}
