import { CULTURAL_EVENT_TEMPLATES, getNthSundayOfMonth, getTemplateEventDate } from '../src/utils/culturalDates';

console.log('--- Testing Cultural Dates Calculation ---');

// 2026 Anneler Günü: Mayıs 2026'da 1 Mayıs Cuma, 3 Mayıs 1. Pazar, 10 Mayıs 2. Pazar.
const mothersDay2026 = getNthSundayOfMonth(2026, 4, 2);
if (mothersDay2026 === 10) {
  console.log('PASS: Mothers day 2026 is 10 May (got 10)');
} else {
  console.error(`FAIL: Mothers day 2026 should be 10 May, got ${mothersDay2026}`);
  process.exit(1);
}

// 2026 Babalar Günü: Haziran 2026'da 1 Haziran Pazartesi, 7 Haziran 1. Pazar, 14 Haziran 2. Pazar, 21 Haziran 3. Pazar.
const fathersDay2026 = getNthSundayOfMonth(2026, 5, 3);
if (fathersDay2026 === 21) {
  console.log('PASS: Fathers day 2026 is 21 June (got 21)');
} else {
  console.error(`FAIL: Fathers day 2026 should be 21 June, got ${fathersDay2026}`);
  process.exit(1);
}

// 2027 Anneler Günü: Mayıs 2027'de 1 Mayıs Cumartesi, 2 Mayıs 1. Pazar, 9 Mayıs 2. Pazar.
const mothersDay2027 = getNthSundayOfMonth(2027, 4, 2);
if (mothersDay2027 === 9) {
  console.log('PASS: Mothers day 2027 is 9 May (got 9)');
} else {
  console.error(`FAIL: Mothers day 2027 should be 9 May, got ${mothersDay2027}`);
  process.exit(1);
}

// Test rollover to next year if date passed
const mothersTemplate = CULTURAL_EVENT_TEMPLATES.find((t) => t.key === 'mothers_day')!;
const postMothersDay2026 = new Date(2026, 5, 1); // 1 June 2026
const nextEvent = getTemplateEventDate(mothersTemplate, postMothersDay2026);
if (nextEvent.year === 2027 && nextEvent.month === 5 && nextEvent.day === 9 && nextEvent.isNextYear) {
  console.log('PASS: Rollover to next year works correctly (9 May 2027)');
} else {
  console.error('FAIL: Rollover failed', nextEvent);
  process.exit(1);
}

console.log('--- All Cultural Date Calculations Passed! ---');
