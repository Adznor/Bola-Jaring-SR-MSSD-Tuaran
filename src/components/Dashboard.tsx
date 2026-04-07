import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, LayoutGrid, CalendarDays, Settings, UserCircle, Trophy, Zap } from 'lucide-react';
import { auth } from '../firebase';

export default function Dashboard() {
  const location = useLocation();
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
    <div className="space-y-4 md:space-y-8">
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-pink-light">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:space-x-3">
            {isUrusetia ? <Settings className="h-5 w-5 md:h-6 md:w-6 text-matcha" /> : <UserCircle className="h-5 w-5 md:h-6 md:w-6 text-matcha" />}
            <h2 className="text-lg md:text-2xl font-bold text-gray-800">{isUrusetia ? 'Panel Urusetia' : 'Panel Pengurus Pasukan'}</h2>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="text-xs md:text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
          >
            Log Keluar
          </button>
        </div>
        
        <div className="lg:hidden mb-6">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Navigasi Panel</label>
          <div className="relative">
            <select
              value={location.pathname}
              onChange={(e) => {
                const path = e.target.value;
                window.location.href = path;
              }}
              className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-matcha focus:border-transparent outline-none font-bold text-gray-700 text-sm appearance-none shadow-sm"
            >
              {tabs.map((tab) => (
                <option key={tab.path} value={tab.path}>
                  {tab.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <LayoutGrid className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-wrap gap-4 border-b border-gray-100 pb-6">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center space-x-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                location.pathname === tab.path
                  ? 'bg-matcha text-white shadow-lg shadow-matcha/20 scale-105'
                  : 'bg-gray-50 text-gray-500 hover:bg-matcha/10 hover:text-matcha'
              }`}
            >
              <tab.icon className={`h-4.5 w-4.5 ${location.pathname === tab.path ? 'text-white' : 'text-matcha'}`} />
              <span>{tab.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-pink-light min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
