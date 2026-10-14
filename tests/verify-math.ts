import {
  isLeapYear,
  daysUntilNextBirthday,
  calculateUpcomingAge,
  getNextBirthdayDate,
} from '../src/utils/birthday';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('--- Testing Leap Year Logic ---');
assert(isLeapYear(2024) === true, '2024 is a leap year');
assert(isLeapYear(2025) === false, '2025 is NOT a leap year');
assert(isLeapYear(2026) === false, '2026 is NOT a leap year');
assert(isLeapYear(2000) === true, '2000 is a leap year (divisible by 400)');
assert(isLeapYear(1900) === false, '1900 is NOT a leap year (divisible by 100 but not 400)');

console.log('\n--- Testing Birthday Calculation on Same Day ---');
// Let today be 2026-10-14
const mockToday = new Date(2026, 9, 14, 12, 0, 0); // 14 Oct 2026
const daysToday = daysUntilNextBirthday(10, 14, mockToday);
assert(daysToday === 0, `Days until birthday when birthday is today should be 0 (got ${daysToday})`);
const ageToday = calculateUpcomingAge(1996, 10, 14, mockToday);
assert(ageToday === 30, `Age today should be 2026 - 1996 = 30 (got ${ageToday})`);

console.log('\n--- Testing Birthday Tomorrow ---');
const daysTomorrow = daysUntilNextBirthday(10, 15, mockToday);
assert(daysTomorrow === 1, `Days until birthday tomorrow should be 1 (got ${daysTomorrow})`);
const ageTomorrow = calculateUpcomingAge(1996, 10, 15, mockToday);
assert(ageTomorrow === 30, `Age tomorrow should be 30 (got ${ageTomorrow})`);

console.log('\n--- Testing Birthday Yesterday (Wraps to next year) ---');
const daysYesterday = daysUntilNextBirthday(10, 13, mockToday);
// 2026-10-13 to 2027-10-13 is 364 days from 2026-10-14
assert(daysYesterday === 364, `Days until birthday yesterday should wrap to next year (364 days, got ${daysYesterday})`);
const ageYesterday = calculateUpcomingAge(1996, 10, 13, mockToday);
assert(ageYesterday === 31, `Age next year should be 2027 - 1996 = 31 (got ${ageYesterday})`);

console.log('\n--- Testing Leap Year Baby (Feb 29) in Non-Leap Year ---');
// 2026 is non-leap year. A person born on Feb 29, 2000.
// From 2026-01-01, their next birthday with 'feb28' fallback should be 2026-02-28.
const mockJan1_2026 = new Date(2026, 0, 1);
const nextDateFeb29 = getNextBirthdayDate(2, 29, mockJan1_2026, 'feb28');
assert(nextDateFeb29.getFullYear() === 2026, 'Year is 2026');
assert(nextDateFeb29.getMonth() === 1, 'Month is Feb (index 1)');
assert(nextDateFeb29.getDate() === 28, 'Day is 28 Feb in non-leap year');
const ageFeb29 = calculateUpcomingAge(2000, 2, 29, mockJan1_2026, 'feb28');
assert(ageFeb29 === 26, `Age in 2026 should be 2026 - 2000 = 26 (got ${ageFeb29})`);

console.log('\n--- Testing Leap Year Baby (Feb 29) in Leap Year ---');
// From 2028-01-01 (leap year), their next birthday should be 2028-02-29.
const mockJan1_2028 = new Date(2028, 0, 1);
const nextDate2028 = getNextBirthdayDate(2, 29, mockJan1_2028);
assert(nextDate2028.getFullYear() === 2028, 'Year is 2028');
assert(nextDate2028.getMonth() === 1, 'Month is Feb (index 1)');
assert(nextDate2028.getDate() === 29, 'Day is 29 Feb in leap year 2028');

console.log('\n--- All Math & Leap Year Verification Tests Passed! ---');
