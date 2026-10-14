/**
 * Tarih Servisi ve Zaman Yolculuğu (Mock Date) Mantığı
 */

export const formatDateToISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRealTodayDate = (): string => {
  return formatDateToISOString(new Date());
};

/**
 * Verilen referans tarihe göre etkinliğe kaç gün kaldığını hesaplar.
 * Doğum günleri ve yıllık özel günler gibi durumlar için:
 * - Etkinliğin ay ve günü referans tarihin yılına uyarlanır.
 * - Eğer bu yılki tarih referans tarihten önce kalmışsa (geçmişse), bir sonraki yıl hedeflenir.
 */
export const calculateDaysRemaining = (eventDateStr: string, referenceDateStr: string): number => {
  try {
    const [refYear, refMonth, refDay] = referenceDateStr.split('-').map(Number);
    const refDate = new Date(refYear, refMonth - 1, refDay, 0, 0, 0);

    const parts = eventDateStr.split('-').map(Number);
    let targetMonth: number;
    let targetDay: number;

    if (parts.length === 3) {
      targetMonth = parts[1];
      targetDay = parts[2];
    } else if (parts.length === 2) {
      targetMonth = parts[0];
      targetDay = parts[1];
    } else {
      return 0;
    }

    // Önce bu yılki tarihi dene
    let targetDate = new Date(refYear, targetMonth - 1, targetDay, 0, 0, 0);

    // Eğer bu yılki tarih referans tarihten önce geçmişse sonraki yılı baz al
    if (targetDate.getTime() < refDate.getTime()) {
      targetDate = new Date(refYear + 1, targetMonth - 1, targetDay, 0, 0, 0);
    }

    const diffInMs = targetDate.getTime() - refDate.getTime();
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  } catch (err) {
    return 0;
  }
};

/**
 * Tarihe gün ekleme yardımcısı (Hızlı testler için)
 */
export const shiftDateByDays = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateToISOString(date);
};
