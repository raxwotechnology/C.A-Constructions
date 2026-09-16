import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Renders an HTML string to a hidden DOM element, converts it to a canvas,
 * and downloads it as a multi-page PDF. This completely bypasses the need for 
 * Puppeteer on the backend.
 * @param {string} htmlString - HTML content
 * @param {string} filename - Target filename
 * @param {Object} [options] - Options { orientation: 'portrait' | 'landscape' }
 */
export async function htmlStringToPdfDownload(htmlString, filename, options = {}) {
  const orientation = options?.orientation === 'landscape' ? 'landscape' : 'portrait';
  const isLandscape = orientation === 'landscape';

  const container = document.createElement('div');
  // 794px width is 210mm at 96 DPI (A4 portrait); 1123px is 297mm (A4 landscape)
  container.style.width = isLandscape ? '1123px' : '794px';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.background = '#ffffff';
  container.innerHTML = htmlString;
  document.body.appendChild(container);

  try {
    // Wait a tiny bit for DOM to settle
    await new Promise(r => setTimeout(r, 100));

    // Wait for images to load
    const imgs = container.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    const canvas = await html2canvas(container, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // A4 size in mm
    const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate total height of the canvas in mm
    const totalImgHeightInMm = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = totalImgHeightInMm;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalImgHeightInMm);
    heightLeft -= pdfHeight;

    // Add subsequent pages if the content is longer than one A4 page
    while (heightLeft > 0) {
      position = heightLeft - totalImgHeightInMm;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalImgHeightInMm);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
