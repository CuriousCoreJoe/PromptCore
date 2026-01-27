
import { Handler } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

// Image generation service types (copied from execute.ts)
type ImageService = 'openrouter' | 'gemini' | 'together' | 'pollinations';

interface ImageGenerationResult {
    success: boolean;
    imageUrl?: string;
    service?: ImageService;
    error?: string;
}

// ... (Helper functions will be imported or duplicated. Since we can't easily import from sibling files in Netlify Functions without build steps, I will duplicate the helper functions here for stability)

// Helper function to generate image using Pollinations.ai
async function generateImageWithPollinations(prompt: string): Promise<ImageGenerationResult> {
    try {
        console.log(`[Pollinations.ai] Generating image with prompt: "${prompt.substring(0, 100)}..."`);
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

        const response = await fetch(imageUrl);

        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:image/jpeg;base64,${base64}`;

            return { success: true, imageUrl: dataUrl, service: 'pollinations' };
        } else {
            return { success: true, imageUrl: imageUrl, service: 'pollinations' };
        }
    } catch (err: any) {
        return { success: false, service: 'pollinations', error: err.message };
    }
}

// Helper function to generate image using Together.ai
async function generateImageWithTogether(prompt: string, togetherKey?: string): Promise<ImageGenerationResult> {
    if (!togetherKey) return { success: false, service: 'together', error: 'No Together.ai API key' };
    try {
        const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${togetherKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell',
                prompt: prompt,
                width: 1024,
                height: 1024,
                n: 1,
                response_format: 'b64_json',
                steps: 4
            })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.data?.[0]?.b64_json) {
                const imageUrl = `data:image/png;base64,${data.data[0].b64_json.replace(/\s/g, '')}`;
                return { success: true, imageUrl: imageUrl, service: 'together' };
            }
        }
        return { success: false, service: 'together', error: `API status: ${response.status}` };
    } catch (err: any) {
        return { success: false, service: 'together', error: err.message };
    }
}

// Helper function to generate image using Gemini
async function generateImageWithGemini(prompt: string, geminiKey: string): Promise<ImageGenerationResult> {
    if (!geminiKey) return { success: false, service: 'gemini', error: 'No Gemini API key' };
    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001", generationConfig: { responseModalities: ["image", "text"] } });

        const result = await model.generateContent(`Generate an image: ${prompt}`);
        const response = result.response;

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.mimeType?.startsWith('image/')) {
                    return {
                        success: true,
                        imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data.replace(/\s/g, '')}`,
                        service: 'gemini'
                    };
                }
            }
        }
        return { success: false, service: 'gemini', error: 'No image data' };
    } catch (err: any) {
        return { success: false, service: 'gemini', error: err.message };
    }
}

// Main image generation fallback chain
async function generateImageWithFallback(prompt: string, options: any): Promise<ImageGenerationResult> {
    const { openRouterKey, geminiKey, togetherKey } = options;

    if (geminiKey) {
        const res = await generateImageWithGemini(prompt, geminiKey);
        if (res.success) return res;
    }
    if (togetherKey) {
        const res = await generateImageWithTogether(prompt, togetherKey);
        if (res.success) return res;
    }
    if (openRouterKey) {
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
                    model: 'google/gemini-3-pro-image-preview',
                    messages: [{ role: 'user', content: `Generate an image: ${prompt}` }],
                    max_tokens: 8192,
                    temperature: 0.1
                })
            });
            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                // Simple check for now
                if (typeof content === 'string' && content.includes('data:image')) {
                    const match = content.match(/data:image\/[^;]+;base64,([^\s"]+)/);
                    if (match) return { success: true, imageUrl: match[0], service: 'openrouter' };
                }
            }
        } catch (e) { }
    }

    return await generateImageWithPollinations(prompt);
}


