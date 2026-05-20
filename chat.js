import { formatMessageTime, getReadStatusIcon, escapeHTML, escapeAttr } from './utils.js';
import { currentUser } from './auth.js';
import { showNotification } from './notifications.js';
import { renderPrescriptionCard, renderMessageContent, copyMessage, markMessagesAsRead, sendPatientNotification } from './shared.js';
import { connect, disconnect, send, on, off, sendTyping, getConnectionStatus } from './ws-client.js';
import { uploadFile, openFilePicker, getFileTypeIcon, getFileTypeName, formatFileSize, API_BASE } from './file-upload.js';

export var chatPollingInterval = null;
export var lastMessageCounts = {};
export var mediaRecorder = null;
export var audioChunks = [];
export var currentRecordingRole = null;
export var recordingTimeout = null;

export function loadPatientPrescriptions() {
    const prescriptionsContainer = document.getElementById('patientPrescriptions');
    if (!prescriptionsContainer) return;
    
    const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${currentUser.username}`)) || [];
    
    updatePrescriptionCount(prescriptions.length);
    
    if (prescriptions.length === 0) {
        prescriptionsContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📋</div>
                <div style="color: #666; font-size: 1rem; margin-bottom: 10px;">暂无医嘱</div>
                <div style="color: #999; font-size: 0.85rem;">医生会根据您的情况给出专业建议</div>
            </div>
        `;
        return;
    }
    
    prescriptions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    prescriptionsContainer.innerHTML = prescriptions.map((prescription, index) => `
        <div style="margin-bottom: 15px; animation: fadeInUp 0.5s ease; animation-delay: ${index * 0.1}s;">
            <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border-radius: 15px; padding: 20px; border: 1px solid #e0e6ed; transition: all 0.3s ease; cursor: pointer;" 
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 15px rgba(26, 41, 128, 0.1);'" 
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                    <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; box-shadow: 0 4px 10px rgba(26, 41, 128, 0.2);">👨‍⚕️</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #1a2980; font-size: 1.05rem; margin-bottom: 3px;">${prescription.doctor}</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.8rem; color: #666; display: flex; align-items: center; gap: 4px;">
                                📅 ${new Date(prescription.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <span style="font-size: 0.75rem; color: #999;">
                                ⏰ ${new Date(prescription.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">医嘱</div>
                </div>
                <div style="background: white; border-radius: 10px; padding: 15px; line-height: 1.8; color: #333; white-space: pre-wrap; border: 1px solid #e0e6ed;">
                    ${prescription.content}
                </div>
            </div>
        </div>
    `).join('');
}

export function refreshPrescriptions() {
    loadPatientPrescriptions();
    showNotification('医嘱列表已刷新');
}

function updatePrescriptionCount(count) {
    const countEl = document.getElementById('prescriptionCount');
    if (countEl) {
        countEl.textContent = count;
    }
}

export function loadChatMessages() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;
    
    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${currentUser.username}`)) || [];
    
    updateMessageCount(chatMessages.length);
    
    if (chatMessages.length === 0) {
        chatContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">💬</div>
                <div style="color: #666; font-size: 1rem; margin-bottom: 10px;">开始与医生对话</div>
                <div style="color: #999; font-size: 0.85rem;">有任何健康问题都可以咨询医生</div>
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
    localStorage.setItem(`metascanChat_${currentUser.username}`, JSON.stringify(chatMessages));
    
    chatContainer.innerHTML = chatMessages.map((message, index) => {
        const isPatient = message.sender === currentUser.username;
        const timeStr = formatMessageTime(message.timestamp);
        const fullTime = new Date(message.timestamp).toLocaleString('zh-CN');
        
        let replyHtml = '';
        if (message.replyTo) {
            replyHtml = `
                <div style="background: rgba(0,0,0,0.05); border-left: 3px solid #26d0ce; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 0.85rem;">
                    <div style="color: #666; margin-bottom: 2px;">回复 ${message.replyTo.sender}</div>
                    <div style="color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${message.replyTo.content}</div>
                </div>
            `;
        }
        
        const isRecalledMessage = message.isRecalled;
        const messageStyle = isRecalledMessage 
            ? 'background: #f5f5f5; color: #999; font-style: italic;' 
            : (isPatient ? 'background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white;' : 'background: white; color: #333; border: 1px solid #e0e6ed;');
        
        return `
            <div style="display: flex; ${isPatient ? 'justify-content: flex-end;' : 'justify-content: flex-start;'} margin-bottom: 16px; animation: fadeInUp 0.4s ease; animation-delay: ${index * 0.05}s;"
                 oncontextmenu="${!isRecalledMessage ? `showMessageMenu(event, ${message.id}, '${message.sender}', '${message.content.replace(/'/g, "\\'")}')` : ''}; return false;">
                ${!isPatient ? `
                    <div style="display: flex; align-items: flex-end; gap: 10px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(26, 41, 128, 0.2);">👨‍⚕️</div>
                        <div style="max-width: 75%;">
                            <div style="${messageStyle} border-radius: 18px 18px 18px 4px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: ${!isRecalledMessage ? 'context-menu' : 'default'};">
                                ${!isRecalledMessage ? replyHtml : ''}
                                <div style="font-weight: 600; color: ${isRecalledMessage ? '#999' : '#1a2980'}; margin-bottom: 6px; font-size: 0.9rem;">医生</div>
                                <div style="line-height: 1.6; font-size: 0.95rem;">${message.content}</div>
                            </div>
                            <div style="font-size: 0.75rem; color: #999; margin-top: 5px; padding-left: 5px; display: flex; align-items: center; gap: 5px;">
                                <span title="${fullTime}">${timeStr}</span>
                                ${isPatient ? `<span style="color: ${message.read ? '#27ae60' : '#999'};">${message.read ? '✓✓ 已读' : '✓ 未读'}</span>` : ''}
                            </div>
                        </div>
                    </div>
                ` : `
                    <div style="display: flex; align-items: flex-end; gap: 10px; flex-direction: row-reverse;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(245, 87, 108, 0.2);">👤</div>
                        <div style="max-width: 75%;">
                            <div style="${messageStyle} border-radius: 18px 18px 4px 18px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(26, 41, 128, 0.2); cursor: ${!isRecalledMessage ? 'context-menu' : 'default'};">
                                ${!isRecalledMessage ? replyHtml : ''}
                                <div style="font-weight: 600; color: ${isRecalledMessage ? '#999' : 'white'}; margin-bottom: 6px; font-size: 0.9rem;">我</div>
                                <div style="line-height: 1.6; font-size: 0.95rem;">${message.content}</div>
                            </div>
                            <div style="font-size: 0.75rem; color: #999; margin-top: 5px; text-align: right; padding-right: 5px; display: flex; align-items: center; gap: 5px; justify-content: flex-end;">
                                <span title="${fullTime}">${timeStr}</span>
                                <span style="color: ${message.read ? '#27ae60' : '#999'};">${message.read ? '✓✓ 已读' : '✓ 未读'}</span>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    }).join('');
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

