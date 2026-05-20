import { queryInterventions, getCategoryStats } from './intervention-store.js';
import { categoryNames } from './config.js';

var AUDIT_KEY = 'metascan_recommendation_audit';
var REVIEW_QUEUE_KEY = 'metascan_review_queue';

export function generateDynamicRecommendations(userResult) {
  if (!userResult) {
    return createEmptyResult('缺少用户分析数据');
  }

  var rawResult = queryInterventions(userResult);

  if (rawResult.all.length === 0) {
    var fallback = generateFallbackRecommendations(userResult);
    fallback.status = 'fallback_no_match';
    fallback.statusMessage = '未匹配到合适的干预方案，已使用通用建议替代';
    return fallback;
  }

  var enriched = enrichRecommendations(rawResult, userResult);
  enriched = validateRecommendations(enriched);

  saveAuditTrail(userResult, enriched);

  return enriched;
}

function createEmptyResult(message) {
  return {
    diet: [],
    exercise: [],
    lifestyle: [],
    recommendations: [],
    all: [],
    matchScore: 0,
    confidence: 0,
    generatedAt: new Date().toISOString(),
    status: 'empty',
    statusMessage: message,
    sources: [],
    validation: { passed: false, warnings: [message] }
  };
}

function enrichRecommendations(raw, userResult) {
  var pathwayPatterns = userResult.pathwayPatterns || [];
  var overallScore = userResult.overallCoverageScore || 0;

  var patternNames = pathwayPatterns.map(function(s) {
    return window.categoryNames && window.categoryNames[s] ? window.categoryNames[s] : s;
  }).join('、');

  var enriched = Object.assign({}, raw);

  enriched.patientProfile = {
    pathwayPatterns: pathwayPatterns,
    patternNames: patternNames,
    overallScore: overallScore,
    coverageLevel: overallScore >= 70 ? 'high' : overallScore >= 40 ? 'medium' : 'low',
    matchCount: (userResult.matchResults || []).length
  };

  enriched.confidence = calculateConfidence(raw, userResult);

  enriched.summary = generateSummary(enriched, userResult);

  enriched.status = 'pending_review';
  enriched.statusMessage = '方案已生成，待医生审核确认';

  return enriched;
}

function calculateConfidence(raw, userResult) {
  if (raw.all.length === 0) return 0;

  var subtypeCount = (userResult.pathwayPatterns || []).length;
  var abnormalCount = (userResult.matchResults || []).length;

  var baseConfidence = 60;

  var subtypeBonus = Math.min(subtypeCount * 10, 20);
  var indicatorBonus = Math.min(abnormalCount * 3, 15);
  var scoreBonus = Math.min(raw.matchScore / 5, 5);

  return Math.min(baseConfidence + subtypeBonus + indicatorBonus + scoreBonus, 98);
}

function generateSummary(enriched, userResult) {
  var parts = [];

  parts.push('基于您的' + (enriched.patientProfile.patternNames || '健康') + '通路模式');

  if (enriched.diet.length > 0) parts.push('饮食调整方案');
  if (enriched.exercise.length > 0) parts.push('运动指导');
  if (enriched.lifestyle.length > 0) parts.push('生活方式建议');

  var coverageLevel = enriched.patientProfile.coverageLevel;
  var riskText = coverageLevel === 'low' ? '低覆盖(需优化)' : coverageLevel === 'medium' ? '中等覆盖' : '高覆盖';

  return {
    text: parts.join('、') + '，当前为' + riskText + '状态',
    matchedCount: enriched.all.length,
    categoriesCovered: [enriched.diet.length > 0 ? 'diet' : null, enriched.exercise.length > 0 ? 'exercise' : null, enriched.lifestyle.length > 0 ? 'lifestyle' : null].filter(Boolean)
  };
}

function generateFallbackRecommendations(userResult) {
  var fallback = {
    diet: [],
    exercise: [],
    lifestyle: [],
    recommendations: [],
    all: [],
    matchScore: 0,
    confidence: 30,
    generatedAt: new Date().toISOString(),
    status: 'fallback',
    statusMessage: '使用通用健康建议（请由医生进一步定制）',
    sources: [],
    patientProfile: {
      subtypes: userResult.pathwayPatterns || [],
      overallRisk: userResult.overallCoverageScore || 0
    },
    validation: { passed: false, warnings: ['使用了通用备选方案'] }
  };

  var pathwayPatterns = userResult.pathwayPatterns || [];

  pathwayPatterns.forEach(function(subtype) {
    if (window.subtypes && window.subtypes[subtype]) {
      var config = window.subtypes[subtype];
      if (config.diet) fallback.diet = fallback.diet.concat(config.diet);
      if (config.exercise) fallback.exercise = fallback.exercise.concat(config.exercise);
      if (config.lifestyle) fallback.lifestyle = fallback.lifestyle.concat(config.lifestyle);
      if (config.recommendations) fallback.recommendations = fallback.recommendations.concat(config.recommendations);
    }
  });

  if (fallback.recommendations.length === 0) {
    fallback.diet = ['保持均衡饮食，多摄入蔬菜水果和全谷物'];
    fallback.exercise = ['建议每周进行至少150分钟中等强度有氧运动'];
    fallback.lifestyle = ['保持规律作息，确保7-8小时充足睡眠'];
    fallback.recommendations = ['定期体检，关注代谢指标变化'];
  }

  return fallback;
}

