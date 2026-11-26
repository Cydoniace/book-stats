/** Пастельные темы: у каждого года своя гамма. Цвета столбиков проверены на различимость (в т.ч. при дальтонизме). */
export interface Theme {
  name: string;
  emoji: string;
  bg: string;        // фон страницы
  dot: string;       // горошек на фоне
  surface: string;   // карточки
  text: string;
  text2: string;
  border: string;
  accent: string;    // текст и кнопки (контрастный)
  onAccent: string;  // текст на кнопке
  soft: string;      // мягкая заливка (активная вкладка, плитки)
  soft2: string;     // второй тон для градиентов
  bar: string;       // столбики графиков
  grid: string;
  axis: string;
  hover: string;
  shadow: string;
}

type Hue = Omit<Theme, 'surface' | 'text' | 'text2' | 'axis'>;

const HUES: { light: Hue; dark: Hue }[] = [
  { // 0 — светло-зелёный (2024)
    light: { name: 'мятный', emoji: '🌿', bg: '#f1faf4', dot: '#d6efdf', border: '#cdebd8', accent: '#25804f', onAccent: '#ffffff', soft: '#dcf3e4', soft2: '#eefaf2', bar: '#5fbf8a', grid: '#e1f2e7', hover: '#eaf7ef', shadow: 'rgba(47,140,90,.10)' },
    dark: { name: 'мятный', emoji: '🌿', bg: '#121a15', dot: '#1d2a22', border: 'rgba(134,220,170,.16)', accent: '#86dcaa', onAccent: '#10251a', soft: '#1f3328', soft2: '#18261e', bar: '#3fa871', grid: '#24332a', hover: '#1c2b22', shadow: 'rgba(0,0,0,.35)' },
  },
  { // 1 — светло-голубой (2025)
    light: { name: 'небесный', emoji: '🫧', bg: '#f1f7fe', dot: '#d8e8f8', border: '#cfe2f5', accent: '#2a6fb0', onAccent: '#ffffff', soft: '#dcecfb', soft2: '#eef5fd', bar: '#6aaee8', grid: '#e1edf8', hover: '#eaf3fc', shadow: 'rgba(42,111,176,.10)' },
    dark: { name: 'небесный', emoji: '🫧', bg: '#11161d', dot: '#1c2531', border: 'rgba(140,196,245,.16)', accent: '#8cc4f5', onAccent: '#0e1f30', soft: '#1d2d40', soft2: '#172230', bar: '#4f97d8', grid: '#232f3d', hover: '#1a2533', shadow: 'rgba(0,0,0,.35)' },
  },
  { // 2 — розовый (2026 и всё «без года»)
    light: { name: 'розовый', emoji: '🌸', bg: '#fff4f8', dot: '#fadbe8', border: '#f6d3e2', accent: '#c2407e', onAccent: '#ffffff', soft: '#ffe1ee', soft2: '#fff0f6', bar: '#ef86b5', grid: '#fbe5ee', hover: '#fdebf3', shadow: 'rgba(194,64,126,.10)' },
    dark: { name: 'розовый', emoji: '🌸', bg: '#1a1217', dot: '#2a1c24', border: 'rgba(255,159,203,.16)', accent: '#ff9fcb', onAccent: '#2a1220', soft: '#3a2030', soft2: '#2a1a24', bar: '#e0679f', grid: '#33232c', hover: '#2a1b24', shadow: 'rgba(0,0,0,.35)' },
  },
  { // 3 — лавандовый
    light: { name: 'лавандовый', emoji: '🪻', bg: '#f7f4fe', dot: '#e4dcf9', border: '#ddd3f6', accent: '#7552c9', onAccent: '#ffffff', soft: '#ebe3fc', soft2: '#f4f0fe', bar: '#a58be6', grid: '#ece6fa', hover: '#f0ebfd', shadow: 'rgba(117,82,201,.10)' },
    dark: { name: 'лавандовый', emoji: '🪻', bg: '#15121d', dot: '#221c30', border: 'rgba(195,174,252,.16)', accent: '#c3aefc', onAccent: '#1d1430', soft: '#2a2240', soft2: '#1f1a2e', bar: '#9a7fe0', grid: '#2a2438', hover: '#211b2f', shadow: 'rgba(0,0,0,.35)' },
  },
  { // 4 — персиковый
    light: { name: 'персиковый', emoji: '🍑', bg: '#fff6f0', dot: '#fbe1d0', border: '#f8d8c4', accent: '#b8571d', onAccent: '#ffffff', soft: '#ffe6d6', soft2: '#fff2ea', bar: '#f4a26b', grid: '#fbe9dd', hover: '#fdeee4', shadow: 'rgba(184,87,29,.10)' },
    dark: { name: 'персиковый', emoji: '🍑', bg: '#1b1410', dot: '#2c2019', border: 'rgba(255,184,138,.16)', accent: '#ffb88a', onAccent: '#2d1708', soft: '#3a281d', soft2: '#2a1e17', bar: '#e8894d', grid: '#352820', hover: '#2a1e17', shadow: 'rgba(0,0,0,.35)' },
  },
  { // 5 — лимонный
    light: { name: 'лимонный', emoji: '🍋', bg: '#fffbeb', dot: '#f6ebbd', border: '#f1e4ab', accent: '#8a6d00', onAccent: '#ffffff', soft: '#fbf1c7', soft2: '#fdf8e2', bar: '#e3bf3f', grid: '#f7efcf', hover: '#fcf5d9', shadow: 'rgba(138,109,0,.10)' },
    dark: { name: 'лимонный', emoji: '🍋', bg: '#19170e', dot: '#2a2615', border: 'rgba(242,212,107,.16)', accent: '#f2d46b', onAccent: '#2a2205', soft: '#373018', soft2: '#272311', bar: '#c9a62a', grid: '#332e1c', hover: '#262212', shadow: 'rgba(0,0,0,.35)' },
  },
];

const BASE = {
  light: { surface: '#ffffff', text: '#3b2a33', text2: '#8a7380', axis: '#e3cfd9' },
  dark: { surface: '#21191e', text: '#f6e9ef', text2: '#b9a3ae', axis: '#4a3a43' },
};

/** 2024 — мятный, 2025 — небесный, 2026 — розовый, дальше по кругу. */
export const hueIndex = (year: number | 'all' | null) =>
  year === 'all' || year == null ? 2 : (((year - 2024) % HUES.length) + HUES.length) % HUES.length;

export function themeFor(year: number | 'all' | null, dark: boolean): Theme {
  const mode = dark ? 'dark' : 'light';
  return { ...BASE[mode], ...HUES[hueIndex(year)][mode] };
}

export function applyTheme(t: Theme) {
  const s = document.documentElement.style;
  const vars: Record<string, string> = {
    '--bg': t.bg, '--dot': t.dot, '--surface': t.surface, '--text': t.text, '--text-2': t.text2, '--border': t.border,
    '--accent': t.accent, '--on-accent': t.onAccent, '--accent-soft': t.soft, '--accent-soft-2': t.soft2, '--bar': t.bar,
    '--grid': t.grid, '--axis': t.axis, '--row-hover': t.hover, '--shadow': t.shadow,
  };
  for (const [k, v] of Object.entries(vars)) s.setProperty(k, v);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
}
