import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Camera, Trash2, Check, Loader2 } from 'lucide-react';
import { ProductionOrder, QcPhoto, Stage, StageEvent, UserAccount } from '../types';
import { orderFinished, stageProtocol } from '../lib/quality';
import { hasApi, uid } from '../lib/storage';
import { MAX_BOK_ZLECENIE, resizePhoto } from '../lib/photos';
import { podpis } from '../lib/auth';

interface Props {
  order: ProductionOrder;
  events: StageEvent[];
  stages: Stage[];
  user: UserAccount | null;
  onChange: (patch: Partial<ProductionOrder>) => void;
  toast: (msg: string, isError?: boolean) => void;
}

function godzina(iso?: string): string {
  return iso ? new Date(iso).toLocaleString('pl-PL') : '—';
}

export default function QualityCard({ order, events, stages, user, onChange, toast }: Props) {
  const skonczone = orderFinished(order, stages);
  const protokol = stageProtocol(order, events, stages);
  const zdjecia = order.qcPhotos || [];

  const [kod, setKod] = useState<{ url: string; token: string; obraz: string } | null>(null);
  const [czeka, setCzeka] = useState(false);
  const [blad, setBlad] = useState('');
  const tokenRef = useRef<string | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  /** Zamykamy okno na zdjęcia przy wyjściu — kod ze zlecenia, które już
   *  odebraliśmy, nie ma prawa działać dalej. */
  useEffect(
    () => () => {
      if (tokenRef.current && hasApi) void window.wzApi?.qcStop(tokenRef.current);
    },
    []
  );

  // Zdjęcie z telefonu dolatuje przez proces główny programu
  useEffect(() => {
    if (!hasApi || !window.wzApi?.onQcPhoto) return;
    return window.wzApi.onQcPhoto((foto) => {
      if (foto.orderId !== orderRef.current.id) return;
      dodaj(foto.dataUrl, 'telefon');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dodaj = (dataUrl: string, skad: 'telefon' | 'plik') => {
    const nowe: QcPhoto = {
      id: uid(),
      dataUrl,
      at: new Date().toISOString(),
      by: skad === 'telefon' ? '' : podpis(user, '')
    };
    onChange({ qcPhotos: [...(orderRef.current.qcPhotos || []), nowe] });
    toast(skad === 'telefon' ? 'Zdjęcie z telefonu dodane do zlecenia.' : 'Zdjęcie dodane.');
  };

  const pokazKod = async () => {
    setBlad('');
    if (!hasApi || !window.wzApi?.qcStart) {
      setBlad('Odbiór zdjęć z telefonu działa w programie na Windows, nie w podglądzie przeglądarki.');
      return;
    }
    setCzeka(true);
    try {
      const wynik = await window.wzApi.qcStart({ orderId: order.id, numer: order.number || '' });
      if (!wynik.url || !wynik.token) {
        setBlad(wynik.error || 'Nie udało się otworzyć odbioru zdjęć.');
        return;
      }
      tokenRef.current = wynik.token;
      setKod({ url: wynik.url, token: wynik.token, obraz: await QRCode.toDataURL(wynik.url, { margin: 1, width: 240 }) });
    } finally {
      setCzeka(false);
    }
  };

  const odbierz = () => {
    onChange({ qcDoneAt: new Date().toISOString(), qcBy: podpis(user, '') });
    toast('Zlecenie odebrane po kontroli jakości.');
  };

  return (
    <div className="card" data-testid="qc-card">
      <h3 className="card-title">
        Kontrola jakości
        {skonczone && !order.qcDoneAt && <span className="qc-znacznik">do odbioru</span>}
        {order.qcDoneAt && (
          <span className="qc-znacznik qc-ok">
            <Check className="icon" /> odebrane
          </span>
        )}
      </h3>

      {!skonczone && (
        <p className="muted card-note" data-testid="qc-niegotowe">
          Protokół i kod do zdjęć pojawią się w komplecie, gdy wszystkie pozycje dojdą do ostatniego
          etapu. Zdjęcie można dorzucić już teraz.
        </p>
      )}

      {/* ---- protokół: etap po etapie, kto go prowadził ---- */}
      {protokol.length > 0 && (
        <table className="table qc-protokol" data-testid="qc-protokol">
          <thead>
            <tr>
              <th>Etap</th>
              <th>Kto realizował</th>
              <th>Pozycji</th>
              <th>Zakończono</th>
            </tr>
          </thead>
          <tbody>
            {protokol.map((w) => (
              <tr key={w.stage.id} data-testid={`qc-etap-${w.stage.id}`}>
                <td>
                  <span className="stage-dot-label">
                    <span className="stage-dot" style={{ background: w.stage.color }} />
                    {w.stage.name}
                  </span>
                </td>
                <td>{w.osoby.length ? w.osoby.join(', ') : <span className="muted">—</span>}</td>
                <td>{w.pozycji}</td>
                <td className="muted">{godzina(w.do)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ---- zdjęcia odbioru ---- */}
      <div className="qc-zdjecia" data-testid="qc-zdjecia">
        {zdjecia.map((z) => (
          <figure className="qc-foto" key={z.id}>
            <img src={z.dataUrl} alt="Zdjęcie kontroli jakości" />
            <figcaption>
              {godzina(z.at)}
              {z.by ? ` · ${z.by}` : ' · telefon'}
              <button
                className="btn btn-small btn-danger item-remove"
                data-testid={`qc-foto-remove-${z.id}`}
                aria-label="Usuń zdjęcie"
                onClick={() => onChange({ qcPhotos: zdjecia.filter((x) => x.id !== z.id) })}
              >
                <Trash2 className="icon" />
              </button>
            </figcaption>
          </figure>
        ))}
        {!zdjecia.length && <p className="muted">Nie ma jeszcze zdjęcia odbioru.</p>}
      </div>

      <div className="qc-akcje">
        {!kod ? (
          <button className="btn btn-light" data-testid="qc-show-code" disabled={czeka} onClick={() => void pokazKod()}>
            {czeka ? <Loader2 className="icon spin" /> : <QrCode className="icon" />}
            Pokaż kod do zdjęcia
          </button>
        ) : (
          <div className="qc-kod" data-testid="qc-kod">
            <img src={kod.obraz} alt="Kod QR do zrobienia zdjęcia" />
            <div>
              <p>
                Zeskanuj telefonem i zrób zdjęcie. Trafi prosto do tego zlecenia.
                <br />
                <span className="muted">
                  Telefon musi być w tej samej sieci Wi-Fi co ten komputer. Kod działa, dopóki to
                  zlecenie jest otwarte.
                </span>
              </p>
              <code className="qc-adres">{kod.url}</code>
            </div>
          </div>
        )}

        <label className="btn btn-light">
          <Camera className="icon" />
          Dodaj zdjęcie z pliku
          <input
            type="file"
            accept="image/*"
            className="photo-file"
            data-testid="qc-foto-input"
            onChange={async (e) => {
              const plik = e.target.files?.[0];
              e.target.value = '';
              if (!plik) return;
              try {
                dodaj(await resizePhoto(plik, MAX_BOK_ZLECENIE), 'plik');
              } catch {
                toast('Nie udało się odczytać tego obrazu.', true);
              }
            }}
          />
        </label>

        {skonczone && !order.qcDoneAt && (
          <button className="btn btn-primary" data-testid="qc-accept" onClick={odbierz}>
            <Check className="icon" />
            Odbierz po kontroli
          </button>
        )}
      </div>

      {order.qcDoneAt && (
        <p className="muted" data-testid="qc-odebrane">
          Odebrane {godzina(order.qcDoneAt)}
          {order.qcBy ? ` · ${order.qcBy}` : ''}.
        </p>
      )}

      {blad && (
        <p className="login-error" data-testid="qc-blad">
          {blad}
        </p>
      )}
    </div>
  );
}
