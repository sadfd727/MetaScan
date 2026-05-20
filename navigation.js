import { currentUser, users, currentResult } from './auth.js';
import { showNotification } from './notifications.js';
import { loadPatientList } from './doctor.js';
import { showSkeleton } from './utils.js';
import {
  loadDoctorList,
  loadChatMessagesWithDoctor,
  loadPatientPrescriptions,
  loadReportAccessStatus,
  initChatSystem,
  stopChatPolling,
  updateUnreadBadges,
  loadChatMessages,
  loadPrescriptionsFromDoctor
} from './chat.js';
import { updateComparisonView } from './visualization.js';
import { renderReport } from './reports.js';

export function showTab(tabName) {
    let effectiveNames = [tabName];

    if (tabName === 'home') {
        effectiveNames = ['home'];
    } else if (tabName === 'data') {
        effectiveNames = ['data'];
    } else if (tabName === 'chat') {
        effectiveNames = ['chat'];
    } else if (tabName === 'reports') {
        effectiveNames = ['reports'];
    } else if (tabName === 'profile') {
        effectiveNames = ['profile'];
    }

    document.querySelectorAll('.tab-content').forEach(function(tab) {
        tab.style.display = 'none';
    });

    document.querySelectorAll('.nav-tab').forEach(function(btn) {
        btn.classList.remove('active');
    });

    const validIds = ['home', 'data', 'chat', 'reports', 'profile',
                    'metabolic', 'report', 'comparison', 'calendar', 'doctor',
                    'settings', 'about', 'doctorDashboard', 'doctorPatients'];
    if (document.getElementById(tabName)) {
        document.getElementById(tabName).style.display = 'block';
    }

    const newPatientIndex = ['home', 'data', 'chat', 'reports', 'profile'].indexOf(tabName);
    if (newPatientIndex >= 0) {
        const mainNav = document.querySelector('.main-nav');
        if (mainNav) {
            const mainBtns = mainNav.querySelectorAll('.nav-tab[data-nav]');
            mainBtns.forEach(function(btn, i) {
                if (btn.getAttribute('data-nav') === tabName) {
                    btn.classList.add('active');
                    btn.style.color = '#1a2980';
                    btn.style.borderBottomColor = '#26d0ce';
                } else {
                    btn.classList.remove('active');
                    btn.style.color = '#64748b';
                    btn.style.borderBottomColor = 'transparent';
                }
            });
        }
    }

    const doctorTabIndex = ['doctorDashboard', 'doctorPatients', 'profile'].indexOf(tabName);
    if (doctorTabIndex >= 0) {
        const doctorNav = document.querySelector('.doctor-nav');
        if (doctorNav) {
            const doctorBtns = doctorNav.querySelectorAll('.nav-tab[data-nav]');
            doctorBtns.forEach(function(btn) {
                if (btn.getAttribute('data-nav') === tabName) {
                    btn.classList.add('active');
                    btn.style.color = '#1a2980';
                    btn.style.borderBottomColor = '#26d0ce';
                } else {
                    btn.classList.remove('active');
                    btn.style.color = '#64748b';
                    btn.style.borderBottomColor = 'transparent';
                }
            });
        }
    }

    if (tabName === 'home') {
        loadHomeContent();
    } else if (tabName === 'data') {
        loadDataContent();
        switchDataSubTab('metabolic');
    } else if (tabName === 'chat') {
        loadChatContent();
    } else if (tabName === 'reports') {
        loadReportsContent();
    } else if (tabName === 'profile') {
        loadProfileContent();
    } else if (tabName === 'comparison') {
        updateComparisonView();
    } else if (tabName === 'settings') {
        loadUserSettings();
        loadNotes();
    } else if (tabName === 'doctor') {
        loadDoctorList();
        if (window.currentSelectedDoctor) {
            loadChatMessagesWithDoctor(window.currentSelectedDoctor);
            loadPrescriptionsFromDoctor(window.currentSelectedDoctor);
        }
        loadReportAccessStatus();
        initChatSystem();
    } else if (tabName === 'doctorPatients') {
        loadPatientList();
        initChatSystem();
    } else if (tabName === 'calendar') {
        addDefaultTasks();
        initCalendar();
    } else if (tabName === 'metabolic') {
        setTimeout(function() {
            var manualEl = document.getElementById('metabolicManualMode');
            if (!manualEl || manualEl.style.display === 'none') {
                switchMetabolicMode('camera');
            }
        }, 100);
    }

    if (tabName === 'chat' || tabName === 'doctor' || tabName === 'doctorPatients') {
        initChatSystem();
    } else {
        stopChatPolling();
    }
}

