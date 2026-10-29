import { Student } from '../types';

// Helper untuk menghasilkan 128 float pseudo-descriptor yang realistis untuk data demo
export function generateRandomDescriptor(seed: number): number[] {
  const result: number[] = [];
  let s = seed;
  for (let i = 0; i < 128; i++) {
    // Linear congruential generator untuk konsistensi nilai
    s = (s * 9301 + 49297) % 233280;
    const rnd = (s / 233280) * 0.4 - 0.2; // Nilai floating -0.2 sampai 0.2
    result.push(Number(rnd.toFixed(4)));
  }
  // Normalisasi vektor euclidean L2 norm
  const norm = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
  return result.map(val => Number((val / norm).toFixed(6)));
}

export const SAMPLE_STUDENTS: Student[] = [
  {
    id: 'b1a2c3d4-0001-4000-8000-000000000001',
    nisn: '0089123451',
    name: 'Ahmad Faiz Al-Farizi',
    class_name: '7A',
    gender: 'L',
    face_descriptor: generateRandomDescriptor(101),
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'b1a2c3d4-0002-4000-8000-000000000002',
    nisn: '0089123452',
    name: 'Siti Nur Aisyah',
    class_name: '7A',
    gender: 'P',
    face_descriptor: generateRandomDescriptor(102),
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'b1a2c3d4-0003-4000-8000-000000000003',
    nisn: '0089123453',
    name: 'Muhammad Rizky Pratama',
    class_name: '7A',
    gender: 'L',
    face_descriptor: generateRandomDescriptor(103),
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'b1a2c3d4-0004-4000-8000-000000000004',
    nisn: '0089123454',
    name: 'Zahra Annisa Putri',
    class_name: '7B',
    gender: 'P',
    face_descriptor: generateRandomDescriptor(104),
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'b1a2c3d4-0005-4000-8000-000000000005',
    nisn: '0089123455',
    name: 'Dimas Bagus Wicaksono',
    class_name: '7B',
    gender: 'L',
    face_descriptor: generateRandomDescriptor(105),
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'b1a2c3d4-0006-4000-8000-000000000006',
    nisn: '0089123456',
    name: 'Nabila Khairunnisa',
    class_name: '8A',
    gender: 'P',
    face_descriptor: generateRandomDescriptor(106),
    photo_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'b1a2c3d4-0007-4000-8000-000000000007',
    nisn: '0089123457',
    name: 'Fandi Kurniawan',
    class_name: '8A',
    gender: 'L',
    face_descriptor: generateRandomDescriptor(107),
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'b1a2c3d4-0008-4000-8000-000000000008',
    nisn: '0089123458',
    name: 'Hafizah Rahmawati',
    class_name: '9A',
    gender: 'P',
    face_descriptor: generateRandomDescriptor(108),
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces&q=80',
    created_at: new Date().toISOString()
  }
];

export const AVAILABLE_CLASSES = ['Semua Kelas', '7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'];
