import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Student, Attendance, SupabaseConfig } from '../types';
import { SAMPLE_STUDENTS } from './sampleData';

const STORAGE_KEYS = {
  CONFIG: 'mtsn3_supabase_config',
  LOCAL_STUDENTS: 'mtsn3_local_students',
  LOCAL_ATTENDANCES: 'mtsn3_local_attendances',
  LOCAL_CLASSES: 'mtsn3_local_classes'
};

export const DEFAULT_CLASSES = ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'];

// Singleton Client
let supabaseClient: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

export function getStoredConfig(): SupabaseConfig {
  const embeddedUrl = (typeof window !== 'undefined' && (window as any).__EMBEDDED_SUPABASE_URL__) || '';
  const embeddedKey = (typeof window !== 'undefined' && (window as any).__EMBEDDED_SUPABASE_ANON_KEY__) || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Gagal membaca konfigurasi Supabase dari LocalStorage', e);
  }

  // Jika di LocalStorage kosong namun ada kredensial yang tertanam di window (GitHub Pages)
  if (embeddedUrl && embeddedKey) {
    return {
      url: embeddedUrl,
      anonKey: embeddedKey
    };
  }

  return {
    url: embeddedUrl || '',
    anonKey: embeddedKey || ''
  };
}

export function saveStoredConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  initSupabaseClient(config);
}

export function initSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const currentConfig = config || getStoredConfig();
  if (currentConfig.url && currentConfig.anonKey && currentConfig.url.startsWith('http')) {
    try {
      supabaseClient = createClient(currentConfig.url, currentConfig.anonKey);
      return supabaseClient;
    } catch (err) {
      console.error('Error inisialisasi Supabase client:', err);
      supabaseClient = null;
    }
  } else {
    supabaseClient = null;
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    return initSupabaseClient();
  }
  return supabaseClient;
}

// ==========================================
// KELOLA KELAS DINAMIS (TAMBAH / HAPUS KELAS)
// ==========================================

export function getStoredClasses(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_CLASSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(e);
  }
  localStorage.setItem(STORAGE_KEYS.LOCAL_CLASSES, JSON.stringify(DEFAULT_CLASSES));
  return DEFAULT_CLASSES;
}

export function saveStoredClasses(classes: string[]) {
  // Sort naturally (e.g. 7A, 7B, 8A, 9A)
  const uniqueClasses = Array.from(new Set(classes.map(c => c.trim()))).filter(Boolean);
  uniqueClasses.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  localStorage.setItem(STORAGE_KEYS.LOCAL_CLASSES, JSON.stringify(uniqueClasses));
}

export async function fetchClasses(): Promise<string[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('classes')
        .select('name')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        const classNames = data.map((d: any) => d.name);
        saveStoredClasses(classNames);
        return classNames;
      }
    } catch (e) {
      console.warn('Gagal fetch classes dari Supabase:', e);
    }
  }
  return getStoredClasses();
}

export async function addClass(className: string): Promise<{ success: boolean; message: string }> {
  const trimmed = className.trim().toUpperCase();
  if (!trimmed) {
    return { success: false, message: 'Nama kelas tidak boleh kosong.' };
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const grade = parseInt(trimmed.match(/\d+/)?.[0] || '7', 10);
      const { error } = await client
        .from('classes')
        .insert([{ name: trimmed, grade }])
        .select();

      if (error && error.code !== '23505') { // 23505 = duplicate key
        console.warn('Supabase add class error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase add class failed:', err);
    }
  }

  const current = getStoredClasses();
  if (!current.includes(trimmed)) {
    current.push(trimmed);
    saveStoredClasses(current);
  }
  return { success: true, message: `Kelas ${trimmed} berhasil ditambahkan!` };
}

export async function deleteClass(className: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('classes').delete().eq('name', className);
    } catch (e) {
      console.warn('Supabase delete class error:', e);
    }
  }

  const current = getStoredClasses().filter(c => c !== className);
  saveStoredClasses(current);
  return { success: true, message: `Kelas ${className} berhasil dihapus!` };
}

// ==========================================
// DATA SISWA (STUDENTS) & FALLBACK
// ==========================================

export function getLocalStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => ({
          ...s,
          status: s.status || 'Aktif'
        }));
      }
    }
    localStorage.setItem(STORAGE_KEYS.LOCAL_STUDENTS, JSON.stringify(SAMPLE_STUDENTS));
    return SAMPLE_STUDENTS;
  } catch (e) {
    return SAMPLE_STUDENTS;
  }
}

