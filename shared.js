import { showNotification } from './notifications.js';
import { escapeHTML, escapeAttr } from './utils.js';
import { getFileTypeIcon, getFileTypeName, formatFileSize } from './file-upload.js';
import { currentUser } from './auth.js';

export function generateComprehensiveRecommendations(result) {
    if (!result) return [];

    try {
        var dynamic = window.generateDynamicRecommendations;
        if (typeof dynamic === 'function') {
            var dynResult = dynamic(result);
            if (dynResult && dynResult.recommendations && dynResult.recommendations.length > 0) {
                return dynResult.recommendations;
            }
        }
    } catch (e) {}

    const recommendations = [];

    result.pathwayPatterns.forEach(function(pattern) {
        if (pattern && pattern !== 'sparse_detection' && pattern !== 'insufficient_data' && pattern !== 'normal') {
            recommendations.push('检测到代谢通路模式: ' + pattern + '，建议关注相关通路生物学意义');
        }
    });

    if (result.matchResults && result.matchResults.length > 0) {
        result.matchResults.forEach(function(met) {
            var specificRecs = getSpecificRecommendations(met);
            if (specificRecs.length > 0) {
                recommendations.push.apply(recommendations, specificRecs);
            }
        });
    }

    return [...new Set(recommendations)];
}

export function getSpecificRecommendations(metabolite) {
    var recommendations = [];
    var name = (metabolite && metabolite.name) ? metabolite.name : '';

    switch(name) {
        case '肌酐':
            recommendations.push('关注肾功能指标，定期检测eGFR和血清肌酐');
            recommendations.push('保持充足水分摄入，每天1500-2000ml');
            recommendations.push('避免肾毒性药物，控制蛋白质摄入量');
            break;
        case 'D-葡萄糖':
            recommendations.push('监测空腹和餐后血糖水平，控制碳水化合物摄入');
            recommendations.push('选择低升糖指数食物，如燕麦、豆类、全谷物');
            recommendations.push('餐后30分钟进行轻度运动，如散步');
            break;
        case 'L-半胱氨酸':
            recommendations.push('增加谷胱甘肽前体摄入，如乳清蛋白、N-乙酰半胱氨酸');
            recommendations.push('适量补充维生素C和E增强抗氧化防御');
            recommendations.push('减少氧化应激来源，如避免吸烟和过度饮酒');
            break;
        case '牛磺酸':
            recommendations.push('增加含硫氨基酸摄入，如鱼、肉、蛋类');
            recommendations.push('适量补充牛磺酸（500-2000mg/天）有益心血管健康');
            recommendations.push('减少高脂饮食，维持胆汁酸代谢平衡');
            break;
        case '赤藓糖醇':
            recommendations.push('监测心血管风险因素（血压、血脂、血糖）');
            recommendations.push('减少人工甜味剂摄入，优先选择天然食物');
            recommendations.push('保持规律有氧运动，每周至少150分钟');
            break;
        case '(R)-3-羟基丁酸':
            recommendations.push('关注酮体水平，避免长时间饥饿或极低碳水饮食');
            recommendations.push('均衡膳食，确保每日碳水化合物摄入不低于130g');
            recommendations.push('监测线粒体功能和脂肪酸氧化状态');
            break;
        case 'L-谷氨酰胺':
            recommendations.push('维持免疫系统健康的营养支持');
            recommendations.push('创伤恢复期可考虑补充谷氨酰胺（5-10g/天）');
            recommendations.push('保持肠道健康，多摄入富含谷氨酰胺的食物如鸡肉、鱼肉');
            break;
        case '苹果酸':
            recommendations.push('关注线粒体能量代谢效率');
            recommendations.push('适量补充柠檬酸循环相关辅因子（B族维生素、镁、α-硫辛酸）');
            recommendations.push('保持有氧运动习惯，促进线粒体生物发生');
            break;
        case '嘧啶':
            recommendations.push('监测叶酸和维生素B12水平');
            recommendations.push('炎症水平升高时注意核苷酸代谢异常可能');
            recommendations.push('增加富含叶酸的绿叶蔬菜摄入');
            break;
        case 'L-丝氨酸':
            recommendations.push('关注一碳代谢和神经递质合成通路');
            recommendations.push('适量摄入富含丝氨酸食物：大豆、鸡蛋、乳制品');
            recommendations.push('监测同型半胱氨酸水平评估甲基化状态');
            break;
        case '肌酸':
            recommendations.push('保持充足水分摄入，监测肾功能');
            recommendations.push('适当摄入肌酸来源食物：红肉、鱼肉');
            recommendations.push('运动训练时关注肌酸代谢和肌肉功能');
            break;
        case '哌啶羧酸':
            recommendations.push('排查过氧化物酶体功能异常的遗传代谢病');
            recommendations.push('血浆水平>3.5 μmol/L建议进行遗传咨询');
            break;
        case '水杨尿酸':
            recommendations.push('评估肝脏Ⅱ相解毒功能（甘氨酸结合反应）');
            recommendations.push('避免使用阿司匹林时关注代谢排泄');
            break;
        default:
            break;
    }

    return recommendations;
}

