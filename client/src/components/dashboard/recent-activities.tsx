import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: 'success' | 'info' | 'warning' | 'purple';
}

export default function RecentActivities() {
  const activities: Activity[] = [
    {
      id: '1',
      title: '기본교육 데이터 업데이트 완료',
      description: '245명의 교육 수료 데이터가 추가되었습니다',
      timeAgo: '5분 전',
      type: 'success'
    },
    {
      id: '2', 
      title: '종사자 현황 데이터 동기화',
      description: '서울복지센터 종사자 정보가 업데이트되었습니다',
      timeAgo: '15분 전',
      type: 'info'
    },
    {
      id: '3',
      title: '월간 보고서 생성',
      description: '2024년 1월 교육 현황 보고서가 생성되었습니다',
      timeAgo: '1시간 전',
      type: 'warning'
    },
    {
      id: '4',
      title: '시스템 백업 완료',
      description: '전체 데이터 백업이 성공적으로 완료되었습니다',
      timeAgo: '2시간 전',
      type: 'purple'
    }
  ];

  const getStatusColor = (type: Activity['type']) => {
    const colors = {
      success: 'bg-green-500',
      info: 'bg-blue-500', 
      warning: 'bg-amber-500',
      purple: 'bg-purple-500'
    };
    return colors[type];
  };

  return (
    <Card data-testid="recent-activities">
      <CardHeader className="border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">최근 활동</h3>
        <p className="text-sm text-slate-500 mt-1">시스템의 최근 업데이트 및 변경사항</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4" data-testid={`activity-${activity.id}`}>
              <div className={`w-2 h-2 ${getStatusColor(activity.type)} rounded-full mt-2`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                <p className="text-xs text-slate-500">{activity.description}</p>
                <p className="text-xs text-slate-400 mt-1">{activity.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <Button variant="ghost" className="text-primary hover:text-primary/80" data-testid="button-view-all-activities">
            모든 활동 보기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
