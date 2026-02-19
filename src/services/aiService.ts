import { Alert } from 'react-native';

// Google Gemini API Key
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
// Using 'gemini-1.5-pro' for maximum stability and capability as requested
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;

export type ChatMessage = {
    id: string;
    role: 'user' | 'model' | 'system';
    text: string;
    imageUri?: string; // Added image support
    timestamp: Date;
};

const SYSTEM_PROMPT = `
You are Amba, a compassionate and supportive AI safety companion.
Your goal is to provide emotional support, safety advice, and guidance to users who might be feeling anxious, unsafe, or just need someone to talk to.
- Be empathetic, calm, and reassuring.
- Keep responses concise and easy to read on a mobile screen (1-3 sentences usually).
- If the user sends an image, analyze it for safety risks or provide relevant advice based on what you see.
- If the user is in immediate danger, advise them to call emergency services or use the SOS button immediately.
- Do not provide medical or legal advice, but offer general supportive information.
`;

// Helper: Convert Image URI to Base64
const uriToBase64 = async (uri: string): Promise<string> => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                // Remove the "data:image/jpeg;base64," part
                resolve(base64data.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Base64 conversion failed:", error);
        throw error;
    }
};

export const getWellnessResponse = async (
    history: { role: string; parts: { text: string }[] }[],
    newMessage: string,
    imageUri?: string
): Promise<string> => {
    if (!GEMINI_API_KEY) {
        console.warn("Gemini API Key missing");
        return new Promise(resolve => setTimeout(() => {
            resolve("I'm here for you. (Demo: Configure EXPO_PUBLIC_GEMINI_API_KEY to chat with real AI)");
        }, 1000));
    }

    try {
        // Construct the request body for Gemini
        const contents = history.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }));

        // Add the new message
        const newParts: any[] = [{ text: newMessage }];

        // If there's an image, convert to base64 and add to parts
        if (imageUri) {
            const base64Image = await uriToBase64(imageUri);
            newParts.push({
                inline_data: {
                    mime_type: "image/jpeg", // Assuming JPEG for simplicity from picker
                    data: base64Image
                }
            });
        }

        const currentMessage = {
            role: 'user',
            parts: newParts
        };

        // Note: Gemini doesn't support 'system' role in 'contents' directly in the same way as OpenAI 'messages'.
        // It uses 'system_instruction' field or we can prepend it to the first user message or history.
        // For simplicity and best results with Flash model, we'll prepend system prompt instructions to the context or use system_instruction if available in v1beta.
        // v1beta supports system_instruction.

        const requestBody = {
            contents: [...contents, currentMessage],
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200,
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error);
            throw new Error(data.error.message || "API Error");
        }

        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return botResponse || "I'm having trouble seeing that right now.";

    } catch (error) {
        console.error("Gemini Service Error:", error);
        return "I'm having trouble connecting right now. Please try again.";
    }
};
