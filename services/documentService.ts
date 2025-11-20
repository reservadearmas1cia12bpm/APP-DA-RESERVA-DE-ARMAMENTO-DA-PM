// =============================================
//  documentService.ts (VERSÃO SUPER SIMPLIFICADA)
//  Compatível com Vercel - Sem erros de build
// =============================================

export default class DocumentService {

    // -----------------------------------------
    //  GERA O HTML COM A FORMATAÇÃO DO DOCUMENTO
    // -----------------------------------------
    static buildHtml(data: any): string {
        const escalaTabela = data.escalaTabela || "";
        const instrucao = data.instrucao || "Sem alterações.";
        const materialBelico = data.materialBelico || "Sem alterações.";
        const materialComunicacao = data.materialComunicacao || "Sem alterações.";
        const materialBalistico = data.materialBalistico || "Sem alterações.";
        const materialSinalizacao = data.materialSinalizacao || "Sem alterações.";
        const materiaisDiversos = data.materiaisDiversos || "Sem alterações.";
        const ocorrencias = data.ocorrencias || "Sem alterações a registrar.";
        const passagem = data.passagem || "";
        const dataStr = data.data || "";

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Livro de Alterações</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            margin: 30px;
            line-height: 1.4;
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
            font-size: 14pt;
        }
        p, div {
            text-align: left;
            margin: 8px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 20px 0;
        }
        table, tr, td, th {
            border: 1px solid black;
            padding: 6px;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .assinatura {
            margin-top: 60px;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>LIVRO DE ALTERAÇÕES</h1>

    <div class="parte-titulo">I – PARTE: ESCALA DE SERVIÇO</div>
    ${escalaTabela}

    <div class="parte-titulo">II – PARTE: INSTRUÇÃO</div>
    <p>${instrucao}</p>

    <div class="parte-titulo">III – PARTE: ASSUNTOS GERAIS / ADMINISTRATIVOS</div>

    <h3>1) MATERIAL BÉLICO</h3>
    <p>${materialBelico}</p>

    <h3>2) MATERIAL DE COMUNICAÇÃO</h3>
    <p>${materialComunicacao}</p>

    <h3>3) MATERIAL DE PROTEÇÃO BALÍSTICA</h3>
    <p>${materialBalistico}</p>

    <h3>4) MATERIAL DE SINALIZAÇÃO</h3>
    <p>${materialSinalizacao}</p>

    <h3>MATERIAIS DIVERSOS</h3>
    <p>${materiaisDiversos}</p>

    <div class="parte-titulo">IV – PARTE: OCORRÊNCIAS</div>
    <p>${ocorrencias}</p>

    <div class="parte-titulo">V – PARTE: PASSAGEM DE SERVIÇO</div>
    <p>${passagem}</p>
    
    <p style="text-align:center; margin-top:40px;">
        ${dataStr}
    </p>

    <div class="assinatura">
        ___________________________________________<br/>
        ASSINATURA
    </div>
</body>
</html>`;
    }

    // -----------------------------------------
    //  EXPORTAÇÃO PARA WORD (COMPATÍVEL VERCEL)
    // -----------------------------------------
    static exportToWord(data: any): void {
        // Verificação robusta para SSR
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        try {
            const htmlContent = this.buildHtml(data);
            
            // Cria um blob com o conteúdo HTML formatado para Word
            const blob = new Blob([htmlContent], {
                type: 'application/msword'
            });

            // Cria URL para o blob
            const url = window.URL.createObjectURL(blob);

            // Cria link para download
            const link = document.createElement('a');
            link.href = url;
            link.download = `livro_alteracoes_${this.getCurrentDate()}.doc`;
            
            // Adiciona à página, clica e remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Limpa a URL após o download
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error('Erro na exportação para Word:', error);
        }
    }

    // -----------------------------------------
    //  EXPORTAÇÃO PARA PDF (COMPATÍVEL VERCEL)
    // -----------------------------------------
    static exportToPDF(data: any): void {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        try {
            const htmlContent = this.buildHtml(data);
            
            // Abre nova janela
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Permita pop-ups para gerar PDF');
                return;
            }

            // Escreve o conteúdo
            printWindow.document.write(htmlContent);
            printWindow.document.close();

            // Espera o conteúdo carregar e imprime
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
                
                // Fecha após imprimir (opcional)
                // printWindow.close();
            };

        } catch (error) {
            console.error('Erro na exportação para PDF:', error);
        }
    }

    // -----------------------------------------
    //  MÉTODO AUXILIAR: DATA ATUAL
    // -----------------------------------------
    private static getCurrentDate(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
