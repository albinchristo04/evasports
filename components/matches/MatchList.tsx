
import React from 'react';
import { Match } from '../../types';
import MatchCard from './MatchCard';
import Spinner from '../common/Spinner';

interface MatchListProps {
  matches: Match[];
  loading?: boolean;
  error?: string | null;
}

const MatchList: React.FC<MatchListProps> = ({ matches, loading, error }) => {
  if (loading) {
    return <div className="flex justify-center items-center py-10"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-400 text-lg">Error: {error}</div>;
  }

  if (matches.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-lg">No matches found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
      {matches.map(match => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
};

export default MatchList;
    