export function quickReply(text) {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = text;
        chatInput.focus();
    }
}

function updateMessageCount(count) {
    const countEl = document.getElementById('messageCount');
    if (countEl) {
        countEl.textContent = count;
    }
}

function requestReportAccess() {
    if (!currentUser) return;
    
    const existingRequests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const pendingRequest = existingRequests.find(req => 
        req.patientUsername === currentUser.username && req.status === 'pending'
    );
    
    if (pendingRequest) {
        showNotification('您已提交申请，请等待医生审批');
        return;
    }
    
    const approvedRequest = existingRequests.find(req => 
        req.patientUsername === currentUser.username && req.status === 'approved'
    );
    
    if (approvedRequest) {
        showNotification('您已有查看报告的权限');
        updateReportAccessUI('approved');
        return;
    }
    
    const request = {
        id: Date.now(),
        patientUsername: currentUser.username,
        requestDate: new Date().toISOString(),
        status: 'pending'
    };
    
    existingRequests.push(request);
    localStorage.setItem('metascanReportRequests', JSON.stringify(existingRequests));
    
    sendReportAccessRequestNotification(currentUser.username);
    
    updateReportAccessUI('pending');
    
    showNotification('申请已提交，请等待医生审批');
}

export function updateReportAccessUI(status) {
    const statusEl = document.getElementById('reportAccessStatus');
    const contentEl = document.getElementById('reportAccessContent');
    
    if (!statusEl || !contentEl) return;
    
    if (status === 'pending') {
        statusEl.textContent = '审批中';
        statusEl.style.background = '#fff3cd';
        statusEl.style.color = '#856404';
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">⏳</div>
                <p style="color: #666; margin-bottom: 10px;">您的申请已提交</p>
                <p style="color: #999; font-size: 0.9rem;">请耐心等待医生审批...</p>
            </div>
        `;
    } else if (status === 'approved') {
        statusEl.textContent = '已授权';
        statusEl.style.background = '#d4edda';
        statusEl.style.color = '#155724';
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">✅</div>
                <p style="color: #666; margin-bottom: 15px;">医生已授权查看您的健康报告</p>
                <button onclick="showTab('reports')" style="padding: 12px 30px; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);">
                    📊 查看健康报告
                </button>
            </div>
        `;
    }
}