export function saveLocalStudents(students: Student[]) {
  localStorage.setItem(STORAGE_KEYS.LOCAL_STUDENTS, JSON.stringify(students));
}

export function getLocalAttendances(): Attendance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_ATTENDANCES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveLocalAttendances(attendances: Attendance[]) {
  localStorage.setItem(STORAGE_KEYS.LOCAL_ATTENDANCES, JSON.stringify(attendances));
}

// Fetch all students (Supabase first, fallback LocalStorage)
export async function fetchStudents(): Promise<{ students: Student[]; fromSupabase: boolean }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('students')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        saveLocalStudents(data);
        return { students: data as Student[], fromSupabase: true };
      }
      if (error) {
        console.warn('Gagal query Supabase students, gunakan fallback local:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, fallback local:', err);
    }
  }
  return { students: getLocalStudents(), fromSupabase: false };
}

// Save single new student
export async function saveNewStudent(studentData: Omit<Student, 'id' | 'created_at'>): Promise<{ success: boolean; student?: Student; error?: string }> {
  const client = getSupabaseClient();
  const newStudentObj: Student = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'std-' + Date.now(),
    ...studentData,
    status: studentData.status || 'Aktif',
    created_at: new Date().toISOString()
  };

  if (client) {
    try {
      const { data, error } = await client
        .from('students')
        .insert([{
          nisn: studentData.nisn,
          name: studentData.name,
          class_name: studentData.class_name,
          gender: studentData.gender || 'L',
          face_descriptor: studentData.face_descriptor || null,
          photo_url: studentData.photo_url || null,
          status: studentData.status || 'Aktif'
        }])
        .select()
        .single();

      if (!error && data) {
        const local = getLocalStudents();
        local.push(data as Student);
        saveLocalStudents(local);
        return { success: true, student: data as Student };
      }
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Fallback ke LocalStorage
  const local = getLocalStudents();
  if (local.some(s => s.nisn === studentData.nisn)) {
    return { success: false, error: `Siswa dengan NISN ${studentData.nisn} sudah terdaftar!` };
  }
  local.push(newStudentObj);
  saveLocalStudents(local);
  return { success: true, student: newStudentObj };
}

// Bulk Import Siswa dari Excel / CSV
export async function saveBulkStudents(
  importedStudents: Array<{
    nisn: string;
    name: string;
    class_name: string;
    gender?: 'L' | 'P';
    status?: 'Aktif' | 'Alumni' | 'Pindah';
  }>
): Promise<{ successCount: number; updatedCount: number; errorCount: number; errors: string[] }> {
  let successCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  const client = getSupabaseClient();
  const locals = getLocalStudents();

  for (const s of importedStudents) {
    if (!s.nisn || !s.name || !s.class_name) {
      errorCount++;
      errors.push(`Baris tidak valid: NISN, Nama, atau Kelas kosong (${s.name || s.nisn || 'Data Kosong'})`);
      continue;
    }

    const cleanNisn = String(s.nisn).trim();
    const cleanName = String(s.name).trim();
    const cleanClass = String(s.class_name).trim().toUpperCase();
    const gender = s.gender === 'P' ? 'P' : 'L';

    // Cek apakah NISN sudah ada
    const existingIndex = locals.findIndex(std => std.nisn === cleanNisn);

    if (existingIndex >= 0) {
      // Perbarui info kelas dan nama tanpa menghapus face descriptor yang sudah ada
      locals[existingIndex].name = cleanName;
      locals[existingIndex].class_name = cleanClass;
      locals[existingIndex].gender = gender;
      locals[existingIndex].status = s.status || locals[existingIndex].status || 'Aktif';
      updatedCount++;

      if (client) {
        try {
          await client
            .from('students')
            .update({
              name: cleanName,
              class_name: cleanClass,
              gender: gender,
              status: locals[existingIndex].status
            })
            .eq('id', locals[existingIndex].id);
        } catch (e) {
          console.warn('Error updating Supabase student:', e);
        }
      }
    } else {
      // Tambah baru
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'std-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newStd: Student = {
        id: newId,
        nisn: cleanNisn,
        name: cleanName,
        class_name: cleanClass,
        gender: gender,
        status: s.status || 'Aktif',
        face_descriptor: undefined,
        created_at: new Date().toISOString()
      };

      locals.push(newStd);
      successCount++;

      if (client) {
        try {
          await client.from('students').insert([{
            id: newId,
            nisn: cleanNisn,
            name: cleanName,
            class_name: cleanClass,
            gender: gender,
            status: 'Aktif',
            face_descriptor: null,
            photo_url: null
          }]);
        } catch (e: any) {
          console.warn('Error inserting to Supabase:', e);
        }
      }
    }
  }

  saveLocalStudents(locals);
  return { successCount, updatedCount, errorCount, errors };
}

