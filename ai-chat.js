import { showNotification } from './notifications.js';
import { safeGetItem, safeSetItem, safeParseJSON } from './storage.js';

var CHAT_API_URL = 'http://localhost:3001/api/chat';

var isChatOpen = false;
var isWaiting = false;
var chatMessages = [];
var contextMessages = [];
var convId = '';

var SYSTEM_PROMPT = '你是MetaScan平台的智能健康助手，拥有专业的代谢健康知识。你的职责是为用户提供科学、准确、易懂的健康咨询服务。\n\n## 回复规范：\n1. 使用亲切友好的语气，像一位专业的健康顾问朋友\n2. 回答要基于循证医学，提及关键参考值范围\n3. 如果问题超出代谢健康范畴，温和引导用户回到健康话题\n4. 始终提醒：你的建议仅供参考，不能替代专业医生的诊断\n5. 回答结构清晰：先理解问题 → 专业解答 → 实用建议 → 补充提示\n6. 每轮对话控制在300字以内，保持精炼\n\n## 绝对禁止：\n- 提供药物处方或剂量建议\n- 做出确定性诊断（如"你肯定患有..."）\n- 建议用户停药或违背医嘱\n- 回答与医疗健康完全无关的问题';

var SENSITIVE_PATTERNS = [
    { pattern: /\d{18}|\d{17}[0-9Xx]/g, label: '[身份证号已过滤]' },
    { pattern: /1[3-9]\d{9}/g, label: '[手机号已过滤]' },
    { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/g, label: '[邮箱已过滤]' },
    { pattern: /(?:京|沪|津|渝|冀|豫|云|辽|黑|湘|皖|鲁|新|苏|浙|赣|鄂|桂|甘|晋|蒙|陕|吉|闽|贵|粤|青|藏|川|宁|琼)[A-HJ-NP-Z]\d{4,5}[A-HJ-NP-Z\d]/g, label: '[车牌号已过滤]' }
];

function filterSensitiveContent(text) {
    var filtered = text;
    SENSITIVE_PATTERNS.forEach(function(rule) {
        filtered = filtered.replace(rule.pattern, rule.label);
    });
    return filtered;
}

var OFFTOPIC_KEYWORDS = [
    '股票', '基金', '比特币', '游戏', '电影', '明星', '娱乐',
    '算命', '星座', '占卜', '风水', '宗教'
];

function isHealthRelated(text) {
    var lower = text.toLowerCase();
    var offTopic = OFFTOPIC_KEYWORDS.some(function(kw) { return lower.indexOf(kw) !== -1; });
    if (offTopic) return false;

    var healthKeywords = [
        '健康', '病', '药', '医', '疼', '痛', '血', '血糖', '血压',
        '饮食', '运动', '睡眠', '代谢', '体重', '减肥', '营养', '维生素',
        '胆固醇', '尿酸', '肝', '肾', '心', '肺', '胃', '肠', '免疫',
        '过敏', '皮肤', '关节', '骨骼', '肌肉', '疲劳', '头晕', '发热',
        '咳嗽', '发炎', '激素', '甲状腺', '糖尿病', '高血压', '高血脂',
        '检查', '体检', '指标', '症状', '预防', '治疗', '康复',
        'diet', 'exercise', 'health', 'disease', 'symptom', 'treatment',
        '血糖仪', '如何', '怎么', '为什么', '正常吗', '危险吗', '严重吗',
        '食谱', '卡路里', '蛋白', '碳水', '脂肪', '膳食', '喝', '吃',
        '跑步', '游泳', '瑜伽', '健身', '有氧', '力量',
        '压力', '焦虑', '抑郁', '心情', '情绪', '放松', '冥想',
        '年', '岁', '老人', '孩子', '孕妇', '女性', '男性'
    ];

    return healthKeywords.some(function(kw) { return lower.indexOf(kw) !== -1; });
}

function getChatHistory() {
    var key = 'metascanChat_' + (window.currentUser?.username || 'guest');
    return safeGetItem(key, []);
}

function saveChatHistory(messages) {
    var key = 'metascanChat_' + (window.currentUser?.username || 'guest');
    var trimmed = messages.slice(-100);
    safeSetItem(key, trimmed);
}

