
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { JsonSource, PreviewMatch, RawMatchData, MatchStatus } from '../../types';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import { formatDate, parseMatchesFromJson } from '../../utils/helpers';
import { CloudArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../../components/icons';
import { supabase } from '../../utils/supabase';

const AdminImportInteractivePage: React.FC = () => {
  const { adminSettings, addMatch } = useAppContext();
  const { jsonSources } = adminSettings;

  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [startDateOffset, setStartDateOffset] = useState<string>('-1');
  const [endDateOffset, setEndDateOffset] = useState<string>('7');
  
  const [previewMatches, setPreviewMatches] = useState<PreviewMatch[]>([]);
  const [selectedPreviewMatchIds, setSelectedPreviewMatchIds] = useState<string[]>([]);
  
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isAddingMatches, setIsAddingMatches] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [addMatchesFeedback, setAddMatchesFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const sourceOptions = useMemo(() => 
    [{ value: '', label: 'Select a JSON Source...' }, ...jsonSources.map(s => ({ value: s.id, label: s.name }))]
  , [jsonSources]);

  const handleFetchPreview = async () => {
    if (!selectedSourceId) {
      setPreviewError("Please select a JSON source.");
      return;
    }
    const source = jsonSources.find(s => s.id === selectedSourceId);
    if (!source) {
      setPreviewError("Selected source not found.");
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewMatches([]);
    setSelectedPreviewMatchIds([]);
    setAddMatchesFeedback(null);

    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${source.name}: ${response.statusText}`);
      }
      const rawData: RawMatchData = await response.json();
      let parsedPotentialMatches = parseMatchesFromJson(rawData, source.url);
      
      const sourceMatchIdsToPreview = parsedPotentialMatches
        .map(m => m.sourceMatchId)
        .filter((id): id is string => !!id);
      
      const { data: existingMatchesInDb } = await supabase
        .from('matches')
        .select('sourceMatchId')
        .eq('sourceUrl', source.url)
        .in('sourceMatchId', sourceMatchIdsToPreview);
      const existingSourceMatchIds = new Set(existingMatchesInDb?.map(m => m.sourceMatchId) || []);

      const { data: deletedMatchesData } = await supabase
        .from('deleted_matches')
        .select('sourceMatchId')
        .eq('sourceUrl', source.url)
        .in('sourceMatchId', sourceMatchIdsToPreview);
      const deletedSourceMatchIds = new Set(deletedMatchesData?.map(m => m.sourceMatchId) || []);

      const startOffsetNum = parseInt(startDateOffset, 10);
      const endOffsetNum = parseInt(endDateOffset, 10);

      if (!isNaN(startOffsetNum) && !isNaN(endOffsetNum)) {
        const today = new Date();
        const filterStartDate = new Date(today);
        filterStartDate.setDate(today.getDate() + startOffsetNum);
        filterStartDate.setHours(0, 0, 0, 0);

        const filterEndDate = new Date(today);
        filterEndDate.setDate(today.getDate() + endOffsetNum);
        filterEndDate.setHours(23, 59, 59, 999);
        
        parsedPotentialMatches = parsedPotentialMatches.filter(match => {
          const matchDate = new Date(match.date);
          return matchDate >= filterStartDate && matchDate <= filterEndDate;
        });
      }

      const previewMatchesWithStatus = parsedPotentialMatches.map((m): PreviewMatch => ({
        ...m,
        isFeatured: false,
        isAlreadyImported: existingSourceMatchIds.has(m.sourceMatchId!),
        isPermanentlyDeleted: deletedSourceMatchIds.has(m.sourceMatchId!)
      }));

      setPreviewMatches(previewMatchesWithStatus.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (err: any) {
      setPreviewError(`Error fetching or parsing from ${source.name}: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  const handleToggleSelectPreviewMatch = (matchId: string) => {
    setSelectedPreviewMatchIds(prev =>
      prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]
    );
  };

  const handleToggleSelectAllPreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPreviewMatchIds(previewMatches.filter(m => !m.isAlreadyImported && !m.isPermanentlyDeleted).map(m => m.id));
    } else {
      setSelectedPreviewMatchIds([]);
    }
  };

  const handleAddSelectedMatches = async () => {
    if (selectedPreviewMatchIds.length === 0) {
      setAddMatchesFeedback({ message: "No matches selected to add.", type: 'error' });
      return;
    }
    setIsAddingMatches(true);
    setAddMatchesFeedback(null);

    let addedCount = 0;
    let skippedCount = 0;

    const matchesToAdd = previewMatches.filter(pm => selectedPreviewMatchIds.includes(pm.id));

    for(const matchFromPreview of matchesToAdd) {
        if (!matchFromPreview.isAlreadyImported && !matchFromPreview.isPermanentlyDeleted) {
            const { id, isAlreadyImported, isPermanentlyDeleted, ...matchDataToAdd } = matchFromPreview;
            await addMatch(matchDataToAdd);
            addedCount++;
        } else {
            skippedCount++;
        }
    }
    
    setIsAddingMatches(false);
    setSelectedPreviewMatchIds([]);
    handleFetchPreview(); // Refresh preview to show new status
    setAddMatchesFeedback({ 
        message: `Added ${addedCount} new match(es). Skipped ${skippedCount} that were already imported or previously deleted.`, 
        type: 'success' 
    });
  };
  
  const isAllPreviewSelected = previewMatches.filter(m => !m.isAlreadyImported && !m.isPermanentlyDeleted).length > 0 && selectedPreviewMatchIds.length === previewMatches.filter(m => !m.isAlreadyImported && !m.isPermanentlyDeleted).length;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-[var(--theme-accent)] flex items-center">
        <CloudArrowDownIcon className="h-10 w-10 mr-3" />
        Interactive Match Import
      </h1>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Import Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label="Select League (JSON Source)"
            options={sourceOptions}
            value={selectedSourceId}
            onChange={(e) => {
              setSelectedSourceId(e.target.value);
              setPreviewMatches([]);
              setSelectedPreviewMatchIds([]);
              setPreviewError(null);
              setAddMatchesFeedback(null);
            }}
            className="bg-gray-700 border-gray-600"
          />
          <Input
            label="Start Day Offset (from today)"
            type="number"
            value={startDateOffset}
            onChange={(e) => setStartDateOffset(e.target.value)}
            placeholder="-1"
          />
          <Input
            label="End Day Offset (from today)"
            type="number"
            value={endDateOffset}
            onChange={(e) => setEndDateOffset(e.target.value)}
            placeholder="7"
          />
        </div>
        <Button onClick={handleFetchPreview} isLoading={isLoadingPreview} disabled={!selectedSourceId} variant="primary">
          Fetch Match Preview
        </Button>
      </div>

      {previewError && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-md flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 mr-3"/> {previewError}
        </div>
      )}
      
      {addMatchesFeedback && (
        <div className={`p-4 rounded-md flex items-center ${addMatchesFeedback.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
          {addMatchesFeedback.type === 'success' ? <CheckCircleIcon className="h-6 w-6 mr-3"/> : <ExclamationTriangleIcon className="h-6 w-6 mr-3"/>}
          {addMatchesFeedback.message}
        </div>
      )}

      {isLoadingPreview && (
        <div className="flex justify-center items-center py-10">
          <Spinner size="lg" color="text-[var(--theme-accent)]" />
          <p className="ml-4 text-lg text-gray-400">Fetching preview...</p>
        </div>
      )}

      {!isLoadingPreview && previewMatches.length > 0 && (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-700 p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold text-gray-200">
                    Previewing Matches ({previewMatches.length})
                </h3>
                <Button 
                    onClick={handleAddSelectedMatches} 
                    isLoading={isAddingMatches}
                    disabled={selectedPreviewMatchIds.length === 0 || isAddingMatches}
                    variant="secondary"
                 >
                    Add Selected ({selectedPreviewMatchIds.length}) to Site
                </Button>
            </div>
            <div className="overflow-x-auto bg-gray-800 rounded-b-xl shadow-lg">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                <tr>
                    <th scope="col" className="px-4 py-3 text-left">
                    <input 
                        type="checkbox"
                        className="rounded border-gray-500 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] bg-gray-700"
                        checked={isAllPreviewSelected}
                        onChange={handleToggleSelectAllPreview}
                        aria-label="Select all new preview matches"
                    />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Match</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Import Status</th>
                </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                {previewMatches.map((match) => (
                    <tr 
                        key={match.id}
                        className={`transition-colors ${selectedPreviewMatchIds.includes(match.id) ? 'bg-gray-700' : 'hover:bg-gray-700/50'} ${match.isAlreadyImported || match.isPermanentlyDeleted ? 'opacity-50' : ''}`}
                    >
                    <td className="px-4 py-4 whitespace-nowrap">
                        <input 
                        type="checkbox"
                        className="rounded border-gray-500 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] bg-gray-700"
                        checked={selectedPreviewMatchIds.includes(match.id)}
                        onChange={() => handleToggleSelectPreviewMatch(match.id)}
                        aria-label={`Select match ${match.team1.name} vs ${match.team2.name}`}
                        disabled={match.isAlreadyImported || match.isPermanentlyDeleted}
                        />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(match.date, true)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text">
                        {match.team1.name} vs {match.team2.name}
                        <span className="block text-xs text-gray-400">{match.leagueName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        match.status === MatchStatus.LIVE ? 'bg-red-500 text-white' : 
                        match.status === MatchStatus.UPCOMING ? 'bg-yellow-400 text-gray-800' : 
                        match.status === MatchStatus.FINISHED ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                        }`}>
                        {match.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {match.isPermanentlyDeleted ? (
                            <span className="text-red-400 font-semibold">Previously Deleted</span>
                        ) : match.isAlreadyImported ? (
                            <span className="text-green-400 font-semibold">Already Imported</span>
                        ) : (
                            <span className="text-blue-400">Ready to Import</span>
                        )}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      )}
      {!isLoadingPreview && previewMatches.length === 0 && selectedSourceId && !previewError && (
        <div className="text-center py-10 text-gray-400">
          No matches found in the selected source for the specified date range, or all available matches have already been imported.
        </div>
      )}
    </div>
  );
};

export default AdminImportInteractivePage;
