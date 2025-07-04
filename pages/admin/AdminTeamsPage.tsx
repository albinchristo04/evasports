import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../../AppContext';
import { ManagedTeam } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { TrashIcon, PencilIcon, CheckCircleIcon, PlusCircleIcon, PhotoIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, ArrowPathIcon } from '../../components/icons';
import { normalizeNameForKey, guessLogoUrl, searchTeamLogoOnline } from '../../utils/logoService'; 
import { formatDate } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner'; 

const AdminTeamsPage: React.FC = () => {
  const { 
    managedTeams, 
    addOrUpdateManagedTeam, 
    deleteManagedTeam, 
    allDiscoveredTeamNames 
  } = useAppContext();

  const [editingTeam, setEditingTeam] = useState<ManagedTeam | null>(null);
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmanaged, setShowOnlyUnmanaged] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingLogoFor, setIsSearchingLogoFor] = useState<string | null>(null);
  const [isBulkSearchingLogos, setIsBulkSearchingLogos] = useState(false);
  const [bulkSearchProgress, setBulkSearchProgress] = useState(0);
  const [bulkSearchTotal, setBulkSearchTotal] = useState(0);


  const displayFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(''), type === 'success' ? 3000 : 5000);
  };
  
  const handleEdit = (team: ManagedTeam) => {
    setEditingTeam(team);
    setNewLogoUrl(team.logoUrl);
  };

  const handleSave = async () => {
    if (editingTeam) {
      setIsSaving(true);
      await addOrUpdateManagedTeam({ 
        ...editingTeam, 
        logoUrl: newLogoUrl,
        lastUpdated: new Date().toISOString()
      });
      setIsSaving(false);
      displayFeedback(`Logo for ${editingTeam.displayName} updated.`);
      setEditingTeam(null);
      setNewLogoUrl('');
    }
  };
  
  const handleDeleteManagedEntry = async (teamNameKey: string) => {
    if (window.confirm('Are you sure you want to remove this managed team entry? This will not affect existing matches but may affect future imports if the logo was auto-guessed.')) {
      await deleteManagedTeam(teamNameKey);
      displayFeedback(`Managed entry for ${teamNameKey} deleted.`);
    }
  };

  const handleTriggerOnlineSearch = useCallback(async (team: { name: string, league: string, nameKey: string }) => {
    setIsSearchingLogoFor(team.nameKey);
    try {
      const foundUrl = await searchTeamLogoOnline(team.name, team.league);
      if (foundUrl) {
        const existingManaged = managedTeams.find(mt => mt.nameKey === team.nameKey);
        const entryToUpdate: ManagedTeam = existingManaged ? 
            { ...existingManaged, logoUrl: foundUrl, lastUpdated: new Date().toISOString() } : 
            {
                nameKey: team.nameKey,
                displayName: team.name,
                logoUrl: foundUrl,
                leagueContext: team.league,
                lastUpdated: new Date().toISOString()
            };
        
        await addOrUpdateManagedTeam(entryToUpdate);
        displayFeedback(`Logo found and updated for ${team.name}!`);
        
        if (editingTeam?.nameKey === team.nameKey) {
            setNewLogoUrl(foundUrl); 
        }

      } else {
        displayFeedback(`No logo found online for ${team.name}. Please set manually if known.`, 'error');
      }
    } catch (error) {
      console.error("Error searching for logo:", error);
      displayFeedback(`Error searching for logo for ${team.name}.`, 'error');
    } finally {
      setIsSearchingLogoFor(null);
    }
  }, [addOrUpdateManagedTeam, editingTeam, managedTeams]);


  const handleManageDiscoveredTeam = (discoveredTeam: { name: string, league: string }) => {
    const nameKey = normalizeNameForKey(discoveredTeam.name);
    const existingManaged = managedTeams.find(mt => mt.nameKey === nameKey);
    if (existingManaged) {
        handleEdit(existingManaged);
    } else {
        const guessed = guessLogoUrl(discoveredTeam.name, discoveredTeam.league);
        const newManagedEntry: ManagedTeam = {
            nameKey,
            displayName: discoveredTeam.name,
            logoUrl: guessed || '', 
            leagueContext: discoveredTeam.league,
            lastUpdated: new Date().toISOString()
        };
        // Add first, then open for editing.
        addOrUpdateManagedTeam(newManagedEntry); 
        handleEdit(newManagedEntry); 
        displayFeedback(`New entry for ${discoveredTeam.name} created. You can search online or set logo manually.`);
    }
  };

  const filteredAndSortedTeams = useMemo(() => {
    const teamsMap = new Map<string, { 
        type: 'managed' | 'discovered', 
        data: ManagedTeam | {name: string, league: string}, 
        nameKey: string, 
        displayName: string, 
        leagueContext?: string, 
        logoUrl?: string 
    }>();

    // Add all discovered teams, mark if already managed
    allDiscoveredTeamNames.forEach(dt => {
        const nameKey = normalizeNameForKey(dt.name);
        const managedEntry = managedTeams.find(mt => mt.nameKey === nameKey);
        if (managedEntry) {
            if (!teamsMap.has(nameKey)) {
                 teamsMap.set(nameKey, {type: 'managed', data: managedEntry, nameKey, displayName: managedEntry.displayName, leagueContext: managedEntry.leagueContext, logoUrl: managedEntry.logoUrl });
            }
        } else {
             if (!teamsMap.has(nameKey)) {
                teamsMap.set(nameKey, { type: 'discovered', data: dt, nameKey, displayName: dt.name, leagueContext: dt.league, logoUrl: guessLogoUrl(dt.name, dt.league) });
             }
        }
    });
    
    managedTeams.forEach(mt => {
        if (!teamsMap.has(mt.nameKey)) {
            teamsMap.set(mt.nameKey, {type: 'managed', data: mt, nameKey: mt.nameKey, displayName: mt.displayName, leagueContext: mt.leagueContext, logoUrl: mt.logoUrl });
        }
    });
    
    return Array.from(teamsMap.values())
        .filter(team => {
            const term = searchTerm.toLowerCase();
            const nameMatch = team.displayName.toLowerCase().includes(term);
            const leagueMatch = team.leagueContext?.toLowerCase().includes(term);
            const statusFilter = showOnlyUnmanaged ? team.type === 'discovered' || (team.type === 'managed' && !team.logoUrl) : true;
            return (nameMatch || !!leagueMatch || term === '') && statusFilter;
        })
        .sort((a,b) => a.displayName.localeCompare(b.displayName));

  }, [managedTeams, allDiscoveredTeamNames, searchTerm, showOnlyUnmanaged]);

  const handleFindAllMissingLogos = async () => {
    setIsBulkSearchingLogos(true);
    setBulkSearchProgress(0);
    
    const teamsToSearch = filteredAndSortedTeams.filter(
      team => team.type === 'discovered' || (team.type === 'managed' && !team.logoUrl)
    );
    setBulkSearchTotal(teamsToSearch.length);

    let foundCount = 0;
    for (let i = 0; i < teamsToSearch.length; i++) {
      const team = teamsToSearch[i];
      setBulkSearchProgress(i + 1);
      if (isSearchingLogoFor === team.nameKey) continue; 
      
      try {
        const foundUrl = await searchTeamLogoOnline(team.displayName, team.leagueContext);
        if (foundUrl) {
          foundCount++;
          const entryToUpdate: ManagedTeam = (team.type === 'managed') ? 
            { ...(team.data as ManagedTeam), logoUrl: foundUrl, lastUpdated: new Date().toISOString() } :
            {
              nameKey: team.nameKey,
              displayName: team.displayName,
              logoUrl: foundUrl,
              leagueContext: team.leagueContext,
              lastUpdated: new Date().toISOString()
            };
          await addOrUpdateManagedTeam(entryToUpdate);
        }
      } catch (error) {
        console.error(`Error bulk searching for ${team.displayName}:`, error);
      }
    }

    setIsBulkSearchingLogos(false);
    displayFeedback(`Bulk search complete. ${foundCount} new logos found/updated out of ${teamsToSearch.length} attempts.`);
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-4xl font-bold text-[var(--theme-accent)]">Manage Team Logos</h1>
        <Button 
            onClick={handleFindAllMissingLogos}
            isLoading={isBulkSearchingLogos}
            variant="secondary"
            disabled={isBulkSearchingLogos}
        >
            {isBulkSearchingLogos ? (
                <>
                    <Spinner size="sm" color="text-white"/> 
                    <span className="ml-2">Searching... ({bulkSearchProgress}/{bulkSearchTotal})</span>
                </>
            ) : (
                <>
                    <ArrowPathIcon className="h-5 w-5 mr-2"/>
                    Find All Missing/Unguessed Logos
                </>
            )}
        </Button>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <Input 
            label="Search Teams"
            placeholder="Enter team name or league..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center space-x-2 md:mt-7">
            <input 
              type="checkbox" 
              id="showOnlyUnmanaged"
              className="h-4 w-4 rounded border-gray-500 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] bg-gray-700"
              checked={showOnlyUnmanaged}
              onChange={(e) => setShowOnlyUnmanaged(e.target.checked)}
            />
            <label htmlFor="showOnlyUnmanaged" className="text-sm text-neutral-text">Show only teams needing logos / unverified</label>
          </div>
        </div>
      </div>

      {editingTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
                <h3 className="text-xl font-semibold text-accent">Edit Logo for: {editingTeam.displayName}</h3>
                {editingTeam.leagueContext && <p className="text-sm text-gray-400">League: {editingTeam.leagueContext}</p>}
                <img 
                    src={newLogoUrl || 'https://via.placeholder.com/96?text=No+Logo'} 
                    alt={`${editingTeam.displayName} logo`} 
                    className="h-24 w-24 object-contain mx-auto my-2 bg-gray-700 p-1 rounded" 
                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/96?text=Error'; e.currentTarget.classList.add('opacity-50');}}
                />
                <Input 
                    label="Logo URL" 
                    value={newLogoUrl} 
                    onChange={(e) => setNewLogoUrl(e.target.value)} 
                    placeholder="https://example.com/logo.png"
                />
                <div className="flex justify-between items-center">
                    <Button 
                        onClick={() => handleTriggerOnlineSearch({name: editingTeam.displayName, league: editingTeam.leagueContext || '', nameKey: editingTeam.nameKey})}
                        isLoading={isSearchingLogoFor === editingTeam.nameKey}
                        variant="ghost"
                        size="sm"
                    >
                        <MagnifyingGlassIcon className="h-4 w-4 mr-1.5"/> Search Online Again
                    </Button>
                    <div className="flex space-x-3">
                        <Button onClick={() => setEditingTeam(null)} variant="outline" disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSave} variant="primary" isLoading={isSaving}>Save Logo</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {feedbackMessage && (
        <div className={`fixed bottom-10 right-10 text-white px-6 py-3 rounded-lg shadow-xl animate-pulse flex items-center z-[101] ${feedbackMessage.toLowerCase().includes('error') || feedbackMessage.toLowerCase().includes('no logo found') ? 'bg-red-600' : 'bg-green-600'}`}>
          {feedbackMessage.toLowerCase().includes('error') || feedbackMessage.toLowerCase().includes('no logo found') ? <ExclamationTriangleIcon className="h-6 w-6 mr-2" /> : <CheckCircleIcon className="h-6 w-6 mr-2" />}
          {feedbackMessage}
        </div>
      )}

      <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-lg">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-750">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Logo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Team Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">League Context</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status / Last Updated</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {filteredAndSortedTeams.map((team) => (
              <tr key={team.nameKey + (team.leagueContext || '')} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.displayName} className="h-10 w-10 object-contain bg-gray-600 p-0.5 rounded" onError={(e) => { e.currentTarget.style.display = 'none'; const parent = e.currentTarget.parentElement; if(parent) parent.innerHTML += '<span class=\"text-red-400 text-xs\">Error</span>'; }}/>
                  ) : (
                    <div className="h-10 w-10 bg-gray-700 rounded flex items-center justify-center text-gray-500">
                        <PhotoIcon className="h-6 w-6"/>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text">{team.displayName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{team.leagueContext || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {team.type === 'managed' ? (
                        <>
                        {(team.data as ManagedTeam).logoUrl ? <span className="text-green-400">Managed</span> : <span className="text-yellow-400">Managed (No Logo)</span>}
                        <br/> <span className="text-xs">({formatDate((team.data as ManagedTeam).lastUpdated, false)})</span>
                        </>
                    ) : (
                        <span className="text-blue-400">Discovered (Needs Review)</span>
                    )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1 sm:space-x-2">
                  {team.type === 'managed' ? (
                    <>
                      <Button onClick={() => handleEdit(team.data as ManagedTeam)} size="sm" variant="outline" title="Edit Logo URL">
                        <PencilIcon className="h-4 w-4"/>
                      </Button>
                      <Button 
                        onClick={() => handleTriggerOnlineSearch({name: team.displayName, league: team.leagueContext || '', nameKey: team.nameKey})}
                        isLoading={isSearchingLogoFor === team.nameKey}
                        size="sm" variant="ghost" title="Search Online for Logo"
                        className={!team.logoUrl ? 'animate-pulse text-[var(--theme-accent)]' : ''}
                      >
                         {isSearchingLogoFor === team.nameKey ? <Spinner size="sm" /> : <MagnifyingGlassIcon className="h-4 w-4"/>}
                      </Button>
                      <Button onClick={() => handleDeleteManagedEntry(team.nameKey)} size="sm" variant="danger" title="Delete Managed Entry">
                        <TrashIcon className="h-4 w-4"/>
                      </Button>
                    </>
                  ) : ( // Discovered team
                    <>
                    <Button onClick={() => handleManageDiscoveredTeam(team.data as {name: string, league: string})} size="sm" variant="primary" title="Manage This Team">
                       <PlusCircleIcon className="h-4 w-4 mr-1"/> Manage
                    </Button>
                    <Button 
                        onClick={() => handleTriggerOnlineSearch({name: team.displayName, league: team.leagueContext || '', nameKey: team.nameKey})}
                        isLoading={isSearchingLogoFor === team.nameKey}
                        size="sm" variant="ghost" title="Search Online for Logo"
                        className="text-[var(--theme-accent)]"
                    >
                        {isSearchingLogoFor === team.nameKey ? <Spinner size="sm" /> : <MagnifyingGlassIcon className="h-4 w-4"/>}
                    </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
             {filteredAndSortedTeams.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">
                        No teams match your current filters or all discovered teams have been managed.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTeamsPage;