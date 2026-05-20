import { currentUser } from './auth.js';
import { showNotification } from './notifications.js';
import { metaboliteData, categoryNames } from './config.js';

let wizardStep = 1;

export function initWizard() {
    if (!currentUser) {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('未登录', '请先登录后再使用数据录入功能');
        return;
    }

    var step2El = document.getElementById('wizardInputsStep2');
    if (!step2El) {
        console.warn('initWizard: wizardInputsStep2 not found, DOM may not be ready');
        return;
    }

    wizardStep = 1;
    setWizardDate('today');
    renderWizardInputs();
    renderFingerprintLibrary();
    checkDraft();
    goToWizardStep(1);
}

export function renderWizardInputs() {
    var step2El = document.getElementById('wizardInputsStep2');
    if (!step2El) return;

    var html = '';
    html += '<div class="wizard-conc-card">';
    html += '<h3 style="margin:0 0 4px 0;color:#1a2980;font-size:1.1rem;">🧬 代谢物浓度直接录入</h3>';
    html += '<p style="margin:0 0 4px 0;color:#64748b;font-size:0.85rem;">全部26种代谢物已列出，输入浓度后系统将自动评估是否在参考范围内</p>';
    html += '<div style="display:flex;gap:8px;margin-bottom:3px;flex-wrap:wrap;font-size:0.75rem;color:#64748b;">';
    html += '<span>🟢 正常</span><span>🔵 偏低</span><span>🔴 偏高</span><span>⚪ 未填</span>';
    html += '</div>';

    html += '<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">';
    html += '<button onclick="fillSampleConcentrationData()" style="padding:10px 20px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;font-weight:700;cursor:pointer;font-size:0.9rem;">📊 加载示例数据</button>';
    html += '<button onclick="clearConcentrationData()" style="padding:10px 20px;border-radius:12px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;font-weight:700;cursor:pointer;font-size:0.9rem;">🗑️ 清空所有</button>';
    html += '</div>';

    html += '<div id="concTableContainer" style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0;">';
    html += '<table id="concEntryTable" style="width:100%;border-collapse:collapse;font-size:0.85rem;">';
    html += '<thead><tr style="background:#f8fafc;">';
    html += '<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;min-width:180px;">代谢物</th>';
    html += '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid #e2e8f0;width:120px;">浓度值</th>';
    html += '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid #e2e8f0;width:80px;">单位</th>';
    html += '<th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e2e8f0;">参考范围</th>';
    html += '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid #e2e8f0;width:100px;">状态</th>';
    html += '</tr></thead>';
    html += '<tbody id="concEntryBody">';
    html += '</tbody>';
    html += '</table>';
    html += '</div>';

    html += '<div id="concValidationResult" style="margin-top:16px;"></div>';
    html += '</div>';

    step2El.innerHTML = html;

    renderAllMetaboliteRows();
}

function renderAllMetaboliteRows() {
    var body = document.getElementById('concEntryBody');
    if (!body) return;

    var categoryColors = {
        amino_acid: '#3b82f6',
        carbohydrate: '#f59e0b',
        organic_acid: '#10b981',
        sulfur: '#8b5cf6',
        nitrogen: '#ef4444',
        xenobiotic: '#f97316'
    };

    var groups = {};
    metaboliteData.forEach(function(m) {
        var cat = m.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(m);
    });

    var catOrder = ['amino_acid', 'organic_acid', 'carbohydrate', 'sulfur', 'nitrogen', 'xenobiotic'];

    var html = '';
    catOrder.forEach(function(cat) {
        var items = groups[cat];
        if (!items) return;
        var catName = categoryNames[cat] || cat;
        var color = categoryColors[cat] || '#94a3b8';

        html += '<tr class="conc-cat-header" data-category="' + cat + '" style="cursor:pointer;background:#f8fafc;">';
        html += '<td colspan="5" style="padding:10px 12px;font-weight:700;font-size:0.88rem;border-bottom:1px solid #e2e8f0;">';
        html += '<span style="display:inline-block;width:20px;text-align:center;margin-right:8px;" class="cat-toggle">▼</span>';
        html += '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:0.75rem;background:' + color + '15;color:' + color + ';border:1px solid ' + color + '30;">' + catName + '</span>';
        html += '<span style="margin-left:8px;color:#94a3b8;font-weight:400;">' + items.length + '种代谢物</span>';
        html += '</td>';
        html += '</tr>';

        items.forEach(function(m, idx) {
            var refText = '--';
            if (m.refMin !== undefined && m.refMax !== undefined) {
                refText = m.refMin + ' - ' + m.refMax + ' ' + (m.unit || 'μmol/L');
            }
            var rowClass = (idx % 2 === 0) ? '' : ' style="background:#fafbfc;"';

            html += '<tr class="conc-row" data-metabolite-id="' + m.id + '" data-category="' + cat + '"' + rowClass + '>';
            html += '<td style="padding:8px 12px;vertical-align:middle;">';
            html += '<span style="font-weight:600;color:#1e293b;">' + m.name + '</span>';
            html += '<span style="color:#94a3b8;font-size:0.78rem;margin-left:4px;">' + m.enName + '</span>';
            html += '</td>';
            html += '<td style="padding:6px 8px;vertical-align:middle;text-align:center;">';
            html += '<input type="number" class="conc-input" placeholder="--" step="0.01" min="0" style="width:100%;padding:8px 10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.85rem;text-align:center;outline:none;font-family:inherit;transition:border-color 0.2s;" oninput="onConcInput(this)" onfocus="this.style.borderColor=\'#26d0ce\'" onblur="this.style.borderColor=\'#e2e8f0\'">';
            html += '</td>';
            html += '<td style="padding:8px;vertical-align:middle;text-align:center;">';
            html += '<span class="conc-unit" style="color:#64748b;font-weight:600;">' + (m.unit || 'μmol/L') + '</span>';
            html += '</td>';
            html += '<td style="padding:8px;vertical-align:middle;">';
            html += '<span class="conc-ref" style="color:#94a3b8;font-size:0.82rem;">' + refText + '</span>';
            html += '</td>';
            html += '<td style="padding:8px;vertical-align:middle;text-align:center;">';
            html += '<span class="conc-status" style="display:inline-block;padding:4px 12px;border-radius:10px;font-size:0.78rem;font-weight:700;background:#f1f5f9;color:#94a3b8;">未填写</span>';
            html += '</td>';
            html += '</tr>';
        });
    });

    body.innerHTML = html;

    body.querySelectorAll('.conc-cat-header').forEach(function(hdr) {
        hdr.addEventListener('click', function() {
            var cat = this.dataset.category;
            var toggle = this.querySelector('.cat-toggle');
            var rows = body.querySelectorAll('.conc-row[data-category="' + cat + '"]');
            var isHidden = rows[0] && rows[0].style.display === 'none';
            rows.forEach(function(r) { r.style.display = isHidden ? '' : 'none'; });
            toggle.textContent = isHidden ? '▼' : '▶';
        });
    });
}

