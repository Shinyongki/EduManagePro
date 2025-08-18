// 경상남도 시군별 기관 목록 (하드코딩 - 영속 저장)

export interface InstitutionData {
  district: string;
  institutionName: string;
}

export interface DistrictInfo {
  district: string;
  institutions: string[];
  totalInstitutions: number;
}

// 시군별 기관 매핑 데이터
export const DISTRICT_INSTITUTIONS: Record<string, string[]> = {
  "창원시": [
    "동진노인통합지원센터",
    "창원도우누리노인통합재가센터",
    "명진노인통합지원센터", 
    "마산희망지역자활센터",
    "경남노인통합지원센터",
    "정현사회적협동조합",
    "진해서부노인종합복지관",
    "진해노인종합복지관",
    "경남고용복지센터",
    "마산회원노인종합복지관"
  ],
  "진주시": [
    "진양노인통합지원센터",
    "진주노인통합지원센터",
    "나누리노인통합지원센터",
    "공덕의집노인통합지원센터",
    "하늘마음노인통합지원센터"
  ],
  "통영시": [
    "통영시종합사회복지관",
    "통영노인통합지원센터"
  ],
  "사천시": [
    "사랑원노인지원센터",
    "사천노인통합지원센터"
  ],
  "김해시": [
    "효능원노인통합지원센터",
    "김해시종합사회복지관",
    "생명의전화노인통합지원센터",
    "보현행원노인통합지원센터",
    "김해돌봄지원센터"
  ],
  "밀양시": [
    "밀양시자원봉사단체협의회",
    "밀양노인통합지원센터",
    "우리들노인통합지원센터"
  ],
  "거제시": [
    "거제노인통합지원센터",
    "거제사랑노인복지센터"
  ],
  "양산시": [
    "사회복지법인신생원양산재가노인복지센터",
    "양산행복한돌봄 사회적협동조합",
    "성요셉소규모노인종합센터"
  ],
  "의령군": [
    "의령노인통합지원센터"
  ],
  "함안군": [
    "(사)대한노인회함안군지회",
    "함안군재가노인통합지원센터"
  ],
  "창녕군": [
    "창녕군새누리노인종합센터",
    "사회적협동조합 창녕지역자활센터"
  ],
  "고성군": [
    "대한노인회 고성군지회(노인맞춤돌봄서비스)",
    "한올생명의집"
  ],
  "하동군": [
    "하동노인통합지원센터",
    "경남하동지역자활센터"
  ],
  "산청군": [
    "산청한일노인통합지원센터",
    "산청복음노인통합지원센터",
    "산청해민노인통합지원센터",
    "산청성모노인통합지원센터"
  ],
  "함양군": [
    "사단법인 대한노인회 함양군지회"
  ],
  "거창군": [
    "거창노인통합지원센터",
    "거창인애노인통합지원센터",
    "해월노인복지센터"
  ],
  "합천군": [
    "미타재가복지센터",
    "합천노인통합지원센터",
    "코끼리행복복지센터",
    "사회적협동조합 합천지역자활센터"
  ],
  "남해군": [
    "화방남해노인통합지원센터",
    "화방재가복지센터"
  ]
};

// 기관명으로 시군 찾기 함수
export function getDistrictByInstitution(institutionName: string): string | null {
  for (const [district, institutions] of Object.entries(DISTRICT_INSTITUTIONS)) {
    if (institutions.includes(institutionName)) {
      return district;
    }
  }
  return null;
}

// 시군별 정보 조회 함수
export function getDistrictInfo(district: string): DistrictInfo | null {
  const institutions = DISTRICT_INSTITUTIONS[district];
  if (!institutions) return null;
  
  return {
    district,
    institutions,
    totalInstitutions: institutions.length
  };
}

// 모든 시군 목록 조회
export function getAllDistricts(): string[] {
  return Object.keys(DISTRICT_INSTITUTIONS);
}

// 모든 시군 정보 조회
export function getAllDistrictInfo(): DistrictInfo[] {
  return Object.entries(DISTRICT_INSTITUTIONS).map(([district, institutions]) => ({
    district,
    institutions,
    totalInstitutions: institutions.length
  }));
}

// 전체 통계
export const DISTRICT_STATISTICS = {
  totalDistricts: Object.keys(DISTRICT_INSTITUTIONS).length, // 18개
  totalInstitutions: Object.values(DISTRICT_INSTITUTIONS).flat().length, // 55개
  averageInstitutionsPerDistrict: Object.values(DISTRICT_INSTITUTIONS).flat().length / Object.keys(DISTRICT_INSTITUTIONS).length // 3.1개
};