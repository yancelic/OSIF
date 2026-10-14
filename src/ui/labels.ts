import * as Localization from 'expo-localization';
import { GiftTagType, PriorityTier } from '../types/index';

export const TIER_LABEL: Record<PriorityTier, string> = {
  1: 'En yakın',
  2: 'Arkadaş',
  3: 'Tanıdık',
};

export const TIER_OPTIONS: { value: PriorityTier; label: string }[] = [
  { value: 1, label: TIER_LABEL[1] },
  { value: 2, label: TIER_LABEL[2] },
  { value: 3, label: TIER_LABEL[3] },
];

export type DateFormatOrder = 'DMY' | 'MDY' | 'YMD';

export interface DateLocaleConfig {
  order: DateFormatOrder;
  separator: string;
  label: string;
  placeholder: string;
}

/**
 * Cihazın yerel ayarlarına (dil/bölge) göre uygun tarih formatı yapılandırmasını döner.
 * Örneğin:
 * - Türkçe (tr): GG.AA.YYYY (order: 'DMY', separator: '.')
 * - ABD (en-US): MM/DD/YYYY (order: 'MDY', separator: '/')
 * - ISO / Doğu Asya: YYYY-MM-DD (order: 'YMD', separator: '-')
 */
export const getDeviceDateConfig = (): DateLocaleConfig => {
  let lang = 'tr';
  let region = 'TR';

  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      if (locales[0].languageCode) lang = locales[0].languageCode.toLowerCase();
      if (locales[0].regionCode) region = locales[0].regionCode.toUpperCase();
    }
  } catch {
    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
      if (resolved) {
        const parts = resolved.split('-');
        lang = parts[0].toLowerCase();
        if (parts[1]) region = parts[1].toUpperCase();
      }
    } catch {}
  }

  // 1. Türkçe veya Türkiye bölgesi -> GG.AA.YYYY
  if (lang === 'tr' || region === 'TR') {
    return {
      order: 'DMY',
      separator: '.',
      label: 'Doğum tarihi (GG.AA.YYYY)',
      placeholder: '25.11.1994',
    };
  }

  // 2. ABD (en-US / region === 'US') -> MM/DD/YYYY
  if (region === 'US') {
    return {
      order: 'MDY',
      separator: '/',
      label: 'Date of birth (MM/DD/YYYY)',
      placeholder: '11/25/1994',
    };
  }

  // 3. YMD kullanan diller/ülkeler -> YYYY-MM-DD
  if (['ja', 'zh', 'ko'].includes(lang) || ['JP', 'CN', 'KR'].includes(region)) {
    return {
      order: 'YMD',
      separator: '-',
      label: 'Date of birth (YYYY-MM-DD)',
      placeholder: '1994-11-25',
    };
  }

  // 4. Varsayılan Avrupa / DMY -> DD.MM.YYYY
  return {
    order: 'DMY',
    separator: '.',
    label: lang === 'tr' ? 'Doğum tarihi (GG.AA.YYYY)' : 'Date of birth (DD.MM.YYYY)',
    placeholder: '25.11.1994',
  };
};

/**
 * Verilen ay ve yıl için maksimum gün sayısını hesaplar.
 * Artık yıllarda Şubat 29, normalde 28 çeker.
 */
export const getDaysInMonth = (month: number, year?: number | null): number => {
  if (month < 1 || month > 12) return 31;
  if (month === 2) {
    if (year != null && year >= 1900) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      return isLeap ? 29 : 28;
    }
    return 29;
  }
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
};

/**
 * Referans tarihi (bugün veya simüle edilen gün) yıl, ay, gün olarak ayrıştırır.
 */
const getTodayRef = (refStr?: string): { year: number; month: number; day: number; date: Date } => {
  if (refStr) {
    const p = refStr.split('-').map(Number);
    if (p.length === 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
      return {
        year: p[0],
        month: p[1],
        day: p[2],
        date: new Date(p[0], p[1] - 1, p[2], 23, 59, 59),
      };
    }
  }
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    date: now,
  };
};

/**
 * Kullanıcının girdiği metinden harf ve geçersiz karakterleri temizler,
 * cihazın dil formatına göre otomatik maskeler ve sınır aşımlarını otomatik düzeltir (clamping).
 * - Ay > 12 ise otomatik 12 olur.
 * - Gün o ayın maksimum gününü aşarsa (örn. 32.01 -> 31.01) o ayın max günü olur.
 * - Yıl veya girilen doğum tarihi gelecekteyse ya da tüm değerler sınırı aşmışsa (örn: 78.24.3000), otomatik bugünün tarihi yazılır.
 */
