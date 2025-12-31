
import { GoogleGenAI, Type } from "@google/genai";
import { AppMode, Message, BatchItem } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY}); for initialization
const geminiKey = (
    import.meta.env?.VITE_GEMINI_API_KEY ||
    import.meta.env?.VITE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    ""
).trim();

const ai = new GoogleGenAI({ apiKey: geminiKey });

// Ported from Python Script: "CONSUMER-FIRST" Brain
const MASTER_FACTORY_SYSTEM_PROMPT = `
You are 'PromptCore', the world's best AI curriculum designer. Your goal is to build helpful, high-value prompt assets for everyday users (B2C) and professionals (B2B).

THE OBJECTIVE:
You must generate a structured AI Prompt Pack based on the User's Request.

THE 4 "MODES" YOU MUST ADAPT TO:
1. "Curriculum Mode" (e.g., Learn Spanish): Break the goal into steps. The prompt should act as a tutor.
2. "Task Mode" (e.g., Meal Prep): The prompt should act as a logistics manager (lists, schedules).
3. "Creative Mode" (e.g., Write a Novel): The prompt should act as a muse or editor.
4. "Expert Mode" (e.g., Python Coding): The prompt should be technical, precise, and code-heavy.

EXAMPLES OF ELITE PROMPTS:
Example 1 (Meal Prep): "Title: The 30-Minute Meal Planner. Prompt: Act as a logistics manager. Given [Ingredients], create a [Time Constraint] schedule that minimizes dishes..."
Example 2 (Learning): "Title: The Socratic Spanish Tutor. Prompt: Act as a language tutor. Instead of translating, ask me questions in Spanish about [Topic] and correct my grammar only when I fail to communicate..."

QUALITY RULES:
- No "AI fluff" (e.g., "Unleash your potential", "Dive deep").
- Prompts must be actionable immediately.
- If the difficulty is "Beginner", use simple language.
- If the difficulty is "Advanced", use technical jargon appropriate for the niche.
`;

const SYSTEM_INSTRUCTIONS: Record<AppMode, string> = {
    [AppMode.EVERYDAY]: `You are PromptCore's Everyday Assistant. Optimize for clarity, helpfulness, and concise answers. Be friendly but professional.`,
    [AppMode.VIBE_CODE]: `You are PromptCore's Vibe Code Assistant. Expert Full-Stack Engineer.React/Tailwind focus.`,
    [AppMode.MEDIA_GEN]: `You are PromptCore's Media Gen Assistant. Help generate prompts for Midjourney/Suno. Part 1: Direction. Part 2: Prompt Code Block.`,
    [AppMode.TALK_TO_SOURCE]: `You are PromptCore's Source Analyst. Answer based on documents provided.`
};

export const sendMessageToGemini = async (
    history: Message[],
    currentMessage: string,
    mode: AppMode
): Promise<string> => {
    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction: SYSTEM_INSTRUCTIONS[mode] },
            history: history.filter(m => m.role !== 'system').map(m => ({
                role: m.role,
                parts: [{ text: m.content }],
            }))
        });
        const result = await chat.sendMessage({ message: currentMessage });
        return result.text || "No response generated.";
    } catch (error) {
        console.error(error);
        return "Sorry, I encountered an error.";
    }
};

// --- Consumer Factory Services (Ported Logic) ---

export const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const STYLES = ["Strict & Organized", "Creative & Loose", "Step-by-Step Tutor", "Socratic Method"];

export const generateFactoryAngles = async (topic: string, count: number): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Identify ${Math.ceil(count / 5)} distinct "angles" for the niche "${topic}". (e.g., "Parenting", "Career", "Hobbies"). Return JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return ["Overview", "Deep Dive", "Tips & Tricks"];
    }
}

export const generateBatchItems = async (topic: string, angle: string, count: number): Promise<BatchItem[]> => {
    const items: BatchItem[] = [];

    for (let i = 0; i < count; i++) {
        const diff = DIFFICULTY_LEVELS[Math.floor(Math.random() * DIFFICULTY_LEVELS.length)] as any;
        const style = STYLES[Math.floor(Math.random() * STYLES.length)];

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Generate one unique prompt for the niche '${topic}'. Specific Angle: ${angle}. Target Audience: ${diff}. Tone/Style: ${style}.`,
                config: {
                    systemInstruction: MASTER_FACTORY_SYSTEM_PROMPT,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            category: { type: Type.STRING },
                            difficulty: { type: Type.STRING },
                            description: { type: Type.STRING },
                            prompt_content: { type: Type.STRING },
                            usage_guide: { type: Type.STRING },
                        },
                        required: ["title", "category", "difficulty", "description", "prompt_content", "usage_guide"]
                    }
                }
            });

            const data = JSON.parse(response.text || '{}');
            items.push({
                id: Math.random().toString(36).substr(2, 9),
                title: data.title || 'Untitled Prompt',
                category: data.category || angle,
                difficulty: data.difficulty || diff,
                description: data.description || '',
                prompt_content: data.prompt_content || '',
                usage_guide: data.usage_guide || '',
                style_var: style
            });
        } catch (e) {
            console.error("Single item gen error", e);
        }
    }
    return items;
}
