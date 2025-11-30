// Fetch countries from API endpoint
// Falls back to a static list if API fetch fails

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
 * Fetch countries from API endpoint
 * Returns cached countries if available, otherwise fetches from API
 */
export async function getCountries(): Promise<Country[]> {
  // Return cache if available
  if (countriesCache) {
    return countriesCache;
  }

  try {
    const response = await fetch('/api/countries');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && Array.isArray(data) && data.length > 0) {
      countriesCache = data as Country[];
      return countriesCache;
    }

    // If no data returned, use fallback
    console.warn('No countries returned from API, using fallback');
    countriesCache = FALLBACK_COUNTRIES;
    return FALLBACK_COUNTRIES;
  } catch (error) {
    console.error('Error fetching countries from API:', error);
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
