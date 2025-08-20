// 날짜별 데이터 스냅샷 관리 시스템
import { IndexedDBStorage } from './indexeddb';
import type { EducationData, EmployeeData, EducationParticipant, InstitutionData } from '@shared/schema';

export interface DataSnapshot {
  date: string; // YYYY-MM-DD 형식
  employeeData: EmployeeData[];
  participantData: EducationParticipant[];
  basicEducationData: EducationData[];
  advancedEducationData: EducationData[];
  institutionData: InstitutionData[];
  createdAt: string;
  description?: string;
  metadata: {
    totalEmployees: number;
    totalParticipants: number;
    totalInstitutions: number;
    uploader?: string;
  };
}

export interface SnapshotList {
  snapshots: { [date: string]: DataSnapshot };
  currentSnapshot: string | null;
  lastUpdated: string;
}

export class SnapshotManager {
  private db: IndexedDBStorage;
  private readonly SNAPSHOTS_KEY = 'dataSnapshots';
  private readonly CURRENT_SNAPSHOT_KEY = 'currentSnapshot';

  constructor() {
    this.db = new IndexedDBStorage();
  }

  // 현재 스냅샷 목록 가져오기
  async getSnapshotList(): Promise<SnapshotList> {
    const snapshots = await this.db.getItem<SnapshotList>(this.SNAPSHOTS_KEY);
    return snapshots || {
      snapshots: {},
      currentSnapshot: null,
      lastUpdated: new Date().toISOString()
    };
  }

  // 새 스냅샷 생성
  async createSnapshot(
    date: string,
    data: {
      employeeData: EmployeeData[];
      participantData: EducationParticipant[];
      basicEducationData: EducationData[];
      advancedEducationData: EducationData[];
      institutionData: InstitutionData[];
    },
    description?: string
  ): Promise<void> {
    const snapshotList = await this.getSnapshotList();
    
    const snapshot: DataSnapshot = {
      date,
      ...data,
      createdAt: new Date().toISOString(),
      description: description || `${date} 데이터 업로드`,
      metadata: {
        totalEmployees: data.employeeData.length,
        totalParticipants: data.participantData.length,
        totalInstitutions: data.institutionData.length,
      }
    };

    snapshotList.snapshots[date] = snapshot;
    snapshotList.lastUpdated = new Date().toISOString();
    
    // 첫 번째 스냅샷이면 현재 스냅샷으로 설정
    if (!snapshotList.currentSnapshot) {
      snapshotList.currentSnapshot = date;
    }

    await this.db.setItem(this.SNAPSHOTS_KEY, snapshotList);
    
    console.log(`📸 스냅샷 생성 완료: ${date} (${snapshot.metadata.totalEmployees}명 종사자, ${snapshot.metadata.totalParticipants}명 참가자)`);
  }

  // 특정 날짜 스냅샷 가져오기
  async getSnapshot(date: string): Promise<DataSnapshot | null> {
    const snapshotList = await this.getSnapshotList();
    return snapshotList.snapshots[date] || null;
  }

  // 현재 활성 스냅샷 가져오기
  async getCurrentSnapshot(): Promise<DataSnapshot | null> {
    const snapshotList = await this.getSnapshotList();
    if (!snapshotList.currentSnapshot) return null;
    
    return snapshotList.snapshots[snapshotList.currentSnapshot] || null;
  }

  // 현재 활성 스냅샷 변경
  async setCurrentSnapshot(date: string): Promise<void> {
    const snapshotList = await this.getSnapshotList();
    
    if (!snapshotList.snapshots[date]) {
      throw new Error(`스냅샷이 존재하지 않습니다: ${date}`);
    }
    
    snapshotList.currentSnapshot = date;
    snapshotList.lastUpdated = new Date().toISOString();
    
    await this.db.setItem(this.SNAPSHOTS_KEY, snapshotList);
    
    console.log(`📅 현재 스냅샷 변경: ${date}`);
  }

  // 스냅샷 삭제
  async deleteSnapshot(date: string): Promise<void> {
    const snapshotList = await this.getSnapshotList();
    
    if (!snapshotList.snapshots[date]) {
      throw new Error(`스냅샷이 존재하지 않습니다: ${date}`);
    }
    
    delete snapshotList.snapshots[date];
    
    // 삭제된 스냅샷이 현재 스냅샷이면 다른 스냅샷으로 변경
    if (snapshotList.currentSnapshot === date) {
      const availableDates = Object.keys(snapshotList.snapshots).sort().reverse();
      snapshotList.currentSnapshot = availableDates[0] || null;
    }
    
    snapshotList.lastUpdated = new Date().toISOString();
    await this.db.setItem(this.SNAPSHOTS_KEY, snapshotList);
    
    console.log(`🗑️ 스냅샷 삭제 완료: ${date}`);
  }

  // 사용 가능한 날짜 목록 가져오기
  async getAvailableDates(): Promise<string[]> {
    const snapshotList = await this.getSnapshotList();
    return Object.keys(snapshotList.snapshots).sort().reverse();
  }

  // 현재 활성 날짜 가져오기
  async getCurrentDate(): Promise<string | null> {
    const snapshotList = await this.getSnapshotList();
    return snapshotList.currentSnapshot;
  }

  // 현재 스냅샷 해제
  async clearCurrentSnapshot(): Promise<void> {
    const snapshotList = await this.getSnapshotList();
    snapshotList.currentSnapshot = null;
    snapshotList.lastUpdated = new Date().toISOString();
    
    await this.db.setItem(this.SNAPSHOTS_KEY, snapshotList);
    
    console.log('📅 현재 스냅샷 해제됨');
  }

  // 스냅샷 메타데이터만 가져오기 (목록 표시용)
  async getSnapshotMetadata(): Promise<Array<{
    date: string;
    description: string;
    createdAt: string;
    metadata: DataSnapshot['metadata'];
    isCurrent: boolean;
  }>> {
    const snapshotList = await this.getSnapshotList();
    
    return Object.entries(snapshotList.snapshots)
      .map(([date, snapshot]) => ({
        date,
        description: snapshot.description || `${date} 데이터`,
        createdAt: snapshot.createdAt,
        metadata: snapshot.metadata,
        isCurrent: date === snapshotList.currentSnapshot
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}

// 싱글톤 인스턴스
export const snapshotManager = new SnapshotManager();