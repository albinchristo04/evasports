
import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import AdminDashboardCard from '../../components/admin/AdminDashboardCard';
import { ListBulletIcon, Cog6ToothIcon, PlayCircleIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon, ClipboardIcon } from '../../components/icons';
import { MatchStatus, Match } from '../../types';
import Button from '../../components/common/Button';
import { generateMatchPath } from '../../utils/slugify';

const AdminDashboardPage: React.FC = () => {
  const { matches, adminSettings } = useAppContext();
  const [generatedLinksText, setGeneratedLinksText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const liveMatches = matches.filter(m => m.status === MatchStatus.LIVE).length;
  const upcomingMatches = matches.filter(m => m.status === MatchStatus.UPCOMING).length;
  const finishedMatches = matches.filter(m => m.status === MatchStatus.FINISHED).length;
  const postponedOrCancelledMatches = matches.filter(m => m.status === MatchStatus.POSTPONED || m.status === MatchStatus.CANCELLED).length;
  const totalMatches = matches.length;
  const totalSources = adminSettings.jsonSources.length;

  const handleGenerateTodaysMatchLinks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

    const todaysMatches = matches
      .filter(match => {
        const matchDate = new Date(match.date);
        return matchDate >= today && matchDate < tomorrow;
      })
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (todaysMatches.length === 0) {
      setGeneratedLinksText("No matches scheduled for today.");
      return;
    }

    const baseAppUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.indexOf('#') + 1);

    const linksText = todaysMatches.map(match => {
      const matchTitle = `${match.team1.name} vs ${match.team2.name} - ${match.leagueName}`;
      const matchUrl = baseAppUrl + generateMatchPath(match.leagueName, match.team1.name, match.team2.name, match.id);
      return `${matchTitle}: ${matchUrl}`;
    }).join('\n\n'); // Add double newline for better separation

    setGeneratedLinksText(linksText);
  };

  const handleCopyToClipboard = async () => {
    if (!generatedLinksText) {
      setCopyFeedback("Nothing to copy.");
      setTimeout(() => setCopyFeedback(''), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedLinksText);
      setCopyFeedback("Copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyFeedback("Failed to copy. Please copy manually.");
    }
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-[var(--theme-accent)]">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AdminDashboardCard 
          title="Total Matches" 
          value={totalMatches} 
          icon={<ListBulletIcon className="w-10 h-10" />}
          linkTo="matches"
          colorClass="bg-[var(--theme-primary)]"
        />
        <AdminDashboardCard 
          title="Live Matches" 
          value={liveMatches} 
          icon={<PlayCircleIcon className="w-10 h-10 animate-pulse" />}
          linkTo="matches"
          colorClass="bg-red-600"
        />
        <AdminDashboardCard 
          title="Upcoming Matches" 
          value={upcomingMatches} 
          icon={<ChartBarIcon className="w-10 h-10" />}
          linkTo="matches"
          colorClass="bg-yellow-500"
        />
         <AdminDashboardCard 
          title="Finished Matches" 
          value={finishedMatches} 
          icon={<CheckCircleIcon className="w-10 h-10" />}
          linkTo="matches"
          colorClass="bg-green-600"
        />
        <AdminDashboardCard 
          title="Postponed/Cancelled" 
          value={postponedOrCancelledMatches} 
          icon={<XCircleIcon className="w-10 h-10" />}
          linkTo="matches"
          colorClass="bg-gray-500"
        />
        <AdminDashboardCard 
          title="JSON Sources" 
          value={totalSources} 
          icon={<Cog6ToothIcon className="w-10 h-10" />}
          linkTo="settings"
          colorClass="bg-[var(--theme-secondary)]"
        />
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-[var(--theme-accent)] mb-4">Content Sharing Tools</h2>
        <div className="space-y-4">
          <Button onClick={handleGenerateTodaysMatchLinks} variant="primary">
            Generate Today's Match Links
          </Button>
          {generatedLinksText && (
            <div className="space-y-3">
              <textarea
                readOnly
                value={generatedLinksText}
                className="w-full h-48 p-3 bg-gray-700 text-neutral-text border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                aria-label="Generated match links"
              />
              <div className="flex items-center space-x-3">
                <Button onClick={handleCopyToClipboard} variant="secondary" size="sm">
                  <ClipboardIcon className="h-4 w-4 mr-2" /> Copy to Clipboard
                </Button>
                {copyFeedback && <span className="text-sm text-gray-400">{copyFeedback}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-[var(--theme-accent)] mb-4">Quick Overview</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Manage all sports matches, including scores, status, and stream URLs.</li>
          <li>Configure JSON sources to automatically import match data.</li>
          <li>Customize site appearance, SEO, and inject custom code via settings.</li>
          <li>Monitor live, upcoming, and finished games easily.</li>
        </ul>
      </div>
       <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-[var(--theme-accent)] mb-4">Recent Activity (Placeholder)</h2>
        <p className="text-gray-400">No recent admin activities logged. This section can be expanded to show logs of match updates, settings changes, or source imports.</p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
