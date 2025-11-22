// =============================================
//  documentService.ts (VERSÃO CORRIGIDA - CENTRALIZAÇÃO GARANTIDA)
// =============================================

export class DocumentService {

    static buildHtml(data: any): string {
        console.log('Dados recebidos para exportação:', data); // DEBUG
        
        const header = data.content?.header || {};
        const intro = data.content?.intro || {};
        const part1 = data.content?.part1 || [];
        const part2 = data.content?.part2 || "Sem alterações.";
        const part3 = data.content?.part3 || "";
        const part4 = data.content?.part4 || "Sem alterações a registrar.";
        const part5 = data.content?.part5 || {};

        // Formata datas
        const dateVisto = header.dateVisto ? new Date(header.dateVisto).toLocaleDateString('pt-BR') : '___/___/_____';
        const dateStart = intro.dateStart ? new Date(intro.dateStart).toLocaleDateString('pt-BR') : '___/___/_____';
        const dateEnd = intro.dateEnd ? new Date(intro.dateEnd).toLocaleDateString('pt-BR') : '___/___/_____';

        // DADOS DO ARMEIRO - BUSCA EM MÚLTIPLOS CAMPOS
        const armorerName = data.authorName || data.content?.authorName || 'NOME DO ARMEIRO';
        const armorerMatricula = data.authorId || data.content?.authorId || '000000';
        const armorerCity = part5.city || header.city || 'FORTALEZA';
        const armorerDate = part5.date ? new Date(part5.date).toLocaleDateString('pt-BR') : '__/__/____';

        console.log('Dados do armeiro:', { armorerName, armorerMatricula, armorerCity, armorerDate }); // DEBUG

        const escalaTabela = this.generateScheduleTable(part1);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Livro de Alterações</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 12pt;
            margin: 25mm;
            line-height: 1.6;
            width: 100%;
        }
        h1 {
            text-align: center;
            font-weight: bold;
            margin-bottom: 40px;
            font-size: 16pt;
        }
        .parte-titulo {
            text-align: center;
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 15px;
            font-size: 12pt;
            text-decoration: underline;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0 25px 0;
        }
        table, tr, td, th {
            border: 1px solid black;
            padding: 6px;
            font-size: 11pt;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        .assinatura-container {
            margin-top: 120px;
            width: 100%;
            text-align: center;
        }
        .cidade-data {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 25px;
            text-align: center;
        }
        .linha-assinatura {
            border-top: 1px solid #000;
            width: 350px;
            margin: 0 auto 15px auto;
            padding-top: 25px;
        }
        .nome-armeiro {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 5px;
            text-align: center;
        }
        .matricula {
            font-size: 11pt;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>LIVRO DE ALTERAÇÕES</h1>

    <!-- CABEÇALHO -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tr>
            <td style="width: 35%; border: 1px solid black; padding: 10px; text-align: center; vertical-align: top;">
                <div style="font-weight: bold; font-size: 10pt;">VISTO POR ALTERAÇÃO</div>
                <div style="margin: 12px 0; font-size: 11pt;">${dateVisto}</div>
                <div style="font-weight: bold; margin-top: 20px;">${header.fiscal || 'NOME FISCAL'}</div>
                <div style="font-weight: bold; font-size: 10pt; margin-top: 5px;">RESPONSÁVEL</div>
            </td>
            <td style="width: 65%; border: 1px solid black; padding: 10px; text-align: center; vertical-align: middle;">
                <div style="font-weight: bold; font-size: 13pt;">POLÍCIA MILITAR DO CEARÁ</div>
                <div style="margin: 8px 0; font-size: 10pt; font-weight: bold;">
                    CRPM <strong>${header.crpm || '___'}</strong> 
                    BPM <strong>${header.bpm || '___'}</strong> 
                    <strong>${header.city || 'CAUCAIA'}</strong>
                </div>
                <div style="font-weight: bold; text-decoration: underline; margin-top: 12px; font-size: 12pt;">
                    RESERVA DE ARMAMENTO
                </div>
            </td>
        </tr>
    </table>

    <!-- INTRODUÇÃO -->
    <p style="text-align: left; margin-bottom: 25px;">
        Parte diária do armeiro do <strong>${intro.bpm || '___'}</strong> batalhão 
        do dia <strong>${dateStart}</strong> para o dia <strong>${dateEnd}</strong>, 
        ao Senhor Fiscal Administrativo.
    </p>

    <!-- I – PARTE: ESCALA DE SERVIÇO -->
    <div class="parte-titulo">I – PARTE: ESCALA DE SERVIÇO</div>
    ${escalaTabela}

    <!-- II – PARTE: INSTRUÇÃO -->
    <div class="parte-titulo">II – PARTE: INSTRUÇÃO</div>
    <p style="text-align: left;">${part2}</p>

    <!-- III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS -->
    <div class="parte-titulo">III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS</div>
    <div style="white-space: pre-line; font-size: 11pt; text-align: left;">${part3}</div>

    <!-- IV – PARTE: OCORRÊNCIAS -->
    <div class="parte-titulo">IV – PARTE: OCORRÊNCIAS</div>
    <p style="text-align: left;">Comunico-vos que:</p>
    <p style="text-align: left;">${part4}</p>

    <!-- V – PARTE: PASSAGEM DE SERVIÇO -->
    <div class="parte-titulo">V – PARTE: PASSAGEM DE SERVIÇO</div>
    <p style="margin-bottom: 40px; text-align: left;">
        FI-LA AO MEU SUBSTITUTO LEGAL, O <strong>${part5.substitute || 'GRADUAÇÃO / NOME'}</strong>, 
        A QUEM TRANSMITI TODAS AS ORDENS EM VIGOR, BEM COMO TODO MATERIAL A MEU CARGO.
    </p>

    <!-- ASSINATURA PERFEITAMENTE CENTRALIZADA -->
    <div class="assinatura-container">
        <div class="cidade-data">${armorerCity}, ${armorerDate}</div>
        <div class="linha-assinatura"></div>
        <div class="nome-armeiro">${armorerName}</div>
        <div class="matricula">MAT: ${armorerMatricula}</div>
    </div>
</body>
</html>`;
    }

    private static generateScheduleTable(schedule: any[]): string {
        if (!schedule || schedule.length === 0) {
            return '<p>Nenhuma escala definida.</p>';
        }

        let tableHtml = `
        <table>
            <thead>
                <tr>
                    <th colspan="2" style="text-align: center;">Nº</th>
                    <th style="text-align: center;">NOME</th>
                    <th style="text-align: center;">FUNÇÃO</th>
                    <th style="text-align: center;">HORÁRIO</th>
                </tr>
                <tr>
                    <th style="text-align: center;">GRAD</th>
                    <th style="text-align: center;">Nº</th>
                    <th style="text-align: center;">NOME</th>
                    <th style="text-align: center;">FUNÇÃO</th>
                    <th style="text-align: center;">HORÁRIO</th>
                </tr>
            </thead>
            <tbody>`;

        schedule.forEach((row, index) => {
            tableHtml += `
                <tr>
                    <td style="text-align: center;">${row.grad || '-'}</td>
                    <td style="text-align: center;">${row.num || ''}</td>
                    <td style="text-align: center;">${row.name || ''}</td>
                    <td style="text-align: center;">${row.func || ''}</td>
                    <td style="text-align: center;">${row.horario || ''}</td>
                </tr>`;
        });

        tableHtml += `
            </tbody>
        </table>`;

        return tableHtml;
    }

    static exportToWord(data: any): void {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('Ambiente não suportado para exportação');
            return;
        }

        try {
            const htmlContent = this.buildHtml(data);
            
            const blob = new Blob([htmlContent], {
                type: 'application/msword'
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `livro_alteracoes_${this.getCurrentDate()}.doc`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error('Erro na exportação para Word:', error);
            alert('Erro ao exportar para Word. Verifique o console para detalhes.');
        }
    }

    static exportToPDF(data: any): void {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('Ambiente não suportado para exportação');
            return;
        }

        try {
            const htmlContent = this.buildHtml(data);
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Permita pop-ups para gerar PDF');
                return;
            }

            printWindow.document.write(htmlContent);
            printWindow.document.close();

            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
            };

        } catch (error) {
            console.error('Erro na exportação para PDF:', error);
            alert('Erro ao exportar para PDF. Verifique o console para detalhes.');
        }
    }

    static generateWord(data: any): void {
        this.exportToWord(data);
    }

    static generatePDF(data: any): void {
        this.exportToPDF(data);
    }

    private static getCurrentDate(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export default DocumentService;
