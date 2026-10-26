import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  ContactWithDetails,
  CreateContactInput,
  GiftStatus,
  GiftTagType,
  PendingNotification,
  ScreenType,
  ThemeMode,
  UpdateContactInput,
} from '../types/index';
import {
  initDatabase,
  getAllContactsSortedByUpcoming,
  createContact,
  updateContact,
  deleteContact as dbDeleteContact,
  updateGiftStatus,
  addGiftTag,
  removeGiftTag,
  addGiftHistory,
  deleteGiftHistory,
  exportFullDatabaseJSON,
  importFullDatabaseJSON,
  batchImportCalendarCandidates,
  seedDummyData,
  clearAllData,
  getAppSetting,
  setAppSetting,
} from '../database';
import { getRealTodayDate, shiftDateByDays } from '../services/dateService';
import { notificationService } from '../services/notificationService';
import { scheduleContactNotifications } from '../services/notificationScheduler';
import { Language } from '../utils/i18n';
import { refreshAppWidget } from '../widgets/widgetTaskHandler';

const GIFT_ORDER: GiftStatus[] = ['not_started', 'searching', 'ready'];

/** 'YYYY-MM-DD' -> yerel gece yarısı Date */
const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

interface AppContextType {
  contacts: ContactWithDetails[];
  sortedContacts: ContactWithDetails[];
  selectedContact: ContactWithDetails | null;
  selectedContactId: string | null;
  activeScreen: ScreenType;
  currentSystemDate: string;
  isMockActive: boolean;
  themeMode: ThemeMode;
  language: Language;
  isDevMode: boolean;
  isReady: boolean;
  dbError: string | null;
  pendingNotifications: PendingNotification[];
  lastTriggeredAlert: string | null;

  navigateTo: (screen: ScreenType, contactId?: string) => void;
  selectContact: (contactId: string | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: Language) => Promise<void>;
  toggleDevMode: () => Promise<boolean>;

  // Kişi & Hediye işlemleri (SQLite)
  setGiftStatus: (contactId: string, status: GiftStatus) => Promise<void>;
  cycleGiftStatus: (contactId: string) => Promise<void>;
  addContact: (input: CreateContactInput) => Promise<void>;
  updateContactFull: (contactId: string, data: UpdateContactInput) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
  updateContactSizes: (contactId: string, clothing: string, shoes: string) => Promise<void>;
  addTag: (contactId: string, type: GiftTagType, title: string, url?: string | null) => Promise<void>;
  removeTag: (tagId: string) => Promise<void>;

  // Geçmiş Hediyeler
  addGiftHistoryItem: (contactId: string, year: number, title: string, price?: number | null, notes?: string | null) => Promise<void>;
  deleteGiftHistoryItem: (id: string) => Promise<void>;

  // Yedekleme (Backup & Restore)
  exportDataJSON: () => Promise<string>;
  importDataJSON: (json: string) => Promise<{ contactsCount: number }>;
  importCalendarContacts: (
    candidates: {
      id: string;
      name: string;
      birthMonth: number;
      birthDay: number;
      birthYear: number | null;
      isAlreadyInDb: boolean;
      existingContactId?: string;
      selectedPriorityTier: import('../types/index').PriorityTier;
    }[]
  ) => Promise<{ insertedCount: number; updatedCount: number; affectedIds: string[] }>;

  // Mock Date (Zaman Yolculuğu)
  setMockDate: (newDate: string) => void;
  resetMockDate: () => void;
  shiftDate: (days: number) => void;

  // Veritabanı müdahalesi
  resetDatabase: () => Promise<void>;
  seedDatabase: () => Promise<void>;

