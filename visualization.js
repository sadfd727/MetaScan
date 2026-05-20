import { metaboliteData, subtypes } from './config.js';
import { analyzeMetabolicData } from './diagnosis-engine.js';
import { generateWeeklyHealthPlan, generate4WeekExercisePlan, saveToHistory } from './health-plans.js';
import { showNotification } from './notifications.js';
import { currentUser, currentResult, historicalData, setCurrentResult } from './auth.js';
import { renderWithObserver, limitHistoricalData, hasMoreData, showHistoryLimitBadge } from './performance.js';

export async function generateReport(testDate, mzPeaks) {
    if (!currentUser) {
        showNotification('请先登录后再生成报告', 'warning');
        return;
    }

    if (!mzPeaks || !Array.isArray(mzPeaks) || mzPeaks.length === 0) {
        showNotification('请至少输入一个m/z峰值', 'warning');
        return;
    }

    var inputData = { mzPeaks: mzPeaks, testDate: testDate };

    var loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) loadingEl.style.display = 'block';

    try {
        var userHistory = historicalData[currentUser.username] || [];
        var result = await analyzeMetabolicData(mzPeaks, userHistory);
        result.testDate = testDate;
        setCurrentResult(result);

        setTimeout(function() {
            var planCreated = generateWeeklyHealthPlan();
            if (planCreated) {
                setTimeout(function() {
                    var reportContainer = document.getElementById('reportsContent');
                    if (reportContainer) {
                        var planNotification = document.createElement('div');
                        planNotification.style.cssText = 'background: linear-gradient(135deg, #1a2980, #26d0ce); color: white; padding: 18px 24px; border-radius: 15px; margin-bottom: 25px; box-shadow: 0 6px 20px rgba(26,41,128,0.4); display: flex; align-items: center; justify-content: space-between;';
                        planNotification.innerHTML = '<div style="display: flex; align-items: center; gap: 15px;"><span style="font-size: 2rem;">🧬</span><div><div style="font-weight: 700; font-size: 1.15rem; margin-bottom: 4px;">代谢指纹分析完成！</div><div style="font-size: 0.95rem; opacity: 0.95;">已鉴定 ' + result.matchedCount + ' 种代谢物，覆盖 ' + Object.values(result.pathwayCoverage).filter(function(c) { return c.matched > 0; }).length + ' 个通路</div></div></div><button onclick="showTab(\'home\')" style="padding: 10px 22px; background: white; color: #1a2980; border: none; border-radius: 25px; cursor: pointer; font-weight: 700; font-size: 0.95rem; box-shadow: 0 3px 10px rgba(0,0,0,0.2); transition: transform 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\';" onmouseout="this.style.transform=\'translateY(0)\';">查看详情</button>';
                        reportContainer.insertBefore(planNotification, reportContainer.firstChild);
                    }
                }, 200);
            }
        }, 500);

        saveToHistory(currentResult);

        if (loadingEl) loadingEl.style.display = 'none';

        showTab('reports');

        setTimeout(function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        showNotification('代谢指纹分析报告已生成');
    } catch (err) {
        console.error('报告生成失败:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        showNotification('报告生成失败，请重试');
    }
}

export function generateConcentrationReport(testDate, entries) {
    if (!currentUser) {
        showNotification('请先登录后再生成报告', 'warning');
        return;
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
        showNotification('请至少录入一种代谢物浓度', 'warning');
        return;
    }

    var abnormalCount = 0;
    entries.forEach(function(e) {
        if (e.status === 'low' || e.status === 'high') abnormalCount++;
    });
    var overallRisk = 15 + Math.round((abnormalCount / entries.length) * 100);

    var pathwayScores = { amino_acid: 0, carbohydrate: 0, organic_acid: 0, sulfur: 0, nitrogen: 0, xenobiotic: 0 };
    var pathwayCounts = { amino_acid: 0, carbohydrate: 0, organic_acid: 0, sulfur: 0, nitrogen: 0, xenobiotic: 0 };
    entries.forEach(function(e) {
        var cat = e.category;
        if (pathwayScores[cat] === undefined) return;
        pathwayCounts[cat]++;
        if (e.status === 'low' || e.status === 'high') pathwayScores[cat] += 100;
        else if (e.status === 'unknown') pathwayScores[cat] += 30;
    });
    Object.keys(pathwayScores).forEach(function(key) {
        if (pathwayCounts[key] > 0) pathwayScores[key] = Math.round(pathwayScores[key] / pathwayCounts[key]);
    });

    var pathwayCoverage = {};
    entries.forEach(function(e) {
        var p = e.pathway || e.category;
        if (!pathwayCoverage[p]) pathwayCoverage[p] = { matched: 0, total: 0, normal: 0, abnormal: 0 };
        pathwayCoverage[p].matched++;
        pathwayCoverage[p].total = pathwayCoverage[p].matched;
        if (e.status === 'normal') pathwayCoverage[p].normal++;
        else if (e.status === 'low' || e.status === 'high') pathwayCoverage[p].abnormal++;
    });

    var matchResults = entries.map(function(e) {
        var meta = metaboliteData.find(function(m) { return m.id === e.metaboliteId; }) || {};
        return {
            metaboliteId: e.metaboliteId,
            name: e.name,
            enName: e.enName,
            hmdb: e.hmdb || meta.hmdb || '',
            pathway: e.pathway || meta.pathway || '',
            category: e.category || meta.category || '',
            significance: e.significance || meta.significance || '',
            ionMode: meta.ionMode || '',
            userMz: meta.mz || 0,
            matchedMz: meta.mz || 0,
            deviation: 0,
            concentration: e.concentration,
            unit: e.unit,
            refMin: e.refMin,
            refMax: e.refMax,
            status: e.status
        };
    });

    var result = {
        timestamp: new Date().toISOString(),
        date: testDate,
        testDate: testDate,
        overallRisk: overallRisk,
        overallCoverageScore: overallRisk,
        pathwayScores: pathwayScores,
        matchResults: matchResults,
        matchedCount: entries.length,
        totalFingerprints: metaboliteData.length,
        coverageRate: Math.round((entries.length / metaboliteData.length) * 100),
        identifiedMetabolites: entries.map(function(e) { return e.name; }),
        mzPeaks: [],
        pathwayCoverage: pathwayCoverage,
        isConcentrationMode: true
    };

    setCurrentResult(result);

    var loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) loadingEl.style.display = 'block';

    generateWeeklyHealthPlan();

    saveToHistory(result);

    if (loadingEl) loadingEl.style.display = 'none';

    if (typeof showTab === 'function') showTab('reports');

    setTimeout(function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    showNotification('浓度代谢报告已生成');
}

export function drawRiskRadarChart(scores) {
    const ctx = document.getElementById('riskRadarChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['氨基酸代谢', '碳水化合物代谢', '有机酸与TCA循环', '含硫化合物代谢', '含氮化合物代谢', '外源物代谢'],
            datasets: [{
                label: '通路覆盖评分',
                data: [
                    scores.amino_acid,
                    scores.carbohydrate,
                    scores.organic_acid,
                    scores.sulfur,
                    scores.nitrogen,
                    scores.xenobiotic
                ],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 1)',
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
    });
}

export function drawAbnormalChart(matches) {
    var ctx = document.getElementById('abnormalChart');
    if (!ctx) return;

    if (!matches || matches.length === 0) return;

    var labels = matches.map(function(m) { return m.name; });
    var data = matches.map(function(m) { return m.deviation; });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'm/z偏差 (Da)',
                data: data,
                backgroundColor: data.map(function(v) { return v > 0.2 ? 'rgba(239, 68, 68, 0.6)' : v > 0.1 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(16, 185, 129, 0.6)'; }),
                borderColor: data.map(function(v) { return v > 0.2 ? 'rgba(239, 68, 68, 1)' : v > 0.1 ? 'rgba(245, 158, 11, 1)' : 'rgba(16, 185, 129, 1)'; }),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'm/z偏差 (Da)'
                    }
                }
            }
        }
    });
}

