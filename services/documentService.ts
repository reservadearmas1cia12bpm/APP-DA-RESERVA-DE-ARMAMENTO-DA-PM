import htmlDocx from "html-docx-js/dist/html-docx";

export function exportToWord(html: string, filename: string) {
  const docxBlob = htmlDocx.asBlob(html);

  const url = URL.createObjectURL(docxBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".docx";
  a.click();

  URL.revokeObjectURL(url);
}
