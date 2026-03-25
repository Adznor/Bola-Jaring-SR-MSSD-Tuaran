import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { TournamentInfo as TournamentInfoType } from '../types';
import { Info, Calendar, Clock, MapPin, Building2, User, Trophy, Star, ExternalLink } from 'lucide-react';

export default function TournamentInfo() {
  const [info, setInfo] = useState<TournamentInfoType | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournamentInfo'), (snapshot) => {
      if (!snapshot.empty) {
        setInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TournamentInfoType);
      } else {
        // Default values as requested by user
        setInfo({
          name: 'KEJOHANAN BOLA JARING SEKOLAH RENDAH MSSD TUARAN 2026',
          organizer: 'Pejabat Pendidikan Daerah Tuaran',
          manager: 'SK Pekan Telipok',
          startDate: '20 Mei 2026',
          endDate: '21 Mei 2026',
          time: '8.00 pagi hingga 5.00 petang',
          venue: 'Arena Futsal Tuaran'
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tournamentInfo');
    });
    return unsub;
  }, []);

  if (!info) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-pink-light text-center">
        <p className="text-gray-400 italic">Maklumat kejohanan belum dikemaskini.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-pink-light overflow-hidden">
        <div className="bg-matcha-gradient p-6 md:10 text-white text-center relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            {info.tournamentLogoUrl ? (
              <>
                <div className="absolute top-2 left-2 md:top-4 md:left-4"><img src={info.tournamentLogoUrl} className="h-16 w-16 md:h-24 md:w-24 rotate-12 object-contain" alt="" referrerPolicy="no-referrer" /></div>
                <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4"><img src={info.tournamentLogoUrl} className="h-16 w-16 md:h-24 md:w-24 -rotate-12 object-contain" alt="" referrerPolicy="no-referrer" /></div>
              </>
            ) : (
              <>
                <div className="absolute top-2 left-2 md:top-4 md:left-4"><Trophy className="h-16 w-16 md:h-24 md:w-24 rotate-12" /></div>
                <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4"><Trophy className="h-16 w-16 md:h-24 md:w-24 -rotate-12" /></div>
              </>
            )}
          </div>
          {info.tournamentLogoUrl ? (
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 md:6 bg-white rounded-2xl md:rounded-3xl p-2 md:3 shadow-2xl flex items-center justify-center">
              <img src={info.tournamentLogoUrl} alt="Logo Kejohanan" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <Info className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 md:6 text-pink-light drop-shadow-lg" />
          )}
          <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-2 drop-shadow-md uppercase">{info.name || 'MAKLUMAT KEJOHANAN'}</h2>
          <div className="inline-block bg-white/20 backdrop-blur-sm px-3 md:4 py-1 rounded-full border border-white/30">
            <p className="text-white uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs font-black">MSSD TUARAN</p>
          </div>
        </div>

        <div className="p-6 md:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:12">
            {/* Left Column: Organization */}
            <div className="lg:col-span-2 space-y-6 md:10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:10">
                <div className="group bg-gray-50 p-5 md:6 rounded-2xl md:3xl border border-gray-100 hover:border-matcha/30 transition-all hover:shadow-lg flex items-start gap-3 md:4">
                  <div className="flex-1 space-y-3 md:4">
                    <div className="flex items-center gap-3 md:4">
                      <div className="bg-matcha text-white p-2 md:3 rounded-xl md:2xl shadow-matcha/20 shadow-lg group-hover:scale-110 transition-transform">
                        <Building2 className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest">Penganjur</h3>
                    </div>
                    <p className="text-base md:text-xl font-bold text-gray-800 leading-tight">{info.organizer}</p>
                  </div>
                  {info.organizerLogoUrl && (
                    <img src={info.organizerLogoUrl} alt="Logo Penganjur" className="w-16 h-16 md:w-20 md:h-20 object-contain bg-white p-1.5 md:2 rounded-xl md:2xl border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                </div>

                <div className="group bg-gray-50 p-5 md:6 rounded-2xl md:3xl border border-gray-100 hover:border-matcha/30 transition-all hover:shadow-lg flex items-start gap-3 md:4">
                  <div className="flex-1 space-y-3 md:4">
                    <div className="flex items-center gap-3 md:4">
                      <div className="bg-matcha text-white p-2 md:3 rounded-xl md:2xl shadow-matcha/20 shadow-lg group-hover:scale-110 transition-transform">
                        <User className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest">Pengelola</h3>
                    </div>
                    <p className="text-base md:text-xl font-bold text-gray-800 leading-tight">{info.manager}</p>
                  </div>
                  {info.managerLogoUrl && (
                    <img src={info.managerLogoUrl} alt="Logo Pengelola" className="w-16 h-16 md:w-20 md:h-20 object-contain bg-white p-1.5 md:2 rounded-xl md:2xl border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                </div>
              </div>

              <div className="group bg-matcha/5 p-6 md:8 rounded-2xl md:3xl border border-matcha/10 hover:border-matcha/30 transition-all hover:shadow-xl">
                <div className="flex items-center gap-3 md:4 mb-4 md:6">
                  <div className="bg-matcha-dark text-white p-3 md:4 rounded-xl md:2xl shadow-matcha-dark/20 shadow-lg group-hover:scale-110 transition-transform">
                    <MapPin className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <div>
                    <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest">Venue Kejohanan</h3>
                    <p className="text-xl md:text-2xl font-black text-matcha-dark tracking-tight">{info.venue}</p>
                  </div>
                </div>
                <div className="h-48 md:h-64 bg-gray-200 rounded-xl md:2xl overflow-hidden relative border border-gray-300">
                  {info.mapUrl ? (
                    <iframe
                      src={info.mapUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Tournament Location"
                    ></iframe>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold italic bg-gray-100">
                      Peta Lokasi Belum Dikemaskini
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Schedule */}
            <div className="space-y-6 md:space-y-8">
              <div className="bg-pink-light/10 p-6 md:8 rounded-2xl md:[2rem] border border-pink-light/30 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                  <Calendar className="h-24 w-24 md:h-32 md:w-32" />
                </div>
                <div className="relative z-10">
                  <div className="bg-matcha-dark text-white w-10 h-10 md:w-12 md:h-12 rounded-xl md:2xl flex items-center justify-center mb-4 md:6 shadow-lg shadow-matcha-dark/20">
                    <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <h3 className="text-[10px] md:text-sm font-black text-pink-dark uppercase tracking-widest mb-1 md:2">Tarikh Kejohanan</h3>
                  <div className="space-y-1">
                    <p className="text-xl md:text-3xl font-black text-gray-800 tracking-tight">{info.startDate}</p>
                    {info.endDate && (
                      <>
                        <p className="text-pink-dark font-black text-[10px] md:text-sm uppercase tracking-widest">Hingga</p>
                        <p className="text-xl md:text-3xl font-black text-gray-800 tracking-tight">{info.endDate}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-pink-light/10 p-6 md:8 rounded-2xl md:[2rem] border border-pink-light/30 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                  <Clock className="h-24 w-24 md:h-32 md:w-32" />
                </div>
                <div className="relative z-10">
                  <div className="bg-matcha-dark text-white w-10 h-10 md:w-12 md:h-12 rounded-xl md:2xl flex items-center justify-center mb-4 md:6 shadow-lg shadow-matcha-dark/20">
                    <Clock className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <h3 className="text-[10px] md:text-sm font-black text-pink-dark uppercase tracking-widest mb-1 md:2">Masa Kejohanan</h3>
                  <p className="text-lg md:text-2xl font-bold text-gray-800 leading-tight">{info.time}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-pink-gradient p-6 md:10 rounded-2xl md:[2.5rem] border border-pink-light text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none flex justify-around items-center">
          <Star className="h-8 w-8 md:h-12 md:w-12" />
          <Star className="h-6 w-6 md:h-8 md:w-8" />
          <Star className="h-8 w-8 md:h-12 md:w-12" />
        </div>
        <p className="text-matcha-dark font-black text-sm md:text-xl italic tracking-tight relative z-10">
          {info.footerText || '"Majulah Sukan Untuk Negara - MSSD Tuaran"'}
        </p>
      </div>
    </div>
  );
}
