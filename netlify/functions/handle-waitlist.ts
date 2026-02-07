import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;

export const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase credentials");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server Configuration Error" }),
        };
    }

    try {
        const { email, source } = JSON.parse(event.body || "{}");

        if (!email || !email.includes("@")) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid email address" }),
            };
        }

        // --- Send to GHL Webhook (if configured) ---
        if (ghlWebhookUrl) {
            try {
                console.log(`Sending webhook to GHL: ${ghlWebhookUrl}`);
                const webhookResponse = await fetch(ghlWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        source: source || "landing_page",
                        type: 'waitlist_signup',
                        timestamp: new Date().toISOString()
                    })
                });
                
                if (!webhookResponse.ok) {
                    console.error(`GHL Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
                    const text = await webhookResponse.text();
                    console.error(`GHL Response: ${text}`);
                } else {
                    console.log("GHL Webhook sent successfully");
                }
            } catch (webhookError) {
                console.error("Failed to send to GHL webhook:", webhookError);
                // Continue execution - don't fail the user request just because webhook failed
            }
        } else {
            console.warn("GHL_WEBHOOK_URL is not set");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase
            .from("waitlist_emails")
            .insert([{ email, source: source || "landing_page" }]);

        if (error) {
            if (error.code === "23505") {
                // Unique violation (if we had a unique constraint, usually good UX to say success anyway or "already registered")
                // But table definition didn't enforce UNIQUE on email explicitly in my SQL, let's assume it might allow dupes or I should've added it. 
                // For now, if error, report it.
                console.log("Duplicate email or constraint error:", error);
            }
            throw error;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successfully joined the waitlist!" }),
        };
    } catch (error) {
        console.error("Waitlist error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to join waitlist" }),
        };
    }
};