export function drawRiskTrendChart(currentRisk) {
    const ctx = document.getElementById('riskTrendChart');
    if (!ctx) return;
    
    const labels = ['当前', '6个月后(不干预)', '1年后(不干预)', '1年后(干预)'];
    const data = [
        currentRisk,
        currentRisk * 1.1,
        currentRisk * 1.2,
        Math.max(10, currentRisk * 0.8)
    ];
    
    const colors = data.map(value => {
        if (value < 30) return '#00b894';
        if (value < 60) return '#f39c12';
        return '#e74c3c';
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '风险评分',
                data: data,
                borderColor: '#1a2980',
                backgroundColor: 'rgba(26, 41, 128, 0.1)',
                pointBackgroundColor: colors,
                pointBorderColor: colors,
                pointRadius: 6,
                pointHoverRadius: 8,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '风险评分'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                                if (context.parsed.y < 30) {
                                    label += ' (低风险)';
                                } else if (context.parsed.y < 60) {
                                    label += ' (中等风险)';
                                } else {
                                    label += ' (高风险)';
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

export function drawConcentrationBarChart(matchResults) {
    try {
    var ctx = document.getElementById('concentrationBarChart');
    if (!ctx || !matchResults || matchResults.length === 0) return;

    var entries = matchResults.filter(function(m) { return m.concentration !== undefined && m.concentration !== null; });
    if (entries.length === 0) return;

    entries.sort(function(a, b) { return Math.abs(b.concentration - ((b.refMin + b.refMax) / 2)) - Math.abs(a.concentration - ((a.refMin + a.refMax) / 2)); });
    var displayEntries = entries.slice(0, 10);

    var labels = displayEntries.map(function(m) { return m.name.length > 8 ? m.name.substring(0, 8) + '...' : m.name; });
    var values = displayEntries.map(function(m) { return m.concentration; });
    var refMinArr = displayEntries.map(function(m) { return m.refMin || 0; });
    var refMaxArr = displayEntries.map(function(m) { return m.refMax || 0; });

    if (window.Chart && window.Chart.getChart) {
        var existing = window.Chart.getChart(ctx);
        if (existing) existing.destroy();
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '浓度值',
                data: values,
                backgroundColor: values.map(function(v, i) {
                    return (v < refMinArr[i]) ? 'rgba(59, 130, 246, 0.7)' :
                           (v > refMaxArr[i]) ? 'rgba(239, 68, 68, 0.7)' :
                           'rgba(16, 185, 129, 0.7)';
                }),
                borderColor: values.map(function(v, i) {
                    return (v < refMinArr[i]) ? 'rgba(59, 130, 246, 1)' :
                           (v > refMaxArr[i]) ? 'rgba(239, 68, 68, 1)' :
                           'rgba(16, 185, 129, 1)';
                }),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            var i = ctx.dataIndex;
                            var orig = displayEntries[i];
                            return orig.name + ': ' + orig.concentration + ' ' + (orig.unit || '') +
                                   ' (参考: ' + (orig.refMin || '?') + '-' + (orig.refMax || '?') + ')';
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: '浓度' } },
                y: { title: { display: true, text: '代谢物' } }
            }
        }
    });
    } catch(e) { console.warn('drawConcentrationBarChart error:', e); }
}

export function drawStatusPieChart(matchResults) {
    try {
    var ctx = document.getElementById('statusPieChart');
    if (!ctx) return;

    var normalCount = 0, lowCount = 0, highCount = 0, unrecorded = 0;
    if (matchResults && matchResults.length > 0) {
        matchResults.forEach(function(m) {
            if (m.status === 'normal') normalCount++;
            else if (m.status === 'low') lowCount++;
            else if (m.status === 'high') highCount++;
            else unrecorded++;
        });
    }

    if (normalCount + lowCount + highCount + unrecorded === 0) return;

    var datasets = [];
    if (normalCount > 0) datasets.push({ label: '正常', count: normalCount, color: '#10b981' });
    if (lowCount > 0) datasets.push({ label: '偏低', count: lowCount, color: '#3b82f6' });
    if (highCount > 0) datasets.push({ label: '偏高', count: highCount, color: '#ef4444' });
    if (unrecorded > 0) datasets.push({ label: '未录入', count: unrecorded, color: '#94a3b8' });
    if (datasets.length === 0) return;

    if (window.Chart && window.Chart.getChart) {
        var existing = window.Chart.getChart(ctx);
        if (existing) existing.destroy();
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: datasets.map(function(d) { return d.label; }),
            datasets: [{
                data: datasets.map(function(d) { return d.count; }),
                backgroundColor: datasets.map(function(d) { return d.color; }),
                borderColor: '#fff',
                borderWidth: 3,
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            cutout: '55%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: { size: 13 },
                        generateLabels: function(chart) {
                            var data = chart.data;
                            return data.labels.map(function(label, i) {
                                var value = data.datasets[0].data[i];
                                var total = data.datasets[0].data.reduce(function(a, b) { return a + b; }, 0);
                                var pct = total > 0 ? Math.round(value / total * 100) : 0;
                                return {
                                    text: label + ': ' + value + '项 (' + pct + '%)',
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    index: i,
                                    fontColor: '#1e293b'
                                };
                            });
                        }
                    }
                }
            }
        }
    });
    } catch(e) { console.warn('drawStatusPieChart error:', e); }
}

