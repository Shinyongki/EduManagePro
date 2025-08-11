import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { useAnalysisStore } from "@/store/analysis-store";
import { exportAnalysisToExcel } from "@/lib/excel-utils";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Link, CheckCircle, AlertTriangle, Users } from "lucide-react";

export default function AnalysisResults() {
  const { analysisResults, getAnalysisStats } = useAnalysisStore();
  const { toast } = useToast();
  
  const stats = getAnalysisStats();
  const hasResults = analysisResults.length > 0;

  const handleExportExcel = async () => {
    try {
      await exportAnalysisToExcel(analysisResults);
      toast({
        title: "Excel 내보내기 완료",
        description: "분석 결과가 Excel 파일로 내보내기되었습니다.",
      });
    } catch (error) {
      toast({
        title: "내보내기 오류",
        description: "Excel 파일 내보내기 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const columns = [
    { key: 'name', label: '이름' },
    { key: 'institution', label: '기관' },
    { key: 'jobType', label: '직무' },
    { key: 'basicEducation', label: '기본교육' },
    { key: 'advancedEducation', label: '심화교육' },
    { 
      key: 'overallCompletionRate', 
      label: '전체 이수율',
      render: (value: number) => `${value}%`
    },
    { key: 'status', label: '상태' },
  ];

  return (
    <Card data-testid="analysis-results">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">연동 분석 결과</h3>
            <p className="text-sm text-slate-500 mt-1">교육 이수 현황과 종사자 현황이 연동된 결과입니다</p>
          </div>
          {hasResults && (
            <Button 
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel 내보내기
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {hasResults ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="gradient-card from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">매칭 성공률</p>
                    <p className="text-3xl font-bold" data-testid="matching-success-rate">
                      {stats.matchingSuccessRate}%
                    </p>
                  </div>
                  <Link className="text-blue-200 h-8 w-8" />
                </div>
              </div>
              
              <div className="gradient-card from-green-500 to-green-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">교육 완료율</p>
                    <p className="text-3xl font-bold" data-testid="education-completion-rate">
                      {stats.completionRate}%
                    </p>
                  </div>
                  <CheckCircle className="text-green-200 h-8 w-8" />
                </div>
              </div>
              
              <div className="gradient-card from-amber-500 to-amber-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">미이수자</p>
                    <p className="text-3xl font-bold" data-testid="incomplete-count">
                      {stats.incompleteCount}명
                    </p>
                  </div>
                  <AlertTriangle className="text-amber-200 h-8 w-8" />
                </div>
              </div>
              
              <div className="gradient-card from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">분석 대상</p>
                    <p className="text-3xl font-bold" data-testid="total-analyzed">
                      {stats.totalAnalyzed}명
                    </p>
                  </div>
                  <Users className="text-purple-200 h-8 w-8" />
                </div>
              </div>
            </div>
            
            {/* Analysis Table */}
            <DataTable
              columns={columns}
              data={analysisResults}
              pagination={{
                currentPage: 1,
                totalPages: Math.ceil(analysisResults.length / 10),
                onPageChange: () => {},
                totalItems: analysisResults.length,
                itemsPerPage: 10,
              }}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Link className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">분석 결과가 없습니다</h3>
            <p className="text-slate-500 mb-6">
              교육 데이터와 종사자 데이터를 업로드한 후 분석을 실행해주세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
