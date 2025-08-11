import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChart3, PieChart } from "lucide-react";

export default function ChartsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" data-testid="charts-section">
      {/* Education Completion Chart */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">교육 이수 현황</h3>
          <p className="text-sm text-slate-500 mt-1">월별 교육 완료 추이</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">교육 이수 차트</p>
              <p className="text-xs text-slate-400 mt-1">Recharts로 구현 예정</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Employee Distribution Chart */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">직무별 종사자 분포</h3>
          <p className="text-sm text-slate-500 mt-1">직무 유형별 인원 현황</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
            <div className="text-center">
              <PieChart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">직무별 분포 차트</p>
              <p className="text-xs text-slate-400 mt-1">원형 또는 도넛 차트</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