export function drawPathwayDoughnutChart(matchResults) {
    try {
    var ctx = document.getElementById('pathwayDoughnutChart');
    if (!ctx) return;

    var pathwayMap = {};
    var pathwayLabels = { amino_acid: '氨基酸代谢', carbohydrate: '糖分代谢', organic_acid: '能量代谢', sulfur: '解毒抗氧化', nitrogen: '肾脏排泄', xenobiotic: '药物毒素' };
    var pathwayColors = { amino_acid: '#818cf8', carbohydrate: '#f472b6', organic_acid: '#fbbf24', sulfur: '#34d399', nitrogen: '#a78bfa', xenobiotic: '#fb923c' };

    if (matchResults && matchResults.length > 0) {
        matchResults.forEach(function(m) {
            if (m.status === 'low' || m.status === 'high') {
                var p = m.category || m.pathway || '';
                var pKey = '';
                if (p.indexOf('氨基酸') >= 0) pKey = 'amino_acid';
                else if (p.indexOf('糖') >= 0 || p.indexOf('碳水') >= 0) pKey = 'carbohydrate';
                else if (p.indexOf('有机酸') >= 0 || p.indexOf('能量') >= 0) pKey = 'organic_acid';
                else if (p.indexOf('硫') >= 0 || p.indexOf('sulfur') >= 0) pKey = 'sulfur';
                else if (p.indexOf('氮') >= 0 || p.indexOf('nitrogen') >= 0) pKey = 'nitrogen';
                else if (p.indexOf('外源') >= 0 || p.indexOf('xenobiotic') >= 0) pKey = 'xenobiotic';
                else pKey = p;
                pathwayMap[pKey] = (pathwayMap[pKey] || 0) + 1;
            }
        });
    }

    var entries = Object.entries(pathwayMap);

    if (window.Chart && window.Chart.getChart) {
        var existing = window.Chart.getChart(ctx);
        if (existing) existing.destroy();
    }

    if (entries.length === 0) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['所有通路正常'],
                datasets: [{ data: [1], backgroundColor: ['#10b981'], borderWidth: 0 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    entries.sort(function(a, b) { return b[1] - a[1]; });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: entries.map(function(e) { return pathwayLabels[e[0]] || e[0]; }),
            datasets: [{
                data: entries.map(function(e) { return e[1]; }),
                backgroundColor: entries.map(function(e) { return pathwayColors[e[0]] || '#94a3b8'; }),
                borderColor: '#fff',
                borderWidth: 3,
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            cutout: '50%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 18, font: { size: 13 } }
                }
            }
        }
    });
    } catch(e) { console.warn('drawPathwayDoughnutChart error:', e); }
}

export function drawDeviationChart(matchResults) {
    try {
    var ctx = document.getElementById('deviationChart');
    if (!ctx || !matchResults || matchResults.length === 0) return;

    var entries = matchResults.filter(function(m) {
        return m.concentration !== undefined && m.concentration !== null &&
               m.refMin !== undefined && m.refMax !== undefined;
    });
    if (entries.length === 0) return;

    entries.sort(function(a, b) {
        var devA = a.concentration - ((a.refMin + a.refMax) / 2);
        var devB = b.concentration - ((b.refMin + b.refMax) / 2);
        return Math.abs(devB) - Math.abs(devA);
    });
    var displayEntries = entries.slice(0, 12);

    var labels = displayEntries.map(function(m) { return m.name; });
    var deviations = displayEntries.map(function(m) {
        var mid = (m.refMin + m.refMax) / 2;
        if (mid === 0) return 0;
        return ((m.concentration - mid) / mid) * 100;
    });

    var bgColors = deviations.map(function(v) {
        if (v < -20) return 'rgba(59, 130, 246, 0.75)';
        if (v < 0) return 'rgba(59, 130, 246, 0.45)';
        if (v > 20) return 'rgba(239, 68, 68, 0.75)';
        if (v > 0) return 'rgba(239, 68, 68, 0.45)';
        return 'rgba(16, 185, 129, 0.6)';
    });

    if (window.Chart && window.Chart.getChart) {
        var existing = window.Chart.getChart(ctx);
        if (existing) existing.destroy();
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '偏离参考范围中点 (%)',
                data: deviations,
                backgroundColor: bgColors,
                borderColor: bgColors.map(function(c) { return c.replace('0.75', '1').replace('0.45', '0.8').replace('0.6', '1'); }),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            var i = ctx.dataIndex;
                            var orig = displayEntries[i];
                            var v = deviations[i];
                            var dir = v > 0 ? '↑偏高' : v < 0 ? '↓偏低' : '正常';
                            return orig.name + ': ' + orig.concentration + ' ' + (orig.unit || '') +
                                   ' | 参考: ' + orig.refMin + '-' + orig.refMax + ' ' + (orig.unit || '') +
                                   ' | 偏离中点 ' + v.toFixed(1) + '% ' + dir;
                        }
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: {
                    title: { display: true, text: '偏离参考范围中点 (%)' },
                    grid: { color: function(context) { return context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'; } }
                },
                y: {
                    title: { display: true, text: '代谢物' }
                }
            }
        }
    });
    } catch(e) { console.warn('drawDeviationChart error:', e); }
}

function analyzeCorrelation(records) {
    var tasks = ['exercise', 'diet', 'sleep', 'water'];
    var dims = ['amino_acid', 'carbohydrate', 'organic_acid', 'sulfur', 'nitrogen', 'xenobiotic'];
    var correlations = {};
    dims.forEach(function(dim) {
        correlations[dim] = {};
        tasks.forEach(function(task) {
            var taskValues = [];
            var dimValues = [];
            records.forEach(function(r) {
                if (r.taskCompletion && r.taskCompletion[task] !== undefined && r.riskScores[dim] !== undefined) {
                    taskValues.push(r.taskCompletion[task]);
                    dimValues.push(r.riskScores[dim]);
                }
            });
            if (taskValues.length >= 3) {
                var corr = calcPearsonCorrelation(taskValues, dimValues);
                if (corr !== null && !isNaN(corr)) {
                    var strength = Math.abs(corr) > 0.7 ? 'strong' : Math.abs(corr) > 0.4 ? 'moderate' : Math.abs(corr) > 0.1 ? 'weak' : 'none';
                    correlations[dim][task] = { strength: strength, value: corr };
                } else {
                    correlations[dim][task] = { strength: 'none', value: 0 };
                }
            } else {
                correlations[dim][task] = { strength: 'none', value: 0 };
            }
        });
    });
    return correlations;
}

