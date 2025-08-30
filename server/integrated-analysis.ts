import { storage } from './storage';
import type { EmployeeData, InstitutionData, EducationData, EducationParticipant } from '@shared/schema';

export interface IntegratedAnalysisRow {
  id: string;
  management: string;
  region: string;
  district: string;
  institutionCode: string;
  institutionName: string;
  
  // 배정인원 (수기관리 등록기준)
  backup1_total: number;
  backup1_social: number;
  backup1_life: number;
  
  // 배정인원 (예산내시 등록기준) 
  backup2_a: number;
  backup2_b: number;
  backup2_c: number;
  
  // D 채용인원
  dLevel_all: number;
  dLevel_social: number;
  dLevel_life: number;
  
  // 종사자 채용현황
  employment_total: number;
  employment_rate: number;
  employment_social: number;
  employment_social_rate: number;
  employment_reference?: string;
  employment_life: number;
  employment_life_rate: number;
  employment_life_reference?: string;
  
  // 종사자 근속현황
  tenure_social: number;
  tenure_life: number;
  
  // 종사자 직무교육 이수율
  education_f: number;
  education_rate_fb: number;
  education_social_rate: number;
  education_life_rate: number;
  education_warning?: number;
  education_g?: number;
}

export class IntegratedAnalysisService {
  static async generateAnalysis(): Promise<IntegratedAnalysisRow[]> {
    // 모든 데이터 소스 가져오기
    const [institutions, employees, participants, basicEducation, advancedEducation] = await Promise.all([
      storage.getInstitutionData(),
      storage.getEmployeeData(), 
      storage.getEducationParticipants(),
      storage.getEducationData(),
      storage.getEducationData() // 심화 교육 데이터도 같은 소스
    ]);

    const analysisRows: IntegratedAnalysisRow[] = [];

    // 기관별로 데이터 집계
    for (const institution of institutions) {
      // 해당 기관의 종사자 필터링
      const institutionEmployees = employees.filter(emp => 
        emp.institution === institution.name || 
        emp.institutionCode === institution.code
      );

      // 효능원노인통합지원센터 디버깅
      if (institution.name.includes('효능원')) {
        console.log('효능원노인통합지원센터 데이터:');
        console.log('- 기관명:', institution.name);
        console.log('- 수기 전담:', institution.allocatedSocialWorkers);
        console.log('- 수기 생활:', institution.allocatedLifeSupport);
        console.log('- 예산 전담:', institution.allocatedSocialWorkersGov);
        console.log('- 예산 생활:', institution.allocatedLifeSupportGov);
        console.log('- 전체 기관 객체:', institution);
      }
      
      // 재직자만 필터링
      const activeEmployees = institutionEmployees.filter(emp => emp.isActive);
      const socialWorkers = activeEmployees.filter(emp => 
        emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
      );
      const lifeSupport = activeEmployees.filter(emp => emp.jobType === '생활지원사');

      // 해당 기관의 교육 참가자 필터링
      const institutionParticipants = participants.filter(p => 
        p.institution === institution.name || 
        p.institutionCode === institution.code
      );

      // 교육 이수자 계산 (전체)
      const basicCompleted = institutionParticipants.filter(p => 
        p.basicTraining === '완료' || p.basicTraining === '수료'
      ).length;
      
      const advancedCompleted = institutionParticipants.filter(p => 
        p.advancedEducation === '완료' || p.advancedEducation === '수료'
      ).length;

      // 전담사회복지사 교육 이수자 계산
      const socialWorkerParticipants = institutionParticipants.filter(p => 
        p.jobType === '전담사회복지사' || p.jobType === '선임전담사회복지사'
      );
      const socialBasicCompleted = socialWorkerParticipants.filter(p => 
        p.basicTraining === '완료' || p.basicTraining === '수료'
      ).length;
      const socialAdvancedCompleted = socialWorkerParticipants.filter(p => 
        p.advancedEducation === '완료' || p.advancedEducation === '수료'
      ).length;

      // 생활지원사 교육 이수자 계산
      const lifeSupportParticipants = institutionParticipants.filter(p => 
        p.jobType === '생활지원사'
      );
      const lifeBasicCompleted = lifeSupportParticipants.filter(p => 
        p.basicTraining === '완료' || p.basicTraining === '수료'
      ).length;
      const lifeAdvancedCompleted = lifeSupportParticipants.filter(p => 
        p.advancedEducation === '완료' || p.advancedEducation === '수료'
      ).length;

      // 근속기간 계산 (년 단위)
      const calculateAverageTenure = (employees: EmployeeData[]) => {
        if (employees.length === 0) return 0;
        
        const totalTenureDays = employees.reduce((sum, emp) => {
          if (emp.hireDate) {
            const hireDate = new Date(emp.hireDate);
            const today = new Date();
            const days = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }
          return sum;
        }, 0);
        
        return totalTenureDays / employees.length / 365; // 년 단위로 변환
      };

      // 채용률 계산
      const employmentRate = institution.allocatedSocialWorkers > 0 
        ? (socialWorkers.length / institution.allocatedSocialWorkers) * 100
        : 0;
      
      const socialEmploymentRate = institution.allocatedSocialWorkers > 0
        ? (socialWorkers.length / institution.allocatedSocialWorkers) * 100
        : 0;
        
      const lifeEmploymentRate = institution.allocatedLifeSupport > 0
        ? (lifeSupport.length / institution.allocatedLifeSupport) * 100
        : 0;

      // 교육 이수율 계산
      const educationRate = activeEmployees.length > 0
        ? ((basicCompleted + advancedCompleted) / (activeEmployees.length * 2)) * 100
        : 0;
      
      // 전담사회복지사 교육 이수율 (I/D 기준)
      const socialEducationRate = socialWorkers.length > 0
        ? Math.round(((socialBasicCompleted + socialAdvancedCompleted) / socialWorkers.length) * 100 * 100) / 100 // 소수점 2자리까지
        : 0;
      
      // 생활지원사 교육 이수율 (I/D 기준)
      const lifeEducationRate = lifeSupport.length > 0
        ? Math.round(((lifeBasicCompleted + lifeAdvancedCompleted) / lifeSupport.length) * 100 * 100) / 100 // 소수점 2자리까지
        : 0;

      const row: IntegratedAnalysisRow = {
        id: `analysis_${institution.code}`,
        management: institution.areaName || '경남광역',
        region: institution.region || '경상남도',
        district: institution.district || '',
        institutionCode: institution.code,
        institutionName: institution.name,
        
        // 배정인원 (기관 데이터 기준)
        backup1_total: (institution.allocatedSocialWorkers || 0) + (institution.allocatedLifeSupport || 0),
        backup1_social: institution.allocatedSocialWorkers || 0,
        backup1_life: institution.allocatedLifeSupport || 0,
        
        // 예산내시 기준 (정부 배정 기준)
        backup2_a: (institution.allocatedSocialWorkersGov || 0) + (institution.allocatedLifeSupportGov || 0),
        backup2_b: institution.allocatedSocialWorkersGov || 0,
        backup2_c: institution.allocatedLifeSupportGov || 0,
        
        // 실제 채용인원
        dLevel_all: activeEmployees.length,
        dLevel_social: socialWorkers.length,
        dLevel_life: lifeSupport.length,
        
        // 채용현황
        employment_total: activeEmployees.length,
        employment_rate: employmentRate,
        employment_social: socialWorkers.length,
        employment_social_rate: socialEmploymentRate,
        employment_reference: new Date().toISOString().split('T')[0],
        employment_life: lifeSupport.length,
        employment_life_rate: lifeEmploymentRate,
        employment_life_reference: new Date().toISOString().split('T')[0],
        
        // 근속현황
        tenure_social: calculateAverageTenure(socialWorkers),
        tenure_life: calculateAverageTenure(lifeSupport),
        
        // 교육 이수율
        education_f: basicCompleted + advancedCompleted,
        education_rate_fb: educationRate,
        education_social_rate: socialEducationRate,
        education_life_rate: lifeEducationRate,
        education_warning: educationRate < 70 ? 1 : 0,
        education_g: basicCompleted
      };

      analysisRows.push(row);
    }

    return analysisRows;
  }

  static calculateSummaryStats(rows: IntegratedAnalysisRow[]) {
    const total = rows.length;
    if (total === 0) return null;

    return {
      totalInstitutions: total,
      totalWorkers: rows.reduce((sum, r) => sum + r.dLevel_all, 0),
      totalSocialWorkers: rows.reduce((sum, r) => sum + r.dLevel_social, 0),
      totalLifeSupport: rows.reduce((sum, r) => sum + r.dLevel_life, 0),
      avgEmploymentRate: rows.reduce((sum, r) => sum + r.employment_rate, 0) / total,
      avgEducationRate: rows.reduce((sum, r) => sum + r.education_rate_fb, 0) / total,
      warningCount: rows.filter(r => (r.education_warning || 0) > 0).length,
      totalAllocated: rows.reduce((sum, r) => sum + r.backup1_total, 0),
      totalEmployed: rows.reduce((sum, r) => sum + r.dLevel_all, 0)
    };
  }
}