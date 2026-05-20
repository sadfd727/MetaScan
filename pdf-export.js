import { currentUser, currentResult } from './auth.js';
import { showNotification } from './notifications.js';
import {
    showShareModal,
    closeShareModal,
    copyShareLink,
    copySharePassword,
    showSharePasswordModal,
    verifySharePwd,
    openSharedReport,
    generateReportHTML,
    generateComparisonHTML,
    generateRiskCard,
    generateDetailedAnalysis,
    generateHealthRecommendations,
    generateChangeSummary,
    generateComparisonDimension
} from './reports.js';

import { safeParseJSON, safeGetItem, safeSetItem } from './storage.js';

var EXPORT_API_BASE = 'http://localhost:3001/api/export';

var METABOLITES_KEYS = [
    'GLU', 'TC', 'TG', 'HDL_C', 'LDL_C', 'UA', 'ALT', 'AST',
    'CREA', 'UREA', 'HS_CRP', 'HCY', 'LAC', 'KET'
];

function collectReportData(dataOverride) {
    var allData = safeGetItem('metascanData_' + currentUser.username, []);
    var data = dataOverride;

    if (!data || data.overallRisk === undefined) {
        data = window._currentReportData;
    }
    if (!data || data.overallRisk === undefined) {
        data = allData.length > 0 ? allData[allData.length - 1] : null;
    }
    if (!data) return null;

    var reportData = {
        date: data.date || '',
        overallRisk: data.overallRisk || 0,
        riskScores: data.riskScores || {},
        patientName: currentUser.username || ''
    };

    var sourceData = data.data || data;

    METABOLITES_KEYS.forEach(function(key) {
        if (sourceData[key] !== undefined && sourceData[key] !== null) {
            reportData[key] = sourceData[key];
        }
    });

    return reportData;
}

function showExportProgress() {
    var overlay = document.createElement('div');
    overlay.id = 'exportProgressOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:white;padding:30px 40px;border-radius:12px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.2);"><div style="width:40px;height:40px;border:3px solid #e0e6ed;border-top-color:#1a2980;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 15px;"></div><div style="color:#333;font-size:1rem;">正在生成文件...</div></div>';
    document.body.appendChild(overlay);

    var style = document.createElement('style');
    style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
}

function hideExportProgress() {
    var overlay = document.getElementById('exportProgressOverlay');
    if (overlay) overlay.remove();
}

function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
}

function exportViaAPI(reportData, format) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', EXPORT_API_BASE + '/' + format, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.responseType = 'blob';
        xhr.onload = function() {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                try {
                    var reader = new FileReader();
                    reader.onload = function() {
                        var err;
                        try { err = JSON.parse(reader.result); } catch (e) { err = { error: '导出失败 (HTTP ' + xhr.status + ')' }; }
                        reject(new Error(err.error || '导出失败'));
                    };
                    reader.readAsText(xhr.response);
                } catch (e) {
                    reject(new Error('导出失败 (HTTP ' + xhr.status + ')'));
                }
            }
        };
        xhr.onerror = function() {
            reject(new Error('网络错误，请确认服务器已启动'));
        };
        xhr.send(JSON.stringify(reportData));
    });
}

export function exportHealthReport() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var patientData = safeGetItem('metascanData_' + currentUser.username, []);
    if (patientData.length === 0) {
        showNotification('暂无检测数据，无法导出', 'warning');
        return;
    }

    var reportData = collectReportData();
    if (!reportData) {
        showNotification('无法获取报告数据', 'error');
        return;
    }

    exportReportPDF(reportData);
}