function sendReportAccessRequestNotification(patientUsername) {
    const notification = {
        id: Date.now(),
        type: 'reportRequest',
        title: '📊 报告查看申请',
        message: `患者 ${patientUsername} 申请查看健康报告`,
        patientUsername: patientUsername,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    const doctorNotifications = JSON.parse(localStorage.getItem('metascanDoctorNotifications') || '[]');
    doctorNotifications.unshift(notification);
    localStorage.setItem('metascanDoctorNotifications', JSON.stringify(doctorNotifications));
    
    updateDoctorNotificationBadge();
}

export function loadReportAccessStatus() {
    if (!currentUser) return;
    
    const requests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const request = requests.find(req => req.patientUsername === currentUser.username);
    
    if (request) {
        updateReportAccessUI(request.status);
    }
}

export function loadDoctorList() {
    if (!currentUser || currentUser.role !== 'patient') return;
    
    const doctorListContainer = document.getElementById('doctorListContainer');
    const doctorCountBadge = document.getElementById('doctorCountBadge');
    if (!doctorListContainer) return;
    
    const allUsers = JSON.parse(localStorage.getItem('metascanUsers')) || {};
    const doctors = Object.entries(allUsers)
        .filter(([username, userData]) => userData.role === 'doctor')
        .map(([username, userData]) => ({ username, ...userData }));
    
    if (doctorCountBadge) {
        doctorCountBadge.textContent = doctors.length;
    }
    
    if (doctors.length === 0) {
        doctorListContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 15px;">👨‍⚕️</div>
                <div style="font-size: 0.9rem;">暂无医生</div>
            </div>
        `;
        return;
    }
    
    const selectedDoctor = window.currentSelectedDoctor;
    
    doctorListContainer.innerHTML = doctors.map((doctor, index) => {
        const chatKey = `metascanChat_${currentUser.username}_${doctor.username}`;
        const chatMessages = JSON.parse(localStorage.getItem(chatKey)) || [];
        const unreadCount = chatMessages.filter(msg => 
            msg.sender === doctor.username && !msg.read
        ).length;
        
        const isSelected = selectedDoctor === doctor.username;
        
        return `
            <div onclick="selectDoctor('${doctor.username}')" 
                 style="padding: 15px; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; margin-bottom: 10px;
                        background: ${isSelected ? 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)' : '#f8f9ff'};
                        color: ${isSelected ? 'white' : '#333'};
                        box-shadow: ${isSelected ? '0 4px 15px rgba(26, 41, 128, 0.3)' : 'none'};
                        border: ${isSelected ? 'none' : '1px solid #e0e6ed'};"
                 onmouseover="if(!${isSelected}) this.style.background='#f0f4ff'"
                 onmouseout="if(!${isSelected}) this.style.background='#f8f9ff'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 45px; height: 45px; background: ${isSelected ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)'}; 
                                border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                                color: ${isSelected ? 'white' : 'white'}; font-size: 1.2rem; flex-shrink: 0;">
                        👨‍⚕️
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${doctor.username}
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            专业医生
                        </div>
                    </div>
                    ${unreadCount > 0 ? `
                        <div style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;">
                            ${unreadCount}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function searchDoctors() {
    const searchInput = document.getElementById('doctorSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const doctorItems = document.querySelectorAll('#doctorListContainer > div');
    
    doctorItems.forEach(item => {
        const doctorName = item.textContent.toLowerCase();
        if (doctorName.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

export function selectDoctor(doctorUsername) {
    window.currentSelectedDoctor = doctorUsername;
    
    document.getElementById('noDoctorSelected').style.display = 'none';
    document.getElementById('currentDoctorInfo').style.display = 'block';
    document.getElementById('chatArea').style.display = 'flex';
    document.getElementById('prescriptionArea').style.display = 'block';
    
    document.getElementById('currentDoctorName').textContent = doctorUsername;
    document.getElementById('currentDoctorStatus').textContent = '在线 - 随时可以咨询';
    
    loadDoctorList();
    
    loadChatMessagesWithDoctor(doctorUsername);
    
    loadPrescriptionsFromDoctor(doctorUsername);
}

export function loadChatMessagesWithDoctor(doctorUsername) {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;
    
    const chatKey = `metascanChat_${currentUser.username}_${doctorUsername}`;
    const chatMessages = JSON.parse(localStorage.getItem(chatKey)) || [];
    
    if (chatMessages.length === 0) {
        chatContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">💬</div>
                <div style="color: #666; font-size: 1rem; margin-bottom: 10px;">开始与 ${doctorUsername} 医生对话</div>
                <div style="color: #999; font-size: 0.85rem;">有任何健康问题都可以咨询</div>
            </div>
        `;
        return;
    }
    
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    chatMessages.forEach(msg => {
        if (msg.sender === doctorUsername && !msg.read) {
            msg.read = true;
        }
    });
    localStorage.setItem(chatKey, JSON.stringify(chatMessages));
    
    loadDoctorList();
    
    chatContainer.innerHTML = chatMessages.map((message, index) => {
        var isPatient = message.sender === currentUser.username;
        var timeStr = formatMessageTime(message.timestamp);
        var fullTime = new Date(message.timestamp).toLocaleString('zh-CN');
        var isPrescription = message.type === 'prescription';

        var replyHtml = '';
        if (message.replyTo) {
            replyHtml = '<div style="background: rgba(0,0,0,0.05); border-left: 3px solid #26d0ce; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 0.85rem;"><div style="color: #666; margin-bottom: 2px;">回复 ' + escapeHTML(message.replyTo.sender) + '</div><div style="color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHTML(message.replyTo.content) + '</div></div>';
        }

        var isRecalledMessage = message.isRecalled;
        var messageContent = renderMessageContent(message, isPatient, false);

        var bubbleStyle;
        if (isRecalledMessage) {
            bubbleStyle = 'background: #f5f5f5; color: #999; font-style: italic;';
        } else if (isPrescription) {
            bubbleStyle = '';
        } else if (isPatient) {
            bubbleStyle = 'background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white;';
        } else {
            bubbleStyle = 'background: white; color: #333; border: 1px solid #e0e6ed;';
        }

        var bubbleBorder = !isPrescription ? (isPatient ? 'border-radius: 18px 18px 4px 18px;' : 'border-radius: 18px 18px 18px 4px;') : '';

        var readStatusHtml = getReadStatusIcon(message, isPatient);

        return '<div style="display: flex; ' + (isPatient ? 'justify-content: flex-end;' : 'justify-content: flex-start;') + ' margin-bottom: 16px; animation: fadeInUp 0.4s ease; animation-delay: ' + (index * 0.05) + 's;"' +
            (!isRecalledMessage ? ' oncontextmenu="showMessageMenu(event, ' + message.id + ', \'' + message.sender + '\', \'' + (message.content || '').replace(/'/g, "\\'") + '\'); return false;"' : '') + '>' +
            (!isPatient ? '<div style="display: flex; align-items: flex-end; gap: 10px;"><div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(26, 41, 128, 0.2);">👨‍⚕️</div><div style="max-width: 75%;">' +
                (isPrescription ? '' : '<div style="' + bubbleStyle + ' ' + bubbleBorder + ' padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: ' + (!isRecalledMessage ? 'context-menu' : 'default') + ';">') +
                (!isRecalledMessage ? replyHtml : '') +
                '<div style="font-weight: 600; color: ' + (isRecalledMessage ? '#999' : '#1a2980') + '; margin-bottom: 6px; font-size: 0.9rem;">' + doctorUsername + '</div>' +
                messageContent +
                (isPrescription ? '' : '</div>') +
                '<div style="font-size: 0.75rem; color: #999; margin-top: 5px; padding-left: 5px; display: flex; align-items: center; gap: 5px;"><span title="' + fullTime + '">' + timeStr + '</span></div></div></div>'
                :
                '<div style="display: flex; align-items: flex-end; gap: 10px; flex-direction: row-reverse;"><div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(245, 87, 108, 0.2);">👤</div><div style="max-width: 75%;">' +
                (isPrescription ? '' : '<div style="' + bubbleStyle + ' ' + bubbleBorder + ' padding: 14px 18px; box-shadow: 0 2px 8px rgba(26, 41, 128, 0.2); cursor: ' + (!isRecalledMessage ? 'context-menu' : 'default') + ';">') +
                (!isRecalledMessage ? replyHtml : '') +
                '<div style="font-weight: 600; color: ' + (isRecalledMessage ? '#999' : 'white') + '; margin-bottom: 6px; font-size: 0.9rem;">我</div>' +
                messageContent +
                (isPrescription ? '' : '</div>') +
                '<div style="font-size: 0.75rem; color: #999; margin-top: 5px; text-align: right; padding-right: 5px; display: flex; align-items: center; gap: 5px; justify-content: flex-end;"><span title="' + fullTime + '">' + timeStr + '</span>' + readStatusHtml + '</div></div></div>'
            ) +
        '</div>';
    }).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;

    markMessagesAsRead(chatKey, currentUser.username);
    updateUnreadBadges();
}

export function loadPrescriptionsFromDoctor(doctorUsername) {
    const prescriptionsContainer = document.getElementById('patientPrescriptions');
    if (!prescriptionsContainer) return;
    
    const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${currentUser.username}`)) || [];
    const doctorPrescriptions = prescriptions.filter(p => p.doctorUsername === doctorUsername);
    
    if (doctorPrescriptions.length === 0) {
        prescriptionsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📋</div>
                <div style="font-size: 0.9rem;">暂无来自 ${doctorUsername} 的医嘱</div>
            </div>
        `;
        return;
    }
    
    doctorPrescriptions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    prescriptionsContainer.innerHTML = doctorPrescriptions.map((prescription, index) => `
        <div style="margin-bottom: 15px; animation: fadeInUp 0.5s ease; animation-delay: ${index * 0.1}s;">
            <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border-radius: 12px; padding: 15px; border: 1px solid #e0e6ed;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">👨‍⚕️</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1a2980; font-size: 0.9rem;">${doctorUsername}</div>
                        <div style="font-size: 0.8rem; color: #999;">${new Date(prescription.date).toLocaleDateString('zh-CN')}</div>
                    </div>
                </div>
                <div style="color: #333; font-size: 0.9rem; line-height: 1.6;">${prescription.content}</div>
            </div>
        </div>
    `).join('');
}

export function showDoctorProfile() {
    const doctorUsername = window.currentSelectedDoctor;
    if (!doctorUsername) {
        showNotification('请先选择一位医生');
        return;
    }
    
    showNotification(`医生姓名: ${doctorUsername} - 主治医生 - 在线`);
}

export function sendMessage(msgType, msgData, fileName, fileMimetype, fileSize) {
    var chatInput = document.getElementById('chatInput');
    var messageContent;
    var type = msgType || 'text';

    if (type === 'text') {
        messageContent = chatInput.value.trim();
        if (!messageContent) return;
    } else if (type === 'image') {
        messageContent = msgData;
    } else if (type === 'voice') {
        messageContent = msgData;
    } else if (type === 'file') {
        messageContent = msgData;
    } else {
        messageContent = msgData || '';
    }
    
    var doctorUsername = window.currentSelectedDoctor;
    if (!doctorUsername) {
        showNotification('请先选择一位医生');
        return;
    }
    
    var message = {
        id: Date.now(),
        sender: currentUser.username,
        recipient: doctorUsername,
        content: messageContent,
        type: type,
        fileName: fileName || '',
        fileMimetype: fileMimetype || '',
        fileSize: fileSize || 0,
        timestamp: new Date().toISOString(),
        read: false,
        replyTo: window.replyingToMessage || null
    };
    
    window.replyingToMessage = null;
    var replyEl = document.getElementById('replyIndicator');
    if (replyEl) replyEl.remove();
    
    var chatKey = 'metascanChat_' + currentUser.username + '_' + doctorUsername;
    var chatMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    chatMessages.push(message);
    localStorage.setItem(chatKey, JSON.stringify(chatMessages));
    
    var doctorChatKey = 'metascanChat_' + doctorUsername + '_' + currentUser.username;
    var doctorChatMessages = JSON.parse(localStorage.getItem(doctorChatKey) || '[]');
    doctorChatMessages.push(message);
    localStorage.setItem(doctorChatKey, JSON.stringify(doctorChatMessages));
    
    var generalChatKey = 'metascanChat_' + currentUser.username;
    var generalChatMessages = JSON.parse(localStorage.getItem(generalChatKey) || '[]');
    generalChatMessages.push(message);
    localStorage.setItem(generalChatKey, JSON.stringify(generalChatMessages));
    
    send({ type: 'message', message: message });
    
    sendDoctorNotification(currentUser.username, type === 'text' ? messageContent : (type === 'image' ? '[图片]' : type === 'voice' ? '[语音]' : type === 'file' ? '[文件]' : messageContent), doctorUsername);
    
    if (chatInput) chatInput.value = '';
    
    loadChatMessagesWithDoctor(doctorUsername);
    
    var typeLabels = { text: '消息', image: '图片', voice: '语音', file: '文件' };
    showNotification((typeLabels[type] || '消息') + '发送成功');
}

export function deleteMessage(messageId) {
    if (!confirm('确定要撤回这条消息吗？')) return;
    wsRecallMessage(messageId);
}

export function replyToMessage(messageId, sender, content) {
    window.replyingToMessage = { id: messageId, sender, content };
    
    const chatInput = document.getElementById('chatInput');
    let replyIndicator = document.getElementById('replyIndicator');
    
    if (!replyIndicator) {
        replyIndicator = document.createElement('div');
        replyIndicator.id = 'replyIndicator';
        replyIndicator.style.cssText = 'background: #f0f4ff; border-left: 3px solid #26d0ce; padding: 8px 12px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        chatInput.parentNode.insertBefore(replyIndicator, chatInput);
    }
    
    replyIndicator.innerHTML = `
        <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2px;">回复 ${sender}</div>
            <div style="font-size: 0.9rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${content}</div>
        </div>
        <button onclick="cancelReply()" style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.2rem; padding: 0 5px;">×</button>
    `;
    
    chatInput.focus();
}

function cancelReply() {
    window.replyingToMessage = null;
    const replyIndicator = document.getElementById('replyIndicator');
    if (replyIndicator) {
        replyIndicator.remove();
    }
}

export function showMessageMenu(event, messageId, sender, content) {
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
        <div onclick="replyToMessage(${messageId}, '${escapeAttr(sender)}', '${escapeAttr(content)}'); document.getElementById('messageContextMenu').remove();" 
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
            <div onclick="deleteMessage(${messageId}); document.getElementById('messageContextMenu').remove();" 
                 style="padding: 10px 16px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; display: flex; align-items: center; gap: 8px; color: #e74c3c;"
                 onmouseover="this.style.background='#f5f7fa'" 
                 onmouseout="this.style.background='white'">
                🗑️ ${isRecalled(messageId) ? '删除' : '撤回'}
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

function isRecalled(messageId) {
    var doctorUsername = window.currentSelectedDoctor;
    if (!doctorUsername) return false;
    var chatKey = 'metascanChat_' + currentUser.username + '_' + doctorUsername;
    var chatMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    var message = chatMessages.find(function(msg) { return msg.id === messageId; });
    return message && message.isRecalled;
}

function sendDoctorNotification(patientUsername, messageContent, specificDoctorUsername) {
    if (specificDoctorUsername) {
        const doctorNotifications = JSON.parse(localStorage.getItem(`metascanNotifications_${specificDoctorUsername}`)) || [];
        
        doctorNotifications.push({
            id: Date.now(),
            type: 'consultation',
            title: '患者咨询',
            message: `患者 ${patientUsername} 向您发起了咨询：${messageContent.length > 30 ? messageContent.substring(0, 30) + '...' : messageContent}`,
            patientUsername: patientUsername,
            date: new Date().toISOString(),
            read: false
        });
        
        localStorage.setItem(`metascanNotifications_${specificDoctorUsername}`, JSON.stringify(doctorNotifications));
    } else {
        const allUsers = JSON.parse(localStorage.getItem('metascanUsers')) || {};
        
        for (const [username, userData] of Object.entries(allUsers)) {
            if (userData.role === 'doctor') {
                const doctorNotifications = JSON.parse(localStorage.getItem(`metascanNotifications_${username}`)) || [];
                
                doctorNotifications.push({
                    id: Date.now(),
                    type: 'consultation',
                    title: '患者咨询',
                    message: `患者 ${patientUsername} 发起了咨询：${messageContent.length > 30 ? messageContent.substring(0, 30) + '...' : messageContent}`,
                    patientUsername: patientUsername,
                    date: new Date().toISOString(),
                    read: false
                });
                
                localStorage.setItem(`metascanNotifications_${username}`, JSON.stringify(doctorNotifications));
            }
        }
    }
}

function clearChatHistory() {
    const patientUsername = window.currentSelectedPatient;
    if (!patientUsername) {
        showNotification('请先选择一个患者');
        return;
    }
    
    if (confirm(`确定要清空与患者${patientUsername}的聊天记录吗？此操作不可恢复！`)) {
        localStorage.removeItem(`metascanChat_${patientUsername}`);
        
        showPatientDetails(patientUsername);
        
        showNotification('聊天记录已清空');
    }
}

export function startChatPolling() {
    stopChatPolling();
    if (typeof currentUser === 'undefined' || !currentUser) return;
    
    lastMessageCounts = {};

    chatPollingInterval = setInterval(function() {
        checkNewMessages();
    }, 2000);
}

export function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

export function checkNewMessages() {
    if (typeof currentUser === 'undefined' || !currentUser) return;
    
    var username = currentUser.username;
    var role = currentUser.role;

    if (role === 'patient') {
        checkPatientNewMessages(username);
    } else if (role === 'doctor') {
        checkDoctorNewMessages(username);
    }
}

export function checkPatientNewMessages(username) {
    var selectedDoctor = document.getElementById('chatDoctorTitle');
    if (!selectedDoctor) return;
    var doctorName = selectedDoctor.textContent.replace('与  医生对话', '').trim();
    if (!doctorName || doctorName === '选择医生') return;

    var storageKey = 'metascanChat_' + username + '_' + doctorName;
    var messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    var lastCount = lastMessageCounts[storageKey] || 0;

    if (messages.length > lastCount) {
        var newMessages = messages.slice(lastCount);
        newMessages.forEach(function(msg) {
            if (msg.sender !== username) {
                playMessageSound();
                showNotification(msg.sender + '发来新消息');
            }
        });
        lastMessageCounts[storageKey] = messages.length;
        loadChatMessagesWithDoctor(doctorName);
        updateUnreadBadges();
    }
}

export function checkDoctorNewMessages(username) {
    var patients = JSON.parse(localStorage.getItem('metascanUsers') || '{}');
    var totalNew = 0;
    
    Object.keys(patients).forEach(function(patientUsername) {
        if (patients[patientUsername].role === 'patient') {
            var storageKey = 'metascanChat_' + patientUsername;
            var messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            var lastCount = lastMessageCounts[storageKey] || 0;
            
            if (messages.length > lastCount) {
                var newMsgs = messages.slice(lastCount);
                var hasNewFromPatient = newMsgs.some(function(m) { return m.sender === patientUsername && !m.read; });
                if (hasNewFromPatient) {
                    playMessageSound();
                }
                totalNew += newMsgs.filter(function(m) { return m.sender === patientUsername && !m.read; }).length;
            }
            lastMessageCounts[storageKey] = messages.length;
        }
    });

    if (totalNew > 0 && document.getElementById('doctorUnreadBadge')) {
        var badge = document.getElementById('doctorUnreadBadge');
        badge.textContent = totalNew;
        badge.style.display = 'flex';
    }

    var currentPatient = window.currentSelectedPatient;
    if (currentPatient) {
        loadDoctorChatMessages(currentPatient, document.getElementById('doctorChatMessages'));
    }
}

export function updateUnreadBadges() {
    if (typeof currentUser === 'undefined' || !currentUser || currentUser.role !== 'patient') return;

    var doctors = JSON.parse(localStorage.getItem('metascanUsers') || '{}');
    var totalUnread = 0;

    Object.keys(doctors).forEach(function(doctorUsername) {
        if (doctors[doctorUsername].role === 'doctor') {
            var storageKey = 'metascanChat_' + currentUser.username + '_' + doctorUsername;
            var messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            totalUnread += messages.filter(function(m) { return m.sender !== currentUser.username && !m.read; }).length;
        }
    });

    var badge = document.getElementById('doctorUnreadBadge');
    if (badge) {
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

export function playMessageSound() {
    var audio = document.getElementById('messageNotificationSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(function() {});
    }
}

export function uploadImage(role) {
    var inputId = role === 'doctor' ? 'doctorImageInput' : 'patientImageInput';
    var fileInput = document.getElementById(inputId);
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;

    var file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) {
        showNotification('图片大小不能超过10MB');
        fileInput.value = '';
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        var imageData = e.target.result;
        if (role === 'doctor') {
            sendDoctorMessage('image', imageData, file.name);
        } else {
            sendMessage('image', imageData, file.name);
        }
        fileInput.value = '';
    };
    reader.onerror = function() {
        showNotification('图片读取失败，请重试');
        fileInput.value = '';
    };
    reader.readAsDataURL(file);
    showNotification('📷 图片处理中...');
}

export function startVoiceRecording(role) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('您的浏览器不支持录音功能');
        return;
    }

    currentRecordingRole = role;
    var indicator = document.getElementById('recordingIndicator');
    if (indicator) indicator.style.display = 'flex';

    var voiceBtn = document.getElementById(role === 'doctor' ? 'doctorVoiceBtn' : 'patientVoiceBtn');
    if (voiceBtn) {
        voiceBtn.style.background = '#ef4444';
        voiceBtn.style.color = 'white';
        voiceBtn.style.borderColor = '#ef4444';
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = function() {
            var audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            var reader = new FileReader();
            reader.onload = function(e) {
                var audioData = e.target.result;
                if (currentRecordingRole === 'doctor') {
                    sendDoctorMessage('voice', audioData);
                } else if (currentRecordingRole === 'patient') {
                    sendMessage('voice', audioData);
                }
            };
            reader.onerror = function() {
                showNotification('语音处理失败，请重试');
            };
            reader.readAsDataURL(audioBlob);

            stream.getTracks().forEach(function(track) { track.stop(); });
            mediaRecorder = null;

            var indicator2 = document.getElementById('recordingIndicator');
            if (indicator2) indicator2.style.display = 'none';

            var voiceBtn2 = document.getElementById(role === 'doctor' ? 'doctorVoiceBtn' : 'patientVoiceBtn');
            if (voiceBtn2) {
                voiceBtn2.style.background = 'white';
                voiceBtn2.style.color = '';
                voiceBtn2.style.borderColor = '#e0e6ed';
            }
        };

        mediaRecorder.start();

        recordingTimeout = setTimeout(function() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                showNotification('录音已达最长时长(60秒)，已自动发送');
            }
        }, 60000);
    }).catch(function() {
        showNotification('无法访问麦克风，请检查权限设置');
        var indicator3 = document.getElementById('recordingIndicator');
        if (indicator3) indicator3.style.display = 'none';
    });
}

