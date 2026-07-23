export const TEMPLATE_PAGE_SIZE = 12

export const TEMPLATE_OUTER_TABS = [
  { id: 'top_rated', label: 'Top Rated' },
  { id: 'all', label: 'All' },
  { id: 'solo', label: 'Solo Woman' },
  { id: 'couple', label: 'Couple' },
  { id: 'multi_women', label: 'Two Girls' },
  { id: 'gay', label: 'Gay' },
] as const

export type TemplateOuterFilter = (typeof TEMPLATE_OUTER_TABS)[number]['id']

export const TEMPLATE_INNER_TAGS: { id: string; label: string }[] = [
  { id: 'bondage', label: 'Bondage' },
  { id: 'bdsm', label: 'BDSM' },
  { id: 'rough', label: 'Rough' },
  { id: 'anal', label: 'Anal' },
  { id: 'oral', label: 'Oral' },
  { id: 'vaginal', label: 'Vaginal' },
  { id: 'machine', label: 'Machine' },
  { id: 'side_view', label: 'Side View' },
  { id: 'public', label: 'Public' },
  { id: 'humiliation', label: 'Humiliation' },
  { id: 'slap', label: 'Slap' },
  { id: 'choke', label: 'Choke' },
  { id: 'doggy', label: 'Doggy' },
  { id: 'spanking', label: 'Spanking' },
  { id: 'electro', label: 'Electro' },
  { id: 'cumshot', label: 'Cumshot' },
  { id: 'suspension', label: 'Suspension' },
  { id: 'dp', label: 'Double Penetration' },
  { id: 'nipple', label: 'Nipple' },
  { id: 'latex', label: 'Latex' },
  { id: 'undress', label: 'Undress' },
  { id: 'creampie', label: 'Creampie' },
  { id: 'wax', label: 'Wax' },
  { id: 'fisting', label: 'Fisting' },
  { id: 'missionary', label: 'Missionary' },
]

export const TEMPLATE_CARD_GRADIENTS = [
  'linear-gradient(135deg,#1a0030 0%,#3d0060 50%,#1a0030 100%)',
  'linear-gradient(135deg,#001a30 0%,#003d60 50%,#001a30 100%)',
  'linear-gradient(135deg,#301a00 0%,#603d00 50%,#301a00 100%)',
  'linear-gradient(135deg,#1a3000 0%,#3d6000 50%,#1a3000 100%)',
]