export function exportReportPDF(reportData, filename) {
    if (!reportData) {
        reportData = collectReportData();
        if (!reportData) { showNotification('无法获取报告数据', 'error'); return; }
    }

    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成PDF', '向量格式，支持文字选择');

    showExportProgress();
    exportViaAPI(reportData, 'pdf').then(function(blob) {
        hideExportProgress();
        var fname = filename || ('MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
        downloadBlob(blob, fname + '.pdf');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('PDF导出成功', '向量格式，文字可选中复制');
    }).catch(function(err) {
        hideExportProgress();
        console.error('PDF导出失败:', err.message);
        fallbackExportPDF(reportData);
    });
}

function fallbackExportPDF(reportData) {
    if (typeof html2canvas !== 'undefined' && typeof window.jspdf !== 'undefined') {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('使用备用方式导出', '图片格式PDF');
        var reportContainer = document.getElementById('reportsContent');
        if (reportContainer) {
            exportElementToPDFLegacy(reportContainer, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
        } else {
            var html = generateReportHTML(reportData);
            exportHTMLToPDFLegacy(html, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
        }
    } else {
        showNotification('PDF导出失败，请确认服务器已启动（localhost:3001）', 'error');
    }
}

export function exportReportAsWord() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var allData = safeGetItem('metascanData_' + currentUser.username, []);
    if (allData.length === 0) {
        showNotification('暂无检测数据，无法导出', 'warning');
        return;
    }

    var reportData = collectReportData();
    if (!reportData) {
        showNotification('无法获取报告数据', 'error');
        return;
    }

    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成Word文档', '请稍候...');

    showExportProgress();
    exportViaAPI(reportData, 'word').then(function(blob) {
        hideExportProgress();
        downloadBlob(blob, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0] + '.doc');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('Word报告导出成功', '可用Microsoft Word打开编辑');
    }).catch(function(err) {
        hideExportProgress();
        console.error('Word导出失败:', err.message);
        exportReportAsWordFallback(reportData);
    });
}

function exportReportAsWordFallback(reportData) {
    var data = reportData;
    var riskLevel = data.overallRisk < 30 ? '低风险' : data.overallRisk < 60 ? '中等风险' : '高风险';
    var riskColor = data.overallRisk < 30 ? '#00b894' : data.overallRisk < 60 ? '#f39c12' : '#e74c3c';
    var dimNames = { lipid: '脂质代谢', glucose: '糖代谢', amino: '氨基酸代谢', inflammation: '炎症状态', energy: '能量代谢', oxidative: '氧化应激' };

    var wordHTML = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
    wordHTML += '<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
    wordHTML += '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->';
    wordHTML += '<style>@page { size: A4; margin: 2cm; } body { font-family: "Microsoft YaHei", sans-serif; color: #1e293b; line-height: 1.8; }';
    wordHTML += 'h1 { color: #1a2980; font-size: 24pt; text-align: center; border-bottom: 3px solid #1a2980; padding-bottom: 10pt; margin-bottom: 20pt; }';
    wordHTML += 'h2 { color: #1a2980; font-size: 16pt; border-bottom: 2px solid #e0e6ed; padding-bottom: 6pt; margin-top: 20pt; }';
    wordHTML += 'table { border-collapse: collapse; width: 100%; margin: 12pt 0; }';
    wordHTML += 'th, td { border: 1px solid #cbd5e1; padding: 8pt 10px; text-align: left; }';
    wordHTML += 'th { background-color: #f0f4ff; font-weight: bold; }';
    wordHTML += '.risk-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12pt 16pt; border-radius: 4pt; margin-bottom: 8pt; text-align: center; }';
    wordHTML += '.footer { text-align: center; border-top: 2px solid #e0e6ed; margin-top: 30pt; padding-top: 12pt; font-size: 9pt; color: #94a3b8; }';
    wordHTML += '</style></head><body>';

    wordHTML += '<h1>MetaScan 代谢健康报告</h1>';
    wordHTML += '<p style="text-align:center; color:#64748b;">报告日期: ' + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    wordHTML += '<p style="text-align:center; color:#64748b;">检测日期: ' + (data.date || '--') + '</p>';

    wordHTML += '<h2>一、总体风险评估</h2>';
    wordHTML += '<div class="risk-card">';
    wordHTML += '<p style="font-size:36pt; font-weight:bold; color:' + riskColor + '; margin:8pt 0;">' + data.overallRisk.toFixed(1) + '</p>';
    wordHTML += '<p style="font-size:16pt; font-weight:bold; color:' + riskColor + ';">' + riskLevel + '</p></div>';

    wordHTML += '<h2>二、各维度风险评分</h2>';
    wordHTML += '<table><tr><th>维度</th><th>评分</th><th>风险等级</th></tr>';
    if (data.riskScores) {
        Object.entries(data.riskScores).forEach(function(entry) {
            var key = entry[0], value = entry[1];
            var lvl = value < 30 ? '良好' : value < 60 ? '留意' : '关注';
            var c = value < 30 ? '#10b981' : value < 60 ? '#f59e0b' : '#ef4444';
            wordHTML += '<tr><td>' + (dimNames[key] || key) + '</td><td style="font-weight:bold;color:' + c + ';">' + value.toFixed(0) + '</td><td style="color:' + c + ';">' + lvl + '</td></tr>';
        });
    }
    wordHTML += '</table>';

    wordHTML += '<h2>三、健康建议</h2><ol>';
    wordHTML += '<li><strong>饮食管理：</strong>建议保持均衡饮食，减少高脂肪、高糖食物的摄入。</li>';
    wordHTML += '<li><strong>运动锻炼：</strong>建议每周进行至少150分钟的中等强度有氧运动。</li>';
    wordHTML += '<li><strong>作息规律：</strong>保持充足的睡眠，每天7-8小时，避免熬夜。</li>';
    wordHTML += '<li><strong>定期复查：</strong>建议定期进行健康检查，及时了解身体状况变化。</li>';
    wordHTML += '</ol>';

    wordHTML += '<div class="footer"><p>MetaScan 智能健康管理平台</p><p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p></div>';
    wordHTML += '</body></html>';

    var blob = new Blob([wordHTML], { type: 'application/msword;charset=utf-8' });
    downloadBlob(blob, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0] + '.doc');

    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('Word报告导出成功', '可下载后用Microsoft Word打开编辑');
}

