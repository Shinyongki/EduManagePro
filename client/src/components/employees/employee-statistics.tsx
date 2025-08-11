import { Card, CardContent, CardHeader } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { useEmployeeStore } from "@/store/employee-store";
import { useMemo } from "react";
import { UserCheck, Users, Percent, Clock, UsersIcon } from "lucide-react";

export default function EmployeeStatistics() {
  const { employeeData, getEmployeeStats } = useEmployeeStore();
  
  const stats = useMemo(() => getEmployeeStats(), [employeeData]);
  
  const tableData = useMemo(() => {
    return employeeData.slice(0, 10).map(employee => ({
      name: employee.name,
      jobType: employee.jobType,
      institution: employee.institution,
      workDays: employee.workDays || 0,
      educationStatus: '미연동', // Will be updated when analysis is done
      status: employee.isActive ? '재직' : '퇴직',
    }));
  }, [employeeData]);

  const columns = [
    { key: 'name', label: '이름' },
    { key: 'jobType', label: '직무' },
    { key: 'institution', label: '기관' },
    { 
      key: 'workDays', 
      label: '근속기간',
      render: (value: number) => `${Math.floor(value / 365)}년 ${Math.floor((value % 365) / 30)}개월`
    },
    { key: 'educationStatus', label: '교육이수' },
    { key: 'status', label: '상태' },
  ];

  return (
    <Card data-testid="employee-statistics">
      <CardHeader className="border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">종사자 통계</h3>
        <p className="text-sm text-slate-500 mt-1">종사자 현황에 대한 요약 통계입니다</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <UserCheck className="text-blue-600 h-6 w-6 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-600">전담사회복지사</p>
                <p className="text-2xl font-bold text-blue-900" data-testid="social-worker-count">
                  {stats.socialWorkerCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <Users className="text-green-600 h-6 w-6 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-600">생활지원사</p>
                <p className="text-2xl font-bold text-green-900" data-testid="life-support-count">
                  {stats.lifeSupportCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <Percent className="text-amber-600 h-6 w-6 mr-3" />
              <div>
                <p className="text-sm font-medium text-amber-600">충원률</p>
                <p className="text-2xl font-bold text-amber-900" data-testid="fill-rate">
                  {stats.fillRate}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Clock className="text-purple-600 h-6 w-6 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-600">평균 근속기간</p>
                <p className="text-2xl font-bold text-purple-900" data-testid="avg-tenure">
                  {stats.averageTenure}년
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={tableData}
          emptyMessage="종사자 데이터를 업로드하면 여기에 표시됩니다"
          emptyIcon={<UsersIcon className="h-12 w-12 text-slate-400" />}
        />
      </CardContent>
    </Card>
  );
}
