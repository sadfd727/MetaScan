import { currentUser, users } from './auth.js';
import { getTasks } from './storage.js';

export function showNotification(message, type = 'success') {
    if (typeof FeedbackSystem !== 'undefined' && FeedbackSystem.initialized) {
        FeedbackSystem[type] ? FeedbackSystem[type](message) : FeedbackSystem.success(message);
    } else {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'};
            color: ${type === 'warning' ? '#333' : 'white'};
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

export function toggleNotifications(event) {
    if (event) {
        event.stopPropagation();
    }
    const panel = document.getElementById('notificationPanel');
    if (panel.style.display === 'block' || panel.style.display === '') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        loadNotifications();
    }
}

function getPendingPatientsCount() {
    if (!currentUser || currentUser.role !== 'doctor') return 0;

    const patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let pendingCount = 0;
    patients.forEach(patient => {
        const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patient.username}`)) || [];
        const hasNewMessageToday = chatMessages.some(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= todayStart && msg.sender === patient.username;
        });

        const hasTestDataToday = patient.lastTestDate && new Date(patient.lastTestDate) >= todayStart;

        if (hasNewMessageToday || hasTestDataToday) {
            pendingCount++;
        }
    });

    return pendingCount;
}

export function loadNotifications() {
    if (!currentUser) return;

    const notificationList = document.getElementById('notificationList');
    let notifications = JSON.parse(localStorage.getItem(`metascanNotifications_${currentUser.username}`)) || [];

    if (currentUser.role === 'doctor') {
        const pendingCount = getPendingPatientsCount();

        notifications.unshift({
            id: 'pending-patients',
            type: 'pending',
            title: '今日待诊',
            message: `今日有 ${pendingCount} 位患者需要您的关注`,
            date: new Date().toISOString(),
            read: false,
            isSystem: true
        });

        const reportRequests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
        const pendingRequests = reportRequests.filter(req => req.status === 'pending');

        pendingRequests.forEach(req => {
            notifications.unshift({
                id: `report-request-${req.id}`,
                type: 'reportRequest',
                title: '📊 报告查看申请',
                message: `患者 ${req.patientUsername} 申请查看健康报告`,
                patientUsername: req.patientUsername,
                date: req.requestDate,
                read: false,
                isSystem: false
            });
        });
    }

    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">🔔</div>
                <div style="color: #666; font-size: 1rem;">暂无通知</div>
            </div>
        `;
    } else {
        let html = '';
        notifications.forEach((notification, index) => {
            const date = new Date(notification.date);
            const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

            let icon = '📋';
            let bgColor = '#f8f9fa';
            let borderColor = '#e0e6ed';

            if (notification.type === 'consultation') {
                icon = '💬';
                bgColor = '#fff3e0';
                borderColor = '#ffcc80';
            } else if (notification.type === 'pending') {
                icon = '👥';
                bgColor = '#e3f2fd';
                borderColor = '#90caf9';
            } else if (notification.type === 'reportRequest') {
                icon = '📊';
                bgColor = '#f3e5f5';
                borderColor = '#ce93d8';
            }

            html += `
                <div style="padding: 15px; border-bottom: 1px solid #f0f0f0; background: ${notification.read ? '#ffffff' : bgColor}; border-left: 4px solid ${notification.read ? '#e0e6ed' : borderColor}; transition: all 0.3s ease; animation: fadeInUp 0.4s ease; animation-delay: ${index * 0.05}s;"
                     onmouseover="this.style.background='#f5f7fa'"
                     onmouseout="this.style.background='${notification.read ? '#ffffff' : bgColor}'">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="font-size: 1.8rem; flex-shrink: 0;">${icon}</div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <div style="font-weight: 700; color: #1a2980; font-size: 1rem;">${notification.title}</div>
                                ${!notification.read && !notification.isSystem ? '<span style="width: 8px; height: 8px; background: #e74c3c; border-radius: 50%;"></span>' : ''}
                            </div>
                            <div style="font-size: 0.9rem; color: #555; margin-bottom: 8px; line-height: 1.5;">${notification.message}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="font-size: 0.8rem; color: #999; display: flex; align-items: center; gap: 8px;">
                                    <span>📅 ${dateStr}</span>
                                    <span>⏰ ${timeStr}</span>
                                </div>
                                ${notification.patientUsername ? `
                                    <button onclick="goToPatientChat('${notification.patientUsername}')" 
                                            style="padding: 5px 12px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 15px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                                        查看详情
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        notificationList.innerHTML = html;
    }

    updateNotificationBadge();
}

function goToPatientChat(patientUsername) {
    document.getElementById('notificationPanel').style.display = 'none';

    showTab('doctorPatients');

    setTimeout(() => {
        const patientItem = document.querySelector(`.patient-item[data-username="${patientUsername}"]`);
        if (patientItem) {
            patientItem.click();
        }
    }, 100);
}

export function addNotification(title, message) {
    if (!currentUser) return;

    const notification = {
        title: title,
        message: message,
        date: new Date().toISOString(),
        read: false
    };

    const notifications = JSON.parse(localStorage.getItem(`metascanNotifications_${currentUser.username}`)) || [];
    notifications.push(notification);

    if (notifications.length > 20) {
        notifications.splice(0, notifications.length - 20);
    }

    localStorage.setItem(`metascanNotifications_${currentUser.username}`, JSON.stringify(notifications));
    updateNotificationBadge();
}

export function clearAllNotifications() {
    if (!currentUser) return;

    localStorage.removeItem(`metascanNotifications_${currentUser.username}`);
    document.getElementById('notificationList').innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">暂无通知</p>';
    updateNotificationBadge();
}

export function updateNotificationBadge() {
    if (!currentUser) return;

    const notifications = JSON.parse(localStorage.getItem(`metascanNotifications_${currentUser.username}`)) || [];
    const unreadCount = notifications.filter(n => !n.read).length;

    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
        if (unreadCount === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'flex';
        }
    }
}

function checkUncompletedTasks() {
    if (!currentUser) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = getTasks(currentUser.username);
    const todayTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime() && !task.completed;
    });

    if (todayTasks.length > 0) {
        addNotification('任务提醒', `您还有 ${todayTasks.length} 个任务未完成，请及时完成。`);
    }
}

