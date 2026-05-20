import { metaboliteData, categoryNames } from './config.js';
import { currentUser, currentResult } from './auth.js';
import { drawRiskRadarChart, drawAbnormalChart, drawRiskTrendChart, drawConcentrationBarChart, drawStatusPieChart, drawPathwayDoughnutChart, drawDeviationChart } from './visualization.js';
import { showNotification } from './notifications.js';
import { renderPathwayNetwork, renderVideoEmbed, createBubbleEffect } from './visual-effects.js';

export let ttsUtterance = null;
export let ttsPlaying = false;

export function renderReport(result, containerId) {
    if (!result || result.overallRisk === undefined) return;
    containerId = containerId || 'reportContent';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const riskLevel = result.overallRisk < 30 ? 'low' : result.overallRisk < 60 ? 'moderate' : 'high';
    const riskText = result.overallRisk < 30 ? '状况良好' : result.overallRisk < 60 ? '建议调整' : '需要关注';
    const riskColor = result.overallRisk < 30 ? '#10b981' : result.overallRisk < 60 ? '#f59e0b' : '#ef4444';
    const riskDescription = getRiskDescription(result.overallRisk, result.pathwayScores);
    
    let html = `
        <div class="report-container">
            <!-- ====== 报告锚点导航栏 ====== -->
            <div id="reportNav" style="position: sticky; top: 94px; z-index: 99; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; padding: 12px 18px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1.5px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 700; color: #1a2980; font-size: 0.85rem; white-space: nowrap;">📑 目录</span>
                <a href="#" onclick="scrollToSection('overall'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">总体评估</a>
                <a href="#" onclick="scrollToSection('dimensions'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">维度分析</a>
                <a href="#" onclick="scrollToSection('abnormal'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">异常指标</a>
                <a href="#" onclick="scrollToSection('recommendations'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">健康建议</a>
                <span style="flex:1;"></span>
            </div>
            
            <!-- ====== 快捷操作栏 ====== -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px; justify-content: center; flex-wrap: wrap;">
                <button onclick="saveReportAsPDF()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #1a2980, #26d0ce); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(26,41,128,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(26,41,128,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(26,41,128,0.25)'">
                    📥 保存为PDF
                </button>
                <button onclick="exportReportAsWord()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(37,99,235,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(37,99,235,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(37,99,235,0.25)'">
                    📝 导出Word
                </button>
                <button onclick="generateHealthCard()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(16,185,129,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(16,185,129,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(16,185,129,0.25)'">
                    💚 生成健康卡片
                </button>
                <button onclick="generateShareLink()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(245,158,11,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(245,158,11,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(245,158,11,0.25)'">
                    🔗 分享报告
                </button>
                <button id="ttsButton" onclick="toggleReportTTS()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(139,92,246,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(139,92,246,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(139,92,246,0.25)'">
                    🔊 收听报告概要
                </button>
            </div>
            
            <!-- ====== 第1节：总体风险评估 ====== -->
            <div id="report-section-overall" class="risk-score-card fade-in report-card-hover breathe-anim" style="border-radius: 25px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);" onclick="if(typeof createBubbleEffect==='function')createBubbleEffect(this)">
                <h3 class="section-title" style="color: white; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 15px; margin-bottom: 35px; font-size: 1.4rem;">
                    🎯 总体风险评估
                </h3>
                <div class="score-display">
                    <div class="heart-container">
                        <svg class="heart-svg" viewBox="0 0 450 450" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:${riskColor};stop-opacity:1" />
                                    <stop offset="50%" style="stop-color:${riskColor};stop-opacity:0.85" />
                                    <stop offset="100%" style="stop-color:${riskColor};stop-opacity:0.7" />
                                </linearGradient>
                                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="7.5" dy="7.5" stdDeviation="12" flood-opacity="0.4"/>
                                </filter>
                            </defs>
                            <path d="M225 405 C225 405 45 270 45 157.5 C45 90 90 45 157.5 45 C191.25 45 213.75 67.5 225 90 C236.25 67.5 258.75 45 292.5 45 C337.5 45 382.5 90 382.5 157.5 C382.5 270 225 405 225 405 Z" 
                                  fill="url(#heartGradient)" filter="url(#shadow)" stroke="#fff" stroke-width="4.5"/>
                            <ellipse cx="146.25" cy="180" rx="56.25" ry="78.75" fill="rgba(255,255,255,0.15)" />
                            <ellipse cx="303.75" cy="180" rx="56.25" ry="78.75" fill="rgba(255,255,255,0.15)" />
                            <path d="M157.5 56.25 Q135 22.5 112.5 33.75" stroke="${riskColor}" stroke-width="9" fill="none" stroke-linecap="round"/>
                            <path d="M292.5 56.25 Q315 22.5 337.5 33.75" stroke="${riskColor}" stroke-width="9" fill="none" stroke-linecap="round"/>
                            <polyline points="67.5,225 101.25,225 112.5,191.25 135,258.75 157.5,213.75 180,225 213.75,225" 
                                      fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
                            <circle cx="225" cy="225" r="90" fill="white"/>
                            <circle cx="225" cy="225" r="82.5" fill="none" stroke="${riskColor}" stroke-width="4.5"/>
                        </svg>
                        <div class="score-overlay">
                            <div class="score-value" style="font-size: 3.5rem;">${result.overallRisk.toFixed(1)}</div>
                            <div class="score-label" style="font-size: 1.1rem; font-weight: 600;">风险评分</div>
                        </div>
                    </div>
                    <div class="risk-level risk-${riskLevel}" style="padding: 12px 30px; font-size: 1.3rem; border-radius: 30px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); background: ${riskColor};">
                        ${riskText}
                    </div>
                    <!-- 风险进度条 -->
                    <div style="margin-top: 16px; width: 100%; max-width: 400px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: rgba(255,255,255,0.8); margin-bottom: 4px;">
                            <span>0 · 状况良好</span><span>60 · 建议调整</span><span>100 · 需要关注</span>
                        </div>
                        <div style="height: 8px; background: rgba(255,255,255,0.25); border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(result.overallRisk, 100)}%; background: ${riskColor}; border-radius: 4px; transition: width 1s ease;"></div>
                        </div>
                    </div>
                    <p style="margin-top: 20px; color: rgba(255,255,255,0.9); font-size: 1rem; background: rgba(255,255,255,0.15); padding: 10px 25px; border-radius: 20px; display: inline-block;">
                        📅 检测日期: ${result.date}
                    </p>
                </div>
            </div>
            
            <!-- 评估结论 -->
            <div id="report-section-conclusion" class="data-card reveal-section fade-in" style="margin-bottom: 30px;">
                <h4 class="chart-title" style="font-size: 1.3rem; margin-bottom: 20px;">📋 评估结论</h4>
                <div style="padding: 25px; background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%); border-radius: 18px; border-left: 5px solid #26d0ce;">
                    <p style="line-height: 1.9; color: #2c3e50; font-size: 1.1rem;">${riskDescription}</p>
                </div>
            </div>
    `;
    
    // 健康摘要统计卡片
    var totalMatched = result.matchResults ? result.matchResults.length : 0;
    var normalCount = 0, lowCnt = 0, highCnt = 0;
    if (result.matchResults) {
        result.matchResults.forEach(function(m) {
            if (m.status === 'normal') normalCount++;
            else if (m.status === 'low') lowCnt++;
            else if (m.status === 'high') highCnt++;
        });
    }
    var pathwayCount = 0;
    if (result.pathwayScores) {
        Object.values(result.pathwayScores).forEach(function(v) { if (v > 0) pathwayCount++; });
    }

    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:30px;">';
    html += '<div class="data-card reveal-section" style="text-align:center;padding:24px 16px;background:linear-gradient(135deg,#eff6ff,#ffffff);border:2px solid #dbeafe;"><div style="font-size:2rem;margin-bottom:6px;">🧪</div><div style="font-size:2rem;font-weight:800;color:#1e40af;">' + totalMatched + '</div><div style="color:#64748b;font-size:0.9rem;font-weight:600;">检测代谢物</div></div>';
    html += '<div class="data-card reveal-section" style="text-align:center;padding:24px 16px;background:linear-gradient(135deg,#f0fdf4,#ffffff);border:2px solid #bbf7d0;"><div style="font-size:2rem;margin-bottom:6px;">✅</div><div style="font-size:2rem;font-weight:800;color:#16a34a;">' + normalCount + '</div><div style="color:#64748b;font-size:0.9rem;font-weight:600;">正常指标</div></div>';
    html += '<div class="data-card reveal-section" style="text-align:center;padding:24px 16px;background:linear-gradient(135deg,#fef2f2,#ffffff);border:2px solid #fecaca;"><div style="font-size:2rem;margin-bottom:6px;">🔴</div><div style="font-size:2rem;font-weight:800;color:#dc2626;">' + (lowCnt + highCnt) + '</div><div style="color:#64748b;font-size:0.9rem;font-weight:600;">异常指标</div></div>';
    html += '<div class="data-card reveal-section" style="text-align:center;padding:24px 16px;background:linear-gradient(135deg,#fefce8,#ffffff);border:2px solid #fde68a;"><div style="font-size:2rem;margin-bottom:6px;">🗺️</div><div style="font-size:2rem;font-weight:800;color:#ca8a04;">' + pathwayCount + '</div><div style="color:#64748b;font-size:0.9rem;font-weight:600;">涉及通路</div></div>';
    html += '</div>';

    // ====== 第2节：多维度代谢风险分析（含进度条） ======
    html += `
        <div id="report-section-dimensions">
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">📊 多维度代谢风险分析</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 35px;">
                <div class="chart-container fade-in" style="border-radius: 20px;">
                    <h4 class="chart-title" style="font-size: 1.15rem; margin-bottom: 20px;">📈 风险分布雷达图</h4>
                    <canvas id="riskRadarChart" width="400" height="300"></canvas>
                </div>
                <div class="chart-container fade-in" style="border-radius: 20px;">
                    <h4 class="chart-title" style="font-size: 1.15rem; margin-bottom: 20px;">🎯 异常指标分布</h4>
                    <canvas id="statusPieChart" width="400" height="300"></canvas>
                </div>
            </div>
        </div>
    `;

    // ====== 代谢物浓度对比图（横向柱状图）======
    html += `
    <div class="data-card reveal-section report-card-hover" style="padding: 30px; margin-bottom: 35px;">
        <h3 class="section-title" style="font-size: 1.2rem; margin-bottom: 20px;">📊 代谢物浓度对比（偏离参考范围前10项）</h3>
        <canvas id="concentrationBarChart" style="max-height:400px;"></canvas>
    </div>`;

    // ====== 代谢物偏离度波士顿图（横向柱状瀑布图）======
    html += `
    <div class="data-card reveal-section report-card-hover" style="padding: 30px; margin-bottom: 35px;">
        <h3 class="section-title" style="font-size: 1.2rem; margin-bottom: 20px;">📉 代谢物偏离参考范围程度（偏离前12项）</h3>
        <p style="color:#64748b;font-size:0.85rem;margin-bottom:16px;">蓝色柱 = 低于参考范围 | 红色柱 = 高于参考范围 | 偏离越远越深</p>
        <canvas id="deviationChart" style="max-height:420px;"></canvas>
    </div>`;

    // ====== 异常通路分布（环形图）======
    html += `
    <div class="data-card reveal-section report-card-hover" style="padding: 30px; margin-bottom: 35px;">
        <h3 class="section-title" style="font-size: 1.2rem; margin-bottom: 20px;">📊 异常指标通路分布</h3>
        <canvas id="pathwayDoughnutChart" style="max-height:380px;"></canvas>
    </div>`;
    
    // ====== 六大代谢通路健康总览 ======
    html += `
<div class="data-card reveal-section report-card-hover" style="padding: 30px; margin-bottom: 35px;">
    <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">🩺 六大代谢通路健康总览</h3>
    <div id="pathwayNetwork" style="min-height:300px;"></div>
    <p style="text-align:center;color:#94a3b8;font-size:0.85rem;margin-top:8px;">一目了然您的代谢健康状况 | 🟢 健康 🟡 关注 🔴 建议就医</p>
</div>`;
    
    // 风险进度条卡片
    html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px;">`;
    const dimNames = { amino_acid: '氨基酸代谢', carbohydrate: '碳水化合物代谢', organic_acid: '有机酸代谢', sulfur: '含硫化合物代谢', nitrogen: '含氮化合物代谢', xenobiotic: '外源物代谢' };
    const dimIcons = { amino_acid: '🧬', carbohydrate: '🍯', organic_acid: '🧪', sulfur: '🛡️', nitrogen: '⚗️', xenobiotic: '💊' };
    Object.entries(result.pathwayScores).forEach(([key, score]) => {
        const dColor = score < 30 ? '#10b981' : score < 60 ? '#f59e0b' : '#ef4444';
        const dText = score < 30 ? '良好' : score < 60 ? '注意' : '关注';
        html += `<div class="data-card reveal-section" style="text-align: center;">
            <div style="font-size: 1.5rem;">${dimIcons[key] || '📊'}</div>
            <div style="font-weight: 700; color: #1e293b; margin: 6px 0;">${dimNames[key] || key}</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: ${dColor};">${score.toFixed(0)}</div>
            <div style="height: 6px; background: #e2e8f0; border-radius: 3px; margin: 8px 0; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(score, 100)}%; background: ${dColor}; border-radius: 3px; transition: width 1s ease;"></div>
            </div>
            <div style="font-weight: 700; font-size: 0.8rem; color: ${dColor};">${dText}</div>
        </div>`;
    });
    // ====== 第六节：代谢指纹参考库 ======
    html += generateFingerprintReferenceSection();

    html += `</div>`;
    
    // 关键指标摘要卡片
    html += generateKeyMetricsSummary(result);
    
    // ====== 第3节：异常指标 ======
    if (result.matchResults && result.matchResults.length > 0) {
        html += `<div id="report-section-abnormal">`;
        html += generateDetailedAbnormalAnalysis(result.matchResults, result);
        html += `</div>`;
    }
    
    // 所有检测指标完整列表
    html += generateCompleteMetaboliteList(result.matchResults, result);
    
    // 亚健康状态识别
    html += generateDetailedSubtypeAnalysis(result);
    
    // 健康趋势预测
    html += generateHealthTrendPrediction(result);
    
    // 个性化干预方案时间线
    html += generateInterventionTimeline(result);
    
    // ====== 视频解读 ======
    html += `
<div class="data-card reveal-section report-card-hover" style="padding: 30px; margin-bottom: 35px;">
    <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">🎬 代谢组学深度解读</h3>
    <div id="videoEmbed" style="max-width:720px;margin:0 auto;"></div>
</div>`;
    
    // ====== 第4节：健康建议 ======
    html += `<div id="report-section-recommendations">`;
    html += generateFollowUpRecommendations(result);
    html += `</div>`;
    
    html += `</div>`;
    container.innerHTML = html;
    
    setTimeout(function() {
    if (typeof renderPathwayNetwork === 'function') {
        renderPathwayNetwork('pathwayNetwork', result.pathwayScores || result.riskScores, result.matchResults || result.abnormalMetabolites);
    }
    if (typeof renderVideoEmbed === 'function') {
        renderVideoEmbed('videoEmbed');
    }
    if (typeof window._reObserveScrollReveal === 'function') {
        window._reObserveScrollReveal();
    }
}, 300);
    
    // 存储当前报告数据供导出和TTS使用
    window._currentReportData = result;
    
    // 绘制图表
    setTimeout(() => {
        drawRiskRadarChart(result.pathwayScores);
        if (result.matchResults && result.matchResults.length > 0) {
            drawAbnormalChart(result.matchResults);
            drawConcentrationBarChart(result.matchResults);
            drawDeviationChart(result.matchResults);
        }
        drawStatusPieChart(result.matchResults || []);
        drawPathwayDoughnutChart(result.matchResults || []);
        drawRiskTrendChart(result.overallRisk);
    }, 300);
}