export function loadHomeContent() {
    const homeContent = document.getElementById('homeContent');
    if (!homeContent) return;
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        homeContent.innerHTML = calendarEl.innerHTML;
    }
    addDefaultTasks();
    initCalendar();
    initHealthAssistant();
    updateDisplays();
    updateUnreadBadges();
}

export function loadDataContent() {
    const dataContent = document.getElementById('dataContent');
    if (!dataContent) return;
    const metabolicEl = document.getElementById('metabolic');
    if (metabolicEl) {
        dataContent.innerHTML = '<div id="dataMetabolicArea">' + metabolicEl.innerHTML + '</div><div id="dataComparisonArea" style="display:none;"></div>';
    }
    setTimeout(function() {
        if (typeof window.checkDraft === 'function') window.checkDraft();
        if (typeof window.switchMetabolicMode === 'function') {
            var manualEl = document.getElementById('metabolicManualMode');
            if (!manualEl || manualEl.style.display === 'none') {
                window.switchMetabolicMode('camera');
            }
        }
    }, 100);
}

export function switchDataSubTab(subTab) {
    const btnMetabolic = document.getElementById('dataTabMetabolic');
    const btnHistory = document.getElementById('dataTabHistory');
    const metabolicArea = document.getElementById('dataMetabolicArea');
    const comparisonArea = document.getElementById('dataComparisonArea');

    if (subTab === 'metabolic') {
        if (btnMetabolic) { btnMetabolic.style.color = '#1a2980'; btnMetabolic.style.borderBottomColor = '#26d0ce'; }
        if (btnHistory) { btnHistory.style.color = '#64748b'; btnHistory.style.borderBottomColor = 'transparent'; }
        if (metabolicArea) metabolicArea.style.display = '';
        if (comparisonArea) comparisonArea.style.display = 'none';
        setTimeout(function() {
            var manualEl = document.getElementById('metabolicManualMode');
            if (!manualEl || manualEl.style.display === 'none') {
                switchMetabolicMode('camera');
            }
        }, 100);
    } else if (subTab === 'history') {
        if (btnMetabolic) { btnMetabolic.style.color = '#64748b'; btnMetabolic.style.borderBottomColor = 'transparent'; }
        if (btnHistory) { btnHistory.style.color = '#1a2980'; btnHistory.style.borderBottomColor = '#26d0ce'; }
        if (metabolicArea) metabolicArea.style.display = 'none';
        if (comparisonArea) {
            comparisonArea.style.display = '';
            const comparisonEl = document.getElementById('comparison');
            if (comparisonEl) {
                comparisonArea.innerHTML = comparisonEl.innerHTML;
            }
            updateComparisonView();
        }
    }
}

export function loadChatContent() {
    const chatContent = document.getElementById('chatContent');
    if (!chatContent) return;
    const doctorEl = document.getElementById('doctor');
    if (doctorEl) {
        chatContent.innerHTML = doctorEl.innerHTML;
    }
    loadDoctorList();
    loadPatientPrescriptions();
    loadChatMessages();
    loadReportAccessStatus();
    initChatSystem();
}

export function loadReportsContent() {
    const reportsContent = document.getElementById('reportsContent');
    if (!reportsContent) return;

    const hideSkeleton = showSkeleton('reportsContent');

    if (currentResult && currentResult.overallRisk !== undefined) {
        renderReport(currentResult, 'reportsContent');
    } else {
        const reportEl = document.getElementById('report');
        if (reportEl) {
            reportsContent.innerHTML = reportEl.innerHTML;
        }
    }

    setTimeout(function() {
        hideSkeleton();
    }, 400);
}

