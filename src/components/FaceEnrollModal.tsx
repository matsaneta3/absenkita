import React, { useState, useRef } from 'react';
import { Student, ModelLoadStatus } from '../types';
import { extractFaceDescriptorFromInput, playSuccessChime } from '../lib/faceApi';
import { updateStudentFace } from '../lib/supabase';
import { generateRandomDescriptor } from '../lib/sampleData';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  UserCheck
} from 'lucide-react';

interface FaceEnrollModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onSuccess: () => void;
  modelStatus: ModelLoadStatus;
}

export const FaceEnrollModal: React.FC<FaceEnrollModalProps> = ({
  isOpen,
  student,
  onClose,
  onSuccess,
  modelStatus
}) => {
  const [method, setMethod] = useState<'camera' | 'upload'>('camera');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Camera stream ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  if (!isOpen || !student) return null;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      alert('Gagal membuka kamera: ' + (err.message || 'Periksa izin kamera'));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewImage(dataUrl);
    stopCamera();

    await processImageForFace(canvas);
  };

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
        await processImageForFace(img);
      };
    };
    reader.readAsDataURL(file);
  };

  const processImageForFace = async (
    element: HTMLImageElement | HTMLCanvasElement
  ) => {
    setIsExtracting(true);
    setStatusMsg({ success: false, text: 'Menganalisis wajah dengan AI Face-API...' });

    try {
      if (modelStatus.loaded) {
        const res = await extractFaceDescriptorFromInput(element);
        if (res.descriptor && res.descriptor.length === 128) {
          setDescriptor(res.descriptor);
          setStatusMsg({
            success: true,
            text: 'Wajah terdeteksi! Vektor 128-float siap disimpan.'
          });
          playSuccessChime();
        } else {
          setDescriptor(null);
          setStatusMsg({
            success: false,
            text: res.error || 'Wajah tidak terdeteksi jelas. Harap ulangi foto.'
          });
        }
      } else {
        const sim = generateRandomDescriptor(Date.now() % 100000);
        setDescriptor(sim);
        setStatusMsg({
          success: true,
          text: 'Vektor wajah simulasi berhasil dibuat (AI Model offline).'
        });
        playSuccessChime();
      }
    } catch (e: any) {
      setStatusMsg({
        success: false,
        text: 'Error ekstraksi: ' + e.message
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveFace = async () => {
    if (!descriptor || descriptor.length !== 128) {
      alert('Vektor wajah belum siap!');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateStudentFace(student.id, descriptor, previewImage || undefined);
      if (res.success) {
        onSuccess();
        handleClose();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setPreviewImage(null);
    setDescriptor(null);
    setStatusMsg(null);
    onClose();
  };

  const hasFace = Boolean(student.face_descriptor && student.face_descriptor.length === 128);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-emerald-950/40 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Daftarkan / Edit Wajah Siswa
              </h3>
              <p className="text-xs text-slate-400">
                Perekaman vektor biometrik untuk pengenalan wajah otomatis
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Student Info Card */}
          <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-700 overflow-hidden flex items-center justify-center text-sm font-bold text-white shrink-0 border border-slate-600">
                {student.photo_url ? (
                  <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  student.name.charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white truncate">{student.name}</h4>
                <p className="text-xs text-slate-400">
                  NISN: <span className="font-mono text-slate-200">{student.nisn}</span> • Kelas: {student.class_name}
                </p>
              </div>
            </div>

            <div>
              {hasFace ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                  Wajah Terdaftar
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                  Belum Ada Wajah
                </span>
              )}
            </div>
          </div>

          {/* Mode Switcher: Camera vs Upload */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMethod('camera');
                startCamera();
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                method === 'camera'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Gunakan Kamera Langsung</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod('upload');
                stopCamera();
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                method === 'upload'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Foto File</span>
            </button>
          </div>

          {/* Camera Viewport */}
          {method === 'camera' && (
            <div className="space-y-2">
              <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                />
                {!isCameraActive && (
                  <div className="flex flex-col items-center gap-2 text-center p-4">
                    <Camera className="w-8 h-8 text-slate-600" />
                    <span className="text-xs text-slate-400">Kamera belum dinyalakan</span>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Nyalakan Kamera
                    </button>
                  </div>
                )}
              </div>

              {isCameraActive && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto & Ekstraksi Wajah</span>
                </button>
              )}
            </div>
          )}

          {/* Upload Viewport */}
          {method === 'upload' && (
            <div className="p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl bg-slate-950/60 text-center transition-colors">
              <input
                type="file"
                id="modal-upload-input"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="modal-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Pilih Foto Wajah Siswa ({student.name})
                </span>
                <span className="text-[10px] text-slate-500">
                  Pastikan foto jelas menghadap ke depan dan pencahayaan terang
                </span>
              </label>
            </div>
          )}

          {/* Snapshot Preview & Status */}
          {previewImage && (
            <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 flex items-center gap-3">
              <img
                src={previewImage}
                alt="Hasil Foto"
                className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isExtracting ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menganalisis...
                    </span>
                  ) : descriptor ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 128-Dimensi Vektor Siap
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-rose-400 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" /> Belum Terverifikasi
                    </span>
                  )}
                </div>
                {statusMsg && (
                  <p className="text-[11px] text-slate-300 mt-1">{statusMsg.text}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Batal
          </button>

          <button
            onClick={handleSaveFace}
            disabled={!descriptor || isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-950/40"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Wajah...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Simpan Wajah Siswa Ini</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
