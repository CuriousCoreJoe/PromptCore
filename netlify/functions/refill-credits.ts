import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Make sure you are refilling the tank correctly.' };
    }

    try {
        const { userId, feedback, submissionType, email } = JSON.parse(event.body || '{}');

        if (!userId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
        }

        // 1. Handle Submission (Waitlist or Feedback)
        try {
            // --- Send to GHL Webhook (if configured) ---
            if (ghlWebhookUrl) {
                try {
                    const payload: any = {
                        userId,
                        type: submissionType === 'waitlist' ? 'fuel_tank_waitlist' : 'fuel_tank_feedback',
                        timestamp: new Date().toISOString(),
                        source: 'fuel_tank'
                    };

                    if (email) payload.email = email;
                    if (feedback) payload.feedback = feedback;

                    // Fire and forget (don't await to speed up response, or await if we want to ensure delivery)
                    // Since this is a serverless function, we should await it or it might be killed.
                    await fetch(ghlWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } catch (webhookError) {
                    console.error("Failed to send to GHL webhook:", webhookError);
                }
            }

            if (submissionType === 'waitlist' && email) {
                await supabase.from('waitlist_emails').insert([{ email, source: 'fuel_tank' }]);
            } else if (feedback) {
                // Use feedback_items table if feedback table doesn't exist
                await supabase.from('feedback_items').insert({
                    user_id: userId,
                    type: 'fuel_tank_refill',
                    content: JSON.stringify(feedback),
                    status: 'open'
                });
            }
        } catch (err) {
            console.warn("Failed to save submission stats:", err);
            // Don't block the refill though
        }

        // 2. Check Frequency (Weekly Limit)
        const { data: profile } = await supabase
            .from('profiles')
            .select('last_refill_date')
            .eq('id', userId)
            .single();

        if (profile?.last_refill_date) {
            const lastRefill = new Date(profile.last_refill_date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastRefill.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 7) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ error: `Refill available in ${7 - diffDays} days.` })
                };
            }
        }

        // 3. Refill Credits (100 Credits)
        // Use a transaction or just update the profile
        const { data, error } = await supabase.rpc('refill_fuel_tank', {
            target_user_id: userId,
            amount: 100 // NEW: 100 credits
        });

        if (error) {
            // Fallback to direct update if RPC doesn't exist yet
            console.warn("RPC refill_fuel_tank not found, falling back to direct update");
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    credits: 100, // Update to 100
                    is_demo_locked: false,
                    last_refill_date: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) throw updateError;
        }

        // Increment refill count
        await supabase.rpc('increment_refill_count', { target_user_id: userId });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Tank refilled' })
        };

    } catch (error: any) {
        console.error('Refill error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
