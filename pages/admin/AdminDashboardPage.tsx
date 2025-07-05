
import React, { useState, useCallback } from 'react';
import { useAppContext } from '../../AppContext';
import AdminDashboardCard from '../../components/admin/AdminDashboardCard';
import { ListBulletIcon, Cog6ToothIcon, PlayCircleIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon, MegaphoneIcon, ClipboardIcon, ClipboardCheckIcon } from '../../components/icons';
import { Match, MatchStatus } from '../../types';
import Button from '../../components/common/Button';

const AdminDashboardPage: React.FC = () => {
  const { matches, adminSettings } = useAppContext();
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [generatedList, setGeneratedList] = useState('');
  const [isCopied, setIsCopied] = useState(false);


  const liveMatches = matches.filter(m => m.status === MatchStatus.LIVE).length;
  const upcomingMatches = matches.filter(m => m.status === MatchStatus.UPCOMING).length;
  const finishedMatches = matches.filter(m => m.status === MatchStatus.FINISHED).length;
  const postponedOrCancelledMatches = matches.filter(m => m.status === MatchStatus.POSTPONED || m.status === MatchStatus.CANCELLED).length;
  const totalMatches = matches.length;
  const totalSources = adminSettings.jsonSources.length;

  const handleGenerateTodaysMatchesList = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysMatches = matches
        .filter(match => {
            const matchDate = new Date(match.date);
            return matchDate >= today && matchDate < tomorrow;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (todaysMatches.length === 0) {
        setGeneratedList("No matches scheduled for today.");
        setIsListModalOpen(true);
        return;
    }
    
    const matchesByLeague = todaysMatches.reduce((acc, match) => {
        (acc[match.leagueName] = acc[match.leagueName] || []).push(match);
        return acc;
    }, {} as Record<string, Match[]>);

    const siteUrl = window.location.origin;
    
    const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let listString = `🔥 *Today's Matches - ${formattedDate}* 🔥\n\n`;

    for (const leagueName in matchesByLeague) {
        listString += `🏆 *${leagueName}*\n\n`;
        matchesByLeague[leagueName].forEach(match => {
            const matchTime = new Date(match.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const matchLink = `${siteUrl}/#/match/${match.id}`;
            listString += `⚽ ${match.team1.name} vs ${match.team2.name}\n`;
            listString += `⏰ ${matchTime}\n`;
            listString += `🔗 [Watch Here](${matchLink})\n\n`;
        });
        listString += '---\n\n';
    }

    setGeneratedList(listString.trim());
    setIsListModalOpen(true);
  }, [matches]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedList).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    });
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
          colorClass="bg-red-600" // Live typically has a fixed color for urgency
        />
        <AdminDashboardCard 
          title="Upcoming Matches" 
          value={upcomingMatches} 
          icon={<ChartBarIcon className="w-10 h-10" />}
          linkTo="matches"
          colorClass="bg-yellow-500" // Upcoming also often fixed
        />
         <AdminDashboardCard 
          title="Finished Matches" 
          value={finishedMatches} 
          icon={<CheckCircleIcon className="w-10 h-10" />}
          linkTo="matches"
          colorClass="bg-green-600" // Finished also often fixed
        />
        <AdminDashboardCard 
          title="Postponed/Cancelled" 
          value={postponedOrCancelledMatches} 
          icon={<XCircleIcon className="w-10 h-10" />}
          linkTo="matches"
          colorClass="bg-gray-500" // Neutral for these statuses
        />
        <AdminDashboardCard 
          title="JSON Sources" 
          value={totalSources} 
          icon={<Cog6ToothIcon className="w-10 h-10" />}
          linkTo="settings" // Direct to settings, then user selects JSON Sources tab
          colorClass="bg-[var(--theme-secondary)]"
        />
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-[var(--theme-accent)] mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
            <Button onClick={handleGenerateTodaysMatchesList} variant="secondary">
                <MegaphoneIcon className="w-5 h-5 mr-2" />
                Generate Today's Match List
            </Button>
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

      {isListModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl space-y-4 flex flex-col">
                <h3 className="text-xl font-semibold text-[var(--theme-accent)]">Today's Match List for Sharing</h3>
                <textarea
                    readOnly
                    className="w-full h-64 bg-gray-900 text-gray-300 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm resize-y"
                    value={generatedList}
                />
                <div className="flex justify-end items-center gap-4">
                    <Button onClick={handleCopy} variant="primary" disabled={isCopied}>
                        {isCopied ? <ClipboardCheckIcon className="h-5 w-5 mr-2" /> : <ClipboardIcon className="h-5 w-5 mr-2" />}
                        {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <Button onClick={() => setIsListModalOpen(false)} variant="outline">
                        Close
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
