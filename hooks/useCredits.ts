import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export function useCredits(userProfile: UserProfile | null, onUpdateProfile: () => void) {
    const [isRefilling, setIsRefilling] = useState(false);

    const checkCredits = (cost: number): boolean => {
        if (!userProfile) return true; // Assume true if profile not loaded yet (or handle error)

        // If locked, return false
        if (userProfile.is_demo_locked) return false;

        // If insufficient credits, return false (and ideally trigger lock if 0)
        if ((userProfile.credits || 0) < cost) {
            // We can optionally trigger the lock here immediately, 
            // but usually we rely on the backend or a separate effect to lock it.
            // For better UX, we'll return false so the UI can show the modal.
            return false;
        }

        return true;
    };

    const deductCredits = async (cost: number) => {
        if (!userProfile) return;

        // Optimistic update happens in the parent/context usually, 
        // but here we just ensure the backend deducts it.
        // Actually, for this app, we might just rely on the backend deduction during execution/generation?
        // The user request says: "deductCredits = async (cost) => { ... }"

        // However, in our flow, the "Generate" API key calls usually handle the logic?
        // Let's implement this for explicit deductions if needed.

        try {
            const { error } = await supabase.rpc('deduct_credits', { amount: cost, user_id: userProfile.id });
            if (error) console.error("Error deducting credits:", error);
            onUpdateProfile();
        } catch (e) {
            console.error(e);
        }
    };

    const refillCredits = async (feedbackData: any) => {
        setIsRefilling(true);
        try {
            // 1. Submit feedback (simulated or real DB insert)
            // For now, let's just log it or insert into a feedback table if we have one.
            // We'll proceed to the refill function.

            // 2. Call cloud function to refill and unlock
            const response = await fetch('/api/refill-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userProfile?.id,
                    feedback: feedbackData
                })
            });

            if (!response.ok) throw new Error('Refill failed');

            // 3. Update local state
            onUpdateProfile();
            return { success: true };
        } catch (error) {
            console.error("Refill error:", error);
            return { success: false, error };
        } finally {
            setIsRefilling(false);
        }
    };

    return { checkCredits, deductCredits, refillCredits, isRefilling };
}
