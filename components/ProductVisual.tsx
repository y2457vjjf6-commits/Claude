import { VisualKind } from "@/lib/products";

/**
 * Dokładne, poprawnie podpisane ilustracje poszczególnych typów osłon okiennych.
 * Każdy `kind` odpowiada konkretnemu produktowi (np. "wooden" = żaluzja drewniana).
 * Docelowo można je podmienić na prawdziwe zdjęcia.
 */
export default function ProductVisual({
  kind,
  className,
}: {
  kind: VisualKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#eef2f6" />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#eff6ff" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b07b4f" />
          <stop offset="0.5" stopColor="#caa078" />
          <stop offset="1" stopColor="#a96f43" />
        </linearGradient>
        <linearGradient id="alu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9edf1" />
          <stop offset="1" stopColor="#cdd5dd" />
        </linearGradient>
        <linearGradient id="fabric" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4e6" />
          <stop offset="1" stopColor="#ffe3c2" />
        </linearGradient>
      </defs>

      {/* tło / ściana */}
      <rect x="0" y="0" width="400" height="300" fill="url(#wall)" />

      {render(kind)}
    </svg>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <rect x="60" y="30" width="280" height="240" rx="6" fill="#ffffff" stroke="#d6dde4" strokeWidth="3" />
      <rect x="74" y="44" width="252" height="212" rx="3" fill="url(#sky)" />
      {children}
      {/* rama na wierzchu dla głębi */}
      <rect x="60" y="30" width="280" height="240" rx="6" fill="none" stroke="#c2cbd4" strokeWidth="3" />
    </>
  );
}

