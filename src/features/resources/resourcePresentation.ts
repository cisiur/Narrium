import { DEFAULT_RESOURCE_ICON } from '../../domain/project';

export { DEFAULT_RESOURCE_ICON };

export const RESOURCE_ICONS = [
  'circle',
  'coins',
  'gem',
  'heart',
  'star',
  'shield',
  'sword',
  'food',
  'wood',
  'stone',
  'potion',
  'scroll',
  'key',
] as const;

export type ResourceIcon = (typeof RESOURCE_ICONS)[number];

export function formatResourceIconLabel(icon: string) {
  return RESOURCE_ICONS.includes(icon as ResourceIcon) ? icon : DEFAULT_RESOURCE_ICON;
}
