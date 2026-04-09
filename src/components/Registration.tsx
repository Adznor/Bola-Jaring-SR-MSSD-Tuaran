import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Team, Player, Position, TournamentInfo, POSITION_ORDER, Group } from '../types';
import { Plus, Trash2, Edit2, X, Save, UserPlus, Users, AlertCircle, CheckCircle, Zap, FileUp, Download, Star } from 'lucide-react';
import Papa from 'papaparse';

const POSITIONS: Position[] = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

export default function Registration() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupPosition, setGroupPosition] = useState<number | ''>('');
  const [isSeeded, setIsSeeded] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState<Position>('C');
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; ids: string[]; message: string }>({ show: false, ids: [], message: '' });
  const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const fetchedTeams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      // Sort: createdAt desc, then name asc
      fetchedTeams.sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.name.localeCompare(b.name);
      });
      setTeams(fetchedTeams);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'teams');
    });

    const unsubInfo = onSnapshot(collection(db, 'tournamentInfo'), (snapshot) => {
      if (!snapshot.empty) {
        setTournamentInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TournamentInfo);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tournamentInfo');
    });

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)).sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => {
      unsubTeams();
      unsubInfo();
      unsubGroups();
    };
  }, []);

  const user = auth.currentUser;
  const isUrusetia = user?.email === 'urusetia@mssd.tuaran.my';
  const isRegistrationOpen = tournamentInfo?.registrationOpen ?? true;
  const canRegister = isUrusetia || isRegistrationOpen;

  const handleTeamClick = (team: Team) => {
    if (!isRegistrationOpen && !isUrusetia) {
      setSelectedTeam(team);
      setShowTeamDetails(true);
    }
  };

  const handleAddPlayer = () => {
    if (!newPlayerName) return;

    if (editingPlayerIndex !== null) {
      const updatedPlayers = [...players];
      updatedPlayers[editingPlayerIndex] = { name: newPlayerName, position: newPlayerPos };
      setPlayers(updatedPlayers);
      setEditingPlayerIndex(null);
    } else {
      if (players.length >= 12) {
        alert('Maksimum 12 pemain sahaja dibenarkan.');
        return;
      }
      setPlayers([...players, { name: newPlayerName, position: newPlayerPos }]);
    }
    setNewPlayerName('');
    setNewPlayerPos('C');
  };

  const handleEditPlayer = (originalIndex: number) => {
    const player = players[originalIndex];
    setNewPlayerName(player.name);
    setNewPlayerPos(player.position);
    setEditingPlayerIndex(originalIndex);
  };

  const handleCancelPlayerEdit = () => {
    setEditingPlayerIndex(null);
    setNewPlayerName('');
    setNewPlayerPos('C');
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
    if (editingPlayerIndex === index) {
      handleCancelPlayerEdit();
    } else if (editingPlayerIndex !== null && index < editingPlayerIndex) {
      setEditingPlayerIndex(editingPlayerIndex - 1);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (players.length < 7) {
      showNotification('Minimum 7 pemain diperlukan.', 'error');
      return;
    }

    const teamData = {
      name: teamName,
      managerName,
      phone,
      logoUrl: logoUrl,
      groupId: groupId || null,
      groupPosition: groupPosition === '' ? null : Number(groupPosition),
      isSeeded,
      players,
      createdAt: editingTeam?.createdAt || Date.now(),
    };

    try {
      if (editingTeam) {
        await updateDoc(doc(db, 'teams', editingTeam.id), teamData);
        showNotification('Pasukan berjaya dikemaskini!', 'success');
      } else {
        await addDoc(collection(db, 'teams'), teamData);
        showNotification('Pasukan berjaya didaftarkan!', 'success');
      }
      resetForm();
    } catch (err) {
      console.error('Error saving team:', err);
      showNotification('Ralat semasa menyimpan maklumat.', 'error');
    }
  };

  const resetForm = () => {
    setTeamName('');
    setManagerName('');
    setPhone('');
    setLogoUrl('');
    setGroupId('');
    setGroupPosition('');
    setIsSeeded(false);
    setPlayers([]);
    setEditingTeam(null);
    setEditingPlayerIndex(null);
    setNewPlayerName('');
    setNewPlayerPos('C');
    setShowForm(false);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setManagerName(team.managerName || '');
    setPhone(team.phone || '');
    setLogoUrl(team.logoUrl || '');
    setGroupId(team.groupId || '');
    setGroupPosition(team.groupPosition || '');
    setIsSeeded(team.isSeeded || false);
    setPlayers(team.players);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({
      show: true,
      ids: [id],
      message: 'Adakah anda pasti mahu memadam pasukan ini? Semua data berkaitan pasukan ini akan dipadamkan.'
    });
  };

  const handleDeleteSelected = () => {
    if (selectedTeams.length === 0) return;
    setDeleteConfirm({
      show: true,
      ids: selectedTeams,
      message: `Adakah anda pasti mahu memadam ${selectedTeams.length} pasukan yang dipilih? Semua data berkaitan pasukan ini akan dipadamkan.`
    });
  };

  const confirmDelete = async () => {
    try {
      for (const id of deleteConfirm.ids) {
        await deleteDoc(doc(db, 'teams', id));
      }
      setSelectedTeams(prev => prev.filter(id => !deleteConfirm.ids.includes(id)));
      setDeleteConfirm({ show: false, ids: [], message: '' });
    } catch (err) {
      console.error('Error deleting teams:', err);
      alert('Ralat semasa memadam pasukan.');
    }
  };

  const toggleTeamSelection = (id: string) => {
    setSelectedTeams(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        const teamsMap = new Map<string, any>();
        const groupsMap = new Map<string, string>();

        try {
          // Fetch existing groups
          const groupsSnap = await getDocs(collection(db, 'groups'));
          groupsSnap.forEach(doc => groupsMap.set(doc.data().name, doc.id));

          for (const row of data) {
            const teamName = row['Nama Pasukan']?.trim();
            const managerName = row['Nama Pengurus']?.trim();
            const phone = row['No Telefon']?.trim();
            const playerName = row['Nama Pemain']?.trim();
            const position = row['Posisi']?.trim() as Position;
            const groupName = row['Kumpulan']?.trim();

            if (!teamName || !playerName) continue;

            if (!teamsMap.has(teamName)) {
              teamsMap.set(teamName, {
                name: teamName,
                managerName: managerName || '',
                phone: phone || '',
                players: [],
                groupName: groupName || '',
                createdAt: Date.now()
              });
            }

            const team = teamsMap.get(teamName);
            if (team.players.length < 12) {
              team.players.push({ name: playerName, position: position || 'C' });
            }
          }

          const batch = writeBatch(db);
          for (const [name, teamData] of teamsMap) {
            let groupId = '';
            if (teamData.groupName) {
              if (groupsMap.has(teamData.groupName)) {
                groupId = groupsMap.get(teamData.groupName)!;
              } else {
                // Create group if not exists
                const groupRef = await addDoc(collection(db, 'groups'), { name: teamData.groupName });
                groupId = groupRef.id;
                groupsMap.set(teamData.groupName, groupId);
              }
            }

            const { groupName, ...finalTeamData } = teamData;
            const newTeamRef = doc(collection(db, 'teams'));
            batch.set(newTeamRef, { ...finalTeamData, groupId });
          }
          await batch.commit();
          showNotification('Muat naik pukal berjaya!', 'success');
        } catch (err) {
          console.error('Error bulk uploading:', err);
          showNotification('Ralat semasa muat naik pukal.', 'error');
        } finally {
          setIsUploading(false);
          if (e.target) e.target.value = '';
        }
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        showNotification('Ralat semasa membaca fail CSV.', 'error');
        setIsUploading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "Nama Pasukan,Nama Pengurus,No Telefon,Nama Pemain,Posisi,Kumpulan\nPasukan A,Ali,0123456789,Pemain 1,GS,A\nPasukan A,Ali,0123456789,Pemain 2,GA,A";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_pendaftaran.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div className="space-y-0.5 sm:space-y-1">
          <h3 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-matcha" />
            Pendaftaran & Senarai Pasukan ({teams.length})
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isRegistrationOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className={`text-[9px] sm:text-xs font-bold uppercase tracking-widest ${isRegistrationOpen ? 'text-green-600' : 'text-red-600'}`}>
              Pendaftaran: {isRegistrationOpen ? 'DIBUKA' : 'DITUTUP'}
            </span>
          </div>
        </div>
        <div className="flex w-full md:w-auto gap-2 sm:gap-3">
          {selectedTeams.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex-1 md:flex-none bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-red-600 transition-all shadow-sm text-[10px] sm:text-sm"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Padam ({selectedTeams.length})</span>
            </button>
          )}
          {!showForm && canRegister && isRegistrationOpen && (
            <div className="flex gap-2">
              {isUrusetia && (
                <>
                  <button
                    onClick={downloadTemplate}
                    className="flex-1 md:flex-none bg-blue-50 text-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-blue-100 transition-all shadow-sm text-[10px] sm:text-sm font-bold"
                    title="Muat Turun Template CSV"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Template</span>
                  </button>
                  <label className="flex-1 md:flex-none bg-matcha/10 text-matcha px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-matcha/20 transition-all shadow-sm text-[10px] sm:text-sm font-bold cursor-pointer">
                    <FileUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{isUploading ? 'Memproses...' : 'Muat Naik CSV'}</span>
                    <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" disabled={isUploading} />
                  </label>
                </>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="flex-1 md:flex-none bg-matcha-gradient hover:opacity-90 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm text-[10px] sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Daftar Pasukan</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {notification.show && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
          <span className="font-bold">{notification.message}</span>
        </div>
      )}

      {!canRegister && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl mb-12 flex items-center gap-4">
          <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-500/20">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="font-black text-red-600 uppercase tracking-widest text-sm">Pendaftaran Ditutup</h4>
            <p className="text-red-500 text-sm font-medium">Ruang pendaftaran pasukan telah ditutup oleh Urusetia. Sila hubungi pihak penganjur untuk maklumat lanjut.</p>
          </div>
        </div>
      )}

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

      {/* Team Details Modal */}
      {showTeamDetails && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-pink-light overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            <div className="bg-matcha-gradient p-6 sm:p-8 text-white relative shrink-0">
              <button 
                onClick={() => setShowTeamDetails(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
                title="Tutup"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-xl shrink-0">
                  <img 
                    src={selectedTeam.logoUrl || `https://picsum.photos/seed/${selectedTeam.name}/200`} 
                    alt={selectedTeam.name}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="pr-8">
                  <h3 className="text-xl sm:text-3xl font-black tracking-tight uppercase leading-tight">{selectedTeam.name}</h3>
                  <p className="text-matcha-light font-bold tracking-widest text-[10px] sm:text-sm mt-0.5 sm:mt-1">SENARAI PEMAIN PASUKAN</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-10 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[...selectedTeam.players]
                  .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.name.localeCompare(b.name))
                  .map((player, index) => (
                  <div key={index} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-100 group hover:border-matcha/30 transition-all">
                    <span className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-matcha text-white rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs shadow-lg shadow-matcha/20 shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-700 uppercase tracking-wide text-xs sm:text-sm truncate">{player.name}</span>
                      <span className="text-[8px] sm:text-[10px] font-black text-matcha uppercase tracking-widest">{player.position}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowTeamDetails(false)}
                className="w-full mt-6 sm:mt-10 bg-gray-100 text-gray-600 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all text-xs sm:text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-pink-gradient p-4 md:p-6 rounded-xl border border-pink-light animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-bold text-matcha-dark">
              {editingTeam ? 'Kemaskini Pasukan' : 'Daftar Pasukan Baru'}
            </h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              <div>
                <label className="block text-[9px] sm:text-sm font-medium text-gray-700 mb-1">Nama Pasukan</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent text-[11px] sm:text-base"
                  placeholder="Contoh: Tuaran Tigers"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[9px] sm:text-sm font-medium text-gray-700">URL Logo (Opsional)</label>
                  <a 
                    href="https://drive.google.com/drive/u/0/folders/1OczjDcEDwrgaPiT3jQjQMK3BsXvvagNu" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[7px] sm:text-[10px] font-bold text-matcha hover:underline flex items-center gap-1"
                  >
                    <Zap className="h-2 w-2 sm:h-3 sm:w-3" /> Muat Naik
                  </a>
                </div>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  disabled={!isUrusetia}
                  className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent text-[11px] sm:text-base ${!isUrusetia ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="https://example.com/logo.png"
                />
                {!isUrusetia && (
                  <p className="text-[7px] sm:text-[10px] text-gray-400 mt-0.5 italic">URL Logo hanya boleh dikemaskini oleh Urusetia.</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] sm:text-sm font-medium text-gray-700 mb-1">Nama Pengurus</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent text-[11px] sm:text-base"
                  placeholder="Nama Pengurus"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] sm:text-sm font-medium text-gray-700 mb-1">No. Telefon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent text-[11px] sm:text-base"
                  placeholder="012-3456789"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] sm:text-sm font-medium text-gray-700 mb-1">Kumpulan</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent text-[11px] sm:text-base"
                >
                  <option value="">-- Pilih Kumpulan --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>Kumpulan {g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] sm:text-sm font-medium text-gray-700 mb-1">Kedudukan Dalam Kumpulan</label>
                <input
                  type="number"
                  value={groupPosition}
                  onChange={(e) => setGroupPosition(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent text-[11px] sm:text-base"
                  placeholder="Contoh: 1"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isSeeded"
                  checked={isSeeded}
                  onChange={(e) => setIsSeeded(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-matcha focus:ring-matcha cursor-pointer"
                />
                <label htmlFor="isSeeded" className="text-[9px] sm:text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1">
                  <Star className={`h-3 w-3 sm:h-4 sm:w-4 ${isSeeded ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                  Pasukan Seeded (Tetap dalam kumpulan semasa undian)
                </label>
              </div>
            </div>

            <div className="border-t border-pink-light pt-4 md:pt-6">
              <h5 className="font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                <UserPlus className="h-4 w-4 text-matcha" />
                Senarai Pemain ({players.length}/12)
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Nama Penuh</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                    placeholder="Nama Pemain"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Posisi</label>
                    <select
                      value={newPlayerPos}
                      onChange={(e) => setNewPlayerPos(e.target.value as Position)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                    >
                      {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className={`${editingPlayerIndex !== null ? 'bg-blue-500' : 'bg-matcha-gradient'} text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors h-[34px] md:h-[38px] self-end text-xs md:text-sm font-bold flex items-center gap-2`}
                  >
                    {editingPlayerIndex !== null ? <Save className="h-3 w-3 sm:h-4 sm:w-4" /> : null}
                    {editingPlayerIndex !== null ? 'Simpan' : 'Tambah'}
                  </button>
                  {editingPlayerIndex !== null && (
                    <button
                      type="button"
                      onClick={handleCancelPlayerEdit}
                      className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors h-[34px] md:h-[38px] self-end text-xs md:text-sm font-bold"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden border border-gray-100 overflow-x-auto scrollbar-hide">
                <table className="w-full text-[9px] sm:text-sm">
                  <thead className="bg-gray-50 text-[7px] sm:text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 text-left w-8">Bil</th>
                      <th className="px-2 sm:px-4 py-2 text-left">Nama</th>
                      <th className="px-2 py-2 text-center">Posisi</th>
                      <th className="px-2 sm:px-4 py-2 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {players.map((p, i) => ({ ...p, originalIndex: i }))
                      .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.name.localeCompare(b.name))
                      .map((p, i) => (
                      <tr key={p.originalIndex} className={editingPlayerIndex === p.originalIndex ? 'bg-blue-50' : ''}>
                        <td className="px-2 sm:px-4 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-2 sm:px-4 py-2 font-medium truncate max-w-[80px] sm:max-w-none">{p.name}</td>
                        <td className="px-2 py-2 text-center">
                          <span className="bg-matcha-gradient text-white px-1 sm:px-2 py-0.5 rounded text-[7px] sm:text-xs font-bold">{p.position}</span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              type="button" 
                              onClick={() => handleEditPlayer(p.originalIndex)} 
                              className="text-blue-400 hover:text-blue-600 p-1"
                              title="Edit Pemain"
                            >
                              <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRemovePlayer(p.originalIndex)} 
                              className="text-red-400 hover:text-red-600 p-1"
                              title="Padam Pemain"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {players.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 sm:py-8 text-center text-gray-400 italic text-[10px] sm:text-sm">Tiada pemain didaftarkan</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-2 md:gap-3 pt-4 border-t border-pink-light">
              <button
                type="button"
                onClick={resetForm}
                className="order-2 md:order-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs md:text-sm font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="order-1 md:order-2 bg-matcha-gradient hover:opacity-90 text-white px-8 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md text-xs md:text-sm font-bold"
              >
                <Save className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Simpan Pasukan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6">
        {teams.map((team) => {
          const isSelected = selectedTeams.includes(team.id);
          return (
            <div 
              key={team.id} 
              onClick={() => {
                if (isUrusetia) {
                  handleEdit(team);
                } else {
                  handleTeamClick(team);
                }
              }}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all relative cursor-pointer ${isSelected ? 'border-pink ring-1 ring-pink' : 'border-pink-light'}`}
            >
              <div className="bg-pink-gradient p-2 sm:p-4 border-b border-pink-light flex justify-between items-start">
                <div className="flex items-center gap-1.5 sm:gap-3">
                  {isUrusetia && (
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleTeamSelection(team.id);
                      }}
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded border-gray-300 text-pink focus:ring-pink cursor-pointer"
                    />
                  )}
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="h-6 w-6 sm:h-10 sm:w-10 object-contain bg-white rounded-lg p-0.5 sm:p-1 border border-pink-light" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-6 w-6 sm:h-10 sm:w-10 bg-white rounded-lg p-0.5 sm:p-1 border border-pink-light flex items-center justify-center">
                      <Users className="h-3 w-3 sm:h-6 sm:w-6 text-matcha opacity-30" />
                    </div>
                  )}
                  <h4 className="font-bold text-gray-800 text-[10px] sm:text-base break-words leading-tight flex items-center gap-1">
                    {team.name}
                    {team.isSeeded && <Star className="h-2 w-2 sm:h-3 sm:w-3 text-yellow-500 fill-yellow-500" />}
                  </h4>
                </div>
                {isUrusetia && (
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }} className="text-red-400 hover:text-red-600 p-0.5">
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-2 sm:p-4">
                <div className="flex justify-between items-center text-[8px] sm:text-sm mb-0.5 sm:mb-2">
                  <span className="text-gray-500">Pemain:</span>
                  <span className="font-bold text-matcha">{team.players.length}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] sm:text-sm">
                  <span className="text-gray-500">Kumpulan:</span>
                  <span className="font-bold text-gray-700">
                    {team.groupId ? (
                      `Kumpulan ${groups.find(g => g.id === team.groupId)?.name || ''}${team.groupPosition ? ` (Pos: ${team.groupPosition})` : ''}`
                    ) : 'Belum Diundi'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
