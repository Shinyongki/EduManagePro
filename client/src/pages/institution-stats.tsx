import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployeeStore } from '@/store/employee-store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Users, Building2, TrendingUp, MapPin, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

// Leaflet 지도 컴포넌트
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip as LeafletTooltip, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 기본 아이콘 설정 수정
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 커스텀 마커 아이콘 생성
const createCustomIcon = (name: string) => {
  return L.divIcon({
    html: `<div style="
      background: #2563eb;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      border: 2px solid white;
      text-align: center;
    ">${name}</div>`,
    className: 'custom-div-icon',
    iconSize: [100, 30],
    iconAnchor: [50, 15]
  });
};

interface LeafletMapProps {
  institutions: Array<{
    name: string;
    district: string;
    region: string;
    specializedService?: string;
    address?: string;  // 실제 주소 추가
  }>;
}

function LeafletMap({ institutions }: LeafletMapProps) {
  // 디버깅: 전달받은 기관 수 확인
  console.log(`LeafletMap에 전달된 기관 수: ${institutions.length}개`);
  
  // 시군구별 기관 수 확인
  const districtCount: { [key: string]: number } = {};
  institutions.forEach(inst => {
    const key = `${inst.region} ${inst.district}`;
    districtCount[key] = (districtCount[key] || 0) + 1;
  });
  
  console.log('시군구별 기관 수:', districtCount);
  console.log('기관 상세 목록:');
  institutions.forEach((inst, i) => {
    console.log(`  ${i + 1}. ${inst.name} (${inst.region} ${inst.district}) - 주소: ${inst.address || '없음'}`);
  });

  // 같은 지역 내 기관들의 인덱스 저장
  const districtIndexMap: { [key: string]: number } = {};
  
  // 주소에서 좌표를 추정하는 함수
  const getCoordinatesFromAddress = (address: string | undefined, district: string, institutionName: string): [number, number] => {
    if (!address) {
      return getCoordinates(district);
    }

    // 주소 기반 좌표 매핑 (주요 지역별)
    const addressKeywords: { [key: string]: [number, number] } = {
      // 창원시 세부 지역 (더 많은 지역 추가)
      '창원시 성산구': [35.1983, 128.7027],
      '창원시 의창구': [35.2540, 128.6395],
      '창원시 마산합포구': [35.1969, 128.5678],
      '창원시 마산회원구': [35.2210, 128.5794],
      '창원시 진해구': [35.1495, 128.6598],
      '창원시 팔룡동': [35.2365, 128.6821],
      '창원시 명곡동': [35.2521, 128.6234],
      '창원시 봉림동': [35.2145, 128.6567],
      '창원시 사파동': [35.2089, 128.6892],
      '창원시 반송동': [35.1823, 128.7134],
      
      // 김해시 세부 지역 (더 많은 지역 추가)
      '김해시 삼안동': [35.2396, 128.8745],
      '김해시 내외동': [35.2289, 128.8790],
      '김해시 부원동': [35.2154, 128.8634],
      '김해시 장유동': [35.1789, 128.8034],
      '김해시 대청동': [35.2678, 128.8956],
      '김해시 동상동': [35.2234, 128.8812],
      '김해시 회현동': [35.2456, 128.8667],
      '진주시 평거동': [35.1658, 128.1062],
      '진주시 상대동': [35.1542, 128.1079],
      '양산시 중부동': [35.3389, 129.0277],
      '양산시 삼성동': [35.3301, 129.0354],
      '거제시 고현동': [34.8885, 128.6214],
      '거제시 옥포동': [34.8953, 128.6886],
      '통영시 무전동': [34.8436, 128.4217],
      '통영시 북신동': [34.8611, 128.4256],
      '사천시 용현면': [35.0763, 128.0892],
      '사천시 사남면': [35.0892, 128.0543],
      '밀양시 내이동': [35.4917, 128.7482],
      '밀양시 삼문동': [35.5058, 128.7467],
      
      // 군 지역
      '함안군 가야읍': [35.2681, 128.4062],
      '창녕군 창녕읍': [35.5433, 128.4950],
      '고성군 고성읍': [34.9730, 128.3223],
      '남해군 남해읍': [34.8373, 127.8924],
      '하동군 하동읍': [35.0671, 127.7512],
      '산청군 산청읍': [35.4150, 127.8729],
      '함양군 함양읍': [35.5204, 127.7250],
      '거창군 거창읍': [35.6865, 127.9093],
      '합천군 합천읍': [35.5661, 128.1653],
      '의령군 의령읍': [35.3221, 128.2619]
    };

    // 주소에서 키워드 매칭
    for (const [keyword, coords] of Object.entries(addressKeywords)) {
      if (address.includes(keyword)) {
        // 같은 지역 내 순번 계산
        const key = district;
        if (!districtIndexMap[key]) {
          districtIndexMap[key] = 0;
        }
        const index = districtIndexMap[key]++;
        
        // 격자 형태로 배치 (3x3 그리드)
        const gridSize = 3;
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const offset = 0.015; // 격자 간격
        
        return [
          coords[0] + (row - 1) * offset,
          coords[1] + (col - 1) * offset
        ];
      }
    }

    // 매칭되지 않으면 기본 district 좌표 사용하되 격자 배치 적용
    const baseCoords = getCoordinates(district);
    const key = district;
    if (!districtIndexMap[key]) {
      districtIndexMap[key] = 0;
    }
    const index = districtIndexMap[key]++;
    
    // 격자 형태로 배치
    const gridSize = 3;
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const offset = 0.015;
    
    return [
      baseCoords[0] + (row - 1) * offset,
      baseCoords[1] + (col - 1) * offset
    ];
  };

  const getCoordinates = (district: string): [number, number] => {
    // 경상남도 주요 시군구 좌표
    const coordinates: { [key: string]: [number, number] } = {
      '창원시': [35.2281, 128.6811],
      '김해시': [35.2342, 128.8890],
      '진주시': [35.1800, 128.1076],
      '양산시': [35.3350, 129.0372],
      '거제시': [34.8806, 128.6217],
      '통영시': [34.8544, 128.4233],
      '사천시': [35.0037, 128.0644],
      '밀양시': [35.5038, 128.7467],
      '함안군': [35.2725, 128.4067],
      '창녕군': [35.5444, 128.4925],
      '고성군': [34.9733, 128.3225],
      '남해군': [34.8375, 127.8925],
      '하동군': [35.0678, 127.7514],
      '산청군': [35.4153, 127.8731],
      '함양군': [35.5208, 127.7253],
      '거창군': [35.6869, 127.9097],
      '합천군': [35.5664, 128.1656],
      '의령군': [35.3225, 128.2622]
    };

    return coordinates[district] || [35.2594, 128.6641]; // 기본값: 경상남도 중심
  };

  // 경상남도 시군구별 경계 좌표 (대략적)
  const getDistrictBoundaries = () => {
    return [
      // 창원시
      {
        name: '창원시',
        coordinates: [
          [35.15, 128.55], [35.15, 128.75], [35.35, 128.75], [35.35, 128.55]
        ]
      },
      // 김해시
      {
        name: '김해시',
        coordinates: [
          [35.18, 128.85], [35.18, 128.95], [35.28, 128.95], [35.28, 128.85]
        ]
      },
      // 진주시
      {
        name: '진주시',
        coordinates: [
          [35.14, 128.05], [35.14, 128.18], [35.22, 128.18], [35.22, 128.05]
        ]
      },
      // 양산시
      {
        name: '양산시',
        coordinates: [
          [35.30, 129.00], [35.30, 129.10], [35.38, 129.10], [35.38, 129.00]
        ]
      },
      // 거제시
      {
        name: '거제시',
        coordinates: [
          [34.82, 128.58], [34.82, 128.68], [34.92, 128.68], [34.92, 128.58]
        ]
      },
      // 통영시
      {
        name: '통영시',
        coordinates: [
          [34.80, 128.38], [34.80, 128.48], [34.90, 128.48], [34.90, 128.38]
        ]
      },
      // 사천시
      {
        name: '사천시',
        coordinates: [
          [34.95, 128.02], [34.95, 128.12], [35.05, 128.12], [35.05, 128.02]
        ]
      },
      // 밀양시
      {
        name: '밀양시',
        coordinates: [
          [35.45, 128.70], [35.45, 128.82], [35.55, 128.82], [35.55, 128.70]
        ]
      },
      // 함안군
      {
        name: '함안군',
        coordinates: [
          [35.24, 128.36], [35.24, 128.46], [35.32, 128.46], [35.32, 128.36]
        ]
      },
      // 창녕군
      {
        name: '창녕군',
        coordinates: [
          [35.50, 128.44], [35.50, 128.54], [35.58, 128.54], [35.58, 128.44]
        ]
      },
      // 고성군
      {
        name: '고성군',
        coordinates: [
          [34.94, 128.28], [34.94, 128.38], [35.02, 128.38], [35.02, 128.28]
        ]
      },
      // 남해군
      {
        name: '남해군',
        coordinates: [
          [34.80, 127.85], [34.80, 127.95], [34.88, 127.95], [34.88, 127.85]
        ]
      },
      // 하동군
      {
        name: '하동군',
        coordinates: [
          [35.03, 127.70], [35.03, 127.82], [35.13, 127.82], [35.13, 127.70]
        ]
      },
      // 산청군
      {
        name: '산청군',
        coordinates: [
          [35.38, 127.82], [35.38, 127.92], [35.46, 127.92], [35.46, 127.82]
        ]
      },
      // 함양군
      {
        name: '함양군',
        coordinates: [
          [35.48, 127.68], [35.48, 127.78], [35.56, 127.78], [35.56, 127.68]
        ]
      },
      // 거창군
      {
        name: '거창군',
        coordinates: [
          [35.64, 127.86], [35.64, 127.96], [35.72, 127.96], [35.72, 127.86]
        ]
      },
      // 합천군
      {
        name: '합천군',
        coordinates: [
          [35.53, 128.12], [35.53, 128.22], [35.61, 128.22], [35.61, 128.12]
        ]
      },
      // 의령군
      {
        name: '의령군',
        coordinates: [
          [35.30, 128.22], [35.30, 128.32], [35.38, 128.32], [35.38, 128.22]
        ]
      }
    ];
  };

  // 지역별로 기관들을 그룹화
  const institutionsByDistrict: { [key: string]: typeof institutions } = {};
  institutions.forEach(inst => {
    if (!institutionsByDistrict[inst.district]) {
      institutionsByDistrict[inst.district] = [];
    }
    institutionsByDistrict[inst.district].push(inst);
  });

  return (
    <>
      <style>{`
        .district-label {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .district-label > div {
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
        }
      `}</style>
      <div style={{ width: '100%', height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative', display: 'flex' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
          center={[35.2594, 128.6641]} // 경상남도 중심
          zoom={8}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 시군구별 경계 표시 */}
        {getDistrictBoundaries().map((district, index) => {
          const hasInstitution = institutions.some(inst => inst.district === district.name);
          const institutionCount = institutions.filter(inst => inst.district === district.name).length;
          
          // 경계 중심점 계산 (레이블 표시용)
          const centerLat = district.coordinates.reduce((sum, coord) => sum + coord[0], 0) / district.coordinates.length;
          const centerLng = district.coordinates.reduce((sum, coord) => sum + coord[1], 0) / district.coordinates.length;
          
          return (
            <Fragment key={index}>
              <Polygon
                positions={district.coordinates as [number, number][]}
                pathOptions={{
                  fillColor: hasInstitution ? '#3b82f6' : '#e5e7eb',
                  fillOpacity: hasInstitution ? 0.2 : 0.05,
                  color: hasInstitution ? '#1e40af' : '#4b5563',
                  weight: hasInstitution ? 3 : 2,
                  opacity: 1,
                  dashArray: hasInstitution ? undefined : '5, 5'
                }}
              >
                <LeafletTooltip permanent direction="center" className="district-label" opacity={1}>
                  <div style={{ 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    padding: '2px 4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '4px',
                    border: hasInstitution ? '1px solid #3b82f6' : '1px solid #9ca3af'
                  }}>
                    <div style={{ color: hasInstitution ? '#1e40af' : '#4b5563' }}>
                      {district.name}
                    </div>
                    {hasInstitution && (
                      <div style={{ fontSize: '10px', color: '#3b82f6', marginTop: '1px' }}>
                        ({institutionCount}개)
                      </div>
                    )}
                  </div>
                </LeafletTooltip>
                <Popup>
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{district.name}</h4>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                      {hasInstitution ? '특화서비스 제공 지역' : '특화서비스 미제공 지역'}
                    </p>
                    {hasInstitution && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>
                        기관 수: {institutionCount}개
                      </p>
                    )}
                  </div>
                </Popup>
              </Polygon>
            </Fragment>
          );
        })}
        {institutions.map((institution, index) => {
          // 실제 주소가 있으면 주소 기반, 없으면 district 기반 좌표 사용
          const position = getCoordinatesFromAddress(institution.address, institution.district, institution.name);
          
          // 같은 지역 기관들 찾기
          const sameDistrictInstitutions = institutions.filter(inst => inst.district === institution.district);
          const districtIndex = sameDistrictInstitutions.findIndex(inst => inst.name === institution.name);
          const totalInDistrict = sameDistrictInstitutions.length;
          
          // 라벨 위치 계산 (세로로 배치)
          const verticalSpacing = 0.025; // 세로 간격
          const horizontalOffset = 0.12; // 가로 거리 (지도 우측)
          
          // 지역별로 다른 가로 위치 설정 (지역이 많으면 좌우로 분산)
          const districtGroups = ['창원시', '김해시'];
          const groupIndex = districtGroups.indexOf(institution.district);
          const xOffset = groupIndex >= 0 ? horizontalOffset + (groupIndex * 0.15) : horizontalOffset;
          
          const labelPosition: [number, number] = [
            position[0] - (districtIndex - totalInDistrict / 2) * verticalSpacing,
            position[1] + xOffset
          ];
          
          console.log(`기관 ${index + 1}: ${institution.name} (${institution.district}) - 주소: ${institution.address || '주소 없음'} - 위치: [${position[0]}, ${position[1]}]`);
          
          return (
            <Fragment key={index}>
              {/* 기관 위치에 작은 원 마커 */}
              <Circle
                center={position}
                radius={300} // 300미터 반경
                pathOptions={{
                  fillColor: '#2563eb',
                  fillOpacity: 0.8,
                  color: '#1e40af',
                  weight: 2
                }}
              >
                <Popup>
                  <div style={{ padding: '10px', minWidth: '250px', maxWidth: '350px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1f2937' }}>
                      {institution.name}
                    </h4>
                    <p style={{ margin: '0', color: '#6b7280' }}>
                      <strong>지역:</strong> {institution.region} {institution.district}
                    </p>
                    {institution.address && (
                      <p style={{ margin: '4px 0 0 0', color: '#4b5563', fontSize: '13px' }}>
                        <strong>주소:</strong> {institution.address}
                      </p>
                    )}
                    <p style={{ margin: '4px 0 0 0', color: '#2563eb' }}>
                      <strong>특화서비스:</strong> 제공
                    </p>
                    <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '12px' }}>
                      기관 번호: {index + 1}
                    </p>
                  </div>
                </Popup>
              </Circle>
              
              {/* 선 연결 */}
              <Polyline
                positions={[position, labelPosition]}
                pathOptions={{
                  color: '#1e40af',
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '5, 5'
                }}
              />
              
              {/* 라벨 마커 */}
              <Marker
                position={labelPosition}
                icon={L.divIcon({
                  html: `<div style="
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    border: 2px solid #2563eb;
                    text-align: center;
                  ">${index + 1}. ${institution.name}</div>`,
                  className: 'custom-label-icon',
                  iconSize: [150, 30],
                  iconAnchor: [75, 15]
                })}
              />
            </Fragment>
          );
        })}
          </MapContainer>
          
          {/* 지도 위 정보 오버레이 */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: '12px',
            minWidth: '180px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
              📍 특화서비스 기관: {institutions.length}개
            </div>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ 
                display: 'inline-block', 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#3b82f6', 
                opacity: 0.3, 
                marginRight: '6px',
                border: '1px solid #1d4ed8'
              }}></div>
              서비스 제공 지역
            </div>
            <div>
              <div style={{ 
                display: 'inline-block', 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#e5e7eb', 
                opacity: 0.3, 
                marginRight: '6px',
                border: '1px solid #9ca3af'
              }}></div>
              서비스 미제공 지역
            </div>
          </div>
        </div>
        
        {/* 우측 기관 목록 패널 */}
        <div style={{
          width: '300px',
          backgroundColor: 'white',
          borderLeft: '1px solid #e2e8f0',
          padding: '16px',
          overflowY: 'auto',
          maxHeight: '600px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#1f2937' }}>
            특화서비스 제공 기관 목록
          </h3>
          {Object.entries(institutionsByDistrict).map(([district, distInsts]) => (
            <div key={district} style={{ marginBottom: '16px' }}>
              <h4 style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: '#2563eb',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '4px',
                marginBottom: '8px'
              }}>
                {district} ({distInsts.length}개)
              </h4>
              {distInsts.map((inst, idx) => (
                <div key={idx} style={{
                  fontSize: '11px',
                  padding: '4px 0',
                  borderLeft: '3px solid #2563eb',
                  paddingLeft: '8px',
                  marginBottom: '4px',
                  backgroundColor: '#f8fafc'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    {institutions.findIndex(i => i.name === inst.name) + 1}. {inst.name}
                  </div>
                  {inst.address && (
                    <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px' }}>
                      {inst.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function InstitutionStatsPage() {
  const { institutionData } = useEmployeeStore();
  const [stats, setStats] = useState<any>({
    staffing: {},
    service: {},
    operation: {},
    regional: {},
    performance: {}
  });

  useEffect(() => {
    if (institutionData && institutionData.length > 0) {
      calculateStats();
    }
  }, [institutionData]);

  const calculateStats = () => {
    // 디버깅 로그 제거 (문제 해결됨)
    
    // 1. 인력 배치 및 충원 통계
    const staffingStats = {
      socialWorkers: {
        allocated: institutionData.reduce((sum, inst) => sum + (inst.allocatedSocialWorkers || 0), 0),
        hired: institutionData.reduce((sum, inst) => sum + (inst.hiredSocialWorkers || 0), 0),
        fillRate: 0
      },
      lifeSupport: {
        allocated: institutionData.reduce((sum, inst) => sum + (inst.allocatedLifeSupport || 0), 0),
        hired: institutionData.reduce((sum, inst) => sum + (inst.hiredLifeSupport || 0), 0),
        fillRate: 0
      },
      byRegion: [],
      byDistrict: [],
      yearlyTrend: [],
      distribution: []
    };

    staffingStats.socialWorkers.fillRate = staffingStats.socialWorkers.allocated > 0 
      ? (staffingStats.socialWorkers.hired / staffingStats.socialWorkers.allocated * 100).toFixed(1)
      : 0;
    
    staffingStats.lifeSupport.fillRate = staffingStats.lifeSupport.allocated > 0
      ? (staffingStats.lifeSupport.hired / staffingStats.lifeSupport.allocated * 100).toFixed(1)
      : 0;

    // 지역별 충원율
    const regionMap = new Map();
    institutionData.forEach(inst => {
      const region = inst.region || '기타';
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          name: region,
          allocated: 0,
          hired: 0,
          institutions: 0
        });
      }
      const data = regionMap.get(region);
      data.allocated += (inst.allocatedSocialWorkers || 0) + (inst.allocatedLifeSupport || 0);
      data.hired += (inst.hiredSocialWorkers || 0) + (inst.hiredLifeSupport || 0);
      data.institutions += 1;
    });

    staffingStats.byRegion = Array.from(regionMap.values()).map(r => ({
      ...r,
      fillRate: r.allocated > 0 ? ((r.hired / r.allocated) * 100).toFixed(1) : 0
    }));

    // 시군구별 충원율
    const districtMap = new Map();
    institutionData.forEach(inst => {
      const district = inst.district || '기타';
      const region = inst.region || '기타';
      const key = `${region}-${district}`;
      
      if (!districtMap.has(key)) {
        districtMap.set(key, {
          region,
          district,
          allocated: 0,
          hired: 0,
          institutions: 0,
          socialWorkersAllocated: 0,
          socialWorkersHired: 0,
          lifeSupportAllocated: 0,
          lifeSupportHired: 0,
          targets: 0,
          providedTotal: 0
        });
      }
      const data = districtMap.get(key);
      data.socialWorkersAllocated += (inst.allocatedSocialWorkers || 0);
      data.socialWorkersHired += (inst.hiredSocialWorkers || 0);
      data.lifeSupportAllocated += (inst.allocatedLifeSupport || 0);
      data.lifeSupportHired += (inst.hiredLifeSupport || 0);
      data.allocated += (inst.allocatedSocialWorkers || 0) + (inst.allocatedLifeSupport || 0);
      data.hired += (inst.hiredSocialWorkers || 0) + (inst.hiredLifeSupport || 0);
      data.targets += (inst.allocatedTargets || 0);
      data.providedTotal += (inst.providedGeneral || 0) + (inst.providedIntensive || 0) + (inst.providedSpecialized || 0);
      data.institutions += 1;
    });

    staffingStats.byDistrict = Array.from(districtMap.values()).map(d => ({
      ...d,
      fillRate: d.allocated > 0 ? ((d.hired / d.allocated) * 100).toFixed(1) : 0,
      socialWorkerFillRate: d.socialWorkersAllocated > 0 ? ((d.socialWorkersHired / d.socialWorkersAllocated) * 100).toFixed(1) : 0,
      lifeSupportFillRate: d.lifeSupportAllocated > 0 ? ((d.lifeSupportHired / d.lifeSupportAllocated) * 100).toFixed(1) : 0,
      serviceRate: d.targets > 0 ? ((d.providedTotal / d.targets) * 100).toFixed(1) : 0
    })).sort((a, b) => {
      if (a.region !== b.region) return a.region.localeCompare(b.region);
      return a.district.localeCompare(b.district);
    });

    // 연도별 인력 변동 추이
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    staffingStats.yearlyTrend = years.map(year => ({
      year,
      count: institutionData.filter(inst => inst[`year${year}`] === 'O').length
    }));

    // 직종별 분포
    staffingStats.distribution = [
      { name: '전담사회복지사', value: staffingStats.socialWorkers.hired },
      { name: '생활지원사', value: staffingStats.lifeSupport.hired }
    ];

    // 2. 서비스 제공 현황 통계
    const serviceStats = {
      byType: [],
      targetServiceRate: {},
      elderlyJobUsage: 0,
      specializedServices: []
    };

    // 서비스 유형별 기관 분포
    const serviceTypes = [
      { key: 'specializedService', name: '특화서비스' },
      { key: 'emergencyService', name: '응급안전안심서비스' },
      { key: 'homeVisitService', name: '방문요양서비스' },
      { key: 'elderlyWelfareService', name: '재가노인복지서비스' },
      { key: 'socialServiceOrg', name: '사회서비스원 소속' },
      { key: 'elderlyJobDispatch', name: '노인일자리 파견' }
    ];

    // 서비스 제공 여부를 판단하는 함수 (실제 데이터: "해당", "해당없음")
    const isServiceProvided = (value, institutionData = null, serviceType = null) => {
      if (!value) return false;
      const normalizedValue = value.toString().trim();
      
      // 사회서비스원 소속의 경우 특별 처리
      if (serviceType === 'socialServiceOrg' && institutionData) {
        // 광역지원기관이거나 사회서비스원이 기관명에 포함된 경우
        return institutionData.district?.includes('광역지원기관') || 
               institutionData.name?.includes('사회서비스원') ||
               institutionData.facilityType?.includes('사회서비스원') ||
               normalizedValue === '해당';
      }
      
      // 실제 데이터에서 사용되는 "해당"을 기준으로 판단
      return normalizedValue === '해당';
    };

    serviceStats.byType = serviceTypes.map(type => {
      const count = institutionData.filter(inst => isServiceProvided(inst[type.key], inst, type.key)).length;
      
      // 디버깅 로그 제거 (문제 해결됨)
      
      return {
        name: type.name,
        count
      };
    });

    // 대상자 서비스 제공율
    const totalAllocatedTargets = institutionData.reduce((sum, inst) => sum + (inst.allocatedTargets || 0), 0);
    const totalProvidedGeneral = institutionData.reduce((sum, inst) => sum + (inst.providedGeneral || 0), 0);
    const totalProvidedIntensive = institutionData.reduce((sum, inst) => sum + (inst.providedIntensive || 0), 0);
    const totalProvidedSpecialized = institutionData.reduce((sum, inst) => sum + (inst.providedSpecialized || 0), 0);

    serviceStats.targetServiceRate = {
      allocated: totalAllocatedTargets,
      general: totalProvidedGeneral,
      intensive: totalProvidedIntensive,
      specialized: totalProvidedSpecialized,
      total: totalProvidedGeneral + totalProvidedIntensive + totalProvidedSpecialized,
      rate: totalAllocatedTargets > 0 
        ? ((totalProvidedGeneral + totalProvidedIntensive + totalProvidedSpecialized) / totalAllocatedTargets * 100).toFixed(1)
        : 0
    };

    // 노인일자리 파견 활용 현황
    serviceStats.elderlyJobUsage = institutionData.filter(inst => 
      isServiceProvided(inst.elderlyJobDispatch, inst, 'elderlyJobDispatch')
    ).length;

    // 3. 기관 운영 특성 분석
    const operationStats = {
      byContractPeriod: [],
      byFacilityType: [],
      contractTypeDistribution: [],
      expiringInstitutions: []
    };

    // 위수탁 기간별 분포 및 2025년 종료 기관 찾기
    const contractPeriodMap = new Map();
    const expiringInstitutionsList = [];
    
    institutionData.forEach(inst => {
      const period = inst.contractPeriod || '미지정';
      contractPeriodMap.set(period, (contractPeriodMap.get(period) || 0) + 1);
      
      // 2025년에 종료되는 기관 찾기 (다양한 형식 지원)
      if (period && (
        period.includes('2025.12.31') || 
        period.includes('~2025.12.31') ||
        period.includes('2025-12-31') ||
        period.includes('~2025-12-31') ||
        period.includes('2025.12') ||
        period.includes('~2025.12') ||
        period.match(/~\s*2025\s*$/i) ||
        period.match(/~\s*2025\.12/i) ||
        period.match(/2025\s*년\s*12\s*월/i)
      )) {
        expiringInstitutionsList.push({
          name: inst.name,
          code: inst.code,
          region: inst.region,
          district: inst.district,
          contractPeriod: period,
          contractType: inst.contractType,
          socialWorkers: inst.hiredSocialWorkers || 0,
          lifeSupport: inst.hiredLifeSupport || 0
        });
      }
    });

    operationStats.byContractPeriod = Array.from(contractPeriodMap.entries()).map(([period, count]) => ({
      name: period,
      count,
      isExpiring: period && (
        period.includes('2025.12.31') || 
        period.includes('~2025.12.31') ||
        period.includes('2025-12-31') ||
        period.includes('~2025-12-31') ||
        period.includes('2025.12') ||
        period.includes('~2025.12') ||
        period.match(/~\s*2025\s*$/i) ||
        period.match(/~\s*2025\.12/i) ||
        period.match(/2025\s*년\s*12\s*월/i)
      ) // 2025년 12월 종료 여부 체크
    }));
    
    operationStats.expiringInstitutions = expiringInstitutionsList;

    // 시설유형별 분포
    const facilityTypeMap = new Map();
    institutionData.forEach(inst => {
      const type = inst.facilityType || '기타';
      facilityTypeMap.set(type, (facilityTypeMap.get(type) || 0) + 1);
    });

    operationStats.byFacilityType = Array.from(facilityTypeMap.entries()).map(([type, count]) => ({
      name: type,
      value: count
    }));

    // 4. 지역별 격차 분석
    const regionalStats = {
      institutionDensity: [],
      districtDensity: [],
      staffingEfficiency: [],
      specializedByRegion: []
    };

    // 광역시별 기관 밀도
    regionalStats.institutionDensity = staffingStats.byRegion.map(r => ({
      name: r.name,
      institutions: r.institutions,
      staffPerInstitution: r.institutions > 0 ? (r.hired / r.institutions).toFixed(1) : 0
    }));

    // 시군구별 기관 밀도 (상위 20개 시군구)
    regionalStats.districtDensity = staffingStats.byDistrict
      .map(d => ({
        name: `${d.region} ${d.district}`,
        region: d.region,
        district: d.district,
        institutions: d.institutions,
        totalStaff: d.hired,
        staffPerInstitution: d.institutions > 0 ? (d.hired / d.institutions).toFixed(1) : 0,
        fillRate: parseFloat(d.fillRate)
      }))
      .sort((a, b) => b.institutions - a.institutions)
      .slice(0, 20);

    // 지역별 인력 배치 효율성
    regionalStats.staffingEfficiency = staffingStats.byRegion.map(r => ({
      region: r.name,
      efficiency: parseFloat(r.fillRate),
      allocated: r.allocated,
      hired: r.hired
    }));

    // 지역별 특화서비스 제공 현황
    const regionalSpecializedMap = new Map();
    const specializedServiceInstitutions = []; // 특화서비스 제공 기관 리스트
    
    institutionData.forEach(inst => {
      const region = inst.region || '기타';
      if (!regionalSpecializedMap.has(region)) {
        regionalSpecializedMap.set(region, {
          region,
          specialized: 0,
          emergency: 0,
          homeVisit: 0,
          elderlyWelfare: 0,
          socialServiceOrg: 0,
          elderlyJobDispatch: 0,
          total: 0
        });
      }
      const data = regionalSpecializedMap.get(region);
      
      // 서비스 제공 여부를 판단하는 함수 (실제 데이터: "해당", "해당없음")
      const isYes = (value, inst, serviceType) => {
        if (!value) return false;
        const normalizedValue = value.toString().trim();
        
        // 사회서비스원 소속의 경우 특별 처리
        if (serviceType === 'socialServiceOrg') {
          // 광역지원기관이거나 사회서비스원이 기관명에 포함된 경우
          return inst.district?.includes('광역지원기관') || 
                 inst.name?.includes('사회서비스원') ||
                 inst.facilityType?.includes('사회서비스원') ||
                 normalizedValue === '해당';
        }
        
        return normalizedValue === '해당';
      };
      
      if (isYes(inst.specializedService, inst, 'specializedService')) {
        data.specialized++;
        // 특화서비스 제공 기관 리스트에 추가
        specializedServiceInstitutions.push({
          name: inst.name,
          code: inst.code,
          region: inst.region,
          district: inst.district,
          manager: inst.manager,
          mainContact: inst.mainContact,
          address: inst.address // 주소 추가
        });
      }
      if (isYes(inst.emergencyService, inst, 'emergencyService')) data.emergency++;
      if (isYes(inst.homeVisitService, inst, 'homeVisitService')) data.homeVisit++;
      if (isYes(inst.elderlyWelfareService, inst, 'elderlyWelfareService')) data.elderlyWelfare++;
      if (isYes(inst.socialServiceOrg, inst, 'socialServiceOrg')) data.socialServiceOrg++;
      if (isYes(inst.elderlyJobDispatch, inst, 'elderlyJobDispatch')) data.elderlyJobDispatch++;
      data.total++;
    });

    regionalStats.specializedByRegion = Array.from(regionalSpecializedMap.values());
    regionalStats.specializedServiceInstitutions = specializedServiceInstitutions; // 특화서비스 제공 기관 리스트 추가

    // 5. 종합 성과 지표
    const performanceStats = {
      efficiency: [],
      serviceDiversity: [],
      topPerformers: []
    };

    // 기관 효율성 지수 계산
    const institutionEfficiency = institutionData.map(inst => {
      const staffEfficiency = (inst.allocatedSocialWorkers + inst.allocatedLifeSupport) > 0
        ? ((inst.hiredSocialWorkers + inst.hiredLifeSupport) / (inst.allocatedSocialWorkers + inst.allocatedLifeSupport))
        : 0;
      
      const serviceEfficiency = inst.allocatedTargets > 0
        ? ((inst.providedGeneral + inst.providedIntensive + inst.providedSpecialized) / inst.allocatedTargets)
        : 0;

      const efficiencyIndex = (staffEfficiency * serviceEfficiency * 100).toFixed(1);

      // 서비스 다양성 지수
      let serviceDiversity = 0;
      if (inst.specializedService === 'Y') serviceDiversity++;
      if (inst.emergencyService === 'Y') serviceDiversity++;
      if (inst.homeVisitService === 'Y') serviceDiversity++;
      if (inst.elderlyWelfareService === 'Y') serviceDiversity++;

      return {
        name: inst.name,
        region: inst.region,
        efficiencyIndex: parseFloat(efficiencyIndex),
        serviceDiversity,
        staffEfficiency: (staffEfficiency * 100).toFixed(1),
        serviceEfficiency: (serviceEfficiency * 100).toFixed(1)
      };
    });

    // 상위 10개 기관
    performanceStats.topPerformers = institutionEfficiency
      .sort((a, b) => b.efficiencyIndex - a.efficiencyIndex)
      .slice(0, 10);

    // 효율성 분포
    performanceStats.efficiency = [
      { range: '0-20%', count: institutionEfficiency.filter(i => i.efficiencyIndex < 20).length },
      { range: '20-40%', count: institutionEfficiency.filter(i => i.efficiencyIndex >= 20 && i.efficiencyIndex < 40).length },
      { range: '40-60%', count: institutionEfficiency.filter(i => i.efficiencyIndex >= 40 && i.efficiencyIndex < 60).length },
      { range: '60-80%', count: institutionEfficiency.filter(i => i.efficiencyIndex >= 60 && i.efficiencyIndex < 80).length },
      { range: '80-100%', count: institutionEfficiency.filter(i => i.efficiencyIndex >= 80).length }
    ];

    setStats({
      staffing: staffingStats,
      service: serviceStats,
      operation: operationStats,
      regional: regionalStats,
      performance: performanceStats
    });
  };

  if (!institutionData || institutionData.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">기관 데이터가 없습니다. 먼저 기관 현황 데이터를 업로드해주세요.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">기관 현황 통계</h1>
        <p className="text-muted-foreground mt-2">기관별 운영 현황과 성과를 분석합니다</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{institutionData.length}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">총 기관 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {stats.staffing.socialWorkers?.hired + stats.staffing.lifeSupport?.hired || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">총 인력</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {((stats.staffing.socialWorkers?.fillRate || 0) * 0.5 + (stats.staffing.lifeSupport?.fillRate || 0) * 0.5).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">평균 충원율</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.staffing.byRegion?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">운영 지역</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.service.targetServiceRate?.rate || 0}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">서비스 제공율</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staffing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="staffing">인력 배치</TabsTrigger>
          <TabsTrigger value="service">서비스 제공</TabsTrigger>
          <TabsTrigger value="operation">기관 운영</TabsTrigger>
          <TabsTrigger value="regional">지역별 분석</TabsTrigger>
          <TabsTrigger value="district">시군구 분석</TabsTrigger>
          <TabsTrigger value="performance">종합 성과</TabsTrigger>
        </TabsList>

        <TabsContent value="staffing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>직종별 충원 현황</CardTitle>
                <CardDescription>전담사회복지사와 생활지원사 충원율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">전담사회복지사</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.staffing.socialWorkers?.hired}/{stats.staffing.socialWorkers?.allocated} ({stats.staffing.socialWorkers?.fillRate}%)
                      </span>
                    </div>
                    <Progress value={parseFloat(stats.staffing.socialWorkers?.fillRate || 0)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">생활지원사</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.staffing.lifeSupport?.hired}/{stats.staffing.lifeSupport?.allocated} ({stats.staffing.lifeSupport?.fillRate}%)
                      </span>
                    </div>
                    <Progress value={parseFloat(stats.staffing.lifeSupport?.fillRate || 0)} />
                  </div>
                </div>
                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.staffing.distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}명`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.staffing.distribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>지역별 충원율</CardTitle>
                <CardDescription>시도별 인력 충원 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.staffing.byRegion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="fillRate" fill="#8884d8" name="충원율(%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>연도별 사업 수행 기관 추이</CardTitle>
                <CardDescription>2020년부터 2025년까지 사업 수행 기관 수 변화</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.staffing.yearlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" name="기관 수" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="service" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>서비스 유형별 제공 현황</CardTitle>
                <CardDescription>기관에서 제공하는 서비스 종류</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.service.byType} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    노인일자리 파견 활용 기관: <span className="font-bold">{stats.service.elderlyJobUsage}개</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>대상자 서비스 제공율</CardTitle>
                <CardDescription>배정 대비 실제 서비스 제공 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">배정 인원</span>
                    <Badge variant="outline">{stats.service.targetServiceRate?.allocated}명</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">일반 서비스</span>
                    <Badge>{stats.service.targetServiceRate?.general}명</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">중점 서비스</span>
                    <Badge>{stats.service.targetServiceRate?.intensive}명</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">특화 서비스</span>
                    <Badge>{stats.service.targetServiceRate?.specialized}명</Badge>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">총 제공 인원</span>
                      <Badge variant="default">{stats.service.targetServiceRate?.total}명</Badge>
                    </div>
                    <div className="mt-2">
                      <Progress value={parseFloat(stats.service.targetServiceRate?.rate || 0)} className="h-3" />
                      <p className="text-sm text-muted-foreground mt-1 text-center">
                        제공율: {stats.service.targetServiceRate?.rate}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>위수탁 기간별 분포</CardTitle>
                <CardDescription>
                  기관의 위수탁 계약 기간 현황
                  {stats.operation.expiringInstitutions?.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      2025.12.31 종료: {stats.operation.expiringInstitutions.length}개
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.operation.byContractPeriod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-md shadow-lg">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm">기관 수: {data.count}개</p>
                              {data.isExpiring && (
                                <p className="text-sm text-red-600 font-bold">⚠️ 2025년 종료 예정</p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count">
                      {stats.operation.byContractPeriod?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isExpiring ? "#EF4444" : "#FFBB28"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>시설 유형별 분포</CardTitle>
                <CardDescription>기관의 시설 유형 분류</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.operation.byFacilityType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.operation.byFacilityType?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 2025년 종료 예정 기관 리스트 */}
          {stats.operation.expiringInstitutions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>2025.12.31 위수탁 계약 종료 예정 기관</span>
                  <Badge variant="destructive">{stats.operation.expiringInstitutions.length}개</Badge>
                </CardTitle>
                <CardDescription>
                  2025년 12월 31일에 위수탁 계약이 종료되는 기관 목록입니다. 계약 갱신 또는 재계약이 필요합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-red-50">
                        <th className="text-left p-2">기관코드</th>
                        <th className="text-left p-2">기관명</th>
                        <th className="text-left p-2">지역</th>
                        <th className="text-left p-2">시군구</th>
                        <th className="text-center p-2">계약기간</th>
                        <th className="text-center p-2">계약구분</th>
                        <th className="text-center p-2">전담사회복지사</th>
                        <th className="text-center p-2">생활지원사</th>
                        <th className="text-center p-2">총 인력</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.operation.expiringInstitutions?.map((inst, index) => (
                        <tr key={index} className="border-b hover:bg-red-50/50">
                          <td className="p-2 font-mono text-xs">{inst.code}</td>
                          <td className="p-2 font-medium">{inst.name}</td>
                          <td className="p-2">{inst.region}</td>
                          <td className="p-2">{inst.district}</td>
                          <td className="text-center p-2">
                            <Badge variant="destructive" className="font-mono text-xs">
                              {inst.contractPeriod}
                            </Badge>
                          </td>
                          <td className="text-center p-2">{inst.contractType || '-'}</td>
                          <td className="text-center p-2">{inst.socialWorkers}명</td>
                          <td className="text-center p-2">{inst.lifeSupport}명</td>
                          <td className="text-center p-2 font-bold">
                            {inst.socialWorkers + inst.lifeSupport}명
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-red-100 font-bold">
                        <td colSpan={6} className="p-2">합계</td>
                        <td className="text-center p-2">
                          {stats.operation.expiringInstitutions?.reduce((sum, inst) => sum + inst.socialWorkers, 0)}명
                        </td>
                        <td className="text-center p-2">
                          {stats.operation.expiringInstitutions?.reduce((sum, inst) => sum + inst.lifeSupport, 0)}명
                        </td>
                        <td className="text-center p-2">
                          {stats.operation.expiringInstitutions?.reduce((sum, inst) => sum + inst.socialWorkers + inst.lifeSupport, 0)}명
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ 주의사항:</strong> 위 기관들은 2025년 12월 31일에 위수탁 계약이 종료됩니다. 
                    서비스 연속성을 위해 사전에 계약 갱신 또는 재입찰 절차를 진행해야 합니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>지역별 기관 밀도</CardTitle>
                <CardDescription>광역시도별 기관 수와 평균 인력</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.regional.institutionDensity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="institutions" fill="#8884d8" name="기관 수" />
                    <Bar yAxisId="right" dataKey="staffPerInstitution" fill="#82ca9d" name="기관당 평균 인력" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>지역별 인력 배치 효율성</CardTitle>
                <CardDescription>배정 대비 채용 인원 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={stats.regional.staffingEfficiency}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="region" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="효율성(%)" dataKey="efficiency" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>시군구별 기관 밀도 (상위 20개)</CardTitle>
                <CardDescription>기관 수가 많은 상위 20개 시군구의 기관 밀도와 인력 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={stats.regional.districtDensity}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="district" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-md shadow-lg">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm">기관수: {data.institutions}개</p>
                              <p className="text-sm">총 인력: {data.totalStaff}명</p>
                              <p className="text-sm">기관당 인력: {data.staffPerInstitution}명</p>
                              <p className="text-sm">충원율: {data.fillRate}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="institutions" fill="#3B82F6" name="기관 수" />
                    <Bar yAxisId="right" dataKey="staffPerInstitution" fill="#10B981" name="기관당 평균 인력" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">상세 현황</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-2">순위</th>
                          <th className="text-left p-2">광역시</th>
                          <th className="text-left p-2">시군구</th>
                          <th className="text-center p-2">기관수</th>
                          <th className="text-center p-2">총 인력</th>
                          <th className="text-center p-2">기관당 인력</th>
                          <th className="text-center p-2">충원율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.regional.districtDensity?.map((district, index) => (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-2 font-medium">{index + 1}</td>
                            <td className="p-2">{district.region}</td>
                            <td className="p-2 font-medium">{district.district}</td>
                            <td className="text-center p-2">{district.institutions}개</td>
                            <td className="text-center p-2">{district.totalStaff}명</td>
                            <td className="text-center p-2">{district.staffPerInstitution}명</td>
                            <td className="text-center p-2">
                              <Badge variant={district.fillRate >= 90 ? "default" : "destructive"}>
                                {district.fillRate}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>지역별 특화서비스 제공 현황</CardTitle>
                <CardDescription>각 지역의 특화 서비스 제공 기관 수</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-2">지역</th>
                        <th className="text-center p-2">특화서비스</th>
                        <th className="text-center p-2">응급안전</th>
                        <th className="text-center p-2">방문요양</th>
                        <th className="text-center p-2">재가복지</th>
                        <th className="text-center p-2">사회서비스원</th>
                        <th className="text-center p-2">노인일자리</th>
                        <th className="text-center p-2">전체 기관</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.regional.specializedByRegion?.map((region, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-medium">{region.region}</td>
                          <td className="text-center p-2">
                            <Badge variant={region.specialized > 0 ? "default" : "secondary"}>
                              {region.specialized}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant={region.emergency > 0 ? "default" : "secondary"}>
                              {region.emergency}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant={region.homeVisit > 0 ? "default" : "secondary"}>
                              {region.homeVisit}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant={region.elderlyWelfare > 0 ? "default" : "secondary"}>
                              {region.elderlyWelfare}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant={region.socialServiceOrg > 0 ? "default" : "secondary"}>
                              {region.socialServiceOrg}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant={region.elderlyJobDispatch > 0 ? "default" : "secondary"}>
                              {region.elderlyJobDispatch}
                            </Badge>
                          </td>
                          <td className="text-center p-2 font-bold">{region.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td className="p-2">합계</td>
                        <td className="text-center p-2">
                          {stats.regional.specializedByRegion?.reduce((sum, r) => sum + r.specialized, 0)}
                        </td>
                        <td className="text-center p-2">
                          {stats.regional.specializedByRegion?.reduce((sum, r) => sum + r.emergency, 0)}
                        </td>
                        <td className="text-center p-2">
                          {stats.regional.specializedByRegion?.reduce((sum, r) => sum + r.homeVisit, 0)}
                        </td>
                        <td className="text-center p-2">
                          {stats.regional.specializedByRegion?.reduce((sum, r) => sum + r.elderlyWelfare, 0)}
                        </td>
                        <td className="text-center p-2">
                          {stats.regional.specializedByRegion?.reduce((sum, r) => sum + r.socialServiceOrg, 0)}
                        </td>
                        <td className="text-center p-2">
                          {stats.regional.specializedByRegion?.reduce((sum, r) => sum + r.elderlyJobDispatch, 0)}
                        </td>
                        <td className="text-center p-2">
                          {stats.regional.specializedByRegion?.reduce((sum, r) => sum + r.total, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 특화서비스 제공 기관 리스트 */}
            {stats.regional.specializedServiceInstitutions?.length > 0 && (
              <>
                {/* 경상남도 지도 */}
                {stats.regional.specializedServiceInstitutions?.some(inst => inst.region === '경상남도') && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>경상남도 특화서비스 제공 기관 분포도</span>
                        <Badge variant="default">
                          {stats.regional.specializedServiceInstitutions?.filter(inst => inst.region === '경상남도').length}개
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        경상남도 내 특화서비스를 제공하는 기관들의 지역별 분포를 보여줍니다.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LeafletMap 
                        institutions={stats.regional.specializedServiceInstitutions?.filter(inst => inst.region === '경상남도').map(inst => ({
                          ...inst,
                          address: inst.address || undefined
                        })) || []}
                      />
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          <span className="font-medium">특화서비스 제공 기관</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          지도의 마커를 클릭하면 기관 정보를 확인할 수 있습니다. 마우스 휠로 확대/축소 가능합니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>특화서비스 제공 기관 목록</span>
                      <Badge variant="default">{stats.regional.specializedServiceInstitutions.length}개</Badge>
                    </CardTitle>
                    <CardDescription>
                      특화서비스를 제공하는 기관들의 상세 정보입니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-blue-50">
                            <th className="text-left p-2">순번</th>
                            <th className="text-left p-2">기관코드</th>
                            <th className="text-left p-2">기관명</th>
                            <th className="text-left p-2">광역시</th>
                            <th className="text-left p-2">시군구</th>
                            <th className="text-left p-2">주소</th>
                            <th className="text-left p-2">기관장</th>
                            <th className="text-left p-2">연락처</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.regional.specializedServiceInstitutions?.map((inst, index) => (
                            <tr key={index} className="border-b hover:bg-blue-50/50">
                              <td className="p-2 font-medium">{index + 1}</td>
                              <td className="p-2 font-mono text-xs">{inst.code}</td>
                              <td className="p-2 font-medium">{inst.name}</td>
                              <td className="p-2">{inst.region}</td>
                              <td className="p-2">{inst.district}</td>
                              <td className="p-2 text-xs">{inst.address || '-'}</td>
                              <td className="p-2">{inst.manager || '-'}</td>
                              <td className="p-2">{inst.mainContact || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="district" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>시군구별 상세 현황</CardTitle>
                <CardDescription>각 시군구의 인력 충원 및 서비스 제공 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-2 sticky left-0 bg-slate-50">광역시</th>
                        <th className="text-left p-2">시군구</th>
                        <th className="text-center p-2">기관수</th>
                        <th className="text-center p-2">전담사회복지사<br/>배정</th>
                        <th className="text-center p-2">전담사회복지사<br/>채용</th>
                        <th className="text-center p-2 bg-blue-50">충원율(%)</th>
                        <th className="text-center p-2">생활지원사<br/>배정</th>
                        <th className="text-center p-2">생활지원사<br/>채용</th>
                        <th className="text-center p-2 bg-green-50">충원율(%)</th>
                        <th className="text-center p-2">전체<br/>충원율(%)</th>
                        <th className="text-center p-2">대상자<br/>배정</th>
                        <th className="text-center p-2">서비스<br/>제공</th>
                        <th className="text-center p-2 bg-purple-50">제공율(%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.staffing.byDistrict?.map((district, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-medium sticky left-0 bg-white">{district.region}</td>
                          <td className="p-2">{district.district}</td>
                          <td className="text-center p-2 font-medium">{district.institutions}</td>
                          <td className="text-center p-2">{district.socialWorkersAllocated}</td>
                          <td className="text-center p-2">{district.socialWorkersHired}</td>
                          <td className="text-center p-2 bg-blue-50 font-medium">
                            <Badge variant={parseFloat(district.socialWorkerFillRate) >= 90 ? "default" : "destructive"}>
                              {district.socialWorkerFillRate}%
                            </Badge>
                          </td>
                          <td className="text-center p-2">{district.lifeSupportAllocated}</td>
                          <td className="text-center p-2">{district.lifeSupportHired}</td>
                          <td className="text-center p-2 bg-green-50 font-medium">
                            <Badge variant={parseFloat(district.lifeSupportFillRate) >= 90 ? "default" : "destructive"}>
                              {district.lifeSupportFillRate}%
                            </Badge>
                          </td>
                          <td className="text-center p-2 font-bold">
                            <Badge variant={parseFloat(district.fillRate) >= 90 ? "default" : "destructive"}>
                              {district.fillRate}%
                            </Badge>
                          </td>
                          <td className="text-center p-2">{district.targets}</td>
                          <td className="text-center p-2">{district.providedTotal}</td>
                          <td className="text-center p-2 bg-purple-50 font-medium">
                            <Badge variant={parseFloat(district.serviceRate) >= 90 ? "default" : "destructive"}>
                              {district.serviceRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td className="p-2 sticky left-0 bg-slate-100">합계</td>
                        <td className="p-2">-</td>
                        <td className="text-center p-2">{institutionData.length}</td>
                        <td className="text-center p-2">{stats.staffing.socialWorkers?.allocated}</td>
                        <td className="text-center p-2">{stats.staffing.socialWorkers?.hired}</td>
                        <td className="text-center p-2 bg-blue-100">{stats.staffing.socialWorkers?.fillRate}%</td>
                        <td className="text-center p-2">{stats.staffing.lifeSupport?.allocated}</td>
                        <td className="text-center p-2">{stats.staffing.lifeSupport?.hired}</td>
                        <td className="text-center p-2 bg-green-100">{stats.staffing.lifeSupport?.fillRate}%</td>
                        <td className="text-center p-2">
                          {((parseFloat(stats.staffing.socialWorkers?.fillRate || 0) + parseFloat(stats.staffing.lifeSupport?.fillRate || 0)) / 2).toFixed(1)}%
                        </td>
                        <td className="text-center p-2">{stats.service.targetServiceRate?.allocated}</td>
                        <td className="text-center p-2">{stats.service.targetServiceRate?.total}</td>
                        <td className="text-center p-2 bg-purple-100">{stats.service.targetServiceRate?.rate}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>시군구별 충원율 TOP 10</CardTitle>
                  <CardDescription>인력 충원율이 높은 상위 10개 시군구</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.staffing.byDistrict
                      ?.sort((a, b) => parseFloat(b.fillRate) - parseFloat(a.fillRate))
                      .slice(0, 10)
                      .map((district, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                          <div className="flex items-center gap-3">
                            <Badge variant={index < 3 ? "default" : "secondary"}>
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">{district.region} {district.district}</p>
                              <p className="text-xs text-muted-foreground">기관수: {district.institutions}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{district.fillRate}%</p>
                            <p className="text-xs text-muted-foreground">
                              {district.hired}/{district.allocated}명
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>시군구별 서비스 제공율 TOP 10</CardTitle>
                  <CardDescription>대상자 서비스 제공율이 높은 상위 10개 시군구</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.staffing.byDistrict
                      ?.sort((a, b) => parseFloat(b.serviceRate) - parseFloat(a.serviceRate))
                      .slice(0, 10)
                      .map((district, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                          <div className="flex items-center gap-3">
                            <Badge variant={index < 3 ? "default" : "secondary"}>
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">{district.region} {district.district}</p>
                              <p className="text-xs text-muted-foreground">기관수: {district.institutions}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{district.serviceRate}%</p>
                            <p className="text-xs text-muted-foreground">
                              {district.providedTotal}/{district.targets}명
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>시군구별 충원 현황 차트</CardTitle>
                <CardDescription>전담사회복지사와 생활지원사 충원율 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={stats.staffing.byDistrict?.slice(0, 20)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="district" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-md shadow-lg">
                              <p className="font-medium">{data.region} {data.district}</p>
                              <p className="text-sm">기관수: {data.institutions}</p>
                              <p className="text-sm text-blue-600">전담사회복지사: {data.socialWorkerFillRate}%</p>
                              <p className="text-sm text-green-600">생활지원사: {data.lifeSupportFillRate}%</p>
                              <p className="text-sm font-bold">전체 충원율: {data.fillRate}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="socialWorkerFillRate" fill="#3B82F6" name="전담사회복지사 충원율(%)" />
                    <Bar dataKey="lifeSupportFillRate" fill="#10B981" name="생활지원사 충원율(%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>기관 효율성 분포</CardTitle>
                <CardDescription>효율성 지수별 기관 분포</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.performance.efficiency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>상위 성과 기관</CardTitle>
                <CardDescription>종합 효율성 지수 상위 10개 기관</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {stats.performance.topPerformers?.map((inst, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{inst.name}</p>
                          <p className="text-xs text-muted-foreground">{inst.region}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{inst.efficiencyIndex}%</p>
                        <p className="text-xs text-muted-foreground">
                          서비스: {inst.serviceDiversity}종
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}