export function renderPrescriptionCard(msg, isOwn, isDoctorView) {
    let data;
    try { data = JSON.parse(msg.content); } catch(e) {
        return '<div style="color: #666;">📋 [医嘱数据错误]</div>';
    }

    return '<div style="background: linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 16px; padding: 16px; min-width: 260px; box-shadow: 0 4px 12px rgba(245,158,11,0.15);">' +
        '<div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 4px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; margin-bottom: 10px;">📋 医嘱</div>' +
        '<div style="font-weight: 800; color: #92400e; font-size: 1.05rem; margin-bottom: 6px;">' + escapeHTML(data.title) + '</div>' +
        '<div style="font-size: 0.88rem; color: #78350f; margin-bottom: 8px; line-height: 1.5;">' + escapeHTML(data.content).replace(/\n/g, '<br>') + '</div>' +
        (data.medication ? '<div style="background: white; border-radius: 10px; padding: 10px 14px; margin-bottom: 10px;"><span style="font-weight: 700; color: #dc2626; font-size: 0.82rem;">💊 用药指导:</span><br><span style="font-size: 0.84rem; color: #334155;">' + escapeHTML(data.medication) + '</span></div>' : '') +
        (isOwn ? '' : '<button onclick="confirmPrescriptionFromChat(' + msg.id + ')" style="width: 100%; padding: 10px; border-radius: 12px; border: none; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">✅ 确认医嘱已读</button>') +
    '</div>';
}

export function renderMessageContent(msg, isOwn, isDoctorView) {
    const type = msg.type || 'text';
    let contentHtml = '';

    switch (type) {
        case 'image':
            contentHtml = '<div style="margin-bottom: 4px;"><img src="' + escapeAttr(msg.content) + '" style="max-width: 240px; max-height: 320px; border-radius: 12px; cursor: pointer;" onclick="window.open(this.src)" loading="lazy" alt="图片"></div><div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 4px;">📷 ' + escapeHTML(msg.fileName || '图片') + '</div>';
            break;
        case 'voice':
            contentHtml = '<div style="display: flex; align-items: center; gap: 10px;"><button onclick="playVoiceMessage(this)" data-audio="' + escapeAttr(msg.content) + '" style="width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(255,255,255,0.25); color: white; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">▶</button><div style="flex: 1; min-width: 60px;"><div style="height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden;"><div style="height: 100%; width: 0%; background: white; border-radius: 3px;" class="voice-progress-bar"></div></div><div style="font-size: 0.72rem; color: rgba(255,255,255,0.6); margin-top: 4px;">🎤 语音消息</div></div></div>';
            break;
        case 'prescription':
            return renderPrescriptionCard(msg, isOwn, isDoctorView);
        case 'file':
            return renderFileMessage(msg, isOwn);
        default:
            contentHtml = escapeHTML(msg.content).replace(/\n/g, '<br>');
            break;
    }

    return contentHtml;
}

export function renderFileMessage(msg, isOwn) {
    var icon = getFileTypeIcon(msg.fileMimetype || '');
    var typeName = getFileTypeName(msg.fileMimetype || '');
    var sizeText = formatFileSize(msg.fileSize || 0);
    var displayName = msg.fileName || msg.fileOriginalName || '未知文件';
    var fileUrl = msg.content;
    var textColor = isOwn ? 'rgba(255,255,255,0.9)' : '#333';
    var metaColor = isOwn ? 'rgba(255,255,255,0.6)' : '#999';
    var bgColor = isOwn ? 'rgba(255,255,255,0.15)' : '#f0f4ff';
    var borderColor = isOwn ? 'rgba(255,255,255,0.25)' : '#e0e6ed';

    var html = '<div style="display: flex; align-items: center; gap: 12px; padding: 8px 0;">';
    html += '<div style="width: 42px; height: 42px; background: ' + bgColor + '; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; border: 1px solid ' + borderColor + ';">' + icon + '</div>';
    html += '<div style="flex: 1; min-width: 0;">';
    html += '<div style="font-weight: 600; font-size: 0.9rem; color: ' + textColor + '; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="' + escapeAttr(displayName) + '">' + escapeHTML(displayName) + '</div>';
    html += '<div style="font-size: 0.75rem; color: ' + metaColor + '; margin-top: 2px;">' + typeName + ' · ' + sizeText + '</div>';
    html += '</div>';
    html += '<a href="' + escapeAttr(fileUrl) + '" download="' + escapeAttr(displayName) + '" target="_blank" style="width: 34px; height: 34px; background: ' + bgColor + '; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 1rem; flex-shrink: 0; border: 1px solid ' + borderColor + '; cursor: pointer;" title="下载文件">⬇</a>';
    html += '</div>';

    return html;
}

