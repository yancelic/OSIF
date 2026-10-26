import { extractNameFromEventTitle } from '../src/utils/calendarUtils';
import { CULTURAL_EVENT_TEMPLATES, getNthSundayOfMonth, getTemplateEventDate } from '../src/utils/culturalDates';

console.log('--- Running OSIF v2.0 Feature Verification Tests ---');

// 1. Test Event Title extraction
const tests = [
  { raw: "Ahmet Yılmaz'ın Doğum Günü", expected: "Ahmet Yılmaz" },
  { raw: "Ayşe'nin Doğum Günü", expected: "Ayşe" },
  { raw: "Can'ın Doğum Günü", expected: "Can" },
  { raw: "Zeynep Doğum Günü", expected: "Zeynep" },
  { raw: "Doğum Günü: Mehmet Can", expected: "Mehmet Can" },
  { raw: "Birthday of Jane Doe", expected: "Jane Doe" },
  { raw: "Alice's Birthday", expected: "Alice" },
  { raw: "Kerem Aksoy - Doğum Günü", expected: "Kerem Aksoy" },
];

for (const t of tests) {
  const result = extractNameFromEventTitle(t.raw);
  if (result === t.expected) {
    console.log(`PASS: "${t.raw}" -> "${result}"`);
  } else {
    console.error(`FAIL: "${t.raw}" -> expected "${t.expected}", got "${result}"`);
    process.exit(1);
  }
}

// 2. Test Cultural Templates Count and Keys
if (CULTURAL_EVENT_TEMPLATES.length === 6) {
  console.log(`PASS: 6 cultural event templates registered`);
} else {
  console.error(`FAIL: expected 6 templates, got ${CULTURAL_EVENT_TEMPLATES.length}`);
  process.exit(1);
}

// 3. Test Dynamic vs Static Dates
const mothersDay = CULTURAL_EVENT_TEMPLATES.find(t => t.key === 'mothers_day')!;
const valentinesDay = CULTURAL_EVENT_TEMPLATES.find(t => t.key === 'valentines_day')!;

if (mothersDay.isDynamic === true && valentinesDay.isDynamic === false) {
  console.log('PASS: isDynamic flags are correct');
} else {
  console.error('FAIL: isDynamic flags unexpected');
  process.exit(1);
}

const vDate = valentinesDay.calculateDate(2026);
if (vDate.month === 2 && vDate.day === 14) {
  console.log('PASS: Valentine date is Feb 14');
} else {
  console.error('FAIL: Valentine date error', vDate);
  process.exit(1);
}

console.log('--- All OSIF v2.0 Feature Verification Tests Passed! ---');
