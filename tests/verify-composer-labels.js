// Verification script for Turkish possessive and composer placeholder behavior

function getTurkishPossessive(name) {
  const trimmed = (name || '').trim();
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
}

function getComposerPlaceholder(type, name) {
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
}

const namesToTest = [
  { input: 'Ahmet', expected: "Ahmet'in" },
  { input: 'Mehmet', expected: "Mehmet'in" },
  { input: 'Ali', expected: "Ali'nin" },
  { input: 'Ayşe', expected: "Ayşe'nin" },
  { input: 'Can', expected: "Can'ın" },
  { input: 'Murat', expected: "Murat'ın" },
  { input: 'Sıla', expected: "Sıla'nın" },
  { input: 'Banu', expected: "Banu'nun" },
  { input: 'Yusuf', expected: "Yusuf'un" },
  { input: 'Gül', expected: "Gül'ün" },
  { input: 'Gözde', expected: "Gözde'nin" },
  { input: 'Ömür', expected: "Ömür'ün" },
  { input: 'Ebru', expected: "Ebru'nun" },
  { input: 'Burak', expected: "Burak'ın" },
  { input: 'Muhsin', expected: "Muhsin'in" },
];

console.log('--- Testing Turkish Possessive Generation ---');
let allPassed = true;
for (const { input, expected } of namesToTest) {
  const result = getTurkishPossessive(input);
  const pass = result === expected;
  console.log(`${pass ? '✓' : '✗'} ${input} -> ${result} (expected: ${expected})`);
  if (!pass) allPassed = false;
}

console.log('\n--- Testing Placeholder Generation ---');
const tests = [
  { type: 'wishlist_item', name: 'Ahmet', expected: 'Yeni bir hediye fikri…' },
  { type: 'like', name: 'Ahmet', expected: "Ahmet'in zevklerinden biri…" },
  { type: 'like', name: 'Ayşe', expected: "Ayşe'nin zevklerinden biri…" },
  { type: 'dislike', name: 'Ahmet', expected: 'Hoşlanmadıkları…' },
  { type: 'dislike', name: 'Ayşe', expected: 'Hoşlanmadıkları…' },
];

for (const { type, name, expected } of tests) {
  const result = getComposerPlaceholder(type, name);
  const pass = result === expected;
  console.log(`${pass ? '✓' : '✗'} [${type}] for ${name} -> "${result}" (expected: "${expected}")`);
  if (!pass) allPassed = false;
}

if (allPassed) {
  console.log('\nALL TESTS PASSED!');
  process.exit(0);
} else {
  console.error('\nSOME TESTS FAILED!');
  process.exit(1);
}
