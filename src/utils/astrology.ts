import { ZodiacSign } from '../types';

/**
 * Verilen gün ve aya göre astrolojik burç bilgisini döndürür.
 */
export function getZodiacSign(day: number, month: number): ZodiacSign {
  // month: 1 - 12
  // day: 1 - 31
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return { name: 'Koç', symbol: '♈', dateRange: '21 Mart - 19 Nisan' };
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return { name: 'Boğa', symbol: '♉', dateRange: '20 Nisan - 20 Mayıs' };
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return { name: 'İkizler', symbol: '♊', dateRange: '21 Mayıs - 20 Haziran' };
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return { name: 'Yengeç', symbol: '♋', dateRange: '21 Haziran - 22 Temmuz' };
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return { name: 'Aslan', symbol: '♌', dateRange: '23 Temmuz - 22 Ağustos' };
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return { name: 'Başak', symbol: '♍', dateRange: '23 Ağustos - 22 Eylül' };
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return { name: 'Terazi', symbol: '♎', dateRange: '23 Eylül - 22 Ekim' };
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return { name: 'Akrep', symbol: '♏', dateRange: '23 Ekim - 21 Kasım' };
  }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return { name: 'Yay', symbol: '♐', dateRange: '22 Kasım - 21 Aralık' };
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return { name: 'Oğlak', symbol: '♑', dateRange: '22 Aralık - 19 Ocak' };
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return { name: 'Kova', symbol: '♒', dateRange: '20 Ocak - 18 Şubat' };
  }
  return { name: 'Balık', symbol: '♓', dateRange: '19 Şubat - 20 Mart' };
}
