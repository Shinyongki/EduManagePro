import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Map
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEducationData } from "@/hooks/use-education-data";

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
  // D급 배정입력
  socialWorkersD: number;
  lifeSupportD: number;
  totalD: number;
  // 종사자 채용현황 (실제 채용률 계산)
  employmentRateE: number; // E/A 채용률
  employmentRateF: number; // F/B 채용률  
  employmentRateG: number; // G/C 채용률
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
  const { toast } = useToast();

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
          'hiredSocialWorkers', 'hiredLifeSupport'
        ];
        
        if (code === 'A48000002') {
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
          const socialWorkers_Budget = parseInt(inst.allocatedSocialWorkersGov || 0);
          const lifeSupport_Budget = parseInt(inst.allocatedLifeSupportGov || 0);
          
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
            // D 채용인원(수기관리 등록기준) - 실제 고용
            socialWorkersD: parseInt(inst.hiredSocialWorkers || 0),
            lifeSupportD: parseInt(inst.hiredLifeSupport || 0),
            totalD: parseInt(inst.hiredSocialWorkers || 0) + parseInt(inst.hiredLifeSupport || 0),
            employmentRateE: 0,
            employmentRateF: 0,
            employmentRateG: 0,
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
        
        // 채용률 계산
        institution.employmentRateE = institution.totalA > 0 ? (institution.avgTenureSocialWorkers / institution.totalA) * 100 : 0;
        institution.employmentRateF = institution.socialWorkersB > 0 ? (institution.avgTenureSocialWorkers / institution.socialWorkersB) * 100 : 0;
        institution.employmentRateG = institution.lifeSupportC > 0 ? (institution.avgTenureLifeSupport / institution.lifeSupportC) * 100 : 0;
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
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            종합 현황표
          </CardTitle>
          <CardDescription>
            교육 이수 현황과 종사자 현황을 연동한 종합 분석 데이터
          </CardDescription>
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
    </div>
  );
}