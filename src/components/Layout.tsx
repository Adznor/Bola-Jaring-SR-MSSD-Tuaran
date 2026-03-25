import { Outlet, Link, useLocation } from 'react-router-dom';
import { Trophy, Users, LayoutDashboard, LogIn, LogOut, BarChart3, Info, Settings, Menu, X } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { TournamentInfo } from '../types';

import { User } from 'firebase/auth';

export default function Layout({ user }: { user: User | null }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [info, setInfo] = useState<TournamentInfo | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournamentInfo'), (snapshot) => {
      if (!snapshot.empty) {
        setInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TournamentInfo);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tournamentInfo');
    });
    return unsub;
  }, []);

  // Close menu when location changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const navLinks = [
    { to: '/info', icon: Info, label: 'Maklumat' },
    { to: '/', icon: Trophy, label: 'Jadual & Kedudukan' },
    { to: '/stats', icon: BarChart3, label: 'Statistik' },
  ];

  const adminLabel = user?.email === 'urusetia@mssd.tuaran.my' ? 'Urusetia' : 'Pengurus';

  return (
    <div className="min-h-screen bg-pink-soft font-sans">
      {/* Header */}
      <header className="bg-matcha text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {info?.tournamentLogoUrl ? (
                <img src={info.tournamentLogoUrl} alt="Logo Kejohanan" className="h-8 w-8 sm:h-12 sm:w-12 object-contain bg-white/10 rounded-lg p-1" referrerPolicy="no-referrer" />
              ) : (
                <Trophy className="h-6 w-6 sm:h-10 sm:w-10 text-pink-light" />
              )}
              <div>
                <h1 className="text-sm sm:text-xl md:text-2xl font-bold tracking-tight">MSSD TUARAN</h1>
                <p className="text-[8px] sm:text-xs md:text-sm text-matcha-light uppercase tracking-widest">Kejohanan Bola Jaring Sekolah Rendah</p>
              </div>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden lg:flex space-x-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === link.to ? 'bg-matcha-dark text-white' : 'hover:bg-matcha-light/20'}`}
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/admin" className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isAdmin ? 'bg-matcha-dark text-white' : 'hover:bg-matcha-light/20'}`}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{adminLabel}</span>
                  </Link>
                  <button onClick={() => signOut(auth)} className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-500/20 transition-colors">
                    <LogOut className="h-4 w-4" />
                    <span>Log Keluar</span>
                  </button>
                </>
              ) : (
                <Link to="/login" className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/login' ? 'bg-matcha-dark text-white' : 'hover:bg-matcha-light/20'}`}>
                  <LogIn className="h-4 w-4" />
                  <span>Log Masuk</span>
                </Link>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-1.5 rounded-md text-white hover:bg-matcha-dark focus:outline-none transition-colors"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMenuOpen && (
          <div className="lg:hidden bg-matcha-dark border-t border-matcha-light/10 animate-in slide-in-from-top duration-200">
            <div className="px-2 pt-1 pb-2 space-y-0.5 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${location.pathname === link.to ? 'bg-matcha text-white' : 'text-matcha-light hover:bg-matcha hover:text-white'}`}
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${isAdmin ? 'bg-matcha text-white' : 'text-matcha-light hover:bg-matcha hover:text-white'}`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{adminLabel}</span>
                  </Link>
                  <button
                    onClick={() => signOut(auth)}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-white transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Keluar</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/login' ? 'bg-matcha text-white' : 'text-matcha-light hover:bg-matcha hover:text-white'}`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Log Masuk</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-pink-light py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">© MSSD Tuaran - Kejohanan Bola Jaring Sekolah Rendah</p>
        </div>
      </footer>
    </div>
  );
}
