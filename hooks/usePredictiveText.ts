import { useState, useEffect } from 'react';
import { AppMode } from '../types';

type Suggestion = {
    trigger: string; // The keyword or start of sentence
    text: string;    // The full enhanced prompt
    type: 'starter' | 'enhancement';
};

const SUGGESTIONS: Record<AppMode, Suggestion[]> = {
    [AppMode.EVERYDAY]: [
        { trigger: '', text: 'Draft a professional email to...', type: 'starter' },
        { trigger: '', text: 'Brainstorm ideas for...', type: 'starter' },
        { trigger: 'email', text: 'Draft a professional email to [recipient] about [topic] that is polite but firm.', type: 'enhancement' },
        { trigger: 'fix', text: 'Fix the grammar and flow of this text: ', type: 'enhancement' },
        { trigger: 'explain', text: 'Explain this concept to a 5-year old: ', type: 'enhancement' },
    ],
    [AppMode.VIBE_CODE]: [
        { trigger: '', text: 'Build a landing page for...', type: 'starter' },
        { trigger: '', text: 'Create a dashboard component...', type: 'starter' },
        { trigger: 'landing', text: 'Build a modern, high-converting landing page for a SaaS product with a hero section, features, and pricing.', type: 'enhancement' },
        { trigger: 'bug', text: 'Analyze this code, find the bug, and explain the fix step-by-step.', type: 'enhancement' },
        { trigger: 'test', text: 'Write comprehensive unit tests for this component using Jest and React Testing Library.', type: 'enhancement' },
    ],
    [AppMode.MEDIA_GEN]: [
        { trigger: '', text: 'Generate a photorealistic image of...', type: 'starter' },
        { trigger: '', text: 'Create a looping video of...', type: 'starter' },
        { trigger: 'image', text: 'Generate a high-end, cinematic photo of [subject], 8k resolution, dramatic lighting.', type: 'enhancement' },
        { trigger: 'logo', text: 'Design a minimalist, vector-style logo for a tech startup called [Name].', type: 'enhancement' },
    ],
    [AppMode.TALK_TO_SOURCE]: [
        { trigger: '', text: 'Summarize this document...', type: 'starter' },
        { trigger: '', text: 'Find the key insights in...', type: 'starter' },
        { trigger: 'summary', text: 'Provide a concise bullet-point summary of the key arguments and conclusions.', type: 'enhancement' },
        { trigger: 'quote', text: 'Find specific quotes in the text that support the idea that...', type: 'enhancement' },
    ]
};

export function usePredictiveText(mode: AppMode, input: string) {
    const [suggestion, setSuggestion] = useState<{ text: string; remainder: string; isEnhancement: boolean } | null>(null);

    useEffect(() => {
        const modeSuggestions = SUGGESTIONS[mode] || [];
        const normalizedInput = input.toLowerCase().trim();

        if (!input) {
            // Empty state: Rotate through starters or just pick first for now
            // Simpler: Just show the first starter
            const starter = modeSuggestions.find(s => s.type === 'starter');
            if (starter) {
                setSuggestion({ text: starter.text, remainder: starter.text, isEnhancement: false });
            } else {
                setSuggestion(null);
            }
            return;
        }

        // Typing state: Check for trigger matches
        // We look for triggers that START with the input or EXACT match short keywords
        const match = modeSuggestions.find(s =>
            s.type === 'enhancement' &&
            (s.trigger.startsWith(normalizedInput) || normalizedInput.endsWith(s.trigger)) // Simple keyword match
        );

        if (match) {
            // If we found a keyword match (e.g. typed "bug"), we want to suggest the FULL text
            // The "remainder" is the full text minus what they typed? 
            // Actually for "Enhancement", we usually want to REPLACE the keyword.
            // But standard ghost text appends.
            // Let's implement robust "Completion" style:
            // If input is "bu" -> Match "bug" trigger -> Suggest "bug" -> "Analyze..." (Too complex?)

            // Simpler: If input contains the trigger word, offer to complete the sentence.
            // Example: "fix" -> "Fix the grammar..."

            // Logic: If the input matches the START of the suggestion text?
            // "Fix" matches start of "Fix the grammar..."
            if (match.text.toLowerCase().startsWith(normalizedInput)) {
                setSuggestion({
                    text: match.text,
                    remainder: match.text.slice(input.length),
                    isEnhancement: true
                });
            } else if (normalizedInput === match.trigger) {
                // If they typed the exact keyword "bug", suggest the full replacement
                // But visualized as: bug [ -> Analyze this code...]
                // This is a "Replacement" suggestion.
                setSuggestion({
                    text: match.text,
                    remainder: "", // Special case: UI should show "Press Tab to replace with: ..."
                    isEnhancement: true
                });
            } else {
                setSuggestion(null);
            }
        } else {
            setSuggestion(null);
        }

    }, [input, mode]);

    return suggestion;
}