export function onConcInput(inputEl) {
    var row = inputEl.closest('tr');
    if (!row) return;
    updateConcentrationStatus(row);
    autoSaveDraft();
}

export function updateConcentrationStatus(row) {
    var inputEl = row.querySelector('.conc-input');
    var statusEl = row.querySelector('.conc-status');
    var metaboliteId = row.dataset.metaboliteId;

    if (!metaboliteId || !statusEl || !inputEl) return;

    var metabolite = metaboliteData.find(function(m) { return m.id === metaboliteId; });
    if (!metabolite) return;

    var rawVal = inputEl.value.trim();
    if (!rawVal) {
        statusEl.textContent = '未填写';
        statusEl.style.background = '#f1f5f9';
        statusEl.style.color = '#94a3b8';
        updateRowHighlight(row, 'none');
        return;
    }

    var val = parseFloat(rawVal);
    if (isNaN(val) || val <= 0) {
        statusEl.textContent = '无效值';
        statusEl.style.background = '#fff7ed';
        statusEl.style.color = '#9a3412';
        updateRowHighlight(row, 'none');
        return;
    }

    if (metabolite.refMin === undefined || metabolite.refMax === undefined) {
        statusEl.textContent = '已录入';
        statusEl.style.background = '#e0e7ff';
        statusEl.style.color = '#3730a3';
        updateRowHighlight(row, 'none');
        return;
    }

    var status = getConcentrationStatus(val, metabolite.refMin, metabolite.refMax);

    if (status === 'normal') {
        statusEl.textContent = '✅ 正常';
        statusEl.style.background = '#d1fae5';
        statusEl.style.color = '#065f46';
        updateRowHighlight(row, 'normal');
    } else if (status === 'low') {
        statusEl.textContent = '⬇️ 偏低';
        statusEl.style.background = '#dbeafe';
        statusEl.style.color = '#1e40af';
        updateRowHighlight(row, 'low');
    } else if (status === 'high') {
        statusEl.textContent = '⬆️ 偏高';
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#991b1b';
        updateRowHighlight(row, 'high');
    } else {
        statusEl.textContent = '⚪ 待确认';
        statusEl.style.background = '#fff7ed';
        statusEl.style.color = '#9a3412';
        updateRowHighlight(row, 'none');
    }
}

function updateRowHighlight(row, status) {
    var cells = row.querySelectorAll('td');
    if (status === 'normal') {
        row.style.background = '';
    } else if (status === 'low') {
        row.style.background = '#eff6ff';
    } else if (status === 'high') {
        row.style.background = '#fef2f2';
    } else {
        row.style.background = '';
    }
}

export function getConcentrationStatus(value, refMin, refMax) {
    if (refMin === undefined || refMax === undefined) return 'unknown';
    if (value < refMin) return 'low';
    if (value > refMax) return 'high';
    return 'normal';
}

export function parseConcentrationData() {
    var body = document.getElementById('concEntryBody');
    if (!body) return [];

    var entries = [];
    body.querySelectorAll('.conc-row').forEach(function(row) {
        var metaboliteId = row.dataset.metaboliteId;
        var input = row.querySelector('.conc-input');
        if (!metaboliteId || !input) return;

        var rawVal = input.value.trim();
        if (!rawVal) return;

        var val = parseFloat(rawVal);
        if (isNaN(val) || val <= 0) return;

        var metabolite = metaboliteData.find(function(m) { return m.id === metaboliteId; });
        if (!metabolite) return;

        var status = getConcentrationStatus(val, metabolite.refMin, metabolite.refMax);

        entries.push({
            metaboliteId: metabolite.id,
            name: metabolite.name,
            enName: metabolite.enName,
            concentration: val,
            unit: metabolite.unit || 'μmol/L',
            refMin: metabolite.refMin,
            refMax: metabolite.refMax,
            pathway: metabolite.pathway,
            category: metabolite.category,
            hmdb: metabolite.hmdb,
            significance: metabolite.significance,
            status: status
        });
    });

    return entries;
}