export function exportReportAsExcel() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var allData = safeGetItem('metascanData_' + currentUser.username, []);
    if (allData.length === 0) {
        showNotification('暂无检测数据，无法导出', 'warning');
        return;
    }

    var reportData = collectReportData();
    if (!reportData) {
        showNotification('无法获取报告数据', 'error');
        return;
    }

    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成Excel表格', '结构化数据格式');

    showExportProgress();
    exportViaAPI(reportData, 'excel').then(function(blob) {
        hideExportProgress();
        downloadBlob(blob, 'MetaScan代谢数据_' + new Date().toISOString().split('T')[0] + '.xlsx');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('Excel导出成功', '可用Excel打开编辑分析');
    }).catch(function(err) {
        hideExportProgress();
        console.error('Excel导出失败:', err.message);
        showNotification('Excel导出失败，请确认服务器已启动（localhost:3001）', 'error');
    });
}

export function showExportMenu() {
    var existing = document.getElementById('globalExportMenu');
    if (existing) { existing.remove(); return; }

    var hasData = false;
    if (currentUser) {
        var d = safeGetItem('metascanData_' + currentUser.username, []);
        hasData = d.length > 0;
    }

    var menu = document.createElement('div');
    menu.id = 'globalExportMenu';
    menu.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.2);z-index:99999;width:380px;max-width:90vw;overflow:hidden;';

    var headerBg = 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)';

    menu.innerHTML = '<div style="background:' + headerBg + ';padding:20px 24px;color:white;">' +
        '<div style="font-size:1.2rem;font-weight:700;">📤 导出报告</div>' +
        '<div style="font-size:0.85rem;opacity:0.85;margin-top:4px;">选择导出格式</div>' +
        '</div>' +
        '<div style="padding:16px 24px 24px;">' +
        (!hasData ? '<div style="text-align:center;padding:20px;color:#999;">暂无检测数据，请先上传检测数据</div>' : '') +
        '<div onclick="exportReportPDF(); closeExportMenu();" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;cursor:pointer;margin-bottom:8px;background:#f0f4ff;transition:all 0.2s;" onmouseover="this.style.background=\'#e0e8f0\'" onmouseout="this.style.background=\'#f0f4ff\'">' +
        '<div style="width:44px;height:44px;background:linear-gradient(135deg,#1a2980,#26d0ce);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">📄</div>' +
        '<div style="flex:1;"><div style="font-weight:600;color:#1a2980;font-size:0.95rem;">PDF 文档 (.pdf)</div><div style="font-size:0.8rem;color:#64748b;margin-top:2px;">向量格式，文字可复制搜索，体积小</div></div>' +
        '<div style="color:#1a2980;font-size:1.2rem;">→</div></div>' +
        '<div onclick="exportReportAsWord(); closeExportMenu();" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;cursor:pointer;margin-bottom:8px;background:#f8f9ff;transition:all 0.2s;" onmouseover="this.style.background=\'#eef0ff\'" onmouseout="this.style.background=\'#f8f9ff\'">' +
        '<div style="width:44px;height:44px;background:linear-gradient(135deg,#2b579a,#2171cd);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">📝</div>' +
        '<div style="flex:1;"><div style="font-weight:600;color:#2b579a;font-size:0.95rem;">Word 文档 (.doc)</div><div style="font-size:0.8rem;color:#64748b;margin-top:2px;">Microsoft Word兼容，可直接编辑</div></div>' +
        '<div style="color:#2b579a;font-size:1.2rem;">→</div></div>' +
        '<div onclick="exportReportAsExcel(); closeExportMenu();" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;cursor:pointer;margin-bottom:8px;background:#f0fdf4;transition:all 0.2s;" onmouseover="this.style.background=\'#dcfce7\'" onmouseout="this.style.background=\'#f0fdf4\'">' +
        '<div style="width:44px;height:44px;background:linear-gradient(135deg,#217346,#33a854);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">📊</div>' +
        '<div style="flex:1;"><div style="font-weight:600;color:#217346;font-size:0.95rem;">Excel 表格 (.xlsx)</div><div style="font-size:0.8rem;color:#64748b;margin-top:2px;">结构化数据，多Sheet，便于分析</div></div>' +
        '<div style="color:#217346;font-size:1.2rem;">→</div></div>' +
        '<button onclick="closeExportMenu()" style="width:100%;padding:10px;border:1px solid #e0e6ed;border-radius:8px;background:white;color:#666;cursor:pointer;font-size:0.9rem;margin-top:4px;">取消</button>' +
        '</div>';

    document.body.appendChild(menu);

    var backdrop = document.createElement('div');
    backdrop.id = 'exportMenuBackdrop';
    backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.2);z-index:99998;';
    backdrop.onclick = function() { closeExportMenu(); };
    document.body.appendChild(backdrop);
}

