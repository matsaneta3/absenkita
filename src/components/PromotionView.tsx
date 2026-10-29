import React, { useState } from 'react';
import { Student } from '../types';
import { promoteStudents } from '../lib/supabase';
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldCheck,
  Search,
  BookOpen
} from 'lucide-react';

interface PromotionViewProps {
  students: Student[];
  availableClasses: string[];
  onPromotionDone: () => void;
}

export const PromotionView: React.FC<PromotionViewProps> = ({
  students,
  availableClasses,
  onPromotionDone
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'rombel' | 'massal' | 'alumni'>('rombel');

  // Mode Rombel State
  const classesList = availableClasses.filter(c => c !== 'Semua Kelas');
  const [sourceClass, setSourceClass] = useState<string>(classesList[0] || '7A');
  const [targetClass, setTargetClass] = useState<string>('8A');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isGraduationMode, setIsGraduationMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Alumni Search
  const [alumniSearch, setAlumniSearch] = useState('');

  // Siswa aktif di kelas asal
  const sourceStudents = students.filter(
    s => s.class_name === sourceClass && s.status !== 'Alumni'
  );

  // Toggle selection
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === sourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sourceStudents.map(s => s.id));
    }
  };

  // Eksekusi Kenaikan Kelas per Rombel
  const handleExecuteRombel = async () => {
    if (selectedStudentIds.length === 0) {
      setStatusMessage({ success: false, text: 'Pilih minimal satu siswa untuk dinaikkan kelasnya.' });
      return;
    }

    const actionDesc = isGraduationMode
      ? `meluluskan ${selectedStudentIds.length} siswa ke status Alumni`
      : `menaikkan ${selectedStudentIds.length} siswa dari ${sourceClass} ke ${targetClass}`;

    if (!confirm(`Konfirmasi: Apakah Anda yakin ingin ${actionDesc}?`)) {
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    const res = await promoteStudents(selectedStudentIds, targetClass, isGraduationMode);
    setIsProcessing(false);

    if (res.success) {
      setStatusMessage({ success: true, text: res.message });
      setSelectedStudentIds([]);
      onPromotionDone();
    } else {
      setStatusMessage({ success: false, text: res.message });
    }
  };

  // Eksekusi Kenaikan Kelas Massal Otomatis Seluruh Sekolah
  const handleExecuteAutoMassPromotion = async () => {
    const activeStudents = students.filter(s => s.status !== 'Alumni');
    if (activeStudents.length === 0) {
      alert('Tidak ada siswa aktif untuk dinaikkan.');
      return;
    }

    const confirmMsg =
      'PERINGATAN: Kenaikan Kelas Massal Otomatis akan:\n\n' +
      '1. Siswa Kelas 9 -> Dinyatakan LULUS (Pindah ke Alumni)\n' +
      '2. Siswa Kelas 8 -> Naik ke Kelas 9 (misal: 8A -> 9A, 8B -> 9B)\n' +
      '3. Siswa Kelas 7 -> Naik ke Kelas 8 (misal: 7A -> 8A, 7B -> 8B)\n\n' +
      'Apakah Anda yakin ingin memproses pergantian tahun ajaran ini?';

    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    setStatusMessage(null);

    // Grouping
    const grade9Ids = activeStudents.filter(s => s.class_name.startsWith('9')).map(s => s.id);
    const grade8Students = activeStudents.filter(s => s.class_name.startsWith('8'));
    const grade7Students = activeStudents.filter(s => s.class_name.startsWith('7'));

    let totalMoved = 0;

    // 1. Luluskan Kelas 9
    if (grade9Ids.length > 0) {
      const res = await promoteStudents(grade9Ids, 'Alumni (Lulus)', true);
      totalMoved += res.count;
    }

    // 2. Naikkan Kelas 8 ke 9
    for (const s of grade8Students) {
      const nextClass = s.class_name.replace(/^8/, '9');
      const res = await promoteStudents([s.id], nextClass, false);
      totalMoved += res.count;
    }

    // 3. Naikkan Kelas 7 ke 8
    for (const s of grade7Students) {
      const nextClass = s.class_name.replace(/^7/, '8');
      const res = await promoteStudents([s.id], nextClass, false);
      totalMoved += res.count;
    }

    setIsProcessing(false);
    setStatusMessage({
      success: true,
      text: `Kenaikan Kelas Massal berhasil! Total ${totalMoved} siswa berhasil dinaikkan / diluluskan.`
    });
    onPromotionDone();
  };

  // Kembalikan Alumni ke Siswa Aktif jika salah klik
  const handleReactivateAlumni = async (studentId: string, returnClass: string) => {
    if (confirm(`Kembalikan siswa ini menjadi Siswa Aktif di Kelas ${returnClass}?`)) {
      await promoteStudents([studentId], returnClass, false);
      onPromotionDone();
    }
  };

  const alumniStudents = students.filter(s => s.status === 'Alumni').filter(
    s =>
      alumniSearch === '' ||
      s.name.toLowerCase().includes(alumniSearch.toLowerCase()) ||
      s.nisn.includes(alumniSearch)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-400" />
            Kenaikan Kelas & Kelulusan Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Sistem promosi siswa berkelanjutan dari Kelas 7, 8, 9 hingga lulus menjadi Alumni MTsN 3 Magetan tanpa kehilangan data riwayat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('rombel')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'rombel'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kenaikan per Rombel
            </button>
            <button
              onClick={() => setActiveSubTab('massal')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'massal'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kenaikan Massal Otomatis
            </button>
            <button
              onClick={() => setActiveSubTab('alumni')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'alumni'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Arsip Alumni ({students.filter(s => s.status === 'Alumni').length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: KENAIKAN KELAS PER ROMBEL */}
      {/* ========================================================= */}
      {activeSubTab === 'rombel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Panel Konfigurasi Kenaikan (4 Kolom) */}
          <div className="lg:col-span-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 space-y-4">
            <h3 className="font-bold text-base text-white border-b border-slate-700/80 pb-3 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              Tentukan Alur Kenaikan
            </h3>

            {/* Kelas Asal */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilih Kelas Asal:
              </label>
              <select
                value={sourceClass}
                onChange={e => {
                  setSourceClass(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-bold outline-none focus:border-emerald-500"
              >
                {classesList.map(c => (
                  <option key={c} value={c}>
                    Kelas {c} ({students.filter(s => s.class_name === c && s.status !== 'Alumni').length} Siswa Aktif)
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Kelulusan Toggle */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Kelulusan (Status Alumni)
                </span>
                <span className="text-[10px] text-slate-400">
                  Untuk siswa Kelas 9 yang telah tamat belajar
                </span>
              </div>
              <input
                type="checkbox"
                checked={isGraduationMode}
                onChange={e => setIsGraduationMode(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Kelas Tujuan (jika bukan mode lulus) */}
            {!isGraduationMode ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pindah / Naik ke Kelas Tujuan:
                </label>
                <select
                  value={targetClass}
                  onChange={e => setTargetClass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500"
                >
                  {classesList.map(c => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-xs text-emerald-300">
                🎓 Siswa yang dipilih akan dipindahkan ke kategori <strong>Alumni MTsN 3 Magetan</strong>. Data mereka tetap tersimpan untuk arsip dan verifikasi.
              </div>
            )}

            {/* Feedback alert */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  statusMessage.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {statusMessage.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Tombol Eksekusi */}
            <button
              onClick={handleExecuteRombel}
              disabled={isProcessing || selectedStudentIds.length === 0}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Memproses...'
                  : isGraduationMode
                  ? `Luluskan ${selectedStudentIds.length} Siswa Terpilih`
                  : `Naikkan ${selectedStudentIds.length} Siswa ke Kelas ${targetClass}`}
              </span>
            </button>
          </div>

          {/* Tabel Siswa di Kelas Asal (8 Kolom) */}
          <div className="lg:col-span-8 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Daftar Siswa Kelas {sourceClass} ({sourceStudents.length} Siswa)
                </h3>
                <p className="text-xs text-slate-400">
                  Centang siswa yang berhak naik kelas. Siswa yang tidak dicentang akan tetap berada di kelas {sourceClass}.
                </p>
              </div>

              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                {selectedStudentIds.length === sourceStudents.length && sourceStudents.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Batalkan Semua</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Pilih Semua Siswa</span>
                  </>
                )}
              </button>
            </div>

            <div className="overflow-y-auto max-h-[500px] space-y-2 pr-1">
              {sourceStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Tidak ada siswa aktif di kelas {sourceClass}.
                </div>
              ) : (
                sourceStudents.map(student => {
                  const isSelected = selectedStudentIds.includes(student.id);

                  return (
                    <div
                      key={student.id}
                      onClick={() => handleToggleStudent(student.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/60 shadow-sm shadow-emerald-950/20'
                          : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                        </div>

                        <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-300 shrink-0 border border-slate-700">
                          {student.photo_url ? (
                            <img
                              src={student.photo_url}
                              alt={student.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            student.name.charAt(0)
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                            {student.name}
                          </h4>
                          <span className="font-mono text-[11px] text-slate-400">
                            NISN: {student.nisn}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {student.face_descriptor && student.face_descriptor.length === 128 ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                            Wajah Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                            Tanpa Wajah
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: KENAIKAN MASSAL OTOMATIS */}
      {/* ========================================================= */}
      {activeSubTab === 'massal' && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-slate-950/40 space-y-6">
          <div className="max-w-2xl space-y-2">
            <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Kenaikan Kelas Massal Seluruh Sekolah
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Fitur ini digunakan saat pergantian Tahun Ajaran baru. Sistem secara otomatis menaikkan seluruh siswa ke jenjang berikutnya dalam satu kali proses aman.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Tingkat Kelas 7 &rarr; Kelas 8</h4>
              <p className="text-xs text-slate-400">
                Siswa 7A &rarr; 8A, 7B &rarr; 8B, 7C &rarr; 8C secara otomatis.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Tingkat Kelas 8 &rarr; Kelas 9</h4>
              <p className="text-xs text-slate-400">
                Siswa 8A &rarr; 9A, 8B &rarr; 9B, 8C &rarr; 9C secara otomatis.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Tingkat Kelas 9 &rarr; Lulus</h4>
              <p className="text-xs text-slate-400">
                Seluruh siswa Kelas 9 diubah statusnya menjadi <strong>Alumni (Lulus)</strong>.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              💡 Rekomendasi: Lakukan pencadangan (Unduh Rekap / Ekspor CSV) sebelum menjalankan kenaikan massal.
            </span>

            <button
              onClick={handleExecuteAutoMassPromotion}
              disabled={isProcessing}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Memproses Seluruh Sekolah...' : 'Jalankan Kenaikan Kelas Massal Otomatis'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 3: ARSIP ALUMNI & KELULUSAN */}
      {/* ========================================================= */}
      {activeSubTab === 'alumni' && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Daftar Arsip Alumni MTsN 3 Magetan
              </h3>
              <p className="text-xs text-slate-400">
                Siswa yang telah lulus. Data biometrik wajah dan arsip tetap tersimpan namun tidak aktif di presensi harian.
              </p>
            </div>

            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari alumni atau NISN..."
                value={alumniSearch}
                onChange={e => setAlumniSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[500px] space-y-2 pr-1">
            {alumniStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Belum ada data siswa yang lulus (Alumni).
              </div>
            ) : (
              alumniStudents.map(student => (
                <div
                  key={student.id}
                  className="p-3 bg-slate-900/80 border border-slate-700/70 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-300 shrink-0 border border-slate-700">
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        student.name.charAt(0)
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                          {student.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold">
                          Alumni
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        NISN: <span className="font-mono text-slate-300">{student.nisn}</span> • Terdaftar Sejak: {student.created_at ? new Date(student.created_at).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReactivateAlumni(student.id, '9A')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors"
                      title="Kembalikan ke Siswa Aktif"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-400" />
                      <span>Aktifkan Kembali</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
