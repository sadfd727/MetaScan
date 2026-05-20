var STORE_KEY = 'metascan_interventions';
var VERSION_HISTORY_KEY = 'metascan_intervention_versions';

var DEFAULT_INTERVENTIONS = [
  {
    id: 'diet_sedentary_1',
    category: 'diet',
    subtype: 'sedentary',
    riskMin: 0, riskMax: 100,
    triggerIndicators: ['Lactate', 'Pyruvate'],
    content: '增加优质蛋白质摄入：鸡肉、鱼肉、鸡蛋、豆腐、希腊酸奶',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_sedentary_2',
    category: 'diet',
    subtype: 'sedentary',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '适量补充B族维生素：全麦面包、燕麦、菠菜、西兰花、香蕉',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_sedentary_3',
    category: 'diet',
    subtype: 'sedentary',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '控制精制糖摄入：避免蛋糕、糖果、甜饮料',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'exercise_sedentary_1',
    category: 'exercise',
    subtype: 'sedentary',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '每周至少150分钟中等强度运动：快走、慢跑、游泳、骑自行车',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'exercise_sedentary_2',
    category: 'exercise',
    subtype: 'sedentary',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '力量训练：每周2-3次，每次20-30分钟',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'lifestyle_sedentary_1',
    category: 'lifestyle',
    subtype: 'sedentary',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '作息时间：建议22:30前入睡，7:00起床，保证7-8小时睡眠',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'lifestyle_sedentary_2',
    category: 'lifestyle',
    subtype: 'sedentary',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '避免久坐：每小时起身活动5-10分钟，可进行伸展运动',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_obese_1',
    category: 'diet',
    subtype: 'obese',
    riskMin: 0, riskMax: 100,
    triggerIndicators: ['LDL_C', 'TG', 'TC'],
    content: '控制总热量摄入：采用低脂低糖饮食，限制油炸食品和高糖饮料',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_obese_2',
    category: 'diet',
    subtype: 'obese',
    riskMin: 0, riskMax: 100,
    triggerIndicators: ['HDL_C'],
    content: '增加优质脂肪摄入：橄榄油、坚果、牛油果、深海鱼',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'exercise_obese_1',
    category: 'exercise',
    subtype: 'obese',
    riskMin: 0, riskMax: 60,
    triggerIndicators: [],
    content: '低冲击有氧运动：游泳、骑自行车、椭圆机，每次30-45分钟',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'exercise_obese_2',
    category: 'exercise',
    subtype: 'obese',
    riskMin: 60, riskMax: 100,
    triggerIndicators: [],
    content: '在专业指导下进行运动：建议先进行体适能评估，避免运动损伤',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'lifestyle_obese_1',
    category: 'lifestyle',
    subtype: 'obese',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '每周记录体重和腰围变化，建立健康档案',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_inflammatory_1',
    category: 'diet',
    subtype: 'inflammatory',
    riskMin: 0, riskMax: 100,
    triggerIndicators: ['CRP', 'IL6', 'TNF_alpha'],
    content: '采用地中海饮食模式：多吃蔬菜水果、全谷物、橄榄油、深海鱼',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_inflammatory_2',
    category: 'diet',
    subtype: 'inflammatory',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '减少促炎食物：加工肉制品、油炸食品、含糖饮料、精制碳水',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'exercise_inflammatory_1',
    category: 'exercise',
    subtype: 'inflammatory',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '适度运动避免过度：瑜伽、太极、散步，每次30分钟，避免高强度运动加重炎症',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'lifestyle_inflammatory_1',
    category: 'lifestyle',
    subtype: 'inflammatory',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '压力管理：每天10-15分钟冥想或深呼吸练习，保持情绪稳定',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_glucose_1',
    category: 'diet',
    subtype: 'glucose',
    riskMin: 0, riskMax: 100,
    triggerIndicators: ['Glucose', 'HbA1c', 'HOMA_IR'],
    content: '选择低GI食物：全谷物、豆类、非淀粉类蔬菜，控制碳水化合物总摄入量',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_glucose_2',
    category: 'diet',
    subtype: 'glucose',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '分餐制：每日4-5餐，少量多餐，避免血糖剧烈波动',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'exercise_glucose_1',
    category: 'exercise',
    subtype: 'glucose',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '餐后30分钟轻度运动：散步15-20分钟，帮助控制餐后血糖',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'lifestyle_glucose_1',
    category: 'lifestyle',
    subtype: 'glucose',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '血糖自我监测：建议每周至少检测2次空腹血糖和餐后2小时血糖',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_amino_1',
    category: 'diet',
    subtype: 'amino',
    riskMin: 0, riskMax: 100,
    triggerIndicators: ['BCAA', 'Leucine', 'Isoleucine'],
    content: '调整蛋白质来源比例：减少红肉摄入，增加鱼类、豆制品等优质蛋白',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_amino_2',
    category: 'diet',
    subtype: 'amino',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '增加植物蛋白摄入：豆腐、豆浆、鹰嘴豆、藜麦',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'exercise_amino_1',
    category: 'exercise',
    subtype: 'amino',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '适度力量训练：每周2次，每次20-30分钟，避免高蛋白补充剂',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'lifestyle_amino_1',
    category: 'lifestyle',
    subtype: 'amino',
    riskMin: 0, riskMax: 100,
    triggerIndicators: [],
    content: '定期检测肝功能：氨基代谢异常可能提示肝脏代谢负担',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_highrisk_1',
    category: 'diet',
    subtype: 'all',
    riskMin: 60, riskMax: 100,
    triggerIndicators: [],
    content: '高风险专项饮食管理：请在营养师指导下制定个性化饮食方案',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'diet_highrisk_2',
    category: 'diet',
    subtype: 'all',
    riskMin: 60, riskMax: 100,
    triggerIndicators: [],
    content: '严格限制盐摄入（<5g/天），避免高钠加工食品',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'lifestyle_highrisk_1',
    category: 'lifestyle',
    subtype: 'all',
    riskMin: 60, riskMax: 100,
    triggerIndicators: [],
    content: '建议每月进行一次代谢指标复查，密切监测健康变化',
    version: 1, status: 'published', author: 'system',
    createdAt: Date.now(), updatedAt: Date.now()
  }
];

