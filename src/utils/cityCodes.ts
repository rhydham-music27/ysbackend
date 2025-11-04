// Simple city name to code mapping. Extend as needed.
const CITY_CODE_MAP: Record<string, string> = {
  bhopal: 'BPL',
  mumbai: 'BOM',
  delhi: 'DEL',
  bengaluru: 'BLR',
  bangalore: 'BLR',
  hyderabad: 'HYD',
  chennai: 'MAA',
  kolkata: 'CCU',
  pune: 'PNQ',
  indore: 'IDR',
  jaipur: 'JAI',
  lucknow: 'LKO',
  surat: 'STV',
  ahmedabad: 'AMD',
  noida: 'NDA',
  gurugram: 'GGN',
  gurgaon: 'GGN',
};

export function getCityCodeFromName(city?: string): string | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  return CITY_CODE_MAP[key] || null;
}

export function addOrUpdateCityCodeMapping(cityName: string, code: string) {
  const key = cityName.trim().toLowerCase();
  CITY_CODE_MAP[key] = code.trim().toUpperCase();
}


