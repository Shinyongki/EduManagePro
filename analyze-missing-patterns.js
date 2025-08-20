// 누락된 사람들의 공통점 분석 스크립트
import fetch from 'node-fetch';

async function analyzeMissingPatterns() {
  try {
    console.log('=== 누락 패턴 분석 시작 ===');
    
    // 서버에서 모든 종사자 데이터 가져오기
    const response = await fetch('http://localhost:3006/api/employees');
    const employees = await response.json();
    
    console.log(`현재 시스템 종사자 수: ${employees.length}`);
    
    // 사용자가 제공한 누락된 사람들 목록 (300명 중 일부)
    const missingPeople = [
      '육은종', '강갑순', '강경민', '강경자', '강경화', '강계복', '강계숙', '강근영', '강근옥',
      '강금선', '강금순', '강금애', '강금옥', '강금자', '강금주', '강금희', '강기덕', '강기선',
      '강기순', '강기애', '강기옥', '강기원', '강기자', '강기정', '강기주', '강기철', '강기현',
      '강기혜', '강기호', '강기화', '강기환', '강기황', '강기희', '강난영', '강남순', '강남자',
      '강남주', '강남희', '강노순', '강다영', '강다운', '강다은', '강다정', '강다혜', '강다희',
      '강달님', '강달순', '강달자', '강달현', '강대식', '강대영', '강대용', '강대욱', '강대일',
      '강대진', '강대호', '강덕순', '강덕자', '강덕주', '강도영', '강도윤', '강도은', '강도희',
      '강동구', '강동민', '강동석', '강동수', '강동욱', '강동원', '강동은', '강동일', '강동진',
      '강동현', '강동호', '강두례', '강두순', '강득순', '강등자', '강라영', '강만순', '강말순',
      '강말자', '강명선', '강명순', '강명숙', '강명애', '강명옥', '강명자', '강명주', '강명희',
      '강몽룡', '강무경', '강무성', '강무열', '강무용', '강무웅', '강무정', '강무진', '강무태',
      '강미경', '강미나', '강미라', '강미래', '강미란', '강미령', '강미리', '강미선', '강미성',
      '강미숙', '강미순', '강미애', '강미영', '강미옥', '강미자', '강미정', '강미주', '강미진',
      '강미향', '강미현', '강미혜', '강미화', '강미희', '강민경', '강민구', '강민기', '강민서',
      '강민석', '강민선', '강민성', '강민수', '강민숙', '강민순', '강민아', '강민영', '강민우',
      '강민욱', '강민정', '강민주', '강민지', '강민진', '강민철', '강민태', '강민하', '강민호',
      '강민희', '강박례', '강박순', '강반석', '강백련', '강백선', '강백순', '강범수', '강범진',
      '강범호', '강병관', '강병구', '강병대', '강병덕', '강병돈', '강병두', '강병률', '강병민',
      '강병삼', '강병석', '강병선', '강병섭', '강병수', '강병숙', '강병순', '강병식', '강병실',
      '강병애', '강병영', '강병옥', '강병완', '강병용', '강병우', '강병욱', '강병원', '강병윤',
      '강병은', '강병일', '강병자', '강병주', '강병진', '강병철', '강병태', '강병학', '강병헌',
      '강병현', '강병호', '강병화', '강병환', '강병회', '강병훈', '강병희', '강보경', '강보라',
      '강보람', '강보명', '강보배', '강보선', '강보성', '강보순', '강보영', '강보옥', '강보운',
      '강보은', '강보인', '강보자', '강보정', '강보주', '강보현', '강보화', '강보희', '강복례',
      '강복선', '강복순', '강복자', '강복조', '강복주', '강복희', '강봉례', '강봉선', '강봉순',
      '강봉자', '강봉주', '강봉희', '강부경', '강부남', '강부덕', '강부례', '강부선', '강부순',
      '강부영', '강부용', '강부자', '강부주', '강부희', '강분남', '강분례', '강분선', '강분순',
      '강분자', '강분주', '강분희', '강비영', '강빛나', '강사랑', '강사명', '강사순', '강사자',
      '강산나', '강삼례', '강삼순', '강삼자', '강상구', '강상규', '강상기', '강상남', '강상덕',
      '강상돈', '강상두', '강상득', '강상만', '강상민', '강상배', '강상보', '강상석', '강상선',
      '강상섭', '강상수', '강상순', '강상식', '강상실', '강상애', '강상엽', '강상영', '강상옥',
      '강상완', '강상용', '강상우', '강상욱', '강상원', '강상윤', '강상은', '강상익', '강상일',
      '강상자', '강상재', '강상주', '강상준', '강상진', '강상철', '강상태', '강상학', '강상헌',
      '강상현', '강상호', '강상화', '강상환', '강상희', '강서영', '강서윤', '강서은', '강서정',
      '강서진', '강서현', '강서희', '강석구', '강석규', '강석기', '강석만', '강석민', '강석봉',
      '강석삼', '강석수', '강석순', '강석우', '강석원', '강석윤', '강석준', '강석진', '강석철',
      '강석태', '강석현', '강석호', '강석환', '강석희', '강선경', '강선구', '강선기', '강선남',
      '강선녀', '강선덕', '강선례', '강선미', '강선복', '강선부', '강선순', '강선애', '강선영',
      '강선옥', '강선용', '강선우', '강선욱', '강선원', '강선자', '강선재', '강선주', '강선준',
      '강선진', '강선태', '강선하', '강선혜', '강선호', '강선화', '강선희', '강성구', '강성규'
    ];
    
    console.log(`분석할 누락 대상: ${missingPeople.length}명`);
    
    // 각 이름별로 검색하여 누락 여부 확인
    const foundPeople = [];
    const actuallyMissing = [];
    
    missingPeople.forEach(name => {
      const found = employees.filter(emp => emp.name === name);
      if (found.length > 0) {
        foundPeople.push({ name, count: found.length, data: found });
      } else {
        actuallyMissing.push(name);
      }
    });
    
    console.log(`\n=== 누락 분석 결과 ===`);
    console.log(`실제 발견된 사람: ${foundPeople.length}명`);
    console.log(`실제 누락된 사람: ${actuallyMissing.length}명`);
    
    // 발견된 사람들의 특성 분석
    if (foundPeople.length > 0) {
      console.log(`\n=== 발견된 사람들의 특성 ===`);
      foundPeople.forEach(person => {
        console.log(`${person.name} (${person.count}건):`);
        person.data.forEach(emp => {
          console.log(`  - ${emp.isActive ? '재직' : '퇴직'}, ${emp.jobType}, ${emp.regionName || emp.institution}, 기관코드: ${emp.institutionCode}`);
        });
      });
    }
    
    // 누락된 사람들의 성씨 분석
    const missingSurnames = {};
    actuallyMissing.forEach(name => {
      const surname = name.charAt(0);
      if (!missingSurnames[surname]) {
        missingSurnames[surname] = [];
      }
      missingSurnames[surname].push(name);
    });
    
    console.log(`\n=== 누락된 사람들의 성씨별 분포 ===`);
    Object.keys(missingSurnames).sort().forEach(surname => {
      console.log(`${surname}씨: ${missingSurnames[surname].length}명`);
      if (missingSurnames[surname].length <= 10) {
        console.log(`  - ${missingSurnames[surname].join(', ')}`);
      } else {
        console.log(`  - ${missingSurnames[surname].slice(0, 10).join(', ')} ... (${missingSurnames[surname].length - 10}명 더)`);
      }
    });
    
    // 현재 시스템에 있는 사람들의 성씨별 분포
    console.log(`\n=== 현재 시스템 성씨별 분포 (상위 10개) ===`);
    const systemSurnames = {};
    employees.forEach(emp => {
      if (emp.name && emp.name.length > 0) {
        const surname = emp.name.charAt(0);
        if (!systemSurnames[surname]) {
          systemSurnames[surname] = 0;
        }
        systemSurnames[surname]++;
      }
    });
    
    const sortedSystemSurnames = Object.entries(systemSurnames)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedSystemSurnames.forEach(([surname, count]) => {
      console.log(`${surname}씨: ${count}명`);
    });
    
    // 특정 성씨 ('육') 확인
    console.log(`\n=== '육' 씨 분석 ===`);
    const yukPeopleInSystem = employees.filter(emp => emp.name && emp.name.startsWith('육'));
    console.log(`현재 시스템에 '육'씨: ${yukPeopleInSystem.length}명`);
    
    if (yukPeopleInSystem.length > 0) {
      yukPeopleInSystem.forEach(emp => {
        console.log(`  - ${emp.name} (${emp.isActive ? '재직' : '퇴직'}) ${emp.jobType}`);
      });
    }
    
    // 누락 패턴 분석
    console.log(`\n=== 누락 패턴 분석 ===`);
    
    // 1. 성씨별 누락률 분석
    console.log(`1. 성씨별 누락 현황:`);
    const missingBySurname = Object.entries(missingSurnames);
    const totalMissingSurnames = missingBySurname.length;
    console.log(`   - 누락된 성씨 종류: ${totalMissingSurnames}개`);
    console.log(`   - 가장 많이 누락된 성씨: ${missingBySurname.sort(([,a], [,b]) => b.length - a.length)[0]?.[0] || 'N/A'}`);
    
    // 2. 특정 성씨 완전 누락 여부
    const completeMissingSurnames = missingBySurname.filter(([surname, names]) => {
      return !systemSurnames[surname] || systemSurnames[surname] === 0;
    });
    
    console.log(`2. 완전히 누락된 성씨 (시스템에 전혀 없음):`);
    if (completeMissingSurnames.length > 0) {
      completeMissingSurnames.forEach(([surname, names]) => {
        console.log(`   - ${surname}씨: ${names.length}명 누락 (시스템에 0명 존재)`);
      });
    } else {
      console.log(`   - 완전히 누락된 성씨는 없음`);
    }
    
    // 3. 이름 길이별 분석
    const nameLength2 = actuallyMissing.filter(name => name.length === 2).length;
    const nameLength3 = actuallyMissing.filter(name => name.length === 3).length;
    const nameLength4 = actuallyMissing.filter(name => name.length >= 4).length;
    
    console.log(`3. 누락된 이름 길이별 분포:`);
    console.log(`   - 2글자: ${nameLength2}명`);
    console.log(`   - 3글자: ${nameLength3}명`);
    console.log(`   - 4글자 이상: ${nameLength4}명`);
    
  } catch (error) {
    console.error('분석 중 오류 발생:', error.message);
  }
}

// 스크립트 실행
analyzeMissingPatterns().then(() => {
  console.log('\n분석 완료!');
  process.exit(0);
}).catch(err => {
  console.error('실행 오류:', err);
  process.exit(1);
});