import { buildPDF } from "../components/accreditation/cardExport.js";

/**
 * Convert a blob to raw base64 string (without data: prefix)
 */
export const blobToRawBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Generate PDF and return base64 + filename ready for email attachment
 */
export const generatePdfAttachment = async (accreditation, event, zones) => {
  try {
    const pdf = await buildPDF(accreditation, event, zones, 2);
    const pdfBlob = pdf.output("blob");
    const pdfBase64 = await blobToRawBase64(pdfBlob);
    const pdfFileName = `${accreditation.firstName}_${accreditation.lastName}_Accreditation.pdf`;
    return { pdfBase64, pdfFileName };
  } catch (err) {
    console.error(`[PDF] Attachment generation failed:`, err);
    return null;
  }
};