// Update / Daftarkan Wajah untuk Siswa Tertentu (Enrollment Susulan dari Import Excel)
export async function updateStudentFace(
  studentId: string,
  faceDescriptor: number[],
  photoUrl?: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  const locals = getLocalStudents();
  const idx = locals.findIndex(s => s.id === studentId);

  if (idx === -1) {
    return { success: false, message: 'Siswa tidak ditemukan.' };
  }

  locals[idx].face_descriptor = faceDescriptor;
  if (photoUrl) locals[idx].photo_url = photoUrl;
  saveLocalStudents(locals);

  if (client) {
    try {
      const { error } = await client
        .from('students')
        .update({
          face_descriptor: faceDescriptor,
          photo_url: photoUrl || locals[idx].photo_url || null
        })
        .eq('id', studentId);

      if (error) {
        console.warn('Gagal update face descriptor ke Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Supabase update face error:', e);
    }
  }

  return { success: true, message: `Wajah siswa ${locals[idx].name} berhasil didaftarkan!` };
}

// Naik Kelas & Kelulusan (Promote Students)
export async function promoteStudents(
  studentIds: string[],
  targetClass: string,
  isGraduation: boolean = false
): Promise<{ success: boolean; count: number; message: string }> {
  if (studentIds.length === 0) {
    return { success: false, count: 0, message: 'Tidak ada siswa yang dipilih.' };
  }

  const client = getSupabaseClient();
  const locals = getLocalStudents();
  let modifiedCount = 0;

  for (const id of studentIds) {
    const idx = locals.findIndex(s => s.id === id);
    if (idx >= 0) {
      if (isGraduation) {
        locals[idx].status = 'Alumni';
        locals[idx].class_name = 'Alumni (Lulus)';
      } else {
        locals[idx].class_name = targetClass;
        locals[idx].status = 'Aktif';
      }
      modifiedCount++;
    }
  }

  saveLocalStudents(locals);

  if (client) {
    try {
      if (isGraduation) {
        await client
          .from('students')
          .update({
            status: 'Alumni',
            class_name: 'Alumni (Lulus)'
          })
          .in('id', studentIds);
      } else {
        await client
          .from('students')
          .update({
            class_name: targetClass,
            status: 'Aktif'
          })
          .in('id', studentIds);
      }
    } catch (e) {
      console.warn('Supabase promotion update error:', e);
    }
  }

  const actionName = isGraduation ? 'Kelulusan ke status Alumni' : `Kenaikan ke Kelas ${targetClass}`;
  return {
    success: true,
    count: modifiedCount,
    message: `Berhasil memproses ${modifiedCount} siswa untuk ${actionName}!`
  };
}

// Delete student
export async function deleteStudent(studentId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('students').delete().eq('id', studentId);
    } catch (e) {
      console.warn('Gagal menghapus dari Supabase:', e);
    }
  }
  const local = getLocalStudents().filter(s => s.id !== studentId);
  saveLocalStudents(local);
  return true;
}

// Fetch attendances for a specific date
export async function fetchAttendances(dateStr: string): Promise<Attendance[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('attendances')
        .select('*, student:students(*)')
        .eq('date', dateStr)
        .order('time', { ascending: false });

      if (!error && data) {
        return data as Attendance[];
      }
    } catch (err) {
      console.warn('Supabase attendances fetch failed:', err);
    }
  }

  const locals = getLocalAttendances();
  const students = getLocalStudents();
  return locals
    .filter(a => a.date === dateStr)
    .map(a => ({
      ...a,
      student: students.find(s => s.id === a.student_id)
    }))
    .sort((a, b) => b.time.localeCompare(a.time));
}

