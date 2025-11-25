import { Player, SkillCategory, SkillLevel } from './types';

export const POSITIONS = [
  'Driver',
  'Hole Set',
  'Wing',
  'Point',
  'Goalie',
  'Utility',
];

export const SKILL_CATEGORIES_LIST = [
  SkillCategory.Swimming,
  SkillCategory.Legs,
  SkillCategory.BallHandling,
  SkillCategory.Shooting,
  SkillCategory.Defense,
  SkillCategory.Offense,
  SkillCategory.Goalie,
];

export const INITIAL_ROSTER: Player[] = [
  {
    id: '1',
    name: 'Alex Miller',
    position: 'Driver',
    skills: {
      [SkillCategory.Swimming]: SkillLevel.Strength,
      [SkillCategory.Legs]: SkillLevel.Neutral,
      [SkillCategory.BallHandling]: SkillLevel.Strength,
      [SkillCategory.Shooting]: SkillLevel.Neutral,
      [SkillCategory.Defense]: SkillLevel.Weakness,
      [SkillCategory.Offense]: SkillLevel.Strength,
      [SkillCategory.Goalie]: SkillLevel.Neutral,
    },
    customSkills: [
      { id: 'c1', name: 'Counter Attack Speed', level: SkillLevel.Strength }
    ]
  },
  {
    id: '2',
    name: 'Jordan Smith',
    position: 'Hole Set',
    skills: {
      [SkillCategory.Swimming]: SkillLevel.Neutral,
      [SkillCategory.Legs]: SkillLevel.Strength,
      [SkillCategory.BallHandling]: SkillLevel.Neutral,
      [SkillCategory.Shooting]: SkillLevel.Strength,
      [SkillCategory.Defense]: SkillLevel.Neutral,
      [SkillCategory.Offense]: SkillLevel.Strength,
      [SkillCategory.Goalie]: SkillLevel.Weakness,
    },
    customSkills: []
  },
  {
    id: '3',
    name: 'Casey Jones',
    position: 'Goalie',
    skills: {
      [SkillCategory.Swimming]: SkillLevel.Neutral,
      [SkillCategory.Legs]: SkillLevel.Strength,
      [SkillCategory.BallHandling]: SkillLevel.Neutral,
      [SkillCategory.Shooting]: SkillLevel.Weakness,
      [SkillCategory.Defense]: SkillLevel.Strength,
      [SkillCategory.Offense]: SkillLevel.Weakness,
      [SkillCategory.Goalie]: SkillLevel.Strength,
    },
    customSkills: [
      { id: 'c2', name: 'Penalty Blocking', level: SkillLevel.Strength },
      { id: 'c3', name: 'Outlet Passing', level: SkillLevel.Weakness }
    ]
  },
];