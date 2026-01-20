import React, { useState, useEffect } from 'react';
import { X, Folder, Palette } from 'lucide-react';
import { Folder as FolderType } from '../types';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

interface FolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    existingFolder?: FolderType | null;
    onSave?: (folder: FolderType) => void;
}

const FOLDER_COLORS = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#EF4444', // red
    '#F97316', // orange
    '#EAB308', // yellow
    '#22C55E', // green
    '#14B8A6', // teal
    '#6B7280', // gray
];

export const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, userId, existingFolder, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(FOLDER_COLORS[0]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (existingFolder) {
            setName(existingFolder.name);
            setDescription(existingFolder.description || '');
            setColor(existingFolder.color);
        } else {
            setName('');
            setDescription('');
            setColor(FOLDER_COLORS[0]);
        }
    }, [existingFolder, isOpen]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);

        try {
            if (existingFolder) {
                const { data, error } = await supabase
                    .from('folders')
                    .update({ name: name.trim(), description: description.trim(), color, updated_at: new Date().toISOString() })
                    .eq('id', existingFolder.id)
                    .select()
                    .single();

                if (data && onSave) onSave(data as FolderType);
            } else {
                const { data, error } = await supabase
                    .from('folders')
                    .insert({ user_id: userId, name: name.trim(), description: description.trim(), color })
                    .select()
                    .single();

                if (data && onSave) onSave(data as FolderType);
            }
            onClose();
        } catch (err) {
            console.error('Failed to save folder:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1a1a1b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20` }}>
                            <Folder size={20} style={{ color }} />
                        </div>
                        <h2 className="text-lg font-bold text-white">
                            {existingFolder ? 'Edit Folder' : 'New Folder'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Folder Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Real Estate Projects"
                            className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this folder for?"
                            rows={2}
                            className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Palette size={12} /> Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={clsx(
                                        "w-8 h-8 rounded-full transition-all",
                                        color === c ? "ring-2 ring-offset-2 ring-offset-[#1a1a1b] ring-white scale-110" : "hover:scale-105"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || isSaving}
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20"
                    >
                        {isSaving ? 'Saving...' : (existingFolder ? 'Save Changes' : 'Create Folder')}
                    </button>
                </div>
            </div>
        </div>
    );
};
