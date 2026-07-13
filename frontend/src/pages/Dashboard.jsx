import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, Copy, Check, Trash2, Plus, Eye, Loader, LogOut, FileAudio, FileImage, Film } from 'lucide-react';
import { apiFetch } from '../utils/api';
import VoiceRecorder from '../components/VoiceRecorder';

const Dashboard = () => {
  const { logout, user } = useContext(AuthContext);
  // Ensure we default to an empty array
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [introMessage, setIntroMessage] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [galleryPassword, setGalleryPassword] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const fetchProposals = async () => {
    try {
      const response = await apiFetch('/api/proposals');
      const data = await response.json();
      if (data.success) {
        // Safe Fallback: Look for the 'data' key first, then fall back to 'proposals'
        const fetchedProposals = data.data || data.proposals || [];
        setProposals(fetchedProposals);
        
        if (selectedProposal) {
          const updated = fetchedProposals.find(p => p._id === selectedProposal._id);
          if (updated) setSelectedProposal(updated);
        }
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const response = await apiFetch('/api/proposals', {
        method: 'POST',
        body: JSON.stringify({
          receiverName,
          receiverEmail,
          introMessage,
          proposalMessage,
          galleryPassword,
          musicUrl
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchProposals();
        setModalOpen(false);
        setReceiverName('');
        setReceiverEmail('');
        setIntroMessage('');
        setProposalMessage('');
        setGalleryPassword('');
        setMusicUrl('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this proposal experience? This cannot be undone.')) return;
    try {
      const response = await apiFetch(`/api/proposals/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        fetchProposals();
        if (selectedProposal && selectedProposal._id === id) {
          setSelectedProposal(null);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopy = (slug) => {
    const fullLink = `${window.location.origin}/proposal/${slug}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(''), 2000);
  };

  const handleMediaUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedProposal) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await apiFetch(`/api/proposals/${selectedProposal._id}/media`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setSelectedProposal({ ...selectedProposal, media: data.media });
        setUploadFile(null);
        fetchProposals();
      }
    } catch (error) {
      console.error('Upload fail error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleMediaDelete = async (mediaId) => {
    try {
      const response = await apiFetch(`/api/proposals/${selectedProposal._id}/media/${mediaId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setSelectedProposal({ ...selectedProposal, media: data.media });
        fetchProposals();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="bg-white border-b border-rose-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-rose-500 script-font">HeartLink</span>
          <span className="text-xs bg-pink-100 text-rose-600 font-semibold px-2.5 py-0.5 rounded-full">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 hidden sm:inline">Hello, {user?.name}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-sm font-semibold transition-all"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Your Proposals</h2>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-rose-100"
            >
              <Plus size={16} /> Build New
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader className="animate-spin text-rose-500" size={32} />
            </div>
          ) : !proposals || proposals.length === 0 ? ( // Guard: Checked if proposals is falsy
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-rose-200">
              <p className="text-lg text-slate-500 mb-6">You have not constructed any proposal experiences yet.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-6 py-2.5 bg-rose-500 text-white rounded-xl font-bold"
              >
                Assemble First Hook
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Guard: Added safe optional mapping */}
              {proposals && proposals.map((proposal) => (
                <div
                  key={proposal._id}
                  className={`bg-white rounded-2xl p-6 border transition-all ${
                    selectedProposal?._id === proposal._id ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{proposal.receiverName}</h3>
                      <p className="text-xs text-slate-500">{proposal.receiverEmail}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      proposal.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                      proposal.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 my-4 bg-slate-50 p-3 rounded-xl text-center">
                    <div>
                      <div className="text-xs text-slate-500">Views</div>
                      <div className="text-base font-bold text-slate-700">{proposal.views}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Photos/Audio</div>
                      <div className="text-base font-bold text-slate-700">{proposal.media?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Key Created</div>
                      <div className="text-base font-bold text-slate-700">
                        {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(proposal.slug)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        {copiedSlug === proposal.slug ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copiedSlug === proposal.slug ? 'Copied' : 'Copy Link'}
                      </button>
                      <Link
                        to={`/proposal/${proposal.slug}`}
                        target="_blank"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Eye size={14} /> Preview
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedProposal(proposal)}
                        className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-rose-600 rounded-lg text-xs font-semibold transition-all"
                      >
                        Manage Media ({proposal.media?.length || 0})
                      </button>
                      <button
                        onClick={() => handleDelete(proposal._id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 self-start">
          <h2 className="text-xl font-bold text-slate-800">Media Vault Manager</h2>
          
          {selectedProposal ? (
            <div className="space-y-6">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Selected Proposal</p>
                <p className="text-base font-bold text-slate-800">{selectedProposal.receiverName}</p>
                <p className="text-[10px] text-slate-500 mt-1">Files uploaded here are guarded behind your gallery decryption password.</p>
              </div>

              <VoiceRecorder
                proposalId={selectedProposal._id}
                onUploadSuccess={(updatedMedia) => {
                  setSelectedProposal({ ...selectedProposal, media: updatedMedia || [] });
                  fetchProposals();
                }}
              />

              <form onSubmit={handleMediaUpload} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Upload Media file (Images & Videos to Cloudinary)</label>
                <input
                  type="file"
                  required
                  accept="image/*,video/*"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                />
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {uploading ? 'Processing & Hashing file...' : 'Submit Media File'}
                </button>
              </form>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase">Uploaded Items</h4>
                {selectedProposal.media && selectedProposal.media.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedProposal.media.map((file) => (
                      <div key={file._id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          {file.fileType === 'image' && <FileImage size={16} className="text-sky-500" />}
                          {file.fileType === 'video' && <Film size={16} className="text-indigo-500" />}
                          {file.fileType === 'audio' && <FileAudio size={16} className="text-pink-500" />}
                          <span className="text-[11px] font-medium text-slate-600 truncate max-w-[120px]">{file.publicId}</span>
                        </div>
                        <button
                          onClick={() => handleMediaDelete(file._id)}
                          className="p-1 hover:bg-rose-100 text-rose-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No media documents attached yet.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">Select a proposal container below to manage private attachments.</p>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-pink-100 shadow-xl">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Setup Special Experience</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Receiver Name</label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Juliet"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Receiver Email</label>
                  <input
                    type="email"
                    required
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    placeholder="e.g. juliet@domain.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Intro Message</label>
                <textarea
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  placeholder="Optional romantic greeting"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-20 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Proposal message</label>
                <textarea
                  value={proposalMessage}
                  onChange={(e) => setProposalMessage(e.target.value)}
                  placeholder="The big question text..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-20 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gallery Password</label>
                  <input
                    type="text"
                    required
                    value={galleryPassword}
                    onChange={(e) => setGalleryPassword(e.target.value)}
                    placeholder="Shared code to unlock media"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Music URL</label>
                  <input
                    type="url"
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="Direct .mp3 or audio resource link"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-rose-100"
                >
                  {createLoading ? 'Drafting...' : 'Publish Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
