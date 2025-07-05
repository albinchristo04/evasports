export interface Team {
  name: string;
  code?: string;
  logoUrl?: string;
}

export enum MatchStatus {
  UPCOMING = 'Upcoming',
  LIVE = 'Live',
  FINISHED = 'Finished',
  POSTPONED = 'Postponed',
  CANCELLED = 'Cancelled',
}

export enum StreamType {
  IFRAME = 'iframe',
  VIDEO = 'video',
  HLS = 'hls',
  DASH = 'dash',
  NONE = 'none',
}

export enum StreamLinkStatus {
  ACTIVE = 'Active',
  BROKEN = 'Broken',
  GEO_RESTRICTED = 'Geo-Restricted',
  UNKNOWN = 'Unknown',
}

export interface StreamLink {
  id: string; // UUID for the link itself
  url: string;
  qualityLabel: string; // e.g., "HD", "SD", "720p", "Main"
  type: StreamType;
  status: StreamLinkStatus;
}

export interface Match {
  id: string; // UUID
  sourceMatchId?: string; // Optional: ID from the source system
  sourceUrl?: string; // URL of the JSON source this match came from
  leagueName: string;
  round?: string;
  date: string; // ISO string format
  time?: string; // HH:MM
  team1: Team;
  team2: Team;
  score1?: number | null;
  score2?: number | null;
  status: MatchStatus;
  streamLinks: StreamLink[]; // Replaces streamUrl and streamType
  group?: string;
  isFeatured?: boolean; // New field for featured matches
}

export type PreviewMatch = Match & { isAlreadyImported?: boolean; isPermanentlyDeleted?: boolean; };

export interface JsonSource {
  id: string; // UUID
  name: string;
  url: string;
  lastImported?: string; // ISO date string
  importStartDateOffsetDays?: number; // Optional: Days from today to start importing (e.g., -1 for yesterday)
  importEndDateOffsetDays?: number;   // Optional: Days from today to end importing (e.g., 7 for a week from now)
}

export interface ManagedTeam {
  nameKey: string; // Normalized team name, e.g., "manchesterunited" (used as ID)
  displayName: string; // Original or preferred display name, e.g., "Manchester United"
  logoUrl: string;
  leagueContext?: string; // Optional: To help differentiate teams like "United" in different leagues
  lastUpdated: string; // ISO Date string
}

// Advertising Management Types
export enum AdLocationKey {
  HEADER_BANNER = 'HEADER_BANNER',
  FOOTER_BANNER = 'FOOTER_BANNER',
  // SIDEBAR_TOP = 'SIDEBAR_TOP', // Example, not implemented in UI yet
  // SIDEBAR_BOTTOM = 'SIDEBAR_BOTTOM', // Example
  MATCH_DETAIL_BELOW_VIDEO = 'MATCH_DETAIL_BELOW_VIDEO',
  // MATCH_DETAIL_SIDEBAR = 'MATCH_DETAIL_SIDEBAR', // Example
  HOME_PAGE_BELOW_FILTERS = 'HOME_PAGE_BELOW_FILTERS',
  // HOME_PAGE_IN_LIST = 'HOME_PAGE_IN_LIST' // Example for injecting between match cards
}

export interface AdSlot {
  id: string; // UUID for the ad slot configuration
  locationKey: AdLocationKey;
  name: string; // User-defined name for this ad slot instance, e.g., "Header Leaderboard AdSense"
  adCode: string; // The actual HTML/JS ad code
  isEnabled: boolean;
  lastUpdated: string; // ISO Date string
}


export interface AdminSettings {
  jsonSources: JsonSource[];
  siteName: string;
  faviconUrl: string;
  customLogoUrl: string;
  themePrimaryColor: string;
  themeSecondaryColor: string;
  themeAccentColor: string;
  seoMetaTitleSuffix: string;
  seoDefaultMetaDescription: string;
  seoDefaultMetaKeywords: string;
  seoOpenGraphImageUrl: string;
  headerCode: string; // For non-ad related global scripts
  footerCode: string; // For non-ad related global scripts
  managedTeams: ManagedTeam[];
  adSlots: AdSlot[]; 
  featuredMatchIds: string[]; // New: Store IDs of featured matches
}

export type PartialAdminSettings = Partial<Omit<AdminSettings, 'jsonSources' | 'managedTeams' | 'adSlots' | 'featuredMatchIds'>>;
export type PartialManagedTeamsSettings = Pick<AdminSettings, 'managedTeams'>;
export type PartialAdSlotsSettings = Pick<AdminSettings, 'adSlots'>;
export type PartialFeaturedMatchesSettings = Pick<AdminSettings, 'featuredMatchIds'>;


export interface RawMatchData {
  name: string; // League name
  matches: RawMatch[];
}

export interface RawMatch {
  round?: string;
  date: string;
  time?: string;
  team1: string | { name: string; code?: string };
  team2: string | { name: string; code?: string };
  score?: { ft: [number, number] } | { et?: [number, number]; p?: [number, number] };
  score1?: number;
  score2?: number;
  group?: string;
}

export enum BulkActionType {
  DELETE = 'delete',
  UPDATE_STATUS = 'update_status',
  CLEAR_STREAMS = 'clear_streams'
}

// For better organization of context related to teams specifically
export interface TeamContextType {
  managedTeams: ManagedTeam[];
  addOrUpdateManagedTeam: (team: ManagedTeam) => Promise<void>;
  deleteManagedTeam: (teamNameKey: string) => Promise<void>;
  getManagedTeamLogo: (teamName: string, leagueName?: string) => string | undefined;
  allDiscoveredTeamNames: { name: string, league: string }[]; // All unique team names found in matches
}

// For In-App Notifications
export interface AppNotification {
  id: string; // UUID
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  matchId?: string; // Optional: to link notification to a match
  notificationType?: 'starting_soon' | 'match_live'; // Optional: for tracking notification purpose
}