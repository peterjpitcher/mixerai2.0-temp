import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export async function captureScreenshot(options: ScreenshotOptions = {}): Promise<string | null> {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
  } = options;

  try {
    // Get the current scroll position
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Scroll to top for full page capture
    window.scrollTo(0, 0);

    // Wait for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the screenshot
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      logging: false,
      width: Math.min(document.body.scrollWidth, maxWidth),
      height: Math.min(document.body.scrollHeight, maxHeight),
      windowWidth: Math.min(document.body.scrollWidth, maxWidth),
      windowHeight: Math.min(document.body.scrollHeight, maxHeight),
      scale: 1,
      backgroundColor: null,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Hide any sensitive elements in the clone
        const sensitiveElements = clonedDoc.querySelectorAll('[data-sensitive="true"]');
        sensitiveElements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.filter = 'blur(5px)';
          }
        });
      },
    });

    // Restore scroll position
    window.scrollTo(scrollX, scrollY);

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', quality);
    
    // Clean up
    canvas.remove();

    return base64;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    
    // Restore scroll position on error
    if (typeof window !== 'undefined') {
      window.scrollTo(window.scrollX, window.scrollY);
    }
    
    return null;
  }
}

export function compressImage(base64: string, maxSizeKB: number = 500): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const maxDimension = 1200;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels to get under the size limit
      let quality = 0.9;
      let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      
      while (compressedBase64.length > maxSizeKB * 1024 && quality > 0.1) {
        quality -= 0.1;
        compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      }

      canvas.remove();
      resolve(compressedBase64);
    };
    
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export function getScreenshotSize(base64: string): number {
  // Calculate size in KB
  const sizeInBytes = (base64.length * 3) / 4;
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.round((sizeInBytes - padding) / 1024);
}