function validateRecommendations(enriched) {
  var warnings = [];
  var errors = [];

  if (enriched.diet.length === 0 && enriched.exercise.length === 0 && enriched.lifestyle.length === 0) {
    warnings.push('干预方案覆盖不完整，部分类别无推荐');
  }

  if (enriched.diet.length > 15) warnings.push('饮食建议过多（' + enriched.diet.length + '条），建议精简');
  if (enriched.exercise.length > 10) warnings.push('运动建议过多（' + enriched.exercise.length + '条），建议精简');
  if (enriched.lifestyle.length > 10) warnings.push('生活建议过多（' + enriched.lifestyle.length + '条），建议精简');

  if (enriched.confidence < 40) errors.push('推荐置信度过低，建议医生手动审核');

  if (enriched.diet.length === 0) warnings.push('缺少饮食建议');
  if (enriched.exercise.length === 0) warnings.push('缺少运动建议');

  enriched.validation = {
    passed: errors.length === 0,
    warnings: warnings,
    errors: errors,
    validatedAt: new Date().toISOString()
  };

  return enriched;
}

export function approveRecommendations(recommendationId) {
  var auditLog = getAuditLog();
  var entry = auditLog.find(function(e) { return e.recommendationId === recommendationId; });
  if (!entry) return false;

  entry.status = 'approved';
  entry.approvedAt = new Date().toISOString();
  entry.approvedBy = getCurrentDoctorName();
  saveAuditLog(auditLog);

  removeFromReviewQueue(recommendationId);
  return true;
}

export function rejectRecommendations(recommendationId, reason) {
  var auditLog = getAuditLog();
  var entry = auditLog.find(function(e) { return e.recommendationId === recommendationId; });
  if (!entry) return false;

  entry.status = 'rejected';
  entry.rejectedAt = new Date().toISOString();
  entry.rejectedBy = getCurrentDoctorName();
  entry.rejectionReason = reason || '未提供原因';
  saveAuditLog(auditLog);

  removeFromReviewQueue(recommendationId);
  return true;
}

export function modifyRecommendation(recommendationId, modifications) {
  var auditLog = getAuditLog();
  var entry = auditLog.find(function(e) { return e.recommendationId === recommendationId; });
  if (!entry) return false;

  if (!entry.modifications) entry.modifications = [];
  entry.modifications.push({
    timestamp: new Date().toISOString(),
    modifiedBy: getCurrentDoctorName(),
    changes: modifications
  });

  entry.status = 'modified';
  entry.modifiedAt = new Date().toISOString();
  saveAuditLog(auditLog);
  return true;
}

export function getReviewQueue() {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_QUEUE_KEY) || '[]');
  } catch (e) { return []; }
}

export function addToReviewQueue(recommendation) {
  var queue = getReviewQueue();
  queue.push({
    id: 'rev_' + Date.now(),
    patientId: recommendation.patientId || 'unknown',
    generatedAt: recommendation.generatedAt,
    confidence: recommendation.confidence,
    status: 'pending',
    summary: recommendation.summary
  });
  localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
}

function removeFromReviewQueue(recommendationId) {
  var queue = getReviewQueue();
  queue = queue.filter(function(item) { return item.id !== recommendationId; });
  localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
}

function saveAuditTrail(userResult, enriched) {
  var auditLog = getAuditLog();
  var entry = {
    recommendationId: 'rec_' + Date.now(),
    patientId: userResult.username || (userResult.patientId || 'unknown'),
    generatedAt: enriched.generatedAt,
    status: 'pending_review',
    confidence: enriched.confidence,
    matchScore: enriched.matchScore,
    pathwayPatterns: enriched.patientProfile ? enriched.patientProfile.pathwayPatterns : [],
    overallRisk: enriched.patientProfile ? enriched.patientProfile.overallScore : 0,
    sources: enriched.sources || [],
    validation: enriched.validation
  };

  auditLog.unshift(entry);
  if (auditLog.length > 100) auditLog.length = 100;
  saveAuditLog(auditLog);

  addToReviewQueue(entry);
}

function getAuditLog() {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  } catch (e) { return []; }
}

function saveAuditLog(log) {
  localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
}

function getCurrentDoctorName() {
  try {
    var currentUser = JSON.parse(localStorage.getItem('metascanCurrentUser') || '{}');
    return (currentUser.fullName || currentUser.username || 'unknown');
  } catch (e) { return 'unknown'; }
}

export function getAuditTrailForPatient(patientId) {
  var auditLog = getAuditLog();
  return auditLog.filter(function(entry) { return entry.patientId === patientId; });
}

export function getPendingReviewCount() {
  var queue = getReviewQueue();
  return queue.filter(function(item) { return item.status === 'pending'; }).length;
}

export function getRecommendationStats() {
  var auditLog = getAuditLog();
  var stats = {
    total: auditLog.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    modified: 0,
    avgConfidence: 0
  };

  var confidenceSum = 0;
  var confidenceCount = 0;

  auditLog.forEach(function(entry) {
    if (entry.status === 'pending_review' || entry.status === 'pending') stats.pending++;
    else if (entry.status === 'approved') stats.approved++;
    else if (entry.status === 'rejected') stats.rejected++;
    else if (entry.status === 'modified') stats.modified++;

    if (entry.confidence !== undefined) {
      confidenceSum += entry.confidence;
      confidenceCount++;
    }
  });

  stats.avgConfidence = confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0;

  return stats;
}

export function getCombinedRecommendations(userResult) {
  var dynamic = generateDynamicRecommendations(userResult);
  return dynamic;
}