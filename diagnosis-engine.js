import { analyzeMetabolicData as ruleEngineAnalyze } from './analysis.js';
import { analyzeWithAI, getAIMetrics, configureAIDiagnosis } from './ai-diagnosis.js';
import { createFallbackResult } from './postprocess.js';

var USE_AI = false;
var MERGE_RESULTS = true;

export function enableAIDiagnosis(apiKey) {
    if (apiKey) {
        configureAIDiagnosis({ apiKey: apiKey });
    }
    USE_AI = true;
}

export function disableAIDiagnosis() {
    USE_AI = false;
}

export function isAIEnabled() {
    return USE_AI;
}

function normalizeResult(result) {
    if (!result) return result;
    result.overallRisk = result.overallCoverageScore;
    result.riskScores = result.pathwayScores;
    result.subtypes = result.pathwayPatterns;
    result.abnormalMetabolites = result.matchResults;
    result.matchedCount = result.matchedCount;
    result.totalFingerprints = result.totalFingerprints;
    result.coverageRate = result.coverageRate;
    result.pathwayCoverage = result.pathwayCoverage;
    result.identifiedMetabolites = result.identifiedMetabolites;
    result.mzPeaks = result.mzPeaks;
    return result;
}

export async function analyzeMetabolicData(data, historicalRecords) {
    if (!USE_AI) {
        return normalizeResult(ruleEngineAnalyze(data, historicalRecords));
    }

    try {
        var aiResult = await analyzeWithAI(data, historicalRecords);

        if (aiResult.isFallback) {
            var ruleResult = ruleEngineAnalyze(data, historicalRecords);
            ruleResult.aiStatus = 'fallback';
            ruleResult.aiNote = aiResult.aiDiagnosisNote;
            return normalizeResult(ruleResult);
        }

        if (MERGE_RESULTS) {
            var ruleResult = ruleEngineAnalyze(data, historicalRecords);
            return normalizeResult(mergeResults(aiResult, ruleResult));
        }

        return normalizeResult(aiResult);
    } catch (e) {
        var ruleResult = ruleEngineAnalyze(data, historicalRecords);
        ruleResult.aiStatus = 'error';
        ruleResult.aiNote = 'AI分析异常: ' + (e && e.message ? e.message : '未知错误');
        return normalizeResult(ruleResult);
    }
}

function mergeResults(aiResult, ruleResult) {
    var aiScores = aiResult.riskScores || aiResult.pathwayScores || {};
    var ruleScores = ruleResult.pathwayScores || ruleResult.riskScores || {};

    var merged = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('zh-CN'),
        data: ruleResult.data,
        mzPeaks: ruleResult.mzPeaks,

        overallCoverageScore: Math.round((aiResult.overallCoverageScore || aiResult.overallRisk || 0) * 0.6 + (ruleResult.overallCoverageScore || 0) * 0.4),

        pathwayScores: {
            amino_acid: Math.round(((aiScores.amino_acid || 0) * 0.7 + (ruleScores.amino_acid || 0) * 0.3) * 10) / 10,
            carbohydrate: Math.round(((aiScores.carbohydrate || 0) * 0.7 + (ruleScores.carbohydrate || 0) * 0.3) * 10) / 10,
            organic_acid: Math.round(((aiScores.organic_acid || 0) * 0.7 + (ruleScores.organic_acid || 0) * 0.3) * 10) / 10,
            sulfur: Math.round(((aiScores.sulfur || 0) * 0.7 + (ruleScores.sulfur || 0) * 0.3) * 10) / 10,
            nitrogen: Math.round(((aiScores.nitrogen || 0) * 0.7 + (ruleScores.nitrogen || 0) * 0.3) * 10) / 10,
            xenobiotic: Math.round(((aiScores.xenobiotic || 0) * 0.7 + (ruleScores.xenobiotic || 0) * 0.3) * 10) / 10
        },

        pathwayCoverage: ruleResult.pathwayCoverage || {},
        matchResults: ruleResult.matchResults || [],
        matchedCount: ruleResult.matchedCount || 0,
        totalFingerprints: ruleResult.totalFingerprints || 26,
        coverageRate: ruleResult.coverageRate || 0,
        identifiedMetabolites: ruleResult.identifiedMetabolites || [],
        pathwayPatterns: mergeSubtypes(aiResult.subtypes || aiResult.pathwayPatterns, ruleResult.pathwayPatterns),
        recommendations: deduplicateRecommendations(
            (aiResult.recommendations || []).concat(ruleResult.recommendations || [])
        ),

        trendPrediction: ruleResult.trendPrediction,
        aiConfidence: aiResult.confidence || 0,
        aiProcessingTimeMs: aiResult.processingTimeMs || 0,
        model: aiResult.model || 'unknown',
        aiDiagnosisNote: aiResult.aiDiagnosisNote || '',
        aiStatus: 'success'
    };

    if (aiResult.trendPrediction && aiResult.trendPrediction.threeMonth !== undefined) {
        merged.trendPrediction = {
            threeMonth: aiResult.trendPrediction.threeMonth,
            sixMonth: aiResult.trendPrediction.sixMonth,
            confidence: aiResult.trendPrediction.confidence || 0.7,
            note: aiResult.trendPrediction.note || ''
        };
    }

    return merged;
}

function mergeSubtypes(aiSubtypes, ruleSubtypes) {
    var combined = [];
    var seen = {};

    (aiSubtypes || []).concat(ruleSubtypes || []).forEach(function(s) {
        if (s && s !== 'normal' && !seen[s]) {
            seen[s] = true;
            combined.push(s);
        }
    });

    return combined.length > 0 ? combined : ['normal'];
}

function deduplicateRecommendations(recs) {
    var seen = {};
    var result = [];
    recs.forEach(function(r) {
        var key = r.slice(0, 30).trim().toLowerCase();
        if (!seen[key]) {
            seen[key] = true;
            result.push(r);
        }
    });
    return result.slice(0, 20);
}

window.enableAIDiagnosis = enableAIDiagnosis;
window.disableAIDiagnosis = disableAIDiagnosis;
window.isAIEnabled = isAIEnabled;
window.analyzeMetabolicData = analyzeMetabolicData;
window.getAIMetrics = getAIMetrics;