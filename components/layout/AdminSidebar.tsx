
import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChartBarIcon, ListBulletIcon, Cog6ToothIcon, PlayCircleIcon, HomeIcon, UserGroupIcon, CloudArrowDownIcon, DocumentArrowDownIcon } from '../icons'; // Added DocumentArrowDownIcon
import { useAppContext } from '../../AppContext';

const AdminSidebar: React.FC = () => {
  const { adminSettings } = useAppContext();
  const commonLinkClasses = "flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors";
  const activeLinkClasses = "bg-[var(--theme-primary)] text-white";
  const inactiveLinkClasses = "text-gray-300 hover:text-white";

  return (
    <aside className="w-64 bg-gray-800 text-gray-200 p-6 space-y-6 flex-shrink-0 h-screen sticky top-0">
      <div className="text-center mb-10">
        <NavLink to="/" className="inline-flex items-center space-x-2 text-xl font-bold text-[var(--theme-accent)] mb-2">
            {adminSettings.customLogoUrl ? (
                <img src={adminSettings.customLogoUrl} alt={`${adminSettings.siteName} Logo`} className="h-10 object-contain" />
            ) : (
                <PlayCircleIcon className="h-8 w-8" />
            )}
        </NavLink>
        <p className="text-lg font-semibold text-white">{adminSettings.siteName}</p>
         <p className="text-xs text-gray-400">Admin Panel</p>
      </div>
      <nav className="space-y-2">
        <NavLink
          to="/admin/dashboard"
          end
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <ChartBarIcon className="h-6 w-6" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="matches"
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <ListBulletIcon className="h-6 w-6" />
          <span>Matches</span>
        </NavLink>
        <NavLink
          to="import" 
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <CloudArrowDownIcon className="h-6 w-6" />
          <span>Import JSON</span>
        </NavLink>
        <NavLink
          to="import-txt" // Link to TXT Import
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <DocumentArrowDownIcon className="h-6 w-6" />
          <span>Import TXT File</span>
        </NavLink>
        <NavLink
          to="teams" 
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <UserGroupIcon className="h-6 w-6" />
          <span>Team Logos</span>
        </NavLink>
        <NavLink
          to="settings"
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <Cog6ToothIcon className="h-6 w-6" />
          <span>Settings</span>
        </NavLink>
        <div className="pt-4 mt-4 border-t border-gray-700">
            <NavLink
            to="/"
            target="_blank" 
            rel="noopener noreferrer"
            className={`${commonLinkClasses} ${inactiveLinkClasses}`}
            >
            <HomeIcon className="h-6 w-6" />
            <span>View Site</span>
            </NavLink>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
