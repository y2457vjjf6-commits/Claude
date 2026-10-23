import { IKONY_PRODUKTOW, RYSUNKI_PRODUKTOW } from '../assets/productIcons';
import { matchPhotoOrIcon } from './photos';

/** Rozpakowuje rysunek z dataurl, żeby dało się zajrzeć do samego SVG. */
function svg(dataUrl: string): string {
  const [naglowek, dane] = dataUrl.split(',');
  expect(naglowek).toBe('data:image/svg+xml;base64');
  return Buffer.from(dane, 'base64').toString('utf-8');
}

describe('wbudowane ikony produktów', () => {
  it('każdy rysunek jest poprawnym, skalowalnym SVG', () => {
    expect(RYSUNKI_PRODUKTOW.length).toBeGreaterThanOrEqual(13);
    for (const ikona of RYSUNKI_PRODUKTOW) {
      const tresc = svg(ikona.dataUrl);
      expect(tresc.startsWith('<svg')).toBe(true);
      expect(tresc).toContain('viewBox="0 0 128 128"');
      expect(ikona.label.trim()).not.toBe('');
    }
  });

  it('rysunki nie mają tła — na białej ofercie nie zrobi się ramka', () => {
    // prostokąt na całe płótno byłby właśnie tym czarnym tłem z katalogu
    for (const ikona of RYSUNKI_PRODUKTOW) {
      expect(svg(ikona.dataUrl)).not.toMatch(/<rect x="0" y="0" width="128" height="128"/);
    }
  });

  it('kontur jest ciemny, bo biały rysunek zniknąłby na kartce', () => {
    for (const ikona of RYSUNKI_PRODUKTOW) {
      expect(svg(ikona.dataUrl)).toContain('stroke="#2a2f36"');
    }
  });

  it('pozycja oferty dostaje rysunek swojego produktu', () => {
    const dobierz = (name: string, material = '') =>
      matchPhotoOrIcon({ name, material }, [])?.key;

    expect(dobierz('Roleta dzień-noc', '186 x 202 cm')).toBe('roleta-dzien-noc');
    expect(dobierz('Rolety kasetowe System UNI')).toBe('roleta-kasetowa');
    expect(dobierz('Roleta zewnętrzna adaptacyjna')).toBe('roleta-zewnetrzna');
    expect(dobierz('Żaluzje drewniane 50 mm')).toBe('zaluzja-drewniana');
    expect(dobierz('Żaluzja aluminiowa 25 mm')).toBe('zaluzja-aluminiowa');
    expect(dobierz('Żaluzje pionowe vertical 127')).toBe('zaluzja-pionowa');
    expect(dobierz('Plisa Duette')).toBe('zaluzja-plisowana');
    expect(dobierz('Moskitiera drzwiowa ramowa')).toBe('moskitiera-drzwiowa');
    expect(dobierz('Moskitiera plisowana')).toBe('moskitiera-plisowana');
    expect(dobierz('Moskitiera okienna ramkowa')).toBe('moskitiera-ramkowa');
    expect(dobierz('Karnisz podwójny 240 cm')).toBe('karnisz');
  });

  it('nazwa ogólna też coś łapie, a dokładniejsza wygrywa', () => {
    // „roleta" bez dalszego opisu ma dostać rysunek rolety materiałowej,
    // ale „roleta rzymska" już swój własny
    expect(matchPhotoOrIcon({ name: 'Roleta', material: '' }, [])?.key).toBe('roleta-materialowa');
    expect(matchPhotoOrIcon({ name: 'Roleta rzymska', material: '' }, [])?.key).toBe('roleta-rzymska');
    expect(matchPhotoOrIcon({ name: 'Żaluzja', material: '' }, [])?.key).toBe('zaluzja-aluminiowa');
    expect(matchPhotoOrIcon({ name: 'Moskitiera', material: '' }, [])?.key).toBe('moskitiera-ramkowa');
  });

  it('pozycja spoza asortymentu nie dostaje przypadkowego rysunku', () => {
    expect(matchPhotoOrIcon({ name: 'Parapet dębowy', material: '' }, [])).toBeNull();
    expect(matchPhotoOrIcon({ name: 'Montaż', material: '' }, [])).toBeNull();
    expect(matchPhotoOrIcon({ name: '', material: '' }, [])).toBeNull();
  });

  it('wpisy do dopasowania mają unikalne nazwy', () => {
    const nazwy = IKONY_PRODUKTOW.map((i) => i.name);
    expect(new Set(nazwy).size).toBe(nazwy.length);
  });
});
