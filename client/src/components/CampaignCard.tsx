import { useState, useRef, useEffect } from 'react';
import { Play, Pause, MoreHorizontal, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { campaignsApi, type Campaign } from '@/lib/api';

interface CampaignCardProps {
  campaign: Campaign;
  onStartDialing?: (id: string) => void;
  onUpdated?: () => void;
}

export default function CampaignCard({ campaign, onStartDialing, onUpdated }: CampaignCardProps) {
  const { id, name, total_leads, leads_called, status } = campaign;
  const progress = total_leads > 0 ? (leads_called / total_leads) * 100 : 0;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const [newName, setNewName] = useState(name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === name) {
      setIsRenameOpen(false);
      return;
    }
    
    setIsSimulating(true);
    try {
      await campaignsApi.rename(id, newName.trim());
      toast.success('Campaign renamed successfully');
      setIsRenameOpen(false);
      onUpdated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename campaign');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDelete = async () => {
    setIsSimulating(true);
    try {
      await campaignsApi.delete(id);
      toast.success('Campaign deleted successfully');
      setIsDeleteOpen(false);
      onUpdated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete campaign');
    } finally {
      setIsSimulating(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    paused: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    completed: 'text-zinc-400 bg-zinc-800/50 border-white/5',
    draft: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };

  return (
    <>
      <div className="bg-[#1A1A1E]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors flex flex-col gap-4 relative">
        <div className="flex items-start justify-between">
          <div>
            <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border mb-3 ${statusColors[status] || statusColors.draft}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">{name}</h3>
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[#1E1E22] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 py-1"
                >
                  <button
                    onClick={() => { setIsMenuOpen(false); setNewName(name); setIsRenameOpen(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <Edit2 className="h-4 w-4" /> Rename Campaign
                  </button>
                  <button
                    onClick={() => { setIsMenuOpen(false); setIsDeleteOpen(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors text-left font-medium"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Campaign
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 font-medium">Progress</span>
            <span className="text-white font-medium">{leads_called} / {total_leads}</span>
          </div>
          <div className="h-2 w-full bg-black/50 overflow-hidden rounded-full">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-2 mt-auto">
          <button
            disabled={status === 'completed'}
            onClick={() => onStartDialing?.(id)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all ${
              status === 'completed'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : status === 'active'
                  ? 'bg-amber-500 hover:bg-amber-400 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]'
            }`}
          >
            {status === 'active' ? (
              <><Pause className="h-4 w-4 fill-current" /> Pause</>
            ) : (
              <><Play className="h-4 w-4 fill-current" /> Start Dialing</>
            )}
          </button>
        </div>
      </div>

      {/* Rename Modal */}
      <AnimatePresence>
        {isRenameOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Rename Campaign</h2>
                <button 
                  onClick={() => setIsRenameOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleRename}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Campaign Name</label>
                    <input
                      required
                      maxLength={100}
                      type="text"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRenameOpen(false)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSimulating || !newName.trim() || newName === name}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1A1E] border border-rose-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-16 opacity-5 bg-gradient-to-br from-rose-500 to-transparent -rotate-12 translate-x-10 -translate-y-10 rounded-full" />
              
              <div className="relative">
                <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                  <Trash2 className="h-6 w-6 text-rose-500" />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">Delete Campaign?</h2>
                <p className="text-zinc-400 mb-6 leading-relaxed">
                  Are you absolutely sure you want to delete <span className="text-white font-medium">"{name}"</span>? 
                  This will permanently erase all associated leads, call dispositions, and dialing history. This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSimulating}
                    className="flex-1 bg-rose-500 hover:bg-rose-400 disabled:bg-rose-500/50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete It'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
