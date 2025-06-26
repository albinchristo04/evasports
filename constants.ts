import { JsonSource, AdminSettings } from './types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_JSON_SOURCES: Omit<JsonSource, 'id' | 'lastImported'>[] = [
  { name: 'Premier League (Example - MLS Data)', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2025/mls.json', importStartDateOffsetDays: -2, importEndDateOffsetDays: 14 },
  { name: 'Bundesliga', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/de.1.json', importStartDateOffsetDays: -2, importEndDateOffsetDays: 14 },
  { name: 'La Liga', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/es.1.json', importStartDateOffsetDays: -2, importEndDateOffsetDays: 14 },
  { name: 'Segunda División', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/es.2.json', importStartDateOffsetDays: -2, importEndDateOffsetDays: 14 },
  { name: 'Champions League', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/uefa.cl.json', importStartDateOffsetDays: -2, importEndDateOffsetDays: 14 },
  { name: 'Serie A', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/it.1.json', importStartDateOffsetDays: -2, importEndDateOffsetDays: 14 },
];

export const INITIAL_JSON_SOURCES: JsonSource[] = DEFAULT_JSON_SOURCES.map(source => ({
  ...source,
  id: uuidv4(), 
}));

export const INITIAL_ADMIN_SETTINGS: AdminSettings = {
  jsonSources: INITIAL_JSON_SOURCES,
  siteName: "SportStream Pro",
  faviconUrl: "/favicon.ico", // Default favicon path
  customLogoUrl: "", // Empty means use default icon/text logo
  themePrimaryColor: "#007bff", // Default primary (Tailwind Blue 500 equivalent)
  themeSecondaryColor: "#6f42c1", // Default secondary (Tailwind Indigo 500 equivalent)
  themeAccentColor: "#10B981", // Default accent (Tailwind Emerald 500 equivalent)
  seoMetaTitleSuffix: "SportStream Pro",
  seoDefaultMetaDescription: "Live sports scores, upcoming matches, and stream information.",
  seoDefaultMetaKeywords: "sports, live scores, football, soccer, streaming, matches",
  seoOpenGraphImageUrl: "", // URL to a default OG image
  headerCode: "<!-- Custom Header Code: Add meta tags, analytics scripts, etc. -->",
  footerCode: "<!-- Footer Code Placeholder: Add ad scripts, tracking pixels, or HTML here -->",
  managedTeams: [], // Initialize managed teams as an empty array
  adSlots: [], // Initialize ad slots as an empty array
  featuredMatchIds: [], // Initialize featured match IDs as an empty array
};