import { currentUser, users, historicalData } from './auth.js';
import { metaboliteData, categoryNames } from './config.js';
import { showNotification } from './notifications.js';
import { generateComprehensiveRecommendations, getSpecificRecommendations, renderPrescriptionCard, renderMessageContent, copyMessage, markMessagesAsRead, sendPatientNotification, replyToDoctorMessage, cancelDoctorReply, isDoctorMessageRecalled, showDoctorMessageMenu } from './shared.js';
import { formatMessageTime, getReadStatusIcon, escapeHTML, escapeAttr } from './utils.js';
import { computeLinearRegression } from './visualization.js';
import { createPatientVirtualList } from './performance.js';
import { renderInterventionEditor } from './intervention-editor.js';

function approveReportAccess(patientUsername) {
    const reportRequests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const requestIndex = reportRequests.findIndex(req =>
        req.patientUsername === patientUsername && req.status === 'pending'
    );

    if (requestIndex !== -1) {
        reportRequests[requestIndex].status = 'approved';
        reportRequests[requestIndex].approvedDate = new Date().toISOString();
        reportRequests[requestIndex].approvedBy = currentUser.username;
        localStorage.setItem('metascanReportRequests', JSON.stringify(reportRequests));

        sendPatientNotification(patientUsername, '报告查看申请已批准', '医生已批准您查看健康报告的申请，现在可以查看详细报告了。');

        showPatientDetails(patientUsername);

        showNotification(`已批准 ${patientUsername} 的报告查看申请`);
    }
}

function rejectReportAccess(patientUsername) {
    const reportRequests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const requestIndex = reportRequests.findIndex(req =>
        req.patientUsername === patientUsername && req.status === 'pending'
    );

    if (requestIndex !== -1) {
        reportRequests[requestIndex].status = 'rejected';
        reportRequests[requestIndex].rejectedDate = new Date().toISOString();
        reportRequests[requestIndex].rejectedBy = currentUser.username;
        localStorage.setItem('metascanReportRequests', JSON.stringify(reportRequests));

        sendPatientNotification(patientUsername, '报告查看申请被拒绝', '医生拒绝了您查看健康报告的申请，如有疑问请与医生沟通。');

        showPatientDetails(patientUsername);

        showNotification(`已拒绝 ${patientUsername} 的报告查看申请`);
    }
}

function updatePendingList(items) {
    const pendingList = document.getElementById('pendingList');
    const pendingCount = document.getElementById('pendingCount');

    if (!pendingList || !pendingCount) return;

    pendingCount.textContent = items.length;

    if (items.length === 0) {
        pendingList.innerHTML = `
            <div style="text-align: center; color: #666; padding: 40px 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 15px;">🎉</div>
                <div style="font-size: 1rem;">暂无待处理事项</div>
                <div style="font-size: 0.85rem; color: #999; margin-top: 5px;">继续保持！</div>
            </div>
        `;
        return;
    }

    pendingList.innerHTML = items.map((item, index) => {
        const icon = item.type === 'diagnosis' ? '📊' : '💬';
        const title = item.type === 'diagnosis' ? '待诊断' : '新消息';
        const bgColor = item.type === 'diagnosis' ? '#fff3e0' : '#e3f2fd';
        const borderColor = item.type === 'diagnosis' ? '#ffe0b2' : '#bbdefb';

        return `
            <div style="background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 12px; padding: 15px; margin-bottom: 10px; animation: fadeInUp 0.4s ease; animation-delay: ${index * 0.05}s;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
                        ${icon}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; color: #1a2980; margin-bottom: 3px;">${title}</div>
                        <div style="font-size: 0.9rem; color: #333; margin-bottom: 3px;">患者: ${item.patient}</div>
                        <div style="font-size: 0.8rem; color: #666;">📅 ${item.date}</div>
                    </div>
                    <button onclick="handlePendingItem('${item.type}', '${item.patient}')" style="padding: 8px 15px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600; flex-shrink: 0;">
                        处理
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function handlePendingItem(type, patientUsername) {
    if (type === 'diagnosis' || type === 'message') {
        showTab('doctorPatients');
        setTimeout(() => {
            showPatientDetails(patientUsername);
        }, 100);
    }
}

function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;

    let activities = JSON.parse(localStorage.getItem('metascanDoctorActivities')) || [];

    if (activities.length === 0) {
        recentActivity.innerHTML = `
            <div style="text-align: center; color: #666; padding: 40px 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 15px;">📝</div>
                <div style="font-size: 1rem;">暂无活动记录</div>
                <div style="font-size: 0.85rem; color: #999; margin-top: 5px;">活动将显示在这里</div>
            </div>
        `;
        return;
    }

    activities = activities.slice(0, 10);

    recentActivity.innerHTML = activities.map((activity, index) => {
        const time = new Date(activity.timestamp);
        const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

        let icon = '📋';
        let bgColor = '#f8f9ff';
        let borderColor = '#e0e6ed';

        if (activity.type === 'diagnosis') {
            icon = '📊';
            bgColor = '#fff3e0';
            borderColor = '#ffe0b2';
        } else if (activity.type === 'prescription') {
            icon = '📋';
            bgColor = '#e8f5e9';
            borderColor = '#c8e6c9';
        } else if (activity.type === 'message') {
            icon = '💬';
            bgColor = '#e3f2fd';
            borderColor = '#bbdefb';
        }

        return `
            <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 8px; padding: 12px; margin-bottom: 8px; animation: fadeInUp 0.4s ease; animation-delay: ${index * 0.03}s;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 1.2rem;">${icon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #1a2980; font-size: 0.9rem;">${activity.title}</div>
                        <div style="font-size: 0.8rem; color: #666; margin-top: 3px;">${activity.message}</div>
                    </div>
                    <div style="font-size: 0.75rem; color: #999; flex-shrink: 0;">${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

function addDoctorActivity(type, title, message) {
    let activities = JSON.parse(localStorage.getItem('metascanDoctorActivities')) || [];

    activities.unshift({
        type: type,
        title: title,
        message: message,
        timestamp: new Date().toISOString()
    });

    activities = activities.slice(0, 50);

    localStorage.setItem('metascanDoctorActivities', JSON.stringify(activities));
}

function updatePatientStats(patients) {
    if (!currentUser || currentUser.role !== 'doctor') return;

    const totalPatientsEl = document.getElementById('statTotalPatients');
    if (totalPatientsEl) {
        totalPatientsEl.textContent = patients.length;
    }

    let highRiskCount = 0;
    let todayConsultCount = 0;
    let totalPrescriptionsCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    patients.forEach(patient => {
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${patient.username}`)) || [];
        if (patientData.length > 0) {
            const lastRecord = patientData[patientData.length - 1];
            if (lastRecord.overallCoverageScore < 40) {
                highRiskCount++;
            }
        }

        const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patient.username}`)) || [];
        const hasTodayConsult = chatMessages.some(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= today && msg.sender === patient.username;
        });
        if (hasTodayConsult) {
            todayConsultCount++;
        }

        const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${patient.username}`)) || [];
        totalPrescriptionsCount += prescriptions.length;
    });

    const highRiskEl = document.getElementById('statHighRisk');
    if (highRiskEl) {
        highRiskEl.textContent = highRiskCount;
    }

    const todayConsultEl = document.getElementById('statTodayConsult');
    if (todayConsultEl) {
        todayConsultEl.textContent = todayConsultCount;
    }

    const prescriptionsEl = document.getElementById('statPrescriptions');
    if (prescriptionsEl) {
        prescriptionsEl.textContent = totalPrescriptionsCount;
    }
}

function applyFilters(patients, riskFilter, subtypeFilter) {
    return patients.filter(patient => {
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${patient.username}`)) || [];
        const hasData = patientData.length > 0;
        const lastRecord = hasData ? patientData[patientData.length - 1] : null;

        if (riskFilter !== 'all' && hasData) {
            let riskLevel;
            if (lastRecord.overallCoverageScore >= 70) riskLevel = 'low';
            else if (lastRecord.overallCoverageScore >= 40) riskLevel = 'medium';
            else riskLevel = 'high';

            if (riskLevel !== riskFilter) return false;
        }

        if (subtypeFilter !== 'all' && hasData) {
            if (!(lastRecord.pathwayPatterns || []).includes(subtypeFilter)) return false;
        }

        return true;
    });
}

