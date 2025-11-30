// Fetch countries from Supabase database
// Falls back to a static list if database fetch fails

import { supabase } from '../lib/supabase';

export interface Country {
  code: string;
  name: string;
  flag: string;
}

// Fallback static list (for offline/error scenarios) - alphabetical order
const FALLBACK_COUNTRIES: Country[] = [
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
];

// Cache for countries
let countriesCache: Country[] | null = null;

/**
 * Fetch countries from Supabase database
 * Returns cached countries if available, otherwise fetches from database
 */
export async function getCountries(): Promise<Country[]> {
  // Return cache if available
  if (countriesCache) {
    return countriesCache;
  }

  try {
    const { data, error } = await supabase
      .from('country')
      .select('code, name, flag')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('Failed to fetch countries from database, using fallback:', error);
      countriesCache = FALLBACK_COUNTRIES;
      return FALLBACK_COUNTRIES;
    }

    if (data && data.length > 0) {
      countriesCache = data as Country[];
      return countriesCache;
    }

    // If no data returned, use fallback
    console.warn('No countries found in database, using fallback');
    countriesCache = FALLBACK_COUNTRIES;
    return FALLBACK_COUNTRIES;
  } catch (error) {
    console.error('Error fetching countries:', error);
    countriesCache = FALLBACK_COUNTRIES;
    return FALLBACK_COUNTRIES;
  }
}

/**
 * Clear the countries cache (useful for testing or refresh scenarios)
 */
export function clearCountriesCache(): void {
  countriesCache = null;
}

// Export fallback for backwards compatibility (if needed)
export const COUNTRIES = FALLBACK_COUNTRIES;
