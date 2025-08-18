import { z } from "zod";

// Education Data Schemas
export const educationDataSchema = z.object({
  id: z.string(),
  serialNumber: z.string().optional(), // 원본 파일의 연번 (문자열로 보존)
  name: z.string(),
  institution: z.string(),
  institutionCode: z.string().optional(),
  course: z.string(),
  courseType: z.enum(['기본', '심화', '법정', '특별', '기타']),
  status: z.enum(['수료', '미수료', '진행중', '수강취소']),
  completionDate: z.date().optional(),
  email: z.string().email().optional(),
  jobType: z.string().optional(),
  hireDate: z.date().optional(),
  resignDate: z.date().optional(),
  // 추가 필드들
  year: z.string().optional(), // 년도/차수
  applicationDate: z.date().optional(), // 교육신청일자
  institutionType: z.string().optional(), // 유형
  region: z.string().optional(), // 시도
  district: z.string().optional(), // 시군구
  specialization: z.string().optional(), // 추가정보(특화)
  middleManager: z.string().optional(), // 추가정보(중간관리자)
  topManager: z.string().optional(), // 추가정보(최고관리자)
  targetInfo: z.string().optional(), // 정보(신규과정대상)
  educationHours: z.number().default(0), // 교육시간
  progress: z.number().default(0), // 진도율
  score: z.number().default(0), // 점수
  // 엑셀 함수 계산 필드들
  categoryVlookup: z.string().optional(), // VLOOKUP으로 찾은 교육분류
  concatenatedKey: z.string().optional(), // CONCATENATE(ID, 과정명)
});

export const educationStatsSchema = z.object({
  totalParticipants: z.number(),
  completedCount: z.number(),
  completionRate: z.number(),
  courseStats: z.record(z.object({
    count: z.number(),
    completionRate: z.number(),
  })),
});

// Employee Data Schemas
export const employeeDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  institution: z.string(), // 기관명 또는 광역명
  institutionCode: z.string().optional(), // 수행기관코드
  jobType: z.string().optional(), // 직무구분 (전담사회복지사/생활지원사)
  careerType: z.string().optional(), // 경력구분 (신규/경력) - 전담사회복지사만
  angelCode: z.string().optional(), // 엔젤코드 - 생활지원사만
  birthDate: z.string().optional(), // 생년월일
  gender: z.string().optional(), // 성별
  hireDate: z.string().optional(), // 입사일
  resignDate: z.string().optional(), // 퇴사일
  isActive: z.boolean().default(true),
  workDays: z.number().optional(),
  notes: z.string().optional(), // 비고
  // 추가 필드들
  region: z.string().optional(), // 광역시
  province: z.string().optional(), // 광역시 (alternative field name)
  district: z.string().optional(), // 지자체
  regionCode: z.string().optional(), // 광역코드
  regionName: z.string().optional(), // 광역명
  responsibility: z.string().optional(), // 담당업무
  duty: z.string().optional(), // 담당업무 (alternative field name)
  learningId: z.string().optional(), // 배움터ID
  modifiedDate: z.string().optional(), // 수정일
  mainDuty: z.string().optional(), // 주요업무
  primaryWork: z.string().optional(), // 주요업무 (alternative field name)
  remarks: z.string().optional(), // 비고 (alternative field name)
  note: z.string().optional(), // 비고 (alternative field name)
});

export const institutionDataSchema = z.object({
  code: z.string(),
  name: z.string(),
  region: z.string(),
  type: z.string().optional(),
  allocatedSocialWorkers: z.number().default(0), // 전담사회복지사(배정) - 수기관리
  allocatedLifeSupport: z.number().default(0), // 생활지원사(배정) - 수기관리
  allocatedSocialWorkersGov: z.number().default(0), // 전담사회복지사(배정) - 예산내시
  allocatedLifeSupportGov: z.number().default(0), // 생활지원사(배정) - 예산내시
  hiredSocialWorkers: z.number().default(0), // 전담사회복지사(채용) - 수기관리
  hiredLifeSupport: z.number().default(0), // 생활지원사(채용) - 수기관리
  budgetSocialWorkers: z.number().default(0),
  budgetLifeSupport: z.number().default(0),
  actualSocialWorkers: z.number().default(0),
  actualLifeSupport: z.number().default(0),
});

// Analysis Data Schemas
export const analysisConfigSchema = z.object({
  referenceDate: z.date(),
  analysisScope: z.enum(['전체 기관', '특정 기관', '지역별']),
  matchingCriteria: z.enum(['ID 기반', '이름 기반', '기관+이름']),
  selectedInstitutions: z.array(z.string()).optional(),
  selectedRegions: z.array(z.string()).optional(),
});

