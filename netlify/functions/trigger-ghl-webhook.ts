import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/MauY9ZXWFeICTsp8rzTv/webhook-trigger/7f42393b-3f71-4137-9a87-a46a94757039";

export const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { statusCode: 401, body: "Unauthorized" };
    }

    const token = authHeader.split(" ")[1];

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase credentials");
        return { statusCode: 500, body: "Server Configuration Error" };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth error:", authError);
            return { statusCode: 401, body: "Invalid Token" };
        }

        // Check if webhook already sent (double check)
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, signup_webhook_sent")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            return { statusCode: 500, body: `Error fetching profile: ${profileError.message} (${profileError.code})` };
        }

        if (profile && profile.signup_webhook_sent) {
            return { statusCode: 200, body: JSON.stringify({ message: "Webhook already sent" }) };
        }

        if (profile && profile.signup_webhook_sent === undefined) {
            console.warn("signup_webhook_sent column appears to be missing from profiles table. Please run migration.");
        }

        // Send to GHL
        // User requested to only collect email, using placeholders for name
        try {
            console.log(`Sending webhook to GHL for user: ${user.email}`);
            const response = await fetch(GHL_WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: user.email,
                    first_name: "App",      // Placeholder as requested
                    last_name: "User",      // Placeholder as requested
                    source: "app_signup",
                    tags: ["User: Active"]
                }),
            });

            if (!response.ok) {
                throw new Error(`GHL Webhook failed: ${response.statusText}`);
            }

            console.log("Successfully sent user to GHL!");
        } catch (ghlError) {
            console.error("Failed to sync with GHL:", ghlError);
            // Return 500 so the client can retry
            return { statusCode: 500, body: "Failed to sync with GHL" };
        }

        // Update profile
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ signup_webhook_sent: true })
            .eq("id", user.id);

        if (updateError) {
            console.error("Error updating profile:", updateError);
            // We sent the webhook but failed to update the flag.
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Webhook triggered successfully" }),
        };

    } catch (error) {
        console.error("Error in trigger-ghl-webhook:", error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};
