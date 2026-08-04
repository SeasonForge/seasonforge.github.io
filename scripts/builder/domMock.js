// Mock browser globals for Node.js SSG execution
export function initDomMock() {
  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
      getItem: () => 'en',
      setItem: () => {}
    };
  }

  if (typeof globalThis.navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        language: 'en-US',
        userLanguage: 'en-US'
      },
      configurable: true,
      writable: true
    });
  }

  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      documentElement: {
        lang: 'en'
      },
      querySelector: () => null
    };
  }

  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }
}
