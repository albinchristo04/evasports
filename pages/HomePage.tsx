import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import MatchList from '../components/matches/MatchList';
import Spinner from '../components/common/Spinner';
import Select from '../components/common/Select';
import { MatchStatus, AdLocationKey, Match } from '../types';
import AdDisplay from '../components/common/AdDisplay';
import { StarIcon } from '../components/icons';

const HomePage: React.FC = () => {
  const { matches, globalLoading, error, leagues } = useAppContext();
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const featuredMatches = useMemo(() => {
    return matches
      .filter(match => match.isFeatured)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Optional: sort featured matches
  }, [matches]);

  const regularMatches = useMemo(() => {
    return matches
      .filter(match => selectedLeague ? match.leagueName === selectedLeague : true)
      .filter(match => selectedStatus ? match.status === selectedStatus : true)
      .sort((a, b) => {
         // Sort featured matches to the top within the filtered list if they aren't separated
         if(a.isFeatured && !b.isFeatured) return -1;
         if(!a.isFeatured && b.isFeatured) return 1;
         return new Date(a.date).getTime() - new Date(b.date).getTime()
      });
  }, [matches, selectedLeague, selectedStatus]);

  const leagueOptions = [{ value: '', label: 'All Leagues' }, ...leagues.map(l => ({ value: l, label: l }))];
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.values(MatchStatus).map(s => ({ value: s, label: s }))
  ];

  if (globalLoading && matches.length === 0) {
    return (
        <div className="flex flex-col justify-center items-center py-20">
          <Spinner size="lg" color="text-[var(--theme-accent)]"/>
          <p className="mt-4 text-lg text-gray-400">Loading matches from database...</p>
        </div>
      )
  }

  return (
    <div className="space-y-8">
      {featuredMatches.length > 0 && (
        <div className="bg-gray-800/50 p-6 rounded-xl shadow-xl border border-[var(--theme-accent)]/50">
          <h2 className="text-2xl font-bold text-[var(--theme-accent)] mb-6 text-center flex items-center justify-center">
            <StarIcon className="h-7 w-7 mr-2 text-yellow-400" /> Featured Matches
          </h2>
          <MatchList matches={featuredMatches} />
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold text-[var(--theme-accent)] mb-6 text-center">
          {featuredMatches.length > 0 ? 'All Matches' : 'Live Scores & Upcoming Matches'}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            label="Filter by League"
            options={leagueOptions}
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="All Leagues"
          />
          <Select
            label="Filter by Status"
            options={statusOptions}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="All Statuses"
          />
        </div>
         {error && <p className="text-red-400 text-center mb-4">{error}</p>}
      </div>
      
      <AdDisplay locationKey={AdLocationKey.HOME_PAGE_BELOW_FILTERS} />

      {globalLoading && matches.length > 0 ? (
          <div className="flex justify-center items-center py-10"><Spinner size="md" /></div>
      ): (
        <MatchList matches={regularMatches} />
      )}
    </div>
  );
};

export default HomePage;