
import { Player, SkillCategory } from './types';

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
  SkillCategory.Treading,
  SkillCategory.BallHandling,
  SkillCategory.Passing,
  SkillCategory.Shooting,
  SkillCategory.Defense,
  SkillCategory.HoleSetDefense,
  SkillCategory.Offense,
  SkillCategory.Goalie,
];

export const INITIAL_ROSTER: Player[] = [
  {
    id: '1',
    name: 'Alex Miller',
    position: 'Driver',
    skills: {
      [SkillCategory.Swimming]: 5,
      [SkillCategory.Treading]: 3,
      [SkillCategory.BallHandling]: 5,
      [SkillCategory.Passing]: 4,
      [SkillCategory.Shooting]: 3,
      [SkillCategory.Defense]: 2,
      [SkillCategory.HoleSetDefense]: 1,
      [SkillCategory.Offense]: 5,
      [SkillCategory.Goalie]: 'N/A',
    },
    customSkills: [
      { id: 'c1', name: 'Counter Attack Speed', level: 5 }
    ]
  },
  {
    id: '2',
    name: 'Jordan Smith',
    position: 'Hole Set',
    skills: {
      [SkillCategory.Swimming]: 3,
      [SkillCategory.Treading]: 5,
      [SkillCategory.BallHandling]: 3,
      [SkillCategory.Passing]: 3,
      [SkillCategory.Shooting]: 5,
      [SkillCategory.Defense]: 3,
      [SkillCategory.HoleSetDefense]: 2,
      [SkillCategory.Offense]: 5,
      [SkillCategory.Goalie]: 'N/A',
    },
    customSkills: []
  },
  {
    id: '3',
    name: 'Casey Jones',
    position: 'Goalie',
    skills: {
      [SkillCategory.Swimming]: 4,
      [SkillCategory.Treading]: 5,
      [SkillCategory.BallHandling]: 3,
      [SkillCategory.Passing]: 5,
      [SkillCategory.Shooting]: 1,
      [SkillCategory.Defense]: 5,
      [SkillCategory.HoleSetDefense]: 'N/A',
      [SkillCategory.Offense]: 1,
      [SkillCategory.Goalie]: 5,
    },
    customSkills: [
      { id: 'c2', name: 'Penalty Blocking', level: 5 },
      { id: 'c3', name: 'Outlet Passing', level: 2 }
    ]
  },
];
