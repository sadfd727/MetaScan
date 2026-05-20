import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORTS_DIR = path.join(__dirname, 'data', 'exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

var FONT_REGULAR = path.join(__dirname, 'fonts');
var hasCustomFont = false;

try {
    if (fs.existsSync(path.join(FONT_REGULAR, 'NotoSansSC-Regular.ttf'))) {
        hasCustomFont = true;
    }
} catch (e) { hasCustomFont = false; }

var LOG_PREFIX = '[Export]';

function log(level, message, data) {
    var ts = new Date().toISOString();
    var entry = LOG_PREFIX + ' [' + level.toUpperCase() + '] ' + ts + ' ' + message;
    if (data) entry += ' ' + JSON.stringify(data);
    if (level === 'error') console.error(entry);
    else console.log(entry);
}

var COLOR = {
    primary: '#1a2980',
    secondary: '#26d0ce',
    dark: '#1e293b',
    gray: '#64748b',
    lightGray: '#e2e8f0',
    white: '#ffffff',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgLight: '#f8fafc',
    border: '#cbd5e1',
    headerBg: '#f0f4ff'
};

var METABOLITES = [
    { id: 'GLU', name: '葡萄糖', unit: 'mmol/L', normalRange: '3.9 - 6.1' },
    { id: 'TC', name: '总胆固醇', unit: 'mmol/L', normalRange: '2.8 - 5.17' },
    { id: 'TG', name: '甘油三酯', unit: 'mmol/L', normalRange: '0.56 - 1.7' },
    { id: 'HDL_C', name: '高密度脂蛋白', unit: 'mmol/L', normalRange: '1.03 - 1.55' },
    { id: 'LDL_C', name: '低密度脂蛋白', unit: 'mmol/L', normalRange: '0 - 3.37' },
    { id: 'UA', name: '尿酸', unit: 'µmol/L', normalRange: '155 - 357' },
    { id: 'ALT', name: '丙氨酸氨基转移酶', unit: 'U/L', normalRange: '7 - 40' },
    { id: 'AST', name: '天冬氨酸氨基转移酶', unit: 'U/L', normalRange: '13 - 35' },
    { id: 'CREA', name: '肌酐', unit: 'µmol/L', normalRange: '44 - 97' },
    { id: 'UREA', name: '尿素', unit: 'mmol/L', normalRange: '2.8 - 7.2' },
    { id: 'HS_CRP', name: '超敏C反应蛋白', unit: 'mg/L', normalRange: '0 - 3' },
    { id: 'HCY', name: '同型半胱氨酸', unit: 'µmol/L', normalRange: '5 - 15' },
    { id: 'LAC', name: '乳酸', unit: 'mmol/L', normalRange: '0.5 - 2.2' },
    { id: 'KET', name: '酮体', unit: 'mmol/L', normalRange: '0.02 - 0.27' }
];

var DIM_NAMES = {
    lipid: '脂质代谢', glucose: '糖代谢', amino: '氨基酸代谢',
    inflammation: '炎症状态', energy: '能量代谢', oxidative: '氧化应激'
};

function getRiskLevel(score) {
    if (score < 30) return { level: '低风险', color: COLOR.success };
    if (score < 60) return { level: '中等风险', color: COLOR.warning };
    return { level: '高风险', color: COLOR.danger };
}

function getMetaboliteStatus(val, normalRange) {
    if (val === undefined || val === null || val === '-') return { status: '-', color: COLOR.gray };
    var parts = String(normalRange).split('-');
    var low = parseFloat(parts[0]), high = parseFloat(parts[1]);
    if (isNaN(low) || isNaN(high)) return { status: '-', color: COLOR.gray };
    if (val < low) return { status: '偏低', color: COLOR.danger };
    if (val > high) return { status: '偏高', color: COLOR.danger };
    return { status: '正常', color: COLOR.success };
}

function drawHeader(doc, title) {
    doc.fontSize(22).fillColor(COLOR.primary).text('MetaScan 代谢健康报告', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(COLOR.gray).text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.width - doc.page.margins.right, doc.y)
       .lineWidth(2).strokeColor(COLOR.primary).stroke();
    doc.moveDown(0.5);
}

function drawSectionTitle(doc, title) {
    doc.moveDown(0.5);
    doc.fontSize(15).fillColor(COLOR.primary).text(title);
    doc.moveTo(doc.page.margins.left, doc.y + 2)
       .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
       .lineWidth(1).strokeColor(COLOR.lightGray).stroke();
    doc.moveDown(0.5);
}

function drawRiskCard(doc, overallRisk) {
    var risk = getRiskLevel(overallRisk);
    var cardY = doc.y;
    var cardW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    var cardH = 75;
    var cardX = doc.page.margins.left;

    if (doc.y + cardH > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        cardY = doc.y;
    }

    doc.roundedRect(cardX, cardY, cardW, cardH, 6).fill(COLOR.bgLight).stroke(COLOR.lightGray);
    doc.fontSize(40).fillColor(risk.color).text(overallRisk.toFixed(1), cardX, cardY + 10, { align: 'center', width: cardW });
    doc.fontSize(14).fillColor(risk.color).text(risk.level, cardX, cardY + 50, { align: 'center', width: cardW });
    doc.y = cardY + cardH + 15;
}

function drawRiskTable(doc, riskScores) {
    if (!riskScores) { doc.fontSize(10).fillColor(COLOR.gray).text('暂无风险评分数据'); return; }

    var tableTop = doc.y;
    var colWidths = [120, 60, 70, 140];
    var headers = ['维度', '评分', '风险等级', '进度'];
    var rowHeight = 28;
    var tableWidth = colWidths.reduce(function(a, b) { return a + b; }, 0);
    var startX = doc.page.margins.left;
    var endX = startX + tableWidth;

    doc.rect(startX, tableTop, tableWidth, rowHeight).fill(COLOR.headerBg);
    doc.fontSize(10).fillColor(COLOR.dark);
    var cx = startX + 5;
    headers.forEach(function(h, i) {
        doc.font('Helvetica-Bold').text(h, cx, tableTop + 7, { width: colWidths[i] - 10 });
        cx += colWidths[i];
    });
    doc.font('Helvetica');

    var rowY = tableTop + rowHeight;
    var entries = Object.entries(riskScores);

    entries.forEach(function(entry, idx) {
        if (rowY + rowHeight > doc.page.height - doc.page.margins.bottom - 40) {
            doc.addPage();
            rowY = doc.page.margins.top;
            doc.rect(startX, rowY, tableWidth, rowHeight).fill(COLOR.headerBg);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.dark);
            cx = startX + 5;
            headers.forEach(function(h, i) {
                doc.text(h, cx, rowY + 7, { width: colWidths[i] - 10 });
                cx += colWidths[i];
            });
            doc.font('Helvetica');
            rowY += rowHeight;
        }

        var key = entry[0], value = entry[1];
        var risk = getRiskLevel(value);
        var barWidth = Math.min(value, 100);

        doc.rect(startX, rowY, tableWidth, rowHeight).fill(idx % 2 === 0 ? '#ffffff' : '#f8fafc');
        doc.rect(startX, rowY, tableWidth, rowHeight).stroke(COLOR.lightGray);

        doc.fontSize(10).fillColor(COLOR.dark);
        cx = startX + 5;
        doc.text((DIM_NAMES[key] || key), cx, rowY + 7, { width: colWidths[0] - 10 });
        cx += colWidths[0];
        doc.font('Helvetica-Bold').fillColor(risk.color).text(value.toFixed(0), cx, rowY + 7, { width: colWidths[1] - 10 });
        cx += colWidths[1];
        doc.font('Helvetica').fillColor(risk.color).text(risk.level, cx, rowY + 7, { width: colWidths[2] - 10 });
        cx += colWidths[2];

        var barX = cx + 5;
        var barY = rowY + 8;
        var barH = 12;
        var barMaxW = colWidths[3] - 20;
        doc.rect(barX, barY, barMaxW, barH).fill(COLOR.lightGray).stroke(COLOR.lightGray);
        if (barWidth > 0) {
            doc.rect(barX, barY, barMaxW * barWidth / 100, barH).fill(risk.color);
        }

        rowY += rowHeight;
    });

    doc.y = rowY + 10;
}

