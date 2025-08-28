/**
 * Test script to verify column shift corrections
 */

// Test data that simulates column shift issues
const testData = [
  // Case 1: 1칸 우측 밀림 - name에 '특화', careerType에 실제 이름
  {
    id: 1,
    name: '특화',
    careerType: '김철수',
    birthDate: '4년이상',
    gender: '1990-01-01',
    hireDate: '남',
    resignDate: null,
    learningId: '2020-01-01',
    notes: '2024-03-31', // 퇴사일이 여기에
    responsibility: '특화'
  },
  
  // Case 2: 2칸 밀림 - careerType에 이름, birthDate에 경력
  {
    id: 2,
    name: '홍길동',
    careerType: '이영희',
    birthDate: '4년이상',
    gender: '1985-05-15',
    hireDate: '여',
    resignDate: null,
    learningId: '2019-03-01',
    modifiedDate: '2023-12-31', // 퇴사일이 여기에
    responsibility: '특화'
  },
  
  // Case 3: 정상 데이터
  {
    id: 3,
    name: '박민수',
    careerType: '2년이상',
    birthDate: '1988-08-08',
    gender: '남',
    hireDate: '2021-06-01',
    resignDate: null,
    responsibility: '특화',
    isActive: true
  }
];

// Apply the correction logic (simplified version from employee-data.tsx)
function applyColumnShiftCorrection(emp) {
  // Case 1: 1칸 우측 밀림
  if (emp.name === '특화' && emp.careerType && 
      typeof emp.careerType === 'string' && 
      emp.careerType.length >= 2 && 
      emp.careerType.length <= 4 && 
      /^[가-힣]+$/.test(emp.careerType)) {
    
    console.log(`🔧 [1칸밀림보정] "${emp.name}" → "${emp.careerType}"`);
    
    // 퇴사일 정보 찾기
    const findResignDate = () => {
      const fields = [emp.notes, emp.note, emp.modifiedDate, emp.learningId, emp.updateDate];
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      for (const field of fields) {
        if (field && typeof field === 'string' && datePattern.test(field)) {
          const match = field.match(datePattern);
          if (match) return match[0];
        }
      }
      return null;
    };
    
    const foundResignDate = findResignDate();
    const isCurrentlyActive = !foundResignDate || new Date(foundResignDate) > new Date();
    
    return {
      ...emp,
      name: emp.careerType,              // 실제 이름
      careerType: emp.birthDate,         // 경력 정보
      birthDate: emp.gender,             // 생년월일  
      gender: emp.hireDate,              // 성별
      hireDate: emp.resignDate || emp.learningId,  // 입사일
      resignDate: foundResignDate,       // 발견된 퇴사일
      isActive: isCurrentlyActive,       // 퇴사일 기준 재직 상태
      corrected: true,
      correctionType: 'one_column_right_shift'
    };
  }

  // Case 2: 2칸 밀림
  if (emp.careerType && 
      typeof emp.careerType === 'string' && 
      emp.careerType.length >= 2 && 
      emp.careerType.length <= 4 && 
      /^[가-힣]+$/.test(emp.careerType) &&
      emp.careerType !== '기타' &&
      emp.birthDate && 
      (emp.birthDate.includes('년이상') || emp.birthDate === '기타')) {
    
    console.log(`🔧 [2칸밀림보정] 이름: "${emp.careerType}", 경력: ${emp.birthDate}`);
    
    const findResignDate = () => {
      const fields = [emp.notes, emp.note, emp.modifiedDate, emp.learningId, emp.updateDate, emp.mainDuty];
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      for (const field of fields) {
        if (field && typeof field === 'string' && datePattern.test(field)) {
          const match = field.match(datePattern);
          if (match) return match[0];
        }
      }
      return null;
    };
    
    const foundResignDate = findResignDate();
    const isCurrentlyActive = !foundResignDate || new Date(foundResignDate) > new Date();
    
    return {
      ...emp,
      name: emp.careerType,              // 실제 이름
      careerType: emp.birthDate,         // 경력 정보
      birthDate: emp.gender,             // 생년월일
      gender: emp.hireDate,              // 성별
      hireDate: emp.resignDate || emp.learningId,  // 입사일
      resignDate: foundResignDate,       // 발견된 퇴사일
      isActive: isCurrentlyActive,       // 퇴사일 기준 재직 상태
      corrected: true,
      correctionType: 'two_column_right_shift'
    };
  }

  return emp;
}

// Test the correction
console.log('🧪 Column Shift Correction Test\n');
console.log('=== Original Data ===');
testData.forEach((emp, idx) => {
  console.log(`${idx + 1}. ${emp.name} | 경력: ${emp.careerType} | 생년월일: ${emp.birthDate} | 성별: ${emp.gender}`);
});

console.log('\n=== After Correction ===');
const correctedData = testData.map(applyColumnShiftCorrection);
correctedData.forEach((emp, idx) => {
  console.log(`${idx + 1}. ${emp.name} | 경력: ${emp.careerType} | 생년월일: ${emp.birthDate} | 성별: ${emp.gender} | 퇴사일: ${emp.resignDate} | 재직: ${emp.isActive} ${emp.corrected ? '(보정됨)' : ''}`);
});

// Count specialized workers before and after correction
const countSpecializedWorkers = (data) => {
  return data.filter(emp => {
    // Check if specialized worker
    const duty = emp.responsibility || emp.duty || emp.mainDuty || '';
    if (duty !== '특화') return false;
    
    // Check employment status
    if (emp.resignDate) {
      try {
        const resignDate = new Date(emp.resignDate);
        const today = new Date();
        return resignDate > today;
      } catch {
        return false;
      }
    }
    
    return emp.isActive !== false;
  }).length;
};

console.log('\n=== Specialized Worker Count ===');
console.log(`Before correction: ${countSpecializedWorkers(testData)}명`);
console.log(`After correction: ${countSpecializedWorkers(correctedData)}명`);

console.log('\n✅ Column shift correction test completed');