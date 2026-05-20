var DEFAULT_RESULT = {
    pathwayScores: { amino_acid: 0, carbohydrate: 0, organic_acid: 0, sulfur: 0, nitrogen: 0, xenobiotic: 0 },
    pathwayPatterns: ['normal'],
    matchResults: [],
    recommendations: ['无法解析AI响应，请使用规则引擎重新分析'],
    overallCoverageScore: 0,
    overallRiskLevel: '未知',
    trendPrediction: null,
    confidence: 0,
    aiDiagnosisNote: '',
    isFallback: true
};

export function parseAIResponse(responseText, inputData) {
    if (!responseText || typeof responseText !== 'string') {
        return createFallbackResult('AI返回空响应');
    }

    try {
        var json = extractJSON(responseText);
        return normalizeResult(json, inputData);
    } catch (e) {
        return createFallbackResult('AI响应解析失败: ' + e.message);
    }
}

export function extractJSON(text) {
    var jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
    }
    var codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
        return JSON.parse(codeMatch[1]);
    }
    var braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
        return JSON.parse(braceMatch[0]);
    }
    return JSON.parse(text);
}

function remapDeepSeekResponse(json) {
    var mapped = JSON.parse(JSON.stringify(json));

    var riskObj = mapped.风险评估 || mapped.risk_assessment || mapped.pathway_coverage;
    if (riskObj) {
        mapped.pathwayScores = {
            amino_acid:  riskObj.氨基酸代谢 || riskObj.amino_acid_metabolism || riskObj.amino_acid || 0,
            carbohydrate: riskObj.碳水化合物代谢 || riskObj.carbohydrate_metabolism || riskObj.carbohydrate || 0,
            organic_acid: riskObj.有机酸代谢 || riskObj.organic_acid_metabolism || riskObj.organic_acid || riskObj.TCA循环 || 0,
            sulfur: riskObj.含硫化合物代谢 || riskObj.sulfur_metabolism || riskObj.sulfur || 0,
            nitrogen: riskObj.含氮化合物代谢 || riskObj.nitrogen_metabolism || riskObj.nitrogen || 0,
            xenobiotic: riskObj.外源物代谢 || riskObj.xenobiotic_metabolism || riskObj.xenobiotic || 0
        };
        mapped.overallCoverageScore = riskObj.综合覆盖率 || riskObj.overall_coverage || mapped.overallCoverageScore ||
            Math.round((mapped.pathwayScores.amino_acid * 1.1 + mapped.pathwayScores.carbohydrate * 1.2 +
                mapped.pathwayScores.organic_acid * 1.1 + mapped.pathwayScores.sulfur * 0.9 +
                mapped.pathwayScores.nitrogen * 1.0 + mapped.pathwayScores.xenobiotic * 0.8) / 6.1);
    }

    mapped.pathwayPatterns = mapped.通路模式 || mapped.pathway_patterns || mapped.subtypes || mapped.pathwayPatterns;
    mapped.overallCoverageScore = mapped.综合覆盖率 || mapped.overallCoverageScore;
    mapped.overallRiskLevel = mapped.覆盖等级 || mapped.overallRiskLevel;
    mapped.recommendations = mapped.建议 || mapped.recommendations;

    var matchedItems = mapped.匹配代谢物 || mapped.matched_metabolites;
    if (matchedItems && !mapped.matchResults) {
        mapped.matchResults = matchedItems.map(function(item) {
            return {
                name: item.代谢物 || item.name || item.metabolite || '',
                hmdb: item.HMDB || item.hmdb || '',
                ionMode: item.离子模式 || item.ion_mode || item.ionMode || '',
                deviation: item.偏差 || item.deviation || 0,
                pathway: item.通路 || item.pathway || '',
                significance: item.生物学意义 || item.significance || ''
            };
        });
    }

    return mapped;
}