function drawMetaboliteTable(doc, data) {
    var tableTop = doc.y;
    var colWidths = [120, 65, 55, 85, 55];
    var headers = ['指标名称', '检测值', '单位', '参考范围', '状态'];
    var rowHeight = 26;
    var tableWidth = colWidths.reduce(function(a, b) { return a + b; }, 0);
    var startX = doc.page.margins.left;

    doc.rect(startX, tableTop, tableWidth, rowHeight).fill(COLOR.headerBg);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR.dark);
    var cx = startX + 5;
    headers.forEach(function(h, i) {
        doc.text(h, cx, tableTop + 7, { width: colWidths[i] - 10 });
        cx += colWidths[i];
    });
    doc.font('Helvetica');

    var rowY = tableTop + rowHeight;
    METABOLITES.forEach(function(m, idx) {
        if (rowY + rowHeight > doc.page.height - doc.page.margins.bottom - 40) {
            doc.addPage();
            rowY = doc.page.margins.top;
            doc.rect(startX, rowY, tableWidth, rowHeight).fill(COLOR.headerBg);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.dark);
            cx = startX + 5;
            headers.forEach(function(h, i) {
                doc.text(h, cx, rowY + 7, { width: colWidths[i] - 10 });
                cx += colWidths[i];
            });
            doc.font('Helvetica');
            rowY += rowHeight;
        }

        var val = data[m.id];
        var status = getMetaboliteStatus(val, m.normalRange);
        var bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

        doc.rect(startX, rowY, tableWidth, rowHeight).fill(bgColor).stroke(COLOR.lightGray);

        doc.fontSize(9).fillColor(COLOR.dark);
        cx = startX + 5;
        doc.text(m.name, cx, rowY + 7, { width: colWidths[0] - 10 });
        cx += colWidths[0];
        doc.text(val !== undefined && val !== null ? Number(val).toFixed(2) : '-', cx, rowY + 7, { width: colWidths[1] - 10 });
        cx += colWidths[1];
        doc.text(m.unit, cx, rowY + 7, { width: colWidths[2] - 10 });
        cx += colWidths[2];
        doc.fillColor(COLOR.gray).text(m.normalRange, cx, rowY + 7, { width: colWidths[3] - 10 });
        cx += colWidths[3];
        doc.font('Helvetica-Bold').fillColor(status.color).text(status.status, cx, rowY + 7, { width: colWidths[4] - 10 });
        doc.font('Helvetica');

        rowY += rowHeight;
    });

    doc.y = rowY + 10;
}