function generateCorrelationHTML() {
    var records = window._compFilteredData;
    if (!records || records.length < 3) {
        return '<div class="viz-card fade-in"><h3>📊 任务与健康指标相关性分析</h3><p style="color: #6c757d; padding: 20px;">正在收集足够的健康数据以计算相关性...</p></div>';
    }
    var correlations = analyzeCorrelation(records);
    var dimNames = {
        amino_acid: '氨基酸代谢',
        carbohydrate: '碳水化合物代谢',
        organic_acid: '有机酸与TCA',
        sulfur: '含硫化合物',
        nitrogen: '含氮化合物',
        xenobiotic: '外源物代谢'
    };
    var taskNames = { exercise: '运动', diet: '饮食', sleep: '睡眠', water: '饮水' };
    var html = '<div class="viz-card fade-in" style="margin-bottom: 35px;"><h3 class="section-title">📊 任务与健康指标相关性分析</h3>';
    html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; text-align: center;">';
    html += '<thead><tr><th style="padding: 10px;">维度</th>';
    Object.keys(taskNames).forEach(function(task) {
        html += '<th style="padding: 10px;">' + taskNames[task] + '</th>';
    });
    html += '</tr></thead><tbody>';
    Object.keys(dimNames).forEach(function(dim) {
        html += '<tr><td style="font-weight: 600; padding: 10px;">' + dimNames[dim] + '</td>';
        Object.keys(taskNames).forEach(function(task) {
            var c = correlations[dim][task];
            var color, icon;
            if (c.strength === 'strong') { color = c.value > 0 ? '#22c55e' : '#ef4444'; icon = c.value > 0 ? '✅' : '⚠️'; }
            else if (c.strength === 'moderate') { color = c.value > 0 ? '#86efac' : '#fca5a5'; icon = c.value > 0 ? '↗' : '↘'; }
            else if (c.strength === 'weak') { color = '#94a3b8'; icon = '·'; }
            else { color = '#d1d5db'; icon = '-'; }
            html += '<td style="padding: 10px; color: ' + color + '; font-weight: 700;">' + icon + ' ' + (c.value !== 0 ? (c.value > 0 ? '+' : '') + c.value.toFixed(2) : '-') + '</td>';
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<p style="text-align: center; color: #94a3b8; font-size: 0.78rem; margin-top: 8px;">基于Pearson相关系数 | 正值表示正相关，负值表示负相关</p></div>';
    return html;
}

function drawSubtypeDoughnutChart(subtypeCounts) {
    var canvas = document.getElementById('subtypeDoughnut');
    if (!canvas || typeof Chart === 'undefined') return;
    var ctx = canvas.getContext('2d');
    var labels = Object.keys(subtypeCounts).map(function(s) { return categoryNames[s] || s; });
    var data = Object.values(subtypeCounts);
    var colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, pointStyleWidth: 10 } }
            },
            cutout: '55%'
        }
    });
}

function drawStackedBarChart(records, dimConfig) {
    var canvas = document.getElementById('stackedBarChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (!records || records.length === 0) return;
    var ctx = canvas.getContext('2d');
    var labels = records.map(function(r) { return r.date || ''; });
    var colors = ['#ef4444', '#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6', '#f97316'];
    var datasets = dimConfig.map(function(dim, i) {
        return {
            label: dim.name,
            data: records.map(function(r) { return r.riskScores[dim.key] || 0; }),
            backgroundColor: colors[i],
            borderColor: colors[i],
            borderWidth: 0,
            barPercentage: 0.8
        };
    });
    new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 45 } },
                y: { stacked: true, max: 600, title: { display: true, text: '累计风险评分' } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } },
                tooltip: { mode: 'index' }
            }
        }
    });
}

