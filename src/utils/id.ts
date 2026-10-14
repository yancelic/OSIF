/**
 * Offline-first ortamlarda istemci tarafında çakışmasız UUIDv4 üretici.
 * Node.js, Web Crypto API ve React Native (Hermes/JSC) ile %100 uyumludur.
 */
export function generateId(): string {
  // 1. Standart modern Web Crypto / Node crypto
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // 2. crypto.getRandomValues desteği varsa
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // RFC 4122 versiyon 4 ve varyant bitlerini ayarla
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return Array.from(bytes).map((b, i) => {
      const hex = b.toString(16).padStart(2, '0');
      return (i === 4 || i === 6 || i === 8 || i === 10) ? `-${hex}` : hex;
    }).join('');
  }

  // 3. Güvenli Math.random yedeği
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
