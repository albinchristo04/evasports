
import React, { useState, useCallback } from 'react';
import { useAppContext } from '../../AppContext';
import { AdminSettings, JsonSource, AdSlot, AdLocationKey } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { generateId } from '../../utils/helpers';
import { TrashIcon, PlusCircleIcon, ArrowPathIcon } from '../../components/icons';
import { v4 as uuidv4 } from 'uuid';

type SettingsTabs = 'general' | 'theme' | 'seo' | 'sources' | 'ads' | 'code';

const AdminSettingsPage: React.FC = () => {
  const { adminSettings, updateAdminSettings, fetchAllMatchesFromSources, globalLoading, error: contextError } = useAppContext();
  const [settings, setSettings] = useState<AdminSettings>(adminSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error'} | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabs>('general');
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleJsonSourceChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newSources = [...settings.jsonSources];
    (newSources[index] as any)[name] = value;
    setSettings(prev => ({ ...prev, jsonSources: newSources }));
  };
  
  const handleAdSlotChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newAdSlots = [...settings.adSlots];
    const adSlot = { ...newAdSlots[index] };
    
    if (type === 'checkbox') {
        (adSlot as any)[name] = (e.target as HTMLInputElement).checked;
    } else {
        (adSlot as any)[name] = value;
    }
    
    newAdSlots[index] = adSlot;
    setSettings(prev => ({ ...prev, adSlots: newAdSlots }));
  };
  
  const addJsonSource = () => {
    const newSource: JsonSource = { id: uuidv4(), name: 'New Source', url: '' };
    setSettings(prev => ({ ...prev, jsonSources: [...prev.jsonSources, newSource] }));
  };

  const removeJsonSource = (id: string) => {
    if (window.confirm('Are you sure you want to remove this source?')) {
        setSettings(prev => ({ ...prev, jsonSources: prev.jsonSources.filter(s => s.id !== id) }));
    }
  };
  
  const addAdSlot = () => {
    const newAdSlot: AdSlot = {
      id: generateId(),
      locationKey: AdLocationKey.HEADER_BANNER, // default
      name: 'New Ad Slot',
      adCode: '<!-- Paste ad code here -->',
      isEnabled: false,
      lastUpdated: new Date().toISOString()
    };
     setSettings(prev => ({ ...prev, adSlots: [...(prev.adSlots || []), newAdSlot] }));
  };

  const removeAdSlot = (id: string) => {
    if (window.confirm('Are you sure you want to remove this ad slot?')) {
        setSettings(prev => ({ ...prev, adSlots: prev.adSlots.filter(s => s.id !== id) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAdminSettings(settings);
      showFeedback('Settings saved successfully!', 'success');
    } catch (error: any) {
      showFeedback(`Error saving settings: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFetchAll = async () => {
      if (!window.confirm("This will fetch matches from all enabled sources. It may add many new matches. Are you sure?")) return;
      setIsFetchingAll(true);
      const result = await fetchAllMatchesFromSources({ isManualTrigger: true });
      if (result.error && result.error !== "Automatic import is disabled.") {
          showFeedback(`Error during fetch: ${result.error}`, 'error');
      } else {
          showFeedback(`Fetch complete! Added: ${result.added}, Skipped: ${result.skipped}.`, 'success');
      }
      setIsFetchingAll(false);
  }

  const TabButton: React.FC<{tab: SettingsTabs, label: string}> = ({ tab, label }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-[var(--theme-primary)] text-white' : 'text-gray-300 hover:bg-gray-700'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-[var(--theme-accent)]">Site Settings</h1>
      
      <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-3 mb-6">
          <TabButton tab="general" label="General" />
          <TabButton tab="theme" label="Theme" />
          <TabButton tab="seo" label="SEO" />
          <TabButton tab="sources" label="JSON Sources" />
          <TabButton tab="ads" label="Ad Slots" />
          <TabButton tab="code" label="Custom Code" />
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl shadow-2xl space-y-6">
        
        {activeTab === 'general' && <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-300">General Settings</h2>
            <Input label="Site Name" name="siteName" value={settings.siteName} onChange={handleChange} />
            <Input label="Favicon URL" name="faviconUrl" value={settings.faviconUrl} onChange={handleChange} />
            <Input label="Custom Logo URL" name="customLogoUrl" value={settings.customLogoUrl} onChange={handleChange} placeholder="Leave empty to use default icon" />
        </div>}
        
        {activeTab === 'theme' && <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-300">Theme Colors</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Primary Color" name="themePrimaryColor" type="color" value={settings.themePrimaryColor} onChange={handleChange} className="h-12" />
                <Input label="Secondary Color" name="themeSecondaryColor" type="color" value={settings.themeSecondaryColor} onChange={handleChange} className="h-12" />
                <Input label="Accent Color" name="themeAccentColor" type="color" value={settings.themeAccentColor} onChange={handleChange} className="h-12" />
            </div>
        </div>}

        {activeTab === 'seo' && <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-300">SEO Settings</h2>
            <Input label="Meta Title Suffix" name="seoMetaTitleSuffix" value={settings.seoMetaTitleSuffix} onChange={handleChange} />
            <Input as="textarea" label="Default Meta Description" name="seoDefaultMetaDescription" value={settings.seoDefaultMetaDescription} onChange={handleChange} />
            <Input label="Default Meta Keywords" name="seoDefaultMetaKeywords" value={settings.seoDefaultMetaKeywords} onChange={handleChange} />
            <Input label="Default OpenGraph Image URL" name="seoOpenGraphImageUrl" value={settings.seoOpenGraphImageUrl} onChange={handleChange} placeholder="https://example.com/default-og-image.jpg" />
        </div>}

        {activeTab === 'sources' && <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-300">JSON Sources</h2>
                <Button type="button" onClick={handleFetchAll} isLoading={isFetchingAll || globalLoading} variant="secondary">
                    <ArrowPathIcon className="h-5 w-5 mr-2" />
                    Fetch All Sources Now
                </Button>
            </div>
            {settings.jsonSources.map((source, index) => (
                <div key={source.id} className="bg-gray-700 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                        <Input label="Source Name" name="name" value={source.name} onChange={(e) => handleJsonSourceChange(index, e)} className="flex-grow mr-4" />
                        <Button type="button" onClick={() => removeJsonSource(source.id)} variant="danger" size="sm" className="mt-7">
                            <TrashIcon className="h-5 w-5" />
                        </Button>
                    </div>
                    <Input label="Source URL" name="url" value={source.url} onChange={(e) => handleJsonSourceChange(index, e)} />
                </div>
            ))}
            <Button type="button" onClick={addJsonSource} variant="ghost">
                <PlusCircleIcon className="h-5 w-5 mr-2" /> Add JSON Source
            </Button>
        </div>}
        
        {activeTab === 'ads' && <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-300">Advertisement Slots</h2>
             {(settings.adSlots || []).map((slot, index) => (
                 <div key={slot.id} className="bg-gray-700 p-4 rounded-lg space-y-3">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg text-gray-200">{slot.name}</h3>
                        <Button type="button" onClick={() => removeAdSlot(slot.id)} variant="danger" size="sm"><TrashIcon className="h-5 w-5" /></Button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Input label="Slot Name" name="name" value={slot.name} onChange={e => handleAdSlotChange(index, e)} />
                         <Input label="Location Key" name="locationKey" value={slot.locationKey} disabled />
                     </div>
                     <Input as="textarea" label="Ad Code (HTML/JS)" name="adCode" value={slot.adCode} onChange={e => handleAdSlotChange(index, e)} />
                     <div className="flex items-center space-x-2">
                        <input type="checkbox" id={`ad-enabled-${index}`} name="isEnabled" checked={slot.isEnabled} onChange={e => handleAdSlotChange(index, e)} className="h-4 w-4 rounded border-gray-500 text-accent focus:ring-accent bg-gray-700"/>
                        <label htmlFor={`ad-enabled-${index}`} className="text-sm font-medium text-gray-300">Enable this Ad Slot</label>
                     </div>
                 </div>
             ))}
            {/* Note: Adding new ad slots is complex as AdLocationKey is an enum. For now, we manage existing ones. */}
        </div>}

        {activeTab === 'code' && <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-300">Custom Code Injection</h2>
            <Input as="textarea" label="Header Code" name="headerCode" value={settings.headerCode} onChange={handleChange} className="font-mono text-sm" />
            <Input as="textarea" label="Footer Code" name="footerCode" value={settings.footerCode} onChange={handleChange} className="font-mono text-sm" />
        </div>}

        <div className="flex justify-end pt-6 border-t border-gray-700">
          <Button type="submit" variant="primary" isLoading={isSaving}>Save All Settings</Button>
        </div>
      </form>
      
       {feedback && (
        <div className={`fixed bottom-10 right-10 text-white px-6 py-3 rounded-lg shadow-xl animate-pulse ${feedback.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
