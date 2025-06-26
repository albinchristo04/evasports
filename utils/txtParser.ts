
import { Match, Team, MatchStatus } from '../types';
import { generateId } from './helpers';
import { normalizeNameForKey } from './logoService';

const monthMap: { [key: string]: number } = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const parseTeamName = (rawName: string): Team => {
  // Remove country code like (BRA) or (USA)
  const name = rawName.replace(/\s*\([A-Z]{2,3}\)\s*$/, '').trim();
  return { name };
};

export const parseTxtMatches = (txtContent: string, leagueName: string, year: number, sourceTxtUrl: string): Match[] => {
  const lines = txtContent.split('\n');
  const matches: Match[] = [];
  let currentRound: string | undefined = undefined;
  let currentDate: Date | undefined = undefined;

  const roundRegex = /^»\s*(.*)/;
  const dateRegex = /^\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\w+)\/(\d+)/i; // DayOfWeek Month/DayOfMonth
  const matchRegex = /^\s*(\d{1,2}\.\d{2})\s+(.+?)\s+v(?:s\.?)\s+(.+?)\s*$/i; // Time Team1 vs Team2

  for (const line of lines) {
    const roundMatch = line.match(roundRegex);
    if (roundMatch) {
      currentRound = roundMatch[1].trim();
      continue;
    }

    const dateLineMatch = line.match(dateRegex);
    if (dateLineMatch) {
      const monthStr = dateLineMatch[2].toLowerCase();
      const day = parseInt(dateLineMatch[3], 10);
      const month = monthMap[monthStr.substring(0,3)];
      if (month !== undefined && !isNaN(day)) {
        currentDate = new Date(year, month, day);
      } else {
        console.warn(`Could not parse date from line: ${line}. Month: ${monthStr}, Day: ${day}`);
        currentDate = undefined; // Reset if date is unparseable
      }
      continue;
    }

    const matchLineMatch = line.match(matchRegex);
    if (matchLineMatch && currentDate) {
      try {
        const timeStr = matchLineMatch[1].replace('.', ':'); // HH:MM
        const team1Raw = matchLineMatch[2].trim();
        const team2Raw = matchLineMatch[3].trim();

        const team1 = parseTeamName(team1Raw);
        const team2 = parseTeamName(team2Raw);

        const matchDateTime = new Date(currentDate);
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          matchDateTime.setHours(hours, minutes, 0, 0);
        } else {
            console.warn(`Could not parse time: ${timeStr} for match ${team1.name} vs ${team2.name}`);
            // If time is invalid, maybe skip or use a default time like 00:00
            // For now, let's keep the date part only if time is problematic
            matchDateTime.setHours(0,0,0,0); 
        }
        
        const sourceMatchId = `${normalizeNameForKey(leagueName)}_${normalizeNameForKey(team1.name)}_${normalizeNameForKey(team2.name)}_${year}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}_${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;


        const match: Match = {
          id: generateId(), // Temporary ID for preview
          sourceMatchId: sourceMatchId,
          sourceTxtUrl: sourceTxtUrl, 
          leagueName,
          round: currentRound,
          date: matchDateTime.toISOString(),
          time: timeStr,
          team1,
          team2,
          score1: null,
          score2: null,
          status: MatchStatus.UPCOMING, // Default for new imports
          streamLinks: [],
        };
        matches.push(match);
      } catch (e) {
        console.error(`Error parsing match line: "${line}"`, e);
      }
    }
  }
  return matches;
};
