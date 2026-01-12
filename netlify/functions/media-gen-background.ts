import { Handler } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

// Image generation service types
type ImageService = 'openrouter' | 'gemini' | 'together' | 'pollinations';

interface ImageGenerationResult {
    success: boolean;
    imageUrl?: string;
    service?: ImageService;
    error?: string;
}

// Helper function to generate image using Pollinations.ai (FREE, no API key required)
async function generateImageWithPollinations(prompt: string): Promise<ImageGenerationResult> {
    try {
        console.log(`[Pollinations.ai] Generating image with prompt: "${prompt.substring(0, 100)}..."`);

        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

        console.log(`[Pollinations.ai] Image URL: ${imageUrl}`);

        const verifyResponse = await fetch(imageUrl, { method: 'HEAD' });

        if (verifyResponse.ok) {
            console.log(`[Pollinations.ai] Image generation successful`);
            return {
                success: true,
                imageUrl: imageUrl,
                service: 'pollinations'
            };
        } else {
            console.warn(`[Pollinations.ai] HEAD request failed: ${verifyResponse.status}`);
            return {
                success: true,
                imageUrl: imageUrl,
                service: 'pollinations'
            };
        }
    } catch (err: any) {
        console.error(`[Pollinations.ai] Error:`, err.message);
        return {
            success: false,
            service: 'pollinations',
            error: err.message
        };
    }
}

// Helper function to generate image using Together.ai (FLUX model)
async function generateImageWithTogether(prompt: string, togetherKey?: string): Promise<ImageGenerationResult> {
    if (!togetherKey) {
        return { success: false, service: 'together', error: 'No Together.ai API key provided' };
    }

    try {
        console.log(`[Together.ai] Generating image with prompt: "${prompt.substring(0, 100)}..."`);

        const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${togetherKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell',
                prompt: prompt,
                width: 1024,
                height: 1024,
                n: 1,
                response_format: 'b64_json',
                steps: 4,
                seed: Math.floor(Math.random() * 1000000)
            })
        });

        const responseText = await response.text();
        console.log(`[Together.ai] Response status: ${response.status}`);

        if (response.ok) {
            const data = JSON.parse(responseText);

            if (data.data?.[0]?.b64_json) {
                const imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
                console.log(`[Together.ai] Image generation successful`);
                return {
                    success: true,
                    imageUrl: imageUrl,
                    service: 'together'
                };
            } else {
                console.warn(`[Together.ai] No b64_json in response`);
            }
        }

        return {
            success: false,
            service: 'together',
            error: `API returned ${response.status}`
        };
    } catch (err: any) {
        console.error(`[Together.ai] Error:`, err.message);
        return {
            success: false,
            service: 'together',
            error: err.message
        };
    }
}

// Helper function to generate image using Google's Imagen via Gemini SDK
async function generateImageWithGemini(prompt: string, geminiKey: string): Promise<ImageGenerationResult> {
    if (!geminiKey) {
        return { success: false, service: 'gemini', error: 'No Gemini API key provided' };
    }

    try {
        console.log(`[Gemini] Generating image with prompt: "${prompt.substring(0, 100)}..."`);

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);

        const model = genAI.getGenerativeModel({
            model: "imagen-4.0-generate-001",
            generationConfig: {
                responseModalities: ["image", "text"],
            }
        });

        console.log(`[Gemini] Calling model: imagen-4.0-generate-001`);
        const result = await model.generateContent(`Generate an image: ${prompt}`);

        const response = result.response;

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.mimeType?.startsWith('image/')) {
                    const base64 = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType;

                    console.log(`[Gemini] Generated image with mimeType: ${mimeType}`);

                    if (!base64 || base64.length === 0) {
                        console.warn('[Gemini] Returned empty base64 data');
                        continue;
                    }

                    const cleanBase64 = base64.replace(/\s/g, '');
                    const dataUrl = `data:${mimeType};base64,${cleanBase64}`;

                    console.log(`[Gemini] Image generation successful`);
                    return {
                        success: true,
                        imageUrl: dataUrl,
                        service: 'gemini'
                    };
                }
            }
        }

        console.warn('[Gemini] Did not return image data in response');
        return {
            success: false,
            service: 'gemini',
            error: 'No image data in response'
        };
    } catch (err: any) {
        console.error(`[Gemini] Error:`, err.message);
        return {
            success: false,
            service: 'gemini',
            error: err.message
        };
    }
}

