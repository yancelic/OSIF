import { BirthdayCalculationResult } from '../types';

/**
 * Bir yılın artık yıl (leap year) olup olmadığını Gregoryen takvimi kurallarına göre belirler.
 * Kural: 4'e tam bölünen yıllar artık yıldır; ancak 100'e tam bölünenler hariçtir, 
 * meğerki 400'e de tam bölünsün.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Ayın maksimum gün sayısını döndürür.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`Geçersiz ay: ${month}. Ay 1 ile 12 arasında olmalıdır.`);
  }
  // JS Date'de ay 1-tabanlı bir sonraki ayın 0. günü önceki ayın son günüdür
  return new Date(year, month, 0).getDate();
}

/**
 * Doğum tarihi parametrelerinin geçerliliğini doğrular.
 */
export function validateBirthDate(birthMonth: number, birthDay: number, birthYear?: number | null): void {
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
    throw new Error(`Geçersiz doğum ayı: ${birthMonth}. 1-12 arasında tam sayı olmalıdır.`);
  }

  if (!Number.isInteger(birthDay) || birthDay < 1 || birthDay > 31) {
    throw new Error(`Geçersiz doğum günü: ${birthDay}. 1-31 arasında tam sayı olmalıdır.`);
  }

  // Şubat 29 kontrolü (yıl verilmişse o yıl için, verilmemişse genel olarak 29'a izin ver)
  if (birthMonth === 2) {
    if (birthYear != null) {
      const maxFebDays = isLeapYear(birthYear) ? 29 : 28;
      if (birthDay > maxFebDays) {
        throw new Error(`${birthYear} yılı artık yıl değildir, Şubat en fazla ${maxFebDays} gün çekebilir.`);
      }
    } else if (birthDay > 29) {
      throw new Error(`Şubat ayı en fazla 29 gün çekebilir.`);
    }
  } else {
    // 30 çeken aylar (Nisan: 4, Haziran: 6, Eylül: 9, Kasım: 11)
    const thirtyDayMonths = [4, 6, 9, 11];
    if (thirtyDayMonths.includes(birthMonth) && birthDay > 30) {
      throw new Error(`${birthMonth}. ay en fazla 30 gün çekebilir.`);
    }
  }

  if (birthYear != null) {
    const currentYear = new Date().getFullYear();
    if (birthYear > currentYear) {
      throw new Error(`Doğum yılı gelecekte olamaz: ${birthYear}`);
    }
    if (birthYear < 1900) {
      throw new Error(`Doğum yılı 1900'den küçük olamaz: ${birthYear}`);
    }
  }
}

export type LeapYearFallback = 'feb28' | 'mar1';

/**
 * Belirli bir hedef yıldaki kutlama tarihini belirler.
 * 29 Şubat doğumlular için:
 * - Hedef yıl artık yılsa: 29 Şubat
 * - Hedef yıl normal yılsa: 'feb28' (28 Şubat) veya 'mar1' (1 Mart)
 */
export function resolveTargetBirthday(
  targetYear: number,
  birthMonth: number,
  birthDay: number,
  leapYearFallback: LeapYearFallback = 'feb28'
): { year: number; month: number; day: number; isFallback: boolean } {
  if (birthMonth === 2 && birthDay === 29) {
    if (isLeapYear(targetYear)) {
      return { year: targetYear, month: 2, day: 29, isFallback: false };
    }
    return leapYearFallback === 'feb28'
      ? { year: targetYear, month: 2, day: 28, isFallback: true }
      : { year: targetYear, month: 3, day: 1, isFallback: true };
  }

  return { year: targetYear, month: birthMonth, day: birthDay, isFallback: false };
}

/**
 * Verilen bir referans tarihine göre bir sonraki doğum gününün tam Date nesnesini döndürür.
 */
