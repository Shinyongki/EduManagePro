import React, { useState, useEffect } from 'react';
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
}

export default function GyeongsangnamMap({ 
  data = [], 
  showLabels = true,
  colorScheme = 'blue',
  title,
  height = '500px'
}: GyeongsangnamMapProps) {
  // 색상 스키마 정의
  const colorSchemes = {
    blue: {
      high: '#1e40af',
      medium: '#3b82f6',
      low: '#93c5fd',
      none: '#e5e7eb'
    },
    green: {
      high: '#14532d',
      medium: '#22c55e',
      low: '#86efac',
      none: '#e5e7eb'
    },
    red: {
      high: '#7f1d1d',
      medium: '#ef4444',
      low: '#fca5a5',
      none: '#e5e7eb'
    },
    purple: {
      high: '#581c87',
      medium: '#a855f7',
      low: '#d8b4fe',
      none: '#e5e7eb'
    },
    orange: {
      high: '#7c2d12',
      medium: '#fb923c',
      low: '#fed7aa',
      none: '#e5e7eb'
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

  // 색상 결정 함수
  const getColor = (districtData?: MapData) => {
    if (!districtData || districtData.value === undefined) {
      return colors.none;
    }
    
    // 사용자 정의 색상이 있으면 사용
    if (districtData.color) {
      return districtData.color;
    }
    
    // 값에 따른 색상 결정 (0-33: low, 34-66: medium, 67-100: high)
    const value = districtData.value;
    if (value <= 33) return colors.low;
    if (value <= 66) return colors.medium;
    return colors.high;
  };

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      {title && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {title}
        </div>
      )}
      
      <MapContainer
        center={[35.2594, 128.6641]} // 경상남도 중심
        zoom={8}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
        zoomControl={true}
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
                fillColor: fillColor,
                fillOpacity: hasData ? 0.6 : 0.2,
                color: hasData ? colors.high : '#6b7280',
                weight: hasData ? 3 : 2,
                opacity: 1
              }}
            >
              {showLabels && (
                <Tooltip permanent direction="center" className="district-label" opacity={1}>
                  <div style={{ 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    padding: '2px 4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '4px',
                    border: hasData ? `2px solid ${colors.medium}` : '1px solid #9ca3af'
                  }}>
                    <div style={{ color: hasData ? colors.high : '#4b5563' }}>
                      {district.name}
                    </div>
                    {districtData && districtData.label && (
                      <div style={{ fontSize: '10px', color: colors.medium, marginTop: '1px' }}>
                        {districtData.label}
                      </div>
                    )}
                  </div>
                </Tooltip>
              )}
              
              <Popup>
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{district.name}</h4>
                  {districtData ? (
                    <>
                      {districtData.value !== undefined && (
                        <p style={{ margin: '0', fontSize: '14px', color: colors.high, fontWeight: 'bold' }}>
                          값: {districtData.value}
                        </p>
                      )}
                      {districtData.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                          {districtData.description}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                      데이터 없음
                    </p>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
      
      {/* 범례 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'white',
        padding: '8px',
        borderRadius: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontSize: '11px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>범례</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: colors.high, opacity: 0.6 }}></div>
            <span>높음</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: colors.medium, opacity: 0.6 }}></div>
            <span>중간</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: colors.low, opacity: 0.6 }}></div>
            <span>낮음</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: colors.none, opacity: 0.2 }}></div>
            <span>데이터 없음</span>
          </div>
        </div>
      </div>
    </div>
  );
}