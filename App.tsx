import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  ClipboardList, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  BrainCircuit,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Dumbbell,
  LifeBuoy,
  Save,
  Calendar,
  FolderOpen,
  Stethoscope,
  AlertCircle,
  Download,
  Upload,
  Waves,
  MessageSquare,
  Send,
  Info,
  Zap,
  Check
} from 'lucide-react';
import { Player, ViewState, SkillCategory, SkillLevel, PracticePlan, CustomSkill, Drill } from './types';
import { INITIAL_ROSTER, POSITIONS, SKILL_CATEGORIES_LIST } from './constants';
import { generatePracticePlan, askCoachQuestion, generateAdditionalDrill } from './services/geminiService';
import SkillRadar from './components/SkillRadar';

interface ChatMessage {
  role: 'user' | 'coach';
  text: string;
  suggestedDrill?: Drill | null;
  addedToPlan?: boolean;
}

const App = () => {
  const [view, setView] = useState<ViewState>('roster');
  const [roster, setRoster] = useState<Player[]>(INITIAL_ROSTER);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  // Planner States
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<string[]>([]);
  const [selectedConditioningIds, setSelectedConditioningIds] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Chat States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Recovery State
  const [injuryPlayerId, setInjuryPlayerId] = useState<string>('');
  const [injuryIssue, setInjuryIssue] = useState('');
  const [injuryLocation, setInjuryLocation] = useState('');
  const [injurySeverity, setInjurySeverity] = useState<number>(5);
  
  // Plans State
  const [savedPlans, setSavedPlans] = useState<PracticePlan[]>([]);
  const [practicePlan, setPracticePlan] = useState<PracticePlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // New Player Form State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState(POSITIONS[0]);

  // Custom Skill Form State
  const [newCustomSkill, setNewCustomSkill] = useState('');
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Handlers
  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName,
      position: newPlayerPos,
      skills: SKILL_CATEGORIES_LIST.reduce((acc, cat) => ({
        ...acc,
        [cat]: 3
      }), {} as Record<SkillCategory, SkillLevel>),
      customSkills: []
    };
    setRoster([...roster, newPlayer]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setRoster(roster.filter(p => p.id !== id));
    if (selectedPlayerId === id) setSelectedPlayerId(null);
    setSelectedIndividualIds(selectedIndividualIds.filter(pid => pid !== id));
    setSelectedConditioningIds(selectedConditioningIds.filter(pid => pid !== id));
    if (injuryPlayerId === id) setInjuryPlayerId('');
  };

  const updateSkill = (playerId: string, category: SkillCategory, level: SkillLevel) => {
    setRoster(roster.map(p => {
      if (p.id !== playerId) return p;
      return { ...p, skills: { ...p.skills, [category]: level } };
    }));
  };

  const handleGenerate = async (mode: 'team' | 'individual' | 'conditioning' | 'recovery' | 'custom') => {
    if (roster.length === 0) {
      setGenerationError("Roster is empty.");
      return;
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    setPracticePlan(null);
    setChatHistory([]);

    try {
      let focusGroup: Player[] | undefined = undefined;
      let context = '';

      if (mode === 'individual') focusGroup = roster.filter(p => selectedIndividualIds.includes(p.id));
      else if (mode === 'conditioning') focusGroup = roster.filter(p => selectedConditioningIds.includes(p.id));
      else if (mode === 'custom') context = customPrompt;
      else if (mode === 'recovery') {
        if (!injuryIssue.trim() || !injuryLocation.trim()) {
           setGenerationError("Please describe the injury and location.");
           setIsGenerating(false);
           return;
        }
        if (injuryPlayerId) focusGroup = roster.filter(p => p.id === injuryPlayerId);
        context = `${injuryIssue} in ${injuryLocation}`;
      }

      const plan = await generatePracticePlan(roster, mode, focusGroup, context, mode === 'recovery' ? injurySeverity : undefined);
      if (plan) {
        plan.id = Date.now().toString();
        plan.createdAt = Date.now();
        plan.type = mode;
        plan.participants = focusGroup ? focusGroup.map(p => p.name) : (mode === 'recovery' ? ['Injured Player'] : ['Team']);
        setPracticePlan(plan);
        setView('results');
      } else {
        setGenerationError("Failed to generate plan.");
      }
    } catch (err) {
      setGenerationError("An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAskCoach = async () => {
    if (!currentQuestion.trim() || !practicePlan) return;
    
    const userQ = currentQuestion;
    setCurrentQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', text: userQ }]);
    setIsAsking(true);

    const answer = await askCoachQuestion(practicePlan, userQ);
    setChatHistory(prev => [...prev, { role: 'coach', text: answer }]);
    setIsAsking(false);
  };

  const handleRequestSuggestion = async (type: 'warmup' | 'finisher' | 'skill' | 'extra') => {
    if (!practicePlan) return;
    
    const labels = { warmup: 'Warmup', finisher: 'Finisher', skill: 'Skill Drill', extra: 'Extra Exercise' };
    setChatHistory(prev => [...prev, { role: 'user', text: `Coach, can you suggest an additional ${labels[type]}?` }]);
    setIsAsking(true);

    const drill = await generateAdditionalDrill(practicePlan, type);
    if (drill) {
      setChatHistory(prev => [...prev, { 
        role: 'coach', 
        text: `Based on your current plan, I've designed this ${labels[type]} for the team. Would you like to add it to today's session?`,
        suggestedDrill: drill
      }]);
    } else {
      setChatHistory(prev => [...prev, { role: 'coach', text: "I couldn't draw up a new drill right now. Let's focus on the existing ones!" }]);
    }
    setIsAsking(false);
  };

  const handleAddDrillToPlan = (index: number) => {
    const msg = chatHistory[index];
    if (!msg || !msg.suggestedDrill || !practicePlan) return;

    setPracticePlan({
      ...practicePlan,
      drills: [...practicePlan.drills, msg.suggestedDrill]
    });

    setChatHistory(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], addedToPlan: true };
      return copy;
    });
  };

  const saveCurrentPlan = () => {
    if (!practicePlan) return;
    setSavedPlans([practicePlan, ...savedPlans]);
    alert('Plan Saved!');
  };

  const toggleIndividualSelection = (id: string) => {
    setSelectedIndividualIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const toggleConditioningSelection = (id: string) => {
    setSelectedConditioningIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const getAvatarGradient = (name: string) => {
    const gradients = ['from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-orange-400 to-red-500', 'from-purple-400 to-pink-500'];
    return gradients[name.length % gradients.length];
  };

  const groupedRoster = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    POSITIONS.forEach(pos => groups[pos] = []);
    roster.forEach(p => { if (groups[p.position]) groups[p.position].push(p); });
    return groups;
  }, [roster]);

  const SkillRating = ({ current, onChange }: { current: SkillLevel, onChange: (val: SkillLevel) => void }) => (
    <div className="flex items-center space-x-1">
      <button onClick={() => onChange('N/A')} className={`text-[10px] font-bold px-2 py-1 rounded border mr-2 ${current === 'N/A' ? 'bg-slate-200 text-slate-600' : 'bg-white text-slate-300'}`}>N/A</button>
      {[1, 2, 3, 4, 5].map((val) => (
        <button key={val} onClick={() => onChange(val as SkillLevel)} className={`w-6 h-8 rounded-sm border transition-all ${current !== 'N/A' && current >= val ? (val <= 2 ? 'bg-red-400' : val === 3 ? 'bg-yellow-400' : 'bg-green-400') : 'bg-slate-100 opacity-70'}`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-x-hidden">
      <header className="bg-gradient-to-r from-sky-900 via-pool-800 to-pool-700 text-white shadow-lg sticky top-0 z-50 border-b border-pool-600/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setView('roster')}>
            <LifeBuoy className="text-white h-7 w-7" />
            <div>
              <h1 className="text-2xl font-black leading-none text-white">TeamForge</h1>
              <p className="text-xs text-pool-200">Personalized Water Polo AI</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-1">
            {['roster', 'assessment', 'planner', 'recovery', 'plans'].map(id => (
              <button key={id} onClick={() => setView(id as ViewState)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === id ? 'bg-white/10 text-white shadow-inner' : 'text-pool-100 hover:text-white'}`}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 z-10">
        {view === 'roster' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border p-6">
              <h2 className="text-xl font-bold text-pool-900 flex items-center mb-6">
                <Users className="h-6 w-6 mr-3" /> Team Roster
              </h2>
              <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-xl">
                <input type="text" placeholder="Name" className="flex-1 border rounded-lg px-4 py-3" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                <select className="border rounded-lg px-4 py-3 bg-white" value={newPlayerPos} onChange={(e) => setNewPlayerPos(e.target.value)}>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={addPlayer} className="bg-pool-600 text-white px-6 py-3 rounded-lg font-bold flex items-center"><Plus className="mr-2" /> Add</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roster.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-xl border-l-4 border-l-pool-400 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center space-x-4">
                      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getAvatarGradient(p.name)} flex items-center justify-center text-white font-black`}>{p.name.charAt(0)}</div>
                      <p className="font-bold text-slate-800">{p.name} <span className="text-xs font-normal text-slate-400">({p.position})</span></p>
                    </div>
                    <button onClick={() => removePlayer(p.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'assessment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-4 rounded-2xl shadow-lg h-fit max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Roster</h3>
              {roster.map(p => (
                <button key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`w-full text-left p-3 rounded-xl border-l-4 mb-2 transition-all ${selectedPlayerId === p.id ? 'bg-pool-50 border-l-pool-500 shadow-sm' : 'bg-white border-l-transparent hover:bg-slate-50'}`}>
                  <p className="font-bold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.position}</p>
                </button>
              ))}
            </div>
            <div className="lg:col-span-2">
              {selectedPlayerId ? (
                <div className="bg-white rounded-2xl shadow-xl p-6 border animate-in fade-in slide-in-from-right-4">
                  {(() => {
                    const p = roster.find(pl => pl.id === selectedPlayerId)!;
                    return (
                      <>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                          <div>
                            <h3 className="text-3xl font-black text-slate-900">{p.name}</h3>
                            <span className="text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{p.position}</span>
                          </div>
                          <div className="w-full md:w-60 h-60"><SkillRadar player={p} /></div>
                        </div>
                        <div className="space-y-1">
                          {SKILL_CATEGORIES_LIST.map(cat => (
                            <div key={cat} className="flex items-center justify-between py-4 border-b border-slate-50 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                              <span className="text-sm font-bold text-slate-700">{cat}</span>
                              <SkillRating current={p.skills[cat]} onChange={(val) => updateSkill(p.id, cat, val)} />
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200"><Users size={48} className="mb-4 opacity-20" /><p className="font-medium">Select an athlete to begin assessment</p></div>}
            </div>
          </div>
        )}

        {view === 'planner' && (
          <div className="space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Mission Control</h2>
              <p className="text-slate-500">Pick a module to generate an AI-optimized session.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <PlannerCard title="Team Practice" icon={<Users />} desc="Full team session based on roster needs" onClick={() => handleGenerate('team')} disabled={isGenerating} />
              <PlannerCard title="Skill Focus" icon={<BrainCircuit />} desc="Targeted individual work" onClick={() => handleGenerate('individual')} disabled={isGenerating || selectedIndividualIds.length === 0} color="purple">
                <div className="max-h-24 overflow-y-auto mb-4 border rounded-lg p-2 bg-slate-50 custom-scrollbar">
                  {roster.map(p => (
                    <label key={p.id} className="flex items-center space-x-2 text-xs mb-2 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                      <input type="checkbox" className="rounded text-purple-600" checked={selectedIndividualIds.includes(p.id)} onChange={() => toggleIndividualSelection(p.id)} />
                      <span className="font-medium text-slate-600">{p.name}</span>
                    </label>
                  ))}
                </div>
              </PlannerCard>
              <PlannerCard title="Conditioning" icon={<Dumbbell />} desc="Pool and dryland sets" onClick={() => handleGenerate('conditioning')} disabled={isGenerating || selectedConditioningIds.length === 0} color="emerald">
                <div className="max-h-24 overflow-y-auto mb-4 border rounded-lg p-2 bg-slate-50 custom-scrollbar">
                  {roster.map(p => (
                    <label key={p.id} className="flex items-center space-x-2 text-xs mb-2 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                      <input type="checkbox" className="rounded text-emerald-600" checked={selectedConditioningIds.includes(p.id)} onChange={() => toggleConditioningSelection(p.id)} />
                      <span className="font-medium text-slate-600">{p.name}</span>
                    </label>
                  ))}
                </div>
              </PlannerCard>
              <PlannerCard title="AI Command" icon={<MessageSquare />} desc="Type custom requests" onClick={() => handleGenerate('custom')} disabled={isGenerating || !customPrompt.trim()} color="orange">
                <textarea className="w-full text-xs p-3 border rounded-xl mb-4 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-orange-500" rows={4} placeholder="e.g. Focus on transition speed and counter attacks..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
              </PlannerCard>
            </div>
          </div>
        )}

        {view === 'recovery' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-4 bg-red-50 rounded-3xl mb-4 shadow-sm">
                <Stethoscope className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">AI Recovery Hub</h2>
              <p className="text-slate-500 text-lg">Specialized return-to-sport protocols designed by AI coaching.</p>
            </div>

            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 p-8 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-500 to-orange-500"></div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Athlete</label>
                  <select 
                    className="w-full border border-slate-200 rounded-2xl px-6 py-4 bg-slate-50 focus:ring-4 focus:ring-red-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    value={injuryPlayerId}
                    onChange={(e) => setInjuryPlayerId(e.target.value)}
                  >
                    <option value="">-- Manual/Unnamed Protocol --</option>
                    {roster.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Injury / Diagnosis</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Swimmers Shoulder"
                      className="w-full border border-slate-200 rounded-2xl px-6 py-4 bg-slate-50 focus:ring-4 focus:ring-red-500/10 focus:bg-white outline-none transition-all font-medium"
                      value={injuryIssue}
                      onChange={(e) => setInjuryIssue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Specific Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Right Rotator Cuff"
                      className="w-full border border-slate-200 rounded-2xl px-6 py-4 bg-slate-50 focus:ring-4 focus:ring-red-500/10 focus:bg-white outline-none transition-all font-medium"
                      value={injuryLocation}
                      onChange={(e) => setInjuryLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Pain Severity</label>
                    <span className={`text-xl font-black px-4 py-1.5 rounded-xl shadow-sm ${
                      injurySeverity <= 3 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      injurySeverity <= 7 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {injurySeverity} / 10
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1"
                    value={injurySeverity}
                    onChange={(e) => setInjurySeverity(parseInt(e.target.value))}
                    className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest px-1">
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => handleGenerate('recovery')}
                  disabled={isGenerating || !injuryIssue.trim() || !injuryLocation.trim()}
                  className="w-full bg-slate-900 hover:bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isGenerating ? <Activity className="animate-spin" /> : <Stethoscope />} 
                  Generate AI Recovery Protocol
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'results' && practicePlan && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
              <div className={`p-10 text-white relative ${practicePlan.type === 'conditioning' ? 'bg-emerald-600' : practicePlan.type === 'individual' ? 'bg-purple-600' : practicePlan.type === 'custom' ? 'bg-orange-600' : practicePlan.type === 'recovery' ? 'bg-red-600' : 'bg-pool-600'}`}>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{practicePlan.type}</span>
                    <span className="text-white/60 text-xs font-bold">{new Date().toLocaleDateString()}</span>
                  </div>
                  <h1 className="text-4xl font-black mb-3 tracking-tight">{practicePlan.title}</h1>
                  <p className="font-medium text-lg opacity-90 max-w-2xl leading-relaxed">{practicePlan.summary}</p>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  {practicePlan.type === 'recovery' ? <Stethoscope size={120} /> : <Zap size={120} />}
                </div>
              </div>
              
              <div className="p-10 space-y-6 bg-slate-50/50 flex-1 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Execution Plan</h3>
                {practicePlan.drills.map((d, i) => <DrillCard key={i} drill={d} index={i} />)}
              </div>
              
              {/* Coach Chat Corner */}
              <div className="bg-white">
                <div className="px-10 py-6 bg-slate-50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pool-100 text-pool-600 rounded-xl"><MessageSquare size={20} /></div>
                    <div>
                      <h3 className="font-black text-slate-800 leading-none">Coach's Corner</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Interactive session support</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleRequestSuggestion('warmup')} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-pool-500 hover:text-pool-600 transition-all shadow-sm">Suggest Warmup</button>
                    <button onClick={() => handleRequestSuggestion('finisher')} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-pool-500 hover:text-pool-600 transition-all shadow-sm">Add Finisher</button>
                    <button onClick={() => handleRequestSuggestion('extra')} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-pool-500 hover:text-pool-600 transition-all shadow-sm">Give Me One More</button>
                  </div>
                </div>
                
                <div className="p-10 max-h-[600px] overflow-y-auto space-y-6 flex flex-col custom-scrollbar bg-white">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                      <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 font-medium italic">"How do I correctly perform the eggbeater?" or "Suggest a warmup for this plan."</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-6 rounded-3xl shadow-lg border transition-all ${
                        msg.role === 'user' ? 'bg-pool-600 text-white rounded-tr-none border-pool-500' : 'bg-white text-slate-800 rounded-tl-none border-slate-100'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>
                        
                        {msg.suggestedDrill && (
                          <div className={`mt-6 p-5 rounded-2xl border-2 border-dashed flex flex-col gap-4 transition-all ${msg.addedToPlan ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-slate-900">{msg.suggestedDrill.name}</h4>
                              <span className="text-[10px] font-black bg-pool-100 text-pool-600 px-2 py-1 rounded uppercase tracking-widest">{msg.suggestedDrill.duration}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{msg.suggestedDrill.description}</p>
                            <div className="flex gap-2">
                              {!msg.addedToPlan ? (
                                <button 
                                  onClick={() => handleAddDrillToPlan(i)}
                                  className="flex-1 bg-pool-600 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-pool-700 shadow-md active:scale-95 transition-all"
                                >
                                  <Plus size={14} /> Add to Session
                                </button>
                              ) : (
                                <div className="flex-1 bg-emerald-100 text-emerald-700 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                                  <Check size={14} /> Added to Plan
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isAsking && !chatHistory[chatHistory.length - 1]?.suggestedDrill && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 p-6 rounded-3xl rounded-tl-none animate-pulse flex items-center gap-1.5 shadow-sm border border-slate-200">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="px-10 pb-10 bg-white border-t-0 flex gap-3 pt-6">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="Ask for clarification or extra drills..." 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-pool-500/10 focus:bg-white outline-none transition-all shadow-inner pr-14"
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskCoach()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"><MessageSquare size={18} /></div>
                  </div>
                  <button 
                    onClick={handleAskCoach}
                    disabled={isAsking || !currentQuestion.trim()}
                    className="p-4 bg-pool-600 hover:bg-pool-700 disabled:bg-slate-300 text-white rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center shrink-0"
                  >
                    <Send size={24} />
                  </button>
                </div>
              </div>

              <div className="px-10 py-8 flex justify-between bg-slate-50 border-t items-center">
                <button onClick={() => window.print()} className="flex items-center text-slate-500 font-black text-xs uppercase tracking-widest px-6 py-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md">
                  <ClipboardList className="mr-3 h-5 w-5" /> Print Layout
                </button>
                <button onClick={saveCurrentPlan} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center hover:bg-pool-600 transition-all shadow-xl hover:shadow-pool-200 active:scale-95">
                  <Save className="mr-3 h-5 w-5" /> Archive Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedPlans.map((p, i) => (
              <div key={i} onClick={() => { setPracticePlan(p); setView('results'); }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl cursor-pointer transition-all border-t-8 border-t-pool-500 group relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 text-slate-50 opacity-10 group-hover:scale-110 transition-transform"><Calendar size={120} /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-pool-50 text-pool-600 px-2 py-0.5 rounded-full">{p.type}</span>
                  </div>
                  <h3 className="font-black text-2xl text-slate-800 mb-3 group-hover:text-pool-600 transition-colors">{p.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed mb-6 font-medium">{p.summary}</p>
                  <div className="pt-6 border-t border-slate-50 flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-2"><ClipboardList size={14} /> {p.drills.length} Drills</span>
                    <span className="text-pool-600 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">Open <ChevronRight size={14} /></span>
                  </div>
                </div>
              </div>
            ))}
            {savedPlans.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-32 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                 <FolderOpen size={64} className="mb-6 opacity-20" />
                 <h3 className="text-xl font-bold text-slate-600 mb-2">No Archived Plans</h3>
                 <p className="max-w-xs text-center text-sm">Generated plans will appear here after you save them from the results view.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {isGenerating && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="w-24 h-24 relative mb-8">
              <div className="absolute inset-0 bg-pool-500 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-4 bg-pool-600 rounded-full flex items-center justify-center text-4xl shadow-2xl z-10 animate-bounce">🤽</div>
           </div>
           <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Coach is Strategizing...</h3>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing roster strengths & weaknesses</p>
        </div>
      )}
    </div>
  );
};

const PlannerCard = ({ title, icon, desc, onClick, disabled, children, color = 'pool' }: any) => {
  const colorMap = {
    pool: 'bg-pool-500 shadow-pool-200',
    purple: 'bg-purple-500 shadow-purple-200',
    emerald: 'bg-emerald-500 shadow-emerald-200',
    orange: 'bg-orange-500 shadow-orange-200',
  };
  
  return (
    <div className={`bg-white rounded-3xl shadow-xl p-8 border border-slate-100 flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden group`}>
      <div className={`w-14 h-14 ${(colorMap as any)[color]} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>{icon}</div>
      <h3 className="text-2xl font-black mb-3 text-slate-900 tracking-tight">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 flex-1 leading-relaxed font-medium">{desc}</p>
      {children}
      <button onClick={onClick} disabled={disabled} className="w-full bg-slate-900 hover:bg-pool-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 shadow-xl active:scale-95">Generate Session</button>
    </div>
  );
};

const DrillCard: React.FC<{ drill: Drill, index: number }> = ({ drill, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'ring-4 ring-pool-100 shadow-2xl border-pool-200' : 'hover:border-pool-300 shadow-sm border-slate-200'}`}>
      <div className="p-6 flex items-center justify-between cursor-pointer group" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-6">
          <div className="bg-slate-100 text-slate-400 group-hover:bg-pool-600 group-hover:text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-inner">{index + 1}</div>
          <div>
            <h4 className="font-black text-slate-800 text-lg group-hover:text-pool-700 transition-colors">{drill.name}</h4>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-black bg-slate-50 text-slate-500 px-3 py-1 rounded-lg border border-slate-100 shadow-sm flex items-center gap-1"><Calendar size={10} /> {drill.duration}</span>
              <span className="text-[10px] font-black bg-pool-50 text-pool-600 px-3 py-1 rounded-lg border border-pool-100 uppercase tracking-widest shadow-sm">{drill.category}</span>
            </div>
          </div>
        </div>
        <div className={`p-2 rounded-full transition-all ${isOpen ? 'bg-pool-100 text-pool-600 rotate-180' : 'text-slate-300'}`}><ChevronDown size={24} /></div>
      </div>
      {isOpen && (
        <div className="px-6 pb-8 pt-2 bg-slate-50/30 border-t border-slate-100 animate-in slide-in-from-top-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-inner mb-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><ClipboardList size={12} /> Instructions</h5>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">{drill.description}</p>
          </div>
          <div className="bg-gradient-to-br from-pool-600 to-pool-700 p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Primary Objective</h5>
              <p className="text-sm font-black text-white italic tracking-tight">"{drill.focus}"</p>
            </div>
            <div className="absolute top-0 right-0 p-4 text-white/10 rotate-12"><Zap size={48} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;