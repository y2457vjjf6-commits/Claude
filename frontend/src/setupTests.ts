/** Program działa w Electronie, gdzie structuredClone jest wbudowany; jsdom
 *  w tej wersji jeszcze go nie ma. Dane programu to czysty JSON (tak je
 *  zapisujemy na dysk), więc obejście przez JSON jest tu wierne. */
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T,>(wartosc: T): T =>
    wartosc === undefined ? wartosc : (JSON.parse(JSON.stringify(wartosc)) as T);
}

export {};