  // Bildirimler
  triggerTestNotifications: (delaySeconds?: number) => void;
  refreshPendingNotifications: () => Promise<void>;
  cancelNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<ContactWithDetails[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [language, setLanguageState] = useState<Language>('tr');
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  const [systemDate, setSystemDateState] = useState<string>(getRealTodayDate());
  const [isMockActive, setIsMockActive] = useState<boolean>(false);

  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  const [lastTriggeredAlert, setLastTriggeredAlert] = useState<string | null>(null);

  const requestId = useRef(0);
  const systemDateRef = useRef(systemDate);
  systemDateRef.current = systemDate;

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const list = await getAllContactsSortedByUpcoming(parseLocalDate(systemDateRef.current));
      if (id === requestId.current) {
        setContacts(list);
        setDbError(null);
        refreshAppWidget().catch(() => {});
      }
    } catch (e) {
      setDbError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Açılış: şemayı hazırla, ayarları yükle, ardından kişileri yükle
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const savedTheme = await getAppSetting('themeMode');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeMode(savedTheme);
        }
        const savedLang = await getAppSetting('language');
        if (savedLang === 'tr' || savedLang === 'en') {
          setLanguageState(savedLang);
        }
        const savedDevMode = await getAppSetting('dev_mode_enabled');
        if (savedDevMode === '1') {
          setIsDevMode(true);
        }
        await reload();
        setIsReady(true);
      } catch (e) {
        setDbError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [reload]);

  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    setAppSetting('themeMode', mode).catch(() => {});
  };

  const handleSetLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await setAppSetting('language', lang);
  };

  const toggleDevMode = async (): Promise<boolean> => {
    const next = !isDevMode;
    setIsDevMode(next);
    await setAppSetting('dev_mode_enabled', next ? '1' : '0');
    return next;
  };

  useEffect(() => {
    if (isReady) reload();
  }, [systemDate, isReady, reload]);

  const refreshPendingNotifications = async () => {
    const list = await notificationService.getAllPendingNotifications();
    setPendingNotifications([...list]);
  };

  useEffect(() => {
    refreshPendingNotifications();
  }, []);

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  const selectContact = (contactId: string | null) => {
    setSelectedContactId(contactId);
  };

  const navigateTo = (screen: ScreenType, contactId?: string) => {
    if (contactId !== undefined) setSelectedContactId(contactId);
    setActiveScreen(screen);
  };

  const setGiftStatus = async (contactId: string, status: GiftStatus) => {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, gift_status: status } : c)));
    try {
      await updateGiftStatus(contactId, status);
    } catch (e) {
      setDbError(e instanceof Error ? e.message : String(e));
      await reload();
    }
  };

  const cycleGiftStatus = async (contactId: string) => {
    const current = contacts.find((c) => c.id === contactId);
    if (!current) return;
    const next = GIFT_ORDER[(GIFT_ORDER.indexOf(current.gift_status) + 1) % GIFT_ORDER.length];
    await setGiftStatus(contactId, next);
  };

  const addContact = async (input: CreateContactInput) => {
    const created = await createContact(input);
    try {
      await scheduleContactNotifications(created);
    } catch (err) {
      console.warn('Bildirim planlanırken uyarı:', err);
    }
    await reload();
  };

  const updateContactFull = async (contactId: string, data: UpdateContactInput) => {
    const updated = await updateContact(contactId, data);
    try {
      await scheduleContactNotifications(updated);
    } catch (err) {
      console.warn('Bildirim güncellenirken uyarı:', err);
    }
    await reload();
  };

  const deleteContact = async (contactId: string) => {
    await dbDeleteContact(contactId);
    if (selectedContactId === contactId) {
      setSelectedContactId(null);
      setActiveScreen('dashboard');
    }
    await reload();
  };

  const updateContactSizes = async (contactId: string, clothing: string, shoes: string) => {
    await updateContact(contactId, {
      clothing_size: clothing.trim() || null,
      shoe_size: shoes.trim() || null,
    });
    await reload();
  };

  const addTag = async (contactId: string, type: GiftTagType, title: string, url?: string | null) => {
    const clean = title.trim();
    if (!clean) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact?.gift_tags.some((t) => t.type === type && t.title.toLowerCase() === clean.toLowerCase())) return;
    await addGiftTag(contactId, { type, title: clean, url: url || null });
    await reload();
  };

  const removeTag = async (tagId: string) => {
    setContacts((prev) =>
      prev.map((c) => ({ ...c, gift_tags: c.gift_tags.filter((t) => t.id !== tagId) }))
    );
    try {
      await removeGiftTag(tagId);
    } catch (e) {
      setDbError(e instanceof Error ? e.message : String(e));
      await reload();
    }
  };

  const addGiftHistoryItem = async (
    contactId: string,
    year: number,
    title: string,
    price?: number | null,
    notes?: string | null
  ) => {
    await addGiftHistory(contactId, { year, title, price, notes });
    await reload();
  };

  const deleteGiftHistoryItem = async (id: string) => {
    await deleteGiftHistory(id);
    await reload();
  };

  const exportDataJSON = async () => {
    return await exportFullDatabaseJSON();
  };

  const importDataJSON = async (json: string) => {
    const result = await importFullDatabaseJSON(json);
    await reload();
    return result;
  };

  const importCalendarContacts = async (
    candidates: Parameters<typeof batchImportCalendarCandidates>[0]
  ) => {
    const result = await batchImportCalendarCandidates(candidates);
    await reload();
    return result;
  };

  // --- Mock date ---
  const setMockDate = (newDate: string) => {
    setSystemDateState(newDate);
    setIsMockActive(true);
  };
  const resetMockDate = () => {
    setSystemDateState(getRealTodayDate());
    setIsMockActive(false);
  };
  const shiftDate = (days: number) => {
    setSystemDateState(shiftDateByDays(systemDate, days));
    setIsMockActive(true);
  };

  // --- Veritabanı müdahalesi ---
  const resetDatabase = async () => {
    await clearAllData();
    await notificationService.clearAllNotifications();
    setSelectedContactId(null);
    setPendingNotifications([]);
    setLastTriggeredAlert('Veritabanı sıfırlandı. Tüm kayıtlar silindi.');
    await reload();
  };

  const seedDatabase = async () => {
    await seedDummyData();
    setLastTriggeredAlert('Dummy veri (Seed Data) SQLite\'a yüklendi.');
    await reload();
  };

  // --- Bildirimler ---
  const triggerTestNotifications = (delaySeconds: number = 5) => {
    setLastTriggeredAlert(`Bildirimler ${delaySeconds} saniye sonraya kuruldu. Sayaç başladı.`);
    notificationService.scheduleAllForTest(contacts, delaySeconds, (triggered) => {
      setLastTriggeredAlert(`İletildi: "${triggered.title}" — ${triggered.body}`);
      refreshPendingNotifications();
    });
    refreshPendingNotifications();
  };

  const cancelNotification = async (id: string) => {
    await notificationService.cancelNotification(id);
    await refreshPendingNotifications();
  };

  const clearAllNotifications = async () => {
    await notificationService.clearAllNotifications();
    await refreshPendingNotifications();
    setLastTriggeredAlert('Tüm bildirimler iptal edildi ve liste temizlendi.');
  };

  return (
    <AppContext.Provider
      value={{
        contacts,
        sortedContacts: contacts,
        selectedContact,
        selectedContactId,
        activeScreen,
        currentSystemDate: systemDate,
        isMockActive,
        themeMode,
        language,
        isDevMode,
        isReady,
        dbError,
        pendingNotifications,
        lastTriggeredAlert,
        navigateTo,
        selectContact,
        setThemeMode: handleSetThemeMode,
        setLanguage: handleSetLanguage,
        setGiftStatus,
        cycleGiftStatus,
        addContact,
        updateContactFull,
        deleteContact,
        updateContactSizes,
        addTag,
        removeTag,
        addGiftHistoryItem,
        deleteGiftHistoryItem,
        exportDataJSON,
        importDataJSON,
        importCalendarContacts,
        setMockDate,
        resetMockDate,
        shiftDate,
        resetDatabase,
        seedDatabase,
        triggerTestNotifications,
        refreshPendingNotifications,
        cancelNotification,
        clearAllNotifications,
        toggleDevMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
