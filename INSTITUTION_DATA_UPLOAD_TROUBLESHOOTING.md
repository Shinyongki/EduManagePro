# 기관현황 데이터 업로드 문제 해결 가이드

## 개요

한국어 교육관리 애플리케이션에서 Excel 파일의 복합 헤더 구조로 인한 기관현황 데이터 업로드 문제와 해결과정을 정리한 문서입니다.

## 주요 문제점

### 1. 복합 헤더 구조 문제
- **문제**: Excel 파일의 2-3행이 병합된 복합 헤더로 구성되어 기존 단순 헤더 파싱 로직이 실패
- **증상**: 업로드된 데이터가 빈 배열로 나타남
- **원인**: `__EMPTY_` 패턴으로 생성되는 병합 셀 인덱스를 기존 로직이 처리하지 못함

### 2. 중복 필드명 문제  
- **문제**: "복지부 배정 인원"과 "배정 및 채용 인원" 섹션에 동일한 컬럼명 존재
- **증상**: 나중에 파싱되는 데이터가 이전 데이터를 덮어써서 "복지부 배정 인원" 데이터가 모두 '0'으로 표시
- **원인**: JavaScript 객체에서 동일한 키값은 마지막 값으로 덮어쓰기됨

### 3. 필드 매핑 불일치 문제
- **문제**: 백엔드에서 생성된 필드명과 프론트엔드에서 사용하는 필드명 불일치
- **증상**: 일부 데이터가 '0'이나 '-'로 표시됨
- **원인**: 필드명 변경 시 백엔드와 프론트엔드 간 동기화 부족

## 해결 과정

### 1단계: 복합 헤더 처리 로직 구현

**파일**: `server/routes.ts` - `processComplexHeaders` 함수

```typescript
function processComplexHeaders(rawData: any[][], sheetName: string): any[] {
  // 첫 번째 행은 스킵 (인덱스 0)
  // 두 번째 행은 병합된 상위 헤더 (인덱스 1)  
  const topHeaders = rawData[1] as any[];
  // 세 번째 행은 세부 헤더 (인덱스 2)
  const subHeaders = rawData[2] as any[];
  
  // 실제 Excel 2행 헤더 구조에 정확히 맞춘 컬럼 매핑
  const headerMap: { [key: number]: string } = {
    // 기본 정보 (7개 컬럼)
    0: '광역시',
    1: '지자체', 
    2: '광역코드',
    // ... 모든 컬럼 매핑
  };
```

**핵심 개선사항**:
- 병합된 헤더 구조를 고려한 인덱스 기반 매핑
- 실제 Excel 컬럼 순서와 정확히 일치하는 headerMap 구성
- __EMPTY_ 패턴 필드도 포함하여 누락 방지

### 2단계: 중복 필드명 처리 로직 개발

**문제 해결 전**:
```typescript
// 잘못된 접근 - 중복 검사 후 접미사 추가
if (obj[header] !== undefined) {
  if (colIndex >= 35 && colIndex <= 37) {
    finalFieldName = header + '_복지부';
  } else if (colIndex >= 38 && colIndex <= 46) {
    finalFieldName = header + '_기관';
  }
}
```

**문제 해결 후**:
```typescript
// 올바른 접근 - 위치별로 처음부터 구분된 필드명 사용
if (colIndex >= 35 && colIndex <= 37) {
  // 복지부 배정 인원 섹션 (컬럼 35-37)
  finalFieldName = header + '_복지부';
} else if (colIndex >= 38 && colIndex <= 46) {
  // 배정 및 채용 인원 섹션 (컬럼 38-46)
  finalFieldName = header + '_기관';
}
```

**핵심 개선사항**:
- 컬럼 위치에 따라 처음부터 구분된 필드명 생성
- 데이터 덮어쓰기 방지로 모든 섹션 데이터 보존

### 3단계: 백엔드-프론트엔드 필드 매핑 정렬

**백엔드 매핑 수정** (`server/routes.ts:2515-2528`):
```typescript
// 7. 복지부 배정 인원
allocatedSocialWorkersGov: parseInt(row['전담사회복지사(배정)_복지부']) || 0,
allocatedLifeSupportGov: parseInt(row['생활지원사(배정)_복지부']) || 0,
allocatedTargetsGov: parseInt(row['대상자 ※사후관리 제외(배정)_복지부']) || 0,

// 8. 배정 및 채용 인원 - _기관 접미사 추가
allocatedSocialWorkers: parseInt(row['전담사회복지사(배정)_기관']) || 0,
hiredSocialWorkers: parseInt(row['전담사회복지사(채용)_기관']) || 0,
allocatedLifeSupport: parseInt(row['생활지원사(배정)_기관']) || 0,
hiredLifeSupport: parseInt(row['생활지원사(채용)_기관']) || 0,
allocatedTargets: parseInt(row['대상자 ※사후관리 제외(배정)_기관']) || 0,
providedGeneralIntensive: parseInt(row['대상자 ※사후관리 제외(제공_일반+중점)_기관']) || 0,
providedGeneral: parseInt(row['대상자 ※사후관리 제외(제공_일반)_기관']) || 0,
providedIntensive: parseInt(row['대상자 ※사후관리 제외(제공_중점)_기관']) || 0,
providedSpecialized: parseInt(row['대상자 ※사후관리 제외(제공_특화)_기관']) || 0,
```