export function validateConcentrationEntries() {
    var entries = [];
    var errors = [];
    var body = document.getElementById('concEntryBody');
    if (!body) return { entries: [], errors: ['条目容器未就绪'] };

    var rows = body.querySelectorAll('.conc-row');

    rows.forEach(function(row) {
        var metaboliteId = row.dataset.metaboliteId;
        var input = row.querySelector('.conc-input');
        if (!metaboliteId || !input) return;

        var rawVal = input.value.trim();
        if (!rawVal) return;

        var metabolite = metaboliteData.find(function(m) { return m.id === metaboliteId; });
        if (!metabolite) return;

        var val = parseFloat(rawVal);
        if (isNaN(val) || val <= 0) {
            errors.push('代谢物 "' + metabolite.name + '" 浓度值无效');
            return;
        }

        if (metabolite.refMin !== undefined && val < metabolite.refMin * 0.1) {
            errors.push('代谢物 "' + metabolite.name + '" 浓度值异常偏低（' + val + ' ' + (metabolite.unit || 'μmol/L') + '），请核实');
        }
        if (metabolite.refMax !== undefined && val > metabolite.refMax * 50) {
            errors.push('代谢物 "' + metabolite.name + '" 浓度值异常偏高（' + val + ' ' + (metabolite.unit || 'μmol/L') + '），请核实');
        }

        var status = getConcentrationStatus(val, metabolite.refMin, metabolite.refMax);
        entries.push({
            metaboliteId: metabolite.id,
            name: metabolite.name,
            enName: metabolite.enName,
            concentration: val,
            unit: metabolite.unit || 'μmol/L',
            refMin: metabolite.refMin,
            refMax: metabolite.refMax,
            pathway: metabolite.pathway,
            category: metabolite.category,
            hmdb: metabolite.hmdb,
            significance: metabolite.significance,
            status: status
        });
    });

    return { entries: entries, errors: errors };
}

export function fillSampleConcentrationData() {
    var sampleData = {
        'CREATININE': 88,
        'D_GLUCOSE_Na': 5.2,
        'TAURINE': 65,
        'R_3HB': 120,
        'L_SERINE': 110,
        'MALIC_ACID': 3.5,
        'L_GLUTAMINE': 580,
        'ERYTHRITOL': 2.8,
        'PYRIMIDINE': 6.5,
        'L_CYSTEINE_H': 220,
        'GUANIDOACETATE': 3.2,
        'HYPOTAURINE': 2.5,
        'TYRAMINE': 0.8,
        'O_PEA': 5.0,
        'PIPECOLIC_ACID': 0.5,
        'PYROGLUTAMIC_ACID': 35,
        'CITRACONIC_ACID': 0.3,
        'ISONICOTINIC_ACID': 0.4,
        'SALICYLURIC_ACID': 2.0
    };

    var body = document.getElementById('concEntryBody');
    if (!body) return;

    clearConcentrationData(false);

    body.querySelectorAll('.conc-row').forEach(function(row) {
        var id = row.dataset.metaboliteId;
        if (id && sampleData[id] !== undefined) {
            var input = row.querySelector('.conc-input');
            if (input) {
                input.value = sampleData[id];
                updateConcentrationStatus(row);
            }
        }
    });

    autoSaveDraft();
    showNotification('📊 已加载19个示例代谢物浓度数据');
}

export function clearConcentrationData(showMsg) {
    if (showMsg === undefined) showMsg = true;
    var body = document.getElementById('concEntryBody');
    if (body) {
        body.querySelectorAll('.conc-input').forEach(function(input) {
            input.value = '';
        });
        body.querySelectorAll('.conc-row').forEach(function(row) {
            var statusEl = row.querySelector('.conc-status');
            if (statusEl) {
                statusEl.textContent = '未填写';
                statusEl.style.background = '#f1f5f9';
                statusEl.style.color = '#94a3b8';
            }
            row.style.background = '';
        });
    }
    var validation = document.getElementById('concValidationResult');
    if (validation) validation.innerHTML = '';
    clearDraft();
    if (showMsg) showNotification('🗑️ 已清空所有浓度数据');
}

export function goToWizardStep(n) {
    wizardStep = n;

    document.querySelectorAll('.wizard-panel').forEach(function(p) { p.classList.remove('active'); });
    var panel = document.getElementById('wizardStep' + n);
    if (panel) panel.classList.add('active');

    document.querySelectorAll('.wizard-step').forEach(function(s) { s.classList.remove('active', 'completed'); });
    document.querySelectorAll('.wizard-line').forEach(function(l) { l.classList.remove('completed'); });

    for (var i = 1; i <= 3; i++) {
        var stepEl = document.querySelector('.wizard-step[data-step="' + i + '"]');
        if (!stepEl) continue;
        if (i < n) stepEl.classList.add('completed');
        if (i === n) stepEl.classList.add('active');
        var lineEl = document.querySelector('.wizard-line[data-line="' + i + '"]');
        if (lineEl && i < n) lineEl.classList.add('completed');
    }

    var prevBtn = document.getElementById('wizardPrevBtn');
    var nextBtn = document.getElementById('wizardNextBtn');
    var submitBtn = document.getElementById('wizardSubmitBtn');

    if (prevBtn) prevBtn.disabled = (n === 1);
    if (nextBtn) nextBtn.style.display = (n === 3) ? 'none' : '';
    if (submitBtn) submitBtn.style.display = (n === 3) ? '' : 'none';

    if (n === 3) renderWizardSummary();
    if (n === 2) autoSaveDraft();
}

