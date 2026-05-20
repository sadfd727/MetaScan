import { metaboliteData, categoryNames } from './config.js';

var DEEPSEEK_SYSTEM_PROMPT = `你是一位资深的代谢组学专家，精通质谱指纹解析、代谢通路分析和生物标志物识别。

你需要基于质谱检测的m/z峰数据及其与代谢指纹库的匹配结果，完成以下任务：
1. 代谢物鉴定：根据匹配结果列出已鉴定的代谢物及其HMDB ID、离子模式、偏差分析
2. 通路覆盖分析：评估代谢通路覆盖率（氨基酸代谢、碳水化合物代谢、有机酸与TCA循环、含硫化合物代谢、含氮化合物与核苷酸代谢、外源物与药物代谢）
3. 生物学意义解释：结合文献给出鉴定代谢物的临床意义和潜在健康指示
4. 综合评估：给出整体代谢指纹覆盖评分（0-100分）和质量等级（优秀/良好/一般/待优化）
5. 个性化建议：对检测策略和数据质量提出改进建议（至少5条）
6. 通路解读：对覆盖率较高的代谢通路给出生物学解读

请始终以JSON格式返回结果，确保数值在合理范围内。`;

export function formatPrompt(data, historicalRecords) {
    var formattedData = formatFingerprintData(data);
    var historySection = historicalRecords && historicalRecords.length > 0
        ? formatHistorySection(historicalRecords)
        : '';

    return {
        systemPrompt: DEEPSEEK_SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(formattedData, historySection)
    };
}

function formatFingerprintData(data) {
    var lines = [];

    if (data.mzPeaks && data.mzPeaks.length > 0) {
        lines.push('【质谱m/z峰列表】');
        lines.push('共' + data.mzPeaks.length + '个m/z峰: ' + data.mzPeaks.join(', '));
        lines.push('');
    }

    if (data.matchResults && data.matchResults.length > 0) {
        lines.push('【匹配代谢物】');
        lines.push('共鉴定' + data.matchResults.length + '种代谢物:');
        data.matchResults.forEach(function(m, i) {
            lines.push('  ' + (i + 1) + '. ' + m.name + ' (' + m.enName + ')');
            lines.push('     m/z: 观测' + m.userMz.toFixed(4) + ' vs 参考' + m.matchedMz.toFixed(4) + ' (偏差: ' + m.deviation.toFixed(4) + ')');
            lines.push('     HMDB: ' + m.hmdb + ' | 离子模式: ' + m.ionMode);
            lines.push('     通路: ' + (m.pathway || '-'));
            if (m.significance) {
                lines.push('     生物学意义: ' + m.significance);
            }
        });
        lines.push('');
    }

    if (data.pathwayCoverage) {
        lines.push('【通路覆盖情况】');
        for (var cat in data.pathwayCoverage) {
            var cov = data.pathwayCoverage[cat];
            lines.push('  ' + cov.name + ': ' + cov.matched + '/' + cov.total + ' 覆盖率=' + (cov.coverageRate * 100).toFixed(0) + '%');
        }
        lines.push('');
    }

    if (data.overallCoverageScore !== undefined) {
        lines.push('【整体覆盖评分】 ' + data.overallCoverageScore + '/100');
        lines.push('');
    }

    return lines.join('\n');
}

function formatHistorySection(historicalRecords) {
    var sorted = historicalRecords.slice().sort(function(a, b) {
        return new Date(a.timestamp) - new Date(b.timestamp);
    });

    var lines = ['## 历史数据（用于趋势分析）'];
    sorted.forEach(function(record, i) {
        lines.push('第' + (i + 1) + '次检测 (' + record.date + '):');
        if (record.overallCoverageScore !== undefined) {
            lines.push('  覆盖评分: ' + Math.round(record.overallCoverageScore) + '/100');
        }
        if (record.matchedCount !== undefined) {
            lines.push('  鉴定代谢物数: ' + record.matchedCount + '/' + record.totalFingerprints);
        }
    });
    return lines.join('\n');
}

function buildUserPrompt(formattedData, historySection) {
    var fingerprintRef = buildFingerprintReference();
    return [
        '## 当前代谢指纹数据',
        formattedData,
        historySection,
        fingerprintRef,
        '请基于以上数据进行综合分析，返回JSON格式结果。'
    ].filter(function(s) { return s; }).join('\n');
}

function buildFingerprintReference() {
    if (!metaboliteData || metaboliteData.length === 0) return '';
    var lines = ['## 代谢指纹参考数据库（26种已知代谢物）'];
    lines.push('以下为本系统已识别的代谢物指纹库，可作为分析参考：');
    metaboliteData.forEach(function(fp, i) {
        lines.push('  ' + (i + 1) + '. ' + fp.name + ' (' + fp.enName + ') m/z=' + fp.mz.toFixed(4) + ' ' + fp.ionMode + ' HMDB=' + fp.hmdb + ' 通路=' + (fp.pathway || '-'));
    });
    return lines.join('\n');
}