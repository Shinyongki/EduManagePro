import React from 'react';
import { useLocation } from 'wouter';

function TestRoute() {
  const [location] = useLocation();
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">라우팅 테스트 페이지</h1>
      <div className="bg-blue-100 p-4 rounded">
        <p className="text-lg">현재 URL: <strong>{location}</strong></p>
        <p className="text-lg">현재 경로: <strong>{window.location.pathname}</strong></p>
        <p className="text-lg">전체 URL: <strong>{window.location.href}</strong></p>
      </div>
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p>이 페이지가 보인다면 라우팅이 작동합니다!</p>
      </div>
    </div>
  );
}

export default TestRoute;