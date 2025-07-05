import { GoogleGenAI } from "@google/genai";

// --- Constants ---

const LOGO_GUESS_PATTERNS = [
    {
        name: 'sportlogos-db-structured',
        baseUrl: 'https://raw.githubusercontent.com/sportlogos/football.db.logos/refs/heads/master/',
        pathFormatter: (teamName: string, leagueName?: string): string[] => {
            const leagueToCountryPathMap: Record<string, string> = {
                'premier league': 'en-england', 'la liga': 'es-spain', 'liga bbva': 'es-spain',
                'bundesliga': 'de-germany', '1. bundesliga': 'de-germany', 'serie a': 'it-italy',
                'ligue 1': 'fr-france', 'eredivisie': 'nl-netherlands', 'primeira liga': 'pt-portugal',
                'liga nos': 'pt-portugal', 'mls': 'us-usa', 'major league soccer': 'us-usa',
                'scottish premiership': 'sc-scotland', 'süper lig': 'tr-turkey',
                'belgian pro league': 'be-belgium', 'jupiler pro league': 'be-belgium',
                'austrian bundesliga': 'at-austria', 'swiss super league': 'ch-switzerland',
            };
            const leagueLower = leagueName?.toLowerCase() || '';
            const teamLower = teamName.toLowerCase();
            const paths: string[] = [];
            const continent = 'europe';
            const countryPath = leagueToCountryPathMap[leagueLower] || leagueLower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            const teamFileNameVariations: string[] = [];
            teamFileNameVariations.push(teamLower.replace(/\s+/g, ''));
            const commonFootballPrefixes = /\b(fc|cf|sc|fk|afc|ac|sk|as|rc|cd|real|atlético de|athletic|borussia|bayer|eintracht|olympique|sporting|club de futbol|deportivo|unión|racing|gimnasia y esgrima|estudiantes de|independiente|ca|akademi|nk|if|bk|aek|paok|fsv|fcso|united|city|rovers|wanderers|albion|hotspur|borough|county|town|villa|dynamo|dinamo|cska|lokomotiv|zenit|spartak|shakhtar|hapoel|maccabi|beitar|tsg|vfb|vfl|sv|rb)\s+/gi;
            const nameWithoutCommonPrefix = teamLower.replace(commonFootballPrefixes, '').trim().replace(/\s+/g, '');
            if (nameWithoutCommonPrefix && nameWithoutCommonPrefix.length > 0 && !teamFileNameVariations.includes(nameWithoutCommonPrefix)) {
                teamFileNameVariations.push(nameWithoutCommonPrefix);
            }

            for (const teamFile of teamFileNameVariations) {
                if (!teamFile) continue;
                if (countryPath && (leagueToCountryPathMap[leagueLower] || countryPath.length > 3)) {
                    paths.push(`${continent}/${countryPath}/${teamFile}`);
                }
            }
            return [...new Set(paths.filter(p => p.length > 0))];
        },
        extensions: ['.png']
    },
];

// --- Exported Helper Functions ---

export const normalizeNameForKey = (name: string): string => {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
};

export const checkUrlExists = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
        return response.ok;
    } catch (error) {
        return false;
    }
};

export const guessLogoUrl = (teamName: string, leagueName?: string): string | undefined => {
    if (!teamName) return undefined;
    for (const pattern of LOGO_GUESS_PATTERNS) {
        const relativePathSuggestions = pattern.pathFormatter(teamName, leagueName);
        if (relativePathSuggestions.length === 0) continue;
        const firstRelativePath = relativePathSuggestions[0];
        const firstExtension = pattern.extensions[0];
        if (firstRelativePath && firstExtension) {
            return pattern.baseUrl + firstRelativePath + firstExtension;
        }
    }
    return undefined;
};


// --- AI and Online Search Functions ---

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

async function searchTeamLogoOnGitHub(teamName: string, leagueName?: string): Promise<string | undefined> {
  if (!teamName) return undefined;

  for (const pattern of LOGO_GUESS_PATTERNS) {
    const relativePathSuggestions = pattern.pathFormatter(teamName, leagueName);
    
    for (const relPath of relativePathSuggestions) {
      if (!relPath) continue;
      for (const ext of pattern.extensions) {
        const currentUrl = pattern.baseUrl + relPath + ext;
        if (await checkUrlExists(currentUrl)) {
          return currentUrl;
        }
      }
    }
  }
  return undefined;
}

async function findLogoWithGemini(teamName: string, leagueName: string | undefined): Promise<string | undefined> {
    const prompt = `Find a URL for the official logo of the football (soccer) team "${teamName}" that plays in "${leagueName || 'an unspecified league'}". Return only the direct URL to a high-quality, preferably transparent background, PNG or SVG image. If you are not sure or cannot find a valid, direct image URL, return an empty string.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
        });
        
        const url = response.text?.trim();

        if (url && (url.startsWith('http://') || url.startsWith('https://')) && (url.endsWith('.png') || url.endsWith('.svg') || url.endsWith('.webp') || url.endsWith('.gif'))) {
            if (await checkUrlExists(url)) {
                 return url;
            }
        }
        return undefined;
    } catch (error) {
        console.error(`Error fetching logo for "${teamName}" with Gemini:`, error);
        return undefined;
    }
}

// This is the main exported function that orchestrates the search
export async function searchTeamLogoOnline(teamName: string, leagueName?: string): Promise<string | undefined> {
    // 1. Try fast GitHub search first
    const githubLogo = await searchTeamLogoOnGitHub(teamName, leagueName);
    if (githubLogo) {
        console.log(`Found logo for ${teamName} on GitHub: ${githubLogo}`);
        return githubLogo;
    }

    // 2. If not found, use Gemini as a fallback
    console.log(`Could not find logo for ${teamName} on GitHub, trying Gemini...`);
    const geminiLogo = await findLogoWithGemini(teamName, leagueName);
    if (geminiLogo) {
        console.log(`Found logo for ${teamName} with Gemini: ${geminiLogo}`);
        return geminiLogo;
    }
    
    console.log(`Exhaustive search (GitHub + Gemini) failed for ${teamName}`);
    return undefined;
}