import { ProductionOrder, Settings, StageEvent } from '../types';
import { printPrintable, savePdfPrintable, PrintableDocument, ToastFn } from './docActions';
import { buildOrderHtml, orderFileName } from './printingOrder';

/** Zlecenie w postaci gotowej do wydruku. E-maila nie wysyłamy — kartka
 *  na warsztat idzie na drukarkę obok, a nie do klienta. */
export function orderPrintable(
  order: ProductionOrder,
  settings: Settings,
  events?: StageEvent[]
): PrintableDocument {
  return {
    html: buildOrderHtml(order, settings, events),
    fileName: orderFileName(order),
    recipient: '',
    subject: '',
    body: '',
    label: `zlecenie ${order.number || ''}`.trim(),
    missingRecipientMessage: ''
  };
}

export const printOrder = (
  order: ProductionOrder,
  settings: Settings,
  toast: ToastFn,
  events?: StageEvent[]
) => printPrintable(orderPrintable(order, settings, events), toast);

export const savePdfOrder = (
  order: ProductionOrder,
  settings: Settings,
  toast: ToastFn,
  events?: StageEvent[]
) => savePdfPrintable(orderPrintable(order, settings, events), toast);
