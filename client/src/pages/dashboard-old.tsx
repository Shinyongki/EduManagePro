import { useState } from "react";
import Header from "@/components/layout/header";
import ProgressBar from "@/components/layout/progress-bar";
import Footer from "@/components/layout/footer";
import EducationUpload from "@/components/education/education-upload";
import EducationPreview from "@/components/education/education-preview";
import EmployeeUpload from "@/components/employees/employee-upload";
import EmployeeStatistics from "@/components/employees/employee-statistics";
import AnalysisControls from "@/components/analysis/analysis-controls";
import AnalysisResults from "@/components/analysis/analysis-results";
import OverviewCards from "@/components/dashboard/overview-cards";
import ChartsSection from "@/components/dashboard/charts-section";
import RecentActivities from "@/components/dashboard/recent-activities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, TrendingUp, Gauge } from "lucide-react";

type TabValue = "education" | "employees" | "analysis" | "dashboard";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>("education");

  const getProgressPercentage = (tab: TabValue): number => {
    switch (tab) {
      case "education": return 33;
      case "employees": return 66;
      case "analysis": return 100;
      case "dashboard": return 100;
      default: return 0;
    }
  };

  const getCurrentStep = (tab: TabValue): number => {
    switch (tab) {
      case "education": return 1;
      case "employees": return 2;
      case "analysis":
      case "dashboard": return 3;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <ProgressBar 
        currentStep={getCurrentStep(activeTab)} 
        percentage={getProgressPercentage(activeTab)} 
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
          <div className="mb-8">
            <div className="border-b border-slate-200">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="education" 
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm bg-transparent"
                  data-testid="tab-education"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  교육관리
                </TabsTrigger>
                <TabsTrigger 
                  value="employees"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm bg-transparent"
                  data-testid="tab-employees"
                >
                  <Users className="mr-2 h-4 w-4" />
                  종사자관리
                </TabsTrigger>
                <TabsTrigger 
                  value="analysis"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm bg-transparent"
                  data-testid="tab-analysis"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  연동분석
                </TabsTrigger>
                <TabsTrigger 
                  value="dashboard"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm bg-transparent"
                  data-testid="tab-dashboard"
                >
                  <Gauge className="mr-2 h-4 w-4" />
                  대시보드
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="education" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <EducationUpload type="basic" />
              <EducationUpload type="advanced" />
            </div>
            <div className="mt-8">
              <EducationPreview />
            </div>
          </TabsContent>

          <TabsContent value="employees" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <EmployeeUpload type="employee" />
              <EmployeeUpload type="institution" />
            </div>
            <div className="mt-8">
              <EmployeeStatistics />
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            <div className="space-y-8">
              <AnalysisControls />
              <AnalysisResults />
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            <div className="space-y-8">
              <OverviewCards />
              <ChartsSection />
              <RecentActivities />
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
}
