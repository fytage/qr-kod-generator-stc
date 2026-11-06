/**
 * QR code generation service.
 * Handles generating QR codes as canvas (PNG) or SVG,
 * with optional logo overlay in the center.
 */
import QRCode from 'qrcode';
import {
  type QRParams,
  type ErrorCorrectionLevel,
  isContrastSufficient,
  isLogoSizeValid,
  maxLogoFraction,
} from './qr-utils';

export interface GenerationResult {
  success: boolean;
  error?: string;
  canvas?: HTMLCanvasElement;
  svgString?: string;
}

/**
 * Generates a QR code onto a canvas element, optionally overlaying a logo.
 */
export async function generateQRToCanvas(
  params: QRParams
): Promise<GenerationResult> {
  // 1. Validate contrast ratio (ISO/IEC 18004, minimum 1:4)
  if (!isContrastSufficient(params.foregroundColor, params.backgroundColor)) {
    return {
      success: false,
      error: 'Nedostatečný kontrast barev. Poměr musí být minimálně 1:4 dle normy ISO/IEC 18004.',
    };
  }

  if (!params.text.trim()) {
    return {
      success: false,
      error: 'Zadejte text nebo URL pro vygenerování QR kódu.',
    };
  }

  try {
    const canvas = document.createElement('canvas');

    await QRCode.toCanvas(canvas, params.text, {
      width: params.resolution,
      margin: 2,
      color: {
        dark: params.foregroundColor,
        light: params.backgroundColor,
      },
      errorCorrectionLevel: params.errorCorrectionLevel,
    });

    // 2. Overlay logo if enabled
    if (params.logoEnabled && params.logoDataUrl) {
      const logoResult = await overlayLogo(
        canvas,
        params.logoDataUrl,
        params.errorCorrectionLevel,
        params.backgroundColor
      );
      if (!logoResult.success) {
        return logoResult;
      }
    }

    return { success: true, canvas };
  } catch (err) {
    return {
      success: false,
      error: `Chyba při generování QR kódu: ${err instanceof Error ? err.message : 'Neznámá chyba'}`,
    };
  }
}

/**
 * Generates a QR code as SVG string.
 */
/**
 * Generates a QR code as SVG string.
 */
export async function generateQRToSVG(
  params: QRParams
): Promise<GenerationResult> {
  // 1. Validate contrast
  if (!isContrastSufficient(params.foregroundColor, params.backgroundColor)) {
    return {
      success: false,
      error: 'Nedostatečný kontrast barev. Poměr musí být minimálně 1:4 dle normy ISO/IEC 18004.',
    };
  }

  if (!params.text.trim()) {
    return {
      success: false,
      error: 'Zadejte text nebo URL pro vygenerování QR kódu.',
    };
  }

  try {
    let svgString = await QRCode.toString(params.text, {
      type: 'svg',
      width: params.resolution,
      margin: 2,
      color: {
        dark: params.foregroundColor,
        light: params.backgroundColor,
      },
      errorCorrectionLevel: params.errorCorrectionLevel,
    });

    // 2. Overlay logo if enabled (embed as <image> in SVG)
    if (params.logoEnabled && params.logoDataUrl) {
      const logoSizeResult = await getLogoNaturalSize(params.logoDataUrl);
      if (!logoSizeResult) {
        return { success: false, error: 'Nepodařilo se načíst logo.' };
      }

      const viewBoxMatch = svgString.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      if (!viewBoxMatch) {
        return { success: false, error: 'Nepodařilo se analyzovat souřadnice SVG.' };
      }
      const viewBoxSize = parseFloat(viewBoxMatch[1]);

      const maxFraction = maxLogoFraction(params.errorCorrectionLevel);
      const maxOverlayDim = Math.sqrt(maxFraction) * viewBoxSize;

      // Padding přizpůsobený velikosti vnitřních modulů (cca 0.5 - 1 modul)
      const padding = Math.max(0.5, viewBoxSize * 0.015);

      const maxLogoDim = maxOverlayDim - (padding * 2);

      // Scale logo to fit
      const scale = Math.min(
        maxLogoDim / logoSizeResult.width,
        maxLogoDim / logoSizeResult.height,
        1
      );

      const logoW = logoSizeResult.width * scale;
      const logoH = logoSizeResult.height * scale;

      // Validation
      if (
        !isLogoSizeValid(logoW, logoH, viewBoxSize, params.errorCorrectionLevel)
      ) {
        return {
          success: false,
          error: 'Logo je příliš velké pro zvolenou úroveň korekce chyb.',
        };
      }

      const logoX = (viewBoxSize - logoW) / 2;
      const logoY = (viewBoxSize - logoH) / 2;
      const rx = viewBoxSize * 0.015; 

      const bgRect = `<rect x="${logoX - padding}" y="${logoY - padding}" width="${logoW + padding * 2}" height="${logoH + padding * 2}" fill="${params.backgroundColor}" rx="${rx}"/>`;
      const logoImage = `<image x="${logoX}" y="${logoY}" width="${logoW}" height="${logoH}" href="${params.logoDataUrl}" />`;

      svgString = svgString.replace('</svg>', `${bgRect}${logoImage}</svg>`);
    }

    return { success: true, svgString };
  } catch (err) {
    return {
      success: false,
      error: `Chyba při generování QR kódu: ${err instanceof Error ? err.message : 'Neznámá chyba'}`,
    };
  }
}
/**
 * Overlays a logo image onto the center of a QR code canvas.
 */
