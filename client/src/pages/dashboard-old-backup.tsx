import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  BookOpen, 
  Award, 
  UserCheck, 
  Building,
  TrendingUp,
  FileUp,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Download,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEducationStore } from "@/store/education-store";
import type { IntegratedAnalysisData } from "@shared/schema";

interface EducationStatistics {
  totalParticipants: number;
  basicEducationCompleted: number;
  advancedEducationCompleted: number;
  bothEducationCompleted: number;
  noEducationCompleted: number;
  completionRate: number;
  institutionBreakdown: { [key: string]: number };
  jobTypeBreakdown: { [key: string]: number };
}

interface EmployeeStatistics {
  totalEmployees: number;
  totalSocialWorkers: number;
  totalLifeSupport: number;
  totalInstitutions: number;
  employmentRate: number;
  averageTenure: number;
  regionBreakdown: { [key: string]: number };
  institutionAllocation: {
    totalAllocated: number;
    actualEmployed: number;
    shortfall: number;
    shortfallRate: number;
  };
}

export default function Dashboard() {
  const [educationStats, setEducationStats] = useState<EducationStatistics | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { integratedAnalysisData, setIntegratedAnalysisData } = useEducationStore();

  // Mock employee statistics
  const mockEmployeeStats: EmployeeStatistics = useMemo(() => ({
    totalEmployees: 156,
    totalSocialWorkers: 89,
    totalLifeSupport: 67,
    totalInstitutions: 4,
    employmentRate: 87.2,
    averageTenure: 3.4,
    regionBreakdown: {
      '서울': 33,
      '경기': 22,
      '부산': 14,
      '기타': 87
    },
    institutionAllocation: {
      totalAllocated: 179,
      actualEmployed: 156,
      shortfall: 23,
      shortfallRate: 12.8
    }
  }), []);

  // Mock data for integrated analysis
  const mockAnalysisData: IntegratedAnalysisData[] = useMemo(() => [
    {
      id: "1",
      management: "서울시", region: "서울", district: "강남구", 
      institutionCode: "1001", institutionName: "강남종합복지관",
      backup1_total: 15, backup1_social: 8, backup1_life: 7,
      backup2_a: 12, backup2_b: 6, backup2_c: 6, backup2_total: 12,
      dLevel_social: 3, dLevel_life: 4, dLevel_total: 7,
      qualification_social: 8, qualification_life: 7, qualification_total: 15,
      tenure_social: 6, tenure_life: 5, tenure_rate: 73.3,
      education_f: 10, education_rate_fb: 83.3, education_warning: 2, education_g: 8,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: "2",
      management: "서울시", region: "서울", district: "서초구",
      institutionCode: "1002", institutionName: "서초사회복지관", 
      backup1_total: 18, backup1_social: 10, backup1_life: 8,
      backup2_a: 15, backup2_b: 8, backup2_c: 7, backup2_total: 15,
      dLevel_social: 4, dLevel_life: 3, dLevel_total: 7,
      qualification_social: 10, qualification_life: 8, qualification_total: 18,
      tenure_social: 8, tenure_life: 6, tenure_rate: 77.8,
      education_f: 12, education_rate_fb: 80.0, education_warning: 3, education_g: 9,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: "3",
      management: "경기도", region: "경기", district: "수원시",
      institutionCode: "2001", institutionName: "수원시종합사회복지관", 
      backup1_total: 22, backup1_social: 12, backup1_life: 10,
      backup2_a: 20, backup2_b: 11, backup2_c: 9, backup2_total: 20,
      dLevel_social: 5, dLevel_life: 4, dLevel_total: 9,
      qualification_social: 12, qualification_life: 10, qualification_total: 22,
      tenure_social: 9, tenure_life: 8, tenure_rate: 77.3,
      education_f: 15, education_rate_fb: 75.0, education_warning: 4, education_g: 11,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: "4",
      management: "부산시", region: "부산", district: "해운대구",
      institutionCode: "3001", institutionName: "해운대복지관", 
      backup1_total: 14, backup1_social: 7, backup1_life: 7,
      backup2_a: 13, backup2_b: 6, backup2_c: 7, backup2_total: 13,
      dLevel_social: 2, dLevel_life: 3, dLevel_total: 5,
      qualification_social: 7, qualification_life: 7, qualification_total: 14,
      tenure_social: 5, tenure_life: 6, tenure_rate: 78.6,
      education_f: 9, education_rate_fb: 75.0, education_warning: 2, education_g: 7,
      createdAt: new Date(), updatedAt: new Date()
    }
  ], []);

  // Initialize store with mock data if empty
  React.useEffect(() => {
    if (integratedAnalysisData.length === 0) {
      setIntegratedAnalysisData(mockAnalysisData);
    }
  }, [integratedAnalysisData.length, mockAnalysisData, setIntegratedAnalysisData]);

  // Use actual data from store or fallback to mock data
  const analysisData = integratedAnalysisData.length > 0 ? integratedAnalysisData : mockAnalysisData;

  useEffect(() => {
    fetchEducationStatistics();
    // Initialize employee statistics with mock data
    setEmployeeStats(mockEmployeeStats);
  }, [mockEmployeeStats]);

  const fetchEducationStatistics = async () => {
    try {
      const response = await fetch('/api/education-statistics');
      if (response.ok) {
        const data = await response.json();
        setEducationStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch education statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalysis = async () => {
    setLoading(true);
    await fetchEducationStatistics();
    toast({
      title: "분석 완료",
      description: "교육 데이터 분석이 업데이트되었습니다.",
    });
  };

  if (loading && !educationStats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-600">데이터를 분석하고 있습니다...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">교육-종사자 연동분석 시스템</h1>
          <p className="text-slate-600 mt-2">교육 데이터와 종사자 데이터를 연동하여 종합적인 분석 결과를 제공합니다</p>
          <div className="flex items-center gap-4 mt-4">
            <Button onClick={refreshAnalysis} disabled={loading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {loading ? '분석 중...' : '연동분석 새로고침'}
            </Button>
            <Badge variant="outline" className="px-3 py-1">
              {analysisData.length}개 기관 분석완료
            </Badge>
          </div>
        </div>

        {/* 1. 데이터 업로드 및 관리 섹션 */}
        <section className="mb-12 p-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <FileUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">1. 데이터 업로드 및 관리</h2>
                <p className="text-indigo-700 text-sm font-medium">Data Upload & Management</p>
              </div>
            </div>
            <p className="text-slate-600">연동분석을 위한 교육 데이터와 종사자 데이터를 업로드하고 관리합니다.</p>
          </div>
          
          <Tabs defaultValue="education" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="education">교육 데이터</TabsTrigger>
              <TabsTrigger value="employee">종사자 관리</TabsTrigger>
            </TabsList>

            <TabsContent value="education" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      교육 수강자
                    </CardTitle>
                    <CardDescription>
                      수강자 정보 및 교육 이수 현황 관리
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        • 수강자 개인정보 관리
                        • 교육 이수 현황 추적
                        • 수료증 발급 상태 확인
                      </div>
                      <Link href="/participants">
                        <Button className="w-full group-hover:bg-blue-600 group-hover:text-white">
                          <FileUp className="h-4 w-4 mr-2" />
                          수강자 관리하기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      기본 교육
                    </CardTitle>
                    <CardDescription>
                      필수 기본교육 데이터 관리
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        • 법정 의무교육 데이터
                        • 기초 직무교육 현황
                        • 수료/미수료 관리
                      </div>
                      <Link href="/basic-education">
                        <Button className="w-full group-hover:bg-green-600 group-hover:text-white">
                          <FileUp className="h-4 w-4 mr-2" />
                          기본교육 관리하기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-600" />
                      심화 교육
                    </CardTitle>
                    <CardDescription>
                      전문성 향상을 위한 심화교육 관리
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        • 전문교육 과정 관리
                        • 특별교육 현황
                        • 심화 수료 현황
                      </div>
                      <Link href="/advanced-education">
                        <Button className="w-full group-hover:bg-purple-600 group-hover:text-white">
                          <FileUp className="h-4 w-4 mr-2" />
                          심화교육 관리하기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="employee" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-orange-600" />
                      종사자 데이터
                    </CardTitle>
                    <CardDescription>
                      종사자 현황 및 인사정보 관리
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        • 종사자 기본정보 관리
                        • 자격증 및 경력 현황
                        • 입사/퇴사 이력 관리
                      </div>
                      <Link href="/employee-data">
                        <Button className="w-full group-hover:bg-orange-600 group-hover:text-white">
                          <FileUp className="h-4 w-4 mr-2" />
                          종사자 관리하기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-teal-600" />
                      기관 현황
                    </CardTitle>
                    <CardDescription>
                      기관별 배치 현황 및 정원 관리
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        • 기관별 배치정원 관리
                        • 실제 배치현황 파악
                        • 충원율 분석
                      </div>
                      <Link href="/institution-data">
                        <Button className="w-full group-hover:bg-teal-600 group-hover:text-white">
                          <FileUp className="h-4 w-4 mr-2" />
                          기관현황 관리하기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* 2. 연동분석 섹션 */}
        {analysisData.length > 0 && (
          <section className="mb-12 p-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-600 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">2. 연동분석 핵심 지표</h2>
                  <p className="text-green-700 text-sm font-medium">Integrated Analysis Dashboard</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-green-700">백업입력 현황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {analysisData.reduce((sum, item) => sum + item.backup1_total, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">전체 등록자 수</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-purple-700">자격현황 평균</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {(analysisData.reduce((sum, item) => sum + item.qualification_total, 0) / analysisData.length).toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">기관 평균 자격자 수</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-blue-700">교육 이수율 평균</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {(analysisData.reduce((sum, item) => sum + item.education_rate_fb, 0) / analysisData.length).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">평균 이수율</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-700">경고 현황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {analysisData.reduce((sum, item) => sum + item.education_warning, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">총 경고 건수</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 연동분석 복합 테이블 */}
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    고급 연동분석 - 종합 현황표
                  </CardTitle>
                  <CardDescription>
                    교육 이수 현황과 종사자 현황을 연동한 종합 분석 데이터입니다
                  </CardDescription>
                </CardHeader>
                <CardContent>

                  <div className="overflow-x-auto overflow-y-auto max-h-[600px] border rounded-md shadow-lg">
                    <div className="min-w-[8000px]">
                      <table className="w-full border-collapse bg-white">
                        <thead>
                          {/* First level headers */}
                          <tr>
                            <th rowSpan={2} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">관리명</th>
                            <th rowSpan={2} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">시도</th>
                            <th rowSpan={2} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">시군구</th>
                            <th rowSpan={2} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">기관코드</th>
                            <th rowSpan={2} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">기관명</th>
                            <th colSpan={3} className="border border-gray-300 px-4 py-3 bg-green-100 text-xs font-bold text-green-800 whitespace-nowrap">백업입력(수강권리 등록자 수)</th>
                            <th colSpan={4} className="border border-gray-300 px-4 py-3 bg-cyan-100 text-xs font-bold text-cyan-800 whitespace-nowrap">백업입력(예산지시 등록자 수)</th>
                            <th colSpan={3} className="border border-gray-300 px-4 py-3 bg-blue-100 text-xs font-bold text-blue-800 whitespace-nowrap">D급 백업입력(수강권리 등록자 수)</th>
                            <th colSpan={3} className="border border-gray-300 px-4 py-3 bg-purple-200 text-xs font-bold text-purple-800 whitespace-nowrap">(1-1.) 근무자 자격현황</th>
                            <th colSpan={3} className="border border-gray-300 px-4 py-3 bg-yellow-100 text-xs font-bold text-yellow-800 whitespace-nowrap">(1-1.a) 근무자 근속현황</th>
                            <th colSpan={4} className="border border-gray-300 px-4 py-3 bg-green-200 text-xs font-bold text-green-800 whitespace-nowrap">(1-4.) 근무자 직무교육 이수율</th>
                          </tr>
                          {/* Second level headers */}
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전체 근무자(=O+@)</th>
                            <th className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전문사회복지사 ①</th>
                            <th className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사회복지사 ②</th>
                            <th className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">A 전체</th>
                            <th className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">B 전업사회복지사</th>
                            <th className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">C 생활지원사</th>
                            <th className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">전체 근무자(=@+@)</th>
                            <th className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">전문사회복지사 ①</th>
                            <th className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">생활지원사 ②</th>
                            <th className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">D 전체</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-200 text-xs font-semibold text-purple-700 whitespace-nowrap">전업사회복지사</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-200 text-xs font-semibold text-purple-700 whitespace-nowrap">생활지원사</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-200 text-xs font-semibold text-purple-700 whitespace-nowrap">자격취득(=@+@)</th>
                            <th className="border border-gray-300 px-3 py-2 bg-yellow-100 text-xs font-semibold text-yellow-700 whitespace-nowrap">전문사회복지사 ①</th>
                            <th className="border border-gray-300 px-3 py-2 bg-yellow-100 text-xs font-semibold text-yellow-700 whitespace-nowrap">생활지원사 ②</th>
                            <th className="border border-gray-300 px-3 py-2 bg-yellow-100 text-xs font-semibold text-yellow-700 whitespace-nowrap">(E/A) 재응률</th>
                            <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">F 재응률</th>
                            <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">(F/B) 재응률</th>
                            <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">(경고) 총험률</th>
                            <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">G 재응관관(G/C) 재응률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.map((row, index) => (
                            <tr key={row.id || index} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{row.management}</td>
                              <td className="border border-gray-300 px-3 py-2 text-xs">{row.region}</td>
                              <td className="border border-gray-300 px-3 py-2 text-xs">{row.district}</td>
                              <td className="border border-gray-300 px-3 py-2 text-xs font-mono">{row.institutionCode}</td>
                              <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{row.institutionName}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.backup1_total}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup1_social}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup1_life}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.backup2_a}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup2_b}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup2_c}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.backup2_total}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.dLevel_social}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.dLevel_life}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.dLevel_total}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.qualification_social}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.qualification_life}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.qualification_total}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.tenure_social}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.tenure_life}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-blue-600">{row.tenure_rate.toFixed(1)}%</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_f}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-green-600">{row.education_rate_fb.toFixed(1)}%</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-red-600">{row.education_warning}</td>
                              <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_g}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* 3. 통계 현황 섹션 */}
        <section className="mb-12 p-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-600 rounded-lg">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">3. 통계 현황</h2>
                <p className="text-purple-700 text-sm font-medium">Statistics Overview</p>
              </div>
            </div>
            <p className="text-slate-600">종사자 및 교육 현황에 대한 상세한 통계를 확인하세요.</p>
          </div>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                통계 개요
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                종사자 현황
              </TabsTrigger>
              <TabsTrigger value="education" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                교육 현황
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 핵심 지표 요약 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      핵심 지표 요약
                    </CardTitle>
                    <CardDescription>주요 통계를 한눈에 확인하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {employeeStats && (
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-orange-800">총 종사자</span>
                          <div className="text-lg font-bold text-orange-600">{employeeStats.totalEmployees}명</div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-orange-700">충원율</span>
                          <span className="text-sm font-semibold text-orange-600">{employeeStats.employmentRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                    {educationStats && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">총 수강자</span>
                          <div className="text-lg font-bold text-green-600">{educationStats.totalParticipants}명</div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-green-700">완전 수료율</span>
                          <span className="text-sm font-semibold text-green-600">
                            {educationStats.totalParticipants > 0 
                              ? Math.round((educationStats.bothEducationCompleted / educationStats.totalParticipants) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    )}
                    {analysisData.length > 0 && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-800">연동분석 기관</span>
                          <div className="text-lg font-bold text-purple-600">{analysisData.length}개</div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-purple-700">평균 교육 이수율</span>
                          <span className="text-sm font-semibold text-purple-600">
                            {(analysisData.reduce((sum, item) => sum + item.education_rate_fb, 0) / analysisData.length).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 빠른 액션 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileUp className="h-5 w-5 text-indigo-600" />
                      빠른 작업
                    </CardTitle>
                    <CardDescription>자주 사용하는 기능들</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/basic-education">
                      <Button className="w-full justify-start" variant="outline">
                        <BookOpen className="h-4 w-4 mr-2" />
                        기본교육 관리
                      </Button>
                    </Link>
                    <Link href="/advanced-education">
                      <Button className="w-full justify-start" variant="outline">
                        <Award className="h-4 w-4 mr-2" />
                        심화교육 관리
                      </Button>
                    </Link>
                    <Link href="/employee-data">
                      <Button className="w-full justify-start" variant="outline">
                        <UserCheck className="h-4 w-4 mr-2" />
                        종사자 데이터 관리
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="employee" className="mt-6">
              <div>
                {/* 종사자 현황 섹션 */}
                {employeeStats ? (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  종사자 현황 및 배치 분석
                </h2>
                
                {/* 종사자 주요 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-orange-700">총 종사자</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {employeeStats.totalEmployees}명
                      </div>
                      <p className="text-xs text-muted-foreground">전체 재직자</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-purple-700">충원율</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {employeeStats.employmentRate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        부족: {employeeStats.institutionAllocation.shortfall}명
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* 직군별 분포 */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">직군별 분포</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">전담사회복지사</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{employeeStats.totalSocialWorkers}명</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({((employeeStats.totalSocialWorkers / employeeStats.totalEmployees) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">생활지원사</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{employeeStats.totalLifeSupport}명</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({((employeeStats.totalLifeSupport / employeeStats.totalEmployees) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 기관별 배치 현황 */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4" />
                      기관별 배치 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-800">배치정원</span>
                      <div className="text-lg font-bold text-green-700">{employeeStats.institutionAllocation.totalAllocated}명</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">실제배치</span>
                      <div className="text-lg font-bold text-blue-700">{employeeStats.institutionAllocation.actualEmployed}명</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-800">부족인원</span>
                      <div className="text-lg font-bold text-red-700">{employeeStats.institutionAllocation.shortfall}명</div>
                    </div>
                  </CardContent>
                </Card>

                {/* 지역별 현황 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      지역별 종사자 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(employeeStats.regionBreakdown).map(([region, count]) => (
                        <div key={region} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">{region}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">{count}명</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">평균 근속연수</span>
                        <Badge variant="outline" className="font-bold">
                          {employeeStats.averageTenure}년
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
                ) : (
                  <Card className="text-center py-16">
                    <CardContent>
                      <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className="mb-2">종사자 데이터가 없습니다</CardTitle>
                      <p className="text-muted-foreground mb-6">
                        종사자 데이터를 먼저 업로드해주세요.
                      </p>
                      <Link href="/employee-data">
                        <Button>종사자 데이터 업로드</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="education" className="mt-6">
              <div>
                {/* 교육 현황 섹션 */}
                {educationStats ? (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  교육 이수 현황
                </h2>
                
                {/* 교육 주요 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">총 수강자</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{educationStats.totalParticipants}명</div>
                      <p className="text-xs text-muted-foreground">등록된 수강자 수</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">완전 수료율</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {educationStats.totalParticipants > 0 
                          ? Math.round((educationStats.bothEducationCompleted / educationStats.totalParticipants) * 100)
                          : 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">기본+심화 수료</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 교육 이수 현황 */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">교육 이수 현황</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">기본+심화 완료</span>
                      </span>
                      <Badge variant="outline">{educationStats.bothEducationCompleted}명</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">기본교육만</span>
                      </span>
                      <Badge variant="outline">
                        {educationStats.basicEducationCompleted - educationStats.bothEducationCompleted}명
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium">심화교육만</span>
                      </span>
                      <Badge variant="outline">
                        {educationStats.advancedEducationCompleted - educationStats.bothEducationCompleted}명
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">미수료</span>
                      </span>
                      <Badge variant="outline">{educationStats.noEducationCompleted}명</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* 직군별 수강 현황 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      직군별 수강 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(educationStats.jobTypeBreakdown || {}).map(([jobType, count]) => (
                        <div key={jobType} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{jobType || '미분류'}</span>
                          <Badge variant="secondary" className="text-xs">{count}명</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  교육 이수 현황
                </h2>
                <Card className="text-center py-16">
                  <CardContent>
                    <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">교육 데이터가 없습니다</CardTitle>
                    <p className="text-muted-foreground mb-6">
                      교육 데이터를 먼저 업로드해주세요.
                    </p>
                  </CardContent>
                </Card>
              </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </section>



      </main>
      
      <Footer />
    </div>
  );
}