function drawRecommendations(doc, data) {
    var riskScores = data.riskScores || {};
    var recommendations = [];

    if ((riskScores.lipid || 0) >= 50) {
        recommendations.push('脂质管理：建议低脂饮食，减少饱和脂肪和反式脂肪摄入，增加omega-3脂肪酸来源如深海鱼、亚麻籽等。');
    }
    if ((riskScores.glucose || 0) >= 50) {
        recommendations.push('血糖管理：控制精制碳水化合物摄入，选择低GI食物，保持规律进餐，避免血糖剧烈波动。');
    }
    if ((riskScores.amino || 0) >= 50) {
        recommendations.push('蛋白质摄入优化：确保优质蛋白摄入，如瘦肉、鱼类、豆制品等，避免蛋白质摄入不足。');
    }
    if ((riskScores.inflammation || 0) >= 50) {
        recommendations.push('抗炎饮食：增加富含抗氧化物质的食物（深色蔬菜、浆果、坚果），减少促炎食物摄入。');
    }
    if ((riskScores.energy || 0) >= 50) {
        recommendations.push('能量平衡：建议每周进行至少150分钟中等强度有氧运动，结合力量训练改善代谢。');
    }
    if ((riskScores.oxidative || 0) >= 50) {
        recommendations.push('抗氧化管理：增加维生素C、E和硒的摄入，保持充足睡眠，减少熬夜和过度劳累。');
    }

    if (recommendations.length === 0) {
        recommendations.push('整体代谢状态良好，建议保持健康的生活方式，定期复查监测各项指标。');
    }

    recommendations.forEach(function(rec, idx) {
        doc.fontSize(10).fillColor(COLOR.dark).text((idx + 1) + '. ' + rec, {
            indent: 10,
            align: 'left',
            lineGap: 3
        });
        doc.moveDown(0.2);
    });
}

