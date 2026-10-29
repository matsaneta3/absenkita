import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Student, Attendance, ModelLoadStatus, AttendanceMode } from '../types';
import {
  playSuccessChime,
  speakStudentName,
  detectFacesFromVideo,
  buildFaceMatcher
} from '../lib/faceApi';
import { recordAttendance } from '../lib/supabase';
import confetti from 'canvas-confetti';
import {
  Camera,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Sliders,
  CheckCircle,
  Clock,
  UserCheck,
  Users,
  Search,
  Filter,
  LogOut,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Play
} from 'lucide-react';

interface CameraAttendanceViewProps {
  students: Student[];
  attendances: Attendance[];
  modelStatus: ModelLoadStatus;
  selectedClass: string;
  setSelectedClass: (className: string) => void;
  onAttendanceRecorded: (att: Attendance) => void;
  availableClasses: string[];
}

export const CameraAttendanceView: React.FC<CameraAttendanceViewProps> = ({
  students,
  attendances,
  modelStatus,
  selectedClass,
  setSelectedClass,
  onAttendanceRecorded,
  availableClasses
}) => {
  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Settings
  const [mode, setMode] = useState<AttendanceMode>('masuk');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [distanceThreshold, setDistanceThreshold] = useState<number>(0.55);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Verification Visual Alert Banner
  const [verifiedAlert, setVerifiedAlert] = useState<{
    student: Student;
    time: string;
    mode: AttendanceMode;
    message: string;
  } | null>(null);

  // Anti-Spam / Cooldown tracking: studentId -> timestamp
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const COOLDOWN_MS = 6000; // 6 detik cooldown antar scan untuk orang yang sama

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'hadir' | 'belum' | 'pulang'>('all');

  // Today Date Strings
  const getTodayDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getCurrentTimeStr = () => {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { hour12: false });
  };

  // Re-build FaceMatcher whenever students list changes or model is loaded
  useEffect(() => {
    if (modelStatus.loaded && students.length > 0) {
      buildFaceMatcher(students, distanceThreshold);
    }
  }, [modelStatus.loaded, students, distanceThreshold]);

  // Enumerate Video Devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (e) {
        console.warn('Enumerate devices error:', e);
      }
    };
    getDevices();
  }, [selectedDeviceId]);

  // Start Camera
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
        };
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Akses kamera ditolak oleh browser. Harap izinkan akses kamera pada ikon gembok di address bar.'
          : `Gagal mengaktifkan webcam: ${err.message || 'Perangkat tidak ditemukan'}`
      );
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    // Bersihkan canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Trigger Verified Student Attendance
  const handleStudentVerified = useCallback(
    async (student: Student) => {
      const now = Date.now();
      const lastScanned = cooldownMapRef.current.get(student.id) || 0;

      // Anti-spam debounce
      if (now - lastScanned < COOLDOWN_MS) {
        return;
      }
      cooldownMapRef.current.set(student.id, now);

      const todayStr = getTodayDateStr();
      const timeStr = getCurrentTimeStr();

      // Audio Feedback Chime
      playSuccessChime();

      // Optional TTS voice
      if (voiceEnabled) {
        speakStudentName(student.name, student.class_name, mode);
      }

      // Confetti burst
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.4 },
        colors: ['#10b981', '#34d399', '#059669', '#38bdf8']
      });

      // Record to Supabase / Local
      const result = await recordAttendance(student, mode, todayStr, timeStr);

      // Show alert banner
      setVerifiedAlert({
        student,
        time: timeStr,
        mode,
        message: result.message
      });

      // Auto dismiss alert after 4.5s
      setTimeout(() => {
        setVerifiedAlert(prev => (prev?.student.id === student.id ? null : prev));
      }, 4500);

      if (result.attendance) {
        onAttendanceRecorded(result.attendance);
      }
    },
    [mode, voiceEnabled, onAttendanceRecorded]
  );

  // Main Recognition Loop
  useEffect(() => {
    let animationFrameId: number;
    let isProcessing = false;
    let lastScanTime = 0;

    const runRecognitionLoop = async () => {
      if (isCameraActive && videoRef.current && canvasRef.current && modelStatus.loaded) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Atur dimensi canvas sinkron dengan video
        if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const now = Date.now();
        // Throttle deteksi tiap 350ms agar hemat daya CPU komputer sekolah
        if (!isProcessing && now - lastScanTime > 350 && video.readyState === 4) {
          isProcessing = true;
          lastScanTime = now;

          const results = await detectFacesFromVideo(video, distanceThreshold);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Gambar bounding box untuk setiap wajah yang terdeteksi
            for (const res of results) {
              const { box, studentId, distance } = res;
              const matchedStudent = studentId ? students.find(s => s.id === studentId) : null;

              const isMatch = Boolean(matchedStudent);
              const strokeColor = isMatch ? '#10b981' : '#f59e0b'; // Hijau jika cocok, Kuning jika unknown

              // Box border
              ctx.lineWidth = 3;
              ctx.strokeStyle = strokeColor;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              // Corner accents
              const cornerSize = Math.min(box.width, box.height) * 0.2;
              ctx.lineWidth = 5;
              ctx.strokeStyle = isMatch ? '#34d399' : '#fbbf24';

              // Top-left corner
              ctx.beginPath();
              ctx.moveTo(box.x, box.y + cornerSize);
              ctx.lineTo(box.x, box.y);
              ctx.lineTo(box.x + cornerSize, box.y);
              ctx.stroke();

              // Top-right corner
              ctx.beginPath();
              ctx.moveTo(box.x + box.width - cornerSize, box.y);
              ctx.lineTo(box.x + box.width, box.y);
              ctx.lineTo(box.x + box.width, box.y + cornerSize);
              ctx.stroke();

              // Label background
              const labelText = matchedStudent
                ? `${matchedStudent.name} (${matchedStudent.class_name})`
                : 'Wajah Tidak Dikenal';
              
              ctx.font = 'bold 15px Plus Jakarta Sans, sans-serif';
              const textWidth = ctx.measureText(labelText).width;
              const padX = 12;
              const padY = 6;
              const labelY = Math.max(box.y - 30, 10);

              ctx.fillStyle = isMatch ? 'rgba(5, 150, 105, 0.95)' : 'rgba(217, 119, 6, 0.95)';
              ctx.beginPath();
              ctx.roundRect(box.x, labelY, textWidth + padX * 2, 26, 6);
              ctx.fill();

              // Label text
              ctx.fillStyle = '#ffffff';
              ctx.fillText(labelText, box.x + padX, labelY + 18);

              // Jika cocok, trigger pencatatan absensi
              if (matchedStudent) {
                handleStudentVerified(matchedStudent);
              }
            }
          }

          isProcessing = false;
        }
      }

      animationFrameId = requestAnimationFrame(runRecognitionLoop);
    };

    animationFrameId = requestAnimationFrame(runRecognitionLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraActive, modelStatus.loaded, students, distanceThreshold, handleStudentVerified]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Filter students by class and search
  const filteredStudents = students.filter(student => {
    // Siswa alumni yang sudah lulus tidak dimasukkan dalam presensi harian aktif
    if (student.status === 'Alumni') return false;

    const matchesClass = selectedClass === 'Semua Kelas' || student.class_name === selectedClass;
    const matchesSearch =
      searchQuery === '' ||
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery);

    if (!matchesClass || !matchesSearch) return false;

    const att = attendances.find(a => a.student_id === student.id);
    if (statusFilter === 'hadir') return att && att.status === 'Hadir';
    if (statusFilter === 'pulang') return att && (att.status === 'Pulang' || att.time_out);
    if (statusFilter === 'belum') return !att;

    return true;
  });

  // Calculate statistics for the selected class (siswa aktif saja)
  const classStudents = students.filter(
    s => s.status !== 'Alumni' && (selectedClass === 'Semua Kelas' || s.class_name === selectedClass)
  );
  const totalStudents = classStudents.length;

  const attendedStudentsCount = classStudents.filter(s => {
    const att = attendances.find(a => a.student_id === s.id);
    return Boolean(att);
  }).length;

  const pulangStudentsCount = classStudents.filter(s => {
    const att = attendances.find(a => a.student_id === s.id);
    return att && (att.status === 'Pulang' || att.time_out);
  }).length;

  const unrecordedStudentsCount = Math.max(0, totalStudents - attendedStudentsCount);

  // Manual check-in helper for teacher override
  const handleManualCheckIn = (student: Student, overrideMode: AttendanceMode) => {
    handleStudentVerified(student);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner Alert (when face is verified) */}
      {verifiedAlert && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-950/40 border border-emerald-400/40 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-white/20 p-1 shrink-0 overflow-hidden border border-white/30 flex items-center justify-center">
              {verifiedAlert.student.photo_url ? (
                <img
                  src={verifiedAlert.student.photo_url}
                  alt={verifiedAlert.student.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span className="font-bold text-xl text-white">
                  {verifiedAlert.student.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/25">
                  PRESENSI BERHASIL
                </span>
                <span className="text-xs font-mono text-emerald-100 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {verifiedAlert.time} WIB
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                {verifiedAlert.student.name}
              </h3>
              <p className="text-xs text-emerald-100">
                NISN: {verifiedAlert.student.nisn} • Kelas: {verifiedAlert.student.class_name} •{' '}
                {verifiedAlert.mode === 'pulang' ? 'Presensi Pulang' : 'Presensi Masuk'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerifiedAlert(null)}
            className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-medium text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main 2-Column Split Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* SISI KIRI: KAMERA PRESENSI (7 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/40 flex flex-col gap-4">
            
            {/* Camera Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    Kamera Presensi Siswa
                    {isCameraActive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Arahkan wajah siswa tepat ke dalam frame kamera
                  </p>
                </div>
              </div>

              {/* Mode Switch (Masuk vs Pulang) */}
              <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-700">
                <button
                  onClick={() => setMode('masuk')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'masuk'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Masuk (Hadir)
                </button>
                <button
                  onClick={() => setMode('pulang')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'pulang'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pulang
                </button>
              </div>
            </div>

            {/* Webcam Device Selector & Control Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <select
                  value={selectedDeviceId}
                  onChange={e => {
                    setSelectedDeviceId(e.target.value);
                    if (isCameraActive) {
                      startCamera(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                >
                  {videoDevices.length === 0 ? (
                    <option value="">Kamera Default</option>
                  ) : (
                    videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Kamera ${idx + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`p-2 rounded-xl border text-xs transition-colors ${
                    voiceEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={voiceEnabled ? 'Suara Sambutan Aktif' : 'Suara Dimatikan'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-xl border text-xs transition-colors ${
                    showSettings
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Pengaturan Sensitivitas"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {isCameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    <VideoOff className="w-4 h-4" />
                    <span>Matikan Kamera</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startCamera()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-900/40"
                  >
                    <Video className="w-4 h-4" />
                    <span>Nyalakan Kamera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Sensitivity Drawer */}
            {showSettings && (
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/80 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-semibold">Batas Toleransi Jarak Wajah (Face Distance):</span>
                  <span className="font-mono text-emerald-400 font-bold">{distanceThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.35"
                  max="0.65"
                  step="0.01"
                  value={distanceThreshold}
                  onChange={e => setDistanceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Lebih Ketat (0.35)</span>
                  <span>Standar Rekomendasi (0.55)</span>
                  <span>Lebih Longgar (0.65)</span>
                </div>
              </div>
            )}

            {/* Video Viewport Container */}
            <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/90 shadow-inner flex items-center justify-center">
              {/* HTML Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isCameraActive ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Overlay Canvas for Real-Time Bounding Boxes */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Guide Target Reticle */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border border-dashed border-emerald-400/40 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 border-t-2 border-l-2 border-emerald-400 absolute top-2 left-2"></div>
                    <div className="w-3 h-3 border-t-2 border-r-2 border-emerald-400 absolute top-2 right-2"></div>
                    <div className="w-3 h-3 border-b-2 border-l-2 border-emerald-400 absolute bottom-2 left-2"></div>
                    <div className="w-3 h-3 border-b-2 border-r-2 border-emerald-400 absolute bottom-2 right-2"></div>
                  </div>
                </div>
              )}

              {/* Inactive Camera Placeholder */}
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <VideoOff className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">Kamera Belum Aktif</h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Klik tombol &ldquo;Nyalakan Kamera&rdquo; di atas untuk membuka feed webcam dan mulai pemindaian wajah.
                    </p>
                  </div>
                  <button
                    onClick={() => startCamera()}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Mulai Presensi Sekarang</span>
                  </button>
                </div>
              )}

              {/* Scanning status banner */}
              {isCameraActive && (
                <div className="absolute bottom-3 inset-x-3 py-1.5 px-3 rounded-xl bg-slate-950/80 backdrop-blur border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Pemindaian Wajah Aktif (350ms interval)
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    {mode === 'masuk' ? '🟢 Mode Hadir' : '🔵 Mode Pulang'}
                  </span>
                </div>
              )}
            </div>

            {/* Camera error message */}
            {cameraError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Simulation & Test Bar for Teachers / Demo */}
            <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">Uji Coba Presensi Cepat:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  id="demo-student-select"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none"
                  defaultValue=""
                  onChange={e => {
                    const found = students.find(s => s.id === e.target.value);
                    if (found) {
                      handleStudentVerified(found);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>
                    Pilih Siswa Simulasi...
                  </option>
                  {students.filter(s => s.status !== 'Alumni').slice(0, 12).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class_name})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">
                  (Klik nama siswa untuk simulasi scan)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SISI KANAN: LOG KEHADIRAN REALTIME (5 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/40 flex flex-col gap-4">
            
            {/* Header: Kelas & Tanggal */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3.5">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  Log Kehadiran Realtime
                </h3>
                <p className="text-xs text-slate-400">
                  Update instan dari kamera & Supabase
                </p>
              </div>

              {/* Kelas Selector */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-400 outline-none focus:border-emerald-500"
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Stat Counters */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col">
                <span className="text-[11px] text-slate-400 font-medium">Total Siswa</span>
                <span className="text-lg font-black text-white">{totalStudents}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col">
                <span className="text-[11px] text-emerald-300 font-medium">Hadir</span>
                <span className="text-lg font-black text-emerald-400">{attendedStudentsCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col">
                <span className="text-[11px] text-amber-300 font-medium">Belum Hadir</span>
                <span className="text-lg font-black text-amber-400">{unrecordedStudentsCount}</span>
              </div>
            </div>

            {/* Search and Status Pills */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa atau NISN..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua ({filteredStudents.length})
                </button>
                <button
                  onClick={() => setStatusFilter('hadir')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === 'hadir'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400/70 hover:text-emerald-300'
                  }`}
                >
                  Hadir
                </button>
                <button
                  onClick={() => setStatusFilter('pulang')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === 'pulang'
                      ? 'bg-sky-600 text-white'
                      : 'text-sky-400/70 hover:text-sky-300'
                  }`}
                >
                  Pulang
                </button>
                <button
                  onClick={() => setStatusFilter('belum')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === 'belum'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-400/70 hover:text-amber-300'
                  }`}
                >
                  Belum Hadir
                </button>
              </div>
            </div>

            {/* Student Attendance List */}
            <div className="flex-1 overflow-y-auto max-h-[460px] space-y-2 pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
                  <Users className="w-8 h-8 text-slate-600" />
                  <p className="text-xs">Tidak ada data siswa yang cocok.</p>
                </div>
              ) : (
                filteredStudents.map(student => {
                  const att = attendances.find(a => a.student_id === student.id);
                  const isPresent = Boolean(att);
                  const isPulang = att && (att.status === 'Pulang' || att.time_out);

                  return (
                    <div
                      key={student.id}
                      className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                        isPulang
                          ? 'bg-sky-950/30 border-sky-600/30 hover:border-sky-500/50'
                          : isPresent
                          ? 'bg-emerald-950/30 border-emerald-600/40 hover:border-emerald-500/60 shadow-sm shadow-emerald-950/20'
                          : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center font-bold text-xs text-slate-300">
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
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono text-slate-300">{student.nisn}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                              {student.class_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges & Time info */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isPulang ? (
                          <div className="flex flex-col items-end">
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold">
                              Sudah Pulang
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {att?.time_out || att?.time} WIB
                            </span>
                          </div>
                        ) : isPresent && att ? (
                          <div className="flex flex-col items-end">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" /> Hadir
                            </span>
                            <span className="text-[10px] font-mono text-slate-300 mt-0.5">
                              {att.time} WIB
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleManualCheckIn(student, 'masuk')}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-400 text-[10px] font-semibold transition-colors border border-slate-700"
                              title="Tandai Hadir Manual"
                            >
                              Tandai Hadir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
