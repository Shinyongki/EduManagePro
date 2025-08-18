import type { EducationData, EducationParticipant, EducationEnrollment } from "@shared/schema";

export interface MatchingResult {
  participantId: string;
  name: string;
  institution: string;
  basicEducation: {
    status: '수료' | '미수료' | '진행중' | '미등록';
    courses: EducationData[];
  };
  advancedEducation: {
    status: '수료' | '미수료' | '진행중' | '미등록';
    courses: EducationData[];
  };
  overallStatus: '우수' | '미완료' | '진행중';
  lastCompletionDate?: Date;
}

export class EducationMatcher {
  /**
   * 교육 데이터와 수강자 데이터를 매칭하여 통합된 교육 이수 현황을 반환합니다.
   */
  static matchEducationWithParticipants(
    participants: EducationParticipant[],
    basicEducationData: EducationData[],
    advancedEducationData: EducationData[]
  ): MatchingResult[] {
    return participants.map(participant => {
      // 이름과 기관으로 교육 데이터 매칭 (ID가 있으면 우선 사용)
      const matchingCriteria = (eduData: EducationData) => {
        // 1순위: ID 매칭
        if (participant.id && eduData.email && participant.email) {
          return participant.email.toLowerCase() === eduData.email.toLowerCase();
        }
        
        // 2순위: 이름 + 기관 매칭
        return participant.name === eduData.name && 
               participant.institution === eduData.institution;
      };

      // 기초 교육 매칭
      const basicCourses = basicEducationData.filter(matchingCriteria);
      const basicStatus = this.calculateEducationStatus(basicCourses);

      // 심화 교육 매칭
      const advancedCourses = advancedEducationData.filter(matchingCriteria);
      const advancedStatus = this.calculateEducationStatus(advancedCourses);

      // 전체 상태 계산
      const overallStatus = this.calculateOverallStatus(basicStatus, advancedStatus);

      // 최근 수료일 계산
      const allCompletedCourses = [...basicCourses, ...advancedCourses]
        .filter(course => course.status === '수료' && course.completionDate);
      
      const lastCompletionDate = allCompletedCourses.length > 0 
        ? new Date(Math.max(...allCompletedCourses
            .map(course => course.completionDate?.getTime() || 0)
            .filter(time => time > 0)))
        : undefined;

      return {
        participantId: participant.id,
        name: participant.name,
        institution: participant.institution,
        basicEducation: {
          status: basicStatus,
          courses: basicCourses
        },
        advancedEducation: {
          status: advancedStatus,
          courses: advancedCourses
        },
        overallStatus,
        lastCompletionDate
      };
    });
  }

  /**
   * 개별 교육 타입의 상태를 계산합니다.
   */
  private static calculateEducationStatus(courses: EducationData[]): '수료' | '미수료' | '진행중' | '미등록' {
    if (courses.length === 0) return '미등록';
    
    const hasCompleted = courses.some(course => course.status === '수료');
    const hasInProgress = courses.some(course => course.status === '진행중');
    const hasIncomplete = courses.some(course => course.status === '미수료');
    
    if (hasCompleted) return '수료';
    if (hasInProgress) return '진행중';
    if (hasIncomplete) return '미수료';
    
    return '미등록';
  }

  /**
   * 전체 교육 상태를 계산합니다.
   */
  private static calculateOverallStatus(
    basicStatus: string, 
    advancedStatus: string
  ): '우수' | '미완료' | '진행중' {
    if (basicStatus === '수료' && advancedStatus === '수료') return '우수';
    if (basicStatus === '진행중' || advancedStatus === '진행중') return '진행중';
    return '미완료';
  }

  /**
   * 수강자의 교육 진도율을 계산합니다.
   */
  static calculateParticipantProgress(matchingResult: MatchingResult): {
    basicCompletionRate: number;
    advancedCompletionRate: number;
    overallCompletionRate: number;
  } {
    const basicCompleted = matchingResult.basicEducation.courses
      .filter(course => course.status === '수료').length;
    const basicTotal = matchingResult.basicEducation.courses.length;
    
    const advancedCompleted = matchingResult.advancedEducation.courses
      .filter(course => course.status === '수료').length;
    const advancedTotal = matchingResult.advancedEducation.courses.length;
    
    const basicCompletionRate = basicTotal > 0 ? (basicCompleted / basicTotal) * 100 : 0;
    const advancedCompletionRate = advancedTotal > 0 ? (advancedCompleted / advancedTotal) * 100 : 0;
    
    const totalCompleted = basicCompleted + advancedCompleted;
    const totalCourses = basicTotal + advancedTotal;
    const overallCompletionRate = totalCourses > 0 ? (totalCompleted / totalCourses) * 100 : 0;
    
    return {
      basicCompletionRate: Math.round(basicCompletionRate),
      advancedCompletionRate: Math.round(advancedCompletionRate),
      overallCompletionRate: Math.round(overallCompletionRate)
    };
  }

  /**
   * 교육별 통계를 계산합니다.
   */
  static calculateEducationStatistics(matchingResults: MatchingResult[]) {
    const totalParticipants = matchingResults.length;
    const basicCompletedCount = matchingResults.filter(r => r.basicEducation.status === '수료').length;
    const advancedCompletedCount = matchingResults.filter(r => r.advancedEducation.status === '수료').length;
    const excellentCount = matchingResults.filter(r => r.overallStatus === '우수').length;
    
    return {
      totalParticipants,
      basicCompletedCount,
      advancedCompletedCount,
      excellentCount,
      basicCompletionRate: totalParticipants > 0 ? Math.round((basicCompletedCount / totalParticipants) * 100) : 0,
      advancedCompletionRate: totalParticipants > 0 ? Math.round((advancedCompletedCount / totalParticipants) * 100) : 0,
      excellentRate: totalParticipants > 0 ? Math.round((excellentCount / totalParticipants) * 100) : 0
    };
  }
}