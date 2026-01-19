import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Player, PracticePlan, Drill } from "../types";

const drillSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the drill or exercise" },
    duration: { type: Type.STRING, description: "Duration or Sets/Reps (e.g. '10 mins' or '3x10 reps')" },
    category: { type: Type.STRING, description: "Category: 'Pool Conditioning', 'Dryland / Weights', 'Drill', 'Tactic', etc." },
    description: { type: Type.STRING, description: "Step-by-step instructions" },
    focus: { type: Type.STRING, description: "What specifically this improves" },
    difficulty: { type: Type.STRING, enum: ["Beginner", "Intermediate", "Advanced"] },
  },
  required: ["name", "duration", "category", "description", "focus", "difficulty"],
};

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Creative title for the session" },
    summary: { type: Type.STRING, description: "Brief overview of the goals" },
    drills: {
      type: Type.ARRAY,
      items: drillSchema,
    },
  },
  required: ["title", "summary", "drills"],
};

export const generatePracticePlan = async (
  players: Player[],
  mode: 'team' | 'individual' | 'conditioning' | 'recovery' | 'custom',
  focusPlayers?: Player[],
  contextString?: string,
  severity?: number
): Promise<PracticePlan | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    let systemInstruction = `You are a world-class Water Polo coach designed to create high-performance practice plans. You have access to a roster of players with skill ratings from 1 (poor) to 5 (elite).`;

    const serializedRoster = JSON.stringify(players.map(p => ({
      name: p.name,
      position: p.position,
      skills: p.skills,
      custom_skills: p.customSkills
    })), null, 2);

    let prompt = "";

    if (mode === 'custom' && contextString) {
      prompt = `
        The coach has given a specific command: "${contextString}"
        Using the following team roster as context, generate a training session that follows the coach's command exactly.
        Team Roster Data: ${serializedRoster}
        Requirements:
        1. Prioritize the specific drills or focus areas requested in the command.
        2. Adjust the difficulty of the drills based on the team's skill levels.
        3. Provide a creative title and summary for this custom session.
      `;
    } else if (mode === 'recovery' && contextString) {
      const playerName = focusPlayers && focusPlayers.length > 0 ? focusPlayers[0].name : "the athlete";
      prompt = `Create a Recovery plan for ${playerName}. Issue: ${contextString}. Severity: ${severity}/10. Use categories: 'Rehab', 'Mobility', or 'Pool Recovery'.`;
    } else if (mode === 'conditioning' && focusPlayers && focusPlayers.length > 0) {
      prompt = `Create conditioning sets for ${focusPlayers.map(p => p.name).join(', ')}. Split into exactly 'Pool Conditioning' and 'Dryland / Weights'.`;
    } else if (mode === 'individual' && focusPlayers && focusPlayers.length > 0) {
      prompt = `Create a personalized practice plan for ${focusPlayers.map(p => p.name).join(', ')} based on their profiles.`;
    } else {
      prompt = `Create a 2-hour TEAM practice plan for this roster: ${serializedRoster}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: planSchema,
      },
    });

    return JSON.parse(response.text) as PracticePlan;
  } catch (error) {
    console.error("Error generating plan:", error);
    return null;
  }
};

export const askCoachQuestion = async (plan: PracticePlan, question: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are the Water Polo head coach. You just generated this practice plan: ${JSON.stringify(plan)}
        The athlete/coach has a question: "${question}"
        Provide a detailed, helpful explanation. If they ask 'what is [drill]' or 'how to do [drill]', explain the technique clearly. 
        Keep the tone professional yet encouraging.
      `,
    });
    return response.text || "I'm not sure, let's stick to the plan!";
  } catch (err) {
    return "Error communicating with the coach.";
  }
};

export const generateAdditionalDrill = async (plan: PracticePlan, type: 'warmup' | 'finisher' | 'skill' | 'extra'): Promise<Drill | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are the Water Polo head coach. Current plan: ${JSON.stringify(plan)}
      The user requested an additional ${type} exercise that fits perfectly with this specific session.
      Generate ONE high-quality drill in JSON format that matches the intensity and goal of the current plan.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: drillSchema,
      },
    });

    return JSON.parse(response.text) as Drill;
  } catch (err) {
    console.error("Error generating extra drill", err);
    return null;
  }
};
