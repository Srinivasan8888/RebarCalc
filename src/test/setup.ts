import '@testing-library/jest-dom'

// Node 22+ ships its own `localStorage` global that is undefined unless --localstorage-file is set,
// and vitest's jsdom environment skips keys the global already owns. Borrow a real Storage from jsdom.
if (typeof globalThis.localStorage?.clear !== 'function') {
  // @ts-expect-error jsdom ships no types and is only used here
  const { JSDOM } = await import('jsdom');
  const storage = new JSDOM('', { url: 'http://localhost/' }).window.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
}
