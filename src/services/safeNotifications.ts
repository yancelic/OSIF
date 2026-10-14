/**
 * Safe Notifications Adapter for Expo Go (SDK 53+)
 * 
 * Expo Go SDK 53+ sürümünde expo-notifications paketinin native desteği
 * kaldırılmıştır. Bu adaptör, uygulamanın Expo Go üzerinde çökmesini
 * (RedBox exception) %100 engeller, güvenli bir fallback sunar.
 * Development Build ortamında ise gerçek expo-notifications modülünü kullanır.
 */

export interface SafeNotificationTrigger {
  type?: string;
  seconds?: number;
  date?: Date;
  [key: string]: unknown;
}

export interface SafeNotificationContent {
  title?: string | null;
  body?: string | null;
  sound?: string | boolean;
  priority?: string;
  channelId?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SafeNotificationRequest {
  identifier: string;
  content: SafeNotificationContent;
  trigger: SafeNotificationTrigger;
}

export type NotificationRequest = SafeNotificationRequest;
export type DateTriggerInput = any;

let nativeModule: any = null;
let isNativeSupported = false;

try {
  // Expo Go üzerinde doğrudan 'import' patladığı için dinamik require ile güvenli deneme yapılır
  const required = require('expo-notifications');
  if (required && typeof required.getPermissionsAsync === 'function') {
    nativeModule = required;
    isNativeSupported = true;
  }
} catch (e) {
  // Expo Go SDK 53+ üzerinde native modül bulunamadığında sessizce fallback'e geçer
  nativeModule = null;
  isNativeSupported = false;
}

export const isNotificationsSupported = isNativeSupported;

export const AndroidImportance = nativeModule?.AndroidImportance ?? {
  MAX: 5,
  HIGH: 4,
  DEFAULT: 3,
  LOW: 2,
  MIN: 1,
  NONE: 0,
};

export const AndroidNotificationPriority = nativeModule?.AndroidNotificationPriority ?? {
  MAX: 'max',
  HIGH: 'high',
  DEFAULT: 'default',
  LOW: 'low',
  MIN: 'min',
};

export const SchedulableTriggerInputTypes = nativeModule?.SchedulableTriggerInputTypes ?? {
  TIME_INTERVAL: 'timeInterval',
  DATE: 'date',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CALENDAR: 'calendar',
};

export const setNotificationHandler = (handler: any) => {
  if (isNativeSupported && nativeModule?.setNotificationHandler) {
    try {
      nativeModule.setNotificationHandler(handler);
    } catch {}
  }
};

export const getPermissionsAsync = async () => {
  if (isNativeSupported && nativeModule?.getPermissionsAsync) {
    try {
      return await nativeModule.getPermissionsAsync();
    } catch {}
  }
  return { status: 'denied', granted: false };
};

export const requestPermissionsAsync = async () => {
  if (isNativeSupported && nativeModule?.requestPermissionsAsync) {
    try {
      return await nativeModule.requestPermissionsAsync();
    } catch {}
  }
  return { status: 'denied', granted: false };
};

export const setNotificationChannelAsync = async (channelId: string, channel: any) => {
  if (isNativeSupported && nativeModule?.setNotificationChannelAsync) {
    try {
      return await nativeModule.setNotificationChannelAsync(channelId, channel);
    } catch {}
  }
  return null;
};

export const scheduleNotificationAsync = async (request: {
  identifier?: string;
  content: SafeNotificationContent;
  trigger: any;
}): Promise<string> => {
  if (isNativeSupported && nativeModule?.scheduleNotificationAsync) {
    try {
      return await nativeModule.scheduleNotificationAsync(request);
    } catch {}
  }
  return request.identifier || `mock_notif_${Date.now()}`;
};

export const cancelScheduledNotificationAsync = async (identifier: string): Promise<void> => {
  if (isNativeSupported && nativeModule?.cancelScheduledNotificationAsync) {
    try {
      await nativeModule.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }
};

export const cancelAllScheduledNotificationsAsync = async (): Promise<void> => {
  if (isNativeSupported && nativeModule?.cancelAllScheduledNotificationsAsync) {
    try {
      await nativeModule.cancelAllScheduledNotificationsAsync();
    } catch {}
  }
};

export const getAllScheduledNotificationsAsync = async (): Promise<SafeNotificationRequest[]> => {
  if (isNativeSupported && nativeModule?.getAllScheduledNotificationsAsync) {
    try {
      return await nativeModule.getAllScheduledNotificationsAsync();
    } catch {}
  }
  return [];
};

export default {
  isSupported: isNotificationsSupported,
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  AndroidImportance,
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
};
