import React, { useState, useEffect } from 'react';
console.log("🚀 PromptCore Frontend Version: 1.0.4 - NUCLEAR FETCH (Factory)");
console.log("🔗 Supabase URL Configured:", import.meta.env.VITE_SUPABASE_URL ? "YES" : "NO");
console.log("🔑 Supabase KEY Configured:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "YES (Masked)" : "NO - CRITICAL ERROR");
import { Layers, Play, CheckCircle, Loader2, Copy, Download, Star, Info, AlertCircle } from 'lucide-react';
import { FactoryBatch, BatchItem } from '../types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (handling potentially missing env vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export const PromptFactory: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);
  const [currentPackId, setCurrentPackId] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');

  // Realtime Subscription & Polling Fallback
  useEffect(() => {
    if (!currentPackId || !supabase) return;

    // 1. Setup Realtime Listener
    const channel = supabase
      .channel(`pack-${currentPackId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generated_prompts',
          filter: `pack_id=eq.${currentPackId}`
        },
        (payload) => {
          // Check for duplicates before adding
          setGeneratedItems(prev => {
            if (prev.some(item => item.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'packs',
          filter: `id=eq.${currentPackId}`
        },
        (payload) => {
          if (payload.new.status === 'completed') {
            setIsProcessing(false);
            setProgressStatus('✅ Generation Complete!');
          }
        }
      )
      .subscribe();

    // 2. Setup Polling (Robustness Fallback)
    const poller = setInterval(async () => {
      if (!isProcessing) return;

      const { data } = await supabase
        .from('generated_prompts')
        .select('*')
        .eq('pack_id', currentPackId);

      if (data) {
        setGeneratedItems(data);
      }

      // Also check pack status
      const { data: packData } = await supabase
        .from('packs')
        .select('status')
        .eq('id', currentPackId)
        .single();

      if (packData?.status === 'completed') {
        setIsProcessing(false);
        setProgressStatus('✅ Generation Complete!');
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poller);
    };
  }, [currentPackId, isProcessing]);

  const handleStartFactory = async () => {
    if (!topic.trim()) return;

    setIsProcessing(true);
    setGeneratedItems([]);
    setProgressStatus('🚀 Initializing Worker...');

    try {
      // Get current user (simple check, in real app use auth context)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please login first");
        setIsProcessing(false);
        return;
      }

      // Invoke the Netlify Trigger Function
      const response = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: topic,
          count: count,
          userId: user.id
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        const errorMessage = errData.missing
          ? `Configuration Error: Missing ${errData.missing.join(", ")}`
          : (errData.error || 'Trigger error');
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setCurrentPackId(data.packId);
      setProgressStatus('⏳ Queued in Inngest...');

    } catch (err) {
      console.error(err);
      setProgressStatus('❌ Error starting generation.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 border-b border-dark-800 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Layers className="text-brand-500" />
          Consumer Factory
        </h1>
        <p className="text-gray-400 mt-2 max-w-2xl">
          Build high-value prompt curriculums. Now powered by <strong>Supabase Edge Functions</strong> & <strong>Inngest</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Factory Setup</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Target Niche</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Wedding Planning, Spanish Learning"
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                />
              </div>

              <label className="block text-sm font-medium text-gray-400 mb-1 flex justify-between">
                <span>Pack Size</span>
                <span className="text-brand-400 font-mono">{count} Prompts</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
              <div className="mt-2 text-xs text-gray-500 flex justify-between">
                <span>5 (Demo)</span>
                <span>200 (Max)</span>
              </div>
              <div className="mt-3 bg-dark-950 p-3 rounded border border-dark-800 text-xs flex justify-between items-center">
                <span className="text-gray-400">Estimated Cost:</span>
                <span className="text-white font-mono flex items-center gap-1">
                  {count <= 50 ? count : (50 + (count - 50) * 1.5)} Credits
                  <Info size={12} className="text-gray-500" />
                </span>
              </div>
            </div>

            <button
              onClick={handleStartFactory}
              disabled={isProcessing || !topic.trim()}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${isProcessing || !topic.trim()
                ? 'bg-dark-800 text-gray-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40'
                }`}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              {isProcessing ? 'Processing in Background...' : 'Generate Pack'}
            </button>
          </div>
        </div>

        {(generatedItems.length > 0 || isProcessing) && (
          <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex justify-between">
              <span>Inngest Status</span>
              <span className="text-brand-400">{generatedItems.length} / {count}</span>
            </h3>
            <div className="mt-4 pt-4 border-t border-dark-800 text-xs text-brand-300 font-mono">
              {isProcessing ? `Generating... (${generatedItems.length}/${count})` : progressStatus}
            </div>
          </div>
        )}


        <div className="lg:col-span-2 flex flex-col h-[600px] lg:h-auto bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between p-4 border-b border-dark-800 bg-dark-950/50">
            <h2 className="font-semibold text-white">Pack Preview</h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-800 hover:bg-dark-700 rounded transition-colors">
                <Copy size={14} /> Copy All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {generatedItems.length === 0 && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Layers size={48} className="mb-4 opacity-20" />
                <p>Production Line Idle.</p>
                <p className="text-sm">Configure your consumer niche to begin generating.</p>
              </div>
            )}

            {generatedItems.map((item, idx) => (
              <div key={idx} className="bg-dark-950 border border-dark-700/50 p-5 rounded-xl space-y-3 hover:border-brand-500/30 transition-all group animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white text-lg group-hover:text-brand-400 transition-colors">{item.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.difficulty === 'Advanced' ? 'bg-red-900/30 text-red-400' :
                      item.difficulty === 'Intermediate' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-green-900/30 text-green-400'
                      }`}>
                      {item.difficulty}
                    </span>
                    <span className="bg-dark-800 text-gray-400 px-2 py-0.5 rounded text-[10px] font-mono">
                      {item.style_var}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 italic">"{item.description}"</p>
                <div className="bg-dark-900 p-3 rounded-lg border border-dark-800 font-mono text-xs text-brand-300 whitespace-pre-wrap">
                  {item.prompt_content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
