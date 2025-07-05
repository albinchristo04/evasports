
// Simple normalization: lowercase, remove common football suffixes, replace spaces with underscores
export const normalizeNameForGuessing = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|sc|fk|afc|ac|sk|fk|nk|if|bk|aek|paok|fsv|fcso|united|city|rovers|wanderers|albion|athletic|hotspur|borough|county|town|villa|racing|club|hapoel|maccabi|beitar|dynamo|dinamo|cska|lokomotiv|zenit|spartak|shakhtar|real|inter|olympique|borussia|bayer|eintracht|schalke|tsg|vfb|vfl|sv|as|rc)\b/g, '') // Remove common suffixes/prefixes
    .replace(/\./g, '') // Remove dots
    .replace(/&/g, 'and') // Replace & with 'and'
    .replace(/[^a-z0-9\s_-]/g, '') // Remove special characters except spaces, underscores, hyphens
    .trim() // Trim whitespace
    .replace(/\s+/g, '_'); // Replace spaces with underscores
};

// Stricter normalization for use as a key
export const normalizeNameForKey = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
}

interface LogoGuessPattern {
  name: string;
  baseUrl: string;
  // Returns an array of relative paths (e.g., "europe/en-england/astonvilla")
  // without baseUrl or extension.
  pathFormatter: (teamName: string, leagueName?: string) => string[];
  extensions: string[];
}

const leagueToCountryPathMap: Record<string, string> = {
  'premier league': 'en-england',
  'la liga': 'es-spain',
  'liga bbva': 'es-spain', // Alias for La Liga
  'bundesliga': 'de-germany',
  '1. bundesliga': 'de-germany', // Alias for Bundesliga
  'serie a': 'it-italy',
  'ligue 1': 'fr-france',
  'eredivisie': 'nl-netherlands',
  'primeira liga': 'pt-portugal',
  'liga nos': 'pt-portugal', // Alias for Primeira Liga
  'mls': 'us-usa', // Major League Soccer
  'major league soccer': 'us-usa',
  'scottish premiership': 'sc-scotland',
  'süper lig': 'tr-turkey',
  'belgian pro league': 'be-belgium',
  'jupiler pro league': 'be-belgium',
  'austrian bundesliga': 'at-austria',
  'swiss super league': 'ch-switzerland',
  // Add more mappings as needed
};

// List of patterns for guessing logo URLs
// Prioritized by order in this array
const LOGO_GUESS_PATTERNS: LogoGuessPattern[] = [
  {
    name: 'sportlogos-db-structured',
    baseUrl: 'https://raw.githubusercontent.com/sportlogos/football.db.logos/refs/heads/master/',
    pathFormatter: (teamName: string, leagueName?: string): string[] => {
      const leagueLower = leagueName?.toLowerCase() || '';
      const teamLower = teamName.toLowerCase();
      const paths: string[] = [];

      // 1. Determine Continent (Simplified for now - can be expanded)
      const continent = 'europe'; // Defaulting to Europe, many leagues are here.
      // A more robust system might map country codes to continents.

      // 2. Determine Country Path (e.g., en-england, es-spain)
      const countryPath = leagueToCountryPathMap[leagueLower] || leagueLower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); // Fallback to normalized league name

      // 3. Determine Team Filename variations
      const teamFileNameVariations: string[] = [];
      
      // Variation 1: direct lowercase, no spaces (e.g., "Aston Villa" -> "astonvilla")
      teamFileNameVariations.push(teamLower.replace(/\s+/g, ''));

      // Variation 2: remove common prefixes, then lowercase, no spaces (e.g., "FC Barcelona" -> "barcelona")
      const commonFootballPrefixes = /\b(fc|cf|sc|fk|afc|ac|sk|as|rc|cd|real|atlético de|athletic|borussia|bayer|eintracht|olympique|sporting|club de futbol|deportivo|unión|racing|gimnasia y esgrima|estudiantes de|independiente|ca|akademi|nk|if|bk|aek|paok|fsv|fcso|united|city|rovers|wanderers|albion|hotspur|borough|county|town|villa|dynamo|dinamo|cska|lokomotiv|zenit|spartak|shakhtar|hapoel|maccabi|beitar|tsg|vfb|vfl|sv|rb)\s+/gi;
      const nameWithoutCommonPrefix = teamLower.replace(commonFootballPrefixes, '').trim().replace(/\s+/g, '');
      if (nameWithoutCommonPrefix && nameWithoutCommonPrefix.length > 0 && !teamFileNameVariations.includes(nameWithoutCommonPrefix)) {
        teamFileNameVariations.push(nameWithoutCommonPrefix);
      }

      // Variation 3: Only the first word if it's common and team has multiple words (e.g. "Paris Saint-Germain" -> "paris")
      const words = teamLower.split(/\s+/);
      if (words.length > 1 && ["paris", "olympique", "borussia", "inter", "as", "ac"].includes(words[0])) {
         if(!teamFileNameVariations.includes(words[0])) teamFileNameVariations.push(words[0]);
      }


      for (const teamFile of teamFileNameVariations) {
        if (!teamFile) continue;
        // Construct path: continent/country-path/teamfile
        // Only add if countryPath is somewhat valid (not empty and not just a generic fallback if league was unknown)
        if (countryPath && (leagueToCountryPathMap[leagueLower] || countryPath.length > 3)) { // Heuristic for valid country path
             paths.push(`${continent}/${countryPath}/${teamFile}`);
        }
        // Fallback for repos that might just have team names at root (less likely for this specific repo)
        // paths.push(teamFile); 
      }
      return [...new Set(paths.filter(p => p.length > 0))]; // Unique, non-empty paths
    },
    extensions: ['.png'] // Example showed .png
  },
  {
    name: 'luukhopman-country-league',
    baseUrl: 'https://raw.githubusercontent.com/luukhopman/football-logos/master/logos/',
    pathFormatter: (teamName: string, leagueName?: string): string[] => {
        const leaguePath = leagueName ? getLeaguePathForLuukHopman(leagueName) : '';
        // For luukhopman, names are often direct with spaces, URL encoding handles them.
        if (leaguePath) {
            return [`${leaguePath}/${teamName}`];
        }
        return [teamName]; // Fallback if no league or simple structure
    },
    extensions: ['.png']
  },
  {
    name: 'sportsvk-league-logos', // Lower priority fallback
    baseUrl: 'https://raw.githubusercontent.com/sportsvk/league-logos/main/',
    pathFormatter: (teamName: string, leagueName?: string): string[] => {
        const leaguePath = leagueName ? normalizeNameForGuessing(leagueName).replace(/_/g, '-') : '';
        const normalizedBase = normalizeNameForGuessing(teamName);
        const teamPaths = [normalizedBase.replace(/_/g, '-'), normalizedBase].filter(Boolean);
        
        const fullPaths = [];
        for (const tp of teamPaths) {
            if (leaguePath) {
                fullPaths.push(`${leaguePath}/${tp}`);
            } else {
                fullPaths.push(tp);
            }
        }
        return fullPaths;
    },
    extensions: ['.png', '.svg']
  },
];