export function wizardNext() {
    if (wizardStep === 1) {
        var dateInput = document.getElementById('wizardTestDate');
        if (!dateInput.value) setWizardDate('today');
    }
    if (wizardStep === 2) {
        var result = validateConcentrationEntries();
        var errs = result.errors;
        var entries = result.entries;

        var validationContainer = document.getElementById('concValidationResult');
        if (errs.length > 0) {
            var errHtml = '<div style="background:#fef2f2;border-radius:12px;padding:16px;border:1px solid #fecaca;">';
            errHtml += '<h4 style="margin:0 0 10px 0;color:#dc2626;">⚠️ 数据校验未通过，请修正以下问题：</h4>';
            errHtml += '<ul style="margin:0;padding-left:20px;color:#991b1b;font-size:0.85rem;line-height:1.8;">';
            errs.forEach(function(e) { errHtml += '<li>' + e + '</li>'; });
            errHtml += '</ul></div>';
            if (validationContainer) validationContainer.innerHTML = errHtml;
            showNotification('请先修正录入数据中的问题', 'warning');
            return;
        }

        if (entries.length === 0) {
            if (validationContainer) validationContainer.innerHTML = '<div style="background:#fffbeb;border-radius:12px;padding:16px;border:1px solid #fde68a;"><p style="margin:0;color:#92400e;">⚠️ 请至少录入一种代谢物浓度</p></div>';
            showNotification('请至少录入一种代谢物浓度', 'warning');
            return;
        }

        if (validationContainer) validationContainer.innerHTML = '<div style="background:#f0fdf4;border-radius:12px;padding:16px;border:1px solid #bbf7d0;"><p style="margin:0;color:#166534;font-weight:700;">✅ 校验通过！共 ' + entries.length + ' 项代谢物浓度数据</p></div>';
    }
    if (wizardStep < 3) goToWizardStep(wizardStep + 1);
}

export function wizardPrev() {
    if (wizardStep > 1) goToWizardStep(wizardStep - 1);
}

export function wizardSkip() {
    if (wizardStep === 2) {
        goToWizardStep(3);
    } else {
        wizardNext();
    }
}

export function setWizardDate(preset) {
    var input = document.getElementById('wizardTestDate');
    if (!input) return;
    var d = new Date();
    if (preset === 'yesterday') d.setDate(d.getDate() - 1);
    if (preset === 'week') d.setDate(d.getDate() - 7);
    input.value = d.toISOString().split('T')[0];
    autoSaveDraft();
}

export function renderWizardSummary() {
    var body = document.getElementById('wizardSummaryBody');
    var stats = document.getElementById('wizardSummaryStats');
    var table = document.getElementById('wizardSummaryTable');
    if (!body || !stats) return;

    var entryData = parseConcentrationData();

    if (table) {
        var thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = '<tr><th>代谢物</th><th>浓度值</th><th>参考范围</th><th>状态</th><th>代谢通路</th></tr>';
        }
    }

    if (entryData.length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:#94a3b8;">未录入任何代谢物浓度数据</td></tr>';
        stats.innerHTML =
            '<div class="wizard-summary-stat"><div class="stat-value">0</div><div class="stat-label">录入项数</div></div>' +
            '<div class="wizard-summary-stat"><div class="stat-value">0</div><div class="stat-label">正常项</div></div>' +
            '<div class="wizard-summary-stat"><div class="stat-value">⚠️</div><div class="stat-label">请录入数据</div></div>';
        return;
    }

    var normalCount = 0;
    var lowCount = 0;
    var highCount = 0;
    var unknownCount = 0;

    var rows = '';
    entryData.forEach(function(e) {
        var statusColor = '#94a3b8';
        var statusText = '待确认';
        if (e.status === 'normal') { statusColor = '#10b981'; statusText = '✅ 正常'; normalCount++; }
        else if (e.status === 'low') { statusColor = '#3b82f6'; statusText = '⬇️ 偏低'; lowCount++; }
        else if (e.status === 'high') { statusColor = '#ef4444'; statusText = '⬆️ 偏高'; highCount++; }
        else { unknownCount++; }

        var refText = '--';
        if (e.refMin !== undefined && e.refMax !== undefined) {
            refText = e.refMin + ' - ' + e.refMax + ' ' + e.unit;
        }

        rows += '<tr>';
        rows += '<td><strong>' + e.name + '</strong> <span style="color:#94a3b8;font-size:0.75rem;">' + e.enName + '</span></td>';
        rows += '<td style="text-align:center;font-weight:600;">' + e.concentration + ' ' + e.unit + '</td>';
        rows += '<td style="text-align:center;color:#64748b;">' + refText + '</td>';
        rows += '<td style="text-align:center;color:' + statusColor + ';font-weight:700;">' + statusText + '</td>';
        rows += '<td style="color:#3b82f6;">' + e.pathway + '</td>';
        rows += '</tr>';
    });

    body.innerHTML = rows;

    stats.innerHTML =
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value">' + entryData.length + '</div>' +
            '<div class="stat-label">录入项数</div>' +
        '</div>' +
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value" style="color:#10b981;">' + normalCount + '</div>' +
            '<div class="stat-label">正常</div>' +
        '</div>' +
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value" style="color:#3b82f6;">' + lowCount + '</div>' +
            '<div class="stat-label">偏低</div>' +
        '</div>' +
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value" style="color:#ef4444;">' + highCount + '</div>' +
            '<div class="stat-label">偏高</div>' +
        '</div>';
}

