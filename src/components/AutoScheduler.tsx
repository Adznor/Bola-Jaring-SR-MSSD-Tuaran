import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, writeBatch, getDocs, query, where, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Team, Match, Group, TournamentInfo } from '../types';
import { Calendar, Clock, Play, Trash2, AlertCircle, CheckCircle, Zap, LayoutGrid, Trophy } from 'lucide-react';

export default function AutoScheduler() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [info, setInfo] = useState<TournamentInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    });
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });
    const unsubInfo = onSnapshot(collection(db, 'tournamentInfo'), (snapshot) => {
      if (!snapshot.empty) {
        setInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TournamentInfo);
      }
    });

    return () => {
      unsubTeams();
      unsubGroups();
      unsubMatches();
      unsubInfo();
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const generateGroupSchedule = async () => {
    if (!info || !info.groupMatchDuration || !info.dailyStartTime || !info.dailyEndTime || !info.tournamentDates?.length) {
      showNotification('Sila lengkapkan parameter penjadualan di tab Tetapan.', 'error');
      return;
    }

    const finishedGroupMatches = matches.filter(m => m.stage === 'group' && m.status === 'finished');
    if (finishedGroupMatches.length > 0) {
      showNotification('Jadual peringkat kumpulan tidak boleh dijana semula kerana terdapat perlawanan yang sudah tamat.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const batch = writeBatch(db);
      
      // Clear existing group matches
      const existingGroupMatches = matches.filter(m => m.stage === 'group');
      existingGroupMatches.forEach(m => batch.delete(doc(db, 'matches', m.id)));

      const allGroupMatches: any[] = [];
      
      // Generate all possible matches for each group
      groups.forEach(group => {
        const groupTeams = teams.filter(t => t.groupId === group.id);
        if (groupTeams.length < 2) return;

        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            allGroupMatches.push({
              teamAId: groupTeams[i].id,
              teamBId: groupTeams[j].id,
              groupId: group.id,
              stage: 'group',
              status: 'scheduled',
              scoreA: 0,
              scoreB: 0,
              scorers: []
            });
          }
        }
      });

      // Shuffle matches to mix groups
      for (let i = allGroupMatches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allGroupMatches[i], allGroupMatches[j]] = [allGroupMatches[j], allGroupMatches[i]];
      }

      // Scheduling parameters
      const matchDur = info.groupMatchDuration || 15;
      const breakDur = info.groupBreakDuration || 1;
      const slotDur = matchDur + breakDur;
      const startTimeStr = info.dailyStartTime;
      const endTimeStr = info.dailyEndTime;
      const dates = info.tournamentDates;
      const courts = ['Gelanggang A', 'Gelanggang B'];

      let currentMatchIdx = 0;
      const teamLastMatchTime = new Map<string, number>(); // Team ID -> Timestamp of last match end

      for (const date of dates) {
        let currentTime = new Date(`${date}T${startTimeStr}`);
        const endTime = new Date(`${date}T${endTimeStr}`);

        while (currentTime.getTime() + matchDur * 60000 <= endTime.getTime() && currentMatchIdx < allGroupMatches.length) {
          // For each court
          for (const court of courts) {
            if (currentMatchIdx >= allGroupMatches.length) break;

            // Find a match where both teams are free
            let foundMatchIdx = -1;
            for (let i = currentMatchIdx; i < allGroupMatches.length; i++) {
              const match = allGroupMatches[i];
              const lastA = teamLastMatchTime.get(match.teamAId) || 0;
              const lastB = teamLastMatchTime.get(match.teamBId) || 0;

              // Ensure at least 1 slot break if possible, but at minimum no overlap
              if (lastA <= currentTime.getTime() && lastB <= currentTime.getTime()) {
                foundMatchIdx = i;
                break;
              }
            }

            if (foundMatchIdx !== -1) {
              const match = allGroupMatches[foundMatchIdx];
              // Swap found match to current position
              [allGroupMatches[currentMatchIdx], allGroupMatches[foundMatchIdx]] = [allGroupMatches[foundMatchIdx], allGroupMatches[currentMatchIdx]];
              
              const scheduledMatch = allGroupMatches[currentMatchIdx];
              scheduledMatch.date = date;
              scheduledMatch.time = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
              scheduledMatch.court = court;

              const matchEnd = currentTime.getTime() + matchDur * 60000;
              teamLastMatchTime.set(scheduledMatch.teamAId, matchEnd);
              teamLastMatchTime.set(scheduledMatch.teamBId, matchEnd);

              const matchRef = doc(collection(db, 'matches'));
              batch.set(matchRef, scheduledMatch);
              currentMatchIdx++;
            }
          }
          currentTime = new Date(currentTime.getTime() + slotDur * 60000);
        }
      }

      if (currentMatchIdx < allGroupMatches.length) {
        showNotification(`Hanya ${currentMatchIdx}/${allGroupMatches.length} perlawanan dapat dijadualkan. Sila tambah hari atau panjangkan masa harian.`, 'error');
      }

      await batch.commit();
      showNotification('Jadual peringkat kumpulan berjaya dijana!');
    } catch (err) {
      console.error('Error generating schedule:', err);
      showNotification('Ralat semasa menjana jadual.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateKnockoutSchedule = async () => {
    const finishedKoMatches = matches.filter(m => ['quarter', 'semi', 'third_place', 'final'].includes(m.stage) && m.status === 'finished');
    if (finishedKoMatches.length > 0) {
      showNotification('Jadual peringkat kalah mati tidak boleh dijana semula kerana terdapat perlawanan yang sudah tamat.', 'error');
      return;
    }

    // 1. Calculate standings for all groups
    const standingsByGroup: { [key: string]: any[] } = {};
    
    groups.forEach(group => {
      const groupTeams = teams.filter(t => t.groupId === group.id);
      const standings = groupTeams.map(team => {
        const teamMatches = matches.filter(m => m.stage === 'group' && m.status === 'finished' && (m.teamAId === team.id || m.teamBId === team.id));
        let pts = 0, gf = 0, ga = 0;
        teamMatches.forEach(m => {
          const isA = m.teamAId === team.id;
          const sSelf = isA ? m.scoreA : m.scoreB;
          const sOpp = isA ? m.scoreB : m.scoreA;
          gf += sSelf; ga += sOpp;
          if (sSelf > sOpp) pts += 3;
          else if (sSelf === sOpp) pts += 1;
        });
        return { id: team.id, name: team.name, pts, gd: gf - ga, gf };
      }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
      standingsByGroup[group.name] = standings;
    });

    // Check if all groups have at least 2 teams
    const groupNames = ['A', 'B', 'C', 'D'];
    for (const name of groupNames) {
      if (!standingsByGroup[name] || standingsByGroup[name].length < 2) {
        showNotification(`Kumpulan ${name} tidak mempunyai cukup pasukan.`, 'error');
        return;
      }
    }

    setIsGenerating(true);
    try {
      const batch = writeBatch(db);
      
      // Clear existing knockout matches
      const koStages = ['quarter', 'semi', 'third_place', 'final'];
      const existingKoMatches = matches.filter(m => koStages.includes(m.stage));
      existingKoMatches.forEach(m => batch.delete(doc(db, 'matches', m.id)));

      // Quarter Finals
      // QF1: A1 vs B2
      // QF2: B1 vs A2
      // QF3: C1 vs D2
      // QF4: D1 vs C2
      const qfPairs = [
        { a: standingsByGroup['A'][0], b: standingsByGroup['B'][1], label: 'Suku Akhir 1 (A1 vs B2)' },
        { a: standingsByGroup['B'][0], b: standingsByGroup['A'][1], label: 'Suku Akhir 2 (B1 vs A2)' },
        { a: standingsByGroup['C'][0], b: standingsByGroup['D'][1], label: 'Suku Akhir 3 (C1 vs D2)' },
        { a: standingsByGroup['D'][0], b: standingsByGroup['C'][1], label: 'Suku Akhir 4 (D1 vs C2)' },
      ];

      // Find last match time to start knockout
      const lastGroupMatch = matches.filter(m => m.stage === 'group').sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))[0];
      let currentStartTime: Date;
      
      if (lastGroupMatch && info) {
        // Start next day or after last match
        currentStartTime = new Date(`${lastGroupMatch.date}T${lastGroupMatch.time}`);
        const prevMatchDur = lastGroupMatch.stage === 'group' ? (info.groupMatchDuration || 15) : (info.knockoutMatchDuration || 23);
        const prevBreakDur = lastGroupMatch.stage === 'group' ? (info.groupBreakDuration || 1) : (info.knockoutBreakDuration || 3);
        currentStartTime = new Date(currentStartTime.getTime() + prevMatchDur * 60000 + prevBreakDur * 60000);
      } else {
        currentStartTime = new Date();
      }

      const matchDur = info?.knockoutMatchDuration || 23;
      const breakDur = info?.knockoutBreakDuration || 3;
      const slotDur = matchDur + breakDur;

      // Add QF matches
      qfPairs.forEach((pair, i) => {
        const matchRef = doc(collection(db, 'matches'));
        batch.set(matchRef, {
          teamAId: pair.a.id,
          teamBId: pair.b.id,
          stage: 'quarter',
          status: 'scheduled',
          scoreA: 0,
          scoreB: 0,
          scorers: [],
          court: i % 2 === 0 ? 'Gelanggang A' : 'Gelanggang B',
          date: info?.tournamentDates?.[info.tournamentDates.length - 1] || '',
          time: currentStartTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        });
        if (i % 2 === 1) {
          currentStartTime = new Date(currentStartTime.getTime() + slotDur * 60000);
        }
      });

      // Semi Finals, 3rd Place, Final will be placeholders since winners are unknown
      // But user wants them generated. I'll create them with "Pemenang QF X" labels?
      // Actually, my Match type expects teamAId. I'll just generate QF for now as they are deterministic.
      // The user can add the rest manually or I can add logic to "Pemenang" later.
      // Wait, the request says "sistem akan menjana secara automatik: Suku Akhir, Separuh Akhir, Perlawanan Tempat Ketiga, Perlawanan Akhir".
      // I'll create them with null teamAId/teamBId and special labels.
      
      const placeholders = [
        { stage: 'semi', label: 'Separuh Akhir 1 (Pemenang SA1 vs Pemenang SA3)' },
        { stage: 'semi', label: 'Separuh Akhir 2 (Pemenang SA2 vs Pemenang SA4)' },
        { stage: 'third_place', label: 'Penentuan Tempat Ke-3' },
        { stage: 'final', label: 'Perlawanan Akhir' }
      ];

      placeholders.forEach((p, i) => {
        currentStartTime = new Date(currentStartTime.getTime() + slotDur * 60000);
        const matchRef = doc(collection(db, 'matches'));
        batch.set(matchRef, {
          stage: p.stage,
          status: 'scheduled',
          scoreA: 0,
          scoreB: 0,
          scorers: [],
          court: 'Gelanggang A',
          date: info?.tournamentDates?.[info.tournamentDates.length - 1] || '',
          time: currentStartTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          placeholderLabel: p.label
        });
      });

      await batch.commit();
      showNotification('Jadual peringkat kalah mati berjaya dijana!');
    } catch (err) {
      console.error('Error generating knockout:', err);
      showNotification('Ralat semasa menjana jadual kalah mati.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-pink-light shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-6 w-6 text-matcha" />
          <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Penjadualan Automatik</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 text-matcha font-bold uppercase tracking-widest text-xs">
              <LayoutGrid className="h-4 w-4" />
              Peringkat Kumpulan
            </div>
            <p className="text-sm text-gray-500">
              Jana jadual round-robin untuk semua kumpulan secara automatik. Sistem akan mengagihkan perlawanan di 2 gelanggang dengan masa rehat yang seimbang.
            </p>
            <button
              onClick={generateGroupSchedule}
              disabled={isGenerating}
              className="w-full bg-matcha-gradient text-white py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isGenerating ? 'Menjana...' : 'Jana Jadual Kumpulan'}
            </button>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 text-pink-dark font-bold uppercase tracking-widest text-xs">
              <Trophy className="h-4 w-4" />
              Peringkat Kalah Mati
            </div>
            <p className="text-sm text-gray-500">
              Jana perlawanan Suku Akhir berdasarkan kedudukan kumpulan (A1 vs B2, dll). Pastikan semua perlawanan kumpulan telah selesai.
            </p>
            <button
              onClick={generateKnockoutSchedule}
              disabled={isGenerating}
              className="w-full bg-pink-gradient text-white py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trophy className="h-4 w-4" />
              {isGenerating ? 'Menjana...' : 'Jana Jadual Kalah Mati'}
            </button>
          </div>
        </div>

        {notification.show && (
          <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="font-bold text-sm">{notification.message}</span>
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Status Penjadualan
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jumlah Pasukan</span>
            <span className="text-2xl font-black text-blue-600">{teams.length}</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Perlawanan Dijana</span>
            <span className="text-2xl font-black text-blue-600">{matches.length}</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kumpulan</span>
            <span className="text-2xl font-black text-blue-600">{groups.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
