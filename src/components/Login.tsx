import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'urusetia' | 'pengurus'>('urusetia');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let email = '';
    let isValid = false;

    if (role === 'urusetia' && username.toLowerCase() === 'urusetia' && password === 'Urusetia2026') {
      email = 'urusetia@mssd.tuaran.my';
      isValid = true;
    } else if (role === 'pengurus' && username.toLowerCase() === 'pengurus' && password === 'Pengurus2026') {
      email = 'pengurus@mssd.tuaran.my';
      isValid = true;
    }

    if (isValid) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/admin');
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            setError(createErr.code === 'auth/email-already-in-use' ? 'Kredensial tidak sah.' : 'Ralat sistem: ' + createErr.message);
          }
        } else {
          setError('Ralat log masuk: ' + err.message);
        }
      }
    } else {
      setError('Username atau Password salah.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-pink-light">
        <div className="text-center mb-8">
          <div className="bg-matcha/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-matcha" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Log Masuk Sistem</h2>
          <p className="text-sm text-gray-500 mt-2">Sila pilih peranan dan masukkan kredensial</p>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
          <button
            onClick={() => setRole('urusetia')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'urusetia' ? 'bg-white text-matcha shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Urusetia
          </button>
          <button
            onClick={() => setRole('pengurus')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'pengurus' ? 'bg-white text-matcha shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pengurus Pasukan
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center space-x-2 text-sm border border-red-100">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent transition-all"
                placeholder={role === 'urusetia' ? 'Urusetia' : 'Pengurus'}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-matcha focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-matcha hover:bg-matcha-dark text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Sila tunggu...' : 'Log Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