export const formatDateInput = (text: string, config?: DateLocaleConfig, referenceDateStr?: string): string => {
  const currentConfig = config ?? getDeviceDateConfig();
  const { order, separator } = currentConfig;
  const clean = text.replace(/\D/g, '').slice(0, 8);
  const endsWithSep = /[.\-/ ]$/.test(text);

  const today = getTodayRef(referenceDateStr);
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const getTodayFormatted = (ord: DateFormatOrder): string => {
    if (ord === 'DMY') return `${pad2(today.day)}${separator}${pad2(today.month)}${separator}${today.year}`;
    if (ord === 'MDY') return `${pad2(today.month)}${separator}${pad2(today.day)}${separator}${today.year}`;
    return `${today.year}${separator}${pad2(today.month)}${separator}${pad2(today.day)}`;
  };

  if (order === 'DMY') {
    // 1. Her değer maks değeri aşan şeyler girilirse (örn: 78.24.3000)
    if (clean.length >= 8) {
      const rawD = Number(clean.slice(0, 2));
      const rawM = Number(clean.slice(2, 4));
      const rawY = Number(clean.slice(4, 8));
      if (rawD > 31 && rawM > 12 && rawY > today.year) {
        return getTodayFormatted('DMY');
      }
    }

    let dayPart = clean.slice(0, 2);
    let monthPart = clean.slice(2, 4);
    let yearPart = clean.slice(4, 8);

    // Ay kontrolü (maks 12)
    let monthNum: number | null = null;
    if (monthPart.length === 2) {
      let m = Number(monthPart);
      if (m > 12) m = 12;
      if (m === 0) m = 1;
      monthNum = m;
      monthPart = pad2(m);
    }

    // Yıl kontrolü (doğum tarihi gelecekte olamaz, maks today.year)
    let yearNum: number | null = null;
    if (yearPart.length === 4) {
      let y = Number(yearPart);
      if (y > today.year) y = today.year;
      yearNum = y;
      yearPart = String(y);
    }

    // Gün kontrolü (ayın gün sayısını aşamaz)
    if (dayPart.length === 2) {
      let d = Number(dayPart);
      const limit = monthNum ? getDaysInMonth(monthNum, yearNum) : 31;
      if (d > limit) d = limit;
      if (d === 0) d = 1;
      dayPart = pad2(d);
    }

    // Eğer tarih tamamlandıysa ve gelecekteyse bugünün tarihi olsun
    if (dayPart.length === 2 && monthPart.length === 2 && yearPart.length === 4) {
      const enteredDate = new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart));
      if (enteredDate.getTime() > today.date.getTime()) {
        return getTodayFormatted('DMY');
      }
    }

    if (clean.length <= 2) {
      if (clean.length === 2 && endsWithSep) return dayPart + separator;
      return dayPart;
    }
    if (clean.length <= 4) {
      if (clean.length === 4 && endsWithSep) return dayPart + separator + monthPart + separator;
      return dayPart + separator + monthPart;
    }
    return dayPart + separator + monthPart + separator + yearPart;
  }

  if (order === 'MDY') {
    // 1. Her değer maks değeri aşıyorsa
    if (clean.length >= 8) {
      const rawM = Number(clean.slice(0, 2));
      const rawD = Number(clean.slice(2, 4));
      const rawY = Number(clean.slice(4, 8));
      if (rawD > 31 && rawM > 12 && rawY > today.year) {
        return getTodayFormatted('MDY');
      }
    }

    let monthPart = clean.slice(0, 2);
    let dayPart = clean.slice(2, 4);
    let yearPart = clean.slice(4, 8);

    let monthNum: number | null = null;
    if (monthPart.length === 2) {
      let m = Number(monthPart);
      if (m > 12) m = 12;
      if (m === 0) m = 1;
      monthNum = m;
      monthPart = pad2(m);
    }

    let yearNum: number | null = null;
    if (yearPart.length === 4) {
      let y = Number(yearPart);
      if (y > today.year) y = today.year;
      yearNum = y;
      yearPart = String(y);
    }

    if (dayPart.length === 2) {
      let d = Number(dayPart);
      const limit = monthNum ? getDaysInMonth(monthNum, yearNum) : 31;
      if (d > limit) d = limit;
      if (d === 0) d = 1;
      dayPart = pad2(d);
    }

    if (dayPart.length === 2 && monthPart.length === 2 && yearPart.length === 4) {
      const enteredDate = new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart));
      if (enteredDate.getTime() > today.date.getTime()) {
        return getTodayFormatted('MDY');
      }
    }

    if (clean.length <= 2) {
      if (clean.length === 2 && endsWithSep) return monthPart + separator;
      return monthPart;
    }
    if (clean.length <= 4) {
      if (clean.length === 4 && endsWithSep) return monthPart + separator + dayPart + separator;
      return monthPart + separator + dayPart;
    }
    return monthPart + separator + dayPart + separator + yearPart;
  }

  // YMD
  if (clean.length >= 8) {
    const rawY = Number(clean.slice(0, 4));
    const rawM = Number(clean.slice(4, 6));
    const rawD = Number(clean.slice(6, 8));
    if (rawD > 31 && rawM > 12 && rawY > today.year) {
      return getTodayFormatted('YMD');
    }
  }

  let yearPart = clean.slice(0, 4);
  let monthPart = clean.slice(4, 6);
  let dayPart = clean.slice(6, 8);

  let yearNum: number | null = null;
  if (yearPart.length === 4) {
    let y = Number(yearPart);
    if (y > today.year) y = today.year;
    yearNum = y;
    yearPart = String(y);
  }

  let monthNum: number | null = null;
  if (monthPart.length === 2) {
    let m = Number(monthPart);
    if (m > 12) m = 12;
    if (m === 0) m = 1;
    monthNum = m;
    monthPart = pad2(m);
  }

  if (dayPart.length === 2) {
    let d = Number(dayPart);
    const limit = monthNum ? getDaysInMonth(monthNum, yearNum) : 31;
    if (d > limit) d = limit;
    if (d === 0) d = 1;
    dayPart = pad2(d);
  }

  if (dayPart.length === 2 && monthPart.length === 2 && yearPart.length === 4) {
    const enteredDate = new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart));
    if (enteredDate.getTime() > today.date.getTime()) {
      return getTodayFormatted('YMD');
    }
  }

  if (clean.length <= 4) {
    if (clean.length === 4 && endsWithSep) return yearPart + separator;
    return yearPart;
  }
  if (clean.length <= 6) {
    if (clean.length === 6 && endsWithSep) return yearPart + separator + monthPart + separator;
    return yearPart + separator + monthPart;
  }
  return yearPart + separator + monthPart + separator + dayPart;
};

