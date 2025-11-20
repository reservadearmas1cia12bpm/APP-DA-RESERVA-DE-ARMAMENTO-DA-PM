export function exportToWord(htmlContent: string, fileName: string = "documento") {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"></head><body>
  `;

  const footer = "</body></html>";

  const sourceHTML = header + htmlContent + footer;

  const blob = new Blob(['\ufeff', sourceHTML], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName + ".docx";
  link.click();

  URL.revokeObjectURL(url);
}
