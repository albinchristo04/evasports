import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { JsonSource, AdminSettings, PartialAdminSettings, AdSlot, AdLocationKey } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { TrashIcon, PlusCircleIcon, ArrowPathIcon, CheckCircleIcon, Cog6ToothIcon, PaintBrushIcon, CodeBracketIcon, DocumentTextIcon, GlobeAltIcon, MegaphoneIcon, PencilIcon } from '../../components/icons';
import { generateId, formatDate } from '../../utils/helpers';

type AdminSettingsTab = 'general' | 'appearance' | 'seo' | 'codeInjection' | 'jsonSources' | 'advertising';

// Helper to get descriptive names for AdLocationKeys
const getAdLocationName = (locationKey: AdLocationKey): string => {
  switch (locationKey) {
    case AdLocationKey.HEADER_BANNER: return 'Header Banner';
    case AdLocationKey.FOOTER_BANNER: return 'Footer Banner';
    case AdLocationKey.MATCH_DETAIL_BELOW_VIDEO: return 'Match Detail (Below Video)';
    case AdLocationKey.HOME_PAGE_BELOW_FILTERS: return 'Home Page (Below Filters)';
    default: return (locationKey as string).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Default formatting
  }
};

interface AdSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adSlotConfig: Pick<AdSlot, 'name' | 'adCode' | 'isEnabled' | 'locationKey'>) => Promise<void>;
  onDelete: (locationKey: AdLocationKey) => Promise<void>; // Used to clear config for a location
  locationKey: AdLocationKey;
  currentAdSlot?: AdSlot; // The existing AdSlot for this locationKey, if any
}

const AdSlotModal: React.FC<AdSlotModalProps> = ({ isOpen, onClose, onSave, onDelete, locationKey, currentAdSlot }) => {
  const [name, setName] = useState('');
  const [adCode, setAdCode] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentAdSlot) {
      setName(currentAdSlot.name || `Ad for ${getAdLocationName(locationKey)}`);
      setAdCode(currentAdSlot.adCode || '');
      setIsEnabled(currentAdSlot.isEnabled !== undefined ? currentAdSlot.isEnabled : true);
    } else {
      setName(`Ad for ${getAdLocationName(locationKey)}`);
      setAdCode('');
      setIsEnabled(true);
    }
  }, [currentAdSlot, locationKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ name, adCode, isEnabled, locationKey });
    setIsSaving(false);
    onClose();
  };
  
  const handleDeleteConfig = async () => {
    if (window.confirm(`Are you sure you want to clear the ad configuration for ${getAdLocationName(locationKey)}?`)) {
        setIsSaving(true);
        await onDelete(locationKey);
        setIsSaving(false);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[101] p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-xl space-y-4">
        <h3 className="text-xl font-semibold text-accent">Configure Ad Slot: {getAdLocationName(locationKey)}</h3>
        <Input label="Ad Slot Name (for your reference)" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Header Leaderboard 728x90" />
        <Input as="textarea" label="Ad Code (HTML/Script)" value={adCode} onChange={(e) => setAdCode(e.target.value)} placeholder="Paste your ad code here (e.g., from Google AdSense)" className="min-h-[150px] font-mono text-sm" />
        <div className="flex items-center space-x-3">
          <input type="checkbox" id="adSlotEnabled" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-500 text-accent focus:ring-accent bg-gray-700"/>
          <label htmlFor="adSlotEnabled" className="text-sm text-neutral-text">Enable this Ad Slot</label>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            {currentAdSlot && currentAdSlot.adCode && (
                 <Button onClick={handleDeleteConfig} variant="danger" size="sm" isLoading={isSaving}>Clear Ad Configuration</Button>
            )}
            <div className="flex justify-end space-x-3 flex-grow">
                 <Button onClick={onClose} variant="outline" disabled={isSaving}>Cancel</Button>
                 <Button onClick={handleSave} variant="primary" isLoading={isSaving}>Save Ad Slot</Button>
            </div>
        </div>
      </div>
    </div>
  );
};


