export interface Student {
  id: string;
  nisn: string;
  name: string;
  class_name: string;
  gender?: 'L' | 'P';
  face_descriptor?: number[]; // 128 float array, optional jika baru diimpor dari Excel
  photo_url?: string;
  status?: 'Aktif' | 'Alumni' | 'Pindah'; // Status siswa untuk riwayat kenaikan kelas & kelulusan
  academic_year?: string;
  created_at?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  class_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  time_out?: string; // HH:mm:ss
  status: 'Hadir' | 'Pulang' | 'Terlambat' | 'Izin' | 'Sakit';
  student?: Student;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type TabType = 'attendance' | 'enrollment' | 'classes' | 'promotion' | 'recap' | 'config';

export type AttendanceMode = 'masuk' | 'pulang';

export interface ModelLoadStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  progressMessage: string;
}

export interface DetectedFaceResult {
  student: Student | null;
  distance: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PromotionLog {
  id: string;
  date: string;
  fromClass: string;
  toClass: string;
  studentsCount: number;
  type: 'naik_kelas' | 'kelulusan';
}
