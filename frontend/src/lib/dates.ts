/** Dzisiejsza data jako RRRR-MM-DD, w czasie lokalnym.
 *
 *  Celowo nie przez toISOString(): ten liczy w UTC, więc wieczorem w Polsce
 *  wystawiłby dokument z jutrzejszą datą — a numer dokumentu bierze się
 *  z miesiąca i roku tej daty.
 */
export function todayStr(): string {
  const d = new Date();
  return (
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  );
}
