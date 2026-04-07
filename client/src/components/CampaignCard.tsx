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
    active: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    paused: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    completed: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700',
    draft: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700',
  };

  return (
    <>
      <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6 transition-all duration-200 hover:shadow-md flex flex-col gap-4 relative">
        <div className="flex items-start justify-between">
          <div>
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] uppercase font-semibold tracking-wider border mb-3 ${statusColors[status] || statusColors.draft}`}>
              {status}
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">{name}</h3>
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1F1F23]"
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
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg overflow-hidden z-20 py-1"
                >
                  <button
                    onClick={() => { setIsMenuOpen(false); setNewName(name); setIsRenameOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground tracking-body hover:bg-muted transition-colors text-left"
                  >
                    <Edit2 className="h-4 w-4" /> Rename Campaign
                  </button>
                  <button
                    onClick={() => { setIsMenuOpen(false); setIsDeleteOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-500 tracking-body hover:bg-rose-500/10 transition-colors text-left font-medium"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Campaign
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Progress</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">{leads_called} / {total_leads}</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden rounded-full">
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-2 mt-auto">
          <button
            disabled={status === 'completed'}
            onClick={() => onStartDialing?.(id)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm ${
              status === 'completed'
                ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : status === 'active'
                  ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-sm'
                  : 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm'
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
              className="bg-surface border border-black/10 dark:border-white/10 rounded-[1.5rem] p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Rename Campaign</h2>
                <button 
                  onClick={() => setIsRenameOpen(false)}
                  className="text-muted-foreground text-opacity-70 hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleRename}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Campaign Name</label>
                    <input
                      required
                      maxLength={100}
                      type="text"
                      className="w-full bg-background border border-black/10 dark:border-white/10 rounded-[0.85rem] px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all shadow-sm"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRenameOpen(false)}
                      className="flex-1 bg-muted hover:bg-black/5 dark:hover:bg-white/5 text-foreground py-2.5 rounded-[0.85rem] font-medium transition-colors tracking-body text-sm border border-black/5 dark:border-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSimulating || !newName.trim() || newName === name}
                      className="flex-1 bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-[0.85rem] font-medium transition-all flex items-center justify-center gap-2 shadow-sm tracking-body text-sm"
                    >
                      {isSimulating ? <Loader2 className="h-4 w-4 animate-spin text-background" /> : 'Save Changes'}
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
              className="bg-surface border border-rose-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-16 opacity-5 bg-gradient-to-br from-rose-500 to-transparent -rotate-12 translate-x-10 -translate-y-10 rounded-full" />
              
              <div className="relative">
                <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                  <Trash2 className="h-6 w-6 text-rose-500" />
                </div>
                
                <h2 className="text-xl font-bold text-foreground mb-2">Delete Campaign?</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Are you absolutely sure you want to delete <span className="text-foreground font-medium">"{name}"</span>? 
                  This will permanently erase all associated leads, call dispositions, and dialing history. This action cannot be undone.
                </p>

                <div className="flex gap-3">
                    <button
                      onClick={() => setIsDeleteOpen(false)}
                      className="flex-1 bg-muted hover:bg-black/5 dark:hover:bg-white/5 text-foreground py-2.5 rounded-[0.85rem] font-medium transition-colors tracking-body text-sm border border-black/5 dark:border-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSimulating}
                      className="flex-1 bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-[0.85rem] font-medium transition-colors flex items-center justify-center gap-2 tracking-body text-sm shadow-sm border border-rose-500/20"
                    >
                      {isSimulating ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Yes, Delete It'}
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
