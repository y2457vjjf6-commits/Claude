import { movedBy } from './offers';

const L = ['a', 'b', 'c', 'd'];

test('przesuwa w górę i w dół', () => {
  expect(movedBy(L, 2, -1)).toEqual(['a', 'c', 'b', 'd']);
  expect(movedBy(L, 0, 1)).toEqual(['b', 'a', 'c', 'd']);
});

test('na skraju nic się nie dzieje — żadnego zawijania', () => {
  expect(movedBy(L, 0, -1)).toBe(L);
  expect(movedBy(L, 3, 1)).toBe(L);
  expect(movedBy(L, 1, 0)).toBe(L);
});

test('indeks spoza listy jest bezpieczny', () => {
  expect(movedBy(L, -1, 1)).toBe(L);
  expect(movedBy(L, 9, -1)).toBe(L);
  expect(movedBy([], 0, 1)).toEqual([]);
});

test('o kilka miejsc naraz', () => {
  expect(movedBy(L, 3, -3)).toEqual(['d', 'a', 'b', 'c']);
  // skok poza listę nie przesuwa wcale, zamiast dociskać do krawędzi
  expect(movedBy(L, 3, -5)).toBe(L);
});

test('oryginał zostaje nietknięty', () => {
  const wejscie = [...L];
  movedBy(wejscie, 0, 1);
  expect(wejscie).toEqual(L);
});