async function overlayLogo(
  canvas: HTMLCanvasElement,
  logoDataUrl: string,
  ecLevel: ErrorCorrectionLevel,
  bgColor: string
): Promise<GenerationResult> {
  return new Promise((resolve) => {
    const img = new Image();
img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ success: false, error: 'Nelze získat canvas context.' });
        return;
      }

      const canvasSize = canvas.width;
      const maxFraction = maxLogoFraction(ecLevel);
      const maxOverlayDim = Math.floor(Math.sqrt(maxFraction) * canvasSize);

      const padding = Math.max(4, Math.floor(canvasSize * 0.01));

      const maxLogoDim = maxOverlayDim - (padding * 2);

      // Scale logo proportionally
      const scale = Math.min( maxLogoDim / img.naturalWidth, maxLogoDim / img.naturalHeight, 1);
      const logoW = Math.floor(img.naturalWidth * scale);
      const logoH = Math.floor(img.naturalHeight * scale);

      if (!isLogoSizeValid(logoW, logoH, canvasSize, ecLevel)) {
        resolve({
          success: false,
          error: 'Logo je příliš velké pro zvolenou úroveň korekce chyb.',
        });
        return;
      }

      const x = Math.floor((canvasSize - logoW) / 2);
      const y = Math.floor((canvasSize - logoH) / 2);

      // Draw background behind logo for readability
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      const r = Math.floor(canvasSize * 0.01);
      roundedRect(ctx, x - padding, y - padding, logoW + padding * 2, logoH + padding * 2, r);
      ctx.fill();

      // Draw the logo
      ctx.drawImage(img, x, y, logoW, logoH);

      resolve({ success: true, canvas });
    };
    img.onerror = () => {
      resolve({ success: false, error: 'Nepodařilo se načíst logo.' });
    };
    img.src = logoDataUrl;
  });
}

/** Helper: draw a rounded rectangle path on a 2D context. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

/** Gets the natural (intrinsic) size of an image from its data URL. */
function getLogoNaturalSize(
  dataUrl: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Downloads the generated QR code.
 */
export function downloadQR(
  canvas: HTMLCanvasElement | null,
  svgString: string | null,
  format: 'png' | 'svg',
  filename: string = 'qr-code'
) {
  if (format === 'png' && canvas) {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } else if (format === 'svg' && svgString) {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}
