import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, Lock, AlertCircle, FileText } from 'lucide-react';

const Login = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Jika sudah login, langsung alihkan ke dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#0f172a] via-[#1e1b4b] to-[#311042] px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-indigo-600/10 text-indigo-400 rounded-3xl mb-4 border border-indigo-500/20 shadow-2xl">
                        <FileText size={40} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Aplikasi PERJADIN</h1>
                    <p className="text-slate-400 text-sm mt-2">Sistem Informasi Perjalanan Dinas Pemkab Melawi</p>
                </div>

                {/* Card Form */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-950/50">
                    <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                        <KeyRound size={20} className="text-indigo-400" />
                        <span>Masuk ke Sistem</span>
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Masukkan username Anda"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kata Sandi</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password Anda"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm dark:focus:ring-emerald-600/20 dark:focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all text-sm mt-2"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Memverifikasi...</span>
                                </div>
                            ) : (
                                'Masuk Aplikasi'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Info */}
                <p className="text-center text-xs text-slate-500 mt-8">
                    &copy; 2026 Pemerintah Kabupaten Melawi. Hak Cipta Dilindungi.
                </p>
            </div>
        </div>
    );
};

export default Login;
