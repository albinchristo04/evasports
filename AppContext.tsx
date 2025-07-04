import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Json, Database } from './database.types';
import { Match, JsonSource, AdminSettings, RawMatchData, PartialAdminSettings, MatchStatus, ManagedTeam, TeamContextType, Team as AppTeam, AdSlot, AdLocationKey, PartialAdSlotsSettings, PartialFeaturedMatchesSettings, AppNotification, StreamLink } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { INITIAL_ADMIN_SETTINGS } from './constants';
import { parseMatchesFromJson, generateId } from './utils/helpers';
import { normalizeNameForKey, guessLogoUrl } from './utils/logoService'; 
import { supabase } from './utils/supabase';


interface AppContextTypeCore {
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  adminSettings: AdminSettings;
  updateAdminSettings: (newSettings: Partial<AdminSettings>) => Promise<void>;
  setJsonSources: (updater: React.SetStateAction<JsonSource[]>) => Promise<void>; 
  fetchMatchesFromSource: (source: JsonSource) => Promise<void>;
  fetchAllMatchesFromSources: (overwrite?: boolean) => Promise<{added: number, skipped: number, error?: string}>;
  loadingSources: { [key: string]: boolean }; 
  globalLoading: boolean;
  error: string | null;
  addMatch: (match: Omit<Match, 'id'>) => Promise<void>;
  updateMatch: (match: Match) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  getMatchById: (matchId: string) => Match | undefined;
  leagues: string[];
  bulkDeleteMatches: (matchIds: string[]) => Promise<void>;
  bulkUpdateMatchStatus: (matchIds: string[], status: MatchStatus) => Promise<void>;
  bulkClearStreamLinks: (matchIds: string[]) => Promise<void>;
  // Ad Management
  getAdSlot: (locationKey: AdLocationKey) => AdSlot | undefined;
  addOrUpdateAdSlot: (adSlot: AdSlot) => Promise<void>;
  deleteAdSlot: (adSlotId: string) => Promise<void>;
  // Featured Matches
  toggleFeaturedMatch: (matchId: string) => Promise<void>;
  // Match Subscriptions & Notifications
  subscribedMatchIds: string[];
  toggleMatchSubscription: (matchId: string) => void;
  isMatchSubscribed: (matchId: string) => boolean;
  activeAppNotifications: AppNotification[];
  dismissAppNotification: (notificationId: string) => void;
}

export type AppContextType = AppContextTypeCore & TeamContextType;

const AppContext = createContext<AppContextType | undefined>(undefined);

