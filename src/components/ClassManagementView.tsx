import React, { useState } from 'react';
import { Student } from '../types';
import { addClass, deleteClass } from '../lib/supabase';
import {
  GraduationCap,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Layers,
  Sparkles
} from 'lucide-react';

interface ClassManagementViewProps {
  availableClasses: string[];
  students: Student[];
  onClassesUpdated: () => void;
}

export const ClassManagementView: React.FC<ClassManagementViewProps> = ({
  availableClasses,
  students,
  onClassesUpdated
}) => {
  const [newClassName, setNewClassName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [gradeFilter, setGradeFilter] = useState<'all' | '7' | '8' | '9'>('all');

  const classesList = availableClasses.filter(c => c !== 'Semua Kelas');

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const res = await addClass(newClassName);
    setFeedback(res);
    setIsSubmitting(false);

    if (res.success) {
      setNewClassName('');
      onClassesUpdated();
    }
  };

  const handleDeleteClass = async (className: string) => {
    const studentCount = students.filter(s => s.class_name === className).length;

    let warningText = `Apakah Anda yakin ingin menghapus kelas ${className}?`;
    if (studentCount > 0) {
      warningText = `PERINGATAN: Ada ${studentCount} siswa yang terdaftar di kelas ${className}. Jika kelas ini dihapus, siswa tersebut perlu dipindahkan ke kelas lain. Lanjutkan hapus?`;
    }

    if (confirm(warningText)) {
      const res = await deleteClass(className);
      setFeedback(res);
      onClassesUpdated();
    }
  };

  const filteredClasses = classesList.filter(c => {
    if (gradeFilter === 'all') return true;
    return c.startsWith(gradeFilter);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Introduction */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            Manajemen Rombongan Belajar (Kelas)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Kelola pembagian kelas siswa MTsN 3 Magetan. Tambahkan atau hapus rombel sesuai tahun ajaran berjalan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
            Total Rombel Aktif: <strong className="text-emerald-400 font-bold">{classesList.length}</strong> Kelas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* FORM TAMBAH KELAS BARU (4 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 space-y-4">
          <h3 className="font-bold text-base text-white border-b border-slate-700/80 pb-3 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            Tambah Kelas Baru
          </h3>

          <form onSubmit={handleAddClass} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama / Kode Kelas <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 7D, 8D, 9 Unggulan"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 uppercase outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Gunakan angka tingkat di depan (7, 8, atau 9) diikuti nama rombel.
              </span>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  feedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {feedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !newClassName.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Menambahkan...' : 'Simpan Kelas Baru'}</span>
            </button>
          </form>

          {/* Saran Cepat Kelas Umum */}
          <div className="pt-3 border-t border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Saran Cepat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['7D', '7E', '8D', '8E', '9D', '9E'].map(quickName => (
                <button
                  key={quickName}
                  type="button"
                  onClick={() => setNewClassName(quickName)}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold transition-colors"
                >
                  +{quickName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DAFTAR KELAS & STATISTIK SISWA (8 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 flex flex-col gap-4">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                Daftar Seluruh Kelas Terdaftar
              </h3>
              <p className="text-xs text-slate-400">
                Pilih atau hapus kelas yang sudah tidak digunakan di madrasah
              </p>
            </div>

            {/* Filter Tingkat */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setGradeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  gradeFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setGradeFilter('7')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  gradeFilter === '7' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kelas 7
              </button>
              <button
                onClick={() => setGradeFilter('8')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  gradeFilter === '8' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kelas 8
              </button>
              <button
                onClick={() => setGradeFilter('9')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  gradeFilter === '9' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kelas 9
              </button>
            </div>
          </div>

          {/* Grid Kartu Kelas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredClasses.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                Tidak ada kelas yang sesuai dengan filter tingkat.
              </div>
            ) : (
              filteredClasses.map(className => {
                const classStudents = students.filter(s => s.class_name === className && s.status !== 'Alumni');
                const withFaceCount = classStudents.filter(
                  s => s.face_descriptor && s.face_descriptor.length === 128
                ).length;

                return (
                  <div
                    key={className}
                    className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700/80 hover:border-slate-600 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-black text-white text-sm shadow">
                          {className}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">Kelas {className}</h4>
                          <span className="text-[10px] text-slate-400">
                            MTsN 3 Magetan
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteClass(className)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                        title={`Hapus Kelas ${className}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong>{classStudents.length}</strong> Siswa</span>
                      </div>

                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {withFaceCount} Wajah Siap
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
