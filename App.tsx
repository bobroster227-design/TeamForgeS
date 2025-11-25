import React, { useState, useMemo } from 'react';
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
  UserPlus,
  Sparkles,
  Dumbbell,
  LifeBuoy,
  Save,
  Calendar,
  FolderOpen,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import { Player, ViewState, SkillCategory, SkillLevel, PracticePlan, CustomSkill } from './types';
import { INITIAL_ROSTER, POSITIONS, SKILL_CATEGORIES_LIST } from './constants';
import { generatePracticePlan } from './services/geminiService';
import SkillRadar from './components/SkillRadar';

const App = () => {
  const [view, setView] = useState<ViewState>('roster');
  const [roster, setRoster] = useState<Player[]>(INITIAL_ROSTER);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  // Planner State
  const [selectedPlannerIds, setSelectedPlannerIds] = useState<string[]>([]);
  
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

  // Handlers
  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName,
      position: newPlayerPos,
      skills: SKILL_CATEGORIES_LIST.reduce((acc, cat) => ({
        ...acc,
        [cat]: SkillLevel.Neutral
      }), {} as Record<SkillCategory, SkillLevel>),
      customSkills: []
    };
    setRoster([...roster, newPlayer]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setRoster(roster.filter(p => p.id !== id));
    if (selectedPlayerId === id) setSelectedPlayerId(null);
    setSelectedPlannerIds(selectedPlannerIds.filter(pid => pid !== id));
    if (injuryPlayerId === id) setInjuryPlayerId('');
  };

  const updateSkill = (playerId: string, category: SkillCategory, level: SkillLevel) => {
    setRoster(roster.map(p => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        skills: {
          ...p.skills,
          [category]: level
        }
      };
    }));
  };

  const addCustomSkill = (playerId: string, skillName: string, level: SkillLevel) => {
    if (!skillName.trim()) return;
    setRoster(roster.map(p => {
      if (p.id !== playerId) return p;
      const newSkill: CustomSkill = {
        id: Date.now().toString(),
        name: skillName,
        level
      };
      return {
        ...p,
        customSkills: [...p.customSkills, newSkill]
      };
    }));
    setNewCustomSkill('');
  };

  const removeCustomSkill = (playerId: string, skillId: string) => {
    setRoster(roster.map(p => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        customSkills: p.customSkills.filter(s => s.id !== skillId)
      };
    }));
  };

  const togglePlannerSelection = (id: string) => {
    if (selectedPlannerIds.includes(id)) {
      setSelectedPlannerIds(selectedPlannerIds.filter(pid => pid !== id));
    } else {
      setSelectedPlannerIds([...selectedPlannerIds, id]);
    }
  };

  const handleGenerate = async (mode: 'team' | 'individual' | 'conditioning' | 'recovery') => {
    if (roster.length === 0) {
      setGenerationError("Roster is empty. Add players first.");
      return;
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    setPracticePlan(null);

    try {
      let focusGroup: Player[] | undefined = undefined;
      let context = '';

      if (mode === 'individual' || mode === 'conditioning') {
         if (selectedPlannerIds.length === 0) {
            setGenerationError("Please select at least one player.");
            setIsGenerating(false);
            return;
         }
         focusGroup = roster.filter(p => selectedPlannerIds.includes(p.id));
      } else if (mode === 'recovery') {
        if (!injuryIssue.trim() || !injuryLocation.trim()) {
           setGenerationError("Please describe the injury and location.");
           setIsGenerating(false);
           return;
        }
        if (injuryPlayerId) {
          focusGroup = roster.filter(p => p.id === injuryPlayerId);
        }
        context = `${injuryIssue} in ${injuryLocation}`;
      }

      const plan = await generatePracticePlan(roster, mode, focusGroup, context, mode === 'recovery' ? injurySeverity : undefined);
      if (plan) {
        // Add metadata to plan
        plan.id = Date.now().toString();
        plan.createdAt = Date.now();
        plan.type = mode;
        plan.participants = focusGroup ? focusGroup.map(p => p.name) : ['Team'];
        if (mode === 'recovery' && !focusGroup) {
           plan.participants = ['Injured Player'];
        }
        
        setPracticePlan(plan);
        setView('results');
      } else {
        setGenerationError("Failed to generate plan. Please check your API key or try again.");
      }
    } catch (err) {
      setGenerationError("An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCurrentPlan = () => {
    if (!practicePlan) return;
    
    // Auto-generate name based on participants and type
    let name = practicePlan.title; // Default to AI title
    if (practicePlan.type === 'individual' && practicePlan.participants) {
      name = `${practicePlan.participants.join(', ')} Individual Focus`;
    } else if (practicePlan.type === 'conditioning' && practicePlan.participants) {
      name = `${practicePlan.participants.join(', ')} Conditioning`;
    } else if (practicePlan.type === 'recovery' && practicePlan.participants) {
      name = `${practicePlan.participants.join(', ')} Recovery Plan`;
    } else if (practicePlan.type === 'team') {
      name = `Team Practice - ${new Date().toLocaleDateString()}`;
    }

    const planToSave = { ...practicePlan, title: name };
    setSavedPlans([planToSave, ...savedPlans]);
    alert('Plan Saved to Plans tab!');
  };

  // Components Helpers
  const SkillButton = ({ 
    current, 
    target, 
    onClick 
  }: { 
    current: SkillLevel, 
    target: SkillLevel, 
    onClick: () => void 
  }) => {
    const isActive = current === target;
    let baseClass = "p-2 rounded-full transition-all duration-200 border transform active:scale-95 ";
    
    if (target === SkillLevel.Strength) {
      baseClass += isActive ? "bg-green-100 border-green-500 text-green-700 shadow-sm" : "border-transparent text-slate-300 hover:text-green-400";
    } else if (target === SkillLevel.Weakness) {
      baseClass += isActive ? "bg-red-100 border-red-500 text-red-700 shadow-sm" : "border-transparent text-slate-300 hover:text-red-400";
    } else {
      baseClass += isActive ? "bg-slate-100 border-slate-400 text-slate-600 shadow-sm" : "border-transparent text-slate-300 hover:text-slate-500";
    }

    return (
      <button onClick={onClick} className={baseClass}>
        {target === SkillLevel.Strength && <CheckCircle2 size={20} />}
        {target === SkillLevel.Weakness && <XCircle size={20} />}
        {target === SkillLevel.Neutral && <MinusCircle size={20} />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
           }} 
      />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-900 via-pool-800 to-pool-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('roster')}>
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              <LifeBuoy className="text-white h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">TeamForge</h1>
              <p className="text-xs text-pool-200 font-medium tracking-normal md:tracking-wide">Your Own Personalized Water Polo Planner</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-1">
             {[
               { id: 'roster', label: 'Roster', icon: Users },
               { id: 'assessment', label: 'Skills', icon: Activity },
               { id: 'planner', label: 'Planner', icon: BrainCircuit },
               { id: 'recovery', label: 'Recovery', icon: Stethoscope },
               { id: 'plans', label: 'Saved', icon: FolderOpen }
             ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setView(item.id as ViewState)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    view === item.id 
                    ? 'bg-white/10 text-white shadow-inner border border-white/10' 
                    : 'text-pool-100 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`h-4 w-4 mr-2 ${view === item.id ? 'text-pool-300' : 'opacity-70'}`} />
                  {item.label}
                </button>
             ))}
          </nav>
          {/* Mobile Menu Button - simplified for this view */}
          <div className="md:hidden flex space-x-2">
            <button onClick={() => setView('planner')} className="p-2 text-white"><BrainCircuit /></button>
            <button onClick={() => setView('recovery')} className="p-2 text-white"><Stethoscope /></button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 z-10 relative">
        
        {/* VIEW: ROSTER */}
        {view === 'roster' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                  <span className="bg-pool-100 text-pool-600 p-2 rounded-lg mr-3">
                    <Users className="h-6 w-6" />
                  </span>
                  Team Roster
                </h2>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full mt-2 md:mt-0">
                  {roster.length} Players Active
                </span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <input 
                  type="text" 
                  placeholder="Player Name"
                  className="flex-1 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pool-500 focus:outline-none transition-shadow shadow-sm"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                />
                <select 
                  className="border border-slate-200 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-pool-500 focus:outline-none shadow-sm"
                  value={newPlayerPos}
                  onChange={(e) => setNewPlayerPos(e.target.value)}
                >
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button 
                  onClick={addPlayer}
                  className="bg-gradient-to-r from-pool-600 to-pool-500 hover:from-pool-700 hover:to-pool-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center transition-all shadow-md active:scale-95"
                >
                  <Plus className="mr-2 h-5 w-5" /> Add
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roster.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-pool-300 transition-all group">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pool-100 to-pool-50 flex items-center justify-center text-pool-700 font-black text-lg border-2 border-white shadow-sm">
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-pool-700 transition-colors">{player.name}</p>
                        <p className="text-xs font-medium text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded mt-0.5">{player.position}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removePlayer(player.id)}
                      className="text-slate-300 hover:text-red-500 p-2 transition-colors hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                {roster.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <div className="bg-slate-50 inline-block p-4 rounded-full mb-3">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-medium">No players found.</p>
                    <p className="text-sm">Add your first player above to get started.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setView('assessment')}
                className="flex items-center text-pool-700 hover:text-pool-900 font-bold bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all"
              >
                Start Assessment <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW: SKILL ASSESSMENT */}
        {view === 'assessment' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 flex items-center tracking-tight">
                  <span className="bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 p-2 rounded-xl mr-3 shadow-sm border border-amber-100">
                    <Activity className="h-6 w-6" />
                  </span>
                  Skill Assessment
                </h2>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Player List / Selector */}
                <div className="lg:col-span-1 space-y-3 bg-white p-4 rounded-2xl shadow-lg border border-slate-100 h-fit">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Select Player</h3>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {roster.map(player => (
                      <button
                        key={player.id}
                        onClick={() => setSelectedPlayerId(player.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 relative overflow-hidden ${
                          selectedPlayerId === player.id 
                            ? 'bg-pool-50 border-pool-500 shadow-md z-10' 
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <div>
                            <div className={`font-bold ${selectedPlayerId === player.id ? 'text-pool-900' : 'text-slate-700'}`}>{player.name}</div>
                            <div className="text-xs text-slate-500 font-medium">{player.position}</div>
                          </div>
                          {selectedPlayerId === player.id && <ChevronRight className="h-4 w-4 text-pool-500" />}
                        </div>
                      </button>
                    ))}
                    {roster.length === 0 && <p className="text-sm text-slate-400 italic px-2">No roster data.</p>}
                  </div>
                </div>

                {/* Assessment Panel */}
                <div className="lg:col-span-2">
                  {selectedPlayerId ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
                        {(() => {
                          const player = roster.find(p => p.id === selectedPlayerId)!;
                          return (
                            <>
                              <div className="flex flex-col md:flex-row justify-between items-start mb-8">
                                <div>
                                  <h3 className="text-3xl font-black text-slate-900 mb-1">{player.name}</h3>
                                  <span className="inline-block bg-slate-100 text-slate-600 font-bold text-xs px-2 py-1 rounded uppercase tracking-wider">
                                    {player.position}
                                  </span>
                                </div>
                                <div className="w-full md:w-48 h-48 self-center md:self-auto mt-6 md:mt-0 -mr-4">
                                  <SkillRadar player={player} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Core Competencies</h4>
                                {SKILL_CATEGORIES_LIST.map(category => (
                                  <div key={category} className="flex items-center justify-between py-3 hover:bg-slate-50 rounded-lg px-2 transition-colors">
                                    <span className="text-sm font-bold text-slate-700">{category}</span>
                                    <div className="flex items-center space-x-3">
                                      <SkillButton 
                                        current={player.skills[category]} 
                                        target={SkillLevel.Weakness} 
                                        onClick={() => updateSkill(player.id, category, SkillLevel.Weakness)}
                                      />
                                      <SkillButton 
                                        current={player.skills[category]} 
                                        target={SkillLevel.Neutral} 
                                        onClick={() => updateSkill(player.id, category, SkillLevel.Neutral)}
                                      />
                                      <SkillButton 
                                        current={player.skills[category]} 
                                        target={SkillLevel.Strength} 
                                        onClick={() => updateSkill(player.id, category, SkillLevel.Strength)}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Custom Skills Section */}
                      <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg border border-purple-100 p-6">
                        <h4 className="flex items-center text-sm font-bold text-purple-900 uppercase tracking-wider mb-4">
                          <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                          Personalized Traits
                        </h4>
                        
                        {(() => {
                           const player = roster.find(p => p.id === selectedPlayerId)!;
                           return (
                             <div className="space-y-4">
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Add custom skill (e.g. Leadership, Sprints)"
                                    className="flex-1 border border-purple-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white shadow-sm"
                                    value={newCustomSkill}
                                    onChange={(e) => setNewCustomSkill(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') addCustomSkill(player.id, newCustomSkill, SkillLevel.Strength);
                                    }}
                                  />
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => addCustomSkill(player.id, newCustomSkill, SkillLevel.Weakness)}
                                      className="p-2 rounded-xl bg-white text-red-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm transition-colors"
                                      title="Add as Weakness"
                                    >
                                      <XCircle size={20} />
                                    </button>
                                    <button 
                                      onClick={() => addCustomSkill(player.id, newCustomSkill, SkillLevel.Strength)}
                                      className="p-2 rounded-xl bg-white text-green-500 hover:bg-green-50 hover:text-green-600 border border-slate-200 shadow-sm transition-colors"
                                      title="Add as Strength"
                                    >
                                      <CheckCircle2 size={20} />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {player.customSkills.length === 0 && (
                                    <p className="text-purple-300 text-sm italic text-center py-4">No custom traits yet.</p>
                                  )}
                                  {player.customSkills.map(skill => (
                                    <div key={skill.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-100 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        {skill.level === SkillLevel.Strength ? (
                                          <CheckCircle2 className="text-green-500 h-5 w-5" />
                                        ) : skill.level === SkillLevel.Weakness ? (
                                          <XCircle className="text-red-500 h-5 w-5" />
                                        ) : (
                                          <MinusCircle className="text-slate-400 h-5 w-5" />
                                        )}
                                        <span className="font-bold text-slate-700">{skill.name}</span>
                                      </div>
                                      <button 
                                        onClick={() => removeCustomSkill(player.id, skill.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                             </div>
                           )
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/50 rounded-2xl border-2 border-slate-200 border-dashed p-12 text-center h-full flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <Users className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">Select a player from the roster to begin assessment.</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}

        {/* VIEW: PLANNER CONFIG */}
        {view === 'planner' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Mission Control</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">Select a training module below. The AI will analyze your roster's data to construct the optimal session.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Team Plan Card */}
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-pool-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-pool-500 to-pool-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-pool-200">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Team Practice</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Create a full team practice with your players based off of their skills
                  </p>
                  <button
                    onClick={() => handleGenerate('team')}
                    disabled={isGenerating}
                    className="mt-auto w-full bg-slate-900 hover:bg-pool-600 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex justify-center items-center"
                  >
                    {isGenerating ? <Activity className="animate-spin h-5 w-5" /> : 'Generate Team Plan'}
                  </button>
                </div>
              </div>

              {/* Individual / Cohort Plan Card */}
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-purple-200">
                    <BrainCircuit className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Skill Focus</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">
                    Target specific players and create focused drills for each one OR a small group based on shared needs
                  </p>
                  
                  <div className="mb-6 flex-1 overflow-y-auto max-h-40 border border-slate-100 rounded-xl bg-slate-50 p-3 custom-scrollbar">
                    <p className="text-xs font-bold text-slate-400 mb-3 uppercase px-1">Select Participants:</p>
                    <div className="space-y-1">
                      {roster.map(p => (
                         <label key={p.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group/item">
                            <input 
                              type="checkbox" 
                              checked={selectedPlannerIds.includes(p.id)}
                              onChange={() => togglePlannerSelection(p.id)}
                              className="rounded-md w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300"
                            />
                            <span className="text-sm font-medium text-slate-600 group-hover/item:text-slate-900">{p.name}</span>
                         </label>
                      ))}
                      {roster.length === 0 && <span className="text-xs text-slate-400 italic">No players available</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerate('individual')}
                    disabled={isGenerating || selectedPlannerIds.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:from-slate-300 disabled:to-slate-400 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex justify-center items-center"
                  >
                    {isGenerating ? <Activity className="animate-spin h-5 w-5" /> : `Build Plan (${selectedPlannerIds.length})`}
                  </button>
                </div>
              </div>

               {/* Conditioning Plan Card */}
               <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10 flex flex-col h-full">
                   <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-200">
                    <Dumbbell className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Conditioning</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">
                    High intensity physical training. Pool and Gym sets tailored to each physical weakness.
                  </p>
                  
                  <div className="mb-6 flex-1 overflow-y-auto max-h-40 border border-slate-100 rounded-xl bg-slate-50 p-3 custom-scrollbar">
                    <p className="text-xs font-bold text-slate-400 mb-3 uppercase px-1">Select Participants:</p>
                    <div className="space-y-1">
                      {roster.map(p => (
                         <label key={p.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group/item">
                            <input 
                              type="checkbox" 
                              checked={selectedPlannerIds.includes(p.id)}
                              onChange={() => togglePlannerSelection(p.id)}
                              className="rounded-md w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                            />
                            <span className="text-sm font-medium text-slate-600 group-hover/item:text-slate-900">{p.name}</span>
                         </label>
                      ))}
                      {roster.length === 0 && <span className="text-xs text-slate-400 italic">No players available</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerate('conditioning')}
                    disabled={isGenerating || selectedPlannerIds.length === 0}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-300 disabled:to-slate-400 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex justify-center items-center"
                  >
                    {isGenerating ? <Activity className="animate-spin h-5 w-5" /> : `Create Set (${selectedPlannerIds.length})`}
                  </button>
                </div>
              </div>
            </div>

            {generationError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-medium text-center flex items-center justify-center animate-pulse">
                <AlertCircle className="w-5 h-5 mr-2" />
                {generationError}
              </div>
            )}
            
            {isGenerating && (
              <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                 <div className="text-6xl animate-bounce mb-6">🤽</div>
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Roster Data...</h3>
                 <p className="text-slate-500">Constructing optimized training set.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW: RECOVERY */}
        {view === 'recovery' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-red-50 rounded-full mb-6 ring-4 ring-red-50/50">
                <Stethoscope className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Injury & Recovery</h2>
              <p className="text-slate-500 mt-2 text-lg">AI-powered rehabilitation protocols for safe return to sport.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-orange-400"></div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Athlete</label>
                <select 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-red-500 focus:outline-none focus:bg-white transition-all font-medium text-slate-700"
                  value={injuryPlayerId}
                  onChange={(e) => setInjuryPlayerId(e.target.value)}
                >
                  <option value="">-- Select Injured Player (Optional) --</option>
                  {roster.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Diagnosis / Issue</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rotator Cuff Strain"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-red-500 focus:outline-none focus:bg-white transition-all"
                    value={injuryIssue}
                    onChange={(e) => setInjuryIssue(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Right Shoulder"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-red-500 focus:outline-none focus:bg-white transition-all"
                    value={injuryLocation}
                    onChange={(e) => setInjuryLocation(e.target.value)}
                  />
                </div>
              </div>

              <div>
                 <div className="flex justify-between items-end mb-4">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Pain Severity</label>
                    <span className={`text-lg font-black px-3 py-1 rounded-lg ${
                      injurySeverity <= 3 ? 'bg-green-100 text-green-700' :
                      injurySeverity <= 7 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
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
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                 />
                 <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium uppercase">
                    <span>Mild Discomfort</span>
                    <span>Moderate</span>
                    <span>Severe Pain</span>
                 </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleGenerate('recovery')}
                  disabled={isGenerating || !injuryIssue.trim() || !injuryLocation.trim()}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex justify-center items-center"
                >
                  {isGenerating ? <Activity className="animate-spin h-5 w-5" /> : 'Generate Recovery Protocol'}
                </button>
              </div>
            </div>

            {generationError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm text-center">
                {generationError}
              </div>
            )}
          </div>
        )}

        {/* VIEW: RESULTS */}
        {view === 'results' && practicePlan && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <button 
              onClick={() => setView(practicePlan.type === 'recovery' ? 'recovery' : 'planner')}
              className="group text-slate-500 hover:text-pool-600 text-sm font-bold flex items-center mb-4 transition-colors"
            >
              <div className="p-1 rounded-full bg-slate-100 group-hover:bg-pool-100 mr-2 transition-colors">
                 <ChevronRight className="h-4 w-4 rotate-180" />
              </div>
              Back to {practicePlan.type === 'recovery' ? 'Recovery' : 'Planner'}
            </button>

            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className={`px-8 py-10 text-white relative overflow-hidden ${
                practicePlan.type === 'recovery' ? 'bg-gradient-to-br from-red-600 to-orange-600' : 
                practicePlan.type === 'conditioning' ? 'bg-gradient-to-br from-emerald-600 to-teal-600' :
                practicePlan.type === 'individual' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' :
                'bg-gradient-to-br from-pool-600 to-sky-700'
              }`}>
                <div className="relative z-10">
                   <div className="flex flex-wrap items-center gap-3 mb-4">
                     <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-white/10">
                        {practicePlan.type}
                     </span>
                     {practicePlan.createdAt && (
                       <span className="text-white/60 text-xs font-medium flex items-center">
                         <Calendar className="h-3 w-3 mr-1" /> {new Date(practicePlan.createdAt).toLocaleDateString()}
                       </span>
                     )}
                   </div>
                   <div className="flex items-start gap-4 mb-4">
                     {practicePlan.type === 'recovery' && <div className="p-3 bg-white/10 rounded-xl"><Stethoscope className="h-8 w-8 text-white" /></div>}
                     <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">{practicePlan.title}</h1>
                   </div>
                   <p className="text-white/90 text-lg leading-relaxed max-w-3xl font-medium">{practicePlan.summary}</p>
                   
                   {practicePlan.participants && practicePlan.participants.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {practicePlan.participants.map((p, i) => (
                          <span key={i} className="text-xs font-bold bg-black/20 px-2 py-1 rounded text-white/80">
                            {p}
                          </span>
                        ))}
                      </div>
                   )}
                </div>
                {/* Decorative Pattern Overlay */}
                <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              <div className="p-8 bg-slate-50/50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Session Plan
                </h3>
                <div className="space-y-4">
                  {practicePlan.drills.map((drill, idx) => (
                    <DrillCard key={idx} drill={drill} index={idx} />
                  ))}
                </div>
              </div>
              
              <div className="p-6 flex justify-between bg-white items-center">
                <button 
                   onClick={() => window.print()}
                   className="flex items-center text-slate-500 hover:text-slate-800 font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <ClipboardList className="mr-2 h-5 w-5" /> Print
                </button>
                <button 
                  onClick={saveCurrentPlan}
                  className="bg-slate-900 hover:bg-pool-600 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  <Save className="mr-2 h-5 w-5" /> Save Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SAVED PLANS */}
        {view === 'plans' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
                  <span className="bg-pool-100 text-pool-700 p-2 rounded-xl mr-3">
                    <FolderOpen className="h-7 w-7" />
                  </span>
                  Plan Library
                </h2>
                <span className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                  {savedPlans.length} Files
                </span>
             </div>

             {savedPlans.length === 0 ? (
               <div className="bg-white rounded-2xl border-2 border-slate-200 border-dashed p-16 text-center max-w-2xl mx-auto">
                 <div className="bg-slate-50 inline-block p-6 rounded-full mb-6">
                   <FolderOpen className="h-12 w-12 text-slate-300" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Library Empty</h3>
                 <p className="text-slate-500 mb-8 max-w-sm mx-auto">Generated plans can be saved here for future reference. Create your first plan to get started.</p>
                 <button 
                   onClick={() => setView('planner')}
                   className="bg-pool-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-pool-700 transition-colors shadow-lg"
                 >
                   Go to Planner
                 </button>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {savedPlans.map((plan, idx) => (
                   <div 
                     key={idx} 
                     className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group"
                     onClick={() => {
                       setPracticePlan(plan);
                       setView('results');
                     }}
                   >
                     <div className="p-6 flex-1">
                       <div className="flex items-start justify-between mb-4">
                         <div className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                           plan.type === 'conditioning' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                           plan.type === 'individual' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 
                           plan.type === 'recovery' ? 'bg-red-50 text-red-600 border border-red-100' :
                           'bg-pool-50 text-pool-600 border border-pool-100'
                         }`}>
                           {plan.type || 'Practice'}
                         </div>
                         {plan.createdAt && (
                           <div className="text-xs text-slate-400 font-medium flex items-center bg-slate-50 px-2 py-1 rounded-full">
                             {new Date(plan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                           </div>
                         )}
                       </div>
                       <h3 className="font-bold text-slate-900 text-xl mb-3 line-clamp-2 group-hover:text-pool-600 transition-colors">{plan.title}</h3>
                       <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">{plan.summary}</p>
                     </div>
                     <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                       <span className="flex items-center"><ClipboardList className="w-3 h-3 mr-1" /> {plan.drills.length} Drills</span>
                       <span className="flex items-center text-pool-600 group-hover:underline">
                         Open File <ChevronRight className="h-3 w-3 ml-1" />
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

const DrillCard = ({ drill, index }: { drill: any, index: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Difficulty Colors
  const diffColor = {
    'Beginner': 'bg-green-100 text-green-700 border-green-200',
    'Intermediate': 'bg-amber-100 text-amber-700 border-amber-200',
    'Advanced': 'bg-red-100 text-red-700 border-red-200',
  }[drill.difficulty] || 'bg-slate-100 text-slate-700';

  // Category Colors
  const catColor = drill.category === 'Weight Room' 
    ? 'bg-slate-100 text-slate-600 border-slate-200' 
    : drill.category === 'Pool Conditioning' || drill.category === 'Pool Recovery'
      ? 'bg-cyan-50 text-cyan-600 border-cyan-100'
      : drill.category === 'Rehab'
        ? 'bg-orange-50 text-orange-600 border-orange-100'
      : 'bg-blue-50 text-blue-600 border-blue-100';

  return (
    <div className={`bg-white border rounded-xl transition-all duration-300 ${isOpen ? 'shadow-md border-pool-200 ring-1 ring-pool-100' : 'shadow-sm border-slate-200 hover:border-pool-200'}`}>
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start space-x-5">
          <div className={`text-sm font-black h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-sm transition-colors ${isOpen ? 'bg-pool-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {index + 1}
          </div>
          <div>
            <h4 className={`font-bold text-lg transition-colors ${isOpen ? 'text-pool-700' : 'text-slate-800'}`}>{drill.name}</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200 flex items-center">
                ⏱ {drill.duration}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md border ${catColor}`}>
                {drill.category}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md border ${diffColor}`}>
                {drill.difficulty}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4 text-slate-300 self-end md:self-center">
           <div className={`p-2 rounded-full transition-all ${isOpen ? 'bg-pool-50 text-pool-600 rotate-180' : 'hover:bg-slate-50'}`}>
             <ChevronDown size={20} />
           </div>
        </div>
      </div>
      
      {isOpen && (
        <div className="px-5 pb-6 md:pl-18 pr-6 border-t border-slate-100/50">
           <div className="pt-4 grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                  <span className="w-1 h-1 bg-slate-400 rounded-full mr-2"></span> Instructions
                </h5>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{drill.description}</p>
              </div>
              <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-100 h-fit">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                  <span className="w-1 h-1 bg-pool-500 rounded-full mr-2"></span> Purpose
                </h5>
                <p className="text-sm text-slate-600 font-medium italic">"{drill.focus}"</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;