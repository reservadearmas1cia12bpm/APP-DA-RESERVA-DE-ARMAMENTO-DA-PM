// =============================================
//  documentService.ts (VERSÃO CORRIGIDA)
//  Compatível com Vercel + Vite
//  Exporta PDF e Word sem quebrar o build
// =============================================

export default class DocumentService {

    // -----------------------------------------
    //  GERA O HTML COM A FORMATAÇÃO DO DOCUMENTO
    // -----------------------------------------
    static buildHtml(data: any): string {
        return `
            <html>
            <head>
                <meta charset="UTF-8" />
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12pt;
                        margin: 30px;
                    }

                    h1 {
                        text-align: center;
                        font-weight: bold;
                        margin-bottom: 30px;
                    }

                    .parte-titulo {
                        text-align: center;
                        font-weight: bold;
                        margin-top: 20px;
                        margin-bottom: 10px;
                    }

                    p, div, table {
                        text-align: left;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                        margin-bottom: 20px;
                    }

                    table, tr, td, th {
                        border: 1px solid black;
                        padding: 4px;
                    }
                </style>
            </head>

            <body>
                <h1>LIVRO DE ALTERAÇÕES</h1>

                <div class="parte-titulo">I – PARTE: ESCALA DE SERVIÇO</div>
                ${data.escalaTabela || ""}

                <div class="parte-titulo">II – PARTE: INSTRUÇÃO</div>
                <p>${data.instrucao || "Sem alterações."}</p>

                <div class="parte-titulo">III – PARTE: ASSUNTOS GERAIS / ADMINISTRATIVOS</div>

                <h3>1) MATERIAL BÉLICO</h3>
                <p>${data.materialBelico || "Sem alterações."}</p>

                <h3>2) MATERIAL DE COMUNICAÇÃO</h3>
                <p>${data.materialComunicacao || "Sem alterações."}</p>

                <h3>3) MATERIAL DE PROTEÇÃO BALÍSTICA</h3>
                <p>${data.materialBalistico || "Sem alterações."}</p>

                <h3>4) MATERIAL DE SINALIZAÇÃO</h3>
                <p>${data.materialSinalizacao || "Sem alterações."}</p>

                <h3>MATERIAIS DIVERSOS</h3>
                <p>${data.materiaisDiversos || "Sem alterações."}</p>

                <div class="parte-titulo">IV – PARTE: OCORRÊNCIAS</div>
                <p>${data.ocorrencias || "Sem alterações a registrar."}</p>

                <div class="parte-titulo">V – PARTE: PASSAGEM DE SERVIÇO</div>
                <p>${data.passagem || ""}</p>
                <p style="text-align:center; margin-top:40px;">
                    ${data.data || ""}
                </p>

                <div style="margin-top: 60px; text-align:center;">
                    ___________________________________________<br/>
                    ASSINATURA
                </div>
            </body>
            </html>
        `;
    }

    // -----------------------------------------
    //  EXPORTAÇÃO PARA WORD — VERCEL COMPATÍVEL
    // -----------------------------------------
    static async exportToWord(data: any) {
        // Verificação mais robusta para SSR (Server-Side Rendering)
        if (typeof window === "undefined" || !window.document) {
            console.warn("exportToWord: Ambiente não suportado (SSR)");
            return;
        }

        try {
            // IMPORTAÇÃO DINÂMICA — NÃO QUEBRA O BUILD
            const htmlDocx = await import("html-docx-js")
                .then(module => module.default || module)
                .catch(async () => {
                    // Fallback para importação alternativa
                    return await import("html-docx-js/dist/html-docx")
                        .then(module => module.default || module);
                });

            if (!htmlDocx) {
                throw new Error("Biblioteca html-docx-js não encontrada");
            }

            const html = this.buildHtml(data);
            const blob = htmlDocx.asBlob(html, {
                orientation: 'portrait',
                margins: { top: 100, right: 100, bottom: 100, left: 100 }
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `livro_alteracoes_${new Date().toISOString().split('T')[0]}.docx`;
            link.style.display = "none";
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup após download
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error("Erro ao gerar Word:", error);
            this.fallbackExportToWord(data);
        }
    }

    // -----------------------------------------
    //  FALLBACK PARA EXPORTAÇÃO WORD SIMPLES
    // -----------------------------------------
    private static fallbackExportToWord(data: any) {
        if (typeof window === "undefined") return;

        try {
            const html = this.buildHtml(data);
            const blob = new Blob([`
                <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                      xmlns:w="urn:schemas-microsoft-com:office:word" 
                      xmlns="http://www.w3.org/TR/REC-html40">
                <head><meta charset="utf-8"><title>Document</title></head>
                <body>${html}</body></html>
            `], { type: 'application/msword' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            
            link.href = url;
            link.download = `livro_alteracoes_${new Date().toISOString().split('T')[0]}.doc`;
            link.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error("Erro no fallback do Word:", error);
        }
    }

    // -----------------------------------------
    //  EXPORTAÇÃO PARA PDF (USANDO print())
    // -----------------------------------------
    static exportToPDF(data: any) {
        // Verificação robusta para SSR
        if (typeof window === "undefined" || !window.open) {
            console.warn("exportToPDF: Ambiente não suportado (SSR)");
            return;
        }

        try {
            const html = this.buildHtml(data);
            const printWindow = window.open("", "_blank");

            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                
                // Aguarda o carregamento antes de imprimir
                printWindow.onload = () => {
                    printWindow.print();
                    // Fecha a janela após um tempo se o usuário não imprimir
                    setTimeout(() => {
                        if (!printWindow.closed) {
                            printWindow.close();
                        }
                    }, 5000);
                };
            }
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
        }
    }
}
