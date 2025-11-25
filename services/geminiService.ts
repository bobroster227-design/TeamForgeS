import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Player, PracticePlan, SkillLevel } from "../types";

const drillSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the drill or exercise" },
    duration: { type: Type.STRING, description: "Duration or Sets/Reps (e.g. '10 mins' or '3x10 reps')" },
    category: { type: Type.STRING, description: "Category: 'Pool Conditioning', 'Weight Room', 'Rehab', or Skill Category" },
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
  mode: 'team' | 'individual' | 'conditioning' | 'recovery',
  focusPlayers?: Player[],
  injuryContext?: string,
  severity?: number
): Promise<PracticePlan | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API Key not found");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let prompt = "";
    let systemInstruction = "You are a world-class Water Polo coach designed to create high-performance practice plans.";

    const serializedRoster = JSON.stringify(players.map(p => ({
      name: p.name,
      position: p.position,
      skills: p.skills,
      custom_skills: p.customSkills
    })), null, 2);

    if (mode === 'recovery' && injuryContext) {
      const playerName = focusPlayers && focusPlayers.length > 0 ? focusPlayers[0].name : "the athlete";
      const severityText = severity ? `Current Pain Severity: ${severity}/10` : "Severity: Unknown";
      
      prompt = `
        Create a comprehensive Recovery and Rehabilitation Plan for ${playerName}.
        
        Injury Details & Location: ${injuryContext}
        ${severityText}
        
        The goal is to facilitate healing, maintain mobility, and safely return to sport.
        Acts as a specialized Physical Therapist and Water Polo Coach.

        Logic based on Severity:
        - If severity is High (7-10): Focus on absolute rest, icing, protection, and extremely gentle passive range of motion if safe. No load.
        - If severity is Medium (4-6): Focus on active mobility, light isometric loading, and water treading (if safe).
        - If severity is Low (1-3): Focus on progressive strengthening, dynamic stability, and return-to-sport drills.
        
        The plan MUST be divided into logical sections (e.g., Mobility, Activation, Water Work):
        1. **Mobility/Stretching**: Gentle range of motion exercises.
        2. **Rehab/Strengthening**: Specific dryland exercises to strengthen the injured area (if safe) or surrounding muscles.
        3. **Water Work (if applicable)**: Low-impact pool movements or modified swimming that avoids aggravating the injury.
        4. **Prehab**: Exercises to prevent future recurrence.
        
        Use 'Rehab', 'Mobility', or 'Pool Recovery' for the category field.
        Be specific about sets, reps, and precautions.
      `;

    } else if (mode === 'conditioning' && focusPlayers && focusPlayers.length > 0) {
      const names = focusPlayers.map(p => p.name).join(', ');
      
      const detailedProfiles = focusPlayers.map(p => ({
        name: p.name,
        skills: p.skills,
        custom: p.customSkills
      }));

      prompt = `
        Create a high-intensity Conditioning Set for the following players: ${names}.
        
        Detailed Player Profiles:
        ${JSON.stringify(detailedProfiles, null, 2)}

        The goal is to physically strengthen these players. Analyze their collective weaknesses. 
        If specific players have specific physical deficits (e.g., weak legs vs weak shoulders), try to include exercises that benefit them.
        
        The plan MUST be divided into two distinct sections (mix the drills in the list but categorize them clearly):
        1. **Pool Conditioning**: Swimming sets, leg work (eggbeater), and water resistance drills.
        2. **Weight Room / Dryland**: Strength training, core work, and mobility exercises suitable for water polo.

        Use the 'category' field in the JSON to specify 'Pool Conditioning' or 'Weight Room'.
        For 'duration', use Reps/Sets for weights (e.g., "3x10") and Time/Distance for swimming (e.g., "10 mins" or "500 yards").
      `;

    } else if (mode === 'individual' && focusPlayers && focusPlayers.length > 0) {
      const names = focusPlayers.map(p => p.name).join(', ');
      
      const detailedProfiles = focusPlayers.map(p => ({
        name: p.name,
        position: p.position,
        skills: p.skills,
        custom: p.customSkills
      }));
      
      prompt = `
        Create a personalized small-group practice plan (1 hour) for the following players: ${names}.
        
        Player Profiles:
        ${JSON.stringify(detailedProfiles, null, 2)}

        Focus heavily on improving the 'Weakness' areas identified in these profiles.
        If they share weaknesses, focus on those. If they have complementary strengths, use them in drills (e.g., a good passer working with a good shooter).
        
        Since this is a group of ${focusPlayers.length} specific players, ensure the drills allow them to work together.
        For example, if one is a goalie and one is a shooter, include shooting drills. If both are drivers, include driving/passing drills.
      `;
    } else {
      prompt = `
        Create a 2-hour TEAM practice plan for the following roster.
        
        Roster Data (includes standard skills and personalized custom skills):
        ${serializedRoster}

        Analyze the collective weaknesses of the team. 
        If many players are weak in a specific area (e.g., Defense), prioritize drills for that.
        Pay attention to custom skills marked as 'Weakness' for potential specialized improvement drills.
        Include a mix of warm-up, skill building, and scrimmaging components.
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: planSchema,
      },
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as PracticePlan;

  } catch (error) {
    console.error("Error generating plan:", error);
    return null;
  }
};