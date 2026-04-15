import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { TournamentInfo as TournamentInfoType, TournamentLink, Team, Match, Group, Position } from '../types';
import { Save, Info, Building2, User, Calendar, Clock, MapPin, Trophy, Users, Link as LinkIcon, Plus, Trash2, Star, CheckCircle, X, ExternalLink, FileDown, RefreshCw, Lock, LayoutGrid, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}

const SettingsSection = ({ title, icon, children, isOpen, onToggle, badge }: SettingsSectionProps) => (
  <div className="bg-white rounded-2xl border border-pink-light overflow-hidden shadow-sm transition-all duration-300">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-matcha/10 rounded-xl text-matcha">
          {icon}
        </div>
        <div className="text-left">
          <h3 className="text-sm md:text-base font-black text-gray-800 uppercase tracking-tight">{title}</h3>
          {badge && (
            <span className="text-[10px] font-bold text-matcha uppercase tracking-widest">{badge}</span>
          )}
        </div>
      </div>
      {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
    </button>
    <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
      <div className="p-6 border-t border-gray-50 bg-white">
        {children}
      </div>
    </div>
  </div>
);

export default function TournamentManagement() {
  const [info, setInfo] = useState<TournamentInfoType | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [manager, setManager] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [organizerLogoUrl, setOrganizerLogoUrl] = useState('');
  const [managerLogoUrl, setManagerLogoUrl] = useState('');
  const [tournamentLogoUrl, setTournamentLogoUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [groupMatchDuration, setGroupMatchDuration] = useState(15);
  const [groupBreakDuration, setGroupBreakDuration] = useState(1);
  const [knockoutMatchDuration, setKnockoutMatchDuration] = useState(23);
  const [knockoutBreakDuration, setKnockoutBreakDuration] = useState(3);
  const [dailyStartTime, setDailyStartTime] = useState('08:00');
  const [dailyEndTime, setDailyEndTime] = useState('17:00');
  const [numGroups, setNumGroups] = useState(4);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [tournamentDays, setTournamentDays] = useState(2);
  const [tournamentDates, setTournamentDates] = useState<string[]>([]);
  const [links, setLinks] = useState<TournamentLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const [openSections, setOpenSections] = useState<string[]>(['basic']);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 3000);
  };

  const handleToggleRegistration = async () => {
    if (!info?.id) return;
    try {
      await updateDoc(doc(db, 'tournamentInfo', info.id), {
        registrationOpen: !info.registrationOpen
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tournamentInfo');
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournamentInfo'), (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TournamentInfoType;
        setInfo(data);
        setName(data.name || '');
        setOrganizer(data.organizer || '');
        setManager(data.manager || '');
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setTime(data.time || '');
        setVenue(data.venue || '');
        setMapUrl(data.mapUrl || '');
        setOrganizerLogoUrl(data.organizerLogoUrl || '');
        setManagerLogoUrl(data.managerLogoUrl || '');
        setTournamentLogoUrl(data.tournamentLogoUrl || '');
        setFooterText(data.footerText || '"Majulah Sukan Untuk Negara - MSSD Tuaran"');
        setGroupMatchDuration(data.groupMatchDuration || 15);
        setGroupBreakDuration(data.groupBreakDuration || 1);
        setKnockoutMatchDuration(data.knockoutMatchDuration || 23);
        setKnockoutBreakDuration(data.knockoutBreakDuration || 3);
        setDailyStartTime(data.dailyStartTime || '08:00');
        setDailyEndTime(data.dailyEndTime || '17:00');
        setNumGroups(data.numGroups || 4);
        setTeamsPerGroup(data.teamsPerGroup || 4);
        setTournamentDays(data.tournamentDays || 2);
        setTournamentDates(data.tournamentDates || []);
        setLinks(data.links || []);
      } else {
        // Default values as requested by user
        setName('KEJOHANAN BOLA JARING SEKOLAH RENDAH MSSD TUARAN 2026');
        setOrganizer('Pejabat Pendidikan Daerah Tuaran');
        setManager('SK Pekan Telipok');
        setStartDate('20 Mei 2026');
        setEndDate('21 Mei 2026');
        setTime('8.00 pagi hingga 5.00 petang');
        setVenue('Arena Futsal Tuaran');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tournamentInfo');
    });

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
      unsub();
      unsubTeams();
      unsubMatches();
      unsubGroups();
    };
  }, []);

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Helper for adding sections
    const addSectionTitle = (title: string, y: number) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, y);
      return y + 10;
    };

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(name || 'MAKLUMAT KEJOHANAN', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Penganjur: ${organizer}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Pengelola: ${manager}`, pageWidth / 2, 34, { align: 'center' });
    doc.text(`Tarikh: ${startDate} - ${endDate}`, pageWidth / 2, 40, { align: 'center' });
    doc.text(`Venue: ${venue}`, pageWidth / 2, 46, { align: 'center' });

    let currentY = 60;

    // 1. Senarai Pasukan
    currentY = addSectionTitle('1. SENARAI PASUKAN', currentY);
    const teamData = teams.map(t => [
      t.name,
      groups.find(g => g.id === t.groupId)?.name || 'N/A',
      t.players.length.toString()
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Nama Pasukan', 'Kumpulan', 'Bil. Pemain']],
      body: teamData,
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 2. Jadual & Keputusan Perlawanan Kumpulan
    currentY = addSectionTitle('2. JADUAL & KEPUTUSAN PERLAWANAN KUMPULAN', currentY);
    const groupMatches = matches
      .filter(m => m.stage === 'group')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .map(m => [
        `${m.date} ${m.time}`,
        groups.find(g => g.id === m.groupId)?.name || 'N/A',
        teams.find(t => t.id === m.teamAId)?.name || 'N/A',
        `${m.scoreA} - ${m.scoreB}`,
        teams.find(t => t.id === m.teamBId)?.name || 'N/A',
        m.status.toUpperCase()
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Tarikh/Masa', 'Kumpulan', 'Pasukan A', 'Skor', 'Pasukan B', 'Status']],
      body: groupMatches,
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 3. Kedudukan Kumpulan
    currentY = addSectionTitle('3. KEDUDUKAN KUMPULAN', currentY);
    groups.forEach(group => {
      const groupTeams = teams.filter(t => t.groupId === group.id);
      const standings = groupTeams.map(team => {
        const teamMatches = matches.filter(m => m.stage === 'group' && m.status === 'finished' && (m.teamAId === team.id || m.teamBId === team.id));
        let p = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0, pts = 0;
        
        teamMatches.forEach(m => {
          p++;
          const isTeamA = m.teamAId === team.id;
          const scoreSelf = isTeamA ? m.scoreA : m.scoreB;
          const scoreOpp = isTeamA ? m.scoreB : m.scoreA;
          gf += scoreSelf;
          ga += scoreOpp;
          if (scoreSelf > scoreOpp) { w++; pts += 3; }
          else if (scoreSelf < scoreOpp) { l++; }
          else { d++; pts += 1; }
        });

        return { name: team.name, p, w, d, l, gf, ga, gd: gf - ga, pts };
      }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.text(`Kumpulan ${group.name}`, 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Pasukan', 'P', 'M', 'S', 'K', 'JG', 'JK', 'PG', 'MT']],
        body: standings.map(s => [s.name, s.p, s.w, s.d, s.l, s.gf, s.ga, s.gd, s.pts]),
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
    currentY += 5;

    // 4. Peringkat Kalah Mati
    const knockoutStages = [
      { id: 'quarter', label: 'Suku Akhir' },
      { id: 'semi', label: 'Separuh Akhir' },
      { id: 'third_place', label: 'Penentuan Tempat Ke-3' },
      { id: 'final', label: 'Akhir' }
    ];

    knockoutStages.forEach((stage, idx) => {
      const stageMatches = matches.filter(m => m.stage === stage.id);
      if (stageMatches.length > 0) {
        currentY = addSectionTitle(`${4 + idx}. JADUAL & KEPUTUSAN ${stage.label.toUpperCase()}`, currentY);
        const data = stageMatches.map(m => [
          `${m.date} ${m.time}`,
          teams.find(t => t.id === m.teamAId)?.name || 'N/A',
          `${m.scoreA} - ${m.scoreB}`,
          teams.find(t => t.id === m.teamBId)?.name || 'N/A',
          m.status.toUpperCase()
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Tarikh/Masa', 'Pasukan A', 'Skor', 'Pasukan B', 'Status']],
          body: data,
          theme: 'grid',
          headStyles: { fillColor: [46, 125, 50] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }
    });

    // 5. Keputusan Rasmi
    currentY = addSectionTitle('KEPUTUSAN RASMI KEJOHANAN', currentY);
    const finalMatch = matches.find(m => m.stage === 'final' && m.status === 'finished');
    const thirdMatch = matches.find(m => m.stage === 'third_place' && m.status === 'finished');
    
    const results = [];
    if (finalMatch) {
      results.push(['JOHAN', teams.find(t => t.id === (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId))?.name || '-']);
      results.push(['NAIB JOHAN', teams.find(t => t.id === (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamBId : finalMatch.teamAId))?.name || '-']);
    }
    if (thirdMatch) {
      results.push(['TEMPAT KETIGA', teams.find(t => t.id === (thirdMatch.scoreA > thirdMatch.scoreB ? thirdMatch.teamAId : thirdMatch.teamBId))?.name || '-']);
      results.push(['TEMPAT KEEMPAT', teams.find(t => t.id === (thirdMatch.scoreA > thirdMatch.scoreB ? thirdMatch.teamBId : thirdMatch.teamAId))?.name || '-']);
    }

    if (results.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Kedudukan', 'Pasukan']],
        body: results,
        theme: 'grid',
        headStyles: { fillColor: [190, 24, 93] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 6. Penjaring Terbanyak
    currentY = addSectionTitle('SENARAI PENJARING TERBANYAK', currentY);
    const playerGoalsMap: { [key: string]: { name: string; team: string; goals: number } } = {};
    
    matches.forEach(match => {
      match.scorers?.forEach(scorer => {
        const key = `${scorer.playerName}_${scorer.teamId}`;
        if (!playerGoalsMap[key]) {
          const team = teams.find(t => t.id === scorer.teamId);
          playerGoalsMap[key] = { 
            name: scorer.playerName, 
            team: team?.name || 'N/A', 
            goals: 0 
          };
        }
        playerGoalsMap[key].goals += scorer.goals;
      });
    });

    const topScorers = Object.values(playerGoalsMap)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10)
      .map((p, i) => [i + 1, p.name, p.team, p.goals]);

    autoTable(doc, {
      startY: currentY,
      head: [['No', 'Nama Pemain', 'Pasukan', 'Gol']],
      body: topScorers,
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 7. Statistik Kejohanan
    currentY = addSectionTitle('STATISTIK KEJOHANAN', currentY);
    const totalGoals = matches.reduce((sum, m) => sum + (m.scoreA || 0) + (m.scoreB || 0), 0);
    const totalMatches = matches.filter(m => m.status === 'finished' || m.status === 'live').length;
    const totalPlayers = teams.reduce((sum, t) => sum + t.players.length, 0);

    const statsData = [
      ['Jumlah Pasukan', teams.length],
      ['Jumlah Pemain', totalPlayers],
      ['Jumlah Perlawanan', totalMatches],
      ['Jumlah Gol', totalGoals],
      ['Purata Gol Per Perlawanan', totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : '0.00']
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Kategori', 'Jumlah']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50] }
    });

    doc.save(`Laporan_Penuh_Kejohanan_${name.replace(/\s+/g, '_')}.pdf`);
    showNotification('PDF Kejohanan berjaya dijana.');
  };

  const handleResetTournament = async () => {
    if (resetPassword !== 'Adzeem06022023') {
      showNotification('Kata laluan salah!', 'error');
      return;
    }

    setIsResetting(true);
    try {
      const batch = writeBatch(db);
      
      // Delete all teams
      const teamsSnap = await getDocs(collection(db, 'teams'));
      teamsSnap.forEach(doc => batch.delete(doc.ref));

      // Delete all matches
      const matchesSnap = await getDocs(collection(db, 'matches'));
      matchesSnap.forEach(doc => batch.delete(doc.ref));

      // Delete all groups
      const groupsSnap = await getDocs(collection(db, 'groups'));
      groupsSnap.forEach(doc => batch.delete(doc.ref));

      await batch.commit();
      showNotification('Kejohanan berjaya direset.');
      setShowResetConfirm(false);
      setResetPassword('');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reset');
      showNotification('Ralat semasa reset kejohanan.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSetupGroups = async () => {
    if (!numGroups || numGroups <= 0) {
      showNotification('Sila tetapkan bilangan kumpulan yang sah.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      
      // Delete existing groups first
      const groupsSnap = await getDocs(collection(db, 'groups'));
      groupsSnap.forEach(doc => batch.delete(doc.ref));

      // Create new groups A, B, C...
      for (let i = 0; i < numGroups; i++) {
        const groupName = String.fromCharCode(65 + i); // A, B, C...
        const groupRef = doc(collection(db, 'groups'));
        batch.set(groupRef, { name: groupName });
      }

      await batch.commit();
      showNotification(`Berjaya menyediakan ${numGroups} kumpulan (A-${String.fromCharCode(64 + numGroups)}).`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'groups');
      showNotification('Ralat semasa menyediakan kumpulan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoDraw = async () => {
    if (teams.length === 0 || groups.length === 0) {
      showNotification('Sila pastikan pasukan dan kumpulan telah didaftarkan.', 'error');
      return;
    }

    if (teams.length > numGroups * teamsPerGroup) {
      showNotification(`Jumlah pasukan (${teams.length}) melebihi kapasiti (${numGroups * teamsPerGroup}).`, 'error');
      return;
    }

    setIsDrawing(true);
    try {
      const batch = writeBatch(db);
      const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
      
      // 1. Identify fixed teams (already assigned to a group and position)
      const fixedTeams = teams.filter(t => t.groupId && t.groupPosition);
      const drawTeams = teams.filter(t => !fixedTeams.some(ft => ft.id === t.id));
      
      // 2. Identify all possible slots
      const allSlots: { groupId: string, position: number }[] = [];
      for (const group of sortedGroups) {
        for (let p = 1; p <= teamsPerGroup; p++) {
          allSlots.push({ groupId: group.id, position: p });
        }
      }
      
      // 3. Filter out occupied slots
      const availableSlots = allSlots.filter(slot => 
        !fixedTeams.some(ft => ft.groupId === slot.groupId && ft.groupPosition === slot.position)
      );
      
      // 4. Shuffle teams to be drawn
      const shuffledDrawTeams = [...drawTeams].sort(() => Math.random() - 0.5);
      
      // 5. Assign teams to available slots
      for (let i = 0; i < shuffledDrawTeams.length; i++) {
        if (i < availableSlots.length) {
          const team = shuffledDrawTeams[i];
          const slot = availableSlots[i];
          batch.update(doc(db, 'teams', team.id), {
            groupId: slot.groupId,
            groupPosition: slot.position
          });
        }
      }

      await batch.commit();
      showNotification('Undian pasukan berjaya dijalankan secara automatik!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'draw');
      showNotification('Ralat semasa menjalankan undian.', 'error');
    } finally {
      setIsDrawing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const data = {
      name,
      organizer,
      manager,
      startDate,
      endDate,
      time,
      venue,
      mapUrl,
      organizerLogoUrl,
      managerLogoUrl,
      tournamentLogoUrl,
      footerText,
      groupMatchDuration,
      groupBreakDuration,
      knockoutMatchDuration,
      knockoutBreakDuration,
      dailyStartTime,
      dailyEndTime,
      numGroups,
      teamsPerGroup,
      tournamentDays,
      tournamentDates,
      links
    };

    try {
      if (info?.id) {
        await updateDoc(doc(db, 'tournamentInfo', info.id), data);
      } else {
        await addDoc(collection(db, 'tournamentInfo'), data);
      }
      showNotification('Maklumat kejohanan berjaya disimpan.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tournamentInfo');
      showNotification('Ralat semasa menyimpan maklumat.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLink = () => {
    if (!newLinkLabel || !newLinkUrl) {
      showNotification('Sila masukkan label dan URL.', 'error');
      return;
    }
    setLinks([...links, { label: newLinkLabel, url: newLinkUrl }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 md:p-6 bg-white rounded-3xl border border-pink-light shadow-sm gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${info?.registrationOpen ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
            <Users className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </div>
          <div>
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Status Pendaftaran</h3>
            <p className={`text-lg md:text-xl font-black tracking-tight ${info?.registrationOpen ? 'text-green-600' : 'text-red-600'}`}>
              {info?.registrationOpen ? 'DIBUKA' : 'DITUTUP'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleRegistration}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${
            info?.registrationOpen 
              ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600' 
              : 'bg-green-500 text-white shadow-green-500/20 hover:bg-green-600'
          }`}
        >
          {info?.registrationOpen ? <Lock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          {info?.registrationOpen ? 'Tutup Pendaftaran' : 'Buka Pendaftaran'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 1: Maklumat Asas */}
        <SettingsSection
          title="Maklumat Asas Kejohanan"
          icon={<Trophy className="h-5 w-5" />}
          isOpen={openSections.includes('basic')}
          onToggle={() => toggleSection('basic')}
          badge="Nama, Logo & Footer"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Kejohanan</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha focus:border-transparent outline-none transition-all font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Penganjur</label>
                <input
                  type="text"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pengelola</label>
                <input
                  type="text"
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Slogan / Teks Footer</label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all italic"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logo Kejohanan (URL)</label>
                <input type="text" value={tournamentLogoUrl} onChange={(e) => setTournamentLogoUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-matcha" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logo Penganjur (URL)</label>
                <input type="text" value={organizerLogoUrl} onChange={(e) => setOrganizerLogoUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-matcha" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logo Pengelola (URL)</label>
                <input type="text" value={managerLogoUrl} onChange={(e) => setManagerLogoUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-matcha" />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Section 2: Tarikh & Lokasi */}
        <SettingsSection
          title="Tarikh & Lokasi"
          icon={<Calendar className="h-5 w-5" />}
          isOpen={openSections.includes('dates')}
          onToggle={() => toggleSection('dates')}
          badge="Masa, Venue & Maps"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarikh Mula</label>
                <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarikh Tamat</label>
                <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Masa Kejohanan</label>
                <input type="text" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Venue Kejohanan</label>
                <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">URL Google Maps (Embed)</label>
              <input type="text" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-matcha outline-none transition-all" placeholder="https://www.google.com/maps/embed?..." />
            </div>
          </div>
        </SettingsSection>

        {/* Section 3: Parameter Penjadualan */}
        <SettingsSection
          title="Parameter Penjadualan"
          icon={<Clock className="h-5 w-5" />}
          isOpen={openSections.includes('scheduling')}
          onToggle={() => toggleSection('scheduling')}
          badge="Durasi & Masa Harian"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Masa Perlawanan (Kump)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={groupMatchDuration} onChange={(e) => setGroupMatchDuration(parseInt(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
                  <span className="text-[10px] font-bold text-gray-400">min</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Masa Rehat (Kump)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={groupBreakDuration} onChange={(e) => setGroupBreakDuration(parseInt(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
                  <span className="text-[10px] font-bold text-gray-400">min</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Masa Perlawanan (KM)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={knockoutMatchDuration} onChange={(e) => setKnockoutMatchDuration(parseInt(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
                  <span className="text-[10px] font-bold text-gray-400">min</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Masa Rehat (KM)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={knockoutBreakDuration} onChange={(e) => setKnockoutBreakDuration(parseInt(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
                  <span className="text-[10px] font-bold text-gray-400">min</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bilangan Hari</label>
                <input type="number" value={tournamentDays} onChange={(e) => {
                  const days = parseInt(e.target.value);
                  setTournamentDays(days);
                  const newDates = [...tournamentDates];
                  while (newDates.length < days) newDates.push('');
                  setTournamentDates(newDates.slice(0, days));
                }} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Masa Mula Harian</label>
                <input type="time" value={dailyStartTime} onChange={(e) => setDailyStartTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Masa Tamat Harian</label>
                <input type="time" value={dailyEndTime} onChange={(e) => setDailyEndTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-50">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarikh Spesifik Kejohanan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: tournamentDays }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 w-12 uppercase">Hari {i + 1}</span>
                    <input type="date" value={tournamentDates[i] || ''} onChange={(e) => {
                      const newDates = [...tournamentDates];
                      newDates[i] = e.target.value;
                      setTournamentDates(newDates);
                    }} className="flex-1 bg-transparent text-sm outline-none font-bold" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Section 4: Kumpulan & Undian */}
        <SettingsSection
          title="Kumpulan & Undian"
          icon={<LayoutGrid className="h-5 w-5" />}
          isOpen={openSections.includes('groups')}
          onToggle={() => toggleSection('groups')}
          badge="Setup & Auto Draw"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bilangan Kumpulan</label>
                <input type="number" value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pasukan Per Kumpulan</label>
                <input type="number" value={teamsPerGroup} onChange={(e) => setTeamsPerGroup(parseInt(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-matcha" />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSetupGroups} disabled={isSaving} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                <LayoutGrid className="h-4 w-4" /> Sediakan Kumpulan
              </button>
              <button type="button" onClick={handleAutoDraw} disabled={isDrawing || teams.length === 0 || groups.length === 0} className="flex-1 bg-matcha text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-matcha-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-matcha/20">
                <RefreshCw className={`h-4 w-4 ${isDrawing ? 'animate-spin' : ''}`} /> Undi Pasukan
              </button>
            </div>
          </div>
        </SettingsSection>

        {/* Section 5: Pautan Luar */}
        <SettingsSection
          title="Pautan Luar"
          icon={<LinkIcon className="h-5 w-5" />}
          isOpen={openSections.includes('links')}
          onToggle={() => toggleSection('links')}
          badge="Website & Media Sosial"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Label</label>
                <input type="text" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-matcha" placeholder="Contoh: Website Rasmi" />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">URL</label>
                <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-matcha" placeholder="https://..." />
              </div>
              <button type="button" onClick={handleAddLink} className="bg-matcha text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-matcha-dark transition-all h-[38px] shadow-lg shadow-matcha/20">Tambah</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {links.length === 0 ? (
                <div className="sm:col-span-2 py-10 text-center text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">Tiada pautan ditambah.</div>
              ) : (
                links.map((link, index) => (
                  <div key={index} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-matcha/10 text-matcha rounded-xl">
                        <LinkIcon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-gray-800 text-sm truncate uppercase tracking-tight">{link.label}</span>
                        <span className="text-[10px] text-gray-400 truncate font-medium">{link.url}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-matcha/10 text-matcha py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-matcha hover:text-white transition-all"><ExternalLink className="h-3 w-3" /> Buka</a>
                      <button type="button" onClick={() => removeLink(index)} className="flex items-center justify-center gap-2 bg-red-50 text-red-500 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"><Trash2 className="h-3 w-3" /> Padam</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SettingsSection>

        {/* Section 6: Kawalan Bahaya */}
        <SettingsSection
          title="Kawalan Bahaya"
          icon={<AlertTriangle className="h-5 w-5" />}
          isOpen={openSections.includes('danger')}
          onToggle={() => toggleSection('danger')}
          badge="Reset & Pembersihan Data"
        >
          <div className="space-y-6">
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
              <p className="text-red-600 text-xs font-bold leading-relaxed">
                <AlertTriangle className="h-4 w-4 inline mr-2 mb-1" />
                AMARAN: Tindakan ini akan memadam SEMUA data pasukan, perlawanan, dan kumpulan. Data yang dipadam tidak boleh dikembalikan.
              </p>
            </div>
            
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-red-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Reset Kejohanan
              </button>
            ) : (
              <div className="space-y-4 animate-in zoom-in duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest ml-1">Masukkan Kata Laluan Reset</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-red-200 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="Sila masukkan kata laluan..."
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowResetConfirm(false); setResetPassword(''); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">Batal</button>
                  <button type="button" onClick={handleResetTournament} disabled={isResetting} className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
                    {isResetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Sahkan Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        <div className="pt-8 flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-matcha-gradient text-white py-4 rounded-2xl md:rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Save className="h-6 w-6" />
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Tetapan'}
          </button>
          <button
            type="button"
            onClick={generatePDF}
            className="flex-1 bg-white border-2 border-matcha text-matcha py-4 rounded-2xl md:rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-matcha hover:text-white transition-all flex items-center justify-center gap-3"
          >
            <FileDown className="h-6 w-6" />
            Cetak Laporan PDF
          </button>
        </div>
      </form>

      {notification.show && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
          <span className="font-bold">{notification.message}</span>
        </div>
      )}
    </div>
  );
}

