import { metaboliteData, categoryNames } from './config.js';
import { generateComprehensiveRecommendations, getSpecificRecommendations } from './shared.js';

var PATHWAY_WEIGHTS = {
    amino_acid: 1.1,
    carbohydrate: 1.2,
    organic_acid: 1.1,
    sulfur: 0.9,
    nitrogen: 1.0,
    xenobiotic: 0.8
};

export function analyzeMetabolicData(mzPeaks, historicalRecords) {
    var matches = matchFingerprints(mzPeaks);
    var pathwayCoverage = analyzePathwayCoverage(matches);
    var pathwayScores = calculatePathwayScores(matches);

    var totalCompounds = metaboliteData.length;
    var matchedCount = matches.length;
    var coverageRate = totalCompounds > 0 ? matchedCount / totalCompounds : 0;

    var result = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('zh-CN'),
        mzPeaks: mzPeaks,
        matchResults: matches,
        matchedCount: matchedCount,
        totalFingerprints: totalCompounds,
        coverageRate: parseFloat(coverageRate.toFixed(2)),
        pathwayCoverage: pathwayCoverage,
        pathwayScores: pathwayScores,
        identifiedMetabolites: buildMetaboliteReport(matches),
        overallCoverageScore: calculateOverallCoverage(matches),
        pathwayPatterns: identifyPathwayPatterns(matches),
        trendPrediction: null
    };

    if (historicalRecords && historicalRecords.length >= 2) {
        result.trendPrediction = predictRiskTrend(historicalRecords, result.overallCoverageScore);
    }

    result.recommendations = generatePathwayRecommendations(result);

    return result;
}

export function matchFingerprints(userMzValues) {
    if (!metaboliteData || metaboliteData.length === 0) {
        console.warn('[Fingerprint] 指纹库为空，跳过匹配');
        return [];
    }
    if (!userMzValues || !Array.isArray(userMzValues) || userMzValues.length === 0) {
        console.log('[Fingerprint] 无用户m/z数据可匹配');
        return [];
    }

    var matches = [];
    var toleranceMz = 0.5;

    userMzValues.forEach(function(userMz) {
        var num = parseFloat(userMz);
        if (isNaN(num)) return;

        var bestMatch = null;
        var bestDiff = Infinity;

        metaboliteData.forEach(function(fp) {
            var diff = Math.abs(fp.mz - num);
            if (diff <= toleranceMz && diff < bestDiff) {
                bestDiff = diff;
                bestMatch = fp;
            }
        });

        if (bestMatch) {
            matches.push({
                userMz: num,
                matchedMz: bestMatch.mz,
                deviation: parseFloat(bestDiff.toFixed(4)),
                id: bestMatch.id,
                hmdb: bestMatch.hmdb,
                name: bestMatch.name,
                enName: bestMatch.enName,
                ionMode: bestMatch.ionMode,
                category: bestMatch.category,
                pathway: bestMatch.pathway,
                significance: bestMatch.significance
            });
        }
    });

    matches.sort(function(a, b) { return a.deviation - b.deviation; });

    console.log('[Fingerprint] 匹配完成: ' + matches.length + '/' + userMzValues.length + ' 个m/z值匹配到已知代谢物');
    return matches;
}

export function analyzePathwayCoverage(matches) {
    var totalByCategory = {};
    metaboliteData.forEach(function(fp) {
        totalByCategory[fp.category] = (totalByCategory[fp.category] || 0) + 1;
    });

    var matchedByCategory = {};
    matches.forEach(function(m) {
        matchedByCategory[m.category] = (matchedByCategory[m.category] || 0) + 1;
    });

    var coverage = {};
    for (var cat in totalByCategory) {
        var total = totalByCategory[cat];
        var matched = matchedByCategory[cat] || 0;
        coverage[cat] = {
            name: categoryNames[cat] || cat,
            total: total,
            matched: matched,
            uncovered: total - matched,
            coverageRate: parseFloat((matched / total).toFixed(2))
        };
    }

    return coverage;
}

export function calculatePathwayScores(matches) {
    var scores = {};
    for (var cat in PATHWAY_WEIGHTS) {
        scores[cat] = 0;
    }

    var categoryMatches = {};
    matches.forEach(function(m) {
        if (m.category && PATHWAY_WEIGHTS.hasOwnProperty(m.category)) {
            categoryMatches[m.category] = (categoryMatches[m.category] || 0) + 1;
        }
    });

    var totalByCategory = {};
    metaboliteData.forEach(function(fp) {
        totalByCategory[fp.category] = (totalByCategory[fp.category] || 0) + 1;
    });

    for (var cat in scores) {
        var total = totalByCategory[cat] || 1;
        var matched = categoryMatches[cat] || 0;
        scores[cat] = Math.min(100, Math.round((matched / total) * 100));
    }

    return scores;
}

export function calculateOverallCoverage(matches) {
    var total = metaboliteData.length;
    if (total === 0) return 0;

    var matchedUnique = {};
    matches.forEach(function(m) {
        matchedUnique[m.id] = true;
    });

    var uniqueCount = Object.keys(matchedUnique).length;
    return Math.round((uniqueCount / total) * 100);
}

