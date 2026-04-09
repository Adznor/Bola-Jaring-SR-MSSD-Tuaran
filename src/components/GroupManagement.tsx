import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Team, Group } from '../types';
import { Plus, Trash2, LayoutGrid, Users, ArrowRightLeft, X } from 'lucide-react';

export default function GroupManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; ids: string[]; message: string }>({ show: false, ids: [], message: '' });

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    });
    return () => { unsubTeams(); unsubGroups(); };
  }, []);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate group name
    const nextLetter = String.fromCharCode(65 + groups.length); // 65 is 'A'
    const autoName = `Kumpulan ${nextLetter}`;
    
    await addDoc(collection(db, 'groups'), { name: autoName });
  };

  const handleDeleteGroup = (id: string) => {
    setDeleteConfirm({
      show: true,
      ids: [id],
      message: 'Padam kumpulan ini? Semua pasukan dalam kumpulan ini akan menjadi tidak berkumpulan.'
    });
  };

  const handleDeleteSelected = () => {
    if (selectedGroups.length === 0) return;
    setDeleteConfirm({
      show: true,
      ids: selectedGroups,
      message: `Padam ${selectedGroups.length} kumpulan yang dipilih? Semua pasukan dalam kumpulan ini akan menjadi tidak berkumpulan.`
    });
  };

  const confirmDelete = async () => {
    try {
      for (const id of deleteConfirm.ids) {
        // Clear groupId for teams in this group
        const teamsInGroup = teams.filter(t => t.groupId === id);
        for (const team of teamsInGroup) {
          await updateDoc(doc(db, 'teams', team.id), { groupId: null });
        }
        await deleteDoc(doc(db, 'groups', id));
      }
      setSelectedGroups(prev => prev.filter(id => !deleteConfirm.ids.includes(id)));
      setDeleteConfirm({ show: false, ids: [], message: '' });
    } catch (err) {
      console.error('Error deleting groups:', err);
      alert('Ralat semasa memadam kumpulan.');
    }
  };

  const toggleGroupSelection = (id: string) => {
    setSelectedGroups(prev => 
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  const handleAssignTeam = async (teamId: string, groupId: string | null) => {
    await updateDoc(doc(db, 'teams', teamId), { 
      groupId: groupId || null,
      groupPosition: groupId ? (teams.filter(t => t.groupId === groupId).length + 1) : null
    });
  };

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTeams = [...teams].sort((a, b) => {
    const timeA = a.createdAt || 0;
    const timeB = b.createdAt || 0;
    if (timeB !== timeA) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });
  const unassignedTeams = sortedTeams.filter(t => !t.groupId);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="bg-pink-gradient p-4 md:p-6 rounded-xl border border-pink-light">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h4 className="text-base md:text-lg font-bold text-matcha-dark flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah Kumpulan
          </h4>
          {selectedGroups.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-sm text-sm"
            >
              <Trash2 className="h-4 w-4" />
              <span>Padam ({selectedGroups.length})</span>
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-gray-600">
            Klik butang untuk menambah kumpulan baru secara automatik (A, B, C...).
          </p>
          <button
            onClick={handleAddGroup}
            className="w-full sm:w-auto bg-matcha-gradient hover:opacity-90 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-sm text-sm"
          >
            Tambah Kumpulan
          </button>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Group List */}
        <div className="space-y-4">
          <h4 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-matcha" />
            Senarai Kumpulan
          </h4>
          <div className="grid grid-cols-1 gap-4">
            {sortedGroups.map((group) => {
              const groupTeams = sortedTeams.filter(t => t.groupId === group.id);
              const groupLetter = group.name.split(' ').pop()?.charAt(0) || group.name.charAt(0);
              const isSelected = selectedGroups.includes(group.id);
              
              return (
                <div key={group.id} className={`bg-white border rounded-xl p-3 md:p-4 shadow-sm transition-all ${isSelected ? 'border-magenta ring-1 ring-magenta' : 'border-pink-light'}`}>
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    <div className="flex items-center gap-2 md:gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleGroupSelection(group.id)}
                        className="w-4 h-4 rounded border-gray-300 text-magenta focus:ring-magenta cursor-pointer"
                      />
                      <h5 className="font-bold text-matcha-dark text-base md:text-lg">{group.name}</h5>
                      <div className="flex gap-1 md:gap-2">
                        <button onClick={() => handleDeleteGroup(group.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1 md:mb-2">Senarai Pasukan:</p>
                    {groupTeams.length > 0 ? (
                      <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto scrollbar-hide">
                          <table className="w-full text-[10px] md:text-xs">
                            <thead className="bg-gray-50 text-gray-500">
                              <tr>
                                <th className="px-2 md:px-3 py-1.5 md:py-2 text-left w-12 md:w-16">Kod</th>
                                <th className="px-2 md:px-3 py-1.5 md:py-2 text-left">Nama Pasukan</th>
                                <th className="px-2 md:px-3 py-1.5 md:py-2 text-center w-10">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {groupTeams.map((team, index) => (
                                <tr key={team.id} className="hover:bg-gray-50">
                                  <td className="px-2 md:px-3 py-1.5 md:py-2 font-bold text-matcha">
                                    {groupLetter}{index + 1}
                                  </td>
                                  <td className="px-2 md:px-3 py-1.5 md:py-2 text-gray-800 flex items-center gap-1.5 md:gap-2">
                                    {team.logoUrl && (
                                      <img src={team.logoUrl} alt={team.name} className="h-4 w-4 md:h-5 md:w-5 object-contain" referrerPolicy="no-referrer" />
                                    )}
                                    <span className="break-words leading-tight">{team.name}</span>
                                  </td>
                                  <td className="px-2 md:px-3 py-1.5 md:py-2 text-center">
                                    <button 
                                      onClick={() => handleAssignTeam(team.id, null)}
                                      className="text-red-400 hover:text-red-600 p-1"
                                      title="Keluarkan dari kumpulan"
                                    >
                                      <X className="h-3 w-3 md:h-4 md:w-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-xs">Tiada pasukan</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Assignment */}
        <div className="space-y-4">
          <h4 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-matcha" />
            Agihan Pasukan ({unassignedTeams.length})
          </h4>
          <div className="bg-white border border-pink-light rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left">Pasukan</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left">Agihan Kumpulan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unassignedTeams.map((team) => (
                    <tr key={team.id}>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          {team.logoUrl && (
                            <img src={team.logoUrl} alt={team.name} className="h-5 w-5 md:h-6 md:w-6 object-contain" referrerPolicy="no-referrer" />
                          )}
                          <div className="font-medium text-gray-800 break-words leading-tight">{team.name}</div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex flex-wrap gap-1">
                          {sortedGroups.map(g => (
                            <button
                              key={g.id}
                              onClick={() => handleAssignTeam(team.id, g.id)}
                              className="px-2 py-1 bg-matcha/10 text-matcha hover:bg-matcha text-[10px] md:text-xs font-bold rounded transition-all hover:text-white"
                            >
                              {g.name.split(' ').pop()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {unassignedTeams.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-gray-400 italic">Semua pasukan telah diundi masuk ke dalam kumpulan</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