function loadDoctorChatMessages(username, container) {
    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${username}`)) || [];

    if (chatMessages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">💬</div>
                <div style="font-size: 1rem; margin-bottom: 8px; color: #666;">开始与患者聊天</div>
                <div style="font-size: 0.85rem; color: #999;">在下方输入框发送消息</div>
            </div>
        `;
        return;
    }

    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    chatMessages.forEach(msg => {
        if (msg.sender !== currentUser.username && !msg.read) {
            msg.read = true;
        }
    });
    localStorage.setItem(`metascanChat_${username}`, JSON.stringify(chatMessages));

    container.innerHTML = chatMessages.map((message, index) => {
        const isDoctor = message.sender === currentUser.username;
        const timeStr = formatMessageTime(message.timestamp);
        const fullTime = new Date(message.timestamp).toLocaleString('zh-CN');
        const isPrescription = message.type === 'prescription';

        let replyHtml = '';
        if (message.replyTo) {
            replyHtml = '<div style="background: rgba(0,0,0,0.05); border-left: 3px solid #26d0ce; padding: 6px 10px; margin-bottom: 6px; border-radius: 4px; font-size: 0.8rem;"><div style="color: #666; margin-bottom: 2px;">回复 ' + escapeHTML(message.replyTo.sender) + '</div><div style="color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHTML(message.replyTo.content) + '</div></div>';
        }

        const isRecalledMessage = message.isRecalled;
        const messageContent = renderMessageContent(message, isDoctor, true);

        let bubbleStyle;
        if (isRecalledMessage) {
            bubbleStyle = 'background: #f5f5f5; color: #999; font-style: italic;';
        } else if (isPrescription) {
            bubbleStyle = '';
        } else if (isDoctor) {
            bubbleStyle = 'background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white;';
        } else {
            bubbleStyle = 'background: white; color: #333; border: 1px solid #e0e6ed;';
        }

        const bubbleBorder = !isPrescription ? (isDoctor ? 'border-radius: 18px 18px 4px 18px;' : 'border-radius: 18px 18px 18px 4px;') : '';

        const readStatusHtml = getReadStatusIcon(message, isDoctor);

        return '<div style="display: flex; ' + (isDoctor ? 'justify-content: flex-end;' : 'justify-content: flex-start;') + ' margin-bottom: 12px; animation: fadeInUp 0.4s ease; animation-delay: ' + (index * 0.03) + 's;"' +
            (!isRecalledMessage ? ' oncontextmenu="showDoctorMessageMenu(event, ' + message.id + ', \'' + escapeAttr(message.sender) + '\', \'' + escapeAttr(message.content || '') + '\', \'' + escapeAttr(username) + '\'); return false;"' : '') + '>' +
            (!isDoctor ? '<div style="display: flex; align-items: flex-end; gap: 10px;"><div style="width: 36px; height: 36px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(26, 41, 128, 0.2);">' + username.charAt(0).toUpperCase() + '</div><div style="max-width: 75%;">' +
                (isPrescription ? '' : '<div style="' + bubbleStyle + ' ' + bubbleBorder + ' padding: 12px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: ' + (!isRecalledMessage ? 'context-menu' : 'default') + ';">') +
                (!isRecalledMessage ? replyHtml : '') + messageContent +
                (isPrescription ? '' : '</div>') +
                '<div style="font-size: 0.75rem; color: #999; margin-top: 5px; padding-left: 5px; display: flex; align-items: center; gap: 5px;"><span title="' + fullTime + '">' + timeStr + '</span>' + readStatusHtml + '</div></div></div>'
                :
                '<div style="display: flex; align-items: flex-end; gap: 10px; flex-direction: row-reverse;"><div style="width: 36px; height: 36px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(245, 87, 108, 0.2);">👨‍⚕️</div><div style="max-width: 75%;">' +
                (isPrescription ? '' : '<div style="' + bubbleStyle + ' ' + bubbleBorder + ' padding: 12px 16px; box-shadow: 0 2px 8px rgba(26, 41, 128, 0.2); cursor: ' + (!isRecalledMessage ? 'context-menu' : 'default') + ';">') +
                (!isRecalledMessage ? replyHtml : '') + messageContent +
                (isPrescription ? '' : '</div>') +
                '<div style="font-size: 0.75rem; color: #999; margin-top: 5px; text-align: right; padding-right: 5px; display: flex; align-items: center; gap: 5px; justify-content: flex-end;"><span title="' + fullTime + '">' + timeStr + '</span>' + readStatusHtml + '</div></div></div>'
            ) +
        '</div>';
    }).join('');

    container.scrollTop = container.scrollHeight;

    markMessagesAsRead('metascanChat_' + username, currentUser.username);
}

function deleteDoctorMessage(messageId, patientUsername) {
    if (!confirm('确定要撤回这条消息吗？')) return;
    
    if (typeof wsRecallDoctorMessage === 'function') {
        wsRecallDoctorMessage(messageId);
        return;
    }

    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patientUsername}`)) || [];
    const messageIndex = chatMessages.findIndex(msg => msg.id === messageId);

    if (messageIndex !== -1) {
        const message = chatMessages[messageIndex];
        const messageTime = new Date(message.timestamp);
        const now = new Date();
        const diffMinutes = (now - messageTime) / (1000 * 60);

        if (diffMinutes <= 5 && message.sender === currentUser.username) {
            chatMessages[messageIndex].content = '消息已撤回';
            chatMessages[messageIndex].isRecalled = true;
            showNotification('消息已撤回');
        } else if (message.sender === currentUser.username) {
            chatMessages.splice(messageIndex, 1);
            showNotification('消息已删除');
        } else {
            showNotification('只能删除自己的消息');
            return;
        }

        localStorage.setItem(`metascanChat_${patientUsername}`, JSON.stringify(chatMessages));

        const doctorChatMessages = document.getElementById('doctorChatMessages');
        if (doctorChatMessages) {
            loadDoctorChatMessages(patientUsername, doctorChatMessages);
        }
    }
}

function loadPrescriptionHistory(username) {
    const historyContainer = document.getElementById('prescriptionHistory');
    if (!historyContainer) return;

    const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${username}`)) || [];

    if (prescriptions.length === 0) {
        historyContainer.innerHTML = '<p style="text-align: center; color: #666;">暂无历史医嘱</p>';
        return;
    }

    let html = '';
    prescriptions.reverse().forEach(prescription => {
        html += `
            <div style="border-bottom: 1px solid #e0e6ed; padding: 10px 0; margin-bottom: 10px;">
                <div style="font-size: 0.85rem; color: #666;">医生: ${prescription.doctor}</div>
                <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">日期: ${new Date(prescription.date).toLocaleString()}</div>
                <div style="margin-top: 10px; white-space: pre-wrap;">${prescription.content}</div>
            </div>
        `;
    });

    historyContainer.innerHTML = html;
}

function insertText(text) {
    const textarea = document.getElementById('prescriptionText');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;

    textarea.value = currentValue.substring(0, start) + text + '\n' + currentValue.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length + 1;
}

function searchPatients() {
    const searchTerm = document.getElementById('patientSearch').value.toLowerCase().trim();
    const riskFilter = document.getElementById('riskFilter').value;
    const subtypeFilter = document.getElementById('subtypeFilter').value;

    let patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }

    if (searchTerm) {
        patients = patients.filter(patient =>
            patient.username.toLowerCase().includes(searchTerm)
        );
    }

    patients = applyFilters(patients, riskFilter, subtypeFilter);

    loadPatientList(patients);
}

function filterPatients() {
    const riskFilter = document.getElementById('riskFilter').value;
    const subtypeFilter = document.getElementById('subtypeFilter').value;

    let patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }

    patients = applyFilters(patients, riskFilter, subtypeFilter);

    loadPatientList(patients);
}

function resetFilters() {
    document.getElementById('patientSearch').value = '';
    document.getElementById('riskFilter').value = 'all';
    document.getElementById('subtypeFilter').value = 'all';
    loadPatientList();
}

function refreshPatientList() {
    loadPatientList();
    showNotification('患者列表已刷新');
}

export function showDoctorDashboard() {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById('doctorDashboard').style.display = 'block';
    loadPatientList();
    updateDashboardOverview();
    setTimeout(() => {
        drawRiskDistributionChart();
        drawSubtypeDistributionChart();
    }, 100);
    setTimeout(() => {
        var editorContainer = document.getElementById('interventionEditorContainer');
        if (editorContainer) {
            try { renderInterventionEditor(editorContainer); } catch (e) { console.warn('干预编辑器加载失败:', e); }
        }
    }, 200);
}

export function updateDashboardOverview() {
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        const now = new Date();
        currentDateEl.textContent = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }

    const onlineTimeEl = document.getElementById('onlineTime');
    if (onlineTimeEl) {
        const loginTime = sessionStorage.getItem('doctorLoginTime') || Date.now();
        const elapsed = Date.now() - parseInt(loginTime);
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        onlineTimeEl.textContent = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
    }

    const patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }

    let totalPatients = patients.length;
    let highRiskPatients = 0;
    let totalTests = 0;
    let totalPrescriptions = 0;
    let pendingPatients = 0;
    let todayPatients = 0;

    const pendingItems = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    patients.forEach(patient => {
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${patient.username}`)) || [];
        totalTests += patientData.length;

        if (patientData.length > 0) {
            const latestRecord = patientData[patientData.length - 1];
            if (latestRecord.overallCoverageScore < 40) {
                highRiskPatients++;
            }

            const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${patient.username}`)) || [];
            if (prescriptions.length < patientData.length) {
                pendingPatients++;
                pendingItems.push({
                    type: 'diagnosis',
                    patient: patient.username,
                    date: latestRecord.date,
                    coverage: latestRecord.overallCoverageScore
                });
            }

            const recordDate = new Date(latestRecord.timestamp);
            recordDate.setHours(0, 0, 0, 0);
            if (recordDate.getTime() === today.getTime()) {
                todayPatients++;
            }
        }

        const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patient.username}`)) || [];
        const hasNewMessage = chatMessages.some(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= today && msg.sender === patient.username;
        });
        if (hasNewMessage) {
            pendingItems.push({
                type: 'message',
                patient: patient.username,
                date: new Date().toLocaleDateString('zh-CN')
            });
        }

        const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${patient.username}`)) || [];
        totalPrescriptions += prescriptions.length;
    });

    const totalPatientsEl = document.getElementById('totalPatients');
    if (totalPatientsEl) totalPatientsEl.textContent = totalPatients;

    const highRiskPatientsEl = document.getElementById('highRiskPatients');
    if (highRiskPatientsEl) highRiskPatientsEl.textContent = highRiskPatients;

    const totalTestsEl = document.getElementById('totalTests');
    if (totalTestsEl) totalTestsEl.textContent = totalTests;

    const totalPrescriptionsEl = document.getElementById('totalPrescriptions');
    if (totalPrescriptionsEl) totalPrescriptionsEl.textContent = totalPrescriptions;

    const pendingPatientsEl = document.getElementById('pendingPatients');
    if (pendingPatientsEl) pendingPatientsEl.textContent = pendingPatients;

    const todayPatientsEl = document.getElementById('todayPatients');
    if (todayPatientsEl) todayPatientsEl.textContent = todayPatients;

    updatePendingList(pendingItems);

    updateRecentActivity();

    setTimeout(() => {
        drawOverallTrendChart();
        drawTestTrendChart();
    }, 100);
}