export function checkForNewNotifications() {
    checkUncompletedTasks();

    if (!currentUser) return;

    if (currentUser.role === 'doctor') {
        const sharedPrescriptions = JSON.parse(localStorage.getItem(`metascanSharedPrescriptions_${currentUser.username}`)) || [];
        if (sharedPrescriptions.length > 0) {
            addNotification('新的共享医嘱', `您收到了 ${sharedPrescriptions.length} 条新的共享医嘱`);
            localStorage.removeItem(`metascanSharedPrescriptions_${currentUser.username}`);
        }

        const referrals = JSON.parse(localStorage.getItem(`metascanReferrals_${currentUser.username}`)) || [];
        if (referrals.length > 0) {
            addNotification('新的患者转诊', `您收到了 ${referrals.length} 位新转诊的患者`);
            localStorage.removeItem(`metascanReferrals_${currentUser.username}`);
        }

        let pendingPatients = 0;
        for (const [username, userData] of Object.entries(users)) {
            if (userData.role === 'patient') {
                const patientData = JSON.parse(localStorage.getItem(`metascanData_${username}`)) || [];
                const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${username}`)) || [];
                if (patientData.length > 0 && prescriptions.length < patientData.length) {
                    pendingPatients++;
                }
            }
        }

        if (pendingPatients > 0) {
            addNotification('待处理患者提醒', `您有 ${pendingPatients} 位患者的检测结果待诊断，请及时处理。`);
        }

        const newMessages = JSON.parse(localStorage.getItem(`metascanNewMessages_${currentUser.username}`)) || [];
        if (newMessages.length > 0) {
            addNotification('新的医患消息', `您收到了 ${newMessages.length} 条新的医患消息，请及时回复。`);
            localStorage.removeItem(`metascanNewMessages_${currentUser.username}`);
        }
    }
}

export function startNotificationCheck() {
    if (!window._notificationCheckInterval) {
        window._notificationCheckInterval = setInterval(checkForNewNotifications, 5 * 60 * 1000);
    }
}