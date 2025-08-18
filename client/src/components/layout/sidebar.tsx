import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileUp, 
  Users, 
  BookOpen, 
  Award, 
  UserCheck, 
  Building, 
  BarChart3,
  PieChart,
  Home,
  ChevronRight,
  GraduationCap,
  BriefcaseBusiness
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    {
      title: "대시보드",
      href: "/",
      icon: Home,
      description: "연동분석 메인",
      isActive: location === "/"
    },
    {
      title: "교육 관리",
      icon: GraduationCap,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      items: [
        {
          title: "기본 교육",
          href: "/basic-education", 
          icon: BookOpen,
          description: "기본교육 데이터 관리",
          isActive: location === "/basic-education"
        },
        {
          title: "심화 교육",
          href: "/advanced-education",
          icon: Award,
          description: "심화교육 데이터 관리", 
          isActive: location === "/advanced-education"
        },
        {
          title: "소속 회원 목록",
          href: "/participants",
          icon: Users,
          description: "소속 회원 교육 이수 현황",
          isActive: location === "/participants"
        }
      ]
    },
    {
      title: "종사자 관리",
      icon: BriefcaseBusiness,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      items: [
        {
          title: "종사자 데이터",
          href: "/employee-data",
          icon: UserCheck,
          description: "종사자 정보 관리",
          isActive: location === "/employee-data"
        },
        {
          title: "기관 현황",
          href: "/institution-data",
          icon: Building,
          description: "기관별 배치 현황",
          isActive: location === "/institution-data"
        }
      ]
    },
    {
      title: "통계 현황",
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      items: [
        {
          title: "종사자 통계",
          href: "/employee-stats",
          icon: BarChart3,
          description: "종사자 현황 분석",
          isActive: location === "/employee-stats"
        },
        {
          title: "교육 통계", 
          href: "/education-stats",
          icon: PieChart,
          description: "교육 이수 현황 분석",
          isActive: location === "/education-stats"
        },
        {
          title: "기관 통계",
          href: "/institution-stats",
          icon: Building,
          description: "기관 운영 현황 분석",
          isActive: location === "/institution-stats"
        }
      ]
    }
  ];

  return (
    <aside className={cn(
      "w-64 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-y-auto",
      className
    )}>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <FileUp className="text-white h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">EduManage Pro</h2>
            <p className="text-xs text-slate-500">교육관리 시스템</p>
          </div>
        </div>

        <nav className="space-y-6">
          {menuItems.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.href ? (
                // 단일 메뉴 아이템 (대시보드) - 특별 스타일
                <Link href={section.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-auto p-4 mb-4 relative overflow-hidden",
                      "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700",
                      "text-white shadow-lg hover:shadow-xl transition-all duration-300",
                      "border border-blue-500/20",
                      section.isActive && "shadow-blue-500/25"
                    )}
                  >
                    {/* 배경 효과 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-blue-700/90"></div>
                    <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* 컨텐츠 */}
                    <div className="relative z-10 flex items-center w-full">
                      <section.icon className="h-5 w-5 mr-3 drop-shadow-sm" />
                      <div className="text-left flex-1">
                        <div className="font-semibold">{section.title}</div>
                        <div className="text-xs opacity-90 font-medium">{section.description}</div>
                      </div>
                      {section.isActive && (
                        <div className="w-2 h-2 bg-white rounded-full ml-2 animate-pulse"></div>
                      )}
                    </div>
                  </Button>
                </Link>
              ) : (
                // 그룹 메뉴
                <div className="mb-6">
                  <div className={cn(
                    "flex items-center gap-3 mb-4 p-3 rounded-lg",
                    section.bgColor,
                    section.borderColor,
                    "border"
                  )}>
                    <section.icon className={cn("h-5 w-5", section.color)} />
                    <h3 className={cn(
                      "text-sm font-semibold uppercase tracking-wider",
                      section.color
                    )}>
                      {section.title}
                    </h3>
                  </div>
                  <div className="space-y-1 ml-3 relative">
                    {/* 수직선 연결 */}
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-300"></div>
                    
                    {section.items?.map((item, itemIndex) => (
                      <div key={itemIndex} className="relative">
                        {/* 수평선 연결 */}
                        <div className="absolute left-2 top-6 w-4 h-px bg-slate-300"></div>
                        {/* 마지막 아이템이 아닌 경우만 수직선 유지 */}
                        {itemIndex === section.items!.length - 1 && (
                          <div className="absolute left-2 top-0 w-px h-6 bg-slate-300"></div>
                        )}
                        
                        <Link href={item.href}>
                          <Button
                            variant={item.isActive ? "secondary" : "ghost"}
                            className={cn(
                              "w-full justify-start h-auto p-3 text-left ml-6 relative",
                              item.isActive && "bg-slate-100 border border-slate-200 shadow-sm"
                            )}
                          >
                            <item.icon className="h-4 w-4 mr-3 text-slate-600" />
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">{item.title}</div>
                              <div className="text-xs text-slate-500">{item.description}</div>
                            </div>
                            {item.isActive && <ChevronRight className="h-4 w-4 text-slate-400" />}
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* 하단 정보 */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">시스템 상태</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                정상
              </Badge>
            </div>
            <div className="text-xs text-slate-500">
              <div>버전: v2.0.1</div>
              <div>마지막 업데이트: 2025.08.15</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}