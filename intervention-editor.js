import {
  getAllInterventions, addIntervention, updateIntervention,
  deleteIntervention, publishIntervention, reviewIntervention,
  unpublishIntervention, getVersionHistoryForId, getCategoryStats,
  resetToDefaults
} from './intervention-store.js';
import { subtypes } from './config.js';
import { showNotification } from './notifications.js';

var currentFilter = 'all';
var currentCategoryFilter = 'all';
var currentStatusFilter = 'all';
var currentSearch = '';
var editingId = null;
var showVersionPanel = false;

export function renderInterventionEditor(container) {
  if (!container) return;

  container.innerHTML = buildEditorHTML();
  bindEditorEvents(container);
  refreshInterventionList(container);
}

function buildEditorHTML() {
  return '<div class="intv-editor">' +
    buildHeaderHTML() +
    buildStatsBarHTML() +
    buildToolbarHTML() +
    buildListContainerHTML() +
    buildFormModalHTML() +
    buildVersionModalHTML() +
    buildResetConfirmHTML() +
    '</div>';
}

function buildHeaderHTML() {
  return '<div class="intv-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">' +
    '<div><h3 style="color:#1a2980;margin:0;font-size:1.2rem;display:flex;align-items:center;gap:10px;">' +
    '<span>📋</span><span>干预方案编辑器</span>' +
    '<span style="font-size:0.75rem;color:#94a3b8;font-weight:400;">（医生专有功能）</span></h3>' +
    '<p style="color:#64748b;font-size:0.85rem;margin:4px 0 0 0;">管理饮食、运动及生活方式干预方案，支持版本控制与审核发布</p></div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="intv-btn intv-btn-outline" onclick="window._intvShowReset()" title="恢复系统默认方案">🔄 重置默认</button>' +
    '<button class="intv-btn intv-btn-primary" onclick="window._intvShowCreate()" title="创建新的干预方案">+ 新建方案</button>' +
    '</div></div>';
}

function buildStatsBarHTML() {
  return '<div class="intv-stats" id="intvStatsBar" style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;"></div>';
}

function buildToolbarHTML() {
  return '<div class="intv-toolbar" style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">' +
    '<input type="text" id="intvSearch" placeholder="搜索方案内容..." style="flex:1;min-width:200px;padding:9px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;" oninput="window._intvSearch()">' +
    '<select id="intvCategoryFilter" onchange="window._intvFilter()" style="padding:9px 12px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:0.85rem;">' +
    '<option value="all">全部类别</option><option value="diet">🥗 饮食</option><option value="exercise">🏃 运动</option><option value="lifestyle">🌿 生活方式</option></select>' +
    '<select id="intvSubtypeFilter" onchange="window._intvFilter()" style="padding:9px 12px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:0.85rem;">' +
    '<option value="all">全部亚型</option><option value="sedentary">运动不足型</option><option value="obese">肥胖代谢紊乱型</option><option value="inflammatory">炎症饮食相关型</option><option value="glucose">糖代谢异常型</option><option value="amino">氨基酸代谢紊乱型</option><option value="all">通用（所有亚型）</option></select>' +
    '<select id="intvStatusFilter" onchange="window._intvFilter()" style="padding:9px 12px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:0.85rem;">' +
    '<option value="all">全部状态</option><option value="published">✅ 已发布</option><option value="draft">📝 草稿</option><option value="reviewed">👍 已审核</option></select>' +
    '</div>';
}

function buildListContainerHTML() {
  return '<div id="intvListContainer" style="max-height:500px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:12px;background:white;"></div>' +
    '<div style="text-align:center;margin-top:8px;color:#94a3b8;font-size:0.8rem;" id="intvListInfo"></div>';
}

function buildFormModalHTML() {
  return '<div id="intvFormOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:16px;padding:30px;width:90%;max-width:700px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);">' +
    '<h3 id="intvFormTitle" style="color:#1a2980;margin:0 0 20px 0;font-size:1.2rem;">创建干预方案</h3>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
    '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">类别 *</label>' +
    '<select id="intvFormCategory" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"><option value="diet">🥗 饮食建议</option><option value="exercise">🏃 运动指导</option><option value="lifestyle">🌿 生活方式</option></select></div>' +
    '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">适用亚型 *</label>' +
    '<select id="intvFormSubtype" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"><option value="all">通用（所有亚型）</option><option value="sedentary">运动不足型</option><option value="obese">肥胖代谢紊乱型</option><option value="inflammatory">炎症饮食相关型</option><option value="glucose">糖代谢异常型</option><option value="amino">氨基酸代谢紊乱型</option></select></div>' +
    '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">最低风险分</label>' +
    '<input type="number" id="intvFormRiskMin" value="0" min="0" max="100" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div>' +
    '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">最高风险分</label>' +
    '<input type="number" id="intvFormRiskMax" value="100" min="0" max="100" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div>' +
    '</div>' +
    '<div style="margin-top:14px;"><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">触发指标（逗号分隔，如 LDL_C,Glucose）</label>' +
    '<input type="text" id="intvFormTriggers" placeholder="留空表示始终匹配" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div>' +
    '<div style="margin-top:14px;"><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">方案内容 *</label>' +
    '<textarea id="intvFormContent" rows="4" placeholder="请填写干预方案的具体内容..." style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;resize:vertical;font-family:inherit;"></textarea></div>' +
    '<div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">' +
    '<button class="intv-btn intv-btn-outline" onclick="window._intvCloseForm()">取消</button>' +
    '<button class="intv-btn intv-btn-primary" onclick="window._intvSaveForm()">💾 保存</button>' +
    '</div></div></div>';
}

