/**
 * Skrip SQL Migrasi Database Supabase
 * Sistem Absensi Wajah Siswa MTsN 3 Magetan
 * 
 * Petunjuk Penggunaan untuk Guru / Teknisi Sekolah:
 * 1. Buka dashboard proyek Supabase Anda (https://app.supabase.com)
 * 2. Masuk ke menu "SQL Editor" pada bilah navigasi kiri
 * 3. Klik "New query", salin dan tempelkan seluruh kode SQL di bawah ini
 * 4. Klik tombol "Run" (atau Ctrl + Enter) untuk mengeksekusi
 */

export const SUPABASE_SQL_SCRIPT = `-- ============================================================
-- SISTEM ABSENSI WAJAH SISWA MTSN 3 MAGETAN
-- Skema Database PostgreSQL / Supabase
-- Mendukung: Import Siswa Excel, Manajemen Kelas Dinamis,
-- Perekaman Wajah Susulan, & Kenaikan Kelas/Alumni
-- ============================================================

-- 1. Aktifkan Ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Buat Tabel Siswa (students)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    gender TEXT DEFAULT 'L',
    face_descriptor JSONB, -- Array 128 float (boleh NULL jika baru diimpor dari Excel)
    photo_url TEXT,
    status TEXT DEFAULT 'Aktif' NOT NULL, -- 'Aktif', 'Alumni', 'Pindah'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Migrasi tambahan jika tabel students sudah dibuat sebelumnya:
ALTER TABLE public.students ALTER COLUMN face_descriptor DROP NOT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'L';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- 3. Buat Tabel Kelas (classes)
CREATE TABLE IF NOT EXISTS public.classes (
    name TEXT PRIMARY KEY,
    grade INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Buat Tabel Absensi (attendances)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    time TIME DEFAULT CURRENT_TIME NOT NULL,
    time_out TIME,
    status TEXT DEFAULT 'Hadir' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Mencegah absensi ganda oleh siswa yang sama pada hari yang sama
    CONSTRAINT unique_student_attendance_per_day UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON public.attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_class_date ON public.attendances(class_name, date);

-- 5. Pengaturan Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Policy untuk Tabel students
CREATE POLICY "Public Read Students" ON public.students FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Insert Students" ON public.students FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public Update Students" ON public.students FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Public Delete Students" ON public.students FOR DELETE TO anon, authenticated USING (true);

-- Policy untuk Tabel classes
CREATE POLICY "Public Read Classes" ON public.classes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Insert Classes" ON public.classes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public Update Classes" ON public.classes FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Public Delete Classes" ON public.classes FOR DELETE TO anon, authenticated USING (true);

-- Policy untuk Tabel attendances
CREATE POLICY "Public Read Attendances" ON public.attendances FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Insert Attendances" ON public.attendances FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public Update Attendances" ON public.attendances FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Public Delete Attendances" ON public.attendances FOR DELETE TO anon, authenticated USING (true);

-- 6. Aktifkan Supabase Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- 7. Data Awal Kelas MTsN 3 Magetan (Optional Default)
INSERT INTO public.classes (name, grade) VALUES
    ('7A', 7), ('7B', 7), ('7C', 7),
    ('8A', 8), ('8B', 8), ('8C', 8),
    ('9A', 9), ('9B', 9), ('9C', 9)
ON CONFLICT (name) DO NOTHING;
`;
