import React, { useState } from 'react';
import { Layers, Play, CheckCircle, Loader2, Copy, Download } from 'lucide-react';
import { FactoryBatch, BatchItem } from '../types';
import { generateFactoryAngles, generateBatchItems } from '../services/geminiService';

export const PromptFactory: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10); // Default low for demo
  const [isProcessing, setIsProcessing] = useState(false);
  const [batches, setBatches] = useState<FactoryBatch[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleStartFactory = async () => {
    if (!topic.trim()) return;

    setIsProcessing(true);
    setBatches([]);
    
    try {
      // Step 1: Variable Injection Strategy
      setCurrentStep('Analyzing topic & generating injection variables...');
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

      // Step 2: Sequential Execution (to avoid rate limits and show progress)
      for (let i = 0; i < newBatches.length; i++) {
        const batch = newBatches[i];
        
        // Update status to generating
        setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: 'generating' } : b));
        setCurrentStep(`Generating Batch ${i + 1}/${newBatches.length}: "${batch.angle}" focus...`);

        // Generate Items
        const items = await generateBatchItems(topic, batch.angle, itemsPerBatch);
        
        const batchItems: BatchItem[] = items.map((content, idx) => ({
            id: `${batch.id}-item-${idx}`,
            content,
            category: batch.angle
        }));

        // Update batch with results
        setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: 'completed', items: batchItems } : b));
      }

      setCurrentStep('Factory run complete.');
    } catch (err) {
      console.error(err);
      setCurrentStep('Error during generation.');
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
          Prompt Factory
        </h1>
        <p className="text-gray-400 mt-2 max-w-2xl">
          Scale your output. Enter a topic, and the factory will inject diverse variables (Style, Audience, Format) to generate a unique batch of results.
        </p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Topic / Goal</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Keto Recipes, Python Interview Questions"
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Total Output Count</label>
                <select 
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value={5}>5 (Demo)</option>
                  <option value={10}>10 (Fast)</option>
                  <option value={20}>20 (Standard)</option>
                  <option value={50}>50 (Bulk)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    System will auto-split into {Math.ceil(count / 5)} batches with unique variables.
                </p>
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
                {isProcessing ? 'Production Active...' : 'Start Factory'}
              </button>
            </div>
          </div>

          {/* Progress Monitor */}
          {isProcessing || batches.length > 0 ? (
             <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl">
                 <h3 className="text-sm font-semibold text-gray-300 mb-3 flex justify-between">
                    <span>Production Line</span>
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
                                <span className="text-gray-500 mr-2">Variable:</span>
                                <span className="text-gray-300 font-medium">{batch.angle}</span>
                            </div>
                            <div className="text-gray-600">
                                {batch.items.length} items
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="mt-4 pt-4 border-t border-dark-800 text-xs text-brand-300 animate-pulse">
                    {currentStep}
                 </div>
             </div>
          ) : null}
        </div>

        {/* Output Display */}
        <div className="lg:col-span-2 flex flex-col h-[600px] lg:h-auto bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-dark-800 bg-dark-950/50">
                <h2 className="font-semibold text-white">Generated Assets</h2>
                <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-800 hover:bg-dark-700 rounded transition-colors">
                        <Copy size={14} /> Copy All
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-100 bg-brand-900/50 hover:bg-brand-900/80 border border-brand-800 rounded transition-colors">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {batches.length === 0 && !isProcessing && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                        <Layers size={48} className="mb-4 opacity-20" />
                        <p>No assets generated yet.</p>
                        <p className="text-sm">Configure the factory to begin.</p>
                    </div>
                )}
                
                {batches.map((batch) => (
                    <div key={batch.id} className="space-y-2">
                        {batch.items.length > 0 && (
                            <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur py-2 border-b border-dark-800/50">
                                <span className="text-xs font-bold text-brand-500 uppercase tracking-wide px-2 border border-brand-900/50 bg-brand-900/20 rounded-full">
                                    Focus: {batch.angle}
                                </span>
                            </div>
                        )}
                        <div className="grid gap-3">
                            {batch.items.map((item) => (
                                <div key={item.id} className="bg-dark-950 border border-dark-700/50 p-3 rounded-lg text-sm text-gray-300 hover:border-dark-600 transition-colors">
                                    {item.content}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};