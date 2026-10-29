import React, { useState, useEffect, useRef } from 'react';
import { generateStandaloneHTML } from '../lib/standaloneGenerator';
import { getStoredConfig } from '../lib/supabase';
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code2,
  FileCode,
  Sparkles,
  Github,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface GitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copiedType, setCopiedType] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = getStoredConfig();

  useEffect(() => {
    if (!isOpen) return;

    // Selalu hasilkan HTML Mandiri (53 KB) yang bersih, lengkap, dan tidak memicu error 403 atau kepotong
    const standaloneHtml = generateStandaloneHTML(config.url, config.anonKey);
    setHtmlContent(standaloneHtml);
  }, [isOpen, config.url, config.anonKey]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(htmlContent);
      } else if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
      }
      setCopied(true);
      setCopiedType('clipboard');
      setTimeout(() => setCopied(false), 3500);
    } catch (err) {
      if (textareaRef.current) {
        textareaRef.current.select();
        setCopiedType('selected');
      }
    }
  };

  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      setCopiedType('selected');
    }
  };

  // Download lokal via Blob (tidak mengirim request HTTP ke server luar sehingga tidak ada error 403)
  const handleDownload = () => {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'index.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloadNotice('Berkas index.html berhasil diunduh ke komputer Anda!');
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (e: any) {
      console.warn('Iframe blocked download:', e);
      setDownloadNotice(
        'Iframe browser memblokir unduh berkas. Silakan gunakan Tombol 1 (Salin Seluruh Kode) di bawah.'
      );
    }
  };

  // Buka via Blob URL lokal (bukan URL Cloud Run) agar TIDAK memicu auth-bridge Error 403
  const handleOpenLocalTab = () => {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        setDownloadNotice('Popup diblokir oleh browser. Silakan gunakan tombol Salin Kode di bawah.');
      }
    } catch (err) {
      setDownloadNotice('Gunakan tombol Salin Kode di bawah lalu paste langsung ke GitHub.');
    }
  };

  const fileSizeKB = Math.round(htmlContent.length / 1024);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-emerald-950/40 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg">
                  Pemasangan index.html ke GitHub Pages (100% Persis)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {fileSizeKB} KB Ringan & Valid
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Solusi resmi untuk repository <code className="text-emerald-400 font-mono">matsaneta3/absensimatsaneta</code>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-950/60">
          
          {downloadNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{downloadNotice}</span>
            </div>
          )}

          {/* METODE UTAMA (TERCEPAT & ANTI-GAGAL: 10 DETIK) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-white text-sm sm:text-base">
                  Cara Terbaik & Paling Cepat: Salin Kode & Tempel di GitHub (10 Detik)
                </h4>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Paling Mudah
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Berkas ini sudah dirancang berukuran ringkas (<strong>hanya 53 KB</strong>) dan menyatukan seluruh antarmuka 2 kolom, kamera, face recognition, impor excel, kelola kelas, dan kenaikan kelas. Cukup salin dan tempel langsung ke GitHub:
            </p>

            {/* Tombol Aksi Salin */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={handleCopy}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-98"
              >
                {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'BERHASIL DISALIN KE CLIPBOARD!' : 'KLIK UNTUK SALIN SELURUH KODE (1-KLIK COPY)'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
                title="Unduh berkas index.html"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Berkas .html</span>
              </button>
            </div>

            {/* Langkah Praktis */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>3 Langkah Mudah di GitHub:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                <li>Buka tab browser GitHub Anda: <strong className="text-white">matsaneta3/absensimatsaneta</strong></li>
                <li>Klik berkas <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">index.html</code>, lalu klik ikon pensil <strong className="text-white">✎ (Edit this file)</strong>.</li>
                <li>Tekan tombol keyboard <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">Ctrl + A</kbd> (untuk menghapus semua kode lama), lalu tekan <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">Ctrl + V</kbd> (untuk menempelkan kode baru).</li>
                <li>Klik tombol hijau <strong className="text-white">Commit changes...</strong> di pojok kanan atas. Selesai!</li>
              </ol>
            </div>
          </div>

          {/* KOTAK TEKS KODE LENGKAP DENGAN PILIH SEMUA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Seluruh Kode HTML ({fileSizeKB} KB):
              </span>
              <button
                onClick={handleSelectAll}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
              >
                Pilih Semua Teks (Ctrl + A)
              </button>
            </div>

            <textarea
              ref={textareaRef}
              readOnly
              value={htmlContent}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full h-48 sm:h-56 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-400/90 leading-relaxed outline-none focus:border-emerald-500 select-all resize-none custom-scroll"
            />
            <p className="text-[11px] text-slate-500 italic">
              *Tips: Anda juga bisa klik di dalam kotak teks di atas, lalu tekan <kbd className="text-slate-300 font-mono">Ctrl + A</kbd> kemudian <kbd className="text-slate-300 font-mono">Ctrl + C</kbd> untuk menyalin manual.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <a
            href="https://github.com/matsaneta3/absensimatsaneta"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>Buka Repository matsaneta3/absensimatsaneta</span>
            <ArrowRight className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-colors cursor-pointer"
            >
              {copied ? 'Tersalin!' : 'Salin Kode'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
