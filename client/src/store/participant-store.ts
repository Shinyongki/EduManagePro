import { create } from 'zustand';
import type { EducationParticipant, EducationEnrollment } from '@shared/schema';

interface ParticipantStore {
  participants: EducationParticipant[];
  enrollments: EducationEnrollment[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchParticipants: () => Promise<void>;
  addParticipant: (participant: EducationParticipant) => Promise<void>;
  updateParticipant: (id: string, participant: Partial<EducationParticipant>) => Promise<void>;
  deleteParticipant: (id: string) => Promise<void>;
  
  fetchEnrollments: () => Promise<void>;
  addEnrollment: (enrollment: EducationEnrollment) => Promise<void>;
  updateEnrollment: (id: string, enrollment: Partial<EducationEnrollment>) => Promise<void>;
  deleteEnrollment: (id: string) => Promise<void>;
  getEnrollmentsByParticipant: (participantId: string) => Promise<EducationEnrollment[]>;
}

export const useParticipantStore = create<ParticipantStore>((set, get) => ({
  participants: [],
  enrollments: [],
  isLoading: false,
  error: null,

  fetchParticipants: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/participants');
      if (!response.ok) throw new Error('Failed to fetch participants');
      const participants = await response.json();
      set({ participants, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  addParticipant: async (participant: EducationParticipant) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant),
      });
      if (!response.ok) throw new Error('Failed to add participant');
      
      await get().fetchParticipants();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  updateParticipant: async (id: string, participant: Partial<EducationParticipant>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant),
      });
      if (!response.ok) throw new Error('Failed to update participant');
      
      await get().fetchParticipants();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  deleteParticipant: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete participant');
      
      await get().fetchParticipants();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  fetchEnrollments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/enrollments');
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      const enrollments = await response.json();
      set({ enrollments, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  addEnrollment: async (enrollment: EducationEnrollment) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollment),
      });
      if (!response.ok) throw new Error('Failed to add enrollment');
      
      await get().fetchEnrollments();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  updateEnrollment: async (id: string, enrollment: Partial<EducationEnrollment>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/enrollments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollment),
      });
      if (!response.ok) throw new Error('Failed to update enrollment');
      
      await get().fetchEnrollments();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  deleteEnrollment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/enrollments/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete enrollment');
      
      await get().fetchEnrollments();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  getEnrollmentsByParticipant: async (participantId: string) => {
    try {
      const response = await fetch(`/api/participants/${participantId}/enrollments`);
      if (!response.ok) throw new Error('Failed to fetch participant enrollments');
      return await response.json();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  },
}));