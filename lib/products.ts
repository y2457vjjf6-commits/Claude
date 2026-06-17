export type VisualKind =
  | "roller-fabric"
  | "roman"
  | "cassette"
  | "roof"
  | "venetian"
  | "wooden"
  | "vertical"
  | "pleated"
  | "awning"
  | "awning-balcony"
  | "awning-electric"
  | "mosquito-frame"
  | "mosquito-door"
  | "mosquito-roller";

export type Variant = {
  name: string;
  visual: VisualKind;
  description: string;
};

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  intro: string;
  hero: VisualKind;
  icon: "blinds" | "shutter" | "awning" | "net";
  variants: Variant[];
};

export const products: Product[] = [
  {
    slug: "zaluzje",
    name: "Żaluzje",
    tagline: "Pełna kontrola nad światłem",
    description:
      "Klasyczne i nowoczesne żaluzje pozwalające precyzyjnie regulować ilość światła wpadającego do wnętrza. Dostępne w dziesiątkach kolorów i wykończeń.",
    intro:
      "Żaluzje to najbardziej uniwersalna osłona okienna — pozwalają płynnie regulować ilość światła i stopień prywatności. W naszej ofercie znajdziesz zarówno lekkie modele aluminiowe, eleganckie drewniane, jak i nowoczesne plisy.",
    hero: "venetian",
    icon: "blinds",
    variants: [
      {
        name: "Poziome",
        visual: "venetian",
        description:
          "Klasyczne lamele układane poziomo, z płynną regulacją kąta nachylenia.",
      },
      {
        name: "Pionowe (verticale)",
        visual: "vertical",
        description:
          "Pionowe pasy materiału — idealne do dużych okien i przeszkleń biurowych.",
      },
      {
        name: "Drewniane",
        visual: "wooden",
        description:
          "Naturalne, ciepłe drewno nadające wnętrzu przytulny, elegancki charakter.",
      },
      {
        name: "Aluminiowe",
        visual: "venetian",
        description:
          "Lekkie i trwałe lamele aluminiowe, odporne na wilgoć — świetne do kuchni i łazienek.",
      },
      {
        name: "Plisowane (plisy)",
        visual: "pleated",
        description:
          "Harmonijkowo składany materiał, montowany bezpośrednio na skrzydle okna.",
      },
    ],
  },
  {
    slug: "rolety",
    name: "Rolety",
    tagline: "Prywatność i komfort",
    description:
      "Rolety materiałowe i zewnętrzne, które chronią przed słońcem, hałasem i wzrokiem sąsiadów. Idealne do każdego pomieszczenia.",
    intro:
      "Rolety to skuteczna ochrona przed słońcem i wzrokiem z zewnątrz. Oferujemy rolety materiałowe w wersji kasetonowej i bezkasetonowej, rolety rzymskie oraz dedykowane rozwiązania do okien dachowych.",
    hero: "roller-fabric",
    icon: "shutter",
    variants: [
      {
        name: "Materiałowe bezkasetonowe",
        visual: "roller-fabric",
        description:
          "Klasyczna roleta materiałowa nawijana na wałek — prosta i uniwersalna.",
      },
      {
        name: "Kasetonowe",
        visual: "cassette",
        description:
          "Materiał chowany w estetycznej kasetce, z prowadnicami po bokach okna.",
      },
      {
        name: "Rzymskie",
        visual: "roman",
        description:
          "Materiał układający się w eleganckie poziome fałdy przy podnoszeniu.",
      },
      {
        name: "Dachowe",
        visual: "roof",
        description:
          "Rolety dopasowane do okien połaciowych, montowane na skosach poddasza.",
      },
    ],
  },
  {
    slug: "markizy",
    name: "Markizy",
    tagline: "Cień tam, gdzie go potrzebujesz",
    description:
      "Markizy tarasowe i balkonowe tworzące przyjemną, zacienioną przestrzeń. Trwałe tkaniny i solidne, estetyczne konstrukcje.",
    intro:
      "Markizy tworzą przyjemną, zacienioną strefę na tarasie lub balkonie. Solidne konstrukcje i odporne na słońce tkaniny sprawiają, że cieszą się trwałością przez wiele sezonów.",
    hero: "awning",
    icon: "awning",
    variants: [
      {
        name: "Tarasowe",
        visual: "awning",
        description:
          "Duże markizy wysuwane, osłaniające taras przed słońcem i lekkim deszczem.",
      },
      {
        name: "Balkonowe",
        visual: "awning-balcony",
        description:
          "Kompaktowe rozwiązania dopasowane do przestrzeni balkonowej.",
      },
      {
        name: "Z napędem elektrycznym",
        visual: "awning-electric",
        description:
          "Wygodne sterowanie pilotem lub przełącznikiem — bez wysiłku.",
      },
    ],
  },
  {
    slug: "moskitiery",
    name: "Moskitiery",
    tagline: "Świeże powietrze bez owadów",
    description:
      "Skuteczna ochrona przed owadami przy zachowaniu pełnej wentylacji. Dyskretne, dopasowane do okien i drzwi rozwiązania.",
    intro:
      "Moskitiery chronią wnętrze przed owadami, nie ograniczając przy tym wentylacji. Dobierzemy dyskretne, dopasowane rozwiązanie do każdego okna i drzwi.",
    hero: "mosquito-frame",
    icon: "net",
    variants: [
      {
        name: "Ramkowe",
        visual: "mosquito-frame",
        description:
          "Sztywna ramka z siatką, montowana w świetle okna — prosta i skuteczna.",
      },
      {
        name: "Drzwiowe",
        visual: "mosquito-door",
        description:
          "Otwierane na zawiasach moskitiery do drzwi balkonowych i tarasowych.",
      },
      {
        name: "Rolowane",
        visual: "mosquito-roller",
        description:
          "Siatka chowana w kasetce, rozwijana tylko wtedy, gdy jest potrzebna.",
      },
    ],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export const features = [
  {
    title: "Ponad 25 lat doświadczenia",
    description:
      "Działamy nieprzerwanie od 1999 roku. Setki zrealizowanych projektów dla domów, mieszkań i firm.",
  },
  {
    title: "Produkcja, sprzedaż i montaż",
    description:
      "Kompleksowo zajmujemy się całym procesem — od pomiaru, przez produkcję, aż po profesjonalny montaż.",
  },
  {
    title: "Materiały najwyższej jakości",
    description:
      "Korzystamy ze sprawdzonych komponentów i tkanin, które gwarantują trwałość i estetykę na lata.",
  },
  {
    title: "Doradztwo i bezpłatny pomiar",
    description:
      "Pomożemy dobrać rozwiązanie idealnie dopasowane do Twoich okien, wnętrza i budżetu.",
  },
];
