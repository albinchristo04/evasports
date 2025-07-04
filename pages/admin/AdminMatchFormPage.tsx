import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../AppContext';
import { Match, MatchStatus, StreamType, Team, StreamLink, StreamLinkStatus } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/icons';
import { generateId } from '../../utils/helpers';

// Modal Component for Editing/Adding StreamLink
interface StreamLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (streamLink: StreamLink) => void;
  streamLink?: StreamLink | null; // Pass null or StreamLink for add/edit
}

const StreamLinkModal: React.FC<StreamLinkModalProps> = ({ isOpen, onClose, onSave, streamLink: initialStreamLink }) => {
  const [currentLink, setCurrentLink] = useState<StreamLink>(
    initialStreamLink || {
      id: generateId(),
      url: '',
      qualityLabel: 'Main',
      type: StreamType.NONE,
      status: StreamLinkStatus.UNKNOWN,
    }
  );

  useEffect(() => {
    setCurrentLink(
      initialStreamLink || {
        id: initialStreamLink?.id || generateId(), // keep id if editing
        url: '',
        qualityLabel: 'Main',
        type: StreamType.NONE,
        status: StreamLinkStatus.UNKNOWN,
      }
    );
  }, [initialStreamLink, isOpen]);


  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentLink(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!currentLink.url || !currentLink.qualityLabel) {
        alert("URL and Quality Label are required for a stream link.");
        return;
    }
    onSave(currentLink);
    onClose();
  };
  
  const streamTypeOptions = Object.values(StreamType).map(st => ({ value: st, label: st.toUpperCase() }));
  const streamStatusOptions = Object.values(StreamLinkStatus).map(ss => ({ value: ss, label: ss }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
        <h3 className="text-xl font-semibold text-accent">{initialStreamLink ? 'Edit Stream Link' : 'Add New Stream Link'}</h3>
        <Input label="Stream URL" name="url" value={currentLink.url} onChange={handleChange} placeholder="https://stream.example.com/live" required />
        <Input label="Quality Label" name="qualityLabel" value={currentLink.qualityLabel} onChange={handleChange} placeholder="e.g., HD, 720p, Main" required />
        <Select label="Stream Type" name="type" options={streamTypeOptions} value={currentLink.type} onChange={handleChange} />
        <Select label="Stream Status" name="status" options={streamStatusOptions} value={currentLink.status} onChange={handleChange} />
        <div className="flex justify-end space-x-3">
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleSave} variant="primary">Save Stream Link</Button>
        </div>
      </div>
    </div>
  );
};


