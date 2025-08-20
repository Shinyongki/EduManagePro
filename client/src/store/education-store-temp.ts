// 임시 파일: 데이터 불일치 분석 기능만 분리

export const getDataInconsistenciesFixed = (participantData: any[], employeeData: any[]) => {
  console.log('\n🔍 데이터 일관성 검사 시작 (생년월일 기준 동일인 판별)');
  console.log('참가자 데이터(배움터):', participantData.length, '명');
  console.log('종사자 데이터(모인우리) 원본:', employeeData.length, '명');
  
  // 종사자 데이터 보정 (컬럼 밀림 수정)
  const correctedEmployeeData = employeeData.map(emp => {
    if (emp.name === '특화' && emp.careerType && 
        typeof emp.careerType === 'string' && 
        emp.careerType.length >= 2 && 
        emp.careerType.length <= 4 && 
        /^[가-힣]+$/.test(emp.careerType)) {
      
      console.log(`🔧 [일관성 검사] 컬럼 밀림 보정: "${emp.name}" → "${emp.careerType}" (기관: ${emp.institution})`);
      
      return {
        ...emp,
        name: emp.careerType,
        careerType: emp.birthDate,
        birthDate: emp.gender,
        gender: emp.hireDate,
        corrected: true
      };
    }
    return emp;
  });
  
  // 매칭 함수
  const findMatchingEmployee = (participant: any) => {
    if (!participant.name) return null;
    
    return correctedEmployeeData.find(emp => {
      const nameMatch = emp.name === participant.name;
      if (!nameMatch) return false;
      
      // 생년월일 매칭
      if (participant.birthDate && emp.birthDate) {
        if (emp.birthDate === participant.birthDate) return true;
        
        try {
          const normalizeDate = (dateStr: string) => dateStr.replace(/[-./]/g, '');
          const empNormalizedDate = normalizeDate(emp.birthDate);
          const participantNormalizedDate = normalizeDate(participant.birthDate);
          return empNormalizedDate === participantNormalizedDate;
        } catch {
          // 날짜 정규화 실패시 이름만으로 매칭
        }
      }
      
      return true; // 이름이 일치하면 매칭
    });
  };
  
  // 기관별 그룹화
  const institutionGroups = participantData.reduce((acc, participant) => {
    const institution = participant.institution || '미분류';
    if (!acc[institution]) acc[institution] = [];
    acc[institution].push(participant);
    return acc;
  }, {} as Record<string, any[]>);
  
  // 불일치 분석
  const results = Object.entries(institutionGroups).map(([institution, participants]) => {
    const inconsistencies: any[] = [];
    
    participants.forEach(participant => {
      const matchingEmployee = findMatchingEmployee(participant);
      
      if (matchingEmployee) {
        const participantActive = participant.status !== '중지' && participant.isActive !== false;
        let employeeActive = matchingEmployee.isActive;
        
        if (matchingEmployee.resignDate) {
          try {
            const resignDate = new Date(matchingEmployee.resignDate);
            employeeActive = resignDate > new Date();
          } catch {
            employeeActive = false;
          }
        }
        
        const hasInconsistency = 
          participantActive !== employeeActive ||
          participant.resignDate !== matchingEmployee.resignDate;
        
        if (hasInconsistency) {
          inconsistencies.push({
            name: participant.name,
            id: participant.id,
            birthDate: participant.birthDate,
            employeeStatus: matchingEmployee.isActive ? '재직' : '퇴직',
            participantStatus: participant.status || '정상',
            employeeInstitution: matchingEmployee.institution,
            participantInstitution: participant.institution,
            employeeIsActive: matchingEmployee.isActive,
            participantIsActive: participant.isActive,
            employeeResignDate: matchingEmployee.resignDate || '',
            participantResignDate: participant.resignDate || '',
            jobType: participant.jobType || '미분류',
            type: '상태_불일치'
          });
        }
      }
    });
    
    return {
      institution,
      inconsistencies
    };
  }).filter(result => result.inconsistencies.length > 0);
  
  console.log('\n📊 불일치 발견 요약:');
  results.forEach(result => {
    console.log(`${result.institution}: ${result.inconsistencies.length}건`);
  });
  
  return results;
};