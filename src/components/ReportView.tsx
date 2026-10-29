import React, { useState } from 'react';
import { Student, Attendance } from '../types';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  Clock,
  UserCheck,
  Building,
  GraduationCap
} from 'lucide-react';

interface ReportViewProps {
  students: Student[];
  attendances: Attendance[];
  availableClasses: string[];
  currentDateStr: string;
}

export const ReportView: React.FC<ReportViewProps> = ({
  students,
  attendances,
  availableClasses,
  currentDateStr
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('Semua Kelas');
  const [selectedDate, setSelectedDate] = useState<string>(currentDateStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter students based on class and search
  const classStudents = students.filter(
    s => selectedClass === 'Semua Kelas' || s.class_name === selectedClass
  );

  const filteredStudents = classStudents.filter(
    s =>
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery)
  );

  // Statistics
  const total = classStudents.length;
  const hadirCount = classStudents.filter(s => {
    const att = attendances.find(a => a.student_id === s.id && a.date === selectedDate);
    return Boolean(att);
  }).length;
  const pulangCount = classStudents.filter(s => {
    const att = attendances.find(a => a.student_id === s.id && a.date === selectedDate);
    return att && (att.status === 'Pulang' || att.time_out);
  }).length;
  const belumCount = Math.max(0, total - hadirCount);
  const percentHadir = total > 0 ? Math.round((hadirCount / total) * 100) : 0;

  // Export to CSV formatted for Indonesian Microsoft Excel
  const handleExportCSV = () => {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Tanggal', 'Jam Hadir', 'Jam Pulang', 'Status Kehadiran'];
    
    const rows = filteredStudents.map((s, idx) => {
      const att = attendances.find(a => a.student_id === s.id && a.date === selectedDate);
      const jamHadir = att ? att.time : '-';
      const jamPulang = att?.time_out ? att.time_out : '-';
      const status = att ? (att.time_out ? 'Pulang' : 'Hadir') : 'Belum Hadir';

      return [
        idx + 1,
        `"${s.nisn}"`,
        `"${s.name}"`,
        `"${s.class_name}"`,
        `"${s.gender || 'L'}"`,
        `"${selectedDate}"`,
        `"${jamHadir}"`,
        `"${jamPulang}"`,
        `"${status}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Presensi_MTsN3Magetan_${selectedClass}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Rekap & Laporan Presensi Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Laporan kehadiran harian MTsN 3 Magetan siap unduh (Excel/CSV) dan siap cetak lembar absen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV / Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Lembar Presensi</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Tanggal Picker */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white outline-none font-mono"
            />
          </div>

          {/* Kelas Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs font-semibold text-emerald-400 outline-none"
            >
              {availableClasses.map(c => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa atau NISN..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Total Siswa</span>
          <span className="text-2xl font-black text-white mt-1">{total}</span>
          <span className="text-[11px] text-slate-500 mt-1">Kelas: {selectedClass}</span>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-emerald-300 font-medium">Siswa Hadir</span>
          <span className="text-2xl font-black text-emerald-400 mt-1">{hadirCount}</span>
          <span className="text-[11px] text-emerald-400/80 mt-1 font-semibold">{percentHadir}% Kehadiran</span>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-sky-300 font-medium">Siswa Pulang</span>
          <span className="text-2xl font-black text-sky-400 mt-1">{pulangCount}</span>
          <span className="text-[11px] text-sky-400/80 mt-1">Check-out Tercatat</span>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-amber-300 font-medium">Belum Hadir</span>
          <span className="text-2xl font-black text-amber-400 mt-1">{belumCount}</span>
          <span className="text-[11px] text-amber-400/80 mt-1">Perlu Konfirmasi</span>
        </div>
      </div>

      {/* Printable Report Section with Official Header */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-slate-950/40 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Kop Surat Resmi Madrasah (Visible on Print and Screen) */}
        <div className="border-b-2 border-slate-600 print:border-black pb-4 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-600 print:border print:border-black text-white font-extrabold flex items-center justify-center text-lg shadow">
              M3
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white print:text-black">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </h1>
              <h2 className="text-sm font-extrabold text-emerald-400 print:text-black">
                MADRASAH TSANAWIYAH NEGERI 3 MAGETAN
              </h2>
              <p className="text-[11px] text-slate-400 print:text-gray-600">
                Laporan Rekapitulasi Presensi Wajah Siswa Harian • Tanggal: {selectedDate}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 print:text-gray-700 hidden sm:block">
            <span className="font-semibold text-slate-200 print:text-black">Kelas: {selectedClass}</span>
            <p className="text-[10px]">Dicetak: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Table of Attendances */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 print:border-black text-slate-300 print:text-black font-bold uppercase text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">NISN</th>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3">Jam Hadir</th>
                <th className="py-2.5 px-3">Jam Pulang</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 print:divide-gray-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 print:text-gray-500">
                    Tidak ada catatan kehadiran pada tanggal ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const att = attendances.find(
                    a => a.student_id === s.id && a.date === selectedDate
                  );
                  const isHadir = Boolean(att);
                  const isPulang = att && (att.status === 'Pulang' || att.time_out);

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-700/30 print:hover:bg-transparent text-slate-200 print:text-black transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 print:text-gray-700">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium">{s.nisn}</td>
                      <td className="py-2.5 px-3 font-bold text-white print:text-black">
                        {s.name}
                      </td>
                      <td className="py-2.5 px-3">{s.class_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300 print:text-black">
                        {att ? `${att.time} WIB` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300 print:text-black">
                        {att?.time_out ? `${att.time_out} WIB` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isPulang ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 print:border print:border-sky-700 print:text-sky-800 text-[10px] font-bold">
                            Pulang
                          </span>
                        ) : isHadir ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 print:border print:border-emerald-700 print:text-emerald-800 text-[10px] font-bold">
                            Hadir
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 print:border print:border-gray-400 print:text-gray-600 text-[10px]">
                            Belum Hadir
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan Guru Piket (Visible on Print) */}
        <div className="hidden print:flex justify-between mt-12 pt-6 text-xs text-black border-t border-gray-300">
          <div className="text-center w-48">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala MTsN 3 Magetan</p>
            <div className="h-16"></div>
            <p className="font-bold underline">( ............................................ )</p>
            <p>NIP. .....................................</p>
          </div>

          <div className="text-center w-48">
            <p>Magetan, {selectedDate}</p>
            <p className="font-bold">Guru Piket / Operator</p>
            <div className="h-16"></div>
            <p className="font-bold underline">( ............................................ )</p>
            <p>NIP. .....................................</p>
          </div>
        </div>

      </div>
    </div>
  );
};
