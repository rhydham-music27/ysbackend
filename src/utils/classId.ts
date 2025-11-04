/**
 * Generate classId of format: CL-<CITY>-<ABCD>-<12>
 * - CITY: provided city code (e.g., BPL)
 * - ABCD: 4 random uppercase letters
 * - 12: 2 random digits
 */
export function generateClassId(cityCode: string): string {
  const city = (cityCode || 'XXX').toUpperCase().slice(0, 3);
  const letters = Array.from({ length: 4 })
    .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
    .join('');
  const digits = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');
  return `CL-${city}-${letters}-${digits}`;
}

export default { generateClassId };