function buildVersionModalHTML() {
  return '<div id="intvVersionOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:16px;padding:30px;width:90%;max-width:600px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);">' +
    '<h3 style="color:#1a2980;margin:0 0 20px 0;font-size:1.2rem;">📜 版本历史</h3>' +
    '<div id="intvVersionList" style="max-height:400px;overflow-y:auto;"></div>' +
    '<div style="margin-top:20px;text-align:right;">' +
    '<button class="intv-btn intv-btn-outline" onclick="window._intvCloseVersion()">关闭</button>' +
    '</div></div></div>';
}

function buildResetConfirmHTML() {
  return '<div id="intvResetOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:16px;padding:30px;width:90%;max-width:450px;box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center;">' +
    '<div style="font-size:3rem;margin-bottom:12px;">⚠️</div>' +
    '<h3 style="color:#e74c3c;margin:0 0 12px 0;">确认重置？</h3>' +
    '<p style="color:#666;margin:0 0 20px 0;">此操作将删除所有自定义干预方案，恢复为系统默认方案。此操作不可撤销。</p>' +
    '<div style="display:flex;justify-content:center;gap:10px;">' +
    '<button class="intv-btn intv-btn-outline" onclick="window._intvCloseReset()">取消</button>' +
    '<button class="intv-btn intv-btn-danger" onclick="window._intvConfirmReset()">确认重置</button>' +
    '</div></div></div>';
}