export const analysisResultSchema = z.object({
  employeeId: z.string(),
  name: z.string(),
  institution: z.string(),
  jobType: z.string(),
  basicEducation: z.enum(['완료', '미완료', '진행중', '해당없음']),
  advancedEducation: z.enum(['완료', '미완료', '진행중', '해당없음']),
  overallCompletionRate: z.number(),
  status: z.enum(['우수', '미완료', '진행중']),
  matchStatus: z.enum(['매칭성공', '매칭실패', '수동확인필요']),
});

// Education Participant Schemas
export const educationParticipantSchema = z.object({
  no: z.number().optional(), // 번호
  institution: z.string(), // 소속
  institutionCode: z.string().optional(), // 기관코드
  institutionType: z.string().optional(), // 유형
  name: z.string(), // 회원명
  gender: z.enum(['남', '여']).optional(), // 성별
  birthDate: z.string().optional(), // 생년월일
  id: z.string(), // ID
  phone: z.string().optional(), // 휴대전화
  email: z.string().email().optional(), // 이메일
  courseCount: z.number().default(0), // 수강건수
  lastAccessDate: z.string().optional(), // 접속일
  registrationDate: z.string().optional(), // 가입일
  jobType: z.string().optional(), // 직군
  hireDate: z.string().optional(), // 입사일
  resignDate: z.string().optional(), // 퇴사일
  specialization: z.string().optional(), // 특화
  middleManager: z.string().optional(), // 중간관리자
  topManager: z.string().optional(), // 최고관리자
  career: z.string().optional(), // 경력
  participatesInLegalBusiness: z.string().optional(), // 시법사업참여여부
  emailConsent: z.string().optional(), // 이메일수신동의여부
  smsConsent: z.string().optional(), // SMS수신동의 여부
  status: z.string().optional(), // 상태
  finalCompletion: z.string().optional(), // 최종수료
  basicTraining: z.string().optional(), // 기초직무
  advancedEducation: z.string().optional(), // 심화교육
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const educationEnrollmentSchema = z.object({
  id: z.string(),
  participantId: z.string(),
  educationId: z.string(),
  courseType: z.enum(['기본', '심화', '법정', '특별', '기타']),
  courseName: z.string(),
  enrollmentDate: z.date(),
  startDate: z.date().optional(),
  completionDate: z.date().optional(),
  status: z.enum(['대기', '수강중', '수료', '미수료', '취소']),
  attendanceRate: z.number().min(0).max(100).default(0),
  testScore: z.number().min(0).max(100).optional(),
  certificateNumber: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Integrated Analysis Schema for Advanced Education
export const integratedAnalysisDataSchema = z.object({
  id: z.string(),
  management: z.string(), // 관리명
  region: z.string(), // 시도
  district: z.string(), // 시군구
  institutionCode: z.string(), // 기관코드
  institutionName: z.string(), // 기관명
  
  // 백업입력(수강권리 등록자 수)
  backup1_total: z.number().default(0), // 전체 근무자(=O+@)
  backup1_social: z.number().default(0), // 전문사회복지사 ①
  backup1_life: z.number().default(0), // 생활지원사회복지사 ②
  
  // 백업입력(예산지시 등록자 수)
  backup2_a: z.number().default(0), // A 전체
  backup2_b: z.number().default(0), // B 전업사회복지사
  backup2_c: z.number().default(0), // C 생활지원사
  backup2_total: z.number().default(0), // 전체 근무자(=@+@)
  
  // D급 백업입력(수강권리 등록자 수)
  dLevel_social: z.number().default(0), // 전문사회복지사 ①
  dLevel_life: z.number().default(0), // 생활지원사 ②
  dLevel_total: z.number().default(0), // D 전체
  
  // 근무자 자격현황
  qualification_social: z.number().default(0), // 전업사회복지사
  qualification_life: z.number().default(0), // 생활지원사
  qualification_total: z.number().default(0), // 자격취득(=@+@)
  
  // 근무자 근속현황
  tenure_social: z.number().default(0), // 전문사회복지사 ①
  tenure_life: z.number().default(0), // 생활지원사 ②
  tenure_rate: z.number().default(0), // (E/A) 재응률
  
  // 근무자 직무교육 이수율
  education_f: z.number().default(0), // F 재응률
  education_rate_fb: z.number().default(0), // (F/B) 재응률
  education_warning: z.number().default(0), // (경고) 총험률
  education_g: z.number().default(0), // G 재응관관(G/C) 재응률
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Type exports
export type EducationData = z.infer<typeof educationDataSchema>;
export type EducationStats = z.infer<typeof educationStatsSchema>;
export type EmployeeData = z.infer<typeof employeeDataSchema>;
export type InstitutionData = z.infer<typeof institutionDataSchema>;
export type AnalysisConfig = z.infer<typeof analysisConfigSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type EducationParticipant = z.infer<typeof educationParticipantSchema>;
export type EducationEnrollment = z.infer<typeof educationEnrollmentSchema>;
export type IntegratedAnalysisData = z.infer<typeof integratedAnalysisDataSchema>;
