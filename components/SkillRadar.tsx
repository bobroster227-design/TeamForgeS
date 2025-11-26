
import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Player, SkillCategory } from '../types';

interface SkillRadarProps {
  player: Player;
}

const SkillRadar: React.FC<SkillRadarProps> = ({ player }) => {
  const data = Object.values(SkillCategory).map((cat) => {
    const rawValue = player.skills[cat];
    let value = 0;
    
    // Convert 'N/A' to 0, otherwise use the number
    if (typeof rawValue === 'number') {
      value = rawValue;
    }

    return {
      subject: cat.split(' ')[0], // Shorten name for chart
      fullSubject: cat,
      A: value,
      fullMark: 5,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            name={player.name}
            dataKey="A"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SkillRadar;
