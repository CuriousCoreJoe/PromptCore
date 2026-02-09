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

        // Fetch the image on the backend and convert to Base64 to avoid client-side issues
        const response = await fetch(imageUrl);

        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:image/jpeg;base64,${base64}`;

            console.log(`[Pollinations.ai] Image generation successful (converted to Base64)`);
            return {
                success: true,
                imageUrl: dataUrl,
                service: 'pollinations'
            };
        } else {
            console.warn(`[Pollinations.ai] Request failed: ${response.status}`);
            return {
                success: false,
                service: 'pollinations',
                error: `Pollinations API returned ${response.status}`
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
                const cleanBase64 = data.data[0].b64_json.replace(/\s/g, '');
                const imageUrl = `data:image/png;base64,${cleanBase64}`;
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
            model: "imagen-3.0-generate-001",
            generationConfig: {
                responseModalities: ["image", "text"],
            }
        });

        console.log(`[Gemini] Calling model: imagen-3.0-generate-001`);
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

        // Try fast model if the standard one failed
        if (err.message?.includes('not found') || err.message?.includes('not supported')) {
            console.log(`[Gemini] Trying fallback model: imagen-3.0-fast-generate-001`);
            try {
                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(geminiKey);
                const fastModel = genAI.getGenerativeModel({
                    model: "imagen-3.0-fast-generate-001",
                    generationConfig: { responseModalities: ["image", "text"] }
                });
                const fastResult = await fastModel.generateContent(`Generate an image: ${prompt}`);
                const fastResponse = fastResult.response;
                if (fastResponse.candidates?.[0]?.content?.parts) {
                    for (const part of fastResponse.candidates[0].content.parts) {
                        if (part.inlineData?.mimeType?.startsWith('image/')) {
                            return {
                                success: true,
                                imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                                service: 'gemini'
                            };
                        }
                    }
                }
            } catch (fastErr: any) {
                console.error(`[Gemini Fallback] Error:`, fastErr.message);
            }
        }

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
    requestedModel?: string;
}): Promise<ImageGenerationResult> {
    const { openRouterKey, geminiKey, togetherKey, requestedModel } = options;

    console.log(`[VisualFactory] Starting fallback chain for prompt: "${prompt.substring(0, 100)}..."`);
    console.log(`[VisualFactory] Requested model: ${requestedModel}`);

    // Try OpenRouter first for EVERYTHING (Consolidated path as requested)
    if (openRouterKey) {
        const orModelMapping: Record<string, string> = {
            'nano-banana': 'google/gemini-3-pro-image-preview',
            'flux-2': 'black-forest-labs/flux.2-pro',
            'chatgpt-5': 'openai/gpt-4o-mini', // Fallback for GPT-5 naming
            'gemini': 'google/gemini-3-pro-image-preview',
            'flux': 'black-forest-labs/flux.1-schnell',
            'midjourney-v6': 'midjourney/mj-v6',
            'dalle-3': 'openai/dall-e-3'
        };

        const reqModelLower = requestedModel?.toLowerCase() || '';
        const modelId = orModelMapping[reqModelLower] || orModelMapping['nano-banana'];

        console.log(`[VisualFactory] Trying OpenRouter with model: ${modelId}`);

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://promptorigin.app',
                    'X-Title': 'PromptOrigin'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: 'user', content: `Generate an image based on this description: ${prompt}` }
                    ],
                    max_tokens: 8192,
                    temperature: 0.1
                })
            });

            if (response.ok) {
                const data = await response.json();
                const message = data.choices?.[0]?.message;
                const messageContent = message?.content;

                console.log(`[VisualFactory] OpenRouter status 200. Parsing response...`);

                // 1. Check for image_url in content parts (standard for multimodal models on OR)
                if (Array.isArray(messageContent)) {
                    for (const part of messageContent) {
                        if (part.type === 'image_url' && part.image_url?.url) {
                            console.log(`[VisualFactory] Success: Found image_url in parts array`);
                            return {
                                success: true,
                                imageUrl: part.image_url.url,
                                service: 'openrouter'
                            };
                        }
                    }
                }

                // 2. Check for data URL in string content (fallback for some models)
                if (typeof messageContent === 'string') {
                    const base64Match = messageContent.match(/data:image\/[^;]+;base64,([^\s"]+)/);
                    if (base64Match) {
                        console.log(`[VisualFactory] Success: Found base64 data URL in string content`);
                        return {
                            success: true,
                            imageUrl: base64Match[0],
                            service: 'openrouter'
                        };
                    }

                    // Some models return just the URL in the text
                    const urlMatch = messageContent.match(/https?:\/\/[^\s"]+\.(?:png|jpg|jpeg|webp)/i);
                    if (urlMatch) {
                        console.log(`[VisualFactory] Success: Found image URL in string content`);
                        return {
                            success: true,
                            imageUrl: urlMatch[0],
                            service: 'openrouter'
                        };
                    }
                }

                // 3. Check for non-standard 'images' array (e.g. Flux on OpenRouter)
                // @ts-ignore - 'images' is not in standard type
                // @ts-ignore
                if (data.choices?.[0]?.message?.images && Array.isArray(data.choices[0].message.images) && data.choices[0].message.images.length > 0) {
                    // @ts-ignore
                    const img = data.choices[0].message.images[0];
                    if (img.image_url?.url) {
                        console.log(`[VisualFactory] Success: Found image in non-standard 'images' array`);
                        return {
                            success: true,
                            imageUrl: img.image_url.url,
                            service: 'openrouter'
                        };
                    }
                    if (img.url) {
                         console.log(`[VisualFactory] Success: Found image url in non-standard 'images' array`);
                        return {
                            success: true,
                            imageUrl: img.url,
                            service: 'openrouter'
                        };
                    }
                }

                console.warn(`[VisualFactory] OpenRouter response did not contain recognizable image data. Raw content:`, JSON.stringify(messageContent).substring(0, 500));
                console.warn(`[VisualFactory] Full OpenRouter Response:`, JSON.stringify(data, null, 2));
            } else {
                const errorText = await response.text();
                console.warn(`[VisualFactory] OpenRouter API error ${response.status}: ${errorText}`);
            }
        } catch (err: any) {
            console.error(`[VisualFactory] OpenRouter request exception:`, err.message);
        }
    }

    // --- FALLBACK CHAIN (only if OpenRouter failed) ---

    // 1. Together.ai (Flux specialized)
    if (requestedModel?.includes('flux') && togetherKey) {
        console.log(`[VisualFactory] Falling back to direct Together.ai for Flux`);
        const result = await generateImageWithTogether(prompt, togetherKey);
        if (result.success) return result;
    }

    // 2. Pollinations.ai (FREE, absolute fallback)
    console.log(`[VisualFactory] Falling back to Pollinations.ai (Free fallback)`);
    const pollinationsResult = await generateImageWithPollinations(prompt);
    if (pollinationsResult.success) {
        return pollinationsResult;
    }

    // 3. Gemini Native (Final attempt)
    if (geminiKey) {
        console.log(`[VisualFactory] Final fallback to Gemini Native`);
        const geminiResult = await generateImageWithGemini(prompt, geminiKey);
        if (geminiResult.success) {
            return geminiResult;
        }
    }

    // All services failed
    console.error(`[VisualFactory] All image generation services failed`);
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
        const { prompt, chatId, userId, conversationHistory = [], model, messageId: providedMessageId } = payload;

        if (!prompt || !chatId || !userId) {
            console.error("Missing required fields");
            return { statusCode: 400, body: "Missing required fields" };
        }

        console.log(`[Media Gen Background] Starting job for chat ${chatId}`);

        const startTime = Date.now();

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

        // 1. Insert or Update Initial "Processing" Message
        const messageId = providedMessageId || crypto.randomUUID();
        const initialContent = '🎨 **Generating Media...**\n\nI am creating your visual content based on your optimized prompt. This may take a moment for high-quality results.\n\n*Please wait while I generate your media...*';
        
        if (providedMessageId) {
            // Update existing message (inserted by frontend)
            const { error: updateError } = await supabase.from('messages').update({
                content: initialContent,
                status: 'processing',
                msg_type: 'execution_result',
                execution_model: modelId,
                metadata: {
                    startTime: Date.now(),
                    jobType: 'media-gen-background'
                }
            }).eq('id', messageId);

            if (updateError) {
                console.error("Failed to update initial message:", updateError);
                // Fallback to insert if update fails (e.g. race condition where frontend didn't insert yet)
                // But usually we just log and continue, or try insert.
            }
            console.log(`[Media Gen Background] Initial message updated: ${messageId}`);
        } else {
            // Insert new message
            const { error: insertError } = await supabase.from('messages').insert({
                id: messageId,
                chat_id: chatId,
                role: 'model',
                content: initialContent,
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
        }

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
                .substring(0, 1000);

            console.log(`[Media Gen Background] Clean prompt: "${cleanPrompt.substring(0, 100)}..."`);

            // Use the fallback chain to generate the image
            const imageResult = await generateImageWithFallback(cleanPrompt, {
                openRouterKey,
                geminiKey,
                togetherKey,
                requestedModel: model
            });

            // Format prompt with line breaks for better readability
            const formattedPrompt = cleanPrompt
                .replace(/ATMOSPHERE:/i, '\n\n**ATMOSPHERE:**')
                .replace(/LIGHTING:/i, '\n**LIGHTING:**')
                .replace(/COMPOSITION:/i, '\n**COMPOSITION:**')
                .replace(/STYLE:/i, '\n**STYLE:**')
                .replace(/SUBJECT:/i, '\n**SUBJECT:**');

            let responseText = "### 🎨 Your Media Generation Result\n\n";

            if (imageResult.success && imageResult.imageUrl) {
                console.log(`[Media Gen Background] Image generation successful via ${imageResult.service}`);

                responseText += `✓ Successfully generated using **${imageResult.service}**\n\n`;
                responseText += `**Prompt Used:**\n${formattedPrompt}\n\n`;

                // Use custom block for robust image passing (Base64 or URL)
                // We use a custom block to avoid ReactMarkdown issues and allow frontend to handle large data
                responseText += `\n\n<!-- IMAGE_DATA_START -->\n${imageResult.imageUrl}\n<!-- IMAGE_DATA_END -->`;
            } else {
                console.log(`[Media Gen Background] Image generation failed: ${imageResult.error}`);
                responseText += `❌ Image generation failed: ${imageResult.error || 'Unknown error'}\n\n`;
                responseText += `**Prompt:** ${formattedPrompt}`;
            }

            // Map service to display name for execution result
            let displayModel = modelId;
            if (imageResult.service === 'pollinations') displayModel = 'Pollinations.ai';
            else if (imageResult.service === 'together') displayModel = 'Flux (Together.ai)';
            else if (imageResult.service === 'gemini') displayModel = 'Gemini Imagen';
            else if (imageResult.service === 'openrouter') displayModel = 'Nano Banana';

            // 3. Update the Message with Result
            const { error: updateError } = await supabase
                .from('messages')
                .update({
                    content: responseText,
                    status: imageResult.success ? 'completed' : 'failed',
                    execution_model: displayModel,
                    metadata: {
                        duration: Date.now() - (payload.startTime || startTime),
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