// Main image generation function with fallback chain
async function generateImageWithFallback(prompt: string, options: {
    openRouterKey?: string;
    geminiKey?: string;
    togetherKey?: string;
}): Promise<ImageGenerationResult> {
    const { openRouterKey, geminiKey, togetherKey } = options;

    console.log(`[ImageGen] Starting fallback chain for prompt: "${prompt.substring(0, 100)}..."`);

    // Try OpenRouter first (Nano Banana)
    if (openRouterKey) {
        console.log(`[ImageGen] Trying OpenRouter with model: google/gemini-3-pro-image-preview`);
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://promptcore.app',
                    'X-Title': 'PromptCore'
                },
                body: JSON.stringify({
                    model: 'google/gemini-3-pro-image-preview',
                    messages: [
                        { role: 'user', content: `Generate an image: ${prompt}` }
                    ],
                    max_tokens: 8192,
                    temperature: 0.1
                })
            });

            if (response.ok) {
                const data = await response.json();
                const messageContent = data.choices?.[0]?.message?.content;

                if (Array.isArray(messageContent)) {
                    for (const part of messageContent) {
                        if ((part.type === 'image_url' || part.image_url?.url) && part.image_url?.url) {
                            console.log(`[ImageGen] OpenRouter image generation successful`);
                            return {
                                success: true,
                                imageUrl: part.image_url.url,
                                service: 'openrouter'
                            };
                        }
                    }
                } else if (typeof messageContent === 'string') {
                    const base64Match = messageContent.match(/data:image\/[^;]+;base64,([^\s"]+)/);
                    if (base64Match) {
                        console.log(`[ImageGen] OpenRouter image generation successful (base64)`);
                        return {
                            success: true,
                            imageUrl: base64Match[0],
                            service: 'openrouter'
                        };
                    }
                }
            }
            console.warn(`[ImageGen] OpenRouter failed: ${response.status}`);
        } catch (err: any) {
            console.error(`[ImageGen] OpenRouter error:`, err.message);
        }
    }

    // Try Pollinations.ai (free fallback - always available)
    console.log(`[ImageGen] Trying Pollinations.ai (free fallback)`);
    const pollinationsResult = await generateImageWithPollinations(prompt);
    if (pollinationsResult.success) {
        return pollinationsResult;
    }
    console.warn(`[ImageGen] Pollinations.ai failed: ${pollinationsResult.error}`);

    // Try Together.ai
    if (togetherKey) {
        console.log(`[ImageGen] Trying Together.ai`);
        const togetherResult = await generateImageWithTogether(prompt, togetherKey);
        if (togetherResult.success) {
            return togetherResult;
        }
        console.warn(`[ImageGen] Together.ai failed: ${togetherResult.error}`);
    }

    // Try Gemini native (last fallback)
    if (geminiKey) {
        console.log(`[ImageGen] Trying Gemini native`);
        const geminiResult = await generateImageWithGemini(prompt, geminiKey);
        if (geminiResult.success) {
            return geminiResult;
        }
        console.warn(`[ImageGen] Gemini failed: ${geminiResult.error}`);
    }

    // All services failed
    console.error(`[ImageGen] All image generation services failed`);
    return {
        success: false,
        error: 'All image generation services failed'
    };
}

