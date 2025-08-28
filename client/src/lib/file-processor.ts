import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { EducationData, EmployeeData, InstitutionData } from '@shared/schema';

export async function processEducationFile(file: File): Promise<EducationData[]> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    if (fileExtension === 'csv') {
      return await processEducationCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return await processEducationExcel(file);
    } else {
      throw new Error('지원하지 않는 파일 형식입니다.');
    }
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error('파일 처리 중 오류가 발생했습니다.');
  }
}

export async function processEmployeeFile(file: File): Promise<EmployeeData[]> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    if (fileExtension === 'csv') {
      return await processEmployeeCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return await processEmployeeExcel(file);
    } else {
      throw new Error('지원하지 않는 파일 형식입니다.');
    }
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error('파일 처리 중 오류가 발생했습니다.');
  }
}

export async function processInstitutionFile(file: File): Promise<InstitutionData[]> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    if (fileExtension === 'csv') {
      return await processInstitutionCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return await processInstitutionExcel(file);
    } else {
      throw new Error('지원하지 않는 파일 형식입니다.');
    }
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error('파일 처리 중 오류가 발생했습니다.');
  }
}

async function processEducationCSV(file: File): Promise<EducationData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const educationData: EducationData[] = results.data.map((row: any, index: number) => ({
            id: row.ID || `edu-${index}`,
            name: row['회원명'] || row.name || '',
            institution: row['소속'] || row.institution || '',
            institutionCode: row['기관코드'] || row.institutionCode || '',
            course: row['과정명'] || row.course || '',
            courseType: determineCourseType(row['과정명'] || row.course || ''),
            status: parseStatus(row['상태'] || row.status || ''),
            completionDate: parseDate(row['수료일'] || row.completionDate),
            email: row['이메일'] || row.email || undefined,
            jobType: row['직군'] || row.jobType || undefined,
            hireDate: parseDate(row['입사일'] || row.hireDate),
            resignDate: parseDate(row['퇴사일'] || row.resignDate),
          }));
          resolve(educationData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
}

async function processEducationExcel(file: File): Promise<EducationData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  return jsonData.map((row: any, index: number) => ({
    id: row.ID || `edu-${index}`,
    name: row['회원명'] || row.name || '',
    institution: row['소속'] || row.institution || '',
    institutionCode: row['기관코드'] || row.institutionCode || '',
    course: row['과정명'] || row.course || '',
    courseType: determineCourseType(row['과정명'] || row.course || ''),
    status: parseStatus(row['상태'] || row.status || ''),
    completionDate: parseDate(row['수료일'] || row.completionDate),
    email: row['이메일'] || row.email || undefined,
    jobType: row['직군'] || row.jobType || undefined,
    hireDate: parseDate(row['입사일'] || row.hireDate),
    resignDate: parseDate(row['퇴사일'] || row.resignDate),
  }));
}

async function processEmployeeCSV(file: File): Promise<EmployeeData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const employeeData: EmployeeData[] = results.data.map((row: any, index: number) => ({
            id: row.ID || `emp-${index}`,
            name: row['성명'] || row.name || '',
            institution: row['기관명'] || row.institution || '',
            institutionCode: row['수행기관코드'] || row.institutionCode || '',
            jobType: parseJobType(row['직무구분'] || row.jobType || ''),
            careerType: parseCareerType(row['경력구분'] || row.careerType || ''),
            birthDate: parseDate(row['생년월일'] || row.birthDate),
            gender: parseGender(row['성별'] || row.gender),
            hireDate: parseDate(row['입사일'] || row.hireDate) || new Date(),
            resignDate: parseDate(row['퇴사일'] || row.resignDate),
            isActive: !parseDate(row['퇴사일'] || row.resignDate) && parseDate(row['입사일'] || row.hireDate) !== undefined,
            workDays: calculateWorkDays(
              parseDate(row['입사일'] || row.hireDate),
              parseDate(row['퇴사일'] || row.resignDate)
            ),
            notes: row['비고'] || row.notes || undefined,
          }));
          resolve(employeeData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
}