export function closeExportMenu() {
    var menu = document.getElementById('globalExportMenu');
    var backdrop = document.getElementById('exportMenuBackdrop');
    if (menu) menu.remove();
    if (backdrop) backdrop.remove();
}

export function saveReportAsPDF() {
    var reportData = collectReportData();
    if (!reportData) { showNotification('未找到报告数据', 'warning'); return; }
    exportReportPDF(reportData, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
}

export function exportComparisonReport() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var patientData = safeGetItem('metascanData_' + currentUser.username, []);
    if (patientData.length < 2) {
        showNotification('至少需要两次检测数据才能进行对比', 'warning');
        return;
    }

    var latestData = patientData[patientData.length - 1];
    var reportData = collectReportData(latestData);
    if (!reportData) { showNotification('无法获取对比数据', 'error'); return; }
    exportReportPDF(reportData, 'MetaScan历史对比_' + new Date().toISOString().split('T')[0]);
}

export function scrollToSection(section) {
    var el = document.getElementById('report-section-' + section);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var navLinks = document.querySelectorAll('#reportNav a');
        navLinks.forEach(function(a) {
            a.style.background = '#f1f5f9';
            a.style.color = '#475569';
        });
        var targetLink = document.querySelector('#reportNav a[href*="' + section + '"]');
        if (targetLink) {
            targetLink.style.background = 'linear-gradient(135deg, #1a2980, #26d0ce)';
            targetLink.style.color = '#ffffff';
        }
    }
}

export function exportElementToPDF(element, filename) {
    var reportData = collectReportData();
    if (!reportData) {
        fallbackExportElementToPDF(element, filename);
        return;
    }
    exportReportPDF(reportData, filename);
}

export function exportHTMLToPDF(htmlContent, filename) {
    var reportData = collectReportData();
    if (!reportData) {
        fallbackExportHTMLToPDF(htmlContent, filename);
        return;
    }
    exportReportPDF(reportData, filename);
}

export function exportElementToPDFLegacy(element, filename) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        showNotification('PDF导出组件未加载，请刷新页面后重试', 'error');
        return;
    }
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成PDF', '请稍候...');

    var clone = element.cloneNode(true);
    var buttons = clone.querySelectorAll('button');
    buttons.forEach(function(b) { b.style.display = 'none'; });

    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = '800px';
    clone.style.zIndex = '-9999';
    clone.style.background = '#ffffff';
    clone.style.display = 'block';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    document.body.appendChild(clone);

    html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(function(canvas) {
        document.body.removeChild(clone);

        var pdfModule = window.jspdf;
        var jsPDF = pdfModule.jsPDF || pdfModule.default || pdfModule;
        var pdf = new jsPDF('p', 'mm', 'a4');

        var pageWidth = 210;
        var pageHeight = 297;
        var imgWidth = pageWidth - 20;
        var imgHeight = (canvas.height * imgWidth) / canvas.width;

        var totalPages = Math.ceil(imgHeight / (pageHeight - 20));
        var margin = 10;

        for (var page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();
            var srcY = page * (canvas.height / totalPages);
            var srcHeight = canvas.height / totalPages;
            var pageCanvas = document.createElement('canvas');
            var scale = (imgWidth * 2) / canvas.width;
            pageCanvas.width = imgWidth * 2;
            pageCanvas.height = srcHeight * scale;
            var ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, pageCanvas.width, pageCanvas.height);
            var pageImgData = pageCanvas.toDataURL('image/png');
            var pageImgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;
            pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(pageImgHeight, pageHeight - margin * 2));
        }

        pdf.save(filename + '.pdf');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('PDF导出成功', filename + '.pdf');
    }).catch(function(error) {
        console.error('PDF导出失败:', error);
        if (document.body.contains(clone)) document.body.removeChild(clone);
        showNotification('PDF导出失败，请重试', 'error');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('PDF导出失败', '请重试');
    });
}