export function getRiskDescription(overallRisk, riskScores) {
    const highRiskDimensions = Object.entries(riskScores)
        .filter(([key, value]) => value > 60)
        .map(([key]) => categoryNames[key] || key);
    
    if (overallRisk < 30) {
        return `您的代谢健康状况良好，综合评分为${overallRisk.toFixed(1)}分，处于安全区间。` +
               `各维度代谢指标基本正常，建议继续保持当前的健康生活方式，定期进行体检监测。`;
    } else if (overallRisk < 60) {
        let desc = `您的代谢健康综合评分为${overallRisk.toFixed(1)}分，部分指标需要关注。`;
        if (highRiskDimensions.length > 0) {
            desc += `建议重点关注以下方面：${highRiskDimensions.join('、')}。`;
        }
        desc += `可以参考报告中的个性化建议适当调整生活方式，建议3-6个月后复查相关指标。`;
        return desc;
    } else {
        let desc = `您的代谢健康综合评分为${overallRisk.toFixed(1)}分，多项指标需要重视。`;
        if (highRiskDimensions.length > 0) {
            desc += `以下维度需要特别关注：${highRiskDimensions.join('、')}。`;
        }
        desc += `建议近期咨询专业医生，制定针对性的干预方案，并定期监测相关指标变化。`;
        return desc;
    }
}

export function generateDimensionAnalysis(riskScores) {
    const analysis = [];
    const dimensionNames = {
        amino_acid: '氨基酸代谢',
        carbohydrate: '碳水化合物代谢',
        organic_acid: '有机酸代谢',
        sulfur: '含硫化合物代谢',
        nitrogen: '含氮化合物代谢',
        xenobiotic: '外源物代谢'
    };
    
    const dimensionDesc = {
        amino_acid: '反映蛋白质代谢及肝脏功能',
        carbohydrate: '反映糖代谢及能量利用效率',
        organic_acid: '反映TCA循环及线粒体功能',
        sulfur: '反映氧化应激及解毒功能',
        nitrogen: '反映核苷酸代谢及肾脏功能',
        xenobiotic: '反映肝脏解毒及外源物代谢'
    };
    
    Object.entries(riskScores).forEach(([key, value]) => {
        let status, color;
        if (value < 30) { status = '正常'; color = '#10b981'; }
        else if (value < 60) { status = '需关注'; color = '#f59e0b'; }
        else { status = '建议就医'; color = '#ef4444'; }
        
        analysis.push(`
            <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 10px; border-left: 4px solid ${color};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong style="color: #1a2980;">${dimensionNames[key]}</strong>
                    <span style="color: ${color}; font-weight: 600;">${value.toFixed(0)}分 - ${status}</span>
                </div>
                <div style="font-size: 0.85rem; color: #666;">${dimensionDesc[key]}</div>
                <div style="margin-top: 8px; height: 6px; background: #e0e6ed; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${value}%; height: 100%; background: ${color}; border-radius: 3px; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `);
    });
    
    return analysis.join('');
}

