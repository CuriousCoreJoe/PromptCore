import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, Folder, FolderOpen, Edit2, Check, X, Copy, FileSpreadsheet, Loader2, Trash2, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BatchItem } from '../types';

interface PackHistoryItem {
  id: string;
  niche: string;
  status: string;
  total_count: number;
  created_at: string;
}

interface BatchListProps {
  userId: string;
  defaultExpandBatches?: boolean;
  onSelectPack?: (packId: string) => void;
}

export const BatchList: React.FC<BatchListProps> = ({ userId, defaultExpandBatches = false, onSelectPack }) => {
  const [history, setHistory] = useState<PackHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [batchPrompts, setBatchPrompts] = useState<Record<string, BatchItem[]>>({});
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const promptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('packs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setHistory(data);
        if (defaultExpandBatches) {
          const allIds = new Set(data.map(p => p.id));
          setExpandedBatches(allIds);
          data.forEach(p => fetchBatchPrompts(p.id));
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchBatchPrompts = async (packId: string) => {
    if (batchPrompts[packId]) return;

    try {
      const { data } = await supabase
        .from('generated_prompts')
        .select('*')
        .eq('pack_id', packId);

      if (data) {
        setBatchPrompts(prev => ({ ...prev, [packId]: data }));
      }
    } catch (err) {
      console.error('Error loading pack prompts:', err);
    }
  };

  const toggleBatch = (packId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(packId)) {
      newExpanded.delete(packId);
    } else {
      newExpanded.add(packId);
      fetchBatchPrompts(packId);
    }
    setExpandedBatches(newExpanded);
  };

  const handleRenameBatch = async (packId: string) => {
    if (!editName.trim()) return;

    try {
      const { error } = await supabase
        .from('packs')
        .update({ niche: editName })
        .eq('id', packId);

      if (!error) {
        setHistory(prev => prev.map(p => p.id === packId ? { ...p, niche: editName } : p));
        setEditingBatchId(null);
      }
    } catch (err) {
      console.error('Error renaming batch:', err);
    }
  };

  const handleDeleteBatch = async (packId: string) => {
    if (!confirm("Are you sure you want to delete this batch? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('packs')
        .delete()
        .eq('id', packId);

      if (!error) {
        setHistory(prev => prev.filter(p => p.id !== packId));
        // Also remove from expanded and batchPrompts to clean up
        const newExpanded = new Set(expandedBatches);
        newExpanded.delete(packId);
        setExpandedBatches(newExpanded);
        const newPrompts = { ...batchPrompts };
        delete newPrompts[packId];
        setBatchPrompts(newPrompts);
      }
    } catch (err) {
      console.error('Error deleting batch:', err);
    }
  };

  const startEditing = (pack: PackHistoryItem) => {
    setEditingBatchId(pack.id);
    setEditName(pack.niche);
  };

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

  const renderPromptCard = (item: BatchItem) => (
    <div
      key={item.id}
      ref={el => { if (el) promptRefs.current[item.id] = el; }}
      className={`bg-dark-950 border rounded-xl overflow-hidden transition-all group animate-in fade-in slide-in-from-bottom-4 duration-500 ${selectedPromptId === item.id
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopySingle(item.prompt_content, item.id);
          }}
          className={`p-2 rounded transition-colors ${copiedId === item.id
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

  if (loadingHistory) {
    return <div className="p-8 text-center text-gray-500">Loading history...</div>;
  }

  if (history.length === 0) {
    return <div className="p-8 text-center text-gray-500">No history found.</div>;
  }

  const filteredHistory = history.filter(pack =>
    pack.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar for Batches */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search batches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-dark-900 border border-dark-700/50 rounded-lg py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all text-white"
        />
      </div>

      {filteredHistory.map(pack => (
        <div key={pack.id} className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
          {/* Batch Header */}
          <div
            className="p-4 bg-dark-950/50 border-b border-dark-800 flex items-center justify-between cursor-pointer hover:bg-dark-900 transition-colors"
            onClick={() => toggleBatch(pack.id)}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${expandedBatches.has(pack.id) ? 'bg-brand-900/20 text-brand-400' : 'bg-dark-800 text-gray-400'}`}>
                {expandedBatches.has(pack.id) ? <FolderOpen size={20} /> : <Folder size={20} />}
              </div>

              {editingBatchId === pack.id ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="bg-dark-950 border border-brand-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleRenameBatch(pack.id)}
                  />
                  <button onClick={() => handleRenameBatch(pack.id)} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                  <button onClick={() => setEditingBatchId(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-white flex items-center gap-2 group">
                    {pack.niche}
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(pack); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity"
                    >
                      <Edit2 size={12} />
                    </button>
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{new Date(pack.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{pack.total_count} Prompts</span>
                    <span>•</span>
                    <span className={`capitalize ${pack.status === 'completed' ? 'text-green-400' :
                      pack.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                      }`}>{pack.status}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {expandedBatches.has(pack.id) && batchPrompts[pack.id] && (
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleCopyAll(batchPrompts[pack.id])}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-800 rounded"
                    title="Copy All"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleExportCSV(batchPrompts[pack.id], `prompts-${pack.niche}`)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-800 rounded"
                    title="Export CSV"
                  >
                    <FileSpreadsheet size={16} />
                  </button>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteBatch(pack.id); }}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Delete Batch"
              >
                <Trash2 size={16} />
              </button>
              <ChevronDown
                className={`text-gray-500 transition-transform duration-300 ${expandedBatches.has(pack.id) ? 'rotate-180' : ''}`}
                size={20}
              />
            </div>
          </div>

          {/* Batch Content */}
          {expandedBatches.has(pack.id) && (
            <div className="p-4 bg-dark-900/30 border-t border-dark-800 animate-in slide-in-from-top-2 duration-300">
              {!batchPrompts[pack.id] ? (
                <div className="flex justify-center py-8 text-gray-500">
                  <Loader2 className="animate-spin mr-2" size={20} /> Loading prompts...
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {batchPrompts[pack.id].map(item => renderPromptCard(item))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