/**
 * Kullanıcı girdisini cihaz diline veya standart ISO formatına göre doğrular ve { year, month, day } nesnesine ayırır.
 * Geçersiz veya takvim dışı tarihlerde null döner.
 */
export const parseDateInput = (
  value: string,
  order?: DateFormatOrder
): { year: number; month: number; day: number } | null => {
  const trimmed = value.trim();
  const defaultOrder = order ?? getDeviceDateConfig().order;

  // Ayırıcıları (., -, /, boşluk) tek tip yapalım
  const parts = trimmed.split(/[.\-/ ]+/).filter(Boolean);
  if (parts.length !== 3) return null;

  let year: number;
  let month: number;
  let day: number;

  // Eğer ilk parça 4 haneli ise (örn. 1994-11-25 veya 1994.11.25)
  if (parts[0].length === 4) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else if (parts[2].length === 4) {
    // Son parça yıl ise (örn. 25.11.1994 veya 11/25/1994)
    year = Number(parts[2]);
    if (defaultOrder === 'MDY') {
      month = Number(parts[0]);
      day = Number(parts[1]);
    } else {
      // DMY (Türkçe ve genel)
      day = Number(parts[0]);
      month = Number(parts[1]);
    }
  } else {
    return null;
  }

  // Mantıksal aralık kontrolü
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Takvimsel doğrulama (örn. artık yıl ve ay gün sayısı denetimi, 31 Şubat engelleme)
  const maxDay = getDaysInMonth(month, year);
  if (day > maxDay) return null;

  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
    return null;
  }

  return { year, month, day };
};

/**
 * Türkçe dil kurallarına uygun ilgi/iyelik (genitive) eki ekler:
 * 'Ahmet' -> "Ahmet'in"
 * 'Ayşe' -> "Ayşe'nin"
 * 'Can' -> "Can'ın"
 * 'Banu' -> "Banu'nun"
 * 'Yusuf' -> "Yusuf'un"
 * 'Özgür' -> "Özgür'ün"
 */
export const getTurkishPossessive = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '';

  const vowels = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
  const charArray = Array.from(trimmed);
  const lastChar = charArray[charArray.length - 1].toLowerCase();
  const isLastCharVowel = vowels.includes(lastChar);

  // Sondan başa doğru ilk sesli harfi bul
  let lastVowel = '';
  for (let i = charArray.length - 1; i >= 0; i--) {
    const ch = charArray[i].toLowerCase();
    if (vowels.includes(ch)) {
      lastVowel = ch;
      break;
    }
  }

  // Eğer isimde hiç sesli harf yoksa genel 'in eki
  if (!lastVowel) {
    return `${trimmed}'in`;
  }

  let suffix = '';
  if (lastVowel === 'a' || lastVowel === 'ı') {
    suffix = isLastCharVowel ? 'nın' : 'ın';
  } else if (lastVowel === 'e' || lastVowel === 'i') {
    suffix = isLastCharVowel ? 'nin' : 'in';
  } else if (lastVowel === 'o' || lastVowel === 'u') {
    suffix = isLastCharVowel ? 'nun' : 'un';
  } else if (lastVowel === 'ö' || lastVowel === 'ü') {
    suffix = isLastCharVowel ? 'nün' : 'ün';
  } else {
    suffix = isLastCharVowel ? 'nin' : 'in';
  }

  return `${trimmed}'${suffix}`;
};

/**
 * Kişi detay ekranındaki hediye fikri / zevk / hoşlanmaz türlerine göre
 * kullanıcı dostu ve dinamik placeholder metnini döner.
 */
export const getComposerPlaceholder = (type: GiftTagType, name?: string): string => {
  switch (type) {
    case 'wishlist_item':
      return 'Yeni bir hediye fikri…';
    case 'like':
      return name && name.trim()
        ? `${getTurkishPossessive(name)} zevklerinden biri…`
        : 'Zevklerinden biri…';
    case 'dislike':
      return 'Hoşlanmadıkları…';
    default:
      return 'Yeni bir not…';
  }
};