function bindEditorEvents(container) {
  window._intvFilter = function() {
    currentCategoryFilter = document.getElementById('intvCategoryFilter').value;
    currentStatusFilter = document.getElementById('intvStatusFilter').value;
    currentFilter = document.getElementById('intvSubtypeFilter').value;
    refreshInterventionList(container);
  };

  window._intvSearch = function() {
    currentSearch = (document.getElementById('intvSearch').value || '').toLowerCase();
    refreshInterventionList(container);
  };

  window._intvShowCreate = function() {
    editingId = null;
    document.getElementById('intvFormTitle').textContent = '创建干预方案';
    document.getElementById('intvFormCategory').value = 'diet';
    document.getElementById('intvFormSubtype').value = 'all';
    document.getElementById('intvFormRiskMin').value = '0';
    document.getElementById('intvFormRiskMax').value = '100';
    document.getElementById('intvFormTriggers').value = '';
    document.getElementById('intvFormContent').value = '';
    document.getElementById('intvFormOverlay').style.display = 'flex';
  };

  window._intvEdit = function(id) {
    editingId = id;
    var interventions = getAllInterventions();
    var item = interventions.find(function(i) { return i.id === id; });
    if (!item) return;

    document.getElementById('intvFormTitle').textContent = '编辑干预方案 (v' + (item.version || 1) + ')';
    document.getElementById('intvFormCategory').value = item.category;
    document.getElementById('intvFormSubtype').value = item.subtype;
    document.getElementById('intvFormRiskMin').value = item.riskMin;
    document.getElementById('intvFormRiskMax').value = item.riskMax;
    document.getElementById('intvFormTriggers').value = (item.triggerIndicators || []).join(',');
    document.getElementById('intvFormContent').value = item.content;
    document.getElementById('intvFormOverlay').style.display = 'flex';
  };

  window._intvCloseForm = function() {
    document.getElementById('intvFormOverlay').style.display = 'none';
    editingId = null;
  };

  window._intvSaveForm = function() {
    var category = document.getElementById('intvFormCategory').value;
    var subtypeVal = document.getElementById('intvFormSubtype').value;
    var riskMin = parseInt(document.getElementById('intvFormRiskMin').value) || 0;
    var riskMax = parseInt(document.getElementById('intvFormRiskMax').value) || 100;
    var triggersRaw = document.getElementById('intvFormTriggers').value.trim();
    var content = document.getElementById('intvFormContent').value.trim();
    var triggers = triggersRaw ? triggersRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

    if (!content) { showNotification('请填写方案内容', 'warning'); return; }

    if (editingId) {
      updateIntervention(editingId, {
        category: category, subtype: subtypeVal,
        riskMin: riskMin, riskMax: riskMax,
        triggerIndicators: triggers, content: content
      });
      showNotification('方案已更新（版本号已递增）');
    } else {
      addIntervention({
        category: category, subtype: subtypeVal,
        riskMin: riskMin, riskMax: riskMax,
        triggerIndicators: triggers, content: content,
        author: getCurrentUserName()
      });
      showNotification('新方案已创建');
    }

    document.getElementById('intvFormOverlay').style.display = 'none';
    editingId = null;
    refreshInterventionList(container);
  };

  window._intvPublish = function(id) {
    publishIntervention(id);
    showNotification('方案已发布');
    refreshInterventionList(container);
  };

  window._intvUnpublish = function(id) {
    unpublishIntervention(id);
    showNotification('方案已取消发布');
    refreshInterventionList(container);
  };

  window._intvReview = function(id) {
    reviewIntervention(id);
    showNotification('方案已审核通过');
    refreshInterventionList(container);
  };

  window._intvDelete = function(id) {
    if (confirm('确定要删除此干预方案吗？此操作不可恢复。')) {
      deleteIntervention(id);
      showNotification('方案已删除');
      refreshInterventionList(container);
    }
  };

  window._intvShowVersion = function(id) {
    var versions = getVersionHistoryForId(id);
    var listEl = document.getElementById('intvVersionList');
    if (!listEl) return;

    if (versions.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:30px;">暂无版本历史记录</div>';
    } else {
      listEl.innerHTML = versions.map(function(v, i) {
        return '<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">' +
          '<div style="font-weight:600;color:#1a2980;">v' + v.version + ' <span style="font-size:0.75rem;color:#94a3b8;">' + formatTimestamp(v.updatedAt) + '</span></div>' +
          '<div style="font-size:0.85rem;color:#333;margin-top:4px;">' + v.content + '</div>' +
          '<div style="font-size:0.75rem;color:#64748b;">状态: ' + v.status + ' | 操作者: ' + (v.updatedBy || '未知') + '</div></div>';
      }).join('');
    }

    document.getElementById('intvVersionOverlay').style.display = 'flex';
  };

  window._intvCloseVersion = function() {
    document.getElementById('intvVersionOverlay').style.display = 'none';
  };

  window._intvShowReset = function() {
    document.getElementById('intvResetOverlay').style.display = 'flex';
  };

  window._intvCloseReset = function() {
    document.getElementById('intvResetOverlay').style.display = 'none';
  };

  window._intvConfirmReset = function() {
    resetToDefaults();
    document.getElementById('intvResetOverlay').style.display = 'none';
    showNotification('已恢复为系统默认方案');
    refreshInterventionList(container);
  };

  document.getElementById('intvFormOverlay').addEventListener('click', function(e) {
    if (e.target === this) window._intvCloseForm();
  });
  document.getElementById('intvVersionOverlay').addEventListener('click', function(e) {
    if (e.target === this) window._intvCloseVersion();
  });
  document.getElementById('intvResetOverlay').addEventListener('click', function(e) {
    if (e.target === this) window._intvCloseReset();
  });
}

function refreshInterventionList(container) {
  var all = getAllInterventions();

  if (currentCategoryFilter !== 'all') all = all.filter(function(i) { return i.category === currentCategoryFilter; });
  if (currentFilter !== 'all') all = all.filter(function(i) { return i.subtype === currentFilter || i.subtype === 'all'; });
  if (currentStatusFilter !== 'all') all = all.filter(function(i) { return i.status === currentStatusFilter; });
  if (currentSearch) all = all.filter(function(i) { return i.content.toLowerCase().indexOf(currentSearch) !== -1; });

  updateStatsBar(all);
  renderInterventionList(all);
}

function updateStatsBar(interventions) {
  var stats = getCategoryStats();
  var bar = document.getElementById('intvStatsBar');
  if (!bar) return;

  var displayTotal = interventions.length;
  var displayPublished = interventions.filter(function(i) { return i.status === 'published'; }).length;
  var displayDraft = interventions.filter(function(i) { return i.status === 'draft'; }).length;

  bar.innerHTML =
    '<div style="background:#f8fafc;padding:8px 16px;border-radius:10px;font-size:0.85rem;"><strong>总计:</strong> ' + stats.total + ' 条</div>' +
    '<div style="background:#f0fdf4;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#16a34a;"><strong>已发布:</strong> ' + stats.published + ' 条</div>' +
    '<div style="background:#fef3c7;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#d97706;"><strong>草稿:</strong> ' + stats.draft + ' 条</div>' +
    '<div style="background:#dbeafe;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#2563eb;"><strong>已审核:</strong> ' + stats.reviewed + ' 条</div>' +
    (displayTotal !== stats.total ? '<div style="background:#f1f5f9;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#64748b;"><strong>筛选结果:</strong> ' + displayTotal + ' 条</div>' : '');
}

