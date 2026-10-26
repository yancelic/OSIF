export interface CulturalEventTemplate {
  key: string;
  title: string;
  category: 'family' | 'romantic' | 'cultural' | 'holiday';
  description: string;
  defaultRecipientPlaceholder: string;
  isDynamic: boolean;
  calculateDate: (year: number) => { month: number; day: number };
}

/**
 * Belirli bir yıl ve aydaki n. Pazar gününü hesaplar.
 * @param year Yıl (örn: 2026)
 * @param monthIndex JS ayı (0 = Ocak, 4 = Mayıs, 5 = Haziran)
 * @param n Kaçıncı pazar (örn: 2 = 2. pazar)
 */
export function getNthSundayOfMonth(year: number, monthIndex: number, n: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getMonth() !== monthIndex) break;
    if (d.getDay() === 0) {
      count++;
      if (count === n) {
        return day;
      }
    }
  }
  return 1;
}

export const CULTURAL_EVENT_TEMPLATES: CulturalEventTemplate[] = [
  {
    key: 'mothers_day',
    title: 'Anneler Günü',
    category: 'family',
    description: 'Mayıs ayının 2. Pazarı',
    defaultRecipientPlaceholder: 'Annem',
    isDynamic: true,
    calculateDate: (year: number) => ({
      month: 5,
      day: getNthSundayOfMonth(year, 4, 2),
    }),
  },
  {
    key: 'fathers_day',
    title: 'Babalar Günü',
    category: 'family',
    description: 'Haziran ayının 3. Pazarı',
    defaultRecipientPlaceholder: 'Babam',
    isDynamic: true,
    calculateDate: (year: number) => ({
      month: 6,
      day: getNthSundayOfMonth(year, 5, 3),
    }),
  },
  {
    key: 'valentines_day',
    title: 'Sevgililer Günü',
    category: 'romantic',
    description: '14 Şubat',
    defaultRecipientPlaceholder: 'Sevgilim',
    isDynamic: false,
    calculateDate: () => ({ month: 2, day: 14 }),
  },
  {
    key: 'new_year',
    title: 'Yılbaşı & Yeni Yıl',
    category: 'holiday',
    description: '31 Aralık',
    defaultRecipientPlaceholder: 'Yılbaşı Hediyesi',
    isDynamic: false,
    calculateDate: () => ({ month: 12, day: 31 }),
  },
  {
    key: 'womens_day',
    title: 'Dünya Kadınlar Günü',
    category: 'cultural',
    description: '8 Mart',
    defaultRecipientPlaceholder: 'Kadınlar Günü',
    isDynamic: false,
    calculateDate: () => ({ month: 3, day: 8 }),
  },
  {
    key: 'teachers_day',
    title: 'Öğretmenler Günü',
    category: 'cultural',
    description: '24 Kasım',
    defaultRecipientPlaceholder: 'Öğretmenim',
    isDynamic: false,
    calculateDate: () => ({ month: 11, day: 24 }),
  },
];

/**
 * Belirli bir şablonun mevcut yıldaki veya bir sonraki yıldaki tarihini döner.
 */
export function getTemplateEventDate(
  template: CulturalEventTemplate,
  referenceDate: Date = new Date()
): { year: number; month: number; day: number; isNextYear: boolean } {
  const currentYear = referenceDate.getFullYear();
  const dateThisYear = template.calculateDate(currentYear);

  const eventThisYear = new Date(currentYear, dateThisYear.month - 1, dateThisYear.day, 23, 59, 59);

  if (referenceDate.getTime() > eventThisYear.getTime()) {
    const nextYear = currentYear + 1;
    const dateNextYear = template.calculateDate(nextYear);
    return {
      year: nextYear,
      month: dateNextYear.month,
      day: dateNextYear.day,
      isNextYear: true,
    };
  }

  return {
    year: currentYear,
    month: dateThisYear.month,
    day: dateThisYear.day,
    isNextYear: false,
  };
}
