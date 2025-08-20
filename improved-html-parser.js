// 개선된 HTML 파싱 로직 (헤더 기반)
const cheerio = require('cheerio');

// 헤더 기반 HTML 파싱 함수
async function improvedHtmlParser(htmlContent) {
  const $ = cheerio.load(htmlContent);
  
  // 테이블 찾기
  const tables = $('table');
  if (tables.length === 0) {
    throw new Error('HTML에서 테이블을 찾을 수 없습니다.');
  }
  
  // 가장 큰 테이블 선택
  let largestTable = tables.first();
  let maxRows = 0;
  
  tables.each((i, table) => {
    const rowCount = $(table).find('tr').length;
    if (rowCount > maxRows) {
      maxRows = rowCount;
      largestTable = $(table);
    }
  });
  
  const rows = largestTable.find('tr');
  console.log(`선택된 테이블: ${maxRows}행`);
  
  // 헤더 행 찾기
  let headerRow = null;
  let headerIndex = -1;
  let columnMapping = {};
  
  // 첫 몇 행에서 헤더 찾기
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows.eq(i);
    const cells = row.find('td, th');
    const cellTexts = [];
    
    cells.each((j, cell) => {
      cellTexts.push($(cell).text().trim());
    });
    
    // 헤더로 보이는 행인지 확인
    const hasNameHeader = cellTexts.some(text => 
      text.includes('성명') || text.includes('이름')
    );
    
    if (hasNameHeader) {
      headerRow = cellTexts;
      headerIndex = i;
      console.log('헤더 발견:', headerRow);
      
      // 컬럼 매핑 생성
      cellTexts.forEach((header, index) => {
        const cleanHeader = header.toLowerCase().trim();
        
        // 각 필드에 대한 매핑
        if (cleanHeader.includes('성명') || cleanHeader.includes('이름')) {
          columnMapping.name = index;
        } else if (cleanHeader.includes('광역시') || cleanHeader.includes('시도')) {
          columnMapping.region = index;
        } else if (cleanHeader.includes('지자체') || cleanHeader.includes('시군구')) {
          columnMapping.district = index;
        } else if (cleanHeader.includes('광역코드')) {
          columnMapping.regionCode = index;
        } else if (cleanHeader.includes('광역명')) {
          columnMapping.regionName = index;
        } else if (cleanHeader.includes('기관코드')) {
          columnMapping.institutionCode = index;
        } else if (cleanHeader.includes('직무구분') || cleanHeader.includes('직무')) {
          columnMapping.jobType = index;
        } else if (cleanHeader.includes('담당업무') || cleanHeader.includes('업무')) {
          columnMapping.responsibility = index;
        } else if (cleanHeader.includes('경력구분') || cleanHeader.includes('경력')) {
          columnMapping.careerType = index;
        } else if (cleanHeader.includes('엔젤코드')) {
          columnMapping.angelCode = index;
        } else if (cleanHeader.includes('생년월일')) {
          columnMapping.birthDate = index;
        } else if (cleanHeader.includes('성별')) {
          columnMapping.gender = index;
        } else if (cleanHeader.includes('입사일')) {
          columnMapping.hireDate = index;
        } else if (cleanHeader.includes('퇴사일')) {
          columnMapping.resignDate = index;
        } else if (cleanHeader.includes('비고')) {
          columnMapping.notes = index;
        } else if (cleanHeader.includes('배움터') || cleanHeader.includes('id')) {
          columnMapping.learningId = index;
        } else if (cleanHeader.includes('수정일')) {
          columnMapping.modifiedDate = index;
        } else if (cleanHeader.includes('주요업무')) {
          columnMapping.mainDuty = index;
        }
      });
      
      break;
    }
  }
  
  if (!headerRow || columnMapping.name === undefined) {
    throw new Error('성명 헤더를 찾을 수 없습니다.');
  }
  
  console.log('컬럼 매핑:', columnMapping);
  
  // 데이터 행 처리
  const employeeData = [];
  let processedCount = 0;
  
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows.eq(i);
    const cells = row.find('td');
    
    if (cells.length < 3) continue;
    
    const cellValues = [];
    cells.each((j, cell) => {
      cellValues.push($(cell).text().trim());
    });
    
    // 이름 필드 확인
    const name = cellValues[columnMapping.name];
    if (!name || name.length < 2 || name.length > 4 || !/^[가-힣]+$/.test(name)) {
      continue;
    }
    
    // 직무구분이 있는지 확인 (전담사회복지사, 생활지원사 등)
    const jobType = columnMapping.jobType !== undefined ? cellValues[columnMapping.jobType] : '';
    if (!jobType || (!jobType.includes('전담') && !jobType.includes('생활지원') && !jobType.includes('선임'))) {
      continue;
    }
    
    // 종사자 데이터 생성
    const employee = {
      id: `employee_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      name: name,
      region: columnMapping.region !== undefined ? cellValues[columnMapping.region] || '' : '',
      district: columnMapping.district !== undefined ? cellValues[columnMapping.district] || '' : '',
      regionCode: columnMapping.regionCode !== undefined ? cellValues[columnMapping.regionCode] || '' : '',
      regionName: columnMapping.regionName !== undefined ? cellValues[columnMapping.regionName] || '' : '',
      institutionCode: columnMapping.institutionCode !== undefined ? cellValues[columnMapping.institutionCode] || '' : '',
      jobType: jobType,
      responsibility: columnMapping.responsibility !== undefined ? cellValues[columnMapping.responsibility] || '' : '',
      careerType: columnMapping.careerType !== undefined ? cellValues[columnMapping.careerType] || '' : '',
      angelCode: columnMapping.angelCode !== undefined ? cellValues[columnMapping.angelCode] || '' : '',
      birthDate: columnMapping.birthDate !== undefined ? cellValues[columnMapping.birthDate] || '' : '',
      gender: columnMapping.gender !== undefined ? cellValues[columnMapping.gender] || '' : '',
      hireDate: columnMapping.hireDate !== undefined ? cellValues[columnMapping.hireDate] || '' : '',
      resignDate: columnMapping.resignDate !== undefined ? cellValues[columnMapping.resignDate] || '' : '',
      notes: columnMapping.notes !== undefined ? cellValues[columnMapping.notes] || '' : '',
      learningId: columnMapping.learningId !== undefined ? cellValues[columnMapping.learningId] || '' : '',
      modifiedDate: columnMapping.modifiedDate !== undefined ? cellValues[columnMapping.modifiedDate] || '' : '',
      mainDuty: columnMapping.mainDuty !== undefined ? cellValues[columnMapping.mainDuty] || '' : '',
      
      // 추가 필드들
      institution: columnMapping.regionName !== undefined ? cellValues[columnMapping.regionName] || '' : '',
      province: columnMapping.region !== undefined ? cellValues[columnMapping.region] || '' : '',
      duty: columnMapping.responsibility !== undefined ? cellValues[columnMapping.responsibility] || '' : '',
      remarks: columnMapping.notes !== undefined ? cellValues[columnMapping.notes] || '' : '',
      note: columnMapping.notes !== undefined ? cellValues[columnMapping.notes] || '' : '',
      primaryWork: columnMapping.mainDuty !== undefined ? cellValues[columnMapping.mainDuty] || '' : '',
      
      // 상태 계산
      isActive: !cellValues[columnMapping.resignDate] || cellValues[columnMapping.resignDate].trim() === '',
      workDays: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    employeeData.push(employee);
    processedCount++;
    
    // 진법규 확인
    if (name === '진법규') {
      console.log('=== 진법규 발견! ===');
      console.log('데이터:', employee);
    }
    
    // 육은종 확인
    if (name === '육은종') {
      console.log('=== 육은종 발견! ===');
      console.log('데이터:', employee);
    }
  }
  
  console.log(`헤더 기반 파싱 완료: ${processedCount}명 처리`);
  return employeeData;
}

module.exports = { improvedHtmlParser };