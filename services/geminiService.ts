import { GoogleGenAI, Type } from "@google/genai";
import { AppMode, Message } from "../types";

// In a real app, this would be securely handled. 
// We assume process.env.API_KEY is available as per instructions.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTIONS: Record<AppMode, string> = {
  [AppMode.EVERYDAY]: `You are PromptCore's Everyday Assistant. Optimize for clarity, helpfulness, and concise answers. Be friendly but professional.`,
  
  [AppMode.VIBE_CODE]: `You are PromptCore's Vibe Code Assistant. You are an expert Full-Stack Engineer.
  1. If the user's request is vague (e.g., "Make it look better"), ask a clarifying question: "Is this a Style (CSS) issue or Logic (JS/Structure) issue?" before generating code.
  2. If the request is clear, generate clean, modern code (React/Tailwind preferred unless specified otherwise).
  3. Explain your changes briefly.`,
  
  [AppMode.MEDIA_GEN]: `You are PromptCore's Media Gen Assistant.
  1. Your goal is to help users generate prompts for other AI tools (Midjourney, Suno, Runway, etc.).
  2. RETURN A DUAL RESPONSE:
     - Part 1: A plain English explanation of the artistic direction.
     - Part 2: A strictly formatted code block containing the prompt string (e.g., /imagine prompt: ...).`,
  
  [AppMode.TALK_TO_SOURCE]: `You are PromptCore's Source Analyst. 
  (Note: The actual vector retrieval is simulated in this frontend demo).
  Answer questions based on the context provided by the user or general knowledge if no context is injected.
  Assume the user is asking about the document or video they have linked.`
};

export const sendMessageToGemini = async (
  history: Message[],
  currentMessage: string,
  mode: AppMode
): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key is missing. Please check your configuration.";
  }

  try {
    const systemInstruction = SYSTEM_INSTRUCTIONS[mode];

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
        history: history.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            parts: [{ text: m.content }],
        }))
    });

    const result = await chat.sendMessage({
        message: currentMessage
    });

    return result.text || "No response generated.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error communicating with the AI service.";
  }
};

// --- Factory Services ---

export const generateFactoryAngles = async (topic: string, count: number): Promise<string[]> => {
    if (!apiKey) return ["General", "Creative", "Technical"];
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `I need to generate ${count} items about "${topic}". 
            To ensure variety, break this into ${Math.ceil(count / 5)} distinct "angles" or "styles" or "sub-categories".
            Return ONLY a JSON array of strings. Example: ["Beginner-friendly", "Advanced techniques"]`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        return JSON.parse(response.text || '[]');
    } catch (e) {
        console.error("Angle Gen Error", e);
        return ["Overview", "Deep Dive", "Tips & Tricks"];
    }
}

export const generateBatchItems = async (topic: string, angle: string, count: number): Promise<string[]> => {
    if (!apiKey) return Array(count).fill(`Mock item about ${topic} (${angle})`);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a list of exactly ${count} items about "${topic}".
            Focus strictly on this angle/style: "${angle}".
            Return ONLY a JSON array of strings containing the content.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        return JSON.parse(response.text || '[]');
    } catch (e) {
        console.error("Batch Gen Error", e);
        return [`Error generating batch for ${angle}`];
    }
}