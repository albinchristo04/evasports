import React from 'react';
import { useAppContext } from '../../AppContext';
import AdminDashboardCard from '../../components/admin/AdminDashboardCard';
import { ListBulletIcon, Cog6ToothIcon, PlayCircleIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon } from '../../components/icons';
import { MatchStatus } from '../../types';

const AdminDashboardPage: React.FC = () => {
  const { matches, adminSettings } = useAppContext();

  const liveMatches = matches.filter(m => m.status === MatchStatus.LIVE).length;
  const upcomingMatches = matches.filter(m => m.status === MatchStatus.UPCOMING).length;
  const finishedMatches = matches.filter(m => m.status === MatchStatus.FINISHED).length;
  const postponedOrCancelledMatches = matches.filter(m => m.status === MatchStatus.POSTPONED || m.status === MatchStatus.CANCELLED).length;
  const totalMatches = matches.length;
  const totalSources = adminSettings.jsonSources.length;

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