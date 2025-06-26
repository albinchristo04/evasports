import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../AppContext';
import { Match, MatchStatus, BulkActionType } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select'; // Assuming Select component exists and is suitable
import { formatDate } from '../../utils/helpers';
import { PlusCircleIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, StarIcon, OutlineStarIcon } from '../../components/icons';
import Spinner from '../../components/common/Spinner';

const AdminMatchesPage: React.FC = () => {
  const { 
    matches, 
    deleteMatch, 
    globalLoading, 
    leagues,
    bulkDeleteMatches,
    bulkUpdateMatchStatus,
    bulkClearStreamLinks,
    toggleFeaturedMatch
  } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLeague, setFilterLeague] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [bulkActionStatus, setBulkActionStatus] = useState<MatchStatus | ''>('');


  const filteredMatches = useMemo(() => {
    return matches
      .filter(match => {
        const term = searchTerm.toLowerCase();
        return (
          match.leagueName.toLowerCase().includes(term) ||
          match.team1.name.toLowerCase().includes(term) ||
          match.team2.name.toLowerCase().includes(term) ||
          match.id.toLowerCase().includes(term) ||
          (match.round && match.round.toLowerCase().includes(term)) ||
          (match.group && match.group.toLowerCase().includes(term))
        );
      })
      .filter(match => filterLeague ? match.leagueName === filterLeague : true)
      .filter(match => filterStatus ? match.status === filterStatus : true)
      // Featured matches first, then by date
      .sort((a,b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [matches, searchTerm, filterLeague, filterStatus]);

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchIds(prev => 
      prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]
    );
  };

  const handleSelectAllMatches = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMatchIds(filteredMatches.map(m => m.id));
    } else {
      setSelectedMatchIds([]);
    }
  };
  
  const isAllSelected = filteredMatches.length > 0 && selectedMatchIds.length === filteredMatches.length;

  const handleDelete = (matchId: string) => {
    if (window.confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      deleteMatch(matchId);
    }
  };

  const handleBulkAction = (actionType: BulkActionType) => {
    if (selectedMatchIds.length === 0) {
      alert("Please select at least one match.");
      return;
    }

    switch(actionType) {
      case BulkActionType.DELETE:
        if (window.confirm(`Are you sure you want to delete ${selectedMatchIds.length} selected match(es)? This action cannot be undone.`)) {
          bulkDeleteMatches(selectedMatchIds);
          setSelectedMatchIds([]);
        }
        break;
      case BulkActionType.UPDATE_STATUS:
        if (!bulkActionStatus) {
          alert("Please select a status to update to.");
          return;
        }
        if (window.confirm(`Are you sure you want to update the status of ${selectedMatchIds.length} selected match(es) to "${bulkActionStatus}"?`)) {
          bulkUpdateMatchStatus(selectedMatchIds, bulkActionStatus);
          setSelectedMatchIds([]);
          setBulkActionStatus('');
        }
        break;
      case BulkActionType.CLEAR_STREAMS:
        if (window.confirm(`Are you sure you want to clear all stream links for ${selectedMatchIds.length} selected match(es)?`)) {
          bulkClearStreamLinks(selectedMatchIds);
          setSelectedMatchIds([]);
        }
        break;
      default:
        console.warn("Unknown bulk action type");
    }
  };


  const leagueOptions = [{ value: '', label: 'All Leagues' }, ...leagues.map(l => ({ value: l, label: l }))];
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.values(MatchStatus).map(s => ({ value: s, label: s }))
  ];
  const bulkStatusOptions = [
    { value: '', label: 'Select Status...' },
    ...Object.values(MatchStatus).map(s => ({ value: s, label: s }))
  ];


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-4xl font-bold text-[var(--theme-accent)]">Manage Matches</h1>
        <Link to="new">
          <Button variant="primary">
            <PlusCircleIcon className="h-5 w-5 mr-2" /> Add New Match
          </Button>
        </Link>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            placeholder="Search (league, team, ID, round, group)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            options={leagueOptions}
            value={filterLeague}
            onChange={(e) => setFilterLeague(e.target.value)}
            className="block w-full px-4 py-2.5 rounded-md bg-neutral-dark border border-gray-600 focus:border-[var(--theme-accent)] focus:ring-[var(--theme-accent)] focus:outline-none placeholder-gray-500 text-neutral-text transition duration-150 ease-in-out"
            placeholder="All Leagues"
          />
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full px-4 py-2.5 rounded-md bg-neutral-dark border border-gray-600 focus:border-[var(--theme-accent)] focus:ring-[var(--theme-accent)] focus:outline-none placeholder-gray-500 text-neutral-text transition duration-150 ease-in-out"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {selectedMatchIds.length > 0 && (
        <div className="bg-gray-700 p-4 rounded-lg shadow-md space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-center md:justify-between gap-4">
          <p className="text-sm text-neutral-text font-medium">{selectedMatchIds.length} match(es) selected.</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="danger" size="sm" onClick={() => handleBulkAction(BulkActionType.DELETE)}>
              <TrashIcon className="h-4 w-4 mr-1.5"/> Delete Selected
            </Button>
            <div className="flex gap-2 items-center">
              <Select 
                options={bulkStatusOptions}
                value={bulkActionStatus}
                onChange={(e) => setBulkActionStatus(e.target.value as MatchStatus | '')}
                className="bg-neutral-dark border-gray-600 text-sm py-1.5"
              />
              <Button variant="secondary" size="sm" onClick={() => handleBulkAction(BulkActionType.UPDATE_STATUS)} disabled={!bulkActionStatus}>
                <CheckCircleIcon className="h-4 w-4 mr-1.5"/> Update Status
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction(BulkActionType.CLEAR_STREAMS)}>
              <XCircleIcon className="h-4 w-4 mr-1.5"/> Clear Stream Links
            </Button>
          </div>
        </div>
      )}
      
      {globalLoading && filteredMatches.length === 0 ? <div className="text-center py-10"><Spinner size="lg" color="text-[var(--theme-accent)]"/></div> :
      filteredMatches.length === 0 ? <p className="text-center text-gray-400 py-10">No matches found with current filters.</p> : (
      <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-lg">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-750">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                <input 
                  type="checkbox"
                  className="rounded border-gray-500 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] bg-gray-700"
                  checked={isAllSelected}
                  onChange={handleSelectAllMatches}
                  aria-label="Select all matches"
                />
              </th>
              <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Featured</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">League</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Match</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Score</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Streams</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {filteredMatches.map((match: Match) => (
              <tr key={match.id} className={`transition-colors ${selectedMatchIds.includes(match.id) ? 'bg-gray-700' : 'hover:bg-gray-700/50'} ${match.isFeatured ? 'bg-gray-700/70' : ''}`}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <input 
                    type="checkbox"
                    className="rounded border-gray-500 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] bg-gray-700"
                    checked={selectedMatchIds.includes(match.id)}
                    onChange={() => handleSelectMatch(match.id)}
                    aria-label={`Select match ${match.team1.name} vs ${match.team2.name}`}
                  />
                </td>
                <td className="px-2 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => toggleFeaturedMatch(match.id)}
                    title={match.isFeatured ? "Unfeature Match" : "Feature Match"}
                    className={`p-1 rounded-full hover:bg-gray-600 transition-colors ${match.isFeatured ? 'text-yellow-400' : 'text-gray-500'}`}
                  >
                    {match.isFeatured ? <StarIcon className="h-5 w-5" /> : <OutlineStarIcon className="h-5 w-5" />}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(match.date, true)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{match.leagueName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text">
                  {match.team1.name} vs {match.team2.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {match.score1 !== null && match.score2 !== null ? `${match.score1} - ${match.score2}` : 'N/A'}
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {match.streamLinks && match.streamLinks.length > 0 ? `${match.streamLinks.length} link(s)` : 'No'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link to={`edit/${match.id}`} className="text-[var(--theme-accent)] hover:opacity-80" title="Edit Match">
                    <PencilIcon className="h-5 w-5 inline" />
                  </Link>
                  <button onClick={() => handleDelete(match.id)} className="text-red-500 hover:text-red-400" title="Delete Match">
                    <TrashIcon className="h-5 w-5 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default AdminMatchesPage;