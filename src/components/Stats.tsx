import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Team, Position, Match, MatchStage, Group, TeamStats } from '../types';
import { Users, UserCheck, PieChart, BarChart3, Trophy, Filter, Search, Medal, Star, X, CalendarDays } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const POSITIONS: Position[] = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
const STAGES: { value: MatchStage | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Peringkat' },
  { value: 'group', label: 'Peringkat Kumpulan' },
  { value: 'knockout', label: 'Pusingan Kalah Singkir' },
  { value: 'quarter', label: 'Suku Akhir' },
  { value: 'semi', label: 'Separuh Akhir' },
  { value: 'third_place', label: 'Penentuan Tempat Ke-3' },
  { value: 'final', label: 'Akhir' }
];

type ScorerFilter = 'all' | 'group' | 'quarter_to_final' | 'semi_to_final';

const SCORER_FILTERS: { value: ScorerFilter; label: string }[] = [
  { value: 'all', label: 'Keseluruhan' },
  { value: 'group', label: 'Peringkat Kumpulan Sahaja' },
  { value: 'quarter_to_final', label: 'Suku Akhir ke Akhir' },
  { value: 'semi_to_final', label: 'Separuh Akhir ke Akhir' }
];

export default function Stats() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedStage, setSelectedStage] = useState<MatchStage | 'all'>('all');
  const [scorerFilter, setScorerFilter] = useState<ScorerFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPositionPopup, setShowPositionPopup] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showGoalPopup, setShowGoalPopup] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    });
    return () => {
      unsubTeams();
      unsubMatches();
      unsubGroups();
    };
  }, []);

  const stats = useMemo(() => {
    const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
    const positionCounts: Record<Position, number> = {
      GS: 0, GA: 0, WA: 0, C: 0, WD: 0, GD: 0, GK: 0
    };

    teams.forEach(team => {
      team.players.forEach(player => {
        if (positionCounts[player.position] !== undefined) {
          positionCounts[player.position]++;
        }
      });
    });

    return { totalPlayers, positionCounts };
  }, [teams]);

  const totalTournamentGoals = useMemo(() => {
    return matches.reduce((sum, match) => sum + (match.scoreA || 0) + (match.scoreB || 0), 0);
  }, [matches]);

  const totalMatchesCount = useMemo(() => {
    return matches.filter(m => m.status === 'finished' || m.status === 'live').length;
  }, [matches]);

  const chartData = useMemo(() => {
    const teamGoals: Record<string, number> = {};
    
    teams.forEach(team => {
      teamGoals[team.id] = 0;
    });

    matches.forEach(match => {
      if (selectedStage === 'all' || match.stage === selectedStage) {
        if (teamGoals[match.teamAId] !== undefined) {
          teamGoals[match.teamAId] += match.scoreA;
        }
        if (teamGoals[match.teamBId] !== undefined) {
          teamGoals[match.teamBId] += match.scoreB;
        }
      }
    });

    return teams
      .map(team => ({
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        goals: teamGoals[team.id] || 0
      }))
      .filter(item => item.goals > 0 || selectedStage === 'all')
      .sort((a, b) => b.goals - a.goals);
  }, [teams, matches, selectedStage]);

  const filteredTeams = useMemo(() => {
    return teams
      .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.name.localeCompare(b.name);
      });
  }, [teams, searchTerm]);

  const playersByPosition = useMemo(() => {
    if (!selectedPosition) return [];
    const list: { name: string; team: string; teamLogo?: string }[] = [];
    teams.forEach(team => {
      team.players.forEach(player => {
        if (player.position === selectedPosition) {
          list.push({ name: player.name, team: team.name, teamLogo: team.logoUrl });
        }
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, selectedPosition]);

  const teamGoalDetails = useMemo(() => {
    if (!selectedTeamId) return [];
    const details: { 
      playerName: string; 
      goals: number; 
      date: string; 
      time: string; 
      stage: string; 
      opponent: string 
    }[] = [];

    matches.forEach(match => {
      if (match.status !== 'finished' && match.status !== 'live') return;
      
      const isTeamA = match.teamAId === selectedTeamId;
      const isTeamB = match.teamBId === selectedTeamId;
      
      if (isTeamA || isTeamB) {
        const opponentId = isTeamA ? match.teamBId : match.teamAId;
        const opponentName = teams.find(t => t.id === opponentId)?.name || 'N/A';
        const stageLabel = STAGES.find(s => s.value === match.stage)?.label || match.stage;

        match.scorers?.forEach(s => {
          if (s.teamId === selectedTeamId) {
            details.push({
              playerName: s.playerName,
              goals: s.goals,
              date: match.date,
              time: match.time,
              stage: stageLabel,
              opponent: opponentName
            });
          }
        });
      }
    });

    return details.sort((a, b) => b.date.localeCompare(a.date));
  }, [matches, teams, selectedTeamId]);

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Desktop Layout: Left (Team List) | Right (Summary & Positions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Team List */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Team List */}
          <div className="bg-white p-4 md:p-8 rounded-xl md:2xl shadow-sm border border-pink-light h-full">
            <div className="flex items-center space-x-2 md:space-x-3 mb-4 md:8">
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-matcha" />
              <h3 className="text-lg md:text-xl font-bold text-gray-800">Senarai Pasukan</h3>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-[10px] md:text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[8px] md:text-xs font-bold">
                  <tr>
                    <th className="px-2 md:4 py-2 md:3 text-left">Pasukan</th>
                    <th className="px-2 md:4 py-2 md:3 text-center">Bil. Pemain</th>
                    <th className="px-2 md:4 py-2 md:3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTeams.map(team => (
                    <tr key={team.id}>
                      <td className="px-2 md:4 py-2 md:3 font-bold text-gray-800 flex items-center gap-2 md:3">
                        {team.logoUrl && (
                          <img src={team.logoUrl} alt="" className="w-6 h-6 md:w-8 md:h-8 object-contain bg-white p-0.5 md:1 rounded-lg border border-gray-100 shrink-0" referrerPolicy="no-referrer" />
                        )}
                        <span className="break-words">{team.name}</span>
                      </td>
                      <td className="px-2 md:4 py-2 md:3 text-center">
                        <div className="flex items-center justify-center gap-1 md:2">
                          <div className="hidden sm:block w-24 h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-matcha-gradient" 
                              style={{ width: `${(team.players.length / 12) * 100}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-matcha-dark">{team.players.length}</span>
                        </div>
                      </td>
                      <td className="px-2 md:4 py-2 md:3">
                        {team.players.length >= 7 ? (
                          <span className="bg-green-100 text-green-700 px-1.5 md:2 py-0.5 md:1 rounded text-[8px] md:text-[10px] font-bold uppercase">Lengkap</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-1.5 md:2 py-0.5 md:1 rounded text-[8px] md:text-[10px] font-bold uppercase">X Lengkap</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Summary & Positions */}
        <div className="space-y-6 md:space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-4 md:p-6 rounded-xl md:2xl shadow-sm border border-pink-light flex items-center space-x-4">
              <div className="bg-matcha-gradient p-3 rounded-xl">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Jumlah Pasukan</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800">{teams.length}</h3>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl md:2xl shadow-sm border border-pink-light flex items-center space-x-4">
              <div className="bg-pink-gradient p-3 rounded-xl">
                <Users className="h-6 w-6 text-matcha-dark" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Jumlah Pemain</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800">{stats.totalPlayers}</h3>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl md:2xl shadow-sm border border-pink-light flex items-center space-x-4">
              <div className="bg-matcha-gradient p-3 rounded-xl">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Purata Pemain</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800">
                  {teams.length > 0 ? (stats.totalPlayers / teams.length).toFixed(1) : 0}
                </h3>
              </div>
            </div>
          </div>

          {/* Position Breakdown */}
          <div className="bg-white p-4 md:p-6 rounded-xl md:2xl shadow-sm border border-pink-light">
            <div className="flex items-center space-x-2 md:space-x-3 mb-4 md:6">
              <PieChart className="h-4 w-4 md:h-5 md:w-5 text-matcha" />
              <h3 className="text-sm md:text-base font-bold text-gray-800 uppercase tracking-tight">Pecahan Posisi</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 md:3">
              {POSITIONS.map(pos => {
                const count = stats.positionCounts[pos];
                const percentage = stats.totalPlayers > 0 ? (count / stats.totalPlayers) * 100 : 0;
                
                return (
                  <button 
                    key={pos} 
                    onClick={() => {
                      setSelectedPosition(pos);
                      setShowPositionPopup(true);
                    }}
                    className="bg-gray-50 p-2 md:3 rounded-lg md:xl border border-gray-100 text-center space-y-1 hover:bg-pink-gradient transition-colors group"
                  >
                    <div className="bg-matcha-gradient text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center mx-auto font-black text-[9px] md:text-xs group-hover:scale-110 transition-transform">
                      {pos}
                    </div>
                    <div>
                      <p className="text-xs md:text-lg font-black text-gray-800">{count}</p>
                      <p className="text-[7px] md:text-[9px] text-gray-400 font-bold uppercase tracking-widest">{percentage.toFixed(0)}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tournament Stats Summary (Moved here as requested) */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-4 md:p-6 rounded-xl md:2xl shadow-sm border border-pink-light flex items-center space-x-4">
              <div className="bg-matcha-gradient p-3 rounded-xl">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Jumlah Perlawanan Kejohanan</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800">{totalMatchesCount}</h3>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl md:2xl shadow-sm border border-pink-light flex items-center space-x-4">
              <div className="bg-matcha-gradient p-3 rounded-xl">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Jumlah Gol Kejohanan</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800">{totalTournamentGoals}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white p-3 md:8 rounded-xl md:2xl shadow-sm border border-pink-light">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:4 mb-3 md:8">
          <div className="flex items-center space-x-2 md:space-x-3">
            <BarChart3 className="h-4 w-4 md:h-6 md:w-6 text-matcha" />
            <h3 className="text-sm md:text-xl font-bold text-gray-800 uppercase tracking-tight">Jumlah Gol</h3>
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-100 self-start">
            <Filter className="h-3 w-3 md:h-4 md:w-4 text-gray-400 ml-1 md:2" />
            <select 
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as MatchStage | 'all')}
              className="bg-transparent border-none text-[9px] md:text-sm font-bold text-gray-600 focus:ring-0 cursor-pointer pr-5 md:8"
            >
              {STAGES.map(stage => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:4">
          {chartData.map((team, idx) => (
            <button 
              key={idx} 
              onClick={() => {
                setSelectedTeamId(team.id);
                setShowGoalPopup(true);
              }}
              className="flex w-full text-left bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 hover:bg-pink-gradient transition-all hover:shadow-lg group items-center gap-3"
            >
              <div className="flex flex-col items-center justify-center bg-matcha-dark text-white w-8 h-8 md:w-10 md:h-10 rounded-lg font-black text-xs md:text-base shadow-md shrink-0">
                {idx + 1}
              </div>
              
              <div className="flex-1 flex items-center gap-2 md:gap-3 min-w-0">
                {team.logoUrl && (
                  <img src={team.logoUrl} alt="" className="w-8 h-8 md:w-12 md:h-12 object-contain bg-white p-1 rounded-lg border border-gray-100 shadow-sm shrink-0" referrerPolicy="no-referrer" />
                )}
                <h4 className="text-[10px] md:text-sm font-black text-gray-800 uppercase tracking-tight leading-tight truncate">{team.name}</h4>
              </div>

              <div className="flex items-end gap-1 shrink-0">
                <span className="text-xl md:text-3xl font-black text-matcha leading-none">{team.goals}</span>
                <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180 mb-0.5">GOL</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Position Popup */}
      {showPositionPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-matcha-gradient p-4 md:p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white text-matcha w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner">
                  {selectedPosition}
                </div>
                <div>
                  <h3 className="text-white font-black text-lg md:text-xl uppercase tracking-tight">Senarai Pemain</h3>
                  <p className="text-pink-light text-[10px] md:text-xs font-bold uppercase tracking-widest">Posisi: {selectedPosition}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPositionPopup(false)}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {playersByPosition.map((player, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-matcha/30 transition-colors">
                    <div className="w-8 h-8 bg-matcha/10 rounded-full flex items-center justify-center text-matcha font-black text-xs">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate uppercase">{player.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {player.teamLogo && (
                          <img src={player.teamLogo} alt="" className="w-4 h-4 object-contain bg-white p-0.5 rounded border border-gray-100" referrerPolicy="no-referrer" />
                        )}
                        <p className="text-[10px] text-gray-500 font-medium truncate">{player.team}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {playersByPosition.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-400 italic">Tiada pemain berdaftar untuk posisi ini.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Details Popup */}
      {showGoalPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-matcha-gradient p-4 md:p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-white p-1.5 rounded-xl shadow-inner shrink-0">
                  {teams.find(t => t.id === selectedTeamId)?.logoUrl ? (
                    <img src={teams.find(t => t.id === selectedTeamId)?.logoUrl} alt="" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 bg-matcha/10 rounded-lg flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-matcha" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-black text-lg md:text-xl uppercase tracking-tight truncate">
                    {teams.find(t => t.id === selectedTeamId)?.name}
                  </h3>
                  <p className="text-pink-light text-[10px] md:text-xs font-bold uppercase tracking-widest">Senarai Penjaring Terperinci</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGoalPopup(false)}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors shrink-0 ml-4"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
              <div className="space-y-3">
                {teamGoalDetails.map((detail, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 hover:border-matcha/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-matcha text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </div>
                        <span className="font-black text-gray-800 uppercase text-sm">{detail.playerName}</span>
                      </div>
                      <div className="bg-matcha-gradient text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">
                        {detail.goals} GOL
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Peringkat</p>
                        <p className="text-[10px] md:text-xs font-bold text-matcha-dark">{detail.stage}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Lawan</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-700 truncate">{detail.opponent}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Tarikh</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600">{detail.date}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Masa</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600">{detail.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {teamGoalDetails.length === 0 && (
                  <div className="py-12 text-center text-gray-400 italic">Tiada data jaringan gol untuk pasukan ini.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
