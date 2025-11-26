
export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 'N/A';

export enum SkillCategory {
  Swimming = 'Swimming & Conditioning',
  Treading = 'Treading (Legs)',
  BallHandling = 'Ball Handling',
  Passing = 'Passing',
  Shooting = 'Shooting',
  Defense = 'Defense',
  HoleSetDefense = 'Hole Set Defense',
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