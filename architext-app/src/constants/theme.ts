export const LightTheme = {
  cream: '#f2ede8',
  cream2: '#f8f5f1',
  border: '#e6dfd8',
  brown: '#9b633f',
  brownDark: '#7f4f30',
  brownLight: '#c4956a',
  brownBg: '#f0e9e3',
  dark: '#2d1f14',
  mid: '#6b5b4e',
  muted: '#9d8c80',
  white: '#ffffff',
  errorBg: '#fdf0ee',
  errorBorder: '#e8c4bc',
  errorText: '#7a3020',
  cardBg: '#ffffff',
  pageBg: '#f2ede8',
  inputBg: '#faf8f5',
  isDark: false,
} as const;

export const DarkTheme = {
  cream: '#1a1209',
  cream2: '#231810',
  border: '#3a2a1e',
  brown: '#c4956a',
  brownDark: '#e0b488',
  brownLight: '#9b633f',
  brownBg: '#2d1f14',
  dark: '#f2ede8',
  mid: '#c9b8ab',
  muted: '#8a7a6e',
  white: '#2d1f14',
  errorBg: '#2d1209',
  errorBorder: '#7a3020',
  errorText: '#f4a090',
  cardBg: '#231810',
  pageBg: '#1a1209',
  inputBg: '#2d1f14',
  isDark: true,
} as const;

export type Theme = typeof LightTheme;

export const ROOM_COLOURS: Record<string, [string, string]> = {
  living_room: ['#E1F5EE', '#085041'],
  bedroom: ['#EEEDFE', '#3C3489'],
  kitchen: ['#FAEEDA', '#633806'],
  dining_room: ['#FAF0DA', '#633806'],
  bathroom: ['#E6F1FB', '#0C447C'],
  study: ['#EAF3DE', '#27500A'],
  hallway: ['#F1EFE8', '#444441'],
  garage: ['#F4F4F0', '#444441'],
  utility: ['#F0F5EE', '#27500A'],
  garden: ['#E8F5E1', '#27500A'],
};

export const DEFAULT_ROOM_COLOUR: [string, string] = ['#F5F4F0', '#333333'];

export const EXAMPLES: Record<string, string> = {
  'Studio': 'Studio with kitchenette, bathroom, and open living area',
  '2-Bedroom': '2-bedroom apartment with open kitchen, living room, 1 bathroom, and balcony',
  'Office': 'Office space with open workspace, 2 meeting rooms, kitchen, and bathroom',
  '4-Bedroom House': '4-bedroom family home with open-plan kitchen-dining, 3 bathrooms, study, utility room, and double garage',
};
