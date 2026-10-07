import { matchPhoto, photoFor, normalizujNazwe } from './photos';
import type { ProductPhoto } from '../types';

const z = (name: string, dataUrl = 'data:image/jpeg;base64,' + name): ProductPhoto => ({ name, dataUrl });

describe('normalizujNazwe', () => {
  it('sprowadza ogonki, wielkość liter i odstępy do jednej postaci', () => {
    expect(normalizujNazwe('  Żaluzje   DREWNIANE ')).toBe('zaluzje drewniane');
    expect(normalizujNazwe('Roleta Łódka')).toBe('roleta lodka');
  });
});

describe('matchPhoto', () => {
  const biblioteka = [z('roleta kasetowa uni'), z('roleta'), z('C102')];

  it('dobiera zdjęcie po nazwie produktu', () => {
    expect(matchPhoto({ name: 'Roleta kasetowa UNI', material: '' }, biblioteka)?.name)
      .toBe('roleta kasetowa uni');
  });

  it('wybiera wpis najbardziej szczegółowy, nie pierwszy lepszy', () => {
    // „roleta” też pasuje, ale „roleta kasetowa uni” opisuje pozycję dokładniej
    expect(matchPhoto({ name: 'Roleta kasetowa UNI, biała', material: '' }, biblioteka)?.name)
      .toBe('roleta kasetowa uni');
  });

  it('szuka także w wierszu materiału — zdjęcie tkaniny', () => {
    expect(matchPhoto({ name: 'Żaluzja pionowa', material: 'Materiał C102' }, biblioteka)?.name)
      .toBe('C102');
  });

  it('znosi polską odmianę w nazwie produktu', () => {
    // tak nazwy wyglądają na prawdziwych ofertach: liczba mnoga i słowo w środku
    expect(
      matchPhoto({ name: 'Rolety kasetowe System UNI, kaseta antracyt', material: '' }, biblioteka)?.name
    ).toBe('roleta kasetowa uni');
  });

  it('nie wymaga kolejności słów', () => {
    expect(matchPhoto({ name: 'Kasetowa roleta UNI', material: '' }, biblioteka)?.name)
      .toBe('roleta kasetowa uni');
  });

  it('wymaga wszystkich słów wpisu, nie jednego z nich', () => {
    // sama „roleta kasetowa” bez UNI nie może dostać zdjęcia systemu UNI
    expect(matchPhoto({ name: 'Roleta kasetowa DECOLUX', material: '' }, [z('roleta kasetowa uni')]))
      .toBeNull();
  });

  it('nie łapie fragmentu dłuższego kodu tkaniny', () => {
    // „C102” nie może pasować do „C1020”, bo to inna tkanina
    expect(matchPhoto({ name: 'Roleta', material: 'C1020' }, [z('C102')])).toBeNull();
  });

  it('krótkie skróty muszą zgadzać się co do znaku', () => {
    // „RT” nie może trafić na „RTV” — za krótkie, żeby obcinać końcówkę
    expect(matchPhoto({ name: 'Szafka RTV', material: '' }, [z('RT')])).toBeNull();
    expect(matchPhoto({ name: 'Roleta RT 40/45', material: '' }, [z('RT')])?.name).toBe('RT');
  });

  it('nie zwraca wpisu bez zdjęcia', () => {
    expect(matchPhoto({ name: 'Roleta', material: '' }, [{ name: 'roleta', dataUrl: '' }])).toBeNull();
  });

  it('nie zwraca wpisu bez nazwy', () => {
    expect(matchPhoto({ name: 'Roleta', material: '' }, [z('')])).toBeNull();
  });

  it('zwraca nic, gdy biblioteka jest pusta albo nic nie pasuje', () => {
    expect(matchPhoto({ name: 'Roleta', material: '' }, [])).toBeNull();
    expect(matchPhoto({ name: 'Roleta', material: '' }, undefined)).toBeNull();
    expect(matchPhoto({ name: 'Plisa', material: '' }, biblioteka)).toBeNull();
  });

  it('nie dobiera zdjęcia do pozycji bez nazwy i materiału', () => {
    expect(matchPhoto({ name: '', material: '' }, biblioteka)).toBeNull();
  });
});

describe('photoFor', () => {
  it('oddaje sam dataurl albo pusty napis', () => {
    const settings = { productPhotos: [z('roleta', 'data:image/jpeg;base64,AAA')] };
    expect(photoFor({ name: 'Roleta mini', material: '' }, settings)).toBe('data:image/jpeg;base64,AAA');
    expect(photoFor({ name: 'Plisa', material: '' }, settings)).toBe('');
    expect(photoFor({ name: 'Roleta', material: '' }, undefined)).toBe('');
  });
});