function drawFooter(doc) {
    doc.moveDown(1);
    var footerY = doc.page.height - doc.page.margins.bottom - 30;
    doc.moveTo(doc.page.margins.left, footerY)
       .lineTo(doc.page.width - doc.page.margins.right, footerY)
       .lineWidth(1).strokeColor(COLOR.lightGray).stroke();

    doc.fontSize(8).fillColor(COLOR.gray);
    doc.text('MetaScan 智能健康管理平台 | 本报告仅供参考，不作为诊断依据，请咨询专业医生', {
        align: 'center'
    });
    doc.text('报告生成时间: ' + new Date().toLocaleString('zh-CN'), {
        align: 'center'
    });
}

export function generatePDFReport(reportData) {
    return new Promise(function(resolve, reject) {
        try {
            log('info', '开始生成PDF报告');
            var doc = new PDFDocument({
                size: 'A4',
                margins: { top: 40, bottom: 60, left: 45, right: 45 },
                bufferPages: true
            });

            if (hasCustomFont) {
                var fontPath = path.join(FONT_REGULAR, 'NotoSansSC-Regular.ttf');
                doc.registerFont('CustomFont', fontPath);
                doc.font('CustomFont');
                log('info', '已加载中文字体');
            }

            var buffers = [];
            doc.on('data', function(chunk) { buffers.push(chunk); });
            doc.on('end', function() {
                var pdfBuffer = Buffer.concat(buffers);
                var sizeKB = (pdfBuffer.length / 1024).toFixed(1);
                log('info', 'PDF生成成功', { sizeKB: sizeKB });
                resolve(pdfBuffer);
            });
            doc.on('error', function(err) {
                log('error', 'PDF生成失败', { error: err.message });
                reject(err);
            });

            var title = '报告日期: ' + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
            drawHeader(doc, title);

            drawSectionTitle(doc, '一、总体风险评估');
            drawRiskCard(doc, reportData.overallRisk || 0);

            drawSectionTitle(doc, '二、各维度风险评分');
            drawRiskTable(doc, reportData.riskScores);

            drawSectionTitle(doc, '三、代谢指标数据');
            drawMetaboliteTable(doc, reportData);

            drawSectionTitle(doc, '四、健康建议');
            drawRecommendations(doc, reportData);

            drawFooter(doc);

            doc.end();
        } catch (err) {
            log('error', 'PDF生成异常', { error: err.message });
            reject(err);
        }
    });
}

