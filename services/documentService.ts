// =============================================
//  documentService.ts (VERSÃO CORRIGIDA - NÃO FORMATA DATAS JÁ FORMATADAS)
// =============================================

export class DocumentService {

    static buildHtml(data: any): string {
        const header = data.content?.header || {};
        const intro = data.content?.intro || {};
        const part1 = data.content?.part1 || [];
        const part2 = data.content?.part2 || "Sem alterações.";
        const part3 = data.content?.part3 || "";
        const part4 = data.content?.part4 || "Sem alterações a registrar.";
        const part5 = data.content?.part5 || {};

        // VERIFICA SE AS DATAS JÁ ESTÃO FORMATADAS (contém "de" = já está por extenso)
        const isDateFormatted = (dateStr: string) => {
            return dateStr && dateStr.includes('de');
        };

        // Formata datas APENAS se não estiverem já formatadas
        const dateVisto = header.dateVisto 
            ? (isDateFormatted(header.dateVisto) ? header.dateVisto : this.formatDate(header.dateVisto))
            : '___';

        const dateStart = intro.dateStart 
            ? (isDateFormatted(intro.dateStart) ? intro.dateStart : this.formatDate(intro.dateStart))
            : '___';

        const dateEnd = intro.dateEnd 
            ? (isDateFormatted(intro.dateEnd) ? intro.dateEnd : this.formatDate(intro.dateEnd))
            : '___';

        // Dados do armeiro
        const armorerName = data.authorName || 'NOME DO ARMEIRO';
        const armorerMatricula = data.authorId || '000000';
        const armorerCity = part5.city || 'FORTALEZA';
        
        // Data da assinatura - verifica se já está formatada
        const armorerDate = part5.date 
            ? (isDateFormatted(part5.date) ? part5.date : this.formatDate(part5.date, false))
            : '___';

        const escalaTabela = this.generateScheduleTable(part1);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Livro de Alterações</title>
    <style>
        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 12pt;
            margin: 25mm;
            line-height: 1.5;
        }
        h1 {
            text-align: center;
            font-weight: bold;
            margin-bottom: 30px;
        }
        .parte-titulo {
            text-align: center;
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 10px;
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
            padding: 5px;
            font-size: 11pt;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        p {
            text-align: left;
            margin: 10px 0;
        }
        .assinatura-centralizada {
            margin-top: 80px;
            text-align: center;
            width: 100%;
        }
        .linha-assinatura {
            border-top: 1px solid black;
            width: 300px;
            margin: 0 auto 10px auto;
            padding-top: 15px;
        }
    </style>
</head>
<body>
    <h1>LIVRO DE ALTERAÇÕES</h1>

    <!-- CABEÇALHO -->
    <table>
        <tr>
            <td style="width: 35%; text-align: center; vertical-align: top;">
                <div style="font-weight: bold; font-size: 10pt;">VISTO POR ALTERAÇÃO</div>
                <div style="margin: 10px 0; font-size: 11pt;">${dateVisto}</div>
                <div style="font-weight: bold; margin-top: 15px;">${header.fiscal || 'NOME FISCAL'}</div>
                <div style="font-weight: bold; font-size: 10pt;">RESPONSÁVEL</div>
            </td>
            <td style="width: 65%; text-align: center; vertical-align: middle;">
                <div style="font-weight: bold; font-size: 12pt;">POLÍCIA MILITAR DO CEARÁ</div>
                <div style="margin: 5px 0; font-size: 10pt; font-weight: bold;">
                    CRPM <strong>${header.crpm || '___'}</strong> 
                    BPM <strong>${header.bpm || '___'}</strong> 
                    <strong>${header.city || 'CAUCAIA'}</strong>
                </div>
                <div style="font-weight: bold; text-decoration: underline; margin-top: 10px; font-size: 12pt;">
                    RESERVA DE ARMAMENTO
                </div>
            </td>
        </tr>
    </table>

    <!-- INTRODUÇÃO -->
    <p>
        Parte diária do armeiro do <strong>${intro.bpm || '___'}</strong> batalhão 
        do dia <strong>${dateStart}</strong> para o dia <strong>${dateEnd}</strong>, 
        ao Senhor Fiscal Administrativo.
    </p>

    <!-- I – PARTE: ESCALA DE SERVIÇO -->
    <div class="parte-titulo">I – PARTE: ESCALA DE SERVIÇO</div>
    ${escalaTabela}

    <!-- II – PARTE: INSTRUÇÃO -->
    <div class="parte-titulo">II – PARTE: INSTRUÇÃO</div>
    <p>${part2}</p>

    <!-- III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS -->
    <div class="parte-titulo">III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS</div>
    <div style="white-space: pre-line; font-size: 11pt;">${part3}</div>

    <!-- IV – PARTE: OCORRÊNCIAS -->
    <div class="parte-titulo">IV – PARTE: OCORRÊNCIAS</div>
    <p>Comunico-vos que:</p>
    <p>${part4}</p>

    <!-- V – PARTE: PASSAGEM DE SERVIÇO -->
    <div class="parte-titulo">V – PARTE: PASSAGEM DE SERVIÇO</div>
    <p style="margin-bottom: 30px;">
        FI-LA AO MEU SUBSTITUTO LEGAL, O <strong>${part5.substitute || 'GRADUAÇÃO / NOME'}</strong>, 
        A QUEM TRANSMITI TODAS AS ORDENS EM VIGOR, BEM COMO TODO MATERIAL A MEU CARGO.
    </p>

    <!-- ASSINATURA CENTRALIZADA -->
    <div class="assinatura-centralizada">
        <div style="font-weight: bold; margin-bottom: 20px;">
            ${armorerCity}, ${armorerDate}
        </div>
        <div class="linha-assinatura"></div>
        <div style="font-weight: bold; margin-bottom: 5px;">${armorerName}</div>
        <div>MAT: ${armorerMatricula}</div>
    </div>
</body>
</html>`;
    }

    // Função auxiliar para formatar datas APENAS se necessário
    private static formatDate(dateString: string, includeWeekday: boolean = true): string {
        if (!dateString) return '___';
        
        try {
            // Tenta parsear a data
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return '___';
            }

            const meses = [
                'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ];
            const diasSemana = [
                'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 
                'quinta-feira', 'sexta-feira', 'sábado'
            ];
            
            const dia = date.getDate();
            const mes = meses[date.getMonth()];
            const ano = date.getFullYear();
            
            if (includeWeekday) {
                const weekday = diasSemana[date.getDay()];
                return `${dia} de ${mes} de ${ano} (${weekday})`;
            } else {
                return `${dia} de ${mes} de ${ano}`;
            }
        } catch (e) {
            return '___';
        }
    }

    private static generateScheduleTable(schedule: any[]): string {
        if (!schedule || schedule.length === 0) {
            return '<p>Nenhuma escala definida.</p>';
        }

        let tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>GRAD</th>
                    <th>Nº</th>
                    <th>NOME</th>
                    <th>FUNÇÃO</th>
                    <th>HORÁRIO</th>
                </tr>
            </thead>
            <tbody>`;

        schedule.forEach((row, index) => {
            tableHtml += `
                <tr>
                    <td>${row.grad || '-'}</td>
                    <td>${row.num || ''}</td>
                    <td>${row.name || ''}</td>
                    <td>${row.func || ''}</td>
                    <td>${row.horario || ''}</td>
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