function normalizeResult(json, inputData) {
    var result = {};
    json = remapDeepSeekResponse(json);

    result.pathwayScores = normalizeObject(json.pathwayScores || json.pathway_scores || json.风险评估 || {}, {
        amino_acid: clamp(json.overallCoverageScore || 0, 0, 100),
        carbohydrate: 0,
        organic_acid: 0,
        sulfur: 0,
        nitrogen: 0,
        xenobiotic: 0
    }, 0, 100);

    result.overallCoverageScore = clamp(
        json.overallCoverageScore || json.综合覆盖率 ||
        computeWeightedAvg(result.pathwayScores),
        0, 100
    );

    result.overallRiskLevel = normalizeRiskLevel(
        json.overallRiskLevel || json.覆盖等级,
        result.overallCoverageScore
    );

    result.pathwayPatterns = normalizePathwayPatterns(json.pathwayPatterns || json.通路模式 || json.亚型 || []);
    result.matchResults = normalizeMatchResults(
        json.matchResults || json.matched_metabolites || json.匹配代谢物 || [],
        inputData
    );
    result.recommendations = normalizeRecommendations(
        json.recommendations || json.建议 || []
    );
    result.trendPrediction = normalizeTrendPrediction(
        json.trendPrediction || json.trend_prediction || json.趋势预测
    );
    result.confidence = clamp(
        json.confidence || json.置信度 || 0.85,
        0, 1
    );
    result.aiDiagnosisNote = json.aiDiagnosisNote || json.诊断备注 || '';
    result.isFallback = false;

    return result;
}

function normalizeObject(value, defaults, min, max) {
    var result = {};
    var keys = Object.keys(defaults);
    keys.forEach(function(k) {
        result[k] = clamp(
            value && value[k] !== undefined ? Number(value[k]) : defaults[k],
            min, max
        );
    });
    return result;
}

function normalizeRiskLevel(level, overallScore) {
    var valid = ['优秀', '良好', '一般', '待优化', 'low', 'medium', 'high', 'critical'];
    if (level && valid.indexOf(level) !== -1) {
        return level;
    }
    if (overallScore >= 75) return '优秀';
    if (overallScore >= 50) return '良好';
    if (overallScore >= 25) return '一般';
    return '待优化';
}

function normalizePathwayPatterns(patterns) {
    if (!Array.isArray(patterns) || patterns.length === 0) {
        return ['sparse_detection'];
    }
    var validPatterns = {
        'amino_acid_dominant': 'amino_acid_dominant',
        'carbohydrate_active': 'carbohydrate_active',
        'tca_dominant': 'tca_dominant',
        'sulfur_active': 'sulfur_active',
        'nitrogen_active': 'nitrogen_active',
        'xenobiotic_detected': 'xenobiotic_detected',
        'sparse_detection': 'sparse_detection',
        'insufficient_data': 'insufficient_data'
    };
    var mapped = patterns.map(function(s) {
        return validPatterns[s] || s;
    });
    return mapped.length > 0 ? mapped : ['sparse_detection'];
}

function normalizeMatchResults(matched, inputData) {
    if (!Array.isArray(matched) || matched.length === 0) {
        return [];
    }
    return matched.map(function(item) {
        return {
            name: item.name || item.metabolite || item.代谢物 || '',
            enName: item.enName || '',
            hmdb: item.hmdb || item.HMDB || '',
            ionMode: item.ionMode || item.离子模式 || '',
            deviation: item.deviation !== undefined ? Number(item.deviation) : 0,
            pathway: item.pathway || item.通路 || '',
            significance: item.significance || item.生物学意义 || ''
        };
    });
}

function normalizeRecommendations(recs) {
    if (!Array.isArray(recs) || recs.length === 0) {
        return ['保持健康生活方式，定期复查代谢指标'];
    }
    return recs.filter(function(r) {
        return typeof r === 'string' && r.length > 0;
    }).slice(0, 15);
}

function normalizeTrendPrediction(prediction) {
    if (!prediction) return null;
    return {
        threeMonth: clamp(
            prediction.threeMonth || prediction.three_month || prediction['3个月'] || 50,
            0, 100
        ),
        sixMonth: clamp(
            prediction.sixMonth || prediction.six_month || prediction['6个月'] || 50,
            0, 100
        ),
        confidence: clamp(
            prediction.confidence || prediction.置信度 || 0.7,
            0, 1
        ),
        note: prediction.note || prediction.说明 || ''
    };
}

function computeWeightedAvg(scores) {
    var weights = {
        amino_acid: 1.1, carbohydrate: 1.2, organic_acid: 1.1,
        sulfur: 0.9, nitrogen: 1.0, xenobiotic: 0.8
    };
    var sum = 0, weight = 0;
    for (var k in scores) {
        if (weights[k] !== undefined) {
            sum += scores[k] * weights[k];
            weight += weights[k];
        }
    }
    return weight > 0 ? Math.round(sum / weight) : 0;
}

function clamp(value, min, max) {
    var num = Number(value);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
}

export function createFallbackResult(reason) {
    var fallback = JSON.parse(JSON.stringify(DEFAULT_RESULT));
    fallback.aiDiagnosisNote = reason;
    fallback.isFallback = true;
    return fallback;
}