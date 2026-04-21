import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Team, Group, Match, TeamStats, MatchStage, MatchStatus, TournamentInfo } from '../types';
import { Trophy, CalendarDays, LayoutGrid, ChevronRight, Search, Filter, X, Star, Clock, Play, CheckCircle, Info, Medal } from 'lucide-react';

const STATUSES: { value: MatchStatus; label: string; color: string }[] = [
  { value: 'upcoming', label: 'Akan Datang', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'live', label: 'Sedang Berlangsung', color: 'bg-red-100 text-red-700 border-red-200 animate-pulse' },
  { value: 'finished', label: 'Tamat', color: 'bg-[#004d00] text-white border-[#003300]' },
];

const POSITION_ORDER = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

export default function PublicView() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'schedule' | 'topScorers' | 'officialResults'>('schedule');
  const [scorerFilter, setScorerFilter] = useState<'all' | 'group' | 'quarter_to_final' | 'semi_to_final'>('all');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'teams');
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'groups');
    });
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
    });
    const unsubInfo = onSnapshot(collection(db, 'tournamentInfo'), (snapshot) => {
      if (!snapshot.empty) {
        setTournamentInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TournamentInfo);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tournamentInfo');
    });
    return () => { unsubTeams(); unsubGroups(); unsubMatches(); unsubInfo(); };
  }, []);

  const standings = useMemo(() => {
    const statsMap = new Map<string, TeamStats>();

    // Pre-initialize stats for all teams
    for (const team of teams) {
      statsMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logoUrl,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalAverage: 0,
        goalDifference: 0,
        points: 0
      });
    }

    // Process only group stage matches that are live or finished
    const groupMatches = matches.filter(m => m.stage === 'group' && (m.status === 'live' || m.status === 'finished'));
    for (const match of groupMatches) {
      const teamA = statsMap.get(match.teamAId);
      const teamB = statsMap.get(match.teamBId);

      if (teamA && teamB) {
        teamA.played++;
        teamB.played++;
        teamA.goalsFor += match.scoreA;
        teamA.goalsAgainst += match.scoreB;
        teamB.goalsFor += match.scoreB;
        teamB.goalsAgainst += match.scoreA;

        if (match.scoreA > match.scoreB) {
          teamA.won++;
          teamA.points += 3;
          teamB.lost++;
        } else if (match.scoreA < match.scoreB) {
          teamB.won++;
          teamB.points += 3;
          teamA.lost++;
        } else {
          teamA.drawn++;
          teamA.points += 1;
          teamB.drawn++;
          teamB.points += 1;
        }
      }
    }

    // Finalize stats calculations
    for (const s of statsMap.values()) {
      s.goalDifference = s.goalsFor - s.goalsAgainst;
      s.goalAverage = s.goalsAgainst === 0 ? s.goalsFor : s.goalsFor / s.goalsAgainst;
    }

    return statsMap;
  }, [teams, matches]);

  const getGroupStandings = (groupId: string) => {
    return teams
      .filter(t => t.groupId === groupId)
      .map(t => standings.get(t.id)!)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        const teamA = teams.find(t => t.id === a.teamId);
        const teamB = teams.find(t => t.id === b.teamId);
        return (teamA?.groupPosition || 0) - (teamB?.groupPosition || 0);
      });
  };

  const getTeamCode = (teamId: string, groupId?: string) => {
    if (!groupId) return null;
    const groupTeams = teams.filter(t => t.groupId === groupId);
    const groupStats = Array.from(standings.values()).filter(s => groupTeams.some(gt => gt.id === s.teamId));
    
    // Sort by points, then goal difference, then goals for, then registration order
    const sortedStats = [...groupStats].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      const teamA = teams.find(t => t.id === a.teamId);
      const teamB = teams.find(t => t.id === b.teamId);
      return (teamA?.groupPosition || 0) - (teamB?.groupPosition || 0);
    });

    const rank = sortedStats.findIndex(s => s.teamId === teamId) + 1;
    const groupName = groups.find(g => g.id === groupId)?.name.charAt(groups.find(g => g.id === groupId)?.name.length ? groups.find(g => g.id)?.name.length! - 1 : 0) || '';
    return `${groupName}${rank}`;
  };

  const topScorers = useMemo(() => {
    const playerGoals: Record<string, { name: string; team: string; teamLogo?: string; goals: number }> = {};

    matches.forEach(match => {
      let include = false;
      if (scorerFilter === 'all') include = true;
      else if (scorerFilter === 'group' && match.stage === 'group') include = true;
      else if (scorerFilter === 'quarter_to_final' && ['quarter', 'semi', 'third_place', 'final'].includes(match.stage)) include = true;
      else if (scorerFilter === 'semi_to_final' && ['semi', 'third_place', 'final'].includes(match.stage)) include = true;

      if (include && match.scorers) {
        match.scorers.forEach(s => {
          const key = `${s.playerName}-${s.teamId}`;
          if (!playerGoals[key]) {
            const team = teams.find(t => t.id === s.teamId);
            playerGoals[key] = {
              name: s.playerName,
              team: team?.name || 'N/A',
              teamLogo: team?.logoUrl,
              goals: 0
            };
          }
          playerGoals[key].goals += s.goals;
        });
      }
    });

    return Object.values(playerGoals)
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.team.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.goals - a.goals).slice(0, 20);
  }, [matches, teams, scorerFilter, searchTerm]);

  const tournamentResults = useMemo(() => {
    const finalMatch = matches.find(m => m.stage === 'final' && m.status === 'finished');
    if (!finalMatch) return null;

    const thirdPlaceMatch = matches.find(m => m.stage === 'third_place' && m.status === 'finished');
    const semiMatches = matches.filter(m => m.stage === 'semi' && m.status === 'finished');
    const quarterMatches = matches.filter(m => m.stage === 'quarter' && m.status === 'finished');

    const johanId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
    const naibJohanId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamBId : finalMatch.teamAId;
    
    let tempatKetiga: Team | undefined;
    let tempatKeempat: Team | undefined;

    if (thirdPlaceMatch) {
      const winnerId = thirdPlaceMatch.scoreA > thirdPlaceMatch.scoreB ? thirdPlaceMatch.teamAId : thirdPlaceMatch.teamBId;
      const loserId = thirdPlaceMatch.scoreA > thirdPlaceMatch.scoreB ? thirdPlaceMatch.teamBId : thirdPlaceMatch.teamAId;
      tempatKetiga = teams.find(t => t.id === winnerId);
      tempatKeempat = teams.find(t => t.id === loserId);
    }

    // Quarter-final losers
    const quarterLoserIds = quarterMatches.map(m => m.scoreA > m.scoreB ? m.teamBId : m.teamAId);
    const quarterLosers = teams
      .filter(t => quarterLoserIds.includes(t.id))
      .map(t => standings.get(t.id)!)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        const teamA = teams.find(t => t.id === a.teamId);
        const teamB = teams.find(t => t.id === b.teamId);
        return (teamA?.groupPosition || 0) - (teamB?.groupPosition || 0);
      });

    const tempatKelima = quarterLosers.length > 0 ? teams.find(t => t.id === quarterLosers[0].teamId) : undefined;
    
    // Full Rankings
    const rankedIds = new Set([johanId, naibJohanId]);
    if (tempatKetiga) rankedIds.add(tempatKetiga.id);
    if (tempatKeempat) rankedIds.add(tempatKeempat.id);
    if (tempatKelima) rankedIds.add(tempatKelima.id);

    const otherRankings = teams
      .filter(t => !rankedIds.has(t.id))
      .map(t => standings.get(t.id)!)
      .sort((a, b) => {
        // First, check how far they got
        const getStageScore = (teamId: string) => {
          if (quarterMatches.some(m => m.teamAId === teamId || m.teamBId === teamId)) return 3; // Reached Quarters
          return 1; // Group Stage only
        };
        
        const stageA = getStageScore(a.teamId);
        const stageB = getStageScore(b.teamId);
        
        if (stageB !== stageA) return stageB - stageA;
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        const teamA = teams.find(t => t.id === a.teamId);
        const teamB = teams.find(t => t.id === b.teamId);
        return (teamA?.groupPosition || 0) - (teamB?.groupPosition || 0);
      })
      .map((s, index) => ({
        rank: index + 6,
        team: teams.find(t => t.id === s.teamId)!,
        stats: s
      }));

    return {
      johan: teams.find(t => t.id === johanId),
      naibJohan: teams.find(t => t.id === naibJohanId),
      tempatKetiga,
      tempatKeempat,
      tempatKelima,
      otherRankings
    };
  }, [matches, teams, standings]);

  const isFinalFinished = useMemo(() => {
    return matches.some(m => m.stage === 'final' && m.status === 'finished');
  }, [matches]);

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'N/A';
  const getTeamLogo = (id: string) => teams.find(t => t.id === id)?.logoUrl;

  const uniqueDates = useMemo(() => {
    const dates = new Set(matches.map(m => m.date).filter(Boolean));
    return Array.from(dates).sort();
  }, [matches]);

  const uniqueTimes = useMemo(() => {
    const times = new Set(matches.map(m => m.time).filter(Boolean));
    return Array.from(times).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches
      .filter(match => {
        const teamAName = getTeamName(match.teamAId).toLowerCase();
        const teamBName = getTeamName(match.teamBId).toLowerCase();
        const matchesSearch = teamAName.includes(searchTerm.toLowerCase()) || teamBName.includes(searchTerm.toLowerCase());
        const matchesDate = selectedDate === 'all' || match.date === selectedDate;
        
        let matchesStage = selectedStageFilter === 'all';
        if (selectedStageFilter === 'Peringkat Kumpulan') {
          matchesStage = match.stage === 'group';
        } else if (selectedStageFilter === 'Peringkat Kalah Singkir') {
          matchesStage = match.stage !== 'group';
        } else if (!matchesStage) {
          matchesStage = match.stage === selectedStageFilter || 
                         {
                           group: 'Peringkat Kumpulan',
                           knockout: 'Pusingan 12',
                           quarter: 'Suku Akhir',
                           semi: 'Separuh Akhir',
                           third_place: 'Penentuan Tempat Ke-3',
                           final: 'Akhir'
                         }[match.stage] === selectedStageFilter;
        }

        const matchesStatus = selectedStatusFilter === 'all' || (match.status || 'upcoming') === selectedStatusFilter;
        const matchesTime = selectedTimeFilter === 'all' || match.time === selectedTimeFilter;
        return matchesSearch && matchesDate && matchesStage && matchesStatus && matchesTime;
      })
      .sort((a, b) => {
        // 1. Stage order: final > semi > third_place > quarter > group
        const stageOrder: Record<MatchStage, number> = {
          final: 0,
          semi: 1,
          third_place: 2,
          quarter: 3,
          group: 4
        };
        if (stageOrder[a.stage] !== stageOrder[b.stage]) {
          return stageOrder[a.stage] - stageOrder[b.stage];
        }

        // 2. Status order: live > upcoming > finished
        const statusOrder: Record<MatchStatus, number> = { live: 0, upcoming: 1, finished: 2 };
        const statusA = a.status || 'upcoming';
        const statusB = b.status || 'upcoming';
        if (statusOrder[statusA] !== statusOrder[statusB]) {
          return statusOrder[statusA] - statusOrder[statusB];
        }

        // 3. Date order: newest first
        if (a.date !== b.date) {
          return (b.date || '').localeCompare(a.date || '');
        }

        // 4. Time order: newest first
        return (b.time || '').localeCompare(a.time || '');
      });
  }, [matches, searchTerm, selectedDate, selectedStageFilter, selectedStatusFilter, selectedTimeFilter, teams]);

  const stages = [
    { value: 'group', label: 'Peringkat Kumpulan' },
    { value: 'knockout_all', label: 'Peringkat Kalah Singkir' },
    { value: 'quarter', label: 'Suku Akhir' },
    { value: 'semi', label: 'Separuh Akhir' },
    { value: 'third_place', label: 'Penentuan Tempat Ke-3' },
    { value: 'final', label: 'Akhir' }
  ];

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-white p-3 sm:p-8 rounded-xl sm:2xl shadow-sm border border-pink-light text-center space-y-3">
        {tournamentInfo?.tournamentLogoUrl ? (
          <div className="w-12 h-12 sm:w-24 sm:h-24 mx-auto mb-1 bg-white rounded-xl p-1.5 shadow-sm border border-pink-light/30 flex items-center justify-center">
            <img src={tournamentInfo.tournamentLogoUrl} alt="Logo Kejohanan" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
          </div>
        ) : (
          <div className="w-12 h-12 sm:w-20 sm:h-20 mx-auto mb-1 bg-matcha/5 rounded-full flex items-center justify-center">
            <Trophy className="h-6 w-6 sm:h-10 sm:w-10 text-matcha" />
          </div>
        )}
        <h2 className="text-base sm:text-3xl font-black text-matcha-dark tracking-tight uppercase">{tournamentInfo?.name || 'KEPUTUSAN & JADUAL TERKINI'}</h2>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-full font-bold text-[10px] sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'schedule' ? 'bg-matcha-gradient text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-matcha/10'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Jadual
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-full font-bold text-[10px] sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'standings' ? 'bg-matcha-gradient text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-matcha/10'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Kedudukan
          </button>
          <button
            onClick={() => setActiveTab('topScorers')}
            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-full font-bold text-[10px] sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'topScorers' ? 'bg-matcha-gradient text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-matcha/10'
            }`}
          >
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Penjaring Terbanyak
          </button>
          {isFinalFinished && (
            <button
              onClick={() => setActiveTab('officialResults')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-full font-bold text-[10px] sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'officialResults' ? 'bg-matcha-gradient text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-matcha/10'
              }`}
            >
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Keputusan Rasmi
            </button>
          )}
        </div>
      </div>

      {activeTab === 'standings' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {sortedGroups.map(group => (
              <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-pink-light overflow-hidden">
                <div className="bg-matcha-gradient p-4 flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-pink-light" />
                    {group.name}
                  </h3>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-[9px] sm:text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[7px] sm:text-xs font-bold">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:3 text-left">Pasukan</th>
                        <th className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">P</th>
                        <th className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">M</th>
                        <th className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">S</th>
                        <th className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">K</th>
                        <th className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">JG</th>
                        <th className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">JK</th>
                        <th className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">PG</th>
                        <th className="w-8 sm:w-12 px-0.5 sm:px-1 py-2 sm:3 text-center">MT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getGroupStandings(group.id).map((s, i) => (
                        <tr key={s.teamId} className={i < 2 ? 'bg-pink-gradient' : ''}>
                          <td className="px-2 sm:px-4 py-2 sm:3 font-bold text-gray-800 flex items-center gap-1.5 sm:gap-3">
                            <div className="relative flex items-center gap-1.5 sm:gap-3">
                              <span className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[7px] sm:text-[10px] flex-shrink-0 ${i < 2 ? 'bg-matcha-gradient text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {i + 1}
                              </span>
                              {i < 2 && (
                                <Star className="absolute -top-1 -left-1 h-2 w-2 sm:h-3 sm:w-3 text-yellow-500 fill-yellow-500" />
                              )}
                              {s.teamLogo && (
                                <img src={s.teamLogo} alt="" className="w-4 h-4 sm:w-6 sm:h-6 object-contain bg-white p-0.5 rounded border border-gray-100" referrerPolicy="no-referrer" />
                              )}
                            </div>
                            <span className="whitespace-normal break-words leading-tight text-[9px] sm:text-sm">{s.teamName}</span>
                          </td>
                          <td className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">{s.played}</td>
                          <td className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">{s.won}</td>
                          <td className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">{s.drawn}</td>
                          <td className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">{s.lost}</td>
                          <td className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">{s.goalsFor}</td>
                          <td className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center">{s.goalsAgainst}</td>
                          <td className="w-6 sm:w-10 px-0.5 sm:px-1 py-2 sm:3 text-center font-medium">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                          <td className="w-8 sm:w-12 px-0.5 sm:px-1 py-2 sm:3 text-center font-black text-matcha-dark">{s.points}</td>
                        </tr>
                      ))}
                      {getGroupStandings(group.id).length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">Tiada pasukan dalam kumpulan ini</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          
          {/* Standings Legend */}
          <div className="mt-8 bg-white p-4 rounded-xl border border-pink-light flex flex-wrap justify-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">P:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Perlawanan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">M:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Menang</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">S:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Seri</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">K:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Kalah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">JG:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Jaringan Gol</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">JK:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Jaringan Kena</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">PG:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Perbezaan Gol</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-matcha text-[10px]">MT:</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mata</span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-8">
          {/* Filter Bar */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-pink-light space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari pasukan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-matcha focus:border-transparent outline-none transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl">
                  <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-[10px] sm:text-sm font-bold text-gray-600 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Tarikh</option>
                    {uniqueDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <select
                    value={selectedTimeFilter}
                    onChange={(e) => setSelectedTimeFilter(e.target.value)}
                    className="bg-transparent text-[10px] sm:text-sm font-bold text-gray-600 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Masa</option>
                    {uniqueTimes.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl">
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-transparent text-[10px] sm:text-sm font-bold text-gray-600 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Status</option>
                    {STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <select
                    value={selectedStageFilter}
                    onChange={(e) => setSelectedStageFilter(e.target.value)}
                    className="bg-transparent text-[10px] sm:text-sm font-bold text-gray-600 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Peringkat</option>
                    {stages.map(stage => (
                      <option key={stage.value} value={stage.label}>{stage.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {(searchTerm || selectedDate !== 'all' || selectedStageFilter !== 'all' || selectedStatusFilter !== 'all' || selectedTimeFilter !== 'all') && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                  Menunjukkan {filteredMatches.length} perlawanan
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDate('all');
                    setSelectedStageFilter('all');
                    setSelectedStatusFilter('all');
                    setSelectedTimeFilter('all');
                  }}
                  className="text-xs text-matcha font-bold hover:underline"
                >
                  Kosongkan Penapis
                </button>
              </div>
            )}
          </div>

          {['group', 'knockout', 'quarter', 'semi', 'third_place', 'final'].map(stage => {
            const stageMatches = filteredMatches.filter(m => m.stage === stage);
            if (stageMatches.length === 0) return null;
            
            const stageLabel = {
              group: 'Peringkat Kumpulan',
              knockout: 'Pusingan 12',
              quarter: 'Suku Akhir',
              semi: 'Separuh Akhir',
              third_place: 'Penentuan Tempat Ke-3',
              final: 'Akhir'
            }[stage as MatchStage];

            return (
              <div key={stage} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-pink-light flex-1"></div>
                  <h3 className="text-matcha-dark font-black uppercase tracking-widest text-sm">{stageLabel}</h3>
                  <div className="h-px bg-pink-light flex-1"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stageMatches.map(match => {
                    const isFinished = match.status === 'finished';
                    
                    return (
                      <div key={match.id} className={`rounded-xl sm:rounded-2xl border border-pink-light p-3 sm:p-4 shadow-sm hover:shadow-md transition-all group ${isFinished ? 'bg-matcha-light/5' : 'bg-white'}`}>
                        {/* Match Info Header */}
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-4 pb-3 border-b border-gray-50">
                          <span className="bg-matcha/10 text-matcha-dark px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-black uppercase border border-matcha/20">
                            {match.stage === 'group' ? (groups.find(g => g.id === match.groupId)?.name || 'KUMPULAN') : stageLabel}
                          </span>
                          <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-gray-500 font-bold">
                            <CalendarDays className="h-3 w-3 text-matcha" />
                            {match.date || 'TBA'}
                          </div>
                          <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-gray-500 font-bold">
                            <Clock className="h-3 w-3 text-matcha" />
                            {match.time || 'TBA'}
                          </div>
                          <div className="text-[8px] sm:text-[10px] font-black text-matcha uppercase tracking-widest">
                            {match.court}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold border ${STATUSES.find(s => s.value === (match.status || 'upcoming'))?.color}`}>
                            {STATUSES.find(s => s.value === (match.status || 'upcoming'))?.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                          {/* Team A */}
                          <div className="flex-1 text-center space-y-1">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-matcha/5 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform overflow-hidden p-1 sm:p-2 border border-matcha/10">
                              {getTeamLogo(match.teamAId) ? (
                                <img src={getTeamLogo(match.teamAId)} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-matcha font-black text-sm sm:text-xl">{getTeamName(match.teamAId).charAt(0)}</span>
                              )}
                            </div>
                            <div className="font-bold text-gray-800 text-[9px] sm:text-[12px] leading-tight line-clamp-2 min-h-[24px] sm:min-h-[32px]">{getTeamName(match.teamAId)}</div>
                            <div className="space-y-0.5 text-center h-6 sm:h-8 overflow-y-auto scrollbar-hide">
                              {match.scorers?.filter(s => s.teamId === match.teamAId).map((s, idx) => (
                                <div key={idx} className="text-[6px] sm:text-[9px] text-gray-500 italic leading-none">{s.playerName} ({s.goals})</div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Score Column */}
                          <div className="flex flex-col items-center flex-shrink-0 px-2">
                            <div className="flex items-center gap-2 sm:gap-3 bg-matcha/5 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-matcha/10">
                              <span className="text-xl sm:text-3xl font-black text-matcha-dark">{match.scoreA}</span>
                              <span className="text-gray-300 font-bold text-lg sm:text-2xl">:</span>
                              <span className="text-xl sm:text-3xl font-black text-matcha-dark">{match.scoreB}</span>
                            </div>
                          </div>
    
                          {/* Team B */}
                          <div className="flex-1 text-center space-y-1">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-pink-light/10 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform overflow-hidden p-1 sm:p-2 border border-pink-light/20">
                              {getTeamLogo(match.teamBId) ? (
                                <img src={getTeamLogo(match.teamBId)} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-pink-light font-black text-sm sm:text-xl">{getTeamName(match.teamBId).charAt(0)}</span>
                              )}
                            </div>
                            <div className="font-bold text-gray-800 text-[9px] sm:text-[12px] leading-tight line-clamp-2 min-h-[24px] sm:min-h-[32px]">{getTeamName(match.teamBId)}</div>
                            <div className="space-y-0.5 text-center h-6 sm:h-8 overflow-y-auto scrollbar-hide">
                              {match.scorers?.filter(s => s.teamId === match.teamBId).map((s, idx) => (
                                <div key={idx} className="text-[6px] sm:text-[9px] text-gray-500 italic leading-none">{s.playerName} ({s.goals})</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredMatches.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-pink-light text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <h4 className="text-gray-800 font-bold">Tiada perlawanan dijumpai</h4>
                <p className="text-gray-400 text-sm">Cuba tukar penapis atau kata kunci carian anda.</p>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDate('all');
                  setSelectedStageFilter('all');
                  setSelectedStatusFilter('all');
                  setSelectedTimeFilter('all');
                }}
                className="text-matcha font-bold text-sm hover:underline"
              >
                Kosongkan Semua Penapis
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'topScorers' && (
        <div className="bg-white p-3 md:8 rounded-xl md:2xl shadow-sm border border-pink-light animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:4 mb-3 md:8">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Trophy className="h-4 w-4 md:h-6 md:w-6 text-matcha" />
              <h3 className="text-sm md:text-xl font-bold text-gray-800 uppercase tracking-tight">Penjaring Terbanyak</h3>
            </div>
            
            <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-100 self-start">
              <Filter className="h-3 w-3 md:h-4 md:w-4 text-gray-400 ml-1 md:2" />
              <select 
                value={scorerFilter}
                onChange={(e) => setScorerFilter(e.target.value as any)}
                className="bg-transparent border-none text-[9px] md:text-sm font-bold text-gray-600 focus:ring-0 cursor-pointer pr-5 md:8"
              >
                <option value="all">Keseluruhan</option>
                <option value="group">Peringkat Kumpulan Sahaja</option>
                <option value="quarter_to_final">Suku Akhir ke Akhir</option>
                <option value="semi_to_final">Separuh Akhir ke Akhir</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-[9px] md:text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[7px] md:text-xs font-bold">
                <tr>
                  <th className="px-2 md:4 py-2 md:3 text-left w-8 md:16">Ked.</th>
                  <th className="px-2 md:4 py-2 md:3 text-left">Pemain & Pasukan</th>
                  <th className="px-2 md:4 py-2 md:3 text-center">Gol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topScorers.map((scorer, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 md:4 py-2 md:3 font-black text-gray-400">{idx + 1}</td>
                    <td className="px-2 md:4 py-2 md:3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 break-words text-[10px] md:text-base">{scorer.name}</span>
                        <div className="flex items-center gap-1 md:2 mt-0.5">
                          {scorer.teamLogo && (
                            <img src={scorer.teamLogo} alt="" className="w-3 h-3 md:w-5 md:h-5 object-contain bg-white p-0.5 rounded border border-gray-100 shrink-0" referrerPolicy="no-referrer" />
                          )}
                          <span className="text-[8px] md:text-xs text-gray-500 font-medium break-words leading-tight">{scorer.team}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 md:4 py-2 md:3 text-center">
                      <span className="inline-block bg-matcha/10 text-matcha-dark px-1.5 md:3 py-0.5 md:1 rounded-full font-black">
                        {scorer.goals}
                      </span>
                    </td>
                  </tr>
                ))}
                {topScorers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">Tiada data penjaring.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'officialResults' && tournamentResults && (
        <div className="bg-white p-3 md:p-8 rounded-xl md:2xl shadow-sm border border-pink-light animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center space-x-2 md:space-x-3 mb-6 md:mb-10">
            <Trophy className="h-5 w-5 md:h-7 md:w-7 text-matcha" />
            <h3 className="text-base md:text-2xl font-black text-gray-800 uppercase tracking-tight">Keputusan Rasmi Kejohanan</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            {/* Johan */}
            <div className="bg-yellow-50 p-4 md:p-6 rounded-2xl border-2 border-yellow-200 text-center space-y-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-400 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">1st</div>
              <div className="bg-yellow-400 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto shadow-lg ring-4 ring-yellow-100">
                <Trophy className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-yellow-600 uppercase tracking-widest">Johan</p>
                <h4 className="text-sm md:text-base font-black text-gray-800 leading-tight mt-1 break-words">{tournamentResults.johan?.name}</h4>
              </div>
              {tournamentResults.johan?.logoUrl && (
                <img src={tournamentResults.johan.logoUrl} alt="" className="w-10 h-10 md:w-16 md:h-16 mx-auto object-contain drop-shadow-md" referrerPolicy="no-referrer" />
              )}
            </div>
            {/* Naib Johan */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-2xl border-2 border-gray-200 text-center space-y-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gray-400 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">2nd</div>
              <div className="bg-gray-400 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto shadow-lg ring-4 ring-gray-100">
                <Medal className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest">Naib Johan</p>
                <h4 className="text-sm md:text-base font-black text-gray-800 leading-tight mt-1 break-words">{tournamentResults.naibJohan?.name}</h4>
              </div>
              {tournamentResults.naibJohan?.logoUrl && (
                <img src={tournamentResults.naibJohan.logoUrl} alt="" className="w-10 h-10 md:w-16 md:h-16 mx-auto object-contain drop-shadow-md" referrerPolicy="no-referrer" />
              )}
            </div>
            {/* Tempat Ketiga */}
            <div className="bg-orange-50 p-4 md:p-6 rounded-2xl border-2 border-orange-200 text-center space-y-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-400 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">3rd</div>
              <div className="bg-orange-400 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto shadow-lg ring-4 ring-orange-100">
                <Medal className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-widest">Tempat Ketiga</p>
                <h4 className="text-sm md:text-base font-black text-gray-800 leading-tight mt-1 break-words">{tournamentResults.tempatKetiga?.name || 'N/A'}</h4>
              </div>
              {tournamentResults.tempatKetiga?.logoUrl && (
                <img src={tournamentResults.tempatKetiga.logoUrl} alt="" className="w-10 h-10 md:w-16 md:h-16 mx-auto object-contain drop-shadow-md" referrerPolicy="no-referrer" />
              )}
            </div>
            {/* Tempat Keempat */}
            <div className="bg-blue-50 p-4 md:p-6 rounded-2xl border-2 border-blue-200 text-center space-y-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-400 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">4th</div>
              <div className="bg-blue-400 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto shadow-lg ring-4 ring-blue-100">
                <Star className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest">Tempat Keempat</p>
                <h4 className="text-sm md:text-base font-black text-gray-800 leading-tight mt-1 break-words">{tournamentResults.tempatKeempat?.name || 'N/A'}</h4>
              </div>
              {tournamentResults.tempatKeempat?.logoUrl && (
                <img src={tournamentResults.tempatKeempat.logoUrl} alt="" className="w-10 h-10 md:w-16 md:h-16 mx-auto object-contain drop-shadow-md" referrerPolicy="no-referrer" />
              )}
            </div>
            {/* Tempat Kelima */}
            <div className="bg-green-50 p-4 md:p-6 rounded-2xl border-2 border-green-200 text-center space-y-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-400 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">5th</div>
              <div className="bg-green-400 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto shadow-lg ring-4 ring-green-100">
                <Star className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-green-600 uppercase tracking-widest">Tempat Kelima</p>
                <h4 className="text-sm md:text-base font-black text-gray-800 leading-tight mt-1 break-words">{tournamentResults.tempatKelima?.name || 'N/A'}</h4>
              </div>
              {tournamentResults.tempatKelima?.logoUrl && (
                <img src={tournamentResults.tempatKelima.logoUrl} alt="" className="w-10 h-10 md:w-16 md:h-16 mx-auto object-contain drop-shadow-md" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>

          {/* Other Rankings */}
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-3">
              <LayoutGrid className="h-5 w-5 text-matcha" />
              <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">Kedudukan Keseluruhan (6 - {teams.length})</h4>
            </div>
            <div className="overflow-hidden bg-white rounded-2xl border border-pink-light shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-16">Ked.</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pasukan</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">MT</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">PG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tournamentResults.otherRankings.map((r) => (
                    <tr key={r.team.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-black text-gray-400 text-xs">{r.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.team.logoUrl && (
                            <img src={r.team.logoUrl} alt="" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                          )}
                          <span className="font-bold text-gray-700 text-sm uppercase tracking-tight">{r.team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-black text-matcha text-sm">{r.stats.points}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-500 text-sm">{r.stats.goalDifference > 0 ? `+${r.stats.goalDifference}` : r.stats.goalDifference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
