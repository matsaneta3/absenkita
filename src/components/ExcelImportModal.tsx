import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveBulkStudents } from '../lib/supabase';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Loader2,
  Users
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableClasses: string[];
}

interface ParsedRow {
  nisn: string;
  name: string;
  class_name: string;
  gender: 'L' | 'P';
  isValid: boolean;
  error?: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableClasses
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);

  if (!isOpen) return null;

  // Unduh Template Excel Resmi MTsN 3 Magetan
  const downloadTemplate = () => {
    const templateData = [
      {
        NISN: '0089123460',
        'Nama Lengkap': 'Bayu Arya Pratama',
        Kelas: '7A',
        'Jenis Kelamin (L/P)': 'L'
      },
      {
        NISN: '0089123461',
        'Nama Lengkap': 'Citra Melati Anggraini',
        Kelas: '7A',
        'Jenis Kelamin (L/P)': 'P'
      },
      {
        NISN: '0089123462',
        'Nama Lengkap': 'Fadilah Kurnia Rahayu',
        Kelas: '7B',
        'Jenis Kelamin (L/P)': 'P'
      },
      {
        NISN: '0089123463',
        'Nama Lengkap': 'Galang Pratama Putra',
        Kelas: '8A',
        'Jenis Kelamin (L/P)': 'L'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Atur lebar kolom agar rapi
    worksheet['!cols'] = [
      { wch: 16 }, // NISN
      { wch: 28 }, // Nama
      { wch: 12 }, // Kelas
      { wch: 20 }  // Gender
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Siswa MTsN 3');
    XLSX.writeFile(workbook, 'Template_Data_Siswa_MTsN3Magetan.xlsx');
  };

  // Baca File Excel / CSV yang diunggah
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportStatus(null);
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setImportStatus({
            success: false,
            message: 'File Excel kosong atau tidak memiliki baris data.'
          });
          return;
        }

        // Normalisasi key kolom (case insensitive dan toleran header alternatif)
        const parsed: ParsedRow[] = rawJson.map((row, idx) => {
          let nisn = '';
          let name = '';
          let className = '';
          let gender: 'L' | 'P' = 'L';

          for (const key of Object.keys(row)) {
            const k = key.trim().toLowerCase();
            const val = String(row[key]).trim();

            if (k.includes('nisn') || k === 'nis' || k === 'no_induk') {
              nisn = val;
            } else if (k.includes('nama') || k.includes('student') || k === 'name') {
              name = val;
            } else if (k.includes('kelas') || k.includes('class') || k === 'rombel') {
              className = val.toUpperCase();
            } else if (k.includes('kelamin') || k.includes('gender') || k === 'jk') {
              const g = val.toUpperCase();
              gender = g.startsWith('P') || g.startsWith('W') ? 'P' : 'L';
            }
          }

          let isValid = true;
          let error = '';

          if (!nisn) {
            isValid = false;
            error = 'NISN kosong';
          } else if (!name) {
            isValid = false;
            error = 'Nama kosong';
          } else if (!className) {
            isValid = false;
            error = 'Kelas kosong';
          }

          return {
            nisn,
            name,
            class_name: className || '7A',
            gender,
            isValid,
            error
          };
        });

        setParsedRows(parsed);
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: 'Gagal memproses file Excel: ' + (err.message || 'Format tidak valid')
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Simpan data hasil import ke sistem
  const handleSaveImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setImportStatus({
        success: false,
        message: 'Tidak ada data siswa yang valid untuk disimpan.'
      });
      return;
    }

    setIsProcessing(true);
    setImportStatus(null);

    try {
      const res = await saveBulkStudents(
        validRows.map(r => ({
          nisn: r.nisn,
          name: r.name,
          class_name: r.class_name,
          gender: r.gender,
          status: 'Aktif'
        }))
      );

      setImportStatus({
        success: true,
        message: `Berhasil mengimpor ${res.successCount} siswa baru (${res.updatedCount} data diperbarui)!`,
        details: res.errors
      });

      onSuccess();
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: 'Gagal menyimpan data ke database: ' + err.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-emerald-950/40 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                Unggah Data Siswa via Excel / CSV
              </h3>
              <p className="text-xs text-slate-400">
                Impor massal data siswa MTsN 3 Magetan sekaligus tanpa input satu-persatu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Petunjuk & Unduh Template */}
          <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Format Kolom Excel yang Didukung:
              </h4>
              <p className="text-[11px] text-slate-400">
                Kolom: <strong>NISN</strong>, <strong>Nama Lengkap</strong>, <strong>Kelas</strong> (contoh: 7A, 8B), dan <strong>Jenis Kelamin</strong> (L/P).
              </p>
            </div>

            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-emerald-300 text-xs font-bold transition-colors border border-slate-600"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Format Template Excel</span>
            </button>
          </div>

          {/* Area Upload File */}
          <div className="p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl bg-slate-950/60 text-center transition-colors">
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-emerald-400" />
              <div className="text-sm font-bold text-white">
                {fileName ? fileName : 'Pilih Berkas Excel (.xlsx, .xls) atau CSV'}
              </div>
              <p className="text-xs text-slate-400">
                Klik di sini untuk menelusuri file dari komputer Anda
              </p>
            </label>
          </div>

          {/* Feedback status */}
          {importStatus && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                importStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-semibold">{importStatus.message}</span>
                {importStatus.details && importStatus.details.length > 0 && (
                  <ul className="list-disc pl-4 text-[10px] space-y-0.5 text-slate-400">
                    {importStatus.details.slice(0, 3).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Tabel Pratinjau Baris Excel */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">
                  Pratinjau Data ({parsedRows.length} Baris Terdeteksi):
                </span>
                <div className="flex gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Valid: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                      Tidak Valid: {invalidCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-56 rounded-xl border border-slate-700 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">NISN</th>
                      <th className="py-2 px-3">Nama Lengkap</th>
                      <th className="py-2 px-3">Kelas</th>
                      <th className="py-2 px-3">JK</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-slate-900/60' : 'bg-rose-950/20 text-rose-300'}
                      >
                        <td className="py-1.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono">{row.nisn || '-'}</td>
                        <td className="py-1.5 px-3 font-semibold text-white">{row.name || '-'}</td>
                        <td className="py-1.5 px-3">{row.class_name || '-'}</td>
                        <td className="py-1.5 px-3">{row.gender}</td>
                        <td className="py-1.5 px-3">
                          {row.isValid ? (
                            <span className="text-emerald-400 text-[10px] font-bold">Siap Impor</span>
                          ) : (
                            <span className="text-rose-400 text-[10px] font-bold">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[10px] text-slate-500 text-right">
                  Menampilkan 50 dari {parsedRows.length} baris...
                </p>
              )}
            </div>
          )}

          {/* Info Tambahan Mengenai Perekaman Wajah */}
          <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-xs text-emerald-300/90 leading-relaxed">
            💡 <strong>Perekaman Wajah Susulan:</strong> Siswa yang diimpor dari Excel langsung terdaftar di sistem. Anda dapat menambahkan atau memperbarui foto/wajah mereka kapan saja melalui tombol <span className="font-semibold text-white">&ldquo;Daftarkan Wajah&rdquo;</span> di tabel data siswa.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleSaveImport}
            disabled={isProcessing || validCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-950/40"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Database...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Simpan {validCount} Siswa ke Sistem</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
