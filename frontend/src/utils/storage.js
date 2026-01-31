// Safe localStorage wrapper that handles access denied errors
const isStorageAvailable = () => {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export const safeGetItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage getItem failed for key "${key}":`, e.message);
    return null;
  }
};

export const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage setItem failed for key "${key}":`, e.message);
  }
};

export const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage removeItem failed for key "${key}":`, e.message);
  }
};

export const safeGetAllItems = () => {
  const items = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items[key] = localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('localStorage access failed:', e.message);
  }
  return items;
};
