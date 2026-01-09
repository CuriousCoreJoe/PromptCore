import React, { useEffect, useRef, useState } from 'react';
import { Check, Zap, Coins, Shield, Star, Rocket, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UpgradePageProps {
  initialFocus?: 'subscriptions' | 'credits';
  onBack?: () => void;
  userId?: string;
  credits?: number;
}

export const UpgradePage: React.FC<UpgradePageProps> = ({ initialFocus, onBack, userId, credits }) => {
  const subsRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const [highlightCredits, setHighlightCredits] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      if (initialFocus === 'credits' && creditsRef.current) {
        creditsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightCredits(true);
        const glowTimer = setTimeout(() => setHighlightCredits(false), 2500);
        return () => clearTimeout(glowTimer);
      } else if (initialFocus === 'subscriptions' && subsRef.current) {
        subsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightCredits(false);
      }
    }, 100);
    return () => clearTimeout(scrollTimer);
  }, [initialFocus]);

  const handleCheckout = async (priceId: string, type: 'subscription' | 'credits') => {
    try {
      setLoadingPriceId(priceId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return alert("Please sign in to continue.");

      const response = await fetch(`/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, userId: session.user.id, type })
      });

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Failed to initiate checkout.");
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto scroll-smooth">
      <div className="max-w-6xl mx-auto w-full space-y-12 pb-12 relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute -top-4 left-0 p-2 text-gray-500 hover:text-white transition-colors"
          >
            ← Back to Chat
          </button>
        )}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white tracking-tight">Unlock Full Potential</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Scale your workflow with plans designed for everyday users, creators, and powerhouses.
          </p>
        </div>

        <div ref={subsRef} className="scroll-mt-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="text-brand-500" /> Subscription Plans
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 flex flex-col hover:border-dark-700 transition-colors">
              <div className="mb-4">
                <span className="bg-dark-800 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Standard Rate</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Starter</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="ml-1 text-xl text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-gray-400 text-sm">Get started with core features. Perfect for trying out PromptCore.</p>
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="50 Monthly Credits (Renews)" />
                <FeatureItem text="Unlimited Prompt Factory Access" highlighted />
                <FeatureItem text="Everyday & Media Gen Modes" />
                <FeatureItem text="⚠️ Standard Rate: 3x cost after 100 credits/month" />
                <FeatureItem text="Community Support" />
              </ul>
              <button className="mt-8 w-full py-3 px-4 bg-dark-800 text-gray-400 font-semibold rounded-lg cursor-default border border-dark-700">
                Current Plan
              </button>
            </div>

            <div className="bg-dark-900 border border-brand-900/40 rounded-2xl p-6 flex flex-col hover:border-brand-500/30 transition-colors relative overflow-hidden">
              <div className="mb-4">
                <span className="bg-brand-900/20 text-brand-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Preferred Rate</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Creator</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$8.99</span>
                <span className="ml-1 text-xl text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-gray-400 text-sm">Unlock powerful features and eliminate the usage tax.</p>
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="1,000 Monthly Credits (Renews)" highlighted />
                <FeatureItem text="✨ Preferred Rate: No 3x penalty" highlighted />
                <FeatureItem text="Unlock Vibe Code / App Builder" highlighted />
                <FeatureItem text="Unlock Talk to Source (RAG)" highlighted />
                <FeatureItem text="Save Workspace History" />
                <FeatureItem text="All Modes Unlocked" />
              </ul>
              <button
                onClick={() => handleCheckout('price_creator_sub', 'subscription')}
                disabled={loadingPriceId === 'price_creator_sub'}
                className="mt-8 w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loadingPriceId === 'price_creator_sub' ? <Loader2 className="animate-spin" /> : 'Upgrade to Creator'}
              </button>
            </div>

            <div className="relative bg-dark-900 border-2 border-brand-500 rounded-2xl p-6 flex flex-col shadow-2xl shadow-brand-900/20 transform md:-translate-y-2">
              <div className="absolute top-0 right-0 -mt-3 -mr-3">
                <span className="bg-brand-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Best Value
                </span>
              </div>
              <div className="mb-4">
                <span className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm">
                  Pro
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white">Pro</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$14.99</span>
                <span className="ml-1 text-xl text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-gray-400 text-sm">For power users building at scale.</p>
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="2,500 Monthly Credits (Renews)" highlighted />
                <FeatureItem text="✨ Preferred Rate: No usage penalties" highlighted />
                <FeatureItem text="Mass App Prototyping (30cr/app)" highlighted />
                <FeatureItem text="Priority Support" highlighted />
                <FeatureItem text="Early Access to New Models" />
                <FeatureItem text="Everything Included" />
              </ul>
              <button
                onClick={() => handleCheckout('price_powerhouse_sub', 'subscription')}
                disabled={loadingPriceId === 'price_powerhouse_sub'}
                className="mt-8 w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-brand-900/50 flex items-center justify-center gap-2"
              >
                {loadingPriceId === 'price_powerhouse_sub' ? <Loader2 className="animate-spin" /> : <><Rocket size={18} /> GO PRO</>}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-dark-800">
          <div ref={creditsRef} className={`scroll-mt-6 rounded-2xl p-6 transition-all duration-1000 ease-out ${highlightCredits ? 'ring-2 ring-brand-500 bg-brand-900/10' : ''}`}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Coins className="text-yellow-500" /> Credit Top-Up Packs</h2>
            <p className="text-gray-400 mb-6 max-w-3xl">
              Need more credits? Top-up packs never expire and work with any subscription tier.
              <strong className="text-brand-400"> Note:</strong> Free users pay Standard Rate (3x) after 100 credits/month.
              Subscribe to Creator to get Preferred Rates and make your credits last longer!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <PackCard amount={500} price={5} label="Starter Pack" priceId="price_starter_pack" onBuy={() => handleCheckout('price_starter_pack', 'credits')} loading={loadingPriceId === 'price_starter_pack'} />
              <PackCard amount={1500} price={12} label="Creator Pack" priceId="price_creator_pack" highlighted onBuy={() => handleCheckout('price_creator_pack', 'credits')} loading={loadingPriceId === 'price_creator_pack'} />
              <PackCard amount={5000} price={35} label="Agency Pack" priceId="price_agency_pack" onBuy={() => handleCheckout('price_agency_pack', 'credits')} loading={loadingPriceId === 'price_agency_pack'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ text: string; highlighted?: boolean }> = ({ text, highlighted }) => (
  <li className="flex items-start">
    <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${highlighted ? 'bg-brand-500 text-white' : 'bg-dark-700 text-gray-400'}`}><Check size={12} /></div>
    <span className={`ml-3 text-sm ${highlighted ? 'text-white font-medium' : 'text-gray-300'}`}>{text}</span>
  </li>
);

const PackCard: React.FC<{ amount: number; price: number; label: string; priceId: string; onBuy: () => void; loading: boolean; highlighted?: boolean }> = ({ amount, price, label, priceId, onBuy, loading, highlighted }) => (
  <div className={`bg-dark-900 border rounded-xl p-6 flex flex-col items-center text-center transition-all hover:scale-105 ${highlighted ? 'border-yellow-500/50 shadow-xl' : 'border-dark-800'}`}>
    {highlighted && <div className="mb-2"><Star size={16} className="text-yellow-500 fill-yellow-500" /></div>}
    <h4 className="text-lg font-medium text-gray-200">{label}</h4>
    <div className="mt-2 text-3xl font-bold text-white flex items-center gap-1"><Coins size={24} className={highlighted ? "text-yellow-500" : "text-gray-600"} />{amount}</div>
    <div className="mt-4 mb-6"><span className="text-2xl font-bold text-white">${price}</span></div>
    <button
      onClick={onBuy}
      disabled={loading}
      className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center ${highlighted ? 'bg-white text-dark-950 hover:bg-gray-100' : 'bg-dark-800 text-white hover:bg-dark-700 border border-dark-700'}`}
    >
      {loading ? <Loader2 className="animate-spin" /> : 'Buy Pack'}
    </button>
  </div>
);