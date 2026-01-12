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
        
        // Pollinations.ai uses a simple URL-based API
        // Format: https://image.pollinations.ai/prompt/{encoded_prompt}
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
        
        console.log(`[Pollinations.ai] Image URL: ${imageUrl}`);
        
        // Verify the URL is accessible by making a HEAD request
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
            // Even if HEAD fails, return the URL as it may still work
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
        console.log(`[Together.ai] Response status: ${response.status}, body: ${responseText.substring(0, 200)}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`[Together.ai] Response data keys:`, Object.keys(data));
            
            if (data.data?.[0]?.b64_json) {
                const imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
                console.log(`[Together.ai] Image generation successful, data URL length: ${imageUrl.length}`);
                return {
                    success: true,
                    imageUrl: imageUrl,
                    service: 'together'
                };
            } else {
                console.warn(`[Together.ai] No b64_json in response:`, JSON.stringify(data));
            }
        }
        
        return {
            success: false,
            service: 'together',
            error: `API returned ${response.status}: ${responseText.substring(0, 200)}`
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

        // Use imagen-3.0-generate-001 for image generation
        const model = genAI.getGenerativeModel({
            model: "imagen-3.0-generate-001",
            generationConfig: {
                responseModalities: ["image", "text"],
            }
        });

        // Request image generation
        console.log(`[Gemini] Calling model: imagen-3.0-generate-001`);
        const result = await model.generateContent(`Generate an image: ${prompt}`);

        const response = result.response;
        console.log(`[Gemini] Response structure:`, JSON.stringify(response).substring(0, 500));

        // Check for inline image data in the response
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                console.log(`[Gemini] Part keys: ${Object.keys(part).join(', ')}`);

                if (part.inlineData?.mimeType?.startsWith('image/')) {
                    const base64 = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType;

                    // Debug: Log base64 data info
                    console.log(`[Gemini] Generated image with mimeType: ${mimeType}`);
                    console.log(`[Gemini] Base64 data length: ${base64?.length || 0} chars`);

                    // Validate base64 data
                    if (!base64 || base64.length === 0) {
                        console.warn('[Gemini] Returned empty base64 data');
                        continue;
                    }

                    // Clean base64 - remove any whitespace/newlines
                    const cleanBase64 = base64.replace(/\s/g, '');
                    console.log(`[Gemini] Clean base64 length: ${cleanBase64.length} chars`);

                    // Check if data is too large (Netlify has ~6MB limit)
                    const dataUrl = `data:${mimeType};base64,${cleanBase64}`;
                    console.log(`[Gemini] Final data URL length: ${dataUrl.length} chars`);

                    if (dataUrl.length > 5000000) {
                        console.warn(`[Gemini] Image too large (${dataUrl.length} chars), may be truncated`);
                    }

                    console.log(`[Gemini] Image generation successful`);
                    return {
                        success: true,
                        imageUrl: dataUrl,
                        service: 'gemini'
                    };
                } else if (part.text) {
                    console.log(`[Gemini] Part has text: ${part.text.substring(0, 100)}...`);
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
        console.error(`[Gemini] Error stack:`, err.stack);
        return {
            success: false,
            service: 'gemini',
            error: err.message
        };
    }
}

// Main image generation function with fallback chain
// Order: OpenRouter (Nano Banana) -> Pollinations.ai -> Together.ai -> Gemini
async function generateImageWithFallback(prompt: string, options: {
    openRouterKey?: string;
    geminiKey?: string;
    togetherKey?: string;
    requestedModel?: string;
}): Promise<ImageGenerationResult> {
    const { openRouterKey, geminiKey, togetherKey, requestedModel } = options;
    
    console.log(`[ImageGen] Starting fallback chain for prompt: "${prompt.substring(0, 100)}..."`);
    
    // 1. Try Gemini Native (Primary - High Quality)
    if (geminiKey) {
        console.log(`[ImageGen] Trying Gemini native`);
        const geminiResult = await generateImageWithGemini(prompt, geminiKey);
        if (geminiResult.success) {
            return geminiResult;
        }
        console.warn(`[ImageGen] Gemini failed: ${geminiResult.error}`);
    }

    // 2. Try Together.ai
    if (togetherKey) {
        console.log(`[ImageGen] Trying Together.ai`);
        const togetherResult = await generateImageWithTogether(prompt, togetherKey);
        if (togetherResult.success) {
            return togetherResult;
        }
        console.warn(`[ImageGen] Together.ai failed: ${togetherResult.error}`);
    }

    // 3. Try OpenRouter (Nano Banana - default model)
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
                console.log(`[ImageGen] OpenRouter response:`, JSON.stringify(data).substring(0, 500));

                const messageContent = data.choices?.[0]?.message?.content;
                
                // Handle multimodal responses
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
                    // Check for base64 image in string response
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

    // 4. Try Pollinations.ai (free fallback - last resort)
    console.log(`[ImageGen] Trying Pollinations.ai (free fallback)`);
    const pollinationsResult = await generateImageWithPollinations(prompt);
    if (pollinationsResult.success) {
        return pollinationsResult;
    }
    console.warn(`[ImageGen] Pollinations.ai failed: ${pollinationsResult.error}`);

    // All services failed
    console.error(`[ImageGen] All image generation services failed`);
    return {
        success: false,
        error: 'All image generation services failed'
    };
}

const handler: Handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        let parsedBody;
        try {
            parsedBody = JSON.parse(event.body || "{}");
        } catch (parseError) {
            console.error("Body parse error:", parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Invalid JSON in request body" })
            };
        }

        const { prompt, userId, conversationHistory = [], model: requestedModel, mode } = parsedBody;

        if (!prompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Prompt is required" })
            };
        }

        const openRouterKey = (process.env.PROMPTCORE_NETLIFY_PROD || process.env.OPENROUTER_API_KEY || "").trim();
        const geminiKey = (process.env.LOCAL_GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
        const togetherKey = process.env.TOGETHER_API_KEY;

        const requestedModelLower = requestedModel?.toLowerCase() || 'claude-sonnet-4.5';
        const isMediaGenMode = mode === 'Media Gen';

        console.log(`Execute: mode="${mode}", isMediaGenMode=${isMediaGenMode}`);

        // Initialize Supabase Admin Client for profile checks
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check Credits, Subscription & Trial Limits
        const { data: profile } = await supabase.from('profiles').select('credits, monthly_usage, last_usage_reset, subscription_status, media_gen_uses_monthly').eq('id', userId).single();
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const isDev = userData?.user?.email === 'dev@promptcore.com';

        const status = profile?.subscription_status || 'free';
        const isFree = status === 'free';

        // Check Trial Limits for Free Users on Media Gen
        if (!isDev && isFree && isMediaGenMode) {
            const trialLimit = 10;
            const currentUses = profile?.media_gen_uses_monthly || 0;

            if (currentUses >= trialLimit) {
                console.log(`[Execute] Blocking free user ${userId} - trial limit reached for Media Gen`);
                return { statusCode: 402, headers, body: JSON.stringify({ error: `You've used all ${trialLimit} free uses of Media Gen this month. Upgrade to Lite for unlimited access.` }) };
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

        // Calculate cost for Media Gen (10 credits for free users)
        let baseCost = 5;
        let finalCost = baseCost;
        if (!isDev && isFree) {
            finalCost = baseCost * 2; // 10 credits per use for free users
        }

        // Efficiency Logic (The "Usage Tax")
        const isAboveThreshold = isFree && monthlyUsage > 100;
        if (isAboveThreshold) {
            finalCost = finalCost * 3;
        }

        if (!isDev && currentCredits < finalCost) {
            console.log(`[Execute] User ${userId} has insufficient credits (${currentCredits} < ${finalCost})`);
            return { statusCode: 402, headers, body: JSON.stringify({ error: "Insufficient credits" }) };
        }

        // OpenRouter Implementation
        if (openRouterKey) {
            // For Media Gen mode, always use the image preview model (nano banana)
            const modelMapping: Record<string, string> = {
                'gpt-5': 'openai/gpt-5',
                'gemini-3-pro': 'google/gemini-3-pro-preview',
                'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
                'gemini-3-flash': 'google/gemini-3-flash-preview',
                'nano-banana': 'google/gemini-3-pro-image-preview',
                'dalle-3': 'openai/dall-e-3',
                'midjourney-v6': 'midjourney/mj-v6',
                'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0'
            };

            // Force image preview model for Media Gen mode
            const modelId = isMediaGenMode
                ? 'google/gemini-3-pro-image-preview'
                : (modelMapping[requestedModelLower] || 'anthropic/claude-sonnet-4.5');

            console.log(`OpenRouter: selected "${requestedModel}", mode="${mode}", mapping to "${modelId}"`);

            const messages = [
                ...conversationHistory.map((msg: any) => ({
                    role: msg.role === 'model' ? 'assistant' : 'user',
                    content: msg.content
                })),
                { role: 'user', content: prompt }
            ];

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://promptcore.app',
                    'X-Title': 'PromptCore'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages,
                    max_tokens: 8192,
                    temperature: 0.1 // Lower temperature for more deterministic/faster code generation
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`OpenRouter response structure:`, JSON.stringify(data).substring(0, 500));

                const messageContent = data.choices?.[0]?.message?.content;
                let responseText = "";
                let hasImage = false;

                // Handle multimodal responses (Gemini image model returns array with text and image parts)
                if (Array.isArray(messageContent)) {
                    console.log(`Response is array with ${messageContent.length} parts`);
                    for (const part of messageContent) {
                        if (part.type === 'text') {
                            responseText += part.text;
                        } else if (part.type === 'image_url' && part.image_url?.url) {
                            // Base64 image from OpenRouter/Gemini
                            hasImage = true;
                            responseText += `\n\n![Generated Image](${part.image_url.url})`;
                        } else if (part.image_url?.url) {
                            // Alternative format without type field
                            hasImage = true;
                            responseText += `\n\n![Generated Image](${part.image_url.url})`;
                        } else if (typeof part === 'string') {
                            responseText += part;
                        }
                    }
                } else if (typeof messageContent === 'string') {
                    responseText = messageContent;
                    // Check if the model already included an image (base64 data URL or markdown image)
                    hasImage = responseText.includes('data:image') ||
                        responseText.includes('![') ||
                        responseText.includes('base64');
                } else if (messageContent && typeof messageContent === 'object') {
                    // Handle object response (some models return {text: ..., image: ...})
                    console.log(`Response is object:`, Object.keys(messageContent));
                    responseText = messageContent.text || messageContent.content || JSON.stringify(messageContent);
                    if (messageContent.image || messageContent.image_url) {
                        hasImage = true;
                        const imgUrl = messageContent.image || messageContent.image_url;
                        responseText += `\n\n![Generated Image](${imgUrl})`;
                    }
                } else {
                    responseText = "No response";
                }

                console.log(`Media Gen mode: ${isMediaGenMode}, hasImage: ${hasImage}, responseText length: ${responseText.length}`);

                // If in Media Gen mode and no image was returned by the model, use fallback
                if (isMediaGenMode && !hasImage) {
                    let imagePrompt = prompt;

                    try {
                        const jsonPrompt = JSON.parse(prompt);
                        imagePrompt = jsonPrompt.prompt || jsonPrompt.description || prompt;
                    } catch (e) { }

                    // Clean prompt for image generation
                    const cleanPrompt = imagePrompt
                        .replace(/[{}[\]"']/g, '') // Remove JSON-like characters
                        .replace(/\s+/g, ' ')      // Normalize whitespace
                        .trim()
                        .substring(0, 500);

                    if (!responseText || responseText === "No response") {
                        responseText = "### 🎨 Visualizing Your Request\nGenerating a high-quality visualization based on your optimized prompt...";
                    }

                    // Use the new fallback chain function
                    console.log(`[OpenRouter path] Attempting image generation with fallback chain...`);
                    const imageResult = await generateImageWithFallback(cleanPrompt, {
                        openRouterKey,
                        geminiKey,
                        togetherKey,
                        requestedModel
                    });

                    if (imageResult.success && imageResult.imageUrl) {
                        console.log(`[OpenRouter path] Image generation successful via ${imageResult.service}, URL length: ${imageResult.imageUrl.length}`);
                        
                        // For base64 images, use special markers to avoid ReactMarkdown issues
                        if (imageResult.imageUrl.startsWith('data:')) {
                            responseText += `\n\n<!-- IMAGE_DATA_START -->\n${imageResult.imageUrl}\n<!-- IMAGE_DATA_END -->`;
                        } else {
                            // For URL-based images (Pollinations.ai), use markdown
                            responseText += `\n\n![Generated Image](${imageResult.imageUrl})`;
                        }
                        console.log(`Total response text length: ${responseText.length}`);
                    } else {
                        console.log(`[OpenRouter path] All image generation methods failed: ${imageResult.error}`);
                        responseText += `\n\n*Image generation failed: ${imageResult.error || 'Unknown error'}.*`;
                    }

                    // Track Media Gen usage for free users
                    if (!isDev && isFree && isMediaGenMode) {
                        await supabase
                            .from('profiles')
                            .update({
                                media_gen_uses_monthly: (profile?.media_gen_uses_monthly || 0) + 1
                            })
                            .eq('id', userId);
                    }
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ text: responseText, model: modelId }),
                };
            }
            const errText = await response.text();
            console.warn(`OpenRouter failed (falling back to Gemini): ${errText}`);
        }

        // Gemini Fallback
        if (!geminiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "No API keys configured" })
            };
        }

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);

        // For Media Gen mode, use image-capable model
        const geminiModelMapping: Record<string, string> = {
            'gemini-3-pro': 'gemini-3-pro-preview',
            'gemini-3-flash': 'gemini-3-flash-preview',
            'gpt-5': 'gemini-3-pro-preview',
            'claude-sonnet-4.5': 'gemini-3-pro-preview'
        };

        // Use image preview model for Media Gen mode
        const geminiModel = isMediaGenMode
            ? 'gemini-3-pro-image-preview'
            : (geminiModelMapping[requestedModelLower] || 'gemini-3-pro-preview');

        console.log(`Gemini Fallback: selected "${requestedModel}", mode="${mode}", mapping to "${geminiModel}"`);

        const systemInstruction = isMediaGenMode
            ? "You are an expert image generation assistant. Generate detailed, creative image descriptions based on the user's prompt. Format your response as a detailed image generation prompt that can be used with AI image generators like Midjourney, DALL-E, or Stable Diffusion."
            : "You are a helpful AI assistant. Execute the user's prompt directly.";

        const model = genAI.getGenerativeModel({
            model: geminiModel,
            systemInstruction: systemInstruction
        });

        const history = (conversationHistory || [])
            .filter((msg: any) => msg && msg.content)
            .map((msg: any) => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);
        let responseText = result.response.text();

        // If in Media Gen mode and no image is already present, generate one
        if (isMediaGenMode && !responseText.includes('![') && !responseText.includes('<img') && !responseText.includes('data:image')) {
            let imagePrompt = prompt;

            try {
                const jsonPrompt = JSON.parse(prompt);
                imagePrompt = jsonPrompt.prompt || jsonPrompt.description || prompt;
            } catch (e) { }

            // Clean prompt for image generation
            const cleanPrompt = imagePrompt
                .replace(/[{}[\]"']/g, '') // Remove JSON-like characters
                .replace(/\s+/g, ' ')      // Normalize whitespace
                .trim()
                .substring(0, 500);

            if (responseText === "" || responseText === "No response") {
                responseText = "### 🎨 Visualizing Your Request\nGenerating a high-quality visualization based on your optimized prompt...";
            }

            // Use the new fallback chain function
            console.log(`[Gemini path] Attempting image generation with fallback chain...`);
            const imageResult = await generateImageWithFallback(cleanPrompt, {
                openRouterKey,
                geminiKey,
                togetherKey,
                requestedModel
            });

            if (imageResult.success && imageResult.imageUrl) {
                console.log(`[Gemini path] Image generation successful via ${imageResult.service}`);
                
                // For base64 images, use special markers to avoid ReactMarkdown issues
                if (imageResult.imageUrl.startsWith('data:')) {
                    responseText += `\n\n<!-- IMAGE_DATA_START -->\n${imageResult.imageUrl}\n<!-- IMAGE_DATA_END -->`;
                } else {
                    // For URL-based images (Pollinations.ai), use markdown
                    responseText += `\n\n![Generated Image](${imageResult.imageUrl})`;
                }
            } else {
                console.log(`[Gemini path] All image generation methods failed: ${imageResult.error}`);
                responseText += `\n\n*Image generation failed: ${imageResult.error || 'Unknown error'}.*`;
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ text: responseText, model: geminiModel }),
        };

    } catch (err: any) {
        console.error("Execute Error:", err);
        console.error("Error stack:", err.stack);

        // Provide more specific error messages
        let errorMessage = "Execution failed";
        if (err.message?.includes("API key")) {
            errorMessage = "Invalid API key. Please check your Gemini API key configuration.";
        } else if (err.message?.includes("quota")) {
            errorMessage = "API quota exceeded. Please try again later or upgrade your plan.";
        } else if (err.message?.includes("model")) {
            errorMessage = "Model not available. Please try a different model.";
        } else if (err.message) {
            errorMessage = err.message;
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};

export { handler };