// Helper for luukhopman repository to construct league path
const getLeaguePathForLuukHopman = (leagueName: string): string => {
  const leagueLower = leagueName.toLowerCase();
  const mappings: Record<string, string> = {
    'la liga': 'Spain - LaLiga',
    'liga bbva': 'Spain - LaLiga',
    'premier league': 'England - Premier League',
    'serie a': 'Italy - Serie A',
    'bundesliga': 'Germany - Bundesliga',
    '1. bundesliga': 'Germany - Bundesliga',
    'ligue 1': 'France - Ligue 1',
    'eredivisie': 'Netherlands - Eredivisie',
    'primeira liga': 'Portugal - Primeira Liga',
    'liga nos': 'Portugal - Primeira Liga',
  };
  return mappings[leagueLower] || leagueName; // Fallback to the original league name
};


// Used for initial, quick guessing during import. Tries a limited set for speed.
export const guessLogoUrl = (teamName: string, leagueName?: string): string | undefined => {
  if (!teamName) return undefined;

  for (const pattern of LOGO_GUESS_PATTERNS) {
    const relativePathSuggestions = pattern.pathFormatter(teamName, leagueName);
    if (relativePathSuggestions.length === 0) continue;
    
    // For quick guess, try only the first suggested relative path and first extension
    const firstRelativePath = relativePathSuggestions[0];
    const firstExtension = pattern.extensions[0];

    if (firstRelativePath && firstExtension) {
      const url = pattern.baseUrl + firstRelativePath + firstExtension;
      // For guess, we don't check existence, just construct. Admin can verify.
      return url; 
    }
  }
  return undefined;
};


// Helper to check if a URL exists
export const checkUrlExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
    return response.ok; 
  } catch (error) {
    // console.warn(`checkUrlExists failed for ${url}:`, error);
    return false;
  }
};


// More exhaustive search for logos, used by admin panel "Search Logo" button
export async function searchTeamLogoOnline(teamName: string, leagueName?: string): Promise<string | undefined> {
  if (!teamName) return undefined;
  // console.log(`Starting online search for: ${teamName} (League: ${leagueName || 'N/A'})`);

  for (const pattern of LOGO_GUESS_PATTERNS) {
    // console.log(`Trying pattern: ${pattern.name}`);
    const relativePathSuggestions = pattern.pathFormatter(teamName, leagueName);
    // console.log(`  Suggested relative paths:`, relativePathSuggestions);

    for (const relPath of relativePathSuggestions) {
      if (!relPath) continue; 
      for (const ext of pattern.extensions) {
        const currentUrl = pattern.baseUrl + relPath + ext;
        // console.log(`    Checking URL: ${currentUrl}`);
        if (await checkUrlExists(currentUrl)) {
          // console.log(`    FOUND: ${currentUrl}`);
          return currentUrl;
        }
      }
    }
  }
  // console.log(`Exhaustive search: No logo found for ${teamName} ${leagueName ? `in ${leagueName}` : ''}`);
  return undefined;
}