function render(kind: VisualKind) {
  switch (kind) {
    case "roller-fabric":
      return (
        <Frame>
          <rect x="74" y="44" width="252" height="150" fill="url(#fabric)" />
          {[70, 100, 130, 160].map((y) => (
            <line key={y} x1="74" y1={y} x2="326" y2={y} stroke="#f5d3a6" strokeWidth="1.5" />
          ))}
          <rect x="70" y="190" width="260" height="10" rx="3" fill="#f97316" />
          <rect x="68" y="38" width="264" height="14" rx="5" fill="#ea580c" />
        </Frame>
      );

    case "cassette":
      return (
        <Frame>
          {/* prowadnice boczne */}
          <rect x="74" y="44" width="10" height="212" fill="#e2e8f0" />
          <rect x="316" y="44" width="10" height="212" fill="#e2e8f0" />
          <rect x="84" y="44" width="232" height="140" fill="url(#fabric)" />
          {[78, 112, 146].map((y) => (
            <line key={y} x1="84" y1={y} x2="316" y2={y} stroke="#f5d3a6" strokeWidth="1.5" />
          ))}
          <rect x="84" y="178" width="232" height="9" rx="2" fill="#f97316" />
          {/* kasetka */}
          <rect x="66" y="36" width="268" height="26" rx="6" fill="#f97316" />
          <rect x="66" y="36" width="268" height="26" rx="6" fill="none" stroke="#ea580c" strokeWidth="2" />
        </Frame>
      );

    case "roman":
      return (
        <Frame>
          {/* złożone poziome fałdy zebrane u góry */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="74" y={48 + i * 26} width="252" height="26" rx="10" fill="url(#fabric)" stroke="#f3cfa0" strokeWidth="1.5" />
            </g>
          ))}
          <rect x="74" y="156" width="252" height="100" fill="url(#sky)" />
          <rect x="70" y="150" width="260" height="9" rx="3" fill="#f97316" />
        </Frame>
      );

    case "roof":
      return (
        <>
          {/* okno dachowe (skos) */}
          <polygon points="80,250 150,60 330,90 300,260" fill="#ffffff" stroke="#c2cbd4" strokeWidth="3" />
          <polygon points="98,238 156,80 314,106 290,246" fill="url(#sky)" />
          {/* roleta na skosie */}
          <polygon points="98,238 156,80 314,106 290,180" fill="url(#fabric)" opacity="0.92" />
          {[120, 150, 180].map((y, i) => (
            <line key={i} x1={108 - i * 0} y1={y} x2={300} y2={y - 14} stroke="#f5d3a6" strokeWidth="1.5" />
          ))}
          <line x1="156" y1="80" x2="314" y2="106" stroke="#ea580c" strokeWidth="8" strokeLinecap="round" />
        </>
      );

    case "venetian":
      return (
        <Frame>
          {/* cienkie lamele aluminiowe z lekkim uchyleniem */}
          {Array.from({ length: 18 }).map((_, i) => (
            <rect key={i} x="78" y={48 + i * 11.5} width="244" height="7" rx="2" fill="url(#alu)" stroke="#b9c2cc" strokeWidth="0.6" />
          ))}
          {/* sznurek */}
          <line x1="300" y1="44" x2="300" y2="252" stroke="#94a3b8" strokeWidth="1.5" />
        </Frame>
      );

    case "wooden":
      return (
        <Frame>
          {/* grube lamele drewniane z usłojeniem */}
          {Array.from({ length: 11 }).map((_, i) => (
            <g key={i}>
              <rect x="78" y={48 + i * 19} width="244" height="15" rx="3" fill="url(#wood)" stroke="#8a5a32" strokeWidth="0.8" />
              <line x1="92" y1={48 + i * 19 + 7} x2="308" y2={48 + i * 19 + 7} stroke="#9c6a3e" strokeWidth="0.8" opacity="0.6" />
            </g>
          ))}
          {/* drabinka taśmowa */}
          <line x1="150" y1="44" x2="150" y2="252" stroke="#7c4a26" strokeWidth="2" opacity="0.5" />
          <line x1="250" y1="44" x2="250" y2="252" stroke="#7c4a26" strokeWidth="2" opacity="0.5" />
        </Frame>
      );

    case "vertical":
      return (
        <Frame>
          {/* pionowe lamele */}
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={80 + i * 27} y="48" width="22" height="204" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
          ))}
          {/* szyna górna */}
          <rect x="74" y="44" width="252" height="8" fill="#9ca3af" />
        </Frame>
      );

    case "pleated":
      return (
        <Frame>
          {/* harmonijka / plisa */}
          {Array.from({ length: 13 }).map((_, i) => (
            <polygon
              key={i}
              points={`78,${48 + i * 16} 322,${48 + i * 16} 322,${48 + i * 16 + 8} 78,${48 + i * 16 + 16}`}
              fill={i % 2 === 0 ? "#fff1e0" : "#ffe0bd"}
            />
          ))}
          <rect x="74" y="44" width="252" height="6" fill="#f97316" />
          <rect x="74" y="250" width="252" height="6" fill="#f97316" />
        </Frame>
      );

    case "awning":
    case "awning-balcony":
    case "awning-electric": {
      const w = kind === "awning-balcony" ? 200 : 280;
      const x = (400 - w) / 2;
      const stripes = Math.round(w / 28);
      return (
        <>
          {/* ściana z drzwiami */}
          <rect x="120" y="150" width="160" height="120" fill="#eef2f6" />
          <rect x="170" y="170" width="60" height="100" rx="3" fill="#dbeafe" stroke="#cbd5e1" strokeWidth="2" />
          {/* ramiona */}
          <line x1={x + 20} y1="70" x2={x + 40} y2="150" stroke="#9ca3af" strokeWidth="4" />
          <line x1={x + w - 20} y1="70" x2={x + w - 40} y2="150" stroke="#9ca3af" strokeWidth="4" />
          {/* daszek markizy (skos) */}
          <polygon points={`${x},70 ${x + w},70 ${x + w - 30},150 ${x + 30},150`} fill="#fff" />
          {Array.from({ length: stripes }).map((_, i) => {
            const sx = x + (i * w) / stripes;
            const ex = x + ((i + 1) * w) / stripes;
            const insTop = (30 * i) / stripes;
            const insTop2 = (30 * (i + 1)) / stripes;
            return (
              <polygon
                key={i}
                points={`${sx},70 ${ex},70 ${ex - insTop2},150 ${sx - insTop + 30 - 0},150`}
                fill={i % 2 === 0 ? "#f97316" : "#fff7ed"}
                opacity="0.95"
              />
            );
          })}
          {/* lambrekin (falbanka) */}
          <path
            d={`M${x + 30},150 q15,18 30,0 q15,18 30,0 q15,18 30,0 q15,18 30,0 q15,18 30,0 q15,18 30,0 L${x + w - 30},150 Z`}
            fill="#ea580c"
          />
          <rect x={x} y="66" width={w} height="8" rx="3" fill="#9ca3af" />
          {kind === "awning-electric" && (
            <>
              {/* pilot / silnik */}
              <rect x="300" y="200" width="26" height="44" rx="5" fill="#1f2937" />
              <circle cx="313" cy="214" r="5" fill="#f97316" />
              <rect x="306" y="224" width="14" height="4" rx="2" fill="#6b7280" />
              <rect x="306" y="232" width="14" height="4" rx="2" fill="#6b7280" />
            </>
          )}
        </>
      );
    }

    case "mosquito-frame":
      return (
        <Frame>
          {/* siatka */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={78 + i * 12.5} y1="46" x2={78 + i * 12.5} y2="254" stroke="#9ca3af" strokeWidth="0.7" opacity="0.7" />
          ))}
          {Array.from({ length: 17 }).map((_, i) => (
            <line key={`h${i}`} x1="76" y1={48 + i * 12.5} x2="324" y2={48 + i * 12.5} stroke="#9ca3af" strokeWidth="0.7" opacity="0.7" />
          ))}
          {/* ramka moskitiery */}
          <rect x="76" y="46" width="248" height="208" fill="none" stroke="#f97316" strokeWidth="6" />
        </Frame>
      );

    case "mosquito-door":
      return (
        <>
          {/* ściana */}
          <rect x="0" y="0" width="400" height="300" fill="url(#wall)" />
          {/* drzwi z moskitierą */}
          <rect x="130" y="30" width="140" height="250" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
          <rect x="142" y="42" width="116" height="226" fill="url(#sky)" />
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`v${i}`} x1={142 + i * 12} y1="42" x2={142 + i * 12} y2="268" stroke="#9ca3af" strokeWidth="0.7" opacity="0.7" />
          ))}
          {Array.from({ length: 19 }).map((_, i) => (
            <line key={`h${i}`} x1="142" y1={42 + i * 12} x2="258" y2={42 + i * 12} stroke="#9ca3af" strokeWidth="0.7" opacity="0.7" />
          ))}
          <rect x="142" y="42" width="116" height="226" fill="none" stroke="#f97316" strokeWidth="5" />
          {/* klamka */}
          <rect x="150" y="150" width="8" height="26" rx="3" fill="#f97316" />
        </>
      );

    case "mosquito-roller":
      return (
        <Frame>
          {/* siatka rozwinięta do połowy */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={78 + i * 12.5} y1="46" x2={78 + i * 12.5} y2="170" stroke="#9ca3af" strokeWidth="0.7" opacity="0.7" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h${i}`} x1="76" y1={48 + i * 12.5} x2="324" y2={48 + i * 12.5} stroke="#9ca3af" strokeWidth="0.7" opacity="0.7" />
          ))}
          <rect x="74" y="166" width="252" height="9" rx="2" fill="#f97316" />
          {/* kasetka boczna */}
          <rect x="316" y="44" width="14" height="212" rx="4" fill="#f97316" />
        </Frame>
      );
  }
}