function loadChatHistory() {
    var history = getChatHistory();
    chatMessages = history.length > 0 ? history : [
        { role: 'assistant', content: '你好！我是你的智能健康助手 👩‍⚕️ 有什么健康相关的问题想咨询吗？我可以帮你解答代谢、饮食、运动、睡眠等方面的问题～', time: new Date().toISOString() }
    ];
    rebuildContext();
}

function rebuildContext() {
    contextMessages = [];
    var recent = chatMessages.slice(-20);
    recent.forEach(function(msg) {
        if (msg.role === 'user' || msg.role === 'assistant') {
            contextMessages.push({ role: msg.role, content: msg.content });
        }
    });
}

function createChatUI() {
    var existing = document.getElementById('aiChatOverlay');
    if (existing) return;

    var overlay = document.createElement('div');
    overlay.id = 'aiChatOverlay';
    overlay.className = 'ai-chat-overlay';
    overlay.innerHTML = '<div class="ai-chat-panel" id="aiChatPanel">' +
        '<div class="ai-chat-header">' +
        '<div class="ai-chat-header-left">' +
        '<div class="ai-chat-avatar-icon">👩‍⚕️</div>' +
        '<div>' +
        '<div class="ai-chat-title">智能健康助手</div>' +
        '<div class="ai-chat-subtitle" id="aiChatSubtitle">在线 · DeepSeek V4</div>' +
        '</div>' +
        '</div>' +
        '<div class="ai-chat-header-actions">' +
        '<button class="ai-chat-btn-icon" id="aiChatClearBtn" title="清空对话">🗑️</button>' +
        '<button class="ai-chat-btn-icon" id="aiChatCloseBtn" title="关闭">✕</button>' +
        '</div>' +
        '</div>' +
        '<div class="ai-chat-messages" id="aiChatMessages">' +
        '<div class="ai-chat-empty" id="aiChatLoading" style="display:none;">' +
        '<div class="ai-chat-typing"><span></span><span></span><span></span></div>' +
        '<div style="color:#94a3b8;font-size:0.85rem;">正在思考...</div>' +
        '</div>' +
        '</div>' +
        '<div class="ai-chat-input-area">' +
        '<div class="ai-chat-disclaimer">' +
        '⚠️ 本助手提供健康参考建议，不能替代专业医生的诊断与治疗。如有不适请及时就医。' +
        '</div>' +
        '<div class="ai-chat-input-row">' +
        '<input type="text" id="aiChatInput" class="ai-chat-input" placeholder="输入你的健康问题..." maxlength="500" autocomplete="off">' +
        '<button class="ai-chat-send-btn" id="aiChatSendBtn" title="发送">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/></svg>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeAIChat();
    });
    document.getElementById('aiChatCloseBtn').addEventListener('click', closeAIChat);
    document.getElementById('aiChatClearBtn').addEventListener('click', clearChatHistory);
    document.getElementById('aiChatSendBtn').addEventListener('click', sendChatMessage);
    document.getElementById('aiChatInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

function renderMessages() {
    var container = document.getElementById('aiChatMessages');
    if (!container) return;

    var html = '';
    chatMessages.forEach(function(msg, idx) {
        if (msg.role === 'assistant') {
            html += '<div class="ai-chat-msg ai-chat-msg-assistant">' +
                '<div class="ai-chat-msg-avatar">👩‍⚕️</div>' +
                '<div class="ai-chat-msg-bubble ai-chat-msg-bubble-assistant">' +
                '<div class="ai-chat-msg-text">' + formatMessageContent(msg.content) + '</div>' +
                '<div class="ai-chat-msg-time">' + formatTime(msg.time) + '</div>' +
                '</div>' +
                '</div>';
        } else if (msg.role === 'user') {
            html += '<div class="ai-chat-msg ai-chat-msg-user">' +
                '<div class="ai-chat-msg-bubble ai-chat-msg-bubble-user">' +
                '<div class="ai-chat-msg-text">' + escapeHTML(msg.content) + '</div>' +
                '<div class="ai-chat-msg-time">' + formatTime(msg.time) + '</div>' +
                '</div>' +
                '</div>';
        }
    });
    container.innerHTML = html;

    var loading = document.getElementById('aiChatLoading');
    if (loading) container.appendChild(loading);

    container.scrollTop = container.scrollHeight;
}

function formatTime(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
}

function formatMessageContent(text) {
    var escaped = escapeHTML(text);
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');
    escaped = escaped.replace(/\n/g, '<br>');
    return escaped;
}

function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function toggleAIChat() {
    if (isChatOpen) {
        closeAIChat();
    } else {
        openAIChat();
    }
}

export function openAIChat() {
    if (isChatOpen) return;

    createChatUI();
    loadChatHistory();

    var overlay = document.getElementById('aiChatOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        setTimeout(function() { overlay.classList.add('active'); }, 10);
    }
    isChatOpen = true;

    renderMessages();

    setTimeout(function() {
        var input = document.getElementById('aiChatInput');
        if (input) input.focus();
    }, 300);
}

export function closeAIChat() {
    var overlay = document.getElementById('aiChatOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(function() {
            overlay.style.display = 'none';
        }, 250);
    }
    isChatOpen = false;
    saveChatHistory(chatMessages);
}

