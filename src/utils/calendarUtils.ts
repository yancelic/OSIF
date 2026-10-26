/**
 * Etkinlik başlığından kişi ismini temizleyerek ayıklar.
 * Örn:
 * - "Ahmet Yılmaz'ın Doğum Günü" -> "Ahmet Yılmaz"
 * - "Birthday of John Doe" -> "John Doe"
 * - "Can Demir - Doğum Günü" -> "Can Demir"
 * - "Zeynep Doğum Günü" -> "Zeynep"
 */
export function extractNameFromEventTitle(rawTitle: string): string {
  let clean = rawTitle.trim();

  // Türkçe iyelik kalıpları: "Ahmet'in Doğum Günü", "Ayşe'nin Doğum Günü", "Can'ın Doğum Günü"
  clean = clean.replace(/['’](?:in|ın|ün|un|nin|nın|nün|nun)\s+doğum\s+günü/gi, '');
  clean = clean.replace(/\s+doğum\s+günü/gi, '');
  clean = clean.replace(/^doğum\s+günü\s*[:-]?\s*/gi, '');

  // İngilizce kalıplar: "Birthday of John", "John's Birthday"
  clean = clean.replace(/^birthday\s+(?:of\s+)?/gi, '');
  clean = clean.replace(/['’]s\s+birthday/gi, '');
  clean = clean.replace(/\s+birthday/gi, '');

  // Tire veya parantez sonlarını temizle
  clean = clean.replace(/\s*[-–]\s*.*$/, '');
  clean = clean.replace(/\s*\(.*\)$/, '');

  return clean.trim() || rawTitle.trim();
}
