import React from 'react';
import { Link } from 'react-router-dom';
import { Match, MatchStatus } from '../../types';
import { formatDate } from '../../utils/helpers';
import { PlayCircleIcon } from '../icons';
import CountdownTimer from '../common/CountdownTimer'; // Import CountdownTimer

interface MatchCardProps {
  match: Match;
}

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.LIVE: return 'bg-red-600 text-white';
      case MatchStatus.UPCOMING: return 'bg-yellow-500 text-gray-900';
      case MatchStatus.FINISHED: return 'bg-green-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const hasStreams = match.streamLinks && match.streamLinks.length > 0;
  const isUpcomingAndFuture = match.status === MatchStatus.UPCOMING && new Date(match.date) > new Date();


  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-[var(--theme-accent)]/30 hover:scale-[1.02]">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-accent)]">{match.leagueName}</span>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(match.status)}`}>
            {match.status}
          </span>
        </div>

        <div className="text-center my-6">
          <div className="flex items-center justify-around">
            <div className="text-center w-2/5">
              {match.team1.logoUrl && <img src={match.team1.logoUrl} alt={match.team1.name} className="h-12 w-12 mx-auto mb-2 object-contain" onError={(e) => e.currentTarget.style.display = 'none'}/>}
              <h3 className="text-lg font-semibold text-neutral-text truncate" title={match.team1.name}>{match.team1.name}</h3>
            </div>
            <div className="text-3xl font-bold text-gray-400 w-1/5">
              {match.status !== MatchStatus.UPCOMING ? `${match.score1 ?? '-'} : ${match.score2 ?? '-'}` : 'vs'}
            </div>
            <div className="text-center w-2/5">
              {match.team2.logoUrl && <img src={match.team2.logoUrl} alt={match.team2.name} className="h-12 w-12 mx-auto mb-2 object-contain" onError={(e) => e.currentTarget.style.display = 'none'}/>}
              <h3 className="text-lg font-semibold text-neutral-text truncate" title={match.team2.name}>{match.team2.name}</h3>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-400 text-center mb-1">
          {formatDate(match.date, true)} {match.time ? `(${match.time})` : ''}
        </p>

        {isUpcomingAndFuture && (
          <CountdownTimer targetDate={match.date} className="my-3" />
        )}
        
        {match.round && <p className="text-xs text-gray-500 text-center mb-1">Round: {match.round}</p>}
        {match.group && <p className="text-xs text-gray-500 text-center mb-1">Group: {match.group}</p>}

        <Link
          to={`/match/${match.id}`}
          className={`w-full flex items-center justify-center mt-4 px-4 py-2.5 text-neutral-dark font-semibold rounded-lg hover:opacity-90 transition-colors duration-200 ${hasStreams ? 'bg-[var(--theme-accent)]' : 'bg-gray-600'}`}
          // For non-streamable matches, it's still a link to details
          // aria-disabled={!hasStreams} 
          // onClick={(e) => { if (!hasStreams) e.preventDefault(); }} 
        >
          <PlayCircleIcon className="h-5 w-5 mr-2" />
          {hasStreams ? 'Match Details & Stream' : 'Match Details'}
        </Link>
      </div>
    </div>
  );
};

export default MatchCard;