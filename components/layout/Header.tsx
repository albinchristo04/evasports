import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PlayCircleIcon } from '../icons';
import { useAppContext } from '../../AppContext';

const Header: React.FC = () => {
  const { adminSettings } = useAppContext();

  return (
    <header className="bg-neutral-dark shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-[var(--theme-accent)]">
            {adminSettings.customLogoUrl ? (
              <img src={adminSettings.customLogoUrl} alt={`${adminSettings.siteName} Logo`} className="h-10 max-w-xs object-contain" />
            ) : (
              <PlayCircleIcon className="h-8 w-8" />
            )}
            <span>{adminSettings.siteName}</span>
          </Link>
          <nav className="flex space-x-6 items-center">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `text-lg font-medium hover:text-[var(--theme-accent)] transition-colors ${isActive ? 'text-[var(--theme-accent)]' : 'text-neutral-text'}`
              }
            >
              Home
            </NavLink>
            {/* Removed Admin Panel link */}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