export function getNextBirthdayDate(
  birthMonth: number,
  birthDay: number,
  fromDate: Date = new Date(),
  leapYearFallback: LeapYearFallback = 'feb28'
): Date {
  validateBirthDate(birthMonth, birthDay);

  const currentYear = fromDate.getFullYear();
  const currentMonth = fromDate.getMonth() + 1; // 1-12
  const currentDay = fromDate.getDate();

  // Bu yılki hedef tarihi çöz
  const thisYearTarget = resolveTargetBirthday(currentYear, birthMonth, birthDay, leapYearFallback);

  // Karşılaştırma: Bu yılki doğum günü henüz geçmedi mi? (Bugün dahil)
  const isAfterThisYear =
    currentMonth > thisYearTarget.month ||
    (currentMonth === thisYearTarget.month && currentDay > thisYearTarget.day);

  const finalYear = isAfterThisYear ? currentYear + 1 : currentYear;
  const finalTarget = resolveTargetBirthday(finalYear, birthMonth, birthDay, leapYearFallback);

  return new Date(finalTarget.year, finalTarget.month - 1, finalTarget.day, 0, 0, 0, 0);
}

/**
 * Bir sonraki doğum gününe kalan tam gün sayısını (0..365/366) saf matematik ile hesaplar.
 * UTC zaman damgası normalizasyonu kullanarak yaz saati / saat dilimi kaymalarından (DST) etkilenmez.
 * 
 * - Bugün doğum günüyse: 0 döner.
 * - Yarın doğum günüyse: 1 döner.
 */
export function daysUntilNextBirthday(
  birthMonth: number,
  birthDay: number,
  fromDate: Date = new Date(),
  leapYearFallback: LeapYearFallback = 'feb28'
): number {
  validateBirthDate(birthMonth, birthDay);

  const nextDate = getNextBirthdayDate(birthMonth, birthDay, fromDate, leapYearFallback);

  // DST ve saat dilimi sapmalarından arındırılmış saf UTC gün farkı hesabı
  const fromUTC = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const targetUTC = Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());

  const diffMs = targetUTC - fromUTC;
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return Math.round(diffMs / MS_PER_DAY);
}

/**
 * Bir sonraki doğum gününde kişinin gireceği yeni yaşı hesaplar.
 * Doğum yılı belirtilmemişse null döner.
 */
export function calculateUpcomingAge(
  birthYear: number | null | undefined,
  birthMonth: number,
  birthDay: number,
  fromDate: Date = new Date(),
  leapYearFallback: LeapYearFallback = 'feb28'
): number | null {
  if (birthYear == null) {
    return null;
  }

  validateBirthDate(birthMonth, birthDay, birthYear);

  const nextBirthday = getNextBirthdayDate(birthMonth, birthDay, fromDate, leapYearFallback);
  const upcomingAge = nextBirthday.getFullYear() - birthYear;

  return upcomingAge;
}

/**
 * Doğum günü hesaplamalarını tek bir temiz nesnede birleştiren yardımcı fonksiyon.
 */
export function calculateBirthdayDetails(
  birthMonth: number,
  birthDay: number,
  birthYear?: number | null,
  fromDate: Date = new Date(),
  leapYearFallback: LeapYearFallback = 'feb28'
): BirthdayCalculationResult {
  const nextDate = getNextBirthdayDate(birthMonth, birthDay, fromDate, leapYearFallback);
  const days = daysUntilNextBirthday(birthMonth, birthDay, fromDate, leapYearFallback);
  const age = calculateUpcomingAge(birthYear, birthMonth, birthDay, fromDate, leapYearFallback);

  const isLeapBaby = birthMonth === 2 && birthDay === 29;
  const isFallback = isLeapBaby && !isLeapYear(nextDate.getFullYear());

  return {
    nextBirthdayDate: nextDate,
    daysUntilNextBirthday: days,
    upcomingAge: age,
    isLeapYearBaby: isLeapBaby,
    celebratedOnLeapFallback: isFallback,
  };
}
