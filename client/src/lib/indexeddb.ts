// IndexedDB utility for large dataset storage
export class IndexedDBStorage {
  private dbName: string;
  private version: number;
  private storeName: string;

  constructor(dbName: string = 'education-db', version: number = 1, storeName: string = 'education-data') {
    this.dbName = dbName;
    this.version = version;
    this.storeName = storeName;
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const data = {
        key,
        value: JSON.stringify(value),
        timestamp: Date.now()
      };

      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB setItem error:', error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.value) {
            try {
              const parseStartTime = performance.now();
              const data = JSON.parse(result.value);
              const parseTime = performance.now() - parseStartTime;
              const totalTime = performance.now() - startTime;
              
              console.log(`IndexedDB getItem "${key}": ${totalTime.toFixed(1)}ms (parse: ${parseTime.toFixed(1)}ms)`);
              resolve(data);
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              resolve(null);
            }
          } else {
            const totalTime = performance.now() - startTime;
            console.log(`IndexedDB getItem "${key}": ${totalTime.toFixed(1)}ms (no data)`);
            resolve(null);
          }
        };
      });
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`IndexedDB getItem "${key}" error (${totalTime.toFixed(1)}ms):`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.error('IndexedDB getAllKeys error:', error);
      return [];
    }
  }

  async getSize(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const data = await this.getItem(key);
        if (data) {
          totalSize += JSON.stringify(data).length;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('IndexedDB getSize error:', error);
      return 0;
    }
  }
}

// 싱글톤 인스턴스
export const educationDB = new IndexedDBStorage('education-db', 1, 'education-data');