
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { Match, MatchStatus, StreamLink, AdLocationKey } from '../types';
import Spinner from '../components/common/Spinner';
import VideoPlayer from '../components/matches/VideoPlayer';
import { formatDate } from '../utils/helpers';
import { PlayCircleIcon, HeartIcon, OutlineHeartIcon, TelegramIcon, WhatsAppIcon, FacebookIcon, TwitterIcon, EyeIcon } from '../components/icons';
import Button from '../components/common/Button';
import AdDisplay from '../components/common/AdDisplay';
import { generateMatchPath } from '../utils/slugify'; // For canonical URL and share

const MatchDetailPage: React.FC = () => {
  const { leagueSlug, teamsSlug, matchId } = useParams<{ leagueSlug: string; teamsSlug: string; matchId: string }>();
  const location = useLocation(); 

  const { 
    getMatchById, 
    adminSettings,
    toggleMatchSubscription,
    isMatchSubscribed,
    incrementMatchViewCount // Added
  } = useAppContext();
  
  const [match, setMatch] = useState<Match | null | undefined>(null);
  const [selectedStream, setSelectedStream] = useState<StreamLink | null>(null);
  
  useEffect(() => {
    if (matchId) {
      const currentMatchData = getMatchById(matchId); 
      setMatch(currentMatchData);

      if (currentMatchData) {
        incrementMatchViewCount(matchId); // Increment view count
      }

      if (currentMatchData && currentMatchData.streamLinks && currentMatchData.streamLinks.length > 0) {
        const activeStream = currentMatchData.streamLinks.find(sl => sl.status === 'Active');
        setSelectedStream(activeStream || currentMatchData.streamLinks[0]);
      } else {
        setSelectedStream(null);
      }
    }
  }, [matchId, getMatchById, incrementMatchViewCount]); // Added incrementMatchViewCount

  useEffect(() => {
    if (match) {
      const pageTitle = `${match.team1.name} vs ${match.team2.name} - ${match.leagueName} | ${adminSettings.seoMetaTitleSuffix || adminSettings.siteName}`;
      document.title = pageTitle;

      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', `Watch details for ${match.team1.name} vs ${match.team2.name} in the ${match.leagueName}. Score: ${match.score1 ?? '-'}-${match.score2 ?? '-'}. Status: ${match.status}.`);
      
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if(!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', pageTitle);

      let ogDescription = document.querySelector('meta[property="og:description"]');
      if(!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
      }
      ogDescription.setAttribute('content', `Match details for ${match.team1.name} vs ${match.team2.name}. Score: ${match.score1 ?? '-'}-${match.score2 ?? '-'}.`);
      
      let ogImage = document.querySelector('meta[property="og:image"]');
      if(!ogImage){
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', adminSettings.seoOpenGraphImageUrl || (match.team1.logoUrl || match.team2.logoUrl || ''));

      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      const matchPath = generateMatchPath(match.leagueName, match.team1.name, match.team2.name, match.id);
      canonicalLink.setAttribute('href', `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.indexOf('#') + 1)}${matchPath}`);

    } else if (match === null && matchId) {
        document.title = `Match Not Found | ${adminSettings.seoMetaTitleSuffix || adminSettings.siteName}`;
    }
  }, [match, adminSettings, matchId, location.pathname]);

  const handleSocialShare = (platform: 'telegram' | 'whatsapp' | 'facebook' | 'twitter') => {
    if (!match || !matchId) return;

    const matchPath = generateMatchPath(match.leagueName, match.team1.name, match.team2.name, matchId);
    const baseHashPath = window.location.pathname.substring(0, window.location.pathname.indexOf('#') +1);
    const pageUrl = `${window.location.origin}${baseHashPath}${matchPath}`;

    const matchTitle = `${match.team1.name} vs ${match.team2.name} - ${match.leagueName} on ${adminSettings.siteName}`;
    const shareText = `Check out the match: ${match.team1.name} vs ${match.team2.name}! Score: ${match.score1 ?? '-'}-${match.score2 ?? '-'}. Details and stream on ${adminSettings.siteName}.`;
    
    let url = '';

    switch (platform) {
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + pageUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(matchTitle)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };


  if (match === undefined) { 
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (!match) { 
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-red-400 mb-4">Match Not Found</h2>
        <p className="text-gray-400">The match you are looking for does not exist or may have been removed.</p>
        <Link to="/" className="mt-6 inline-block px-6 py-2 bg-[var(--theme-accent)] text-neutral-dark font-semibold rounded-lg hover:opacity-90">
          Back to Home
        </Link>
      </div>
    );
  }

  const { team1, team2, score1, score2, status, date, time, leagueName, round, group, streamLinks, viewCount } = match;
  const subscribed = isMatchSubscribed(match.id);

  return (
    <div className="space-y-8">
      <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--theme-accent)] mb-2">{leagueName}</h1>
          {round && <p className="text-lg text-gray-400">Round: {round}</p>}
          {group && <p className="text-lg text-gray-400">Group: {group}</p>}
          <p className="text-md text-gray-500">{formatDate(date, true)} {time ? `(${time})` : ''}</p>
        </header>

        <div className="flex flex-col md:flex-row items-center justify-around mb-6 p-6 bg-gray-700 rounded-lg">
          <div className="flex flex-col items-center text-center md:w-2/5 mb-4 md:mb-0">
            {team1.logoUrl && <img src={team1.logoUrl} alt={team1.name} className="h-16 w-16 md:h-24 md:w-24 mx-auto mb-3 object-contain" onError={(e) => e.currentTarget.style.display = 'none'}/>}
            <h2 className="text-2xl md:text-3xl font-semibold text-neutral-text truncate" title={team1.name}>{team1.name}</h2>
          </div>
          <div className="text-4xl md:text-5xl font-bold text-gray-300 mx-4 my-2 md:my-0">
            {status !== MatchStatus.UPCOMING ? `${score1 ?? '-'} : ${score2 ?? '-'}` : <span className="text-3xl">VS</span>}
          </div>
          <div className="flex flex-col items-center text-center md:w-2/5">
            {team2.logoUrl && <img src={team2.logoUrl} alt={team2.name} className="h-16 w-16 md:h-24 md:w-24 mx-auto mb-3 object-contain" onError={(e) => e.currentTarget.style.display = 'none'}/>}
            <h2 className="text-2xl md:text-3xl font-semibold text-neutral-text truncate" title={team2.name}>{team2.name}</h2>
          </div>
        </div>
        
        <div className="text-center mb-6">
            <span className={`px-4 py-2 text-sm font-bold rounded-full ${
                status === MatchStatus.LIVE ? 'bg-red-600 text-white animate-pulse' : 
                status === MatchStatus.UPCOMING ? 'bg-yellow-500 text-gray-900' : 
                status === MatchStatus.FINISHED ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'
            }`}>
                Status: {status}
            </span>
        </div>

        <div className="flex items-center justify-center space-x-3 md:space-x-4 mb-8 text-neutral-text">
            {/* View Count Display */}
            <div className="flex items-center text-gray-400" title="Match Views">
              <EyeIcon className="h-5 w-5 mr-1.5" />
              <span>{viewCount || 0}</span>
            </div>

            <button 
                onClick={() => toggleMatchSubscription(match.id, `${match.team1.name} vs ${match.team2.name}`)}
                title={subscribed ? "Unsubscribe from notifications" : "Subscribe to notifications"}
                className={`p-2.5 rounded-full hover:bg-gray-700 transition-colors ${subscribed ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                aria-pressed={subscribed}
            >
                {subscribed ? <HeartIcon className="h-6 w-6"/> : <OutlineHeartIcon className="h-6 w-6"/>}
                <span className="sr-only">{subscribed ? "Unsubscribe" : "Subscribe"}</span>
            </button>

            <button 
                onClick={() => handleSocialShare('telegram')}
                title="Share on Telegram"
                className="p-2.5 rounded-full text-sky-400 hover:text-sky-300 hover:bg-gray-700 transition-colors"
                aria-label="Share on Telegram"
            >
                <TelegramIcon className="h-6 w-6"/>
            </button>
            <button 
                onClick={() => handleSocialShare('whatsapp')}
                title="Share on WhatsApp"
                className="p-2.5 rounded-full text-green-500 hover:text-green-400 hover:bg-gray-700 transition-colors"
                aria-label="Share on WhatsApp"
            >
                <WhatsAppIcon className="h-6 w-6"/>
            </button>
            <button 
                onClick={() => handleSocialShare('facebook')}
                title="Share on Facebook"
                className="p-2.5 rounded-full text-blue-600 hover:text-blue-500 hover:bg-gray-700 transition-colors"
                aria-label="Share on Facebook"
            >
                <FacebookIcon className="h-6 w-6"/>
            </button>
            <button 
                onClick={() => handleSocialShare('twitter')}
                title="Share on Twitter/X"
                className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                aria-label="Share on Twitter"
            >
                <TwitterIcon className="h-6 w-6"/>
            </button>
        </div>

        {streamLinks && streamLinks.length > 0 ? (
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-[var(--theme-accent)] mb-4 flex items-center">
              <PlayCircleIcon className="h-7 w-7 mr-2"/> Live Stream / Replay
            </h3>
            {selectedStream && (
                 <VideoPlayer streamUrl={selectedStream.url} streamType={selectedStream.type} />
            )}
           
            {streamLinks.length > 1 && (
              <div className="mt-4 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3">
                <p className="text-gray-300 mr-2 self-center text-sm">Watch options:</p>
                {streamLinks.map(link => (
                  <Button
                    key={link.id}
                    onClick={() => setSelectedStream(link)}
                    variant={selectedStream?.id === link.id ? 'primary' : 'outline'}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {link.qualityLabel} ({link.type.toUpperCase()})
                    {link.status !== 'Active' && link.status !== 'Unknown' && <span className="ml-1 text-xs opacity-80">({link.status})</span>}
                  </Button>
                ))}
              </div>
            )}
             {streamLinks.length === 1 && selectedStream && selectedStream.status !== 'Active' && selectedStream.status !== 'Unknown' && (
                <p className="text-sm text-yellow-400 mt-2 text-center">Note: Stream status is '{selectedStream.status}'.</p>
            )}
             <AdDisplay locationKey={AdLocationKey.MATCH_DETAIL_BELOW_VIDEO} className="mt-6" />
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-700 rounded-lg">
            <p className="text-gray-400 text-lg">Stream information is not available for this match.</p>
            <AdDisplay locationKey={AdLocationKey.MATCH_DETAIL_BELOW_VIDEO} className="mt-6" />
          </div>
        )}
      </div>

      <div className="text-center">
        <Link to="/" className="inline-block px-8 py-3 bg-[var(--theme-primary)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
          Back to All Matches
        </Link>
      </div>
    </div>
  );
};

export default MatchDetailPage;
