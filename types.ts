export enum SkillLevel {
  Weakness = 'Weakness',
  Neutral = 'Neutral',
  Strength = 'Strength',
}

export enum SkillCategory {
  Swimming = 'Swimming & Conditioning',
  Legs = 'Leg Work',
  BallHandling = 'Ball Handling',
  Shooting = 'Shooting',
  Defense = 'Defense',
  Offense = 'Offense',
  Goalie = 'Goalie Skills',
}

export interface CustomSkill {
  id: string;
  name: string;
  level: SkillLevel;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  skills: Record<SkillCategory, SkillLevel>;
  customSkills: CustomSkill[];
}

export interface Drill {
  name: string;
  duration: string;
  category: string;
  description: string;
  focus: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface PracticePlan {
  id?: string;
  createdAt?: number;
  type?: 'team' | 'individual' | 'conditioning' | 'recovery';
  participants?: string[];
  title: string;
  summary: string;
  drills: Drill[];
}

export type ViewState = 'roster' | 'assessment' | 'planner' | 'results' | 'plans' | 'recovery';