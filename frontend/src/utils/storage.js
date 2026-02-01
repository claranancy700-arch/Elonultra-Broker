// Safe storage wrapper with in-memory fallback for environments
// where localStorage is unavailable or blocked (e.g., some iframes/privacy modes)
let storageAvailable = true;
try {
  const test = '__storage_test__';
  localStorage.setItem(test, test);
  localStorage.removeItem(test);
  storageAvailable = true;
} catch (e) {
  storageAvailable = false;
}

const inMemoryStore = Object.create(null);

export const safeGetItem = (key) => {
  try {
    if (storageAvailable) {
      return localStorage.getItem(key);
    }
    // return from in-memory fallback
    return Object.prototype.hasOwnProperty.call(inMemoryStore, key)
      ? inMemoryStore[key]
      : null;
  } catch (e) {
    console.warn(`safeGetItem failed for key "${key}":`, e?.message || e);
    return null;
  }
};

export const safeSetItem = (key, value) => {
  try {
    if (storageAvailable) {
      localStorage.setItem(key, value);
      return;
    }
    inMemoryStore[key] = String(value);
  } catch (e) {
    console.warn(`safeSetItem failed for key "${key}":`, e?.message || e);
  }
};

export const safeRemoveItem = (key) => {
  try {
    if (storageAvailable) {
      localStorage.removeItem(key);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(inMemoryStore, key)) {
      delete inMemoryStore[key];
    }
  } catch (e) {
    console.warn(`safeRemoveItem failed for key "${key}":`, e?.message || e);
  }
};

export const safeGetAllItems = () => {
  const items = {};
  try {
    if (storageAvailable) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        items[k] = localStorage.getItem(k);
      }
      return items;
    }
    return { ...inMemoryStore };
  } catch (e) {
    console.warn('safeGetAllItems failed:', e?.message || e);
    return items;
  }
};
