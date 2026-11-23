export const COLORS = ['#3f5ba8','#f2b8a8','#b9c6e6','#7fb79a','#d6cdbb','#2f3a56'];
export const ECONOMY_VERSION = 'practice';
export function economics(count) {
  if (!Number.isInteger(count) || count < 2 || count > 6) throw RangeError('Choose 2–6 racers.');
  return {slots: []};
}
