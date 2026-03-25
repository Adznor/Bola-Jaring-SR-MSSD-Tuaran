import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Team, Group, Match, TeamStats } from '../types';
import { Trophy, Star, Medal, ChevronDown, ChevronUp } from 'lucide-react';

export default function Top12() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sukuAkhir: true,
    separuhAkhir: true,
    kalahSemi: true,
    menangSemi: true,
    top12: true
  });

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
    return () => { unsubTeams(); unsubGroups(); unsubMatches(); };
  }, []);

  const top12Teams = useMemo(() => {
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

    // Get all teams with their stats
    const allStats = Array.from(statsMap.values());

    // Sort by points, then goal difference, then goals for
    return allStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    }).slice(0, 12);
  }, [teams, matches]);

  const knockoutLists = useMemo(() => {
    // 1. Suku Akhir List
    const knockoutMatches = matches.filter(m => m.stage === 'knockout');
    const allKnockoutFinished = knockoutMatches.length > 0 && knockoutMatches.every(m => m.status === 'finished');
    let sukuAkhirTeams: Team[] = [];
    if (allKnockoutFinished) {
      const winners = knockoutMatches.map(m => m.scoreA > m.scoreB ? m.teamAId : m.teamBId);
      const top4Ids = top12Teams.slice(0, 4).map(t => t.teamId);
      const combinedIds = [...new Set([...top4Ids, ...winners])];
      sukuAkhirTeams = combinedIds.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
    }

    // 2. Separuh Akhir List
    const quarterMatches = matches.filter(m => m.stage === 'quarter');
    const allQuarterFinished = quarterMatches.length > 0 && quarterMatches.every(m => m.status === 'finished');
    let separuhAkhirTeams: Team[] = [];
    if (allQuarterFinished) {
      const winners = quarterMatches.map(m => m.scoreA > m.scoreB ? m.teamAId : m.teamBId);
      separuhAkhirTeams = winners.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
    }

    // 3. Semi Final Lists (Winners & Losers)
    const semiMatches = matches.filter(m => m.stage === 'semi');
    const allSemiFinished = semiMatches.length > 0 && semiMatches.every(m => m.status === 'finished');
    let kalahSemiTeams: Team[] = [];
    let menangSemiTeams: Team[] = [];
    if (allSemiFinished) {
      const winners = semiMatches.map(m => m.scoreA > m.scoreB ? m.teamAId : m.teamBId);
      const losers = semiMatches.map(m => m.scoreA > m.scoreB ? m.teamBId : m.teamAId);
      menangSemiTeams = winners.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
      kalahSemiTeams = losers.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
    }

    return {
      sukuAkhir: { teams: sukuAkhirTeams, show: allKnockoutFinished },
      separuhAkhir: { teams: separuhAkhirTeams, show: allQuarterFinished },
      kalahSemi: { teams: kalahSemiTeams, show: allSemiFinished },
      menangSemi: { teams: menangSemiTeams, show: allSemiFinished }
    };
  }, [matches, teams, top12Teams]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const TeamList = ({ teams, title, sectionKey }: { teams: Team[], title: string, sectionKey: string }) => (
    <div className="bg-white rounded-2xl shadow-xl border border-pink-light overflow-hidden">
      <button 
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 md:p-6 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
      >
        <h3 className="text-sm md:text-lg font-black text-gray-800 uppercase tracking-tight">{title}</h3>
        {expandedSections[sectionKey] ? <ChevronUp className="h-5 w-5 text-matcha" /> : <ChevronDown className="h-5 w-5 text-matcha" />}
      </button>
      {expandedSections[sectionKey] && (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              {team.logoUrl && (
                <img src={team.logoUrl} alt="" className="w-8 h-8 object-contain bg-white p-1 rounded-lg border border-gray-100" referrerPolicy="no-referrer" />
              )}
              <span className="font-bold text-gray-800 uppercase text-xs truncate">{team.name}</span>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="col-span-full text-center text-gray-400 italic text-xs">Tiada pasukan dalam senarai ini.</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-matcha-gradient p-6 md:p-8 rounded-2xl md:rounded-3xl text-white text-center shadow-xl border border-matcha/20">
        <Trophy className="h-10 w-10 md:h-14 md:w-14 mx-auto mb-3 md:mb-4 text-pink-light drop-shadow-lg" />
        <h2 className="text-xl md:text-3xl font-black tracking-tight uppercase">CATATAN</h2>
        <p className="text-matcha-light mt-1 md:mt-2 uppercase tracking-widest text-[10px] md:text-sm font-bold">KEDUDUKAN KESELURUHAN PERINGKAT KUMPULAN & SENARAI KELAYAKAN</p>
      </div>

      {knockoutLists.sukuAkhir.show && (
        <TeamList 
          teams={knockoutLists.sukuAkhir.teams} 
          title="Senarai Pasukan Suku Akhir" 
          sectionKey="sukuAkhir" 
        />
      )}

      {knockoutLists.separuhAkhir.show && (
        <TeamList 
          teams={knockoutLists.separuhAkhir.teams} 
          title="Senarai Pasukan Separuh Akhir" 
          sectionKey="separuhAkhir" 
        />
      )}

      {knockoutLists.kalahSemi.show && (
        <TeamList 
          teams={knockoutLists.kalahSemi.teams} 
          title="Senarai Pasukan Kalah Separuh Akhir" 
          sectionKey="kalahSemi" 
        />
      )}

      {knockoutLists.menangSemi.show && (
        <TeamList 
          teams={knockoutLists.menangSemi.teams} 
          title="Senarai Pasukan Menang Separuh Akhir" 
          sectionKey="menangSemi" 
        />
      )}

      <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-pink-light overflow-hidden">
        <button 
          onClick={() => toggleSection('top12')}
          className="w-full flex items-center justify-between p-4 md:p-6 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-sm md:text-lg font-black text-gray-800 uppercase tracking-tight">Kedudukan Keseluruhan (Top 12)</h3>
          {expandedSections.top12 ? <ChevronUp className="h-5 w-5 text-matcha" /> : <ChevronDown className="h-5 w-5 text-matcha" />}
        </button>
        {expandedSections.top12 && (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] md:text-xs font-black tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-4 md:px-6 py-4 md:py-5 text-left">Ked</th>
                  <th className="px-4 md:px-6 py-4 md:py-5 text-left">Pasukan</th>
                  <th className="px-2 md:px-4 py-4 md:py-5 text-center">P</th>
                  <th className="px-2 md:px-4 py-4 md:py-5 text-center">M</th>
                  <th className="px-2 md:px-4 py-4 md:py-5 text-center">S</th>
                  <th className="px-2 md:px-4 py-4 md:py-5 text-center">K</th>
                  <th className="px-2 md:px-4 py-4 md:py-5 text-center">JG</th>
                  <th className="px-2 md:px-4 py-4 md:py-5 text-center">JK</th>
                  <th className="px-2 md:px-4 py-4 md:py-5 text-center">PG</th>
                  <th className="px-4 md:px-6 py-4 md:py-5 text-center">MT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {top12Teams.map((s, i) => (
                  <tr key={s.teamId} className={`${i < 4 ? 'bg-pink-gradient' : 'hover:bg-gray-50 transition-colors'}`}>
                    <td className="px-4 md:px-6 py-4 md:py-5 font-black text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs ${i < 4 ? 'bg-matcha-gradient text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>
                          {i + 1}
                        </span>
                        {i < 4 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 md:py-5 font-bold text-gray-800">
                      <div className="flex items-center gap-3">
                        {s.teamLogo && (
                          <img src={s.teamLogo} alt="" className="w-6 h-6 md:w-10 md:h-10 object-contain bg-white p-1 rounded-lg border border-gray-100 shadow-sm" referrerPolicy="no-referrer" />
                        )}
                        <span className="uppercase tracking-tight leading-tight">{s.teamName}</span>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-4 md:py-5 text-center font-bold">{s.played}</td>
                    <td className="px-2 md:px-4 py-4 md:py-5 text-center font-bold text-green-600">{s.won}</td>
                    <td className="px-2 md:px-4 py-4 md:py-5 text-center font-bold text-blue-600">{s.drawn}</td>
                    <td className="px-2 md:px-4 py-4 md:py-5 text-center font-bold text-red-600">{s.lost}</td>
                    <td className="px-2 md:px-4 py-4 md:py-5 text-center font-bold">{s.goalsFor}</td>
                    <td className="px-2 md:px-4 py-4 md:py-5 text-center font-bold">{s.goalsAgainst}</td>
                    <td className="px-2 md:px-4 py-4 md:py-5 text-center font-bold text-matcha-dark">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                    <td className="px-4 md:px-6 py-4 md:py-5 text-center font-black text-matcha-dark text-base md:text-lg">{s.points}</td>
                  </tr>
                ))}
                {top12Teams.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic">
                      <Medal className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      Tiada data perlawanan kumpulan tersedia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-pink-light flex flex-wrap justify-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-matcha-gradient shadow-sm"></div>
          <span className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-widest">Top 4 (Highlight)</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-widest">Tanda Star</span>
        </div>
      </div>
    </div>
  );
}
