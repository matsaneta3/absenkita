import { Student, ModelLoadStatus } from '../types';

// Declare global window faceapi
declare global {
  interface Window {
    faceapi: any;
  }
}

// Model URLs from CDN (dengan beberapa mirror cadangan)
const MODEL_URLS = [
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/',
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/',
  'https://justadudewhohacks.github.io/face-api.js/models/'
];

let faceMatcher: any = null;
let modelsLoaded = false;
let modelsLoading = false;

// Audio Context Singleton for Chime sound
let audioCtx: AudioContext | null = null;

export function playSuccessChime() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // Suara harmonis 2 nada "ding-dong" (587.33 Hz - D5 ke 880 Hz - A5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Audio chime warning:', e);
  }
}

export function speakStudentName(name: string, className: string, mode: 'masuk' | 'pulang' = 'masuk') {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = mode === 'masuk' 
        ? `Selamat pagi ${name}. Presensi kelas ${className} tercatat.` 
        : `Sampai jumpa ${name}. Hati-hati di jalan.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    // optional speech
  }
}

// Inisialisasi & load bobot model face-api
export async function loadFaceApiModels(
  onStatusUpdate?: (status: ModelLoadStatus) => void,
  forceReload = false
): Promise<boolean> {
  if (modelsLoaded && !forceReload) return true;
  if (modelsLoading) return false;

  modelsLoading = true;
  onStatusUpdate?.({
    loaded: false,
    loading: true,
    error: null,
    progressMessage: 'Memeriksa ketersediaan library face-api.js...'
  });

  // Pastikan window.faceapi ada (tunggu bila CDN sedang download)
  let attempts = 0;
  while (!window.faceapi && attempts < 20) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (!window.faceapi) {
    const errorMsg = 'Library face-api.js belum terpasang atau gagal dimuat dari CDN.';
    onStatusUpdate?.({
      loaded: false,
      loading: false,
      error: errorMsg,
      progressMessage: errorMsg
    });
    modelsLoading = false;
    return false;
  }

  const faceapi = window.faceapi;

  // Coba muat model dari url yang tersedia
  for (const modelBase of MODEL_URLS) {
    try {
      onStatusUpdate?.({
        loaded: false,
        loading: true,
        error: null,
        progressMessage: 'Memuat model deteksi wajah (SSD MobileNet)...'
      });
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelBase);

      onStatusUpdate?.({
        loaded: false,
        loading: true,
        error: null,
        progressMessage: 'Memuat model kontur landmark wajah (68 titik)...'
      });
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelBase);

      onStatusUpdate?.({
        loaded: false,
        loading: true,
        error: null,
        progressMessage: 'Memuat model rekognisi & ekstraksi 128-float (FaceNet)...'
      });
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelBase);

      modelsLoaded = true;
      modelsLoading = false;
      onStatusUpdate?.({
        loaded: true,
        loading: false,
        error: null,
        progressMessage: 'Model Face-API siap digunakan!'
      });
      return true;
    } catch (err: any) {
      console.warn(`Gagal memuat model dari ${modelBase}, mencoba mirror cadangan...`, err);
    }
  }

  modelsLoading = false;
  const failureMsg = 'Gagal mengunduh bobot model dari jaringan. Mode offline tetap dapat digunakan via tombol simulasi.';
  onStatusUpdate?.({
    loaded: false,
    loading: false,
    error: failureMsg,
    progressMessage: failureMsg
  });
  return false;
}

// Build FaceMatcher dari daftar siswa di memori browser
export function buildFaceMatcher(students: Student[], distanceThreshold = 0.55): any {
  if (!window.faceapi || !modelsLoaded) {
    return null;
  }

  const faceapi = window.faceapi;
  const labeledDescriptors: any[] = [];

  for (const student of students) {
    if (student.face_descriptor && Array.isArray(student.face_descriptor) && student.face_descriptor.length === 128) {
      const float32 = new Float32Array(student.face_descriptor);
      // Simpan format student.id sebagai label
      const labeled = new faceapi.LabeledFaceDescriptors(student.id, [float32]);
      labeledDescriptors.push(labeled);
    }
  }

  if (labeledDescriptors.length === 0) {
    faceMatcher = null;
    return null;
  }

  faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, distanceThreshold);
  return faceMatcher;
}

export function getFaceMatcher() {
  return faceMatcher;
}

// Ekstraksi deteksi wajah dari elemen video
export async function detectFacesFromVideo(
  video: HTMLVideoElement,
  distanceThreshold = 0.55
): Promise<Array<{
  box: { x: number; y: number; width: number; height: number };
  studentId: string | null;
  distance: number;
}>> {
  if (!window.faceapi || !modelsLoaded || !faceMatcher || video.paused || video.ended || video.readyState < 2) {
    return [];
  }

  const faceapi = window.faceapi;

  try {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      return [];
    }

    return detections.map((det: any) => {
      const box = det.detection.box;
      const match = faceMatcher.findBestMatch(det.descriptor);

      let studentId: string | null = null;
      let dist = match.distance;

      if (match.label !== 'unknown' && match.distance <= distanceThreshold) {
        studentId = match.label;
      }

      return {
        box: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        },
        studentId,
        distance: Number(dist.toFixed(4))
      };
    });
  } catch (err) {
    console.error('Error saat deteksi wajah frame video:', err);
    return [];
  }
}

// Ekstrak Face Descriptor 128-float untuk pendaftaran siswa baru
export async function extractFaceDescriptorFromInput(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{ descriptor: number[] | null; error: string | null }> {
  if (!window.faceapi || !modelsLoaded) {
    return {
      descriptor: null,
      error: 'Model pengenalan wajah belum selesai dimuat. Harap tunggu sebentar.'
    };
  }

  const faceapi = window.faceapi;

  try {
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        descriptor: null,
        error: 'Tidak ditemukan wajah yang jelas pada gambar. Pastikan pencahayaan cukup dan wajah menghadap ke kamera.'
      };
    }

    const descriptorArray = Array.from(detection.descriptor) as number[];
    return {
      descriptor: descriptorArray,
      error: null
    };
  } catch (e: any) {
    return {
      descriptor: null,
      error: 'Gagal menganalisis wajah: ' + (e.message || 'Unknown error')
    };
  }
}
