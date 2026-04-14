// Preset categorie per scraping Google Maps
// Aggiungi/rimuovi liberamente — vengono mostrate come checkbox nel form

export type CategoryGroup = {
  label: string
  items: string[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Ristorazione',
    items: [
      'Ristorante',
      'Pizzeria',
      'Bar',
      'Trattoria',
      'Pasticceria',
      'Gelateria',
      'Panetteria',
    ],
  },
  {
    label: 'Bellezza & Benessere',
    items: [
      'Parrucchiere',
      'Barbiere',
      'Estetista',
      'Centro estetico',
      'Nail salon',
      'Massaggiatore',
      'Palestra',
    ],
  },
  {
    label: 'Salute',
    items: [
      'Medico',
      'Dentista',
      'Veterinario',
      'Fisioterapista',
      'Psicologo',
      'Ottico',
      'Farmacia',
    ],
  },
  {
    label: 'Professionisti',
    items: ['Avvocato', 'Commercialista', 'Notaio', 'Architetto', 'Geometra'],
  },
  {
    label: 'Auto & Motori',
    items: [
      'Autofficina',
      'Carrozzeria',
      'Noleggio auto',
      'Compro auto',
      'Concessionario usato',
      'Gommista',
      'Autolavaggio',
    ],
  },
  {
    label: 'Casa & Servizi',
    items: [
      'Idraulico',
      'Elettricista',
      'Imbianchino',
      'Fabbro',
      'Traslochi',
      'Giardiniere',
      'Pulizie',
    ],
  },
  {
    label: 'Commercio locale',
    items: [
      'Ferramenta',
      'Cartoleria',
      'Fioraio',
      'Tabaccheria',
      'Edicola',
      'Negozio abbigliamento',
    ],
  },
  {
    label: 'Ospitalità',
    items: ['Hotel', 'B&B', 'Agriturismo', 'Affittacamere'],
  },
]
