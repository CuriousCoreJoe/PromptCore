
import React, { useEffect, useRef, useState } from 'react';
import { Check, Zap, Coins, Shield, Star, Rocket } from 'lucide-react';

interface UpgradePageProps {
  focusSection?: 'subscriptions' | 'credits';
}

export const UpgradePage: React.FC<UpgradePageProps> = ({ focusSection }) => {
  const subsRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const [highlightCredits, setHighlightCredits] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure the component is fully mounted/rendered before scrolling
    const scrollTimer = setTimeout(() => {
      if (focusSection === 'credits' && creditsRef.current) {
          // Scroll to credits
          creditsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Trigger glow animation
          setHighlightCredits(true);
          const glowTimer = setTimeout(() => {
              setHighlightCredits(false);
          }, 2500);
          
          return () => clearTimeout(glowTimer);
      } else if (focusSection === 'subscriptions' && subsRef.current) {
          subsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setHighlightCredits(false);
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [focusSection]);

  return (
    <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto scroll-smooth">
      <div className="max-w-6xl mx-auto w-full space-y-12 pb-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white tracking-tight">Unlock Full Potential</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Scale your workflow with plans designed for everyday users, creators, and powerhouses.
          </p>
        </div>

        {/* Subscriptions Section */}
        <div ref={subsRef} className="scroll-mt-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="text-brand-500" /> Subscription Plans
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Tier 1: Free (Starter) */}
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 flex flex-col hover:border-dark-700 transition-colors">
              <div className="mb-4">
                <span className="bg-dark-800 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  Basic
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white">Starter</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="ml-1 text-xl text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-gray-400 text-sm">Essential tools for hobbyists.</p>
              
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="50 Everyday Chat messages/day" />
                <FeatureItem text="Basic Code Refinement" />
                <FeatureItem text="1 Active Knowledge Source" />
                <FeatureItem text="Community Support" />
              </ul>

              <button className="mt-8 w-full py-3 px-4 bg-dark-800 text-gray-400 font-semibold rounded-lg cursor-default border border-dark-700">
                Current Plan
              </button>
            </div>

            {/* Tier 2: $10 (Creator Pro) - Generous Limits */}
            <div className="bg-dark-900 border border-brand-900/40 rounded-2xl p-6 flex flex-col hover:border-brand-500/30 transition-colors relative overflow-hidden">
               <div className="mb-4">
                <span className="bg-brand-900/20 text-brand-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  Pro
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white">Creator</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$10</span>
                <span className="ml-1 text-xl text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-gray-400 text-sm">More power for serious creators.</p>
              
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="1,000 Fast Chats / day" highlighted />
                <FeatureItem text="20 Active Knowledge Sources" highlighted />
                <FeatureItem text="Advanced Code Refinement" />
                <FeatureItem text="Priority Flash Model Access" />
                <FeatureItem text="2,000 Monthly Bonus Credits" />
              </ul>

              <button className="mt-8 w-full py-3 px-4 bg-dark-800 hover:bg-dark-700 text-white border border-dark-600 font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                Upgrade to Creator
              </button>
            </div>

            {/* Tier 3: $20 (Ultimate) - Unlimited */}
            <div className="relative bg-dark-900 border-2 border-brand-500 rounded-2xl p-6 flex flex-col shadow-2xl shadow-brand-900/20 transform md:-translate-y-2">
              <div className="absolute top-0 right-0 -mt-3 -mr-3">
                <span className="bg-brand-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Unlimited
                </span>
              </div>
              <div className="mb-4">
                <span className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm">
                  Ultimate
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white">Powerhouse</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$20</span>
                <span className="ml-1 text-xl text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-gray-400 text-sm">No limits. Maximum performance.</p>
              
              <ul className="mt-8 space-y-4 flex-1">
                <FeatureItem text="Unlimited Everything" highlighted />
                <FeatureItem text="Priority Gemini 3 Pro Access" highlighted />
                <FeatureItem text="Unlimited Knowledge Base" highlighted />
                <FeatureItem text="5,000 Monthly Bonus Credits" highlighted />
                <FeatureItem text="Early Access to Mobile App" />
              </ul>

              <button className="mt-8 w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-brand-900/50 flex items-center justify-center gap-2">
                <Rocket size={18} /> Go Ultimate
              </button>
            </div>

          </div>
        </div>

        {/* Token Packs Section - Wrapped for Highlight Effect */}
        <div className="pt-8 border-t border-dark-800">
            <div 
                ref={creditsRef} 
                className={`scroll-mt-6 rounded-2xl p-6 transition-all duration-1000 ease-out ${
                    highlightCredits 
                    ? 'ring-2 ring-brand-500 shadow-[0_0_40px_rgba(14,165,233,0.3)] bg-brand-900/10' 
                    : 'ring-0 bg-transparent'
                }`}
            >
               <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Coins className="text-yellow-500" /> Credit Packs
              </h2>
              <p className="text-gray-400 mb-6 max-w-3xl">
                Credits are used for the <strong>Prompt Factory</strong> (Bulk Generation) and High-Res Media generation.
                They never expire and are separate from subscription limits.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <PackCard 
                  amount={500} 
                  price={5} 
                  label="Starter Pack" 
                  perCredit="1¢ / credit"
                />
                <PackCard 
                  amount={1500} 
                  price={12} 
                  label="Creator Pack" 
                  perCredit="0.8¢ / credit"
                  highlighted
                />
                <PackCard 
                  amount={5000} 
                  price={35} 
                  label="Agency Pack" 
                  perCredit="0.7¢ / credit"
                />
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ text: string; highlighted?: boolean }> = ({ text, highlighted }) => (
  <li className="flex items-start">
    <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${highlighted ? 'bg-brand-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
      <Check size={12} />
    </div>
    <span className={`ml-3 text-sm ${highlighted ? 'text-white font-medium' : 'text-gray-300'}`}>{text}</span>
  </li>
);

const PackCard: React.FC<{ amount: number; price: number; label: string; perCredit: string; highlighted?: boolean }> = ({ amount, price, label, perCredit, highlighted }) => (
  <div className={`bg-dark-900 border rounded-xl p-6 flex flex-col items-center text-center transition-all hover:scale-105 ${highlighted ? 'border-yellow-500/50 shadow-xl shadow-yellow-900/10' : 'border-dark-800'}`}>
    {highlighted && (
        <div className="mb-2">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
        </div>
    )}
    <h4 className="text-lg font-medium text-gray-200">{label}</h4>
    <div className="mt-2 text-3xl font-bold text-white flex items-center gap-1">
        <Coins size={24} className={highlighted ? "text-yellow-500" : "text-gray-600"} />
        {amount}
    </div>
    <div className="mt-4 mb-6">
        <span className="text-2xl font-bold text-white">${price}</span>
        <div className="text-xs text-gray-500">{perCredit}</div>
    </div>
    <button className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
        highlighted 
        ? 'bg-white text-dark-950 hover:bg-gray-100' 
        : 'bg-dark-800 text-white hover:bg-dark-700 border border-dark-700'
    }`}>
        Buy Pack
    </button>
  </div>
);
