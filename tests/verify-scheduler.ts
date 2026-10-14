import * as Notifications from 'expo-notifications';
import { Contact } from '../src/types';
import {
  getNextBirthday,
  calculateTriggerDate,
  NOTIFICATION_MATRIX,
  normalizeTier,
  scheduleContactNotifications,
  cancelContactNotifications,
  onGiftStatusChanged,
  syncAllContactsNotifications,
  getAllPendingNotifications,
  cancelAllNotifications,
} from '../src/services/notificationScheduler';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

async function run() {
  console.log('--- 1. getNextBirthday calculation with birth_month & birth_day ---');
  // Referans: 14 Ekim 2026 05:00
  const refDateEarly = new Date(2026, 9, 14, 5, 0, 0);

  // Kasım 20 doğumlu kişi (henüz gelmedi)
  const nextNov20 = getNextBirthday(11, 20, refDateEarly);
  assert(nextNov20.getFullYear() === 2026, '20 Kasım 2026 olmalı');
  assert(nextNov20.getMonth() === 10, 'Kasım ayı olmalı (index 10)');
  assert(nextNov20.getDate() === 20, '20. gün olmalı');

  // Ekim 5 doğumlu kişi (bu yıl geçti)
  const nextOct5 = getNextBirthday(10, 5, refDateEarly);
  assert(nextOct5.getFullYear() === 2027, '5 Ekim 2027 yılına aktarılmalı');
  assert(nextOct5.getMonth() === 9, 'Ekim ayı olmalı (index 9)');
  assert(nextOct5.getDate() === 5, '5. gün olmalı');

  // Bugün doğumlu kişi (14 Ekim) - sabah 05:00'te (09:00 kutlaması henüz geçmedi)
  const nextTodayEarly = getNextBirthday(10, 14, refDateEarly);
  assert(nextTodayEarly.getFullYear() === 2026, '09:00 öncesi için bu yıl (2026) hedeflenmeli');

  // Bugün doğumlu kişi (14 Ekim) - sabah 10:00'da (09:00 kutlaması geçti)
  const refDateLate = new Date(2026, 9, 14, 10, 0, 0);
  const nextTodayLate = getNextBirthday(10, 14, refDateLate);
  assert(nextTodayLate.getFullYear() === 2027, '09:00 sonrası için sonraki yıl (2027) hedeflenmeli');

  // 29 Şubat doğumlu kişi artık olmayan 2026 yılında
  const refJan1 = new Date(2026, 0, 1);
  const nextFeb29 = getNextBirthday(2, 29, refJan1);
  assert(nextFeb29.getFullYear() === 2026, '2026 olmalı');
  assert(nextFeb29.getMonth() === 1, 'Şubat (index 1) olmalı');
  assert(nextFeb29.getDate() === 28, 'Artık olmayan yılda 28 Şubat olmalı');

  console.log('\n--- 2. Contact Type & Overload Test ---');
  const dummyContact1: Contact = {
    id: 'contact-001',
    name: 'Ahmet Ailesi',
    birth_month: 11,
    birth_day: 25,
    birth_year: 1995,
    priority_tier: 1, // En Yakın
    gift_status: 'searching',
    clothing_size: 'L',
    shoe_size: '42',
    notes: 'Özel not',
  };

  const nextFromContact = getNextBirthday(dummyContact1, refDateEarly);
  assert(nextFromContact.getFullYear() === 2026, 'Contact overload 2026 döndürmeli');
  assert(nextFromContact.getMonth() === 10, 'Kasım ayı olmalı');
  assert(nextFromContact.getDate() === 25, '25. gün olmalı');

  console.log('\n--- 3. Priority Tier & Notification Matrix Test ---');
  assert(normalizeTier(1) === 1, 'normalizeTier(1) -> 1');
  assert(normalizeTier(2) === 2, 'normalizeTier(2) -> 2');
  assert(normalizeTier(3) === 3, 'normalizeTier(3) -> 3');
  assert(normalizeTier('tier1') === 1, 'normalizeTier("tier1") -> 1');

  // Tier 1 kuralları: T10, T3, T0
  assert(NOTIFICATION_MATRIX[1].length === 3, 'Tier 1 matrisinde 3 kural olmalı (T10, T3, T0)');
  assert(NOTIFICATION_MATRIX[1].some(r => r.type === 'T10'), 'Tier 1 T10 içermeli');
  assert(NOTIFICATION_MATRIX[1].some(r => r.type === 'T3'), 'Tier 1 T3 içermeli');
  assert(NOTIFICATION_MATRIX[1].some(r => r.type === 'T0'), 'Tier 1 T0 içermeli');

  // Tier 2 kuralları: T7, T0
  assert(NOTIFICATION_MATRIX[2].length === 2, 'Tier 2 matrisinde 2 kural olmalı (T7, T0)');
  assert(NOTIFICATION_MATRIX[2].some(r => r.type === 'T7'), 'Tier 2 T7 içermeli');
  assert(NOTIFICATION_MATRIX[2].some(r => r.type === 'T0'), 'Tier 2 T0 içermeli');

  // Tier 3 kuralları: T0
  assert(NOTIFICATION_MATRIX[3].length === 1, 'Tier 3 matrisinde 1 kural olmalı (T0)');
  assert(NOTIFICATION_MATRIX[3][0].type === 'T0', 'Tier 3 sadece T0 içermeli');

  console.log('\n--- 4. calculateTriggerDate Test ---');
  const targetDate = new Date(2026, 11, 25, 0, 0, 0); // 25 Aralık 2026
  const t10 = calculateTriggerDate(targetDate, 10, 10, 0);
  assert(t10.getDate() === 15 && t10.getHours() === 10, 'T-10 15 Aralık 10:00 olmalı');

  const t7 = calculateTriggerDate(targetDate, 7, 10, 0);
  assert(t7.getDate() === 18 && t7.getHours() === 10, 'T-7 18 Aralık 10:00 olmalı');

  const t3 = calculateTriggerDate(targetDate, 3, 10, 0);
  assert(t3.getDate() === 22 && t3.getHours() === 10, 'T-3 22 Aralık 10:00 olmalı');

  const t0 = calculateTriggerDate(targetDate, 0, 9, 0);
  assert(t0.getDate() === 25 && t0.getHours() === 9, 'T-0 25 Aralık 09:00 olmalı');

  console.log('\n--- 5. scheduleContactNotifications & onGiftStatusChanged Test ---');
  const scheduled = await scheduleContactNotifications(dummyContact1);
  assert(scheduled.length > 0, 'dummyContact1 için bildirimler başarıyla planlanmalı');
  assert(scheduled.some(s => s.identifier === 'contact-001_T10'), 'T10 planlanmalı');
  assert(scheduled.some(s => s.identifier === 'contact-001_T3'), 'T3 planlanmalı');
  assert(scheduled.some(s => s.identifier === 'contact-001_T0'), 'T0 planlanmalı');

  // Hediye durumu 'ready' yapıldığında
  await onGiftStatusChanged('contact-001', 'ready', dummyContact1);
  const pendingAfterReady = await getAllPendingNotifications();
  const contactPending = pendingAfterReady.filter(p => p.contactId === 'contact-001');
  assert(contactPending.length === 1, 'Sadece 1 bildirim (T0) kalmalı');
  assert(contactPending[0].type === 'T0', 'Kalan bildirim T0 olmalı');

  // Bildirimleri temizle
  await cancelContactNotifications('contact-001');
  const pendingAfterCancel = await getAllPendingNotifications();
  assert(pendingAfterCancel.filter(p => p.contactId === 'contact-001').length === 0, 'contact-001 bildirimleri temizlenmeli');

  console.log('\n======================================================');
  console.log('TÜM NOTIFICATION SCHEDULER BİRİM TESTLERİ BAŞARIYLA GEÇTİ!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
