

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChartBarIcon, ListBulletIcon, Cog6ToothIcon, PlayCircleIcon, HomeIcon, UserGroupIcon, CloudArrowDownIcon } from '../icons'; // Added CloudArrowDownIcon
import { useAppContext } from '../../AppContext';
import Button from '../common/Button';

const AdminSidebar: React.FC = () => {
  const { adminSettings, logout, session } = useAppContext();
  const navigate = useNavigate();
  const commonLinkClasses = "flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors";
  const activeLinkClasses = "bg-[var(--theme-primary)] text-white";
  const inactiveLinkClasses = "text-gray-300 hover:text-white";

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-gray-800 text-gray-200 p-6 space-y-6 flex flex-col flex-shrink-0 h-screen sticky top-0">
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
         {session?.user?.email && <p className="text-xs text-gray-500 mt-2 truncate" title={session.user.email}>{session.user.email}</p>}
      </div>
      <nav className="space-y-2 flex-grow">
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
          to="import" // Link to Interactive Import
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <CloudArrowDownIcon className="h-6 w-6" />
          <span>Import Matches</span>
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
      <div className="mt-auto flex-shrink-0">
        <Button onClick={handleLogout} variant="danger" className="w-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