function getVersionHistory() {
  try {
    return JSON.parse(localStorage.getItem(VERSION_HISTORY_KEY) || '{}');
  } catch (e) { return {}; }
}

function saveVersionHistory(history) {
  localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(history));
}

export function initInterventionStore() {
  var existing = localStorage.getItem(STORE_KEY);
  if (!existing) {
    localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_INTERVENTIONS));
  }
}

export function getAllInterventions() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch (e) { return []; }
}

function saveAllInterventions(interventions) {
  localStorage.setItem(STORE_KEY, JSON.stringify(interventions));
}

export function queryInterventions(userResult) {
  var result = {
    diet: [],
    exercise: [],
    lifestyle: [],
    recommendations: [],
    all: [],
    matchScore: 0,
    generatedAt: new Date().toISOString(),
    status: 'pending_review',
    sources: []
  };

  if (!userResult) return result;

  var all = getAllInterventions().filter(function(item) { return item.status === 'published'; });
  var pathwayPatterns = userResult.pathwayPatterns || [];
  var overallCoverage = (userResult.overallCoverageScore !== undefined) ? userResult.overallCoverageScore : 0;
  var matchResultIds = (userResult.matchResults || []).map(function(m) { return m.id; });
  var seen = {};

  all.forEach(function(item) {
    var score = 0;

    if (item.subtype === 'all') {
      score += 5;
    } else if (pathwayPatterns.indexOf(item.subtype) !== -1) {
      score += 30;
    }

    if (overallCoverage >= item.riskMin && overallCoverage <= item.riskMax) {
      score += 15;
    }

    if (item.triggerIndicators && item.triggerIndicators.length > 0) {
      var matchCount = 0;
      item.triggerIndicators.forEach(function(ind) {
        if (matchResultIds.indexOf(ind) !== -1) matchCount++;
      });
      if (matchCount > 0) score += matchCount * 10;
    }

    if (score > 0 && !seen[item.id]) {
      seen[item.id] = true;
      result.all.push({ intervention: item, score: score });

      if (item.category === 'diet') result.diet.push(item.content);
      else if (item.category === 'exercise') result.exercise.push(item.content);
      else if (item.category === 'lifestyle') result.lifestyle.push(item.content);

      result.recommendations.push(item.content);
      result.sources.push({ id: item.id, category: item.category, score: score });
      result.matchScore += score;
    }
  });

  result.all.sort(function(a, b) { return b.score - a.score; });

  return result;
}

export function addIntervention(intervention) {
  var all = getAllInterventions();
  intervention.id = intervention.id || ('intv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
  intervention.version = intervention.version || 1;
  intervention.status = intervention.status || 'draft';
  intervention.createdAt = intervention.createdAt || Date.now();
  intervention.updatedAt = intervention.updatedAt || Date.now();
  intervention.author = intervention.author || 'unknown';
  all.push(intervention);
  saveAllInterventions(all);
  return intervention;
}

export function updateIntervention(id, updates) {
  var all = getAllInterventions();
  var index = all.findIndex(function(item) { return item.id === id; });
  if (index === -1) return null;

  var old = all[index];
  var versionHistory = getVersionHistory();
  if (!versionHistory[id]) versionHistory[id] = [];
  versionHistory[id].push({
    version: old.version,
    content: old.content,
    status: old.status,
    updatedAt: old.updatedAt,
    updatedBy: old.author
  });
  saveVersionHistory(versionHistory);

  all[index] = Object.assign({}, old, updates, {
    version: (old.version || 1) + 1,
    updatedAt: Date.now()
  });
  saveAllInterventions(all);
  return all[index];
}

export function deleteIntervention(id) {
  var all = getAllInterventions();
  var filtered = all.filter(function(item) { return item.id !== id; });
  if (filtered.length === all.length) return false;
  saveAllInterventions(filtered);
  return true;
}

export function publishIntervention(id) {
  return updateIntervention(id, { status: 'published' });
}

export function reviewIntervention(id) {
  return updateIntervention(id, { status: 'reviewed' });
}

export function unpublishIntervention(id) {
  return updateIntervention(id, { status: 'draft' });
}

export function getVersionHistoryForId(id) {
  var history = getVersionHistory();
  return history[id] || [];
}

export function getCategoryStats() {
  var all = getAllInterventions();
  var stats = { total: all.length, published: 0, draft: 0, reviewed: 0, diet: 0, exercise: 0, lifestyle: 0 };
  all.forEach(function(item) {
    if (item.status === 'published') stats.published++;
    if (item.status === 'draft') stats.draft++;
    if (item.status === 'reviewed') stats.reviewed++;
    if (item.category === 'diet') stats.diet++;
    if (item.category === 'exercise') stats.exercise++;
    if (item.category === 'lifestyle') stats.lifestyle++;
  });
  return stats;
}

export function resetToDefaults() {
  localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_INTERVENTIONS));
  localStorage.removeItem(VERSION_HISTORY_KEY);
}

initInterventionStore();