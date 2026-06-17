export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  variants: string[];
  icon: "blinds" | "shutter" | "awning" | "net";
};

export const products: Product[] = [
  {
    slug: "zaluzje",
    name: "Żaluzje",
    tagline: "Pełna kontrola nad światłem",
    description:
      "Klasyczne i nowoczesne żaluzje pozwalające precyzyjnie regulować ilość światła wpadającego do wnętrza. Dostępne w dziesiątkach kolorów i wykończeń.",
    variants: ["Poziome", "Pionowe (verticale)", "Drewniane", "Aluminiowe", "Plisowane"],
    icon: "blinds",
  },
  {
    slug: "rolety",
    name: "Rolety",
    tagline: "Prywatność i komfort",
    description:
      "Rolety materiałowe i zewnętrzne, które chronią przed słońcem, hałasem i wzrokiem sąsiadów. Idealne do każdego pomieszczenia.",
    variants: ["Kasetonowe", "Bezkasetonowe", "Dachowe", "Rzymskie"],
    icon: "shutter",
  },
  {
    slug: "markizy",
    name: "Markizy",
    tagline: "Cień tam, gdzie go potrzebujesz",
    description:
      "Markizy tarasowe i balkonowe tworzące przyjemną, zacienioną przestrzeń. Trwałe tkaniny i solidne, estetyczne konstrukcje.",
    variants: ["Tarasowe", "Balkonowe", "Z napędem elektrycznym"],
    icon: "awning",
  },
  {
    slug: "moskitiery",
    name: "Moskitiery",
    tagline: "Świeże powietrze bez owadów",
    description:
      "Skuteczna ochrona przed owadami przy zachowaniu pełnej wentylacji. Dyskretne, dopasowane do okien i drzwi rozwiązania.",
    variants: ["Ramkowe", "Drzwiowe", "Rolowane"],
    icon: "net",
  },
];

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
