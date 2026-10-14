/** Program działa w Electronie, gdzie structuredClone jest wbudowany; jsdom
 *  w tej wersji jeszcze go nie ma. Dane programu to czysty JSON (tak je
 *  zapisujemy na dysk), więc obejście przez JSON jest tu wierne. */
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T,>(wartosc: T): T =>
    wartosc === undefined ? wartosc : (JSON.parse(JSON.stringify(wartosc)) as T);
}

export {};

if (typeof globalThis.TextEncoder !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('node:util');
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}

/** jsdom nie ma Web Crypto z PBKDF2, a program liczy na nim skróty haseł.
 *  Podstawiamy implementację z Node — ten sam algorytm, ten sam wynik. */
if (!globalThis.crypto?.subtle) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { webcrypto } = require('node:crypto');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (s: string) => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = (s: string) => Buffer.from(s, 'base64').toString('binary');
}