// Record Attendance
export async function recordAttendance(
  student: Student,
  mode: 'masuk' | 'pulang' = 'masuk',
  todayDateStr: string,
  currentTimeStr: string
): Promise<{ success: boolean; attendance?: Attendance; message: string; isDuplicate?: boolean }> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data: existing } = await client
        .from('attendances')
        .select('*')
        .eq('student_id', student.id)
        .eq('date', todayDateStr)
        .maybeSingle();

      if (existing) {
        if (mode === 'pulang') {
          if (existing.time_out) {
            return {
              success: false,
              isDuplicate: true,
              message: `${student.name} sudah tercatat presensi pulang pada ${existing.time_out} WIB.`
            };
          }
          const { data: updated, error: updateError } = await client
            .from('attendances')
            .update({
              time_out: currentTimeStr,
              status: 'Pulang'
            })
            .eq('id', existing.id)
            .select('*, student:students(*)')
            .single();

          if (!updateError && updated) {
            return {
              success: true,
              attendance: updated as Attendance,
              message: `Presensi pulang berhasil dicatat untuk ${student.name} (${currentTimeStr} WIB).`
            };
          }
        } else {
          return {
            success: false,
            isDuplicate: true,
            attendance: existing as Attendance,
            message: `${student.name} sudah tercatat presensi masuk pada ${existing.time} WIB.`
          };
        }
      } else {
        const newRecord = {
          student_id: student.id,
          class_name: student.class_name,
          date: todayDateStr,
          time: currentTimeStr,
          time_out: mode === 'pulang' ? currentTimeStr : null,
          status: mode === 'pulang' ? 'Pulang' : 'Hadir'
        };

        const { data: inserted, error: insertError } = await client
          .from('attendances')
          .insert(newRecord)
          .select('*, student:students(*)')
          .single();

        if (!insertError && inserted) {
          return {
            success: true,
            attendance: inserted as Attendance,
            message: `Presensi masuk ${student.name} (${student.class_name}) berhasil dicatat!`
          };
        }
      }
    } catch (err: any) {
      console.warn('Error Supabase record attendance, fallback local:', err);
    }
  }

  // Fallback Local Storage
  const locals = getLocalAttendances();
  const existingIdx = locals.findIndex(a => a.student_id === student.id && a.date === todayDateStr);

  if (existingIdx >= 0) {
    const existing = locals[existingIdx];
    if (mode === 'pulang') {
      if (existing.time_out) {
        return {
          success: false,
          isDuplicate: true,
          message: `${student.name} sudah presensi pulang pada ${existing.time_out} WIB.`
        };
      }
      existing.time_out = currentTimeStr;
      existing.status = 'Pulang';
      saveLocalAttendances(locals);
      return {
        success: true,
        attendance: { ...existing, student },
        message: `Presensi pulang berhasil: ${student.name} (${currentTimeStr} WIB)`
      };
    } else {
      return {
        success: false,
        isDuplicate: true,
        attendance: { ...existing, student },
        message: `${student.name} sudah absen masuk pada ${existing.time} WIB.`
      };
    }
  } else {
    const newRecord: Attendance = {
      id: 'local-' + Date.now(),
      student_id: student.id,
      class_name: student.class_name,
      date: todayDateStr,
      time: currentTimeStr,
      time_out: mode === 'pulang' ? currentTimeStr : undefined,
      status: mode === 'pulang' ? 'Pulang' : 'Hadir',
      student
    };
    locals.unshift(newRecord);
    saveLocalAttendances(locals);
    return {
      success: true,
      attendance: newRecord,
      message: `Presensi masuk ${student.name} (${student.class_name}) berhasil dicatat!`
    };
  }
}

// Subscribe to realtime attendances
export function subscribeToRealtimeAttendances(
  onInsert: (attendance: Attendance) => void,
  onUpdate: (attendance: Attendance) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  try {
    if (realtimeChannel) {
      client.removeChannel(realtimeChannel);
    }

    realtimeChannel = client
      .channel('public:attendances')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances' },
        async (payload) => {
          const newAtt = payload.new as Attendance;
          const { data: std } = await client
            .from('students')
            .select('*')
            .eq('id', newAtt.student_id)
            .maybeSingle();

          onInsert({
            ...newAtt,
            student: (std as Student) || undefined
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'attendances' },
        async (payload) => {
          const updAtt = payload.new as Attendance;
          const { data: std } = await client
            .from('students')
            .select('*')
            .eq('id', updAtt.student_id)
            .maybeSingle();

          onUpdate({
            ...updAtt,
            student: (std as Student) || undefined
          });
        }
      )
      .subscribe();

    return () => {
      if (realtimeChannel) {
        client.removeChannel(realtimeChannel);
      }
    };
  } catch (err) {
    console.error('Error setting up Supabase realtime subscription:', err);
    return () => {};
  }
}

// Test Connection
export async function testSupabaseConnection(config: SupabaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(config.url, config.anonKey);
    const { error } = await testClient.from('students').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Terhubung ke Supabase! Catatan: Tabel students belum dibuat, silakan jalankan skrip SQL di Supabase SQL Editor.'
        };
      }
      return { success: false, message: `Error Supabase: ${error.message} (${error.code || ''})` };
    }
    return { success: true, message: 'Koneksi ke Supabase berhasil dan tabel terverifikasi!' };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungkan: ${err.message || 'Periksa kembali URL dan Anon Key'}` };
  }
}
