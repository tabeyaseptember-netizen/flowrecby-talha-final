// IndexedDB helper for storing recordings and screenshots
const DB_NAME = 'screen-recorder-db';
const DB_VERSION = 1;
const RECORDINGS_STORE = 'recordings';
const SCREENSHOTS_STORE = 'screenshots';

interface StoredRecording {
  id: string;
  blobData: ArrayBuffer;
  duration: number;
  timestamp: string;
  thumbnail?: string;
  resolution: string;
  size: number;
}

interface StoredScreenshot {
  id: string;
  blobData: ArrayBuffer;
  timestamp: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        db.createObjectStore(RECORDINGS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SCREENSHOTS_STORE)) {
        db.createObjectStore(SCREENSHOTS_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Recording functions
export async function saveRecording(recording: {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  thumbnail?: string;
  resolution: string;
  size: number;
}): Promise<void> {
  const db = await openDB();
  const arrayBuffer = await recording.blob.arrayBuffer();
  
  const storedRecording: StoredRecording = {
    id: recording.id,
    blobData: arrayBuffer,
    duration: recording.duration,
    timestamp: recording.timestamp.toISOString(),
    thumbnail: recording.thumbnail,
    resolution: recording.resolution,
    size: recording.size,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RECORDINGS_STORE, 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.put(storedRecording);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadRecordings(): Promise<Array<{
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
  thumbnail?: string;
  resolution: string;
  size: number;
}>> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RECORDINGS_STORE, 'readonly');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const storedRecordings: StoredRecording[] = request.result;
      const recordings = storedRecordings.map((stored) => {
        const blob = new Blob([stored.blobData], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        return {
          id: stored.id,
          blob,
          url,
          duration: stored.duration,
          timestamp: new Date(stored.timestamp),
          thumbnail: stored.thumbnail,
          resolution: stored.resolution,
          size: stored.size,
        };
      });
      // Sort by timestamp descending
      recordings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      resolve(recordings);
    };
  });
}

export async function deleteStoredRecording(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RECORDINGS_STORE, 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Screenshot functions
export async function saveScreenshot(screenshot: {
  id: string;
  blob: Blob;
  timestamp: Date;
}): Promise<void> {
  const db = await openDB();
  const arrayBuffer = await screenshot.blob.arrayBuffer();
  
  const storedScreenshot: StoredScreenshot = {
    id: screenshot.id,
    blobData: arrayBuffer,
    timestamp: screenshot.timestamp.toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readwrite');
    const store = transaction.objectStore(SCREENSHOTS_STORE);
    const request = store.put(storedScreenshot);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadScreenshots(): Promise<Array<{
  id: string;
  blob: Blob;
  url: string;
  timestamp: Date;
}>> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readonly');
    const store = transaction.objectStore(SCREENSHOTS_STORE);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const storedScreenshots: StoredScreenshot[] = request.result;
      const screenshots = storedScreenshots.map((stored) => {
        const blob = new Blob([stored.blobData], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        return {
          id: stored.id,
          blob,
          url,
          timestamp: new Date(stored.timestamp),
        };
      });
      // Sort by timestamp descending
      screenshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      resolve(screenshots);
    };
  });
}

export async function deleteStoredScreenshot(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readwrite');
    const store = transaction.objectStore(SCREENSHOTS_STORE);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