export function loadProfileContent() {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;

    const settingsEl = document.getElementById('settings');
    const settingsHTML = settingsEl ? settingsEl.innerHTML : '';
    const aboutEl = document.getElementById('about');
    const aboutHTML = aboutEl ? aboutEl.innerHTML : '';

    profileContent.innerHTML = 
        '<div style="max-width: 800px; margin: 0 auto;">' +
            settingsHTML +
            renderLanguageSelector() +
            '<div style="margin-top: 30px; padding: 20px; background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">' +
                '<h3 style="color: #1a2980; margin-bottom: 20px; font-size: 1.2rem;">⚙️ 快捷操作</h3>' +
                '<div style="display: flex; flex-direction: column; gap: 12px;">' +
                    '<button onclick="toggleNotifications(event)" style="padding: 14px; border-radius: 12px; border: 2px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-weight: 600; text-align: left; display: flex; align-items: center; gap: 10px; transition: all 0.3s;" onmouseover="this.style.background=\'#f0f4ff\'; this.style.borderColor=\'#26d0ce\'" onmouseout="this.style.background=\'#f8fafc\'; this.style.borderColor=\'#e2e8f0\'">🔔 通知中心 <span style="display: inline-block; padding: 2px 10px; background: #ef4444; color: white; border-radius: 10px; font-size: 0.75rem; margin-left: auto;">查看</span></button>' +
                    '<button onclick="showTab(\'about\')" style="padding: 14px; border-radius: 12px; border: 2px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-weight: 600; text-align: left; display: flex; align-items: center; gap: 10px; transition: all 0.3s;" onmouseover="this.style.background=\'#f0f4ff\'; this.style.borderColor=\'#26d0ce\'" onmouseout="this.style.background=\'#f8fafc\'; this.style.borderColor=\'#e2e8f0\'">ℹ️ 关于系统</button>' +
                    '<button onclick="logout()" style="padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; cursor: pointer; font-weight: 700; text-align: center; font-size: 1rem; transition: all 0.3s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">🚪 退出登录</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    loadUserSettings();
    loadNotes();
}

export function loadUserSettings() {
    document.getElementById('settingsUsername').value = currentUser.username;
    document.getElementById('settingsRole').value = currentUser.role === 'patient' ? '患者' : '医生';
    
    const user = users[currentUser.username];
    if (user && user.createdAt) {
        document.getElementById('settingsCreatedAt').value = new Date(user.createdAt).toLocaleString();
    } else {
        document.getElementById('settingsCreatedAt').value = '未知';
    }
    
    if (user && user.gender) {
        document.getElementById('settingsGender').value = user.gender;
    } else {
        document.getElementById('settingsGender').value = '';
    }
    
    if (user && user.age) {
        document.getElementById('settingsAge').value = user.age;
    } else {
        document.getElementById('settingsAge').value = '';
    }
    
    document.getElementById('settingsLastLogin').value = new Date().toLocaleString();
}

export function toggleGlobalSearch() {
    var bar = document.getElementById('globalSearchBar');
    if (bar) {
        var isVisible = bar.style.display !== 'none';
        bar.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            setTimeout(function() {
                var input = document.getElementById('globalSearchInput');
                if (input) input.focus();
            }, 100);
        } else {
            var results = document.getElementById('globalSearchResults');
            if (results) results.innerHTML = '';
            var input2 = document.getElementById('globalSearchInput');
            if (input2) input2.value = '';
        }
    }
}

export function closeGlobalSearch() {
    var bar = document.getElementById('globalSearchBar');
    if (bar) bar.style.display = 'none';
    var results = document.getElementById('globalSearchResults');
    if (results) results.innerHTML = '';
    var input = document.getElementById('globalSearchInput');
    if (input) input.value = '';
}

