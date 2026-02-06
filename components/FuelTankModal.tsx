import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, MessageSquare, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface FuelTankModalProps {
    isOpen: boolean;
    onClose: () => void; // Usually disabled if locked? Or maybe just for "Cancel"
    onRefill: (data: any) => Promise<void>;
    isRefilling: boolean;
}

export const FuelTankModal: React.FC<FuelTankModalProps> = ({ isOpen, onClose, onRefill, isRefilling }) => {
    const [step, setStep] = useState<'intro' | 'waitlist' | 'feedback' | 'success'>('intro');
    const [feedback, setFeedback] = useState({
        role: '',
        goal: '',
        friction: ''
    });

    if (!isOpen) return null;

    useEffect(() => {
        if (step === 'waitlist') {
            const script = document.createElement('script');
            script.src = "https://link.msgsndr.com/js/form_embed.js";
            script.async = true;
            document.body.appendChild(script);

            return () => {
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
            };
        }
    }, [step]);

    const handleWaitlistClaim = async () => {
        await onRefill({ submissionType: 'waitlist', email: '' });
        setStep('success');
        setTimeout(() => {
            onClose();
            setStep('intro'); // Reset for next time
        }, 2000);
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onRefill({ submissionType: 'feedback', feedback });
        setStep('success');
        setTimeout(() => {
            onClose();
            setStep('intro'); // Reset for next time
        }, 2000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            <div className="relative w-full max-w-md bg-[#0a0a0a] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-red-500/10 border-b border-red-500/20 p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Zap size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">You're Out of Fuel!</h2>
                    <p className="text-red-200 text-sm">Your tank hit 0 credits.</p>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 'intro' && (
                        <div className="space-y-6">
                            <p className="text-gray-300 text-center leading-relaxed">
                                We are in <span className="text-brand-400 font-bold">Soft Launch</span> mode. To keep costs low, we verify usage limits.
                            </p>

                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <p className="text-sm text-gray-400 text-center">
                                    Unlock <span className="text-white font-bold">100 Credits</span>?
                                </p>
                                <p className="text-[10px] text-gray-500 text-center mt-1 uppercase tracking-wider">
                                    Available Once Per Week
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setStep('waitlist')}
                                    className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Zap size={18} />
                                    Join Waitlist (+100 Credits)
                                </button>
                                <button
                                    onClick={() => setStep('feedback')}
                                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <MessageSquare size={18} />
                                    Give Feedback (+100 Credits)
                                </button>
                            </div>

                            {/* <button onClick={onClose} className="w-full py-2 text-xs text-gray-600 hover:text-gray-400">
                                No thanks, I'll wait until next week.
                            </button> */}
                        </div>
                    )}

                    {step === 'waitlist' && (
                        <div className="space-y-4">
                            <div className="w-full h-[402px] bg-white rounded-lg overflow-hidden">
                                <iframe
                                    src="https://api.leadconnectorhq.com/widget/form/TamJgoupQcBpzDJrqBrk"
                                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '3px' }}
                                    id="inline-TamJgoupQcBpzDJrqBrk"
                                    data-layout="{'id':'INLINE'}"
                                    data-trigger-type="alwaysShow"
                                    data-trigger-value=""
                                    data-activation-type="alwaysActivated"
                                    data-activation-value=""
                                    data-deactivation-type="neverDeactivate"
                                    data-deactivation-value=""
                                    data-form-name="Waitlist-2"
                                    data-height="402"
                                    data-layout-iframe-id="inline-TamJgoupQcBpzDJrqBrk"
                                    data-form-id="TamJgoupQcBpzDJrqBrk"
                                    title="Waitlist-2"
                                />
                            </div>

                            <button
                                onClick={handleWaitlistClaim}
                                disabled={isRefilling}
                                className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all mt-2 flex items-center justify-center gap-2"
                            >
                                {isRefilling ? (
                                    <span className="animate-pulse">Refilling Tank...</span>
                                ) : (
                                    <>
                                        <Zap size={18} className="fill-current" />
                                        I've Joined! (Claim Credits)
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('intro')}
                                className="w-full py-2 text-xs text-gray-500 hover:text-gray-300"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {step === 'feedback' && (
                        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">1. What are you trying to build/do?</label>
                                <input
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-brand-500 outline-none transition-colors"
                                    placeholder="e.g. A landing page generator..."
                                    value={feedback.goal}
                                    onChange={e => setFeedback({ ...feedback, goal: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">2. What role best describes you?</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                                    value={feedback.role}
                                    onChange={e => setFeedback({ ...feedback, role: e.target.value })}
                                >
                                    <option value="" disabled>Select one...</option>
                                    <option value="founder">Founder / Builder</option>
                                    <option value="developer">Developer</option>
                                    <option value="marketer">Marketer</option>
                                    <option value="student">Student</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">3. Any bugs or friction so far?</label>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-brand-500 outline-none transition-colors h-20 resize-none"
                                    placeholder="Be honest, it helps us improve!"
                                    value={feedback.friction}
                                    onChange={e => setFeedback({ ...feedback, friction: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isRefilling || !feedback.goal || !feedback.role}
                                className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all mt-2 flex items-center justify-center gap-2"
                            >
                                {isRefilling ? (
                                    <span className="animate-pulse">Refilling Tank...</span>
                                ) : (
                                    <>
                                        <Zap size={18} className="fill-current" />
                                        Refill 100 Credits
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('intro')}
                                className="w-full py-2 text-xs text-gray-500 hover:text-gray-300"
                            >
                                Back
                            </button>
                        </form>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-6 animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={40} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Tank Refilled!</h3>
                            <p className="text-gray-400">100 credits have been added. See you next week!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
