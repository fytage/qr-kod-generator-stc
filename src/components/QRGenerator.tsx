import { useState, useCallback, useRef, useEffect } from 'react';
import {
  type QRParams,
  type ErrorCorrectionLevel,
  type ExportFormat,
  DEFAULT_PARAMS,
  ERROR_CORRECTION_LEVELS,
  contrastRatio,
  readFileAsDataUrl,
} from '../utils/qr-utils';
import {
  generateQRToCanvas,
  generateQRToSVG,
  downloadQR,
  type GenerationResult,
} from '../utils/qr-generator';

/** Icons as inline SVG */
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1v9m0 0L5 7m3 3 3-3M3 12v1.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const QRIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="13" y="13" width="2" height="2" fill="currentColor"/>
    <rect x="16" y="13" width="2" height="2" fill="currentColor"/>
    <rect x="13" y="16" width="2" height="2" fill="currentColor"/>
    <rect x="16" y="16" width="2" height="2" fill="currentColor"/>
    <rect x="4" y="4" width="2" height="2" fill="currentColor"/>
    <rect x="14" y="4" width="2" height="2" fill="currentColor"/>
    <rect x="4" y="14" width="2" height="2" fill="currentColor"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16V4m0 0-4 4m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 3.5h11M5 3.5V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5m1.5 0v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11.5v-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM8 2V1.5m0 13v-.5M12.24 3.76l.36-.36m-9.2.36-.36-.36M14 8h.5m-13 0h.5m10.24 4.24.36.36m-9.2-.36-.36.36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 10.5a5.5 5.5 0 1 1-8-8 6 6 0 1 0 8 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function QRGenerator() {
  const [params, setParams] = useState<QRParams>(DEFAULT_PARAMS);

  const [isDarkMode, setIsDarkMode] = useState(() => 
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep a ref to the latest canvas for download purposes
  const latestCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const contrast = contrastRatio(params.foregroundColor, params.backgroundColor);
  const isContrastOk = contrast >= 4;

  // Auto-generate on params change (debounced)
  useEffect(() => {
    if (!params.text.trim()) {
      setResult(null);
      setPreviewDataUrl(null);
      setPreviewSvg(null);
      latestCanvasRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.text,
    params.foregroundColor,
    params.backgroundColor,
    params.resolution,
    params.exportFormat,
    params.errorCorrectionLevel,
    params.logoEnabled,
    params.logoDataUrl,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!params.text.trim()) return;
    setIsGenerating(true);

    let genResult: GenerationResult;
    if (params.exportFormat === 'svg') {
      genResult = await generateQRToSVG(params);
    } else {
      genResult = await generateQRToCanvas(params);
    }

    setResult(genResult);
    setIsGenerating(false);

    if (genResult.success) {
      if (genResult.canvas) {
        // Convert the canvas to a data URL for safe React rendering
        latestCanvasRef.current = genResult.canvas;
        setPreviewDataUrl(genResult.canvas.toDataURL('image/png'));
        setPreviewSvg(null);
      } else if (genResult.svgString) {
        latestCanvasRef.current = null;
        setPreviewSvg(genResult.svgString);
        setPreviewDataUrl(null);
      }
    } else {
      setPreviewDataUrl(null);
      setPreviewSvg(null);
      latestCanvasRef.current = null;
    }
  }, [params]);

  const handleLogoUpload = useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      setParams((prev) => ({
        ...prev,
        logoFile: file,
        logoDataUrl: dataUrl,
      }));
    },
    []
  );

  const handleRemoveLogo = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      logoFile: null,
      logoDataUrl: null,
      logoEnabled: false,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!result?.success) return;
    downloadQR(
      latestCanvasRef.current,
      result.svgString ?? null,
      params.exportFormat,
      'qr-code'
    );
  }, [result, params.exportFormat]);

  const updateParam = <K extends keyof QRParams>(key: K, value: QRParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Determine what to show in the preview area
  const showPlaceholder = !result && !isGenerating && !previewDataUrl && !previewSvg;
  const showError = result && !result.success;

  return (
    <div className="min-h-screen bg-[var(--color-neutral-background-2)]">
      {/* Header */}
      <header className="bg-[var(--color-neutral-background-1)] border-b border-[var(--color-neutral-stroke-2)] shadow-[var(--shadow-2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[var(--color-brand-primary)]">
              <QRIcon />
            </div>
            <h1
              className="text-[var(--font-size-base-600)] font-[var(--font-weight-semibold)] text-[var(--color-neutral-foreground-1)] leading-[var(--line-height-base-600)]"
            >
              QR Kód Generátor
            </h1>
          </div>
          
          {/* NOVÉ: Tlačítko pro přepnutí motivu */}
          <button 
            className="fluent-button !min-h-[36px] px-3" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">
          {/* Left Panel — Settings */}
          <div className="flex flex-col gap-6">
            {/* Text Input Card */}
            <div className="fluent-card">
              <h2 className="text-[var(--font-size-base-500)] font-[var(--font-weight-semibold)] mb-4">
                Obsah QR kódu
              </h2>
              <label className="fluent-label" htmlFor="qr-text">
                Text nebo URL
              </label>
              <input
                id="qr-text"
                type="text"
                className="fluent-input"
                placeholder="Zadejte text nebo URL…"
                value={params.text}
                onChange={(e) => updateParam('text', e.target.value)}
                autoFocus
              />
            </div>

            {/* Colors Card */}
            <div className="fluent-card">
              <h2 className="text-[var(--font-size-base-500)] font-[var(--font-weight-semibold)] mb-4">
                Barvy
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Background Color */}
                <div>
                  <label className="fluent-label" htmlFor="bg-color">
                    Barva pozadí
                  </label>
                  <div className="color-picker-wrapper">
                    <div className="color-swatch">
                      <input
                        id="bg-color"
                        type="color"
                        value={params.backgroundColor}
                        onChange={(e) =>
                          updateParam('backgroundColor', e.target.value)
                        }
                      />
                    </div>
                    <input
                      type="text"
                      className="fluent-input"
                      value={params.backgroundColor}
                      onChange={(e) =>
                        updateParam('backgroundColor', e.target.value)
                      }
                      maxLength={7}
                      style={{ width: '100px' }}
                    />
                  </div>
                </div>

                {/* Foreground Color */}
                <div>
                  <label className="fluent-label" htmlFor="fg-color">
                    Barva popředí
                  </label>
                  <div className="color-picker-wrapper">
                    <div className="color-swatch">
                      <input
                        id="fg-color"
                        type="color"
                        value={params.foregroundColor}
                        onChange={(e) =>
                          updateParam('foregroundColor', e.target.value)
                        }
                      />
                    </div>
                    <input
                      type="text"
                      className="fluent-input"
                      value={params.foregroundColor}
                      onChange={(e) =>
                        updateParam('foregroundColor', e.target.value)
                      }
                      maxLength={7}
                      style={{ width: '100px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Contrast indicator */}
              <div className="mt-3">
                <div
                  className={`fluent-message-bar ${isContrastOk ? 'fluent-message-bar-success' : 'fluent-message-bar-error'}`}
                >
                  <span>
                    Kontrast: {contrast.toFixed(2)}:1{' '}
                    {isContrastOk
                      ? '✓ Splňuje normu ISO/IEC 18004'
                      : '✗ Nesplňuje minimální poměr 1:4'}
                  </span>
                </div>
              </div>
            </div>

            {/* Technical Settings Card */}
            <div className="fluent-card">
              <h2 className="text-[var(--font-size-base-500)] font-[var(--font-weight-semibold)] mb-4">
                Technické nastavení
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Resolution */}
                <div>
                  <label className="fluent-label" htmlFor="resolution">
                    Rozlišení: {params.resolution}×{params.resolution} px
                  </label>
                  <input
                    id="resolution"
                    type="range"
                    className="fluent-slider"
                    min={128}
                    max={4096}
                    step={128}
                    value={params.resolution}
                    onChange={(e) =>
                      updateParam('resolution', Number(e.target.value))
                    }
                  />
                  <div className="flex justify-between text-[var(--font-size-base-200)] text-[var(--color-neutral-foreground-3)] mt-1">
                    <span>128 px</span>
                    <span>4096 px</span>
                  </div>
                </div>

                {/* Export Format */}
                <div>
                  <label className="fluent-label" htmlFor="export-format">
                    Formát exportu
                  </label>
                  <select
                    id="export-format"
                    className="fluent-select"
                    value={params.exportFormat}
                    onChange={(e) =>
                      updateParam('exportFormat', e.target.value as ExportFormat)
                    }
                  >
                    <option value="png">PNG (rastrový obrázek)</option>
                    <option value="svg">SVG (vektor)</option>
                  </select>
                </div>

                {/* Error Correction Level */}
                <div className="sm:col-span-2">
                  <label className="fluent-label" htmlFor="ec-level">
                    Úroveň korekce chyb
                  </label>
                  <select
                    id="ec-level"
                    className="fluent-select"
                    value={params.errorCorrectionLevel}
                    onChange={(e) =>
                      updateParam(
                        'errorCorrectionLevel',
                        e.target.value as ErrorCorrectionLevel
                      )
                    }
                  >
                    {Object.entries(ERROR_CORRECTION_LEVELS).map(
                      ([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Logo Card */}
            <div className="fluent-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[var(--font-size-base-500)] font-[var(--font-weight-semibold)]">
                  Logo uprostřed
                </h2>
                <label className="fluent-switch">
                  <input
                    type="checkbox"
                    checked={params.logoEnabled}
                    onChange={(e) =>
                      updateParam('logoEnabled', e.target.checked)
                    }
                  />
                  <span className="fluent-switch-track">
                    <span className="fluent-switch-thumb" />
                  </span>
                </label>
              </div>

              {params.logoEnabled && (
                <>
                  <div className="fluent-message-bar fluent-message-bar-warning mb-3">
                    <span>
                      Logo využívá místo pro redundantní bity. Velikost je
                      automaticky omezena dle zvolené úrovně korekce chyb.
                    </span>
                  </div>

                  {!params.logoDataUrl ? (
                    <div
                      className="file-upload-area"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('has-logo');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('has-logo');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('has-logo');
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith('image/')) {
                          void handleLogoUpload(file);
                        }
                      }}
                    >
                      <div className="text-[var(--color-neutral-foreground-3)]">
                        <UploadIcon />
                      </div>
                      <span className="text-[var(--font-size-base-300)] text-[var(--color-neutral-foreground-2)]">
                        Klikněte nebo přetáhněte logo
                      </span>
                      <span className="text-[var(--font-size-base-200)] text-[var(--color-neutral-foreground-3)]">
                        PNG, JPG, SVG
                      </span>
                    </div>
                  ) : (
                    <div className="file-upload-area has-logo">
                      <img
                        src={params.logoDataUrl}
                        alt="Logo"
                        className="max-h-16 max-w-[120px] object-contain"
                      />
                      <button
                        className="fluent-button mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLogo();
                        }}
                      >
                        <TrashIcon />
                        Odebrat logo
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleLogoUpload(file);
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right Panel — Preview & Download */}
          <div className="flex flex-col gap-6">
            <div className="fluent-card sticky top-8">
              <h2 className="text-[var(--font-size-base-500)] font-[var(--font-weight-semibold)] mb-4">
                Náhled
              </h2>

              {/* QR Preview — rendered entirely via React state, no direct DOM manipulation */}
              <div className="qr-preview-container">
                {showPlaceholder && (
                  <div className="flex flex-col items-center gap-2 text-[var(--color-neutral-foreground-3)]">
                    <QRIcon />
                    <span className="text-[var(--font-size-base-300)]">
                      Zadejte text pro vygenerování QR kódu
                    </span>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex items-center gap-2 text-[var(--color-neutral-foreground-2)]">
                    <div className="w-5 h-5 border-2 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin" />
                    <span>Generování…</span>
                  </div>
                )}

                {!isGenerating && previewDataUrl && (
                  <img
                    src={previewDataUrl}
                    alt="QR kód"
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                  />
                )}

                {!isGenerating && previewSvg && (
                  <div
                    style={{ maxWidth: '100%' }}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                )}
              </div>

              {/* Error Message */}
              {showError && (
                <div className="fluent-message-bar fluent-message-bar-error mt-4">
                  <span>{result.error}</span>
                </div>
              )}

              {/* Download Button */}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  className="fluent-button fluent-button-primary w-full py-2.5"
                  onClick={handleDownload}
                  disabled={!result?.success || isGenerating}
                >
                  <DownloadIcon />
                  Stáhnout {params.exportFormat === 'svg' ? 'SVG' : 'PNG'}
                </button>

                {result?.success && (
                  <div className="text-center text-[var(--font-size-base-200)] text-[var(--color-neutral-foreground-3)]">
                    {params.resolution}×{params.resolution} px •{' '}
                    {params.exportFormat.toUpperCase()} •{' '}
                    Korekce chyb: {params.errorCorrectionLevel}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-neutral-stroke-2)] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-[var(--font-size-base-200)] text-[var(--color-neutral-foreground-3)]">
          QR Kód Generátor • Vytvořeno pro A&I Lab
        </div>
      </footer>
    </div>
  );
}