export function drawOverallTrendChart() {
    const ctx = document.getElementById('overallTrendChart');
    if (!ctx) return;

    const labels = [];
    const lowRiskData = [];
    const mediumRiskData = [];
    const highRiskData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));

        lowRiskData.push(Math.floor(Math.random() * 20) + 10);
        mediumRiskData.push(Math.floor(Math.random() * 15) + 5);
        highRiskData.push(Math.floor(Math.random() * 10) + 2);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '低风险',
                    data: lowRiskData,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '中风险',
                    data: mediumRiskData,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '高风险',
                    data: highRiskData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

export function drawTestTrendChart() {
    const ctx = document.getElementById('testTrendChart');
    if (!ctx) return;

    const labels = [];
    const testData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));

        testData.push(Math.floor(Math.random() * 30) + 10);
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '检测数量',
                data: testData,
                backgroundColor: 'rgba(26, 41, 128, 0.6)',
                borderColor: 'rgba(26, 41, 128, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

export function drawRiskDistributionChart() {
    const ctx = document.getElementById('riskDistributionChart');
    if (!ctx) return;

    let lowRisk = 0;
    let mediumRisk = 0;
    let highRisk = 0;

    const patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push(username);
        }
    }

    patients.forEach(username => {
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${username}`)) || [];
        if (patientData.length > 0) {
            const latestRecord = patientData[patientData.length - 1];
            if (latestRecord.overallCoverageScore >= 70) {
                lowRisk++;
            } else if (latestRecord.overallCoverageScore >= 40) {
                mediumRisk++;
            } else {
                highRisk++;
            }
        }
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['高覆盖 (70-100)', '中等覆盖 (40-69)', '低覆盖 (0-39)'],
            datasets: [{
                data: [lowRisk, mediumRisk, highRisk],
                backgroundColor: ['#27ae60', '#f39c12', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: '患者代谢覆盖分布',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

export function drawSubtypeDistributionChart() {
    const ctx = document.getElementById('subtypeDistributionChart');
    if (!ctx) return;

    const patternCount = {
        amino_acid: 0,
        carbohydrate: 0,
        organic_acid: 0,
        sulfur: 0,
        nitrogen: 0,
        xenobiotic: 0
    };

    const patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push(username);
        }
    }

    patients.forEach(username => {
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${username}`)) || [];
        if (patientData.length > 0) {
            const latestRecord = patientData[patientData.length - 1];
            const scores = latestRecord.pathwayScores || {};
            for (var key in scores) {
                if (patternCount.hasOwnProperty(key) && scores[key] > 30) {
                    patternCount[key]++;
                }
            }
        }
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['氨基酸代谢', '碳水化合物代谢', '有机酸代谢', '含硫化合物', '含氮化合物', '外源物代谢'],
            datasets: [{
                label: '患者数量',
                data: [patternCount.amino_acid, patternCount.carbohydrate, patternCount.organic_acid, patternCount.sulfur, patternCount.nitrogen, patternCount.xenobiotic],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(237, 100, 166, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '患者数量'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '代谢通路覆盖分布',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

export function loadPatientList(patients = null) {
    const patientListContainer = document.getElementById('patientList');
    if (!patientListContainer) return;

    if (!patients) {
        patients = [];
        for (const [username, userData] of Object.entries(users)) {
            if (userData.role === 'patient') {
                patients.push({ username, ...userData });
            }
        }
    }

    updatePatientStats(patients);
    renderGroupList();

    if (patients.length === 0) {
        patientListContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">👥</div>
                <div style="font-size: 1rem; margin-bottom: 8px;">暂无患者</div>
                <div style="font-size: 0.85rem; color: #999;">等待患者注册...</div>
            </div>
        `;
        return;
    }

    patientListContainer.style.maxHeight = 'calc(100vh - 250px)';
    patientListContainer.style.overflowY = 'auto';

    createPatientVirtualList(patientListContainer, patients, function(patient) {
        showPatientDetails(patient.username);
    });
}

export function showPatientDetails(username) {
    window.currentSelectedPatient = username;
    renderTagCloud(username);

    const patientDetailsContent = document.getElementById('patientDetailsContent');
    const prescriptionContent = document.getElementById('prescriptionContent');
    const doctorChatMessages = document.getElementById('doctorChatMessages');

    if (!patientDetailsContent || !prescriptionContent) return;

    const reportRequests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const approvedRequest = reportRequests.find(req =>
        req.patientUsername === username && req.status === 'approved'
    );

    if (!approvedRequest) {
        const pendingRequest = reportRequests.find(req =>
            req.patientUsername === username && req.status === 'pending'
        );

        patientDetailsContent.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">🔒</div>
                <div style="font-size: 1.1rem; margin-bottom: 8px; color: #666; font-weight: 600;">暂无查看权限</div>
                <div style="font-size: 0.9rem; color: #999; margin-bottom: 20px;">
                    ${pendingRequest ? '患者已申请查看报告，等待您的审批' : '患者尚未申请查看报告'}
                </div>
                ${pendingRequest ? `
                    <div style="background: #fff3cd; border: 1px solid #ffeeba; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                        <p style="color: #856404; margin: 0; font-size: 0.9rem;">⏳ 申请时间: ${new Date(pendingRequest.requestDate).toLocaleString('zh-CN')}</p>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="approveReportAccess('${username}')" style="padding: 12px 25px; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(39, 174, 96, 0.3);">
                            ✅ 批准申请
                        </button>
                        <button onclick="rejectReportAccess('${username}')" style="padding: 12px 25px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(231, 76, 60, 0.3);">
                            ❌ 拒绝申请
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        prescriptionContent.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 15px;">📋</div>
                <div style="font-size: 1rem; margin-bottom: 8px; color: #666;">暂无查看权限</div>
                <div style="font-size: 0.85rem; color: #999;">请先批准患者的报告查看申请</div>
            </div>
        `;

        if (doctorChatMessages) {
            loadDoctorChatMessages(username, doctorChatMessages);
        }
        return;
    }

    const patientData = JSON.parse(localStorage.getItem(`metascanData_${username}`)) || [];

    if (patientData.length === 0) {
        patientDetailsContent.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                <div style="font-size: 1rem; margin-bottom: 8px; color: #666;">患者 ${username} 暂无检测数据</div>
                <div style="font-size: 0.85rem; color: #999;">等待患者完成检测...</div>
            </div>
        `;

        prescriptionContent.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 15px;">📋</div>
                <div style="font-size: 1rem; margin-bottom: 8px; color: #666;">患者暂无检测数据</div>
                <div style="font-size: 0.85rem; color: #999; margin-bottom: 20px;">请等待患者完成检测后创建医嘱</div>
            </div>
        `;
        return;
    }

    const latestRecord = patientData[patientData.length - 1];

    var coverageScore = latestRecord.overallCoverageScore || 0;
    let detailsHtml = `
        <div style="background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 15px; padding: 20px; color: white; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.8rem; flex-shrink: 0;">
                    ${username.charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.3rem; font-weight: 700; margin-bottom: 5px;">${username}</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">检测日期: ${latestRecord.date}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 5px;">覆盖评分</div>
                    <div style="font-size: 1.8rem; font-weight: 700;">${(latestRecord.overallCoverageScore || 0).toFixed(1)}</div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: ${coverageScore < 40 ? '#fee' : coverageScore < 70 ? '#fff3cd' : '#d4edda'}; border: 2px solid ${coverageScore < 40 ? '#f5c6cb' : coverageScore < 70 ? '#ffeeba' : '#c3e6cb'}; border-radius: 12px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">覆盖状态</div>
                    <div style="font-weight: 700; font-size: 1.1rem; color: ${coverageScore < 40 ? '#e74c3c' : coverageScore < 70 ? '#f39c12' : '#27ae60'}">
                        ${coverageScore < 40 ? '🔴 低覆盖' : coverageScore < 70 ? '🟡 中等覆盖' : '🟢 高覆盖'}
                    </div>
                </div>
                <div style="background: #f8f9ff; border: 2px solid #e0e6ed; border-radius: 12px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">通路模式</div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: #1a2980;">
                        ${(latestRecord.pathwayPatterns || []).map(function(s) { return (categoryNames && categoryNames[s]) ? categoryNames[s] : s; }).join('、') || '未识别'}
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #333; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                <span>📊</span>
                <span>通路覆盖分析</span>
            </h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">`;

    var pathwayDimensions = [
        { key: 'amino_acid', label: '氨基酸代谢' },
        { key: 'carbohydrate', label: '碳水代谢' },
        { key: 'organic_acid', label: '有机酸代谢' }
    ];
    var pathwayScores = latestRecord.pathwayScores || {};

    pathwayDimensions.forEach(function(dim) {
        var score = pathwayScores[dim.key] || 0;
        detailsHtml += '<div style="background: ' + (score > 60 ? '#d4edda' : score > 30 ? '#fff3cd' : '#fee') + '; border: 2px solid ' + (score > 60 ? '#c3e6cb' : score > 30 ? '#ffeeba' : '#f5c6cb') + '; border-radius: 12px; padding: 15px; text-align: center;">'
            + '<div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">' + dim.label + '</div>'
            + '<div style="font-weight: 700; font-size: 1.4rem; color: ' + (score > 60 ? '#27ae60' : score > 30 ? '#f39c12' : '#e74c3c') + '">' + score.toFixed(0) + '</div>'
            + '<div style="margin-top: 10px;">'
            + '<div style="height: 8px; background: #e0e6ed; border-radius: 4px; overflow: hidden;">'
            + '<div style="height: 100%; width: ' + Math.min(score, 100) + '%; background: ' + (score > 60 ? '#27ae60' : score > 30 ? '#f39c12' : '#e74c3c') + '; border-radius: 4px;"></div>'
            + '</div></div></div>';
    });

    detailsHtml += '</div></div>';

    detailsHtml += `
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #333; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                <span>🔬</span>
                <span>匹配代谢物</span>
                <span style="background: #1a2980; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;">${(latestRecord.matchResults || []).length}</span>
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                ${(latestRecord.matchResults || []).map(function(m) { return `
                    <div style="background: ${m.deviation < 0.2 ? '#d4edda' : '#fff3cd'}; border: 2px solid ${m.deviation < 0.2 ? '#c3e6cb' : '#ffeeba'}; border-radius: 10px; padding: 12px; text-align: center;">
                        <div style="font-weight: 700; color: ${m.deviation < 0.2 ? '#27ae60' : '#f39c12'}; font-size: 0.85rem;">${m.name}</div>
                        <div style="margin-top: 5px; font-size: 0.9rem; color: #333;">m/z ${m.matchedMz.toFixed(4)}</div>
                        <div style="margin-top: 3px; font-size: 0.75rem; color: #666; font-weight: 600;">偏差 ${m.deviation.toFixed(4)} Da</div>
                    </div>
                `; }).join('')}
            </div>
        </div>

        <div style="text-align: center;">
            <button onclick="exportPatientReport('${username}')" style="padding: 12px 30px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(26, 41, 128, 0.2);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 15px rgba(26, 41, 128, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 10px rgba(26, 41, 128, 0.2)';">
                📄 导出健康报告 (PDF)
            </button>
        </div>
    `;

    patientDetailsContent.innerHTML = detailsHtml;

    prescriptionContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="margin-bottom: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" onclick="insertText('【饮食建议】\\n');" style="padding: 8px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">🍎 饮食</button>
                <button type="button" onclick="insertText('【运动建议】\\n');" style="padding: 8px 15px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">🏃 运动</button>
                <button type="button" onclick="insertText('【生活方式】\\n');" style="padding: 8px 15px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">🌙 生活方式</button>
                <button type="button" onclick="insertText('【用药建议】\\n');" style="padding: 8px 15px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">💊 用药</button>
            </div>
            <textarea id="prescriptionText" rows="6" style="width: 100%; padding: 15px; border: 2px solid #e0e6ed; border-radius: 12px; resize: vertical; font-family: inherit; font-size: 0.95rem; outline: none; transition: all 0.3s ease;" placeholder="请输入医嘱内容..." onfocus="this.style.borderColor='#26d0ce'"></textarea>
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <button onclick="savePrescription('${username}')" style="padding: 12px 25px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(26, 41, 128, 0.2);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 15px rgba(26, 41, 128, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 10px rgba(26, 41, 128, 0.2)';">💾 保存医嘱</button>
            <button onclick="sharePrescription('${username}')" style="padding: 12px 25px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(245, 87, 108, 0.2);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 15px rgba(245, 87, 108, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 10px rgba(245, 87, 108, 0.2)';">📤 共享医嘱</button>
        </div>

        <h4 style="margin-top: 20px; margin-bottom: 12px; color: #333; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
            <span>📋</span>
            <span>历史医嘱</span>
        </h4>
        <div id="prescriptionHistory" style="max-height: 220px; overflow-y: auto; border-radius: 12px; padding: 5px;">
        </div>
    `;

    loadPrescriptionHistory(username);

    if (doctorChatMessages) {
        loadDoctorChatMessages(username, doctorChatMessages);
    }
}

export function exportPatientReport(username) {
    const patientData = JSON.parse(localStorage.getItem(`metascanData_${username}`)) || [];
    if (patientData.length === 0) {
        showNotification('患者暂无检测数据，无法导出报告', 'warning');
        return;
    }

    const latestRecord = patientData[patientData.length - 1];

    const coverageScore = latestRecord.overallCoverageScore || 0;
    let riskLevel, riskColorClass;
    if (coverageScore >= 70) {
        riskLevel = '高覆盖';
        riskColorClass = 'color: #27ae60;';
    } else if (coverageScore >= 40) {
        riskLevel = '中等覆盖';
        riskColorClass = 'color: #f39c12;';
    } else {
        riskLevel = '低覆盖';
        riskColorClass = 'color: #e74c3c;';
    }

    const patternNames = (latestRecord.pathwayPatterns || []).map(function(s) { return (categoryNames && categoryNames[s]) ? categoryNames[s] : s; }).join('、');

    const recommendations = generateComprehensiveRecommendations(latestRecord);

    const reportContainer = document.createElement('div');
    reportContainer.id = 'tempReportContainer';
    reportContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 800px;
        background: white;
        padding: 40px;
        font-family: 'SimHei', 'Microsoft YaHei', '黑体', sans-serif;
        z-index: 99999;
    `;

    reportContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 28px; color: #1a2980; margin: 0;">MetaScan - 患者健康报告</h1>
        </div>

        <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #1a2980;">
            <h2 style="font-size: 20px; color: #333; margin: 10px 0;">患者: ${username}</h2>
            <p style="font-size: 14px; color: #666; margin: 5px 0;">检测日期: ${latestRecord.date}</p>
            <p style="font-size: 14px; color: #666; margin: 5px 0;">报告生成日期: ${new Date().toLocaleDateString('zh-CN')}</p>
        </div>

        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; color: #1a2980; margin: 20px 0 10px 0; padding-left: 10px; border-left: 4px solid #26d0ce;">健康概览</h3>
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px;">
                <p style="font-size: 16px; margin: 10px 0;">代谢覆盖评分: <strong style="${riskColorClass}">${coverageScore.toFixed(1)} (${riskLevel})</strong></p>
                <p style="font-size: 14px; margin: 8px 0;">氨基酸代谢覆盖度: ${(latestRecord.pathwayScores && latestRecord.pathwayScores.amino_acid || 0).toFixed(0)}</p>
                <p style="font-size: 14px; margin: 8px 0;">碳水化合物代谢覆盖度: ${(latestRecord.pathwayScores && latestRecord.pathwayScores.carbohydrate || 0).toFixed(0)}</p>
                <p style="font-size: 14px; margin: 8px 0;">有机酸代谢覆盖度: ${(latestRecord.pathwayScores && latestRecord.pathwayScores.organic_acid || 0).toFixed(0)}</p>
            </div>
        </div>

        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; color: #1a2980; margin: 20px 0 10px 0; padding-left: 10px; border-left: 4px solid #26d0ce;">通路覆盖模式</h3>
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px;">
                <p style="font-size: 16px; margin: 0;">模式: ${patternNames || '未识别'}</p>
            </div>
        </div>

        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; color: #1a2980; margin: 20px 0 10px 0; padding-left: 10px; border-left: 4px solid #26d0ce;">匹配代谢物</h3>
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px;">
                ${(latestRecord.matchResults || []).length > 0 ?
                    (latestRecord.matchResults || []).map(function(m) { return `
                        <p style="font-size: 14px; margin: 8px 0;">${m.name} (m/z: ${m.matchedMz.toFixed(4)}, 偏差: ${m.deviation.toFixed(4)} Da)</p>
                    `; }).join('')
                    : '<p style="font-size: 14px; color: #666;">无匹配代谢物</p>'
                }
            </div>
        </div>

        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; color: #1a2980; margin: 20px 0 10px 0; padding-left: 10px; border-left: 4px solid #26d0ce;">健康建议</h3>
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px;">
                ${recommendations.length > 0 ?
                    recommendations.map((rec, index) => `
                        <p style="font-size: 14px; margin: 8px 0;">${index + 1}. ${rec}</p>
                    `).join('')
                    : '<p style="font-size: 14px; color: #666;">无具体建议</p>'
                }
            </div>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            本报告由MetaScan系统生成，仅供参考，不能替代专业医疗诊断。
        </div>
    `;

    document.body.appendChild(reportContainer);

    setTimeout(() => {
        html2canvas(reportContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`MetaScan_患者报告_${username}_${new Date().toLocaleDateString('zh-CN')}.pdf`);

            document.body.removeChild(reportContainer);

            showNotification('健康报告导出成功！');
        }).catch(error => {
            console.error('PDF导出失败:', error);
            showNotification('PDF导出失败，请重试', 'error');
            document.body.removeChild(reportContainer);
        });
    }, 100);
}

export function savePrescription(username) {
    const prescriptionText = document.getElementById('prescriptionText').value.trim();

    if (!prescriptionText) {
        showNotification('请输入医嘱内容', 'warning');
        return;
    }

    const prescription = {
        doctor: currentUser.username,
        content: prescriptionText,
        date: new Date().toISOString()
    };

    const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${username}`)) || [];
    prescriptions.push(prescription);

    localStorage.setItem(`metascanPrescriptions_${username}`, JSON.stringify(prescriptions));

    addDoctorActivity('prescription', '创建医嘱', `为患者${username}创建了医嘱`);

    showNotification('医嘱保存成功！');

    loadPrescriptionHistory(username);

    document.getElementById('prescriptionText').value = '';
}

export function sharePrescription(username) {
    const prescriptionText = document.getElementById('prescriptionText').value.trim();

    if (!prescriptionText) {
        showNotification('请先输入医嘱内容', 'warning');
        return;
    }

    const doctors = [];
    for (const [doctorUsername, userData] of Object.entries(users)) {
        if (userData.role === 'doctor' && doctorUsername !== currentUser.username) {
            doctors.push(doctorUsername);
        }
    }

    if (doctors.length === 0) {
        showNotification('系统中没有其他医生');
        return;
    }

    let doctorSelect = '<select id="shareDoctor" style="padding: 8px; border: 1px solid #e0e6ed; border-radius: 8px; margin-right: 10px;">';
    doctors.forEach(doctor => {
        doctorSelect += `<option value="${doctor}">${doctor}</option>`;
    });
    doctorSelect += '</select>';

    const confirmShare = confirm(`请选择要共享医嘱的医生:\n${doctorSelect}`);

    if (confirmShare) {
        const selectedDoctor = document.getElementById('shareDoctor').value;
        if (selectedDoctor) {
            const sharedPrescription = {
                patient: username,
                doctor: currentUser.username,
                content: prescriptionText,
                date: new Date().toISOString()
            };

            const sharedPrescriptions = JSON.parse(localStorage.getItem(`metascanSharedPrescriptions_${selectedDoctor}`)) || [];
            sharedPrescriptions.push(sharedPrescription);
            localStorage.setItem(`metascanSharedPrescriptions_${selectedDoctor}`, JSON.stringify(sharedPrescriptions));

            showNotification(`医嘱已成功共享给医生 ${selectedDoctor}！`);
        }
    }
}

export function referPatient(username) {
    const doctors = [];
    for (const [doctorUsername, userData] of Object.entries(users)) {
        if (userData.role === 'doctor' && doctorUsername !== currentUser.username) {
            doctors.push(doctorUsername);
        }
    }

    if (doctors.length === 0) {
        showNotification('系统中没有其他医生');
        return;
    }

    let doctorSelect = '<select id="referDoctor" style="padding: 8px; border: 1px solid #e0e6ed; border-radius: 8px; margin-right: 10px;">';
    doctors.forEach(doctor => {
        doctorSelect += `<option value="${doctor}">${doctor}</option>`;
    });
    doctorSelect += '</select>';

    const confirmRefer = confirm(`请选择要转诊的医生:\n${doctorSelect}`);

    if (confirmRefer) {
        const selectedDoctor = document.getElementById('referDoctor').value;
        if (selectedDoctor) {
            const referral = {
                patient: username,
                fromDoctor: currentUser.username,
                toDoctor: selectedDoctor,
                date: new Date().toISOString(),
                reason: '患者转诊'
            };

            const referrals = JSON.parse(localStorage.getItem(`metascanReferrals_${selectedDoctor}`)) || [];
            referrals.push(referral);
            localStorage.setItem(`metascanReferrals_${selectedDoctor}`, JSON.stringify(referrals));

            showNotification(`患者已成功转诊给医生 ${selectedDoctor}！`);
        }
    }
}

window.approveReportAccess = approveReportAccess;
window.rejectReportAccess = rejectReportAccess;
window.handlePendingItem = handlePendingItem;
window.insertText = insertText;
window.showPatientDetails = showPatientDetails;
window.exportPatientReport = exportPatientReport;
window.savePrescription = savePrescription;
window.sharePrescription = sharePrescription;
window.referPatient = referPatient;
window.refreshPatientList = refreshPatientList;
window.searchPatients = searchPatients;
window.filterPatients = filterPatients;
window.resetFilters = resetFilters;
window.copyMessage = copyMessage;
window.showDoctorMessageMenu = showDoctorMessageMenu;
window.replyToDoctorMessage = replyToDoctorMessage;
window.cancelDoctorReply = cancelDoctorReply;
window.deleteDoctorMessage = deleteDoctorMessage;

var selectedPatients = {};

function getPatientGroups() {
    return JSON.parse(localStorage.getItem('metascanPatientGroups_' + currentUser.username) || '[]');
}

function savePatientGroups(groups) {
    localStorage.setItem('metascanPatientGroups_' + currentUser.username, JSON.stringify(groups));
}

function getPatientTags(username) {
    return JSON.parse(localStorage.getItem('metascanPatientTags_' + username) || '[]');
}

function savePatientTags(username, tags) {
    localStorage.setItem('metascanPatientTags_' + username, JSON.stringify(tags));
}

function renderGroupList() {
    var groupList = document.getElementById('groupList');
    if (!groupList) return;

    var groups = getPatientGroups();
    var groupFilter = document.getElementById('groupFilter');
    if (groupFilter) {
        groupFilter.innerHTML = '<option value="all">所有分组</option>';
        groups.forEach(function(g) {
            groupFilter.innerHTML += '<option value="' + g.id + '">' + escapeHTML(g.name) + '</option>';
        });
    }

    if (groups.length === 0) {
        groupList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px 10px; font-size: 0.85rem;"><div style="font-size: 1.5rem; margin-bottom: 8px;">📁</div><div>暂无分组</div><div style="font-size: 0.75rem; color: #bbb;">点击"+ 新建分组"开始</div></div>';
        return;
    }

    var html = '';
    groups.forEach(function(group) {
        var count = group.patients ? group.patients.length : 0;
        html += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin-bottom: 6px; background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent;" onmouseover="this.style.borderColor=\'#8b5cf6\'; this.style.transform=\'translateX(2px)\';" onmouseout="this.style.borderColor=\'transparent\'; this.style.transform=\'translateX(0)\';" onclick="filterByGroup(\'' + group.id + '\')">';
        html += '<div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">';
        html += '<span style="font-size: 1.1rem;">📁</span>';
        html += '<span style="font-weight: 600; color: #1a2980; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHTML(group.name) + '</span>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 8px;">';
        html += '<span style="background: #8b5cf6; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">' + count + '</span>';
        html += '<button onclick="event.stopPropagation(); deletePatientGroup(\'' + group.id + '\')" style="background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 2px 4px; opacity: 0.5; transition: opacity 0.2s;" onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.5\'" title="删除分组">🗑️</button>';
        html += '</div></div>';
    });
    groupList.innerHTML = html;
}

function createPatientGroup() {
    var input = document.getElementById('newGroupName');
    var name = input.value.trim();
    if (!name) {
        showNotification('请输入分组名称');
        return;
    }
    var groups = getPatientGroups();
    if (groups.some(function(g) { return g.name === name; })) {
        showNotification('分组名称已存在');
        return;
    }
    groups.push({ id: 'group_' + Date.now(), name: name, patients: [], createdAt: new Date().toISOString() });
    savePatientGroups(groups);
    input.value = '';
    renderGroupList();
    showNotification('分组"' + name + '"创建成功');
}

function deletePatientGroup(groupId) {
    var groups = getPatientGroups();
    var group = groups.find(function(g) { return g.id === groupId; });
    if (!group) return;
    if (!confirm('确定要删除分组"' + group.name + '"吗？分组中的患者不会被删除。')) return;
    groups = groups.filter(function(g) { return g.id !== groupId; });
    savePatientGroups(groups);
    renderGroupList();
    loadPatientList();
    showNotification('分组已删除');
}

function addPatientToGroup(username, groupId) {
    var groups = getPatientGroups();
    var group = groups.find(function(g) { return g.id === groupId; });
    if (!group) return;
    if (!group.patients.includes(username)) {
        group.patients.push(username);
        savePatientGroups(groups);
        renderGroupList();
    }
}

function removePatientFromGroup(username, groupId) {
    var groups = getPatientGroups();
    var group = groups.find(function(g) { return g.id === groupId; });
    if (!group) return;
    group.patients = group.patients.filter(function(p) { return p !== username; });
    savePatientGroups(groups);
    renderGroupList();
}

function batchAddToGroup(groupId) {
    var usernames = Object.keys(selectedPatients);
    if (usernames.length === 0) {
        showNotification('请先选择患者');
        return;
    }
    var groups = getPatientGroups();
    var group = groups.find(function(g) { return g.id === groupId; });
    if (!group) return;
    usernames.forEach(function(username) {
        if (!group.patients.includes(username)) {
            group.patients.push(username);
        }
    });
    savePatientGroups(groups);
    renderGroupList();
    showNotification('已将 ' + usernames.length + ' 位患者加入分组"' + group.name + '"');
}

function filterByGroup(groupId) {
    var groupFilter = document.getElementById('groupFilter');
    if (groupFilter) groupFilter.value = groupId;
    filterPatientsByGroup();
}

function filterPatientsByGroup() {
    var groupId = document.getElementById('groupFilter').value;
    if (groupId === 'all') {
        loadPatientList();
        return;
    }
    var groups = getPatientGroups();
    var group = groups.find(function(g) { return g.id === groupId; });
    if (!group) {
        loadPatientList();
        return;
    }
    var patients = [];
    for (var username in users) {
        if (users[username].role === 'patient' && group.patients.includes(username)) {
            patients.push({ username: username, username: username });
        }
    }
    loadPatientList(patients);
}

function openBatchGroupMove() {
    var usernames = Object.keys(selectedPatients);
    if (usernames.length === 0) {
        showNotification('请先选择患者');
        return;
    }
    var groups = getPatientGroups();
    if (groups.length === 0) {
        showNotification('请先创建分组');
        return;
    }
    var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;"><div style="background:white;border-radius:20px;padding:30px;max-width:450px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);">';
    html += '<h3 style="color:#1a2980;margin:0 0 8px 0;">📁 批量移动到分组</h3>';
    html += '<p style="color:#666;margin:0 0 20px 0;font-size:0.9rem;">已选择 <b>' + usernames.length + '</b> 位患者</p>';
    html += '<div style="max-height:280px;overflow-y:auto;margin-bottom:20px;">';
    groups.forEach(function(g) {
        html += '<div onclick="batchAddToGroup(\'' + g.id + '\'); document.getElementById(\'batchGroupModal\').remove();" style="padding:14px 18px;margin-bottom:8px;background:#f8f9ff;border-radius:12px;cursor:pointer;transition:all 0.2s;border:2px solid transparent;display:flex;justify-content:space-between;align-items:center;" onmouseover="this.style.borderColor=\'#8b5cf6\'; this.style.background=\'#f0f4ff\';" onmouseout="this.style.borderColor=\'transparent\'; this.style.background=\'#f8f9ff\';">';
        html += '<span style="font-weight:600;color:#1a2980;">📁 ' + escapeHTML(g.name) + '</span>';
        html += '<span style="color:#8b5cf6;font-size:0.85rem;font-weight:600;">' + (g.patients ? g.patients.length : 0) + ' 人</span>';
        html += '</div>';
    });
    html += '</div>';
    html += '<button onclick="document.getElementById(\'batchGroupModal\').remove()" style="width:100%;padding:12px;background:#e0e6ed;border:none;border-radius:12px;cursor:pointer;font-weight:600;color:#666;">取消</button>';
    html += '</div></div>';
    var modal = document.createElement('div');
    modal.id = 'batchGroupModal';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function togglePatientSelection(username) {
    event.stopPropagation();
    if (selectedPatients[username]) {
        delete selectedPatients[username];
    } else {
        selectedPatients[username] = true;
    }
    updateBatchActionBar();
}

function selectAllPatients() {
    var items = document.querySelectorAll('#patientList .patient-item');
    items.forEach(function(item) {
        var username = item.getAttribute('data-username');
        selectedPatients[username] = true;
    });
    updateBatchActionBar();
    refreshCheckboxStates();
}

function deselectAllPatients() {
    selectedPatients = {};
    updateBatchActionBar();
    refreshCheckboxStates();
}

function updateBatchActionBar() {
    var bar = document.getElementById('batchActionBar');
    var countEl = document.getElementById('selectedCount');
    if (!bar || !countEl) return;
    var count = Object.keys(selectedPatients).length;
    countEl.textContent = count;
    if (count > 0) {
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }
}

function refreshCheckboxStates() {
    var items = document.querySelectorAll('#patientList .patient-item');
    items.forEach(function(item) {
        var username = item.getAttribute('data-username');
        var cb = item.querySelector('.patient-checkbox');
        if (cb) {
            cb.checked = !!selectedPatients[username];
        }
    });
}

function batchSendReminder() {
    var usernames = Object.keys(selectedPatients);
    if (usernames.length === 0) {
        showNotification('请先选择患者');
        return;
    }
    var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;">';
    html += '<div style="background:white;border-radius:20px;padding:30px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);">';
    html += '<h3 style="color:#1a2980;margin:0 0 8px 0;">📩 批量发送随访提醒</h3>';
    html += '<p style="color:#666;margin:0 0 20px 0;font-size:0.9rem;">将向 <b>' + usernames.length + '</b> 位患者发送提醒</p>';
    html += '<div style="margin-bottom:15px;"><label style="font-size:0.9rem;color:#333;display:block;margin-bottom:6px;">提醒标题</label>';
    html += '<input id="reminderTitle" type="text" placeholder="例如：月度随访提醒" style="width:100%;padding:12px;border:2px solid #e0e6ed;border-radius:10px;font-size:0.95rem;outline:none;box-sizing:border-box;" value="健康随访提醒"></div>';
    html += '<div style="margin-bottom:15px;"><label style="font-size:0.9rem;color:#333;display:block;margin-bottom:6px;">提醒内容</label>';
    html += '<textarea id="reminderContent" style="width:100%;height:120px;padding:12px;border:2px solid #e0e6ed;border-radius:10px;font-size:0.95rem;outline:none;resize:vertical;box-sizing:border-box;" placeholder="请输入提醒内容...">尊敬的患者，您好！提醒您按照医嘱进行定期随访检查。如有任何不适，请及时联系医生。祝您健康！</textarea></div>';
    html += '<div style="display:flex;gap:10px;">';
    html += '<button onclick="confirmBatchSendReminder()" style="flex:1;padding:14px;background:linear-gradient(135deg,#1a2980 0%,#26d0ce 100%);color:white;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:1rem;">✅ 确认发送</button>';
    html += '<button onclick="document.getElementById(\'batchReminderModal\').remove()" style="flex:1;padding:14px;background:#e0e6ed;border:none;border-radius:12px;cursor:pointer;font-weight:600;color:#666;">取消</button>';
    html += '</div></div></div>';
    var modal = document.createElement('div');
    modal.id = 'batchReminderModal';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function confirmBatchSendReminder() {
    var title = document.getElementById('reminderTitle').value.trim();
    var content = document.getElementById('reminderContent').value.trim();
    if (!title || !content) {
        showNotification('请填写提醒标题和内容');
        return;
    }
    var usernames = Object.keys(selectedPatients);
    var sent = 0;
    usernames.forEach(function(username) {
        var notifications = JSON.parse(localStorage.getItem('metascanNotifications_' + username) || '[]');
        notifications.unshift({
            id: 'reminder_' + Date.now() + '_' + username,
            type: 'reminder',
            title: title,
            message: content,
            timestamp: new Date().toISOString(),
            fromDoctor: currentUser.username,
            read: false
        });
        localStorage.setItem('metascanNotifications_' + username, JSON.stringify(notifications));
        sent++;
    });
    document.getElementById('batchReminderModal').remove();
    showNotification('已成功向 ' + sent + ' 位患者发送随访提醒');
    deselectAllPatients();
}

var healthEducationMaterials = [
    { id: 'diet_guide', title: '健康饮食指南', category: '饮食', content: '合理膳食是代谢健康的基础...', icon: '🥗' },
    { id: 'exercise_guide', title: '科学运动建议', category: '运动', content: '每周至少150分钟中等强度运动...', icon: '🏃' },
    { id: 'sleep_guide', title: '优质睡眠指导', category: '生活', content: '保持规律作息，每晚7-8小时睡眠...', icon: '😴' },
    { id: 'stress_guide', title: '压力管理技巧', category: '心理', content: '通过冥想、深呼吸等方式缓解压力...', icon: '🧘' },
    { id: 'glucose_monitor', title: '血糖自我监测指南', category: '监测', content: '建议空腹及餐后2小时检测血糖...', icon: '🩸' },
    { id: 'lipid_guide', title: '血脂管理知识', category: '教育', content: '了解LDL、HDL、甘油三酯的意义...', icon: '📚' },
    { id: 'medication_reminder', title: '用药依从性教育', category: '教育', content: '按时按量服药，不自行停药...', icon: '💊' },
    { id: 'weight_guide', title: '体重管理方案', category: '饮食', content: '通过饮食与运动科学减重...', icon: '⚖️' }
];

function batchSendHealthEducation() {
    var usernames = Object.keys(selectedPatients);
    if (usernames.length === 0) {
        showNotification('请先选择患者');
        return;
    }
    var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;">';
    html += '<div style="background:white;border-radius:20px;padding:30px;max-width:550px;width:90%;max-height:80vh;box-shadow:0 10px 40px rgba(0,0,0,0.3);display:flex;flex-direction:column;">';
    html += '<h3 style="color:#1a2980;margin:0 0 8px 0;">📚 批量发送健康宣教资料</h3>';
    html += '<p style="color:#666;margin:0 0 8px 0;font-size:0.9rem;">将向 <b>' + usernames.length + '</b> 位患者发送资料，勾选需要发送的项</p>';
    html += '<div id="materialList" style="flex:1;overflow-y:auto;margin-bottom:15px;max-height:350px;">';
    healthEducationMaterials.forEach(function(m, i) {
        html += '<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:6px;background:#f8f9ff;border-radius:12px;cursor:pointer;transition:all 0.2s;border:2px solid transparent;" onmouseover="this.style.borderColor=\'#26d0ce\';" onmouseout="this.style.borderColor=\'transparent\';">';
        html += '<input type="checkbox" class="material-checkbox" value="' + m.id + '" checked style="width:18px;height:18px;accent-color:#26d0ce;">';
        html += '<span style="font-size:1.2rem;">' + m.icon + '</span>';
        html += '<div style="flex:1;"><div style="font-weight:600;color:#1a2980;font-size:0.95rem;">' + escapeHTML(m.title) + '</div>';
        html += '<div style="font-size:0.8rem;color:#666;">' + m.category + '</div></div>';
        html += '</label>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:10px;">';
    html += '<button onclick="confirmBatchSendEducation()" style="flex:1;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:1rem;">✅ 确认发送</button>';
    html += '<button onclick="document.getElementById(\'batchEducationModal\').remove()" style="flex:1;padding:14px;background:#e0e6ed;border:none;border-radius:12px;cursor:pointer;font-weight:600;color:#666;">取消</button>';
    html += '</div></div></div>';
    var modal = document.createElement('div');
    modal.id = 'batchEducationModal';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function confirmBatchSendEducation() {
    var checkboxes = document.querySelectorAll('#materialList .material-checkbox:checked');
    var selectedMaterials = [];
    checkboxes.forEach(function(cb) {
        var material = healthEducationMaterials.find(function(m) { return m.id === cb.value; });
        if (material) selectedMaterials.push(material);
    });
    if (selectedMaterials.length === 0) {
        showNotification('请至少选择一份资料');
        return;
    }
    var usernames = Object.keys(selectedPatients);
    var sent = 0;
    usernames.forEach(function(username) {
        selectedMaterials.forEach(function(m) {
            var notifications = JSON.parse(localStorage.getItem('metascanNotifications_' + username) || '[]');
            notifications.unshift({
                id: 'edu_' + Date.now() + '_' + m.id + '_' + username,
                type: 'education',
                title: m.title,
                message: m.content,
                icon: m.icon,
                category: m.category,
                timestamp: new Date().toISOString(),
                fromDoctor: currentUser.username,
                read: false
            });
            localStorage.setItem('metascanNotifications_' + username, JSON.stringify(notifications));
        });
        sent++;
    });
    document.getElementById('batchEducationModal').remove();
    showNotification('已成功向 ' + sent + ' 位患者发送 ' + selectedMaterials.length + ' 份宣教资料');
    deselectAllPatients();
}

function renderTagCloud(username) {
    var cloud = document.getElementById('tagCloud');
    if (!cloud) return;
    if (!username || username === 'null') {
        cloud.innerHTML = '<span style="color: #999; font-size: 0.8rem;">选择患者后显示标签</span>';
        return;
    }
    var tags = getPatientTags(username);
    if (tags.length === 0) {
        cloud.innerHTML = '<span style="color: #999; font-size: 0.8rem;">该患者暂无标签</span>';
        return;
    }
    var tagColors = ['#667eea', '#f59e0b', '#e74c3c', '#27ae60', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4'];
    var html = '';
    tags.forEach(function(tag, i) {
        var color = tagColors[i % tagColors.length];
        html += '<span style="background:' + color + '15; color:' + color + '; padding:4px 12px; border-radius:14px; font-size:0.8rem; font-weight:600; display:inline-flex; align-items:center; gap:6px; margin-bottom:4px;">' + escapeHTML(tag) + '<span onclick="removePatientTag(\'' + username + '\', \'' + escapeAttr(tag) + '\')" style="cursor:pointer;font-size:0.75rem;opacity:0.5;transition:opacity 0.2s;" onmouseover="this.style.opacity=\'1\'" title="删除标签">✕</span></span>';
    });
    cloud.innerHTML = html;
}

function addTagToSelectedPatient() {
    var input = document.getElementById('newTagInput');
    var tag = input.value.trim();
    if (!tag) return;
    var username = window.currentSelectedPatient;
    if (!username) {
        showNotification('请先选择一位患者');
        return;
    }
    var tags = getPatientTags(username);
    if (tags.includes(tag)) {
        showNotification('标签已存在');
        input.value = '';
        return;
    }
    tags.push(tag);
    savePatientTags(username, tags);
    input.value = '';
    renderTagCloud(username);
}

function removePatientTag(username, tag) {
    var tags = getPatientTags(username);
    tags = tags.filter(function(t) { return t !== tag; });
    savePatientTags(username, tags);
    renderTagCloud(username);
}

var comparisonSelectedPatients = [];

function openPatientSelector() {
    var allPatients = [];
    for (var uname in users) {
        if (users[uname].role === 'patient') {
            var patientData = JSON.parse(localStorage.getItem('metascanData_' + uname) || '[]');
            if (patientData.length > 0) {
                allPatients.push({ username: uname });
            }
        }
    }
    if (allPatients.length === 0) {
        showNotification('暂无可对比的患者数据');
        return;
    }
    var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;">';
    html += '<div style="background:white;border-radius:20px;padding:30px;max-width:450px;width:90%;max-height:70vh;box-shadow:0 10px 40px rgba(0,0,0,0.3);display:flex;flex-direction:column;">';
    html += '<h3 style="color:#1a2980;margin:0 0 16px 0;">👥 选择对比患者 (最多5位)</h3>';
    html += '<div style="flex:1;overflow-y:auto;max-height:350px;margin-bottom:15px;">';
    allPatients.forEach(function(p) {
        var isSelected = comparisonSelectedPatients.includes(p.username);
        html += '<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:6px;background:#f8f9ff;border-radius:12px;cursor:pointer;transition:all 0.2s;border:2px solid ' + (isSelected ? '#26d0ce' : 'transparent') + ';" onmouseover="if(!this.querySelector(\'input\').checked)this.style.borderColor=\'#e0e6ed\';" onmouseout="if(!this.querySelector(\'input\').checked)this.style.borderColor=\'transparent\';">';
        html += '<input type="checkbox" value="' + p.username + '" ' + (isSelected ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:#26d0ce;">';
        html += '<div style="width:40px;height:40px;background:linear-gradient(135deg,#1a2980 0%,#26d0ce 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1rem;">' + p.username.charAt(0).toUpperCase() + '</div>';
        html += '<span style="font-weight:600;color:#1a2980;">' + escapeHTML(p.username) + '</span>';
        html += '</label>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:10px;">';
    html += '<button onclick="confirmPatientSelection()" style="flex:1;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:12px;cursor:pointer;font-weight:700;">✅ 确认选择</button>';
    html += '<button onclick="document.getElementById(\'patientSelectorModal\').remove()" style="flex:1;padding:14px;background:#e0e6ed;border:none;border-radius:12px;cursor:pointer;font-weight:600;color:#666;">取消</button>';
    html += '</div></div></div>';
    var modal = document.createElement('div');
    modal.id = 'patientSelectorModal';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function confirmPatientSelection() {
    var checkboxes = document.querySelectorAll('#patientSelectorModal input[type="checkbox"]:checked');
    comparisonSelectedPatients = [];
    checkboxes.forEach(function(cb) {
        if (comparisonSelectedPatients.length < 5) {
            comparisonSelectedPatients.push(cb.value);
        }
    });
    if (comparisonSelectedPatients.length === 0) {
        showNotification('请至少选择一位患者');
        return;
    }
    document.getElementById('patientSelectorModal').remove();
    renderComparisonPatientTags();
    updateMultiPatientComparison();
}

function removeComparisonPatient(username) {
    comparisonSelectedPatients = comparisonSelectedPatients.filter(function(u) { return u !== username; });
    renderComparisonPatientTags();
    updateMultiPatientComparison();
}

function renderComparisonPatientTags() {
    var container = document.getElementById('comparisonPatientTags');
    if (!container) return;
    var colors = ['#667eea', '#e74c3c', '#27ae60', '#f59e0b', '#8b5cf6'];
    var html = '';
    comparisonSelectedPatients.forEach(function(username, i) {
        html += '<span style="background:' + colors[i] + '15; color:' + colors[i] + '; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:600; display:inline-flex; align-items:center; gap:8px; border:2px solid ' + colors[i] + '30;">' + escapeHTML(username) + '<span onclick="removeComparisonPatient(\'' + username + '\')" style="cursor:pointer;font-size:0.75rem;opacity:0.6;transition:opacity 0.2s;" onmouseover="this.style.opacity=\'1\'">✕</span></span>';
    });
    container.innerHTML = html;
}

function updateMultiPatientComparison() {
    var lineCtx = document.getElementById('multiPatientTrendChart');
    var barCtx = document.getElementById('multiPatientBarChart');
    if (!lineCtx || !barCtx) return;

    var metric = document.getElementById('comparisonMetric').value;
    var timeRange = document.getElementById('comparisonTimeRange').value;

    if (!window._multiLineChart) window._multiLineChart = null;
    if (!window._multiBarChart) window._multiBarChart = null;

    if (comparisonSelectedPatients.length === 0) {
        if (window._multiLineChart) { window._multiLineChart.destroy(); window._multiLineChart = null; }
        if (window._multiBarChart) { window._multiBarChart.destroy(); window._multiBarChart = null; }
        return;
    }

    var colors = [
        { bg: 'rgba(102,126,234,0.2)', border: '#667eea' },
        { bg: 'rgba(231,76,60,0.2)', border: '#e74c3c' },
        { bg: 'rgba(39,174,96,0.2)', border: '#27ae60' },
        { bg: 'rgba(245,158,11,0.2)', border: '#f59e0b' },
        { bg: 'rgba(139,92,246,0.2)', border: '#8b5cf6' }
    ];

    var metricLabels = { overallRisk: '覆盖评分', amino_acid: '氨基酸代谢', carbohydrate: '碳水代谢', organic_acid: '有机酸代谢' };

    var now = Date.now();
    var timeFilterMs;
    if (timeRange === 'month') timeFilterMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeRange === 'quarter') timeFilterMs = 90 * 24 * 60 * 60 * 1000;
    else if (timeRange === 'year') timeFilterMs = 365 * 24 * 60 * 60 * 1000;

    var allLabels = [];
    var lineDatasets = [];

    comparisonSelectedPatients.forEach(function(username, i) {
        var patientData = JSON.parse(localStorage.getItem('metascanData_' + username) || '[]');
        var sortedData = patientData.slice().sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });

        if (timeFilterMs) {
            sortedData = sortedData.filter(function(d) { return (now - new Date(d.timestamp).getTime()) <= timeFilterMs; });
        }

        var labels = sortedData.map(function(d) { return d.date; });
        var values;
        if (metric === 'overallRisk') {
            values = sortedData.map(function(d) { return d.overallCoverageScore || 0; });
        } else {
            values = sortedData.map(function(d) { return d.pathwayScores ? (d.pathwayScores[metric] || 0) : 0; });
        }

        labels.forEach(function(l) {
            if (!allLabels.includes(l)) allLabels.push(l);
        });

        lineDatasets.push({
            label: username,
            data: values,
            labels: labels,
            borderColor: colors[i].border,
            backgroundColor: colors[i].bg,
            borderWidth: 2.5,
            tension: 0.4,
            pointBackgroundColor: colors[i].border,
            pointRadius: 4,
            pointHoverRadius: 7,
            fill: false
        });
    });

    allLabels.sort(function(a, b) { return new Date(a) - new Date(b); });

    var unifiedDatasets = lineDatasets.map(function(ds) {
        var data = allLabels.map(function(l) {
            var idx = ds.labels.indexOf(l);
            return idx >= 0 ? ds.data[idx] : null;
        });
        return {
            label: ds.label,
            data: data,
            borderColor: ds.borderColor,
            backgroundColor: ds.backgroundColor,
            borderWidth: ds.borderWidth,
            tension: ds.tension,
            pointBackgroundColor: ds.borderColor,
            pointRadius: ds.pointRadius,
            pointHoverRadius: ds.pointHoverRadius,
            fill: ds.fill,
            spanGaps: true
        };
    });

    if (window._multiLineChart) window._multiLineChart.destroy();
    window._multiLineChart = new Chart(lineCtx, {
        type: 'line',
        data: { labels: allLabels, datasets: unifiedDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: { display: true, text: '多患者 ' + metricLabels[metric] + ' 趋势对比', font: { size: 14 }, color: '#1a2980' },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 12 },
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            },
            scales: {
                x: { title: { display: true, text: '检测日期' }, grid: { display: false } },
                y: { beginAtZero: true, max: 100, title: { display: true, text: '覆盖评分' }, ticks: { stepSize: 20 } }
            }
        }
    });

    var barData = comparisonSelectedPatients.map(function(username) {
        var patientData = JSON.parse(localStorage.getItem('metascanData_' + username) || '[]');
        if (patientData.length === 0) return { username: username, value: 0 };
        var latest = patientData[patientData.length - 1];
        if (metric === 'overallRisk') return { username: username, value: latest.overallCoverageScore || 0 };
        return { username: username, value: latest.pathwayScores ? (latest.pathwayScores[metric] || 0) : 0 };
    });

    if (window._multiBarChart) window._multiBarChart.destroy();
    window._multiBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: barData.map(function(d) { return d.username; }),
            datasets: [{
                label: metricLabels[metric] + ' (最新)',
                data: barData.map(function(d) { return d.value; }),
                backgroundColor: barData.map(function(d, i) { return colors[i].bg.replace('0.2', '0.6'); }),
                borderColor: barData.map(function(d, i) { return colors[i].border; }),
                borderWidth: 2,
                borderRadius: 8,
                barThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: '最新 ' + metricLabels[metric] + ' 柱状对比', font: { size: 14 }, color: '#1a2980' },
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, max: 100, title: { display: true, text: '覆盖评分' }, ticks: { stepSize: 20 } }
            }
        }
    });
}

function exportComparisonData(format) {
    if (comparisonSelectedPatients.length === 0) {
        showNotification('请先选择对比患者');
        return;
    }
    var metric = document.getElementById('comparisonMetric').value;
    var metricLabels = { overallRisk: '覆盖评分', amino_acid: '氨基酸代谢', carbohydrate: '碳水代谢', organic_acid: '有机酸代谢' };

    if (format === 'csv') {
        var csvRows = [['患者', '日期', metricLabels[metric]].join(',')];
        comparisonSelectedPatients.forEach(function(username) {
            var patientData = JSON.parse(localStorage.getItem('metascanData_' + username) || '[]');
            patientData.sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
            patientData.forEach(function(d) {
                var val = metric === 'overallRisk' ? d.overallCoverageScore || 0 : (d.pathwayScores ? (d.pathwayScores[metric] || 0) : 0);
                csvRows.push([username, d.date, val.toFixed(1)].join(','));
            });
        });
        var blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = '多患者对比分析_' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();
        URL.revokeObjectURL(url);
        showNotification('CSV文件已导出');
    } else if (format === 'pdf') {
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            var comparisonSection = document.getElementById('multiPatientComparison');
            var printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>多患者对比分析报告</title><style>body{font-family:sans-serif;padding:20px;}h1{color:#1a2980;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#1a2980;color:white;}</style></head><body>');
            printWindow.document.write('<h1>多患者风险趋势对比分析报告</h1>');
            printWindow.document.write('<p>指标: ' + metricLabels[metric] + ' | 日期: ' + new Date().toLocaleDateString('zh-CN') + '</p>');
            printWindow.document.write('<table><tr><th>患者</th><th>日期</th><th>' + metricLabels[metric] + '</th></tr>');
            comparisonSelectedPatients.forEach(function(username) {
                var patientData = JSON.parse(localStorage.getItem('metascanData_' + username) || '[]');
                patientData.sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
                patientData.forEach(function(d) {
                    var val = metric === 'overallRisk' ? (d.overallCoverageScore || 0) : (d.pathwayScores ? (d.pathwayScores[metric] || 0) : 0);
                    printWindow.document.write('<tr><td>' + escapeHTML(username) + '</td><td>' + d.date + '</td><td>' + val.toFixed(1) + '</td></tr>');
                });
            });
            printWindow.document.write('</table></body></html>');
            printWindow.document.close();
            printWindow.print();
            showNotification('请使用浏览器的"另存为PDF"功能保存');
        } else {
            var section = document.getElementById('multiPatientComparison');
            html2canvas(section, { scale: 2 }).then(function(canvas) {
                var imgData = canvas.toDataURL('image/png');
                var pdf = new jspdf.jsPDF('l', 'mm', 'a4');
                var imgWidth = 277;
                var imgHeight = canvas.height * imgWidth / canvas.width;
                pdf.addImage(imgData, 'PNG', 10, 10, imgWidth - 20, imgHeight - 20);
                pdf.save('多患者对比分析_' + new Date().toISOString().slice(0, 10) + '.pdf');
                showNotification('PDF报告已导出');
            });
        }
    }
}

window.createPatientGroup = createPatientGroup;
window.deletePatientGroup = deletePatientGroup;
window.filterByGroup = filterByGroup;
window.filterPatientsByGroup = filterPatientsByGroup;
window.togglePatientSelection = togglePatientSelection;
window.selectAllPatients = selectAllPatients;
window.deselectAllPatients = deselectAllPatients;
window.batchSendHealthEducation = batchSendHealthEducation;
window.batchSendReminder = batchSendReminder;
window.confirmBatchSendReminder = confirmBatchSendReminder;
window.confirmBatchSendEducation = confirmBatchSendEducation;
window.openBatchGroupMove = openBatchGroupMove;
window.batchAddToGroup = batchAddToGroup;
window.addTagToSelectedPatient = addTagToSelectedPatient;
window.removePatientTag = removePatientTag;
window.openPatientSelector = openPatientSelector;
window.confirmPatientSelection = confirmPatientSelection;
window.removeComparisonPatient = removeComparisonPatient;
window.updateMultiPatientComparison = updateMultiPatientComparison;
window.exportComparisonData = exportComparisonData;

export function closeConfirmation(result) {
    const overlay = document.getElementById('confirmation-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
    
    if (FeedbackSystem.confirmationCallback) {
        FeedbackSystem.confirmationCallback(result);
        FeedbackSystem.confirmationCallback = null;
    }
    
    if (result) {
        FeedbackSystem.playSound('success');
    } else {
        FeedbackSystem.playSound('click');
    }
}

export function toggleSoundFeedback() {
    FeedbackSystem.toggleSound();
}