const AdminSettingsPage: React.FC = () => {
  const { 
    adminSettings, 
    updateAdminSettings,
    setJsonSources,
    fetchMatchesFromSource, 
    loadingSources, 
    fetchAllMatchesFromSources, 
    globalLoading,
    addOrUpdateAdSlot,
    deleteAdSlot: clearAdSlotConfiguration,
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  
  // State for General Settings
  const [siteName, setSiteName] = useState(adminSettings.siteName);
  const [faviconUrl, setFaviconUrl] = useState(adminSettings.faviconUrl);
  const [customLogoUrl, setCustomLogoUrl] = useState(adminSettings.customLogoUrl);

  // State for Appearance Settings
  const [themePrimaryColor, setThemePrimaryColor] = useState(adminSettings.themePrimaryColor);
  const [themeSecondaryColor, setThemeSecondaryColor] = useState(adminSettings.themeSecondaryColor);
  const [themeAccentColor, setThemeAccentColor] = useState(adminSettings.themeAccentColor);

  // State for SEO Settings
  const [seoMetaTitleSuffix, setSeoMetaTitleSuffix] = useState(adminSettings.seoMetaTitleSuffix);
  const [seoDefaultMetaDescription, setSeoDefaultMetaDescription] = useState(adminSettings.seoDefaultMetaDescription);
  const [seoDefaultMetaKeywords, setSeoDefaultMetaKeywords] = useState(adminSettings.seoDefaultMetaKeywords);
  const [seoOpenGraphImageUrl, setSeoOpenGraphImageUrl] = useState(adminSettings.seoOpenGraphImageUrl);

  // State for Code Injection Settings
  const [headerCode, setHeaderCode] = useState(adminSettings.headerCode);
  const [footerCode, setFooterCode] = useState(adminSettings.footerCode);

  // State for JSON Sources
  const [newSource, setNewSource] = useState<{ name: string; url: string; startOffset?: string; endOffset?: string }>({ name: '', url: '', startOffset: '-2', endOffset: '14' });
  const [editingSource, setEditingSource] = useState<JsonSource & { startOffset?: string; endOffset?: string } | null>(null);
  
  // State for Advertising Modal
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [selectedAdLocationKey, setSelectedAdLocationKey] = useState<AdLocationKey | null>(null);

  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');

  useEffect(() => {
    setSiteName(adminSettings.siteName);
    setFaviconUrl(adminSettings.faviconUrl);
    setCustomLogoUrl(adminSettings.customLogoUrl);
    setThemePrimaryColor(adminSettings.themePrimaryColor);
    setThemeSecondaryColor(adminSettings.themeSecondaryColor);
    setThemeAccentColor(adminSettings.themeAccentColor);
    setSeoMetaTitleSuffix(adminSettings.seoMetaTitleSuffix);
    setSeoDefaultMetaDescription(adminSettings.seoDefaultMetaDescription);
    setSeoDefaultMetaKeywords(adminSettings.seoDefaultMetaKeywords);
    setSeoOpenGraphImageUrl(adminSettings.seoOpenGraphImageUrl);
    setHeaderCode(adminSettings.headerCode);
    setFooterCode(adminSettings.footerCode);
  }, [adminSettings]);

  const showSavedMessage = (message: string) => {
    setSettingsSavedMessage(message);
    setTimeout(() => setSettingsSavedMessage(''), 3000);
  };

  const handleSaveSettings = async (settingsToUpdate: PartialAdminSettings, message: string) => {
    setIsSaving(true);
    await updateAdminSettings(settingsToUpdate);
    setIsSaving(false);
    showSavedMessage(message);
  };

  const handleAddSource = async () => {
    if (newSource.name && newSource.url) {
      const sourceToAdd: JsonSource = {
        name: newSource.name,
        url: newSource.url,
        id: generateId(),
        importStartDateOffsetDays: newSource.startOffset ? parseInt(newSource.startOffset, 10) : undefined,
        importEndDateOffsetDays: newSource.endOffset ? parseInt(newSource.endOffset, 10) : undefined,
      };
      if (isNaN(sourceToAdd.importStartDateOffsetDays!)) sourceToAdd.importStartDateOffsetDays = undefined;
      if (isNaN(sourceToAdd.importEndDateOffsetDays!)) sourceToAdd.importEndDateOffsetDays = undefined;
      
      await setJsonSources(prev => [...prev, sourceToAdd]);
      setNewSource({ name: '', url: '', startOffset: '-2', endOffset: '14' });
      showSavedMessage('JSON Source added.');
    }
  };

  const handleUpdateSource = async () => {
    if (editingSource) {
      const updatedSourceData: JsonSource = {
        ...editingSource,
        importStartDateOffsetDays: editingSource.startOffset ? parseInt(editingSource.startOffset, 10) : undefined,
        importEndDateOffsetDays: editingSource.endOffset ? parseInt(editingSource.endOffset, 10) : undefined,
      };
      if (isNaN(updatedSourceData.importStartDateOffsetDays!)) updatedSourceData.importStartDateOffsetDays = undefined;
      if (isNaN(updatedSourceData.importEndDateOffsetDays!)) updatedSourceData.importEndDateOffsetDays = undefined;
      
      delete (updatedSourceData as any).startOffset;
      delete (updatedSourceData as any).endOffset;

      await setJsonSources(prev => prev.map(s => s.id === updatedSourceData.id ? updatedSourceData : s));
      setEditingSource(null);
      showSavedMessage('JSON Source updated.');
    }
  };
  
  const handleEditSourceClick = (source: JsonSource) => {
    setEditingSource({
      ...source,
      startOffset: source.importStartDateOffsetDays?.toString() ?? '',
      endOffset: source.importEndDateOffsetDays?.toString() ?? '',
    });
  };

  const handleDeleteSource = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this source? This will not delete matches already imported from it.')) {
        await setJsonSources(prev => prev.filter(s => s.id !== id));
        showSavedMessage('JSON Source deleted.');
    }
  };
  
  const handleImportAll = async () => {
    if (window.confirm('This will fetch new matches from all sources. Existing matches will not be affected. Continue?')) {
      const {added, skipped, error} = await fetchAllMatchesFromSources();
      if(error) {
        showSavedMessage(error);
      } else {
        showSavedMessage(`Import complete. Added ${added} new matches, skipped ${skipped} existing.`);
      }
    }
  };

  const openAdModal = (locationKey: AdLocationKey) => {
    setSelectedAdLocationKey(locationKey);
    setIsAdModalOpen(true);
  };

  const handleSaveAdSlot = async (adSlotConfig: Pick<AdSlot, 'name' | 'adCode' | 'isEnabled' | 'locationKey'>) => {
    const existingAdSlotForLocation = adminSettings.adSlots.find(s => s.locationKey === adSlotConfig.locationKey);
    const slotToSave: AdSlot = {
      id: existingAdSlotForLocation?.id || generateId(),
      ...adSlotConfig,
      lastUpdated: new Date().toISOString()
    };
    await addOrUpdateAdSlot(slotToSave);
    showSavedMessage(`Ad slot for ${getAdLocationName(adSlotConfig.locationKey)} saved.`);
  };

  const handleClearAdSlot = async (locationKey: AdLocationKey) => {
    const slotToClear = adminSettings.adSlots.find(s => s.locationKey === locationKey);
    if (slotToClear) {
      await clearAdSlotConfiguration(slotToClear.id); 
      showSavedMessage(`Ad configuration for ${getAdLocationName(locationKey)} cleared.`);
    }
  };

  const tabButtonClass = (tabName: AdminSettingsTab) => 
    `px-4 py-2.5 rounded-md font-medium transition-colors text-sm flex items-center space-x-2
     ${activeTab === tabName 
       ? 'bg-[var(--theme-accent)] text-neutral-darker' 
       : 'bg-gray-700 text-neutral-text hover:bg-gray-600'}`;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-4">
            <Input label="Site Name" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Your Sport Streaming Site" />
            <Input label="Favicon URL" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="/favicon.ico or https://..." />
            <Input label="Custom Logo URL" value={customLogoUrl} onChange={(e) => setCustomLogoUrl(e.target.value)} placeholder="https://example.com/logo.png (leave blank for default)" />
            <Button onClick={() => handleSaveSettings({ siteName, faviconUrl, customLogoUrl }, 'General settings saved!')} variant="primary" isLoading={isSaving}>Save General Settings</Button>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-6">
            <p className="text-sm text-gray-400">Enter HEX color codes (e.g., #FF0000).</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Primary Color" type="text" value={themePrimaryColor} onChange={(e) => setThemePrimaryColor(e.target.value)} placeholder="#007bff" Icon={() => <span style={{backgroundColor: themePrimaryColor}} className="w-4 h-4 rounded border border-gray-500 block"></span>} />
                <Input label="Secondary Color" type="text" value={themeSecondaryColor} onChange={(e) => setThemeSecondaryColor(e.target.value)} placeholder="#6f42c1" Icon={() => <span style={{backgroundColor: themeSecondaryColor}} className="w-4 h-4 rounded border border-gray-500 block"></span>}/>
                <Input label="Accent Color" type="text" value={themeAccentColor} onChange={(e) => setThemeAccentColor(e.target.value)} placeholder="#10B981" Icon={() => <span style={{backgroundColor: themeAccentColor}} className="w-4 h-4 rounded border border-gray-500 block"></span>}/>
            </div>
            <Button onClick={() => handleSaveSettings({ themePrimaryColor, themeSecondaryColor, themeAccentColor }, 'Appearance settings saved!')} variant="primary" isLoading={isSaving}>Save Appearance</Button>
          </div>
        );
      case 'seo':
        return (
          <div className="space-y-4">
            <Input label="Meta Title Suffix" value={seoMetaTitleSuffix} onChange={(e) => setSeoMetaTitleSuffix(e.target.value)} placeholder="e.g., | My Awesome Site" />
            <Input as="textarea" label="Default Meta Description" value={seoDefaultMetaDescription} onChange={(e) => setSeoDefaultMetaDescription(e.target.value)} className="min-h-[80px]" />
            <Input label="Default Meta Keywords (comma-separated)" value={seoDefaultMetaKeywords} onChange={(e) => setSeoDefaultMetaKeywords(e.target.value)} />
            <Input label="Default Open Graph Image URL" value={seoOpenGraphImageUrl} onChange={(e) => setSeoOpenGraphImageUrl(e.target.value)} placeholder="https://example.com/default-og-image.jpg" />
            <Button onClick={() => handleSaveSettings({ seoMetaTitleSuffix, seoDefaultMetaDescription, seoDefaultMetaKeywords, seoOpenGraphImageUrl }, 'SEO settings saved!')} variant="primary" isLoading={isSaving}>Save SEO Settings</Button>
          </div>
        );
      case 'codeInjection':
        return (
          <div className="space-y-4">
            <Input as="textarea" label="Header Code (Global scripts, meta tags for <head>)" value={headerCode} onChange={(e) => setHeaderCode(e.target.value)} placeholder="e.g., Google Analytics script" className="min-h-[120px] font-mono text-sm" />
            <Input as="textarea" label="Footer Code (Global scripts, tracking pixels before </body>)" value={footerCode} onChange={(e) => setFooterCode(e.target.value)} placeholder="e.g., Tracking pixels" className="min-h-[120px] font-mono text-sm" />
            <Button onClick={() => handleSaveSettings({ headerCode, footerCode }, 'Code injection settings saved!')} variant="primary" isLoading={isSaving}>Save Code Injections</Button>
          </div>
        );
      case 'jsonSources':
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-xl font-semibold text-gray-300">Manage JSON Sources</h3>
                <Button onClick={handleImportAll} isLoading={globalLoading} variant="secondary" size="md">
                    <ArrowPathIcon className="h-5 w-5 mr-2" />
                    Add New Matches from All Sources
                </Button>
            </div>
            {adminSettings.jsonSources.map(source => (
              <div key={source.id} className="bg-gray-700 p-4 rounded-lg">
                {editingSource?.id === source.id ? (
                  <div className="w-full space-y-3">
                    <Input label="Source Name" value={editingSource.name} onChange={(e) => setEditingSource({...editingSource!, name: e.target.value})} placeholder="Source Name" />
                    <Input label="Source URL" value={editingSource.url} onChange={(e) => setEditingSource({...editingSource!, url: e.target.value})} placeholder="Source URL" />
                    <div className="grid grid-cols-2 gap-3">
                        <Input 
                            label="Start Day Offset" 
                            type="number"
                            value={editingSource.startOffset || ''} 
                            onChange={(e) => setEditingSource({...editingSource!, startOffset: e.target.value})} 
                            placeholder="-1 (yesterday)"
                            title="Days from today to start importing (e.g., -1 for yesterday). Leave blank for no start date filter."
                        />
                        <Input 
                            label="End Day Offset" 
                            type="number"
                            value={editingSource.endOffset || ''}
                            onChange={(e) => setEditingSource({...editingSource!, endOffset: e.target.value})} 
                            placeholder="7 (a week from now)"
                            title="Days from today to end importing (e.g., 7 for one week). Leave blank for no end date filter."
                        />
                    </div>
                    <div className="flex space-x-2 justify-end pt-2">
                      <Button onClick={handleUpdateSource} size="sm" variant="primary">Save</Button>
                      <Button onClick={() => setEditingSource(null)} size="sm" variant="outline">Cancel</Button>
                    </div>
                  </div>
                ) : (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
                    <div className="flex-grow">
                      <p className="font-semibold text-lg text-neutral-text">{source.name}</p>
                      <p className="text-xs text-gray-400 break-all">{source.url}</p>
                       <p className="text-xs text-gray-500 mt-1">
                        Import Range: 
                        {source.importStartDateOffsetDays !== undefined ? ` Day ${source.importStartDateOffsetDays}` : ' Any'}
                        {' to '}
                        {source.importEndDateOffsetDays !== undefined ? `Day ${source.importEndDateOffsetDays}` : 'Any'}
                      </p>
                      {source.lastImported && <p className="text-xs text-emerald-400 mt-1">Last Imported: {formatDate(source.lastImported)}</p>}
                    </div>
                    <div className="flex space-x-2 flex-shrink-0 self-end md:self-center">
                      <Button onClick={() => fetchMatchesFromSource(source)} isLoading={loadingSources[source.id]} size="sm" variant="ghost" title="Add new matches from this source"><ArrowPathIcon className="h-5 w-5" /></Button>
                      <Button onClick={() => handleEditSourceClick(source)} size="sm" variant="outline" title="Edit Source"><PencilIcon className="h-4 w-4"/></Button>
                      <Button onClick={() => handleDeleteSource(source.id)} size="sm" variant="danger" title="Delete Source"><TrashIcon className="h-5 w-5" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="bg-gray-700 p-6 rounded-lg mt-8">
              <h3 className="text-xl font-semibold text-accent mb-4">Add New Source</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <Input label="Source Name" value={newSource.name} onChange={(e) => setNewSource({...newSource, name: e.target.value})} placeholder="e.g., Premier League" />
                <Input label="Source URL (.json)" value={newSource.url} onChange={(e) => setNewSource({...newSource, url: e.target.value})} placeholder="https://example.com/data.json" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-4">
                 <Input 
                    label="Start Day Offset" 
                    type="number"
                    value={newSource.startOffset || ''} 
                    onChange={(e) => setNewSource({...newSource, startOffset: e.target.value})} 
                    placeholder="-2 (Default)"
                    title="Days from today to start importing (e.g., -1 for yesterday). Leave blank for default."
                />
                <Input 
                    label="End Day Offset" 
                    type="number"
                    value={newSource.endOffset || ''}
                    onChange={(e) => setNewSource({...newSource, endOffset: e.target.value})} 
                    placeholder="14 (Default)"
                    title="Days from today to end importing (e.g., 7 for one week). Leave blank for default."
                />
                <Button onClick={handleAddSource} className="md:self-end h-11 w-full"><PlusCircleIcon className="h-5 w-5 mr-2" /> Add Source</Button>
              </div>
            </div>
          </div>
        );
      case 'advertising':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-300">Manage Ad Slots</h3>
            <p className="text-sm text-gray-400">Configure ad codes for predefined locations on your site. Leave ad code blank to have no ad in that slot.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(AdLocationKey).map(locationKey => {
                const currentAdSlot = adminSettings.adSlots.find(slot => slot.locationKey === locationKey);
                return (
                  <div key={locationKey} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-neutral-text">{getAdLocationName(locationKey)}</p>
                        {currentAdSlot && currentAdSlot.adCode ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${currentAdSlot.isEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                            {currentAdSlot.isEnabled ? 'Enabled' : 'Disabled'} - "{currentAdSlot.name}"
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Not Configured</span>
                        )}
                      </div>
                      <Button onClick={() => openAdModal(locationKey)} variant="outline" size="sm">
                        {currentAdSlot && currentAdSlot.adCode ? 'Edit Ad' : 'Configure Ad'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
             {selectedAdLocationKey && (
              <AdSlotModal
                isOpen={isAdModalOpen}
                onClose={() => setIsAdModalOpen(false)}
                onSave={handleSaveAdSlot}
                onDelete={handleClearAdSlot}
                locationKey={selectedAdLocationKey}
                currentAdSlot={adminSettings.adSlots.find(s => s.locationKey === selectedAdLocationKey)}
              />
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-[var(--theme-accent)]">Admin Settings</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700 pb-4">
        <button onClick={() => setActiveTab('general')} className={tabButtonClass('general')}><Cog6ToothIcon className="w-5 h-5"/>General</button>
        <button onClick={() => setActiveTab('appearance')} className={tabButtonClass('appearance')}><PaintBrushIcon className="w-5 h-5"/>Appearance</button>
        <button onClick={() => setActiveTab('seo')} className={tabButtonClass('seo')}><GlobeAltIcon className="w-5 h-5"/>SEO</button>
        <button onClick={() => setActiveTab('advertising')} className={tabButtonClass('advertising')}><MegaphoneIcon className="w-5 h-5"/>Advertising</button>
        <button onClick={() => setActiveTab('codeInjection')} className={tabButtonClass('codeInjection')}><CodeBracketIcon className="w-5 h-5"/>Code Injection</button>
        <button onClick={() => setActiveTab('jsonSources')} className={tabButtonClass('jsonSources')}><DocumentTextIcon className="w-5 h-5"/>JSON Sources</button>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg min-h-[400px]">
        {renderTabContent()}
      </div>

      {settingsSavedMessage && (
        <div className="fixed bottom-10 right-10 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl animate-pulse flex items-center z-[102]">
          <CheckCircleIcon className="h-6 w-6 mr-2" />
          {settingsSavedMessage}
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;