import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Users,
  Building,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  RefreshCw,
  Download,
  Map,
  MapPin,
  Maximize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEducationData } from "@/hooks/use-education-data";
import GyeongsangnamMap from "@/components/dashboard/gyeongsangnam-map";

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
  };
}

interface StatusReportData {
  region: string;
  province: string;
  district: string;
  institutionCode: string;
  institutionName: string;
  // 배정입력(수강권리)
  totalWorkers_Course: number;
  socialWorkers_Course: number;
  lifeSupport_Course: number;
  // 배정입력(예산지시)
  totalA: number;
  socialWorkersB: number;
  lifeSupportC: number;
  totalWorkers_Budget: number;
  // 정부 배정 (Government 기준)
  socialWorkers_Government: number;
  lifeSupport_Government: number;
  // D급 배정입력
  socialWorkersD: number;
  lifeSupportD: number;
  totalD: number;
  // 종사자 채용현황 (실제 채용률 계산)
  employmentRateE: number; // E/A 채용률
  employmentRateF: number; // F/B 채용률  
  employmentRateG: number; // G/C 채용률
  // 개별 직종 채용률
  employmentRateSocialWorkers: number; // 전담사회복지사 채용률
  employmentRateLifeSupport: number; // 생활지원사 채용률
  // 종사자 근속현황
  avgTenureSocialWorkers: number;
  avgTenureLifeSupport: number;
  // 직무교육 이수율 - H 대상인원
  educationTargetH_Total: number;
  educationTargetH_SocialWorkers: number;
  educationTargetH_LifeSupport: number;
  // I 이수인원
  educationCompletedI_Total: number;
  educationCompletedI_SocialWorkers: number;
  educationCompletedI_LifeSupport: number;
  // I/H 이수율
  educationRateIH_Total: number;
  educationRateIH_SocialWorkers: number;
  educationRateIH_LifeSupport: number;
  // I/D 이수율
  educationRateID_Total: number;
  educationRateID_SocialWorkers: number;
  educationRateID_LifeSupport: number;
}