export function exportHTMLToPDFLegacy(htmlContent, filename) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        showNotification('PDF导出组件未加载，请刷新页面后重试', 'error');
        return;
    }
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成PDF', '请稍候...');

    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '0';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.zIndex = '-9999';
    tempDiv.style.background = '#ffffff';
    tempDiv.style.fontFamily = "'Microsoft YaHei', Arial, sans-serif";
    tempDiv.style.color = '#1e293b';
    tempDiv.style.padding = '20px';
    document.body.appendChild(tempDiv);

    html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(function(canvas) {
        document.body.removeChild(tempDiv);
        var pdfModule = window.jspdf;
        var jsPDF = pdfModule.jsPDF || pdfModule.default || pdfModule;
        var pdf = new jsPDF('p', 'mm', 'a4');
        var pageWidth = 210;
        var pageHeight = 297;
        var imgWidth = pageWidth - 20;
        var imgHeight = (canvas.height * imgWidth) / canvas.width;
        var totalPages = Math.ceil(imgHeight / (pageHeight - 20));
        var margin = 10;
        for (var page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();
            var srcY = page * (canvas.height / totalPages);
            var srcHeight = canvas.height / totalPages;
            var pageCanvas = document.createElement('canvas');
            var scale = (imgWidth * 2) / canvas.width;
            pageCanvas.width = imgWidth * 2;
            pageCanvas.height = srcHeight * scale;
            var ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, pageCanvas.width, pageCanvas.height);
            var pageImgData = pageCanvas.toDataURL('image/png');
            var pageImgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;
            pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(pageImgHeight, pageHeight - margin * 2));
        }
        pdf.save(filename + '.pdf');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('PDF导出成功', filename + '.pdf');
    }).catch(function(error) {
        console.error('PDF导出失败:', error);
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
        showNotification('PDF导出失败，请重试', 'error');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('PDF导出失败', '请重试');
    });
}

function fallbackExportElementToPDF(element, filename) {
    exportElementToPDFLegacy(element, filename);
}

function fallbackExportHTMLToPDF(htmlContent, filename) {
    exportHTMLToPDFLegacy(htmlContent, filename);
}

export function generateShareLink() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var allData = safeGetItem('metascanData_' + currentUser.username, []);
    if (allData.length === 0) {
        showNotification('暂无检测数据，无法分享', 'warning');
        return;
    }

    var data = window._currentReportData;
    if (!data || data.overallRisk === undefined) {
        data = allData[allData.length - 1];
    }

    var shareId = generateShareId();
    var sharePassword = generateSharePassword(6);

    var shareEntry = {
        id: shareId,
        password: sharePassword,
        reportData: data,
        username: currentUser.username,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        viewCount: 0,
        maxViews: 10
    };

    var allShares = safeGetItem('metascanShares_' + currentUser.username, []);
    allShares = allShares.filter(function(s) { return Date.now() < s.expiresAt; });
    allShares.push(shareEntry);
    safeSetItem('metascanShares_' + currentUser.username, allShares);

    var shareLink = window.location.origin + window.location.pathname + '?share=' + shareId + '&pwd=' + sharePassword;

    showShareModal(shareLink, sharePassword, shareId);
}

export function generateShareId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    var array = new Uint8Array(8);
    crypto.getRandomValues(array);
    for (var i = 0; i < 8; i++) {
        id += chars.charAt(array[i] % chars.length);
    }
    return id;
}

export function generateSharePassword(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var pwd = '';
    var array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (var i = 0; i < length; i++) {
        pwd += chars.charAt(array[i] % chars.length);
    }
    return pwd;
}