import { v4 as uuidv4 } from 'uuid';
import { RawMatch, Team, MatchStatus, Match, RawMatchData } from '../types';
// Logo specific functions will be called from AppContext or passed if needed, not directly imported here to avoid circular deps with context
// For now, parseTeam simply structures the team data. Logo assignment happens in AppContext or when calling transformRawMatch.

export const generateId = (): string => {
  return uuidv4();
};

export const formatDate = (dateString: string, includeTime: boolean = true): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    return date.toLocaleString(undefined, options);
  } catch (error) {
    return dateString; // Fallback to original string if formatting fails
  }
};

export const parseTeam = (teamInput: string | { name: string; code?: string }): Team => {
  if (typeof teamInput === 'string') {
    return { name: teamInput, logoUrl: undefined }; // Initialize logoUrl as undefined
  }
  return { name: teamInput.name, code: teamInput.code, logoUrl: undefined }; // Initialize logoUrl as undefined
};

export const determineMatchStatus = (rawMatch: RawMatch, matchDate: Date): MatchStatus => {
  const now = new Date();
  
  // Explicit score check first
  if (rawMatch.score1 !== undefined && rawMatch.score2 !== undefined) return MatchStatus.FINISHED;
  
  const score = rawMatch.score;
  if (score) {
      if ('ft' in score && score.ft && score.ft.length === 2) return MatchStatus.FINISHED;
      if ('et' in score && score.et && score.et.length === 2) return MatchStatus.FINISHED; // Consider ET as finished
      if ('p' in score && score.p && score.p.length === 2) return MatchStatus.FINISHED; // Consider penalties as finished
  }


  if (matchDate > now) return MatchStatus.UPCOMING;
  
  // Consider a match live if it started in the last 4 hours and is not marked finished
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  if (matchDate >= fourHoursAgo && matchDate <= now) return MatchStatus.LIVE;
  
  // If match date is in the past (more than 4 hours ago) and no score, could be upcoming (if wrongly dated) or require manual update.
  // Defaulting to UPCOMING for past matches without score to avoid them being stuck as LIVE. Admin can change.
  if (matchDate < fourHoursAgo) return MatchStatus.UPCOMING;

  return MatchStatus.UPCOMING; // Default fallback
};


export const transformRawMatch = (
  rawMatch: RawMatch, 
  leagueName: string, 
  sourceUrl: string
  // Note: Logo processing (getManagedTeamLogo, guessLogoUrl, addOrUpdateManagedTeam)
  // will be handled by the caller (AppContext) after this initial transformation.
): Match => {
  const matchId = generateId();
  // Team parsing is basic here; logo assignment is a separate step in AppContext
  const team1 = parseTeam(rawMatch.team1);
  const team2 = parseTeam(rawMatch.team2);
  
  let dateTimeString = rawMatch.date;
  if (rawMatch.time) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawMatch.date) && /^\d{2}:\d{2}(:\d{2})?$/.test(rawMatch.time)) {
       dateTimeString = `${rawMatch.date}T${rawMatch.time}`; 
       if(rawMatch.time.length === 5) dateTimeString += ':00';
    } else if (rawMatch.date.includes('T')) { 
        dateTimeString = rawMatch.date;
    }
  }

  let matchDateObject = new Date(dateTimeString);
  if (isNaN(matchDateObject.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(rawMatch.date)) {
    matchDateObject = new Date(rawMatch.date.substring(0,10));
  }
  if (isNaN(matchDateObject.getTime())) {
    console.warn(`Invalid date for match: ${team1.name} vs ${team2.name}, raw date: ${rawMatch.date}, time: ${rawMatch.time}`);
    matchDateObject = new Date(0); 
  }

  let score1: number | undefined | null = undefined;
  let score2: number | undefined | null = undefined;

  const currentScore = rawMatch.score;
  if (currentScore) {
    if ('ft' in currentScore && currentScore.ft && currentScore.ft.length === 2) {
      score1 = currentScore.ft[0];
      score2 = currentScore.ft[1];
    } else if ('et' in currentScore && currentScore.et && currentScore.et.length === 2) {
      score1 = currentScore.et[0];
      score2 = currentScore.et[1];
    } else if ('p' in currentScore && currentScore.p && currentScore.p.length === 2) {
      if (score1 === undefined && score2 === undefined) {
         score1 = currentScore.p[0];
         score2 = currentScore.p[1];
      }
    }
  } else if (rawMatch.score1 !== undefined && rawMatch.score2 !== undefined) {
    score1 = rawMatch.score1;
    score2 = rawMatch.score2;
  }
  
  const status = determineMatchStatus(rawMatch, matchDateObject);
  const sourceMatchId = `${leagueName}_${team1.name}_${team2.name}_${rawMatch.date}`.replace(/\s+/g, '_');

  return {
    id: matchId,
    sourceMatchId,
    sourceUrl,
    leagueName,
    round: rawMatch.round,
    date: matchDateObject.toISOString(),
    time: rawMatch.time,
    team1, // team1 and team2 will have logoUrl: undefined initially
    team2,
    score1: score1 === undefined ? null : score1,
    score2: score2 === undefined ? null : score2,
    status,
    streamLinks: [],
    group: rawMatch.group,
  };
};

export const parseMatchesFromJson = (jsonData: RawMatchData, sourceUrl: string): Match[] => {
  if (!jsonData || !jsonData.matches || !Array.isArray(jsonData.matches)) {
    console.error('Invalid JSON data structure for matches:', jsonData);
    return [];
  }
  const leagueName = jsonData.name || 'Unknown League';
  // Logo assignment will happen in AppContext after this initial parsing
  return jsonData.matches.map(rawMatch => transformRawMatch(rawMatch, leagueName, sourceUrl));
};