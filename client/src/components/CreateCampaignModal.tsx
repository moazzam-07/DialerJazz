import { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, Upload, Users, Loader2, CheckCircle2, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { campaignsApi, leadsApi, type Lead } from '@/lib/api';
import { DialerModeSelect } from '@/components/ui/dialer-mode-select';

type Step = 'details' | 'source' | 'import_crm' | 'upload_csv' | 'success';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCampaignModal({ isOpen, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('details');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  
  // Details State
  const [name, setName] = useState('');
  const [dialerMode, setDialerMode] = useState('preview');
  const [isCreating, setIsCreating] = useState(false);

  // CRM Import State
  const [crmLeads, setCrmLeads] = useState<Lead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isFetchingCrm, setIsFetchingCrm] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // CSV State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setCampaignId(null);
      setName('');
      setDialerMode('preview');
      setSelectedLeadIds(new Set());
      setCsvFile(null);
      setUploadProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Campaign name required');
    
    setIsCreating(true);
    try {
      const { data } = await campaignsApi.create({ name: name.trim(), dialer_mode: dialerMode });
      // Depending on API response structure, usually data is the created campaign or data[0] if array
      const createdId = Array.isArray(data) ? data[0].id : (data as any).id;
      setCampaignId(createdId);
      toast.success('Campaign created. Now add leads!');
      setStep('source');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFetchCrmLeads = async () => {
    setIsFetchingCrm(true);
    setStep('import_crm');
    try {
      const { data } = await leadsApi.listAll({ limit: 1000 });
      setCrmLeads(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load CRM leads');
      setStep('source');
    } finally {
      setIsFetchingCrm(false);
    }
  };

  const handleAssignCrmLeads = async () => {
    if (!campaignId) return;
    if (selectedLeadIds.size === 0) return toast.error('Select at least one lead');
    
    setIsAssigning(true);
    try {
      // Direct call to the assign endpoint we created earlier
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/leads/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          lead_ids: Array.from(selectedLeadIds)
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to assign leads');
      
      toast.success(`Assigned ${json.count} leads to campaign`);
      setStep('success');
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCsvUploadClick = () => {
    setStep('upload_csv');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const processCsvAndUpload = () => {
    if (!csvFile || !campaignId) return;
    setIsUploading(true);
    setUploadProgress(10);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: async (results: Papa.ParseResult<Record<string, unknown>>) => {
        setUploadProgress(40);
        
        try {
          const rawRows = results.data;
          
          // Map to standard lead fields
          // Users might have different headers, so we do basic guessing
          const parsedLeads = rawRows.map(row => {
            const phone = row.phone || row.phone_number || row.mobile || row.contact || '';
            const email = row.email || row.email_address || '';
            const first_name = row.first_name || row.firstname || (typeof row.name === 'string' ? row.name.split(' ')[0] : '') || '';
            const last_name = row.last_name || row.lastname || (typeof row.name === 'string' ? row.name.split(' ').slice(1).join(' ') : '') || '';
            const company = row.company || row.company_name || row.business || '';

            return {
              phone: String(phone).replace(/[^0-9+]/g, ''),
              email: String(email),
              first_name: String(first_name),
              last_name: String(last_name),
              company: String(company),
              city: String(row.city || ''),
              state: String(row.state || ''),
              status: 'new',
              priority: 0,
              // Put everything else in custom fields to avoid column errors
              custom_fields: Object.keys(row)
                .filter(k => !['phone','mobile','email','first_name','last_name','name','company','city','state'].includes(k))
                .reduce((obj, key) => { obj[key] = row[key]; return obj; }, {} as Record<string,any>)
            };
          }).filter(l => l.phone.length > 5); // Must have a reasonable phone number

          if (parsedLeads.length === 0) {
            throw new Error('No valid rows with phone numbers found in CSV.');
          }

          setUploadProgress(70);

          // Submit to Bulk API
          await leadsApi.bulkUpload(campaignId, parsedLeads);
          
          setUploadProgress(100);
          toast.success(`Imported ${parsedLeads.length} leads successfully!`);
          setStep('success');
          onCreated();

        } catch (err: any) {
          toast.error(err.message || 'Failed to process CSV');
        } finally {
          setIsUploading(false);
        }
      },
      error: (error: Error) => {
        toast.error(`CSV Parsing Error: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 'success' ? onClose : undefined} />
      
      <div className="relative bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'details' && step !== 'success' && (
              <button onClick={() => step.includes('import') || step.includes('upload') ? setStep('source') : null} className="text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl font-bold text-white">
              {step === 'details' ? 'Create New Campaign' : 
               step === 'source' ? 'Add Leads' : 
               step === 'import_crm' ? 'Select CRM Leads' :
               step === 'upload_csv' ? 'Upload Spreadsheets' : 
               'Campaign Ready!'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Details */}
        {step === 'details' && (
          <form onSubmit={handleCreateDetails} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Campaign Name</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Q4 Outreach Strategy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Dialer Mode</label>
              <DialerModeSelect 
                value={dialerMode}
                onChange={setDialerMode}
              />
            </div>
            <div className="flex justify-end pt-4 border-t border-white/5">
              <button 
                type="submit" 
                disabled={isCreating || !name.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Continue <ChevronRight className="h-4 w-4 inline" /></span>}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Choose Source */}
        {step === 'source' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleFetchCrmLeads} className="flex flex-col items-center text-center p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 transition-all group">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Import from CRM</h3>
              <p className="text-sm text-zinc-400">Select leads already mapped in your global directory.</p>
            </button>
            <button onClick={handleCsvUploadClick} className="flex flex-col items-center text-center p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 transition-all group">
              <div className="h-14 w-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload CSV</h3>
              <p className="text-sm text-zinc-400">Map new leads from a spreadsheet instantly.</p>
            </button>
          </div>
        )}

        {/* Step 3a: Import from CRM */}
        {step === 'import_crm' && (
          <div className="flex flex-col h-full overflow-hidden">
            {isFetchingCrm ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
            ) : (
              <>
                <div className="relative mb-4 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    placeholder="Search by name or company..."
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-xl bg-black/20 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="overflow-y-auto flex-1 min-h-[300px] border border-white/5 rounded-xl bg-black/20">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="sticky top-0 bg-[#1A1A1E] text-xs uppercase text-zinc-500 border-b border-white/5 shadow">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input 
                            type="checkbox" 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeadIds(new Set(crmLeads.map(l => l.id)));
                              } else {
                                setSelectedLeadIds(new Set());
                              }
                            }}
                            checked={selectedLeadIds.size > 0 && selectedLeadIds.size === crmLeads.length}
                            className="rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Company</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {crmLeads
                        .filter(l => (l.first_name || l.company)?.toLowerCase().includes(crmSearch.toLowerCase()))
                        .map(lead => (
                        <tr key={lead.id} className="hover:bg-white/5 cursor-pointer" onClick={() => {
                          const newSet = new Set(selectedLeadIds);
                          if (newSet.has(lead.id)) newSet.delete(lead.id);
                          else newSet.add(lead.id);
                          setSelectedLeadIds(newSet);
                        }}>
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              checked={selectedLeadIds.has(lead.id)}
                              readOnly
                              className="rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-white">{lead.first_name} {lead.last_name}</td>
                          <td className="px-4 py-3">{lead.phone}</td>
                          <td className="px-4 py-3 text-emerald-400">{lead.company}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-6 shrink-0 pt-4 border-t border-white/5">
                  <span className="text-sm text-zinc-400">{selectedLeadIds.size} leads selected</span>
                  <button 
                    onClick={handleAssignCrmLeads}
                    disabled={selectedLeadIds.size === 0 || isAssigning}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Import Selected</span>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3b: Upload CSV */}
        {step === 'upload_csv' && (
          <div className="space-y-6">
            <div 
              className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 rounded-2xl p-10 text-center transition-colors bg-white/5 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
              />
              <Upload className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
              <p className="text-white font-medium mb-1">
                {csvFile ? csvFile.name : 'Click to upload your CSV'}
              </p>
              <p className="text-sm text-zinc-500">
                Ensure it has a "Phone" or "Mobile" column.
              </p>
            </div>
            
            {csvFile && (
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">File Selected: {csvFile.name}</span>
                  <span className="text-xs text-zinc-500">{(csvFile.size / 1024).toFixed(1)} KB</span>
                </div>
                
                {isUploading && (
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button 
                    onClick={processCsvAndUpload}
                    disabled={isUploading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors w-full justify-center"
                  >
                    {isUploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <>Read & Import CSV</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center py-10">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Campaign Ready!</h2>
            <p className="text-zinc-400 mb-8 max-w-sm mx-auto">
              Your leads have been successfully mapped and the campaign is queued for dialing.
            </p>
            <button 
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
