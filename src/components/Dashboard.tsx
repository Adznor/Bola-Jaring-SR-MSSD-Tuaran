import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, LayoutGrid, CalendarDays, Settings, UserCircle, Trophy, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { auth } from '../firebase';

export default function Dashboard() {
  const location = useLocation();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const user = auth.currentUser;
  const isUrusetia = user?.email === 'urusetia@mssd.tuaran.my';

  const urusetiaTabs = [
    { name: 'Pendaftaran Pasukan', path: '/admin/registration', icon: Users },
    { name: 'Pengurusan Kumpulan', path: '/admin/groups', icon: LayoutGrid },
    { name: 'Penjadualan Automatik', path: '/admin/auto-schedule', icon: Zap },
    { name: 'Perlawanan & Keputusan', path: '/admin/matches', icon: CalendarDays },
    { name: 'Catatan', path: '/admin/top8', icon: Trophy },
    { name: 'Tetapan', path: '/admin/tournament-info', icon: Settings },
  ];

  const pengurusTabs = [
    { name: 'Pendaftaran Pasukan', path: '/admin/registration', icon: Users },
  ];

  const tabs = isUrusetia ? urusetiaTabs : pengurusTabs;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`sticky top-[64px] sm:top-[80px] z-40 transition-all duration-300 ${isNavVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none h-0 overflow-hidden'}`}>
        <div className="bg-white/80 backdrop-blur-md p-3 md:p-4 rounded-2xl shadow-md border border-pink-light">
          <div className="flex items-center justify-between mb-3 md:mb-4 px-2">
            <div className="flex items-center space-x-2">
              {isUrusetia ? <Settings className="h-4 w-4 md:h-5 md:w-5 text-matcha" /> : <UserCircle className="h-4 w-4 md:h-5 md:w-5 text-matcha" />}
              <h2 className="text-sm md:text-lg font-black text-gray-800 uppercase tracking-tight">{isUrusetia ? 'Panel Urusetia' : 'Panel Pengurus'}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsNavVisible(false)}
                className="p-1.5 bg-gray-100 text-gray-400 hover:text-matcha hover:bg-matcha/10 rounded-lg transition-all"
                title="Sembunyi Navigasi"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button 
                onClick={() => auth.signOut()}
                className="text-[10px] md:text-xs font-black text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest"
              >
                Log Keluar
              </button>
            </div>
          </div>
          
          {/* Mobile Nav */}
          <div className="lg:hidden">
            <div className="relative">
              <select
                value={location.pathname}
                onChange={(e) => {
                  const path = e.target.value;
                  window.location.href = path;
                }}
                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-matcha focus:border-transparent outline-none font-bold text-gray-700 text-xs appearance-none shadow-sm"
              >
                {tabs.map((tab) => (
                  <option key={tab.path} value={tab.path}>
                    {tab.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <LayoutGrid className="h-3.5 w-3.5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Desktop Nav - 2 Rows */}
          <div className="hidden lg:grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  location.pathname === tab.path
                    ? 'bg-matcha text-white border-matcha shadow-lg shadow-matcha/20'
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-matcha/10 hover:text-matcha hover:border-matcha/20'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${location.pathname === tab.path ? 'text-white' : 'text-matcha'}`} />
                <span>{tab.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!isNavVisible && (
        <div className="sticky top-[64px] sm:top-[80px] z-40 flex justify-center animate-in slide-in-from-top duration-300">
          <button 
            onClick={() => setIsNavVisible(true)}
            className="bg-matcha text-white px-6 py-2 rounded-full shadow-lg shadow-matcha/20 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
          >
            <ChevronDown className="h-4 w-4" />
            <span>Tunjuk Navigasi</span>
          </button>
        </div>
      )}

      <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-pink-light min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
