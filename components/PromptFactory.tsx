import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, Play, CheckCircle, Loader2, Copy, Download, Star, Info, AlertCircle, 
  History, FileText, FileSpreadsheet, ChevronDown, ChevronUp, HelpCircle, Plus, Minus, X,
  Check
} from 'lucide-react';
import { FactoryBatch, BatchItem } from '../types';
import { supabase } from '../lib/supabase';
import { CREDIT_COSTS } from '../config/pricing';
import { BatchList } from './BatchList';

interface PromptFactoryProps {
  credits?: number;
  defaultExpandBatches?: boolean;
}

export const PromptFactory: React.FC<PromptFactoryProps> = ({ credits, defaultExpandBatches = false }) => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);
  const [currentPackId, setCurrentPackId] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');
  
  // New State
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  
  const promptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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
    setShowHistory(false); // Ensure we are in factory mode

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please login first");
        setIsProcessing(false);
        return;
      }

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

  // Copy & Export Handlers
  const handleCopyAll = (items: BatchItem[]) => {
    const text = items.map(item => 
      `### ${item.title}\n**Difficulty:** ${item.difficulty}\n**Prompt:**\n${item.prompt_content}`
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    alert('All prompts copied to clipboard!');
  };

  const handleCopySingle = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = (items: BatchItem[], filename: string) => {
    const headers = ['Title', 'Difficulty', 'Style', 'Description', 'Prompt'];
    const rows = items.map(item => [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.difficulty}"`,
      `"${item.style_var}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.prompt_content.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTXT = (items: BatchItem[], filename: string) => {
    const text = items.map(item => 
      `Title: ${item.title}\nDifficulty: ${item.difficulty}\nStyle: ${item.style_var}\nDescription: ${item.description}\n\nPrompt:\n${item.prompt_content}\n\n========================================\n`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cost Calculation
  const estimatedCost = Math.ceil(count / 5) * CREDIT_COSTS.promptFactoryBatch;

  const renderPromptCard = (item: BatchItem) => (
    <div 
      key={item.id} 
      ref={el => { if (el) promptRefs.current[item.id] = el; }}
      className={`bg-dark-950 border rounded-xl overflow-hidden transition-all group animate-in fade-in slide-in-from-bottom-4 duration-500 ${
        selectedPromptId === item.id 
          ? 'border-brand-500 shadow-lg shadow-brand-900/20' 
          : 'border-dark-700/50 hover:border-white'
      }`}
      onClick={() => setSelectedPromptId(item.id)}
    >
      <div className="p-4 border-b border-dark-800/50 flex justify-between items-start bg-dark-900/30">
        <div>
          <h4 className={`font-bold text-lg transition-colors ${selectedPromptId === item.id ? 'text-brand-400' : 'text-white group-hover:text-brand-400'}`}>
            {item.title}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              item.difficulty === 'Advanced' ? 'bg-red-900/30 text-red-400' :
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
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleCopySingle(item.prompt_content, item.id);
          }}
          className={`p-2 rounded transition-colors ${
            copiedId === item.id 
              ? 'text-green-400 bg-green-900/20' 
              : 'text-gray-500 hover:text-white hover:bg-dark-800'
          }`}
          title="Copy Prompt"
        >
          {copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-400 italic border-l-2 border-dark-700 pl-3">
          "{item.description}"
        </p>
        
        <div className="relative">
          <div className="absolute top-0 left-0 px-2 py-1 bg-dark-800 rounded-br text-[10px] text-gray-500 font-mono uppercase">Prompt</div>
          <div className="bg-dark-900 p-4 pt-8 rounded-lg border border-dark-800 font-mono text-sm text-brand-100 whitespace-pre-wrap leading-relaxed">
            {item.prompt_content}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8 border-b border-dark-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="text-brand-500" />
            Consumer Factory
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl text-sm md:text-base">
            Build high-value prompt curriculums.
          </p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showHistory 
              ? 'bg-brand-900/20 border-brand-500 text-brand-400' 
              : 'bg-dark-900 border-dark-700 text-gray-300 hover:bg-dark-800'
          }`}
        >
          <History size={18} />
          {showHistory ? 'Back to Factory' : 'History'}
        </button>
      </div>

      {showHistory && userId ? (
        <BatchList userId={userId} defaultExpandBatches={defaultExpandBatches} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Factory Setup</h2>
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-gray-500 hover:text-brand-400 transition-colors"
                >
                  <HelpCircle size={18} />
                </button>
              </div>

              {showHelp && (
                <div className="mb-6 bg-dark-950/50 border border-dark-800 rounded-lg p-4 text-sm text-gray-400 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-300 mb-1">How to use</h4>
                    <button onClick={() => setShowHelp(false)}><X size={14} /></button>
                  </div>
                  <p>1. Enter a niche topic (e.g., "Email Marketing").</p>
                  <p>2. Select the number of prompts to generate.</p>
                  <p>3. Click "Generate Pack" to start.</p>
                  <p>4. Use the Copy/Export buttons to save your prompts.</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Target Niche</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Wedding Planning, Python Basics"
                    className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Pack Size</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setCount(Math.max(5, count - 5))}
                      className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg border border-dark-700 text-gray-300 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min="5"
                        max="200"
                        step="5"
                        value={count}
                        onChange={(e) => setCount(Math.min(200, Math.max(5, Number(e.target.value))))}
                        className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-2 text-center text-white font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setCount(Math.min(200, count + 5))}
                      className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg border border-dark-700 text-gray-300 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>Min: 5</span>
                    <span>Max: 200</span>
                    <span className="text-gray-400">prompts</span>
                  </div>
                </div>

                <div className="bg-dark-950 p-3 rounded border border-dark-800 text-xs flex justify-between items-center">
                  <span className="text-gray-400">Estimated Cost:</span>
                  <span className="text-white font-mono flex items-center gap-1">
                    {estimatedCost} Credits
                    <Info size={12} className="text-gray-500" />
                  </span>
                </div>
              </div>

              <button
                onClick={handleStartFactory}
                disabled={isProcessing || !topic.trim()}
                className={`w-full mt-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${isProcessing || !topic.trim()
                  ? 'bg-dark-800 text-gray-500 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40'
                  }`}
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                {isProcessing ? 'Processing...' : 'Generate Pack'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col h-[600px] lg:h-auto bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-dark-800 bg-dark-950/50 gap-4">
              <div>
                <h2 className="font-semibold text-white">Pack Preview</h2>
                {(generatedItems.length > 0 || isProcessing) && (
                  <div className="text-xs text-brand-400 font-mono mt-1">
                    {isProcessing ? `Generating... (${generatedItems.length}/${count})` : `${generatedItems.length} Prompts Generated`}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => handleCopyAll(generatedItems)}
                  disabled={generatedItems.length === 0}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-800 hover:bg-dark-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy size={14} /> Copy All
                </button>
                <button 
                  onClick={() => handleExportCSV(generatedItems, `prompts-${topic.replace(/\s+/g, '-')}`)}
                  disabled={generatedItems.length === 0}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-800 hover:bg-dark-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet size={14} /> CSV
                </button>
                <button 
                  onClick={() => handleExportTXT(generatedItems, `prompts-${topic.replace(/\s+/g, '-')}`)}
                  disabled={generatedItems.length === 0}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-800 hover:bg-dark-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText size={14} /> TXT
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {generatedItems.length === 0 && !isProcessing && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center">
                  <Layers size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">Production Line Idle</p>
                  <p className="text-sm max-w-md">Configure your consumer niche on the left to begin generating high-quality prompt batches.</p>
                </div>
              )}

              {generatedItems.map((item, idx) => renderPromptCard(item))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
