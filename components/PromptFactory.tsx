import React, { useState } from 'react';
import { Layers, Play, CheckCircle, Loader2, Copy, Download, Star, Info } from 'lucide-react';
import { FactoryBatch, BatchItem } from '../types';
import { generateFactoryAngles, generateBatchItems } from '../services/geminiService';

export const PromptFactory: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [batches, setBatches] = useState<FactoryBatch[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleStartFactory = async () => {
    if (!topic.trim()) return;

    setIsProcessing(true);
    setBatches([]);
    
    try {
      // Step 1: Variable Injection Strategy (Ported Python Step 3)
      setCurrentStep('🚀 Starting PromptCore Engine: Porting Brain Logic...');
      const angles = await generateFactoryAngles(topic, count);
      
      const itemsPerBatch = Math.ceil(count / angles.length);
      const newBatches: FactoryBatch[] = angles.map((angle, index) => ({
        id: `batch-${index}`,
        status: 'pending',
        items: [],
        topic: topic,
        angle: angle
      }));

      setBatches(newBatches);

      // Step 2: Sequential Step Execution (Simulating Inngest step.run)
      for (let i = 0; i < newBatches.length; i++) {
        const batch = newBatches[i];
        
        setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: 'generating' } : b));
        setCurrentStep(`📦 Step.run: Generating Batch ${i + 1}/${newBatches.length} ("${batch.angle}")...`);

        // Generate Structured Consumer Prompts
        const items = await generateBatchItems(topic, batch.angle, itemsPerBatch);
        
        setBatches(prev => prev.map(b => b.id === batch.id ? { 
            ...b, 
            status: 'completed', 
            items: items 
        } : b));
      }

      setCurrentStep('✅ BATCH COMPLETE. Simulation saved to dashboard state.');
    } catch (err) {
      console.error(err);
      setCurrentStep('❌ Error during generation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalGenerated = batches.reduce((acc, b) => acc + b.items.length, 0);

  return (
    <div className="flex-1 h-full flex flex-col bg-dark-950 text-gray-100 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 border-b border-dark-800 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Layers className="text-brand-500" />
          Consumer Factory
        </h1>
        <p className="text-gray-400 mt-2 max-w-2xl">
          Build high-value prompt curriculums. Ported from Python "Consumer-First" architecture. 
          Uses <strong>Variable Injection</strong> (Difficulty & Style) to ensure unique, professional outputs.
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

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Pack Size</label>
                <select 
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value={5}>5 Prompts (Demo)</option>
                  <option value={10}>10 Prompts</option>
                  <option value={20}>20 Prompts (Full Pack)</option>
                </select>
              </div>

              <button
                onClick={handleStartFactory}
                disabled={isProcessing || !topic.trim()}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    isProcessing || !topic.trim() 
                    ? 'bg-dark-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40'
                }`}
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                {isProcessing ? 'Engine Processing...' : 'Generate Pack'}
              </button>
            </div>
          </div>

          {batches.length > 0 || isProcessing ? (
             <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl">
                 <h3 className="text-sm font-semibold text-gray-300 mb-3 flex justify-between">
                    <span>Production Status</span>
                    <span className="text-brand-400">{totalGenerated} / {count}</span>
                 </h3>
                 <div className="space-y-3">
                    {batches.map((batch) => (
                        <div key={batch.id} className="flex items-center text-xs">
                            <div className="w-6 flex-shrink-0">
                                {batch.status === 'completed' && <CheckCircle size={14} className="text-green-500" />}
                                {batch.status === 'generating' && <Loader2 size={14} className="text-brand-500 animate-spin" />}
                                {batch.status === 'pending' && <div className="w-3 h-3 rounded-full border border-gray-600" />}
                            </div>
                            <div className="flex-1 truncate">
                                <span className="text-gray-300 font-medium">{batch.angle}</span>
                            </div>
                            <div className="text-gray-600">
                                {batch.items.length} items
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="mt-4 pt-4 border-t border-dark-800 text-xs text-brand-300 font-mono">
                    {currentStep}
                 </div>
             </div>
          ) : null}
        </div>

        <div className="lg:col-span-2 flex flex-col h-[600px] lg:h-auto bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-dark-800 bg-dark-950/50">
                <h2 className="font-semibold text-white">Pack Preview</h2>
                <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-800 hover:bg-dark-700 rounded transition-colors">
                        <Copy size={14} /> Copy All
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-100 bg-brand-900/50 hover:bg-brand-900/80 border border-brand-800 rounded transition-colors">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {batches.length === 0 && !isProcessing && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                        <Layers size={48} className="mb-4 opacity-20" />
                        <p>Production Line Idle.</p>
                        <p className="text-sm">Configure your consumer niche to begin generating.</p>
                    </div>
                )}
                
                {batches.map((batch) => (
                    <div key={batch.id} className="space-y-4">
                        {batch.items.map((item) => (
                            <div key={item.id} className="bg-dark-950 border border-dark-700/50 p-5 rounded-xl space-y-3 hover:border-brand-500/30 transition-all group">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-white text-lg group-hover:text-brand-400 transition-colors">{item.title}</h4>
                                    <div className="flex items-center gap-2">
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
                                <p className="text-sm text-gray-400 italic">"{item.description}"</p>
                                <div className="bg-dark-900 p-3 rounded-lg border border-dark-800 font-mono text-xs text-brand-300 whitespace-pre-wrap">
                                    {item.prompt_content}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Info size={14} />
                                    <span>Tip: {item.usage_guide}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
