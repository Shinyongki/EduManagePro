import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEmployeeStore } from "@/store/employee-store";
import { useMemo, useEffect } from "react";
import React from "react";
import { 
  UserCheck, Users, Percent, Clock, TrendingUp, MapPin,
  Calendar, Award, BarChart3, PieChart, Building2, Activity,
  AlertTriangle, Target
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function EmployeeStatistics() {
  const { employeeData, getEmployeeStats, institutionData, loadInstitutionData } = useEmployeeStore();
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = React.useState(1);
  
  // 기관 데이터 자동 로드
  useEffect(() => {
    loadInstitutionData();
  }, []);
  
  const stats = useMemo(() => {
    // employeeData가 배열인지 확인
    if (!Array.isArray(employeeData)) {
      console.log('⚠️ employeeData is not an array:', typeof employeeData, employeeData);
      return {
        totalEmployees: 0,
        socialWorkerCount: 0,
        lifeSupportCount: 0,
        fillRate: 0,
        averageTenure: 0,
        institutionCount: 0,
      };
    }
    
    const result = getEmployeeStats();
    console.log('📊 Employee Statistics Debug:', {
      totalEmployees: result.totalEmployees,
      socialWorkerCount: result.socialWorkerCount,
      lifeSupportCount: result.lifeSupportCount,
      institutionCount: result.institutionCount,
      employeeDataLength: employeeData.length,
      institutionDataLength: institutionData ? institutionData.length : 0
    });
    return result;
  }, [employeeData, institutionData]);
  
  // 재직자 데이터 필터링 (전체에서 사용)
  const activeEmployees = useMemo(() => {
    if (!Array.isArray(employeeData)) {
      return [];
    }
    
    const activeEmpList = employeeData.filter(emp => {
      // 퇴사일 필드 통합 (employee-store.ts와 동일한 로직)
      const resignDate = emp.resignDate || emp.퇴사일 || emp.exitDate || emp.leaveDate;
      
      if (!resignDate || resignDate === '' || resignDate === '-') return true; // 퇴사일이 없으면 재직자
      try {
        const resignDateObj = new Date(resignDate);
        const today = new Date();
        return resignDateObj > today; // 퇴사일이 미래이면 재직자
      } catch {
        return true; // 날짜 파싱 실패시 재직자로 간주
      }
    });
    
    console.log(`🔍 재직자 필터링 결과: 전체 ${employeeData.length}명 → 재직자 ${activeEmpList.length}명`);
    
    // 퇴사일 필드별 분포 확인
    const resignDateStats = {
      resignDate: employeeData.filter(emp => emp.resignDate && emp.resignDate !== '' && emp.resignDate !== '-').length,
      '퇴사일': employeeData.filter(emp => emp.퇴사일 && emp.퇴사일 !== '' && emp.퇴사일 !== '-').length,
      exitDate: employeeData.filter(emp => emp.exitDate && emp.exitDate !== '' && emp.exitDate !== '-').length,
      leaveDate: employeeData.filter(emp => emp.leaveDate && emp.leaveDate !== '' && emp.leaveDate !== '-').length,
      noResignDate: employeeData.filter(emp => !emp.resignDate && !emp.퇴사일 && !emp.exitDate && !emp.leaveDate).length
    };
    console.log('📊 퇴사일 필드별 분포:', resignDateStats);
    
    // 샘플 데이터 확인 (처음 10명의 퇴사일 관련 필드들)
    const sampleData = employeeData.slice(0, 10).map((emp, idx) => ({
      index: idx + 1,
      name: emp.name,
      resignDate: emp.resignDate,
      퇴사일: emp.퇴사일,
      exitDate: emp.exitDate,
      leaveDate: emp.leaveDate,
      isActive: !emp.resignDate && !emp.퇴사일 && !emp.exitDate && !emp.leaveDate
    }));
    console.log('📝 샘플 데이터 (처음 10명):', sampleData);
    
    // 직무별 분포 확인
    const jobTypeStats = {
      전담사회복지사: employeeData.filter(emp => emp.jobType === '전담사회복지사').length,
      선임전담사회복지사: employeeData.filter(emp => emp.jobType === '선임전담사회복지사').length,
      생활지원사: employeeData.filter(emp => emp.jobType === '생활지원사').length,
      기타: employeeData.filter(emp => emp.jobType && !['전담사회복지사', '선임전담사회복지사', '생활지원사'].includes(emp.jobType)).length,
      미설정: employeeData.filter(emp => !emp.jobType).length
    };
    console.log('👥 직무별 분포 (전체 직원):', jobTypeStats);
    
    // 재직자 중 선임전담사회복지사 수
    const activeSeniorWorkers = activeEmpList.filter(emp => emp.jobType === '선임전담사회복지사').length;
    console.log(`👑 선임전담사회복지사: 전체 ${jobTypeStats.선임전담사회복지사}명, 재직 ${activeSeniorWorkers}명`);
    
    // 선임전담사회복지사 명단 (전체)
    const allSeniorWorkers = employeeData.filter(emp => emp.jobType === '선임전담사회복지사');
    const seniorWorkersList = allSeniorWorkers.map(emp => ({
      name: emp.name,
      institution: emp.institution || emp.기관명,
      resignDate: emp.resignDate || emp.퇴사일 || emp.exitDate || emp.leaveDate,
      isActive: !emp.resignDate && !emp.퇴사일 && !emp.exitDate && !emp.leaveDate
    }));
    console.log('📋 선임전담사회복지사 전체 명단:', seniorWorkersList);
    
    // 재직 중인 선임전담사회복지사 명단
    const activeSeniorWorkersList = activeEmpList
      .filter(emp => emp.jobType === '선임전담사회복지사')
      .map(emp => ({
        name: emp.name,
        institution: emp.institution || emp.기관명
      }));
    console.log('✅ 재직 중인 선임전담사회복지사 명단:', activeSeniorWorkersList);
    
    // 김경리, 이정민 특별 검색
    const kimKyungri = employeeData.filter(emp => emp.name?.includes('김경리'));
    const leeJungmin = employeeData.filter(emp => emp.name?.includes('이정민'));
    console.log('🔍 김경리 검색 결과:', kimKyungri);
    console.log('🔍 이정민 검색 결과:', leeJungmin);
    
    // 김경리 담당업무 필드 상세 분석
    if (kimKyungri.length > 0) {
      const kim = kimKyungri[0];
      console.log('📋 김경리 상세 정보:', {
        name: kim.name,
        jobType: kim.jobType,
        mainDuty: kim.mainDuty,
        primaryWork: kim.primaryWork,
        mainTasks: kim.mainTasks,
        담당업무: kim['담당업무'],
        responsibility: kim.responsibility,
        duty: kim.duty,
        '전체 객체': kim,
        allKeys: Object.keys(kim).filter(key => key.includes('업무') || key.includes('duty') || key.includes('work'))
      });
    } else {
      console.log('❌ 김경리를 찾을 수 없습니다!');
    }
    
    // 이정민 담당업무 필드 상세 분석
    if (leeJungmin.length > 0) {
      const lee = leeJungmin[0];
      console.log('📋 이정민 상세 정보:', {
        name: lee.name,
        jobType: lee.jobType,
        mainDuty: lee.mainDuty,
        primaryWork: lee.primaryWork,
        mainTasks: lee.mainTasks,
        담당업무: lee['담당업무'],
        allKeys: Object.keys(lee).filter(key => key.includes('업무') || key.includes('duty') || key.includes('work'))
      });
    }
    
    // 담당업무가 '특화'인 모든 직원 확인
    const specializedWorkers = employeeData.filter(emp => {
      const duty = emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
      return duty === '특화';
    });
    console.log('🎯 담당업무가 특화인 직원들:', specializedWorkers.map(emp => ({
      name: emp.name,
      jobType: emp.jobType,
      duty: emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무']
    })));
    
    return activeEmpList;
  }, [employeeData]);

  // 상세 통계 계산
  const detailedStats = useMemo(() => {
    
    // 전담사회복지사와 생활지원사 분리
    const socialWorkers = activeEmployees.filter(emp => 
      emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
    );
    const lifeSupportWorkers = activeEmployees.filter(emp => 
      emp.jobType === '생활지원사'
    );
    
    // 연령별 분포 (YYYY-MM-DD 형식의 birthDate 처리)
    const getAge = (birthDate: string) => {
      if (!birthDate) return null;
      try {
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return null;
        return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      } catch {
        return null;
      }
    };
    
    // 전체 연령 분포 (기존 코드 유지)
    const ageGroups = activeEmployees.reduce((acc, emp) => {
      const age = getAge(emp.birthDate);
      if (age === null) {
        acc['연령 미상'] = (acc['연령 미상'] || 0) + 1;
        return acc;
      }
      const group = age < 30 ? '20대' : age < 40 ? '30대' : age < 50 ? '40대' : age < 60 ? '50대' : '60대+';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 전담사회복지사 연령 분포
    const socialWorkerAgeGroups = socialWorkers.reduce((acc, emp) => {
      const age = getAge(emp.birthDate);
      if (age === null) {
        acc['연령 미상'] = (acc['연령 미상'] || 0) + 1;
        return acc;
      }
      const group = age < 30 ? '20대' : age < 40 ? '30대' : age < 50 ? '40대' : age < 60 ? '50대' : '60대+';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 생활지원사 연령 분포
    const lifeSupportAgeGroups = lifeSupportWorkers.reduce((acc, emp) => {
      const age = getAge(emp.birthDate);
      if (age === null) {
        acc['연령 미상'] = (acc['연령 미상'] || 0) + 1;
        return acc;
      }
      const group = age < 30 ? '20대' : age < 40 ? '30대' : age < 50 ? '40대' : age < 60 ? '50대' : '60대+';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 기관별 종사자 수 (institution 필드 우선 사용)
    const institutionStats = activeEmployees.reduce((acc, emp) => {
      // institution 필드를 우선 사용
      let institutionName = emp.institution || '';
      
      if (!institutionName) {
        // institution이 없으면 district 사용 (region은 제외 - 모두 경남이므로)
        institutionName = emp.district || '미분류';
      }
      
      // 광역지원기관, 사회서비스원 등은 그대로 유지 (기관명이므로)
      // 경남, 경남광역 같은 상위 지역명만 있는 경우 제외
      if (institutionName === '경남' || institutionName === '경남광역' || institutionName === '경상남도') {
        institutionName = emp.district || '미분류';
      }
      
      acc[institutionName] = (acc[institutionName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 근속기간 분포 (전체 - 기존 코드 유지)
    const tenureGroups = activeEmployees.reduce((acc, emp) => {
      let years = 0;
      if (emp.hireDate) {
        try {
          const hireDate = new Date(emp.hireDate);
          const endDate = emp.resignDate ? new Date(emp.resignDate) : new Date();
          if (!isNaN(hireDate.getTime()) && !isNaN(endDate.getTime())) {
            years = Math.floor((endDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          }
        } catch {
          years = 0;
        }
      } else if (emp.careerType) {
        // careerType 정보가 있으면 활용
        if (emp.careerType.includes('1년이상')) {
          years = 1; // 최소값으로 설정
        }
      }
      
      const group = years < 1 ? '1년 미만' : years < 3 ? '1-3년' : years < 5 ? '3-5년' : years < 10 ? '5-10년' : '10년 이상';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 전담사회복지사 근속기간 분포
    const socialWorkerTenureGroups = socialWorkers.reduce((acc, emp) => {
      let years = 0;
      if (emp.hireDate) {
        try {
          const hireDate = new Date(emp.hireDate);
          const endDate = new Date('2025-08-04');
          if (!isNaN(hireDate.getTime()) && !isNaN(endDate.getTime())) {
            years = Math.floor((endDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          }
        } catch {
          years = 0;
        }
      }
      
      const group = years < 1 ? '1년 미만' : years < 3 ? '1-3년' : years < 5 ? '3-5년' : years < 10 ? '5-10년' : '10년 이상';
      acc[group] = (acc[group] || 0) + 1;
      
      
      return acc;
    }, {} as Record<string, number>);
    
    
    // 생활지원사 근속기간 분포
    const lifeSupportTenureGroups = lifeSupportWorkers.reduce((acc, emp) => {
      let years = 0;
      if (emp.hireDate) {
        try {
          const hireDate = new Date(emp.hireDate);
          const endDate = new Date('2025-08-04');
          if (!isNaN(hireDate.getTime()) && !isNaN(endDate.getTime())) {
            years = Math.floor((endDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          }
        } catch {
          years = 0;
        }
      }
      
      const group = years < 1 ? '1년 미만' : years < 3 ? '1-3년' : years < 5 ? '3-5년' : years < 10 ? '5-10년' : '10년 이상';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 직무별 상세 분포
    const jobTypeStats = activeEmployees.reduce((acc, emp) => {
      const key = emp.jobType || '미분류';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 지역별 분포 (region 사용)
    const regionStats = activeEmployees.reduce((acc, emp) => {
      const region = emp.region || '미분류';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 년도별 입사 추이 (더 의미있는 데이터)
    const yearlyHiring = activeEmployees
      .filter(emp => emp.hireDate)
      .reduce((acc, emp) => {
        try {
          const hireDate = new Date(emp.hireDate!);
          const year = hireDate.getFullYear().toString();
          acc[year] = (acc[year] || 0) + 1;
        } catch {
          acc['연도 미상'] = (acc['연도 미상'] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
    
    // 직무별 경력 현황 분석 (전담사회복지사 vs 생활지원사)
    const certificationStats = activeEmployees.reduce((acc, emp) => {
      const jobType = emp.jobType;
      
      if (jobType === '전담사회복지사' || jobType === '선임전담사회복지사') {
        // 전담사회복지사: careerType 필드 사용
        const careerType = emp.careerType;
        
        if (careerType && typeof careerType === 'string') {
          // 의미있는 경력 유형만 처리
          const isValidCareerType = 
            careerType.includes('년') ||           // '년'이 포함된 경력 정보
            careerType.includes('이상') ||         // '이상'이 포함된 경력 정보
            careerType.includes('미만') ||         // '미만'이 포함된 경력 정보
            careerType.includes('경력') ||         // '경력'이 포함된 정보
            careerType.includes('신입');           // '신입' 정보
          
          // ID나 코드 형태가 아닌지 확인
          const isNotIdCode = 
            !careerType.match(/^\d+$/) &&         // 순수 숫자 아님
            !careerType.match(/^[a-z]+\d+$/) &&   // 소문자+숫자 조합 아님
            !careerType.match(/^\d{6}-?\d?$/) &&  // 주민번호 형태 아님
            !careerType.match(/^[a-z]\d+$/);      // 한글자+숫자 아님
          
          if (isValidCareerType && isNotIdCode) {
            const key = `[전담] ${careerType}`;
            acc[key] = (acc[key] || 0) + 1;
          } else {
            // 유효하지 않은 careerType인 경우도 '1년 미만'으로 분류
            const key = '[전담] 1년 미만';
            acc[key] = (acc[key] || 0) + 1;
          }
        } else {
          // careerType이 없거나 유효하지 않은 경우 '1년 미만'으로 분류
          const key = '[전담] 1년 미만';
          acc[key] = (acc[key] || 0) + 1;
        }
        
      } else if (jobType === '생활지원사') {
        // 생활지원사: 입사일 기준으로 경력 계산 (스냅샷 날짜: 2025-08-04)
        if (emp.hireDate) {
          try {
            const hireDate = new Date(emp.hireDate);
            const snapshotDate = new Date('2025-08-04'); // 데이터 입력 기준일
            const yearsWorked = (snapshotDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            
            let careerCategory = '';
            if (yearsWorked < 1) {
              careerCategory = '[생활지원사] 1년 미만';
            } else if (yearsWorked < 2) {
              careerCategory = '[생활지원사] 1년 이상';
            } else if (yearsWorked < 3) {
              careerCategory = '[생활지원사] 2년 이상';
            } else if (yearsWorked < 5) {
              careerCategory = '[생활지원사] 3년 이상';
            } else {
              careerCategory = '[생활지원사] 5년 이상';
            }
            
            acc[careerCategory] = (acc[careerCategory] || 0) + 1;
          } catch {
            acc['[생활지원사] 경력 미상'] = (acc['[생활지원사] 경력 미상'] || 0) + 1;
          }
        } else {
          acc['[생활지원사] 경력 미상'] = (acc['[생활지원사] 경력 미상'] || 0) + 1;
        }
      }
      
      return acc;
    }, {} as Record<string, number>);
    
    // 데이터가 없는 경우 기본 메시지 추가
    if (Object.keys(certificationStats).length === 0) {
      certificationStats['경력 정보 없음'] = activeEmployees.length;
    }
    
    // 책임별 분석 추가
    const responsibilityStats = activeEmployees.reduce((acc, emp) => {
      const responsibility = emp.responsibility || '책임 미상';
      acc[responsibility] = (acc[responsibility] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      ageGroups,
      socialWorkerAgeGroups,
      lifeSupportAgeGroups,
      institutionStats,
      tenureGroups,
      socialWorkerTenureGroups,
      lifeSupportTenureGroups,
      jobTypeStats,
      regionStats,
      yearlyHiring,
      certificationStats,
      responsibilityStats
    };
  }, [activeEmployees]);
  
  // 차트 데이터 준비
  const chartData = useMemo(() => {
    // 전체 연령 차트 데이터 (기존)
    const ageChartData = Object.entries(detailedStats.ageGroups).map(([age, count]) => ({
      name: age,
      value: count,
      fill: age === '20대' ? '#ef4444' : age === '30대' ? '#f97316' : 
            age === '40대' ? '#eab308' : age === '50대' ? '#22c55e' : '#3b82f6'
    }));
    
    // 전담사회복지사 연령 차트 데이터
    const socialWorkerAgeChartData = Object.entries(detailedStats.socialWorkerAgeGroups).map(([age, count]) => ({
      name: age,
      value: count,
      fill: age === '20대' ? '#ef4444' : age === '30대' ? '#f97316' : 
            age === '40대' ? '#eab308' : age === '50대' ? '#22c55e' : '#3b82f6'
    }));
    
    // 생활지원사 연령 차트 데이터
    const lifeSupportAgeChartData = Object.entries(detailedStats.lifeSupportAgeGroups).map(([age, count]) => ({
      name: age,
      value: count,
      fill: age === '20대' ? '#ef4444' : age === '30대' ? '#f97316' : 
            age === '40대' ? '#eab308' : age === '50대' ? '#22c55e' : '#3b82f6'
    }));
    
    // 전체 근속기간 차트 데이터 (기존)
    const tenureChartData = Object.entries(detailedStats.tenureGroups)
      .sort(([a], [b]) => {
        const order = ['1년 미만', '1-3년', '3-5년', '5-10년', '10년 이상'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([tenure, count]) => ({ name: tenure, count }));
    
    // 전담사회복지사 근속기간 차트 데이터
    const socialWorkerTenureChartData = Object.entries(detailedStats.socialWorkerTenureGroups)
      .sort(([a], [b]) => {
        const order = ['1년 미만', '1-3년', '3-5년', '5-10년', '10년 이상'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([tenure, count]) => ({ name: tenure, count }));
    
    // 생활지원사 근속기간 차트 데이터
    const lifeSupportTenureChartData = Object.entries(detailedStats.lifeSupportTenureGroups)
      .sort(([a], [b]) => {
        const order = ['1년 미만', '1-3년', '3-5년', '5-10년', '10년 이상'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([tenure, count]) => ({ name: tenure, count }));
    
    const institutionChartData = Object.entries(detailedStats.institutionStats)
      .filter(([name]) => name && !name.includes('미분류'))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ 
        name: name.length > 30 ? name.substring(0, 30) + '...' : name, 
        count 
      }));
    
    // 디버깅
    console.log('기관별 통계:', detailedStats.institutionStats);
    console.log('차트 데이터:', institutionChartData);
      
    return { 
      ageChartData, 
      socialWorkerAgeChartData,
      lifeSupportAgeChartData,
      tenureChartData, 
      socialWorkerTenureChartData,
      lifeSupportTenureChartData,
      institutionChartData 
    };
  }, [detailedStats]);
  

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6" data-testid="employee-statistics">
      
      {/* 주요 통계 요약 - 상단 카드 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          📋 주요 통계 현황
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
            <div className="text-center">
              <p className="text-sm font-medium text-green-700 mb-1">전담사회복지사</p>
              <p className="text-2xl font-bold text-green-900">
                {stats.socialWorkerCount}명
              </p>
              <p className="text-xs text-green-600">(전담+선임전담)</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border-2 border-cyan-200 bg-cyan-50">
            <div className="text-center">
              <p className="text-sm font-medium text-cyan-700 mb-1">정원 대비 현원</p>
              <p className="text-2xl font-bold text-cyan-900">
                {stats.fillRate}%
              </p>
              <p className="text-xs text-cyan-600">(충원율)</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700 mb-1">생활지원사</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.lifeSupportCount}명
              </p>
              <p className="text-xs text-blue-600">(생활지원사)</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">총 기관수</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.institutionCount}개
              </p>
              <p className="text-xs text-gray-600">전체</p>
            </div>
          </div>
        </div>
      </div>



      {/* 직무별 연령 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 전담사회복지사 연령 분포 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <PieChart className="text-green-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">전담사회복지사 연령 분포</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData.socialWorkerAgeChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, value}) => `${name}: ${value}명`}
                  >
                    {chartData.socialWorkerAgeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 생활지원사 연령 분포 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <PieChart className="text-blue-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">생활지원사 연령 분포</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData.lifeSupportAgeChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, value}) => `${name}: ${value}명`}
                  >
                    {chartData.lifeSupportAgeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 직무별 근속 및 안정성 지표 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 전담사회복지사 근속 및 안정성 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Clock className="text-green-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">전담사회복지사 근속 및 안정성</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 근속기간 차트 */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.socialWorkerTenureChartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {(() => {
                // 전담사회복지사 근속기간별 분류 (2025-08-04 기준)
                const socialWorkers = activeEmployees.filter(emp => 
                  emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
                );
                
                const tenureGroups = socialWorkers.reduce((acc, emp) => {
                  if (emp.hireDate) {
                    try {
                      const hireDate = new Date(emp.hireDate);
                      const snapshotDate = new Date('2025-08-04');
                      const years = (snapshotDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                      
                      if (years < 1) acc['1년 미만 (신규)']++;
                      else if (years < 2) acc['1-2년 (적응기)']++;
                      else if (years < 5) acc['2-5년 (안정기)']++;
                      else acc['5년 이상 (장기근속)']++;
                    } catch {
                      acc['기간 미상']++;
                    }
                  } else {
                    acc['기간 미상']++;
                  }
                  return acc;
                }, {
                  '1년 미만 (신규)': 0,
                  '1-2년 (적응기)': 0,
                  '2-5년 (안정기)': 0,
                  '5년 이상 (장기근속)': 0,
                  '기간 미상': 0
                } as Record<string, number>);

                const total = Object.values(tenureGroups).reduce((sum, count) => sum + count, 0);
                const newbieRate = total > 0 ? ((tenureGroups['1년 미만 (신규)'] / total) * 100).toFixed(1) : '0.0';
                const stableRate = total > 0 ? ((tenureGroups['5년 이상 (장기근속)'] / total) * 100).toFixed(1) : '0.0';
                const adaptationRate = total > 0 ? ((tenureGroups['1-2년 (적응기)'] / total) * 100).toFixed(1) : '0.0';

                return (
                  <div>
                    {/* 주요 지표 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-lg font-bold text-amber-700">{newbieRate}%</div>
                        <div className="text-xs text-amber-600">신규 채용률</div>
                        <div className="text-xs text-gray-500">{tenureGroups['1년 미만 (신규)']}명</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-lg font-bold text-purple-700">{adaptationRate}%</div>
                        <div className="text-xs text-purple-600">적응기</div>
                        <div className="text-xs text-gray-500">{tenureGroups['1-2년 (적응기)']}명</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-700">{stableRate}%</div>
                        <div className="text-xs text-blue-600">장기 근속률</div>
                        <div className="text-xs text-gray-500">{tenureGroups['5년 이상 (장기근속)']}명</div>
                      </div>
                    </div>
                    
                    {/* 전체 인원 */}
                    <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-700">{socialWorkers.length}명</div>
                      <div className="text-sm text-green-600">전담사회복지사 총 인원</div>
                    </div>
                    
                    {/* 상세 분포 */}
                    <div className="space-y-2 mb-4">
                      {Object.entries(tenureGroups).map(([group, count]) => {
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={group} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{group}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{count}명</span>
                              <span className="text-xs text-gray-500">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* 분석 */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h6 className="text-xs font-medium text-gray-700 mb-1">📊 분석</h6>
                      <p className="text-xs text-gray-600">
                        {(() => {
                          const data = chartData.socialWorkerTenureChartData;
                          const maxGroup = data.reduce((max, item) => item.count > max.count ? item : max, {name: '', count: 0});
                          const longTermCount = data.filter(item => item.name === '5-10년' || item.name === '10년 이상')
                            .reduce((sum, item) => sum + item.count, 0);
                          const totalChart = data.reduce((sum, item) => sum + item.count, 0);
                          
                          return `${maxGroup.name} 그룹이 ${maxGroup.count}명으로 가장 많아 최근 대규모 채용을 시사하며, 
                          장기근속자(5년+) ${longTermCount}명(${totalChart > 0 ? ((longTermCount/totalChart)*100).toFixed(1) : 0}%)은 
                          사업 초기부터의 핵심 인력으로 조직 안정성을 담당하고 있습니다.`;
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* 생활지원사 근속 및 안정성 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Clock className="text-blue-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">생활지원사 근속 및 안정성</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 근속기간 차트 */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.lifeSupportTenureChartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {(() => {
                // 생활지원사 근속기간별 분류 (2025-08-04 기준)
                const lifeSupportWorkers = activeEmployees.filter(emp => 
                  emp.jobType === '생활지원사'
                );
                
                const tenureGroups = lifeSupportWorkers.reduce((acc, emp) => {
                  if (emp.hireDate) {
                    try {
                      const hireDate = new Date(emp.hireDate);
                      const snapshotDate = new Date('2025-08-04');
                      const years = (snapshotDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                      
                      if (years < 1) acc['1년 미만 (신규)']++;
                      else if (years < 2) acc['1-2년 (적응기)']++;
                      else if (years < 5) acc['2-5년 (안정기)']++;
                      else acc['5년 이상 (장기근속)']++;
                    } catch {
                      acc['기간 미상']++;
                    }
                  } else {
                    acc['기간 미상']++;
                  }
                  return acc;
                }, {
                  '1년 미만 (신규)': 0,
                  '1-2년 (적응기)': 0,
                  '2-5년 (안정기)': 0,
                  '5년 이상 (장기근속)': 0,
                  '기간 미상': 0
                } as Record<string, number>);

                const total = Object.values(tenureGroups).reduce((sum, count) => sum + count, 0);
                const newbieRate = total > 0 ? ((tenureGroups['1년 미만 (신규)'] / total) * 100).toFixed(1) : '0.0';
                const stableRate = total > 0 ? ((tenureGroups['5년 이상 (장기근속)'] / total) * 100).toFixed(1) : '0.0';
                const adaptationRate = total > 0 ? ((tenureGroups['1-2년 (적응기)'] / total) * 100).toFixed(1) : '0.0';

                return (
                  <div>
                    {/* 주요 지표 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-lg font-bold text-amber-700">{newbieRate}%</div>
                        <div className="text-xs text-amber-600">신규 채용률</div>
                        <div className="text-xs text-gray-500">{tenureGroups['1년 미만 (신규)']}명</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-lg font-bold text-purple-700">{adaptationRate}%</div>
                        <div className="text-xs text-purple-600">적응기</div>
                        <div className="text-xs text-gray-500">{tenureGroups['1-2년 (적응기)']}명</div>
                      </div>
                      <div className="text-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                        <div className="text-lg font-bold text-cyan-700">{stableRate}%</div>
                        <div className="text-xs text-cyan-600">장기 근속률</div>
                        <div className="text-xs text-gray-500">{tenureGroups['5년 이상 (장기근속)']}명</div>
                      </div>
                    </div>
                    
                    {/* 전체 인원 */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-700">{lifeSupportWorkers.length}명</div>
                      <div className="text-sm text-blue-600">생활지원사 총 인원</div>
                    </div>
                    
                    {/* 상세 분포 */}
                    <div className="space-y-2 mb-4">
                      {Object.entries(tenureGroups).map(([group, count]) => {
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={group} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{group}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{count}명</span>
                              <span className="text-xs text-gray-500">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* 분석 */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h6 className="text-xs font-medium text-gray-700 mb-1">📊 분석</h6>
                      <p className="text-xs text-gray-600">
                        {(() => {
                          const data = chartData.lifeSupportTenureChartData;
                          const maxGroup = data.reduce((max, item) => item.count > max.count ? item : max, {name: '', count: 0});
                          const longTermCount = data.filter(item => item.name === '5-10년' || item.name === '10년 이상')
                            .reduce((sum, item) => sum + item.count, 0);
                          const shortTermCount = data.filter(item => item.name === '1년 미만' || item.name === '1-3년')
                            .reduce((sum, item) => sum + item.count, 0);
                          const totalChart = data.reduce((sum, item) => sum + item.count, 0);
                          
                          return `${maxGroup.name} 그룹이 ${maxGroup.count}명으로 가장 많고, 
                          단기근속자(3년 미만) ${shortTermCount}명(${totalChart > 0 ? ((shortTermCount/totalChart)*100).toFixed(1) : 0}%) vs 
                          장기근속자(5년+) ${longTermCount}명(${totalChart > 0 ? ((longTermCount/totalChart)*100).toFixed(1) : 0}%)으로 
                          높은 인력 유동성과 지속적인 신규 충원 필요성을 보여줍니다.`;
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* 상세 분석 테이블 */}
      
      {/* 경력 유형별 현황 - 레이아웃으로 구분 */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Award className="text-gray-600 h-5 w-5 mr-2" />
            <div>
              <h4 className="text-md font-semibold">직무별 경력 현황</h4>
              <p className="text-xs text-gray-500 mt-1">전담사회복지사: 경력유형 필드 | 생활지원사: 입사일 기준 계산 (2025.08.04)</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(detailedStats.certificationStats).length > 0 ? (
            <div className="space-y-6">
              {/* 전담사회복지사 섹션 */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2 text-blue-600" />
                  전담사회복지사 (경력유형 필드)
                  <span className="ml-auto text-xs text-gray-500">
                    총 {Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[전담]'))
                      .reduce((sum, [, count]) => sum + count, 0)}명
                  </span>
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(() => {
                    const socialWorkerEntries = Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[전담]'));
                    const totalSocialWorkers = socialWorkerEntries.reduce((sum, [, count]) => sum + count, 0);
                    
                    return socialWorkerEntries
                      .sort(([a], [b]) => {
                        // 경력 순서대로 정렬 (4년이상 -> 2년이상 -> 1년 이상 -> 1년 미만)
                        const getOrder = (str: string) => {
                          // [전담] 부분 제거하고 비교
                          const cleanStr = str.replace('[전담] ', '');
                          if (cleanStr === '4년이상') return 1;
                          if (cleanStr === '2년이상') return 2;
                          if (cleanStr === '1년 이상') return 3;
                          if (cleanStr === '1년이상') return 3;
                          if (cleanStr === '1년 미만') return 4;
                          if (cleanStr === '1년미만') return 4;
                          return 5; // 기타
                        };
                        return getOrder(a) - getOrder(b);
                      })
                      .map(([careerType, count]) => {
                        const percentage = totalSocialWorkers > 0 ? ((count / totalSocialWorkers) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={careerType} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors">
                            <div className="text-lg font-bold text-gray-800">{count}명</div>
                            <div className="text-xs font-medium text-blue-600 mb-1">{percentage}%</div>
                            <div className="text-sm text-gray-600 leading-tight">
                              {careerType.replace('[전담] ', '')}
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
                {Object.entries(detailedStats.certificationStats).filter(([careerType]) => careerType.startsWith('[전담]')).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">전담사회복지사 경력 데이터 없음</p>
                  </div>
                )}
              </div>

              {/* 생활지원사 섹션 */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-green-600" />
                  생활지원사 (입사일 기준 자동 계산)
                  <span className="ml-auto text-xs text-gray-500">
                    총 {Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[생활지원사]'))
                      .reduce((sum, [, count]) => sum + count, 0)}명
                  </span>
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(() => {
                    const lifeSupportEntries = Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[생활지원사]'));
                    const totalLifeSupport = lifeSupportEntries.reduce((sum, [, count]) => sum + count, 0);
                    
                    const unknownCount = lifeSupportEntries.find(([type]) => type.includes('경력 미상'))?.[1] || 0;
                    const filteredEntries = lifeSupportEntries.filter(([type]) => !type.includes('경력 미상'));
                    
                    return (
                      <>
                        {filteredEntries
                          .sort(([a], [b]) => {
                            // 경력 순서대로 정렬 (5년 이상 -> 3년 이상 -> 2년 이상 -> 1년 이상 -> 1년 미만)
                            const getOrder = (str: string) => {
                              if (str.includes('5년 이상')) return 1;
                              if (str.includes('3년 이상')) return 2;
                              if (str.includes('2년 이상')) return 3;
                              if (str.includes('1년 이상')) return 4;
                              if (str.includes('1년 미만')) return 5;
                              return 98;
                            };
                            return getOrder(a) - getOrder(b);
                          })
                          .map(([careerType, count]) => {
                            const percentage = totalLifeSupport > 0 ? ((count / totalLifeSupport) * 100).toFixed(1) : '0.0';
                            return (
                              <div key={careerType} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors">
                                <div className="text-lg font-bold text-gray-800">{count}명</div>
                                <div className="text-xs font-medium text-green-600 mb-1">{percentage}%</div>
                                <div className="text-sm text-gray-600 leading-tight">
                                  {careerType.replace('[생활지원사] ', '')}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">자동계산</div>
                              </div>
                            );
                          })}
                        {unknownCount > 0 && (
                          <div className="col-span-full text-xs text-gray-500 mt-2">
                            * 경력 미상: {unknownCount}명
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                {Object.entries(detailedStats.certificationStats).filter(([careerType]) => careerType.startsWith('[생활지원사]')).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">생활지원사 입사일 데이터 없음</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>경력 정보가 없습니다</p>
              <p className="text-xs mt-1">전담사회복지사 경력유형 또는 생활지원사 입사일 데이터가 필요합니다</p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* 기관별 성과 비교 분석 */}
      <div className="grid grid-cols-1 gap-6">
        {/* 기관별 성과 비교 분석 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Building2 className="text-purple-600 h-5 w-5 mr-2" />
              <div>
                <h4 className="text-md font-semibold">기관별 성과 비교 분석</h4>
                <p className="text-xs text-gray-500 mt-1">(충원율, 인력균형성, 안정성, 전문성, 서비스효율성 기준)</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                if (!Array.isArray(institutionData) || institutionData.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>기관 데이터를 불러오는 중입니다...</p>
                    </div>
                  );
                }

                // 디버그: 직원 데이터의 모든 기관명 필드 확인
                const uniqueEmpInstitutions = [...new Set(activeEmployees.map(emp => emp.institution || emp.기관명 || '').filter(name => name))];
                console.log('🔍 직원 데이터의 고유 기관명들:', uniqueEmpInstitutions.slice(0, 20));

                // 디버그: 기관 데이터의 모든 기관명 확인
                const uniqueInstNames = institutionData.map((inst: any) => inst.name).filter(name => name);
                console.log('🏢 기관 데이터의 기관명들:', uniqueInstNames.slice(0, 20));

                // 매칭 가능성 분석
                const possibleMatches = uniqueEmpInstitutions.map(empInst => {
                  const matches = uniqueInstNames.filter(instName => 
                    instName.includes(empInst) || 
                    empInst.includes(instName) ||
                    instName.replace(/노인통합지원센터|종합사회복지관|노인복지관|복지관|센터/g, '').includes(empInst.replace(/노인통합지원센터|종합사회복지관|노인복지관|복지관|센터/g, ''))
                  );
                  return { empInst, matches };
                }).filter(item => item.matches.length > 0);
                
                console.log('🔍 매칭 가능한 기관들:', possibleMatches.slice(0, 10));

                // 기관별 인력 현황 매칭 (향상된 알고리즘)
                const institutionPerformance = institutionData
                  .filter((inst: any) => 
                    !inst.district?.includes('광역지원기관') && 
                    inst.name !== '(재)경상남도 사회서비스원'
                  )
                  .map((inst: any) => {
                    // 해당 기관의 직원들 찾기 (임시로 정원 데이터를 현원으로 사용)
                    const empInInstitution = []; // 임시로 빈 배열
                    
                    // 임시 방안: 정원 정보를 기반으로 현원 추정
                    // (실제 매칭이 어려운 상황에서 대략적인 현원을 보여주기 위함)
                    const estimatedCurrent = Math.min(
                      (inst.allocatedSocialWorkers || 0) + (inst.allocatedLifeSupport || 0), // 정원
                      Math.floor(((inst.allocatedSocialWorkers || 0) + (inst.allocatedLifeSupport || 0)) * 0.85) // 정원의 85% 정도로 추정
                    );
                    
                    // 개선된 실제 매칭 로직 (institutionCode 우선)
                    const realEmpInInstitution = activeEmployees.filter(emp => {
                      // 1. 기관코드 매칭 (최우선 - 가장 정확함)
                      if (emp.institutionCode && inst.code && emp.institutionCode === inst.code) {
                        return true;
                      }
                      
                      // 2. 구 필드명 기관코드 매칭
                      if (emp.기관코드 && inst.code && emp.기관코드 === inst.code) {
                        return true;
                      }
                      
                      // 3. 정확한 기관명 일치
                      const empInstitution = emp.institution || emp.기관명 || '';
                      if (empInstitution && empInstitution === inst.name) return true;
                      
                      // 4. 지역 + 핵심키워드 매칭 (district 기반)
                      const empDistrict = emp.district || emp.지역 || '';
                      if (empDistrict && inst.district && empDistrict === inst.district) {
                        // 같은 지역 내에서 기관 유형별 매칭
                        const empCore = empInstitution.replace(/노인통합지원센터|종합사회복지관|노인복지관|복지관|센터|지원센터|노인|통합|지원/g, '').trim();
                        const instCore = inst.name.replace(/노인통합지원센터|종합사회복지관|노인복지관|복지관|센터|지원센터|노인|통합|지원/g, '').trim();
                        
                        // 핵심 키워드가 일치하는 경우
                        if (empCore.length >= 2 && instCore.length >= 2) {
                          if (empInstitution.includes(instCore) || inst.name.includes(empCore) || empCore === instCore) {
                            return true;
                          }
                        }
                        
                        // 같은 지역의 특정 유형별 매칭
                        if (empInstitution.includes('노인') && inst.name.includes('노인')) {
                          // 거제시 - 거제노인통합지원센터/거제사랑노인복지센터 같은 경우
                          if (empInstitution.includes(empDistrict.replace('시', '').replace('군', '').replace('구', '')) ||
                              inst.name.includes(empDistrict.replace('시', '').replace('군', '').replace('구', ''))) {
                            return true;
                          }
                        }
                        
                        // 사회복지관 매칭
                        if (empInstitution.includes('복지') && inst.name.includes('복지')) {
                          return true;
                        }
                      }
                      
                      // 5. 이름 유사도 매칭 (마지막 수단)
                      if (empInstitution && empInstitution.length > 5 && inst.name.length > 5) {
                        // 간단한 유사도 계산 (공통 문자 수 기준)
                        const calculateSimilarity = (str1: string, str2: string) => {
                          const longer = str1.length > str2.length ? str1 : str2;
                          const shorter = str1.length > str2.length ? str2 : str1;
                          let matches = 0;
                          for (let i = 0; i < shorter.length; i++) {
                            if (longer.includes(shorter[i])) matches++;
                          }
                          return matches / longer.length;
                        };
                        
                        const similarity = calculateSimilarity(empInstitution, inst.name);
                        if (similarity > 0.7) {
                          return true;
                        }
                      }
                      
                      return false;
                    });
                    
                    // 실제 매칭된 직원이 있으면 사용, 아니면 빈 배열 유지
                    const finalEmpInInstitution = realEmpInInstitution;

                    // 매칭 통계 로깅 (처음 5개 기관만)
                    if (institutionData.indexOf(inst) < 5) {
                      const matchedByCode = activeEmployees.filter(emp => 
                        (emp.institutionCode && inst.code && emp.institutionCode === inst.code) ||
                        (emp.기관코드 && inst.code && emp.기관코드 === inst.code)
                      ).length;
                      
                      const matchedByName = activeEmployees.filter(emp => {
                        const empInstitution = emp.institution || emp.기관명 || '';
                        return empInstitution && empInstitution === inst.name;
                      }).length;
                      
                      const matchedByDistrict = activeEmployees.filter(emp => {
                        const empDistrict = emp.district || emp.지역 || '';
                        const empInstitution = emp.institution || emp.기관명 || '';
                        return empDistrict === inst.district && empInstitution.includes('노인') && inst.name.includes('노인');
                      }).length;

                      console.log(`🔍 매칭분석 [${inst.name}] (${inst.code}):`, {
                        기관지역: inst.district,
                        코드매칭: matchedByCode,
                        이름매칭: matchedByName, 
                        지역매칭: matchedByDistrict,
                        총매칭: finalEmpInInstitution.length,
                        실제데이터: finalEmpInInstitution.length > 0 ? '✅' : '❌',
                        샘플직원: finalEmpInInstitution.slice(0, 3).map(emp => ({
                          name: emp.name,
                          institution: emp.institution,
                          기관명: emp.기관명,
                          institutionCode: emp.institutionCode,
                          기관코드: emp.기관코드,
                          district: emp.district
                        }))
                      });
                    }

                    // 직원 분류 (실제 매칭된 경우 사용, 아니면 추정)
                    const socialWorkers = finalEmpInInstitution.filter(emp => 
                      emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
                    );
                    const lifeSupport = finalEmpInInstitution.filter(emp => 
                      emp.jobType === '생활지원사'
                    );

                    // 현원 계산 (실제 매칭 우선, 없으면 추정값)
                    const allocatedTotal = (inst.allocatedSocialWorkers || 0) + (inst.allocatedLifeSupport || 0);
                    const hasRealMatch = finalEmpInInstitution.length > 0;
                    const actualTotal = hasRealMatch ? finalEmpInInstitution.length : estimatedCurrent;
                    
                    // 실제 매칭 vs 추정 데이터
                    const actualSocial = hasRealMatch ? socialWorkers.length : Math.floor((inst.allocatedSocialWorkers || 0) * 0.85);
                    const actualLife = hasRealMatch ? lifeSupport.length : Math.floor((inst.allocatedLifeSupport || 0) * 0.85);

                    // 근속기간 분석 (실제 데이터가 있는 경우만)
                    const longTenure = finalEmpInInstitution.filter(emp => {
                      if (!emp.hireDate) return false;
                      try {
                        const hireDate = new Date(emp.hireDate);
                        const years = (new Date('2025-08-04').getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                        return years >= 3;
                      } catch {
                        return false;
                      }
                    }).length;

                    const shortTenure = finalEmpInInstitution.filter(emp => {
                      if (!emp.hireDate) return false;
                      try {
                        const hireDate = new Date(emp.hireDate);
                        const years = (new Date('2025-08-04').getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                        return years < 1;
                      } catch {
                        return false;
                      }
                    }).length;

                    // 경력 있는 전담사회복지사
                    const experiencedSocial = socialWorkers.filter(emp => 
                      emp.careerType && 
                      emp.careerType.includes('년') && 
                      !emp.careerType.includes('1년미만') &&
                      !emp.careerType.includes('신규')
                    ).length;

                    // 성과 지표 계산
                    const hiredTotal = (inst.hiredSocialWorkers || 0) + (inst.hiredLifeSupport || 0);

                    // 원시 데이터 계산 (상대평가를 위한 기준 데이터)
                    const fillRate = allocatedTotal > 0 ? (actualTotal / allocatedTotal) * 100 : 0;
                    
                    // 사업지침 기준: 전담사회복지사 1명당 생활지원사 16명 (1:16 비율)
                    const idealSocialRatio = 1 / 17; // 전담 1명 : 생활지원사 16명 = 1:16 → 전담 비율 1/17 ≈ 5.9%
                    const actualSocialRatio = actualTotal > 0 ? actualSocial / actualTotal : idealSocialRatio;
                    
                    // 균형도 측정: 이상적 비율과의 차이
                    const balanceDeviation = Math.abs(actualSocialRatio - idealSocialRatio);
                    
                    // 추가 정보: 전담사회복지사 1명당 실제 생활지원사 수
                    const actualRatio = actualSocial > 0 ? actualLife / actualSocial : 0;

                    // 디버그용 로그 (첫 3개 기관만)
                    if (institutionData.indexOf(inst) < 3) {
                      console.log(`📊 기관현황 [${inst.name}]:`, {
                        정원: allocatedTotal,
                        현원: actualTotal,
                        전담: actualSocial,
                        생활지원: actualLife,
                        실제매칭: hasRealMatch,
                        매칭된직원수: finalEmpInInstitution.length,
                        비율: `1:${actualRatio.toFixed(1)}`
                      });
                    }
                    const stabilityRate = actualTotal > 0 ? (longTenure / actualTotal) * 100 : 0;
                    const expertiseRate = actualSocial > 0 ? (experiencedSocial / actualSocial) * 100 : 0;
                    const targets = inst.allocatedTargets || inst.providedGeneral || 0;
                    const serviceRatio = targets > 0 && actualLife > 0 ? targets / actualLife : 0;

                    return {
                      code: inst.code,
                      name: inst.name,
                      district: inst.district,
                      allocatedSocial: inst.allocatedSocialWorkers || 0,
                      allocatedLife: inst.allocatedLifeSupport || 0,
                      allocatedTotal,
                      hiredSocial: inst.hiredSocialWorkers || 0,
                      hiredLife: inst.hiredLifeSupport || 0,
                      hiredTotal,
                      actualSocial: actualSocial,
                      actualLife: actualLife,
                      hasRealMatch: hasRealMatch, // 실제 매칭 여부
                      actualTotal,
                      targets: targets,
                      longTenure,
                      shortTenure,
                      experiencedSocial,
                      // 원시 데이터 (상대평가용)
                      fillRate: Math.round(fillRate * 10) / 10,
                      balanceDeviation: Math.round(balanceDeviation * 1000) / 1000,
                      actualRatio: Math.round(actualRatio * 10) / 10, // 전담 1명당 생활지원사 수
                      stabilityRate: Math.round(stabilityRate * 10) / 10,
                      expertiseRate: Math.round(expertiseRate * 10) / 10,
                      serviceRatio: Math.round(serviceRatio * 10) / 10
                    };
                  })
                  .filter(inst => inst.allocatedTotal > 0); // 정원이 있는 기관만

                // 매칭 효과 전체 통계
                const totalInstitutionsWithData = institutionPerformance.length;
                const institutionsWithRealMatch = institutionPerformance.filter(inst => inst.hasRealMatch).length;
                const matchingSuccessRate = totalInstitutionsWithData > 0 ? 
                  ((institutionsWithRealMatch / totalInstitutionsWithData) * 100).toFixed(1) : '0.0';
                
                console.log(`📈 매칭 효과 전체 통계:`, {
                  전체기관수: totalInstitutionsWithData,
                  실제매칭성공: institutionsWithRealMatch,
                  매칭성공률: `${matchingSuccessRate}%`,
                  추정사용기관: totalInstitutionsWithData - institutionsWithRealMatch,
                  개선사항: institutionsWithRealMatch < totalInstitutionsWithData * 0.8 ? '매칭 알고리즘 추가 개선 필요' : '매칭 품질 양호'
                });

                // 종사자 데이터 종합 분석
                const allMatchedEmployees = institutionPerformance
                  .map(inst => inst.hasRealMatch ? inst.actualTotal : 0)
                  .reduce((sum, count) => sum + count, 0);
                
                const totalActiveEmployees = activeEmployees.length;
                const totalLifeSupportWorkers = activeEmployees.filter(emp => emp.jobType === '생활지원사').length;
                const totalSocialWorkers = activeEmployees.filter(emp => 
                  emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
                ).length;

                // 기관 정원 대비 실제 종사자 비교
                const totalAllocatedLife = institutionPerformance.reduce((sum, inst) => sum + (inst.allocatedLife || 0), 0);
                const totalAllocatedSocial = institutionPerformance.reduce((sum, inst) => sum + (inst.allocatedSocial || 0), 0);

                // 생활지원사 중복 체크
                const allMatchedLifeSupport = [];
                const allMatchedSocialWorkers = [];
                institutionPerformance.forEach(inst => {
                  if (inst.hasRealMatch) {
                    const empInInst = activeEmployees.filter(emp => {
                      const empInstitution = emp.institution || emp.기관명 || '';
                      if ((emp.institutionCode && inst.code && emp.institutionCode === inst.code) ||
                          (emp.기관코드 && inst.code && emp.기관코드 === inst.code) ||
                          (empInstitution && empInstitution === inst.name)) {
                        return true;
                      }
                      const empDistrict = emp.district || emp.지역 || '';
                      return empDistrict === inst.district && empInstitution.includes('노인') && inst.name.includes('노인');
                    });
                    
                    empInInst.forEach(emp => {
                      if (emp.jobType === '생활지원사') {
                        allMatchedLifeSupport.push({ id: emp.id, name: emp.name, institution: inst.name });
                      } else if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
                        allMatchedSocialWorkers.push({ id: emp.id, name: emp.name, institution: inst.name });
                      }
                    });
                  }
                });

                // 중복 검사
                const uniqueLifeSupport = [...new Set(allMatchedLifeSupport.map(emp => emp.id))];
                const uniqueSocialWorkers = [...new Set(allMatchedSocialWorkers.map(emp => emp.id))];
                const duplicateLifeSupport = allMatchedLifeSupport.length - uniqueLifeSupport.length;
                const duplicateSocialWorkers = allMatchedSocialWorkers.length - uniqueSocialWorkers.length;

                console.log(`🔍 종사자 데이터 분석:`, {
                  전체재직자: totalActiveEmployees,
                  생활지원사: totalLifeSupportWorkers,
                  전담사회복지사: totalSocialWorkers,
                  매칭성공_생활지원사: institutionPerformance.filter(inst => inst.hasRealMatch).reduce((sum, inst) => sum + (inst.actualLife || 0), 0),
                  매칭성공_전담사회복지사: institutionPerformance.filter(inst => inst.hasRealMatch).reduce((sum, inst) => sum + (inst.actualSocial || 0), 0),
                  기관정원_생활지원사: totalAllocatedLife,
                  기관정원_전담사회복지사: totalAllocatedSocial,
                  비율_생활지원사: `${totalLifeSupportWorkers}/${totalAllocatedLife} = ${(totalLifeSupportWorkers/totalAllocatedLife*100).toFixed(1)}%`,
                  비율_전담사회복지사: `${totalSocialWorkers}/${totalAllocatedSocial} = ${(totalSocialWorkers/totalAllocatedSocial*100).toFixed(1)}%`,
                  중복체크_생활지원사: `매칭수 ${allMatchedLifeSupport.length} - 고유ID ${uniqueLifeSupport.length} = 중복 ${duplicateLifeSupport}개`,
                  중복체크_전담사회복지사: `매칭수 ${allMatchedSocialWorkers.length} - 고유ID ${uniqueSocialWorkers.length} = 중복 ${duplicateSocialWorkers}개`
                });

                if (duplicateLifeSupport > 0) {
                  console.log(`⚠️ 생활지원사 중복 매칭 발견:`, {
                    중복수: duplicateLifeSupport,
                    상세분석: '같은 직원이 여러 기관에 중복 매칭됨'
                  });
                }
                
                if (duplicateSocialWorkers > 0) {
                  console.log(`⚠️ 전담사회복지사 중복 매칭 발견:`, {
                    중복수: duplicateSocialWorkers,
                    상세분석: '같은 직원이 여러 기관에 중복 매칭됨'
                  });
                }

                // 상대평가 점수 계산
                const institutionPerformanceWithScores = institutionPerformance.map((inst, index, allInsts) => {
                  // 1. 충원율 점수 (100%가 최적, 초과시 감점)
                  const fillRateDeviation = Math.abs(inst.fillRate - 100); // 100%와의 편차
                  const fillRateRank = allInsts.filter(other => Math.abs(other.fillRate - 100) < fillRateDeviation).length + 1;
                  const fillRateScore = Math.round(((allInsts.length - fillRateRank + 1) / allInsts.length) * 100);

                  // 2. 인력균형 점수 (편차가 낮을수록 좋음)
                  const balanceRank = allInsts.filter(other => other.balanceDeviation < inst.balanceDeviation).length + 1;
                  const balanceScore = Math.round(((allInsts.length - balanceRank + 1) / allInsts.length) * 100);

                  // 3. 안정성 점수 (높을수록 좋음)
                  const stabilityRank = allInsts.filter(other => other.stabilityRate > inst.stabilityRate).length + 1;
                  const stabilityScore = Math.round(((allInsts.length - stabilityRank + 1) / allInsts.length) * 100);

                  // 4. 전문성 점수 (높을수록 좋음)
                  const expertiseRank = allInsts.filter(other => other.expertiseRate > inst.expertiseRate).length + 1;
                  const expertiseScore = Math.round(((allInsts.length - expertiseRank + 1) / allInsts.length) * 100);

                  // 5. 서비스효율성 점수 (생활지원사 1명당 적정 서비스 대상자 수: 15명 지침)
                  const optimalService = Math.abs(inst.serviceRatio - 15); // 15를 최적으로 가정 (생활지원사 1명당 15명 지침)
                  const serviceRank = allInsts.filter(other => Math.abs(other.serviceRatio - 15) < optimalService).length + 1;
                  const serviceScore = Math.round(((allInsts.length - serviceRank + 1) / allInsts.length) * 100);

                  // 종합 점수 (가중평균)
                  const totalScore = Math.round(
                    fillRateScore * 0.3 +        // 충원율 30%
                    balanceScore * 0.2 +         // 인력균형성 20%
                    stabilityScore * 0.2 +       // 안정성 20%
                    expertiseScore * 0.15 +      // 전문성 15%
                    serviceScore * 0.15          // 서비스효율성 15%
                  );

                  return {
                    ...inst,
                    fillRateScore,
                    balanceScore,
                    stabilityScore,
                    expertiseScore,
                    serviceScore,
                    totalScore
                  };
                }).sort((a, b) => b.totalScore - a.totalScore);

                // 통계 계산
                const totalInstitutions = institutionPerformanceWithScores.length;
                const finalInstitutionPerformance = institutionPerformanceWithScores;
                const avgScore = totalInstitutions > 0 ? 
                  finalInstitutionPerformance.reduce((sum, inst) => sum + inst.totalScore, 0) / totalInstitutions : 0;
                
                const topPerformers = finalInstitutionPerformance.slice(0, 10);
                const bottomPerformers = finalInstitutionPerformance.slice(-5).reverse();
                
                // 상대평가 기준 분석 (하위 30% 기관들)
                const bottom30Percent = Math.ceil(totalInstitutions * 0.3);
                const top30Percent = Math.ceil(totalInstitutions * 0.3);
                
                const lowFillRate = finalInstitutionPerformance.filter(inst => inst.fillRateScore < 40).length;
                const lowBalance = finalInstitutionPerformance.filter(inst => inst.balanceScore < 40).length;
                const lowStability = finalInstitutionPerformance.filter(inst => inst.stabilityScore < 40).length;
                const lowExpertise = finalInstitutionPerformance.filter(inst => inst.expertiseScore < 40).length;

                return (
                  <div>
                    {/* 전체 현황 요약 */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h6 className="text-sm font-medium text-blue-800 mb-3">📊 55개 기관 전체 현황</h6>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div>
                          <div className="text-xl font-bold text-blue-700">{totalInstitutions}개</div>
                          <div className="text-xs text-blue-600">분석 대상 기관</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-blue-700">{avgScore.toFixed(1)}점</div>
                          <div className="text-xs text-blue-600">평균 성과 점수</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-green-700">{finalInstitutionPerformance.filter(inst => inst.totalScore >= 70).length}개</div>
                          <div className="text-xs text-green-600">우수 기관 (70점+)</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-amber-700">{finalInstitutionPerformance.filter(inst => inst.totalScore < 50).length}개</div>
                          <div className="text-xs text-amber-600">개선 필요 (50점-)</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-purple-700">{institutionsWithRealMatch}개</div>
                          <div className="text-xs text-purple-600">실제 매칭 ({matchingSuccessRate}%)</div>
                        </div>
                      </div>

                      {/* 중복 매칭 분석 결과 */}
                      {(() => {
                        // 중복 분석 계산
                        const allMatchedLifeSupport = [];
                        const allMatchedSocialWorkers = [];
                        institutionPerformance.forEach(inst => {
                          if (inst.hasRealMatch) {
                            const empInInst = activeEmployees.filter(emp => {
                              const empInstitution = emp.institution || emp.기관명 || '';
                              if ((emp.institutionCode && inst.code && emp.institutionCode === inst.code) ||
                                  (emp.기관코드 && inst.code && emp.기관코드 === inst.code) ||
                                  (empInstitution && empInstitution === inst.name)) {
                                return true;
                              }
                              const empDistrict = emp.district || emp.지역 || '';
                              return empDistrict === inst.district && empInstitution.includes('노인') && inst.name.includes('노인');
                            });
                            
                            empInInst.forEach(emp => {
                              if (emp.jobType === '생활지원사') {
                                allMatchedLifeSupport.push({ id: emp.id, name: emp.name, institution: inst.name });
                              } else if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
                                allMatchedSocialWorkers.push({ id: emp.id, name: emp.name, institution: inst.name });
                              }
                            });
                          }
                        });

                        const uniqueLifeSupport = [...new Set(allMatchedLifeSupport.map(emp => emp.id))];
                        const uniqueSocialWorkers = [...new Set(allMatchedSocialWorkers.map(emp => emp.id))];
                        const duplicateLifeSupport = allMatchedLifeSupport.length - uniqueLifeSupport.length;
                        const duplicateSocialWorkers = allMatchedSocialWorkers.length - uniqueSocialWorkers.length;

                        const totalActiveLifeSupport = activeEmployees.filter(emp => emp.jobType === '생활지원사').length;
                        const totalActiveSocial = activeEmployees.filter(emp => 
                          emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
                        ).length;

                        // 항상 데이터 품질 분석 표시
                        return (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <h6 className="text-sm font-medium text-gray-800 mb-2">🔍 데이터 매칭 분석</h6>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <div className="text-amber-700 mb-1">
                                    <span className="font-medium">생활지원사 매칭:</span>
                                  </div>
                                  <div className="text-amber-600 space-y-1">
                                    <p>• 전체 재직자: {totalActiveLifeSupport}명</p>
                                    <p>• 매칭 결과: {allMatchedLifeSupport.length}명</p>
                                    <p>• 고유 인원: {uniqueLifeSupport.length}명</p>
                                    {duplicateLifeSupport > 0 && (
                                      <p className="text-red-600 font-medium">• 중복 매칭: {duplicateLifeSupport}명</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-amber-700 mb-1">
                                    <span className="font-medium">전담사회복지사 매칭:</span>
                                  </div>
                                  <div className="text-amber-600 space-y-1">
                                    <p>• 전체 재직자: {totalActiveSocial}명</p>
                                    <p>• 매칭 결과: {allMatchedSocialWorkers.length}명</p>
                                    <p>• 고유 인원: {uniqueSocialWorkers.length}명</p>
                                    {duplicateSocialWorkers > 0 && (
                                      <p className="text-red-600 font-medium">• 중복 매칭: {duplicateSocialWorkers}명</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {(duplicateLifeSupport > 0 || duplicateSocialWorkers > 0) && (
                                <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                                  <span className="font-medium">⚠️ 문제 발견:</span> 같은 직원이 여러 기관에 중복 매칭되어 실제보다 많은 인원으로 표시됩니다.
                                </div>
                              )}
                              
                              {(duplicateLifeSupport === 0 && duplicateSocialWorkers === 0) && (
                                <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
                                  <span className="font-medium">✅ 정상:</span> 중복 매칭 없이 정확한 데이터가 표시되고 있습니다.
                                </div>
                              )}
                            </div>
                          );
                      })()}
                    </div>

                    {/* 성과 지표 정의 */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h6 className="text-sm font-medium text-gray-800 mb-4">📖 성과 지표 정의</h6>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* 충원율 */}
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-semibold text-blue-700">충원율</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p><strong>정의:</strong> 정원 대비 현재 근무 중인 인원 비율</p>
                              <p><strong>계산:</strong> (현원 / 정원) × 100</p>
                              <p><strong>의미:</strong> 정원 준수도 (100% 최적)</p>
                              <div className="text-blue-600 mt-1">
                                <span className="text-xs">🟢95-105% 🟡85-110% 🟠75-115% 🔴그외</span>
                              </div>
                            </div>
                          </div>

                          {/* 인력균형성 */}
                          <div className="p-3 bg-white rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="font-semibold text-purple-700">인력균형성</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p><strong>정의:</strong> 사업지침 1:16 비율 달성도</p>
                              <p><strong>계산:</strong> 전담사회복지사 : 생활지원사 비율</p>
                              <p><strong>의미:</strong> 적정 인력 구성</p>
                              <div className="text-purple-600 mt-1">
                                <span className="text-xs">🟢1:14-18 🟡1:12-20 🟠1:10-22 🔴그외</span>
                              </div>
                            </div>
                          </div>

                          {/* 안정성 */}
                          <div className="p-3 bg-white rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <span className="font-semibold text-orange-700">안정성</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p><strong>정의:</strong> 3년 이상 근속자 비율</p>
                              <p><strong>계산:</strong> (3년+ 근속자 / 전체 직원) × 100</p>
                              <p><strong>의미:</strong> 이직률 및 조직 안정도</p>
                              <div className="text-orange-600 mt-1">
                                <span className="text-xs">🟢70%+ 🟡50-69% 🟠30-49% 🔴30%미만</span>
                              </div>
                            </div>
                          </div>

                          {/* 전문성 */}
                          <div className="p-3 bg-white rounded-lg border border-cyan-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                              <span className="font-semibold text-cyan-700">전문성</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p><strong>정의:</strong> 전담사회복지사 중 경력자 비율</p>
                              <p><strong>계산:</strong> (경력자 / 전체 전담사회복지사) × 100</p>
                              <p><strong>의미:</strong> 업무 역량 및 서비스 질</p>
                              <div className="text-cyan-600 mt-1">
                                <span className="text-xs">🟢70%+ 🟡50-69% 🟠30-49% 🔴30%미만</span>
                              </div>
                            </div>
                          </div>

                          {/* 서비스효율성 */}
                          <div className="p-3 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="font-semibold text-green-700">서비스효율성</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p><strong>정의:</strong> 생활지원사 대비 서비스 제공 효율</p>
                              <p><strong>계산:</strong> (서비스 대상자 수 / 생활지원사 수)</p>
                              <p><strong>의미:</strong> 지침 1:15 준수도 (15명 초과시 과부하)</p>
                              <div className="text-green-600 mt-1">
                                <span className="text-xs">🟢13-17명 🟡10-20명 🟠7-23명 🔴과부하/비효율</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 종합 설명 */}
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h6 className="text-sm font-medium text-blue-800 mb-2">💡 종합 평가 방식</h6>
                          <div className="text-xs text-blue-700 space-y-1">
                            <p>• <strong>상대평가:</strong> 55개 기관을 대상으로 순위 기반 점수 산출</p>
                            <p>• <strong>가중평균:</strong> 충원율(30%) + 인력균형성(20%) + 안정성(20%) + 전문성(15%) + 서비스효율성(15%)</p>
                            <p>• <strong>점수 범위:</strong> 0-100점 (높을수록 우수, 70점+ 우수기관, 50점- 개선필요)</p>
                            <p>• <strong>연관성:</strong> 안정성↓ → 신규자↑ → 전문성↓ (상호 영향 관계)</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 성과 지표별 현황 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-lg font-bold text-green-700">{topPerformers[0]?.totalScore || 0}점</div>
                        <div className="text-xs text-green-600">최고 성과</div>
                        <div className="text-xs text-gray-500 truncate">{topPerformers[0]?.name?.substring(0, 10) || '-'}...</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-lg font-bold text-red-700">{lowFillRate}개</div>
                        <div className="text-xs text-red-600">충원율 부족</div>
                        <div className="text-xs text-gray-500">(&lt;80%)</div>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-lg font-bold text-amber-700">{lowBalance}개</div>
                        <div className="text-xs text-amber-600">인력 불균형</div>
                        <div className="text-xs text-gray-500">(1:16 미달성)</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-lg font-bold text-purple-700">{lowStability}개</div>
                        <div className="text-xs text-purple-600">안정성 부족</div>
                        <div className="text-xs text-gray-500">(&lt;30%)</div>
                      </div>
                      <div className="text-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                        <div className="text-lg font-bold text-cyan-700">{lowExpertise}개</div>
                        <div className="text-xs text-cyan-600">전문성 부족</div>
                        <div className="text-xs text-gray-500">(&lt;40%)</div>
                      </div>
                    </div>
                    
                    {/* 전체 기관 목록 (페이지네이션) */}
                    {(() => {
                      const itemsPerPage = 10;
                      const totalPages = Math.ceil(finalInstitutionPerformance.length / itemsPerPage);
                      
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentPageData = finalInstitutionPerformance.slice(startIndex, endIndex);
                      
                      const handlePageChange = (newPage: number) => {
                        if (newPage >= 1 && newPage <= totalPages) {
                          setCurrentPage(newPage);
                        }
                      };

                      return (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="text-sm font-medium text-blue-800">🏢 전체 기관 성과 목록 ({finalInstitutionPerformance.length}개)</h6>
                            <div className="text-xs text-gray-500">
                              페이지 {currentPage} / {totalPages} ({startIndex + 1}-{Math.min(endIndex, finalInstitutionPerformance.length)} / {finalInstitutionPerformance.length})
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            {currentPageData.map((inst, index) => {
                              const overallRank = startIndex + index + 1;
                              const getScoreColor = (score: number) => {
                                if (score >= 70) return 'text-green-700 bg-green-50';
                                if (score >= 50) return 'text-blue-700 bg-blue-50';
                                return 'text-amber-700 bg-amber-50';
                              };
                              
                              return (
                                <div key={inst.code} className={`p-3 rounded-lg border ${
                                  overallRank <= 10 ? 'border-green-200 bg-green-50' :
                                  overallRank > finalInstitutionPerformance.length - 10 ? 'border-amber-200 bg-amber-50' :
                                  'border-gray-200 bg-gray-50'
                                }`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-lg font-bold ${
                                          overallRank <= 10 ? 'text-green-600' :
                                          overallRank > finalInstitutionPerformance.length - 10 ? 'text-amber-600' :
                                          'text-gray-600'
                                        }`}>#{overallRank}</span>
                                        <div>
                                          <div className="text-sm font-semibold text-gray-800">{inst.name}</div>
                                          <div className="text-xs text-gray-500">📍 {inst.district} | 정원: {inst.allocatedTotal}명 → 현원: {inst.actualTotal}명 (충원율: {inst.fillRate}%) {inst.hasRealMatch ? '✅실제' : '📊추정'}</div>
                                          <div className="text-xs text-blue-500">👥 전담:{inst.actualSocial}명, 생활지원:{inst.actualLife}명 (비율 1:{inst.actualRatio.toFixed(1)}) {inst.actualRatio < 14 ? '🔴부족' : inst.actualRatio > 18 ? '🟡과다' : '🟢적정'}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-lg font-bold ${getScoreColor(inst.totalScore)}`}>{inst.totalScore}점</div>
                                      <div className="text-xs text-gray-500">종합평가</div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-5 gap-2 text-xs">
                                    <div className="text-center p-2 bg-white rounded border">
                                      <div className="font-medium text-blue-600">{inst.fillRateScore}점</div>
                                      <div className="text-gray-500">충원율</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded border">
                                      <div className="font-medium text-purple-600">{inst.balanceScore}점</div>
                                      <div className="text-gray-500">인력균형</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded border">
                                      <div className="font-medium text-orange-600">{inst.stabilityScore}점</div>
                                      <div className="text-gray-500">안정성</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded border">
                                      <div className="font-medium text-cyan-600">{inst.expertiseScore}점</div>
                                      <div className="text-gray-500">전문성</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded border">
                                      <div className="font-medium text-green-600">{inst.serviceScore}점</div>
                                      <div className="text-gray-500">서비스효율</div>
                                    </div>
                                  </div>

                                  {/* 개선점 표시 (50점 미만 기관만) */}
                                  {inst.totalScore < 50 && (
                                    <div className="mt-3 text-xs text-amber-700">
                                      <div className="mb-1"><span className="font-medium">주요 개선점:</span></div>
                                      {inst.fillRateScore < 60 && 
                                        <div className="mb-1">• <span className="font-medium">정원 준수:</span> {inst.fillRate > 100 ? `정원 초과 (${inst.fillRate}% → 100% 조정)` : `정원 미달 (${inst.fillRate}% → 100% 목표)`}</div>}
                                      {inst.balanceScore < 50 && 
                                        <div className="mb-1">• <span className="font-medium">인력구성 균형화:</span> 1:{inst.actualRatio.toFixed(1)} → 1:16 비율 달성</div>}
                                      {inst.stabilityScore < 30 && 
                                        <div className="mb-1">• <span className="font-medium">안정성 강화:</span> 3년+ 근속자 비율 향상 (처우개선, 근무환경 개선)</div>}
                                      {inst.expertiseScore < 40 && 
                                        <div className="mb-1">• <span className="font-medium">전문성 제고:</span> 전담사회복지사 경력자 충원 (교육훈련, 멘토링)</div>}
                                      {inst.serviceScore < 50 && 
                                        <div className="mb-1">• <span className="font-medium">서비스 효율성:</span> {inst.serviceRatio > 15 ? `과부하 위험 (생활지원사 1명당 ${inst.serviceRatio.toFixed(1)}명 → 15명 목표)` : `비효율 (생활지원사 1명당 ${inst.serviceRatio.toFixed(1)}명 → 15명 목표)`}</div>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 페이지네이션 */}
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="px-3 py-1 text-xs bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                            >
                              이전
                            </button>
                            
                            <div className="flex gap-1">
                              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 7) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 4) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 3) {
                                  pageNum = totalPages - 6 + i;
                                } else {
                                  pageNum = currentPage - 3 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      currentPage === pageNum 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <button 
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="px-3 py-1 text-xs bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                            >
                              다음
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    
                    {/* 종합 분석 및 개선 방안 */}
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h6 className="text-sm font-medium text-blue-800 mb-2">📊 55개 기관 종합 분석</h6>
                        <div className="space-y-1 text-xs text-blue-600">
                          <p>• <strong>전체 평균 충원율:</strong> {(finalInstitutionPerformance.reduce((sum, inst) => sum + inst.fillRate, 0) / totalInstitutions).toFixed(1)}%</p>
                          <p>• <strong>상위 30% 기관:</strong> {top30Percent}개 (상대적 우수기관)</p>
                          <p>• <strong>하위 30% 기관:</strong> {bottom30Percent}개 (집중 지원 필요)</p>
                          <p>• <strong>성과 점수 분포:</strong> 70점+ {finalInstitutionPerformance.filter(inst => inst.totalScore >= 70).length}개, 50-69점 {finalInstitutionPerformance.filter(inst => inst.totalScore >= 50 && inst.totalScore < 70).length}개, 50점- {finalInstitutionPerformance.filter(inst => inst.totalScore < 50).length}개</p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <h6 className="text-sm font-medium text-amber-800 mb-2">⚡ 핵심 개선 과제</h6>
                        <div className="space-y-1 text-xs text-amber-700">
                          <p>• <strong>정원 준수:</strong> {lowFillRate}개 기관 (전체의 {((lowFillRate / totalInstitutions) * 100).toFixed(1)}%) - 정원 대비 95-105% 범위 벗어남</p>
                          <p>• <strong>인력 균형화:</strong> {lowBalance}개 기관 - 사업지침 1:16 비율(전담:생활지원) 미달성</p>
                          <p>• <strong>안정성 강화:</strong> {lowStability}개 기관 - 3년+ 근속자 30% 미만 (이직률 관리 필요)</p>
                          <p>• <strong>전문성 제고:</strong> {lowExpertise}개 기관 - 전담사회복지사 중 경력자 40% 미만</p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <h6 className="text-sm font-medium text-green-800 mb-2">💡 성과 향상 방안</h6>
                        <div className="space-y-1 text-xs text-green-700">
                          <p>• <strong>집중 지원:</strong> 하위 {bottomPerformers.length}개 기관 우선 지원 (인력충원 지원, 처우개선 방안)</p>
                          <p>• <strong>안정성 개선:</strong> 3년+ 근속자 비율 향상 (복리후생 강화, 근무환경 개선)</p>
                          <p>• <strong>전문성 강화:</strong> 경력자 우대채용, 기존직원 교육훈련, 멘토링 시스템 구축</p>
                          <p>• <strong>우수 사례 확산:</strong> 상위 10개 기관 노하우 공유 및 컨설팅</p>
                          <p>• <strong>목표 설정:</strong> 전체 평균 {(avgScore * 1.2).toFixed(1)}점 달성 (현재 대비 20% 향상)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
