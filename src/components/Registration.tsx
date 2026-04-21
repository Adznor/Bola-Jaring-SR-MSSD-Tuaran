import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Team, Player, Position, TournamentInfo, POSITION_ORDER, Group } from '../types';
import { Plus, Trash2, Edit2, X, Save, UserPlus, Users, AlertCircle, CheckCircle, Zap, FileUp, Download } from 'lucide-react';
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
    if (isRegistrationOpen || isUrusetia) {
      handleEdit(team);
    } else {
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
      players,
      createdAt: editingTeam?.createdAt || Date.now(),
      uid: editingTeam?.uid || user?.uid,
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

  const handleDownloadCSV = () => {
    const data = teams.map((team, index) => ({
      'Bil': index + 1,
      'Nama Pasukan': team.name,
      'Nama Pengurus': team.managerName || '-',
      'No Telefon': team.phone || '-',
      'Bilangan Pemain': team.players.length,
      'Senarai Pemain': team.players.map(p => `${p.name} (${p.position})`).join('; ')
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `senarai_pasukan_mssd_tuaran_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.name.localeCompare(b.name);
    });
  }, [teams]);

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
                    onClick={handleDownloadCSV}
                    className="flex-1 md:flex-none bg-white border border-matcha text-matcha px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-matcha hover:text-white transition-all shadow-sm text-[10px] sm:text-sm font-bold"
                    title="Muat Turun Senarai Pasukan (CSV)"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Muat Turun CSV</span>
                  </button>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-pink-light overflow-hidden animate-in zoom-in duration-300 flex flex-col my-auto">
            <div className="bg-matcha-gradient p-6 sm:p-8 text-white relative shrink-0">
              <button 
                onClick={resetForm}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
                title="Tutup"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                  <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-3xl font-black tracking-tight uppercase leading-tight">
                    {editingTeam ? 'Kemaskini Pasukan' : 'Daftar Pasukan Baru'}
                  </h3>
                  <p className="text-matcha-light font-bold tracking-widest text-[10px] sm:text-sm mt-0.5 sm:mt-1 uppercase">Sila lengkapkan maklumat pasukan di bawah</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-10 overflow-y-auto custom-scrollbar flex-1 bg-white">
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Pasukan</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-matcha focus:border-transparent outline-none font-bold text-gray-700 text-xs sm:text-sm shadow-sm"
                        placeholder="Contoh: Tuaran Tigers"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">URL Logo (Opsional)</label>
                        <a 
                          href="https://drive.google.com/drive/u/0/folders/1OczjDcEDwrgaPiT3jQjQMK3BsXvvagNu" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[8px] sm:text-[10px] font-black text-matcha hover:underline flex items-center gap-1 uppercase"
                        >
                          <Zap className="h-2 w-2 sm:h-3 sm:w-3" /> Muat Naik
                        </a>
                      </div>
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={!isUrusetia}
                        className={`w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-matcha focus:border-transparent outline-none font-bold text-gray-700 text-xs sm:text-sm shadow-sm ${!isUrusetia ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="https://example.com/logo.png"
                      />
                      {!isUrusetia && (
                        <p className="text-[8px] sm:text-[10px] text-gray-400 mt-2 italic font-medium">URL Logo hanya boleh dikemaskini oleh Urusetia.</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Pengurus</label>
                      <input
                        type="text"
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-matcha focus:border-transparent outline-none font-bold text-gray-700 text-xs sm:text-sm shadow-sm"
                        placeholder="Nama Pengurus"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-2">No. Telefon</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-matcha focus:border-transparent outline-none font-bold text-gray-700 text-xs sm:text-sm shadow-sm"
                        placeholder="012-3456789"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-8 sm:pt-10">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h5 className="font-black text-gray-800 flex items-center gap-3 text-sm sm:text-lg uppercase tracking-tight">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-matcha" />
                      Senarai Pemain ({players.length}/12)
                    </h5>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 items-end bg-gray-50 p-4 sm:p-6 rounded-3xl border border-gray-100">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Penuh Pemain</label>
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-matcha outline-none font-bold text-gray-700 text-xs sm:text-sm"
                        placeholder="Nama Pemain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Posisi</label>
                        <select
                          value={newPlayerPos}
                          onChange={(e) => setNewPlayerPos(e.target.value as Position)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-matcha outline-none font-bold text-gray-700 text-xs sm:text-sm appearance-none"
                        >
                          {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPlayer}
                        className={`${editingPlayerIndex !== null ? 'bg-blue-500 shadow-blue-500/20' : 'bg-matcha-gradient shadow-matcha/20'} text-white px-6 py-3 rounded-xl hover:opacity-90 transition-all h-[46px] self-end text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg flex items-center gap-2`}
                      >
                        {editingPlayerIndex !== null ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        <span>{editingPlayerIndex !== null ? 'Simpan' : 'Tambah'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-gray-50 text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-widest">
                          <tr>
                            <th className="px-4 sm:px-6 py-4 text-left w-16">Bil</th>
                            <th className="px-4 sm:px-6 py-4 text-left">Nama Pemain</th>
                            <th className="px-4 py-4 text-center">Posisi</th>
                            <th className="px-4 sm:px-6 py-4 text-center w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {players.map((p, i) => ({ ...p, originalIndex: i }))
                            .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.name.localeCompare(b.name))
                            .map((p, i) => (
                            <tr key={p.originalIndex} className={`${editingPlayerIndex === p.originalIndex ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'} transition-colors`}>
                              <td className="px-4 sm:px-6 py-4 text-gray-400 font-bold">{i + 1}</td>
                              <td className="px-4 sm:px-6 py-4 font-bold text-gray-700 uppercase tracking-wide">{p.name}</td>
                              <td className="px-4 py-4 text-center">
                                <span className="bg-matcha text-white px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black shadow-sm">{p.position}</span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    type="button" 
                                    onClick={() => handleEditPlayer(p.originalIndex)} 
                                    className="text-blue-400 hover:text-blue-600 p-2 bg-blue-50 rounded-lg transition-all hover:scale-110"
                                    title="Edit Pemain"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemovePlayer(p.originalIndex)} 
                                    className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded-lg transition-all hover:scale-110"
                                    title="Padam Pemain"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {players.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic font-medium">Tiada pemain didaftarkan</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 sm:pt-10 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="order-2 sm:order-1 px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all text-xs sm:text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="order-1 sm:order-2 bg-matcha-gradient text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-matcha/20 text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Simpan Pasukan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {sortedTeams.map((team) => {
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
              className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer h-32 sm:h-40 ${
                isSelected ? 'ring-4 ring-pink ring-offset-2 shadow-2xl' : 'border border-pink-light shadow-sm'
              }`}
            >
              {/* Full color background with subtle pattern */}
              <div className="absolute inset-0 bg-matcha-gradient"></div>
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white"></div>
              
              <div className="relative h-full p-3 sm:p-4 flex flex-col items-center text-center text-white">
                {/* Top Actions (Checkbox) */}
                {isUrusetia && (
                  <div className="absolute top-2 right-2 z-10">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleTeamSelection(team.id);
                      }}
                      className="w-3.5 h-3.5 rounded border-white/30 text-pink focus:ring-pink cursor-pointer bg-white/20 transition-transform hover:scale-110"
                    />
                  </div>
                )}

                {/* Logo - More compact */}
                <div className="mb-2 sm:mb-3 shrink-0">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="h-12 w-12 sm:h-16 sm:w-16 object-contain bg-white rounded-xl p-1.5 shadow-lg border border-white/20" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Team Name & Info - Tighter */}
                <div className="flex-1 w-full overflow-hidden flex flex-col justify-center">
                  <h4 className="font-black text-[10px] sm:text-sm uppercase tracking-tight leading-tight mb-1 line-clamp-2">
                    {team.name}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white rounded-md text-[7px] sm:text-[9px] font-black border border-white/10 uppercase">
                      {team.players.length} PEMAIN
                    </span>
                  </div>
                </div>

                {/* Bottom Actions (Trash) - Integrated neatly */}
                {isUrusetia && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }} 
                    className="absolute bottom-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 sm:p-2 rounded-lg shadow-lg transition-all hover:scale-110 border border-white/20"
                    title="Padam Pasukan"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                )}

                {/* Decorative Element - More subtle */}
                <div className="absolute bottom-2 left-3">
                  <span className="text-[6px] sm:text-[8px] font-black opacity-40 uppercase tracking-[0.2em] pointer-events-none">MSSD TUARAN</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
