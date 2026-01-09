import { Handler } from "@netlify/functions";

// Helper function to generate image using Together.ai (free FLUX model)
async function generateImageWithTogether(prompt: string, togetherKey?: string): Promise<string | null> {
    if (!togetherKey) return null;

    try {
        const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${togetherKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell-Free',
                prompt: prompt,
                width: 1024,
                height: 1024,
                n: 1,
                response_format: 'b64_json'
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data?.[0]?.b64_json) {
                return `data:image/png;base64,${data.data[0].b64_json}`;
            }
        }
        console.warn('Together.ai image generation failed:', await response.text());
    } catch (err) {
        console.warn('Together.ai error:', err);
    }
    return null;
}

// Helper function to generate image using Google's Imagen via Gemini SDK
async function generateImageWithGemini(prompt: string, geminiKey: string): Promise<string | null> {
    if (!geminiKey) return null;

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);

        // Use gemini-2.0-flash-exp-image-generation for image output
        // Alternative models: gemini-2.0-flash-exp, imagen-3.0-generate-001
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            generationConfig: {
                responseModalities: ["image", "text"],
            }
        });

        // Request image generation
        console.log(`Calling Gemini image generation with model: gemini-2.0-flash-exp-image-generation`);
        const result = await model.generateContent(`Generate an image: ${prompt}`);

        const response = result.response;
        console.log(`Gemini response structure:`, JSON.stringify(response).substring(0, 500));

        // Check for inline image data in the response
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                console.log(`Part keys: ${Object.keys(part).join(', ')}`);

                if (part.inlineData?.mimeType?.startsWith('image/')) {
                    const base64 = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType;

                    // Debug: Log base64 data info
                    console.log(`Gemini generated image with mimeType: ${mimeType}`);
                    console.log(`Base64 data length: ${base64?.length || 0} chars`);

                    // Validate base64 data
                    if (!base64 || base64.length === 0) {
                        console.warn('Gemini returned empty base64 data');
                        continue;
                    }

                    // Clean base64 - remove any whitespace/newlines
                    const cleanBase64 = base64.replace(/\s/g, '');
                    console.log(`Clean base64 length: ${cleanBase64.length} chars`);

                    // Check if data is too large (Netlify has ~6MB limit)
                    const dataUrl = `data:${mimeType};base64,${cleanBase64}`;
                    console.log(`Final data URL length: ${dataUrl.length} chars`);

                    if (dataUrl.length > 5000000) {
                        console.warn(`Image too large (${dataUrl.length} chars), may be truncated`);
                    }

                    return dataUrl;
                } else if (part.text) {
                    console.log(`Part has text: ${part.text.substring(0, 100)}...`);
                }
            }
        }

        console.warn('Gemini did not return image data in response');
    } catch (err: any) {
        console.warn('Gemini image generation error:', err.message);
        console.warn('Error stack:', err.stack);
    }
    return null;
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

        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const geminiKey = (process.env.LOCAL_GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
        const togetherKey = process.env.TOGETHER_API_KEY;

        const requestedModelLower = requestedModel?.toLowerCase() || 'claude-sonnet-4.5';
        const isMediaGenMode = mode === 'Media Gen';

        console.log(`Execute: mode="${mode}", isMediaGenMode=${isMediaGenMode}`);

        // OpenRouter Implementation
        if (openRouterKey) {
            // For Media Gen mode, always use the image preview model (nano banana)
            const modelMapping: Record<string, string> = {
                'gpt-5': 'openai/gpt-5',
                'gemini-3-pro': 'google/gemini-3-pro-preview',
                'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
                'gemini-3-flash': 'google/gemini-3-flash-preview',
                'nano-banana': 'google/gemini-3-pro-image-preview'
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

                    // Try image generation in order: Gemini native -> Together.ai -> fallback message
                    console.log(`Attempting image generation with Gemini (gemini-2.0-flash-exp)...`);
                    const geminiImage = await generateImageWithGemini(cleanPrompt, geminiKey);

                    if (geminiImage) {
                        console.log(`Gemini generated image successfully, data URL length: ${geminiImage.length}`);
                        // Don't embed huge base64 in markdown - it breaks ReactMarkdown
                        // Instead, use a placeholder that we'll replace on the client
                        responseText += `\n\n<!-- IMAGE_DATA_START -->\n${geminiImage}\n<!-- IMAGE_DATA_END -->`;
                        console.log(`Total response text length: ${responseText.length}`);
                    } else {
                        console.log(`Gemini image gen failed, trying Together.ai...`);
                        const togetherImage = await generateImageWithTogether(cleanPrompt, togetherKey);

                        if (togetherImage) {
                            console.log(`Together.ai generated image successfully`);
                            responseText += `\n\n![Generated Image](${togetherImage})`;
                        } else {
                            console.log(`All image generation methods failed`);
                            responseText += `\n\n*Image generation failed. You can use the prompt above with external tools like Midjourney, DALL-E, or Stable Diffusion.*`;
                        }
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

            // Try image generation in order: Gemini native -> Together.ai -> fallback message
            console.log(`[Gemini path] Attempting image generation with Gemini (gemini-2.0-flash-exp)...`);
            const geminiImage = await generateImageWithGemini(cleanPrompt, geminiKey);

            if (geminiImage) {
                console.log(`[Gemini path] Gemini generated image successfully`);
                responseText += `\n\n![Generated Image](${geminiImage})`;
            } else {
                console.log(`[Gemini path] Gemini image gen failed, trying Together.ai...`);
                const togetherImage = await generateImageWithTogether(cleanPrompt, togetherKey);

                if (togetherImage) {
                    console.log(`[Gemini path] Together.ai generated image successfully`);
                    responseText += `\n\n![Generated Image](${togetherImage})`;
                } else {
                    console.log(`[Gemini path] All image generation methods failed`);
                    responseText += `\n\n*Image generation failed. You can use the prompt above with external tools like Midjourney, DALL-E, or Stable Diffusion.*`;
                }
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

