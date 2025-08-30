import React from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 기본 아이콘 설정 수정
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapData {
  district: string;
  value?: number;
  label?: string;
  color?: string;
  description?: string;
}

interface GyeongsangnamMapProps {
  data?: MapData[];
  showLabels?: boolean;
  colorScheme?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  title?: string;
  height?: string;
  onDistrictClick?: (districtName: string) => void;
}

export default function GyeongsangnamMap({ 
  data = [], 
  showLabels = true,
  colorScheme = 'blue',
  title,
  height = '500px',
  onDistrictClick
}: GyeongsangnamMapProps) {
  // 색상 스키마 정의 - 더 뚜렷한 대비
  const colorSchemes = {
    blue: {
      high: '#0c4a6e',    // 진한 파란색
      medium: '#0ea5e9',  // 중간 파란색
      low: '#bae6fd',     // 연한 파란색
      veryLow: '#e0f2fe', // 매우 연한 파란색
      none: '#f1f5f9'     // 회색
    },
    green: {
      high: '#14532d',    // 진한 초록색
      medium: '#16a34a',  // 중간 초록색
      low: '#86efac',     // 연한 초록색
      veryLow: '#dcfce7', // 매우 연한 초록색
      none: '#f1f5f9'
    },
    red: {
      high: '#7f1d1d',    // 진한 빨간색
      medium: '#dc2626',  // 중간 빨간색
      low: '#fca5a5',     // 연한 빨간색
      veryLow: '#fee2e2', // 매우 연한 빨간색
      none: '#f1f5f9'
    },
    purple: {
      high: '#581c87',    // 진한 보라색
      medium: '#9333ea',  // 중간 보라색
      low: '#d8b4fe',     // 연한 보라색
      veryLow: '#f3e8ff', // 매우 연한 보라색
      none: '#f1f5f9'
    },
    orange: {
      high: '#7c2d12',    // 진한 주황색
      medium: '#ea580c',  // 중간 주황색
      low: '#fdba74',     // 연한 주황색
      veryLow: '#fed7aa', // 매우 연한 주황색
      none: '#f1f5f9'
    }
  };

  const colors = colorSchemes[colorScheme];

  // 경상남도 시군구별 행정 경계 좌표 (실제 경계에 가깝게 조정)
  const districtBoundaries = [
    {
      name: '창원시',
      coordinates: [
        [35.15, 128.55], [35.15, 128.75], [35.30, 128.75], 
        [35.32, 128.70], [35.32, 128.60], [35.28, 128.55],
        [35.15, 128.55]
      ]
    },
    {
      name: '김해시',
      coordinates: [
        [35.18, 128.85], [35.18, 128.95], [35.30, 128.95], 
        [35.30, 128.88], [35.25, 128.85], [35.18, 128.85]
      ]
    },
    {
      name: '진주시',
      coordinates: [
        [35.12, 128.02], [35.12, 128.20], [35.23, 128.20], 
        [35.23, 128.02], [35.12, 128.02]
      ]
    },
    {
      name: '양산시',
      coordinates: [
        [35.30, 128.97], [35.30, 129.12], [35.40, 129.12],
        [35.40, 128.97], [35.30, 128.97]
      ]
    },
    {
      name: '거제시',
      coordinates: [
        [34.82, 128.55], [34.82, 128.72], [34.94, 128.72],
        [34.94, 128.55], [34.82, 128.55]
      ]
    },
    {
      name: '통영시',
      coordinates: [
        [34.78, 128.35], [34.78, 128.50], [34.92, 128.50],
        [34.92, 128.35], [34.78, 128.35]
      ]
    },
    {
      name: '사천시',
      coordinates: [
        [34.92, 127.98], [34.92, 128.15], [35.08, 128.15],
        [35.08, 127.98], [34.92, 127.98]
      ]
    },
    {
      name: '밀양시',
      coordinates: [
        [35.42, 128.68], [35.42, 128.85], [35.58, 128.85],
        [35.58, 128.68], [35.42, 128.68]
      ]
    },
    {
      name: '함안군',
      coordinates: [
        [35.22, 128.34], [35.22, 128.48], [35.34, 128.48],
        [35.34, 128.34], [35.22, 128.34]
      ]
    },
    {
      name: '창녕군',
      coordinates: [
        [35.48, 128.42], [35.48, 128.56], [35.60, 128.56],
        [35.60, 128.42], [35.48, 128.42]
      ]
    },
    {
      name: '고성군',
      coordinates: [
        [34.92, 128.26], [34.92, 128.40], [35.04, 128.40],
        [35.04, 128.26], [34.92, 128.26]
      ]
    },
    {
      name: '남해군',
      coordinates: [
        [34.76, 127.82], [34.76, 127.98], [34.90, 127.98],
        [34.90, 127.82], [34.76, 127.82]
      ]
    },
    {
      name: '하동군',
      coordinates: [
        [35.00, 127.68], [35.00, 127.85], [35.16, 127.85],
        [35.16, 127.68], [35.00, 127.68]
      ]
    },
    {
      name: '산청군',
      coordinates: [
        [35.35, 127.80], [35.35, 127.95], [35.48, 127.95],
        [35.48, 127.80], [35.35, 127.80]
      ]
    },
    {
      name: '함양군',
      coordinates: [
        [35.45, 127.65], [35.45, 127.80], [35.58, 127.80],
        [35.58, 127.65], [35.45, 127.65]
      ]
    },
    {
      name: '거창군',
      coordinates: [
        [35.62, 127.83], [35.62, 127.98], [35.75, 127.98],
        [35.75, 127.83], [35.62, 127.83]
      ]
    },
    {
      name: '합천군',
      coordinates: [
        [35.50, 128.10], [35.50, 128.25], [35.63, 128.25],
        [35.63, 128.10], [35.50, 128.10]
      ]
    },
    {
      name: '의령군',
      coordinates: [
        [35.28, 128.20], [35.28, 128.34], [35.40, 128.34],
        [35.40, 128.20], [35.28, 128.20]
      ]
    }
  ];

  // 시군구별 데이터 매핑
  const getDistrictData = (districtName: string) => {
    return data.find(d => d.district === districtName);
  };

  // 상대적 기준으로 색상 결정 함수
  const getColor = (districtData?: MapData) => {
    if (!districtData || districtData.value === undefined) {
      return colors.none;
    }
    
    // 사용자 정의 색상이 있으면 사용
    if (districtData.color) {
      return districtData.color;
    }
    
    // 데이터가 있는 지역들의 값만 추출 (0보다 큰 값만)
    const validValues = data.filter(d => d.value !== undefined && d.value! > 0).map(d => d.value!);
    if (validValues.length === 0) return colors.none;
    
    // 최소값과 최대값 계산
    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    const range = maxValue - minValue;
    
    // 범위가 0인 경우 (모든 값이 같은 경우)
    if (range === 0) return colors.medium;
    
    // 현재 값의 상대적 위치 계산 (0~1 사이)
    const value = districtData.value;
    const normalizedValue = (value - minValue) / range;
    
    // 4단계로 구분 (상위 25%, 25-50%, 50-75%, 하위 25%)
    if (normalizedValue >= 0.75) return colors.high;      // 상위 25%
    if (normalizedValue >= 0.5) return colors.medium;     // 25-50%
    if (normalizedValue >= 0.25) return colors.low;       // 50-75%
    return colors.veryLow;                                // 하위 25%
  };

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      {title && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          zIndex: 1000,
          fontSize: '13px',
          fontWeight: 'bold',
          border: '1px solid rgba(0,0,0,0.1)',
          backdropFilter: 'blur(4px)'
        }}>
          {title}
        </div>
      )}
      
      <MapContainer
        center={[35.2594, 128.6641]} // 경상남도 중심
        zoom={8}
        minZoom={6}
        maxZoom={14}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
        zoomControl={true}
        doubleClickZoom={true}
        touchZoom={true}
        keyboard={true}
        wheelDebounceTime={40}
        wheelPxPerZoomLevel={60}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 시군구별 경계 표시 */}
        {districtBoundaries.map((district, index) => {
          const districtData = getDistrictData(district.name);
          const fillColor = getColor(districtData);
          const hasData = districtData && districtData.value !== undefined;
          
          return (
            <Polygon
              key={index}
              positions={district.coordinates as [number, number][]}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: hasData ? '#374151' : '#9ca3af',
                weight: hasData ? 2 : 1,
                opacity: 0.8
              }}
              eventHandlers={{
                click: () => {
                  if (onDistrictClick) {
                    onDistrictClick(district.name);
                  }
                }
              }}
            >
              {showLabels && (
                <Tooltip permanent direction="center" className="district-label" opacity={1}>
                  <div style={{ 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    padding: '4px 6px',
                    backgroundColor: hasData ? fillColor : 'rgba(241, 245, 249, 0.95)',
                    borderRadius: '6px',
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                    backdropFilter: 'blur(4px)',
                    minWidth: '60px'
                  }}>
                    <div style={{ 
                      color: hasData && fillColor !== colors.veryLow && fillColor !== colors.low ? 'white' : '#1f2937',
                      textShadow: hasData && fillColor !== colors.veryLow && fillColor !== colors.low ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                      fontSize: '10px',
                      lineHeight: '1.2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      justifyContent: 'center'
                    }}>
                      <span>{district.name}</span>
                      {districtData && districtData.hasAllocationDifference && (
                        <span style={{ color: '#eab308', fontSize: '8px' }}>★</span>
                      )}
                    </div>
                    {districtData && districtData.label && (
                      <div style={{ 
                        fontSize: '9px', 
                        color: hasData && fillColor !== colors.veryLow && fillColor !== colors.low ? 'rgba(255, 255, 255, 0.9)' : '#6b7280',
                        marginTop: '2px',
                        fontWeight: 'bold',
                        textShadow: hasData && fillColor !== colors.veryLow && fillColor !== colors.low ? '0 1px 1px rgba(0, 0, 0, 0.4)' : 'none'
                      }}>
                        {districtData.label}
                      </div>
                    )}
                  </div>
                </Tooltip>
              )}
              
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}