const NOTIFICATION_CHECK_INTERVAL = 30 * 1000; // 30 seconds
const MINUTES_BEFORE_START_FOR_NOTIFICATION = 15;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [adminSettings, setAdminSettingsState] = useState<AdminSettings>(INITIAL_ADMIN_SETTINGS);
  const [subscribedMatchIds, setSubscribedMatchIds] = useLocalStorage<string[]>('sportstream_subscribedMatchIds', []);
  const [activeAppNotifications, setActiveAppNotifications] = useState<AppNotification[]>([]);
  
  const [loadingSources, setLoadingSources] = useState<{ [key: string]: boolean }>({});
  const [globalLoading, setGlobalLoading] = useState<boolean>(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  const jsonSources = adminSettings.jsonSources;
  const managedTeams = adminSettings.managedTeams;
  const adSlots = adminSettings.adSlots;
  const featuredMatchIds = adminSettings.featuredMatchIds;

  const notifiedStartingSoonRef = useRef<Set<string>>(new Set());
  const notifiedLiveRef = useRef<Set<string>>(new Set());

  // Initial data loading from Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      setError(null);
      setGlobalLoading(true);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('settings_data')
        .eq('id', 1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error fetching settings:", settingsError);
        setError(`Error fetching settings: ${settingsError.message}`);
      } else if (settingsData) {
        const dbSettings = settingsData.settings_data as Partial<AdminSettings>;
        setAdminSettingsState(prev => ({...prev, ...dbSettings}));
      } else { // No settings found, insert initial settings
        const initialSettingsForDb: Database['public']['Tables']['settings']['Insert'] = {
            id: 1,
            settings_data: INITIAL_ADMIN_SETTINGS as Json,
        };
        const { error: upsertError } = await supabase.from('settings').upsert([initialSettingsForDb]);
        if(upsertError) {
            console.error("Error saving initial settings:", upsertError);
            setError(`Error saving initial settings: ${upsertError.message}`);
        }
      }

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        setError(`Error fetching matches: ${matchesError.message}`);
      } else if (matchesData) {
        setMatches(matchesData as Match[]);
      }
      setGlobalLoading(false);
    };

    loadInitialData();
  }, []);

  const updateAdminSettings = useCallback(async (newSettings: Partial<AdminSettings>) => {
    const currentState = adminSettings;
    const updatedSettingsData = {
        ...currentState,
        ...newSettings,
    } as AdminSettings;
    
    // Optimistic UI update
    setAdminSettingsState(updatedSettingsData);

    const { error: dbError } = await supabase
        .from('settings')
        .update({ settings_data: updatedSettingsData as Json, updated_at: new Date().toISOString() })
        .eq('id', 1);

    if (dbError) {
        console.error("Error updating settings:", dbError);
        setError(`Failed to save settings: ${dbError.message}`);
        // Revert optimistic update on failure
        setAdminSettingsState(currentState);
    }
  }, [adminSettings]);

  const setJsonSources = useCallback(async (updater: React.SetStateAction<JsonSource[]>) => {
    const newSources = typeof updater === 'function' ? updater(adminSettings.jsonSources) : updater;
    await updateAdminSettings({ jsonSources: newSources });
  }, [adminSettings.jsonSources, updateAdminSettings]);

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

  const processMatchArrays = useCallback((matchesArray: Match[]): Match[] => {
    return matchesArray.map(m => ({
        ...m,
        isFeatured: adminSettings.featuredMatchIds.includes(m.id),
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [adminSettings.featuredMatchIds]);
  
  const processTeamForLogoDisplay = useCallback((team: AppTeam, leagueName: string): AppTeam => {
    let logoUrl = getManagedTeamLogo(team.name, leagueName);
    if (!logoUrl) {
      logoUrl = guessLogoUrl(team.name, leagueName); 
    }
    return { ...team, logoUrl: logoUrl || undefined }; 
  }, [getManagedTeamLogo]);

  const addOrUpdateManagedTeam = useCallback(async (teamEntry: ManagedTeam) => {
    const newManagedTeamsList = [...managedTeams];
    const existingIndex = newManagedTeamsList.findIndex(mt => mt.nameKey === teamEntry.nameKey);

    if (existingIndex > -1) {
      newManagedTeamsList[existingIndex] = teamEntry;
    } else {
      newManagedTeamsList.push(teamEntry);
    }
    await updateAdminSettings({ managedTeams: newManagedTeamsList.sort((a, b) => a.displayName.localeCompare(b.displayName)) });
  }, [managedTeams, updateAdminSettings]);

  const deleteManagedTeam = useCallback(async (teamNameKey: string) => {
    const newManagedTeams = managedTeams.filter(mt => mt.nameKey !== teamNameKey);
    await updateAdminSettings({ managedTeams: newManagedTeams });
  }, [managedTeams, updateAdminSettings]);
  
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
  
  const toggleFeaturedMatch = useCallback(async (matchId: string) => {
    const newFeaturedIds = featuredMatchIds.includes(matchId)
      ? featuredMatchIds.filter(id => id !== matchId)
      : [...featuredMatchIds, matchId];
    await updateAdminSettings({ featuredMatchIds: newFeaturedIds });
  }, [featuredMatchIds, updateAdminSettings]);

  const addMatch = useCallback(async (matchData: Omit<Match, 'id'>) => {
    const newMatch: Match = { ...matchData, id: generateId() };
    setMatches(prev => processMatchArrays([newMatch, ...prev])); // Optimistic update
    
    const { isFeatured, ...matchToInsert } = newMatch;
    
    const matchToInsertDb: Database['public']['Tables']['matches']['Insert'] = {
        ...matchToInsert,
        streamLinks: matchToInsert.streamLinks as Json,
        team1: matchToInsert.team1 as Json,
        team2: matchToInsert.team2 as Json,
    };

    const { error } = await supabase.from('matches').insert([matchToInsertDb]);
    if (error) {
        console.error("Error adding match:", error);
        setError(`Failed to add match: ${error.message}`);
        setMatches(prev => prev.filter(m => m.id !== newMatch.id)); // Revert
    } else if (newMatch.isFeatured) {
        await toggleFeaturedMatch(newMatch.id);
    }
  }, [processMatchArrays, toggleFeaturedMatch]);

  const updateMatch = useCallback(async (updatedMatch: Match) => {
    const originalMatches = matches;
    setMatches(prev => processMatchArrays(prev.map(m => m.id === updatedMatch.id ? updatedMatch : m))); // Optimistic update
    
    // isFeatured is not a db column, so we should not try to update it.
    const { isFeatured, ...matchToUpdate } = updatedMatch;
    
    const matchToUpdateDb: Database['public']['Tables']['matches']['Update'] = {
        ...matchToUpdate,
        streamLinks: matchToUpdate.streamLinks as Json,
        team1: matchToUpdate.team1 as Json,
        team2: matchToUpdate.team2 as Json,
    };

    const { error } = await supabase.from('matches').update(matchToUpdateDb).eq('id', updatedMatch.id);
    if (error) {
        console.error("Error updating match:", error);
        setError(`Failed to update match: ${error.message}`);
        setMatches(originalMatches); // Revert
    } else {
        const isNowFeatured = !!updatedMatch.isFeatured;
        const wasFeatured = featuredMatchIds.includes(updatedMatch.id);
        if (isNowFeatured !== wasFeatured) {
            await toggleFeaturedMatch(updatedMatch.id);
        }
    }
  }, [matches, processMatchArrays, featuredMatchIds, toggleFeaturedMatch]);

  const deleteMatch = async (matchId: string) => {
    const originalMatches = matches;
    const matchToDelete = originalMatches.find(m => m.id === matchId);
    if (!matchToDelete) return;

    setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId)); // Optimistic

    // If the match came from a source, add it to the deleted list to prevent re-import
    if (matchToDelete.sourceMatchId && matchToDelete.sourceUrl) {
      // Use upsert to handle cases where it might already be marked as deleted.
      const deletedEntry: Database['public']['Tables']['deleted_matches']['Insert'] = {
        sourceMatchId: matchToDelete.sourceMatchId,
        sourceUrl: matchToDelete.sourceUrl,
        deleted_at: new Date().toISOString()
      };
      await supabase.from('deleted_matches').upsert([deletedEntry]).select();
    }
    
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) {
        console.error("Error deleting match:", error);
        setError(`Failed to delete match: ${error.message}`);
        setMatches(originalMatches); // Revert optimistic UI update
        // We don't revert the deleted_matches insert as it's a safe-guard.
    } else {
       await updateAdminSettings({ featuredMatchIds: featuredMatchIds.filter(id => id !== matchId) });
    }
  };
  
  const bulkDeleteMatches = async (matchIdsToDelete: string[]) => {
    const originalMatches = matches;
    const matchesToDelete = originalMatches.filter(m => matchIdsToDelete.includes(m.id));
    if (matchesToDelete.length === 0) return;

    setMatches(prevMatches => prevMatches.filter(m => !matchIdsToDelete.includes(m.id))); // Optimistic

    const deletedSourceEntries: Database['public']['Tables']['deleted_matches']['Insert'][] = matchesToDelete
      .filter(m => m.sourceMatchId && m.sourceUrl)
      .map(m => ({
        sourceMatchId: m.sourceMatchId!,
        sourceUrl: m.sourceUrl!,
        deleted_at: new Date().toISOString(),
      }));

    if (deletedSourceEntries.length > 0) {
      await supabase.from('deleted_matches').upsert(deletedSourceEntries).select();
    }
    
    const { error } = await supabase.from('matches').delete().in('id', matchIdsToDelete);
    if (error) {
        console.error("Error bulk deleting matches:", error);
        setError(`Failed to bulk delete matches: ${error.message}`);
        setMatches(originalMatches); // Revert
    } else {
        await updateAdminSettings({ featuredMatchIds: featuredMatchIds.filter(id => !matchIdsToDelete.includes(id)) });
    }
  };

  const bulkUpdateMatchStatus = async (matchIdsToUpdate: string[], status: MatchStatus) => {
    const originalMatches = matches;
    setMatches(prev => processMatchArrays(prev.map(m => matchIdsToUpdate.includes(m.id) ? { ...m, status } : m)));
    const { error } = await supabase.from('matches').update({ status: status }).in('id', matchIdsToUpdate);
    if (error) {
      console.error("Error bulk updating status:", error);
      setError(`Failed to bulk update status: ${error.message}`);
      setMatches(originalMatches); // Revert
    }
  };

  const bulkClearStreamLinks = async (matchIdsToClear: string[]) => {
    const originalMatches = matches;
    setMatches(prev => processMatchArrays(prev.map(m => matchIdsToClear.includes(m.id) ? { ...m, streamLinks: [] } : m)));
    const { error } = await supabase.from('matches').update({ streamLinks: [] }).in('id', matchIdsToClear);
    if (error) {
      console.error("Error bulk clearing streams:", error);
      setError(`Failed to clear streams: ${error.message}`);
      setMatches(originalMatches); // Revert
    }
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
  
  const fetchMatchesFromSource = useCallback(async (source: JsonSource) => {
    setLoadingSources(prev => ({ ...prev, [source.id]: true }));
    setError(null);
    try {
        const {data: existingMatches} = await supabase.from('matches').select('sourceMatchId').eq('sourceUrl', source.url);
        const existingMatchIds = new Set(existingMatches?.map(m => m.sourceMatchId) || []);

        const { data: deletedMatches } = await supabase.from('deleted_matches').select('sourceMatchId').eq('sourceUrl', source.url);
        const deletedMatchIds = new Set(deletedMatches?.map(m => m.sourceMatchId) || []);

        const response = await fetch(source.url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const rawData: RawMatchData = await response.json();
        
        let parsedRawMatches = parseMatchesFromJson(rawData, source.url);
        
        const newMatches = parsedRawMatches.filter(m => 
            m.sourceMatchId &&
            !existingMatchIds.has(m.sourceMatchId) &&
            !deletedMatchIds.has(m.sourceMatchId)
        );

        if (newMatches.length > 0) {
            const matchesToInsert = newMatches.map(({ isFeatured, ...rest }) => rest);
            const matchesToInsertDb: Database['public']['Tables']['matches']['Insert'][] = matchesToInsert.map(m => ({
                ...m,
                streamLinks: m.streamLinks as Json,
                team1: m.team1 as Json,
                team2: m.team2 as Json,
            }));
            const { error: insertError } = await supabase.from('matches').insert(matchesToInsertDb);
            if (insertError) throw insertError;
            setMatches(prev => processMatchArrays([...prev, ...newMatches]));
        }

        await setJsonSources(prevSources => prevSources.map(s => s.id === source.id ? {...s, lastImported: new Date().toISOString()} : s));
    } catch (err: any) {
      console.error(`Error fetching from ${source.name}:`, err);
      setError(`Error from ${source.name}: ${err.message}`);
    } finally {
      setLoadingSources(prev => ({ ...prev, [source.id]: false }));
    }
  }, [setJsonSources, processMatchArrays]); 
  
  const fetchAllMatchesFromSources = useCallback(async (overwrite: boolean = false) => {
    setGlobalLoading(true);
    setError(null);
    let addedCount = 0;
    let skippedCount = 0;

    if(overwrite) {
        const sourceUrls = jsonSources.map(s => s.url);
        const { error: deleteError } = await supabase.from('matches').delete().in('sourceUrl', sourceUrls);
        if(deleteError) {
             setGlobalLoading(false);
             return { added: 0, skipped: 0, error: `Failed to clear old matches: ${deleteError.message}` };
        }
        setMatches(prev => prev.filter(m => !m.sourceUrl || !sourceUrls.includes(m.sourceUrl)));
    }
    
    const { data: existingMatchesData } = await supabase.from('matches').select('sourceMatchId, sourceUrl');
    const existingSourceMatches = new Set(existingMatchesData?.map(m => `${m.sourceUrl}::${m.sourceMatchId}`) || []);

    const { data: deletedMatchesData } = await supabase.from('deleted_matches').select('sourceMatchId, sourceUrl');
    const deletedSourceMatches = new Set(deletedMatchesData?.map(m => `${m.sourceUrl}::${m.sourceMatchId}`) || []);

    for (const source of jsonSources) {
        try {
            const response = await fetch(source.url);
            if (!response.ok) continue; // Skip failed sources
            const rawData: RawMatchData = await response.json();
            const parsed = parseMatchesFromJson(rawData, source.url);
            const matchesToAdd = parsed.filter(m => 
                m.sourceMatchId &&
                !existingSourceMatches.has(`${m.sourceUrl}::${m.sourceMatchId}`) &&
                !deletedSourceMatches.has(`${m.sourceUrl}::${m.sourceMatchId}`)
            );
            
            if (matchesToAdd.length > 0) {
                const dbMatches = matchesToAdd.map(({isFeatured, ...rest}) => rest);
                const dbMatchesToInsert: Database['public']['Tables']['matches']['Insert'][] = dbMatches.map(m => ({
                    ...m,
                    streamLinks: m.streamLinks as Json,
                    team1: m.team1 as Json,
                    team2: m.team2 as Json,
                }));
                const { error: insertError } = await supabase.from('matches').insert(dbMatchesToInsert);
                if (!insertError) {
                    addedCount += matchesToAdd.length;
                    setMatches(prev => processMatchArrays([...prev, ...matchesToAdd]));
                    matchesToAdd.forEach(m => existingSourceMatches.add(`${m.sourceUrl}::${m.sourceMatchId}`));
                }
            }
            skippedCount += parsed.length - matchesToAdd.length;
            await setJsonSources(prevSources => prevSources.map(s => s.id === source.id ? {...s, lastImported: new Date().toISOString()} : s));
        } catch(e) { /* ignore single source error */ }
    }
    
    setGlobalLoading(false);
    return { added: addedCount, skipped: skippedCount };
  }, [jsonSources, processMatchArrays, setJsonSources]);

  // Ad Management Functions
  const getAdSlot = useCallback((locationKey: AdLocationKey): AdSlot | undefined => {
    return adSlots.find(slot => slot.locationKey === locationKey && slot.isEnabled);
  }, [adSlots]);

  const addOrUpdateAdSlot = useCallback(async (adSlot: AdSlot) => {
    const newAdSlots = [...adSlots];
    const existingIndex = newAdSlots.findIndex(s => s.id === adSlot.id || s.locationKey === adSlot.locationKey);
    if(existingIndex > -1) {
        newAdSlots[existingIndex] = { ...adSlot, id: newAdSlots[existingIndex].id }; // ensure ID is preserved
    } else {
        newAdSlots.push({ ...adSlot, id: adSlot.id || generateId() });
    }
    await updateAdminSettings({ adSlots: newAdSlots });
  }, [adSlots, updateAdminSettings]);
  
  const deleteAdSlot = useCallback(async (adSlotId: string) => {
    const newAdSlots = adSlots.map(slot => 
        slot.id === adSlotId 
        ? { ...slot, adCode: '', isEnabled: false, name: `Unconfigured (${slot.locationKey})`, lastUpdated: new Date().toISOString() } 
        : slot
    );
    await updateAdminSettings({ adSlots: newAdSlots });
  }, [adSlots, updateAdminSettings]);

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
              addAppNotification(`Match Starting Soon: ${match.team1.name} vs ${match.team2.name} in ~${Math.round(diffMinutes)} mins!`, 'info', matchId, 'starting_soon');
              notifiedStartingSoonRef.current.add(matchId);
            }
          }

          if (match.status === MatchStatus.LIVE && !notifiedLiveRef.current.has(matchId)) {
            addAppNotification(`Match LIVE: ${match.team1.name} vs ${match.team2.name} has started!`, 'success', matchId, 'match_live');
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

  // Effect to ensure matches have correct isFeatured flag when featuredMatchIds changes from settings
  useEffect(() => {
    setMatches(prev => processMatchArrays(prev));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSettings.featuredMatchIds]); 

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
      // TeamContext specific values
      managedTeams: adminSettings.managedTeams,
      addOrUpdateManagedTeam,
      deleteManagedTeam,
      getManagedTeamLogo,
      allDiscoveredTeamNames,
      // Ad Management
      getAdSlot,
      addOrUpdateAdSlot,
      deleteAdSlot,
      // Featured Matches
      toggleFeaturedMatch,
      // Match Subscriptions & Notifications
      subscribedMatchIds,
      toggleMatchSubscription,
      isMatchSubscribed,
      activeAppNotifications,
      dismissAppNotification,
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
