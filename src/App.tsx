/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Student, Attendance, TabType, ModelLoadStatus } from './types';
import { Header } from './components/Header';
import { CameraAttendanceView } from './components/CameraAttendanceView';
import { EnrollmentView } from './components/EnrollmentView';
import { ClassManagementView } from './components/ClassManagementView';
import { PromotionView } from './components/PromotionView';
import { SupabaseConfigView } from './components/SupabaseConfigView';
import { ReportView } from './components/ReportView';
import { SqlModal } from './components/SqlModal';
import { GitHubExportModal } from './components/GitHubExportModal';
import {
  fetchStudents,
  fetchAttendances,
  fetchClasses,
  subscribeToRealtimeAttendances,
  getStoredConfig,
  testSupabaseConnection
} from './lib/supabase';
import { loadFaceApiModels } from './lib/faceApi';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [classes, setClasses] = useState<string[]>(['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C']);
  const [selectedClass, setSelectedClass] = useState<string>('Semua Kelas');

  // Status
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<ModelLoadStatus>({
    loaded: false,
    loading: true,
    error: null,
    progressMessage: 'Memulai inisialisasi AI pengenal wajah...'
  });

  const getTodayDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 1. Inisialisasi Model Face-API.js
  useEffect(() => {
    loadFaceApiModels(status => {
      setModelStatus(status);
    });
  }, []);

  // 2. Cek Koneksi Supabase, Muat Data Kelas & Siswa
  const loadInitialData = useCallback(async () => {
    const config = getStoredConfig();
    if (config.url && config.anonKey) {
      const connTest = await testSupabaseConnection(config);
      setIsSupabaseConnected(connTest.success);
    } else {
      setIsSupabaseConnected(false);
    }

    // Ambil data kelas dinamis
    const classList = await fetchClasses();
    if (classList.length > 0) {
      setClasses(classList);
    }

    // Ambil data siswa
    const { students: stdData } = await fetchStudents();
    setStudents(stdData);

    // Ambil data kehadiran hari ini
    const todayStr = getTodayDateStr();
    const attData = await fetchAttendances(todayStr);
    setAttendances(attData);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 3. Pasang Realtime Listener Supabase pada tabel attendances
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeAttendances(
      newAttendance => {
        setAttendances(prev => {
          const exists = prev.some(a => a.id === newAttendance.id);
          if (exists) return prev;
          return [newAttendance, ...prev];
        });
      },
      updatedAttendance => {
        setAttendances(prev =>
          prev.map(a => (a.id === updatedAttendance.id ? updatedAttendance : a))
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isSupabaseConnected]);

  // Handle lokal pencatatan presensi agar UI update seketika
  const handleAttendanceRecorded = (newAtt: Attendance) => {
    setAttendances(prev => {
      const idx = prev.findIndex(a => a.student_id === newAtt.student_id && a.date === newAtt.date);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newAtt;
        return copy;
      }
      return [newAtt, ...prev];
    });
  };

  const availableClassesWithAll = ['Semua Kelas', ...classes];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Utama Sekolah */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        modelStatus={modelStatus}
        isSupabaseConnected={isSupabaseConnected}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      />

      {/* Konten Halaman sesuai Tab */}
      <main className="flex-1">
        {activeTab === 'attendance' && (
          <CameraAttendanceView
            students={students}
            attendances={attendances}
            modelStatus={modelStatus}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            onAttendanceRecorded={handleAttendanceRecorded}
            availableClasses={availableClassesWithAll}
          />
        )}

        {activeTab === 'enrollment' && (
          <EnrollmentView
            students={students}
            onStudentsUpdated={loadInitialData}
            modelStatus={modelStatus}
            availableClasses={availableClassesWithAll}
          />
        )}

        {activeTab === 'classes' && (
          <ClassManagementView
            availableClasses={availableClassesWithAll}
            students={students}
            onClassesUpdated={loadInitialData}
          />
        )}

        {activeTab === 'promotion' && (
          <PromotionView
            students={students}
            availableClasses={availableClassesWithAll}
            onPromotionDone={loadInitialData}
          />
        )}

        {activeTab === 'recap' && (
          <ReportView
            students={students}
            attendances={attendances}
            availableClasses={availableClassesWithAll}
            currentDateStr={getTodayDateStr()}
          />
        )}

        {activeTab === 'config' && (
          <SupabaseConfigView
            onConfigSaved={loadInitialData}
            isSupabaseConnected={isSupabaseConnected}
          />
        )}
      </main>

      {/* Footer Sekolah */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 px-4 sm:px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">
            &copy; {new Date().getFullYear()} MTsN 3 Magetan • Sistem Presensi Wajah Terintegrasi
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-2 flex items-center gap-1"
            >
              <span>Unduh / Pasang ke GitHub</span>
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 font-semibold underline underline-offset-2"
            >
              Skrip SQL & Standalone HTML
            </button>
            <span className="text-slate-600">|</span>
            <span>Kabupaten Magetan, Jawa Timur</span>
          </div>
        </div>
      </footer>

      {/* Modal Ekspor GitHub Pages (1-Klik Copy & Direct Save) */}
      <GitHubExportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />

      {/* Modal Skrip SQL & Standalone File */}
      <SqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </div>
  );
}
