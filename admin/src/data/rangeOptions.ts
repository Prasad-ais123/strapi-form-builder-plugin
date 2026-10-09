import { FieldOption } from '../types';

export function getRangeOptions(min = 1, max = 100): FieldOption[] {
  if (isNaN(Number(min)) || isNaN(Number(max))) return [];
  const start = Math.max(1, Number(min));
  const end = Math.min(100, Number(max));
  if (start > end) return [];
  const options: FieldOption[] = [];
  for (let i = start; i <= end; i++) {
    options.push({ label: String(i), value: String(i) });
  }
  return options;
}