export function wizardSubmit() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var entryData = parseConcentrationData();

    if (entryData.length === 0) {
        showNotification('⚠️ 请至少录入一种代谢物浓度');
        return;
    }

    var testDate = getWizardTestDate();

    var isDuplicate = checkDuplicateDate(testDate);
    if (isDuplicate) {
        showNotification('⚠️ 检测到同日已存在代谢记录，请选择其他日期或先删除旧记录');
        return;
    }

    clearDraft();

    if (typeof generateConcentrationReport === 'function') {
        generateConcentrationReport(testDate, entryData);
    } else {
        var overallRisk = computeOverallRisk(entryData);
        var pathwayScores = computePathwayScores(entryData);
        var matchResults = buildMatchResults(entryData);
        var result = {
            timestamp: new Date().toISOString(),
            date: testDate,
            overallRisk: overallRisk,
            overallCoverageScore: overallRisk,
            pathwayScores: pathwayScores,
            matchResults: matchResults,
            matchedCount: entryData.length,
            totalFingerprints: metaboliteData.length,
            coverageRate: Math.round((entryData.length / metaboliteData.length) * 100),
            identifiedMetabolites: entryData.map(function(e) { return e.name; }),
            mzPeaks: [],
            pathwayCoverage: computePathwayCoverage(entryData),
            isConcentrationMode: true,
            testDate: testDate
        };
        saveConcentrationReport(result);
    }
}

function computeOverallRisk(entries) {
    if (entries.length === 0) return 15;
    var abnormalCount = 0;
    entries.forEach(function(e) {
        if (e.status === 'low' || e.status === 'high') abnormalCount++;
    });
    return 15 + Math.round((abnormalCount / entries.length) * 100);
}

function computePathwayScores(entries) {
    var scores = { amino_acid: 0, carbohydrate: 0, organic_acid: 0, sulfur: 0, nitrogen: 0, xenobiotic: 0 };
    var counts = { amino_acid: 0, carbohydrate: 0, organic_acid: 0, sulfur: 0, nitrogen: 0, xenobiotic: 0 };

    entries.forEach(function(e) {
        var cat = e.category;
        if (!scores[cat] && scores[cat] !== 0) return;
        counts[cat]++;
        if (e.status === 'low' || e.status === 'high') {
            scores[cat] += 100;
        } else if (e.status === 'normal') {
            scores[cat] += 0;
        } else {
            scores[cat] += 30;
        }
    });

    Object.keys(scores).forEach(function(key) {
        if (counts[key] > 0) {
            scores[key] = Math.round(scores[key] / counts[key]);
        } else {
            scores[key] = 0;
        }
    });

    return scores;
}

function computePathwayCoverage(entries) {
    var coverage = {};
    entries.forEach(function(e) {
        var pathway = e.pathway || e.category;
        if (!coverage[pathway]) coverage[pathway] = { count: 0, normal: 0, abnormal: 0 };
        coverage[pathway].count++;
        if (e.status === 'normal') coverage[pathway].normal++;
        else if (e.status === 'low' || e.status === 'high') coverage[pathway].abnormal++;
    });
    return coverage;
}

function checkDuplicateDate(testDate) {
    if (!currentUser || !testDate) return false;
    try {
        var raw = localStorage.getItem('metabolic_' + currentUser.username);
        if (!raw) return false;
        var records = JSON.parse(raw);
        if (!Array.isArray(records)) return false;
        for (var i = 0; i < records.length; i++) {
            if (records[i].testDate === testDate) return true;
        }
    } catch (e) {}
    return false;
}

function buildMatchResults(entries) {
    return entries.map(function(e) {
        var metabolite = metaboliteData.find(function(m) { return m.id === e.metaboliteId; }) || {};
        return {
            metaboliteId: e.metaboliteId,
            name: e.name,
            enName: e.enName,
            hmdb: e.hmdb || metabolite.hmdb || '',
            pathway: e.pathway || metabolite.pathway || '',
            category: e.category || metabolite.category || '',
            significance: e.significance || metabolite.significance || '',
            ionMode: metabolite.ionMode || '',
            userMz: metabolite.mz || 0,
            matchedMz: metabolite.mz || 0,
            deviation: 0,
            concentration: e.concentration,
            unit: e.unit,
            refMin: e.refMin,
            refMax: e.refMax,
            status: e.status
        };
    });
}

