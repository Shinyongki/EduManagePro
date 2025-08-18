import type { EducationData, EducationParticipant } from "@shared/schema";
import { getDistrictByInstitution, getAllDistricts, DISTRICT_INSTITUTIONS } from "./district-institutions";

// 교육 통계 타입 정의
export interface JobTypeStats {
  total: number;
  completed: number;
  incomplete: number;
  inProgress: number;
  cancelled: number;
  completionRate: number;
}

export interface CourseStats {
  courseName: string;
  total: number;
  completed: number;
  completionRate: number;
}

export interface EducationStatsByJobType {
  전담사회복지사: JobTypeStats;
  생활지원사: JobTypeStats;
  총계: JobTypeStats;
  courseStats: CourseStats[];
}

export interface DistrictStats {
  district: string;
  totalParticipants: number;
  completedParticipants: number;
  completionRate: number;
  institutionCount: number;
  institutions: {
    name: string;
    participants: number;
    completed: number;
    completionRate: number;
  }[];
}

export interface InstitutionPerformance {
  institutionName: string;
  district: string;
  totalParticipants: number;
  completedParticipants: number;
  completionRate: number;
  basicEducationRate: number;
  advancedEducationRate: number;
  ranking: number;
}

// 직군별 교육 통계 계산
export function calculateEducationStatsByJobType(educationData: EducationData[]): EducationStatsByJobType {
  const jobTypes = ['전담사회복지사', '생활지원사'];
  const result: any = {};
  
  // 각 직군별 통계 계산
  jobTypes.forEach(jobType => {
    const jobData = educationData.filter(item => 
      item.jobType === jobType || 
      (jobType === '전담사회복지사' && (item.jobType === '광역전담사회복지사' || item.jobType?.includes('전담사회복지사')))
    );
    
    result[jobType] = calculateJobTypeStats(jobData);
  });
  
  // 총계 계산
  result.총계 = calculateJobTypeStats(educationData);
  
  // 과정별 통계
  result.courseStats = calculateCourseStats(educationData);
  
  return result;
}

// 직군별 상세 통계 계산
function calculateJobTypeStats(data: EducationData[]): JobTypeStats {
  const total = data.length;
  const completed = data.filter(item => item.status === '수료').length;
  const incomplete = data.filter(item => item.status === '미수료').length;
  const inProgress = data.filter(item => item.status === '진행중' || item.status === '정상').length;
  const cancelled = data.filter(item => item.status === '수강취소').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    total,
    completed,
    incomplete,
    inProgress,
    cancelled,
    completionRate
  };
}

// 과정별 통계 계산
function calculateCourseStats(data: EducationData[]): CourseStats[] {
  const courseMap = new Map<string, { total: number; completed: number }>();
  
  data.forEach(item => {
    const course = item.course;
    if (!courseMap.has(course)) {
      courseMap.set(course, { total: 0, completed: 0 });
    }
    
    const stats = courseMap.get(course)!;
    stats.total++;
    if (item.status === '수료') {
      stats.completed++;
    }
  });
  
  return Array.from(courseMap.entries()).map(([courseName, stats]) => ({
    courseName,
    total: stats.total,
    completed: stats.completed,
    completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  })).sort((a, b) => b.total - a.total);
}

// 시군별 교육 현황 통계 계산
export function calculateDistrictStats(educationData: EducationData[]): DistrictStats[] {
  const districts = getAllDistricts();
  
  return districts.map(district => {
    const institutions = DISTRICT_INSTITUTIONS[district];
    const districtData = educationData.filter(item => 
      getDistrictByInstitution(item.institution) === district
    );
    
    const totalParticipants = districtData.length;
    const completedParticipants = districtData.filter(item => item.status === '수료').length;
    const completionRate = totalParticipants > 0 ? Math.round((completedParticipants / totalParticipants) * 100) : 0;
    
    // 기관별 상세 통계
    const institutionStats = institutions.map(institutionName => {
      const institutionData = districtData.filter(item => item.institution === institutionName);
      const participants = institutionData.length;
      const completed = institutionData.filter(item => item.status === '수료').length;
      const rate = participants > 0 ? Math.round((completed / participants) * 100) : 0;
      
      return {
        name: institutionName,
        participants,
        completed,
        completionRate: rate
      };
    });
    
    return {
      district,
      totalParticipants,
      completedParticipants,
      completionRate,
      institutionCount: institutions.length,
      institutions: institutionStats.sort((a, b) => b.completionRate - a.completionRate)
    };
  }).sort((a, b) => b.completionRate - a.completionRate);
}

