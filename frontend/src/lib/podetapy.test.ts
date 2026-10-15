import {
  dotyczyDzialu,
  etapyGlowne,
  nastepnyEtap,
  pierwszyEtap,
  podetapy,
  poprzedniEtap,
  stageFromEvents,
  substepEvent,
  substepProgress,
  substepState
} from './production';
import { Stage, StageEvent } from '../types';

const ETAPY: Stage[] = [
  { id: 'przyjete', name: 'Przyjęte', color: '#000' },
  { id: 'produkcja', name: 'W produkcji', color: '#000' },
  { id: 'p-ciecie', name: 'Do wycięcia', color: '#000', parentId: 'produkcja', departments: ['zaluzje'] },
  { id: 'p-rynny', name: 'Rynny', color: '#000', parentId: 'produkcja', departments: ['zaluzje'] },
  { id: 'p-siatka', name: 'Naciągnięcie siatki', color: '#000', parentId: 'produkcja', departments: ['moskitiery'] },
  { id: 'tylko-zaluzje', name: 'Przeszycie', color: '#000', departments: ['zaluzje'] },
  { id: 'wydane', name: 'Wydane', color: '#000', final: true }
];

test('przystanki to etapy bez rodzica', () => {
  expect(etapyGlowne(ETAPY).map((e) => e.id)).toEqual(['przyjete', 'produkcja', 'tylko-zaluzje', 'wydane']);
});

test('etap przypisany do działu widzą tylko jego pozycje', () => {
  expect(etapyGlowne(ETAPY, 'zaluzje').map((e) => e.id)).toContain('tylko-zaluzje');
  expect(etapyGlowne(ETAPY, 'moskitiery').map((e) => e.id)).not.toContain('tylko-zaluzje');
  // etap bez zaznaczonych działów dotyczy każdego
  expect(etapyGlowne(ETAPY, 'moskitiery').map((e) => e.id)).toContain('produkcja');
});

test('podetapy należą do swojego etapu i do swojego działu', () => {
  expect(podetapy(ETAPY, 'produkcja', 'zaluzje').map((e) => e.id)).toEqual(['p-ciecie', 'p-rynny']);
  expect(podetapy(ETAPY, 'produkcja', 'moskitiery').map((e) => e.id)).toEqual(['p-siatka']);
  expect(podetapy(ETAPY, 'przyjete', 'zaluzje')).toEqual([]);
});

test('bez rozpoznanego działu widać tylko to, co dotyczy wszystkich', () => {
  expect(podetapy(ETAPY, 'produkcja', null)).toEqual([]);
  expect(dotyczyDzialu({ id: 'x', name: 'x', color: '#000' }, null)).toBe(true);
});

test('dalej i wstecz omijają podetapy', () => {
  expect(nastepnyEtap(ETAPY, 'produkcja', 'moskitiery')?.id).toBe('wydane');
  expect(nastepnyEtap(ETAPY, 'produkcja', 'zaluzje')?.id).toBe('tylko-zaluzje');
  expect(poprzedniEtap(ETAPY, 'wydane', 'moskitiery')?.id).toBe('produkcja');
  expect(pierwszyEtap(ETAPY, 'zaluzje')).toBe('przyjete');
});

// --- odhaczanie ---

const wpis = (sub: string, done: boolean, at: string, by: string): StageEvent =>
  ({ ...substepEvent('z1', 'i1', sub, done, by), at });

test('odhaczenie zapisuje kto i kiedy', () => {
  const stan = substepState('i1', [wpis('p-ciecie', true, '2026-10-15T08:00:00Z', 'Czarek')]);
  expect(stan['p-ciecie']).toMatchObject({ done: true, by: 'Czarek' });
});

test('zdjęcie ptaszka cofa odhaczenie, a historia zostaje', () => {
  const dziennik = [
    wpis('p-ciecie', true, '2026-10-15T08:00:00Z', 'Czarek'),
    wpis('p-ciecie', false, '2026-10-15T09:00:00Z', 'Marek')
  ];
  expect(substepState('i1', dziennik)['p-ciecie']).toMatchObject({ done: false, by: 'Marek' });
  expect(dziennik).toHaveLength(2);
});

test('kolejność wpisów nie ma znaczenia — liczy się czas', () => {
  const stan = substepState('i1', [
    wpis('p-ciecie', false, '2026-10-15T09:00:00Z', 'Marek'),
    wpis('p-ciecie', true, '2026-10-15T08:00:00Z', 'Czarek')
  ]);
  expect(stan['p-ciecie'].done).toBe(false);
});

test('odhaczenia cudzej pozycji nie liczą się do tej', () => {
  const obce = { ...wpis('p-ciecie', true, '2026-10-15T08:00:00Z', 'Czarek'), itemId: 'i9' };
  expect(substepState('i1', [obce])).toEqual({});
});

test('odhaczenie podetapu nie przesuwa pozycji na inny przystanek', () => {
  const dziennik: StageEvent[] = [
    { id: 'a', orderId: 'z1', itemId: 'i1', fromStageId: '', toStageId: 'produkcja', at: '2026-10-15T07:00:00Z', by: 'Biuro' },
    wpis('p-ciecie', true, '2026-10-15T08:00:00Z', 'Czarek')
  ];
  expect(stageFromEvents('i1', dziennik)).toBe('produkcja');
});

test('postęp liczy odhaczone z tych podetapów, które dotyczą pozycji', () => {
  const dziennik = [wpis('p-ciecie', true, '2026-10-15T08:00:00Z', 'Czarek')];
  expect(substepProgress('i1', ETAPY, 'produkcja', 'zaluzje', dziennik)).toEqual({ zrobione: 1, wszystkie: 2 });
  expect(substepProgress('i1', ETAPY, 'produkcja', 'moskitiery', dziennik)).toEqual({ zrobione: 0, wszystkie: 1 });
});