function saveConcentrationReport(result) {
    var username = currentUser.username;

    try {
        var dataKey = 'metascanData_' + username;
        var existingData = [];
        try {
            var raw = localStorage.getItem(dataKey);
            if (raw) existingData = JSON.parse(raw);
            if (!Array.isArray(existingData)) existingData = [];
        } catch (e) { existingData = []; }

        existingData.push(result);
        localStorage.setItem(dataKey, JSON.stringify(existingData));
    } catch (e) {
        console.error('保存浓度报告失败:', e);
    }

    try {
        var reportKey = 'metascanReports_' + username;
        var existingReports = [];
        try {
            var raw = localStorage.getItem(reportKey);
            if (raw) existingReports = JSON.parse(raw);
            if (!Array.isArray(existingReports)) existingReports = [];
        } catch (e) { existingReports = []; }

        existingReports.push({
            id: 'rpt_' + Date.now(),
            date: result.date,
            timestamp: result.timestamp,
            overallRisk: result.overallRisk,
            entryCount: result.matchedCount,
            normalCount: result.matchResults.filter(function(m) { return m.status === 'normal'; }).length,
            lowCount: result.matchResults.filter(function(m) { return m.status === 'low'; }).length,
            highCount: result.matchResults.filter(function(m) { return m.status === 'high'; }).length,
            isConcentrationMode: true
        });
        localStorage.setItem(reportKey, JSON.stringify(existingReports));
    } catch (e) {
        console.error('保存报告索引失败:', e);
    }

    try {
        var metabKey = 'metabolic_' + username;
        var metabRecords = [];
        try {
            var raw = localStorage.getItem(metabKey);
            if (raw) metabRecords = JSON.parse(raw);
            if (!Array.isArray(metabRecords)) metabRecords = [];
        } catch (e) { metabRecords = []; }

        var metabRecord = {
            testDate: result.testDate || result.date,
            notes: '',
            source: 'manual',
            timestamp: Date.now(),
            savedAt: new Date().toISOString(),
            matchedCount: result.matchedCount || 0,
            overallScore: result.overallRisk || 0
        };

        if (result.matchResults) {
            result.matchResults.forEach(function(m) {
                var key = m.metaboliteId || m.name;
                if (m.concentration !== undefined) {
                    metabRecord[key] = m.concentration;
                }
            });
        }

        metabRecords.unshift(metabRecord);
        if (metabRecords.length > 50) metabRecords.length = 50;
        localStorage.setItem(metabKey, JSON.stringify(metabRecords));
    } catch (e) {
        console.error('保存代谢记录失败:', e);
    }

    showNotification('✅ 浓度报告已生成!');

    if (typeof showTab === 'function') {
        showTab('reports');
        setTimeout(function() {
            if (typeof window.renderReportForLatest === 'function') {
                window.renderReportForLatest();
            }
        }, 300);
    } else if (typeof window.renderReport === 'function') {
        if (typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else {
        console.log('浓度报告数据:', JSON.stringify(result, null, 2));
    }
}

export function getWizardTestDate() {
    var dateInput = document.getElementById('wizardTestDate');
    return dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
}

export function autoSaveDraft() {
    if (!currentUser) return;
    var draft = { date: '', entries: [] };
    var dateInput = document.getElementById('wizardTestDate');
    if (dateInput) draft.date = dateInput.value;

    var entries = parseConcentrationData();
    draft.entries = entries.map(function(e) {
        return { metaboliteId: e.metaboliteId, concentration: e.concentration };
    });

    var hasData = draft.date || draft.entries.length > 0;
    if (hasData) {
        try {
            localStorage.setItem('metascanDraft_' + currentUser.username, JSON.stringify(draft));
        } catch (e) {}
    }
}

export function checkDraft() {
    if (!currentUser) return;
    var saved = localStorage.getItem('metascanDraft_' + currentUser.username);
    if (!saved) return;
    try {
        var draft = JSON.parse(saved);
        if (!draft.date && (!draft.entries || draft.entries.length === 0)) return;

        var bar = document.getElementById('draftRestoreBar');
        if (bar) bar.style.display = 'flex';

        if (draft.date) {
            var dateInput = document.getElementById('wizardTestDate');
            if (dateInput && !dateInput.value) dateInput.value = draft.date;
        }

        if (draft.entries && draft.entries.length > 0) {
            var body = document.getElementById('concEntryBody');
            if (body) {
                draft.entries.forEach(function(item) {
                    var row = body.querySelector('.conc-row[data-metabolite-id="' + item.metaboliteId + '"]');
                    if (row) {
                        var input = row.querySelector('.conc-input');
                        if (input && item.concentration) {
                            input.value = item.concentration;
                            updateConcentrationStatus(row);
                        }
                    }
                });
            }
        }
    } catch (e) {}
}

export function clearDraft() {
    if (!currentUser) return;
    try {
        localStorage.removeItem('metascanDraft_' + currentUser.username);
    } catch (e) {}
}

export function restoreDraft() {
    var bar = document.getElementById('draftRestoreBar');
    if (bar) bar.style.display = 'none';
}

export function discardDraft() {
    if (!currentUser) return;
    clearDraft();
    clearConcentrationData(false);
    var dateInput = document.getElementById('wizardTestDate');
    if (dateInput) dateInput.value = '';
    var bar = document.getElementById('draftRestoreBar');
    if (bar) bar.style.display = 'none';
}

export function renderFingerprintLibrary() {
    if (!metaboliteData || metaboliteData.length === 0) return;

    var container = document.getElementById('fingerprintLibrary');
    if (!container) return;

    try {
        var categoryColors = {
            amino_acid: '#3b82f6',
            carbohydrate: '#f59e0b',
            organic_acid: '#10b981',
            sulfur: '#8b5cf6',
            nitrogen: '#ef4444',
            xenobiotic: '#f97316'
        };

        var html = '<h3 style="margin-bottom:12px;color:#1a2980;">代谢物参考库 (' + metaboliteData.length + ' 种代谢物 · 6个通路)</h3>';
        html += '<div style="overflow-x:auto;max-height:400px;overflow-y:auto;">';
        html += '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">';
        html += '<thead><tr style="background:#f1f5f9;position:sticky;top:0;">';
        html += '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">#</th>';
        html += '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">中文名称</th>';
        html += '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">英文名称</th>';
        html += '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">参考范围</th>';
        html += '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">单位</th>';
        html += '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">通路分类</th>';
        html += '</tr></thead><tbody>';

        metaboliteData.forEach(function(fp, i) {
            var catColor = categoryColors[fp.category] || '#94a3b8';
            var catName = fp.pathway || fp.category;
            var refRange = '--';
            if (fp.refMin !== undefined && fp.refMax !== undefined) {
                refRange = fp.refMin + ' - ' + fp.refMax;
            }

            html += '<tr style="border-bottom:1px solid #f1f5f9;">';
            html += '<td style="padding:6px 10px;color:#94a3b8;">' + (i + 1) + '</td>';
            html += '<td style="padding:6px 10px;font-weight:500;">' + fp.name + '</td>';
            html += '<td style="padding:6px 10px;color:#64748b;font-size:0.8rem;">' + fp.enName + '</td>';
            html += '<td style="padding:6px 10px;font-family:monospace;color:#3b82f6;">' + refRange + '</td>';
            html += '<td style="padding:6px 10px;color:#64748b;">' + (fp.unit || 'μmol/L') + '</td>';
            html += '<td style="padding:6px 10px;"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;background:' + catColor + '15;color:' + catColor + ';border:1px solid ' + catColor + '30;">' + catName + '</span></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="color:#ef4444;">参考库加载失败，请刷新页面重试</p>';
    }
}

window.initWizard = initWizard;
window.wizardNext = wizardNext;
window.wizardPrev = wizardPrev;
window.wizardSkip = wizardSkip;
window.setWizardDate = setWizardDate;
window.wizardSubmit = wizardSubmit;
window.autoSaveDraft = autoSaveDraft;
window.checkDraft = checkDraft;
window.restoreDraft = restoreDraft;
window.discardDraft = discardDraft;
window.clearDraft = clearDraft;
window.onConcInput = onConcInput;
window.fillSampleConcentrationData = fillSampleConcentrationData;
window.clearConcentrationData = clearConcentrationData;
window.parseConcentrationData = parseConcentrationData;
window.getWizardTestDate = getWizardTestDate;

window.loadSampleData = fillSampleConcentrationData;
window.clearData = clearConcentrationData;
window.loadMzSampleData = fillSampleConcentrationData;
window.clearMzData = clearConcentrationData;
window.parseMzInput = parseConcentrationData;

window.addConcentrationRow = function() {};
window.removeConcentrationRow = function() {};
window.onMetaboliteSelect = function() {};

window.quickMatchPreview = function() {
    showNotification('浓度直录模式下无需匹配预览，请直接录入浓度值', 'info');
};
window.filterMetabolicHistory = filterMetabolicHistory;
window.exportMetabolicCSV = exportMetabolicCSV;
window.closeMetabolicPreview = closeMetabolicPreview;
window.confirmMetabolicSave = confirmMetabolicSave;

export var loadSampleData = fillSampleConcentrationData;
export var clearData = clearConcentrationData;

export function filterMetabolicHistory() {
    var filter = document.getElementById('historyFilter');
    if (!filter) return;
    var range = filter.value;
    var now = new Date();
    var tbody = document.getElementById('metabolicHistoryBody');
    if (!tbody) return;

    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function(row) {
        var dateCell = row.querySelector('td:first-child');
        if (!dateCell) return;
        var dateText = dateCell.textContent.trim();
        if (!dateText || dateText === '检测日期') return;

        var rowDate = new Date(dateText);
        if (isNaN(rowDate.getTime())) { row.style.display = ''; return; }

        if (range === 'all') {
            row.style.display = '';
        } else if (range === 'week') {
            var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            row.style.display = rowDate >= weekAgo ? '' : 'none';
        } else if (range === 'month') {
            var monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            row.style.display = rowDate >= monthAgo ? '' : 'none';
        } else if (range === 'quarter') {
            var quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            row.style.display = rowDate >= quarterAgo ? '' : 'none';
        }
    });
}

export function exportMetabolicCSV() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }
    try {
        var raw = localStorage.getItem('metascanData_' + currentUser.username);
        if (!raw) { showNotification('无数据可导出', 'info'); return; }
        var data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) { showNotification('无数据可导出', 'info'); return; }

        var headers = ['日期', '代谢物数', '正常', '偏低', '偏高', '风险评分'];
        var rows = [headers.join(',')];
        data.forEach(function(r) {
            var normalC = r.matchResults ? r.matchResults.filter(function(m) { return m.status === 'normal'; }).length : 0;
            var lowC = r.matchResults ? r.matchResults.filter(function(m) { return m.status === 'low'; }).length : 0;
            var highC = r.matchResults ? r.matchResults.filter(function(m) { return m.status === 'high'; }).length : 0;
            rows.push([r.date || '', r.matchedCount || 0, normalC, lowC, highC, r.overallRisk || ''].join(','));
        });

        var blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'metascan_history_' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('CSV已导出');
    } catch (e) {
        showNotification('导出失败', 'error');
    }
}

