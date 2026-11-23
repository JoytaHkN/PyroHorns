/** AsyncStorage en memoria para las pruebas en node. */
const data = new Map<string, string>();

const AsyncStorage = {
  getItem: async (key: string) => data.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    data.set(key, value);
  },
  removeItem: async (key: string) => {
    data.delete(key);
  },
  clear: async () => {
    data.clear();
  },
};

export default AsyncStorage;