export function generateKeyMetricsSummary(result) {
    const matchResults = result.matchResults || [];
    if (matchResults.length === 0) return '';

    if (result.isConcentrationMode) {
        var topEntries = matchResults.slice(0, 6);
        return `
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">📈 代谢物浓度速览</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 35px;">
                ${topEntries.map(function(m) {
                    var statusColor = m.status === 'normal' ? '#10b981' : m.status === 'low' ? '#3b82f6' : m.status === 'high' ? '#ef4444' : '#94a3b8';
                    var statusText = m.status === 'normal' ? '✅ 正常' : m.status === 'low' ? '⬇️ 偏低' : m.status === 'high' ? '⬆️ 偏高' : '⚪ 待确认';
                    var refText = '--';
                    if (m.refMin !== undefined && m.refMax !== undefined) {
                        refText = m.refMin + ' - ' + m.refMax + ' ' + (m.unit || '');
                    }
                    return '<div class="data-card reveal-section fade-in" style="background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border: 2px solid ' + statusColor + '; padding: 16px; border-radius: 12px;">' +
                        '<div style="font-weight: 700; color: #1a2980; margin-bottom: 6px; font-size: 0.95rem;">' + m.name + '</div>' +
                        '<div style="display: flex; gap: 12px; font-size: 0.8rem; color: #64748b; margin-bottom: 6px;">' +
                            '<span>浓度: <b>' + m.concentration + ' ' + (m.unit || 'μmol/L') + '</b></span>' +
                            '<span>参考: <b>' + refText + '</b></span>' +
                        '</div>' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
                            '<span style="font-weight: 600; color: ' + statusColor + ';">' + statusText + '</span>' +
                            '<span style="font-size: 0.75rem; color: #94a3b8;">' + (m.hmdb || '') + '</span>' +
                        '</div>' +
                        '<div style="font-size: 0.78rem; color: #64748b; margin-bottom: 4px;">' +
                            '<span style="background: #eef2ff; padding: 2px 8px; border-radius: 4px;">' + (m.pathway || '') + '</span>' +
                        '</div>' +
                        '<div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 4px;">' + ((m.significance || '').substring(0, 80)) + '...</div>' +
                    '</div>';
                }).join('')}
            </div>
        `;
    }

    const topMatches = matchResults.slice(0, 6);
    
    return `
        <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">📈 代谢指纹匹配速览</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 35px;">
            ${topMatches.map(m => {
                const devColor = m.deviation < 0.1 ? '#10b981' : m.deviation < 0.3 ? '#f59e0b' : '#ef4444';
                return `
                <div class="data-card reveal-section fade-in" style="background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border: 2px solid ${devColor}; padding: 16px; border-radius: 12px;">
                    <div style="font-weight: 700; color: #1a2980; margin-bottom: 6px; font-size: 0.95rem;">${m.name}</div>
                    <div style="display: flex; gap: 12px; font-size: 0.8rem; color: #64748b; margin-bottom: 6px;">
                        <span>观测m/z: <b>${m.userMz.toFixed(4)}</b></span>
                        <span>参考m/z: <b>${m.matchedMz.toFixed(4)}</b></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-weight: 600; color: ${devColor};">偏差: ${m.deviation.toFixed(4)} Da</span>
                        <span style="font-size: 0.75rem; color: #94a3b8;">${m.hmdb} · ${m.ionMode}</span>
                    </div>
                    <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 4px;">
                        <span style="background: #eef2ff; padding: 2px 8px; border-radius: 4px;">${categoryNames[m.category] || m.category}</span>
                        <span style="margin-left: 4px; background: #f0fdf4; padding: 2px 8px; border-radius: 4px;">${m.pathway}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 4px;">${(m.significance || '').substring(0, 80)}...</div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

export function generateDetailedAbnormalAnalysis(matchResults, result) {
    var isConcentrationMode = result && result.isConcentrationMode;

    if (isConcentrationMode) {
        var normalCount = matchResults.filter(function(m) { return m.status === 'normal'; }).length;
        var lowCount = matchResults.filter(function(m) { return m.status === 'low'; }).length;
        var highCount = matchResults.filter(function(m) { return m.status === 'high'; }).length;

        return `
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">🔍 代谢物浓度分析详情</h3>
            <div class="chart-container fade-in" style="margin-bottom: 25px; border-radius: 20px;">
                <h4 class="chart-title" style="font-size: 1.15rem; margin-bottom: 20px;">📊 浓度状态分布概览</h4>
                <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;padding:16px;">
                    <div style="text-align:center;padding:16px 24px;background:#f0fdf4;border-radius:12px;border:2px solid #10b981;">
                        <div style="font-size:2rem;font-weight:700;color:#10b981;">${normalCount}</div>
                        <div style="font-size:0.85rem;color:#065f46;">正常</div>
                    </div>
                    <div style="text-align:center;padding:16px 24px;background:#dbeafe;border-radius:12px;border:2px solid #3b82f6;">
                        <div style="font-size:2rem;font-weight:700;color:#3b82f6;">${lowCount}</div>
                        <div style="font-size:0.85rem;color:#1e40af;">偏低</div>
                    </div>
                    <div style="text-align:center;padding:16px 24px;background:#fee2e2;border-radius:12px;border:2px solid #ef4444;">
                        <div style="font-size:2rem;font-weight:700;color:#ef4444;">${highCount}</div>
                        <div style="font-size:0.85rem;color:#991b1b;">偏高</div>
                    </div>
                </div>
            </div>
            <div class="table-container fade-in" style="margin-bottom: 35px;">
                <table>
                    <thead>
                        <tr>
                            <th>代谢物名称</th>
                            <th>浓度值</th>
                            <th>参考范围</th>
                            <th>状态</th>
                            <th>代谢通路</th>
                            <th>生物学意义</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matchResults.map(function(m) {
                            var statusColor = m.status === 'normal' ? '#10b981' : m.status === 'low' ? '#3b82f6' : m.status === 'high' ? '#ef4444' : '#94a3b8';
                            var statusText = m.status === 'normal' ? '✅ 正常' : m.status === 'low' ? '⬇️ 偏低' : m.status === 'high' ? '⬆️ 偏高' : '⚪ 待确认';
                            var refText = '--';
                            if (m.refMin !== undefined && m.refMax !== undefined) {
                                refText = m.refMin + ' - ' + m.refMax + ' ' + (m.unit || '');
                            }
                            return '<tr style="transition: background 0.2s ease;">' +
                                '<td style="font-weight: 700; color: #1a2980;">' + m.name + '</td>' +
                                '<td style="text-align: center; font-weight: 600;">' + m.concentration + ' ' + (m.unit || 'μmol/L') + '</td>' +
                                '<td style="text-align: center; color: #666;">' + refText + '</td>' +
                                '<td style="text-align: center;"><span style="font-weight: 700; color: ' + statusColor + ';">' + statusText + '</span></td>' +
                                '<td style="text-align: left; font-size: 0.85rem; color: #555;">' + (m.pathway || '') + '</td>' +
                                '<td style="text-align: left; font-size: 0.8rem; color: #666; max-width: 250px;">' + (m.significance || '-') + '</td>' +
                            '</tr>';
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">🔍 代谢指纹匹配结果</h3>
        <div class="chart-container fade-in" style="margin-bottom: 25px; border-radius: 20px;">
            <h4 class="chart-title" style="font-size: 1.15rem; margin-bottom: 20px;">📊 质谱指纹匹配概览</h4>
            <canvas id="abnormalChart" width="400" height="250"></canvas>
        </div>
        <div class="table-container fade-in" style="margin-bottom: 35px;">
            <table>
                <thead>
                    <tr>
                        <th>代谢物名称</th>
                        <th>观测m/z</th>
                        <th>参考m/z</th>
                        <th>偏差(%)</th>
                        <th>HMDB</th>
                        <th>离子模式</th>
                        <th>代谢通路</th>
                        <th>生物学意义</th>
                    </tr>
                </thead>
                <tbody>
                    ${matchResults.map((m, index) => {
                        const devColor = m.deviation < 0.1 ? '#10b981' : m.deviation < 0.3 ? '#f59e0b' : '#ef4444';
                        return `
                            <tr style="transition: background 0.2s ease;">
                                <td style="font-weight: 700; color: #1a2980;">${m.name}</td>
                                <td style="text-align: center; font-weight: 600;">${m.userMz.toFixed(4)}</td>
                                <td style="text-align: center; color: #666;">${m.matchedMz.toFixed(4)}</td>
                                <td style="text-align: center;">
                                    <span class="status-badge ${m.deviation < 0.1 ? 'status-success' : m.deviation < 0.3 ? 'status-warning' : 'status-danger'}" style="color: ${devColor}; font-weight: 700;">
                                        ${m.deviation.toFixed(4)} Da
                                    </span>
                                </td>
                                <td style="text-align: center; font-size: 0.85rem;">${m.hmdb}</td>
                                <td style="text-align: center; font-size: 0.85rem;">${m.ionMode}</td>
                                <td style="text-align: left; font-size: 0.85rem; color: #555;">${m.pathway}</td>
                                <td style="text-align: left; font-size: 0.8rem; color: #666; max-width: 250px;">${m.significance || '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function generateCompleteMetaboliteList(data, result) {
    var matchResults = data || [];
    if (matchResults.length === 0) return '';

    var isConcentrationMode = result && result.isConcentrationMode;
    var titleText = isConcentrationMode ? '完整代谢物浓度列表' : '完整代谢指纹匹配列表';

    var pathwayGroups = {};
    matchResults.forEach(function(m) {
        var key = m.pathway || '未分类';
        if (!pathwayGroups[key]) pathwayGroups[key] = [];
        pathwayGroups[key].push(m);
    });

    return `
        <h3 class="section-title">${titleText}</h3>
        <div style="margin-bottom: 30px;">
            ${Object.entries(pathwayGroups).map(function(_entry) {
                var pathway = _entry[0];
                var metabolites = _entry[1];
                return '<div style="background: white; border-radius: 15px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 15px rgba(0,0,0,0.06);">' +
                    '<div style="background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; padding: 15px 20px;">' +
                        '<h4 style="margin: 0; font-size: 1.1rem;">' + pathway + ' (' + metabolites.length + '个匹配)</h4>' +
                    '</div>' +
                    '<div style="padding: 16px;">' +
                        '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;">' +
                            metabolites.map(function(m) {
                                if (isConcentrationMode) {
                                    var statusColor = m.status === 'normal' ? '#10b981' : m.status === 'low' ? '#3b82f6' : m.status === 'high' ? '#ef4444' : '#94a3b8';
                                    var statusText = m.status === 'normal' ? '正常' : m.status === 'low' ? '偏低' : m.status === 'high' ? '偏高' : '待确认';
                                    var refText = '--';
                                    if (m.refMin !== undefined && m.refMax !== undefined) {
                                        refText = m.refMin + '-' + m.refMax + ' ' + (m.unit || 'μmol/L');
                                    }
                                    return '<div style="padding: 12px; background: ' + (m.status === 'normal' ? '#f0fff4' : m.status === 'low' ? '#eff6ff' : m.status === 'high' ? '#fff5f5' : '#f8fafc') + '; border-radius: 10px; border: 1px solid ' + statusColor + ';">' +
                                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
                                            '<span style="font-weight: 600; color: #1a2980; font-size: 0.9rem;">' + m.name + '</span>' +
                                            '<span style="font-weight: 700; color: ' + statusColor + '; font-size: 0.85rem;">' + statusText + '</span>' +
                                        '</div>' +
                                        '<div style="font-size: 0.75rem; color: #666;">' +
                                            '浓度: <b>' + m.concentration + ' ' + (m.unit || 'μmol/L') + '</b> · 参考: ' + refText +
                                        '</div>' +
                                        '<div style="font-size: 0.72rem; color: #999; margin-top: 4px;">' + ((m.significance || '').substring(0, 60)) + '...</div>' +
                                    '</div>';
                                } else {
                                    var devColor = m.deviation < 0.1 ? '#10b981' : m.deviation < 0.3 ? '#f59e0b' : '#ef4444';
                                    return '<div style="padding: 12px; background: ' + (m.deviation < 0.1 ? '#f0fff4' : m.deviation < 0.3 ? '#fffbeb' : '#fff5f5') + '; border-radius: 10px; border: 1px solid ' + devColor + ';">' +
                                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
                                            '<span style="font-weight: 600; color: #1a2980; font-size: 0.9rem;">' + m.name + '</span>' +
                                            '<span style="font-weight: 700; color: ' + devColor + '; font-size: 0.85rem;">' + m.deviation.toFixed(4) + ' Da</span>' +
                                        '</div>' +
                                        '<div style="font-size: 0.75rem; color: #666;">' +
                                            m.hmdb + ' · ' + m.ionMode + ' · 观测m/z=' + m.userMz.toFixed(4) + ' · 参考m/z=' + m.matchedMz.toFixed(4) +
                                        '</div>' +
                                        '<div style="font-size: 0.72rem; color: #999; margin-top: 4px;">' + ((m.significance || '').substring(0, 60)) + '...</div>' +
                                    '</div>';
                                }
                            }).join('') +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('')}
        </div>
    `;
}

export function generateDetailedSubtypeAnalysis(result) {
    const pathwayPatterns = result.pathwayPatterns || [];
    const matchResults = result.matchResults || [];
    
    if (pathwayPatterns.length === 0) {
        return `
            <h3 class="section-title">代谢通路模式评估</h3>
            <div style="background: linear-gradient(135deg, #f0fff4 0%, #ffffff 100%); padding: 30px; border-radius: 20px; border: 2px solid #00b894; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                    <div style="width: 60px; height: 60px; background: #00b894; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">✓</div>
                    <div>
                        <h4 style="color: #00b894; margin: 0; font-size: 1.3rem;">代谢通路模式正常</h4>
                        <p style="color: #666; margin: 5px 0 0 0;">未检测到显著的代谢通路异常模式</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.8;">${result && result.isConcentrationMode ? '根据本次代谢物浓度检测结果，各代谢通路指标均处于正常参考范围，未发现明显的代谢通路紊乱。' : '根据本次质谱指纹检测结果，各代谢通路的化合物匹配均处于正常范围，未发现明显的代谢通路紊乱。'}建议继续保持健康的生活方式，包括均衡饮食、规律运动、充足睡眠等。建议每6-12个月进行一次代谢健康检查。</p>
            </div>
        `;
    }
    
    let html = `<h3 class="section-title">代谢通路模式分析</h3>`;
    
    pathwayPatterns.forEach((pattern, index) => {
        const pName = pattern.name || `模式${index + 1}`;
        const pDesc = pattern.description || '';
        const pPathways = pattern.pathways || [];
        const pScore = pattern.score || 0;
        const severityColor = pScore > 60 ? '#ef4444' : pScore > 30 ? '#f59e0b' : '#10b981';
        const severityText = pScore > 60 ? '需关注' : pScore > 30 ? '建议调整' : '正常';
        
        const relatedMatches = matchResults.filter(m => pPathways.includes(m.pathway));
        
        html += `
            <div style="background: white; border-radius: 20px; padding: 30px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); animation: fadeIn 0.5s ease-in-out;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: 700;">${index + 1}</div>
                    <div>
                        <h4 style="color: #1a2980; margin: 0; font-size: 1.2rem;">${pName}</h4>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 0.9rem;">${pDesc}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #1a2980;">严重程度</span>
                        <span style="font-weight: 700; color: ${severityColor};">${severityText} (${pScore.toFixed(0)}分)</span>
                    </div>
                    <div style="height: 8px; background: #e0e6ed; border-radius: 4px; margin-top: 8px; overflow: hidden;">
                        <div style="height: 100%; width: ${Math.min(pScore, 100)}%; background: ${severityColor}; border-radius: 4px;"></div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h5 style="color: #1a2980; margin-bottom: 12px; font-size: 0.95rem;">涉及代谢通路</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${pPathways.map(pw => `<span style="background: #eef2ff; padding: 4px 12px; border-radius: 16px; font-size: 0.8rem; color: #1a2980; font-weight: 600;">${pw}</span>`).join('')}
                    </div>
                </div>
                
                ${relatedMatches.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <h5 style="color: #1a2980; margin-bottom: 12px; font-size: 0.95rem;">相关代谢物匹配</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
                        ${relatedMatches.slice(0, 6).map(m => {
                            const devColor = m.deviation < 0.1 ? '#10b981' : m.deviation < 0.3 ? '#f59e0b' : '#ef4444';
                            return `
                            <div style="padding: 10px; background: ${m.deviation < 0.1 ? '#f0fff4' : m.deviation < 0.3 ? '#fffbeb' : '#fff5f5'}; border-radius: 8px; border-left: 3px solid ${devColor}; font-size: 0.8rem;">
                                <div style="font-weight: 600; color: #1a2980;">${m.name}</div>
                                <div style="color: #666; margin-top: 2px;">${m.hmdb} · 偏差${m.deviation.toFixed(4)} Da</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div style="background: linear-gradient(135deg, #e6f7f0 0%, #f0fff4 100%); padding: 16px; border-radius: 12px;">
                        <div style="font-size: 1.2rem; margin-bottom: 6px;">🥗</div>
                        <h6 style="color: #1a2980; margin-bottom: 8px; font-size: 0.9rem;">饮食建议</h6>
                        <p style="font-size: 0.8rem; color: #555; line-height: 1.6; margin: 0;">${pattern.dietAdvice || '建议保持均衡饮食，增加新鲜蔬菜和水果摄入，减少高脂肪和高糖食物。'}</p>
                    </div>
                    <div style="background: linear-gradient(135deg, #e6f7ff 0%, #f0f8ff 100%); padding: 16px; border-radius: 12px;">
                        <div style="font-size: 1.2rem; margin-bottom: 6px;">🏃</div>
                        <h6 style="color: #1a2980; margin-bottom: 8px; font-size: 0.9rem;">运动建议</h6>
                        <p style="font-size: 0.8rem; color: #555; line-height: 1.6; margin: 0;">${pattern.exerciseAdvice || '建议每周进行至少150分钟中等强度有氧运动，如快走、游泳等。'}</p>
                    </div>
                    <div style="background: linear-gradient(135deg, #fff4e6 0%, #fff8f0 100%); padding: 16px; border-radius: 12px;">
                        <div style="font-size: 1.2rem; margin-bottom: 6px;">🏠</div>
                        <h6 style="color: #1a2980; margin-bottom: 8px; font-size: 0.9rem;">生活方式</h6>
                        <p style="font-size: 0.8rem; color: #555; line-height: 1.6; margin: 0;">${pattern.lifestyleAdvice || '保持充足睡眠，每天7-8小时，避免熬夜，管理压力水平。'}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

export function generateHealthTrendPrediction(result) {
    const predictions = [];
    const ps = result.pathwayScores || {};
    
    if (ps.carbohydrate > 50) {
        const riskLevel = ps.carbohydrate > 70 ? '高' : '中';
        const years = ps.carbohydrate > 70 ? '3-5' : '5-10';
        predictions.push({
            type: 'warning',
            title: '碳水化合物代谢异常风险',
            content: `根据当前碳水化合物代谢通路异常，如不进行干预，未来${years}年内发展为代谢综合征的风险较${riskLevel}。建议采取饮食控制和运动干预，定期监测相关指标变化。`,
            icon: '🍯'
        });
    }
    
    if (ps.organic_acid > 50) {
        const riskLevel = ps.organic_acid > 70 ? '高' : '中';
        predictions.push({
            type: 'warning',
            title: '有机酸与线粒体功能异常',
            content: `有机酸代谢异常提示TCA循环或线粒体功能可能出现紊乱，风险程度${riskLevel}。建议关注能量代谢健康，必要时在医生指导下进行进一步检查。`,
            icon: '🧪'
        });
    }
    
    if (ps.nitrogen > 50) {
        predictions.push({
            type: 'caution',
            title: '含氮化合物代谢异常',
            content: '含氮化合物代谢异常可能反映核苷酸代谢或肾功能相关通路紊乱。建议关注蛋白质摄入量和肾功能指标，适当调整饮食结构。',
            icon: '⚗️'
        });
    }
    
    if (ps.amino_acid > 50) {
        predictions.push({
            type: 'caution',
            title: '氨基酸代谢异常',
            content: '氨基酸代谢通路异常可能影响蛋白质代谢和肝脏功能。建议适当优化蛋白质来源，注意饮食均衡性。',
            icon: '🧬'
        });
    }
    
    if (ps.xenobiotic > 50) {
        predictions.push({
            type: 'caution',
            title: '外源物代谢负担',
            content: '外源物代谢通路异常提示肝脏解毒功能可能受到影响。建议减少环境毒素暴露，增加抗氧化食物摄入。',
            icon: '💊'
        });
    }
    
    if (ps.sulfur > 50) {
        predictions.push({
            type: 'caution',
            title: '含硫化合物代谢异常',
            content: '含硫化合物代谢异常可能影响氧化应激防御和解毒功能。建议增加富含含硫氨基酸的食物摄入，如蛋类、十字花科蔬菜等。',
            icon: '🛡️'
        });
    }
    
    if (predictions.length === 0) {
        predictions.push({
            type: 'success',
            title: '健康趋势良好',
            content: '根据当前代谢指标，您的健康状况稳定。继续保持现有的健康生活方式，定期进行健康检查，以维持良好的代谢状态。',
            icon: '✅'
        });
    }
    
    return `
        <h3 class="section-title">健康趋势预测与风险评估</h3>
        <div style="margin-bottom: 30px;">
            <!-- 风险趋势图表 -->
            <div class="chart-container" style="margin-bottom: 30px;">
                <h4 class="chart-title">风险趋势预测</h4>
                <canvas id="riskTrendChart" width="800" height="300"></canvas>
            </div>
            
            <!-- 详细风险评估 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${predictions.map(p => `
                    <div style="background: ${p.type === 'warning' ? 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)' : p.type === 'caution' ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #f0fff4 0%, #d1fae5 100%)'}; 
                                    padding: 25px; border-radius: 15px; border-left: 5px solid ${p.type === 'warning' ? '#e74c3c' : p.type === 'caution' ? '#f39c12' : '#00b894'};">
                        <h4 style="color: ${p.type === 'warning' ? '#e74c3c' : p.type === 'caution' ? '#f39c12' : '#00b894'}; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                            <span>${p.icon}</span>
                            ${p.title}
                        </h4>
                        <p style="color: #555; line-height: 1.7; margin: 0;">${p.content}</p>
                    </div>
                `).join('')}
            </div>
            
            <!-- 健康风险时间线预测 -->
            <div style="margin-top: 30px; padding: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 15px;">
                <h4 style="color: #1a2980; margin-bottom: 20px;">健康风险时间线预测</h4>
                <div style="position: relative; padding-left: 30px;">
                    <!-- 时间线 -->
                    <div style="position: absolute; left: 10px; top: 0; bottom: 0; width: 2px; background: #1a2980;"></div>
                    
                    <!-- 时间点 -->
                    <div style="margin-bottom: 20px; position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: #1a2980; border: 3px solid white; box-shadow: 0 0 0 2px #1a2980;"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">当前状态</h5>
                        <p style="margin: 0; color: #555;">综合风险评分: ${result.overallRisk.toFixed(1)}分</p>
                    </div>
                    
                    <div style="margin-bottom: 20px; position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'}; border: 3px solid white; box-shadow: 0 0 0 2px ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'};"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">6个月后 (如不干预)</h5>
                        <p style="margin: 0; color: #555;">预测风险评分: ${(result.overallRisk * 1.1).toFixed(1)}分</p>
                    </div>
                    
                    <div style="margin-bottom: 20px; position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'}; border: 3px solid white; box-shadow: 0 0 0 2px ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'};"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">1年后 (如不干预)</h5>
                        <p style="margin: 0; color: #555;">预测风险评分: ${(result.overallRisk * 1.2).toFixed(1)}分</p>
                    </div>
                    
                    <div style="position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: #00b894; border: 3px solid white; box-shadow: 0 0 0 2px #00b894;"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">1年后 (如积极干预)</h5>
                        <p style="margin: 0; color: #555;">预测风险评分: ${Math.max(10, (result.overallRisk * 0.8).toFixed(1))}分</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function generateInterventionTimeline(result) {
    // 根据风险评分调整干预强度
    const riskLevel = result.overallRisk < 30 ? 'low' : result.overallRisk < 60 ? 'moderate' : 'high';
    
    return `
        <h3 class="section-title">个性化干预方案时间线</h3>
        <div style="background: white; border-radius: 20px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <!-- 干预方案概览 -->
            <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px;">
                <h4 style="color: #1a2980; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <span>📋</span> 干预方案概览
                </h4>
                <p style="color: #555; margin-bottom: 15px;">根据您的代谢健康评估结果，我们为您定制了以下干预方案。方案强度为 <span style="font-weight: 600; color: ${riskLevel === 'high' ? '#e74c3c' : riskLevel === 'moderate' ? '#f39c12' : '#00b894'};">${riskLevel === 'high' ? '高强度' : riskLevel === 'moderate' ? '中等强度' : '低强度'}</span>，包含四个阶段的逐步干预。</p>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <div style="flex: 1; text-align: center; padding: 10px; background: #f0f4ff; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: #666;">预计完成时间</div>
                        <div style="font-weight: 600; color: #1a2980;">3+ 个月</div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 10px; background: #f0f4ff; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: #666;">预期效果</div>
                        <div style="font-weight: 600; color: #1a2980;">代谢健康改善</div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 10px; background: #f0f4ff; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: #666;">复查建议</div>
                        <div style="font-weight: 600; color: #1a2980;">3个月后</div>
                    </div>
                </div>
            </div>
            
            <!-- 详细时间线 -->
            <div style="position: relative; padding-left: 40px;">
                <!-- 时间线 -->
                <div style="position: absolute; left: 18px; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #1a2980 0%, #26d0ce 100%); border-radius: 2px;"></div>
                
                <!-- 第1-2周：建立基础 -->
                <div style="margin-bottom: 30px; position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #1a2980; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #1a2980; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>🏁</span> 第1-2周：建立基础
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #e3f2fd; padding: 5px 10px; border-radius: 12px;">开始阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">生活习惯记录</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">详细记录每日饮食、运动和作息时间，建立健康基线数据</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">轻度运动</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每天30分钟步行，每周5-7次，逐渐增加活动量</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">饮食调整</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">减少加工食品和高糖食品摄入，增加蔬菜水果比例</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">作息规律</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">建立规律的作息时间，保证7-8小时睡眠</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #1a2980 0%, #26d0ce 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第3-4周：强化干预 -->
                <div style="margin-bottom: 30px; position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #26d0ce; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #e8f5e8 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #26d0ce; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>💪</span> 第3-4周：强化干预
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #e8f5e8; padding: 5px 10px; border-radius: 12px;">强化阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">运动强度提升</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每周3-4次中等强度运动，每次45分钟，如快走、游泳或骑自行车</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">饮食方案执行</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">严格执行个性化饮食方案，控制碳水化合物和脂肪摄入</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">压力管理</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">学习并实践压力管理技巧，如冥想、深呼吸或瑜伽</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">指标监测</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每周监测体重、血压和血糖变化，记录在健康日记中</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #26d0ce 0%, #00b894 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第2-3个月：巩固效果 -->
                <div style="margin-bottom: 30px; position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #00b894; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #00b894; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>📈</span> 第2-3个月：巩固效果
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #fff3e0; padding: 5px 10px; border-radius: 12px;">巩固阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">效果评估</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">评估生活方式改变的效果，分析体重、血压和血糖变化趋势</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">方案调整</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">根据效果评估结果，调整饮食和运动方案，优化干预策略</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">力量训练</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">加入力量训练，每周2-3次，增强肌肉量，提高基础代谢率</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">指标复查</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">复查关键代谢指标，如血脂、血糖和炎症标志物</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #00b894 0%, #4caf50 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 长期维护（3个月后） -->
                <div style="position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #f39c12; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #f3e5f5 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #f39c12; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>🌱</span> 长期维护（3个月后）
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #f3e5f5; padding: 5px 10px; border-radius: 12px;">维护阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">生活方式保持</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">保持健康的生活方式，将良好习惯融入日常生活</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">定期监测</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每3-6个月监测代谢指标，及时发现潜在问题</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">饮食优化</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">持续优化饮食结构，根据季节和身体状况调整</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">运动习惯</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">建立长期运动习惯，保持规律的体育锻炼</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #f39c12 0%, #ff5722 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 干预方案总结 -->
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); border-radius: 12px; text-align: center;">
                <h4 style="color: #1a2980; margin-bottom: 15px;">干预方案执行建议</h4>
                <p style="color: #555; margin-bottom: 15px;">坚持执行个性化干预方案，定期监测健康指标变化，根据需要调整方案。</p>
                <button onclick="downloadInterventionPlan()" style="padding: 10px 25px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">
                    📥 下载干预方案
                </button>
            </div>
        </div>
    `;
}

export function generateFollowUpRecommendations(result) {
    const highRiskItems = Object.entries(result.pathwayScores)
        .filter(([key, value]) => value > 50)
        .map(([key]) => categoryNames[key]);
    
    // 根据风险评分确定复查时间和频率
    let followUpTime, followUpFrequency, followUpColor;
    if (result.overallRisk > 60) {
        followUpTime = '1-3个月';
        followUpFrequency = '每2周监测一次关键指标';
        followUpColor = '#e74c3c';
    } else if (result.overallRisk > 30) {
        followUpTime = '3-6个月';
        followUpFrequency = '每月监测一次关键指标';
        followUpColor = '#f39c12';
    } else {
        followUpTime = '6-12个月';
        followUpFrequency = '每3个月监测一次关键指标';
        followUpColor = '#00b894';
    }
    
    // 生成具体的监测项目列表
    const getMonitoringItems = () => {
        if (highRiskItems.length > 0) {
            return highRiskItems.map(item => {
                let items = '';
                switch(item) {
                    case '氨基酸代谢':
                        items = '支链氨基酸、苯丙氨酸、酪氨酸、谷氨酰胺';
                        break;
                    case '碳水化合物代谢':
                        items = '赤藓糖醇、D-葡萄糖指纹峰、多元醇代谢物';
                        break;
                    case '有机酸与TCA循环':
                        items = 'TCA循环中间体、酮体、有机酸代谢物';
                        break;
                    case '含硫化合物代谢':
                        items = '半胱氨酸、牛磺酸、次牛磺酸、谷胱甘肽相关';
                        break;
                    case '含氮化合物与核苷酸代谢':
                        items = '肌酐、嘧啶代谢物、胍基乙酸';
                        break;
                    case '外源物与药物代谢':
                        items = 'Ⅱ相代谢产物、水杨尿酸、异烟酸';
                        break;
                    default:
                        items = '相关代谢通路指标';
                }
                return `<div style="margin-bottom: 10px;"><strong>${item}：</strong>${items}</div>`;
            }).join('');
        } else {
            return '全面监测各项代谢通路指标，包括氨基酸、碳水化合物、有机酸、含硫化合物、含氮化合物和外源物代谢通路相关指标';
        }
    };
    
    return `
        <h3 class="section-title">复查与随访建议</h3>
        <div style="background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%); border-radius: 20px; padding: 30px; margin-bottom: 30px; border: 2px solid #1a2980;">
            <!-- 复查时间线 -->
            <div style="margin-bottom: 30px;">
                <h4 style="color: #1a2980; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>📅</span> 复查时间计划
                </h4>
                <div style="position: relative; padding-left: 40px;">
                    <!-- 时间线 -->
                    <div style="position: absolute; left: 18px; top: 0; bottom: 0; width: 4px; background: ${followUpColor}; border-radius: 2px;"></div>
                    
                    <!-- 当前时间点 -->
                    <div style="margin-bottom: 25px; position: relative;">
                        <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #1a2980; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                        <div style="background: white; padding: 20px; border-radius: 12px; margin-left: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                            <h5 style="color: #1a2980; margin-bottom: 5px;">当前</h5>
                            <p style="color: #555; font-size: 0.9rem; margin: 0;">完成健康评估，开始执行干预方案</p>
                        </div>
                    </div>
                    
                    <!-- 第一次复查 -->
                    <div style="margin-bottom: 25px; position: relative;">
                        <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: ${followUpColor}; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                        <div style="background: white; padding: 20px; border-radius: 12px; margin-left: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                            <h5 style="color: #1a2980; margin-bottom: 5px;">${followUpTime}后</h5>
                            <p style="color: #555; font-size: 0.9rem; margin: 0;">第一次全面复查，评估干预效果</p>
                        </div>
                    </div>
                    
                    <!-- 长期随访 -->
                    <div style="position: relative;">
                        <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #26d0ce; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                        <div style="background: white; padding: 20px; border-radius: 12px; margin-left: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                            <h5 style="color: #1a2980; margin-bottom: 5px;">长期随访</h5>
                            <p style="color: #555; font-size: 0.9rem; margin: 0;">根据复查结果调整方案，定期监测</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 详细建议卡片 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <!-- 复查时间建议 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid ${followUpColor};">
                    <div style="font-size: 2rem; margin-bottom: 15px;">📅</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">建议复查时间</h5>
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 1.2rem; font-weight: 600; color: ${followUpColor}; margin-bottom: 5px;">${followUpTime}</div>
                        <div style="color: #666; font-size: 0.9rem;">${followUpFrequency}</div>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 15px;">
                        <div style="width: ${result.overallRisk}%; height: 100%; background: ${followUpColor}; border-radius: 4px;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-top: 5px;">
                        <span>低风险</span>
                        <span>高风险</span>
                    </div>
                </div>
                
                <!-- 重点监测项目 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid #26d0ce;">
                    <div style="font-size: 2rem; margin-bottom: 15px;">🔬</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">重点监测项目</h5>
                    <div style="color: #555; font-size: 0.9rem; line-height: 1.6;">
                        ${getMonitoringItems()}
                    </div>
                </div>
                
                <!-- 就医提醒 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid #f39c12;">
                    <div style="font-size: 2rem; margin-bottom: 15px;">⚠️</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">就医提醒</h5>
                    <div style="color: #555; font-size: 0.9rem; line-height: 1.6;">
                        ${result.overallRisk > 60 ? 
                            '<p style="margin-bottom: 10px;">建议尽快就诊，寻求专业医生指导</p><p>需进行全面检查，可能需要药物治疗</p>' : 
                          result.overallRisk > 30 ? 
                            '<p style="margin-bottom: 10px;">如出现不适症状请及时就医</p><p>建议咨询内分泌科或心血管科医生</p>' : 
                            '<p style="margin-bottom: 10px;">保持定期体检习惯</p><p>每年进行一次全面健康检查</p>'}
                    </div>
                </div>
                
                <!-- 日常监测 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid #00b894;">
                    <div style="font-size: 2rem; margin-bottom: 15px;">📋</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">日常监测</h5>
                    <ul style="color: #555; font-size: 0.9rem; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li>体重：每周测量1-2次</li>
                        <li>血压：每周测量2-3次</li>
                        <li>血糖：如有异常，每天测量1-2次</li>
                        <li>饮食运动日记：每天记录</li>
                        <li>症状记录：如出现不适及时记录</li>
                    </ul>
                </div>
            </div>
            
            <!-- 随访计划下载 -->
            <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 12px; text-align: center;">
                <h5 style="color: #1a2980; margin-bottom: 15px;">随访计划</h5>
                <p style="color: #555; margin-bottom: 15px; font-size: 0.9rem;">下载详细的随访计划，包含具体的监测时间和项目</p>
                <button onclick="downloadFollowUpPlan()" style="padding: 10px 25px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">
                    📥 下载随访计划
                </button>
            </div>
            
            <!-- 重要提示 -->
            <div style="padding: 25px; background: #fffbeb; border-radius: 12px; border: 1px solid #f39c12;">
                <h5 style="color: #d97706; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <span>💡</span> 重要提示
                </h5>
                <p style="color: #666; line-height: 1.7; margin: 0 0 15px 0; font-size: 0.9rem;">
                    本报告仅供参考，不能替代专业医疗诊断。请根据报告建议调整生活方式，并在必要时咨询专业医生。
                </p>
                <p style="color: #666; line-height: 1.7; margin: 0; font-size: 0.9rem;">
                    特别是风险评分较高的项目，建议尽快就医进行进一步检查和治疗。如有突发不适，请立即就医。
                </p>
            </div>
        </div>
    `;
}

export function getMonitoringRecommendations(subtype) {
    const recommendations = [];
    
    switch(subtype) {
        case 'sedentary':
            recommendations.push('<li>每3个月复查能量代谢相关指标（乳酸、丙酮酸、酮体、乙酰肉碱）</li>');
            recommendations.push('<li>每周测量体重和血压，记录在健康日记中</li>');
            recommendations.push('<li>每天记录运动时间和强度，确保达到每周150分钟中等强度运动</li>');
            recommendations.push('<li>每6个月进行一次全面体检，包括血常规、生化检查</li>');
            recommendations.push('<li>如出现疲劳、气短等症状，及时就医咨询</li>');
            break;
        case 'obese':
            recommendations.push('<li>每3个月复查血脂指标（LDL-C、HDL-C、甘油三酯、总胆固醇）</li>');
            recommendations.push('<li>每周测量体重和腰围，记录在健康日记中</li>');
            recommendations.push('<li>每天测量血压，如有异常及时就医</li>');
            recommendations.push('<li>每6个月进行一次肝功能检查，监测脂肪肝情况</li>');
            recommendations.push('<li>每12个月进行一次颈动脉超声检查，评估动脉粥样硬化风险</li>');
            break;
        case 'inflammatory':
            recommendations.push('<li>每3个月复查炎症标志物（CRP、IL-6、TNF-alpha、同型半胱氨酸）</li>');
            recommendations.push('<li>每周监测体重变化</li>');
            recommendations.push('<li>每6个月进行一次血常规检查</li>');
            recommendations.push('<li>每12个月进行一次心血管风险评估</li>');
            recommendations.push('<li>如出现持续疲劳、关节疼痛等症状，及时就医</li>');
            break;
        case 'glucose':
            recommendations.push('<li>每周测量2-3次空腹血糖，记录在健康日记中</li>');
            recommendations.push('<li>每3个月测量一次糖化血红蛋白</li>');
            recommendations.push('<li>每周监测体重变化</li>');
            recommendations.push('<li>每6个月进行一次胰岛素抵抗评估</li>');
            recommendations.push('<li>如出现多饮、多尿、多食等症状，及时就医</li>');
            break;
        case 'amino':
            recommendations.push('<li>每3-6个月复查氨基酸代谢相关指标</li>');
            recommendations.push('<li>每6个月进行一次肝肾功能检查</li>');
            recommendations.push('<li>每周监测体重变化</li>');
            recommendations.push('<li>每12个月进行一次全面体检，包括电解质检查</li>');
            recommendations.push('<li>如出现疲劳、食欲不振等症状，及时就医</li>');
            break;
        default:
            recommendations.push('<li>每6-12个月进行一次全面代谢健康检查</li>');
            recommendations.push('<li>每周测量体重和血压</li>');
            recommendations.push('<li>保持健康的生活方式</li>');
            recommendations.push('<li>如有不适症状，及时就医</li>');
            break;
    }
    
    return recommendations.join('');
}



export function downloadInterventionPlan() {
    if (!currentResult) {
        showNotification('请先生成健康评估报告');
        return;
    }
    
    // 生成干预方案文本
    let planText = `MetaScan 个性化干预方案\n`;
    planText += `=================================\n`;
    planText += `生成日期: ${new Date().toLocaleString()}\n`;
    planText += `综合风险评分: ${currentResult.overallRisk.toFixed(1)}\n`;
    planText += `=================================\n\n`;
    
    planText += `一、第1-2周：建立基础\n`;
    planText += `1. 生活习惯记录：详细记录每日饮食、运动和作息时间，建立健康基线数据\n`;
    planText += `2. 轻度运动：每天30分钟步行，每周5-7次，逐渐增加活动量\n`;
    planText += `3. 饮食调整：减少加工食品和高糖食品摄入，增加蔬菜水果比例\n`;
    planText += `4. 作息规律：建立规律的作息时间，保证7-8小时睡眠\n\n`;
    
    planText += `二、第3-4周：强化干预\n`;
    planText += `1. 运动强度提升：每周3-4次中等强度运动，每次45分钟，如快走、游泳或骑自行车\n`;
    planText += `2. 饮食方案执行：严格执行个性化饮食方案，控制碳水化合物和脂肪摄入\n`;
    planText += `3. 压力管理：学习并实践压力管理技巧，如冥想、深呼吸或瑜伽\n`;
    planText += `4. 指标监测：每周监测体重、血压和血糖变化，记录在健康日记中\n\n`;
    
    planText += `三、第2-3个月：巩固效果\n`;
    planText += `1. 效果评估：评估生活方式改变的效果，分析体重、血压和血糖变化趋势\n`;
    planText += `2. 方案调整：根据效果评估结果，调整饮食和运动方案，优化干预策略\n`;
    planText += `3. 力量训练：加入力量训练，每周2-3次，增强肌肉量，提高基础代谢率\n`;
    planText += `4. 指标复查：复查关键代谢指标，如血脂、血糖和炎症标志物\n\n`;
    
    planText += `四、长期维护（3个月后）\n`;
    planText += `1. 生活方式保持：保持健康的生活方式，将良好习惯融入日常生活\n`;
    planText += `2. 定期监测：每3-6个月监测代谢指标，及时发现潜在问题\n`;
    planText += `3. 饮食优化：持续优化饮食结构，根据季节和身体状况调整\n`;
    planText += `4. 运动习惯：建立长期运动习惯，保持规律的体育锻炼\n\n`;
    
    planText += `=================================\n`;
    planText += `MetaScan 代谢健康管理平台\n`;
    
    // 创建下载链接
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MetaScan干预方案_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('干预方案已下载');
}

export function downloadFollowUpPlan() {
    if (!currentResult) {
        showNotification('请先生成健康评估报告');
        return;
    }
    
    // 根据风险评分确定复查时间和频率
    let followUpTime, followUpFrequency;
    if (currentResult.overallRisk > 60) {
        followUpTime = '1-3个月';
        followUpFrequency = '每2周监测一次关键指标';
    } else if (currentResult.overallRisk > 30) {
        followUpTime = '3-6个月';
        followUpFrequency = '每月监测一次关键指标';
    } else {
        followUpTime = '6-12个月';
        followUpFrequency = '每3个月监测一次关键指标';
    }
    
    // 生成随访计划文本
    let planText = `MetaScan 随访计划\n`;
    planText += `=================================\n`;
    planText += `生成日期: ${new Date().toLocaleString()}\n`;
    planText += `综合风险评分: ${currentResult.overallRisk.toFixed(1)}\n`;
    planText += `=================================\n\n`;
    
    planText += `一、复查时间安排\n`;
    planText += `1. 第一次复查：${followUpTime}后\n`;
    planText += `2. 长期随访：根据第一次复查结果确定\n`;
    planText += `3. 监测频率：${followUpFrequency}\n\n`;
    
    planText += `二、重点监测项目\n`;
    const highRiskItems = Object.entries(currentResult.pathwayScores)
        .filter(([key, value]) => value > 50)
        .map(([key]) => categoryNames[key]);
    
    if (highRiskItems.length > 0) {
        highRiskItems.forEach(item => {
            planText += `\n${item}：\n`;
            switch(item) {
                case '氨基酸代谢':
                    planText += `- 支链氨基酸\n- 苯丙氨酸\n- 酪氨酸\n- 谷氨酰胺\n`;
                    break;
                case '碳水化合物代谢':
                    planText += `- 赤藓糖醇\n- D-葡萄糖指纹峰\n- 多元醇代谢物\n`;
                    break;
                case '有机酸与TCA循环':
                    planText += `- TCA循环中间体\n- 酮体\n- 有机酸代谢物\n`;
                    break;
                case '含硫化合物代谢':
                    planText += `- 半胱氨酸\n- 牛磺酸\n- 次牛磺酸\n- 谷胱甘肽相关\n`;
                    break;
                case '含氮化合物与核苷酸代谢':
                    planText += `- 肌酐\n- 嘧啶代谢物\n- 胍基乙酸\n`;
                    break;
                case '外源物与药物代谢':
                    planText += `- Ⅱ相代谢产物\n- 水杨尿酸\n- 异烟酸\n`;
                    break;
                default:
                    planText += `- 相关代谢通路指标\n`;
            }
        });
    } else {
        planText += `全面监测各项代谢通路指标，包括氨基酸、碳水化合物、有机酸、含硫化合物、含氮化合物和外源物代谢通路相关指标\n`;
    }
    
    planText += `\n三、日常监测建议\n`;
    planText += `1. 体重：每周测量1-2次\n`;
    planText += `2. 血压：每周测量2-3次\n`;
    planText += `3. 血糖：如有异常，每天测量1-2次\n`;
    planText += `4. 饮食运动日记：每天记录\n`;
    planText += `5. 症状记录：如出现不适及时记录\n\n`;
    
    planText += `四、就医建议\n`;
    if (currentResult.overallRisk > 60) {
        planText += `1. 建议尽快就诊，寻求专业医生指导\n`;
        planText += `2. 需进行全面检查，可能需要药物治疗\n`;
    } else if (currentResult.overallRisk > 30) {
        planText += `1. 如出现不适症状请及时就医\n`;
        planText += `2. 建议咨询内分泌科或心血管科医生\n`;
    } else {
        planText += `1. 保持定期体检习惯\n`;
        planText += `2. 每年进行一次全面健康检查\n`;
    }
    
    planText += `\n=================================\n`;
    planText += `MetaScan 代谢健康管理平台\n`;
    
    // 创建下载链接
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MetaScan随访计划_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('随访计划已下载');
}

// ========== PDF导出功能 ==========

export function exportHealthReport() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var patientData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
    if (patientData.length === 0) {
        showNotification('暂无检测数据，无法导出', 'warning');
        return;
    }

    var reportContainer = document.getElementById('reportsContent');
    if (reportContainer) {
        exportElementToPDF(reportContainer, '健康报告_' + new Date().toISOString().split('T')[0]);
    } else {
        var latestData = patientData[patientData.length - 1];
        var reportHTML = generateReportHTML(latestData);
        exportHTMLToPDF(reportHTML, '健康报告_' + new Date().toISOString().split('T')[0]);
    }
}

// ====== 报告锚点导航 ======
export function scrollToSection(section) {
    const el = document.getElementById('report-section-' + section);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 高亮当前锚点
        document.querySelectorAll('#reportNav a').forEach(a => {
            a.style.background = '#f1f5f9';
            a.style.color = '#475569';
        });
    }
}

// ====== 核心：html2canvas + jsPDF 多页导出 ======
export function exportElementToPDF(element, filename) {
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
            pageCanvas.width = canvas.width;
            pageCanvas.height = srcHeight * (canvas.width / imgWidth);
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

export function exportHTMLToPDF(htmlContent, filename) {
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
            pageCanvas.width = canvas.width;
            pageCanvas.height = srcHeight * (canvas.width / imgWidth);
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

export function saveReportAsPDF() {
    var reportEl = document.getElementById('reportsContent');
    if (!reportEl) { showNotification('未找到报告内容', 'error'); return; }
    exportElementToPDF(reportEl, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
}

// ====== 导出Word报告 ======
export function exportReportAsWord() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var allData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
    if (allData.length === 0) {
        showNotification('暂无检测数据，无法导出', 'warning');
        return;
    }

    var data = window._currentReportData;
    if (!data || data.overallRisk === undefined) {
        data = allData[allData.length - 1];
    }

    var riskLevel = data.overallRisk < 30 ? '低风险' : data.overallRisk < 60 ? '中等风险' : '高风险';
    var riskColor = data.overallRisk < 30 ? '#00b894' : data.overallRisk < 60 ? '#f39c12' : '#e74c3c';
    var dimNames = { amino_acid: '氨基酸代谢', carbohydrate: '碳水化合物代谢', organic_acid: '有机酸代谢', sulfur: '含硫化合物代谢', nitrogen: '含氮化合物代谢', xenobiotic: '外源物代谢' };

    var wordHTML = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
    wordHTML += '<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
    wordHTML += '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->';
    wordHTML += '<style>@page { size: A4; margin: 2cm; } body { font-family: "Microsoft YaHei", sans-serif; color: #1e293b; line-height: 1.8; }';
    wordHTML += 'h1 { color: #1a2980; font-size: 24pt; text-align: center; border-bottom: 3px solid #1a2980; padding-bottom: 10pt; margin-bottom: 20pt; }';
    wordHTML += 'h2 { color: #1a2980; font-size: 16pt; border-bottom: 2px solid #e0e6ed; padding-bottom: 6pt; margin-top: 20pt; }';
    wordHTML += 'h3 { color: #1a2980; font-size: 13pt; margin-top: 16pt; }';
    wordHTML += 'table { border-collapse: collapse; width: 100%; margin: 12pt 0; }';
    wordHTML += 'th, td { border: 1px solid #cbd5e1; padding: 8pt 10pt; text-align: left; }';
    wordHTML += 'th { background-color: #f0f4ff; font-weight: bold; }';
    wordHTML += '.risk-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12pt 16pt; border-radius: 4pt; margin-bottom: 8pt; }';
    wordHTML += '.risk-bar-outer { height: 8pt; background: #e2e8f0; border-radius: 4pt; overflow: hidden; width: 60%; margin: 4pt 0; }';
    wordHTML += '.footer { text-align: center; border-top: 2px solid #e0e6ed; margin-top: 30pt; padding-top: 12pt; font-size: 9pt; color: #94a3b8; }';
    wordHTML += '</style></head><body>';

    wordHTML += '<h1>MetaScan 代谢健康报告</h1>';
    wordHTML += '<p style="text-align:center; color:#64748b;">报告日期: ' + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    wordHTML += '<p style="text-align:center; color:#64748b;">检测日期: ' + data.date + '</p>';

    wordHTML += '<h2>一、总体风险评估</h2>';
    wordHTML += '<div class="risk-card" style="text-align:center;">';
    wordHTML += '<p style="font-size:36pt; font-weight:bold; color:' + riskColor + '; margin:8pt 0;">' + data.overallRisk.toFixed(1) + '</p>';
    wordHTML += '<p style="font-size:16pt; font-weight:bold; color:' + riskColor + ';">' + riskLevel + '</p>';
    wordHTML += '</div>';

    wordHTML += '<h2>二、各维度风险评分</h2>';
    wordHTML += '<table><tr><th>维度</th><th>评分</th><th>风险等级</th><th>进度</th></tr>';

    if (data.pathwayScores) {
        Object.entries(data.pathwayScores).forEach(function(entry) {
            var key = entry[0], value = entry[1];
            var lvl = value < 30 ? '良好' : value < 60 ? '留意' : '关注';
            var c = value < 30 ? '#10b981' : value < 60 ? '#f59e0b' : '#ef4444';
            wordHTML += '<tr><td>' + (dimNames[key] || key) + '</td>';
            wordHTML += '<td style="font-weight:bold;color:' + c + ';">' + value.toFixed(0) + '</td>';
            wordHTML += '<td style="color:' + c + ';">' + lvl + '</td>';
            wordHTML += '<td><div class="risk-bar-outer"><div style="height:100%;width:' + Math.min(value, 100) + '%;background:' + c + ';"></div></div></td>';
            wordHTML += '</tr>';
        });
    }
    wordHTML += '</table>';

    wordHTML += '<h2>三、代谢指纹匹配数据</h2>';
    wordHTML += '<table><tr><th>代谢物名称</th><th>观测m/z</th><th>参考m/z</th><th>偏差(%)</th><th>HMDB</th><th>离子模式</th><th>代谢通路</th></tr>';

    var matchResults = data.matchResults || [];
    matchResults.forEach(function(m) {
        var devColor = m.deviation < 0.1 ? '#10b981' : m.deviation < 0.3 ? '#f59e0b' : '#ef4444';
        wordHTML += '<tr>';
        wordHTML += '<td>' + m.name + '</td>';
        wordHTML += '<td>' + m.userMz.toFixed(4) + '</td>';
        wordHTML += '<td>' + m.matchedMz.toFixed(4) + '</td>';
        wordHTML += '<td style="color:' + devColor + ';font-weight:bold;">' + m.deviation.toFixed(4) + ' Da</td>';
        wordHTML += '<td>' + m.hmdb + '</td>';
        wordHTML += '<td>' + m.ionMode + '</td>';
        wordHTML += '<td>' + (m.pathway || '-') + '</td>';
        wordHTML += '</tr>';
    });
    wordHTML += '</table>';

    wordHTML += '<h2>四、健康建议</h2>';
    wordHTML += '<ol>';
    wordHTML += '<li><strong>饮食管理：</strong>建议保持均衡饮食，减少高脂肪、高糖食物的摄入，增加新鲜蔬菜和水果的比例。</li>';
    wordHTML += '<li><strong>运动锻炼：</strong>建议每周进行至少150分钟的中等强度有氧运动，如快走、游泳等。</li>';
    wordHTML += '<li><strong>作息规律：</strong>保持充足的睡眠，每天7-8小时，避免熬夜，建立规律的作息习惯。</li>';
    wordHTML += '<li><strong>压力管理：</strong>学会合理释放压力，可通过冥想、瑜伽、听音乐等方式缓解压力。</li>';
    wordHTML += '<li><strong>定期复查：</strong>建议定期进行健康检查，及时了解身体状况变化。</li>';
    wordHTML += '</ol>';

    wordHTML += '<div class="footer"><p>MetaScan 智能健康管理平台</p><p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p></div>';
    wordHTML += '</body></html>';

    var blob = new Blob([wordHTML], { type: 'application/msword;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MetaScan健康报告_' + new Date().toISOString().split('T')[0] + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);

    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('Word报告导出成功', '可下载后用Microsoft Word打开编辑');
}

// ====== 报告分享功能 ======
export function checkSharedReportOnLoad() {
    var urlParams = new URLSearchParams(window.location.search);
    var shareId = urlParams.get('share');
    var pwd = urlParams.get('pwd');
    if (shareId) {
        var cleanedUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanedUrl);
        setTimeout(function() {
            openSharedReport(shareId, pwd || '');
        }, 800);
    }
}

export function generateShareLink() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var allData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
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

    var allShares = JSON.parse(localStorage.getItem('metascanShares_' + currentUser.username)) || [];
    allShares = allShares.filter(function(s) { return Date.now() < s.expiresAt; });
    allShares.push(shareEntry);
    localStorage.setItem('metascanShares_' + currentUser.username, JSON.stringify(allShares));

    var shareLink = window.location.origin + window.location.pathname + '?share=' + shareId + '&pwd=' + sharePassword;

    showShareModal(shareLink, sharePassword, shareId);
}

export function generateShareId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

export function generateSharePassword(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var pwd = '';
    for (var i = 0; i < length; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
}

export function showShareModal(shareLink, sharePassword, shareId) {
    var existingModal = document.getElementById('shareModal');
    if (existingModal) existingModal.remove();

    var expiresTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('zh-CN');

    var modalHTML = '<div class="modal-overlay" id="shareModalOverlay" onclick="closeShareModal()">';
    modalHTML += '<div class="modal" id="shareModal" onclick="event.stopPropagation()" style="max-width: 520px; background: white; border-radius: 20px; padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); position: relative;">';
    modalHTML += '<button onclick="closeShareModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:#94a3b8;">&times;</button>';
    modalHTML += '<div style="text-align:center;margin-bottom:20px;">';
    modalHTML += '<div style="font-size:3rem;margin-bottom:8px;">🔗</div>';
    modalHTML += '<h3 style="color:#1a2980;font-size:1.3rem;margin:0;">报告分享链接已生成</h3>';
    modalHTML += '<p style="color:#64748b;font-size:0.85rem;margin-top:6px;">有效期至: ' + expiresTime + ' · 剩余查看次数: 10</p>';
    modalHTML += '</div>';

    modalHTML += '<div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:12px;">';
    modalHTML += '<div style="font-size:0.8rem;color:#64748b;margin-bottom:6px;font-weight:600;">分享链接</div>';
    modalHTML += '<div style="display:flex;gap:8px;">';
    modalHTML += '<input type="text" id="shareLinkInput" value="' + shareLink + '" readonly style="flex:1;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.82rem;background:white;color:#1e293b;">';
    modalHTML += '<button onclick="copyShareLink()" style="padding:10px 18px;background:linear-gradient(135deg,#1a2980,#26d0ce);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:0.85rem;white-space:nowrap;">📋 复制</button>';
    modalHTML += '</div></div>';

    modalHTML += '<div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:20px;">';
    modalHTML += '<div style="font-size:0.8rem;color:#64748b;margin-bottom:6px;font-weight:600;">访问密码</div>';
    modalHTML += '<div style="display:flex;align-items:center;gap:8px;">';
    modalHTML += '<code style="font-size:1.4rem;font-weight:800;letter-spacing:4px;color:#1a2980;background:white;padding:8px 16px;border-radius:8px;">' + sharePassword + '</code>';
    modalHTML += '<button onclick="copySharePassword()" style="padding:8px 14px;background:white;border:2px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:0.8rem;">📋</button>';
    modalHTML += '</div></div>';

    modalHTML += '<p style="font-size:0.78rem;color:#94a3b8;text-align:center;margin:0;">分享链接24小时后自动失效 · 最多查看10次</p>';
    modalHTML += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

export function closeShareModal() {
    var overlay = document.getElementById('shareModalOverlay');
    var modal = document.getElementById('shareModal');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

export function copyShareLink() {
    var input = document.getElementById('shareLinkInput');
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(function() {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('链接已复制', '可粘贴发送给他人');
    }).catch(function() {
        showNotification('复制失败，请手动复制', 'error');
    });
}

export function copySharePassword() {
    navigator.clipboard.writeText(document.querySelector('#shareModal code').textContent).then(function() {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('密码已复制', '请妥善保管');
    }).catch(function() {
        showNotification('复制失败', 'error');
    });
}

export function openSharedReport(shareId, password) {
    var allKeys = Object.keys(localStorage).filter(function(k) { return k.startsWith('metascanShares_'); });
    for (var i = 0; i < allKeys.length; i++) {
        var shares = JSON.parse(localStorage.getItem(allKeys[i])) || [];
        var match = shares.find(function(s) { return s.id === shareId; });
        if (match) {
            if (Date.now() > match.expiresAt) {
                showNotification('该分享链接已过期（有效期24小时）', 'warning');
                return false;
            }
            if (match.viewCount >= match.maxViews) {
                showNotification('该分享链接已达最大查看次数', 'warning');
                return false;
            }
            if (match.password && match.password !== password) {
                showSharePasswordModal(shareId);
                return false;
            }
            match.viewCount++;
            localStorage.setItem(allKeys[i], JSON.stringify(shares));

            var timeStr = new Date().toLocaleString('zh-CN');
            var reportHTML = '<div style="padding:24px;max-width:900px;margin:0 auto;font-family:\'Microsoft YaHei\',sans-serif;">';
            reportHTML += '<div style="text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #1a2980;">';
            reportHTML += '<h1 style="color:#1a2980;font-size:24px;">MetaScan 共享健康报告</h1>';
            reportHTML += '<p style="color:#666;">由 ' + (match.username || '用户') + ' 分享 · 查看时间: ' + timeStr + '</p>';
            reportHTML += '<p style="color:#ef4444;font-size:0.8rem;">⚠ 该报告仅供查看，剩余次数: ' + (match.maxViews - match.viewCount) + '</p>';
            reportHTML += '</div>';

            var data = match.reportData;
            var riskColor = data.overallRisk < 30 ? '#10b981' : data.overallRisk < 60 ? '#f59e0b' : '#ef4444';

            reportHTML += '<div style="text-align:center;margin-bottom:28px;padding:24px;background:linear-gradient(135deg,#f0f4ff,#e3f2fd);border-radius:16px;">';
            reportHTML += '<h2 style="color:#1a2980;font-size:18px;">总体风险评估</h2>';
            reportHTML += '<div style="font-size:48px;font-weight:bold;color:' + riskColor + ';">' + data.overallRisk.toFixed(1) + '</div>';
            reportHTML += '</div>';

            if (data.pathwayScores) {
                reportHTML += '<h3 style="color:#1a2980;">各维度通路评分</h3>';
                reportHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">';
                reportHTML += '<tr style="background:#f0f4ff;"><th style="border:1px solid #e0e6ed;padding:10px;">维度</th><th style="border:1px solid #e0e6ed;padding:10px;">评分</th></tr>';
                var dimNames = { amino_acid: '氨基酸代谢', carbohydrate: '碳水化合物代谢', organic_acid: '有机酸代谢', sulfur: '含硫化合物代谢', nitrogen: '含氮化合物代谢', xenobiotic: '外源物代谢' };
                Object.entries(data.pathwayScores).forEach(function(e) {
                    var c = e[1] < 30 ? '#10b981' : e[1] < 60 ? '#f59e0b' : '#ef4444';
                    reportHTML += '<tr><td style="border:1px solid #e0e6ed;padding:10px;">' + (dimNames[e[0]] || e[0]) + '</td>';
                    reportHTML += '<td style="border:1px solid #e0e6ed;padding:10px;font-weight:bold;color:' + c + ';">' + e[1].toFixed(0) + '</td></tr>';
                });
                reportHTML += '</table>';
            }

            reportHTML += '<div style="text-align:center;margin-top:40px;padding-top:16px;border-top:2px solid #e0e6ed;color:#94a3b8;font-size:12px;">';
            reportHTML += '<p>MetaScan 智能健康管理平台 · 数据来自分享</p>';
            reportHTML += '<p>本报告仅供参考，不作为诊断依据</p></div></div>';

            var existingModal = document.getElementById('sharedReportModal');
            if (existingModal) existingModal.remove();

            document.body.insertAdjacentHTML('beforeend',
                '<div class="modal-overlay" id="sharedReportOverlay" onclick="closeSharedReport()">' +
                '<div class="modal" id="sharedReportModal" onclick="event.stopPropagation()" style="max-width:920px;max-height:85vh;overflow-y:auto;background:white;border-radius:20px;padding:0;box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative;">' +
                '<button onclick="closeSharedReport()" style="position:sticky;top:12px;float:right;z-index:10;background:white;border:2px solid #e2e8f0;border-radius:50%;width:36px;height:36px;font-size:1.2rem;cursor:pointer;color:#64748b;margin:12px;">&times;</button>' +
                reportHTML +
                '</div></div>');

            return true;
        }
    }
    showNotification('未找到该分享报告，链接可能已失效', 'warning');
    return false;
}

export function showSharePasswordModal(shareId) {
    var existingModal = document.getElementById('sharePwdModal');
    if (existingModal) existingModal.remove();

    var modalHTML = '<div class="modal-overlay" id="sharePwdOverlay" onclick="closeSharePwdModal()">';
    modalHTML += '<div class="modal" id="sharePwdModal" onclick="event.stopPropagation()" style="max-width:400px;background:white;border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center;">';
    modalHTML += '<div style="font-size:2.5rem;margin-bottom:10px;">🔒</div>';
    modalHTML += '<h3 style="color:#1a2980;margin:0 0 8px 0;">输入访问密码</h3>';
    modalHTML += '<p style="color:#64748b;font-size:0.85rem;margin-bottom:16px;">该报告设有访问密码保护</p>';
    modalHTML += '<input type="text" id="sharePwdInput" placeholder="输入6位访问密码" maxlength="6" style="width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:1rem;text-align:center;letter-spacing:6px;outline:none;box-sizing:border-box;" onkeydown="if(event.key===\'Enter\')verifySharePwd(\'' + shareId + '\')">';
    modalHTML += '<button onclick="verifySharePwd(\'' + shareId + '\')" style="width:100%;margin-top:16px;padding:12px;background:linear-gradient(135deg,#1a2980,#26d0ce);color:white;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;">🔓 验证并查看</button>';
    modalHTML += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(function() {
        var input = document.getElementById('sharePwdInput');
        if (input) input.focus();
    }, 200);
}

export function closeSharePwdModal() {
    var overlay = document.getElementById('sharePwdOverlay');
    var modal = document.getElementById('sharePwdModal');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

export function verifySharePwd(shareId) {
    var pwd = document.getElementById('sharePwdInput').value;
    closeSharePwdModal();
    openSharedReport(shareId, pwd);
}

export function closeSharedReport() {
    var overlay = document.getElementById('sharedReportOverlay');
    var modal = document.getElementById('sharedReportModal');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

export function generateHealthCard() {
    const data = window._currentReportData;
    if (!data) { showNotification('请先生成报告', 'warning'); return; }

    const riskText = data.overallRisk < 30 ? '状况良好' : data.overallRisk < 60 ? '建议调整' : '需要关注';
    const riskColor = data.overallRisk < 30 ? '#10b981' : data.overallRisk < 60 ? '#f59e0b' : '#ef4444';

    const cardHTML = `
    <div id="healthCardCanvas" style="width: 400px; background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); border-radius: 24px; padding: 28px; font-family: 'Microsoft YaHei', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.12); position: relative; overflow: hidden;">
        <div style="position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: ${riskColor}; opacity: 0.08; border-radius: 50%;"></div>
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 1.4rem; font-weight: 800; color: #1a2980; margin-bottom: 4px;">🧬 MetaScan 健康卡片</div>
            <div style="font-size: 0.8rem; color: #64748b;">${data.date || new Date().toLocaleDateString('zh-CN')}</div>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px; padding: 16px; background: white; border-radius: 16px;">
            <div style="width: 70px; height: 70px; border-radius: 50%; background: ${riskColor}; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.8rem; font-weight: 800;">${data.overallRisk.toFixed(0)}</div>
            <div>
                <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">${riskText}</div>
                <div style="font-size: 0.78rem; color: #64748b;">综合风险指数</div>
                <div style="height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 6px; overflow: hidden; width: 120px;">
                    <div style="height: 100%; width: ${Math.min(data.overallRisk, 100)}%; background: ${riskColor};"></div>
                </div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            ${Object.entries(data.pathwayScores || {}).slice(0, 4).map(([k, v]) => {
                const dimNames = { amino_acid: '氨基酸', carbohydrate: '碳水化合物', organic_acid: '有机酸', sulfur: '含硫化合物', nitrogen: '含氮化合物', xenobiotic: '外源物' };
                const c = v < 30 ? '#10b981' : v < 60 ? '#f59e0b' : '#ef4444';
                return `<div style="background: white; padding: 10px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.7rem; color: #64748b;">${dimNames[k] || k}</div>
                    <div style="font-weight: 700; color: ${c}; font-size: 1rem;">${v.toFixed(0)}</div>
                </div>`;
            }).join('')}
        </div>
        <div style="text-align: center; font-size: 0.7rem; color: #94a3b8; padding-top: 8px; border-top: 1px solid #e2e8f0;">
            MetaScan 智能健康管理平台 · 仅供参考
        </div>
    </div>`;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHTML;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);

    const w = window.open('', '_blank', 'width=440,height=700');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>健康卡片</title></head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;margin:0;">${cardHTML}</body></html>`);
    w.document.close();

    document.body.removeChild(tempDiv);

    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('健康卡片已生成', '可在新窗口中截图保存或分享');
}

export function toggleReportTTS() {
    const btn = document.getElementById('ttsButton');
    const data = window._currentReportData;
    if (!data) return;

    if (!('speechSynthesis' in window)) {
        showNotification('您的浏览器不支持语音播报功能', 'warning');
        return;
    }

    if (ttsPlaying) {
        window.speechSynthesis.cancel();
        ttsPlaying = false;
        if (btn) btn.innerHTML = '🔊 收听报告概要';
        return;
    }

    window.speechSynthesis.cancel();

    const riskText = data.overallRisk < 30 ? '状况良好' : data.overallRisk < 60 ? '建议调整' : '需要关注';
    const riskInfo = getRiskDescription(data.overallRisk, data.pathwayScores);
    const riskInfoClean = riskInfo.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');

    const matchCount = (data.matchResults || []).length;
    const abnormalText = matchCount > 0
        ? `共匹配到 ${matchCount} 个代谢指纹化合物。`
        : '所有代谢指纹匹配结果均正常。保持健康生活习惯。';

    const summary = `您好，这是您的MetaScan健康报告概要。您的综合风险评分为${data.overallRisk.toFixed(0)}分，风险等级为：${riskText}。${riskInfoClean.substring(0, 200)}${abnormalText}`;

    ttsUtterance = new SpeechSynthesisUtterance(summary);
    ttsUtterance.lang = 'zh-CN';
    ttsUtterance.rate = 0.95;
    ttsUtterance.pitch = 1.0;
    ttsUtterance.volume = 0.9;

    ttsUtterance.onstart = () => {
        ttsPlaying = true;
        if (btn) btn.innerHTML = '⏹️ 停止播报';
    };
    ttsUtterance.onend = ttsUtterance.onerror = () => {
        ttsPlaying = false;
        if (btn) btn.innerHTML = '🔊 收听报告概要';
    };

    window.speechSynthesis.speak(ttsUtterance);
    ttsPlaying = true;
    if (btn) btn.innerHTML = '⏹️ 停止播报';
}

export function exportComparisonReport() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        return;
    }

    var patientData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
    if (patientData.length < 2) {
        showNotification('至少需要两次检测数据才能进行对比', 'warning');
        return;
    }

    var comparisonContainer = document.getElementById('comparison');
    if (comparisonContainer) {
        exportElementToPDF(comparisonContainer, 'MetaScan历史对比_' + new Date().toISOString().split('T')[0]);
    } else {
        var comparisonHTML = generateComparisonHTML(patientData);
        exportHTMLToPDF(comparisonHTML, 'MetaScan历史对比_' + new Date().toISOString().split('T')[0]);
    }
}

export function generateReportHTML(data) {
    const riskLevel = data.overallRisk < 30 ? '低风险' : data.overallRisk < 60 ? '中等风险' : '高风险';
    const riskColor = data.overallRisk < 30 ? '#00b894' : data.overallRisk < 60 ? '#f39c12' : '#e74c3c';

    return `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1a2980; padding-bottom: 20px;">
                <h1 style="color: #1a2980; margin: 0; font-size: 28px;">MetaScan 代谢健康报告</h1>
                <p style="color: #666; margin-top: 10px; font-size: 14px;">报告日期: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="color: #666; font-size: 14px;">检测日期: ${data.date}</p>
            </div>

            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; text-align: center;">
                <h2 style="color: #1a2980; margin-top: 0; font-size: 20px;">总体风险评估</h2>
                <div style="font-size: 48px; font-weight: bold; color: ${riskColor}; margin: 15px 0;">${data.overallRisk.toFixed(1)}</div>
                <div style="font-size: 18px; font-weight: 600; color: ${riskColor};">${riskLevel}</div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">各维度风险评分</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
                    ${generateRiskCard('氨基酸代谢', data.pathwayScores.amino_acid, '🧬')}
                    ${generateRiskCard('碳水化合物代谢', data.pathwayScores.carbohydrate, '🍯')}
                    ${generateRiskCard('有机酸代谢', data.pathwayScores.organic_acid, '🧪')}
                    ${generateRiskCard('含硫化合物代谢', data.pathwayScores.sulfur, '🛡️')}
                    ${generateRiskCard('含氮化合物代谢', data.pathwayScores.nitrogen, '⚗️')}
                    ${generateRiskCard('外源物代谢', data.pathwayScores.xenobiotic, '💊')}
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">代谢通路模式</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 15px;">
                    ${(data.pathwayPatterns || []).length > 0 ?
                        data.pathwayPatterns.map(pp => `<div style="margin-bottom: 10px; font-weight: 600;">• ${pp.name || pp}</div>`).join('') :
                        '<div style="color: #666;">未识别到特定代谢亚型</div>'
                    }
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">详细分析</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 15px; line-height: 1.8; color: #333;">
                    ${generateDetailedAnalysis(data)}
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">健康建议</h3>
                <div style="background: #f0fff4; padding: 20px; border-radius: 10px; margin-top: 15px; line-height: 1.8; color: #333;">
                    ${generateHealthRecommendations(data)}
                </div>
            </div>

            <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 2px solid #e0e6ed; color: #666; font-size: 12px;">
                <p>MetaScan 代谢健康管理平台</p>
                <p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p>
            </div>
        </div>
    `;
}

export function generateRiskCard(title, score, icon) {
    const color = score < 30 ? '#10b981' : score < 60 ? '#f59e0b' : '#ef4444';
    return `
        <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 24px; margin-bottom: 10px;">${icon}</div>
            <div style="font-weight: 600; color: #1a2980; margin-bottom: 10px;">${title}</div>
            <div style="font-size: 28px; font-weight: bold; color: ${color};">${score.toFixed(0)}</div>
        </div>
    `;
}

export function generateDetailedAnalysis(data) {
    let analysis = '<p>根据您的检测结果，我们对您的代谢健康状况进行了全面分析：</p>';
    analysis += '<ul>';

    const highRiskItems = Object.entries(data.pathwayScores).filter(([key, value]) => value > 60);
    const mediumRiskItems = Object.entries(data.pathwayScores).filter(([key, value]) => value > 30 && value <= 60);

    if (highRiskItems.length > 0) {
        analysis += '<li><strong>需要关注的维度：</strong>';
        analysis += highRiskItems.map(([key, value]) => `${categoryNames[key] || key}(${value.toFixed(0)}分)`).join('、');
        analysis += '。这些维度需要重点关注，建议咨询医生。</li>';
    }

    if (mediumRiskItems.length > 0) {
        analysis += '<li><strong>建议调整的维度：</strong>';
        analysis += mediumRiskItems.map(([key, value]) => `${categoryNames[key] || key}(${value.toFixed(0)}分)`).join('、');
        analysis += '。这些维度需要留意，建议适当调整生活方式。</li>';
    }

    if (highRiskItems.length === 0 && mediumRiskItems.length === 0) {
        analysis += '<li><strong>整体状况良好：</strong>您的各项指标都在正常范围内，请继续保持健康的生活方式。</li>';
    }

    analysis += '</ul>';
    return analysis;
}

export function generateHealthRecommendations(data) {
    let recommendations = '<p>基于您的检测结果，我们为您提供以下健康建议：</p>';
    recommendations += '<ol style="padding-left: 20px;">';

    recommendations += '<li><strong>饮食管理：</strong>建议保持均衡饮食，减少高脂肪、高糖食物的摄入，增加新鲜蔬菜和水果的比例。</li>';
    recommendations += '<li><strong>运动锻炼：</strong>建议每周进行至少150分钟的中等强度有氧运动，如快走、游泳等。</li>';
    recommendations += '<li><strong>作息规律：</strong>保持充足的睡眠，每天7-8小时，避免熬夜，建立规律的作息习惯。</li>';
    recommendations += '<li><strong>压力管理：</strong>学会合理释放压力，可通过冥想、瑜伽、听音乐等方式缓解压力。</li>';
    recommendations += '<li><strong>定期复查：</strong>建议定期进行健康检查，及时了解身体状况变化。</li>';

    recommendations += '</ol>';
    return recommendations;
}

export function generateComparisonHTML(allData) {
    const sortedData = [...allData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const latestData = sortedData[sortedData.length - 1];
    const firstData = sortedData[0];

    const riskChange = latestData.overallRisk - firstData.overallRisk;
    const riskTrend = riskChange > 0 ? '上升' : riskChange < 0 ? '下降' : '稳定';
    const trendColor = riskChange > 0 ? '#e74c3c' : riskChange < 0 ? '#00b894' : '#666';

    return `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1a2980; padding-bottom: 20px;">
                <h1 style="color: #1a2980; margin: 0; font-size: 28px;">MetaScan 历史对比报告</h1>
                <p style="color: #666; margin-top: 10px; font-size: 14px;">报告日期: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="color: #666; font-size: 14px;">对比范围: ${firstData.date} 至 ${latestData.date}</p>
            </div>

            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; text-align: center;">
                <h2 style="color: #1a2980; margin-top: 0; font-size: 20px;">总体风险变化</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">
                    <div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">首次检测</div>
                        <div style="font-size: 36px; font-weight: bold; color: #1a2980;">${firstData.overallRisk.toFixed(1)}</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">最新检测</div>
                        <div style="font-size: 36px; font-weight: bold; color: #1a2980;">${latestData.overallRisk.toFixed(1)}</div>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 10px;">
                    <div style="font-size: 16px; color: #666; margin-bottom: 8px;">风险变化</div>
                    <div style="font-size: 28px; font-weight: bold; color: ${trendColor};">${riskChange > 0 ? '+' : ''}${riskChange.toFixed(1)}</div>
                    <div style="font-size: 16px; font-weight: 600; color: ${trendColor}; margin-top: 8px;">${riskTrend}</div>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">历史检测记录</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background: #f0f4ff;">
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">检测日期</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">总体风险</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">氨基酸代谢</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">碳水化合物代谢</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">有机酸代谢</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...sortedData].reverse().map(data => `
                            <tr>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${data.date}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${data.overallRisk.toFixed(1)}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${(data.pathwayScores && data.pathwayScores.amino_acid) ? data.pathwayScores.amino_acid.toFixed(0) : '-'}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${(data.pathwayScores && data.pathwayScores.carbohydrate) ? data.pathwayScores.carbohydrate.toFixed(0) : '-'}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${(data.pathwayScores && data.pathwayScores.organic_acid) ? data.pathwayScores.organic_acid.toFixed(0) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">各维度变化分析</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                    ${generateComparisonDimension('氨基酸代谢', firstData.pathwayScores.amino_acid, latestData.pathwayScores.amino_acid, '🧬')}
                    ${generateComparisonDimension('碳水化合物代谢', firstData.pathwayScores.carbohydrate, latestData.pathwayScores.carbohydrate, '🍯')}
                    ${generateComparisonDimension('有机酸代谢', firstData.pathwayScores.organic_acid, latestData.pathwayScores.organic_acid, '🧪')}
                    ${generateComparisonDimension('含硫化合物代谢', firstData.pathwayScores.sulfur, latestData.pathwayScores.sulfur, '🛡️')}
                    ${generateComparisonDimension('含氮化合物代谢', firstData.pathwayScores.nitrogen, latestData.pathwayScores.nitrogen, '⚗️')}
                    ${generateComparisonDimension('外源物代谢', firstData.pathwayScores.xenobiotic, latestData.pathwayScores.xenobiotic, '💊')}
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">变化总结</h3>
                <div style="background: #f0fff4; padding: 20px; border-radius: 10px; margin-top: 15px; line-height: 1.8; color: #333;">
                    ${generateChangeSummary(firstData, latestData)}
                </div>
            </div>

            <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 2px solid #e0e6ed; color: #666; font-size: 12px;">
                <p>MetaScan 代谢健康管理平台</p>
                <p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p>
            </div>
        </div>
    `;
}

export function generateComparisonDimension(title, firstValue, latestValue, icon) {
    const change = latestValue - firstValue;
    const trend = change > 0 ? '上升' : change < 0 ? '下降' : '稳定';
    const trendColor = change > 0 ? '#e74c3c' : change < 0 ? '#00b894' : '#666';

    return `
        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 15px;">
                <span style="font-size: 24px;">${icon}</span>
                <div style="font-weight: 600; color: #1a2980; margin-top: 8px;">${title}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #666; font-size: 14px;">首次: ${firstValue.toFixed(0)}</span>
                <span style="color: #666; font-size: 14px;">最新: ${latestValue.toFixed(0)}</span>
            </div>
            <div style="text-align: center; padding: 10px; background: ${change < 0 ? '#e6f7f0' : change > 0 ? '#fff3cd' : '#f8f9fa'}; border-radius: 8px;">
                <div style="font-weight: 600; color: ${trendColor};">${change > 0 ? '+' : ''}${change.toFixed(0)}</div>
                <div style="font-size: 14px; color: ${trendColor};">${trend}</div>
            </div>
        </div>
    `;
}

export function generateChangeSummary(firstData, latestData) {
    const riskChange = latestData.overallRisk - firstData.overallRisk;
    let summary = '<p>根据您的历史检测数据对比分析：</p>';
    summary += '<ul>';

    if (riskChange < 0) {
        summary += '<li><strong>总体状况改善：</strong>您的总体风险评分从 ' + firstData.overallRisk.toFixed(1) + ' 下降到 ' + latestData.overallRisk.toFixed(1) + '，下降了 ' + Math.abs(riskChange).toFixed(1) + ' 分，说明您的健康状况有所改善，请继续保持！</li>';
    } else if (riskChange > 0) {
        summary += '<li><strong>需要关注：</strong>您的总体风险评分从 ' + firstData.overallRisk.toFixed(1) + ' 上升到 ' + latestData.overallRisk.toFixed(1) + '，上升了 ' + riskChange.toFixed(1) + ' 分，建议您加强健康管理，必要时咨询医生。</li>';
    } else {
        summary += '<li><strong>状况稳定：</strong>您的总体风险评分保持稳定，说明您的健康状况维持在同一水平。</li>';
    }

    const improvedDimensions = [];
    const worsenedDimensions = [];
    const dimensionNames = { amino_acid: '氨基酸代谢', carbohydrate: '碳水化合物代谢', organic_acid: '有机酸代谢', sulfur: '含硫化合物代谢', nitrogen: '含氮化合物代谢', xenobiotic: '外源物代谢' };

    for (const [key, name] of Object.entries(dimensionNames)) {
        const ps1 = firstData.pathwayScores || {};
        const ps2 = latestData.pathwayScores || {};
        const change = (ps2[key] || 0) - (ps1[key] || 0);
        if (change < 0) improvedDimensions.push(name);
        else if (change > 0) worsenedDimensions.push(name);
    }

    if (improvedDimensions.length > 0) {
        summary += '<li><strong>改善项目：</strong>' + improvedDimensions.join('、') + '。</li>';
    }

    if (worsenedDimensions.length > 0) {
        summary += '<li><strong>需要关注项目：</strong>' + worsenedDimensions.join('、') + '。建议您针对这些项目调整生活方式。</li>';
    }

    summary += '</ul>';
    return summary;
}

export function exportToPDF(htmlContent, filename) {
    showNotification('正在生成PDF，请稍候...');

    try {
        let styles = '';
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
            if (el.tagName === 'STYLE') {
                styles += `<style>${el.innerHTML}</style>`;
            } else if (el.tagName === 'LINK') {
                styles += `<link rel="stylesheet" href="${el.href}">`;
            }
        });

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${filename}</title>
                    ${styles}
                    <style>
                        * {
                            box-sizing: border-box;
                        }
                        body {
                            margin: 0;
                            padding: 20px;
                            font-family: 'Microsoft YaHei', Arial, sans-serif;
                            background: #fff;
                        }
                        .print-hide {
                            display: none !important;
                        }
                        @media print {
                            .no-print {
                                display: none !important;
                            }
                            body {
                                margin: 0;
                                padding: 20px;
                            }
                            @page {
                                margin: 20mm;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <div class="no-print" style="text-align: center; margin-top: 40px; padding: 20px; position: sticky; bottom: 0; background: white; border-top: 1px solid #eee; z-index: 1000;">
                        <button onclick="window.print()" style="padding: 15px 40px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 16px; margin-right: 15px;">打印/保存为PDF</button>
                        <button onclick="window.close()" style="padding: 15px 40px; background: #6c757d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 16px;">关闭</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();

            printWindow.onload = function() {
                const exportButtons = printWindow.document.querySelectorAll('.export-pdf-btn');
                exportButtons.forEach(btn => btn.style.display = 'none');

                showNotification('PDF生成成功！请点击 "打印/保存为PDF" 按钮');
            };
        } else {
            showNotification('无法打开新窗口！请检查浏览器的弹窗拦截设置。', 'warning');
            showNotification('请允许浏览器打开弹窗');
        }
    } catch (error) {
        console.error('PDF导出失败:', error);
        showNotification('PDF导出失败', 'error');
        showNotification('PDF导出失败，请重试');
    }
}

export function updateTrendChart() {
    var trendTypeEl = document.getElementById('trendType');
    if (!trendTypeEl) return;

    var trendType = trendTypeEl.value;
    var chartEl = document.getElementById('trendChart');
    if (!chartEl) return;

    var trendingData = {
        weight: { label: '体重', unit: 'kg', color: '#f39c12' },
        exercise: { label: '运动', unit: 'min', color: '#667eea' },
        calories: { label: '卡路里', unit: 'kcal', color: '#e74c3c' },
        water: { label: '饮水', unit: '杯', color: '#3498db' }
    };

    var data = trendingData[trendType];
    var days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    var values = days.map(function() { return Math.floor(Math.random() * 100) + 30; });
    var maxValue = Math.max.apply(null, values);

    chartEl.innerHTML = 
        '<div style="width: 100%; height: 100%; padding: 20px; display: flex; flex-direction: column;">' +
            '<div style="text-align: center; margin-bottom: 20px;">' +
                '<div style="font-size: 1.3rem; font-weight: 800; color: ' + data.color + ';">📊 ' + data.label + '趋势</div>' +
            '</div>' +
            '<div style="flex: 1; display: flex; justify-content: space-around; align-items: flex-end; border-left: 2px solid #e0e6ed; border-bottom: 2px solid #e0e6ed; padding: 0 10px 10px 10px;">' +
                days.map(function(day, i) {
                    var height = (values[i] / maxValue) * 200;
                    return '<div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;"><div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">' + values[i] + data.unitLabel + '</div><div style="width: 35px; height: ' + height + 'px; background: linear-gradient(180deg, ' + data.color + ' 0%, ' + data.color + '88 100%); border-radius: 8px 8px 0 0;"></div><div style="font-size: 0.85rem; color: #666; margin-top: 8px; font-weight: 600;">' + day + '</div></div>';
                }).join('') +
            '</div>' +
        '</div>';
}

function generateFingerprintReferenceSection() {
    if (!metaboliteData || metaboliteData.length === 0) return '';
    try {
        var html = '<div id="report-section-fingerprints">';
        html += '<h3 class="section-title">代谢指纹参考库</h3>';
        html += '<div style="background: white; border-radius: 20px; padding: 24px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">';
        html += '<p style="color: #64748b; margin-bottom: 16px; font-size: 0.9rem;">以下为本系统内置的26种代谢指纹参考数据（质谱峰列表），可用于代谢物鉴定与溯源。</p>';
        html += '<div style="overflow-x: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">';
        html += '<thead><tr style="background: #f1f5f9;">';
        html += '<th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">序号</th>';
        html += '<th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">m/z</th>';
        html += '<th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">HMDB编号</th>';
        html += '<th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">中文名称</th>';
        html += '<th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">英文名称</th>';
        html += '<th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">离子模式</th>';
        html += '</tr></thead><tbody>';

        metaboliteData.forEach(function(fp, i) {
            html += '<tr style="border-bottom: 1px solid #f1f5f9;">';
            html += '<td style="padding: 8px 12px; color: #475569;">' + (i + 1) + '</td>';
            html += '<td style="padding: 8px 12px; font-family: monospace; color: #1e293b; font-weight: 600;">' + fp.mz.toFixed(4) + '</td>';
            html += '<td style="padding: 8px 12px; font-family: monospace; color: #3b82f6;">' + fp.hmdb + '</td>';
            html += '<td style="padding: 8px 12px; color: #1e293b; font-weight: 500;">' + fp.name + '</td>';
            html += '<td style="padding: 8px 12px; color: #475569; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + fp.enName + '">' + fp.enName + '</td>';
            html += '<td style="padding: 8px 12px; font-family: monospace; color: #8b5cf6;">' + fp.ionMode + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        html += '<p style="margin-top: 12px; color: #94a3b8; font-size: 0.78rem;">数据来源: HMDB (Human Metabolome Database) | 检测方法: LC-MS | 总条目: ' + metaboliteData.length + '</p>';
        html += '</div></div>';
        console.log('[Reports] 代谢指纹参考库已渲染: ' + metaboliteData.length + ' 条');
        return html;
    } catch (e) {
        console.error('[Reports] 指纹库渲染异常:', e);
        return '';
    }
}