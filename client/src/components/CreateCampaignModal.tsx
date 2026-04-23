import { useState, useRef, useEffect, useMemo } from 'react';
import { X, ChevronRight, Upload, Users, Loader2, CheckCircle2, ArrowLeft, Search, FileSpreadsheet, ArrowRight, Columns3, Sparkles, AlertTriangle, Phone, User, Mail, Building2, MapPin, Globe, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { campaignsApi, leadsApi, type Lead } from '@/lib/api';
import { DialerModeSelect } from '@/components/ui/dialer-mode-select';
import { ProviderSelect } from '@/components/ui/provider-select';
import { AnimatedSelect, type AnimatedSelectOption } from '@/components/AnimatedSelect';

type Step = 'details' | 'source' | 'import_crm' | 'upload_csv' | 'map_csv' | 'success';

// ─── System fields that Jazz Caller supports ───────────────────
interface SystemField {
  key: string;
  label: string;
  required: boolean;
  icon: LucideIcon;
  patterns: string[]; // fuzzy match patterns
}

const SYSTEM_FIELDS: SystemField[] = [
  { key: 'phone',      label: 'Phone',      required: true,  icon: Phone,     patterns: ['phone', 'mobile', 'cell', 'tel', 'contact_number', 'telephone', 'contact'] },
  { key: 'first_name', label: 'First Name', required: false, icon: User,      patterns: ['first_name', 'firstname', 'fname', 'first', 'given_name'] },
  { key: 'last_name',  label: 'Last Name',  required: false, icon: User,      patterns: ['last_name', 'lastname', 'lname', 'last', 'surname', 'family_name'] },
  { key: 'email',      label: 'Email',      required: false, icon: Mail,      patterns: ['email', 'email_address', 'e_mail', 'mail'] },
  { key: 'company',    label: 'Company',    required: false, icon: Building2, patterns: ['company', 'business', 'org', 'organization', 'account_name', 'employer', 'company_name'] },
  { key: 'city',       label: 'City',       required: false, icon: MapPin,    patterns: ['city', 'town', 'locality'] },
  { key: 'state',      label: 'State',      required: false, icon: MapPin,    patterns: ['state', 'province', 'region'] },
  { key: 'website',    label: 'Website',    required: false, icon: Globe,     patterns: ['website', 'url', 'web', 'site', 'domain'] },
];

const SKIP_VALUE = '__skip__';

// ─── Fuzzy Match Engine ────────────────────────────────────────
function fuzzyMatch(csvHeader: string, patterns: string[]): number {
  const h = csvHeader.toLowerCase().replace(/[\s\-_]+/g, '');
  for (const p of patterns) {
    const clean = p.replace(/[\s\-_]+/g, '');
    if (h === clean) return 1.0;           // exact
    if (h.includes(clean)) return 0.8;     // substring
    if (clean.includes(h)) return 0.6;     // reverse substring
  }
  // Levenshtein-like similarity for close matches
  for (const p of patterns) {
    const clean = p.replace(/[\s\-_]+/g, '');
    const maxLen = Math.max(h.length, clean.length);
    if (maxLen === 0) continue;
    let common = 0;
    for (let i = 0; i < Math.min(h.length, clean.length); i++) {
      if (h[i] === clean[i]) common++;
    }
    const ratio = common / maxLen;
    if (ratio > 0.7) return ratio * 0.5;
  }
  return 0;
}

function autoMapColumns(csvHeaders: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const usedCsvHeaders = new Set<string>();

  // For each system field, find the best matching CSV header
  for (const field of SYSTEM_FIELDS) {
    let bestScore = 0;
    let bestHeader = '';

    for (const h of csvHeaders) {
      if (usedCsvHeaders.has(h)) continue;
      const score = fuzzyMatch(h, field.patterns);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = h;
      }
    }

    if (bestScore >= 0.4 && bestHeader) {
      map[field.key] = bestHeader;
      usedCsvHeaders.add(bestHeader);
    } else {
      map[field.key] = SKIP_VALUE;
    }
  }

  // Special fallback: if no first_name or last_name mapped, look for a generic "name" column
  if (map['first_name'] === SKIP_VALUE && map['last_name'] === SKIP_VALUE) {
    const nameCol = csvHeaders.find(h => {
      const lc = h.toLowerCase().replace(/[\s\-_]+/g, '');
      return lc === 'name' || lc === 'fullname' || lc === 'contactperson' || lc === 'contactname';
    });
    if (nameCol) {
      map['first_name'] = nameCol;  // We'll split it during import
      map['__name_split__'] = 'true';
    }
  }

  return map;
}

