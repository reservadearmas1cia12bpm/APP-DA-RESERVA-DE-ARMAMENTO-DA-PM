import { 
    Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, 
    TextRun, AlignmentType, BorderStyle, ImageRun, VerticalAlign, 
    HeightRule
} from "docx";
import FileSaver from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DailyPart } from "../types";

// --- HELPERS ---
const formatDate = (dateStr: string) => {
    if (!dateStr) return "___/___/____";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const getFullDateText = (dateStr: string) => {
    if (!dateStr) return "___ de _______ de ____";
    const date = new Date(dateStr);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${adjustedDate.getDate()} de ${months[adjustedDate.getMonth()]} de ${adjustedDate.getFullYear()}`;
};

// ABNT CONSTANTS (Twips)
const MARGINS = {
    top: 1701,    // 3cm
    left: 1701,   // 3cm
    bottom: 1134, // 2cm
    right: 1134   // 2cm
};

const FONT_FAMILY = "Times New Roman";
const FONT_SIZE_PT = 24; // 12pt
const LINE_SPACING = 360; // 1.5 spacing

const BORDER_STYLE = { style: BorderStyle.SINGLE, size: 4, color: "000000" }; // 0.5pt
const TABLE_BORDERS = {
    top: BORDER_STYLE, bottom: BORDER_STYLE, left: BORDER_STYLE, right: BORDER_STYLE, 
    insideHorizontal: BORDER_STYLE, insideVertical: BORDER_STYLE
};

// Helper for Body Text with Bolding logic for subtitles
const createBodyParagraph = (text: string) => {
    // Regex to detect subtitles like "1) TITLE:", "A) SUBTITLE:", "HT:", "RESERVA:"
    // Matches lines starting with Number+), Letter+), or Uppercase Words ending in Colon
    const isSubtitle = /^\d+\)|^[A-Z]\)|^[A-ZÇÃÕÂÊÎÔÛ \/\-]+:$/.test(text.trim());
    
    return new Paragraph({
        children: [new TextRun({ text: text, bold: isSubtitle })],
        alignment: AlignmentType.LEFT, // STRICTLY LEFT
        spacing: { line: LINE_SPACING }
    });
};

export const DocumentService = {
    
    // --- GENERATE WORD (NATIVE DOCX) ---
    generateWord: async (data: DailyPart) => {
        const { header, intro, part1, part2, part3, part4, part5 } = data.content;

        // 1. Signature Image
        let signatureImage = null;
        if (data.signature) {
            try {
                const response = await fetch(data.signature);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                signatureImage = new ImageRun({
                    data: arrayBuffer,
                    transformation: { width: 150, height: 60 },
                });
            } catch (e) {
                console.warn("Could not load signature image", e);
            }
        }

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: FONT_FAMILY,
                            size: FONT_SIZE_PT,
                        },
                        paragraph: {
                            spacing: { line: LINE_SPACING }, 
                            alignment: AlignmentType.LEFT // GLOBAL LEFT ALIGNMENT
                        }
                    }
                }
            },
            sections: [{
                properties: { page: { margin: MARGINS } },
                children: [
                    // Title
                    new Paragraph({
                        children: [new TextRun({ text: "LIVRO DE ALTERAÇÕES", bold: true, size: 28 })], // 14pt
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    }),

                    // --- HEADER TABLE ---
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: TABLE_BORDERS,
                        rows: [
                            new TableRow({
                                height: { value: 1800, rule: HeightRule.AT_LEAST },
                                children: [
                                    new TableCell({
                                        width: { size: 35, type: WidthType.PERCENTAGE },
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [
                                            new Paragraph({ children: [new TextRun({ text: "VISTO EM:", bold: true, size: 20 })], alignment: AlignmentType.CENTER }),
                                            new Paragraph({ children: [new TextRun({ text: header.dateVisto ? formatDate(header.dateVisto) : "___/___/____", size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } }),
                                            new Paragraph({ children: [new TextRun({ text: "______________________" })], alignment: AlignmentType.CENTER }),
                                            new Paragraph({ children: [new TextRun({ text: header.fiscal || "FISCAL ADMIN", bold: true, size: 20 })], alignment: AlignmentType.CENTER }),
                                        ],
                                    }),
                                    new TableCell({
                                        width: { size: 65, type: WidthType.PERCENTAGE },
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [
                                            new Paragraph({ children: [new TextRun({ text: "POLÍCIA MILITAR DO CEARÁ", bold: true })], alignment: AlignmentType.CENTER }),
                                            new Paragraph({ children: [new TextRun({ text: `${header.crpm || "___"} CRPM`, bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
                                            new Paragraph({ 
                                                children: [
                                                    new TextRun({ text: `${header.bpm || "__"} BPM`, bold: true }),
                                                    new TextRun({ text: "\t------------------\t" }),
                                                    new TextRun({ text: header.city?.toUpperCase() || "CIDADE", bold: true })
                                                ], 
                                                alignment: AlignmentType.CENTER,
                                                tabStops: [{ position: 2500, type: "center" }, { position: 5000, type: "center" }]
                                            }),
                                            new Paragraph({ children: [new TextRun({ text: "RESERVA DE ARMAMENTO", bold: true, underline: {} })], alignment: AlignmentType.CENTER, spacing: { before: 200 } }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),

                    // --- INTRO ---
                    new Paragraph({
                        children: [
                            new TextRun("Parte diária do armeiro do "),
                            new TextRun({ text: header.bpm || "___", bold: true }),
                            new TextRun(" batalhão do dia "),
                            new TextRun({ text: formatDate(intro.dateStart), bold: true }),
                            new TextRun(" para o dia "),
                            new TextRun({ text: formatDate(intro.dateEnd), bold: true }),
                            new TextRun(` de ${getFullDateText(intro.dateEnd).split(' de ')[1]} de ${getFullDateText(intro.dateEnd).split(' de ')[2]}, ao Senhor Fiscal Administrativo.`)
                        ],
                        spacing: { before: 300, after: 300 },
                        alignment: AlignmentType.LEFT
                    }),

                    // --- PART I ---
                    new Paragraph({ 
                        children: [new TextRun({ text: "I – PARTE: ESCALA DE SERVIÇO", bold: true })], 
                        alignment: AlignmentType.CENTER, 
                        spacing: { after: 100 } 
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: TABLE_BORDERS,
                        rows: [
                            new TableRow({
                                tableHeader: true,
                                children: [
                                    new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "GRAD", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: "F2F2F2" } }),
                                    new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nº", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: "F2F2F2" } }),
                                    new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "NOME", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: "F2F2F2" } }),
                                    new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "FUNÇÃO", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: "F2F2F2" } }),
                                    new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "HORÁRIO", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: "F2F2F2" } }),
                                ]
                            }),
                            ...part1.map(row => new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ text: row.grad, alignment: AlignmentType.CENTER, size: 20 })] }),
                                    new TableCell({ children: [new Paragraph({ text: row.num, alignment: AlignmentType.CENTER, size: 20 })] }),
                                    new TableCell({ children: [new Paragraph({ text: row.name, alignment: AlignmentType.CENTER, size: 20 })] }),
                                    new TableCell({ children: [new Paragraph({ text: row.func, alignment: AlignmentType.CENTER, size: 20 })] }),
                                    new TableCell({ children: [new Paragraph({ text: row.horario, alignment: AlignmentType.CENTER, size: 20 })] }),
                                ]
                            }))
                        ]
                    }),

                    // --- PARTS II, III, IV ---
                    new Paragraph({ children: [new TextRun({ text: "II – PARTE: INSTRUÇÃO", bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 300, after: 100 } }),
                    ...part2.split('\n').map(line => createBodyParagraph(line)),

                    new Paragraph({ children: [new TextRun({ text: "III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS", bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 300, after: 100 } }),
                    ...part3.split('\n').map(line => createBodyParagraph(line)),

                    new Paragraph({ children: [new TextRun({ text: "IV – PARTE: OCORRÊNCIAS", bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 300, after: 100 } }),
                    new Paragraph({ text: "Comunico-vos que:", spacing: { after: 100 }, alignment: AlignmentType.LEFT }),
                    ...part4.split('\n').map(line => createBodyParagraph(line)),

                    // --- PART V ---
                    new Paragraph({ children: [new TextRun({ text: "V – PARTE: PASSAGEM DE SERVIÇO", bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 300, after: 100 } }),
                    new Paragraph({
                        children: [
                            new TextRun("FI-LA AO MEU SUBSTITUTO LEGAL, O "),
                            new TextRun({ text: part5.substitute.toUpperCase(), bold: true, underline: {} }),
                            new TextRun(", A QUEM TRANSMITI TODAS AS ORDENS EM VIGOR, BEM COMO TODO MATERIAL A MEU CARGO.")
                        ],
                        alignment: AlignmentType.LEFT
                    }),

                    // --- FOOTER ---
                    new Paragraph({
                        children: [new TextRun({ text: `${part5.city.toUpperCase()}, ${getFullDateText(part5.date).toUpperCase()}`, bold: true })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 400 }
                    }),
                    
                    ...(signatureImage ? [new Paragraph({ children: [signatureImage], alignment: AlignmentType.CENTER })] : [new Paragraph({ text: "", spacing: { before: 800 } })]),

                    new Paragraph({ children: [new TextRun({ text: "_________________________________________________", size: 24 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: data.authorName.toUpperCase(), bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `MATRÍCULA: ${data.authorId}`, size: 22 })], alignment: AlignmentType.CENTER }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Livro_Alteracoes_${intro.dateStart}.docx`);
    },

    // --- GENERATE PDF (NATIVE JSPDF) ---
    generatePDF: (data: DailyPart) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const left = 30, top = 30, right = 20;
        const contentWidth = 160;
        let cursorY = top;

        doc.setFont("times", "normal");
        doc.setFontSize(12);

        const checkBreak = (h: number) => {
            if (cursorY + h > 277) { doc.addPage(); cursorY = top; return true; }
            return false;
        };

        // TITLE
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("LIVRO DE ALTERAÇÕES", 105, cursorY, { align: 'center' });
        cursorY += 10;

        // HEADER
        doc.setFontSize(12);
        doc.setLineWidth(0.1);
        doc.rect(left, cursorY, contentWidth, 35);
        doc.line(left + 60, cursorY, left + 60, cursorY + 35);
        
        doc.setFontSize(10);
        doc.text("VISTO EM:", left + 5, cursorY + 5);
        doc.text(data.content.header.dateVisto ? formatDate(data.content.header.dateVisto) : "___/___/____", left + 30, cursorY + 12, { align: 'center' });
        doc.line(left + 10, cursorY + 22, left + 50, cursorY + 22);
        doc.text(data.content.header.fiscal || "FISCAL ADMIN", left + 30, cursorY + 27, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont("times", "bold");
        const centerRight = left + 60 + (contentWidth - 60) / 2;
        doc.text("POLÍCIA MILITAR DO CEARÁ", centerRight, cursorY + 8, { align: 'center' });
        doc.text(`${data.content.header.crpm || "__"} CRPM`, centerRight, cursorY + 14, { align: 'center' });
        doc.text(`${data.content.header.bpm || "__"} BPM       -------       ${data.content.header.city.toUpperCase()}`, centerRight, cursorY + 20, { align: 'center' });
        doc.text("RESERVA DE ARMAMENTO", centerRight, cursorY + 28, { align: 'center' });
        cursorY += 45;

        // INTRO
        doc.setFont("times", "normal");
        const introText = `Parte diária do armeiro do ${data.content.intro.bpm || "___"} batalhão do dia ${formatDate(data.content.intro.dateStart)} para o dia ${formatDate(data.content.intro.dateEnd)} de ${getFullDateText(data.content.intro.dateEnd).split(' de ')[1]} de ${getFullDateText(data.content.intro.dateEnd).split(' de ')[2]}, ao Senhor Fiscal Administrativo.`;
        const splitIntro = doc.splitTextToSize(introText, contentWidth);
        doc.text(splitIntro, left, cursorY, { align: "left" });
        cursorY += splitIntro.length * 6 + 10;

        // PART I
        doc.setFont("times", "bold");
        doc.text("I – PARTE: ESCALA DE SERVIÇO", 105, cursorY, { align: 'center' });
        cursorY += 6;

        autoTable(doc, {
            startY: cursorY,
            head: [['GRAD', 'Nº', 'NOME', 'FUNÇÃO', 'HORÁRIO']],
            body: data.content.part1.map(r => [r.grad, r.num, r.name, r.func, r.horario]),
            theme: 'grid',
            styles: { font: 'times', fontSize: 10, cellPadding: 2, lineWidth: 0.1, lineColor: 0, halign: 'center', valign: 'middle' },
            headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 15 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 30 }, 4: { cellWidth: 25 } },
            margin: { left: left, right: right }
        });
        // @ts-ignore
        cursorY = doc.lastAutoTable.finalY + 10;

        // Helper Text Part
        const addTextPart = (title: string, content: string, preText = "") => {
            checkBreak(30);
            doc.setFont("times", "bold");
            doc.text(title, 105, cursorY, { align: 'center' });
            cursorY += 8;
            if (preText) {
                doc.setFont("times", "normal");
                doc.text(preText, left, cursorY);
                cursorY += 6;
            }
            const lines = content.split('\n');
            lines.forEach(line => {
                checkBreak(6);
                // Detect subtitles for bolding
                if (/^\d+\)|^[A-Z]\)|^[A-ZÇÃÕÂÊÎÔÛ \/\-]+:$/.test(line.trim())) doc.setFont("times", "bold");
                else doc.setFont("times", "normal");
                const splitLine = doc.splitTextToSize(line, contentWidth);
                doc.text(splitLine, left, cursorY);
                cursorY += splitLine.length * 6;
            });
            cursorY += 4;
        };

        addTextPart("II – PARTE: INSTRUÇÃO", data.content.part2);
        addTextPart("III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS", data.content.part3);
        addTextPart("IV – PARTE: OCORRÊNCIAS", data.content.part4, "Comunico-vos que:");

        // PART V
        checkBreak(50);
        doc.setFont("times", "bold");
        doc.text("V – PARTE: PASSAGEM DE SERVIÇO", 105, cursorY, { align: 'center' });
        cursorY += 10;
        doc.setFont("times", "normal");
        const handover = `FI-LA AO MEU SUBSTITUTO LEGAL, O ${data.content.part5.substitute.toUpperCase()}, A QUEM TRANSMITI TODAS AS ORDENS EM VIGOR, BEM COMO TODO MATERIAL A MEU CARGO.`;
        const splitHandover = doc.splitTextToSize(handover, contentWidth);
        doc.text(splitHandover, left, cursorY, { align: "left" });
        cursorY += splitHandover.length * 6 + 15;

        // Date
        doc.setFont("times", "bold");
        doc.text(`${data.content.part5.city.toUpperCase()}, ${getFullDateText(data.content.part5.date).toUpperCase()}`, 105, cursorY, { align: 'center' });
        cursorY += 15;

        if (data.signature) {
            if(checkBreak(30)) cursorY += 5;
            try { doc.addImage(data.signature, 'PNG', 80, cursorY, 50, 20); } catch(e) {}
            cursorY += 20;
        } else {
            cursorY += 20;
        }

        doc.line(60, cursorY, 150, cursorY);
        cursorY += 5;
        doc.text(data.authorName.toUpperCase(), 105, cursorY, { align: 'center' });
        cursorY += 5;
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.text(`MATRÍCULA: ${data.authorId}`, 105, cursorY, { align: 'center' });

        doc.save(`Livro_Alteracoes_${data.content.intro.dateStart}.pdf`);
    }
};