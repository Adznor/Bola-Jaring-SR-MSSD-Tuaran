import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Team, Match, MatchStage, MatchStatus, Scorer, Group, POSITION_ORDER, TeamStats } from '../types';
import { Plus, Trash2, CalendarDays, Trophy, Save, X, UserPlus, Zap, Clock, Play, CheckCircle, LayoutGrid, Search, Filter } from 'lucide-react';

const COURTS = ['Gelanggang A', 'Gelanggang B', 'Gelanggang C', 'Gelanggang D'];
const STAGES: { value: MatchStage; label: string }[] = [
  { value: 'group', label: 'Peringkat Kumpulan' },
  { value: 'quarter', label: 'Suku Akhir' },
  { value: 'semi', label: 'Separuh Akhir' },
  { value: 'third_place', label: 'Penentuan Tempat Ke-3' },
  { value: 'final', label: 'Akhir' },
];

const STATUSES: { value: MatchStatus; label: string; color: string }[] = [
  { value: 'upcoming', label: 'Akan Datang', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'live', label: 'Sedang Berlangsung', color: 'bg-red-100 text-red-700 border-red-200 animate-pulse' },
  { value: 'finished', label: 'Tamat', color: 'bg-[#004d00] text-white border-[#003300]' },
];

export default function MatchEntry() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; ids: string[]; message: string }>({ show: false, ids: [], message: '' });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [court, setCourt] = useState<Match['court']>('Gelanggang A');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [stage, setStage] = useState<MatchStage>('group');
  const [status, setStatus] = useState<MatchStatus>('upcoming');
  const [formGroupId, setFormGroupId] = useState<string>('');
  const [placeholderLabel, setPlaceholderLabel] = useState('');
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [newScorerNameA, setNewScorerNameA] = useState('');
  const [newScorerGoalsA, setNewScorerGoalsA] = useState(1);
  const [newScorerNameB, setNewScorerNameB] = useState('');
  const [newScorerGoalsB, setNewScorerGoalsB] = useState(1);

  const [activeMatrixGroup, setActiveMatrixGroup] = useState<string>('');
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 3000);
  };

  useEffect(() => {
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)).sort((a, b) => a.name.localeCompare(b.name));
      setGroups(groupsData);
      if (groupsData.length > 0 && !activeMatrixGroup) {
        setActiveMatrixGroup(groupsData[0].id);
      }
    });
    return () => { unsubMatches(); unsubTeams(); unsubGroups(); };
  }, [activeMatrixGroup]);

  useEffect(() => {
    const totalA = scorers
      .filter(s => s.teamId === teamAId)
      .reduce((sum, s) => sum + s.goals, 0);
    const totalB = scorers
      .filter(s => s.teamId === teamBId)
      .reduce((sum, s) => sum + s.goals, 0);
    
    setScoreA(totalA);
    setScoreB(totalB);
  }, [scorers, teamAId, teamBId]);

  const handleAddScorer = (teamId: string, name: string, goals: number) => {
    if (!name || !teamId || goals <= 0) return;
    const existingIdx = scorers.findIndex(s => s.playerName === name && s.teamId === teamId);
    if (existingIdx >= 0) {
      const updatedScorers = [...scorers];
      updatedScorers[existingIdx].goals += goals;
      setScorers(updatedScorers);
    } else {
      setScorers([...scorers, { playerName: name, teamId, goals }]);
    }

    if (teamId === teamAId) {
      setNewScorerNameA('');
      setNewScorerGoalsA(1);
    } else {
      setNewScorerNameB('');
      setNewScorerGoalsB(1);
    }
  };

  const handleRemoveScorer = (index: number) => {
    setScorers(scorers.filter((_, i) => i !== index));
  };

  const saveBasicInfo = async () => {
    if (!teamAId || !teamBId) {
      showNotification('Sila pilih pasukan.', 'error');
      return false;
    }
    if (teamAId === teamBId) {
      showNotification('Pasukan A dan B tidak boleh sama.', 'error');
      return false;
    }

    const matchData = {
      date,
      time,
      court,
      teamAId,
      teamBId,
      scoreA,
      scoreB,
      stage,
      status,
      groupId: stage === 'group' ? formGroupId || null : null,
      placeholderLabel: placeholderLabel || null,
      scorers,
    };

    try {
      if (editingMatch) {
        await updateDoc(doc(db, 'matches', editingMatch.id), matchData);
        showNotification('Maklumat perlawanan berjaya dikemaskini.');
      } else {
        await addDoc(collection(db, 'matches'), matchData);
        showNotification('Perlawanan baru berjaya ditambah.');
      }
      return true;
    } catch (err) {
      console.error('Error saving match info:', err);
      showNotification('Ralat semasa menyimpan maklumat.', 'error');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveBasicInfo();
    if (success) {
      resetForm();
    }
  };

  const resetForm = () => {
    setDate('');
    setTime('');
    setCourt('Gelanggang A');
    setTeamAId('');
    setTeamBId('');
    setScoreA(0);
    setScoreB(0);
    setStage('group');
    setStatus('upcoming');
    setFormGroupId('');
    setPlaceholderLabel('');
    setScorers([]);
    setEditingMatch(null);
    setShowForm(false);
    setNewScorerNameA('');
    setNewScorerNameB('');
  };

  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    setDate(match.date);
    setTime(match.time);
    setCourt(match.court);
    setTeamAId(match.teamAId);
    setTeamBId(match.teamBId);
    setScoreA(match.scoreA);
    setScoreB(match.scoreB);
    setStage(match.stage);
    setStatus(match.status || 'upcoming');
    setFormGroupId(match.groupId || '');
    setPlaceholderLabel(match.placeholderLabel || '');
    setScorers(match.scorers || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({
      show: true,
      ids: [id],
      message: 'Padam perlawanan ini? Semua keputusan berkaitan akan ditarik balik.'
    });
  };

  const handleDeleteSelected = () => {
    if (selectedMatches.length === 0) return;
    setDeleteConfirm({
      show: true,
      ids: selectedMatches,
      message: `Padam ${selectedMatches.length} perlawanan yang dipilih?`
    });
  };

  const confirmDelete = async () => {
    try {
      for (const id of deleteConfirm.ids) {
        await deleteDoc(doc(db, 'matches', id));
      }
      setSelectedMatches(prev => prev.filter(mid => !deleteConfirm.ids.includes(mid)));
      setDeleteConfirm({ show: false, ids: [], message: '' });
      alert('Perlawanan telah dipadam.');
    } catch (err) {
      console.error('Error deleting matches:', err);
      alert('Ralat semasa memadam perlawanan.');
    }
  };

  const toggleMatchSelection = (id: string) => {
    setSelectedMatches(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'N/A';
  const getTeamLogo = (id: string) => teams.find(t => t.id === id)?.logoUrl;
  const getTeamPlayers = (id: string) => teams.find(t => t.id === id)?.players || [];

  const getTeamCode = (teamId: string, groupId?: string) => {
    if (!groupId) return '';
    const group = groups.find(g => g.id === groupId);
    if (!group) return '';
    const groupLetter = group.name.split(' ').pop()?.charAt(0) || group.name.charAt(0);
    const groupTeams = teams
      .filter(t => t.groupId === groupId)
      .sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.name.localeCompare(b.name);
      });
    const index = groupTeams.findIndex(t => t.id === teamId);
    return index >= 0 ? `${groupLetter}${index + 1}` : '';
  };

  const top12Teams = useMemo(() => {
    const statsMap = new Map<string, TeamStats>();
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

    const groupMatches = matches.filter(m => m.stage === 'group' && (m.status === 'live' || m.status === 'finished'));
    for (const match of groupMatches) {
      const teamA = match.teamAId ? statsMap.get(match.teamAId) : null;
      const teamB = match.teamBId ? statsMap.get(match.teamBId) : null;
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

    for (const s of statsMap.values()) {
      s.goalDifference = s.goalsFor - s.goalsAgainst;
      s.goalAverage = s.goalsAgainst === 0 ? s.goalsFor : s.goalsFor / s.goalsAgainst;
    }

    const allStats = Array.from(statsMap.values());
    return allStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    }).slice(0, 8); // Top 8 for Quarter Finals
  }, [teams, matches]);

  const getFilteredTeams = (currentStage: MatchStage, currentTeamId: string, otherTeamId: string) => {
    if (currentStage === 'group') {
      return teams.filter(t => !formGroupId || t.groupId === formGroupId);
    }

    // Get teams already assigned to matches in this stage (excluding current match)
    const assignedTeams = matches
      .filter(m => m.stage === currentStage && m.id !== editingMatch?.id)
      .flatMap(m => [m.teamAId, m.teamBId]);

    if (currentStage === 'quarter') {
      const ranked1to8 = top12Teams.map(t => t.teamId);
      return teams.filter(t => ranked1to8.includes(t.id) && (!assignedTeams.includes(t.id) || t.id === currentTeamId));
    }

    if (currentStage === 'semi') {
      const quarterMatches = matches.filter(m => m.stage === 'quarter');
      const allQuarterFinished = quarterMatches.length > 0 && quarterMatches.every(m => m.status === 'finished');
      
      // If editing or if we want to allow early scheduling, show all teams that could potentially be in semi
      if (!allQuarterFinished && !editingMatch) return [];

      const quarterWinners = quarterMatches
        .filter(m => m.status === 'finished')
        .map(m => m.scoreA > m.scoreB ? m.teamAId : m.teamBId);
      
      // If not finished, show all teams that were in quarter finals
      const quarterTeams = quarterMatches.flatMap(m => [m.teamAId, m.teamBId]);
      const allowedTeams = quarterWinners.length > 0 ? quarterWinners : quarterTeams;
      
      return teams.filter(t => allowedTeams.includes(t.id) && (!assignedTeams.includes(t.id) || t.id === currentTeamId));
    }

    if (currentStage === 'third_place') {
      const semiMatches = matches.filter(m => m.stage === 'semi');
      const allSemiFinished = semiMatches.length > 0 && semiMatches.every(m => m.status === 'finished');
      
      if (!allSemiFinished && !editingMatch) return [];

      const semiLosers = semiMatches
        .filter(m => m.status === 'finished')
        .map(m => m.scoreA > m.scoreB ? m.teamBId : m.teamAId);
      
      const semiTeams = semiMatches.flatMap(m => [m.teamAId, m.teamBId]);
      const allowedTeams = semiLosers.length > 0 ? semiLosers : semiTeams;
      
      return teams.filter(t => allowedTeams.includes(t.id) && (!assignedTeams.includes(t.id) || t.id === currentTeamId));
    }

    if (currentStage === 'final') {
      const semiMatches = matches.filter(m => m.stage === 'semi');
      const allSemiFinished = semiMatches.length > 0 && semiMatches.every(m => m.status === 'finished');
      
      if (!allSemiFinished && !editingMatch) return [];

      const semiWinners = semiMatches
        .filter(m => m.status === 'finished')
        .map(m => m.scoreA > m.scoreB ? m.teamAId : m.teamBId);
      
      const semiTeams = semiMatches.flatMap(m => [m.teamAId, m.teamBId]);
      const allowedTeams = semiWinners.length > 0 ? semiWinners : semiTeams;
      
      return teams.filter(t => allowedTeams.includes(t.id) && (!assignedTeams.includes(t.id) || t.id === currentTeamId));
    }

    return teams;
  };

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

  const filterStages = [
    { value: 'group', label: 'Peringkat Kumpulan' },
    { value: 'knockout_all', label: 'Peringkat Kalah Singkir' },
    { value: 'quarter', label: 'Suku Akhir' },
    { value: 'semi', label: 'Separuh Akhir' },
    { value: 'third_place', label: 'Penentuan Tempat Ke-3' },
    { value: 'final', label: 'Akhir' }
  ];

  function MatchCard({ match }: { match: Match }) {
    const isSelected = selectedMatches.includes(match.id);
    const isFinished = match.status === 'finished';
    const statusInfo = STATUSES.find(s => s.value === (match.status || 'upcoming'));
    
    return (
      <div 
        onClick={() => handleEdit(match)}
        className={`border rounded-xl p-3 md:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${isSelected ? 'border-magenta ring-1 ring-magenta' : 'border-pink-light'} ${isFinished ? 'bg-matcha-light/5' : 'bg-white'}`}
      >
        {/* Top: Match Info (Compact) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                toggleMatchSelection(match.id);
              }}
              className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-gray-300 text-magenta focus:ring-magenta cursor-pointer"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="bg-matcha/10 text-matcha-dark px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-black uppercase border border-matcha/20">
                {match.stage === 'group' ? (groups.find(g => g.id === match.groupId)?.name || 'KUMPULAN') : STAGES.find(s => s.value === match.stage)?.label}
              </span>
              {match.placeholderLabel && (
                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-black uppercase border border-blue-100">
                  {match.placeholderLabel}
                </span>
              )}
              <div className="flex items-center gap-1 text-[8px] md:text-[10px] text-gray-500 font-bold">
                <CalendarDays className="h-3 w-3" />
                <span>{match.date || 'TBA'}</span>
                <Clock className="h-3 w-3 ml-1" />
                <span>{match.time || 'TBA'}</span>
                <span className="mx-1 text-gray-300">|</span>
                <span className="text-matcha uppercase">{match.court}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold border ${statusInfo?.color}`}>
              {statusInfo?.label}
            </span>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleDelete(match.id); 
              }} 
              className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          </div>
        </div>

        {/* Middle: Teams and Score */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex-1 text-center">
            <div className="flex flex-col items-center gap-1">
              {match.stage === 'group' && match.teamAId && (
                <span className="text-[8px] md:text-[10px] font-black text-matcha uppercase tracking-tighter">
                  {getTeamCode(match.teamAId, match.groupId)}
                </span>
              )}
              <div className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-lg border border-gray-100 p-1 flex items-center justify-center shrink-0">
                {match.teamAId && getTeamLogo(match.teamAId) ? (
                  <img src={getTeamLogo(match.teamAId)} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <Trophy className="h-4 w-4 md:h-6 md:w-6 text-gray-200" />
                )}
              </div>
              <div className="font-bold text-gray-800 text-[10px] md:text-sm leading-tight break-words line-clamp-2 h-8 md:h-10 flex items-center justify-center">
                {match.teamAId ? getTeamName(match.teamAId) : 'TBA'}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="flex items-center gap-2 md:gap-3 bg-gray-50 px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl border border-gray-100 group-hover:bg-matcha/5 transition-colors">
              <span className="text-xl md:text-3xl font-black text-matcha-dark">{match.scoreA}</span>
              <span className="text-gray-300 font-bold text-lg md:text-2xl">-</span>
              <span className="text-xl md:text-3xl font-black text-matcha-dark">{match.scoreB}</span>
            </div>
          </div>

          <div className="flex-1 text-center">
            <div className="flex flex-col items-center gap-1">
              {match.stage === 'group' && match.teamBId && (
                <span className="text-[8px] md:text-[10px] font-black text-matcha uppercase tracking-tighter">
                  {getTeamCode(match.teamBId, match.groupId)}
                </span>
              )}
              <div className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-lg border border-gray-100 p-1 flex items-center justify-center shrink-0">
                {match.teamBId && getTeamLogo(match.teamBId) ? (
                  <img src={getTeamLogo(match.teamBId)} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <Trophy className="h-4 w-4 md:h-6 md:w-6 text-gray-200" />
                )}
              </div>
              <div className="font-bold text-gray-800 text-[10px] md:text-sm leading-tight break-words line-clamp-2 h-8 md:h-10 flex items-center justify-center">
                {match.teamBId ? getTeamName(match.teamBId) : 'TBA'}
              </div>
            </div>
          </div>
        </div>

        {/* Scorers (Optional, small) */}
        {(match.scorers?.length || 0) > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
            <div className="space-y-0.5">
              {match.scorers?.filter(s => s.teamId === match.teamAId).slice(0, 2).map((s, idx) => (
                <div key={idx} className="text-[7px] md:text-[9px] text-gray-500 italic truncate text-right">
                  {s.playerName} ({s.goals})
                </div>
              ))}
            </div>
            <div className="space-y-0.5">
              {match.scorers?.filter(s => s.teamId === match.teamBId).slice(0, 2).map((s, idx) => (
                <div key={idx} className="text-[7px] md:text-[9px] text-gray-500 italic truncate text-left">
                  {s.playerName} ({s.goals})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const checkMatchExists = (teamAId: string, teamBId: string) => {
    return matches.some(m => 
      m.stage === 'group' && 
      ((m.teamAId === teamAId && m.teamBId === teamBId) || 
       (m.teamAId === teamBId && m.teamBId === teamAId))
    );
  };

  const matrixGroupTeams = useMemo(() => {
    return teams
      .filter(t => t.groupId === activeMatrixGroup)
      .sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.name.localeCompare(b.name);
      });
  }, [teams, activeMatrixGroup]);

  return (
    <div className="space-y-10">
      {/* Group Matrix Section */}
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-matcha" />
          Jadual Matriks Kumpulan
        </h3>

        <div className="flex overflow-x-auto scrollbar-hide gap-2 border-b border-pink-light pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setActiveMatrixGroup(group.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all ${
                activeMatrixGroup === group.id ? 'bg-matcha-gradient text-white shadow-md' : 'bg-white text-gray-500 hover:bg-matcha/10'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>

        {activeMatrixGroup && (
          <div className="bg-white rounded-xl shadow-lg border border-pink-light overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-[9px] md:text-[11px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-1.5 border-r border-gray-100 text-left font-black text-gray-400 uppercase tracking-widest text-[8px]">Pasukan</th>
                    {matrixGroupTeams.map(team => (
                      <th key={team.id} className="p-1.5 text-center font-black text-gray-400 uppercase tracking-widest text-[8px] min-w-[80px]">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-matcha shrink-0">{getTeamCode(team.id, activeMatrixGroup)}</span>
                          <span className="line-clamp-1">{team.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matrixGroupTeams.map(teamA => (
                    <tr key={teamA.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-1.5 border-r border-gray-100 font-bold text-gray-800 bg-gray-50/50">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-matcha font-black uppercase shrink-0">{getTeamCode(teamA.id, activeMatrixGroup)}</span>
                          <span className="uppercase tracking-tight leading-tight line-clamp-1">{teamA.name}</span>
                        </div>
                      </td>
                      {matrixGroupTeams.map(teamB => {
                        if (teamA.id === teamB.id) {
                          return <td key={teamB.id} className="p-1.5 bg-gray-100/50"></td>;
                        }
                        const exists = checkMatchExists(teamA.id, teamB.id);
                        return (
                          <td key={teamB.id} className="p-1.5 text-center">
                            <div className={`mx-auto w-5 h-5 rounded-md flex items-center justify-center shadow-sm ${exists ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                              {exists ? <CheckCircle className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Perlawanan Wujud</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Belum Didaftar</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-matcha" />
            Jadual & Keputusan
          </h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-magenta-gradient text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            Tambah Perlawanan
          </button>
        </div>

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
                  {filterStages.map(stage => (
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

        <div className="flex justify-end">
        {selectedMatches.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition-all shadow-md animate-in fade-in zoom-in"
          >
            <Trash2 className="h-4 w-4" />
            Padam {selectedMatches.length} Perlawanan
          </button>
        )}
      </div>

      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-pink-light p-8 animate-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-8 w-8" />
              </div>
              <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight">Sahkan Pemadaman</h4>
              <p className="text-gray-600 leading-relaxed">{deleteConfirm.message}</p>
              <div className="flex gap-3 pt-6">
                <button 
                  onClick={() => setDeleteConfirm({ show: false, ids: [], message: '' })}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Ya, Padam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl md:rounded-3xl shadow-2xl border border-pink-light overflow-hidden animate-in zoom-in duration-300 my-auto">
            <div className="bg-magenta-gradient p-4 md:p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-2 md:gap-3">
                <Zap className="h-5 w-5 md:h-6 md:w-6" />
                <h4 className="text-lg md:text-xl font-black tracking-tight uppercase">
                  {editingMatch ? 'Kemaskini' : 'Tambah Baru'}
                </h4>
              </div>
              <button onClick={resetForm} className="text-white/80 hover:text-white p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="h-6 w-6 md:h-8 md:w-8" />
              </button>
            </div>

            <div className="p-4 md:p-8 max-h-[85vh] overflow-y-auto">
              <div className="space-y-6 md:space-y-8">
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div>
                      <label className="block text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Tarikh</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Masa</label>
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Gelanggang</label>
                      <select value={court} onChange={(e) => setCourt(e.target.value as any)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none">
                        {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                      <select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value as MatchStatus)} 
                        className={`w-full px-3 py-2 border rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none font-bold ${
                          status === 'finished' ? 'text-magenta' : ''
                        } ${STATUSES.find(s => s.value === status)?.color || 'bg-gray-50 border-gray-200'}`}
                      >
                        {STATUSES.map(s => (
                          <option key={s.value} value={s.value} className="bg-white text-gray-800 font-bold">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-2 md:space-y-4">
                      <label className="block text-[10px] md:text-sm font-bold text-magenta-dark uppercase tracking-widest">Peringkat & Kumpulan</label>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <select value={stage} onChange={(e) => setStage(e.target.value as MatchStage)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none">
                          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        {stage === 'group' && (
                          <select value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none">
                            <option value="">Pilih Kumpulan</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {stage !== 'group' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Label Placeholder (cth: Pemenang QF1)</label>
                      <input 
                        type="text" 
                        value={placeholderLabel} 
                        onChange={(e) => setPlaceholderLabel(e.target.value)} 
                        placeholder="Masukkan label jika pasukan belum diketahui"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none" 
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 bg-pink-gradient p-4 md:p-6 rounded-2xl border border-pink-light">
                    <div className="space-y-3 md:space-y-4">
                      <label className="block text-[10px] md:text-sm font-black text-magenta-dark uppercase tracking-widest">Pasukan A</label>
                      <select value={teamAId} onChange={(e) => setTeamAId(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none">
                        <option value="">Pilih Pasukan A</option>
                        {getFilteredTeams(stage, teamAId, teamBId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex gap-2">
                          <select value={newScorerNameA} onChange={(e) => setNewScorerNameA(e.target.value)} className="flex-1 px-2 md:px-3 py-1.5 md:py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-sm">
                            <option value="">Tambah Penjaring</option>
                            {[...getTeamPlayers(teamAId)]
                              .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.name.localeCompare(b.name))
                              .map(p => <option key={p.name} value={p.name}>{p.name} ({p.position})</option>)}
                          </select>
                          <input type="number" value={newScorerGoalsA} onChange={(e) => setNewScorerGoalsA(parseInt(e.target.value))} className="w-12 md:w-16 px-1 md:px-2 py-1.5 md:py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-sm" min="1" />
                          <button type="button" onClick={() => handleAddScorer(teamAId, newScorerNameA, newScorerGoalsA)} className="bg-[#004d00] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-[#003300] transition-all font-bold flex items-center gap-1 shadow-lg shadow-green-900/20">
                            <Plus className="h-4 w-4" />
                            <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Tambah</span>
                          </button>
                        </div>
                        <div className="space-y-1">
                          {scorers.filter(s => s.teamId === teamAId).map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/50 px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-sm border border-magenta/10">
                              <span className="font-medium text-gray-700 truncate max-w-[100px] md:max-w-none">{s.playerName}</span>
                              <div className="flex items-center gap-2 md:gap-3">
                                <span className="font-black text-magenta">{s.goals}</span>
                                <button type="button" onClick={() => handleRemoveScorer(scorers.indexOf(s))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      <label className="block text-[10px] md:text-sm font-black text-magenta-dark uppercase tracking-widest">Pasukan B</label>
                      <select value={teamBId} onChange={(e) => setTeamBId(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-magenta focus:border-transparent outline-none">
                        <option value="">Pilih Pasukan B</option>
                        {getFilteredTeams(stage, teamBId, teamAId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>

                      <div className="space-y-2 md:space-y-3">
                        <div className="flex gap-2">
                          <select value={newScorerNameB} onChange={(e) => setNewScorerNameB(e.target.value)} className="flex-1 px-2 md:px-3 py-1.5 md:py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-sm">
                            <option value="">Tambah Penjaring</option>
                            {[...getTeamPlayers(teamBId)]
                              .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.name.localeCompare(b.name))
                              .map(p => <option key={p.name} value={p.name}>{p.name} ({p.position})</option>)}
                          </select>
                          <input type="number" value={newScorerGoalsB} onChange={(e) => setNewScorerGoalsB(parseInt(e.target.value))} className="w-12 md:w-16 px-1 md:px-2 py-1.5 md:py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-sm" min="1" />
                          <button type="button" onClick={() => handleAddScorer(teamBId, newScorerNameB, newScorerGoalsB)} className="bg-[#004d00] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-[#003300] transition-all font-bold flex items-center gap-1 shadow-lg shadow-green-900/20">
                            <Plus className="h-4 w-4" />
                            <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Tambah</span>
                          </button>
                        </div>
                        <div className="space-y-1">
                          {scorers.filter(s => s.teamId === teamBId).map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/50 px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-sm border border-magenta/10">
                              <span className="font-medium text-gray-700 truncate max-w-[100px] md:max-w-none">{s.playerName}</span>
                              <div className="flex items-center gap-2 md:gap-3">
                                <span className="font-black text-magenta">{s.goals}</span>
                                <button type="button" onClick={() => handleRemoveScorer(scorers.indexOf(s))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 md:gap-3 pt-4 md:pt-6 border-t border-gray-100">
                    <button type="button" onClick={resetForm} className="flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 bg-gray-100 text-gray-600 font-bold rounded-xl md:rounded-2xl hover:bg-gray-200 transition-all text-xs md:text-sm">Batal</button>
                    <button type="button" onClick={handleSubmit} className="flex-[2] md:flex-none bg-magenta-gradient text-white px-6 md:px-10 py-2 md:py-3 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-xs md:text-sm">
                      <Save className="h-4 w-4 md:h-5 md:w-5" /> Simpan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

      {notification.show && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
          <span className="font-bold">{notification.message}</span>
        </div>
      )}

      <div className="space-y-10">
        {(selectedStageFilter === 'all' || selectedStageFilter === 'group') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-pink-light pb-2">
              <h4 className="font-black text-magenta-dark uppercase tracking-widest text-sm flex items-center gap-2">
                <Trophy className="h-5 w-5" /> Peringkat Kumpulan
              </h4>
              <button 
                onClick={() => { setStage('group'); setShowForm(true); setEditingMatch(null); }}
                className="text-xs bg-magenta-gradient text-white hover:opacity-90 px-4 py-2 rounded-full transition-all flex items-center gap-1 font-black uppercase tracking-widest shadow-md"
              >
                <Plus className="h-4 w-4" /> Tambah Perlawanan
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMatches.filter(m => m.stage === 'group').map(match => <MatchCard key={match.id} match={match} />)}
              {filteredMatches.filter(m => m.stage === 'group').length === 0 && (
                <div className="col-span-full bg-white/50 border border-dashed border-pink-light rounded-2xl p-12 text-center text-gray-400 text-sm italic">Tiada perlawanan didaftarkan untuk Peringkat Kumpulan</div>
              )}
            </div>
          </div>
        )}

        {(selectedStageFilter === 'all' || selectedStageFilter === 'knockout_all' || STAGES.filter(s => s.value !== 'group').some(s => s.value === selectedStageFilter)) && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-pink-light pb-2">
              <h4 className="font-black text-magenta-dark uppercase tracking-widest text-sm flex items-center gap-2">
                <Trophy className="h-5 w-5" /> Peringkat Kalah Singkir
              </h4>
              <button 
                onClick={() => { 
                  let defaultStage: MatchStage = 'quarter';
                  if (selectedStageFilter !== 'all' && selectedStageFilter !== 'knockout_all' && STAGES.some(s => s.value === selectedStageFilter)) {
                    defaultStage = selectedStageFilter as MatchStage;
                  }
                  setStage(defaultStage); 
                  setShowForm(true); 
                  setEditingMatch(null); 
                }}
                className="text-xs bg-magenta-gradient text-white hover:opacity-90 px-4 py-2 rounded-full transition-all flex items-center gap-1 font-black uppercase tracking-widest shadow-md"
              >
                <Plus className="h-4 w-4" /> Tambah Perlawanan
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMatches.filter(m => m.stage !== 'group').map(match => <MatchCard key={match.id} match={match} />)}
              {filteredMatches.filter(m => m.stage !== 'group').length === 0 && (
                <div className="col-span-full bg-white/50 border border-dashed border-pink-light rounded-2xl p-12 text-center text-gray-400 text-sm italic">Tiada perlawanan didaftarkan untuk Peringkat Kalah Singkir</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