async function processEmployeeExcel(file: File): Promise<EmployeeData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  return jsonData.map((row: any, index: number) => ({
    id: row.ID || `emp-${index}`,
    name: row['성명'] || row.name || '',
    institution: row['기관명'] || row.institution || '',
    institutionCode: row['수행기관코드'] || row.institutionCode || '',
    jobType: parseJobType(row['직무구분'] || row.jobType || ''),
    careerType: parseCareerType(row['경력구분'] || row.careerType || ''),
    birthDate: parseDate(row['생년월일'] || row.birthDate),
    gender: parseGender(row['성별'] || row.gender),
    hireDate: parseDate(row['입사일'] || row.hireDate) || new Date(),
    resignDate: parseDate(row['퇴사일'] || row.resignDate),
    isActive: !parseDate(row['퇴사일'] || row.resignDate) && parseDate(row['입사일'] || row.hireDate) !== undefined,
    workDays: calculateWorkDays(
      parseDate(row['입사일'] || row.hireDate),
      parseDate(row['퇴사일'] || row.resignDate)
    ),
    notes: row['비고'] || row.notes || undefined,
  }));
}

async function processInstitutionCSV(file: File): Promise<InstitutionData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const institutionData: InstitutionData[] = results.data.map((row: any, index: number) => ({
            code: row['수행기관코드'] || row.code || `inst-${index}`,
            name: row['수행기관명'] || row.name || '',
            region: row['광역시'] || row.region || '',
            type: row['시설유형구분'] || row.type || undefined,
            allocatedSocialWorkers: parseInt(row['복지부배정_전담사회복지사'] || row.allocatedSocialWorkers || '0'),
            allocatedLifeSupport: parseInt(row['복지부배정_생활지원사'] || row.allocatedLifeSupport || '0'),
            budgetSocialWorkers: parseInt(row['예산배정_전담사회복지사'] || row.budgetSocialWorkers || '0'),
            budgetLifeSupport: parseInt(row['예산배정_생활지원사'] || row.budgetLifeSupport || '0'),
            actualSocialWorkers: parseInt(row['실제채용_전담사회복지사'] || row.actualSocialWorkers || '0'),
            actualLifeSupport: parseInt(row['실제채용_생활지원사'] || row.actualLifeSupport || '0'),
          }));
          resolve(institutionData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
}

async function processInstitutionExcel(file: File): Promise<InstitutionData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  return jsonData.map((row: any, index: number) => ({
    code: row['수행기관코드'] || row.code || `inst-${index}`,
    name: row['수행기관명'] || row.name || '',
    region: row['광역시'] || row.region || '',
    type: row['시설유형구분'] || row.type || undefined,
    allocatedSocialWorkers: parseInt(row['복지부배정_전담사회복지사'] || row.allocatedSocialWorkers || '0'),
    allocatedLifeSupport: parseInt(row['복지부배정_생활지원사'] || row.allocatedLifeSupport || '0'),
    budgetSocialWorkers: parseInt(row['예산배정_전담사회복지사'] || row.budgetSocialWorkers || '0'),
    budgetLifeSupport: parseInt(row['예산배정_생활지원사'] || row.budgetLifeSupport || '0'),
    actualSocialWorkers: parseInt(row['실제채용_전담사회복지사'] || row.actualSocialWorkers || '0'),
    actualLifeSupport: parseInt(row['실제채용_생활지원사'] || row.actualLifeSupport || '0'),
  }));
}

// Helper functions
function determineCourseType(course: string): '기본' | '심화' | '법정' | '특별' | '기타' {
  const lowerCourse = course.toLowerCase();
  if (lowerCourse.includes('기본')) return '기본';
  if (lowerCourse.includes('심화')) return '심화';
  if (lowerCourse.includes('법정')) return '법정';
  if (lowerCourse.includes('특별')) return '특별';
  return '기타';
}

function parseStatus(status: string): '수료' | '미수료' | '진행중' {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('수료') || lowerStatus.includes('완료')) return '수료';
  if (lowerStatus.includes('진행') || lowerStatus.includes('ing')) return '진행중';
  return '미수료';
}

function parseJobType(jobType: string): '전담사회복지사' | '생활지원사' | '기타' {
  if (jobType.includes('전담사회복지사')) return '전담사회복지사';
  if (jobType.includes('생활지원사')) return '생활지원사';
  return '기타';
}

function parseCareerType(careerType: string): '신규' | '경력' {
  if (careerType.includes('경력')) return '경력';
  return '신규';
}

function parseGender(gender: string): '남' | '여' | undefined {
  if (gender === '남' || gender === 'M' || gender === 'Male') return '남';
  if (gender === '여' || gender === 'F' || gender === 'Female') return '여';
  return undefined;
}

function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr || dateStr.trim() === '' || dateStr === '0' || dateStr === 'null' || dateStr === 'undefined') return undefined;
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

function calculateWorkDays(hireDate: Date | undefined, resignDate: Date | undefined): number {
  if (!hireDate) return 0;
  
  const endDate = resignDate || new Date();
  const diffTime = Math.abs(endDate.getTime() - hireDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