export function generateWordReport(reportData) {
    return new Promise(function(resolve, reject) {
        try {
            log('info', '开始生成Word报告');
            var risk = getRiskLevel(reportData.overallRisk || 0);
            var wordHTML = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
            wordHTML += '<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
            wordHTML += '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->';
            wordHTML += '<style>@page { size: A4; margin: 2cm; }';
            wordHTML += 'body { font-family: "Microsoft YaHei", "SimSun", sans-serif; color: #1e293b; line-height: 1.8; }';
            wordHTML += 'h1 { color: #1a2980; font-size: 24pt; text-align: center; border-bottom: 3px solid #1a2980; padding-bottom: 10pt; margin-bottom: 20pt; }';
            wordHTML += 'h2 { color: #1a2980; font-size: 16pt; border-bottom: 2px solid #e0e6ed; padding-bottom: 6pt; margin-top: 20pt; }';
            wordHTML += 'h3 { color: #1a2980; font-size: 13pt; margin-top: 16pt; }';
            wordHTML += 'table { border-collapse: collapse; width: 100%; margin: 12pt 0; }';
            wordHTML += 'th, td { border: 1px solid #cbd5e1; padding: 8pt 10pt; text-align: left; }';
            wordHTML += 'th { background-color: #f0f4ff; font-weight: bold; }';
            wordHTML += '.risk-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12pt 16pt; border-radius: 4pt; margin-bottom: 8pt; text-align: center; }';
            wordHTML += '.footer { text-align: center; border-top: 2px solid #e0e6ed; margin-top: 30pt; padding-top: 12pt; font-size: 9pt; color: #94a3b8; }';
            wordHTML += '</style></head><body>';

            wordHTML += '<h1>MetaScan 代谢健康报告</h1>';
            wordHTML += '<p style="text-align:center; color:#64748b;">报告日期: ' + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
            wordHTML += '<p style="text-align:center; color:#64748b;">检测日期: ' + (reportData.date || '--') + '</p>';

            wordHTML += '<h2>一、总体风险评估</h2>';
            wordHTML += '<div class="risk-card">';
            wordHTML += '<p style="font-size:36pt; font-weight:bold; color:' + risk.color + '; margin:8pt 0;">' + (reportData.overallRisk || 0).toFixed(1) + '</p>';
            wordHTML += '<p style="font-size:16pt; font-weight:bold; color:' + risk.color + ';">' + risk.level + '</p>';
            wordHTML += '</div>';

            wordHTML += '<h2>二、各维度风险评分</h2>';
            wordHTML += '<table><tr><th>维度</th><th>评分</th><th>风险等级</th></tr>';
            if (reportData.riskScores) {
                Object.entries(reportData.riskScores).forEach(function(entry) {
                    var key = entry[0], value = entry[1];
                    var r = getRiskLevel(value);
                    wordHTML += '<tr><td>' + (DIM_NAMES[key] || key) + '</td>';
                    wordHTML += '<td style="font-weight:bold;color:' + r.color + ';">' + value.toFixed(0) + '</td>';
                    wordHTML += '<td style="color:' + r.color + ';">' + r.level + '</td></tr>';
                });
            }
            wordHTML += '</table>';

            wordHTML += '<h2>三、代谢指标数据</h2>';
            wordHTML += '<table><tr><th>指标名称</th><th>检测值</th><th>单位</th><th>参考范围</th><th>状态</th></tr>';
            METABOLITES.forEach(function(m) {
                var val = reportData[m.id];
                var status = getMetaboliteStatus(val, m.normalRange);
                wordHTML += '<tr><td>' + m.name + '</td>';
                wordHTML += '<td>' + (val !== undefined && val !== null ? Number(val).toFixed(2) : '-') + '</td>';
                wordHTML += '<td>' + m.unit + '</td>';
                wordHTML += '<td>' + m.normalRange + '</td>';
                wordHTML += '<td style="color:' + status.color + ';font-weight:bold;">' + status.status + '</td></tr>';
            });
            wordHTML += '</table>';

            wordHTML += '<h2>四、健康建议</h2><ol>';
            wordHTML += '<li><strong>饮食管理：</strong>建议保持均衡饮食，减少高脂肪、高糖食物的摄入，增加新鲜蔬菜和水果的比例。</li>';
            wordHTML += '<li><strong>运动锻炼：</strong>建议每周进行至少150分钟的中等强度有氧运动，如快走、游泳等。</li>';
            wordHTML += '<li><strong>作息规律：</strong>保持充足的睡眠，每天7-8小时，避免熬夜，建立规律的作息习惯。</li>';
            wordHTML += '<li><strong>压力管理：</strong>学会合理释放压力，可通过冥想、瑜伽、听音乐等方式缓解压力。</li>';
            wordHTML += '<li><strong>定期复查：</strong>建议定期进行健康检查，及时了解身体状况变化。</li>';
            wordHTML += '</ol>';

            wordHTML += '<div class="footer"><p>MetaScan 智能健康管理平台</p><p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p>';
            wordHTML += '<p>报告生成时间: ' + new Date().toLocaleString('zh-CN') + '</p></div>';
            wordHTML += '</body></html>';

            var wordBuffer = Buffer.from(wordHTML, 'utf-8');
            var sizeKB = (wordBuffer.length / 1024).toFixed(1);
            log('info', 'Word报告生成成功', { sizeKB: sizeKB });
            resolve(wordBuffer);
        } catch (err) {
            log('error', 'Word报告生成失败', { error: err.message });
            reject(err);
        }
    });
}

