import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';

// Standard ID Card (CR80) size in points (72pt = 1in | 85.6mm x 53.98mm)
const CARD_WIDTH_PT = 242.65;
const CARD_HEIGHT_PT = 153.01;

// ID Card layout dimensions (in mm)
const MARGIN_MM = 15;
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;

function buildIdCardPageHtml(imageDataUri: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
        background: #ffffff;
      }
      .page {
        position: relative;
        width: 210mm;
        height: 297mm;
        background: #ffffff;
      }
      .card {
        position: absolute;
        left: ${MARGIN_MM}mm;
        top: ${MARGIN_MM}mm;
        width: ${CARD_WIDTH_MM}mm;
        height: auto;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <img class="card" src="${imageDataUri}" />
    </div>
  </body>
</html>`;
}

/**
 * Takes a locally captured ID card image (a file:// URI, e.g. from a ViewShot capture) and lays
 * it out on a standard A4 page - positioned in the top-left corner, with the rest of the page
 * left white - then renders that page to a PDF file. Returns the URI of the generated PDF.
 */
export async function buildIdCardA4Pdf(cardImageUri: string): Promise<string> {
  const base64 = await FileSystemLegacy.readAsStringAsync(cardImageUri, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });
  const html = buildIdCardPageHtml(`data:image/png;base64,${base64}`);
  const { uri } = await Print.printToFileAsync({ 
    html, 
    width: CARD_WIDTH_PT, 
    height: CARD_HEIGHT_PT, 
    base64: false 
  });
  return uri;
}