const AdminMatchFormPage: React.FC = () => {
  const { matchId } = useParams<{ matchId?: string }>();
  const navigate = useNavigate();
  const { addMatch, updateMatch, getMatchById, leagues: availableLeagues, adminSettings } = useAppContext();

  const isEditing = Boolean(matchId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchData, setMatchData] = useState<Omit<Match, 'id' | 'sourceMatchId' | 'sourceUrl'>>({
    leagueName: '',
    date: new Date().toISOString().split('T')[0], 
    time: '12:00',
    team1: { name: '' },
    team2: { name: '' },
    score1: null,
    score2: null,
    status: MatchStatus.UPCOMING,
    streamLinks: [],
    round: '',
    group: '',
    isFeatured: false,
  });

  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [editingStreamLink, setEditingStreamLink] = useState<StreamLink | null>(null);
  
  useEffect(() => {
    if (isEditing && matchId) {
      const existingMatch = getMatchById(matchId);
      if (existingMatch) {
        setMatchData({
          ...existingMatch,
          date: existingMatch.date ? new Date(existingMatch.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          time: existingMatch.time || '12:00',
          score1: existingMatch.score1 === undefined ? null : existingMatch.score1,
          score2: existingMatch.score2 === undefined ? null : existingMatch.score2,
          streamLinks: existingMatch.streamLinks || [],
          isFeatured: adminSettings.featuredMatchIds.includes(matchId),
        });
      } else {
        navigate('/admin/matches', { replace: true });
      }
    } else {
      // For new match, ensure isFeatured is false initially
      setMatchData(prev => ({ ...prev, isFeatured: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, isEditing, navigate, adminSettings.featuredMatchIds]); // getMatchById is stable

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox' && name === 'isFeatured') {
      const { checked } = e.target as HTMLInputElement;
      setMatchData(prev => ({ ...prev, isFeatured: checked }));
    } else if (name.startsWith('team1.')) {
      const teamField = name.split('.')[1] as keyof Team;
      setMatchData(prev => ({ ...prev, team1: { ...prev.team1, [teamField]: value } }));
    } else if (name.startsWith('team2.')) {
      const teamField = name.split('.')[1] as keyof Team;
      setMatchData(prev => ({ ...prev, team2: { ...prev.team2, [teamField]: value } }));
    } else if (name === 'score1' || name === 'score2') {
        setMatchData(prev => ({ ...prev, [name]: value === '' ? null : parseInt(value, 10) }));
    } else {
      setMatchData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveStreamLink = (streamLink: StreamLink) => {
    setMatchData(prev => {
      const existingIndex = prev.streamLinks.findIndex(sl => sl.id === streamLink.id);
      let newStreamLinks;
      if (existingIndex > -1) {
        newStreamLinks = [...prev.streamLinks];
        newStreamLinks[existingIndex] = streamLink;
      } else {
        newStreamLinks = [...prev.streamLinks, streamLink];
      }
      return { ...prev, streamLinks: newStreamLinks };
    });
  };

  const handleDeleteStreamLink = (linkId: string) => {
    if (window.confirm('Are you sure you want to delete this stream link?')) {
        setMatchData(prev => ({
            ...prev,
            streamLinks: prev.streamLinks.filter(sl => sl.id !== linkId)
        }));
    }
  };
  
  const openStreamLinkModalForEdit = (streamLink: StreamLink) => {
    setEditingStreamLink(streamLink);
    setIsStreamModalOpen(true);
  };

  const openStreamLinkModalForAdd = () => {
    setEditingStreamLink(null); 
    setIsStreamModalOpen(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fullDateISO = new Date(`${matchData.date}T${matchData.time || '00:00:00'}`).toISOString();
    
    const finalMatchDataForSave = {
        ...matchData,
        date: fullDateISO,
        score1: matchData.score1 === null ? undefined : matchData.score1,
        score2: matchData.score2 === null ? undefined : matchData.score2,
    };

    try {
        if (isEditing && matchId) {
          await updateMatch({ ...finalMatchDataForSave, id: matchId } as Match);
        } else {
          await addMatch(finalMatchDataForSave as Omit<Match, 'id'>);
        }
        navigate('/admin/matches');
    } catch (error) {
        console.error("Failed to save match", error);
        // You might want to show an error message to the user here
    } finally {
        setIsSubmitting(false);
    }
  };

  const statusOptions = Object.values(MatchStatus).map(s => ({ value: s, label: s }));
  const leagueOptions = availableLeagues.map(l => ({value: l, label: l}));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-[var(--theme-accent)]">{isEditing ? 'Edit Match' : 'Add New Match'}</h1>
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl shadow-2xl space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <Input label="League Name" name="leagueName" value={matchData.leagueName} onChange={handleChange} placeholder="e.g., Premier League" required list="leagueSuggestions" />
          <datalist id="leagueSuggestions">
            {leagueOptions.map(opt => <option key={opt.value} value={opt.value} />)}
          </datalist>
          <Select label="Status" name="status" options={statusOptions} value={matchData.status} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <Input label="Date" name="date" type="date" value={matchData.date} onChange={handleChange} required />
          <Input label="Time (HH:MM)" name="time" type="time" value={matchData.time || ''} onChange={handleChange} />
        </div>
         <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isFeatured"
              name="isFeatured"
              checked={!!matchData.isFeatured}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-500 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] bg-gray-700"
            />
            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-300">
              Mark as Featured Match
            </label>
          </div>
        
        <h2 className="text-xl font-semibold text-gray-300 pt-4 border-t border-gray-700">Team Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Input label="Team 1 Name" name="team1.name" value={matchData.team1.name} onChange={handleChange} placeholder="Home Team" required />
                <Input label="Team 1 Logo URL (Optional)" name="team1.logoUrl" value={matchData.team1.logoUrl || ''} onChange={handleChange} placeholder="https://example.com/logo1.png" className="mt-2"/>
            </div>
            <div>
                <Input label="Team 2 Name" name="team2.name" value={matchData.team2.name} onChange={handleChange} placeholder="Away Team" required />
                <Input label="Team 2 Logo URL (Optional)" name="team2.logoUrl" value={matchData.team2.logoUrl || ''} onChange={handleChange} placeholder="https://example.com/logo2.png" className="mt-2"/>
            </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-300 pt-4 border-t border-gray-700">Score & Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Team 1 Score" name="score1" type="number" value={matchData.score1 === null ? '' : String(matchData.score1)} onChange={handleChange} placeholder="-" />
          <Input label="Team 2 Score" name="score2" type="number" value={matchData.score2 === null ? '' : String(matchData.score2)} onChange={handleChange} placeholder="-" />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Round (Optional)" name="round" value={matchData.round || ''} onChange={handleChange} placeholder="e.g., Final, Semi-final, Group Stage" />
          <Input label="Group (Optional)" name="group" value={matchData.group || ''} onChange={handleChange} placeholder="e.g., Group A" />
        </div>

        <h2 className="text-xl font-semibold text-gray-300 pt-4 border-t border-gray-700">Stream Links</h2>
        <div className="space-y-3">
            {matchData.streamLinks.map(link => (
                <div key={link.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                    <div>
                        <p className="font-medium text-neutral-text">{link.qualityLabel} <span className="text-xs text-gray-400">({link.type}, {link.status})</span></p>
                        <p className="text-xs text-gray-400 truncate max-w-xs" title={link.url}>{link.url}</p>
                    </div>
                    <div className="space-x-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openStreamLinkModalForEdit(link)}><PencilIcon className="h-4 w-4"/></Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleDeleteStreamLink(link.id)}><TrashIcon className="h-4 w-4"/></Button>
                    </div>
                </div>
            ))}
            {matchData.streamLinks.length === 0 && <p className="text-gray-400 text-sm">No stream links added yet.</p>}
            <Button type="button" variant="ghost" onClick={openStreamLinkModalForAdd} className="mt-2">
                <PlusCircleIcon className="h-5 w-5 mr-2" /> Add Stream Link
            </Button>
        </div>

        <StreamLinkModal 
            isOpen={isStreamModalOpen}
            onClose={() => setIsStreamModalOpen(false)}
            onSave={handleSaveStreamLink}
            streamLink={editingStreamLink}
        />

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700 mt-8">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/matches')} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>{isEditing ? 'Save Changes' : 'Add Match'}</Button>
        </div>
      </form>
    </div>
  );
};

export default AdminMatchFormPage;