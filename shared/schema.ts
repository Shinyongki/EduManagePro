import { z } from "zod";

// Education Data Schemas
export const educationDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  institution: z.string(),
  institutionCode: z.string().optional(),
  course: z.string(),
  courseType: z.enum(['기본', '심화', '법정', '특별', '기타']),
  status: z.enum(['수료', '미수료', '진행중']),
  completionDate: z.date().optional(),
  email: z.string().email().optional(),
  jobType: z.string().optional(),
  hireDate: z.date().optional(),
  resignDate: z.date().optional(),
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
  institution: z.string(),
  institutionCode: z.string().optional(),
  jobType: z.enum(['전담사회복지사', '생활지원사', '기타']),
  careerType: z.enum(['신규', '경력']),
  birthDate: z.date().optional(),
  gender: z.enum(['남', '여']).optional(),
  hireDate: z.date(),
  resignDate: z.date().optional(),
  isActive: z.boolean(),
  workDays: z.number().optional(),
  notes: z.string().optional(),
});

export const institutionDataSchema = z.object({
  code: z.string(),
  name: z.string(),
  region: z.string(),
  type: z.string().optional(),
  allocatedSocialWorkers: z.number().default(0),
  allocatedLifeSupport: z.number().default(0),
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

// Type exports
export type EducationData = z.infer<typeof educationDataSchema>;
export type EducationStats = z.infer<typeof educationStatsSchema>;
export type EmployeeData = z.infer<typeof employeeDataSchema>;
export type InstitutionData = z.infer<typeof institutionDataSchema>;
export type AnalysisConfig = z.infer<typeof analysisConfigSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
