import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async'; // <--- NEW IMPORT
import { MessageSquare, Sparkles, Cpu, Code2, LayoutGrid, Hammer, FileSearch, ScanText, Check, ArrowRight, PlayCircle } from 'lucide-react';
import { LogoTypefaceWhite } from './icons/LogoTypefaceWhite';
import { BrandIcon } from './icons/BrandIcon';

// --- Sub-components (FeatureCard, PricingCard) remain exactly the same as before ---
// (I am omitting them here to save space, but keep your existing FeatureCard and PricingCard code!)
// ... [Paste your existing FeatureCard and PricingCard components here] ...

const FeatureCard = ({ title, subtitle, desc, cost, icon: Icon, subIcon: SubIcon, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        viewport={{ once: true }}
        className={`relative rounded-xl p-8 border border-slate-800/50 bg-gradient-to-br from-slate-900 to-[#020617] overflow-hidden group hover:border-${color}-500/50 transition-colors duration-300`}
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${color}-500`}>
            <Icon size={96} />
        </div>
        <div className={`w-12 h-12 rounded-lg bg-${color}-500/10 flex items-center justify-center text-${color}-400 mb-6 border border-${color}-500/20`}>
            <SubIcon size={24} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-4 italic">{subtitle}</p>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">{desc}</p>
        <div className={`flex items-center gap-2 text-${color}-500 text-sm font-bold`}>
            <span>{cost}</span>
            <ArrowRight size={12} />
        </div>
    </motion.div>
);

const PricingCard = ({ tier, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            className={`rounded-xl bg-slate-900 border-2 ${tier.borderColor} p-8 hover:shadow-2xl ${tier.glowColor} transition-all duration-300 relative ${tier.highlight ? 'scale-105 z-10' : ''}`}
        >
            {tier.highlight && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-violet-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        Best Value
                    </span>
                </div>
            )}
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">{tier.name}</h3>
                <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-400 ml-1">/mo</span>
                </div>
                <p className={`font-semibold mb-2 ${tier.accentColor}`}>{tier.credits}</p>
                <p className="text-slate-300 text-sm">{tier.description}</p>
            </div>
            <ul className="space-y-3 mb-8">
                {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <Check size={20} className="text-cyan-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            <button className={`w-full font-semibold py-4 text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg text-white ${tier.buttonColor}`}>
                {tier.cta}
            </button>
        </motion.div>
    );
};

// --- Main Page Component ---

export default function LandingPage() {
    const [activeMode, setActiveMode] = useState('everyday');
    const [email, setEmail] = useState('');
    const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const navigate = useNavigate();

    // Auto-redirect if already logged in
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/app');
            }
        });
    }, [navigate]);

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setWaitlistStatus('loading');
        try {
            const res = await fetch('/.netlify/functions/handle-waitlist', {
                method: 'POST',
                body: JSON.stringify({ email, source: 'landing_hero' }),
            });
            if (res.ok) {
                setWaitlistStatus('success');
                setEmail('');
            } else {
                throw new Error('Failed');
            }
        } catch (err) {
            setWaitlistStatus('error');
        }
    };

    const getAppUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '/app';
        }
        return 'https://app.usepromptorigin.com';
    };

    useEffect(() => {
        const modes = ['everyday', 'vibe', 'factory', 'source'];
        const interval = setInterval(() => {
            setActiveMode(prev => {
                const currentIndex = modes.indexOf(prev);
                return modes[(currentIndex + 1) % modes.length];
            });
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // ... [Keep your existing pricingTiers array exactly as it is] ...
    const pricingTiers = [
        {
            name: "Starter",
            price: "$0",
            credits: "50 Credits/mo",
            description: "Perfect for your first Spec.",
            features: ["Basic Prompt Refinement", "50 Credits Monthly", "Community Support"],
            cta: "Get Started",
            borderColor: "border-slate-700",
            accentColor: "text-slate-200",
            buttonColor: "bg-slate-800 hover:bg-slate-700",
            highlight: false,
            glowColor: ""
        },
        {
            name: "Creator",
            price: "$8.99",
            credits: "1,000 Credits",
            description: "Unlock Vibe Coding & Spec Export.",
            features: ["Everything in Free", "Vibe Coding Access", "Spec Export", "Priority Support"],
            cta: "Choose Plan",
            borderColor: "border-cyan-500",
            accentColor: "text-cyan-400",
            buttonColor: "bg-cyan-500 hover:bg-cyan-600",
            highlight: false,
            glowColor: "shadow-cyan-500/30"
        },
        {
            name: "Pro",
            price: "$14.99",
            credits: "2,500 Credits",
            description: "Priority Factory Access + Team Specs.",
            features: ["Everything in Lite", "Priority Factory Access", "Team Collaboration", "Advanced Analytics", "Dedicated Support"],
            cta: "Choose Plan",
            borderColor: "border-violet-500",
            accentColor: "text-cyan-400",
            buttonColor: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
            highlight: true,
            glowColor: "shadow-violet-500/50"
        }
    ];

    return (
        <div className="dark min-h-screen bg-[#020617] text-slate-200 font-sans overflow-x-hidden selection:bg-cyan-500/30">

            {/* --- METADATA SECTION START --- */}
            <Helmet>
                <title>Prompt Origin | Don't just chat. Start at the Origin.</title>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <meta name="description" content="The staging ground for your best ideas. Refine prompts, build specs for Cursor, and generate assets before you open ChatGPT." />

                {/* Facebook / Discord / LinkedIn */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://usepromptorigin.com/" />
                <meta property="og:title" content="Prompt Origin | Vibe Coding & Prompt Management" />
                <meta property="og:description" content="Stop staring at a blinking cursor. Generate Specs, refine prompts, and manage your AI workflow." />
                <meta property="og:image" content="https://usepromptorigin.com/og-image.jpg" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://usepromptorigin.com/" />
                <meta property="twitter:title" content="Prompt Origin | Vibe Coding & Prompt Management" />
                <meta property="twitter:description" content="Stop staring at a blinking cursor. Generate Specs, refine prompts, and manage your AI workflow." />
                <meta property="twitter:image" content="https://usepromptorigin.com/og-image.jpg" />
            </Helmet>
            {/* --- METADATA SECTION END --- */}

            {/* Background Grid */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-15" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            {/* Navigation */}
            <nav className="fixed w-full z-50 top-0 border-b border-white/[0.03] bg-[#020617]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LogoTypefaceWhite className="h-6 w-auto" />
                    </div>
                    <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                    </div>
                    <div className="flex gap-4">
                        <a href={getAppUrl()} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Login</a>
                        <a href={getAppUrl()} className="text-sm font-medium bg-white text-slate-950 px-4 py-2 rounded hover:bg-slate-200 transition-colors">Get Started</a>
                    </div>
                </div>
            </nav>

            {/* ... [Rest of your main content remains unchanged] ... */}
            <main className="relative z-10">
                {/* Hero Section */}
                <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8"
                        >
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
                                Don't just chat. <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Start at the Origin.</span>
                            </h1>
                            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                                The staging ground for your best ideas. Refine prompts, build specs, and generate assets before you open ChatGPT.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-4">
                                <a href={getAppUrl()} className="group relative px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300 overflow-hidden">
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                    <span className="relative">Start Refinement (Free)</span>
                                </a>
                                <button className="px-6 py-3 border border-slate-700 text-slate-300 font-medium rounded hover:border-slate-500 hover:text-white transition-all flex items-center gap-2">
                                    <PlayCircle size={16} />
                                    <span>Watch Workflow</span>
                                </button>
                            </div>

                            {/* Waitlist Form */}
                            <div className="mt-8 pt-8 border-t border-slate-800/30">
                                <p className="text-sm text-slate-400 mb-4">Join the waitlist for early access updates.</p>
                                <form onSubmit={handleWaitlistSubmit} className="flex gap-2 max-w-md">
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={waitlistStatus === 'loading' || waitlistStatus === 'success'}
                                        className={`px-6 py-2 rounded font-medium transition-all ${waitlistStatus === 'success'
                                            ? 'bg-green-500 text-white cursor-default'
                                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {waitlistStatus === 'loading' ? 'Joining...' : waitlistStatus === 'success' ? 'Joined!' : 'Join'}
                                    </button>
                                </form>
                                {waitlistStatus === 'error' && <p className="text-red-400 text-xs mt-2">Something went wrong. Please try again.</p>}
                            </div>
                        </motion.div>

                        {/* Interactive Mockup (Simplified for React) */}
                        <div className="relative perspective-1000">
                            <div className="absolute -top-20 -right-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none"></div>

                            <div className={`glass-panel rounded-2xl w-full border border-white/[0.1] bg-slate-900/50 backdrop-blur-xl overflow-hidden transition-all duration-500 border-${activeMode === 'vibe' ? 'purple-500/50' : 'white/10'}`}>
                                {/* Mockup Header */}
                                <div className="h-10 border-b border-white/[0.05] flex items-center justify-between px-4 bg-slate-950/50">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">promptorigin.app</div>
                                </div>
                                {/* Mode Toggles */}
                                <div className="h-14 flex items-center justify-center border-b border-white/[0.05] bg-slate-950">
                                    <div className="flex bg-slate-900 rounded-full p-1 border border-white/[0.05]">
                                        {['everyday', 'vibe', 'factory', 'source'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setActiveMode(mode)}
                                                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all capitalize ${activeMode === mode ? 'text-white bg-white/10' : 'text-slate-400'}`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Mockup Body Content - Just displaying current mode for simplicity */}
                                <div className="h-[300px] p-6 flex items-center justify-center text-slate-500 text-sm">
                                    {activeMode === 'everyday' && <div className="text-center"><Sparkles className="mx-auto mb-2 text-cyan-500" />Everyday Mode Active</div>}
                                    {activeMode === 'vibe' && <div className="text-center"><Cpu className="mx-auto mb-2 text-purple-500" />Vibe Coding Active</div>}
                                    {activeMode === 'factory' && <div className="text-center"><LayoutGrid className="mx-auto mb-2 text-orange-500" />Factory Mode Active</div>}
                                    {activeMode === 'source' && <div className="text-center"><FileSearch className="mx-auto mb-2 text-teal-500" />Source Mode Active</div>}
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Operational Modes</h2>
                        <p className="text-slate-500">Distinct lenses for distinct workflows.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FeatureCard
                            title="Everyday Mode"
                            subtitle='"Apple Notes" simplicity'
                            desc='Turn vague thoughts into polished communication assets. Use "Refiner Buttons" instead of chat.'
                            cost="1 Credit"
                            color="cyan"
                            icon={MessageSquare}
                            subIcon={Sparkles}
                            delay={0}
                        />
                        <FeatureCard
                            title="Vibe Coding"
                            subtitle='"Matrix" aesthetic for Devs'
                            desc='Create the Spec that prevents AI hallucinations. Generate Wireframes and export PRDs for Cursor.'
                            cost="10-30 Credits"
                            color="purple"
                            icon={Cpu}
                            subIcon={Code2}
                            delay={0.1}
                        />
                        <FeatureCard
                            title="Factory Mode"
                            subtitle='Batch Generator'
                            desc='Volume is key. Generate 50 blog titles or build "Prompt Packs" in seconds.'
                            cost="5 Credits/Batch"
                            color="orange"
                            icon={LayoutGrid}
                            subIcon={Hammer}
                            delay={0.2}
                        />
                        <FeatureCard
                            title="Source Mode"
                            subtitle='Deep Research'
                            desc='Ingest large context (PDFs, YouTube). Extract action items and find contradictions.'
                            cost="Variable"
                            color="teal"
                            icon={FileSearch}
                            subIcon={ScanText}
                            delay={0.3}
                        />
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 px-6 bg-slate-900/50 border-t border-white/[0.05]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                                Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">Origin</span>
                            </h2>
                            <p className="text-xl text-slate-400">Start free, scale as you grow</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                            {pricingTiers.map((tier, index) => (
                                <PricingCard key={index} tier={tier} index={index} />
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/[0.05] bg-[#020617] py-12 text-center text-slate-600 text-sm">
                © 2026 Prompt Origin. Built by CuriousCore.
            </footer>
        </div>
    );
}