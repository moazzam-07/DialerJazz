import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Play, Pause, CheckCircle2, Save, RefreshCw, MousePointerClick, Zap, Phone, Server } from 'lucide-react';
import { toast } from 'sonner';
import Select from '@/components/ui/select';
import { campaignsApi, settingsApi, type Campaign, type UserSettings } from '@/lib/api';

export default function CampaignManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable config state
  const [dialerMode, setDialerMode] = useState<string>('click');
  const [provider, setProvider] = useState<'telnyx' | 'twilio'>('telnyx');
  const [callerNumber, setCallerNumber] = useState<string>('');

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [campaignRes, settingsRes] = await Promise.all([
          campaignsApi.get(id),
          settingsApi.get()
        ]);
        const camp = campaignRes.data;
        setCampaign(camp);
        setSettings(settingsRes.data);

        setDialerMode(camp.dialer_mode || 'click');
        setProvider(camp.provider || 'telnyx');
        setCallerNumber(camp.caller_number || '');
        
      } catch (err: any) {
        toast.error(err.message || 'Failed to load campaign');
        navigate('/campaigns');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  const isLocked = campaign?.status !== 'draft';

  const handleSaveConfig = async () => {
    if (!id || isLocked) return;
    setIsSaving(true);
    try {
      const res = await campaignsApi.updateConfig(id, {
        dialer_mode: dialerMode,
        provider,
        caller_number: callerNumber || null
      });
      setCampaign(res.data);
      toast.success('Configuration saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const dialerModeData = [
    {
      id: '1',
      label: 'Click-to-Call',
      value: 'click',
      description: 'Manual control. Click to dial leads.',
      icon: <MousePointerClick className="w-5 h-5" />
    },
    {
      id: '2',
      label: 'Power Dialer',
      value: 'power',
      description: 'Automated dialing. Speeds up workflow.',
      icon: <Zap className="w-5 h-5" />
    }
  ];

  const providerData = [
    {
      id: '1',
      label: 'Telnyx',
      value: 'telnyx',
      description: 'Use Telnyx WebRTC for connectivity.',
      icon: <Server className="w-5 h-5" />
    },
    {
      id: '2',
      label: 'Twilio',
      value: 'twilio',
      description: 'Use Twilio WebRTC for connectivity.',
      icon: <Phone className="w-5 h-5" />
    }
  ];

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'completed') => {
    if (!id) return;
    try {
      // If launching for the first time, save config first
      if (campaign?.status === 'draft' && newStatus === 'active') {
        await campaignsApi.updateConfig(id, {
          dialer_mode: dialerMode,
          provider,
          caller_number: callerNumber || null
        });
      }

      const res = await campaignsApi.updateStatus(id, newStatus);
      setCampaign(res.data);
      toast.success(`Campaign marked as ${newStatus}`);

      // If active, jump straight to dialer usually, but user can choose to stay.
      // E.g. Outreach jumps you into the dialer window. Snov.io starts it in the background. 
      // We will jump to dialer for 'Launch'
      if (newStatus === 'active') {
        navigate(`/campaigns/${id}/dial`);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to mark as ${newStatus}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  const progressPercentage = campaign.total_leads > 0 
    ? Math.round((campaign.leads_called / campaign.total_leads) * 100) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/campaigns')} 
          className="p-2 bg-muted rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold tracking-display text-foreground flex items-center gap-3">
            {campaign.name}
            <span className={`text-xs px-2.5 py-1 rounded-md uppercase font-bold tracking-widest ${
              campaign.status === 'active' ? 'bg-foreground text-background' :
              campaign.status === 'paused' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
              campaign.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
              'bg-muted text-muted-foreground border border-border'
            }`}>
              {campaign.status}
            </span>
          </h1>
          <p className="text-muted-foreground tracking-body mt-1">Manage settings and launch your calling sequence.</p>
        </div>
      </div>

      {/* Progress & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
           <h3 className="text-sm font-medium text-muted-foreground mb-1">Progress</h3>
           <div className="flex items-baseline gap-2 mb-2">
             <span className="text-2xl font-bold font-mono">{progressPercentage}%</span>
           </div>
           <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-foreground rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
           <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Leads</h3>
           <span className="text-2xl font-bold font-mono">{campaign.total_leads}</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
           <h3 className="text-sm font-medium text-muted-foreground mb-1">Leads Called</h3>
           <span className="text-2xl font-bold font-mono">{campaign.leads_called}</span>
        </div>
      </div>

      {/* Main Actions Panel */}
      <div className="bg-surface border border-black/5 dark:border-white/5 rounded-[1.5rem] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
         <div>
            <h2 className="text-lg font-bold text-foreground mb-1">Campaign Status Controls</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {campaign.status === 'draft' && "Launch the campaign to lock in the settings and start dialing leads."}
              {campaign.status === 'active' && "Campaign is currently active. You can pause it if you need a break."}
              {campaign.status === 'paused' && "Campaign is paused. Resume when you are ready to continue dialing."}
              {campaign.status === 'completed' && "Campaign has finished dialing all leads. You can re-run selected outcomes."}
            </p>
         </div>
         <div className="flex gap-3 shrink-0">
           {campaign.status === 'draft' && (
             <button
               onClick={() => handleStatusChange('active')}
               className="bg-foreground text-background hover:opacity-90 px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
             >
               <Play className="h-4 w-4" fill="currentColor" /> Launch Campaign
             </button>
           )}
           {campaign.status === 'active' && (
             <>
               <button
                 onClick={() => handleStatusChange('paused')}
                 className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all"
               >
                 <Pause className="h-4 w-4" fill="currentColor"/> Pause
               </button>
               <button
                 onClick={() => navigate(`/campaigns/${id}/dial`)}
                 className="bg-foreground text-background hover:opacity-90 px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all shadow-black/10"
               >
                 <Play className="h-4 w-4" fill="currentColor" /> Open Dialer
               </button>
             </>
           )}
           {campaign.status === 'paused' && (
             <button
               onClick={() => handleStatusChange('active')}
               className="bg-foreground text-background hover:opacity-90 px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all shadow-black/10"
             >
               <Play className="h-4 w-4" fill="currentColor" /> Resume
             </button>
           )}
           {campaign.status === 'completed' && (
             <button
               disabled
               className="bg-muted text-muted-foreground px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 opacity-50 cursor-not-allowed"
               title="Coming soon"
             >
               <RefreshCw className="h-4 w-4" /> Re-run (Soon)
             </button>
           )}

           {['active', 'paused'].includes(campaign.status) && (
             <button
               onClick={() => {
                 if (confirm('Are you sure you want to mark this campaign as completed?')) {
                   handleStatusChange('completed');
                 }
               }}
               className="bg-muted hover:bg-black/5 dark:hover:bg-white/5 border border-border text-foreground px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all"
               title="Mark as completed"
             >
               <CheckCircle2 className="h-4 w-4" /> 
             </button>
           )}
         </div>
      </div>

      {/* Configuration Settings */}
      <div className="bg-surface border border-black/5 dark:border-white/5 rounded-[1.5rem] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Configuration</h2>
            <p className="text-sm text-muted-foreground">
              {isLocked 
                ? "Settings are locked because the campaign is no longer in Draft." 
                : "Configure how calls will be routed and dialed."}
            </p>
          </div>
          {!isLocked && (
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="px-5 py-2.5 bg-foreground hover:opacity-90 text-background rounded-[0.85rem] text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Confirm Setup
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
           <div className="space-y-2">
            <Select 
              title="Dialer Mode"
              data={dialerModeData}
              defaultValue={dialerMode}
              onChange={setDialerMode}
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2">
            <Select 
              title="Provider"
              data={providerData}
              defaultValue={provider}
              onChange={(val) => setProvider(val as 'telnyx' | 'twilio')}
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2 sm:col-span-2 mt-4">
            <label className="text-sm font-medium text-foreground">Outbound Caller ID (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  provider === 'telnyx' 
                    ? (settings?.telnyx_caller_number || '+1234567890')
                    : (settings?.twilio_caller_number || '+1234567890')
                }
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                disabled={isLocked}
                className="flex-1 h-12 bg-surface hover:bg-black-[0.02] dark:hover:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-[0.85rem] px-4 text-sm focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-muted-foreground/60 transition-colors"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If left blank, uses the default number configured in Connectors for the selected provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