export function stopVoiceRecording(role) {
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

export function openPrescriptionInput() {
    var patientUsername = window.currentSelectedPatient;
    if (!patientUsername) {
        showNotification('请先选择一个患者');
        return;
    }
    var modal = document.getElementById('prescriptionInputModal');
    if (modal) modal.style.display = 'flex';
}

export function closePrescriptionInput() {
    var modal = document.getElementById('prescriptionInputModal');
    if (modal) modal.style.display = 'none';
    var titleEl = document.getElementById('prescriptionTitle');
    var contentEl = document.getElementById('prescriptionContent');
    var medEl = document.getElementById('prescriptionMedication');
    if (titleEl) titleEl.value = '';
    if (contentEl) contentEl.value = '';
    if (medEl) medEl.value = '';
}

export function sendPrescriptionAsCard() {
    var titleEl = document.getElementById('prescriptionTitle');
    var contentEl = document.getElementById('prescriptionContent');
    var medEl = document.getElementById('prescriptionMedication');

    if (!titleEl || !contentEl) {
        showNotification('表单加载失败，请刷新页面');
        return;
    }

    var title = titleEl.value.trim();
    var content = contentEl.value.trim();
    var medication = medEl ? medEl.value.trim() : '';
    
    if (!title || !content) {
        showNotification('请填写医嘱标题和内容');
        return;
    }
    
    var patientUsername = window.currentSelectedPatient;
    if (!patientUsername) {
        showNotification('请先选择一个患者');
        return;
    }
    
    var prescriptionData = {
        title: title,
        content: content,
        medication: medication,
        confirmed: false,
        confirmedAt: null
    };
    
    sendDoctorMessage('prescription', JSON.stringify(prescriptionData));
    
    var prescriptions = JSON.parse(localStorage.getItem('metascanPrescriptions_' + patientUsername) || '[]');
    prescriptions.push({
        id: Date.now(),
        title: title,
        content: content,
        medication: medication,
        doctorName: currentUser.doctorName || currentUser.username,
        doctorUsername: currentUser.username,
        patientUsername: patientUsername,
        date: new Date().toISOString(),
        confirmed: false
    });
    localStorage.setItem('metascanPrescriptions_' + patientUsername, JSON.stringify(prescriptions));
    
    closePrescriptionInput();
    showNotification('📋 医嘱卡片已发送');
}

export function confirmPrescriptionFromChat(prescriptionId) {
    if (!confirm('确认已阅读并理解此医嘱内容？')) return;
    
    const patientUsername = window.currentSelectedPatient || currentUser.username;
    const prescriptions = JSON.parse(localStorage.getItem('metascanPrescriptions_' + patientUsername) || '[]');
    const presc = prescriptions.find(function(p) { return p.id === prescriptionId; });
    if (presc) {
        presc.confirmed = true;
        presc.confirmedAt = new Date().toISOString();
        localStorage.setItem('metascanPrescriptions_' + patientUsername, JSON.stringify(prescriptions));
    }
    
    showNotification('✅ 医嘱已确认');
    
    const chatMsgs = document.getElementById('chatMessages');
    if (chatMsgs && window.currentDoctorUsername) {
        loadChatMessagesWithDoctor(window.currentDoctorUsername);
    }
}

export function playVoiceMessage(btn) {
    const audioData = btn.getAttribute('data-audio');
    if (!audioData) return;

    const audio = new Audio(audioData);
    const progressBar = btn.parentElement.querySelector('.voice-progress-bar');

    audio.onplay = function() {
        btn.innerHTML = '⏸';
        if (progressBar) progressBar.style.width = '0%';
    };
    audio.onended = function() {
        btn.innerHTML = '▶';
        if (progressBar) progressBar.style.width = '100%';
    };
    audio.ontimeupdate = function() {
        if (progressBar && audio.duration) {
            progressBar.style.width = (audio.currentTime / audio.duration * 100) + '%';
        }
    };

    audio.play().catch(function() {
        showNotification('无法播放语音消息');
    });
}

export function initChatSystem() {
    startChatPolling();
    updateUnreadBadges();
    setupWebSocket();
    setupTypingIndicator();
}

export function sendDoctorMessage(msgType, msgData, fileName, fileMimetype, fileSize) {
    const chatInput = document.getElementById('doctorChatInput');
    let messageContent;
    let type = msgType || 'text';

    if (type === 'text') {
        messageContent = chatInput ? chatInput.value.trim() : (msgData || '');
        if (!messageContent) return;
    } else if (type === 'image') {
        messageContent = msgData;
    } else if (type === 'voice') {
        messageContent = msgData;
    } else if (type === 'prescription') {
        messageContent = msgData;
    } else if (type === 'file') {
        messageContent = msgData;
    } else {
        messageContent = msgData || '';
    }
    
    const patientUsername = window.currentSelectedPatient;
    if (!patientUsername) {
        showNotification('请先选择一个患者');
        return;
    }
    
    const message = {
        id: Date.now(),
        sender: currentUser.username,
        recipient: patientUsername,
        content: messageContent,
        type: type,
        fileName: fileName || '',
        fileMimetype: fileMimetype || '',
        fileSize: fileSize || 0,
        timestamp: new Date().toISOString(),
        read: false,
        replyTo: window.replyingToMessage || null
    };
    
    window.replyingToMessage = null;
    const replyIndicator = document.getElementById('doctorReplyIndicator');
    if (replyIndicator) replyIndicator.remove();
    
    const chatMessages = JSON.parse(localStorage.getItem('metascanChat_' + patientUsername) || '[]');
    chatMessages.push(message);
    localStorage.setItem('metascanChat_' + patientUsername, JSON.stringify(chatMessages));
    
    var generalDoctorChatKey = 'metascanChat_' + currentUser.username;
    var generalDoctorChatMessages = JSON.parse(localStorage.getItem(generalDoctorChatKey) || '[]');
    generalDoctorChatMessages.push(message);
    localStorage.setItem(generalDoctorChatKey, JSON.stringify(generalDoctorChatMessages));
    
    send({ type: 'message', message: message });
    
    if (chatInput) chatInput.value = '';
    
    if (typeof showPatientDetails === 'function') {
        showPatientDetails(patientUsername);
    }
    
    const typeLabels = { text: '消息', image: '图片', voice: '语音', prescription: '医嘱卡片', file: '文件' };
    showNotification((typeLabels[type] || '消息') + '发送成功');
}

export function sendFileMessage() {
    openFilePicker(function(file) {
        if (file.size > 50 * 1024 * 1024) {
            showNotification('文件大小不能超过50MB');
            return;
        }

        var progressContainer = document.createElement('div');
        progressContainer.style.cssText = 'background: #f0f4ff; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px;';
        progressContainer.innerHTML = '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;"><span style="font-size: 0.9rem;">📎</span><span style="font-size: 0.85rem; color: #333;" id="uploadFileName">' + escapeHTML(file.name) + '</span></div><div style="height: 4px; background: #e0e6ed; border-radius: 2px; overflow: hidden;"><div id="uploadProgressBar" style="height: 100%; width: 0%; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 2px; transition: width 0.3s ease;"></div></div><div style="font-size: 0.7rem; color: #999; margin-top: 4px;" id="uploadStatus">上传中...</div>';
        
        var chatInput = document.getElementById('chatInput');
        chatInput.parentNode.insertBefore(progressContainer, chatInput);

        var xhr = uploadFile(file,
            function(percent) {
                var bar = document.getElementById('uploadProgressBar');
                if (bar) bar.style.width = percent + '%';
            },
            function(result) {
                progressContainer.remove();
                var fileUrl = window.location.origin + ':' + (window.location.port === '3001' ? '3001' : '3001') + result.path;
                sendMessage('file', fileUrl, file.name, file.type, file.size);
            },
            function(error) {
                progressContainer.remove();
                showNotification('文件上传失败: ' + error);
            }
        );
    }, '*');
}

export function sendDoctorFileMessage() {
    openFilePicker(function(file) {
        if (file.size > 50 * 1024 * 1024) {
            showNotification('文件大小不能超过50MB');
            return;
        }

        uploadFile(file,
            null,
            function(result) {
                var fileUrl = window.location.origin + ':' + (window.location.port === '3001' ? '3001' : '3001') + result.path;
                sendDoctorMessage('file', fileUrl, file.name, file.type, file.size);
            },
            function(error) {
                showNotification('文件上传失败: ' + error);
            }
        );
    }, '*');
}

export function setupWebSocket() {
    if (typeof currentUser === 'undefined' || !currentUser) return;

    connect(currentUser.username, currentUser.token);

    on('connected', function() {
        var status = getConnectionStatus();
        if (status.connected) {
            fetchMessagesFromServer();
        }
    });

    on('message', function(data) {
        if (data.echo) return;
        var msg = data.message;
        if (!msg || !msg.recipient) return;

        if (currentUser.role === 'patient' && msg.sender === window.currentSelectedDoctor) {
            loadChatMessagesWithDoctor(window.currentSelectedDoctor);
            updateUnreadBadges();
            playMessageSound();
            showNotification(msg.sender + '发来新消息');
        } else if (currentUser.role === 'patient' && msg.recipient === currentUser.username) {
            updateUnreadBadges();
        } else if (currentUser.role === 'doctor') {
            var currentPatient = window.currentSelectedPatient;
            if (currentPatient && (msg.sender === currentPatient || msg.recipient === currentPatient)) {
                var container = document.getElementById('doctorChatMessages');
                if (container && typeof loadDoctorChatMessages === 'function') {
                    loadDoctorChatMessages(currentPatient, container);
                }
            }
        }
    });

    on('typing', function(data) {
        if (currentUser.role === 'patient' && data.from && data.from === window.currentSelectedDoctor) {
            if (data.isTyping) {
                showTypingIndicator(data.from);
            } else {
                hideTypingIndicator();
            }
        } else if (currentUser.role === 'doctor' && data.from && data.from === window.currentSelectedPatient) {
            if (data.isTyping) {
                showDoctorTypingIndicator(data.from);
            } else {
                hideDoctorTypingIndicator();
            }
        }
    });

    on('recall', function(data) {
        if (currentUser.role === 'patient' && window.currentSelectedDoctor) {
            loadChatMessagesWithDoctor(window.currentSelectedDoctor);
        } else if (currentUser.role === 'doctor' && window.currentSelectedPatient) {
            var container = document.getElementById('doctorChatMessages');
            if (container && typeof loadDoctorChatMessages === 'function') {
                loadDoctorChatMessages(window.currentSelectedPatient, container);
            }
        }
    });

    on('read', function(data) {
        if (currentUser.role === 'patient' && window.currentSelectedDoctor) {
            loadChatMessagesWithDoctor(window.currentSelectedDoctor);
        }
    });
}

function fetchMessagesFromServer() {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_BASE + '/messages/' + currentUser.username, true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var serverMessages = JSON.parse(xhr.responseText);
                    if (Array.isArray(serverMessages) && serverMessages.length > 0) {
                        syncMessagesFromServer(serverMessages);
                    }
                } catch (e) {}
            }
        };
        xhr.send();
    } catch (e) {}
}

