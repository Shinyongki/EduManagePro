import * as XLSX from 'xlsx';
import type { AnalysisResult } from '@shared/schema';

export async function exportAnalysisToExcel(analysisResults: AnalysisResult[]): Promise<void> {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Create analysis results worksheet
    const analysisWS = XLSX.utils.json_to_sheet(
      analysisResults.map(result => ({
        '이름': result.name,
        '기관': result.institution, 
        '직무': result.jobType,
        '기본교육': result.basicEducation,
        '심화교육': result.advancedEducation,
        '전체이수율': `${result.overallCompletionRate}%`,
        '상태': result.status,
        '매칭상태': result.matchStatus,
      }))
    );
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, analysisWS, '교육통합결과');
    
    // Create summary statistics worksheet
    const stats = generateSummaryStats(analysisResults);
    const statsWS = XLSX.utils.aoa_to_sheet([
      ['구분', '값'],
      ['총 분석 대상', stats.totalAnalyzed],
      ['매칭 성공', stats.matchingSuccess],
      ['매칭 실패', stats.matchingFailed],
      ['교육 완료', stats.educationCompleted],
      ['교육 미완료', stats.educationIncomplete],
      ['완료율', `${stats.completionRate}%`],
      ['매칭 성공률', `${stats.matchingSuccessRate}%`],
    ]);
    
    XLSX.utils.book_append_sheet(workbook, statsWS, '통계요약');
    
    // Create detailed employee status worksheet
    const detailedWS = createDetailedStatusSheet(analysisResults);
    XLSX.utils.book_append_sheet(workbook, detailedWS, '종사자세부현황');
    
    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `교육관리_통합분석결과_${currentDate}.xlsx`;
    
    // Write file
    XLSX.writeFile(workbook, filename);
    
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Excel 파일 생성 중 오류가 발생했습니다.');
  }
}

function generateSummaryStats(results: AnalysisResult[]) {
  const totalAnalyzed = results.length;
  const matchingSuccess = results.filter(r => r.matchStatus === '매칭성공').length;
  const matchingFailed = results.filter(r => r.matchStatus === '매칭실패').length;
  const educationCompleted = results.filter(r => r.status === '우수').length;
  const educationIncomplete = results.filter(r => r.status === '미완료').length;
  
  const completionRate = totalAnalyzed > 0 ? Math.round((educationCompleted / totalAnalyzed) * 100) : 0;
  const matchingSuccessRate = totalAnalyzed > 0 ? Math.round((matchingSuccess / totalAnalyzed) * 100) : 0;
  
  return {
    totalAnalyzed,
    matchingSuccess,
    matchingFailed,
    educationCompleted,
    educationIncomplete,
    completionRate,
    matchingSuccessRate,
  };
}

function createDetailedStatusSheet(results: AnalysisResult[]) {
  const headers = [
    '번호',
    '이름', 
    '기관',
    '직무구분',
    '기본교육상태',
    '심화교육상태',
    '전체이수율',
    '종합상태',
    '매칭상태',
    '비고'
  ];
  
  const data = results.map((result, index) => [
    index + 1,
    result.name,
    result.institution,
    result.jobType,
    result.basicEducation,
    result.advancedEducation,
    `${result.overallCompletionRate}%`,
    result.status,
    result.matchStatus,
    getRemarks(result)
  ]);
  
  return XLSX.utils.aoa_to_sheet([headers, ...data]);
}

function getRemarks(result: AnalysisResult): string {
  const remarks = [];
  
  if (result.matchStatus === '매칭실패') {
    remarks.push('매칭실패');
  }
  
  if (result.basicEducation === '미완료') {
    remarks.push('기본교육미완료');
  }
  
  if (result.advancedEducation === '미완료') {
    remarks.push('심화교육미완료');
  }
  
  if (result.overallCompletionRate === 100) {
    remarks.push('교육완료');
  }
  
  return remarks.join(', ') || '정상';
}

export async function exportEducationToExcel(basicData: any[], advancedData: any[]): Promise<void> {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Basic education sheet
    if (basicData.length > 0) {
      const basicWS = XLSX.utils.json_to_sheet(basicData);
      XLSX.utils.book_append_sheet(workbook, basicWS, '기본교육');
    }
    
    // Advanced education sheet  
    if (advancedData.length > 0) {
      const advancedWS = XLSX.utils.json_to_sheet(advancedData);
      XLSX.utils.book_append_sheet(workbook, advancedWS, '심화교육');
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `교육데이터_${currentDate}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Excel 파일 생성 중 오류가 발생했습니다.');
  }
}

export async function exportEmployeeToExcel(employeeData: any[], institutionData: any[]): Promise<void> {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Employee data sheet
    if (employeeData.length > 0) {
      const employeeWS = XLSX.utils.json_to_sheet(employeeData);
      XLSX.utils.book_append_sheet(workbook, employeeWS, '종사자현황');
    }
    
    // Institution data sheet
    if (institutionData.length > 0) {
      const institutionWS = XLSX.utils.json_to_sheet(institutionData);
      XLSX.utils.book_append_sheet(workbook, institutionWS, '기관현황');
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `종사자데이터_${currentDate}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Excel 파일 생성 중 오류가 발생했습니다.');
  }
}