function renderInterventionList(interventions) {
  var listContainer = document.getElementById('intvListContainer');
  var listInfo = document.getElementById('intvListInfo');
  if (!listContainer) return;

  if (interventions.length === 0) {
    listContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无匹配的干预方案<br><br><button class="intv-btn intv-btn-primary" onclick="window._intvShowCreate()">+ 创建第一个方案</button></div>';
    if (listInfo) listInfo.textContent = '';
    return;
  }

  if (listInfo) listInfo.textContent = '显示 ' + interventions.length + ' 条方案';

  listContainer.innerHTML = interventions.map(function(item) {
    var statusBadge = item.status === 'published' ? '<span style="background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">✅ 已发布</span>' :
      item.status === 'reviewed' ? '<span style="background:#dbeafe;color:#2563eb;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">👍 已审核</span>' :
      '<span style="background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">📝 草稿</span>';

    var catIcon = item.category === 'diet' ? '🥗' : item.category === 'exercise' ? '🏃' : '🌿';
    var catName = item.category === 'diet' ? '饮食' : item.category === 'exercise' ? '运动' : '生活方式';
    var subtypeName = item.subtype === 'all' ? '通用' : (subtypes[item.subtype] ? subtypes[item.subtype].name : item.subtype);
    var triggerText = (item.triggerIndicators && item.triggerIndicators.length > 0) ?
      '<span style="font-size:0.75rem;color:#64748b;">触发: ' + item.triggerIndicators.join(', ') + '</span>' : '';

    return '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;transition:background 0.15s;display:flex;align-items:flex-start;gap:12px;" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'transparent\'">' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
      statusBadge +
      '<span style="font-size:0.8rem;color:#64748b;">' + catIcon + ' ' + catName + '</span>' +
      '<span style="font-size:0.8rem;color:#64748b;">| ' + subtypeName + '</span>' +
      '<span style="font-size:0.8rem;color:#94a3b8;">v' + (item.version || 1) + '</span>' +
      (item.riskMin > 0 || item.riskMax < 100 ? '<span style="font-size:0.75rem;background:#f1f5f9;padding:1px 8px;border-radius:8px;color:#475569;">风险:' + item.riskMin + '-' + item.riskMax + '</span>' : '') +
      '</div>' +
      '<div style="font-size:0.9rem;color:#1e293b;line-height:1.5;">' + item.content + '</div>' +
      '<div style="font-size:0.72rem;color:#94a3b8;margin-top:4px;">' + triggerText + (triggerText ? ' | ' : '') + '作者: ' + (item.author || '未知') + ' | 更新: ' + formatTimestamp(item.updatedAt) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">' +
      '<button style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-size:0.75rem;color:#64748b;" onclick="window._intvShowVersion(\'' + item.id + '\')" title="版本历史">📜</button>' +
      '<button style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-size:0.75rem;color:#64748b;" onclick="window._intvEdit(\'' + item.id + '\')" title="编辑">✏️</button>' +
      (item.status === 'draft' ? '<button style="padding:4px 10px;border:1px solid #16a34a;border-radius:8px;background:#f0fdf4;cursor:pointer;font-size:0.75rem;color:#16a34a;" onclick="window._intvPublish(\'' + item.id + '\')" title="发布">✅</button>' :
        item.status === 'published' ? '<button style="padding:4px 10px;border:1px solid #d97706;border-radius:8px;background:#fef3c7;cursor:pointer;font-size:0.75rem;color:#d97706;" onclick="window._intvUnpublish(\'' + item.id + '\')" title="取消发布">⬇</button>' : '') +
      (item.status === 'published' ? '<button style="padding:4px 10px;border:1px solid #2563eb;border-radius:8px;background:#dbeafe;cursor:pointer;font-size:0.75rem;color:#2563eb;" onclick="window._intvReview(\'' + item.id + '\')" title="审核通过">👍</button>' : '') +
      '<button style="padding:4px 10px;border:1px solid #ef4444;border-radius:8px;background:#fef2f2;cursor:pointer;font-size:0.75rem;color:#ef4444;" onclick="window._intvDelete(\'' + item.id + '\')" title="删除">🗑</button>' +
      '</div></div>';
  }).join('');
}

function formatTimestamp(ts) {
  if (!ts) return '未知';
  var d = new Date(ts);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
}

function getCurrentUserName() {
  try {
    var currentUser = JSON.parse(localStorage.getItem('metascanCurrentUser') || '{}');
    return currentUser.fullName || currentUser.username || '未知医生';
  } catch (e) { return '未知医生'; }
}