export function generateExcelReport(reportData) {
    return new Promise(function(resolve, reject) {
        try {
            log('info', '开始生成Excel报告');
            var workbook = new ExcelJS.Workbook();
            workbook.creator = 'MetaScan 智能健康管理平台';
            workbook.created = new Date();

            var risk = getRiskLevel(reportData.overallRisk || 0);

            var summarySheet = workbook.addWorksheet('总体评估');
            summarySheet.columns = [
                { header: '项目', key: 'item', width: 20 },
                { header: '内容', key: 'content', width: 40 }
            ];
            summarySheet.getRow(1).font = { bold: true, color: { argb: 'FF1A2980' } };
            summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
            summarySheet.addRow({ item: '报告日期', content: new Date().toLocaleDateString('zh-CN') });
            summarySheet.addRow({ item: '检测日期', content: reportData.date || '--' });
            summarySheet.addRow({ item: '总体评分', content: (reportData.overallRisk || 0).toFixed(1) });
            summarySheet.addRow({ item: '风险等级', content: risk.level });
            var riskRow = summarySheet.getRow(4);
            riskRow.getCell(2).font = { bold: true, size: 16, color: { argb: risk.color.replace('#', 'FF') } };

            var dimSheet = workbook.addWorksheet('维度风险评分');
            dimSheet.columns = [
                { header: '维度', key: 'dim', width: 18 },
                { header: '评分', key: 'score', width: 12 },
                { header: '风险等级', key: 'level', width: 14 }
            ];
            var headerRow = dimSheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FF1A2980' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
            headerRow.alignment = { horizontal: 'center' };

            if (reportData.riskScores) {
                Object.entries(reportData.riskScores).forEach(function(entry) {
                    var key = entry[0], value = entry[1];
                    var r = getRiskLevel(value);
                    var row = dimSheet.addRow({ dim: (DIM_NAMES[key] || key), score: value.toFixed(0), level: r.level });
                    row.getCell(2).font = { bold: true, color: { argb: r.color.replace('#', 'FF') } };
                    row.getCell(3).font = { color: { argb: r.color.replace('#', 'FF') } };
                });
            }

            var metaSheet = workbook.addWorksheet('代谢指标数据');
            metaSheet.columns = [
                { header: '指标名称', key: 'name', width: 24 },
                { header: '检测值', key: 'value', width: 14 },
                { header: '单位', key: 'unit', width: 12 },
                { header: '参考范围', key: 'range', width: 16 },
                { header: '状态', key: 'status', width: 12 }
            ];
            var metaHeaderRow = metaSheet.getRow(1);
            metaHeaderRow.font = { bold: true, color: { argb: 'FF1A2980' } };
            metaHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
            metaHeaderRow.alignment = { horizontal: 'center' };

            METABOLITES.forEach(function(m, idx) {
                var val = reportData[m.id];
                var status = getMetaboliteStatus(val, m.normalRange);
                var row = metaSheet.addRow({
                    name: m.name,
                    value: val !== undefined && val !== null ? Number(val).toFixed(2) : '-',
                    unit: m.unit,
                    range: m.normalRange,
                    status: status.status
                });
                if (idx % 2 === 1) {
                    row.eachCell(function(cell) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    });
                }
                var statusCell = row.getCell(5);
                statusCell.font = { bold: true, color: { argb: status.color.replace('#', 'FF') } };
            });

            var recSheet = workbook.addWorksheet('健康建议');
            recSheet.columns = [
                { header: '序号', key: 'no', width: 8 },
                { header: '建议内容', key: 'content', width: 70 }
            ];
            var recHeaderRow = recSheet.getRow(1);
            recHeaderRow.font = { bold: true, color: { argb: 'FF1A2980' } };
            recHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };

            var recs = [
                '饮食管理：建议保持均衡饮食，减少高脂肪、高糖食物的摄入，增加新鲜蔬菜和水果的比例。',
                '运动锻炼：建议每周进行至少150分钟的中等强度有氧运动，如快走、游泳等。',
                '作息规律：保持充足的睡眠，每天7-8小时，避免熬夜，建立规律的作息习惯。',
                '压力管理：学会合理释放压力，可通过冥想、瑜伽、听音乐等方式缓解压力。',
                '定期复查：建议定期进行健康检查，及时了解身体状况变化。'
            ];
            recs.forEach(function(r, idx) { recSheet.addRow({ no: idx + 1, content: r }); });

            workbook.xlsx.writeBuffer().then(function(buffer) {
                var sizeKB = (buffer.length / 1024).toFixed(1);
                log('info', 'Excel报告生成成功', { sizeKB: sizeKB });
                resolve(buffer);
            }).catch(function(err) {
                log('error', 'Excel写入失败', { error: err.message });
                reject(err);
            });

        } catch (err) {
            log('error', 'Excel报告生成失败', { error: err.message });
            reject(err);
        }
    });
}

export { log, EXPORTS_DIR };