export function updateComparisonView() {
    const container = document.getElementById('comparisonContent');
    if (!container) return;
    
    if (!currentUser || !historicalData[currentUser.username] || historicalData[currentUser.username].length < 2) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; background: white; border-radius: 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📊</div>
                <div style="font-size: 1.3rem; font-weight: 600; color: #666; margin-bottom: 10px;">暂无历史数据</div>
                <div style="color: #999;">请先完成至少两次检测，即可查看历史对比和趋势分析</div>
            </div>
        `;
        return;
    }
    
    const sortedData = [...historicalData[currentUser.username]].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    var HISTORY_LIMIT = 10;
    var allDataForBadge = sortedData;
    var hasMore = hasMoreData(sortedData, HISTORY_LIMIT);
    var displayData = hasMore ? limitHistoricalData(sortedData, HISTORY_LIMIT) : sortedData;

    let filteredData = displayData;
    if (currentTimeRange !== 'all') {
        var now2 = Date.now();
        var rangeMs = currentTimeRange === 'week' ? 7 * 86400000 : currentTimeRange === 'month' ? 30 * 86400000 : currentTimeRange === 'quarter' ? 90 * 86400000 : 365 * 86400000;
        filteredData = displayData.filter(function(r) { return new Date(r.timestamp).getTime() >= now2 - rangeMs; });
        if (filteredData.length < 2) filteredData = displayData.slice(-2);
    }

    const latestRecord = filteredData[filteredData.length - 1];
    const firstRecord = filteredData[0];
    
    const riskChange = latestRecord.overallRisk - firstRecord.overallRisk;
    const riskChangePercent = firstRecord.overallRisk !== 0 ? ((riskChange / firstRecord.overallRisk) * 100).toFixed(1) : '0.0';
    const riskTrend = riskChange > 0 ? '上升' : riskChange < 0 ? '下降' : '稳定';
    const riskTrendColor = riskChange > 0 ? '#e74c3c' : riskChange < 0 ? '#00b894' : '#6c757d';
    
    let html = `
        <!-- 导出按钮 -->
        <div style="text-align: center; margin-bottom: 30px;" class="fade-in">
            <button onclick="exportComparisonReport()" class="gradient-btn" style="font-size: 1rem;">
                📄 导出历史对比(PDF)
            </button>
        </div>

        <!-- 时间范围选择器 -->
        <div class="viz-time-range" id="comparisonTimeRange">
            <button onclick="setComparisonTimeRange('all', this)" class="active">📅 全部</button>
            <button onclick="setComparisonTimeRange('week', this)">📌 近1周</button>
            <button onclick="setComparisonTimeRange('month', this)">📅 近1月</button>
            <button onclick="setComparisonTimeRange('quarter', this)">📊 近3月</button>
            <button onclick="setComparisonTimeRange('year', this)">📆 近1年</button>
        </div>
        
        <!-- 总体风险趋势分析 -->
        <div class="data-card fade-in" style="margin-bottom: 35px; padding: 35px;">
            <h3 class="section-title" style="font-size: 1.5rem; margin-bottom: 30px;">📈 总体风险趋势分析</h3>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 35px;">
                <!-- 风险变化摘要 -->
                <div class="gradient-card" style="padding: 30px;">
                    <h4 style="color: #1a2980; margin-bottom: 25px; font-size: 1.2rem;">📊 风险变化摘要</h4>
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">首次检测风险</div>
                        <div class="stat-number">${firstRecord.overallRisk.toFixed(1)}</div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">最新检测风险</div>
                        <div class="stat-number">${latestRecord.overallRisk.toFixed(1)}</div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">风险变化</div>
                        <div class="stat-number" style="color: ${riskTrendColor};">
                            ${riskChange > 0 ? '+' : ''}${riskChange.toFixed(1)} (${riskChangePercent > 0 ? '+' : ''}${riskChangePercent}%)
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">变化趋势</div>
                        <span class="status-badge ${riskTrend === '下降' ? 'status-good' : riskTrend === '上升' ? 'status-danger' : 'status-warning'}">
                            ${riskTrend}
                        </span>
                    </div>
                </div>
                
                <!-- 总体风险趋势图 -->
                <div class="chart-wrapper" style="padding: 25px;">
                    <h4 style="color: #1a2980; margin-bottom: 20px; font-size: 1.2rem;">📉 总体风险趋势</h4>
                    <canvas id="trendChart" width="600" height="300"></canvas>
                    <p style="font-size: 0.9rem; color: #888; margin-top: 15px; background: #f8f9fa; padding: 12px; border-radius: 10px;">
                        💡 图表显示了您的总体风险评分变化趋势，虚线表示高风险阈值(60分)
                    </p>
                    <div id="predictionBanner"></div>
                </div>
            </div>
        </div>
        
        <!-- 历史检测记录对比 -->
        <div class="table-container fade-in" style="margin-bottom: 35px;">
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px; padding: 0 30px;">📋 历史检测记录对比</h3>
            <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px;" class="comparison-table">
            <table style="min-width: 900px;">
                <thead>
                    <tr>
                        <th>检测日期</th>
                        <th>总体风险</th>
                        <th>vs上次</th>
                        <th>氨基酸代谢</th>
                        <th>碳水化合物代谢</th>
                        <th>有机酸与TCA</th>
                        <th>含硫化合物</th>
                        <th>含氮化合物</th>
                        <th>外源物代谢</th>
                        <th>识别的模式</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    const reverseSortedData = [...filteredData].reverse();
    
    var totalPages = Math.ceil(reverseSortedData.length / COMPARISON_PAGE_SIZE);
    if (comparisonPage >= totalPages) comparisonPage = 0;
    var startIdx = comparisonPage * COMPARISON_PAGE_SIZE;
    var pageData = reverseSortedData.slice(startIdx, startIdx + COMPARISON_PAGE_SIZE);
    
    pageData.forEach((record, index) => {
        const actualIndex = startIdx + index;
        const prevRecord = reverseSortedData[actualIndex + 1];
        const trend = prevRecord ? 
            (record.overallRisk > prevRecord.overallRisk ? 'trend-up' : 
             record.overallRisk < prevRecord.overallRisk ? 'trend-down' : 'trend-stable') : '';
        const trendIcon = trend === 'trend-up' ? '↑' : trend === 'trend-down' ? '↓' : '→';
        const trendColor = trend === 'trend-up' ? '#e74c3c' : trend === 'trend-down' ? '#00b894' : '#6c757d';
        
        const subtypeNames = record.subtypes.map(function(s) { return categoryNames[s] || s; }).join('、');
        
        const changeFromPrev = prevRecord ? (record.overallRisk - prevRecord.overallRisk) : null;
        
        const highlightClass = (val) => val > 60 ? '#fee2e2' : 'transparent';
        const highlightColor = (val) => val > 60 ? '#dc2626' : 'inherit';
        const highlightWeight = (val) => val > 60 ? '700' : 'inherit';
        
        html += `
            <tr style="transition: background 0.2s ease;">
                <td style="font-weight: 600;">${record.date}</td>
                <td style="color: ${trendColor}; font-weight: 700;">
                    ${record.overallRisk.toFixed(1)} <span style="font-size: 1.2rem;">${trendIcon}</span>
                </td>
                <td style="font-weight: 700; color: ${changeFromPrev !== null ? (changeFromPrev > 0 ? '#e74c3c' : changeFromPrev < 0 ? '#00b894' : '#6c757d') : '#ccc'};">
                    ${changeFromPrev !== null ? (changeFromPrev > 0 ? '↑ +' : changeFromPrev < 0 ? '↓ ' : '→ ') + Math.abs(changeFromPrev).toFixed(1) : '-'}
                </td>
                <td style="background: ${highlightClass(record.riskScores.amino_acid)}; color: ${highlightColor(record.riskScores.amino_acid)}; font-weight: ${highlightWeight(record.riskScores.amino_acid)};">${record.riskScores.amino_acid.toFixed(0)}</td>
                <td style="background: ${highlightClass(record.riskScores.carbohydrate)}; color: ${highlightColor(record.riskScores.carbohydrate)}; font-weight: ${highlightWeight(record.riskScores.carbohydrate)};">${record.riskScores.carbohydrate.toFixed(0)}</td>
                <td style="background: ${highlightClass(record.riskScores.organic_acid)}; color: ${highlightColor(record.riskScores.organic_acid)}; font-weight: ${highlightWeight(record.riskScores.organic_acid)};">${record.riskScores.organic_acid.toFixed(0)}</td>
                <td style="background: ${highlightClass(record.riskScores.sulfur)}; color: ${highlightColor(record.riskScores.sulfur)}; font-weight: ${highlightWeight(record.riskScores.sulfur)};">${record.riskScores.sulfur.toFixed(0)}</td>
                <td style="background: ${highlightClass(record.riskScores.nitrogen)}; color: ${highlightColor(record.riskScores.nitrogen)}; font-weight: ${highlightWeight(record.riskScores.nitrogen)};">${record.riskScores.nitrogen.toFixed(0)}</td>
                <td style="background: ${highlightClass(record.riskScores.xenobiotic)}; color: ${highlightColor(record.riskScores.xenobiotic)}; font-weight: ${highlightWeight(record.riskScores.xenobiotic)};">${record.riskScores.xenobiotic.toFixed(0)}</td>
                <td>${subtypeNames}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>' +
            '</div>';

    if (totalPages > 1) {
        html += '<div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 15px; flex-wrap: wrap;">';
        html += '<button onclick="changeComparisonPage(' + (comparisonPage - 1) + ')" ' + (comparisonPage === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : '') + ' style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e0e6ed; background: white; cursor: pointer; font-size: 0.85rem;">◀ 上一页</button>';
        html += '<span style="font-size: 0.85rem; color: #666; padding: 0 8px;">第 ' + (comparisonPage + 1) + ' / ' + totalPages + ' 页 (共 ' + reverseSortedData.length + ' 条)</span>';
        html += '<button onclick="changeComparisonPage(' + (comparisonPage + 1) + ')" ' + (comparisonPage >= totalPages - 1 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : '') + ' style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e0e6ed; background: white; cursor: pointer; font-size: 0.85rem;">下一页 ▶</button>';
        html += '</div>';
    }

    html += '</div>';
    
    html += '<div class="viz-card fade-in" style="margin-bottom: 35px;"><h3 class="section-title">📊 六维度历史变化堆积图</h3><div class="chart-wrapper" style="position: relative; height: 400px;"><canvas id="stackedBarChart"></canvas></div></div>';
    
    html += `
        <div class="chart-container fade-in" style="margin-bottom: 35px; padding: 35px;">
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">📊 各维度风险趋势</h3>
            <div style="margin-bottom: 25px; background: #f0f4ff; padding: 15px 20px; border-radius: 12px; border-left: 4px solid #26d0ce;">
                <p style="color: #555; font-size: 0.95rem; margin: 0;">
                    💡 以下图表显示了各个代谢维度的风险评分变化趋势，帮助您了解哪些方面需要重点关注
                </p>
            </div>
            <div class="chart-wrapper">
            <canvas id="dimensionTrendChart" width="800" height="400"></canvas>
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="toggleDimensionChartType('line')" class="chart-type-btn active" id="btnChartLine" style="padding: 8px 20px; border-radius: 20px 0 0 20px; border: 1px solid #26d0ce; background: linear-gradient(135deg, #1a2980, #26d0ce); color: white; cursor: pointer; font-weight: 600; font-size: 0.85rem;">📈 折线图</button>
                <button onclick="toggleDimensionChartType('bar')" class="chart-type-btn" id="btnChartBar" style="padding: 8px 20px; border-radius: 0 20px 20px 0; border: 1px solid #26d0ce; background: white; color: #1a2980; cursor: pointer; font-weight: 600; font-size: 0.85rem; margin-left: -1px;">📊 柱状图</button>
            </div>
        </div>
    `;
    
    html += `
        <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">🎯 关键指标变化分析</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 35px;">
    `;
    
    var dimensions = [
        { key: 'amino_acid', name: '氨基酸代谢', icon: '🧬', description: '反映蛋白质代谢及氨基酸代谢通路状态' },
        { key: 'carbohydrate', name: '碳水化合物代谢', icon: '🍬', description: '反映糖酵解及糖原代谢通路状态' },
        { key: 'organic_acid', name: '有机酸与TCA循环', icon: '⚡', description: '反映线粒体能量代谢效率' },
        { key: 'sulfur', name: '含硫化合物代谢', icon: '🧪', description: '反映抗氧化防御系统状态' },
        { key: 'nitrogen', name: '含氮化合物代谢', icon: '🧫', description: '反映核苷酸及肌酸代谢通路状态' },
        { key: 'xenobiotic', name: '外源物代谢', icon: '💊', description: '反映肝脏Ⅱ相解毒功能' }
    ];
    
    dimensions.forEach(dimension => {
        const firstValue = firstRecord.riskScores[dimension.key];
        const latestValue = latestRecord.riskScores[dimension.key];
        const change = latestValue - firstValue;
        const changePercent = firstValue !== 0 ? ((change / firstValue) * 100).toFixed(1) : '0.0';
        const dimensionTrend = change > 0 ? '上升' : change < 0 ? '下降' : '稳定';
        const dimensionTrendColor = change > 0 ? '#e74c3c' : change < 0 ? '#00b894' : '#6c757d';
        const bgGradient = change < 0 ? 
            'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)' : 
            change > 0 ? 
            'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' : 
            'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)';
        
        html += `
            <div class="data-card fade-in" style="background: ${bgGradient}; border-left: 5px solid ${dimensionTrendColor};">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
                    <div class="icon-container ${change < 0 ? 'icon-green' : change > 0 ? 'icon-red' : 'icon-orange'}" style="width: 50px; height: 50px; font-size: 24px; margin: 0;">
                        ${dimension.icon}
                    </div>
                    <h4 style="color: #1a2980; margin: 0; font-size: 1.2rem;">${dimension.name}</h4>
                </div>
                <p style="color: #777; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">${dimension.description}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 0.85rem; color: #888; margin-bottom: 5px;">首次检测</div>
                        <div style="font-weight: 700; color: #1a2980; font-size: 1.3rem;">${firstValue.toFixed(0)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: #888; margin-bottom: 5px;">最新检测</div>
                        <div style="font-weight: 700; color: #1a2980; font-size: 1.3rem;">${latestValue.toFixed(0)}</div>
                    </div>
                </div>
                <div style="border-top: 1px solid rgba(224, 230, 237, 0.8); padding-top: 15px;">
                    <div style="font-size: 0.85rem; color: #888; margin-bottom: 5px;">变化</div>
                    <div style="font-weight: 700; color: ${dimensionTrendColor}; font-size: 1.25rem;">
                        ${change > 0 ? '+' : ''}${change.toFixed(0)} (${changePercent > 0 ? '+' : ''}${changePercent}%)
                    </div>
                </div>
                <div style="margin-top: 12px;">
                    <span class="status-badge ${dimensionTrend === '下降' ? 'status-good' : dimensionTrend === '上升' ? 'status-danger' : 'status-warning'}">
                        ${dimensionTrend}
                    </span>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    var subtypeCounts = {};
    filteredData.forEach(function(r) {
        r.subtypes.forEach(function(s) {
            subtypeCounts[s] = (subtypeCounts[s] || 0) + 1;
        });
    });
    if (Object.keys(subtypeCounts).length > 0) {
        html += '<div class="viz-card fade-in" style="margin-bottom: 35px;"><h3 class="section-title">🍩 通路覆盖分布</h3><div class="chart-wrapper" style="max-width: 400px; margin: 0 auto;"><canvas id="subtypeDoughnut"></canvas></div></div>';
    }
    
    html += generateCorrelationHTML();

    html += '<div class="heatmap-container fade-in"><h3 class="section-title" style="font-size:1.4rem;margin-bottom:20px;">🔬 代谢指标相关性热图</h3><div id="correlationHeatmap"></div></div>';

    container.innerHTML = html;

    if (hasMore) {
        showHistoryLimitBadge(container, allDataForBadge, HISTORY_LIMIT, function() {
            window._showAllHistory = true;
            updateComparisonView();
        });
    }

    setTimeout(() => {
        window._compFilteredData = filteredData;
        renderWithObserver('trendChart', function() { drawTrendChart(filteredData); });
        renderWithObserver('dimensionTrendChart', function() { drawDimensionTrendChart(filteredData); });
        renderWithObserver('correlationHeatmap', function() { drawCorrelationHeatmap('correlationHeatmap', sortedData, ''); });
        var dimConfig = [
            { key: 'amino_acid', name: '氨基酸代谢' },
            { key: 'carbohydrate', name: '碳水化合物代谢' },
            { key: 'organic_acid', name: '有机酸与TCA循环' },
            { key: 'sulfur', name: '含硫化合物代谢' },
            { key: 'nitrogen', name: '含氮化合物代谢' },
            { key: 'xenobiotic', name: '外源物代谢' }
        ];
        renderWithObserver('stackedBarChart', function() { drawStackedBarChart(filteredData, dimConfig); });
        renderWithObserver('subtypeDoughnut', function() { drawSubtypeDoughnutChart(subtypeCounts); });
        var trendCanvas = document.getElementById('trendChart');
        if (trendCanvas && trendCanvas._futurePrediction) {
            var pred = trendCanvas._futurePrediction;
            var lastData = sortedData;
            var lastRisk = lastData.length > 0 ? lastData[lastData.length - 1].overallRisk : 0;
            var diff = (pred - lastRisk).toFixed(1);
            var isWarn = pred >= 60;
            var banner = document.getElementById('predictionBanner');
            if (banner) {
                banner.innerHTML = '<div class="prediction-banner' + (isWarn ? ' warn' : '') + '">' +
                    '<div class="prediction-icon">' + (isWarn ? '⚠️' : '📈') + '</div>' +
                    '<div><div class="prediction-text">若按当前趋势，1个月后风险评分将达</div>' +
                    '<div class="prediction-value">' + pred.toFixed(1) + ' 分</div>' +
                    '<div style="font-size:0.78rem;color:#64748b;margin-top:2px;">当前: ' + lastRisk.toFixed(1) + ' | 预测变化: ' + (diff > 0 ? '+' : '') + diff + '</div></div></div>';
            }
        } else {
            var banner2 = document.getElementById('predictionBanner');
            if (banner2 && sortedData.length <= 5) {
                banner2.innerHTML = '<div class="prediction-banner" style="border-color:#94a3b8;background:linear-gradient(135deg,#f8fafc,#f1f5f9);"><div class="prediction-icon">📊</div><div class="prediction-text" style="color:#64748b;">需要至少6条历史记录才能生成预测趋势</div></div>';
            }
        }
    }, 200);
}

var currentTimeRange = 'all';
var comparisonPage = 0;
var COMPARISON_PAGE_SIZE = 10;

var currentChartType = 'line';

function toggleDimensionChartType(type) {
    currentChartType = type;
    document.getElementById('btnChartLine').style.background = type === 'line' ? 'linear-gradient(135deg, #1a2980, #26d0ce)' : 'white';
    document.getElementById('btnChartLine').style.color = type === 'line' ? 'white' : '#1a2980';
    document.getElementById('btnChartBar').style.background = type === 'bar' ? 'linear-gradient(135deg, #1a2980, #26d0ce)' : 'white';
    document.getElementById('btnChartBar').style.color = type === 'bar' ? 'white' : '#1a2980';
    var filteredData = window._compFilteredData || [];
    drawDimensionTrendChart(filteredData);
}

window.toggleDimensionChartType = toggleDimensionChartType;
window._compFilteredData = null;

export function setComparisonTimeRange(range, btn) {
    currentTimeRange = range;
    comparisonPage = 0;
    var buttons = document.querySelectorAll('#comparisonTimeRange button');
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    updateComparisonView();
}

export function changeComparisonPage(page) {
    comparisonPage = Math.max(0, page);
    updateComparisonView();
}

window.changeComparisonPage = changeComparisonPage;

export function computeLinearRegression(data) {
    var n = data.length;
    if (n < 3) return null;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;
    var rSquared = 0;
    var meanY = sumY / n;
    var ssRes = 0, ssTot = 0;
    for (var i = 0; i < n; i++) {
        var predicted = slope * i + intercept;
        ssRes += Math.pow(data[i] - predicted, 2);
        ssTot += Math.pow(data[i] - meanY, 2);
    }
    rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    return { slope: slope, intercept: intercept, rSquared: rSquared, predict: function(x) { return slope * x + intercept; } };
}

export function drawTrendChart(filteredData) {
    var ctx = document.getElementById('trendChart');
    if (!ctx || !currentUser || !historicalData[currentUser.username]) return;

    var chartCtx = ctx.getContext('2d');
    if (!chartCtx) return;

    if (ctx._chartInstance) { ctx._chartInstance.destroy(); }

    var allData = filteredData && filteredData.length > 0 
        ? [...filteredData].sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); })
        : [...historicalData[currentUser.username]].sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    var labels = allData.map(function(d) { return d.date; });
    var data = allData.map(function(d) { return d.overallRisk; });

    var datasets = [];
    var abnormalZoneData = allData.map(function(d) { return d.overallRisk > 60 ? d.overallRisk : 60; });

    datasets.push({
        label: '高风险区间',
        data: abnormalZoneData,
        borderColor: 'transparent',
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        pointRadius: 0,
        fill: 1,
        tension: 0.4,
        spanGaps: true
    });

    var pointColors = allData.map(function(d) { return d.overallRisk > 60 ? '#ef4444' : '#6366f1'; });
    var borderColor = allData.some(function(d) { return d.overallRisk > 60; }) ? '#ef4444' : '#6366f1';

    datasets.push({
        label: '总体风险评分',
        data: data,
        borderColor: borderColor,
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: 6,
        pointHoverRadius: 9,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true
    });

    var reg = computeLinearRegression(data);
    var hasPrediction = reg && data.length > 5 && reg.rSquared > 0.2;
    var futurePrediction = null;

    if (hasPrediction) {
        var lastIndex = data.length - 1;
        var predData = [];
        for (var i = 0; i <= lastIndex; i++) predData.push(null);
        var predIndexVal = lastIndex + 2;
        var predValue = Math.max(0, Math.min(100, reg.predict(predIndexVal)));
        predData.push(predValue);
        futurePrediction = predValue;
        var starRadius = new Array(predData.length).fill(0);
        starRadius[predData.length - 1] = 10;
        var starStyle = new Array(predData.length).fill('circle');
        starStyle[predData.length - 1] = 'star';
        datasets.push({
            label: '趋势预测',
            data: predData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2.5,
            borderDash: [8, 4],
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#f59e0b',
            pointRadius: starRadius,
            pointStyle: starStyle,
            tension: 0,
            fill: false,
            spanGaps: true
        });
    }

    var chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { stepSize: 20 },
                    title: { display: true, text: '风险评分', font: { weight: 'bold' } },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            if (futurePrediction && context[0].dataIndex >= allData.length) {
                                var trend = reg.slope > 0 ? '上升' : '下降';
                                var diff = (futurePrediction - data[data.length - 1]).toFixed(1);
                                return ['预测方向: ' + trend, '预计变化: ' + (diff > 0 ? '+' : '') + diff + ' 分'];
                            }
                            return [];
                        }
                    }
                },
                annotation: {
                    annotations: {
                        thresholdLine: {
                            type: 'line',
                            yMin: 60,
                            yMax: 60,
                            borderColor: 'rgba(239, 68, 68, 0.6)',
                            borderWidth: 2,
                            borderDash: [6, 4],
                            label: { content: '高风险阈值(60)', enabled: true, position: 'end', backgroundColor: 'rgba(239,68,68,0.9)', color: 'white', font: { weight: 'bold' } }
                        }
                    }
                }
            }
        }
    });

    ctx._chartInstance = chartInstance;
    ctx._futurePrediction = futurePrediction;
}

