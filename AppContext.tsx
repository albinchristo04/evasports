import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Match, JsonSource, AdminSettings, RawMatchData, PartialAdminSettings, MatchStatus, ManagedTeam, TeamContextType, Team as AppTeam, AdSlot, AdLocationKey, PartialAdSlotsSettings, PartialFeaturedMatchesSettings, AppNotification } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { INITIAL_ADMIN_SETTINGS } from './constants';
import { parseMatchesFromJson, generateId } from './utils/helpers';
import { normalizeNameForKey, guessLogoUrl } from './utils/logoService'; 
// Removed: import { GoogleGenAI } from "@google/genai"; 


interface AppContextTypeCore {
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  adminSettings: AdminSettings;
  updateAdminSettings: (newSettings: PartialAdminSettings | Pick<AdminSettings, 'managedTeams'> | PartialAdSlotsSettings | PartialFeaturedMatchesSettings) => void;
  setJsonSources: React.Dispatch<React.SetStateAction<JsonSource[]>>; 
  fetchMatchesFromSource: (source: JsonSource) => Promise<void>;
  fetchAllMatchesFromSources: () => Promise<void>;
  loadingSources: { [key: string]: boolean }; 
  globalLoading: boolean;
  error: string | null;
  addMatch: (match: Omit<Match, 'id'>) => void;
  updateMatch: (match: Match) => void;
  deleteMatch: (matchId: string) => void;
  getMatchById: (matchId: string) => Match | undefined;
  leagues: string[];
  bulkDeleteMatches: (matchIds: string[]) => void;
  bulkUpdateMatchStatus: (matchIds: string[], status: MatchStatus) => void;
  bulkClearStreamLinks: (matchIds: string[]) => void;
  // Ad Management
  getAdSlot: (locationKey: AdLocationKey) => AdSlot | undefined;
  addOrUpdateAdSlot: (adSlot: AdSlot) => void;
  deleteAdSlot: (adSlotId: string) => void;
  // Featured Matches
  toggleFeaturedMatch: (matchId: string) => void;
  // Match Subscriptions & Notifications
  subscribedMatchIds: string[];
  toggleMatchSubscription: (matchId: string) => void;
  isMatchSubscribed: (matchId: string) => boolean;
  activeAppNotifications: AppNotification[];
  dismissAppNotification: (notificationId: string) => void;
  // New function for Gemini API via backend
  generateTextWithGemini: (prompt: string) => Promise<string>;
}

export type AppContextType = AppContextTypeCore & TeamContextType;

const AppContext = createContext<AppContextType | undefined>(undefined);

