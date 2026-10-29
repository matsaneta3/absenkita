import React, { useState, useEffect } from 'react';
import { TabType, ModelLoadStatus } from '../types';
import { Camera, UserPlus, FileSpreadsheet, Settings, Database, Sparkles, CheckCircle2, AlertCircle, Loader2, Code2, Download } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  modelStatus: ModelLoadStatus;
  isSupabaseConnected: boolean;
  onOpenSqlModal: () => void;
  onOpenGitHubModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  modelStatus,
  isSupabaseConnected,
  onOpenSqlModal,
  onOpenGitHubModal
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Banner: School identity & status badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="font-extrabold text-emerald-400 tracking-tighter text-sm flex flex-col items-center leading-none">
                  <span className="text-[10px] text-emerald-300/80 font-bold">MTsN</span>
                  <span className="text-base text-white font-black">3</span>
                </span>
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                MTsN 3 MAGETAN
              </h1>
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Sistem Presensi Wajah
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Sistem Absensi Siswa Cerdas Mandiri & Realtime • Terintegrasi Supabase
            </p>
          </div>
        </div>

        {/* Right Info: Indicators & WIB Clock */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 text-xs">
          {/* AI Model Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              modelStatus.loaded
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : modelStatus.loading
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
            title={modelStatus.progressMessage}
          >
            {modelStatus.loaded ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : modelStatus.loading ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold text-[11px] hidden sm:inline">
              {modelStatus.loaded
                ? 'AI Face Model Siap'
                : modelStatus.loading
                ? 'Memuat AI Model...'
                : 'Model Offline'}
            </span>
          </div>

          {/* Supabase Status */}
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              isSupabaseConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
            }`}
            title="Status Database Supabase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-[11px] hidden md:inline">
              {isSupabaseConnected ? 'Supabase Live' : 'Database Lokal'}
            </span>
          </button>

          {/* Direct Download & Export index.html for GitHub Pages */}
          <button
            onClick={onOpenGitHubModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
            title="Buka panduan & unduh file index.html 100% persis untuk GitHub Pages"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unduh index.html</span>
          </button>

          {/* Quick SQL Button */}
          <button
            onClick={onOpenSqlModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Lihat Skrip SQL Migrasi Supabase"
          >
            <Code2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-medium text-[11px] hidden lg:inline">Skrip SQL</span>
          </button>

          {/* Realtime Digital Clock */}
          <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 flex flex-col items-end">
            <span className="font-mono font-bold text-white tracking-wider text-xs sm:text-sm">
              {currentTime}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:block">
              {currentDate}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60">
        <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Presensi Kamera Kelas</span>
          </button>

          <button
            onClick={() => setActiveTab('enrollment')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'enrollment'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Data Siswa & Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'classes'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Kelola Kelas</span>
          </button>

          <button
            onClick={() => setActiveTab('promotion')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'promotion'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Kenaikan Kelas</span>
          </button>

          <button
            onClick={() => setActiveTab('recap')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'recap'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Rekap & Ekspor</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Supabase & SQL</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
