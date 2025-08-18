import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, TrendingUp, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ParticipantStatsProps {
  totalParticipants?: number;
  activeParticipants?: number;
  basicCompletionRate?: number;
  advancedCompletionRate?: number;
  averageCourseCount?: number;
}

export const ParticipantStats: React.FC<ParticipantStatsProps> = ({
  totalParticipants = 0,
  activeParticipants = 0,
  basicCompletionRate = 0,
  advancedCompletionRate = 0,
  averageCourseCount = 0
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 수강자</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalParticipants.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            활성 수강자: {activeParticipants.toLocaleString()}명
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">기초 교육 완료율</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{basicCompletionRate.toFixed(1)}%</div>
          <Progress value={basicCompletionRate} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">심화 교육 완료율</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{advancedCompletionRate.toFixed(1)}%</div>
          <Progress value={advancedCompletionRate} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">평균 수강 건수</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageCourseCount.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            수강자 1인당 평균
          </p>
        </CardContent>
      </Card>
    </div>
  );
};