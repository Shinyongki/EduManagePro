import { Card, CardContent, CardHeader } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { useEducationStore } from "@/store/education-store";
import { useMemo } from "react";
import { GraduationCap, Award, BarChart, Inbox } from "lucide-react";

export default function EducationPreview() {
  const { basicEducationData, advancedEducationData, getEducationStats } = useEducationStore();
  
  const stats = useMemo(() => getEducationStats(), [basicEducationData, advancedEducationData]);
  
  const tableData = useMemo(() => {
    const allData = [...basicEducationData, ...advancedEducationData];
    
    // Group by course and calculate stats
    const courseStats = allData.reduce((acc, item) => {
      const key = item.course;
      if (!acc[key]) {
        acc[key] = {
          course: key,
          type: item.courseType,
          completed: 0,
          total: 0,
        };
      }
      acc[key].total++;
      if (item.status === '수료') {
        acc[key].completed++;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(courseStats).map((stat: any) => ({
      ...stat,
      completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
      status: stat.completed === stat.total ? '완료' : stat.completed > 0 ? '진행중' : '미완료',
    }));
  }, [basicEducationData, advancedEducationData]);

  const columns = [
    { key: 'course', label: '과정명' },
    { key: 'type', label: '분류' },
    { key: 'completed', label: '수료인원' },
    { 
      key: 'completionRate', 
      label: '완료율',
      render: (value: number) => `${value}%`
    },
    { key: 'status', label: '상태' },
  ];

  return (
    <Card data-testid="education-preview">
      <CardHeader className="border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">교육 데이터 미리보기</h3>
        <p className="text-sm text-slate-500 mt-1">업로드된 교육 데이터의 요약 정보입니다</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <GraduationCap className="text-blue-600 h-6 w-6 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-600">기본교육 수료자</p>
                <p className="text-2xl font-bold text-blue-900" data-testid="basic-education-count">
                  {stats.basicStats.completedCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <Award className="text-green-600 h-6 w-6 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-600">심화교육 수료자</p>
                <p className="text-2xl font-bold text-green-900" data-testid="advanced-education-count">
                  {stats.advancedStats.completedCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <BarChart className="text-amber-600 h-6 w-6 mr-3" />
              <div>
                <p className="text-sm font-medium text-amber-600">전체 이수율</p>
                <p className="text-2xl font-bold text-amber-900" data-testid="overall-completion-rate">
                  {stats.overallCompletionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={tableData}
          emptyMessage="교육 데이터를 업로드하면 여기에 표시됩니다"
          emptyIcon={<Inbox className="h-12 w-12 text-slate-400" />}
          data-testid="education-preview-table"
        />
      </CardContent>
    </Card>
  );
}
