import React, { useState, useRef } from 'react';
import { Student, ModelLoadStatus } from '../types';
import { extractFaceDescriptorFromInput } from '../lib/faceApi';
import { saveNewStudent, deleteStudent } from '../lib/supabase';
import { generateRandomDescriptor } from '../lib/sampleData';
import { ExcelImportModal } from './ExcelImportModal';
import { FaceEnrollModal } from './FaceEnrollModal';
import {
  UserPlus,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Users,
  Search,
  Sparkles,
  FileSpreadsheet,
  ScanFace,
  Filter,
  Check
} from 'lucide-react';

interface EnrollmentViewProps {
  students: Student[];
  onStudentsUpdated: () => void;
  modelStatus: ModelLoadStatus;
  availableClasses: string[];
}

export const EnrollmentView: React.FC<EnrollmentViewProps> = ({
  students,
  onStudentsUpdated,
  modelStatus,
  availableClasses
}) => {
  // Form State
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('7A');
  const [gender, setGender] = useState<'L' | 'P'>('L');

  // Photo / Capture State
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'upload'>('camera');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState<boolean>(false);

  // Modals
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [selectedStudentForFace, setSelectedStudentForFace] = useState<Student | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState<boolean>(false);

  // Live Camera for Enrollment
  const videoEnrollRef = useRef<HTMLVideoElement | null>(null);
  const [isEnrollCameraActive, setIsEnrollCameraActive] = useState<boolean>(false);

  // Status submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Student list filter
  const [searchStudent, setSearchStudent] = useState('');
  const [filterClass, setFilterClass] = useState('Semua Kelas');
  const [filterFaceStatus, setFilterFaceStatus] = useState<'all' | 'ready' | 'missing'>('all');

  // Start Enrollment Camera
  const startEnrollCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      if (videoEnrollRef.current) {
        videoEnrollRef.current.srcObject = stream;
        videoEnrollRef.current.play();
        setIsEnrollCameraActive(true);
      }
    } catch (err: any) {
      alert('Gagal membuka kamera: ' + (err.message || 'Periksa izin kamera'));
    }
  };

  // Stop Enrollment Camera
  const stopEnrollCamera = () => {
    if (videoEnrollRef.current && videoEnrollRef.current.srcObject) {
      const stream = videoEnrollRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoEnrollRef.current.srcObject = null;
    }
    setIsEnrollCameraActive(false);
  };

  // Capture Snapshot from Camera and Extract Vector
  const captureSnapshot = async () => {
    if (!videoEnrollRef.current) return;
    const video = videoEnrollRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewImage(dataUrl);
    stopEnrollCamera();

    await processImageForDescriptor(canvas);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);

      const img = new Image();
      img.src = dataUrl;
      img.onload = async () => {
        await processImageForDescriptor(img);
      };
    };
    reader.readAsDataURL(file);
  };

  // Extract Vector using Face-api
  const processImageForDescriptor = async (
    element: HTMLImageElement | HTMLCanvasElement
  ) => {
    setIsExtracting(true);
    setExtractionMessage('Menganalisis wajah dan mengekstraksi 128-float vektor...');
    setExtractionSuccess(false);

    try {
      if (modelStatus.loaded) {
        const res = await extractFaceDescriptorFromInput(element);
        if (res.descriptor && res.descriptor.length === 128) {
          setFaceDescriptor(res.descriptor);
          setExtractionSuccess(true);
          setExtractionMessage('Berhasil mengekstraksi 128-dimensi Face Descriptor!');
        } else {
          setFaceDescriptor(null);
          setExtractionSuccess(false);
          setExtractionMessage(res.error || 'Wajah tidak terdeteksi.');
        }
      } else {
        const fallbackDescriptor = generateRandomDescriptor(Date.now() % 100000);
        setFaceDescriptor(fallbackDescriptor);
        setExtractionSuccess(true);
        setExtractionMessage('Mode Simulasi: Vektor wajah 128-float berhasil di-generate.');
      }
    } catch (e: any) {
      setExtractionMessage('Error ekstraksi: ' + e.message);
      setExtractionSuccess(false);
    } finally {
      setIsExtracting(false);
    }
  };

  // Submit New Student
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!nisn.trim()) {
      setSubmitError('Harap masukkan NISN siswa.');
      return;
    }
    if (!name.trim()) {
      setSubmitError('Harap masukkan Nama Lengkap siswa.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveNewStudent({
        nisn: nisn.trim(),
        name: name.trim(),
        class_name: className,
        gender,
        face_descriptor: faceDescriptor || undefined,
        photo_url: previewImage || undefined,
        status: 'Aktif'
      });

      if (res.success) {
        setSubmitSuccess(`Siswa ${name} (${nisn}) berhasil disimpan!`);
        setNisn('');
        setName('');
        setPreviewImage(null);
        setFaceDescriptor(null);
        setExtractionMessage(null);
        setExtractionSuccess(false);
        onStudentsUpdated();
      } else {
        setSubmitError(res.error || 'Gagal menyimpan siswa.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (id: string, stdName: string) => {
    if (confirm(`Yakin ingin menghapus data siswa: ${stdName}?`)) {
      await deleteStudent(id);
      onStudentsUpdated();
    }
  };

  // Buka modal rekam wajah untuk siswa terpilih
  const handleOpenFaceModal = (student: Student) => {
    setSelectedStudentForFace(student);
    setIsFaceModalOpen(true);
  };

  // Filtered students
  const filteredList = students.filter(s => {
    const matchesClass = filterClass === 'Semua Kelas' || s.class_name === filterClass;
    const matchesSearch =
      searchStudent === '' ||
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.nisn.includes(searchStudent);

    const hasFace = Boolean(s.face_descriptor && s.face_descriptor.length === 128);
    let matchesFaceStatus = true;
    if (filterFaceStatus === 'ready') matchesFaceStatus = hasFace;
    if (filterFaceStatus === 'missing') matchesFaceStatus = !hasFace;

    return matchesClass && matchesSearch && matchesFaceStatus;
  });

  const totalWithFace = students.filter(
    s => s.face_descriptor && s.face_descriptor.length === 128
  ).length;
  const totalMissingFace = students.length - totalWithFace;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-emerald-400" />
            Data Siswa & Pendaftaran Wajah
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Daftarkan siswa baru satu-persatu, impor massal via file Excel, atau tambahkan rekaman wajah pada siswa yang sudah terdaftar.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/40"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unggah Data Siswa Excel / CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* FORM REGISTRASI SISWA BARU (5 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40">
          <h3 className="font-bold text-base text-white border-b border-slate-700/80 pb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Form Tambah Siswa Baru
          </h3>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Input NISN */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nomor Induk Siswa Nasional (NISN) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 0089123456"
                value={nisn}
                onChange={e => setNisn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Input Nama Lengkap */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Lengkap Siswa <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Ahmad Faiz Al-Farizi"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Grid Kelas & Jenis Kelamin */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kelas <span className="text-rose-400">*</span>
                </label>
                <select
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  {availableClasses.filter(c => c !== 'Semua Kelas').map(c => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jenis Kelamin
                </label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as 'L' | 'P')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
            </div>

            {/* Bagian Perekaman Wajah (Opsional saat input form, bisa susulan) */}
            <div className="pt-2 border-t border-slate-700/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  Foto Wajah & Ekstraksi Vektor (Opsional)
                </label>
                <span className="text-[10px] text-slate-500">Bisa diisi nanti</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setCaptureMethod('camera');
                    startEnrollCamera();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    captureMethod === 'camera'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera Webcam</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCaptureMethod('upload');
                    stopEnrollCamera();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    captureMethod === 'upload'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Berkas</span>
                </button>
              </div>

              {/* Viewport Kamera Enrollment */}
              {captureMethod === 'camera' && (
                <div className="space-y-2">
                  <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
                    <video
                      ref={videoEnrollRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        isEnrollCameraActive ? 'block' : 'hidden'
                      }`}
                    />
                    {!isEnrollCameraActive && (
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <Camera className="w-8 h-8 text-slate-600" />
                        <span className="text-xs text-slate-400">Kamera pendaftaran mati</span>
                        <button
                          type="button"
                          onClick={startEnrollCamera}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700"
                        >
                          Buka Kamera
                        </button>
                      </div>
                    )}
                  </div>

                  {isEnrollCameraActive && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={captureSnapshot}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Ambil Foto Wajah Sekarang</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopEnrollCamera}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                      >
                        Tutup
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Berkas Input */}
              {captureMethod === 'upload' && (
                <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl text-center bg-slate-900/50 hover:bg-slate-900 transition-colors">
                  <input
                    type="file"
                    id="upload-face"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="upload-face" className="cursor-pointer flex flex-col items-center gap-1.5">
                    <Upload className="w-7 h-7 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Pilih Foto Wajah Siswa
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Format JPG/PNG, wajah jelas menghadap depan
                    </span>
                  </label>
                </div>
              )}

              {/* Pratinjau Foto */}
              {previewImage && (
                <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-700/80 flex items-center gap-3">
                  <img
                    src={previewImage}
                    alt="Pratinjau"
                    className="w-14 h-14 rounded-xl object-cover border border-emerald-500/40"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isExtracting ? (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400">
                          <Loader2 className="w-3 h-3 animate-spin" /> Sedang ekstraksi...
                        </span>
                      ) : extractionSuccess ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 128-Float Terverifikasi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          Foto terpasang
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {extractionMessage || 'Wajah siap disimpan bersama data siswa.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            {submitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Simpan Siswa Baru</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* DAFTAR SISWA TERDAFTAR (7 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Daftar Siswa MTsN 3 Magetan
              </h3>
              <p className="text-xs text-slate-400">
                Kelola status biometrik wajah siswa & edit pendaftaran wajah susulan
              </p>
            </div>

            {/* Filter Kelas */}
            <div className="flex items-center gap-2">
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-semibold outline-none"
              >
                {availableClasses.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Counter: Siap Wajah vs Belum */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <button
              onClick={() => setFilterFaceStatus('all')}
              className={`p-2 rounded-xl border transition-all ${
                filterFaceStatus === 'all'
                  ? 'bg-slate-700 border-slate-500 text-white font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Total: {students.length}
            </button>
            <button
              onClick={() => setFilterFaceStatus('ready')}
              className={`p-2 rounded-xl border transition-all ${
                filterFaceStatus === 'ready'
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              Wajah Siap: {totalWithFace}
            </button>
            <button
              onClick={() => setFilterFaceStatus('missing')}
              className={`p-2 rounded-xl border transition-all ${
                filterFaceStatus === 'missing'
                  ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              Belum Ada: {totalMissingFace}
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NISN..."
              value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>

          {/* List Table with Action to Edit / Add Face */}
          <div className="overflow-y-auto max-h-[500px] space-y-2 pr-1">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Tidak ada data siswa yang sesuai dengan filter pencarian.
              </div>
            ) : (
              filteredList.map(student => {
                const hasFace = Boolean(
                  student.face_descriptor && student.face_descriptor.length === 128
                );

                return (
                  <div
                    key={student.id}
                    className="p-3 bg-slate-900/80 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center font-bold text-sm text-slate-300">
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
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            {student.class_name}
                          </span>
                          {student.status === 'Alumni' && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                              Alumni
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono">NISN: {student.nisn}</span>
                          <span>•</span>
                          <span className="text-[10px] text-slate-500">
                            {student.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                          </span>
                          <span>•</span>
                          {hasFace ? (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Wajah Siap
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-semibold">
                              Wajah Belum Terdaftar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Tombol Daftarkan / Edit Wajah */}
                      <button
                        onClick={() => handleOpenFaceModal(student)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          hasFace
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 animate-pulse'
                        }`}
                        title="Daftarkan atau perbarui foto wajah siswa ini"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {hasFace ? 'Ubah Wajah' : 'Daftarkan Wajah'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-colors"
                        title="Hapus Siswa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Modal Import Excel */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => {
          setIsExcelModalOpen(false);
          onStudentsUpdated();
        }}
        availableClasses={availableClasses}
      />

      {/* Modal Edit / Daftarkan Wajah */}
      <FaceEnrollModal
        isOpen={isFaceModalOpen}
        student={selectedStudentForFace}
        onClose={() => {
          setIsFaceModalOpen(false);
          setSelectedStudentForFace(null);
        }}
        onSuccess={() => {
          setIsFaceModalOpen(false);
          setSelectedStudentForFace(null);
          onStudentsUpdated();
        }}
        modelStatus={modelStatus}
      />
    </div>
  );
};