const handler: Handler = async (event, context) => {
    // Background functions return 202 immediately
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body || "{}");
        // Required: prompt, chatId, userId
        const { prompt, chatId, userId, conversationHistory = [], model: requestedModel, mode } = payload;

        if (!prompt || !chatId || !userId) {
            return { statusCode: 400, body: "Missing required fields" };
        }

        console.log(`[Execute Background] Starting job for chat ${chatId}, mode=${mode}`);

        // Initialize Supabase
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check Credits / Limits
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const isDev = userData?.user?.email === 'dev@promptcore.com';
        const isFree = (profile?.subscription_status || 'free') === 'free';
        const isMediaGenMode = mode === 'Media Gen';

        if (!isDev && isFree && isMediaGenMode) {
            if ((profile?.media_gen_uses_monthly || 0) >= 10) {
                return { statusCode: 402, body: "Media Gen trial limit reached" };
            }
        }

        let currentCredits = profile?.credits || 0;
        let monthlyUsage = profile?.monthly_usage || 0;

        // Cost calc
        let baseCost = 5;
        let finalCost = (!isDev && isFree) ? baseCost * 2 : baseCost;
        if (isFree && monthlyUsage > 100) finalCost *= 3;

        if (!isDev && currentCredits < finalCost) {
            return { statusCode: 402, body: "Insufficient credits" };
        }

        // 2. Insert Initial "Processing" Message
        let initialMessageContent = '⚙️ **Executing Prompt...**\n\nI am running your request. This may take a moment...';

        if (mode === 'Talk to Source') {
            initialMessageContent = '📚 **Analyzing Source...**\n\nI am reading through your documents to extract the requested information. This process involves deep context analysis and may take a moment.';
        } else if (mode === 'Everyday') {
            initialMessageContent = '🧠 **Thinking...**\n\nI am analyzing your request and formulating the best possible response.';
        } else if (mode === 'Vibe Code') {
            // Although Vibe Code uses builder-background usually, if it falls back here:
            initialMessageContent = '🏗️ **Building your application...**\n\nThis may take up to a minute for complex architectures.';
        } else if (mode === 'Media Gen') {
            initialMessageContent = '🎨 **Designing Media...**\n\nI am analyzing your request to create the perfect prompt and parameters for generation.';
        }

        const messageId = crypto.randomUUID();
        const { error: insertError } = await supabase.from('messages').insert({
            id: messageId,
            chat_id: chatId,
            role: 'model',
            content: initialMessageContent,
            status: 'processing',
            msg_type: 'execution_result',
            execution_model: requestedModel,
            metadata: {
                startTime: Date.now(),
                jobType: 'execute-background'
            }
        });

        if (insertError) {
            console.error("Failed to insert initial message:", insertError);
            return { statusCode: 500, body: "Database error" };
        }

        // 3. EXECUTE AI LOGIC (Simulating the synchronous logic but async)
        const openRouterKey = (process.env.PROMPTCORE_NETLIFY_PROD || process.env.OPENROUTER_API_KEY || "").trim();
        const geminiKey = (process.env.LOCAL_GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
        const togetherKey = process.env.TOGETHER_API_KEY;

        const performExecution = async () => {
            try {
                // ... Copy logic from execute.ts mostly ...
                // OpenRouter Implementation
                if (openRouterKey) {
                    const modelMapping: Record<string, string> = {
                        'gpt-5': 'openai/gpt-5', // Fallback
                        'chatgpt-5': 'openai/gpt-5', // New mapping
                        'google/gemini-3-pro-preview': 'google/gemini-3-pro-preview',
                        'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
                        'gemini-3-flash': 'google/gemini-3-flash-preview',
                        'nano-banana': 'google/gemini-3-pro-image-preview',
                    };

                    const modelId = isMediaGenMode
                        ? (requestedModel === 'chatgpt-5' ? 'openai/dall-e-3' : 'google/gemini-3-pro-image-preview')
                        : (modelMapping[requestedModel?.toLowerCase()] || 'anthropic/claude-sonnet-4.5');

                    // If Flux 2 requested and together key exists, prioritize it (Image Gen)
                    if (isMediaGenMode && (requestedModel === 'flux' || requestedModel === 'Flux 2') && togetherKey) {
                        const imageResult = await generateImageWithTogether(prompt, togetherKey);
                        let responseText = "### 🎨 Visualizing...";
                        if (imageResult.success && imageResult.imageUrl) {
                            responseText += `\n\n<!-- IMAGE_DATA_START -->\n${imageResult.imageUrl}\n<!-- IMAGE_DATA_END -->`;
                            await supabase.from('messages').update({
                                content: responseText, status: 'completed', metadata: { duration: Date.now() - Date.now(), service: 'together' }
                            }).eq('id', messageId);
                            return; // Done
                        }
                    }

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
                            'HTTP-Referer': 'https://promptorigin.app',
                            'X-Title': 'PromptOrigin'
                        },
                        body: JSON.stringify({
                            model: modelId,
                            messages: messages,
                            max_tokens: 8192,
                            temperature: 0.1
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        let responseText = "";
                        const messageContent = data.choices?.[0]?.message?.content;
                        let hasImage = false;

                        if (Array.isArray(messageContent)) {
                            for (const part of messageContent) {
                                if (part.type === 'text') responseText += part.text;
                                else if (part.image_url?.url) {
                                    hasImage = true;
                                    responseText += `\n\n![Generated Image](${part.image_url.url})`;
                                }
                            }
                        } else if (typeof messageContent === 'string') {
                            responseText = messageContent;
                            hasImage = responseText.includes('data:image') || responseText.includes('![');
                        }

                        // Media Gen Fallback
                        if (isMediaGenMode && !hasImage) {
                            if (!responseText) responseText = "### 🎨 Visualizing...";
                            const imageResult = await generateImageWithFallback(prompt.substring(0, 500), { openRouterKey, geminiKey, togetherKey });
                            if (imageResult.success && imageResult.imageUrl) {
                                responseText += `\n\n<!-- IMAGE_DATA_START -->\n${imageResult.imageUrl}\n<!-- IMAGE_DATA_END -->`;
                            } else {
                                responseText += `\n\n*Image generation failed.*`;
                            }
                        }

                        // Update Message
                        await supabase.from('messages').update({
                            content: responseText || "No content generated",
                            status: 'completed',
                            metadata: { duration: Date.now() - Date.now(), model: modelId }
                        }).eq('id', messageId);

                        // Deduct Credits
                        if (!isDev) {
                            const updateData: any = {
                                credits: Math.max(0, currentCredits - finalCost),
                                monthly_usage: monthlyUsage + finalCost
                            };
                            if (isFree && isMediaGenMode) {
                                updateData.media_gen_uses_monthly = (profile?.media_gen_uses_monthly || 0) + 1;
                            }
                            await supabase.from('profiles').update(updateData).eq('id', userId);
                        }
                        return;
                    }
                }

                // Gemini Fallback (Simplified for brevity)
                if (geminiKey) {
                    const { GoogleGenerativeAI } = require("@google/generative-ai");
                    const genAI = new GoogleGenerativeAI(geminiKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });
                    const result = await model.generateContent(prompt);
                    const responseText = result.response.text();

                    await supabase.from('messages').update({
                        content: responseText,
                        status: 'completed'
                    }).eq('id', messageId);
                } else {
                    throw new Error("No available providers");
                }

            } catch (err: any) {
                console.error("Execution Failed:", err);
                await supabase.from('messages').update({
                    content: `### ❌ Execution Failed\n\nError: ${err.message}`,
                    status: 'failed'
                }).eq('id', messageId);
            }
        };

        // Trigger execution without awaiting
        performExecution();

    } catch (err) {
        console.error("Handler Error:", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }

    return { statusCode: 202, body: "Accepted" };
};

export { handler };
