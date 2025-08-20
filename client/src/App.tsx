import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import ParticipantsPage from "@/pages/participants";
import BasicEducationPage from "@/pages/basic-education";
import AdvancedEducationPage from "@/pages/advanced-education";
import EmployeeDataPage from "@/pages/employee-data";
import InstitutionDataPage from "@/pages/institution-data";
import EducationStatsPage from "@/pages/education-stats";
import InstitutionStatsPage from "@/pages/institution-stats";
import EmployeeStatsPage from "@/pages/employee-stats-basic";
import TestRoute from "@/pages/test-route";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/participants" component={ParticipantsPage} />
        <Route path="/basic-education" component={BasicEducationPage} />
        <Route path="/advanced-education" component={AdvancedEducationPage} />
        <Route path="/employee-data" component={EmployeeDataPage} />
        <Route path="/institution-data" component={InstitutionDataPage} />
        <Route path="/education-stats" component={EducationStatsPage} />
        <Route path="/institution-stats" component={InstitutionStatsPage} />
        <Route path="/employee-stats" component={EmployeeStatsPage} />
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">페이지를 찾을 수 없습니다</h1>
              <p className="text-slate-500 mt-2">요청하신 페이지가 존재하지 않습니다.</p>
            </div>
          </div>
        </Route>
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
