import { useEffect, useState, useCallback } from 'react';

interface OfflineDataStore {
  sales: any[];
  debtPayments: any[];
  lastSync: string;
}

const DB_NAME = 'NEXA_OFFLINE';
const STORE_NAME = 'data';

/**
 * Hook to manage offline functionality:
 * - Detects online/offline status
 * - Caches sales and debt payment data to IndexedDB
 * - Provides methods to enable/disable offline mode
 */
export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [cachedData, setCachedData] = useState<OfflineDataStore | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Initialize IndexedDB
  const initDB = useCallback(async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }, []);

  // Save data to IndexedDB
  const cacheData = useCallback(async (data: OfflineDataStore) => {
    try {
      const db = await initDB();
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Clear and insert new data
      await new Promise((resolve, reject) => {
        const clearReq = store.clear();
        clearReq.onsuccess = () => {
          store.put({ id: 'offlineData', ...data });
          resolve(null);
        };
        clearReq.onerror = () => reject(clearReq.error);
      });

      setCachedData(data);
      setSyncStatus('synced');
      console.log('✅ Offline data cached:', data);
    } catch (err) {
      console.error('Failed to cache offline data:', err);
      setSyncStatus('error');
    }
  }, [initDB]);

  // Retrieve cached data from IndexedDB
  const getCachedData = useCallback(async (): Promise<OfflineDataStore | null> => {
    try {
      const db = await initDB();
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get('offlineData');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to retrieve cached offline data:', err);
      return null;
    }
  }, [initDB]);

  // Toggle offline mode
  const toggleOfflineMode = useCallback(async () => {
    const newState = !offlineEnabled;
    setOfflineEnabled(newState);

    if (newState) {
      setSyncStatus('syncing');
      // In a real scenario, you'd fetch fresh data here
      const cached = await getCachedData();
      if (cached) {
        setCachedData(cached);
        setSyncStatus('synced');
      } else {
        console.warn('⚠️ No cached data available. You may experience limited functionality.');
        setSyncStatus('error');
      }
    } else {
      setSyncStatus('idle');
    }
  }, [offlineEnabled, getCachedData]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('idle');
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



  return {
    isOnline,
    offlineEnabled,
    toggleOfflineMode,
    cacheData,
    getCachedData,
    cachedData,
    syncStatus,
  };
}
