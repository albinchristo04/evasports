import React from 'react';
import { useAppContext } from '../../AppContext';
import { AdLocationKey } from '../../types';

interface AdDisplayProps {
  locationKey: AdLocationKey;
  className?: string; // Optional custom styling for the ad container
}

const AdDisplay: React.FC<AdDisplayProps> = ({ locationKey, className }) => {
  const { getAdSlot } = useAppContext();
  const adSlot = getAdSlot(locationKey);

  if (!adSlot || !adSlot.adCode || !adSlot.isEnabled) {
    // Optionally render a placeholder in development or nothing in production
    // console.log(`Ad slot ${locationKey} is not active or has no code.`);
    return null; 
  }

  // Basic styling to ensure visibility. Ads usually control their own size.
  const defaultStyles = "my-4 flex justify-center items-center min-h-[50px] bg-gray-700/30 border border-dashed border-gray-600/50 text-gray-500 text-xs";
  
  return (
    <div 
      className={`${defaultStyles} ${className || ''}`}
      aria-label={`Advertisement slot for ${locationKey}`}
      dangerouslySetInnerHTML={{ __html: adSlot.adCode }}
    />
  );
};

export default AdDisplay;