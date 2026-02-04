import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Legal } from './Legal';

interface AuthProps {
    onAuthSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [showLegal, setShowLegal] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/app`
            }
        });
        if (error) console.error('Error logging in:', error.message);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setErrorMsg('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (showLegal) {
        return <Legal onBack={() => setShowLegal(false)} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
            <div className="max-w-md w-full bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl text-center space-y-8">
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto shadow-lg shadow-brand-900/40">
                        P
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">PromptOrigin</h1>
                    <p className="text-gray-400">Secure entry to the world's best AI curriculum designer.</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-100 text-dark-950 font-bold rounded-xl transition-all shadow-lg"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>

                    <div className="flex items-center gap-4 text-gray-600 my-2">
                        <div className="h-px bg-dark-800 flex-1"></div>
                        <span className="text-xs font-semibold uppercase tracking-wider">Or with Email</span>
                        <div className="h-px bg-dark-800 flex-1"></div>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {errorMsg && (
                            <div className={`rounded-lg p-3 text-xs text-left ${errorMsg.includes('Check your email') ? 'bg-green-500/10 border border-green-500/50 text-green-200' : 'bg-red-500/10 border border-red-500/50 text-red-200'}`}>
                                {errorMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    <div className="text-sm text-gray-400">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setErrorMsg(null);
                            }}
                            className="ml-2 text-brand-500 hover:text-brand-400 font-medium hover:underline"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                        By signing in, you agree to our <button onClick={() => setShowLegal(true)} className="text-brand-500 hover:underline">Terms of Service</button> and <button onClick={() => setShowLegal(true)} className="text-brand-500 hover:underline">Privacy Policy</button>.
                        Your prompts are encrypted and private.
                    </p>
                </div>
            </div>
        </div>
    );
};