const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body || "{}");
        const { prompt, chatId, userId, conversationHistory = [] } = payload;

        if (!prompt || !chatId || !userId) {
            console.error("Missing required fields");
            return { statusCode: 400, body: "Missing required fields" };
        }

        console.log(`[Media Gen Background] Starting job for chat ${chatId}`);

        // Initialize Supabase Admin Client
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check Credits, Subscription & Dev Status
        const { data: profile } = await supabase.from('profiles').select('credits, monthly_usage, last_usage_reset, subscription_status, media_gen_uses_monthly').eq('id', userId).single();
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const isDev = userData?.user?.email === 'dev@promptcore.com';

        const status = profile?.subscription_status || 'free';
        const isFree = status === 'free';

        // Check Trial Limits for Free Users on Media Gen
        if (!isDev && isFree) {
            const trialLimit = 10;
            const currentUses = profile?.media_gen_uses_monthly || 0;

            if (currentUses >= trialLimit) {
                console.log(`[Media Gen Background] Blocking free user ${userId} - trial limit reached`);
                return { statusCode: 402, body: `You've used all ${trialLimit} free uses of Media Gen this month. Upgrade to Lite for unlimited access.` };
            }
        }

        let currentCredits = profile?.credits || 0;
        let monthlyUsage = profile?.monthly_usage || 0;
        const lastReset = new Date(profile?.last_usage_reset || 0);
        const now = new Date();

        // Monthly Reset logic
        const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
        if (isNewMonth) {
            monthlyUsage = 0;
            const allowances: Record<string, number> = { 'free': 50, 'lite': 1000, 'pro': 2500 };
            const allowance = allowances[status] || 50;
            currentCredits = Math.max(currentCredits, allowance);

            await supabase.from("profiles").update({
                monthly_usage: 0,
                credits: currentCredits,
                last_usage_reset: now.toISOString(),
                media_gen_uses_monthly: 0
            }).eq("id", userId);
        }

        // Calculate cost for Media Gen (5 base credits)
        const baseCost = 5;
        let finalCost = baseCost;
        if (!isDev && isFree) {
            finalCost = baseCost * 2; // 10 credits for free users
        }

        // Efficiency Logic (The "Usage Tax")
        const isAboveThreshold = isFree && monthlyUsage > 100;
        if (isAboveThreshold) {
            finalCost = finalCost * 3;
        }

        if (!isDev && currentCredits < finalCost) {
            console.log(`[Media Gen Background] User ${userId} has insufficient credits (${currentCredits} < ${finalCost})`);
            return { statusCode: 402, body: "Insufficient credits" };
        }

        const openRouterKey = (process.env.PROMPTCORE_NETLIFY_PROD || process.env.OPENROUTER_API_KEY || "").trim();
        const geminiKey = (process.env.LOCAL_GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
        const togetherKey = process.env.TOGETHER_API_KEY;

        // Use Gemini 3 Pro Image Preview for Media Gen
        const modelId = 'google/gemini-3-pro-image-preview';

        // 1. Insert Initial "Processing" Message
        const messageId = crypto.randomUUID();
        const { error: insertError } = await supabase.from('messages').insert({
            id: messageId,
            chat_id: chatId,
            role: 'model',
            content: '🎨 **Generating Media...**\n\nI am creating your visual content based on your optimized prompt. This may take a moment for high-quality results.\n\n*Please wait while I generate your media...*',
            status: 'processing',
            msg_type: 'execution_result',
            execution_model: modelId,
            metadata: {
                startTime: Date.now(),
                jobType: 'media-gen-background'
            }
        });

        if (insertError) {
            console.error("Failed to insert initial message:", insertError);
            return { statusCode: 500, body: "Database error" };
        }

        console.log(`[Media Gen Background] Initial message inserted: ${messageId}`);

        // 2. Perform the Heavy AI Task
        try {
            // Extract the clean prompt for image generation
            let imagePrompt = prompt;

            try {
                const jsonPrompt = JSON.parse(prompt);
                imagePrompt = jsonPrompt.prompt || jsonPrompt.description || prompt;
            } catch (e) {
                // Not JSON, use as-is
            }

            // Clean prompt for image generation
            const cleanPrompt = imagePrompt
                .replace(/[{}[\]"']/g, '') // Remove JSON-like characters
                .replace(/\s+/g, ' ')      // Normalize whitespace
                .trim()
                .substring(0, 500);

            console.log(`[Media Gen Background] Clean prompt: "${cleanPrompt.substring(0, 100)}..."`);

            // Use the fallback chain to generate the image
            const imageResult = await generateImageWithFallback(cleanPrompt, {
                openRouterKey,
                geminiKey,
                togetherKey
            });

            let responseText = "### 🎨 Your Media Generation Result\n\n";

            if (imageResult.success && imageResult.imageUrl) {
                console.log(`[Media Gen Background] Image generation successful via ${imageResult.service}`);

                responseText += `✓ Successfully generated using **${imageResult.service}**\n\n`;
                responseText += `**Prompt Used:**\n${cleanPrompt}\n\n`;

                // For base64 images, use special markers to avoid ReactMarkdown issues
                if (imageResult.imageUrl.startsWith('data:')) {
                    responseText += `<!-- IMAGE_DATA_START -->\n${imageResult.imageUrl}\n<!-- IMAGE_DATA_END -->`;
                } else {
                    // For URL-based images (Pollinations.ai), use markdown
                    responseText += `![Generated Image](${imageResult.imageUrl})`;
                }
            } else {
                console.log(`[Media Gen Background] Image generation failed: ${imageResult.error}`);
                responseText += `❌ Image generation failed: ${imageResult.error || 'Unknown error'}\n\n`;
                responseText += `**Prompt:** ${cleanPrompt}`;
            }

            // 3. Update the Message with Result
            const { error: updateError } = await supabase
                .from('messages')
                .update({
                    content: responseText,
                    status: imageResult.success ? 'completed' : 'failed',
                    metadata: {
                        duration: Date.now() - Date.now(),
                        service: imageResult.service,
                        model: modelId
                    }
                })
                .eq('id', messageId);

            if (updateError) {
                console.error("Failed to update message with result:", updateError);
            } else {
                console.log(`[Media Gen Background] Job completed successfully for ${messageId}`);

                // 4. Decrement Credits & Update Monthly Usage (only if successful)
                if (!isDev && imageResult.success) {
                    const updateData: any = {
                        credits: Math.max(0, currentCredits - finalCost),
                        monthly_usage: monthlyUsage + finalCost
                    };

                    // Track Media Gen usage for free users
                    if (isFree) {
                        updateData.media_gen_uses_monthly = (profile?.media_gen_uses_monthly || 0) + 1;
                    }

                    await supabase
                        .from('profiles')
                        .update(updateData)
                        .eq('id', userId);
                }
            }

        } catch (executionError: any) {
            console.error("AI Execution Failed:", executionError);

            // Update message to show failure
            await supabase
                .from('messages')
                .update({
                    content: `### ❌ Media Generation Failed\n\nI encountered an error while generating your media: ${executionError.message}. Please try again.`,
                    status: 'failed'
                })
                .eq('id', messageId);
        }

    } catch (err) {
        console.error("Background Handler Error:", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }

    return { statusCode: 202 };
};

export { handler };
