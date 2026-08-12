import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';

export function useOmnifitTheme(color: OmnifitColor = 'indigo') {
  const theme = OMNIFIT_COLORS[color] || OMNIFIT_COLORS.indigo;
  return theme;
}
