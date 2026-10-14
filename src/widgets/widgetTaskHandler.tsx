import React from 'react';
import { Platform } from 'react-native';
import {
  WidgetTaskHandlerProps,
  requestPinWidget,
  requestWidgetUpdate,
} from 'react-native-android-widget';
import { getAllContactsSortedByUpcoming } from '../database';
import { ContactWithDetails } from '../types';
import { OSIFWidget, WidgetContactItem } from './OSIFWidget';

export async function fetchTopUpcomingWidgetContacts(): Promise<WidgetContactItem[]> {
  try {
    const list: ContactWithDetails[] = await getAllContactsSortedByUpcoming();
    return list
      .map((c: ContactWithDetails) => ({
        id: c.id,
        name: c.name,
        days: c.days_until_next_birthday ?? 999,
        age: c.upcoming_age,
        giftStatus: c.gift_status,
        buyGift: c.buy_gift ?? 1,
      }))
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const contacts = await fetchTopUpcomingWidgetContacts();
      renderWidget(<OSIFWidget contacts={contacts} />);
      break;
    }
    default:
      break;
  }
}

/**
 * Uygulama içindeki kişiler güncellendiğinde widget'ı anında yeniler.
 */
export async function refreshAppWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const contacts = await fetchTopUpcomingWidgetContacts();
    await requestWidgetUpdate({
      widgetName: 'OSIFWidget',
      renderWidget: () => <OSIFWidget contacts={contacts} />,
    });
  } catch (err) {
    // Expo Go veya widget eklenmemiş durumlarda sessizce geç
  }
}

/**
 * Kullanıcının ana ekranına widget ekleme modalı/isteği açar.
 */
export async function pinOSIFWidget(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    throw new Error('Ana ekran widget desteği sadece Android cihazlarda mevcuttur.');
  }

  try {
    const result = await requestPinWidget({
      widgetName: 'OSIFWidget',
    });
    return result;
  } catch (error) {
    throw error;
  }
}