// ─── Props ─────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCampaignModal({ isOpen, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('details');
  
  // Details State
  const [name, setName] = useState('');
  const [dialerMode, setDialerMode] = useState('preview');
  const [provider, setProvider] = useState<'telnyx' | 'twilio' | 'local'>('telnyx');
  const [callerNumber, setCallerNumber] = useState('');

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

  // ─── NEW: Column Mapping State ───────────────────────────────
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [csvPreviewRows, setCsvPreviewRows] = useState<Record<string, any>[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setName('');
      setDialerMode('preview');
      setProvider('telnyx');
      setCallerNumber('');
      setSelectedLeadIds(new Set());
      setCsvFile(null);
      setUploadProgress(0);
      setCsvHeaders([]);
      setColumnMap({});
      setCsvPreviewRows([]);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ALL hooks MUST be called before any early return (Rules of Hooks)
  const csvHeaderOptions: AnimatedSelectOption[] = useMemo(() => {
    return [
      { value: SKIP_VALUE, label: '— Skip this field —' },
      ...csvHeaders.map(h => ({ value: h, label: h }))
    ];
  }, [csvHeaders]);

  // Confidence indicators for each mapping
  const mappingConfidence = useMemo(() => {
    const confidence: Record<string, 'high' | 'medium' | 'low' | 'none'> = {};
    for (const field of SYSTEM_FIELDS) {
      const mappedTo = columnMap[field.key];
      if (!mappedTo || mappedTo === SKIP_VALUE) {
        confidence[field.key] = 'none';
        continue;
      }
      const score = fuzzyMatch(mappedTo, field.patterns);
      if (score >= 0.8) confidence[field.key] = 'high';
      else if (score >= 0.5) confidence[field.key] = 'medium';
      else confidence[field.key] = 'low';
    }
    return confidence;
  }, [columnMap]);

  // Count mapped fields
  const mappedCount = useMemo(() => {
    return Object.values(columnMap).filter(v => v && v !== SKIP_VALUE).length;
  }, [columnMap]);

  const isPhoneMapped = columnMap['phone'] && columnMap['phone'] !== SKIP_VALUE;

  if (!isOpen) return null;

  // ─── Handlers ────────────────────────────────────────────────

  const handleCreateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Campaign name required');
    setStep('source');
  };

  const handleFetchCrmLeads = async () => {
    setIsFetchingCrm(true);
    setStep('import_crm');
    try {
      const { data } = await leadsApi.listAll({ per_page: 100 });
      setCrmLeads(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load CRM leads');
      setStep('source');
    } finally {
      setIsFetchingCrm(false);
    }
  };

  const handleAssignCrmLeads = async () => {
    if (selectedLeadIds.size === 0) return toast.error('Select at least one lead');
    
    setIsAssigning(true);
    try {
      const { data } = await campaignsApi.create({ name: name.trim(), dialer_mode: dialerMode, provider, caller_number: callerNumber || undefined });
      const newCampaignId = Array.isArray(data) ? data[0].id : (data as any).id;

      const { data: resData } = await leadsApi.assignToCampaign(
        newCampaignId,
        Array.from(selectedLeadIds)
      );
      
      toast.success(`Assigned ${resData.count} leads to campaign`);
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

  // ─── NEW: Parse headers only (preview pass) ──────────────────
  const handleParseHeaders = () => {
    if (!csvFile) return;
    setIsParsing(true);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      preview: 5, // Read first 5 rows for header extraction + preview
      transformHeader: (header: string) => header.trim(),
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          toast.error('No columns found in this CSV. Check the file format.');
          setIsParsing(false);
          return;
        }

        setCsvHeaders(headers);
        setCsvPreviewRows(results.data.slice(0, 3) as Record<string, any>[]);

        // Run the fuzzy-match auto-mapper
        const autoMap = autoMapColumns(headers);
        setColumnMap(autoMap);

        setIsParsing(false);
        setStep('map_csv');

        // Notify user about auto-mapping
        const autoMapped = Object.values(autoMap).filter(v => v !== SKIP_VALUE).length;
        if (autoMapped > 0) {
          toast.success(`Smart-matched ${autoMapped} field${autoMapped > 1 ? 's' : ''} automatically!`, {
            icon: '✨',
          });
        }
      },
      error: (error: Error) => {
        toast.error(`CSV Error: ${error.message}`);
        setIsParsing(false);
      }
    });
  };

  // ─── NEW: Final import using confirmed mappings ──────────────
  const handleConfirmAndImport = () => {
    if (!csvFile) return;
    if (!isPhoneMapped) {
      toast.error('Phone number mapping is required!');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: async (results: Papa.ParseResult<Record<string, unknown>>) => {
        setUploadProgress(30);
        
        try {
          const rawRows = results.data as Record<string, any>[];
          const uniquePhones = new Set<string>();
          const parsedLeads: Omit<Lead, 'id' | 'campaign_id' | 'created_at'>[] = [];

          // Determine if we need to split a single "name" column
          const needsNameSplit = columnMap['__name_split__'] === 'true';
          
          for (const row of rawRows) {
            // Use EXPLICIT user-confirmed mappings (not fuzzy guessing)
            const getField = (sysKey: string): string => {
              const csvCol = columnMap[sysKey];
              if (!csvCol || csvCol === SKIP_VALUE) return '';
              return String(row[csvCol] || '').trim();
            };

            const rawPhone = getField('phone');
            const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
            
            // Skip rows without viable phone numbers, and deduplicate
            if (cleanPhone.length < 7 || uniquePhones.has(cleanPhone)) continue;
            uniquePhones.add(cleanPhone);

            let first_name = getField('first_name');
            let last_name = getField('last_name');

            // If we detected a "full name" column, split it
            if (needsNameSplit && first_name && !last_name) {
              const parts = first_name.split(' ');
              first_name = parts[0] || '';
              last_name = parts.slice(1).join(' ') || '';
            }

            const email = getField('email');
            const company = getField('company');
            const city = getField('city');
            const state = getField('state');
            const website = getField('website');

            // Collect unmapped columns into custom_fields
            const mappedCsvCols = new Set(
              Object.values(columnMap).filter(v => v && v !== SKIP_VALUE && v !== 'true')
            );
            const custom_fields: Record<string, any> = {};
            for (const key of Object.keys(row)) {
              if (!mappedCsvCols.has(key)) {
                const val = row[key];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  custom_fields[key] = val;
                }
              }
            }

            parsedLeads.push({
              phone: cleanPhone,
              email,
              first_name,
              last_name,
              company,
              city,
              state,
              website,
              status: 'new',
              priority: 0,
              custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
            } as any);
          }

          if (parsedLeads.length === 0) {
            throw new Error('No valid rows with phone numbers found. Check your Phone mapping.');
          }

          setUploadProgress(60);

          // 1. Create the campaign
          const { data } = await campaignsApi.create({ name: name.trim(), dialer_mode: dialerMode, provider, caller_number: callerNumber || undefined });
          const newCampaignId = Array.isArray(data) ? data[0].id : (data as any).id;

          setUploadProgress(80);

          // 2. Submit to Bulk API
          await leadsApi.bulkUpload(newCampaignId, parsedLeads);
          
          setUploadProgress(100);
          toast.success(`Campaign created with ${parsedLeads.length} leads!`);
          setStep('success');
          onCreated();

        } catch (err: any) {
          toast.error(err.message || 'Failed to import leads');
        } finally {
          setIsUploading(false);
        }
      },
      error: (error: Error) => {
        toast.error(`CSV Error: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  // ─── Step title helper ───────────────────────────────────────
  const getStepTitle = () => {
    switch (step) {
      case 'details': return 'Create New Campaign';
      case 'source': return 'Add Leads';
      case 'import_crm': return 'Select CRM Leads';
      case 'upload_csv': return 'Upload Spreadsheet';
      case 'map_csv': return 'Map Your Columns';
      case 'success': return 'Campaign Ready!';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 'map_csv': return 'Verify how your CSV columns map to Jazz Caller fields';
      default: return undefined;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'source': setStep('details'); break;
      case 'import_crm': setStep('source'); break;
      case 'upload_csv': setStep('source'); break;
      case 'map_csv': setStep('upload_csv'); break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 'success' ? onClose : undefined} />
      
      <motion.div 
        className={`relative bg-background border border-border rounded-3xl p-8 w-full mx-4 shadow-2xl overflow-y-auto flex flex-col max-h-[90vh] transition-all duration-300 ${step === 'map_csv' ? 'max-w-5xl' : 'max-w-2xl'}`}
        style={{ overscrollBehavior: 'none', scrollbarWidth: 'none' }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'details' && step !== 'success' && (
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{getStepTitle()}</h2>
              {getStepSubtitle() && (
                <p className="text-sm text-muted-foreground mt-1">{getStepSubtitle()}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted hover:bg-muted/80 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        {step !== 'success' && (
          <div className="flex items-center gap-1 mb-6 shrink-0">
            {['details', 'source', 'upload_csv', 'map_csv'].map((s, i) => {
              const steps: Step[] = ['details', 'source', 'upload_csv', 'map_csv'];
              const currentIdx = steps.indexOf(step);
              const thisIdx = i;
              const isActive = thisIdx <= currentIdx;
              const isCurrent = s === step;
              // Adjust for CRM path
              if ((step === 'import_crm') && (s === 'upload_csv' || s === 'map_csv')) return null;
              
              return (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`h-2 rounded-full flex-1 transition-all duration-500 ${
                    isActive ? 'bg-primary' : 'bg-muted'
                  } ${isCurrent ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]' : ''}`} />
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: Details */}
        {step === 'details' && (
          <form onSubmit={handleCreateDetails} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Campaign Name</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Q4 Outreach Strategy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Dialer Mode</label>
              <DialerModeSelect 
                value={dialerMode}
                onChange={setDialerMode}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Telephony Provider</label>
              <ProviderSelect 
                value={provider}
                onChange={(val) => setProvider(val as 'telnyx' | 'twilio' | 'local')}
              />
            </div>
            {provider !== 'local' && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Caller ID <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="+1234567890"
                  value={callerNumber}
                  onChange={(e) => setCallerNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm"
                />
              </div>
            )}
            <div className="flex justify-end pt-6 border-t border-border mt-8">
              <button 
                type="submit" 
                disabled={!name.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                <span>Continue <ChevronRight className="h-4 w-4 inline" /></span>
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Choose Source */}
        {step === 'source' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleFetchCrmLeads} className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-muted hover:bg-muted hover:bg-muted/80 hover:border-foreground/50 transition-all group">
              <div className="h-14 w-14 rounded-full bg-foreground/10 text-foreground flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Import from CRM</h3>
              <p className="text-sm text-muted-foreground">Select leads already mapped in your global directory.</p>
            </button>
            <button onClick={handleCsvUploadClick} className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-muted hover:bg-muted hover:bg-muted/80 hover:border-foreground/50 transition-all group">
              <div className="h-14 w-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Upload CSV</h3>
              <p className="text-sm text-muted-foreground">Map new leads from a spreadsheet instantly.</p>
            </button>
          </div>
        )}

        {/* Step 3a: Import from CRM */}
        {step === 'import_crm' && (
          <div className="flex flex-col h-full overflow-hidden">
            {isFetchingCrm ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-foreground" /></div>
            ) : (
              <>
                <div className="relative mb-4 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-opacity-70" />
                  <input
                    placeholder="Search by name or company..."
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-black/20 text-sm text-foreground focus:outline-none"
                  />
                </div>
                <div className="overflow-y-auto flex-1 min-h-[300px] border border-border rounded-xl bg-black/20">
                  <table className="w-full text-left text-sm text-foreground text-opacity-90">
                    <thead className="sticky top-0 bg-surface text-xs uppercase text-muted-foreground text-opacity-70 border-b border-border shadow">
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
                            className="rounded border-white/20 bg-black/50 text-foreground focus:ring-foreground"
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
                        <tr key={lead.id} className="hover:bg-muted cursor-pointer" onClick={() => {
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
                              className="rounded border-white/20 bg-black/50 text-foreground focus:ring-foreground"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{lead.first_name} {lead.last_name}</td>
                          <td className="px-4 py-3">{lead.phone}</td>
                          <td className="px-4 py-3 text-muted-foreground">{lead.company}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-6 shrink-0 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">{selectedLeadIds.size} leads selected</span>
                  <button 
                    onClick={handleAssignCrmLeads}
                    disabled={selectedLeadIds.size === 0 || isAssigning}
                    className="bg-foreground hover:bg-foreground/90 text-background px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
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
              className="border-2 border-dashed border-zinc-700 hover:border-foreground/50 rounded-2xl p-10 text-center transition-colors bg-muted cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
              />
              <Upload className="h-10 w-10 text-muted-foreground text-opacity-70 mx-auto mb-4" />
              <p className="text-foreground font-medium mb-1">
                {csvFile ? csvFile.name : 'Click to upload your CSV'}
              </p>
              <p className="text-sm text-muted-foreground text-opacity-70">
                Supports exports from Apollo, ZoomInfo, Uplead, and any standard CSV.
              </p>
            </div>
            
            {csvFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/30 p-4 rounded-xl border border-border space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-foreground" />
                    <span className="text-sm text-foreground text-opacity-90 font-medium">{csvFile.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-opacity-70">{(csvFile.size / 1024).toFixed(1)} KB</span>
                </div>
                
                <div className="flex justify-end">
                  <button 
                    onClick={handleParseHeaders}
                    disabled={isParsing}
                    className="bg-foreground hover:bg-foreground/90 text-background px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors w-full justify-center"
                  >
                    {isParsing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing columns...</>
                    ) : (
                      <>
                        <Columns3 className="h-4 w-4" />
                        Analyze & Map Columns
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            Step 3c: MAP COLUMNS — Two-panel layout (mapping | preview)
            ═══════════════════════════════════════════════════════ */}
        {step === 'map_csv' && (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Status bar */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-3 border border-border"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground text-opacity-90">
                  <span className="text-muted-foreground font-semibold">{mappedCount}</span> of {SYSTEM_FIELDS.length} fields mapped
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-opacity-70">{csvHeaders.length} CSV columns detected</span>
            </motion.div>

            {/* Phone Required Warning */}
            {!isPhoneMapped && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5"
              >
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">Phone mapping is required to import leads.</span>
              </motion.div>
            )}

            {/* ─── Two-Panel Layout: Mapping (left) | Preview (right) on desktop ─── */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

              {/* LEFT PANEL: Mapping Grid */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[400px] lg:max-h-none" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
                  <AnimatePresence>
                    {SYSTEM_FIELDS.map((field, index) => {
                      const confidence = mappingConfidence[field.key];
                      const FieldIcon = field.icon;
                      const confidenceColor = {
                        high: 'bg-foreground/15 border-foreground/30',
                        medium: 'bg-amber-500/10 border-amber-500/20', 
                        low: 'bg-orange-500/10 border-orange-500/20',
                        none: 'bg-white/[0.03] border-border',
                      }[confidence];
                      const confidenceDot = {
                        high: 'bg-foreground/90',
                        medium: 'bg-amber-400',
                        low: 'bg-orange-400',
                        none: 'bg-zinc-600',
                      }[confidence];

                      return (
                        <motion.div
                          key={field.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all hover:bg-white/[0.04] ${confidenceColor}`}
                        >
                          {/* System field label */}
                          <div className="flex items-center gap-2.5 min-w-[130px]">
                            <FieldIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">{field.label}</span>
                              {field.required && (
                                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">REQ</span>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground text-opacity-70 flex-shrink-0" />

                          {/* AnimatedSelect Dropdown */}
                          <div className="flex-1 min-w-0">
                            <AnimatedSelect
                              options={csvHeaderOptions}
                              value={columnMap[field.key] || SKIP_VALUE}
                              onChange={(val) => {
                                setColumnMap(prev => ({ ...prev, [field.key]: val }));
                              }}
                              placeholder="Select CSV column..."
                            />
                          </div>

                          {/* Confidence dot */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className={`h-2 w-2 rounded-full ${confidenceDot}`} />
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground text-opacity-70">{confidence}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT PANEL: Data Preview (beside on desktop, below on mobile) */}
              {csvPreviewRows.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="lg:w-[380px] flex-shrink-0 bg-black/30 rounded-xl border border-border overflow-hidden flex flex-col"
                >
                  <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Preview</span>
                    <span className="text-xs text-muted-foreground text-opacity-50">• First 3 rows</span>
                  </div>
                  <div className="overflow-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#111113]">
                        <tr className="border-b border-border">
                          {SYSTEM_FIELDS.filter(f => columnMap[f.key] && columnMap[f.key] !== SKIP_VALUE).map(f => {
                            const Icon = f.icon;
                            return (
                              <th key={f.key} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">
                                <span className="inline-flex items-center gap-1"><Icon className="h-3 w-3" /> {f.label}</span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                            {SYSTEM_FIELDS.filter(f => columnMap[f.key] && columnMap[f.key] !== SKIP_VALUE).map(f => (
                              <td key={f.key} className="px-3 py-2 text-foreground text-opacity-90 whitespace-nowrap max-w-[140px] truncate">
                                {String(row[columnMap[f.key]] || '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer: Change file & Import */}
            <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
              <button
                onClick={() => setStep('upload_csv')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Change file
              </button>
              <button 
                onClick={handleConfirmAndImport}
                disabled={!isPhoneMapped || isUploading}
                className="bg-foreground hover:bg-foreground/90 text-background px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Import
                  </>
                )}
              </button>
            </div>

            {/* Progress bar during import */}
            {isUploading && (
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-foreground h-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center py-10">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-foreground/20 text-foreground mb-6 relative"
            >
              <div className="absolute inset-0 rounded-full bg-foreground/20 animate-ping" />
              <CheckCircle2 className="h-10 w-10" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Campaign Ready!</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Your leads have been successfully mapped and the campaign is queued for dialing.
            </p>
            <button 
              onClick={onClose}
              className="bg-muted hover:bg-muted/80 hover:bg-white/20 text-foreground px-8 py-3 rounded-xl font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
