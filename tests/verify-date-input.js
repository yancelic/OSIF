function getDaysInMonth(month, year) {
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
}

function getTodayRef(refStr) {
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
}

function formatDateInput(text, config = { order: 'DMY', separator: '.' }, referenceDateStr) {
  const { order, separator } = config;
  const clean = text.replace(/\D/g, '').slice(0, 8);
  const endsWithSep = /[.\-/ ]$/.test(text);

  const today = getTodayRef(referenceDateStr);
  const pad2 = (n) => String(n).padStart(2, '0');

  const getTodayFormatted = (ord) => {
    if (ord === 'DMY') return `${pad2(today.day)}${separator}${pad2(today.month)}${separator}${today.year}`;
    if (ord === 'MDY') return `${pad2(today.month)}${separator}${pad2(today.day)}${separator}${today.year}`;
    return `${today.year}${separator}${pad2(today.month)}${separator}${pad2(today.day)}`;
  };

  if (order === 'DMY') {
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

    let monthNum = null;
    if (monthPart.length === 2) {
      let m = Number(monthPart);
      if (m > 12) m = 12;
      if (m === 0) m = 1;
      monthNum = m;
      monthPart = pad2(m);
    }

    let yearNum = null;
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
}

console.log('--- Kullanıcının Belirttiği Özel Senaryolar ---');
const trConfig = { order: 'DMY', separator: '.' };
const mockToday = '2026-10-14';

// Senaryo 1: 32.01.2006 -> 31.01.2006
const res1 = formatDateInput('32.01.2006', trConfig, mockToday);
console.log('1. 32.01.2006 ->', res1);
if (res1 !== '31.01.2006') throw new Error(`Senaryo 1 Başarısız! Beklenen: 31.01.2006, Gelen: ${res1}`);

// Senaryo 2: 78.24.3000 -> Bugünün tarihi (14.10.2026)
const res2 = formatDateInput('78.24.3000', trConfig, mockToday);
console.log('2. 78.24.3000 ->', res2);
if (res2 !== '14.10.2026') throw new Error(`Senaryo 2 Başarısız! Beklenen: 14.10.2026, Gelen: ${res2}`);

// Senaryo 3: Ay 12 yi aşarsa (Örn: 25.14.2000 -> 25.12.2000)
const res3 = formatDateInput('25.14.2000', trConfig, mockToday);
console.log('3. 25.14.2000 ->', res3);
if (res3 !== '25.12.2000') throw new Error(`Senaryo 3 Başarısız! Beklenen: 25.12.2000, Gelen: ${res3}`);

// Senaryo 4: Nisan ayı için gün sayısı max 30 (31.04.2006 -> 30.04.2006)
const res4 = formatDateInput('31.04.2006', trConfig, mockToday);
console.log('4. 31.04.2006 ->', res4);
if (res4 !== '30.04.2006') throw new Error(`Senaryo 4 Başarısız! Beklenen: 30.04.2006, Gelen: ${res4}`);

// Senaryo 5: Şubat ayı artık yıl ve normal yıl
const res5a = formatDateInput('31.02.2024', trConfig, mockToday);
console.log('5a. 31.02.2024 (Artık yıl) ->', res5a);
if (res5a !== '29.02.2024') throw new Error(`Senaryo 5a Başarısız! Beklenen: 29.02.2024, Gelen: ${res5a}`);

const res5b = formatDateInput('31.02.2023', trConfig, mockToday);
console.log('5b. 31.02.2023 (Normal yıl) ->', res5b);
if (res5b !== '28.02.2023') throw new Error(`Senaryo 5b Başarısız! Beklenen: 28.02.2023, Gelen: ${res5b}`);

// Senaryo 6: Gelecek tarih yazıldığında bugünün tarihine sınırlanması
const res6 = formatDateInput('15.11.2099', trConfig, mockToday);
console.log('6. 15.11.2099 (Gelecek tarih) ->', res6);
if (res6 !== '14.10.2026') throw new Error(`Senaryo 6 Başarısız! Beklenen: 14.10.2026, Gelen: ${res6}`);

console.log('\nTÜM ÖZEL TESTLER BAŞARIYLA GEÇTİ!');