export function identifyPathwayPatterns(matches) {
    if (!matches || matches.length === 0) return ['insufficient_data'];

    var patterns = [];

    var categoryMatches = {};
    matches.forEach(function(m) {
        if (m.category) {
            categoryMatches[m.category] = (categoryMatches[m.category] || 0) + 1;
        }
    });

    var totalByCategory = {};
    metaboliteData.forEach(function(fp) {
        totalByCategory[fp.category] = (totalByCategory[fp.category] || 0) + 1;
    });

    var aminoRatio = (categoryMatches['amino_acid'] || 0) / (totalByCategory['amino_acid'] || 1);
    var carbRatio = (categoryMatches['carbohydrate'] || 0) / (totalByCategory['carbohydrate'] || 1);
    var tcaRatio = (categoryMatches['organic_acid'] || 0) / (totalByCategory['organic_acid'] || 1);
    var sulfurRatio = (categoryMatches['sulfur'] || 0) / (totalByCategory['sulfur'] || 1);
    var nitrogenRatio = (categoryMatches['nitrogen'] || 0) / (totalByCategory['nitrogen'] || 1);
    var xenoRatio = (categoryMatches['xenobiotic'] || 0) / (totalByCategory['xenobiotic'] || 1);

    if (aminoRatio >= 0.5) patterns.push('amino_acid_dominant');
    if (carbRatio >= 0.5) patterns.push('carbohydrate_active');
    if (tcaRatio >= 0.5) patterns.push('tca_dominant');
    if (sulfurRatio >= 0.5) patterns.push('sulfur_active');
    if (nitrogenRatio >= 0.5) patterns.push('nitrogen_active');
    if (xenoRatio >= 0.5) patterns.push('xenobiotic_detected');

    if (patterns.length === 0) patterns.push('sparse_detection');

    return patterns;
}

export function buildMetaboliteReport(matches) {
    return matches.map(function(m) {
        return {
            id: m.id,
            name: m.name,
            enName: m.enName,
            hmdb: m.hmdb,
            ionMode: m.ionMode,
            observedMz: m.userMz,
            referenceMz: m.matchedMz,
            deviation: m.deviation,
            pathway: m.pathway,
            category: m.category,
            significance: m.significance
        };
    });
}

export function generatePathwayRecommendations(result) {
    var recs = [];

    if (result.coverageRate < 0.15) {
        recs.push('检测到的代谢物数量有限（' + result.matchedCount + '/' + result.totalFingerprints + '），建议增加检测离子模式以扩大代谢物覆盖范围');
    }

    var coverage = result.pathwayCoverage;
    if (coverage) {
        for (var cat in coverage) {
            var cov = coverage[cat];
            if (cov.coverageRate >= 0.8) {
                recs.push('【' + cov.name + '】通路覆盖率高（' + cov.matched + '/' + cov.total + '），相关代谢通路活跃，建议重点关注');
            }
            if (cov.coverageRate < 0.3 && cov.total > 0) {
                recs.push('【' + cov.name + '】通路覆盖率低（' + cov.matched + '/' + cov.total + '），建议补充检测或关注该通路异常');
            }
        }
    }

    if (result.overallCoverageScore < 30) {
        recs.push('整体代谢物鉴定率偏低（' + result.overallCoverageScore + '%），建议优化样品前处理和质谱参数，或扩展指纹数据库');
    }

    if (result.matchResults.length > 0) {
        recs.push('已成功鉴定 ' + result.matchResults.length + ' 种代谢物，涵盖 ' +
            Object.values(coverage || {}).filter(function(c) { return c.matched > 0; }).length + ' 个代谢通路');
    }

    if (recs.length === 0) {
        recs.push('代谢指纹匹配完成，请查看详细鉴定报告了解具体代谢物信息和生物学意义');
    }

    return recs;
}

function computeLinearFit(values) {
    var n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0 };

    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }

    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;

    return { slope: slope, intercept: intercept };
}

export function predictRiskTrend(historicalRecords, currentScore) {
    if (!historicalRecords || historicalRecords.length < 2) {
        return { predictedRisk: null, trend: 'stable', confidence: 0 };
    }

    var values = [];
    for (var i = 0; i < historicalRecords.length; i++) {
        if (historicalRecords[i] && historicalRecords[i].overallCoverageScore != null) {
            values.push(historicalRecords[i].overallCoverageScore);
        }
    }
    values.push(currentScore);

    if (values.length < 3) {
        var diff = values[values.length - 1] - values[0];
        return {
            predictedRisk: currentScore,
            trend: diff > 5 ? 'rising' : diff < -5 ? 'falling' : 'stable',
            confidence: 0.3,
            nextPrediction: currentScore + diff * 0.5
        };
    }

    var fit = computeLinearFit(values);
    var nextIndex = values.length;
    var nextPrediction = Math.max(0, Math.min(100, fit.slope * nextIndex + fit.intercept));

    var meanY = 0;
    for (var j = 0; j < values.length; j++) meanY += values[j];
    meanY /= values.length;

    var ssRes = 0, ssTot = 0;
    for (var k = 0; k < values.length; k++) {
        var predicted = fit.slope * k + fit.intercept;
        ssRes += (values[k] - predicted) * (values[k] - predicted);
        ssTot += (values[k] - meanY) * (values[k] - meanY);
    }

    var rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    var confidence = Math.min(0.95, Math.max(0.1, rSquared));

    var trend;
    if (fit.slope > 2) trend = 'rising';
    else if (fit.slope < -2) trend = 'falling';
    else trend = 'stable';

    return {
        predictedRisk: nextPrediction,
        trend: trend,
        confidence: Math.round(confidence * 100) / 100,
        nextPrediction: Math.round(nextPrediction * 10) / 10,
        riskIn3Months: Math.round(Math.max(0, Math.min(100, fit.slope * (nextIndex + 1) + fit.intercept)) * 10) / 10,
        riskIn6Months: Math.round(Math.max(0, Math.min(100, fit.slope * (nextIndex + 2) + fit.intercept)) * 10) / 10
    };
}