function clearChatHistory() {
    chatMessages = [
        { role: 'assistant', content: '对话已清空。有什么新的健康问题想问吗？😊', time: new Date().toISOString() }
    ];
    rebuildContext();
    saveChatHistory(chatMessages);
    renderMessages();
}

function setWaiting(waiting) {
    isWaiting = waiting;
    var loading = document.getElementById('aiChatLoading');
    var sendBtn = document.getElementById('aiChatSendBtn');
    var input = document.getElementById('aiChatInput');
    var subtitle = document.getElementById('aiChatSubtitle');

    if (loading) loading.style.display = waiting ? 'flex' : 'none';
    if (sendBtn) sendBtn.disabled = waiting;
    if (input) input.disabled = waiting;
    if (subtitle) subtitle.textContent = waiting ? '正在输入...' : '在线 · DeepSeek V4';
}

function addMessage(role, content) {
    var msg = { role: role, content: content, time: new Date().toISOString() };
    chatMessages.push(msg);
    if (role === 'user' || role === 'assistant') {
        contextMessages.push({ role: role, content: content });
        if (contextMessages.length > 30) contextMessages = contextMessages.slice(-30);
    }
    saveChatHistory(chatMessages);
}

function callChatAPI(userMessage) {
    var payload = {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT }
        ].concat(contextMessages.slice(-20)),
        username: window.currentUser?.username || 'guest',
        convId: convId || ''
    };

    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CHAT_API_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 30000;

        xhr.onload = function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (xhr.status === 200 && data.success) {
                    if (data.convId) convId = data.convId;
                    resolve(data.reply);
                } else {
                    reject(new Error(data.error || '服务暂不可用'));
                }
            } catch (e) {
                reject(new Error('响应解析失败'));
            }
        };
        xhr.onerror = function() {
            reject(new Error('网络连接失败，请确认服务已启动'));
        };
        xhr.ontimeout = function() {
            reject(new Error('请求超时，请稍后重试'));
        };
        xhr.send(JSON.stringify(payload));
    });
}

export function sendChatMessage() {
    if (isWaiting) return;

    var input = document.getElementById('aiChatInput');
    if (!input) return;

    var text = input.value.trim();
    if (!text) return;

    if (text.length > 500) {
        showNotification('消息过长，请精简到500字以内', 'warning');
        return;
    }

    var filtered = filterSensitiveContent(text);

    input.value = '';
    input.style.height = 'auto';

    addMessage('user', filtered);
    renderMessages();

    if (!isHealthRelated(filtered)) {
        addMessage('assistant', '我专注于健康咨询领域哦～如果你有关于代谢、饮食、运动、睡眠等方面的疑问，我很乐意帮你解答！💚');
        renderMessages();
        return;
    }

    setWaiting(true);
    renderMessages();

    callChatAPI(filtered).then(function(reply) {
        addMessage('assistant', reply);
        setWaiting(false);
        renderMessages();
    }).catch(function(err) {
        addMessage('assistant', '抱歉，连接出现了问题：' + err.message + '。请稍后重试或检查服务是否正常运行。');
        setWaiting(false);
        renderMessages();
    });
}

window.toggleAIChat = toggleAIChat;
window.openAIChat = openAIChat;
window.closeAIChat = closeAIChat;
window.sendChatMessage = sendChatMessage;