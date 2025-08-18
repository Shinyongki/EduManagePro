import { useEducationStore } from "@/store/education-store";
import { useEmployeeStore } from "@/store/employee-store";
import { useAnalysisStore } from "@/store/analysis-store";
import { Users, GraduationCap, TrendingUp, Building } from "lucide-react";
import { useState, useEffect } from "react";

export default function OverviewCards() {
  const { getEducationStats } = useEducationStore();
  const { getEmployeeStats } = useEmployeeStore();
  const { getAnalysisStats } = useAnalysisStore();
  
  const [matchingStats, setMatchingStats] = useState({
    totalParticipants: 0,
    basicCompletedCount: 0,
    advancedCompletedCount: 0,
    excellentCount: 0,
    basicCompletionRate: 0,
    advancedCompletionRate: 0,
    excellentRate: 0
  });

  // 교육 매칭 통계 로드
  useEffect(() => {
    const fetchMatchingStats = async () => {
      try {
        const response = await fetch('/api/education-statistics');
        if (response.ok) {
          const stats = await response.json();
          setMatchingStats(stats);
        }
      } catch (error) {
        console.error('Failed to fetch matching statistics:', error);
      }
    };
    
    fetchMatchingStats();
  }, []);
  
  const educationStats = getEducationStats();
  const employeeStats = getEmployeeStats();
  const analysisStats = getAnalysisStats();

  const cards = [
    {
      title: "교육 수강자",
      value: matchingStats.totalParticipants.toLocaleString(),
      subtitle: `기초 ${matchingStats.basicCompletedCount}명 / 심화 ${matchingStats.advancedCompletedCount}명 수료`,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      testId: "overview-total-participants"
    },
    {
      title: "기초 교육 완료율",
      value: `${matchingStats.basicCompletionRate}%`,
      subtitle: `${matchingStats.basicCompletedCount}명 수료 완료`,
      icon: GraduationCap,
      gradient: "from-green-500 to-green-600",
      testId: "overview-basic-completion-rate"
    },
    {
      title: "심화 교육 완료율",
      value: `${matchingStats.advancedCompletionRate}%`,
      subtitle: `${matchingStats.advancedCompletedCount}명 수료 완료`,
      icon: TrendingUp,
      gradient: "from-amber-500 to-amber-600",
      testId: "overview-advanced-completion-rate"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="overview-cards">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`gradient-card ${card.gradient} p-6 rounded-xl text-white shadow-lg`}
          data-testid={card.testId}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">{card.title}</p>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
              <p className="text-white/70 text-xs mt-1">{card.subtitle}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <card.icon className="h-8 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