export function closeMetabolicPreview() {
    var modal = document.getElementById('metabolicPreviewModal');
    if (modal) modal.style.display = 'none';
}

export function confirmMetabolicSave() {
    closeMetabolicPreview();
    wizardSubmit();
}

export function switchMetabolicMode(mode) {
    var btns = document.querySelectorAll('.metabolic-mode-btn');
    btns.forEach(function(b) { b.classList.remove('active'); b.style.background = '#f1f5f9'; b.style.color = '#64748b'; });

    var cameraEl = document.getElementById('metabolicCameraMode');
    var manualEl = document.getElementById('metabolicManualMode');
    var historyEl = document.getElementById('metabolicHistoryMode');

    if (cameraEl) cameraEl.style.display = 'none';
    if (manualEl) manualEl.style.display = 'none';
    if (historyEl) historyEl.style.display = 'none';

    if (mode === 'camera') {
        if (btns[0]) { btns[0].classList.add('active'); btns[0].style.background = 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'; btns[0].style.color = 'white'; }
        if (cameraEl) cameraEl.style.display = 'block';
    } else if (mode === 'manual') {
        if (btns[1]) { btns[1].classList.add('active'); btns[1].style.background = 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'; btns[1].style.color = 'white'; }
        if (manualEl) manualEl.style.display = 'block';
        initWizard();
    } else if (mode === 'history') {
        if (btns[2]) { btns[2].classList.add('active'); btns[2].style.background = 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'; btns[2].style.color = 'white'; }
        if (historyEl) historyEl.style.display = 'block';
        loadMetabolicHistory();
    }
}

function getMetabolicRecords(filter) {
    if (!currentUser) return [];
    filter = filter || 'all';

    var key = 'metabolic_' + currentUser.username;
    var records = [];
    try {
        var raw = localStorage.getItem(key);
        if (raw) records = JSON.parse(raw);
        if (!Array.isArray(records)) records = [];
    } catch (e) { records = []; }

    if (filter === 'all') return records;

    var now = Date.now();
    var cutoff = filter === 'week' ? now - 7 * 24 * 60 * 60 * 1000 :
                 filter === 'month' ? now - 30 * 24 * 60 * 60 * 1000 :
                 filter === 'quarter' ? now - 90 * 24 * 60 * 60 * 1000 : now;

    return records.filter(function(r) { return r.timestamp >= cutoff; });
}

export function loadMetabolicHistory(filter) {
    filter = filter || 'all';
    var thead = document.getElementById('metabolicHistoryHead');
    var tbody = document.getElementById('metabolicHistoryBody');
    if (!thead || !tbody) return;

    var records = getMetabolicRecords(filter);
    var metabIndex = window.metaboliteData || [];

    var headerHtml = '<tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">';
    headerHtml += '<th style="padding: 14px 12px; text-align: left; font-weight: 800; color: #475569;">检测日期</th>';
    for (var i = 0; i < metabIndex.length; i++) {
        headerHtml += '<th style="padding: 14px 12px; text-align: center; font-weight: 800; color: #475569; font-size: 0.78rem;">' + metabIndex[i].name + '</th>';
    }
    headerHtml += '<th style="padding: 14px 12px; text-align: center; font-weight: 800; color: #475569;">状态</th>';
    headerHtml += '<th style="padding: 14px 12px; text-align: center; font-weight: 800; color: #475569;">操作</th>';
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    if (records.length === 0) {
        var colSpan = metabIndex.length + 3;
        tbody.innerHTML = '<tr><td colspan="' + colSpan + '" style="padding: 50px; text-align: center; color: #999;">' +
            '<div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>' +
            '<div style="font-size: 1rem;">暂无代谢检测记录</div>' +
            '<div style="font-size: 0.85rem; margin-top: 4px;">请先录入代谢数据</div>' +
            '</td></tr>';
        return;
    }

    var normalCount = 0;
    var totalCount = 0;

    tbody.innerHTML = records.map(function(record, index) {
        var date = record.testDate || (record.timestamp ? new Date(record.timestamp).toLocaleDateString('zh-CN') : '--');
        var sourceIcon = record.source === 'ocr' ? ' 📷' : ' ✏️';
        var normalInRow = 0;
        var totalInRow = 0;

        var cellsHtml = '';
        for (var j = 0; j < metabIndex.length; j++) {
            var field = metabIndex[j];
            var val = record[field.id];

            if (val === undefined || val === null) {
                cellsHtml += '<td style="padding: 10px 6px; text-align: center; color: #cbd5e1;">--</td>';
                continue;
            }

            totalInRow++;
            totalCount++;

            var inRange = false;
            if (field.refMin !== undefined && field.refMax !== undefined) {
                inRange = (val >= field.refMin && val <= field.refMax);
            }

            if (inRange) {
                normalInRow++;
                normalCount++;
                cellsHtml += '<td style="padding: 10px 6px; text-align: center; color: #16a34a; font-weight: 700;">' + val + '</td>';
            } else {
                cellsHtml += '<td style="padding: 10px 6px; text-align: center; color: #dc2626; font-weight: 700;">' + val + '</td>';
            }
        }

        var statusIcon = totalInRow === 0 ? '⚪' : (normalInRow === totalInRow ? '✅' : (normalInRow >= totalInRow * 0.5 ? '⚠️' : '🔴'));

        return '<tr style="border-bottom: 1px solid #f1f5f9;">' +
            '<td style="padding: 12px; color: #1e40af; font-weight: 600; white-space: nowrap;">' +
                date + sourceIcon +
            '</td>' +
            cellsHtml +
            '<td style="padding: 12px; text-align: center; font-size: 1.2rem;">' + statusIcon + '</td>' +
            '<td style="padding: 12px; text-align: center;">' +
                '<button onclick="deleteMetabolicRecord(' + index + ')" title="删除" style="padding: 5px 10px; border-radius: 8px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; cursor: pointer; font-size: 0.8rem;">🗑️</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}

export function deleteMetabolicRecord(index) {
    if (!currentUser) return;

    var key = 'metabolic_' + currentUser.username;
    var records = [];
    try {
        var raw = localStorage.getItem(key);
        if (raw) records = JSON.parse(raw);
        if (!Array.isArray(records)) records = [];
    } catch (e) { records = []; }

    if (index < 0 || index >= records.length) return;

    if (typeof showNotification === 'function') {
        showNotification('确认删除此条代谢检测记录？点击"确认删除"按钮即可', 'info');
    }

    records.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(records));

    var filterEl = document.getElementById('historyFilter');
    var currentFilter = filterEl ? filterEl.value : 'all';
    loadMetabolicHistory(currentFilter);

    if (typeof showNotification === 'function') {
        setTimeout(function() { showNotification('🗑️ 记录已删除'); }, 300);
    }
}

window.switchMetabolicMode = switchMetabolicMode;
window.loadMetabolicHistory = loadMetabolicHistory;
window.deleteMetabolicRecord = deleteMetabolicRecord;
window.getMetabolicRecords = getMetabolicRecords;