const NOTIFICATION_CHECK_INTERVAL = 30 * 1000; // 30 seconds
const MINUTES_BEFORE_START_FOR_NOTIFICATION = 15;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useLocalStorage<Match[]>('sportstream_matches', []);
  const [adminSettings, setAdminSettingsState] = useLocalStorage<AdminSettings>('sportstream_adminSettings', INITIAL_ADMIN_SETTINGS);
  const [subscribedMatchIds, setSubscribedMatchIds] = useLocalStorage<string[]>('sportstream_subscribedMatchIds', []);
  const [activeAppNotifications, setActiveAppNotifications] = useState<AppNotification[]>([]);
  
  const [loadingSources, setLoadingSources] = useState<{ [key: string]: boolean }>({});
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const jsonSources = adminSettings.jsonSources;
  const managedTeams = adminSettings.managedTeams;
  const adSlots = adminSettings.adSlots;
  const featuredMatchIds = adminSettings.featuredMatchIds;

  const notifiedStartingSoonRef = useRef<Set<string>>(new Set());
  const notifiedLiveRef = useRef<Set<string>>(new Set());

  // Function to call Gemini API via our backend proxy
  const generateTextWithGemini = useCallback(async (prompt: string): Promise<string> => {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API request failed with status: ${response.status}`);
      }
      return data.text || '';
    } catch (err: any) {
      console.error('Error calling Gemini API proxy:', err);
      throw new Error(`Failed to generate text: ${err.message}`);
    }
  }, []);


  const setJsonSources = useCallback((updater: React.SetStateAction<JsonSource[]>) => {
    setAdminSettingsState(prevSettings => {
      const newSources = typeof updater === 'function' ? updater(prevSettings.jsonSources) : updater;
      return { ...prevSettings, jsonSources: newSources };
    });
  }, [setAdminSettingsState]);

  const updateAdminSettings = useCallback((newSettings: PartialAdminSettings | Pick<AdminSettings, 'managedTeams'> | PartialAdSlotsSettings | PartialFeaturedMatchesSettings) => {
    setAdminSettingsState(prevSettings => ({
      ...prevSettings,
      ...newSettings,
    }));
  }, [setAdminSettingsState]);


  const getManagedTeamLogo = useCallback((teamName: string, leagueName?: string): string | undefined => {
    const normalizedTeamKey = normalizeNameForKey(teamName);
    const leagueKey = leagueName ? normalizeNameForKey(leagueName) : undefined;

    const found = managedTeams.find(mt => 
        mt.nameKey === normalizedTeamKey && 
        (!leagueKey || !mt.leagueContext || normalizeNameForKey(mt.leagueContext) === leagueKey)
    );
    if (found?.logoUrl) return found.logoUrl;

    const foundByNameOnly = managedTeams.find(mt => mt.nameKey === normalizedTeamKey && mt.logoUrl);
    return foundByNameOnly?.logoUrl;
  }, [managedTeams]);

  const processTeamForLogoDisplay = useCallback((team: AppTeam, leagueName: string): AppTeam => {
    let logoUrl = getManagedTeamLogo(team.name, leagueName);
    if (!logoUrl) {
      logoUrl = guessLogoUrl(team.name, leagueName); 
    }
    return { ...team, logoUrl: logoUrl || undefined }; 
  }, [getManagedTeamLogo]);

  const addOrUpdateManagedTeam = useCallback((teamEntry: ManagedTeam) => {
    let logoActuallyChanged = false;
    let newDisplayName: string | undefined = undefined;

    setAdminSettingsState(prevSettings => {
      const existingIndex = prevSettings.managedTeams.findIndex(mt => mt.nameKey === teamEntry.nameKey);
      let newManagedTeamsList;

      if (existingIndex > -1) {
        if (prevSettings.managedTeams[existingIndex].logoUrl !== teamEntry.logoUrl || prevSettings.managedTeams[existingIndex].displayName !== teamEntry.displayName) {
          logoActuallyChanged = prevSettings.managedTeams[existingIndex].logoUrl !== teamEntry.logoUrl;
          newDisplayName = teamEntry.displayName; 
        }
        newManagedTeamsList = [...prevSettings.managedTeams];
        newManagedTeamsList[existingIndex] = teamEntry;
      } else {
        newManagedTeamsList = [...prevSettings.managedTeams, teamEntry];
        logoActuallyChanged = !!teamEntry.logoUrl; 
        newDisplayName = teamEntry.displayName;
      }
      return { ...prevSettings, managedTeams: newManagedTeamsList.sort((a, b) => a.displayName.localeCompare(b.displayName)) };
    });

    if (logoActuallyChanged || (newDisplayName && managedTeams.find(mt => mt.nameKey === teamEntry.nameKey)?.displayName !== newDisplayName)) {
      setMatches(prevMatches =>
        prevMatches.map(m => {
          let t1 = m.team1;
          let t2 = m.team2;
          let matchUpdated = false;

          if (normalizeNameForKey(m.team1.name) === teamEntry.nameKey) {
            const currentLogo = getManagedTeamLogo(teamEntry.displayName, m.leagueName); 
            t1 = { ...m.team1, logoUrl: currentLogo || m.team1.logoUrl, name: newDisplayName || m.team1.name };
            matchUpdated = true;
          }
          if (normalizeNameForKey(m.team2.name) === teamEntry.nameKey) {
            const currentLogo = getManagedTeamLogo(teamEntry.displayName, m.leagueName);
            t2 = { ...m.team2, logoUrl: currentLogo || m.team2.logoUrl, name: newDisplayName || m.team2.name };
            matchUpdated = true;
          }
          return matchUpdated ? { ...m, team1: t1, team2: t2 } : m;
        })
      );
    }
  }, [setAdminSettingsState, setMatches, getManagedTeamLogo, managedTeams]); 

  const deleteManagedTeam = useCallback((teamNameKey: string) => {
    setAdminSettingsState(prev => ({
      ...prev,
      managedTeams: prev.managedTeams.filter(mt => mt.nameKey !== teamNameKey),
    }));
  }, [setAdminSettingsState]);
  
  const allDiscoveredTeamNames = React.useMemo(() => {
    const teams = new Map<string, {name: string, league: string}>();
    matches.forEach(match => {
        const key1 = `${normalizeNameForKey(match.team1.name)}_${normalizeNameForKey(match.leagueName)}`;
        if (!teams.has(key1)) teams.set(key1, { name: match.team1.name, league: match.leagueName});
        
        const key2 = `${normalizeNameForKey(match.team2.name)}_${normalizeNameForKey(match.leagueName)}`;
        if (!teams.has(key2)) teams.set(key2, { name: match.team2.name, league: match.leagueName});
    });
    return Array.from(teams.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [matches]);

  const leagues = React.useMemo(() => {
    const leagueSet = new Set(matches.map(match => match.leagueName));
    return Array.from(leagueSet).sort();
  }, [matches]);

  const processMatchArrays = useCallback((matchesArray: Match[]): Match[] => {
    return matchesArray.map(m => ({
        ...m,
        team1: processTeamForLogoDisplay(m.team1, m.leagueName),
        team2: processTeamForLogoDisplay(m.team2, m.leagueName),
        isFeatured: featuredMatchIds.includes(m.id),
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [processTeamForLogoDisplay, featuredMatchIds]);

  const fetchMatchesFromSource = useCallback(async (source: JsonSource) => {
    setLoadingSources(prev => ({ ...prev, [source.id]: true }));
    setError(null);
    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${source.name}: ${response.statusText}`);
      }
      const rawData: RawMatchData = await response.json();
      
      let parsedRawMatches = parseMatchesFromJson(rawData, source.url);

      const { importStartDateOffsetDays, importEndDateOffsetDays } = source;
      if (typeof importStartDateOffsetDays === 'number' && typeof importEndDateOffsetDays === 'number') {
        const today = new Date();
        
        const filterStartDate = new Date(today);
        filterStartDate.setDate(today.getDate() + importStartDateOffsetDays);
        filterStartDate.setHours(0, 0, 0, 0);

        const filterEndDate = new Date(today);
        filterEndDate.setDate(today.getDate() + importEndDateOffsetDays);
        filterEndDate.setHours(23, 59, 59, 999);
        
        parsedRawMatches = parsedRawMatches.filter(match => {
          const matchDate = new Date(match.date);
          return matchDate >= filterStartDate && matchDate <= filterEndDate;
        });
      }

      const uniqueTeamsFromSource = new Map<string, { name: string; leagueName: string }>();
      parsedRawMatches.forEach(match => {
        const key1 = normalizeNameForKey(match.team1.name);
        if (!uniqueTeamsFromSource.has(key1)) uniqueTeamsFromSource.set(key1, { name: match.team1.name, leagueName: match.leagueName });
        const key2 = normalizeNameForKey(match.team2.name);
        if (!uniqueTeamsFromSource.has(key2)) uniqueTeamsFromSource.set(key2, { name: match.team2.name, leagueName: match.leagueName });
      });

      for (const [key, teamInfo] of uniqueTeamsFromSource) {
        const isManaged = managedTeams.some(mt => mt.nameKey === key && mt.logoUrl);
        if (!isManaged) {
          const guessedUrl = guessLogoUrl(teamInfo.name, teamInfo.leagueName);
          if (guessedUrl) {
            const existingManagedEntry = managedTeams.find(mt => mt.nameKey === key);
            if (!existingManagedEntry || !existingManagedEntry.logoUrl) {
                 addOrUpdateManagedTeam({
                    nameKey: key,
                    displayName: teamInfo.name,
                    logoUrl: guessedUrl,
                    leagueContext: teamInfo.leagueName,
                    lastUpdated: new Date().toISOString()
                });
            }
          }
        }
      }

      setMatches(prevMatches => {
        const otherMatches = prevMatches.filter(m => m.sourceUrl !== source.url);
        return processMatchArrays([...otherMatches, ...parsedRawMatches]);
      });
      
      setJsonSources(prevSources => prevSources.map(s => s.id === source.id ? {...s, lastImported: new Date().toISOString()} : s));

    } catch (err: any) {
      console.error(`Error fetching from ${source.name}:`, err);
      setError(`Error fetching from ${source.name}: ${err.message}`);
    } finally {
      setLoadingSources(prev => ({ ...prev, [source.id]: false }));
    }
  }, [setMatches, setJsonSources, addOrUpdateManagedTeam, managedTeams, processMatchArrays]); 
  
  const fetchAllMatchesFromSources = useCallback(async () => {
    setGlobalLoading(true);
    setError(null);
    const manuallyAddedMatches = matches.filter(m => !m.sourceUrl || !jsonSources.some(js => js.url === m.sourceUrl));
    setMatches(processMatchArrays(manuallyAddedMatches));

    for (const source of jsonSources) {
      await fetchMatchesFromSource(source); 
    }
    setGlobalLoading(false);
  }, [jsonSources, fetchMatchesFromSource, setMatches, matches, processMatchArrays]);

  const addMatch = useCallback((matchData: Omit<Match, 'id'>) => {
    const newMatchId = generateId(); 
    const newMatch: Match = { 
        ...matchData, 
        id: newMatchId,
        isFeatured: !!matchData.isFeatured, 
    };
    
    if (newMatch.isFeatured) {
        if (!featuredMatchIds.includes(newMatchId)) {
            updateAdminSettings({ featuredMatchIds: [...featuredMatchIds, newMatchId] });
        }
    }
    setMatches(prev => processMatchArrays([newMatch, ...prev]));
  }, [featuredMatchIds, processMatchArrays, updateAdminSettings, setMatches]);

  const updateMatch = useCallback((updatedMatch: Match) => {
    const isNowFeatured = !!updatedMatch.isFeatured;
    const wasFeatured = featuredMatchIds.includes(updatedMatch.id);

    if (isNowFeatured && !wasFeatured) {
        updateAdminSettings({ featuredMatchIds: [...featuredMatchIds, updatedMatch.id] });
    } else if (!isNowFeatured && wasFeatured) {
        updateAdminSettings({ featuredMatchIds: featuredMatchIds.filter(id => id !== updatedMatch.id) });
    }
    setMatches(prev => processMatchArrays(prev.map(m => m.id === updatedMatch.id ? { ...updatedMatch, isFeatured: isNowFeatured } : m)));
  },[featuredMatchIds, processMatchArrays, updateAdminSettings, setMatches]);

  const deleteMatch = (matchId: string) => {
    setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId));
    if (featuredMatchIds.includes(matchId)) {
        updateAdminSettings({ featuredMatchIds: featuredMatchIds.filter(id => id !== matchId) });
    }
  };
  
  const bulkDeleteMatches = (matchIdsToDelete: string[]) => {
    setMatches(prevMatches => prevMatches.filter(m => !matchIdsToDelete.includes(m.id)));
    updateAdminSettings({ featuredMatchIds: featuredMatchIds.filter(id => !matchIdsToDelete.includes(id)) });
  };

  const bulkUpdateMatchStatus = (matchIdsToUpdate: string[], status: MatchStatus) => {
    setMatches(prevMatches =>
      processMatchArrays(
        prevMatches.map(m =>
            matchIdsToUpdate.includes(m.id) ? { ...m, status } : m
        )
      )
    );
  };

  const bulkClearStreamLinks = (matchIdsToClear: string[]) => {
    setMatches(prevMatches =>
      processMatchArrays(
          prevMatches.map(m =>
            matchIdsToClear.includes(m.id) ? { ...m, streamLinks: [] } : m
        )
      )
    );
  };

  const getMatchById = useCallback((matchId: string): Match | undefined => {
    const match = matches.find(m => m.id === matchId);
    if (match) { 
        return {
            ...match,
            team1: processTeamForLogoDisplay(match.team1, match.leagueName),
            team2: processTeamForLogoDisplay(match.team2, match.leagueName),
            isFeatured: featuredMatchIds.includes(match.id) 
        };
    }
    return undefined;
  }, [matches, processTeamForLogoDisplay, featuredMatchIds]);
  
  const toggleFeaturedMatch = useCallback((matchId: string) => {
    const newFeaturedIds = featuredMatchIds.includes(matchId)
      ? featuredMatchIds.filter(id => id !== matchId)
      : [...featuredMatchIds, matchId];
    
    updateAdminSettings({ featuredMatchIds: newFeaturedIds });

    setMatches(prevMatches => 
      prevMatches.map(m => 
        m.id === matchId ? { ...m, isFeatured: newFeaturedIds.includes(matchId) } : m
      )
    );
  }, [featuredMatchIds, updateAdminSettings, setMatches]);


  // Ad Management Functions
  const getAdSlot = useCallback((locationKey: AdLocationKey): AdSlot | undefined => {
    return adSlots.find(slot => slot.locationKey === locationKey && slot.isEnabled);
  }, [adSlots]);

  const addOrUpdateAdSlot = useCallback((adSlot: AdSlot) => {
    setAdminSettingsState(prev => {
      const existingIndex = prev.adSlots.findIndex(s => s.id === adSlot.id);
      let newAdSlots;
      if (existingIndex > -1) {
        newAdSlots = [...prev.adSlots];
        newAdSlots[existingIndex] = { ...adSlot, lastUpdated: new Date().toISOString() };
      } else {
        const slotForLocationIndex = prev.adSlots.findIndex(s => s.locationKey === adSlot.locationKey);
        if (slotForLocationIndex > -1) { 
            newAdSlots = [...prev.adSlots];
            newAdSlots[slotForLocationIndex] = { ...adSlot, id: prev.adSlots[slotForLocationIndex].id, lastUpdated: new Date().toISOString() };
        } else { 
            newAdSlots = [...prev.adSlots, { ...adSlot, id: generateId(), lastUpdated: new Date().toISOString() }];
        }
      }
      return { ...prev, adSlots: newAdSlots };
    });
  }, [setAdminSettingsState]);
  
  const deleteAdSlot = useCallback((adSlotId: string) => {
    setAdminSettingsState(prev => {
        const newAdSlots = prev.adSlots.map(slot => 
            slot.id === adSlotId 
            ? { ...slot, adCode: '', isEnabled: false, name: `Unconfigured (${slot.locationKey})`, lastUpdated: new Date().toISOString() } 
            : slot
        );
        return { ...prev, adSlots: newAdSlots };
    });
  }, [setAdminSettingsState]);


  // Match Subscription and In-App Notification Logic
  const toggleMatchSubscription = useCallback((matchId: string) => {
    setSubscribedMatchIds(prev =>
      prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]
    );
  }, [setSubscribedMatchIds]);

  const isMatchSubscribed = useCallback((matchId: string): boolean => {
    return subscribedMatchIds.includes(matchId);
  }, [subscribedMatchIds]);

  const addAppNotification = useCallback((message: string, type: AppNotification['type'] = 'info', matchId?: string, notificationType?: AppNotification['notificationType']) => {
    const newNotification: AppNotification = {
      id: generateId(),
      message,
      type,
      timestamp: Date.now(),
      matchId,
      notificationType,
    };
    setActiveAppNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
  }, []);

  const dismissAppNotification = useCallback((notificationId: string) => {
    setActiveAppNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      subscribedMatchIds.forEach(matchId => {
        const match = matches.find(m => m.id === matchId);
        if (match) {
          const matchDate = new Date(match.date);
          
          if (match.status === MatchStatus.UPCOMING && !notifiedStartingSoonRef.current.has(matchId)) {
            const diffMinutes = (matchDate.getTime() - now.getTime()) / (1000 * 60);
            if (diffMinutes > 0 && diffMinutes <= MINUTES_BEFORE_START_FOR_NOTIFICATION) {
              addAppNotification(
                `Match Starting Soon: ${match.team1.name} vs ${match.team2.name} in ~${Math.round(diffMinutes)} mins!`,
                'info',
                matchId,
                'starting_soon'
              );
              notifiedStartingSoonRef.current.add(matchId);
            }
          }

          if (match.status === MatchStatus.LIVE && !notifiedLiveRef.current.has(matchId)) {
            addAppNotification(
              `Match LIVE: ${match.team1.name} vs ${match.team2.name} has started!`,
              'success',
              matchId,
              'match_live'
            );
            notifiedLiveRef.current.add(matchId);
            notifiedStartingSoonRef.current.delete(matchId);
          }
          
          if (match.status === MatchStatus.FINISHED || match.status === MatchStatus.CANCELLED) {
            notifiedStartingSoonRef.current.delete(matchId);
            notifiedLiveRef.current.delete(matchId);
          }
        }
      });
    }, NOTIFICATION_CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [subscribedMatchIds, matches, addAppNotification]);

  useEffect(() => {
    setMatches(prev => processMatchArrays(prev));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredMatchIds]); 

  return (
    <AppContext.Provider value={{
      matches,
      setMatches,
      adminSettings,
      updateAdminSettings,
      setJsonSources, 
      fetchMatchesFromSource,
      fetchAllMatchesFromSources,
      loadingSources,
      globalLoading,
      error,
      addMatch,
      updateMatch,
      deleteMatch,
      getMatchById,
      leagues,
      bulkDeleteMatches,
      bulkUpdateMatchStatus,
      bulkClearStreamLinks,
      managedTeams: adminSettings.managedTeams,
      addOrUpdateManagedTeam,
      deleteManagedTeam,
      getManagedTeamLogo,
      allDiscoveredTeamNames,
      getAdSlot,
      addOrUpdateAdSlot,
      deleteAdSlot,
      toggleFeaturedMatch,
      subscribedMatchIds,
      toggleMatchSubscription,
      isMatchSubscribed,
      activeAppNotifications,
      dismissAppNotification,
      generateTextWithGemini, // Expose the new function
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
