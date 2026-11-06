/**
 * Utility functions for QR code generation and validation.
 * Implements contrast checking per ISO/IEC 18004 and logo size validation.
 */

/**
 * Parses a hex color string to RGB components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculates relative luminance of a color per WCAG 2.0 formula.
 * Used for contrast ratio calculation.
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates the contrast ratio between two colors.
 * Per ISO/IEC 18004, QR codes require a minimum contrast ratio of 1:4
 * between foreground and background.
 */
export function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if the contrast ratio meets the ISO/IEC 18004 minimum of 1:4.
 */
export function isContrastSufficient(
  foreground: string,
  background: string
): boolean {
  return contrastRatio(foreground, background) >= 4;
}

/** Error correction levels and their data recovery capacity */
export const ERROR_CORRECTION_LEVELS = {
  L: { label: 'L – Nízká (7%)', capacity: 0.07 },
  M: { label: 'M – Střední (15%)', capacity: 0.15 },
  Q: { label: 'Q – Vysoká (25%)', capacity: 0.25 },
  H: { label: 'H – Nejvyšší (30%)', capacity: 0.30 },
} as const;

export type ErrorCorrectionLevel = keyof typeof ERROR_CORRECTION_LEVELS;

/**
 * Calculates the maximum logo area as a fraction of the QR code area.
 * The logo occupies redundant bits, so its maximum size depends on
 * the error correction level.
 *
 * A safe heuristic: the logo can cover up to (EC capacity) of the total
 * module area, with a safety margin.
 */
export function maxLogoFraction(ecLevel: ErrorCorrectionLevel): number {
  const capacity = ERROR_CORRECTION_LEVELS[ecLevel].capacity;
  // Use ~35% of the available error correction capacity for safety
  return capacity * 0.35;
}

/**
 * Checks whether a logo of given dimensions fits within the QR code
 * given its module count and error correction level.
 */
export function isLogoSizeValid(
  logoWidthPx: number,
  logoHeightPx: number,
  qrSizePx: number,
  ecLevel: ErrorCorrectionLevel
): boolean {
  const logoArea = logoWidthPx * logoHeightPx;
  const qrArea = qrSizePx * qrSizePx;
  const fraction = logoArea / qrArea;
  return fraction <= maxLogoFraction(ecLevel);
}

/** Export format types */
export type ExportFormat = 'png' | 'svg';

/** QR Generator parameters */
export interface QRParams {
  text: string;
  foregroundColor: string;
  backgroundColor: string;
  resolution: number;
  exportFormat: ExportFormat;
  errorCorrectionLevel: ErrorCorrectionLevel;
  logoEnabled: boolean;
  logoFile: File | null;
  logoDataUrl: string | null;
}

export const DEFAULT_PARAMS: QRParams = {
  text: '',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  resolution: 1024,
  exportFormat: 'png',
  errorCorrectionLevel: 'M',
  logoEnabled: false,
  logoFile: null,
  logoDataUrl: null,
};

/**
 * Reads a File as a data URL string.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
