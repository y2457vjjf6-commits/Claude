import { orderFinished, qcLink, stageProtocol } from './quality';
import { ProductionOrder, StageEvent } from '../types';

const poz = (id: string, stageId: string) => ({ id, name: id, material: '', qty: '1', stageId });

const zlecenie = (items: ProductionOrder['items']): ProductionOrder => ({
  id: 'z1', number: 'ZL-10-0001-2026', date: '2026-10-14', client: 'Jan Nowak',
  items, createdAt: '', updatedAt: ''
});

const wpis = (itemId: string, toStageId: string, at: string, by: string, orderId = 'z1'): StageEvent => ({
  id: `${itemId}-${at}`, orderId, itemId, fromStageId: '', toStageId, at, by
});

test('skończone znaczy: wszystkie pozycje w etapie końcowym', () => {
  expect(orderFinished(zlecenie([poz('a', 'wydane'), poz('b', 'wydane')]), undefined)).toBe(true);
  expect(orderFinished(zlecenie([poz('a', 'wydane'), poz('b', 'gotowe')]), undefined)).toBe(false);
});

test('puste zlecenie nie jest skończone — nie ma czego odbierać', () => {
  expect(orderFinished(zlecenie([]), undefined)).toBe(false);
});

test('protokół mówi, kto prowadził każdy etap', () => {
  const dziennik = [
    wpis('a', 'przyjete', '2026-10-09T08:00:00Z', 'Sebastian Wajcht'),
    wpis('a', 'w-produkcji', '2026-10-10T08:00:00Z', 'Czarek'),
    wpis('b', 'w-produkcji', '2026-10-10T09:00:00Z', 'Marek'),
    wpis('a', 'wydane', '2026-10-12T08:00:00Z', 'Czarek')
  ];
  const p = stageProtocol(zlecenie([poz('a', 'wydane'), poz('b', 'w-produkcji')]), dziennik, undefined);
  expect(p.map((w) => w.stage.id)).toEqual(['przyjete', 'w-produkcji', 'wydane']);
  expect(p[1].osoby).toEqual(['Czarek', 'Marek']);
  expect(p[1].pozycji).toBe(2);
});

test('etapy, przez które nic nie przeszło, nie zaśmiecają protokołu', () => {
  const p = stageProtocol(zlecenie([poz('a', 'gotowe')]), [wpis('a', 'gotowe', '2026-10-10T08:00:00Z', 'Czarek')], undefined);
  expect(p).toHaveLength(1);
  expect(p[0].stage.id).toBe('gotowe');
});

test('protokół pokazuje pierwsze i ostatnie wejście w etap', () => {
  const p = stageProtocol(
    zlecenie([poz('a', 'gotowe'), poz('b', 'gotowe')]),
    [
      wpis('a', 'gotowe', '2026-10-10T08:00:00Z', 'Czarek'),
      wpis('b', 'gotowe', '2026-10-11T15:00:00Z', 'Marek')
    ],
    undefined
  );
  expect(p[0].od).toBe('2026-10-10T08:00:00Z');
  expect(p[0].do).toBe('2026-10-11T15:00:00Z');
});

test('cofnięcie i powrót widać jako dwa wejścia w ten sam etap', () => {
  const p = stageProtocol(
    zlecenie([poz('a', 'gotowe')]),
    [
      wpis('a', 'gotowe', '2026-10-10T08:00:00Z', 'Czarek'),
      wpis('a', 'w-produkcji', '2026-10-10T12:00:00Z', 'Marek'),
      wpis('a', 'gotowe', '2026-10-11T08:00:00Z', 'Marek')
    ],
    undefined
  );
  const gotowe = p.find((w) => w.stage.id === 'gotowe')!;
  expect(gotowe.osoby).toEqual(['Czarek', 'Marek']);
  expect(gotowe.do).toBe('2026-10-11T08:00:00Z');
});

test('cudzy dziennik nie trafia do tego protokołu', () => {
  const p = stageProtocol(
    zlecenie([poz('a', 'gotowe')]),
    [wpis('x', 'gotowe', '2026-10-10T08:00:00Z', 'Obcy', 'z9')],
    undefined
  );
  expect(p).toHaveLength(0);
});

test('bez podpisu etap zostaje, ale bez nazwiska', () => {
  const p = stageProtocol(zlecenie([poz('a', 'gotowe')]), [wpis('a', 'gotowe', '2026-10-10T08:00:00Z', '  ')], undefined);
  expect(p[0].osoby).toEqual([]);
  expect(p[0].pozycji).toBe(1);
});

test('adres z kodu QR jest poprawny niezależnie od ukośnika na końcu', () => {
  expect(qcLink('http://192.168.1.10:8731', 'abc')).toBe('http://192.168.1.10:8731/q/abc');
  expect(qcLink('http://192.168.1.10:8731/', 'abc')).toBe('http://192.168.1.10:8731/q/abc');
});