export default function Dashboard() {
  const [educationStats, setEducationStats] = useState<EducationStatistics | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatistics | null>(null);
  const [statusReportData, setStatusReportData] = useState<StatusReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMapData, setSelectedMapData] = useState<'institutions' | 'education' | 'employees'>('institutions');
  const [showAllData, setShowAllData] = useState(false);
  const [previewCount, setPreviewCount] = useState(10);
  const [currentSnapshotDate, setCurrentSnapshotDate] = useState<string>('2025-08-04');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedMapType, setSelectedMapType] = useState<string>('');
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  // 큰 지도 모달 상태
  const [isLargeMapModalOpen, setIsLargeMapModalOpen] = useState(false);
  const [selectedLargeMapData, setSelectedLargeMapData] = useState<any[]>([]);
  const [selectedLargeMapTitle, setSelectedLargeMapTitle] = useState<string>('');
  const [selectedLargeMapType, setSelectedLargeMapType] = useState<string>('');
  const { toast } = useToast();

  // 📊 종합현황표 데이터 내보내기 함수
  const exportStatusReportData = () => {
    if (!statusReportData || statusReportData.length === 0) {
      toast({
        title: "내보낼 데이터 없음",
        description: "종합현황표 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      // CSV 형태로 데이터 변환
      const csvData = [];
      
      // 3층 구조 헤더 추가 (종합현황표와 동일한 구조)
      
      // 1단계 헤더 (상위 카테고리)
      const header1 = [
        '광역명', '시도', '시군구', '기관코드', '기관명',
        '배정인원(수기관리 등록기준)', '', '',
        '배정인원(예산내시 등록기준)', '', '',
        'D 채용인원(수기관리 등록기준)', '', '',
        '(1-1-2) 종사자 채용현황', '', '', '', '', '', '', '',
        '(1-1-3) 종사자 근속현황', '',
        '(1-4-1) 종사자 직무교육 이수율', '', '', '', '', '', '', '', '', '', '', ''
      ];
      
      // 2단계 헤더 (중간 카테고리)
      const header2 = [
        '', '', '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '전체 종사자', '',
        '전담사회복지사', '', '',
        '생활지원사', '', '',
        '평균 근속기간(일)', '',
        'H 직무교육 대상인원(배움터 등록기준)', '', '',
        'I 직무교육 이수인원(배움터 등록기준)', '', '',
        '(I/H) 직무교육 이수율(배움터 등록기준)', '', '',
        '(I/D) 직무교육 이수율(모인우리 등록기준)', '', ''
      ];
      
      // 3단계 헤더 (세부 항목)
      const header3 = [
        '광역명', '시도', '시군구', '기관코드', '기관명',
        // 배정인원(수기관리)
        '전체 종사자(=①+②)', '전담사회복지사 ①', '생활지원사 ②',
        // 배정인원(예산내시)
        'A 전체(=①+②)', 'B 전담사회복지사 ①', 'C 생활지원사 ②',
        // D 채용인원
        'D① 전담사회복지사', 'D② 생활지원사', 'D 전체',
        // 종사자 채용현황 - 전체 종사자
        '채용수', '배정수',
        // 종사자 채용현황 - 전담사회복지사
        '채용수(F)', '배정수(B)', '(F/B) 채용률',
        // 종사자 채용현황 - 생활지원사
        '채용수(G)', '배정수(C)', '(G/C) 채용률',
        // 종사자 근속현황
        '전담사회복지사', '생활지원사',
        // H 직무교육 대상인원
        '전체', '전담사회복지사', '생활지원사',
        // I 직무교육 이수인원
        '전체', '전담사회복지사', '생활지원사',
        // I/H 이수율
        '전체', '전담사회복지사', '생활지원사',
        // I/D 이수율
        '전체', '전담사회복지사', '생활지원사'
      ];
      
      // 3층 헤더 추가
      csvData.push(header1);
      csvData.push(header2);
      csvData.push(header3);

      // 데이터 행 추가 (3층 헤더 구조에 맞춤)
      statusReportData.forEach(data => {
        csvData.push([
          data.province || '경남광역',
          data.region || '경상남도',
          data.district || '',
          data.institutionCode || '',
          data.institutionName || '',
          // 배정인원(수기관리) - 전체 종사자(=①+②), 전담사회복지사 ①, 생활지원사 ②
          data.totalCourse || 0,
          data.socialWorkers_Course || 0,
          data.lifeSupport_Course || 0,
          // 배정인원(예산내시) - A 전체(=①+②), B 전담사회복지사 ①, C 생활지원사 ②
          data.totalA || 0,
          data.socialWorkersB || 0,
          data.lifeSupportC || 0,
          // D 채용인원 - D① 전담사회복지사, D② 생활지원사, D 전체
          data.socialWorkersD || 0,
          data.lifeSupportD || 0,
          data.totalD || 0,
          // 종사자 채용현황 - 전체 종사자: 채용수, 배정수
          data.totalD || 0,
          data.totalA || 0,
          // 종사자 채용현황 - 전담사회복지사: 채용수(F), 배정수(B), (F/B) 채용률
          data.socialWorkersD || 0,
          data.socialWorkersB || 0,
          data.socialWorkersB > 0 ? Math.round((data.socialWorkersD / data.socialWorkersB) * 100) : 0,
          // 종사자 채용현황 - 생활지원사: 채용수(G), 배정수(C), (G/C) 채용률
          data.lifeSupportD || 0,
          data.lifeSupportC || 0,
          data.lifeSupportC > 0 ? Math.round((data.lifeSupportD / data.lifeSupportC) * 100) : 0,
          // 종사자 근속현황 - 전담사회복지사, 생활지원사
          data.avgTenureSocialWorkers || 0,
          data.avgTenureLifeSupport || 0,
          // H 직무교육 대상인원 - 전체, 전담사회복지사, 생활지원사
          data.educationTargetH_Total || 0,
          data.educationTargetH_SocialWorkers || 0,
          data.educationTargetH_LifeSupport || 0,
          // I 직무교육 이수인원 - 전체, 전담사회복지사, 생활지원사
          data.educationCompletedI_Total || 0,
          data.educationCompletedI_SocialWorkers || 0,
          data.educationCompletedI_LifeSupport || 0,
          // I/H 이수율 - 전체, 전담사회복지사, 생활지원사
          Math.round(data.educationRateIH_Total || 0),
          Math.round(data.educationRateIH_SocialWorkers || 0),
          Math.round(data.educationRateIH_LifeSupport || 0),
          // I/D 이수율 - 전체, 전담사회복지사, 생활지원사
          Math.round(data.educationRateID_Total || 0),
          Math.round(data.educationRateID_SocialWorkers || 0),
          Math.round(data.educationRateID_LifeSupport || 0)
        ]);
      });

      // CSV 문자열 생성
      const csvString = csvData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // BOM 추가 (한글 깨짐 방지)
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvString;

      // 파일 다운로드
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // 파일명 생성 (현재 날짜 포함)
      const now = new Date();
      const dateString = now.getFullYear() + 
        String(now.getMonth() + 1).padStart(2, '0') + 
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + 
        String(now.getMinutes()).padStart(2, '0');
      
      link.setAttribute('download', `종합현황표_${dateString}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "내보내기 완료",
        description: `종합현황표 데이터가 CSV 파일로 다운로드되었습니다. (${statusReportData.length}개 기관)`,
      });

    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      toast({
        title: "내보내기 실패",
        description: "데이터 내보내기 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 검색 필터링된 데이터
  const filteredStatusReportData = statusReportData.filter(row => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      row.institutionName.toLowerCase().includes(searchLower) ||
      row.institutionCode.toLowerCase().includes(searchLower) ||
      row.region.toLowerCase().includes(searchLower) ||
      row.district.toLowerCase().includes(searchLower) ||
      row.province.toLowerCase().includes(searchLower)
    );
  });
  
  // 교육 이수율 지도 데이터 (I/H 배움터 기준)
  const educationMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          total: 0,
          completed: 0,
          institutions: 0
        };
      }
      acc[district].total += item.educationTargetH_Total;
      acc[district].completed += item.educationCompletedI_Total;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => {
      const rate = data.total > 0 ? (data.completed / data.total * 100) : 0;
      return {
        district,
        value: Math.round(rate),
        label: `${Math.round(rate)}%`,
        description: `대상: ${data.total}명, 이수: ${data.completed}명, 기관: ${data.institutions}개`
      };
    });
  }, [statusReportData]);
  
  // 교육 이수율 지도 데이터 (I/D 모인우리 기준)
  const educationMapDataID = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          totalD: 0,
          completed: 0,
          institutions: 0
        };
      }
      acc[district].totalD += item.totalD;
      acc[district].completed += item.educationCompletedI_Total;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => {
      const rate = data.totalD > 0 ? (data.completed / data.totalD * 100) : 0;
      return {
        district,
        value: Math.round(rate),
        label: `${Math.round(rate)}%`,
        description: `채용인원: ${data.totalD}명, 이수: ${data.completed}명, 기관: ${data.institutions}개`
      };
    });
  }, [statusReportData]);
  
  // 전담사회복지사 채용률 지도 데이터 (기관 기준)
  const employmentRateSocialWorkersMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          allocated: 0,
          hired: 0,
          institutions: 0
        };
      }
      acc[district].allocated += item.socialWorkers_Course;
      acc[district].hired += item.socialWorkersD;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => {
      const rate = data.allocated > 0 ? (data.hired / data.allocated * 100) : 0;
      return {
        district,
        value: Math.round(rate),
        label: `${Math.round(rate)}%`,
        description: `배정: ${data.allocated}명, 채용: ${data.hired}명, 기관: ${data.institutions}개`
      };
    });
  }, [statusReportData]);
  
  // 생활지원사 채용률 지도 데이터 (기관 기준)
  const employmentRateLifeSupportMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          allocated: 0,
          hired: 0,
          institutions: 0
        };
      }
      acc[district].allocated += item.lifeSupport_Course;
      acc[district].hired += item.lifeSupportD;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    const result = Object.entries(districtData).map(([district, data]: [string, any]) => {
      const rate = data.allocated > 0 ? (data.hired / data.allocated * 100) : 0;
      return {
        district,
        value: Math.round(rate),
        label: `${Math.round(rate)}%`,
        description: `배정: ${data.allocated}명, 채용: ${data.hired}명, 기관: ${data.institutions}개`
      };
    });
    
    // 디버깅: 생활지원사 데이터 확인
    console.log('=== 생활지원사 채용률 데이터 디버깅 ===');
    console.log('지역별 데이터:', districtData);
    console.log('최종 지도 데이터:', result);
    console.log('값 범위:', {
      min: Math.min(...result.filter(r => r.value > 0).map(r => r.value)),
      max: Math.max(...result.map(r => r.value))
    });
    
    return result;
  }, [statusReportData]);
  
  // 전담사회복지사 배정 vs 채용 격차 지도 데이터 (기관 기준)
  const allocationComparisonSocialWorkersMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          allocated: 0,
          hired: 0,
          institutions: 0
        };
      }
      acc[district].allocated += item.socialWorkers_Course;
      acc[district].hired += item.socialWorkersD;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => {
      const rate = data.allocated > 0 ? (data.hired / data.allocated * 100) : 0;
      const gap = data.allocated - data.hired;
      
      return {
        district,
        value: Math.round(rate),
        label: gap >= 0 ? `-${gap}명` : `+${Math.abs(gap)}명`,
        color: gap > 0 ? '#ef4444' : gap < 0 ? '#3b82f6' : '#10b981',
        description: `예산배정: ${data.allocated}명, 실제채용: ${data.hired}명, 부족: ${gap}명`
      };
    });
  }, [statusReportData]);
  
  // 생활지원사 배정 vs 채용 격차 지도 데이터 (기관 기준)
  const allocationComparisonLifeSupportMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          allocated: 0,
          hired: 0,
          institutions: 0
        };
      }
      acc[district].allocated += item.lifeSupport_Course;
      acc[district].hired += item.lifeSupportD;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => {
      const rate = data.allocated > 0 ? (data.hired / data.allocated * 100) : 0;
      const gap = data.allocated - data.hired;
      
      return {
        district,
        value: Math.round(rate),
        label: gap >= 0 ? `-${gap}명` : `+${Math.abs(gap)}명`,
        color: gap > 0 ? '#ef4444' : gap < 0 ? '#3b82f6' : '#10b981',
        description: `예산배정: ${data.allocated}명, 실제채용: ${data.hired}명, 부족: ${gap}명`
      };
    });
  }, [statusReportData]);
  
  // 전담사회복지사 근속기간 지도 데이터
  const tenureSocialWorkersMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          avgTenure: [],
          count: 0,
          institutions: 0
        };
      }
      if (item.avgTenureSocialWorkers > 0) {
        acc[district].avgTenure.push(item.avgTenureSocialWorkers);
        acc[district].count++;
      }
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => {
      const avg = data.avgTenure.length > 0 ? 
        Math.round(data.avgTenure.reduce((a: number, b: number) => a + b, 0) / data.avgTenure.length) : 0;
      
      const years = Math.floor(avg / 365);
      const months = Math.floor((avg % 365) / 30);
      
      return {
        district,
        value: Math.min(Math.round((avg / 365) * 20), 100), // 5년을 100으로 매핑
        label: years > 0 ? `${years}년 ${months}개월` : avg > 0 ? `${months}개월` : '데이터 없음',
        description: `평균 근속: ${years}년 ${months}개월, 기관: ${data.institutions}개, 인원: ${data.count}명`
      };
    });
  }, [statusReportData]);
  
  // 생활지원사 근속기간 지도 데이터
  const tenureLifeSupportMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          avgTenure: [],
          count: 0,
          institutions: 0
        };
      }
      if (item.avgTenureLifeSupport > 0) {
        acc[district].avgTenure.push(item.avgTenureLifeSupport);
        acc[district].count++;
      }
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => {
      const avg = data.avgTenure.length > 0 ?
        Math.round(data.avgTenure.reduce((a: number, b: number) => a + b, 0) / data.avgTenure.length) : 0;
      
      const years = Math.floor(avg / 365);
      const months = Math.floor((avg % 365) / 30);
      
      return {
        district,
        value: Math.min(Math.round((avg / 365) * 20), 100), // 5년을 100으로 매핑
        label: years > 0 ? `${years}년 ${months}개월` : avg > 0 ? `${months}개월` : '데이터 없음',
        description: `평균 근속: ${years}년 ${months}개월, 기관: ${data.institutions}개, 인원: ${data.count}명`
      };
    });
  }, [statusReportData]);
  
  // 기관 분포 지도 데이터
  const institutionMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          count: 0,
          names: [],
          hasAllocationDifference: false,
          differenceCount: 0
        };
      }
      acc[district].count += 1;
      acc[district].names.push(item.institutionName);
      
      // 복지부 배정과 기관 배정 차이 확인
      const governmentTotal = item.socialWorkersB + item.lifeSupportC;
      const courseTotal = item.socialWorkers_Course + item.lifeSupport_Course;
      const hasDifference = governmentTotal !== courseTotal;
      
      if (hasDifference) {
        acc[district].hasAllocationDifference = true;
        acc[district].differenceCount += 1;
      }
      
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => ({
      district,
      value: data.count,
      label: data.hasAllocationDifference ? `${district} ⭐ ${data.count}개` : `${district} ${data.count}개`,
      description: data.hasAllocationDifference 
        ? `${data.names.slice(0, 3).join(', ')}${data.names.length > 3 ? ` 외 ${data.names.length - 3}개` : ''} (⭐ 배정차이 ${data.differenceCount}개 기관)`
        : data.names.slice(0, 3).join(', ') + (data.names.length > 3 ? ` 외 ${data.names.length - 3}개` : ''),
      // 별표가 있는 지역을 위한 추가 스타일링 정보
      hasAllocationDifference: data.hasAllocationDifference
    }));
  }, [statusReportData]);
  
  // 전담사회복지사 현황 지도 데이터
  const socialWorkersMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          allocated: 0,
          hired: 0,
          institutions: 0
        };
      }
      acc[district].allocated += item.socialWorkers_Course;
      acc[district].hired += item.socialWorkersD;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => ({
      district,
      value: data.hired,
      label: `${data.allocated}/${data.hired}`,
      description: `전담사회복지사 배정/채용: ${data.allocated}/${data.hired}명, 기관: ${data.institutions}개`
    }));
  }, [statusReportData]);
  
  // 생활지원사 현황 지도 데이터
  const lifeSupportMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          allocated: 0,
          hired: 0,
          institutions: 0
        };
      }
      acc[district].allocated += item.lifeSupport_Course;
      acc[district].hired += item.lifeSupportD;
      acc[district].institutions += 1;
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => ({
      district,
      value: data.hired,
      label: `${data.allocated}/${data.hired}`,
      description: `생활지원사 배정/채용: ${data.allocated}/${data.hired}명, 기관: ${data.institutions}개`
    }));
  }, [statusReportData]);
  
  // 선택된 시군구의 기관 데이터 필터링
  const selectedDistrictInstitutions = useMemo(() => {
    if (!selectedDistrict) return [];
    return statusReportData.filter(item => item.district === selectedDistrict);
  }, [statusReportData, selectedDistrict]);
  
  // 지역 클릭 핸들러
  const handleDistrictClick = (districtName: string, mapType?: string) => {
    setSelectedDistrict(districtName);
    setSelectedMapType(mapType || '');
    setIsDistrictModalOpen(true);
  };

  // 큰 지도 열기 핸들러
  const handleOpenLargeMap = (mapData: any[], title: string, mapType: string) => {
    setSelectedLargeMapData(mapData);
    setSelectedLargeMapTitle(title);
    setSelectedLargeMapType(mapType);
    setIsLargeMapModalOpen(true);
  };

  // 큰 지도에서 지역 클릭 핸들러 (큰 지도를 유지하면서 지역 정보 표시)
  const handleDistrictClickFromLargeMap = (districtName: string, mapType?: string) => {
    setSelectedDistrict(districtName);
    setSelectedMapType(mapType || selectedLargeMapType);
    setIsDistrictModalOpen(true);
    // 큰 지도는 열린 상태로 유지
  };

  // 맞춤형 모달 컨텐츠 렌더링
  const renderModalContent = () => {
    if (selectedDistrictInstitutions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          해당 지역에 기관 데이터가 없습니다.
        </div>
      );
    }

    const getModalTitle = () => {
      const typeMap: { [key: string]: string } = {
        'education-ih': 'I/H 교육 이수율',
        'education-id': 'I/D 교육 이수율',
        'employment-social-workers': '전담사회복지사 채용률',
        'employment-life-support': '생활지원사 채용률',
        'allocation-social-workers': '전담사회복지사 배정/채용 격차',
        'allocation-life-support': '생활지원사 배정/채용 격차',
        'tenure-social-workers': '전담사회복지사 평균 근속기간',
        'tenure-life-support': '생활지원사 평균 근속기간',
        'institutions': '기관 분포',
        'employees-social-workers': '전담사회복지사 배치 현황',
        'employees-life-support': '생활지원사 배치 현황'
      };
      return typeMap[selectedMapType] || '종합 현황';
    };

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            {selectedDistrict} - {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            {getModalTitle()}에 대한 기관별 상세 정보입니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="overflow-x-auto">
            {selectedMapType.startsWith('education') && renderEducationTable()}
            {selectedMapType.includes('employment') && renderEmploymentTable()}
            {selectedMapType.includes('allocation') && renderAllocationTable()}
            {selectedMapType.includes('tenure') && renderTenureTable()}
            {selectedMapType === 'institutions' && renderInstitutionTable()}
            {selectedMapType.includes('employees') && renderEmployeeTable()}
            {!selectedMapType && renderFullTable()}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              총 {selectedDistrictInstitutions.length}개 기관
            </div>
            <Button onClick={() => setIsDistrictModalOpen(false)} variant="outline">
              닫기
            </Button>
          </div>
        </div>
      </>
    );
  };

  // 큰 지도 모달 컨텐츠 렌더링
  const renderLargeMapContent = () => {
    const getDetailedMapInfo = () => {
      const totalInstitutions = statusReportData.length;
      const stats = statusReportData.reduce((acc, item) => {
        const governmentTotal = item.socialWorkersB + item.lifeSupportC;
        const courseTotal = item.socialWorkers_Course + item.lifeSupport_Course;
        const totalHired = item.socialWorkersD + item.lifeSupportD;
        
        acc.totalGovernmentAllocation += governmentTotal;
        acc.totalCourseAllocation += courseTotal;
        acc.totalHired += totalHired;
        acc.totalEducationTarget += item.educationTargetH_Total;
        acc.totalEducationCompleted += item.educationCompletedI_Total;
        
        if (governmentTotal !== courseTotal) {
          acc.institutionsWithDifference++;
        }
        
        return acc;
      }, {
        totalGovernmentAllocation: 0,
        totalCourseAllocation: 0,
        totalHired: 0,
        totalEducationTarget: 0,
        totalEducationCompleted: 0,
        institutionsWithDifference: 0
      });

      const overallHiringRate = stats.totalCourseAllocation > 0 ? 
        (stats.totalHired / stats.totalCourseAllocation * 100).toFixed(1) : '0.0';
      const overallEducationRate = stats.totalEducationTarget > 0 ? 
        (stats.totalEducationCompleted / stats.totalEducationTarget * 100).toFixed(1) : '0.0';
      const allocationDifferenceRate = ((stats.institutionsWithDifference / totalInstitutions) * 100).toFixed(1);

      return { stats, overallHiringRate, overallEducationRate, allocationDifferenceRate, totalInstitutions };
    };

    const { stats, overallHiringRate, overallEducationRate, allocationDifferenceRate, totalInstitutions } = getDetailedMapInfo();

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-green-600" />
            {selectedLargeMapTitle} - 상세 지역별 현황
          </DialogTitle>
          <DialogDescription>
            경상남도 전체 지역의 {selectedLargeMapTitle.toLowerCase()}을 상세히 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 전체 통계 요약 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalInstitutions}</div>
              <div className="text-sm text-gray-600">총 기관 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallHiringRate}%</div>
              <div className="text-sm text-gray-600">전체 채용률</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{overallEducationRate}%</div>
              <div className="text-sm text-gray-600">전체 교육 이수율</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{allocationDifferenceRate}%</div>
              <div className="text-sm text-gray-600">배정 차이 기관 비율</div>
            </div>
          </div>

          {/* 큰 지도 */}
          <div className="bg-white rounded-lg border p-4">
            <GyeongsangnamMap
              data={selectedLargeMapData}
              colorScheme={selectedLargeMapType.includes('education') ? 'green' : 
                          selectedLargeMapType.includes('employment') ? 'blue' :
                          selectedLargeMapType.includes('allocation') ? 'red' :
                          selectedLargeMapType.includes('tenure') ? 'purple' :
                          selectedLargeMapType === 'institutions' ? 'blue' : 'green'}
              title={selectedLargeMapTitle}
              height="700px"
              showLabels={true}
              onDistrictClick={(district) => {
                handleDistrictClickFromLargeMap(district, selectedLargeMapType);
              }}
            />
          </div>

          {/* 범례 및 설명 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold text-gray-800 mb-3">지도 범례</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>높은 수치 (상위 25%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>중간 수치 (25-50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-300 rounded"></div>
                  <span>낮은 수치 (50-75%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded"></div>
                  <span>매우 낮은 수치 (하위 25%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded border"></div>
                  <span>데이터 없음</span>
                </div>
                {selectedLargeMapType === 'institutions' && (
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 text-lg">⭐</span>
                    <span>복지부/기관 배정 차이가 있는 시군</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold text-gray-800 mb-3">상호작용 가이드</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• 지도를 마우스휠로 확대/축소할 수 있습니다</div>
                <div>• 각 시군을 클릭하면 해당 지역의 상세 정보를 볼 수 있습니다</div>
                <div>• 라벨에 마우스를 올리면 추가 정보가 표시됩니다</div>
                <div>• 색상이 진할수록 해당 지표가 높음을 의미합니다</div>
                {selectedLargeMapType === 'institutions' && (
                  <div>• ⭐ 표시는 복지부 배정과 기관 배정에 차이가 있는 지역입니다</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              경상남도 18개 시군 전체 현황 | 마지막 업데이트: {currentSnapshotDate}
            </div>
            <Button onClick={() => setIsLargeMapModalOpen(false)} variant="outline">
              닫기
            </Button>
          </div>
        </div>
      </>
    );
  };

  // 교육 관련 테이블 렌더링
  const renderEducationTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-50">
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-left">기관명</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관코드</th>
          {selectedMapType.includes('ih') && (
            <>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">교육 대상<br/>(H)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">이수 완료<br/>(I)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">I/H 이수율</th>
            </>
          )}
          {selectedMapType.includes('id') && (
            <>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">이수 완료<br/>(I)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">채용 인원<br/>(D)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">I/D 이수율</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {selectedDistrictInstitutions.map((institution, index) => (
          <tr key={index} className="hover:bg-gray-50">
            <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{institution.institutionName}</td>
            <td className="border border-gray-300 px-3 py-2 text-xs text-center">{institution.institutionCode}</td>
            {selectedMapType.includes('ih') && (
              <>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-blue-600">
                  {institution.educationTargetH_Total}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-green-600">
                  {institution.educationCompletedI_Total}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  <div className={`font-semibold ${institution.educationRateIH_Total >= 80 ? 'text-green-600' : institution.educationRateIH_Total >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                    {Math.round(institution.educationRateIH_Total)}%
                  </div>
                </td>
              </>
            )}
            {selectedMapType.includes('id') && (
              <>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-green-600">
                  {institution.educationCompletedI_Total}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-blue-600">
                  {institution.socialWorkersD + institution.lifeSupportD}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  <div className={`font-semibold ${institution.educationRateID_Total >= 80 ? 'text-green-600' : institution.educationRateID_Total >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                    {Math.round(institution.educationRateID_Total)}%
                  </div>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 채용 관련 테이블 렌더링
  const renderEmploymentTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-50">
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-left">기관명</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관코드</th>
          {selectedMapType.includes('social-workers') ? (
            <>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">배정 인원<br/>(B)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">채용 인원<br/>(F)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">전담사회복지사<br/>채용률</th>
            </>
          ) : (
            <>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">배정 인원<br/>(C)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">채용 인원<br/>(G)</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">생활지원사<br/>채용률</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {selectedDistrictInstitutions.map((institution, index) => (
          <tr key={index} className="hover:bg-gray-50">
            <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{institution.institutionName}</td>
            <td className="border border-gray-300 px-3 py-2 text-xs text-center">{institution.institutionCode}</td>
            {selectedMapType.includes('social-workers') ? (
              <>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-blue-600">
                  {institution.socialWorkers_Government}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-green-600">
                  {institution.socialWorkersD}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  <div className={`font-semibold ${institution.employmentRateSocialWorkers >= 80 ? 'text-green-600' : institution.employmentRateSocialWorkers >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                    {Math.round(institution.employmentRateSocialWorkers)}%
                  </div>
                </td>
              </>
            ) : (
              <>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-blue-600">
                  {institution.lifeSupport_Government}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-green-600">
                  {institution.lifeSupportD}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  <div className={`font-semibold ${institution.employmentRateLifeSupport >= 80 ? 'text-green-600' : institution.employmentRateLifeSupport >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                    {Math.round(institution.employmentRateLifeSupport)}%
                  </div>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 배정/채용 격차 테이블 렌더링
  const renderAllocationTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-50">
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-left">기관명</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관코드</th>
          {selectedMapType.includes('social-workers') ? (
            <>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">배정 인원</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">채용 인원</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">전담사회복지사<br/>격차</th>
            </>
          ) : (
            <>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">배정 인원</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">채용 인원</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">생활지원사<br/>격차</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {selectedDistrictInstitutions.map((institution, index) => {
          const allocation = selectedMapType.includes('social-workers') ? institution.socialWorkers_Course : institution.lifeSupport_Course;
          const hired = selectedMapType.includes('social-workers') ? institution.socialWorkersD : institution.lifeSupportD;
          const gap = allocation - hired;
          
          return (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{institution.institutionName}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">{institution.institutionCode}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-blue-600">
                {allocation}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-green-600">
                {hired}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className={`font-semibold ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                  {gap > 0 ? `+${gap}` : gap}
                  <div className="text-xs text-gray-500 font-normal">
                    ({gap > 0 ? '부족' : gap < 0 ? '초과' : '일치'})
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // 근속 기간 테이블 렌더링
  const renderTenureTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-50">
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-left">기관명</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관코드</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">
            {selectedMapType.includes('social-workers') ? '전담사회복지사' : '생활지원사'}<br/>평균 근속기간
          </th>
        </tr>
      </thead>
      <tbody>
        {selectedDistrictInstitutions.map((institution, index) => {
          const tenureDays = selectedMapType.includes('social-workers') ? institution.avgTenureSocialWorkers : institution.avgTenureLifeSupport;
          const tenureYears = Math.floor(tenureDays / 365);
          const tenureMonths = Math.floor((tenureDays % 365) / 30);
          
          return (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{institution.institutionName}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">{institution.institutionCode}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className={`font-semibold ${tenureDays >= 1095 ? 'text-green-600' : tenureDays >= 730 ? 'text-blue-600' : 'text-red-600'}`}>
                  {tenureDays > 0 ? (
                    tenureYears > 0 ? `${tenureYears}년 ${tenureMonths}개월` : `${tenureMonths}개월`
                  ) : '-'}
                </div>
                <div className="text-xs text-gray-500">
                  ({tenureDays}일)
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // 기관 분포 테이블 렌더링
  const renderInstitutionTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-50">
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-left">기관명</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관코드</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">복지부 배정<br/>(정부 기준)</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관 배정<br/>(과정 기준)</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">배정 차이<br/>(기관-복지부)</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">실제 채용</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">운영 상태</th>
        </tr>
      </thead>
      <tbody>
        {selectedDistrictInstitutions.map((institution, index) => {
          const governmentTotal = institution.socialWorkersB + institution.lifeSupportC;
          const courseTotal = institution.socialWorkers_Course + institution.lifeSupport_Course;
          const totalHired = institution.socialWorkersD + institution.lifeSupportD;
          const allocationDifference = courseTotal - governmentTotal;
          const operationStatus = totalHired >= courseTotal * 0.8 ? '정상' : totalHired > 0 ? '부분운영' : '미운영';
          
          // 배정 차이에 따른 행 스타일 결정
          const hasDifference = allocationDifference !== 0;
          const rowBgClass = hasDifference ? 
            (allocationDifference > 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100') : 
            'hover:bg-gray-50';
          
          return (
            <tr key={index} className={rowBgClass}>
              <td className={`border border-gray-300 px-3 py-2 text-xs font-medium ${hasDifference ? 'border-l-4 ' + (allocationDifference > 0 ? 'border-l-green-500' : 'border-l-red-500') : ''}`}>
                {institution.institutionName}
                {hasDifference && (
                  <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ml-2 ${allocationDifference > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {allocationDifference > 0 ? '▲ 증원' : '▼ 감원'}
                  </div>
                )}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">{institution.institutionCode}</td>
              <td className={`border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-blue-600 ${hasDifference && allocationDifference < 0 ? 'bg-blue-50' : ''}`}>
                {governmentTotal}
                <div className="text-xs text-gray-500 font-normal">
                  SW:{institution.socialWorkersB} / LS:{institution.lifeSupportC}
                </div>
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-purple-600 ${hasDifference && allocationDifference > 0 ? 'bg-purple-50' : ''}`}>
                {courseTotal}
                <div className="text-xs text-gray-500 font-normal">
                  SW:{institution.socialWorkers_Course} / LS:{institution.lifeSupport_Course}
                </div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className={`font-semibold text-lg ${allocationDifference > 0 ? 'text-green-600' : allocationDifference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {allocationDifference > 0 ? `+${allocationDifference}` : allocationDifference}
                </div>
                <div className={`text-xs font-semibold mt-1 px-2 py-1 rounded-full ${allocationDifference > 0 ? 'bg-green-100 text-green-800' : allocationDifference < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                  {allocationDifference > 0 ? '기관 증원' : allocationDifference < 0 ? '기관 감원' : '동일'}
                </div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-green-600">
                {totalHired}
                <div className="text-xs text-gray-500 font-normal">
                  SW:{institution.socialWorkersD} / LS:{institution.lifeSupportD}
                </div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className={`font-semibold ${operationStatus === '정상' ? 'text-green-600' : operationStatus === '부분운영' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {operationStatus}
                </div>
                <div className="text-xs text-gray-500 font-normal">
                  {Math.round((totalHired / courseTotal) * 100)}%
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // 종사자 배치 현황 테이블 렌더링
  const renderEmployeeTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-50">
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-left">기관명</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관코드</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">
            {selectedMapType.includes('social-workers') ? '전담사회복지사' : '생활지원사'}<br/>배치 현황
          </th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">배치율</th>
        </tr>
      </thead>
      <tbody>
        {selectedDistrictInstitutions.map((institution, index) => {
          const allocated = selectedMapType.includes('social-workers') ? institution.socialWorkers_Course : institution.lifeSupport_Course;
          const hired = selectedMapType.includes('social-workers') ? institution.socialWorkersD : institution.lifeSupportD;
          const placementRate = allocated > 0 ? (hired / allocated) * 100 : 0;
          
          return (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{institution.institutionName}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">{institution.institutionCode}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className="font-semibold">
                  <span className="text-blue-600">{allocated}</span>
                  <span className="mx-1">/</span>
                  <span className="text-green-600">{hired}</span>
                </div>
                <div className="text-xs text-gray-500">배정/채용</div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className={`font-semibold ${placementRate >= 80 ? 'text-green-600' : placementRate >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                  {Math.round(placementRate)}%
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // 전체 테이블 렌더링 (기존 모달 내용)
  const renderFullTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-50">
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-left">기관명</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">기관코드</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">전담사회복지사<br/>배정/채용</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">생활지원사<br/>배정/채용</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">채용률</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">교육 이수율<br/>(I/H)</th>
          <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">평균 근속기간</th>
        </tr>
      </thead>
      <tbody>
        {selectedDistrictInstitutions.map((institution, index) => {
          const totalAllocated = institution.socialWorkers_Course + institution.lifeSupport_Course;
          const totalHired = institution.socialWorkersD + institution.lifeSupportD;
          const overallHiringRate = totalAllocated > 0 ? ((totalHired / totalAllocated) * 100) : 0;
          const avgTenureDays = Math.round((institution.avgTenureSocialWorkers + institution.avgTenureLifeSupport) / 2);
          const avgTenureYears = Math.floor(avgTenureDays / 365);
          const avgTenureMonths = Math.floor((avgTenureDays % 365) / 30);
          
          return (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{institution.institutionName}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">{institution.institutionCode}</td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className="text-blue-600 font-semibold">{institution.socialWorkers_Course} / {institution.socialWorkersD}</div>
                <div className="text-xs text-gray-500">
                  {institution.socialWorkers_Course > 0 ? Math.round((institution.socialWorkersD / institution.socialWorkers_Course) * 100) : 0}%
                </div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className="text-green-600 font-semibold">{institution.lifeSupport_Course} / {institution.lifeSupportD}</div>
                <div className="text-xs text-gray-500">
                  {institution.lifeSupport_Course > 0 ? Math.round((institution.lifeSupportD / institution.lifeSupport_Course) * 100) : 0}%
                </div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className={`font-semibold ${overallHiringRate >= 80 ? 'text-green-600' : overallHiringRate >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                  {Math.round(overallHiringRate)}%
                </div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className="font-semibold text-purple-600">
                  {Math.round(institution.educationRateIH_Total)}%
                </div>
                <div className="text-xs text-gray-500">
                  {institution.educationCompletedI_Total}/{institution.educationTargetH_Total}명
                </div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                <div className="font-semibold text-orange-600">
                  {avgTenureDays > 0 ? (
                    avgTenureYears > 0 ? `${avgTenureYears}년 ${avgTenureMonths}개월` : `${avgTenureMonths}개월`
                  ) : '-'}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  
  const {
    isLoading: dataLoading, 
    error: dataError,
  } = useEducationData();

  // 스냅샷 날짜 가져오기
  useEffect(() => {
    setCurrentSnapshotDate(new Date().toISOString().split('T')[0]);
  }, []);

  // 현황표 데이터를 가져오는 함수
  const fetchStatusReportData = async (): Promise<StatusReportData[]> => {
    try {
      // 각 페이지의 API를 활용하여 데이터 수집
      const [employeeResponse, educationResponse, institutionResponse, participantResponse] = await Promise.all([
        fetch('/api/employees?limit=10000'),  // 전체 직원 데이터를 가져오기 위해 큰 limit 설정
        fetch('/api/education?limit=10000'),
        fetch('/api/institutions'),
        fetch('/api/participants?limit=10000')  // 소속회원목록 데이터 추가
      ]);

      const employeeData = employeeResponse.ok ? await employeeResponse.json() : { data: [] };
      const educationData = educationResponse.ok ? await educationResponse.json() : [];
      const institutionData = institutionResponse.ok ? await institutionResponse.json() : { data: [] };
      const participantData = participantResponse.ok ? await participantResponse.json() : [];
      
      // API 응답 디버깅
      console.log('=== API 응답 디버깅 ===');
      console.log('교육 API 응답 상태:', educationResponse.ok, educationResponse.status);
      console.log('참가자 API 응답 상태:', participantResponse.ok, participantResponse.status);
      console.log('교육 데이터 원본 구조:', educationData);
      console.log('참가자 데이터 원본 구조:', participantData);
      console.log('교육 데이터가 배열인가?', Array.isArray(educationData));
      console.log('참가자 데이터가 배열인가?', Array.isArray(participantData));
      console.log('교육 데이터 길이:', educationData?.length || 'length property 없음');
      console.log('참가자 데이터 길이:', participantData?.length || 'length property 없음');
      
      console.log('=== API 데이터 수집 결과 ===');
      console.log('전체 직원 수:', employeeData.data ? employeeData.data.length : 0);
      console.log('재직자 수:', employeeData.data ? employeeData.data.filter((emp: any) => emp.isActive).length : 0);
      console.log('기관 수:', Array.isArray(institutionData) ? institutionData.length : (institutionData.data || []).length);
      console.log('교육 데이터 수:', educationData.data ? educationData.data.length : 0);
      console.log('참가자 데이터 수:', Array.isArray(participantData) ? participantData.length : (participantData.data || []).length);

      // 기관별로 데이터 집계
      const institutionMap: { [key: string]: StatusReportData } = {};

      // 기관 데이터 초기화 (기관 데이터가 배열 형태인 경우 처리)
      const institutions = Array.isArray(institutionData) ? institutionData : (institutionData.data || institutionData || []);
      console.log('총 기관 수:', institutions.length);
      institutions.forEach((inst: any) => {
        const code = inst.institutionCode || inst.code || inst['수행기관코드'] || '';
        // 모든 기관의 배정 관련 필드 확인
        const allocationFields = [
          'allocatedSocialWorkers', 'allocatedLifeSupport', 'allocatedSocialWorkersGov',
          'budgetSocialWorkers', 'budgetLifeSupport', 'actualSocialWorkers', 'actualLifeSupport',
          'hiredSocialWorkers', 'hiredLifeSupport', 'socialWorkersB', 'lifeSupportC',
          '전담사회복지사_예산', '생활지원사_예산', 'B_전담사회복지사', 'C_생활지원사'
        ];
        
        if (code === 'A48000002') {
          console.log('A48000002 기관의 모든 필드:', Object.keys(inst));
          console.log('A48000002 배정 관련 필드들:');
          allocationFields.forEach(field => {
            if (inst[field] !== undefined) {
              console.log(`  ${field}: ${inst[field]}`);
            }
          });
        }
        if (code) {
          // 배정인원 필드 매핑
          // 1. 수기관리 등록기준 (자체 배정) 
          const socialWorkers_Course = parseInt(inst.allocatedSocialWorkers || 0);
          const lifeSupport_Course = parseInt(inst.allocatedLifeSupport || 0);
          
          // 2. 예산내시 등록기준 (정부 배정)
          const socialWorkers_Budget = parseInt(
            inst.allocatedSocialWorkersGov || 
            inst.budgetSocialWorkers || 
            inst.socialWorkersB ||
            inst['전담사회복지사_예산'] ||
            inst['B_전담사회복지사'] || 0
          );
          const lifeSupport_Budget = parseInt(
            inst.allocatedLifeSupportGov || 
            inst.budgetLifeSupport || 
            inst.lifeSupportC ||
            inst['생활지원사_예산'] ||
            inst['C_생활지원사'] || 0
          );
          
          // A48000002 디버깅
          if (code === 'A48000002') {
            console.log('=== A48000002 기관 처리 ===');
            console.log('자체배정 - socialWorkers_Course:', socialWorkers_Course);
            console.log('자체배정 - lifeSupport_Course:', lifeSupport_Course);
            console.log('자체배정 - totalWorkers_Course:', socialWorkers_Course + lifeSupport_Course);
            console.log('정부배정 - socialWorkers_Budget:', socialWorkers_Budget);
            console.log('정부배정 - lifeSupport_Budget:', lifeSupport_Budget);
            console.log('정부배정 - totalWorkers_Budget:', socialWorkers_Budget + lifeSupport_Budget);
            console.log('실제채용(D) - hiredSocialWorkers:', parseInt(inst.hiredSocialWorkers || 0));
            console.log('실제채용(D) - hiredLifeSupport:', parseInt(inst.hiredLifeSupport || 0));
            console.log('실제채용(D) - totalD:', parseInt(inst.hiredSocialWorkers || 0) + parseInt(inst.hiredLifeSupport || 0));
            console.log('========================');
          }
          
          institutionMap[code] = {
            region: inst.region || inst['광역시'] || '경상남도',
            province: inst.province || inst['광역시'] || '경상남도', 
            district: inst.district || inst['시군구'] || '',
            institutionCode: code,
            institutionName: inst.institutionName || inst.name || inst['수행기관명'] || '',
            // 배정인원 (기관 데이터에서 가져오기)
            socialWorkers_Course,
            lifeSupport_Course,
            totalWorkers_Course: socialWorkers_Course + lifeSupport_Course,
            // 예산배정 인원 (복지부 배정)
            totalA: socialWorkers_Budget + lifeSupport_Budget,
            socialWorkersB: socialWorkers_Budget,
            lifeSupportC: lifeSupport_Budget,
            totalWorkers_Budget: socialWorkers_Budget + lifeSupport_Budget,
            // 정부 배정 인원 (Government 필드 추가)
            socialWorkers_Government: socialWorkers_Budget,
            lifeSupport_Government: lifeSupport_Budget,
            // D 채용인원(수기관리 등록기준) - 실제 고용
            socialWorkersD: parseInt(inst.hiredSocialWorkers || 0),
            lifeSupportD: parseInt(inst.hiredLifeSupport || 0),
            totalD: parseInt(inst.hiredSocialWorkers || 0) + parseInt(inst.hiredLifeSupport || 0),
            employmentRateE: 0,
            employmentRateF: 0,
            employmentRateG: 0,
            // 개별 직종 채용률 초기화
            employmentRateSocialWorkers: 0,
            employmentRateLifeSupport: 0,
            avgTenureSocialWorkers: 0,
            avgTenureLifeSupport: 0,
            // 직무교육 이수율 초기화
            educationTargetH_Total: 0,
            educationTargetH_SocialWorkers: 0,
            educationTargetH_LifeSupport: 0,
            educationCompletedI_Total: 0,
            educationCompletedI_SocialWorkers: 0,
            educationCompletedI_LifeSupport: 0,
            educationRateIH_Total: 0,
            educationRateIH_SocialWorkers: 0,
            educationRateIH_LifeSupport: 0,
            educationRateID_Total: 0,
            educationRateID_SocialWorkers: 0,
            educationRateID_LifeSupport: 0,
          };
        }
      });

      // 종사자 근속현황 계산을 위해 직원 데이터 처리
      const tenureCalculation: { [key: string]: { 
        socialWorkersTenureSum: number, 
        socialWorkersCount: number,
        lifeSupportTenureSum: number,
        lifeSupportCount: number
      }} = {};
      
      (employeeData.data || []).forEach((emp: any) => {
        const institutionCode = emp.institutionCode || '';
        if (!institutionMap[institutionCode]) return; // 기관 데이터가 없으면 스킵
        
        const isActive = emp.isActive === true;
        
        // A48310001 기관 디버깅
        if (institutionCode === 'A48310001') {
          console.log('A48310001 직원 데이터:', {
            name: emp.name,
            jobType: emp.jobType,
            careerType: emp.careerType,
            isActive,
            hireDate: emp.hireDate,
            resignDate: emp.resignDate
          });
        }
        
        if (isActive && emp.hireDate) {
          // 재직자에 한해서 근속기간 계산 (일 단위)
          const hireDate = new Date(emp.hireDate);
          const today = new Date();
          const daysDiff = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (!tenureCalculation[institutionCode]) {
            tenureCalculation[institutionCode] = {
              socialWorkersTenureSum: 0,
              socialWorkersCount: 0,
              lifeSupportTenureSum: 0,
              lifeSupportCount: 0
            };
          }
          
          // 생활지원사 판별 로직
          const isLifeSupport = 
            emp.jobType === '생활지원사' || 
            emp.jobType === '선임생활지원사' ||
            (emp.careerType && 
             !emp.careerType.includes('년') && 
             !emp.careerType.includes('기타') &&
             emp.careerType.trim() !== '');
          
          // 생활지원사 디버깅
          if (isLifeSupport) {
            console.log('생활지원사 발견:', {
              name: emp.name,
              institutionCode,
              jobType: emp.jobType,
              careerType: emp.careerType,
              hireDate: emp.hireDate,
              daysDiff
            });
          }
          
          if (isLifeSupport) {
            tenureCalculation[institutionCode].lifeSupportTenureSum += daysDiff;
            tenureCalculation[institutionCode].lifeSupportCount++;
          } else if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
            tenureCalculation[institutionCode].socialWorkersTenureSum += daysDiff;
            tenureCalculation[institutionCode].socialWorkersCount++;
          }
        }
      });
      
      // 각 기관별 평균 근속기간 계산 및 H 직무교육 대상인원 설정 (재직자 기준)
      Object.entries(tenureCalculation).forEach(([code, tenure]) => {
        if (institutionMap[code]) {
          institutionMap[code].avgTenureSocialWorkers = tenure.socialWorkersCount > 0 ? 
            Math.round(tenure.socialWorkersTenureSum / tenure.socialWorkersCount) : 0;
          institutionMap[code].avgTenureLifeSupport = tenure.lifeSupportCount > 0 ? 
            Math.round(tenure.lifeSupportTenureSum / tenure.lifeSupportCount) : 0;
          
          // H 직무교육 대상인원은 나중에 참가자 데이터에서 계산 (여기서는 임시 설정)
          // institutionMap[code].educationTargetH_Total = tenure.socialWorkersCount + tenure.lifeSupportCount;
          // institutionMap[code].educationTargetH_SocialWorkers = tenure.socialWorkersCount;
          // institutionMap[code].educationTargetH_LifeSupport = tenure.lifeSupportCount;
          
          // A48000002, A48310001 근속기간 디버깅
          if (code === 'A48000002' || code === 'A48310001') {
            console.log(`=== ${code} 근속기간 계산 ===`);
            console.log('전담사회복지사 수:', tenure.socialWorkersCount);
            console.log('전담사회복지사 총 근속일:', tenure.socialWorkersTenureSum);
            console.log('전담사회복지사 평균 근속일:', institutionMap[code].avgTenureSocialWorkers);
            console.log('생활지원사 수:', tenure.lifeSupportCount);
            console.log('생활지원사 총 근속일:', tenure.lifeSupportTenureSum);
            console.log('생활지원사 평균 근속일:', institutionMap[code].avgTenureLifeSupport);
            console.log('========================');
          }
        }
      });

      // H 직무교육 대상인원 계산 (participantData 기반) - 상태가 '정상'이고 퇴사일이 없는 회원
      
      // 참가자 데이터를 올바른 형식으로 변환
      const participantArray = Array.isArray(participantData) ? participantData : (participantData.data || []);
      
      // 교육 데이터를 올바른 형식으로 변환
      const educationArray = Array.isArray(educationData) ? educationData : (educationData.data || []);
      
      // 전체 참가자 및 교육 데이터 확인
      console.log('=== 전체 참가자 데이터 디버깅 ===');
      console.log('브라우저에서 받은 전체 참가자 데이터 수:', participantArray.length);
      console.log('참가자 데이터 구조 샘플:', participantArray.slice(0, 2));
      
      console.log('=== 전체 교육 데이터 디버깅 ===');
      console.log('브라우저에서 받은 전체 교육 데이터 수:', educationArray.length);
      console.log('교육 데이터 구조 샘플:', educationArray.slice(0, 2));
      
      // 기관코드별 분포 확인
      const institutionCodeCount = educationArray.reduce((acc: any, edu: any) => {
        acc[edu.institutionCode] = (acc[edu.institutionCode] || 0) + 1;
        return acc;
      }, {});
      console.log('기관코드별 교육 데이터 분포 (상위 10개):', Object.entries(institutionCodeCount)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 10));
      
      // A48000002 기관 전용 참가자 데이터 디버깅
      const a48000002Participants = participantArray.filter((participant: any) => 
        participant.institutionCode === 'A48000002'
      );
      console.log('=== A48000002 참가자 데이터 디버깅 ===');
      console.log('A48000002 전체 참가자 데이터:', a48000002Participants.length, '명');
      
      // 상태가 '정상'이고 퇴사일이 없는 참가자 필터링
      const a48000002ActiveParticipants = a48000002Participants.filter((participant: any) => 
        participant.status === '정상' && !participant.resignDate
      );
      console.log('A48000002 재직중 참가자 (상태=정상, 퇴사일=공란):', a48000002ActiveParticipants.length, '명');
      console.log('A48000002 재직중 참가자 상세:', a48000002ActiveParticipants.map(p => ({
        name: p.name,
        jobType: p.jobType,
        status: p.status,
        resignDate: p.resignDate
      })));
      
      // A48000002 기관 전용 교육 데이터 디버깅
      const a48000002Education = educationArray.filter((edu: any) => 
        edu.institutionCode === 'A48000002'
      );
      console.log('=== A48000002 교육 데이터 디버깅 ===');
      console.log('A48000002 전체 교육 데이터:', a48000002Education.length, '건');
      console.log('A48000002 상태별 분포:', a48000002Education.reduce((acc: any, edu: any) => {
        acc[edu.rawStatus || 'undefined'] = (acc[edu.rawStatus || 'undefined'] || 0) + 1;
        return acc;
      }, {}));
      console.log('A48000002 정상 상태 데이터:', a48000002Education.filter(edu => edu.rawStatus === '정상'));

      // 종사자 데이터 준비 (재직 상태 확인용)
      const employeeArray = employeeData.data || [];
      
      Object.entries(institutionMap).forEach(([code, institution]) => {
        // H 직무교육 대상인원: 종사자 데이터에서 현재 재직 중인 사람들
        const institutionEmployees = employeeArray.filter((emp: any) => 
          emp.institutionCode === code
        );
        
        // 재직 중인 종사자 (isActive !== false && resignDate가 없거나 미래)
        const activeEmployees = institutionEmployees.filter((emp: any) => {
          if (emp.isActive === false) return false;
          if (!emp.resignDate) return true;
          // resignDate가 있는 경우, 현재 날짜와 비교
          const resignDate = new Date(emp.resignDate);
          const today = new Date();
          return resignDate > today;
        });
        
        const activeSocialWorkers = activeEmployees.filter((emp: any) => 
          emp.jobType === '전담사회복지사' || 
          emp.jobType === '선임전담사회복지사' ||
          emp.jobType?.includes('전담')
        );
        
        const activeLifeSupport = activeEmployees.filter((emp: any) => 
          emp.jobType === '생활지원사' ||
          emp.jobType?.includes('생활지원')
        );
        
        // H 직무교육 대상인원 (재직 종사자 기준)
        institution.educationTargetH_Total = activeEmployees.length;
        institution.educationTargetH_SocialWorkers = activeSocialWorkers.length;
        institution.educationTargetH_LifeSupport = activeLifeSupport.length;
        
        // 재직자 명단 저장 (이수인원 계산시 사용)
        const activeEmployeeNames = activeEmployees.map((emp: any) => emp.name);
        
        // A48000002 디버깅
        if (code === 'A48000002') {
          console.log('=== A48000002 H 직무교육 대상인원 계산 ===');
          console.log('전체 종사자:', institutionEmployees.length, '명');
          console.log('재직중 종사자:', activeEmployees.length, '명');
          console.log('재직중 전담사회복지사:', activeSocialWorkers.length, '명');
          console.log('재직중 생활지원사:', activeLifeSupport.length, '명');
          console.log('재직중 전담사회복지사 명단:', activeSocialWorkers.map(e => e.name));
          console.log('==================================');
        }
        
        const allInstitutionEducation = educationArray.filter((edu: any) => 
          edu.institutionCode === code || edu.institution === institution.institutionName
        );
        
        const institutionEducation = allInstitutionEducation.filter((edu: any) => {
          const isNormalStatus = edu.rawStatus === '정상' || edu.rawStatus === 'normal' || edu.rawStatus === 'Normal';
          return isNormalStatus;
        });
        
        // H 직무교육 대상인원을 직종별로 계산
        const socialWorkersEducation = institutionEducation.filter((edu: any) => 
          edu.jobType === '전담사회복지사' || edu.jobType?.includes('사회복지사')
        );
        const lifeSupportEducation = institutionEducation.filter((edu: any) => 
          edu.jobType === '생활지원사' || edu.jobType?.includes('생활지원사')
        );
        
        // I 교육 완료 인원 (수료한 고유한 회원 수)
        const completedEducation = institutionEducation.filter((edu: any) => {
          return edu.status === '수료'; // 수료한 경우만
        });
        
        const completedSocialWorkers = socialWorkersEducation.filter((edu: any) => {
          return edu.status === '수료';
        });
        
        const completedLifeSupport = lifeSupportEducation.filter((edu: any) => {
          return edu.status === '수료';
        });
        
        // H 직무교육 대상인원은 이미 참가자 데이터에서 계산됨 (위에서 설정완료)
        
        // I 교육 완료 인원 (수료한 재직자만 카운트)
        const completedActiveNames = [...new Set(completedEducation.map((edu: any) => edu.name))]
          .filter(name => activeEmployeeNames.includes(name));
        const completedActiveSocialWorkers = [...new Set(completedSocialWorkers.map((edu: any) => edu.name))]
          .filter(name => {
            const emp = activeEmployees.find((e: any) => e.name === name);
            return emp && (emp.jobType === '전담사회복지사' || emp.jobType?.includes('전담'));
          });
        const completedActiveLifeSupport = [...new Set(completedLifeSupport.map((edu: any) => edu.name))]
          .filter(name => {
            const emp = activeEmployees.find((e: any) => e.name === name);
            return emp && (emp.jobType === '생활지원사' || emp.jobType?.includes('생활지원'));
          });
          
        institution.educationCompletedI_Total = completedActiveNames.length;
        institution.educationCompletedI_SocialWorkers = completedActiveSocialWorkers.length;
        institution.educationCompletedI_LifeSupport = completedActiveLifeSupport.length;
        
        // A48000002 디버깅 - I 교육 완료 인원
        if (code === 'A48000002') {
          console.log('=== A48000002 I 교육 완료 인원 계산 ===');
          console.log('수료한 교육 데이터 총 건수:', completedEducation.length);
          console.log('수료한 전담사회복지사 교육 건수:', completedSocialWorkers.length);
          console.log('수료한 모든 사람 명단:', [...new Set(completedEducation.map((edu: any) => edu.name))]);
          console.log('수료한 재직자 명단:', completedActiveNames);
          console.log('수료한 재직 전담사회복지사 인원 수:', institution.educationCompletedI_SocialWorkers);
          console.log('수료한 재직 생활지원사 인원 수:', institution.educationCompletedI_LifeSupport);
          console.log('수료한 재직자 전체 인원 수:', institution.educationCompletedI_Total);
          console.log('==================================');
        }
        
        // A48860004 특별 디버깅
        if (code === 'A48860004') {
          console.log('=== A48860004 직무교육 이수율 분석 ===');
          console.log('전체 종사자:', institutionEmployees.length, '명');
          console.log('재직 중인 종사자:', activeEmployees.length, '명');
          console.log('퇴사/휴면 종사자:', institutionEmployees.length - activeEmployees.length, '명');
          console.log('H 대상인원 (재직자):', institution.educationTargetH_Total);
          console.log('I 이수인원 (재직자만):', institution.educationCompletedI_Total);
          console.log('이수율:', (institution.educationCompletedI_Total / institution.educationTargetH_Total * 100).toFixed(1), '%');
          console.log('==================================');
        }
        
        // (I/H) 교육 이수율
        institution.educationRateIH_Total = institution.educationTargetH_Total > 0 ? 
          (institution.educationCompletedI_Total / institution.educationTargetH_Total) * 100 : 0;
        institution.educationRateIH_SocialWorkers = institution.educationTargetH_SocialWorkers > 0 ? 
          (institution.educationCompletedI_SocialWorkers / institution.educationTargetH_SocialWorkers) * 100 : 0;
        institution.educationRateIH_LifeSupport = institution.educationTargetH_LifeSupport > 0 ? 
          (institution.educationCompletedI_LifeSupport / institution.educationTargetH_LifeSupport) * 100 : 0;
        
        // (I/D) 교육 이수율 (실제 채용 대비)
        institution.educationRateID_Total = institution.totalD > 0 ? 
          (institution.educationCompletedI_Total / institution.totalD) * 100 : 0;
        institution.educationRateID_SocialWorkers = institution.socialWorkersD > 0 ? 
          (institution.educationCompletedI_SocialWorkers / institution.socialWorkersD) * 100 : 0;
        institution.educationRateID_LifeSupport = institution.lifeSupportD > 0 ? 
          (institution.educationCompletedI_LifeSupport / institution.lifeSupportD) * 100 : 0;
        
        // 채용률 계산 (배정 대비 실제 채용률)
        institution.employmentRateE = institution.totalA > 0 ? (institution.totalD / institution.totalA) * 100 : 0;
        institution.employmentRateF = institution.socialWorkersB > 0 ? (institution.socialWorkersD / institution.socialWorkersB) * 100 : 0;
        institution.employmentRateG = institution.lifeSupportC > 0 ? (institution.lifeSupportD / institution.lifeSupportC) * 100 : 0;
        
        // 개별 직종 채용률 계산 (정부 배정 대비)
        institution.employmentRateSocialWorkers = institution.socialWorkersB > 0 ? (institution.socialWorkersD / institution.socialWorkersB) * 100 : 0;
        institution.employmentRateLifeSupport = institution.lifeSupportC > 0 ? (institution.lifeSupportD / institution.lifeSupportC) * 100 : 0;
      });

      // 모든 기관을 반환 (데이터가 없어도 표시)
      const result = Object.values(institutionMap);
      console.log('현황표에 표시될 기관 수:', result.length);
      return result;
    } catch (error) {
      console.error('현황표 데이터 가져오기 실패:', error);
      return [];
    }
  };

  // Initialize with empty state on mount and fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // 타임아웃 설정 (10초 후 강제 로딩 완료)
        const timeoutId = setTimeout(() => {
          console.warn('Dashboard loading timeout - forcing completion');
          setIsLoading(false);
        }, 10000);
        
        try {
          // Fetch employee statistics (이것은 서버에서 계산된 통계이므로 필요)
          const employeeResponse = await fetch('/api/employee-statistics', {
            timeout: 5000 // 5초 타임아웃
          });
          if (employeeResponse.ok) {
            const employeeData = await employeeResponse.json();
            setEmployeeStats({
              totalEmployees: employeeData.totalEmployees || 0,
              totalSocialWorkers: employeeData.socialWorkers || 0,
              totalLifeSupport: employeeData.lifeSupport || 0,
              totalInstitutions: employeeData.totalInstitutions || 0,
              employmentRate: 0,
              averageTenure: 0,
              regionBreakdown: {},
              institutionAllocation: {
                totalAllocated: employeeData.totalEmployees || 0,
                actualEmployed: employeeData.activeEmployees || 0,
                shortfall: (employeeData.totalEmployees || 0) - (employeeData.activeEmployees || 0)
              }
            });
          }
        } catch (apiError) {
          console.warn('API call failed, using fallback data:', apiError);
          // API 실패시 기본값 설정
          setEmployeeStats({
            totalEmployees: 0,
            totalSocialWorkers: 0,
            totalLifeSupport: 0,
            totalInstitutions: 0,
            employmentRate: 0,
            averageTenure: 0,
            regionBreakdown: {},
            institutionAllocation: {
              totalAllocated: 0,
              actualEmployed: 0,
              shortfall: 0
            }
          });
        }

        // Initialize education stats with empty data  
        setEducationStats({
          totalParticipants: 0,
          basicEducationCompleted: 0,
          advancedEducationCompleted: 0,
          bothEducationCompleted: 0,
          noEducationCompleted: 0,
          completionRate: 0,
          institutionBreakdown: {},
          jobTypeBreakdown: {}
        });

        // 현황표 데이터 가져오기
        const reportData = await fetchStatusReportData();
        setStatusReportData(reportData);
        
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []); // Empty dependency array to run only once on mount

  // Show loading state only for initial load (첫 5초 이후엔 로딩 숨김)
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 5000); // 5초 후 강제로 로딩 완료 처리
    
    return () => clearTimeout(timer);
  }, []);

  if (dataLoading && !initialLoadComplete) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">데이터 로딩 중</h3>
            <p className="text-slate-600">IndexedDB에서 데이터를 불러오고 있습니다...</p>
            <p className="text-sm text-slate-400 mt-2">최대 5초 후 자동으로 진행됩니다</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (dataError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">데이터 로드 오류</div>
              <div>{dataError}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                페이지 새로고침
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Storage Info Banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <Activity className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>서버 정상 운영:</strong> 포트 3018에서 정상적으로 운영되고 있습니다.
        </AlertDescription>
      </Alert>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">교육 관리 대시보드</h1>
          <p className="text-slate-600 mt-1">교육 데이터와 종사자 정보를 한눈에 확인하세요</p>
        </div>
        <Badge variant="secondary" className="text-green-700 bg-green-100">
          <CheckCircle className="h-4 w-4 mr-1" />
          시스템 정상
        </Badge>
      </div>

      {/* 종합 현황표 섹션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                종합 현황표
              </CardTitle>
              <CardDescription>
                교육 이수 현황과 종사자 현황을 연동한 종합 분석 데이터
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportStatusReportData}
                disabled={!statusReportData || statusReportData.length === 0}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <Download className="h-4 w-4 mr-1" />
                Excel 내보내기
              </Button>
              <a href="/comprehensive-map">
                <Button variant="outline" size="sm">
                  <Map className="h-4 w-4 mr-1" />
                  종합지도 보기
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 검색 입력 필드 */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="기관명, 기관코드, 지역으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-600"
              >
                초기화
              </button>
            )}
            <span className="text-sm text-gray-500">
              {filteredStatusReportData.length}개 기관
            </span>
          </div>
          
          {/* 고정 헤더가 있는 테이블 */}
          <div className="w-full border rounded-md shadow-lg overflow-hidden">
            <div className="w-full max-h-[600px] overflow-auto">
              <div className="min-w-[2000px]">
              <table className="w-full border-collapse bg-white">
                <thead className="sticky top-0 z-10">
                  {/* 1단계 헤더 */}
                  <tr>
                    <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">광역명</th>
                    <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">시도</th>
                    <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">시군구</th>
                    <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">기관코드</th>
                    <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">기관명</th>
                    <th colSpan={3} rowSpan={2} className="border border-gray-300 px-4 py-3 bg-green-100 text-xs font-bold text-green-800 whitespace-nowrap">배정인원<br/>(수기관리 등록기준)</th>
                    <th colSpan={3} rowSpan={2} className="border border-gray-300 px-4 py-3 bg-cyan-100 text-xs font-bold text-cyan-800 whitespace-nowrap">배정인원<br/>(예산내시 등록기준)</th>
                    <th colSpan={3} rowSpan={2} className="border border-gray-300 px-4 py-3 bg-blue-100 text-xs font-bold text-blue-800 whitespace-nowrap">D 채용인원<br/>(수기관리 등록기준)</th>
                    <th colSpan={8} className="border border-gray-300 px-4 py-3 bg-purple-100 text-xs font-bold text-purple-800 whitespace-nowrap">(1-1-2) 종사자 채용현황</th>
                    <th colSpan={2} className="border border-gray-300 px-4 py-3 bg-orange-100 text-xs font-bold text-orange-800 whitespace-nowrap">(1-1-3) 종사자 근속현황</th>
                    <th colSpan={12} className="border border-gray-300 px-4 py-3 bg-green-200 text-xs font-bold text-green-800 whitespace-nowrap">(1-4-1) 종사자 직무교육 이수율</th>
                  </tr>
                  {/* 2단계 헤더 - 3층 구조 부분만 */}
                  <tr>
                    {/* 종사자 채용현황 2단계 */}
                    <th colSpan={2} className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">전체 종사자</th>
                    <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">전담사회복지사</th>
                    <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">생활지원사</th>
                    
                    {/* 종사자 근속현황 2단계 */}
                    <th colSpan={2} className="border border-gray-300 px-3 py-2 bg-orange-100 text-xs font-semibold text-orange-700 whitespace-nowrap">평균 근속기간(일)</th>
                    
                    {/* 직무교육 이수율 2단계 */}
                    <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">H 직무교육 대상인원<br/>(배움터 등록기준)</th>
                    <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">I 직무교육 이수인원<br/>(배움터 등록기준)</th>
                    <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">(I/H) 직무교육 이수율<br/>(배움터 등록기준)</th>
                    <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">(I/D) 직무교육 이수율<br/>(모인우리 등록기준)</th>
                  </tr>
                  {/* 3단계 헤더 */}
                  <tr>
                    {/* 배정인원(수강권리) - 3단계 */}
                    <th className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전체 종사자<br/>(=①+②)</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전담사회복지사<br/>①</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사<br/>②</th>
                    
                    {/* 배정인원(예산내시) - 3단계 */}
                    <th className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">A<br/>전체<br/>(=①+②)</th>
                    <th className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">B<br/>전담사회복지사<br/>①</th>
                    <th className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">C<br/>생활지원사<br/>②</th>
                    
                    {/* D 채용인원 - 3단계 */}
                    <th className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">전체 종사자<br/>(=①+②)</th>
                    <th className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">전담사회복지사<br/>①</th>
                    <th className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">생활지원사<br/>②</th>
                    
                    {/* 종사자 채용현황 - 3단계 */}
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">E</th>
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">(E/A) 채용률</th>
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">F</th>
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">(F/B) 채용률</th>
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">(참고)충원률</th>
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">G</th>
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">(G/C) 채용률</th>
                    <th className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">(참고)충원률</th>
                    
                    {/* 종사자 근속현황 - 3단계 */}
                    <th className="border border-gray-300 px-3 py-2 bg-orange-100 text-xs font-semibold text-orange-700 whitespace-nowrap">전담사회복지사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-orange-100 text-xs font-semibold text-orange-700 whitespace-nowrap">생활지원사</th>
                    
                    {/* 직무교육 이수율 - 3단계 */}
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전체</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전담사회복지사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전체</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전담사회복지사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전체</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전담사회복지사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전체</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">전담사회복지사</th>
                    <th className="border border-gray-300 px-3 py-2 bg-green-200 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatusReportData.length > 0 ? (
                    filteredStatusReportData.map((data, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.region}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.province}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.district}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.institutionCode}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs whitespace-nowrap">{data.institutionName}</td>
                        
                        {/* 배정인원(수강권리) */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.totalWorkers_Course}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.socialWorkers_Course}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.lifeSupport_Course}</td>
                        
                        {/* 배정인원(예산내시) */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.totalA}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.socialWorkersB}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.lifeSupportC}</td>
                        
                        {/* D 채용인원 */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.totalD}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.socialWorkersD}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.lifeSupportD}</td>
                        
                        {/* 종사자 채용현황 */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.totalD}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.totalA > 0 ? Math.round((data.totalD / data.totalA) * 100) : 0}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.socialWorkersD}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.socialWorkersB > 0 ? Math.round((data.socialWorkersD / data.socialWorkersB) * 100) : 0}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">-</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.lifeSupportD}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.lifeSupportC > 0 ? Math.round((data.lifeSupportD / data.lifeSupportC) * 100) : 0}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">-</td>
                        
                        {/* 종사자 근속현황 */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.avgTenureSocialWorkers}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.avgTenureLifeSupport}</td>
                        
                        {/* 직무교육 이수율 */}
                        {/* H 대상인원 */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.educationTargetH_Total}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.educationTargetH_SocialWorkers}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.educationTargetH_LifeSupport}</td>
                        {/* I 이수인원 */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.educationCompletedI_Total}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.educationCompletedI_SocialWorkers}</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{data.educationCompletedI_LifeSupport}</td>
                        {/* I/H 이수율 */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{Math.round(data.educationRateIH_Total)}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{Math.round(data.educationRateIH_SocialWorkers)}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{Math.round(data.educationRateIH_LifeSupport)}%</td>
                        {/* I/D 이수율 */}
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{Math.round(data.educationRateID_Total)}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{Math.round(data.educationRateID_SocialWorkers)}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-xs text-center">{Math.round(data.educationRateID_LifeSupport)}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={33} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        데이터를 불러오는 중입니다...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 지도 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-blue-600" />
            경상남도 시군구별 교육 현황 지도
          </CardTitle>
          <CardDescription>
            경상남도 내 각 시군구별 교육 이수율과 기관 분포를 시각화합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="education-group" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-2">
              <TabsTrigger value="education-group" className="text-xs">교육 이수율</TabsTrigger>
              <TabsTrigger value="employment-group" className="text-xs">채용 현황</TabsTrigger>
              <TabsTrigger value="basic-group" className="text-xs">기본 현황</TabsTrigger>
            </TabsList>
            
            {/* 교육 이수율 그룹 */}
            <TabsContent value="education-group" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold">I/H 이수율 (배움터 기준)</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenLargeMap(educationMapData, 'I/H 교육 이수율', 'education-ih')}
                      className="text-xs"
                    >
                      <Maximize2 className="h-3 w-3 mr-1" />
                      큰 지도
                    </Button>
                  </div>
                  <GyeongsangnamMap
                    data={educationMapData}
                    colorScheme="green"
                    title="I/H 교육 이수율"
                    height="450px"
                    showLabels={true}
                    onDistrictClick={(district) => handleDistrictClick(district, 'education-ih')}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold">I/D 이수율 (모인우리 기준)</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenLargeMap(educationMapDataID, 'I/D 교육 이수율', 'education-id')}
                      className="text-xs"
                    >
                      <Maximize2 className="h-3 w-3 mr-1" />
                      큰 지도
                    </Button>
                  </div>
                  <GyeongsangnamMap
                    data={educationMapDataID}
                    colorScheme="blue"
                    title="I/D 교육 이수율"
                    height="450px"
                    showLabels={true}
                    onDistrictClick={(district) => handleDistrictClick(district, 'education-id')}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* 채용 현황 그룹 */}
            <TabsContent value="employment-group" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">채용률 현황</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">전담사회복지사 (기관 기준)</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(employmentRateSocialWorkersMapData, '전담사회복지사 채용률', 'employment-social-workers')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={employmentRateSocialWorkersMapData}
                        colorScheme="blue"
                        title="전담사회복지사 채용률"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'employment-social-workers')}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">생활지원사 (기관 기준)</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(employmentRateLifeSupportMapData, '생활지원사 채용률', 'employment-life-support')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={employmentRateLifeSupportMapData}
                        colorScheme="green"
                        title="생활지원사 채용률"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'employment-life-support')}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">배정 vs 채용 격차</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">전담사회복지사</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(allocationComparisonSocialWorkersMapData, '전담사회복지사 인력 부족/초과', 'allocation-social-workers')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={allocationComparisonSocialWorkersMapData}
                        colorScheme="red"
                        title="전담사회복지사 인력 부족/초과"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'allocation-social-workers')}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">생활지원사</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(allocationComparisonLifeSupportMapData, '생활지원사 인력 부족/초과', 'allocation-life-support')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={allocationComparisonLifeSupportMapData}
                        colorScheme="red"
                        title="생활지원사 인력 부족/초과"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'allocation-life-support')}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">평균 근속기간</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">전담사회복지사</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(tenureSocialWorkersMapData, '전담사회복지사 평균 근속기간', 'tenure-social-workers')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={tenureSocialWorkersMapData}
                        colorScheme="purple"
                        title="전담사회복지사 평균 근속기간"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'tenure-social-workers')}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">생활지원사</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(tenureLifeSupportMapData, '생활지원사 평균 근속기간', 'tenure-life-support')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={tenureLifeSupportMapData}
                        colorScheme="orange"
                        title="생활지원사 평균 근속기간"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'tenure-life-support')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* 기본 현황 그룹 */}
            <TabsContent value="basic-group" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold">기관 분포</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenLargeMap(institutionMapData, '기관 분포 현황', 'institutions')}
                      className="text-xs"
                    >
                      <Maximize2 className="h-3 w-3 mr-1" />
                      큰 지도
                    </Button>
                  </div>
                  <GyeongsangnamMap
                    data={institutionMapData}
                    colorScheme="blue"
                    title="기관 분포 현황"
                    height="400px"
                    showLabels={true}
                    onDistrictClick={(district) => handleDistrictClick(district, 'institutions')}
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">종사자 현황</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">전담사회복지사</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(socialWorkersMapData, '전담사회복지사 배치 현황', 'employees-social-workers')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={socialWorkersMapData}
                        colorScheme="green"
                        title="전담사회복지사 배치 현황"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'employees-social-workers')}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-xs text-gray-600">생활지원사</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenLargeMap(lifeSupportMapData, '생활지원사 배치 현황', 'employees-life-support')}
                          className="text-xs"
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          큰 지도
                        </Button>
                      </div>
                      <GyeongsangnamMap
                        data={lifeSupportMapData}
                        colorScheme="purple"
                        title="생활지원사 배치 현황"
                        height="400px"
                        showLabels={true}
                        onDistrictClick={(district) => handleDistrictClick(district, 'employees-life-support')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          데이터 내보내기
        </Button>
      </div>

      {/* 시군구 상세 정보 모달 */}
      <Dialog open={isDistrictModalOpen} onOpenChange={setIsDistrictModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto z-[9999]" style={{ zIndex: 9999 }}>
          {renderModalContent()}
        </DialogContent>
      </Dialog>

      {/* 큰 지도 모달 */}
      <Dialog open={isLargeMapModalOpen} onOpenChange={setIsLargeMapModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto z-[9999]" style={{ zIndex: 9999 }}>
          {renderLargeMapContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}