function syncMessagesFromServer(serverMessages) {
    if (currentUser.role === 'patient') {
        var doctors = JSON.parse(localStorage.getItem('metascanUsers') || '{}');
        serverMessages.forEach(function(msg) {
            if (msg.recipient === currentUser.username || msg.sender === currentUser.username) {
                var otherUser = msg.sender === currentUser.username ? msg.recipient : msg.sender;
                var chatKey = 'metascanChat_' + currentUser.username + '_' + otherUser;
                var localMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
                var exists = localMessages.some(function(m) { return m.id === msg.id; });
                if (!exists) {
                    localMessages.push(msg);
                }
                localStorage.setItem(chatKey, JSON.stringify(localMessages));
            }
        });
    } else if (currentUser.role === 'doctor') {
        serverMessages.forEach(function(msg) {
            var patientUser = msg.sender === currentUser.username ? msg.recipient : msg.sender;
            if (patientUser && patientUser !== currentUser.username) {
                var chatKey = 'metascanChat_' + patientUser;
                var localMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
                var exists = localMessages.some(function(m) { return m.id === msg.id; });
                if (!exists) {
                    localMessages.push(msg);
                }
                localStorage.setItem(chatKey, JSON.stringify(localMessages));
            }
        });
    }

    if (currentUser.role === 'patient' && window.currentSelectedDoctor) {
        loadChatMessagesWithDoctor(window.currentSelectedDoctor);
    }
}

