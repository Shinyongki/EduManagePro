export interface EmployeeUploadConfig {
  type: 'employee' | 'institution';
  title: string;
  description: string;
  icon: React.ReactNode;
  uploadDescription: string;
  placeholder: string;
}

export interface EmployeeStatistics {
  totalEmployees: number;
  socialWorkerCount: number;
  lifeSupportCount: number;
  fillRate: number;
  averageTenure: number;
  institutionCount: number;
  activeEmployees: number;
  inactiveEmployees: number;
}

export interface InstitutionStatistics {
  totalInstitutions: number;
  averageAllocation: number;
  averageFillRate: number;
  underStaffedCount: number;
  fullyStaffedCount: number;
}

export interface EmployeeTableRow {
  name: string;
  jobType: string;
  institution: string;
  workDays: number;
  educationStatus: '완료' | '미완료' | '진행중' | '미연동';
  status: '재직' | '퇴직';
  hireDate: string;
  resignDate?: string;
}

export interface InstitutionTableRow {
  code: string;
  name: string;
  region: string;
  allocatedTotal: number;
  actualTotal: number;
  fillRate: number;
  status: '정상' | '미충원' | '초과';
}

export type JobType = '전담사회복지사' | '생활지원사' | '기타';
export type CareerType = '신규' | '경력';
export type EmploymentStatus = '재직' | '퇴직';
