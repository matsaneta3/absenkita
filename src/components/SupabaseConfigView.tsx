import React, { useState } from 'react';
import { SupabaseConfig } from '../types';
import { getStoredConfig, saveStoredConfig, testSupabaseConnection } from '../lib/supabase';
import { SUPABASE_SQL_SCRIPT } from '../lib/sqlScript';
import { generateStandaloneHTML } from '../lib/standaloneGenerator';
import {
  Settings,
  Database,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Download,
  Github,
  Lock,
  Sparkles
} from 'lucide-react';

interface SupabaseConfigViewProps {
  onConfigSaved: () => void;
  isSupabaseConnected: boolean;
}

export const SupabaseConfigView: React.FC<SupabaseConfigViewProps> = ({
  onConfigSaved,
  isSupabaseConnected
}) => {
  const currentConfig = getStoredConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const config: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim()
    };

    saveStoredConfig(config);

    if (config.url && config.anonKey) {
      const res = await testSupabaseConnection(config);
      setTestResult(res);
    } else {
      setTestResult({
        success: false,
        message: 'Konfigurasi dikosongkan. Sistem berjalan dalam mode penyimpanan lokal (LocalStorage).'
      });
    }

    setIsTesting(false);
    onConfigSaved();
  };

  const handleTestOnly = async () => {
    setIsTesting(true);
    setTestResult(null);
    const config: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim()
    };
    const res = await testSupabaseConnection(config);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleResetToLocal = () => {
    if (confirm('Kosongkan koneksi Supabase dan gunakan penyimpanan memori lokal?')) {
      setUrl('');
      setAnonKey('');
      saveStoredConfig({ url: '', anonKey: '' });
      setTestResult({
        success: false,
        message: 'Mode LocalStorage aktif. Data tersimpan di peramban komputer ini.'
      });
      onConfigSaved();
    }
  };

  // Unduh index.html Siap Pasang di GitHub Pages dengan Kredensial Tertanam Permanen (100% Persis)
  const handleDownloadGitHubBundle = async () => {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      if (!confirm('Peringatan: URL atau Anon Key belum diisi. Jika diunduh sekarang, file tidak memiliki kredensial tertanam. Tetap lanjutkan?')) {
        return;
      }
    }

    try {
      // Ambil file bundle produksi React lengkap (100% identik dengan tampilan sistem saat ini)
      const res = await fetch('/standalone-build.html');
      if (res.ok) {
        let fullBundleHtml = await res.text();
        
        // Tanamkan kredensial Supabase secara permanen ke dalam script bundle
        if (cleanUrl && cleanKey) {
          fullBundleHtml = fullBundleHtml.replace(
            /window\.__EMBEDDED_SUPABASE_URL__\s*=\s*["'].*?["'];?/,
            `window.__EMBEDDED_SUPABASE_URL__ = "${cleanUrl}";`
          );
          fullBundleHtml = fullBundleHtml.replace(
            /window\.__EMBEDDED_SUPABASE_ANON_KEY__\s*=\s*["'].*?["'];?/,
            `window.__EMBEDDED_SUPABASE_ANON_KEY__ = "${cleanKey}";`
          );
        }

        const blob = new Blob([fullBundleHtml], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'index.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
        return;
      }
    } catch (e) {
      console.warn('Fallback ke generator:', e);
    }

    // Fallback generator jika file bundle belum terunduh
    const htmlContent = generateStandaloneHTML(cleanUrl, cleanKey);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            Konfigurasi Supabase & Panduan Pasang di GitHub Pages
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Hubungkan ke database Supabase dan dapatkan file <code className="text-emerald-400 font-bold">index.html</code> dengan kredensial tertanam untuk dihosting secara gratis di GitHub Pages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isSupabaseConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConnected ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            ></span>
            <span>{isSupabaseConnected ? 'Supabase Live Connected' : 'Mode Offline / LocalStorage'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION TANYA JAWAB GITHUB & KREDENSIAL PERMANEN */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                Pemasangan di GitHub & Kredensial API Tertanam Permanen
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Resmi & Aman</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Jawaban teknis & arsitektur keamanan untuk MTsN 3 Magetan:
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadGitHubBundle}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/50 shrink-0"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Berhasil Diunduh!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh index.html untuk GitHub</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs leading-relaxed">
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2">
            <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              1. Apakah file index.html ini bisa dipasang pada GitHub?
            </h4>
            <p className="text-slate-300">
              <strong>BISA 100% dan GRATIS selamanya melalui GitHub Pages!</strong> Aplikasi ini dibangun murni di sisi peramban (client-side Single Page Application) menggunakan CDN untuk Tailwind CSS, face-api.js, SheetJS Excel, dan Supabase JS Client tanpa membutuhkan server backend (Node.js/PHP).
            </p>
          </div>

          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2">
            <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              2. Apakah aman kode kredensial API ditanam permanen pada GitHub?
            </h4>
            <p className="text-slate-300">
              <strong>BISA dan SANGAT AMAN!</strong> Supabase memang dirancang agar <code className="text-emerald-400">anon public key</code> ditanam di sisi client. Keamanan database dilindungi oleh <strong>Row Level Security (RLS)</strong> di PostgreSQL, sehingga siapapun yang melihat anon key tetap tidak bisa merusak database karena hak akses dibatasi oleh aturan SQL yang sudah kita pasang.
            </p>
            <span className="text-[10px] text-amber-400 block pt-1">
              ⚠️ Catatan penting: Jangan pernah memasukkan <em>service_role key</em> (secret key) ke GitHub. Hanya gunakan <em>anon key</em>!
            </span>
          </div>
        </div>

        {/* Panduan 5 Langkah Pasang di GitHub Pages */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
          <span className="font-bold text-xs text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Langkah Cepat Memasang di GitHub Pages MTsN 3 Magetan:
          </span>
          <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-300">
            <li>Isi formulir <strong>Supabase Project URL</strong> dan <strong>Anon Key</strong> di bawah ini, lalu klik tombol hijau <strong>&ldquo;Unduh index.html untuk GitHub&rdquo;</strong>.</li>
            <li>Buka akun <strong>GitHub.com</strong>, buat repositori publik atau privat baru (misalnya diberi nama <code className="text-emerald-400">absensi-mtsn3</code>).</li>
            <li>Unggah file <code className="text-emerald-400">index.html</code> yang baru Anda unduh ke dalam repositori tersebut.</li>
            <li>Masuk ke menu repositori: <strong>Settings &rarr; Pages</strong>. Pada bagian <em>Branch</em>, pilih <strong>main</strong> (atau <em>master</em>), folder <strong>/ (root)</strong>, lalu klik <strong>Save</strong>.</li>
            <li>Tunggu 1 menit, website absensi resmi sekolah Anda sudah live di alamat: <code className="text-emerald-400 font-bold">https://username.github.io/absensi-mtsn3/</code> dan dapat dibuka di semua laptop/tablet guru tanpa perlu login lagi!</li>
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* FORM KONEKSI SUPABASE (5 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Kredensial API Supabase
            </h3>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-mono">
              LocalStorage
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Supabase URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="url"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 font-mono transition-colors"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Ditemukan di: Project Settings &rarr; API &rarr; Project URL
              </span>
            </div>

            {/* Supabase Anon Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>Supabase Anon Public Key</span>
              </label>
              <textarea
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 font-mono transition-colors resize-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Gunakan Project API keys (anon public), BUKAN service_role!
              </span>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isTesting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>{isTesting ? 'Menguji Koneksi...' : 'Simpan di Browser Ini'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestOnly}
                disabled={isTesting || !url || !anonKey}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                Tes Saja
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetToLocal}
              className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Kosongkan & Gunakan Mode Lokal (LocalStorage)
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* SKRIP SQL MIGRASI SUPABASE (7 Kolom) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Skrip SQL Migrasi DDL Supabase (Terbaru)
              </h3>
              <p className="text-xs text-slate-400">
                Mendukung import Excel (wajah opsional), kelas dinamis, dan kenaikan kelas/alumni.
              </p>
            </div>

            <button
              onClick={handleCopySql}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copiedSql
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Skrip SQL</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer Container */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                schema_mtsn3_magetan.sql
              </span>
              <span className="text-[10px] text-slate-500">PostgreSQL DDL</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
              <code>{SUPABASE_SQL_SCRIPT}</code>
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
};