**프론트엔드 표시** (`client/src/pages/institution-data.tsx:679-689`):
```tsx
{/* 복지부 배정 인원 */}
<TableCell className="text-center">{institution.allocatedSocialWorkersGov || 0}</TableCell>
<TableCell className="text-center">{institution.allocatedLifeSupportGov || 0}</TableCell>
<TableCell className="text-center">{institution.allocatedTargetsGov || 0}</TableCell>

{/* 배정 및 채용 인원 */}
<TableCell className="text-center">{institution.allocatedSocialWorkers || 0}</TableCell>
<TableCell className="text-center">{institution.hiredSocialWorkers || 0}</TableCell>
<TableCell className="text-center">{institution.allocatedLifeSupport || 0}</TableCell>
<TableCell className="text-center">{institution.hiredLifeSupport || 0}</TableCell>
```

## 디버깅 전략

### 1. 로그 기반 디버깅
```typescript
// 배정/채용 인원 관련 컬럼 데이터 확인
if (i < 12) {
  console.log(`행 ${i-1} 배정/채용 인원 관련 컬럼 데이터:`);
  for (let col = 35; col <= 46; col++) {
    console.log(`  컬럼 ${col}: ${row[col]} (${headerMap[col] || '매핑안됨'})`);
  }
}
```

### 2. 필드별 순차 검증
1. 기본 정보 → 연도별 이력 → 서비스 유형 → 기관 정보 순으로 검증
2. 각 섹션별로 사용자 피드백을 받아 단계적 수정
3. 실제 Excel 데이터와 화면 표시 데이터 비교 검증

### 3. 중복 필드 분석
```typescript
// 생성된 필드명 확인을 위한 로그
console.log('첫 번째 데이터 샘플:', Object.keys(tempData[0]).slice(0, 10));
```

## 주요 교훈

### 1. 복합 헤더 처리시 주의사항
- Excel의 병합 셀은 첫 번째 셀에만 데이터가 있고 나머지는 빈 값
- XLSX 라이브러리는 빈 셀을 `__EMPTY_인덱스` 형태로 생성
- 실제 데이터 위치와 헤더 매핑을 정확히 일치시켜야 함

### 2. 중복 필드명 해결 방법
- 객체 키 중복 시 마지막 값으로 덮어쓰기되는 JavaScript 특성 고려
- 위치 기반 접미사를 사용하여 필드명 구분
- 데이터 손실 방지를 위해 사전에 접미사 할당

### 3. 백엔드-프론트엔드 동기화
- 필드명 변경 시 반드시 양쪽 모두 수정
- 타입스크립트 인터페이스 활용으로 컴파일 타임 검증
- 단위별 테스트로 데이터 무결성 확인

## 파일별 주요 변경사항

### `server/routes.ts`
- `processComplexHeaders` 함수 추가 (18-167행)
- 중복 필드명 처리 로직 수정 (121-128행)  
- 백엔드 필드 매핑 정확성 개선 (2515-2528행)

### `client/src/pages/institution-data.tsx`
- 2층 복합 헤더 구조 구현 (557-625행)
- 올바른 필드명 사용으로 수정 (679-689행)

### `vite.config.ts`
- API 프록시 포트 업데이트 (38행)

## 향후 개선 방안

1. **자동화된 테스트 추가**: Excel 파일 업로드 시나리오별 단위 테스트
2. **필드 매핑 검증**: 런타임에 필드 존재 여부 검증 로직
3. **에러 핸들링 강화**: 사용자에게 구체적인 오류 메시지 제공
4. **타입 안전성**: TypeScript 인터페이스로 필드 정의 강화

## 결론

복합 헤더 구조와 중복 필드명 문제는 Excel 데이터 처리에서 흔히 발생하는 고난도 문제입니다. 체계적인 디버깅과 단계별 수정을 통해 성공적으로 해결했으며, 이 경험을 바탕으로 향후 유사한 문제를 더 효율적으로 해결할 수 있을 것입니다.

---
**작성일**: 2025-08-16  
**작성자**: Claude Code Assistant  
**최종 수정**: 중복 필드명 처리 및 백엔드 매핑 완료