export function drawDimensionTrendChart(filteredData) {
    const ctx = document.getElementById('dimensionTrendChart');
    if (!ctx || !currentUser || !historicalData[currentUser.username]) return;
    
    const sortedData = (filteredData && filteredData.length > 0 ? [...filteredData] : [...historicalData[currentUser.username]]).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const labels = sortedData.map(d => d.date);
    
    var dimensionConfig = [
        { key: 'amino_acid', label: '氨基酸代谢', color: 'rgba(54, 162, 235, 1)', icon: '🧬' },
        { key: 'carbohydrate', label: '碳水化合物代谢', color: 'rgba(255, 206, 86, 1)', icon: '🍬' },
        { key: 'organic_acid', label: '有机酸与TCA循环', color: 'rgba(75, 192, 192, 1)', icon: '⚡' },
        { key: 'sulfur', label: '含硫化合物代谢', color: 'rgba(153, 102, 255, 1)', icon: '🧪' },
        { key: 'nitrogen', label: '含氮化合物代谢', color: 'rgba(255, 99, 132, 1)', icon: '🧫' },
        { key: 'xenobiotic', label: '外源物代谢', color: 'rgba(255, 159, 64, 1)', icon: '💊' }
    ];
    
    if (ctx._dimChartInstance) { ctx._dimChartInstance.destroy(); }
    ctx._dimChartInstance = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: dimensionConfig.map(config => ({
                label: `${config.icon} ${config.label}`,
                data: sortedData.map(d => d.riskScores[config.key]),
                borderColor: config.color,
                backgroundColor: config.color.replace('1)', '0.1)'),
                pointBackgroundColor: config.color,
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true
            }))
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                                if (context.parsed.y > 60) {
                                    label += ' (高风险)';
                                } else if (context.parsed.y > 30) {
                                    label += ' (中等风险)';
                                } else {
                                    label += ' (低风险)';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '风险评分'
                    }
                }
            }
        }
    });
}

