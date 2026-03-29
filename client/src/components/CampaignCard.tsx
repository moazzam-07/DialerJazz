import { Play, Pause, MoreHorizontal } from 'lucide-react';
import type { Campaign } from '@/lib/api';

interface CampaignCardProps {
  campaign: Campaign;
  onStartDialing?: (id: string) => void;
}

export default function CampaignCard({ campaign, onStartDialing }: CampaignCardProps) {
  const { id, name, total_leads, leads_called, status } = campaign;
  const progress = total_leads > 0 ? (leads_called / total_leads) * 100 : 0;

  const statusColors: Record<string, string> = {
    active: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    paused: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    completed: 'text-zinc-400 bg-zinc-800/50 border-white/5',
    draft: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };

  return (
    <div className="bg-[#1A1A1E]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border mb-3 ${statusColors[status] || statusColors.draft}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
          <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">{name}</h3>
        </div>
        <button className="text-zinc-500 hover:text-white transition-colors p-1">
          <MoreHorizontal className="h-5 w-5" />
        </button>
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
  );
}