export function performGlobalSearch(query) {
    var resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;

    if (!query || query.trim().length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    var results = [];
    var q = query.toLowerCase();

    if (currentUser) {
        var metabolicKey = 'metabolic_' + currentUser.username;
        var metabolicData = JSON.parse(localStorage.getItem(metabolicKey) || '[]');

        metabolicData.forEach(function(entry) {
            var date = new Date(entry.timestamp).toLocaleDateString('zh-CN');
            if (date.indexOf(q) >= 0) {
                results.push({ type: 'metabolic', title: '代谢记录 - ' + date, desc: '共 ' + window.metaboliteData.length + ' 项指标', icon: '🧬', date: date });
                return;
            }
            var found = window.metaboliteData.filter(function(field) {
                return field.name.indexOf(q) >= 0 || (field.id && field.id.indexOf(q) >= 0);
            });
            if (found.length > 0) {
                found.forEach(function(f) {
                    var val = entry[f.id] || '未知';
                    results.push({ type: 'metabolic', title: f.name + ': ' + val, desc: '检测日期: ' + date, icon: '📊', date: date });
                });
            }
        });
    }

    var allUsers = JSON.parse(localStorage.getItem('metascanUsers') || '{}');
    Object.keys(allUsers).forEach(function(username) {
        if (username.toLowerCase().indexOf(q) >= 0 && allUsers[username].role === 'doctor') {
            results.push({ type: 'doctor', title: '医生: ' + username, desc: allUsers[username].doctorName || '', icon: '👨‍⚕️', username: username });
        }
    });

    if (currentUser) {
        var prescKey = 'metascanPrescriptions_' + currentUser.username;
        var prescriptions = JSON.parse(localStorage.getItem(prescKey) || '[]');
        prescriptions.forEach(function(p) {
            if ((p.title || '').toLowerCase().indexOf(q) >= 0 || (p.content || '').toLowerCase().indexOf(q) >= 0 || (p.medication || '').toLowerCase().indexOf(q) >= 0) {
                results.push({ type: 'prescription', title: '医嘱: ' + p.title, desc: p.content.substring(0, 60) + '...', icon: '📋', id: p.id, date: new Date(p.date).toLocaleDateString('zh-CN') });
            }
        });
    }

    if (currentUser) {
        var allStorageKeys = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf('metascanChat_' + currentUser.username) === 0) {
                allStorageKeys.push(key);
            }
        }
        allStorageKeys.forEach(function(key) {
            var messages = JSON.parse(localStorage.getItem(key) || '[]');
            messages.forEach(function(msg) {
                if ((msg.content || '').toLowerCase().indexOf(q) >= 0) {
                    results.push({ type: 'chat', title: msg.sender + '说: ' + (msg.content || '').substring(0, 40), desc: new Date(msg.timestamp).toLocaleString('zh-CN'), icon: '💬', id: msg.id, date: new Date(msg.timestamp).toLocaleDateString('zh-CN') });
                }
            });
        });
    }

    if (currentUser) {
        var healthRecords = JSON.parse(localStorage.getItem('healthRecords_' + currentUser.username) || '[]');
        healthRecords.forEach(function(r) {
            var date = new Date(r.timestamp).toLocaleDateString('zh-CN');
            if (date.indexOf(q) >= 0) {
                results.push({ type: 'health', title: '健康记录 - ' + date, desc: '体重/运动/饮食等', icon: '❤️', date: date });
            }
        });
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: #94a3b8;">未找到与 "<strong>' + query + '</strong>" 相关的结果</div>';
    } else {
        var uniqueResults = [];
        var seen = {};
        results.forEach(function(r) { var key = r.title + r.type; if (!seen[key]) { seen[key] = true; uniqueResults.push(r); } });

        resultsContainer.innerHTML = uniqueResults.slice(0, 20).map(function(r) {
            return '<div onclick="navigateToSearchResult(\'' + r.type + '\', \'' + (r.username || '') + '\')" style="padding: 14px 18px; background: white; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 14px;" onmouseover="this.style.background=\'#f8fafc\'; this.style.borderColor=\'#e2e8f0\'; this.style.transform=\'translateX(4px)\'" onmouseout="this.style.background=\'white\'; this.style.borderColor=\'#f1f5f9\'; this.style.transform=\'translateX(0)\'"><span style="font-size: 1.5rem;">' + r.icon + '</span><div style="flex: 1;"><div style="font-weight: 700; color: #1e293b; font-size: 0.92rem;">' + r.title + '</div><div style="font-size: 0.8rem; color: #94a3b8;">' + r.desc + '</div></div><span style="color: #64748b; font-size: 0.75rem;">' + (r.date || '') + '</span></div>';
        }).join('');
    }
}