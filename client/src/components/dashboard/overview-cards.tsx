import { useEducationStore } from "@/store/education-store";
import { useEmployeeStore } from "@/store/employee-store";
import { useAnalysisStore } from "@/store/analysis-store";
import { Users, GraduationCap, TrendingUp, Building } from "lucide-react";

export default function OverviewCards() {
  const { getEducationStats } = useEducationStore();
  const { getEmployeeStats } = useEmployeeStore();
  const { getAnalysisStats } = useAnalysisStore();
  
  const educationStats = getEducationStats();
  const employeeStats = getEmployeeStats();
  const analysisStats = getAnalysisStats();

  const cards = [
    {
      title: "총 종사자",
      value: employeeStats.totalEmployees.toLocaleString(),
      subtitle: "전년 대비 +5.2%",
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      testId: "overview-total-employees"
    },
    {
      title: "교육 완료율",
      value: `${analysisStats.completionRate}%`,
      subtitle: "목표 대비 +2.3%",
      icon: GraduationCap,
      gradient: "from-green-500 to-green-600",
      testId: "overview-completion-rate"
    },
    {
      title: "충원률",
      value: `${employeeStats.fillRate}%`,
      subtitle: "전월 대비 +1.5%",
      icon: TrendingUp,
      gradient: "from-amber-500 to-amber-600",
      testId: "overview-fill-rate"
    },
    {
      title: "기관 수",
      value: employeeStats.institutionCount.toLocaleString(),
      subtitle: "활성 기관",
      icon: Building,
      gradient: "from-purple-500 to-purple-600",
      testId: "overview-institution-count"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="overview-cards">
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
