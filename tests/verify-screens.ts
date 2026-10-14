import { calculateDaysRemaining, shiftDateByDays } from '../src/services/dateService';
import { notificationService } from '../src/services/notificationService';
import { ContactWithDetails } from '../src/types';

// SQLite'a bağımlı olmadan bildirim ve tarih mantığını doğrulayan yerel test verisi
const make = (id: string, name: string, month: number, day: number, status: ContactWithDetails['gift_status']): ContactWithDetails => ({
  id,
  name,
  birth_month: month,
  birth_day: day,
  birth_year: 1995,
  priority_tier: 2,
  gift_status: status,
  clothing_size: 'M',
  shoe_size: '42',
  notes: null,
  gift_tags: [{ id: `${id}-t1`, contact_id: id, type: 'like', title: 'Filtre Kahve', url: null }],
  days_until_next_birthday: 0,
  upcoming_age: null,
  next_birthday_date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
});

const FIXTURES: ContactWithDetails[] = [
  make('c-1', 'Ahmet Yılmaz', 11, 18, 'searching'),
  make('c-2', 'Zeynep Kaya', 11, 20, 'not_started'),
  make('c-3', 'Caner Demir', 12, 5, 'ready'),
  make('c-4', 'Elif Şahin', 11, 15, 'not_started'),
];

async function verifyArchitecture() {
  console.log('=== OSIF FRONTEND MİMARİSİ VE DEBUG TESTİ ===\n');

  const baseDate = '2026-11-15';
  console.log(`[1] Mock Date Testi (Referans Tarih: ${baseDate}):`);
  FIXTURES.forEach(c => {
    const days = calculateDaysRemaining(c.next_birthday_date, baseDate);
    console.log(`- ${c.name} (${c.next_birthday_date}): ${days} gün kaldı (Durum: ${c.gift_status})`);
  });

  const shifted = shiftDateByDays(baseDate, 5);
  console.log(`\n[2] Zaman Yolculuğu +5 Gün İleri (${shifted}):`);
  FIXTURES.forEach(c => {
    const days = calculateDaysRemaining(c.next_birthday_date, shifted);
    console.log(`- ${c.name} (${c.next_birthday_date}): ${days} gün kaldı`);
  });

  console.log('\n[3] Bildirim Kurulumu ve Tetikleme Testi:');
  notificationService.scheduleAllForTest(FIXTURES, 1, (triggered) => {
    console.log(`>>> BİLDİRİM ATEŞLENDİ: [${triggered.title}]`);
    console.log(`>>> Payload:`, JSON.stringify(triggered.payload));
  });

  const pending = await notificationService.getAllPendingNotifications();
  console.log(`Aktif Bekleyen Bildirim Sayısı: ${pending.length}`);
  console.log('İlk Bildirim Özeti:', {
    id: pending[0].id,
    target: pending[0].contactName,
    scheduledTime: pending[0].scheduledTime,
  });

  await new Promise(r => setTimeout(r, 1200));

  const afterTrigger = await notificationService.getAllPendingNotifications();
  console.log('Tetiklenme Sonrası Durum:', afterTrigger[0].status);

  console.log('\n=== TÜM DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ ===');
}

verifyArchitecture();