// 기관 성과 분석 (동적 기준)
export function calculateInstitutionPerformance(
  basicEducationData: EducationData[], 
  advancedEducationData: EducationData[],
  excellentThreshold: number = 80,
  needsImprovementThreshold: number = 60
): {
  excellent: InstitutionPerformance[];
  needsImprovement: InstitutionPerformance[];
  all: InstitutionPerformance[];
} {
  // 모든 기관 목록 생성
  const allInstitutions = new Set<string>();
  [...basicEducationData, ...advancedEducationData].forEach(item => {
    if (item.institution) allInstitutions.add(item.institution);
  });
  
  const performances = Array.from(allInstitutions).map(institutionName => {
    const district = getDistrictByInstitution(institutionName) || '미분류';
    
    // 기본교육 통계
    const basicData = basicEducationData.filter(item => item.institution === institutionName);
    const basicTotal = basicData.length;
    const basicCompleted = basicData.filter(item => item.status === '수료').length;
    const basicRate = basicTotal > 0 ? Math.round((basicCompleted / basicTotal) * 100) : 0;
    
    // 심화교육 통계
    const advancedData = advancedEducationData.filter(item => item.institution === institutionName);
    const advancedTotal = advancedData.length;
    const advancedCompleted = advancedData.filter(item => item.status === '수료').length;
    const advancedRate = advancedTotal > 0 ? Math.round((advancedCompleted / advancedTotal) * 100) : 0;
    
    // 전체 통계
    const totalParticipants = basicTotal + advancedTotal;
    const completedParticipants = basicCompleted + advancedCompleted;
    const completionRate = totalParticipants > 0 ? Math.round((completedParticipants / totalParticipants) * 100) : 0;
    
    return {
      institutionName,
      district,
      totalParticipants,
      completedParticipants,
      completionRate,
      basicEducationRate: basicRate,
      advancedEducationRate: advancedRate,
      ranking: 0 // 나중에 설정
    };
  });
  
  // 수료율로 정렬하고 순위 부여
  performances.sort((a, b) => b.completionRate - a.completionRate);
  performances.forEach((perf, index) => {
    perf.ranking = index + 1;
  });
  
  // 기준에 따라 분류
  const excellent = performances.filter(p => p.completionRate >= excellentThreshold);
  const needsImprovement = performances.filter(p => p.completionRate < needsImprovementThreshold);
  
  return {
    excellent,
    needsImprovement,
    all: performances
  };
}

// 시계열 통계 계산 (년도/차수별)
export function calculateTimeSeriesStats(educationData: EducationData[]): {
  yearCourseStats: { [key: string]: JobTypeStats };
  trendAnalysis: { period: string; completionRate: number }[];
} {
  const yearCourseMap = new Map<string, EducationData[]>();
  
  // 년도/차수별 데이터 그룹화
  educationData.forEach(item => {
    const yearCourse = item.year || '미분류';
    if (!yearCourseMap.has(yearCourse)) {
      yearCourseMap.set(yearCourse, []);
    }
    yearCourseMap.get(yearCourse)!.push(item);
  });
  
  const yearCourseStats: { [key: string]: JobTypeStats } = {};
  const trendData: { period: string; completionRate: number }[] = [];
  
  yearCourseMap.forEach((data, yearCourse) => {
    const stats = calculateJobTypeStats(data);
    yearCourseStats[yearCourse] = stats;
    trendData.push({
      period: yearCourse,
      completionRate: stats.completionRate
    });
  });
  
  // 차수별 정렬
  trendData.sort((a, b) => a.period.localeCompare(b.period));
  
  return {
    yearCourseStats,
    trendAnalysis: trendData
  };
}