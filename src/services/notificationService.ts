import { Alert, Platform } from 'react-native';
import * as Notifications from './safeNotifications';
import { ContactWithDetails, PendingNotification } from '../types/index';
import { haptic } from '../ui/haptics';

// Uygulama açıkken (foreground) bildirimlerin sesli ve banner olarak görünmesini sağlar
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Expo Go (SDK 53+) üzerinde bu çağrı desteklenmeyebilir
}

/**
 * Headless Bildirim Servisi
 * Bildirim planlama, sorgulama ve test tetikleme mantığını yönetir.
 * Expo Go SDK 53+ bildirim kısıtlamalarına karşı %100 korumalı ve simülasyon fallback'lidir.
 */
class NotificationService {
  private pendingList: PendingNotification[] = [];
  private activeTimers: Map<string, any> = new Map();
  private isConfigured = false;
  private isNativeAvailable: boolean | null = null;

  /**
   * Cihazda native bildirimlerin desteklenip desteklenmediğini döner
   */
  getNativeStatus(): { supported: boolean | null; isExpoGo: boolean } {
    return {
      supported: this.isNativeAvailable,
      isExpoGo: this.isNativeAvailable === false,
    };
  }

  /**
   * Bildirim izinlerini kontrol eder/ister ve Android için bildirim kanalı oluşturur
   */
  async ensurePermissionsAndChannel(): Promise<boolean> {
    if (this.isNativeAvailable === false) return false;
    if (this.isConfigured) return true;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('birthday-reminders', {
          name: 'Doğum Günü Hatırlatmaları',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D97706',
          enableVibrate: true,
          sound: 'default',
        });
      }
      this.isConfigured = true;
      this.isNativeAvailable = true;
      return finalStatus === 'granted';
    } catch (e) {
      // Expo Go'da SDK 53+ ile notifications desteği kaldırıldığında buraya düşer
      this.isNativeAvailable = false;
      return false;
    }
  }

  /**
   * Sistemdeki tüm bekleyen bildirimleri getirir
   */
  async getAllPendingNotifications(): Promise<PendingNotification[]> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      if (scheduled && scheduled.length > 0) {
        return scheduled.map((s) => ({
          id: s.identifier,
          contactId: (s.content.data?.contactId as string) || '',
          contactName: (s.content.data?.name as string) || (s.content.title || 'Bildirim'),
          scheduledTime: new Date().toISOString(),
          title: s.content.title || '',
          body: s.content.body || '',
          payload: (s.content.data as any) || {},
          status: 'pending' as const,
        }));
      }
    } catch {}
    return [...this.pendingList];
  }

  /**
   * Tüm kontaklar için belirtilen saniye sonraya bildirim kurar ve tetikler
   */
  scheduleAllForTest(
    contacts: ContactWithDetails[],
    delaySeconds: number,
    onTriggerCallback?: (notification: PendingNotification) => void
  ): PendingNotification[] {
    const now = new Date();
    const scheduledDate = new Date(now.getTime() + delaySeconds * 1000);
    const newNotifications: PendingNotification[] = [];

    // İzinleri ve kanalı arka planda hazırla
    this.ensurePermissionsAndChannel().catch(() => {});

    contacts.forEach((contact, index) => {
      const notifId = `notif_test_${Date.now()}_${contact.id}_${index}`;
      const likes = contact.gift_tags.filter(t => t.type === 'like').map(t => t.title);
      const dislikes = contact.gift_tags.filter(t => t.type === 'dislike').map(t => t.title);
      const wishlist = contact.gift_tags.filter(t => t.type === 'wishlist_item').map(t => t.title);
      const notification: PendingNotification = {
        id: notifId,
        contactId: contact.id,
        contactName: contact.name,
        scheduledTime: scheduledDate.toISOString(),
        title: `Hediye Hatırlatması: ${contact.name}`,
        body: `${contact.name} için hediye hazırlığı! Durum: ${contact.gift_status}. Bedenler: ${contact.clothing_size || 'Belirtilmedi'} / ${contact.shoe_size || 'Belirtilmedi'}`,
        payload: {
          contactId: contact.id,
          name: contact.name,
          priorityTier: contact.priority_tier,
          giftStatus: contact.gift_status,
          daysUntilNextBirthday: contact.days_until_next_birthday,
          upcomingAge: contact.upcoming_age,
          clothingSize: contact.clothing_size,
          shoeSize: contact.shoe_size,
          likes,
          dislikes,
          wishlist,
          triggeredAtTarget: scheduledDate.toISOString(),
          testRun: true
        },
        status: 'pending'
      };

      this.pendingList.push(notification);
      newNotifications.push(notification);

      // 1. Cihazın işletim sistemine gerçek yerel bildirim fırlat (Expo Go SDK 53+ kısıtlamasına karşı korumalı)
      if (this.isNativeAvailable !== false) {
        try {
          Notifications.scheduleNotificationAsync({
            identifier: notifId,
            content: {
              title: notification.title,
              body: notification.body,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              ...(Platform.OS === 'android' ? { channelId: 'birthday-reminders' } : {}),
              data: notification.payload,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.max(1, delaySeconds + index * 1), // Üst üste binmemesi için hafif kademeli
            },
          }).catch(() => {
            this.isNativeAvailable = false;
          });
        } catch {
          this.isNativeAvailable = false;
        }
      }

      // 2. Uygulama içi debug durumu için JavaScript timer'ı
      const timer = setTimeout(() => {
        const found = this.pendingList.find(n => n.id === notifId);
        if (found) {
          found.status = 'triggered';
          haptic('success');
          if (onTriggerCallback) {
            onTriggerCallback({ ...found });
          }
        }
        this.activeTimers.delete(notifId);
      }, delaySeconds * 1000);

      this.activeTimers.set(notifId, timer);
    });

    return newNotifications;
  }

  /**
   * Tekil bildirim iptal etme
   */
  async cancelNotification(id: string): Promise<void> {
    if (this.activeTimers.has(id)) {
      clearTimeout(this.activeTimers.get(id));
      this.activeTimers.delete(id);
    }
    this.pendingList = this.pendingList.filter(n => n.id !== id);
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }

  /**
   * Tüm bildirim kuyruğunu temizleme
   */
  async clearAllNotifications(): Promise<void> {
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
    this.pendingList = [];
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
  }
}

export const notificationService = new NotificationService();