export function setupTypingIndicator() {
    var chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    var typingTimeout = null;

    chatInput.addEventListener('input', function() {
        var doctorUsername = window.currentSelectedDoctor;
        if (!doctorUsername) return;

        sendTyping(doctorUsername, true);

        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() {
            sendTyping(doctorUsername, false);
        }, 3000);
    });

    chatInput.addEventListener('blur', function() {
        var doctorUsername = window.currentSelectedDoctor;
        if (doctorUsername) {
            sendTyping(doctorUsername, false);
        }
    });
}

export function showTypingIndicator(fromName) {
    var indicator = document.getElementById('typingIndicator');
    var text = document.getElementById('typingText');
    if (indicator && text) {
        text.textContent = (fromName || '对方') + ' 正在输入';
        indicator.style.display = 'block';
    }
}

export function hideTypingIndicator() {
    var indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

export function showDoctorTypingIndicator(fromName) {
    var indicator = document.getElementById('doctorTypingIndicator');
    var text = document.getElementById('doctorTypingText');
    if (indicator && text) {
        text.textContent = (fromName || '患者') + ' 正在输入';
        indicator.style.display = 'block';
    }
}

export function hideDoctorTypingIndicator() {
    var indicator = document.getElementById('doctorTypingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

export function wsRecallMessage(messageId) {
    var doctorUsername = window.currentSelectedDoctor;
    if (!doctorUsername) return;

    send({ type: 'recall', messageId: messageId });

    var chatKey = 'metascanChat_' + currentUser.username + '_' + doctorUsername;
    var chatMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    var found = false;
    chatMessages = chatMessages.map(function(msg) {
        if (msg.id === messageId && msg.sender === currentUser.username) {
            var msgTime = new Date(msg.timestamp).getTime();
            if (Date.now() - msgTime <= 5 * 60 * 1000) {
                msg.isRecalled = true;
                msg.content = '消息已撤回';
                found = true;
            }
        }
        return msg;
    });
    if (found) {
        localStorage.setItem(chatKey, JSON.stringify(chatMessages));
        var doctorChatKey = 'metascanChat_' + doctorUsername + '_' + currentUser.username;
        var doctorChatMessages = JSON.parse(localStorage.getItem(doctorChatKey) || '[]');
        doctorChatMessages = doctorChatMessages.map(function(msg) {
            if (msg.id === messageId) { msg.isRecalled = true; msg.content = '消息已撤回'; }
            return msg;
        });
        localStorage.setItem(doctorChatKey, JSON.stringify(doctorChatMessages));
        loadChatMessagesWithDoctor(doctorUsername);
        showNotification('消息已撤回');
    } else {
        showNotification('撤回失败，消息不存在或已超过5分钟');
    }
}

export function addNote() {
    if (!currentUser) return;

    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!title || !content) {
        showNotification('请填写便签标题和内容');
        return;
    }

    const notes = JSON.parse(localStorage.getItem(`metascanNotes_${currentUser.username}`)) || [];
    const newNote = {
        id: Date.now(),
        title: title,
        content: content,
        createdAt: new Date().toISOString()
    };

    notes.push(newNote);
    localStorage.setItem(`metascanNotes_${currentUser.username}`, JSON.stringify(notes));

    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';

    loadNotes();

    showNotification('便签添加成功');
}

export function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('文件格式错误', '请选择图片文件');
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('文件过大', '图片大小不能超过20MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const capturedImg = document.getElementById('capturedImage');
        const placeholder = document.getElementById('cameraPlaceholder');
        const video = document.getElementById('cameraVideo');

        capturedImg.src = e.target.result;
        capturedImg.style.display = 'block';
        placeholder.style.display = 'none';

        if (video) video.style.display = 'none';

        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            cameraStream = null;
        }

        document.getElementById('btnOpenCamera').textContent = '📷 开启摄像头';
        document.getElementById('btnCapture').style.display = 'none';

        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('图片已加载', '正在启动文字识别引擎...');

        setTimeout(() => processOCR(e.target.result), 500);
    };
    reader.onerror = function() {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('读取失败', '图片文件读取失败，请重试');
    };
    reader.readAsDataURL(file);
}

export function wsRecallDoctorMessage(messageId) {
    var patientUsername = window.currentSelectedPatient;
    if (!patientUsername) return;

    send({ type: 'recall', messageId: messageId });

    var chatMessages = JSON.parse(localStorage.getItem('metascanChat_' + patientUsername) || '[]');
    var found = false;
    chatMessages = chatMessages.map(function(msg) {
        if (msg.id === messageId && msg.sender === currentUser.username) {
            var msgTime = new Date(msg.timestamp).getTime();
            if (Date.now() - msgTime <= 5 * 60 * 1000) {
                msg.isRecalled = true;
                msg.content = '消息已撤回';
                found = true;
            }
        }
        return msg;
    });
    if (found) {
        localStorage.setItem('metascanChat_' + patientUsername, JSON.stringify(chatMessages));
        var container = document.getElementById('doctorChatMessages');
        if (container && typeof loadDoctorChatMessages === 'function') {
            loadDoctorChatMessages(patientUsername, container);
        }
        showNotification('消息已撤回');
    } else {
        showNotification('撤回失败，消息不存在或已超过5分钟');
    }
}