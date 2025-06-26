import React from 'react';
import { useAppContext } from '../../AppContext';

const Footer: React.FC = () => {
  const { adminSettings } = useAppContext();
  return (
    <footer className="bg-gray-800 text-gray-400 py-8 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {adminSettings.footerCode && (
          <div 
            className="mb-6 footer-code-container"
            dangerouslySetInnerHTML={{ __html: adminSettings.footerCode }}
          />
        )}
        <p>&copy; {new Date().getFullYear()} {adminSettings.siteName}. All rights reserved.</p>
        <p className="text-sm mt-1">Bringing you the best of sports, live and on-demand.</p>
      </div>
    </footer>
  );
};

export default Footer;