export function drawCorrelationHeatmap(containerId, records, timeLabel) {
    var container = document.getElementById(containerId);
    if (!container || !records || records.length < 2) {
        if (container) container.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">需要至少2条历史记录才能计算相关性</div>';
        return;
    }

    var keyMetrics = [];
    var fpData = window.metaboliteData || [];
    fpData.forEach(function(m) {
        keyMetrics.push({ id: m.id, name: m.name });
    });

    var n = keyMetrics.length;
    var matrix = [];
    for (var i = 0; i < n; i++) {
        matrix[i] = [];
        for (var j = 0; j < n; j++) {
            var xVals = [], yVals = [];
            for (var k = 0; k < records.length; k++) {
                var r = records[k];
                var xv = r.data ? r.data[keyMetrics[i].id] : r[keyMetrics[i].id];
                var yv = r.data ? r.data[keyMetrics[j].id] : r[keyMetrics[j].id];
                if (xv !== undefined && xv !== null && yv !== undefined && yv !== null) {
                    xVals.push(xv); yVals.push(yv);
                }
            }
            matrix[i][j] = calcPearsonCorrelation(xVals, yVals);
        }
    }

    var gridCols = n + 1;
    var html = '<div class="heatmap-grid" style="grid-template-columns: 80px repeat(' + n + ', minmax(48px, 1fr));">';
    html += '<div class="heatmap-label"></div>';
    for (var j = 0; j < n; j++) {
        html += '<div class="heatmap-label" style="font-size:0.65rem;writing-mode:vertical-lr;text-orientation:mixed;">' + keyMetrics[j].name + '</div>';
    }
    for (var i = 0; i < n; i++) {
        html += '<div class="heatmap-label">' + keyMetrics[i].name + '</div>';
        for (var j = 0; j < n; j++) {
            var corr = matrix[i][j];
            var color, textColor;
            if (corr === null || isNaN(corr)) {
                color = '#e2e8f0'; textColor = '#cbd5e1';
            } else {
                var t = (corr + 1) / 2;
                if (Math.abs(corr) < 0.05) { color = '#fff'; textColor = '#94a3b8'; }
                else if (corr > 0) { var g = Math.round(255 * (1 - t)); color = 'rgb(' + g + ', ' + g + ', 255)'; textColor = t > 0.6 ? '#fff' : '#1e293b'; }
                else { var g2 = Math.round(255 * t); color = 'rgb(255, ' + g2 + ', ' + g2 + ')'; textColor = t < 0.4 ? '#fff' : '#1e293b'; }
            }
            var opacity = Math.abs(corr || 0) < 0.1 ? '0.3' : '1';
            html += '<div class="heatmap-cell" style="background:' + color + ';color:' + textColor + ';opacity:' + opacity + ';" title="' + keyMetrics[i].name + ' vs ' + keyMetrics[j].name + ': r=' + (corr !== null && !isNaN(corr) ? corr.toFixed(3) : 'N/A') + '">' + (i === j ? '1' : (corr !== null && !isNaN(corr) ? corr.toFixed(2) : '-')) + '</div>';
        }
    }
    html += '</div>';
    html += '<div class="heatmap-legend"><span>负相关</span><div class="heatmap-legend-bar"></div><span>正相关</span></div>';
    html += '<p style="text-align:center;color:#94a3b8;font-size:0.78rem;margin-top:4px;">基于' + records.length + '条 ' + (timeLabel || '历史') + ' 数据的Pearson相关系数 | 越接近±1相关性越强</p>';
    container.innerHTML = html;
}

export function calcPearsonCorrelation(x, y) {
    var n = x.length;
    if (n < 3) return null;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += x[i]; sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];
    }
    var num = n * sumXY - sumX * sumY;
    var den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : num / den;
}