
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { Match, MatchStatus } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import { formatDate } from '../../utils/helpers';
import { parseTxtMatches } from '../../utils/txtParser';
import { CloudArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentArrowDownIcon } from '../../components/icons';

const AdminImportTxtPage: React.FC = () => {
  const { addMatch, matches: existingSiteMatches } = useAppContext();

  const [txtFileUrl, setTxtFileUrl] = useState<string>('');
  const [leagueName, setLeagueName] = useState<string>('');
  const [defaultYear, setDefaultYear] = useState<string>(new Date().getFullYear().toString());
  
  const [previewMatches, setPreviewMatches] = useState<Match[]>([]);
  const [selectedPreviewMatchIds, setSelectedPreviewMatchIds] = useState<string[]>([]);
  
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isAddingMatches, setIsAddingMatches] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [addMatchesFeedback, setAddMatchesFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const handleFetchPreview = async () => {
    if (!txtFileUrl) {
      setPreviewError("Please enter a TXT file URL.");
      return;
    }
    if (!leagueName) {
      setPreviewError("Please enter a League Name for these matches.");
      return;
    }
    const yearNum = parseInt(defaultYear, 10);
    if (isNaN(yearNum) || defaultYear.length !== 4) {
      setPreviewError("Please enter a valid 4-digit year.");
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewMatches([]);
    setSelectedPreviewMatchIds([]);
    setAddMatchesFeedback(null);

    try {
      const response = await fetch(txtFileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch TXT file: ${response.statusText}`);
      }
      const txtContent = await response.text();
      const parsed = parseTxtMatches(txtContent, leagueName, yearNum, txtFileUrl);
      
      setPreviewMatches(parsed.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (err: any) {
      setPreviewError(`Error fetching or parsing TXT file: ${err.message}`);
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
      setSelectedPreviewMatchIds(previewMatches.map(m => m.id));
    } else {
      setSelectedPreviewMatchIds([]);
    }
  };

  const handleAddSelectedMatches = () => {
    if (selectedPreviewMatchIds.length === 0) {
      setAddMatchesFeedback({ message: "No matches selected to add.", type: 'error' });
      return;
    }
    setIsAddingMatches(true);
    setAddMatchesFeedback(null);

    let addedCount = 0;
    let skippedCount = 0;

    const matchesToAdd = previewMatches.filter(pm => selectedPreviewMatchIds.includes(pm.id));

    matchesToAdd.forEach(matchFromPreview => {
      const isDuplicate = existingSiteMatches.some(
        (existingMatch) => existingMatch.sourceMatchId === matchFromPreview.sourceMatchId && 
                           existingMatch.sourceTxtUrl === matchFromPreview.sourceTxtUrl // Check based on TXT URL
      );

      if (!isDuplicate) {
        const { id, ...matchDataToAdd } = matchFromPreview;
        addMatch(matchDataToAdd);
        addedCount++;
      } else {
        skippedCount++;
      }
    });
    
    setIsAddingMatches(false);
    setSelectedPreviewMatchIds([]); 
    setPreviewMatches(prev => prev.filter(pm => !matchesToAdd.some(mta => mta.id === pm.id))); // Remove added matches from preview
    setAddMatchesFeedback({ 
        message: `Added ${addedCount} new match(es). Skipped ${skippedCount} duplicate(s).`, 
        type: 'success' 
    });
  };
  
  const isAllPreviewSelected = previewMatches.length > 0 && selectedPreviewMatchIds.length === previewMatches.length;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-[var(--theme-accent)] flex items-center">
        <DocumentArrowDownIcon className="h-10 w-10 mr-3" />
        Import Matches from TXT File URL
      </h1>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Import Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            label="TXT File URL"
            value={txtFileUrl}
            onChange={(e) => {
              setTxtFileUrl(e.target.value);
              setPreviewMatches([]);
              setSelectedPreviewMatchIds([]);
              setPreviewError(null);
              setAddMatchesFeedback(null);
            }}
            placeholder="https://example.com/matches.txt"
          />
          <Input
            label="League Name (for these matches)"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="e.g., Club World Cup"
          />
          <Input
            label="Default Year (YYYY)"
            type="number"
            value={defaultYear}
            onChange={(e) => setDefaultYear(e.target.value)}
            placeholder={new Date().getFullYear().toString()}
            maxLength={4}
          />
        </div>
        <Button 
            onClick={handleFetchPreview} 
            isLoading={isLoadingPreview} 
            disabled={!txtFileUrl || !leagueName || !defaultYear || defaultYear.length !== 4} 
            variant="primary"
        >
          Fetch & Preview Matches
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
                        aria-label="Select all preview matches"
                    />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Round</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Match</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                {previewMatches.map((match) => (
                    <tr 
                        key={match.id}
                        className={`transition-colors ${selectedPreviewMatchIds.includes(match.id) ? 'bg-gray-700' : 'hover:bg-gray-700/50'}`}
                    >
                    <td className="px-4 py-4 whitespace-nowrap">
                        <input 
                        type="checkbox"
                        className="rounded border-gray-500 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] bg-gray-700"
                        checked={selectedPreviewMatchIds.includes(match.id)}
                        onChange={() => handleToggleSelectPreviewMatch(match.id)}
                        aria-label={`Select match ${match.team1.name} vs ${match.team2.name}`}
                        />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(match.date, false)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{match.time || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{match.round || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text">
                        {match.team1.name} vs {match.team2.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        match.status === MatchStatus.UPCOMING ? 'bg-yellow-400 text-gray-800' : 'bg-gray-500 text-white'
                        }`}>
                        {match.status}
                        </span>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      )}
      {!isLoadingPreview && previewMatches.length === 0 && txtFileUrl && leagueName && defaultYear.length === 4 && !previewError && (
        <div className="text-center py-10 text-gray-400">
          No matches found in the TXT file with the current configuration, or the file is empty/malformed.
        </div>
      )}
    </div>
  );
};

export default AdminImportTxtPage;