export function copyMessage(content) {
    navigator.clipboard.writeText(content).then(() => {
        showNotification('消息已复制');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('消息已复制');
    });
}

export function markMessagesAsRead(storageKey, readerUsername) {
    const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let changed = false;

    messages.forEach(function(msg) {
        if (msg.sender !== readerUsername && !msg.read) {
            msg.read = true;
            msg.readAt = new Date().toISOString();
            changed = true;
        }
    });

    if (changed) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
    }
}

export function sendPatientNotification(patientUsername, title, message) {
    const notification = {
        id: Date.now(),
        type: 'system',
        title: title,
        message: message,
        timestamp: new Date().toISOString(),
        read: false
    };

    const patientNotifications = JSON.parse(localStorage.getItem('metascanNotifications_' + patientUsername) || '[]');
    patientNotifications.unshift(notification);
    localStorage.setItem('metascanNotifications_' + patientUsername, JSON.stringify(patientNotifications));
}

export function replyToDoctorMessage(messageId, sender, content, patientUsername) {
    window.replyingToMessage = { id: messageId, sender, content };
    window.currentReplyPatient = patientUsername;

    const chatInput = document.getElementById('doctorChatInput');
    let replyIndicator = document.getElementById('doctorReplyIndicator');

    if (!replyIndicator) {
        replyIndicator = document.createElement('div');
        replyIndicator.id = 'doctorReplyIndicator';
        replyIndicator.style.cssText = 'background: #f0f4ff; border-left: 3px solid #26d0ce; padding: 8px 12px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        chatInput.parentNode.insertBefore(replyIndicator, chatInput);
    }

    replyIndicator.innerHTML = `
        <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2px;">回复 ${sender}</div>
            <div style="font-size: 0.9rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${content}</div>
        </div>
        <button onclick="cancelDoctorReply()" style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.2rem; padding: 0 5px;">×</button>
    `;

    chatInput.focus();
}

export function cancelDoctorReply() {
    window.replyingToMessage = null;
    window.currentReplyPatient = null;
    const replyIndicator = document.getElementById('doctorReplyIndicator');
    if (replyIndicator) {
        replyIndicator.remove();
    }
}

export function isDoctorMessageRecalled(messageId, patientUsername) {
    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patientUsername}`)) || [];
    const message = chatMessages.find(msg => msg.id === messageId);
    return message && message.isRecalled;
}

export function showDoctorMessageMenu(event, messageId, sender, content, patientUsername) {
    event.stopPropagation();

    const existingMenu = document.getElementById('messageContextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.id = 'messageContextMenu';
    menu.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 8px 0;
        z-index: 10000;
        min-width: 120px;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
    `;

    const isOwnMessage = sender === currentUser.username;

    menu.innerHTML = `
        <div onclick="replyToDoctorMessage(${messageId}, '${escapeAttr(sender)}', '${escapeAttr(content)}', '${escapeAttr(patientUsername)}'); document.getElementById('messageContextMenu').remove();" 
             style="padding: 10px 16px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; display: flex; align-items: center; gap: 8px;"
             onmouseover="this.style.background='#f5f7fa'" 
             onmouseout="this.style.background='white'">
            💬 回复
        </div>
        <div onclick="copyMessage('${escapeAttr(content)}'); document.getElementById('messageContextMenu').remove();" 
             style="padding: 10px 16px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; display: flex; align-items: center; gap: 8px;"
             onmouseover="this.style.background='#f5f7fa'" 
             onmouseout="this.style.background='white'">
            📋 复制
        </div>
        ${isOwnMessage ? `
            <div onclick="deleteDoctorMessage(${messageId}, '${patientUsername}'); document.getElementById('messageContextMenu').remove();" 
                 style="padding: 10px 16px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; display: flex; align-items: center; gap: 8px; color: #e74c3c;"
                 onmouseover="this.style.background='#f5f7fa'" 
                 onmouseout="this.style.background='white'">
                🗑️ ${isDoctorMessageRecalled(messageId, patientUsername) ? '删除' : '撤回'}
            </div>
        ` : ''}
    `;

    document.body.appendChild(menu);

    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}