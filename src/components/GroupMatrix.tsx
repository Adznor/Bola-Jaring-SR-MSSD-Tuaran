import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Team, Group, Match } from '../types';
import { LayoutGrid, CheckCircle, XCircle, Info } from 'lucide-react';

export default function GroupMatrix() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | 'all'>('all');

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'teams');
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      setGroups(g);
      if (g.length > 0 && activeGroupId === 'all') {
        setActiveGroupId(g[0].id);
      }
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

  const groupData = useMemo(() => {
    return groups.map(group => {
      const groupTeams = teams.filter(t => t.groupId === group.id).sort((a, b) => (a.groupPosition || 0) - (b.groupPosition || 0));
      const groupMatches = matches.filter(m => m.groupId === group.id && m.stage === 'group');
      
      return {
        ...group,
        teams: groupTeams,
        matches: groupMatches
      };
    });
  }, [teams, groups, matches]);

  const checkMatchExists = (teamA: Team, teamB: Team, group: Group, groupMatches: Match[]) => {
    const groupLetter = group.name.split(' ').pop()?.charAt(0) || group.name.charAt(0);
    const label1 = `${groupLetter}${teamA.groupPosition} vs ${groupLetter}${teamB.groupPosition}`;
    const label2 = `${groupLetter}${teamB.groupPosition} vs ${groupLetter}${teamA.groupPosition}`;

    return groupMatches.find(m => 
      // Option 1: Match by IDs
      (m.teamAId === teamA.id && m.teamBId === teamB.id) || 
      (m.teamAId === teamB.id && m.teamBId === teamA.id) ||
      // Option 2: Match by Placeholder Labels (if IDs are not yet linked)
      (m.placeholderLabel === label1 || m.placeholderLabel === label2)
    );
  };

  const getTeamLabel = (team: Team, group: Group) => {
    const groupLetter = group.name.split(' ').pop()?.charAt(0) || group.name.charAt(0);
    return `${groupLetter}${team.groupPosition || ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-matcha" />
          Jadual Matriks Kumpulan
        </h3>
      </div>

      {/* Group Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 border-b border-pink-light pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => setActiveGroupId(group.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all ${
              activeGroupId === group.id ? 'bg-magenta-gradient text-white shadow-md' : 'bg-white text-gray-500 hover:bg-magenta/10'
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-blue-700">
          <p className="font-bold mb-1">Panduan Matriks:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="text-green-600 font-bold">Hijau:</span> Perlawanan telah didaftarkan dalam Jadual & Keputusan.</li>
            <li><span className="text-red-600 font-bold">Merah:</span> Perlawanan belum didaftarkan.</li>
            <li>Matriks ini membantu memastikan semua perlawanan pusingan kumpulan telah dijadualkan.</li>
          </ul>
        </div>
      </div>

      <div className="space-y-8">
        {groupData.filter(g => activeGroupId === 'all' || g.id === activeGroupId).map(group => (
          <div key={group.id} className="bg-white rounded-2xl border border-pink-light overflow-hidden shadow-sm">
            <div className="bg-magenta-gradient p-4">
              <h4 className="text-white font-black uppercase tracking-widest text-sm">{group.name}</h4>
            </div>
            
            <div className="p-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-gray-100 bg-gray-50"></th>
                    {group.teams.map(team => (
                      <th key={team.id} className="p-2 border border-gray-100 bg-gray-50 text-[10px] sm:text-xs font-black text-gray-600 uppercase tracking-tight min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-matcha">{getTeamLabel(team, group)}</span>
                          <span className="whitespace-normal leading-tight line-clamp-2 max-w-[120px]">{team.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((teamA, rowIndex) => (
                    <tr key={teamA.id}>
                      <td className="p-2 border border-gray-100 bg-gray-50 text-[10px] sm:text-xs font-black text-gray-600 uppercase tracking-tight min-w-[120px]">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-matcha shrink-0">{getTeamLabel(teamA, group)}</span>
                          <span className="whitespace-normal leading-tight line-clamp-2">{teamA.name}</span>
                        </div>
                      </td>
                      {group.teams.map((teamB, colIndex) => {
                        if (rowIndex === colIndex) {
                          return <td key={teamB.id} className="p-2 border border-gray-100 bg-gray-200"></td>;
                        }
                        
                        const match = checkMatchExists(teamA, teamB, group, group.matches);
                        const isFinished = match?.status === 'finished';
                        
                        // Determine score order based on which team is A and which is B in the match object
                        let displayScore = '';
                        if (match && isFinished) {
                          if (match.teamAId === teamA.id) {
                            displayScore = `${match.scoreA} - ${match.scoreB}`;
                          } else {
                            displayScore = `${match.scoreB} - ${match.scoreA}`;
                          }
                        }
                        
                        return (
                          <td 
                            key={teamB.id} 
                            className={`p-1 md:p-2 border border-gray-100 text-center transition-colors ${
                              match ? (isFinished ? 'bg-green-50' : 'bg-blue-50') : 'bg-red-50'
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center gap-1 min-h-[40px]">
                              {match ? (
                                isFinished ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] md:text-sm font-black text-gray-800">{displayScore}</span>
                                    <span className="text-[8px] font-bold text-green-600 uppercase">Tamat</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-bold text-blue-600 italic">{match.time}</span>
                                    <span className="text-[8px] font-bold text-blue-400 uppercase">Akan Datang</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex flex-col items-center opacity-40">
                                  <XCircle className="h-3 w-3 text-red-400" />
                                  <span className="text-[8px] font-bold text-red-400 uppercase">Tiada</span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
