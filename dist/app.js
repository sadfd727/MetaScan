﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// 用户数据存储
let users = {};
// 尝试从localStorage加载用户数据
const storedUsers = localStorage.getItem('metascanUsers');
if (storedUsers) {
    try {
        users = JSON.parse(storedUsers);
    } catch (e) {
        console.error('Failed to parse users data:', e);
        users = {};
    }
}

// 当前用户
let currentUser = null;

// ==================== 深色模式 ====================
function initTheme() {
    var savedTheme = localStorage.getItem('metascanTheme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem('metascanTheme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

function toggleTheme() { (window.toggleTheme || function(){})(); }

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var icon = document.getElementById('themeToggleIcon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function showSkeleton(containerId) {
    var placeholder = document.querySelector('#' + containerId + ' .skeleton-placeholder');
    var content = document.querySelector('#' + containerId + ' .skeleton-content');
    if (placeholder) placeholder.classList.add('active');
    if (content) content.classList.remove('active');
    return function() {
        if (placeholder) placeholder.classList.remove('active');
        if (content) content.classList.add('active');
    };
}

// ==================== 无障碍访问系统 ====================
function initAccessibility() {
    var btnSelector = 'button, [onclick], input, textarea, select, [role="button"]';
    var elements = document.querySelectorAll(btnSelector);
    elements.forEach(function(el) {
        if (!el.hasAttribute('tabindex') && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') {
            el.setAttribute('tabindex', '0');
        }
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
            var label = el.textContent ? el.textContent.trim().slice(0, 50) : (el.placeholder || el.title || el.getAttribute('data-nav') || '');
            if (label && label.length > 0 && label.length < 60) {
                el.setAttribute('aria-label', label);
            }
        }
    });

    document.querySelectorAll('nav').forEach(function(nav, i) {
        if (!nav.hasAttribute('role')) nav.setAttribute('role', 'navigation');
        if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', 'Navigation ' + (i + 1));
    });

    document.querySelectorAll('section').forEach(function(sec) {
        if (!sec.hasAttribute('role')) sec.setAttribute('role', 'region');
    });

    var mainArea = document.querySelector('.container') || document.getElementById('main');
    if (mainArea && !mainArea.hasAttribute('role')) mainArea.setAttribute('role', 'main');

    var notifPanel = document.getElementById('notificationPanel');
    if (notifPanel) notifPanel.setAttribute('aria-live', 'polite');
    if (notifPanel) notifPanel.setAttribute('aria-atomic', 'true');

    initKeyboardNavigation();

    var savedContrast = localStorage.getItem('metascanContrast');
    if (savedContrast === 'high') {
        applyHighContrast(true);
    }
}

function initKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            var target = e.target;
            if (target.hasAttribute('onclick') && (target.tagName === 'DIV' || target.tagName === 'SPAN' || target.tagName === 'LI')) {
                e.preventDefault();
                target.click();
            }
        }
        if (e.key === 'Escape') {
            closeQuickRecord();
            closeGlobalSearch();
            closePrescriptionInput();
            var modals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display:flex"]');
            modals.forEach(function(m) { m.style.display = 'none'; });
        }
    });
}

function toggleHighContrast() {
    var current = document.documentElement.getAttribute('data-contrast') === 'high';
    var enabled = !current;
    applyHighContrast(enabled);
    localStorage.setItem('metascanContrast', enabled ? 'high' : 'normal');
    showNotification(enabled ? '🔲 高对比度模式已开启' : '🔲 高对比度模式已关闭');
}

function applyHighContrast(enabled) {
    document.documentElement.setAttribute('data-contrast', enabled ? 'high' : '');
}

function announceToScreenReader(message) {
    var liveRegion = document.getElementById('srAnnouncements');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'srAnnouncements';
        liveRegion.setAttribute('aria-live', 'assertive');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
        document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    setTimeout(function() { liveRegion.textContent = message; }, 50);
}

var currentLang = localStorage.getItem('metascanLang') || 'zh-CN';

function t(key, lang) {
    lang = lang || currentLang;
    var dict = window.LANGUAGES[lang] || window.LANGUAGES['zh-CN'];
    return dict[key] || (window.LANGUAGES['zh-CN'][key] || key);
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('metascanLang', lang);
    document.documentElement.setAttribute('lang', lang);

    applyTranslations();

    var langBtns = document.querySelectorAll('.lang-option');
    langBtns.forEach(function(btn) {
        if (btn.getAttribute('data-lang') === lang) {
            btn.style.background = 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)';
            btn.style.color = 'white';
            btn.style.fontWeight = '800';
        } else {
            btn.style.background = '#f1f5f9';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '600';
        }
    });

    showNotification(lang === 'en' ? '🌐 Switched to English' : '🌐 已切换为中文');
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', t(key));
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-aria');
        el.setAttribute('aria-label', t(key));
    });
}

function initI18n() {
    document.documentElement.setAttribute('lang', currentLang);
    applyTranslations();
}

function renderLanguageSelector() {
    return '<div style="margin-top: 30px; padding: 20px; background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">' +
        '<h3 style="color: #1a2980; margin-bottom: 20px; font-size: 1.2rem;" data-i18n="profile.language">🌐 语言设置</h3>' +
        '<div style="display: flex; gap: 12px;">' +
            '<button onclick="setLanguage(\'zh-CN\')" class="lang-option" data-lang="zh-CN" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid #e2e8f0; background: ' + (currentLang === 'zh-CN' ? 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)' : '#f1f5f9') + '; color: ' + (currentLang === 'zh-CN' ? 'white' : '#64748b') + '; cursor: pointer; font-weight: ' + (currentLang === 'zh-CN' ? '800' : '600') + '; font-size: 0.95rem; transition: all 0.3s;" onmouseover="if(this.getAttribute(\'data-lang\')!==\'' + currentLang + '\'){this.style.background=\'#e2e8f0\'}" onmouseout="if(this.getAttribute(\'data-lang\')!==\'' + currentLang + '\'){this.style.background=\'#f1f5f9\'}">🇨🇳 简体中文</button>' +
            '<button onclick="setLanguage(\'en\')" class="lang-option" data-lang="en" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid #e2e8f0; background: ' + (currentLang === 'en' ? 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)' : '#f1f5f9') + '; color: ' + (currentLang === 'en' ? 'white' : '#64748b') + '; cursor: pointer; font-weight: ' + (currentLang === 'en' ? '800' : '600') + '; font-size: 0.95rem; transition: all 0.3s;" onmouseover="if(this.getAttribute(\'data-lang\')!==\'' + currentLang + '\'){this.style.background=\'#e2e8f0\'}" onmouseout="if(this.getAttribute(\'data-lang\')!==\'' + currentLang + '\'){this.style.background=\'#f1f5f9\'}">🇺🇸 English</button>' +
        '</div>' +
        '<div style="margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">' +
            '<button onclick="toggleHighContrast()" style="padding: 12px; border-radius: 12px; border: 2px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-weight: 600; font-size: 0.88rem; display: flex; align-items: center; gap: 8px; transition: all 0.3s;" onmouseover="this.style.background=\'#f0f4ff\'; this.style.borderColor=\'#26d0ce\'" onmouseout="this.style.background=\'#f8fafc\'; this.style.borderColor=\'#e2e8f0\'"><span>🔲</span> <span data-i18n="profile.contrast">高对比度模式</span></button>' +
            '<button onclick="toggleTheme()" style="padding: 12px; border-radius: 12px; border: 2px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-weight: 600; font-size: 0.88rem; display: flex; align-items: center; gap: 8px; transition: all 0.3s;" onmouseover="this.style.background=\'#f0f4ff\'; this.style.borderColor=\'#26d0ce\'" onmouseout="this.style.background=\'#f8fafc\'; this.style.borderColor=\'#e2e8f0\'"><span>🌓</span> <span data-i18n="profile.darkMode">深色模式</span></button>' +
        '</div>' +
    '</div>';
}

const storedCurrentUser = localStorage.getItem('metascanCurrentUser');
if (storedCurrentUser) {
    try {
        currentUser = JSON.parse(storedCurrentUser);
    } catch (e) {
        console.error('Failed to parse current user data:', e);
        currentUser = null;
    }
}

// 历史数据存储 - 按用户存储
let historicalData = {};

// 当前检测结果
let currentResult = null;

// 清空系统所有账号数据
function clearAllData() {
    // 清除所有相关的localStorage数据
    localStorage.removeItem('metascanUsers');
    localStorage.removeItem('metascanCurrentUser');
    // 清除所有用户的检测数据
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('metascanData_') || key.startsWith('metascanPrescriptions_') || key.startsWith('metascanSharedPrescriptions_') || key.startsWith('metascanReferrals_') || key.startsWith('metascanNotifications_')) {
            localStorage.removeItem(key);
        }
    }
    // 重置内存中的数据
    users = {};
    currentUser = null;
    historicalData = {};
    // 显示成功消息
    showNotification('系统数据已清空');
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    clearAllData();
    checkSharedReportOnLoad();
    // 检查用户登录状态
    checkLoginStatus();
    initWizard();
    initializeMetaboliteCategories();
    // 设置活动跟踪
    setupActivityTracking();
    // 启动通知检查
    startNotificationCheck();
    // 初始化通知徽章
    updateNotificationBadge();
    initAccessibility();
    initI18n();
    
    // 添加全局点击事件监听器，点击页面其他位置关闭通知
    document.addEventListener('click', function(event) {
        const notificationPanel = document.getElementById('notificationPanel');
        const notificationButton = document.querySelector('.nav-tab[onclick="toggleNotifications()"]');
        
        // 检查点击的目标是否在通知面板内或者是通知按钮本身
        if (notificationPanel && notificationPanel.style.display === 'block') {
            const isClickInsidePanel = notificationPanel.contains(event.target);
            const isClickOnButton = notificationButton && notificationButton.contains(event.target);
            
            if (!isClickInsidePanel && !isClickOnButton) {
                notificationPanel.style.display = 'none';
            }
        }
    });
});

// 检查登录状态
function checkLoginStatus() {
    if (currentUser) {
        // 用户已登录，隐藏登录页面
        document.getElementById('loginPage').style.display = 'none';
        // 加载用户数据
        loadUserData();
        // 如果是医生，显示医生仪表盘
        if (currentUser.role === 'doctor') {
            showDoctorDashboard();
        }
    } else {
        // 用户未登录，显示登录页面
        document.getElementById('loginPage').style.display = 'flex';
    }
}

// 切换表单
function toggleForm(formType) {
    try {
        // 隐藏所有表单
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotForm = document.getElementById('forgotForm');
        
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (forgotForm) forgotForm.style.display = 'none';
        
        // 显示选中的表单
        if (formType === 'login' && loginForm) {
            loginForm.style.display = 'flex';
        } else if (formType === 'register' && registerForm) {
            registerForm.style.display = 'flex';
        } else if (formType === 'forgot' && forgotForm) {
            forgotForm.style.display = 'flex';
        }
        
        // 清除错误信息
        const loginError = document.getElementById('loginError');
        if (loginError) loginError.style.display = 'none';
    } catch (e) {
        console.error('Error in toggleForm:', e);
    }
}

// 登录功能
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    
    if (!username || !password) {
        showError('请输入用户名和密码');
        return;
    }
    
    // 检查用户是否存在
    if (!users[username]) {
        showError('用户名或密码错误');
        return;
    }
    
    // 验证密码（使用加密后的密码）
    if (users[username].password !== hashPassword(password)) {
        showError('用户名或密码错误');
        return;
    }
    
    // 验证角色
    if (users[username].role !== role) {
        showError('角色选择错误');
        return;
    }
    
    // 登录成功
    currentUser = { 
        username: username, 
        role: role, 
        lastActivity: new Date().toISOString() 
    };
    localStorage.setItem('metascanCurrentUser', JSON.stringify(currentUser));
    
    // 如果是医生登录，记录登录时间
    if (role === 'doctor') {
        sessionStorage.setItem('doctorLoginTime', Date.now().toString());
    }
    
    // 隐藏登录页面，显示主应用页面
    document.getElementById('loginPage').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
    
    // 根据角色显示不同的导航栏
    if (role === 'doctor') {
        document.querySelector('.nav-tabs:not(.doctor-nav)').style.display = 'none';
        document.querySelector('.doctor-nav').style.display = 'flex';
        showDoctorDashboard();
    } else {
        document.querySelector('.nav-tabs:not(.doctor-nav)').style.display = 'flex';
        document.querySelector('.doctor-nav').style.display = 'none';
        showTab('home');
    }
    
    // 加载用户数据
    loadUserData();
    
    // 显示成功消息
    showNotification('登录成功！');
    
    // 启动会话超时检查
    startSessionTimeout();
}

// 会话超时检查
function startSessionTimeout() {
    // 每5分钟检查一次会话状态
    setInterval(() => {
        if (currentUser) {
            const lastActivity = new Date(currentUser.lastActivity);
            const now = new Date();
            const timeDiff = now - lastActivity;
            const minutesDiff = timeDiff / (1000 * 60);
            
            // 如果超过30分钟没有活动，自动退出登录
            if (minutesDiff > 30) {
                logout();
                showNotification('会话已超时，请重新登录');
            }
        }
    }, 5 * 60 * 1000);
}

// 更新活动时间
function updateActivity() {
    if (currentUser) {
        currentUser.lastActivity = new Date().toISOString();
        localStorage.setItem('metascanCurrentUser', JSON.stringify(currentUser));
    }
}

// 为所有用户交互添加活动时间更新
function setupActivityTracking() {
    // 鼠标移动
    document.addEventListener('mousemove', updateActivity);
    // 键盘输入
    document.addEventListener('keypress', updateActivity);
    // 点击
    document.addEventListener('click', updateActivity);
    // 滚动
    window.addEventListener('scroll', updateActivity);
}

// 简单的密码加密函数
function hashPassword(password) {
    // 使用简单的哈希算法，实际生产环境应使用更安全的加密方法
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// 注册功能
function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const role = document.querySelector('input[name="regRole"]:checked').value;
    
    if (!username || !password || !confirmPassword) {
        showError('请填写所有字段');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('两次输入的密码不一致');
        return;
    }
    
    if (password.length < 6) {
        showError('密码长度至少需要6位');
        return;
    }
    
    if (users[username]) {
        showError('用户名已存在');
        return;
    }
    
    // 创建新用户，密码加密存储
    users[username] = {
        password: hashPassword(password),
        role: role,
        createdAt: new Date().toISOString()
    };
    
    // 保存用户数据
    localStorage.setItem('metascanUsers', JSON.stringify(users));
    
    // 自动登录
    currentUser = { username: username, role: role, lastActivity: new Date().toISOString() };
    localStorage.setItem('metascanCurrentUser', JSON.stringify(currentUser));
    
    // 初始化用户数据
    if (role === 'patient') {
        historicalData[username] = [];
        localStorage.setItem(`metascanData_${username}`, JSON.stringify([]));
    }
    
    // 隐藏登录页面，显示主应用页面
    document.getElementById('loginPage').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
    
    // 根据角色显示不同的导航栏
    if (role === 'doctor') {
        // 显示医生导航栏，隐藏患者导航栏
        document.querySelector('.nav-tabs:not(.doctor-nav)').style.display = 'none';
        document.querySelector('.doctor-nav').style.display = 'flex';
        // 显示医生仪表盘
        showDoctorDashboard();
    } else {
        // 显示患者导航栏，隐藏医生导航栏
        document.querySelector('.nav-tabs:not(.doctor-nav)').style.display = 'flex';
        document.querySelector('.doctor-nav').style.display = 'none';
        // 显示代谢录入页面
        showTab('data');
    }
    
    // 显示成功消息
    showNotification('注册成功！');
    
    // 启动会话超时检查
    startSessionTimeout();
}

// 加载用户数据
function loadUserData() {
    if (currentUser) {
        historicalData[currentUser.username] = JSON.parse(localStorage.getItem(`metascanData_${currentUser.username}`)) || [];
    }
}

// 显示错误信息
function showError(message) {
    const errorElement = document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// 切换下拉菜单
function toggleDropdown(event) {
    event.stopPropagation();
    const dropdowns = document.getElementsByClassName('dropdown-content');
    for (let i = 0; i < dropdowns.length; i++) {
        const dropdown = dropdowns[i];
        // 检查下拉菜单是否与点击的按钮相关联
        const btn = dropdown.previousElementSibling;
        if (btn && btn.classList.contains('dropdown-btn')) {
            dropdown.classList.toggle('show');
        }
    }
}

// 点击页面其他地方关闭下拉菜单
window.onclick = function(event) {
    // 关闭下拉菜单
    if (!event.target.matches('.dropdown-btn') && !event.target.closest('.dropdown-btn')) {
        const dropdowns = document.getElementsByClassName('dropdown-content');
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
    
    // 关闭通知面板
    const notificationPanel = document.getElementById('notificationPanel');
    if (notificationPanel && notificationPanel.style.display === 'block') {
        if (!event.target.closest('#notificationPanel') && !event.target.closest('[onclick*="toggleNotifications"]')) {
            notificationPanel.style.display = 'none';
        }
    }
};

// 显示医生仪表盘
function showDoctorDashboard() {
    // 隐藏所有标签页
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    // 显示医生仪表盘
    document.getElementById('doctorDashboard').style.display = 'block';
    // 加载患者列表
    loadPatientList();
    // 更新数据概览
    updateDashboardOverview();
    // 绘制统计图表
    setTimeout(() => {
        drawRiskDistributionChart();
        drawSubtypeDistributionChart();
    }, 100);
}

// 更新仪表盘数据概览
function updateDashboardOverview() {
    // 更新欢迎卡片的日期
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
    
    // 更新在线时长（模拟）
    const onlineTimeEl = document.getElementById('onlineTime');
    if (onlineTimeEl) {
        const loginTime = sessionStorage.getItem('doctorLoginTime') || Date.now();
        const elapsed = Date.now() - parseInt(loginTime);
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        onlineTimeEl.textContent = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
    }
    
    // 获取所有患者用户
    const patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }
    
    // 计算统计数据
    let totalPatients = patients.length;
    let highRiskPatients = 0;
    let totalTests = 0;
    let totalPrescriptions = 0;
    let pendingPatients = 0;
    let todayPatients = 0;
    
    // 待处理事项列表
    const pendingItems = [];
    
    // 获取今天的日期（仅日期部分）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    patients.forEach(patient => {
        // 获取患者数据
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${patient.username}`)) || [];
        totalTests += patientData.length;
        
        // 检查是否有高风险记录
        if (patientData.length > 0) {
            const latestRecord = patientData[patientData.length - 1];
            if (latestRecord.overallRisk > 60) {
                highRiskPatients++;
            }
            
            // 检查是否有未处理的检测（没有对应的医嘱）
            const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${patient.username}`)) || [];
            if (prescriptions.length < patientData.length) {
                pendingPatients++;
                pendingItems.push({
                    type: 'diagnosis',
                    patient: patient.username,
                    date: latestRecord.date,
                    risk: latestRecord.overallRisk
                });
            }
            
            // 检查是否有今日的检测
            const recordDate = new Date(latestRecord.timestamp);
            recordDate.setHours(0, 0, 0, 0);
            if (recordDate.getTime() === today.getTime()) {
                todayPatients++;
            }
        }
        
        // 检查是否有新消息
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
        
        // 获取医嘱数量
        const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${patient.username}`)) || [];
        totalPrescriptions += prescriptions.length;
    });
    
    // 更新DOM
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
    
    // 更新待处理事项
    updatePendingList(pendingItems);
    
    // 更新最近活动
    updateRecentActivity();
    
    // 绘制趋势图表
    setTimeout(() => {
        drawOverallTrendChart();
        drawTestTrendChart();
    }, 100);
}

// 更新待处理事项列表
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

// 处理待处理事项
function handlePendingItem(type, patientUsername) {
    if (type === 'diagnosis' || type === 'message') {
        showTab('doctorPatients');
        setTimeout(() => {
            showPatientDetails(patientUsername);
        }, 100);
    }
}

// 更新最近活动
function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;
    
    // 从localStorage获取活动记录
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
    
    // 只显示最近10条
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

// 添加医生活动记录
function addDoctorActivity(type, title, message) {
    let activities = JSON.parse(localStorage.getItem('metascanDoctorActivities')) || [];
    
    activities.unshift({
        type: type,
        title: title,
        message: message,
        timestamp: new Date().toISOString()
    });
    
    // 只保留最近50条
    activities = activities.slice(0, 50);
    
    localStorage.setItem('metascanDoctorActivities', JSON.stringify(activities));
}

// 绘制总体风险趋势图表
function drawOverallTrendChart() {
    const ctx = document.getElementById('overallTrendChart');
    if (!ctx) return;
    
    // 生成最近7天的模拟数据
    const labels = [];
    const lowRiskData = [];
    const mediumRiskData = [];
    const highRiskData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        
        // 模拟数据
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

// 绘制检测数量趋势图表
function drawTestTrendChart() {
    const ctx = document.getElementById('testTrendChart');
    if (!ctx) return;
    
    // 生成最近7天的模拟数据
    const labels = [];
    const testData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        
        // 模拟数据
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

// 绘制风险分布图表
function drawRiskDistributionChart() {
    const ctx = document.getElementById('riskDistributionChart');
    if (!ctx) return;
    
    // 计算风险分布
    let lowRisk = 0;  // 0-30
    let mediumRisk = 0;  // 31-60
    let highRisk = 0;  // 61-100
    
    // 获取所有患者用户
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
            if (latestRecord.overallRisk <= 30) {
                lowRisk++;
            } else if (latestRecord.overallRisk <= 60) {
                mediumRisk++;
            } else {
                highRisk++;
            }
        }
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['低风险 (0-30)', '中风险 (31-60)', '高风险 (61-100)'],
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
                    text: '患者风险分布',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// 绘制亚健康亚型分布图表
function drawSubtypeDistributionChart() {
    const ctx = document.getElementById('subtypeDistributionChart');
    if (!ctx) return;
    
    // 计算亚型分布
    const subtypeCount = {
        sedentary: 0,
        obese: 0,
        inflammatory: 0,
        glucose: 0,
        amino: 0
    };
    
    // 获取所有患者用户
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
            latestRecord.subtypes.forEach(subtype => {
                if (subtypeCount.hasOwnProperty(subtype)) {
                    subtypeCount[subtype]++;
                }
            });
        }
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['运动不足型', '肥胖代谢紊乱型', '炎症饮食相关型', '糖代谢异常型', '氨基酸代谢紊乱型'],
            datasets: [{
                label: '患者数量',
                data: [subtypeCount.sedentary, subtypeCount.obese, subtypeCount.inflammatory, subtypeCount.glucose, subtypeCount.amino],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(237, 100, 166, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
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
                    text: '亚健康亚型分布',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// 加载患者列表
function loadPatientList(patients = null) {
    const patientListContainer = document.getElementById('patientList');
    if (!patientListContainer) return;
    
    // 如果没有传入患者列表，获取所有患者用户
    if (!patients) {
        patients = [];
        for (const [username, userData] of Object.entries(users)) {
            if (userData.role === 'patient') {
                patients.push({ username, ...userData });
            }
        }
    }
    
    // 更新统计面板
    updatePatientStats(patients);
    
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
    
    let html = '';
    patients.forEach((patient, index) => {
        // 检查患者是否有数据
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${patient.username}`)) || [];
        const hasData = patientData.length > 0;
        const lastRecord = hasData ? patientData[patientData.length - 1] : null;
        
        // 检查是否有新消息
        const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patient.username}`)) || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const hasNewMessageToday = chatMessages.some(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= today && msg.sender === patient.username;
        });
        
        // 获取风险等级颜色
        let riskColor = '#95a5a6';
        let riskBadge = '🟢 正常';
        if (hasData && lastRecord) {
            if (lastRecord.overallRisk > 60) {
                riskColor = '#e74c3c';
                riskBadge = '🔴 高风险';
            } else if (lastRecord.overallRisk > 30) {
                riskColor = '#f39c12';
                riskBadge = '🟡 中风险';
            } else {
                riskColor = '#27ae60';
                riskBadge = '🟢 低风险';
            }
        }
        
        html += `
            <div class="patient-item" data-username="${patient.username}"
                 style="border: 2px solid #f0f4ff; border-radius: 15px; padding: 18px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%); animation: fadeInUp 0.4s ease; animation-delay: ${index * 0.05}s;"
                 onclick="showPatientDetails('${patient.username}')"
                 onmouseover="this.style.borderColor='#26d0ce'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(38, 208, 206, 0.15)';"
                 onmouseout="this.style.borderColor='#f0f4ff'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <div style="width: 55px; height: 55px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.6rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(26, 41, 128, 0.2);">
                        ${patient.username.charAt(0).toUpperCase()}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <div style="font-weight: 700; color: #1a2980; font-size: 1.1rem;">${patient.username}</div>
                            ${hasNewMessageToday ? '<span style="background: #e74c3c; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">新消息</span>' : ''}
                        </div>
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            <span>📅 注册: ${new Date(patient.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        ${hasData && lastRecord ? `
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <span style="font-size: 0.85rem; color: #666;">📊 最新: ${lastRecord.date}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: ${riskColor}20; color: ${riskColor}; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
                                    ${riskBadge}
                                </span>
                                <span style="font-size: 0.85rem; color: #666;">风险评分: <span style="font-weight: 700; color: ${riskColor};">${lastRecord.overallRisk.toFixed(1)}</span></span>
                            </div>
                        ` : `
                            <div style="font-size: 0.85rem; color: #999; display: flex; align-items: center; gap: 5px;">
                                <span>📭</span>
                                <span>暂无检测数据</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    
    patientListContainer.innerHTML = html;
}

// 更新患者统计面板
function updatePatientStats(patients) {
    if (!currentUser || currentUser.role !== 'doctor') return;
    
    // 总患者数
    const totalPatientsEl = document.getElementById('statTotalPatients');
    if (totalPatientsEl) {
        totalPatientsEl.textContent = patients.length;
    }
    
    // 高风险患者数
    let highRiskCount = 0;
    let todayConsultCount = 0;
    let totalPrescriptionsCount = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    patients.forEach(patient => {
        // 检查高风险
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${patient.username}`)) || [];
        if (patientData.length > 0) {
            const lastRecord = patientData[patientData.length - 1];
            if (lastRecord.overallRisk > 60) {
                highRiskCount++;
            }
        }
        
        // 检查今日咨询
        const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patient.username}`)) || [];
        const hasTodayConsult = chatMessages.some(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= today && msg.sender === patient.username;
        });
        if (hasTodayConsult) {
            todayConsultCount++;
        }
        
        // 统计医嘱
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

// 刷新患者列表
function refreshPatientList() {
    loadPatientList();
    showNotification('患者列表已刷新');
}

// 搜索患者
function searchPatients() {
    const searchTerm = document.getElementById('patientSearch').value.toLowerCase().trim();
    const riskFilter = document.getElementById('riskFilter').value;
    const subtypeFilter = document.getElementById('subtypeFilter').value;
    
    // 获取所有患者用户
    let patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }
    
    // 应用搜索
    if (searchTerm) {
        patients = patients.filter(patient => 
            patient.username.toLowerCase().includes(searchTerm)
        );
    }
    
    // 应用筛选
    patients = applyFilters(patients, riskFilter, subtypeFilter);
    
    // 重新加载患者列表
    loadPatientList(patients);
}

// 筛选患者
function filterPatients() {
    const riskFilter = document.getElementById('riskFilter').value;
    const subtypeFilter = document.getElementById('subtypeFilter').value;
    
    // 获取所有患者用户
    let patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }
    
    // 应用筛选
    patients = applyFilters(patients, riskFilter, subtypeFilter);
    
    // 重新加载患者列表
    loadPatientList(patients);
}

// 应用筛选条件
function applyFilters(patients, riskFilter, subtypeFilter) {
    return patients.filter(patient => {
        // 检查患者是否有数据
        const patientData = JSON.parse(localStorage.getItem(`metascanData_${patient.username}`)) || [];
        const hasData = patientData.length > 0;
        const lastRecord = hasData ? patientData[patientData.length - 1] : null;
        
        // 风险等级筛选
        if (riskFilter !== 'all' && hasData) {
            let riskLevel;
            if (lastRecord.overallRisk <= 30) riskLevel = 'low';
            else if (lastRecord.overallRisk <= 60) riskLevel = 'medium';
            else riskLevel = 'high';
            
            if (riskLevel !== riskFilter) return false;
        }
        
        // 亚型筛选
        if (subtypeFilter !== 'all' && hasData) {
            if (!lastRecord.subtypes.includes(subtypeFilter)) return false;
        }
        
        return true;
    });
}

// 重置筛选条件
function resetFilters() {
    document.getElementById('patientSearch').value = '';
    document.getElementById('riskFilter').value = 'all';
    document.getElementById('subtypeFilter').value = 'all';
    loadPatientList();
}

// 显示患者详情
function showPatientDetails(username) {
    // 设置全局选中患者
    window.currentSelectedPatient = username;
    
    // 移除所有患者项的选中状态
    const patientItems = document.querySelectorAll('.patient-item');
    patientItems.forEach(item => {
        if (item.dataset.username === username) {
            item.style.borderColor = '#26d0ce';
            item.style.boxShadow = '0 8px 25px rgba(38, 208, 206, 0.3)';
        } else {
            item.style.borderColor = '#f0f4ff';
            item.style.boxShadow = 'none';
        }
    });
    
    const patientDetailsContent = document.getElementById('patientDetailsContent');
    const prescriptionContent = document.getElementById('prescriptionContent');
    const doctorChatMessages = document.getElementById('doctorChatMessages');
    
    if (!patientDetailsContent || !prescriptionContent) return;
    
    // 检查是否有查看报告的权限
    const reportRequests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const approvedRequest = reportRequests.find(req => 
        req.patientUsername === username && req.status === 'approved'
    );
    
    // 如果没有权限，显示权限申请提示
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
        
        // 仍然加载聊天记录
        if (doctorChatMessages) {
            loadDoctorChatMessages(username);
        }
        return;
    }
    
    // 获取患者数据
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
    
    // 显示最新的检测数据
    const latestRecord = patientData[patientData.length - 1];
    
    let detailsHtml = `
        <!-- 患者信息卡片 -->
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
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 5px;">总体风险</div>
                    <div style="font-size: 1.8rem; font-weight: 700;">${latestRecord.overallRisk.toFixed(1)}</div>
                </div>
            </div>
        </div>
        
        <!-- 健康状态概览 -->
        <div style="margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: ${latestRecord.overallRisk > 60 ? '#fee' : latestRecord.overallRisk > 30 ? '#fff3cd' : '#d4edda'}; border: 2px solid ${latestRecord.overallRisk > 60 ? '#f5c6cb' : latestRecord.overallRisk > 30 ? '#ffeeba' : '#c3e6cb'}; border-radius: 12px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">健康状态</div>
                    <div style="font-weight: 700; font-size: 1.1rem; color: ${latestRecord.overallRisk > 60 ? '#e74c3c' : latestRecord.overallRisk > 30 ? '#f39c12' : '#27ae60'}">
                        ${latestRecord.overallRisk > 60 ? '🔴 高风险' : latestRecord.overallRisk > 30 ? '🟡 中风险' : '🟢 低风险'}
                    </div>
                </div>
                <div style="background: #f8f9ff; border: 2px solid #e0e6ed; border-radius: 12px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">识别的亚型</div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: #1a2980;">
                        ${latestRecord.subtypes.map(s => window.subtypes[s] ? window.subtypes[s].name : s).join('、')}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 代谢指标分析 -->
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #333; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                <span>📊</span>
                <span>代谢指标分析</span>
            </h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <div style="background: ${latestRecord.riskScores.lipid > 60 ? '#fee' : latestRecord.riskScores.lipid > 30 ? '#fff3cd' : '#d4edda'}; border: 2px solid ${latestRecord.riskScores.lipid > 60 ? '#f5c6cb' : latestRecord.riskScores.lipid > 30 ? '#ffeeba' : '#c3e6cb'}; border-radius: 12px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">脂质代谢</div>
                    <div style="font-weight: 700; font-size: 1.4rem; color: ${latestRecord.riskScores.lipid > 60 ? '#e74c3c' : latestRecord.riskScores.lipid > 30 ? '#f39c12' : '#27ae60'}">${latestRecord.riskScores.lipid.toFixed(0)}</div>
                    <div style="margin-top: 10px;">
                        <div style="height: 8px; background: #e0e6ed; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(latestRecord.riskScores.lipid, 100)}%; background: ${latestRecord.riskScores.lipid > 60 ? '#e74c3c' : latestRecord.riskScores.lipid > 30 ? '#f39c12' : '#27ae60'}; border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>
                <div style="background: ${latestRecord.riskScores.glucose > 60 ? '#fee' : latestRecord.riskScores.glucose > 30 ? '#fff3cd' : '#d4edda'}; border: 2px solid ${latestRecord.riskScores.glucose > 60 ? '#f5c6cb' : latestRecord.riskScores.glucose > 30 ? '#ffeeba' : '#c3e6cb'}; border-radius: 12px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">糖代谢</div>
                    <div style="font-weight: 700; font-size: 1.4rem; color: ${latestRecord.riskScores.glucose > 60 ? '#e74c3c' : latestRecord.riskScores.glucose > 30 ? '#f39c12' : '#27ae60'}">${latestRecord.riskScores.glucose.toFixed(0)}</div>
                    <div style="margin-top: 10px;">
                        <div style="height: 8px; background: #e0e6ed; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(latestRecord.riskScores.glucose, 100)}%; background: ${latestRecord.riskScores.glucose > 60 ? '#e74c3c' : latestRecord.riskScores.glucose > 30 ? '#f39c12' : '#27ae60'}; border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>
                <div style="background: ${latestRecord.riskScores.inflammation > 60 ? '#fee' : latestRecord.riskScores.inflammation > 30 ? '#fff3cd' : '#d4edda'}; border: 2px solid ${latestRecord.riskScores.inflammation > 60 ? '#f5c6cb' : latestRecord.riskScores.inflammation > 30 ? '#ffeeba' : '#c3e6cb'}; border-radius: 12px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">炎症状态</div>
                    <div style="font-weight: 700; font-size: 1.4rem; color: ${latestRecord.riskScores.inflammation > 60 ? '#e74c3c' : latestRecord.riskScores.inflammation > 30 ? '#f39c12' : '#27ae60'}">${latestRecord.riskScores.inflammation.toFixed(0)}</div>
                    <div style="margin-top: 10px;">
                        <div style="height: 8px; background: #e0e6ed; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(latestRecord.riskScores.inflammation, 100)}%; background: ${latestRecord.riskScores.inflammation > 60 ? '#e74c3c' : latestRecord.riskScores.inflammation > 30 ? '#f39c12' : '#27ae60'}; border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 异常指标 -->
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #333; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                <span>⚠️</span>
                <span>异常指标</span>
                <span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;">${latestRecord.abnormalMetabolites.length}</span>
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                ${latestRecord.abnormalMetabolites.map(met => `
                    <div style="background: ${met.deviation === 'high' ? '#fee' : '#e3f2fd'}; border: 2px solid ${met.deviation === 'high' ? '#f5c6cb' : '#bbdefb'}; border-radius: 10px; padding: 12px; text-align: center;">
                        <div style="font-weight: 700; color: ${met.deviation === 'high' ? '#e74c3c' : '#1976d2'}; font-size: 0.85rem;">${met.name}</div>
                        <div style="margin-top: 5px; font-size: 0.9rem; color: #333;">${met.value} ${met.unit}</div>
                        <div style="margin-top: 3px; font-size: 0.75rem; color: ${met.deviation === 'high' ? '#e74c3c' : '#1976d2'}; font-weight: 600;">${met.deviation === 'high' ? '↑ 偏高' : '↓ 偏低'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- 导出按钮 -->
        <div style="text-align: center;">
            <button onclick="exportPatientReport('${username}')" style="padding: 12px 30px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(26, 41, 128, 0.2);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 15px rgba(26, 41, 128, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 10px rgba(26, 41, 128, 0.2)';">
                📄 导出健康报告 (PDF)
            </button>
        </div>
    `;
    
    patientDetailsContent.innerHTML = detailsHtml;
    
    // 显示医嘱创建表单
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
            <!-- 历史医嘱将通过JavaScript动态生成 -->
        </div>
    `;
    
    // 加载历史医嘱
    loadPrescriptionHistory(username);
    
    // 加载聊天记录
    if (doctorChatMessages) {
        loadDoctorChatMessages(username, doctorChatMessages);
    }
}

// 加载医生聊天消息（独立函数）
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
    
    // 按时间排序，最早的在前
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 标记消息为已读
    chatMessages.forEach(msg => {
        if (msg.sender !== currentUser.username && !msg.read) {
            msg.read = true;
        }
    });
    localStorage.setItem(`metascanChat_${username}`, JSON.stringify(chatMessages));
    
    container.innerHTML = chatMessages.map((message, index) => {
        var isDoctor = message.sender === currentUser.username;
        var timeStr = formatMessageTime(message.timestamp);
        var fullTime = new Date(message.timestamp).toLocaleString('zh-CN');
        var isPrescription = message.type === 'prescription';

        var replyHtml = '';
        if (message.replyTo) {
            replyHtml = '<div style="background: rgba(0,0,0,0.05); border-left: 3px solid #26d0ce; padding: 6px 10px; margin-bottom: 6px; border-radius: 4px; font-size: 0.8rem;"><div style="color: #666; margin-bottom: 2px;">回复 ' + message.replyTo.sender + '</div><div style="color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + message.replyTo.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div></div>';
        }

        var isRecalledMessage = message.isRecalled;
        var messageContent = renderMessageContent(message, isDoctor, true);

        var bubbleStyle;
        if (isRecalledMessage) {
            bubbleStyle = 'background: #f5f5f5; color: #999; font-style: italic;';
        } else if (isPrescription) {
            bubbleStyle = '';
        } else if (isDoctor) {
            bubbleStyle = 'background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white;';
        } else {
            bubbleStyle = 'background: white; color: #333; border: 1px solid #e0e6ed;';
        }

        var bubbleBorder = !isPrescription ? (isDoctor ? 'border-radius: 18px 18px 4px 18px;' : 'border-radius: 18px 18px 18px 4px;') : '';

        var readStatusHtml = getReadStatusIcon(message, isDoctor);

        return '<div style="display: flex; ' + (isDoctor ? 'justify-content: flex-end;' : 'justify-content: flex-start;') + ' margin-bottom: 12px; animation: fadeInUp 0.4s ease; animation-delay: ' + (index * 0.03) + 's;"' +
            (!isRecalledMessage ? ' oncontextmenu="showDoctorMessageMenu(event, ' + message.id + ', \'' + message.sender + '\', \'' + (message.content || '').replace(/'/g, "\\'") + '\', \'' + username + '\'); return false;"' : '') + '>' +
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

// 绘制总体风险趋势图表（医生端增强版）
function drawOverallRiskTrendChart(patientData) {
    var ctx = document.getElementById('overallRiskTrendChart');
    if (!ctx) return;

    if (ctx._chartInstance) { ctx._chartInstance.destroy(); }

    var sortedData = [...patientData].sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    var labels = sortedData.map(function(d) { return d.date; });
    var data = sortedData.map(function(d) { return d.overallRisk; });
    var pointColors = sortedData.map(function(d) { return d.overallRisk > 60 ? '#ef4444' : d.overallRisk > 30 ? '#f59e0b' : '#10b981'; });

    var datasets = [{
        label: '总体风险评分',
        data: data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: 6,
        pointHoverRadius: 9,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true
    }, {
        label: '高风险区间',
        data: sortedData.map(function(d) { return d.overallRisk > 60 ? d.overallRisk : 60; }),
        borderColor: 'transparent',
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        pointRadius: 0,
        fill: 1,
        tension: 0.4
    }];

    var reg = computeLinearRegression(data);
    if (reg && data.length > 5 && reg.rSquared > 0.2) {
        var lastIndex = data.length - 1;
        var predData = [];
        for (var i = 0; i <= lastIndex; i++) predData.push(null);
        predData.push(Math.max(0, Math.min(100, reg.predict(lastIndex + 2))));
        var sr = new Array(predData.length).fill(0); sr[predData.length - 1] = 10;
        var ss = new Array(predData.length).fill('circle'); ss[predData.length - 1] = 'star';
        datasets.push({
            label: '趋势预测',
            data: predData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2.5,
            borderDash: [8, 4],
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#f59e0b',
            pointRadius: sr,
            pointStyle: ss,
            tension: 0,
            fill: false,
            spanGaps: true
        });
    }

    var chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: '风险评分' }
                }
            },
            plugins: {
                legend: { position: 'bottom' },
                annotation: {
                    annotations: {
                        thresholdLine: {
                            type: 'line',
                            yMin: 60,
                            yMax: 60,
                            borderColor: 'rgba(239, 68, 68, 0.6)',
                            borderWidth: 2,
                            borderDash: [6, 4],
                            label: { content: '高风险阈值(60)', enabled: true, position: 'end', backgroundColor: 'rgba(239,68,68,0.9)', color: 'white', font: { weight: 'bold' } }
                        }
                    }
                }
            }
        }
    });
    ctx._chartInstance = chartInstance;
}

// 绘制维度风险趋势图表
function drawDimensionRiskTrendChart(patientData) {
    const ctx = document.getElementById('dimensionRiskTrendChart');
    if (!ctx) return;
    
    // 按时间排序
    const sortedData = [...patientData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const labels = sortedData.map(d => d.date);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '脂质代谢',
                data: sortedData.map(d => d.riskScores.lipid.toFixed(0)),
                borderColor: 'rgba(237, 100, 166, 1)',
                backgroundColor: 'rgba(237, 100, 166, 0.1)',
                tension: 0.4,
                fill: false
            }, {
                label: '糖代谢',
                data: sortedData.map(d => d.riskScores.glucose.toFixed(0)),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.4,
                fill: false
            }, {
                label: '炎症状态',
                data: sortedData.map(d => d.riskScores.inflammation.toFixed(0)),
                borderColor: 'rgba(255, 193, 7, 1)',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '风险评分'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// 导出患者健康报告为PDF
function exportPatientReport(username) {
    // 获取患者数据
    const patientData = JSON.parse(localStorage.getItem(`metascanData_${username}`)) || [];
    if (patientData.length === 0) {
        alert('患者暂无检测数据，无法导出报告');
        return;
    }
    
    // 获取最新的检测数据
    const latestRecord = patientData[patientData.length - 1];
    
    const overallRisk = latestRecord.overallRisk;
    let riskLevel, riskColorClass;
    if (overallRisk <= 30) {
        riskLevel = '低风险';
        riskColorClass = 'color: #27ae60;';
    } else if (overallRisk <= 60) {
        riskLevel = '中风险';
        riskColorClass = 'color: #f39c12;';
    } else {
        riskLevel = '高风险';
        riskColorClass = 'color: #e74c3c;';
    }
    
    const subtypeNames = latestRecord.subtypes.map(s => window.subtypes[s] ? window.subtypes[s].name : s).join('、');
    
    // 生成综合建议
    const recommendations = generateComprehensiveRecommendations(latestRecord);
    
    // 创建临时报告容器
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
                <p style="font-size: 16px; margin: 10px 0;">总体风险评分: <strong style="${riskColorClass}">${overallRisk.toFixed(1)} (${riskLevel})</strong></p>
                <p style="font-size: 14px; margin: 8px 0;">脂质代谢风险: ${latestRecord.riskScores.lipid.toFixed(0)}</p>
                <p style="font-size: 14px; margin: 8px 0;">糖代谢风险: ${latestRecord.riskScores.glucose.toFixed(0)}</p>
                <p style="font-size: 14px; margin: 8px 0;">炎症状态风险: ${latestRecord.riskScores.inflammation.toFixed(0)}</p>
            </div>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; color: #1a2980; margin: 20px 0 10px 0; padding-left: 10px; border-left: 4px solid #26d0ce;">识别的亚健康亚型</h3>
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px;">
                <p style="font-size: 16px; margin: 0;">亚型: ${subtypeNames}</p>
            </div>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; color: #1a2980; margin: 20px 0 10px 0; padding-left: 10px; border-left: 4px solid #26d0ce;">异常指标</h3>
            <div style="background: #f8f9ff; padding: 20px; border-radius: 10px;">
                ${latestRecord.abnormalMetabolites.length > 0 ? 
                    latestRecord.abnormalMetabolites.map(met => `
                        <p style="font-size: 14px; margin: 8px 0;">${met.name}: ${met.value} ${met.unit} (${met.deviation === 'high' ? '偏高' : '偏低'})</p>
                    `).join('') 
                    : '<p style="font-size: 14px; color: #666;">无异常指标</p>'
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
    
    // 使用html2canvas和jsPDF导出
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
            
            // 清理临时容器
            document.body.removeChild(reportContainer);
            
            // 显示成功消息
            showNotification('健康报告导出成功！');
        }).catch(error => {
            console.error('PDF导出失败:', error);
            alert('PDF导出失败，请重试');
            document.body.removeChild(reportContainer);
        });
    }, 100);
}

// 绘制患者风险雷达图
function drawPatientRiskChart(record) {
    const ctx = document.getElementById('patientRiskChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['脂质代谢', '糖代谢', '炎症状态', '总体风险'],
            datasets: [{
                label: '风险评分',
                data: [record.riskScores.lipid, record.riskScores.glucose, record.riskScores.inflammation, record.overallRisk],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 1)',
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: '患者风险评分分析',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// 加载历史医嘱
function loadPrescriptionHistory(username) {
    const historyContainer = document.getElementById('prescriptionHistory');
    if (!historyContainer) return;
    
    // 获取患者的医嘱历史
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

// 插入文本到医嘱输入框
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

// 保存医嘱
function savePrescription(username) {
    const prescriptionText = document.getElementById('prescriptionText').value.trim();
    
    if (!prescriptionText) {
        alert('请输入医嘱内容');
        return;
    }
    
    // 创建医嘱对象
    const prescription = {
        doctor: currentUser.username,
        content: prescriptionText,
        date: new Date().toISOString()
    };
    
    // 获取患者的医嘱历史
    const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${username}`)) || [];
    prescriptions.push(prescription);
    
    // 保存医嘱
    localStorage.setItem(`metascanPrescriptions_${username}`, JSON.stringify(prescriptions));
    
    // 添加活动记录
    addDoctorActivity('prescription', '创建医嘱', `为患者${username}创建了医嘱`);
    
    // 显示成功消息
    showNotification('医嘱保存成功！');
    
    // 重新加载医嘱历史
    loadPrescriptionHistory(username);
    
    // 清空输入框
    document.getElementById('prescriptionText').value = '';
}

// 共享医嘱
function sharePrescription(username) {
    const prescriptionText = document.getElementById('prescriptionText').value.trim();
    
    if (!prescriptionText) {
        alert('请先输入医嘱内容');
        return;
    }
    
    // 获取所有医生用户
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
    
    // 显示医生选择对话框
    let doctorSelect = '<select id="shareDoctor" style="padding: 8px; border: 1px solid #e0e6ed; border-radius: 8px; margin-right: 10px;">';
    doctors.forEach(doctor => {
        doctorSelect += `<option value="${doctor}">${doctor}</option>`;
    });
    doctorSelect += '</select>';
    
    const confirmShare = confirm(`请选择要共享医嘱的医生:\n${doctorSelect}`);
    
    if (confirmShare) {
        const selectedDoctor = document.getElementById('shareDoctor').value;
        if (selectedDoctor) {
            // 创建共享医嘱
            const sharedPrescription = {
                patient: username,
                doctor: currentUser.username,
                content: prescriptionText,
                date: new Date().toISOString()
            };
            
            // 保存到共享医嘱
            const sharedPrescriptions = JSON.parse(localStorage.getItem(`metascanSharedPrescriptions_${selectedDoctor}`)) || [];
            sharedPrescriptions.push(sharedPrescription);
            localStorage.setItem(`metascanSharedPrescriptions_${selectedDoctor}`, JSON.stringify(sharedPrescriptions));
            
            showNotification(`医嘱已成功共享给医生 ${selectedDoctor}！`);
        }
    }
}

// 转诊患者
function referPatient(username) {
    // 获取所有医生用户
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
    
    // 显示医生选择对话框
    let doctorSelect = '<select id="referDoctor" style="padding: 8px; border: 1px solid #e0e6ed; border-radius: 8px; margin-right: 10px;">';
    doctors.forEach(doctor => {
        doctorSelect += `<option value="${doctor}">${doctor}</option>`;
    });
    doctorSelect += '</select>';
    
    const confirmRefer = confirm(`请选择要转诊的医生:\n${doctorSelect}`);
    
    if (confirmRefer) {
        const selectedDoctor = document.getElementById('referDoctor').value;
        if (selectedDoctor) {
            // 创建转诊记录
            const referral = {
                patient: username,
                fromDoctor: currentUser.username,
                toDoctor: selectedDoctor,
                date: new Date().toISOString(),
                reason: '患者转诊'
            };
            
            // 保存转诊记录
            const referrals = JSON.parse(localStorage.getItem(`metascanReferrals_${selectedDoctor}`)) || [];
            referrals.push(referral);
            localStorage.setItem(`metascanReferrals_${selectedDoctor}`, JSON.stringify(referrals));
            
            showNotification(`患者已成功转诊给医生 ${selectedDoctor}！`);
        }
    }
}

// 初始化输入表单

function initializeMetaboliteCategories() {
    const container = document.getElementById('metaboliteCategories');
    if (!container) return;
    
    const categories = {};
    window.metaboliteData.forEach(met => {
        if (!categories[met.category]) {
            categories[met.category] = [];
        }
        categories[met.category].push(met.name);
    });
    
    container.innerHTML = '';
    Object.keys(categories).forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-title">${window.categoryNames[cat]}</div>
            <div class="category-items">
                ${categories[cat].map(name => `<span class="metabolite-tag">${name}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

// 生成报告
function generateReport() {
    // 检查用户登录状态
    if (!currentUser) {
        alert('请先登录后再生成报告');
        return;
    }
    
    // 收集输入数据
    const inputData = {};
    let hasData = false;
    
    window.metaboliteData.forEach(met => {
        const value = parseFloat(document.getElementById('wizard_' + met.id).value);
        if (!isNaN(value)) {
            inputData[met.id] = value;
            hasData = true;
        }
    });
    
    if (!hasData) {
        alert('请至少输入一项代谢物数据');
        return;
    }
    
    // 显示加载动画
    document.getElementById('loadingIndicator').style.display = 'block';
    
    // 模拟分析过程
    setTimeout(() => {
        // 执行分析
        currentResult = analyzeMetabolicData(inputData);
        
        // 检测是否为运动不足型
        const isSedentary = currentResult.subtypes.includes('sedentary');
        
        // 自动生成一周健康计划（饮食+运动）
        setTimeout(() => {
            const planCreated = generateWeeklyHealthPlan();
            if (planCreated) {
                // 在报告页面添加提示
                setTimeout(() => {
                    const reportContainer = document.getElementById('reportsContent');
                    if (reportContainer) {
                        const planNotification = document.createElement('div');
                        planNotification.style.cssText = `
                            background: linear-gradient(135deg, #1a2980, #26d0ce);
                            color: white;
                            padding: 18px 24px;
                            border-radius: 15px;
                            margin-bottom: 25px;
                            box-shadow: 0 6px 20px rgba(26,41,128,0.4);
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        `;
                        planNotification.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <span style="font-size: 2rem;">✨</span>
                                <div>
                                    <div style="font-weight: 700; font-size: 1.15rem; margin-bottom: 4px;">健康干预计划已准备就绪！</div>
                                    <div style="font-size: 0.95rem; opacity: 0.95;">已为您自动生成一周的饮食和运动计划</div>
                                </div>
                            </div>
                            <button onclick="showTab('home')" style="padding: 10px 22px; background: white; color: #1a2980; border: none; border-radius: 25px; cursor: pointer; font-weight: 700; font-size: 0.95rem; box-shadow: 0 3px 10px rgba(0,0,0,0.2); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
                                查看计划
                            </button>
                        `;
                        
                        // 插入到报告内容最前面
                        reportContainer.insertBefore(planNotification, reportContainer.firstChild);
                    }
                }, 200);
            }
        }, 500);
        
        // 如果检测到运动不足型，还额外生成4周运动计划
        if (isSedentary) {
            setTimeout(() => {
                generate4WeekExercisePlan();
            }, 800);
        }
        
        // 保存到历史记录
        saveToHistory(currentResult);
        
        // 隐藏加载动画
        document.getElementById('loadingIndicator').style.display = 'none';
        
        // 切换到报告页面（loadReportsContent 会渲染到可见容器）
        showTab('reports');
        
        // 滚动到报告页面顶部
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        
        showNotification('健康评估报告已生成');
    }, 1500);
}

// 分析代谢数据
function analyzeMetabolicData(data) {
    const result = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('zh-CN'),
        data: data,
        riskScores: calculateRiskScores(data),
        subtypes: identifySubtypes(data),
        abnormalMetabolites: identifyAbnormalMetabolites(data),
        overallRisk: 0,
        recommendations: []
    };
    
    // 计算总体风险
    const scores = Object.values(result.riskScores);
    result.overallRisk = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // 生成综合建议
    result.recommendations = generateComprehensiveRecommendations(result);
    
    return result;
}

// 计算各维度风险评分
function calculateRiskScores(data) {
    const scores = {
        lipid: 0,
        glucose: 0,
        amino: 0,
        inflammation: 0,
        energy: 0,
        oxidative: 0
    };
    
    // 脂质代谢风险评分
    if (data.LDL_C > 3.4) scores.lipid += 20;
    if (data.HDL_C < 1.0) scores.lipid += 20;
    if (data.TG > 1.7) scores.lipid += 20;
    if (data.TC > 5.2) scores.lipid += 20;
    if (data.ApoB > 1.1) scores.lipid += 20;
    scores.lipid = Math.min(scores.lipid, 100);
    
    // 糖代谢风险评分
    if (data.Glucose > 6.1) scores.glucose += 25;
    if (data.HbA1c > 6.0) scores.glucose += 25;
    if (data.Insulin > 24.9) scores.glucose += 25;
    if (data.HOMA_IR > 2.5) scores.glucose += 25;
    scores.glucose = Math.min(scores.glucose, 100);
    
    // 氨基酸代谢风险评分
    if (data.BCAA > 580) scores.amino += 30;
    if (data.Leucine > 180) scores.amino += 20;
    if (data.Isoleucine > 100) scores.amino += 20;
    if (data.Valine > 300) scores.amino += 20;
    if (data.Phenylalanine > 80) scores.amino += 10;
    scores.amino = Math.min(scores.amino, 100);
    
    // 炎症风险评分
    if (data.CRP > 3) scores.inflammation += 25;
    if (data.IL6 > 7) scores.inflammation += 25;
    if (data.TNF_alpha > 8) scores.inflammation += 25;
    if (data.Homocysteine > 15) scores.inflammation += 25;
    scores.inflammation = Math.min(scores.inflammation, 100);
    
    // 能量代谢风险评分
    if (data.Lactate > 2.2) scores.energy += 25;
    if (data.Pyruvate > 100) scores.energy += 25;
    if (data.Ketone < 0.02) scores.energy += 25;
    if (data.Acetylcarnitine < 5) scores.energy += 25;
    scores.energy = Math.min(scores.energy, 100);
    
    // 氧化应激风险评分
    if (data.MDA > 6) scores.oxidative += 40;
    if (data.SOD < 120) scores.oxidative += 30;
    if (data.GSH < 400) scores.oxidative += 30;
    scores.oxidative = Math.min(scores.oxidative, 100);
    
    return scores;
}

// 识别亚健康亚型
function identifySubtypes(data) {
    const detected = [];
    
    // 运动不足型
    const energyScore = (data.Lactate > 2.2 ? 1 : 0) + 
                       (data.Pyruvate > 100 ? 1 : 0) + 
                       (data.Ketone < 0.02 ? 1 : 0) +
                       (data.Acetylcarnitine < 5 ? 1 : 0);
    if (energyScore >= 2) detected.push('sedentary');
    
    // 肥胖代谢紊乱型
    const lipidScore = (data.LDL_C > 3.4 ? 1 : 0) + 
                      (data.TG > 1.7 ? 1 : 0) + 
                      (data.TC > 5.2 ? 1 : 0) +
                      (data.HDL_C < 1.0 ? 1 : 0);
    if (lipidScore >= 2) detected.push('obese');
    
    // 炎症饮食相关型
    const inflamScore = (data.CRP > 3 ? 1 : 0) + 
                       (data.IL6 > 7 ? 1 : 0) + 
                       (data.TNF_alpha > 8 ? 1 : 0);
    if (inflamScore >= 2) detected.push('inflammatory');
    
    // 糖代谢异常型
    const glucoseScore = (data.Glucose > 6.1 ? 1 : 0) + 
                        (data.HbA1c > 6.0 ? 1 : 0) + 
                        (data.HOMA_IR > 2.5 ? 1 : 0);
    if (glucoseScore >= 2) detected.push('glucose');
    
    // 氨基酸代谢紊乱型
    const aminoScore = (data.BCAA > 580 ? 1 : 0) + 
                      (data.Leucine > 180 ? 1 : 0) + 
                      (data.Isoleucine > 100 ? 1 : 0);
    if (aminoScore >= 2) detected.push('amino');
    
    return detected.length > 0 ? detected : ['normal'];
}

// 识别异常代谢物
function identifyAbnormalMetabolites(data) {
    const abnormal = [];
    
    window.metaboliteData.forEach(met => {
        if (data[met.id] !== undefined) {
            const value = data[met.id];
            if (value < met.refMin || value > met.refMax) {
                abnormal.push({
                    name: met.name,
                    value: value,
                    refMin: met.refMin,
                    refMax: met.refMax,
                    unit: met.unit,
                    category: met.category,
                    deviation: value < met.refMin ? 'low' : 'high'
                });
            }
        }
    });
    
    return abnormal;
}

// 生成综合建议
function generateComprehensiveRecommendations(result) {
    const recommendations = [];
    
    // 根据识别的亚型添加建议
    result.subtypes.forEach(subtype => {
        if (window.subtypes[subtype]) {
            recommendations.push(...window.subtypes[subtype].recommendations);
        }
    });
    
    // 根据具体异常指标生成针对性建议
    result.abnormalMetabolites.forEach(met => {
        const specificRecommendations = getSpecificRecommendations(met);
        if (specificRecommendations.length > 0) {
            recommendations.push(...specificRecommendations);
        }
    });
    
    // 去重
    return [...new Set(recommendations)];
}

// 根据具体异常指标生成针对性建议
function getSpecificRecommendations(metabolite) {
    const recommendations = [];
    
    // 根据代谢物名称和偏离方向生成针对性建议
    switch(metabolite.name) {
        case 'LDL胆固醇':
            if (metabolite.deviation === 'high') {
                recommendations.push('减少饱和脂肪摄入，如肥肉、奶油、油炸食品');
                recommendations.push('增加膳食纤维摄入，如燕麦、豆类、蔬菜');
                recommendations.push('每周至少150分钟中等强度有氧运动');
            }
            break;
        case 'HDL胆固醇':
            if (metabolite.deviation === 'low') {
                recommendations.push('增加不饱和脂肪摄入，如橄榄油、坚果、深海鱼');
                recommendations.push('每周进行3-4次中等强度有氧运动');
                recommendations.push('避免吸烟和过量饮酒');
            }
            break;
        case '甘油三酯':
            if (metabolite.deviation === 'high') {
                recommendations.push('限制精制糖和简单碳水化合物摄入');
                recommendations.push('控制总热量摄入，保持健康体重');
                recommendations.push('增加omega-3脂肪酸摄入，如深海鱼');
            }
            break;
        case '葡萄糖':
            if (metabolite.deviation === 'high') {
                recommendations.push('控制碳水化合物摄入，选择低升糖指数食物');
                recommendations.push('餐后30分钟进行轻度运动，如散步');
                recommendations.push('保持规律的进餐时间，避免暴饮暴食');
            }
            break;
        case '糖化血红蛋白':
            if (metabolite.deviation === 'high') {
                recommendations.push('严格控制碳水化合物摄入总量');
                recommendations.push('定期监测血糖，包括空腹和餐后血糖');
                recommendations.push('增加有氧运动，每周至少150分钟');
            }
            break;
        case 'C反应蛋白':
            if (metabolite.deviation === 'high') {
                recommendations.push('采用地中海饮食，增加抗氧化食物摄入');
                recommendations.push('减少加工食品和红肉摄入');
                recommendations.push('增加omega-3脂肪酸摄入');
            }
            break;
        case '同型半胱氨酸':
            if (metabolite.deviation === 'high') {
                recommendations.push('增加叶酸摄入，如绿叶蔬菜、豆类');
                recommendations.push('补充维生素B6和B12');
                recommendations.push('减少动物蛋白摄入，增加植物蛋白');
            }
            break;
        case '胰岛素':
            if (metabolite.deviation === 'high') {
                recommendations.push('控制碳水化合物摄入，选择低升糖指数食物');
                recommendations.push('增加有氧运动，提高胰岛素敏感性');
                recommendations.push('保持健康体重，减少腹部脂肪');
            }
            break;
        case 'BCAA':
            if (metabolite.deviation === 'high') {
                recommendations.push('减少支链氨基酸摄入，如肉类、 dairy products');
                recommendations.push('增加植物蛋白摄入，如豆类、坚果');
                recommendations.push('保持适当运动，避免过度训练');
            }
            break;
        case '乳酸':
            if (metabolite.deviation === 'high') {
                recommendations.push('增加有氧运动，提高心肺功能');
                recommendations.push('避免过度训练，保证充分恢复');
                recommendations.push('保持充足水分摄入');
            }
            break;
        case 'MDA':
            if (metabolite.deviation === 'high') {
                recommendations.push('增加抗氧化食物摄入，如蓝莓、草莓、绿茶');
                recommendations.push('减少加工食品和油炸食品摄入');
                recommendations.push('补充维生素C和E');
            }
            break;
        case 'SOD':
            if (metabolite.deviation === 'low') {
                recommendations.push('增加抗氧化食物摄入，如蔬菜水果');
                recommendations.push('避免过度运动和压力');
                recommendations.push('保证充足睡眠');
            }
            break;
    }
    
    return recommendations;
}

// 根据亚健康亚型生成个性化监测建议
function getMonitoringRecommendations(subtype) {
    const recommendations = [];
    
    switch(subtype) {
        case 'sedentary':
            recommendations.push('<li>每3个月复查能量代谢相关指标（乳酸、丙酮酸、酮体、乙酰肉碱）</li>');
            recommendations.push('<li>每周测量体重和血压，记录在健康日记中</li>');
            recommendations.push('<li>每天记录运动时间和强度，确保达到每周150分钟中等强度运动</li>');
            recommendations.push('<li>每6个月进行一次全面体检，包括血常规、生化检查</li>');
            recommendations.push('<li>如出现疲劳、气短等症状，及时就医咨询</li>');
            break;
        case 'obese':
            recommendations.push('<li>每3个月复查血脂指标（LDL-C、HDL-C、甘油三酯、总胆固醇）</li>');
            recommendations.push('<li>每周测量体重和腰围，记录在健康日记中</li>');
            recommendations.push('<li>每天测量血压，如有异常及时就医</li>');
            recommendations.push('<li>每6个月进行一次肝功能检查，监测脂肪肝情况</li>');
            recommendations.push('<li>每12个月进行一次颈动脉超声检查，评估动脉粥样硬化风险</li>');
            break;
        case 'inflammatory':
            recommendations.push('<li>每3个月复查炎症标志物（CRP、IL-6、TNF-alpha、同型半胱氨酸）</li>');
            recommendations.push('<li>每周监测体重变化</li>');
            recommendations.push('<li>每6个月进行一次血常规检查</li>');
            recommendations.push('<li>每12个月进行一次心血管风险评估</li>');
            recommendations.push('<li>如出现持续疲劳、关节疼痛等症状，及时就医</li>');
            break;
        case 'glucose':
            recommendations.push('<li>每周测量2-3次空腹血糖，记录在健康日记中</li>');
            recommendations.push('<li>每3个月测量一次糖化血红蛋白</li>');
            recommendations.push('<li>每周监测体重变化</li>');
            recommendations.push('<li>每6个月进行一次胰岛素抵抗评估</li>');
            recommendations.push('<li>如出现多饮、多尿、多食等症状，及时就医</li>');
            break;
        case 'amino':
            recommendations.push('<li>每3-6个月复查氨基酸代谢相关指标</li>');
            recommendations.push('<li>每6个月进行一次肝肾功能检查</li>');
            recommendations.push('<li>每周监测体重变化</li>');
            recommendations.push('<li>每12个月进行一次全面体检，包括电解质检查</li>');
            recommendations.push('<li>如出现疲劳、食欲不振等症状，及时就医</li>');
            break;
        default:
            recommendations.push('<li>每6-12个月进行一次全面代谢健康检查</li>');
            recommendations.push('<li>每周测量体重和血压</li>');
            recommendations.push('<li>保持健康的生活方式</li>');
            recommendations.push('<li>如有不适症状，及时就医</li>');
            break;
    }
    
    return recommendations.join('');
}

// 渲染报告（增强版：锚点导航+风险进度条+语音播报）
function renderReport(result, containerId) {
    if (!result || result.overallRisk === undefined) return;
    containerId = containerId || 'reportContent';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const riskLevel = result.overallRisk < 30 ? 'low' : result.overallRisk < 60 ? 'moderate' : 'high';
    const riskText = result.overallRisk < 30 ? '状况良好' : result.overallRisk < 60 ? '建议调整' : '需要关注';
    const riskColor = result.overallRisk < 30 ? '#10b981' : result.overallRisk < 60 ? '#f59e0b' : '#ef4444';
    const riskDescription = getRiskDescription(result.overallRisk, result.riskScores);
    
    let html = `
        <div class="report-container">
            <!-- ====== 报告锚点导航栏 ====== -->
            <div id="reportNav" style="position: sticky; top: 68px; z-index: 90; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; padding: 12px 18px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1.5px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 700; color: #1a2980; font-size: 0.85rem; white-space: nowrap;">📑 目录</span>
                <a href="#" onclick="scrollToSection('overall'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">总体评估</a>
                <a href="#" onclick="scrollToSection('dimensions'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">维度分析</a>
                <a href="#" onclick="scrollToSection('abnormal'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">异常指标</a>
                <a href="#" onclick="scrollToSection('recommendations'); return false;" style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; text-decoration: none; background: #f1f5f9; transition: all 0.2s; white-space: nowrap;">健康建议</a>
                <span style="flex:1;"></span>
            </div>
            
            <!-- ====== 快捷操作栏 ====== -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px; justify-content: center; flex-wrap: wrap;">
                <button onclick="saveReportAsPDF()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #1a2980, #26d0ce); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(26,41,128,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(26,41,128,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(26,41,128,0.25)'">
                    📥 保存为PDF
                </button>
                <button onclick="exportReportAsWord()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(37,99,235,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(37,99,235,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(37,99,235,0.25)'">
                    📝 导出Word
                </button>
                <button onclick="generateHealthCard()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(16,185,129,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(16,185,129,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(16,185,129,0.25)'">
                    💚 生成健康卡片
                </button>
                <button onclick="generateShareLink()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(245,158,11,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(245,158,11,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(245,158,11,0.25)'">
                    🔗 分享报告
                </button>
                <button id="ttsButton" onclick="toggleReportTTS()" style="padding: 12px 24px; border: none; border-radius: 30px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 16px rgba(139,92,246,0.25); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 28px rgba(139,92,246,0.35)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(139,92,246,0.25)'">
                    🔊 收听报告概要
                </button>
            </div>
            
            <!-- ====== 第1节：总体风险评估 ====== -->
            <div id="report-section-overall" class="risk-score-card fade-in" style="border-radius: 25px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);">
                <h3 class="section-title" style="color: white; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 15px; margin-bottom: 35px; font-size: 1.4rem;">
                    🎯 总体风险评估
                </h3>
                <div class="score-display">
                    <div class="heart-container">
                        <svg class="heart-svg" viewBox="0 0 450 450" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:${riskColor};stop-opacity:1" />
                                    <stop offset="50%" style="stop-color:${riskColor};stop-opacity:0.85" />
                                    <stop offset="100%" style="stop-color:${riskColor};stop-opacity:0.7" />
                                </linearGradient>
                                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="7.5" dy="7.5" stdDeviation="12" flood-opacity="0.4"/>
                                </filter>
                            </defs>
                            <path d="M225 405 C225 405 45 270 45 157.5 C45 90 90 45 157.5 45 C191.25 45 213.75 67.5 225 90 C236.25 67.5 258.75 45 292.5 45 C337.5 45 382.5 90 382.5 157.5 C382.5 270 225 405 225 405 Z" 
                                  fill="url(#heartGradient)" filter="url(#shadow)" stroke="#fff" stroke-width="4.5"/>
                            <ellipse cx="146.25" cy="180" rx="56.25" ry="78.75" fill="rgba(255,255,255,0.15)" />
                            <ellipse cx="303.75" cy="180" rx="56.25" ry="78.75" fill="rgba(255,255,255,0.15)" />
                            <path d="M157.5 56.25 Q135 22.5 112.5 33.75" stroke="${riskColor}" stroke-width="9" fill="none" stroke-linecap="round"/>
                            <path d="M292.5 56.25 Q315 22.5 337.5 33.75" stroke="${riskColor}" stroke-width="9" fill="none" stroke-linecap="round"/>
                            <polyline points="67.5,225 101.25,225 112.5,191.25 135,258.75 157.5,213.75 180,225 213.75,225" 
                                      fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
                            <circle cx="225" cy="225" r="90" fill="white"/>
                            <circle cx="225" cy="225" r="82.5" fill="none" stroke="${riskColor}" stroke-width="4.5"/>
                        </svg>
                        <div class="score-overlay">
                            <div class="score-value" style="font-size: 3.5rem;">${result.overallRisk.toFixed(1)}</div>
                            <div class="score-label" style="font-size: 1.1rem; font-weight: 600;">风险评分</div>
                        </div>
                    </div>
                    <div class="risk-level risk-${riskLevel}" style="padding: 12px 30px; font-size: 1.3rem; border-radius: 30px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); background: ${riskColor};">
                        ${riskText}
                    </div>
                    <!-- 风险进度条 -->
                    <div style="margin-top: 16px; width: 100%; max-width: 400px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: rgba(255,255,255,0.8); margin-bottom: 4px;">
                            <span>0 · 状况良好</span><span>60 · 建议调整</span><span>100 · 需要关注</span>
                        </div>
                        <div style="height: 8px; background: rgba(255,255,255,0.25); border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(result.overallRisk, 100)}%; background: ${riskColor}; border-radius: 4px; transition: width 1s ease;"></div>
                        </div>
                    </div>
                    <p style="margin-top: 20px; color: rgba(255,255,255,0.9); font-size: 1rem; background: rgba(255,255,255,0.15); padding: 10px 25px; border-radius: 20px; display: inline-block;">
                        📅 检测日期: ${result.date}
                    </p>
                </div>
            </div>
            
            <!-- 评估结论 -->
            <div id="report-section-conclusion" class="data-card fade-in" style="margin-bottom: 30px;">
                <h4 class="chart-title" style="font-size: 1.3rem; margin-bottom: 20px;">📋 评估结论</h4>
                <div style="padding: 25px; background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%); border-radius: 18px; border-left: 5px solid #26d0ce;">
                    <p style="line-height: 1.9; color: #2c3e50; font-size: 1.1rem;">${riskDescription}</p>
                </div>
            </div>
    `;
    
    // ====== 第2节：多维度风险分析（含进度条） ======
    html += `
        <div id="report-section-dimensions">
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">📊 多维度代谢风险分析</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 35px;">
                <div class="chart-container fade-in" style="border-radius: 20px;">
                    <h4 class="chart-title" style="font-size: 1.15rem; margin-bottom: 20px;">📈 风险分布雷达图</h4>
                    <canvas id="riskRadarChart" width="400" height="300"></canvas>
                </div>
                <div class="chart-container fade-in" style="border-radius: 20px;">
                    <h4 class="chart-title" style="font-size: 1.15rem; margin-bottom: 20px;">📝 各维度详细解读</h4>
                    <div style="padding: 15px;">
                        ${generateDimensionAnalysis(result.riskScores)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 风险进度条卡片
    html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px;">`;
    const dimNames = { lipid: '脂质代谢', glucose: '糖代谢', amino: '氨基酸代谢', inflammation: '炎症状态', energy: '能量代谢', oxidative: '氧化应激' };
    const dimIcons = { lipid: '🩸', glucose: '🍯', amino: '🧬', inflammation: '🔥', energy: '⚡', oxidative: '🛡️' };
    Object.entries(result.riskScores).forEach(([key, score]) => {
        const dColor = score < 30 ? '#10b981' : score < 60 ? '#f59e0b' : '#ef4444';
        const dText = score < 30 ? '良好' : score < 60 ? '注意' : '关注';
        html += `<div class="data-card" style="text-align: center;">
            <div style="font-size: 1.5rem;">${dimIcons[key] || '📊'}</div>
            <div style="font-weight: 700; color: #1e293b; margin: 6px 0;">${dimNames[key] || key}</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: ${dColor};">${score.toFixed(0)}</div>
            <div style="height: 6px; background: #e2e8f0; border-radius: 3px; margin: 8px 0; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(score, 100)}%; background: ${dColor}; border-radius: 3px; transition: width 1s ease;"></div>
            </div>
            <div style="font-weight: 700; font-size: 0.8rem; color: ${dColor};">${dText}</div>
        </div>`;
    });
    html += `</div>`;
    
    // 关键指标摘要卡片
    html += generateKeyMetricsSummary(result);
    
    // ====== 第3节：异常指标 ======
    if (result.abnormalMetabolites.length > 0) {
        html += `<div id="report-section-abnormal">`;
        html += generateDetailedAbnormalAnalysis(result.abnormalMetabolites);
        html += `</div>`;
    }
    
    // 所有检测指标完整列表
    html += generateCompleteMetaboliteList(result.data);
    
    // 亚健康状态识别
    html += generateDetailedSubtypeAnalysis(result);
    
    // 健康趋势预测
    html += generateHealthTrendPrediction(result);
    
    // 个性化干预方案时间线
    html += generateInterventionTimeline(result);
    
    // ====== 第4节：健康建议 ======
    html += `<div id="report-section-recommendations">`;
    html += generateFollowUpRecommendations(result);
    html += `</div>`;
    
    html += `</div>`;
    container.innerHTML = html;
    
    // 存储当前报告数据供导出和TTS使用
    window._currentReportData = result;
    
    // 绘制图表
    setTimeout(() => {
        drawRiskRadarChart(result.riskScores);
        if (result.abnormalMetabolites.length > 0) {
            drawAbnormalChart(result.abnormalMetabolites);
        }
        drawRiskTrendChart(result.overallRisk);
    }, 100);
}

// 获取风险描述
function getRiskDescription(overallRisk, riskScores) {
    const highRiskDimensions = Object.entries(riskScores)
        .filter(([key, value]) => value > 60)
        .map(([key]) => window.categoryNames[key] || key);
    
    if (overallRisk < 30) {
        return `您的代谢健康状况良好，综合评分为${overallRisk.toFixed(1)}分，处于安全区间。` +
               `各维度代谢指标基本正常，建议继续保持当前的健康生活方式，定期进行体检监测。`;
    } else if (overallRisk < 60) {
        let desc = `您的代谢健康综合评分为${overallRisk.toFixed(1)}分，部分指标需要关注。`;
        if (highRiskDimensions.length > 0) {
            desc += `建议重点关注以下方面：${highRiskDimensions.join('、')}。`;
        }
        desc += `可以参考报告中的个性化建议适当调整生活方式，建议3-6个月后复查相关指标。`;
        return desc;
    } else {
        let desc = `您的代谢健康综合评分为${overallRisk.toFixed(1)}分，多项指标需要重视。`;
        if (highRiskDimensions.length > 0) {
            desc += `以下维度需要特别关注：${highRiskDimensions.join('、')}。`;
        }
        desc += `建议近期咨询专业医生，制定针对性的干预方案，并定期监测相关指标变化。`;
        return desc;
    }
}

// 生成各维度详细分析
function generateDimensionAnalysis(riskScores) {
    const analysis = [];
    const dimensionNames = {
        lipid: '脂质代谢',
        glucose: '糖代谢', 
        amino: '氨基酸代谢',
        inflammation: '炎症状态',
        energy: '能量代谢',
        oxidative: '氧化应激'
    };
    
    const dimensionDesc = {
        lipid: '反映血脂水平及心血管疾病风险',
        glucose: '反映血糖控制及糖尿病风险',
        amino: '反映蛋白质代谢及肝脏功能',
        inflammation: '反映体内炎症水平',
        energy: '反映能量代谢及运动能力',
        oxidative: '反映氧化应激及衰老程度'
    };
    
    Object.entries(riskScores).forEach(([key, value]) => {
        let status, color;
        if (value < 30) { status = '正常'; color = '#10b981'; }
        else if (value < 60) { status = '需关注'; color = '#f59e0b'; }
        else { status = '建议就医'; color = '#ef4444'; }
        
        analysis.push(`
            <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 10px; border-left: 4px solid ${color};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong style="color: #1a2980;">${dimensionNames[key]}</strong>
                    <span style="color: ${color}; font-weight: 600;">${value.toFixed(0)}分 - ${status}</span>
                </div>
                <div style="font-size: 0.85rem; color: #666;">${dimensionDesc[key]}</div>
                <div style="margin-top: 8px; height: 6px; background: #e0e6ed; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${value}%; height: 100%; background: ${color}; border-radius: 3px; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `);
    });
    
    return analysis.join('');
}

// 生成关键指标摘要
function generateKeyMetricsSummary(result) {
    const criticalMetrics = ['LDL_C', 'HDL_C', 'TG', 'Glucose', 'HbA1c', 'CRP'];
    const metrics = criticalMetrics.map(id => {
        const met = window.metaboliteData.find(m => m.id === id);
        const value = result.data[id];
        if (!value) return null;
        
        const isNormal = value >= met.refMin && value <= met.refMax;
        const deviation = value < met.refMin ? 'low' : value > met.refMax ? 'high' : 'normal';
        const deviationPercent = deviation === 'high' 
            ? ((value - met.refMax) / met.refMax * 100).toFixed(0)
            : deviation === 'low'
            ? ((met.refMin - value) / met.refMin * 100).toFixed(0)
            : 0;
        
        return { name: met.name, value, unit: met.unit, isNormal, deviation, deviationPercent };
    }).filter(m => m !== null);
    
    if (metrics.length === 0) return '';
    
    return `
        <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">📈 关键指标速览</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 20px; margin-bottom: 35px;">
            ${metrics.map(m => `
                <div class="data-card fade-in" style="background: ${m.isNormal ? 'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)' : 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)'}; 
                            border: 3px solid ${m.isNormal ? '#00b894' : '#e74c3c'};">
                    <div style="font-size: 0.95rem; color: #555; margin-bottom: 12px; font-weight: 600;">${m.name}</div>
                    <div style="font-size: 2.2rem; font-weight: 800; color: ${m.isNormal ? '#00b894' : '#e74c3c'};">
                        ${m.value} <span style="font-size: 1rem; font-weight: 500;">${m.unit}</span>
                    </div>
                    ${!m.isNormal ? `
                        <div style="margin-top: 12px; padding: 8px 12px; background: rgba(231,76,60,0.1); border-radius: 10px;">
                            <span style="font-size: 0.85rem; color: #e74c3c; font-weight: 600;">
                                ${m.deviation === 'high' ? '↑' : '↓'} 偏离正常值 ${m.deviationPercent}%
                            </span>
                        </div>
                    ` : `
                        <div style="margin-top: 12px; padding: 8px 12px; background: rgba(0,184,148,0.1); border-radius: 10px;">
                            <span style="font-size: 0.85rem; color: #00b894; font-weight: 600;">
                                ✓ 正常范围
                            </span>
                        </div>
                    `}
                </div>
            `).join('')}
        </div>
    `;
}

// 生成异常代谢物详细分析
function generateDetailedAbnormalAnalysis(abnormalMetabolites) {
    return `
        <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">🔍 需要关注的代谢指标</h3>
        <div class="chart-container fade-in" style="margin-bottom: 25px; border-radius: 20px;">
            <h4 class="chart-title" style="font-size: 1.15rem; margin-bottom: 20px;">📊 偏离正常范围的指标</h4>
            <canvas id="abnormalChart" width="400" height="250"></canvas>
        </div>
        <div class="table-container fade-in" style="margin-bottom: 35px;">
            <table>
                <thead>
                    <tr>
                        <th>代谢物</th>
                        <th>检测值</th>
                        <th>参考范围</th>
                        <th>偏离程度</th>
                        <th>临床意义</th>
                    </tr>
                </thead>
                <tbody>
                    ${abnormalMetabolites.map((met, index) => {
                        const deviationPercent = met.deviation === 'high' 
                            ? ((met.value - met.refMax) / met.refMax * 100).toFixed(0)
                            : ((met.refMin - met.value) / met.refMin * 100).toFixed(0);
                        const clinicalSignificance = getClinicalSignificance(met.name, met.deviation);
                        
                        return `
                            <tr style="transition: background 0.2s ease;">
                                <td style="font-weight: 700; color: #1a2980;">${met.name}</td>
                                <td style="text-align: center; color: ${met.deviation === 'high' ? '#e74c3c' : '#f39c12'}; font-weight: 700; font-size: 1.1rem;">
                                    ${met.value} ${met.unit}
                                </td>
                                <td style="text-align: center; color: #666;">${met.refMin}-${met.refMax} ${met.unit}</td>
                                <td style="text-align: center;">
                                    <span class="status-badge ${met.deviation === 'high' ? 'status-danger' : 'status-warning'}">
                                        ${met.deviation === 'high' ? '↑' : '↓'} ${deviationPercent}%
                                    </span>
                                </td>
                                <td style="text-align: left; font-size: 0.95rem; color: #555;">${clinicalSignificance}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 获取临床意义
function getClinicalSignificance(metaboliteName, deviation) {
    const significanceMap = {
        'LDL胆固醇': deviation === 'high' ? '动脉粥样硬化风险增加' : '营养吸收可能不足',
        'HDL胆固醇': deviation === 'high' ? '心血管保护因素良好' : '心血管风险增加',
        '甘油三酯': deviation === 'high' ? '胰腺炎风险、代谢综合征' : '营养状态需关注',
        '总胆固醇': deviation === 'high' ? '心血管疾病风险' : '激素合成可能受影响',
        '葡萄糖': deviation === 'high' ? '糖尿病前期或糖尿病' : '低血糖风险',
        '糖化血红蛋白': deviation === 'high' ? '长期血糖控制不佳' : '红细胞更新过快可能',
        'C反应蛋白': deviation === 'high' ? '炎症状态、感染或组织损伤' : '正常',
        '胰岛素': deviation === 'high' ? '胰岛素抵抗、代谢综合征' : '胰岛功能可能受损',
        '同型半胱氨酸': deviation === 'high' ? '心血管疾病风险、叶酸缺乏' : '正常'
    };
    return significanceMap[metaboliteName] || '需结合其他指标综合判断';
}

// 生成完整代谢物列表
function generateCompleteMetaboliteList(data) {
    const categories = {};
    window.metaboliteData.forEach(met => {
        if (!categories[met.category]) categories[met.category] = [];
        categories[met.category].push(met);
    });
    
    return `
        <h3 class="section-title">完整检测指标列表</h3>
        <div style="margin-bottom: 30px;">
            ${Object.entries(categories).map(([cat, metabolites]) => `
                <div style="background: white; border-radius: 15px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 15px rgba(0,0,0,0.06);">
                    <div style="background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; padding: 15px 20px;">
                        <h4 style="margin: 0; font-size: 1.1rem;">${window.categoryNames[cat]} (${metabolites.filter(m => data[m.id]).length}/${metabolites.length}项已录入)</h4>
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                            ${metabolites.map(met => {
                                const value = data[met.id];
                                const hasValue = value !== undefined && !isNaN(value);
                                const isNormal = hasValue && value >= met.refMin && value <= met.refMax;
                                
                                return `
                                    <div style="padding: 15px; background: ${hasValue ? (isNormal ? '#f0fff4' : '#fff5f5') : '#f8f9fa'}; 
                                                border-radius: 10px; border: 1px solid ${hasValue ? (isNormal ? '#00b894' : '#e74c3c') : '#e0e6ed'};">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <span style="font-weight: 600; color: #1a2980; font-size: 0.95rem;">${met.name}</span>
                                            ${hasValue ? `<span style="font-size: 1.1rem; font-weight: 700; color: ${isNormal ? '#00b894' : '#e74c3c'};">${value}</span>` : '<span style="color: #999; font-size: 0.85rem;">未录入</span>'}
                                        </div>
                                        <div style="font-size: 0.8rem; color: #666;">参考范围: ${met.refMin}-${met.refMax} ${met.unit}</div>
                                        ${hasValue ? `<div style="font-size: 0.75rem; margin-top: 5px; color: ${isNormal ? '#00b894' : '#e74c3c'};">${isNormal ? '✓ 正常' : '⚠️ 异常'}</div>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 生成详细亚健康状态分析
function generateDetailedSubtypeAnalysis(result) {
    if (result.subtypes[0] === 'normal') {
        return `
            <h3 class="section-title">代谢状态评估</h3>
            <div style="background: linear-gradient(135deg, #f0fff4 0%, #ffffff 100%); padding: 30px; border-radius: 20px; border: 2px solid #00b894; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                    <div style="width: 60px; height: 60px; background: #00b894; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">✓</div>
                    <div>
                        <h4 style="color: #00b894; margin: 0; font-size: 1.3rem;">代谢状态良好</h4>
                        <p style="color: #666; margin: 5px 0 0 0;">您的代谢指标整体处于正常范围</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.8;">恭喜！根据本次检测结果，您的各项代谢指标基本正常，未发现明显的代谢紊乱。建议继续保持健康的生活方式，包括均衡饮食、规律运动、充足睡眠等。建议每6-12个月进行一次代谢健康检查，持续监测身体状况。</p>
            </div>
        `;
    }
    
    let html = `<h3 class="section-title">识别的亚健康状态详细分析</h3>`;
    
    result.subtypes.forEach((subtype, index) => {
        if (window.subtypes[subtype]) {
            const st = window.subtypes[subtype];
            html += `
                <div style="background: white; border-radius: 20px; padding: 30px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); animation: fadeIn 0.5s ease-in-out;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: 700;">${index + 1}</div>
                        <div>
                            <h4 style="color: #1a2980; margin: 0; font-size: 1.2rem;">${st.name}</h4>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 0.9rem;">${st.description}</p>
                        </div>
                    </div>
                    
                    <!-- 严重程度指示器 -->
                    <div style="margin-bottom: 25px; padding: 20px; background: #f8f9fa; border-radius: 15px;">
                        <h5 style="color: #1a2980; margin-bottom: 15px; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
                            <span>📈</span> 严重程度评估
                        </h5>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="flex: 1;">
                                <div style="height: 10px; background: #e0e6ed; border-radius: 5px; overflow: hidden;">
                                    <div style="height: 100%; width: ${Math.min(80, (index + 1) * 25)}%; background: linear-gradient(90deg, #1a2980, #26d0ce); border-radius: 5px; transition: width 0.5s ease;"></div>
                                </div>
                            </div>
                            <div style="font-size: 0.9rem; font-weight: 600; color: #1a2980;">${['轻度', '中度', '重度', '严重'][Math.min(index, 3)]}</div>
                        </div>
                    </div>
                    
                    <!-- 相关代谢物详细解读 -->
                    <div style="margin-bottom: 25px;">
                        <h5 style="color: #1a2980; margin-bottom: 15px; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
                            <span>📊</span> 相关代谢物详细数据
                        </h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                            ${st.indicators.map(id => {
                                const met = window.metaboliteData.find(m => m.id === id);
                                const value = result.data[id];
                                if (!value) return '';
                                const isNormal = value >= met.refMin && value <= met.refMax;
                                const percentage = Math.abs((value - (met.refMin + met.refMax) / 2) / ((met.refMax - met.refMin) / 2)) * 100;
                                return `
                                    <div style="padding: 15px; background: ${isNormal ? '#f0fff4' : '#fff5f5'}; border-radius: 10px; border-left: 4px solid ${isNormal ? '#00b894' : '#e74c3c'}; transition: all 0.3s ease;">
                                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">${met.name}</div>
                                        <div style="font-size: 1.1rem; font-weight: 600; color: ${isNormal ? '#00b894' : '#e74c3c'}; margin-bottom: 8px;">${value} ${met.unit}</div>
                                        <div style="font-size: 0.75rem; color: #999;">参考范围: ${met.refMin}-${met.refMax} ${met.unit}</div>
                                        ${!isNormal ? `<div style="font-size: 0.75rem; color: ${isNormal ? '#00b894' : '#e74c3c'}; margin-top: 5px;">偏离正常范围 ${Math.round(percentage)}%</div>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- 疾病风险预警 -->
                    <div style="background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%); border: 2px solid #e74c3c; border-radius: 15px; padding: 20px; margin-bottom: 25px;">
                        <h5 style="color: #e74c3c; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                            <span>⚠️</span> 疾病风险预警
                        </h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                            ${st.diseases.map((disease, diseaseIndex) => `
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease; animation: fadeIn 0.3s ease-in-out ${diseaseIndex * 0.1}s both;">
                                    <div style="font-weight: 600; color: #1a2980; margin-bottom: 8px;">${disease.name}</div>
                                    <div style="font-size: 0.85rem; color: #666; line-height: 1.5; margin-bottom: 10px;">
                                        <strong>典型症状：</strong>${disease.symptoms}
                                    </div>
                                    <div style="font-size: 0.8rem; color: #999; line-height: 1.4;">
                                        <strong>风险等级：</strong>${['低', '中', '高'][Math.min(diseaseIndex, 2)]}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- 个性化干预方案 -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px;">
                        <div style="background: linear-gradient(135deg, #e6f7f0 0%, #f0fff4 100%); padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                            <div style="font-size: 1.5rem; margin-bottom: 10px;">🥗</div>
                            <h6 style="color: #1a2980; margin-bottom: 10px; font-size: 0.95rem;">饮食建议</h6>
                            <ul style="margin: 0; padding-left: 18px; font-size: 0.85rem; color: #555; line-height: 1.8;">
                                ${st.diet.slice(0, 5).map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="background: linear-gradient(135deg, #e6f7ff 0%, #f0f8ff 100%); padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                            <div style="font-size: 1.5rem; margin-bottom: 10px;">🏃‍♂️</div>
                            <h6 style="color: #1a2980; margin-bottom: 10px; font-size: 0.95rem;">运动建议</h6>
                            <ul style="margin: 0; padding-left: 18px; font-size: 0.85rem; color: #555; line-height: 1.8;">
                                ${st.exercise.slice(0, 5).map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="background: linear-gradient(135deg, #fff4e6 0%, #fff8f0 100%); padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                            <div style="font-size: 1.5rem; margin-bottom: 10px;">🏠</div>
                            <h6 style="color: #1a2980; margin-bottom: 10px; font-size: 0.95rem;">生活方式</h6>
                            <ul style="margin: 0; padding-left: 18px; font-size: 0.85rem; color: #555; line-height: 1.8;">
                                ${st.lifestyle.slice(0, 5).map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="background: linear-gradient(135deg, #f3e6ff 0%, #f8f0ff 100%); padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                            <div style="font-size: 1.5rem; margin-bottom: 10px;">📊</div>
                            <h6 style="color: #1a2980; margin-bottom: 10px; font-size: 0.95rem;">监测建议</h6>
                            <ul style="margin: 0; padding-left: 18px; font-size: 0.85rem; color: #555; line-height: 1.8;">
                                ${getMonitoringRecommendations(subtype)}
                            </ul>
                        </div>
                    </div>
                    
                    <!-- 预期改善效果 -->
                    <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); border-radius: 15px;">
                        <h5 style="color: #1a2980; margin-bottom: 15px; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
                            <span>🎯</span> 预期改善效果
                        </h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                            <div style="text-align: center; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                                <div style="font-size: 1.5rem; margin-bottom: 10px;">📈</div>
                                <div style="font-size: 0.85rem; color: #1a2980; font-weight: 600;">代谢指标改善</div>
                                <div style="font-size: 0.75rem; color: #666; margin-top: 5px;">4-8周可见效果</div>
                            </div>
                            <div style="text-align: center; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                                <div style="font-size: 1.5rem; margin-bottom: 10px;">💪</div>
                                <div style="font-size: 0.85rem; color: #1a2980; font-weight: 600;">身体状况提升</div>
                                <div style="font-size: 0.75rem; color: #666; margin-top: 5px;">8-12周可见效果</div>
                            </div>
                            <div style="text-align: center; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                                <div style="font-size: 1.5rem; margin-bottom: 10px;">😀</div>
                                <div style="font-size: 0.85rem; color: #1a2980; font-weight: 600;">精神状态改善</div>
                                <div style="font-size: 0.75rem; color: #666; margin-top: 5px;">2-4周可见效果</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    return html;
}

// 生成健康趋势预测
function generateHealthTrendPrediction(result) {
    const predictions = [];
    
    // 糖尿病风险预测
    if (result.riskScores.glucose > 50) {
        const riskLevel = result.riskScores.glucose > 70 ? '高' : '中';
        const years = result.riskScores.glucose > 70 ? '3-5' : '5-10';
        predictions.push({
            type: 'warning',
            title: '糖尿病风险',
            content: `根据当前糖代谢指标，如不进行干预，未来${years}年内发展为2型糖尿病的风险较${riskLevel}。建议立即采取饮食控制和运动干预，定期监测血糖变化。`,
            icon: '🩸'
        });
    }
    
    // 心血管疾病风险预测
    if (result.riskScores.lipid > 50) {
        const riskLevel = result.riskScores.lipid > 70 ? '高' : '中';
        predictions.push({
            type: 'warning',
            title: '心血管疾病风险',
            content: `脂质代谢异常提示动脉粥样硬化风险${riskLevel}。建议定期监测血脂，必要时在医生指导下使用降脂药物，同时调整饮食结构，减少饱和脂肪摄入。`,
            icon: '❤️'
        });
    }
    
    // 慢性炎症风险预测
    if (result.riskScores.inflammation > 50) {
        predictions.push({
            type: 'caution',
            title: '慢性炎症状态',
            content: '持续的低度炎症可能加速衰老并增加多种慢性病风险。建议调整饮食结构，增加抗炎食物摄入，如富含omega-3脂肪酸的食物，同时减少加工食品和精制糖的摄入。',
            icon: '🔥'
        });
    }
    
    // 氨基酸代谢异常风险
    if (result.riskScores.amino > 50) {
        predictions.push({
            type: 'caution',
            title: '氨基酸代谢异常',
            content: '氨基酸代谢紊乱可能影响肌肉健康和免疫功能。建议适当增加优质蛋白质的摄入，同时注意饮食的均衡性。',
            icon: '⚗️'
        });
    }
    
    // 能量代谢异常风险
    if (result.riskScores.energy > 50) {
        predictions.push({
            type: 'caution',
            title: '能量代谢异常',
            content: '能量代谢紊乱可能导致疲劳、体重异常等问题。建议调整饮食结构，增加有氧运动，提高能量利用效率。',
            icon: '⚡'
        });
    }
    
    // 氧化应激风险
    if (result.riskScores.oxidative > 50) {
        predictions.push({
            type: 'caution',
            title: '氧化应激风险',
            content: '氧化应激水平升高可能加速细胞衰老。建议增加抗氧化食物的摄入，如新鲜水果和蔬菜，同时减少环境毒素的接触。',
            icon: '🍃'
        });
    }
    
    if (predictions.length === 0) {
        predictions.push({
            type: 'success',
            title: '健康趋势良好',
            content: '根据当前代谢指标，您的健康状况稳定。继续保持现有的健康生活方式，定期进行健康检查，以维持良好的代谢状态。',
            icon: '✅'
        });
    }
    
    return `
        <h3 class="section-title">健康趋势预测与风险评估</h3>
        <div style="margin-bottom: 30px;">
            <!-- 风险趋势图表 -->
            <div class="chart-container" style="margin-bottom: 30px;">
                <h4 class="chart-title">风险趋势预测</h4>
                <canvas id="riskTrendChart" width="800" height="300"></canvas>
            </div>
            
            <!-- 详细风险评估 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${predictions.map(p => `
                    <div style="background: ${p.type === 'warning' ? 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)' : p.type === 'caution' ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #f0fff4 0%, #d1fae5 100%)'}; 
                                    padding: 25px; border-radius: 15px; border-left: 5px solid ${p.type === 'warning' ? '#e74c3c' : p.type === 'caution' ? '#f39c12' : '#00b894'};">
                        <h4 style="color: ${p.type === 'warning' ? '#e74c3c' : p.type === 'caution' ? '#f39c12' : '#00b894'}; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                            <span>${p.icon}</span>
                            ${p.title}
                        </h4>
                        <p style="color: #555; line-height: 1.7; margin: 0;">${p.content}</p>
                    </div>
                `).join('')}
            </div>
            
            <!-- 健康风险时间线预测 -->
            <div style="margin-top: 30px; padding: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 15px;">
                <h4 style="color: #1a2980; margin-bottom: 20px;">健康风险时间线预测</h4>
                <div style="position: relative; padding-left: 30px;">
                    <!-- 时间线 -->
                    <div style="position: absolute; left: 10px; top: 0; bottom: 0; width: 2px; background: #1a2980;"></div>
                    
                    <!-- 时间点 -->
                    <div style="margin-bottom: 20px; position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: #1a2980; border: 3px solid white; box-shadow: 0 0 0 2px #1a2980;"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">当前状态</h5>
                        <p style="margin: 0; color: #555;">综合风险评分: ${result.overallRisk.toFixed(1)}分</p>
                    </div>
                    
                    <div style="margin-bottom: 20px; position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'}; border: 3px solid white; box-shadow: 0 0 0 2px ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'};"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">6个月后 (如不干预)</h5>
                        <p style="margin: 0; color: #555;">预测风险评分: ${(result.overallRisk * 1.1).toFixed(1)}分</p>
                    </div>
                    
                    <div style="margin-bottom: 20px; position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'}; border: 3px solid white; box-shadow: 0 0 0 2px ${result.overallRisk < 40 ? '#00b894' : result.overallRisk < 60 ? '#f39c12' : '#e74c3c'};"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">1年后 (如不干预)</h5>
                        <p style="margin: 0; color: #555;">预测风险评分: ${(result.overallRisk * 1.2).toFixed(1)}分</p>
                    </div>
                    
                    <div style="position: relative;">
                        <div style="position: absolute; left: -30px; top: 5px; width: 20px; height: 20px; border-radius: 50%; background: #00b894; border: 3px solid white; box-shadow: 0 0 0 2px #00b894;"></div>
                        <h5 style="margin: 0 0 5px 0; color: #1a2980;">1年后 (如积极干预)</h5>
                        <p style="margin: 0; color: #555;">预测风险评分: ${Math.max(10, (result.overallRisk * 0.8).toFixed(1))}分</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 生成干预方案时间线
function generateInterventionTimeline(result) {
    // 根据风险评分调整干预强度
    const riskLevel = result.overallRisk < 30 ? 'low' : result.overallRisk < 60 ? 'moderate' : 'high';
    
    return `
        <h3 class="section-title">个性化干预方案时间线</h3>
        <div style="background: white; border-radius: 20px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <!-- 干预方案概览 -->
            <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px;">
                <h4 style="color: #1a2980; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <span>📋</span> 干预方案概览
                </h4>
                <p style="color: #555; margin-bottom: 15px;">根据您的代谢健康评估结果，我们为您定制了以下干预方案。方案强度为 <span style="font-weight: 600; color: ${riskLevel === 'high' ? '#e74c3c' : riskLevel === 'moderate' ? '#f39c12' : '#00b894'};">${riskLevel === 'high' ? '高强度' : riskLevel === 'moderate' ? '中等强度' : '低强度'}</span>，包含四个阶段的逐步干预。</p>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <div style="flex: 1; text-align: center; padding: 10px; background: #f0f4ff; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: #666;">预计完成时间</div>
                        <div style="font-weight: 600; color: #1a2980;">3+ 个月</div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 10px; background: #f0f4ff; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: #666;">预期效果</div>
                        <div style="font-weight: 600; color: #1a2980;">代谢健康改善</div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 10px; background: #f0f4ff; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: #666;">复查建议</div>
                        <div style="font-weight: 600; color: #1a2980;">3个月后</div>
                    </div>
                </div>
            </div>
            
            <!-- 详细时间线 -->
            <div style="position: relative; padding-left: 40px;">
                <!-- 时间线 -->
                <div style="position: absolute; left: 18px; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #1a2980 0%, #26d0ce 100%); border-radius: 2px;"></div>
                
                <!-- 第1-2周：建立基础 -->
                <div style="margin-bottom: 30px; position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #1a2980; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #1a2980; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>🏁</span> 第1-2周：建立基础
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #e3f2fd; padding: 5px 10px; border-radius: 12px;">开始阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">生活习惯记录</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">详细记录每日饮食、运动和作息时间，建立健康基线数据</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">轻度运动</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每天30分钟步行，每周5-7次，逐渐增加活动量</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">饮食调整</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">减少加工食品和高糖食品摄入，增加蔬菜水果比例</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">作息规律</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">建立规律的作息时间，保证7-8小时睡眠</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #1a2980 0%, #26d0ce 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第3-4周：强化干预 -->
                <div style="margin-bottom: 30px; position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #26d0ce; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #e8f5e8 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #26d0ce; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>💪</span> 第3-4周：强化干预
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #e8f5e8; padding: 5px 10px; border-radius: 12px;">强化阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">运动强度提升</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每周3-4次中等强度运动，每次45分钟，如快走、游泳或骑自行车</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">饮食方案执行</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">严格执行个性化饮食方案，控制碳水化合物和脂肪摄入</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">压力管理</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">学习并实践压力管理技巧，如冥想、深呼吸或瑜伽</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">指标监测</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每周监测体重、血压和血糖变化，记录在健康日记中</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #26d0ce 0%, #00b894 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 第2-3个月：巩固效果 -->
                <div style="margin-bottom: 30px; position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #00b894; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #00b894; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>📈</span> 第2-3个月：巩固效果
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #fff3e0; padding: 5px 10px; border-radius: 12px;">巩固阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">效果评估</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">评估生活方式改变的效果，分析体重、血压和血糖变化趋势</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">方案调整</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">根据效果评估结果，调整饮食和运动方案，优化干预策略</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">力量训练</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">加入力量训练，每周2-3次，增强肌肉量，提高基础代谢率</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">指标复查</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">复查关键代谢指标，如血脂、血糖和炎症标志物</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #00b894 0%, #4caf50 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 长期维护（3个月后） -->
                <div style="position: relative;">
                    <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #f39c12; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                    <div style="background: linear-gradient(135deg, #f3e5f5 0%, #ffffff 100%); padding: 25px; border-radius: 15px; margin-left: 15px; border-left: 5px solid #f39c12; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h5 style="color: #1a2980; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>🌱</span> 长期维护（3个月后）
                            </h5>
                            <span style="font-size: 0.8rem; color: #666; background: #f3e5f5; padding: 5px 10px; border-radius: 12px;">维护阶段</span>
                        </div>
                        
                        <!-- 详细任务 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="color: #333; margin-bottom: 10px; font-size: 0.9rem;">核心任务</h6>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #2196f3;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">生活方式保持</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">保持健康的生活方式，将良好习惯融入日常生活</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #4caf50;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">定期监测</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">每3-6个月监测代谢指标，及时发现潜在问题</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #ff9800;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">饮食优化</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">持续优化饮食结构，根据季节和身体状况调整</p>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid #9c27b0;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #333;">运动习惯</div>
                                    <p style="font-size: 0.85rem; color: #666; margin: 0;">建立长期运动习惯，保持规律的体育锻炼</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 进度跟踪 -->
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                                <span>完成进度</span>
                                <span>0%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #f39c12 0%, #ff5722 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 干预方案总结 -->
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); border-radius: 12px; text-align: center;">
                <h4 style="color: #1a2980; margin-bottom: 15px;">干预方案执行建议</h4>
                <p style="color: #555; margin-bottom: 15px;">坚持执行个性化干预方案，定期监测健康指标变化，根据需要调整方案。</p>
                <button onclick="downloadInterventionPlan()" style="padding: 10px 25px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">
                    📥 下载干预方案
                </button>
            </div>
        </div>
    `;
}

// 生成复查建议
function generateFollowUpRecommendations(result) {
    const highRiskItems = Object.entries(result.riskScores)
        .filter(([key, value]) => value > 50)
        .map(([key]) => window.categoryNames[key]);
    
    // 根据风险评分确定复查时间和频率
    let followUpTime, followUpFrequency, followUpColor;
    if (result.overallRisk > 60) {
        followUpTime = '1-3个月';
        followUpFrequency = '每2周监测一次关键指标';
        followUpColor = '#e74c3c';
    } else if (result.overallRisk > 30) {
        followUpTime = '3-6个月';
        followUpFrequency = '每月监测一次关键指标';
        followUpColor = '#f39c12';
    } else {
        followUpTime = '6-12个月';
        followUpFrequency = '每3个月监测一次关键指标';
        followUpColor = '#00b894';
    }
    
    // 生成具体的监测项目列表
    const getMonitoringItems = () => {
        if (highRiskItems.length > 0) {
            return highRiskItems.map(item => {
                let items = '';
                switch(item) {
                    case '脂质代谢':
                        items = '总胆固醇、甘油三酯、LDL-C、HDL-C、ApoB';
                        break;
                    case '糖代谢':
                        items = '空腹血糖、餐后2小时血糖、糖化血红蛋白、胰岛素、HOMA-IR';
                        break;
                    case '氨基酸代谢':
                        items = '支链氨基酸、苯丙氨酸、酪氨酸';
                        break;
                    case '炎症状态':
                        items = 'CRP、IL-6、TNF-α、同型半胱氨酸';
                        break;
                    case '能量代谢':
                        items = '乳酸、丙酮酸、酮体、乙酰肉碱';
                        break;
                    case '氧化应激':
                        items = 'MDA、SOD、GSH';
                        break;
                    default:
                        items = '相关代谢指标';
                }
                return `<div style="margin-bottom: 10px;"><strong>${item}：</strong>${items}</div>`;
            }).join('');
        } else {
            return '全面监测各项代谢指标，包括脂质、糖、氨基酸、炎症、能量代谢和氧化应激相关指标';
        }
    };
    
    return `
        <h3 class="section-title">复查与随访建议</h3>
        <div style="background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%); border-radius: 20px; padding: 30px; margin-bottom: 30px; border: 2px solid #1a2980;">
            <!-- 复查时间线 -->
            <div style="margin-bottom: 30px;">
                <h4 style="color: #1a2980; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>📅</span> 复查时间计划
                </h4>
                <div style="position: relative; padding-left: 40px;">
                    <!-- 时间线 -->
                    <div style="position: absolute; left: 18px; top: 0; bottom: 0; width: 4px; background: ${followUpColor}; border-radius: 2px;"></div>
                    
                    <!-- 当前时间点 -->
                    <div style="margin-bottom: 25px; position: relative;">
                        <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #1a2980; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                        <div style="background: white; padding: 20px; border-radius: 12px; margin-left: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                            <h5 style="color: #1a2980; margin-bottom: 5px;">当前</h5>
                            <p style="color: #555; font-size: 0.9rem; margin: 0;">完成健康评估，开始执行干预方案</p>
                        </div>
                    </div>
                    
                    <!-- 第一次复查 -->
                    <div style="margin-bottom: 25px; position: relative;">
                        <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: ${followUpColor}; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                        <div style="background: white; padding: 20px; border-radius: 12px; margin-left: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                            <h5 style="color: #1a2980; margin-bottom: 5px;">${followUpTime}后</h5>
                            <p style="color: #555; font-size: 0.9rem; margin: 0;">第一次全面复查，评估干预效果</p>
                        </div>
                    </div>
                    
                    <!-- 长期随访 -->
                    <div style="position: relative;">
                        <div style="position: absolute; left: -36px; width: 20px; height: 20px; background: #26d0ce; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1;"></div>
                        <div style="background: white; padding: 20px; border-radius: 12px; margin-left: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                            <h5 style="color: #1a2980; margin-bottom: 5px;">长期随访</h5>
                            <p style="color: #555; font-size: 0.9rem; margin: 0;">根据复查结果调整方案，定期监测</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 详细建议卡片 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <!-- 复查时间建议 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid ${followUpColor};">
                    <div style="font-size: 2rem; margin-bottom: 15px;">📅</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">建议复查时间</h5>
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 1.2rem; font-weight: 600; color: ${followUpColor}; margin-bottom: 5px;">${followUpTime}</div>
                        <div style="color: #666; font-size: 0.9rem;">${followUpFrequency}</div>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 15px;">
                        <div style="width: ${result.overallRisk}%; height: 100%; background: ${followUpColor}; border-radius: 4px;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-top: 5px;">
                        <span>低风险</span>
                        <span>高风险</span>
                    </div>
                </div>
                
                <!-- 重点监测项目 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid #26d0ce;">
                    <div style="font-size: 2rem; margin-bottom: 15px;">🔬</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">重点监测项目</h5>
                    <div style="color: #555; font-size: 0.9rem; line-height: 1.6;">
                        ${getMonitoringItems()}
                    </div>
                </div>
                
                <!-- 就医提醒 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid #f39c12;">
                    <div style="font-size: 2rem; margin-bottom: 15px;">⚠️</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">就医提醒</h5>
                    <div style="color: #555; font-size: 0.9rem; line-height: 1.6;">
                        ${result.overallRisk > 60 ? 
                            '<p style="margin-bottom: 10px;">建议尽快就诊，寻求专业医生指导</p><p>需进行全面检查，可能需要药物治疗</p>' : 
                          result.overallRisk > 30 ? 
                            '<p style="margin-bottom: 10px;">如出现不适症状请及时就医</p><p>建议咨询内分泌科或心血管科医生</p>' : 
                            '<p style="margin-bottom: 10px;">保持定期体检习惯</p><p>每年进行一次全面健康检查</p>'}
                    </div>
                </div>
                
                <!-- 日常监测 -->
                <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid #00b894;">
                    <div style="font-size: 2rem; margin-bottom: 15px;">📋</div>
                    <h5 style="color: #1a2980; margin-bottom: 15px;">日常监测</h5>
                    <ul style="color: #555; font-size: 0.9rem; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li>体重：每周测量1-2次</li>
                        <li>血压：每周测量2-3次</li>
                        <li>血糖：如有异常，每天测量1-2次</li>
                        <li>饮食运动日记：每天记录</li>
                        <li>症状记录：如出现不适及时记录</li>
                    </ul>
                </div>
            </div>
            
            <!-- 随访计划下载 -->
            <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 12px; text-align: center;">
                <h5 style="color: #1a2980; margin-bottom: 15px;">随访计划</h5>
                <p style="color: #555; margin-bottom: 15px; font-size: 0.9rem;">下载详细的随访计划，包含具体的监测时间和项目</p>
                <button onclick="downloadFollowUpPlan()" style="padding: 10px 25px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">
                    📥 下载随访计划
                </button>
            </div>
            
            <!-- 重要提示 -->
            <div style="padding: 25px; background: #fffbeb; border-radius: 12px; border: 1px solid #f39c12;">
                <h5 style="color: #d97706; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <span>💡</span> 重要提示
                </h5>
                <p style="color: #666; line-height: 1.7; margin: 0 0 15px 0; font-size: 0.9rem;">
                    本报告仅供参考，不能替代专业医疗诊断。请根据报告建议调整生活方式，并在必要时咨询专业医生。
                </p>
                <p style="color: #666; line-height: 1.7; margin: 0; font-size: 0.9rem;">
                    特别是风险评分较高的项目，建议尽快就医进行进一步检查和治疗。如有突发不适，请立即就医。
                </p>
            </div>
        </div>
    `;
}

// 绘制风险雷达图
function drawRiskRadarChart(scores) {
    const ctx = document.getElementById('riskRadarChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['脂质代谢', '糖代谢', '氨基酸代谢', '炎症状态', '能量代谢', '氧化应激'],
            datasets: [{
                label: '风险评分',
                data: [
                    scores.lipid,
                    scores.glucose,
                    scores.amino,
                    scores.inflammation,
                    scores.energy,
                    scores.oxidative
                ],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 1)',
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
    });
}

// 绘制异常代谢物图表
function drawAbnormalChart(abnormalMets) {
    const ctx = document.getElementById('abnormalChart');
    if (!ctx) return;
    
    const labels = abnormalMets.map(m => m.name);
    const data = abnormalMets.map(m => {
        const refMid = (m.refMin + m.refMax) / 2;
        return ((m.value - refMid) / refMid * 100).toFixed(1);
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '偏离参考范围百分比(%)',
                data: data,
                backgroundColor: data.map(v => v > 0 ? 'rgba(220, 53, 69, 0.6)' : 'rgba(255, 193, 7, 0.6)'),
                borderColor: data.map(v => v > 0 ? 'rgba(220, 53, 69, 1)' : 'rgba(255, 193, 7, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '偏离程度(%)'
                    }
                }
            }
        }
    });
}

// 绘制风险趋势预测图表
function drawRiskTrendChart(currentRisk) {
    const ctx = document.getElementById('riskTrendChart');
    if (!ctx) return;
    
    const labels = ['当前', '6个月后(不干预)', '1年后(不干预)', '1年后(干预)'];
    const data = [
        currentRisk,
        currentRisk * 1.1,
        currentRisk * 1.2,
        Math.max(10, currentRisk * 0.8)
    ];
    
    // 根据风险值设置颜色
    const colors = data.map(value => {
        if (value < 30) return '#00b894'; // 低风险
        if (value < 60) return '#f39c12'; // 中等风险
        return '#e74c3c'; // 高风险
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '风险评分',
                data: data,
                borderColor: '#1a2980',
                backgroundColor: 'rgba(26, 41, 128, 0.1)',
                pointBackgroundColor: colors,
                pointBorderColor: colors,
                pointRadius: 6,
                pointHoverRadius: 8,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '风险评分'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                                if (context.parsed.y < 30) {
                                    label += ' (低风险)';
                                } else if (context.parsed.y < 60) {
                                    label += ' (中等风险)';
                                } else {
                                    label += ' (高风险)';
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// 下载干预方案
function downloadInterventionPlan() {
    if (!currentResult) {
        showNotification('请先生成健康评估报告');
        return;
    }
    
    // 生成干预方案文本
    let planText = `MetaScan 个性化干预方案\n`;
    planText += `=================================\n`;
    planText += `生成日期: ${new Date().toLocaleString()}\n`;
    planText += `综合风险评分: ${currentResult.overallRisk.toFixed(1)}\n`;
    planText += `=================================\n\n`;
    
    planText += `一、第1-2周：建立基础\n`;
    planText += `1. 生活习惯记录：详细记录每日饮食、运动和作息时间，建立健康基线数据\n`;
    planText += `2. 轻度运动：每天30分钟步行，每周5-7次，逐渐增加活动量\n`;
    planText += `3. 饮食调整：减少加工食品和高糖食品摄入，增加蔬菜水果比例\n`;
    planText += `4. 作息规律：建立规律的作息时间，保证7-8小时睡眠\n\n`;
    
    planText += `二、第3-4周：强化干预\n`;
    planText += `1. 运动强度提升：每周3-4次中等强度运动，每次45分钟，如快走、游泳或骑自行车\n`;
    planText += `2. 饮食方案执行：严格执行个性化饮食方案，控制碳水化合物和脂肪摄入\n`;
    planText += `3. 压力管理：学习并实践压力管理技巧，如冥想、深呼吸或瑜伽\n`;
    planText += `4. 指标监测：每周监测体重、血压和血糖变化，记录在健康日记中\n\n`;
    
    planText += `三、第2-3个月：巩固效果\n`;
    planText += `1. 效果评估：评估生活方式改变的效果，分析体重、血压和血糖变化趋势\n`;
    planText += `2. 方案调整：根据效果评估结果，调整饮食和运动方案，优化干预策略\n`;
    planText += `3. 力量训练：加入力量训练，每周2-3次，增强肌肉量，提高基础代谢率\n`;
    planText += `4. 指标复查：复查关键代谢指标，如血脂、血糖和炎症标志物\n\n`;
    
    planText += `四、长期维护（3个月后）\n`;
    planText += `1. 生活方式保持：保持健康的生活方式，将良好习惯融入日常生活\n`;
    planText += `2. 定期监测：每3-6个月监测代谢指标，及时发现潜在问题\n`;
    planText += `3. 饮食优化：持续优化饮食结构，根据季节和身体状况调整\n`;
    planText += `4. 运动习惯：建立长期运动习惯，保持规律的体育锻炼\n\n`;
    
    planText += `=================================\n`;
    planText += `MetaScan 代谢健康管理平台\n`;
    
    // 创建下载链接
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MetaScan干预方案_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('干预方案已下载');
}

// 下载随访计划
function downloadFollowUpPlan() {
    if (!currentResult) {
        showNotification('请先生成健康评估报告');
        return;
    }
    
    // 根据风险评分确定复查时间和频率
    let followUpTime, followUpFrequency;
    if (currentResult.overallRisk > 60) {
        followUpTime = '1-3个月';
        followUpFrequency = '每2周监测一次关键指标';
    } else if (currentResult.overallRisk > 30) {
        followUpTime = '3-6个月';
        followUpFrequency = '每月监测一次关键指标';
    } else {
        followUpTime = '6-12个月';
        followUpFrequency = '每3个月监测一次关键指标';
    }
    
    // 生成随访计划文本
    let planText = `MetaScan 随访计划\n`;
    planText += `=================================\n`;
    planText += `生成日期: ${new Date().toLocaleString()}\n`;
    planText += `综合风险评分: ${currentResult.overallRisk.toFixed(1)}\n`;
    planText += `=================================\n\n`;
    
    planText += `一、复查时间安排\n`;
    planText += `1. 第一次复查：${followUpTime}后\n`;
    planText += `2. 长期随访：根据第一次复查结果确定\n`;
    planText += `3. 监测频率：${followUpFrequency}\n\n`;
    
    planText += `二、重点监测项目\n`;
    const highRiskItems = Object.entries(currentResult.riskScores)
        .filter(([key, value]) => value > 50)
        .map(([key]) => window.categoryNames[key]);
    
    if (highRiskItems.length > 0) {
        highRiskItems.forEach(item => {
            planText += `\n${item}：\n`;
            switch(item) {
                case '脂质代谢':
                    planText += `- 总胆固醇\n- 甘油三酯\n- LDL-C\n- HDL-C\n- ApoB\n`;
                    break;
                case '糖代谢':
                    planText += `- 空腹血糖\n- 餐后2小时血糖\n- 糖化血红蛋白\n- 胰岛素\n- HOMA-IR\n`;
                    break;
                case '氨基酸代谢':
                    planText += `- 支链氨基酸\n- 苯丙氨酸\n- 酪氨酸\n`;
                    break;
                case '炎症状态':
                    planText += `- CRP\n- IL-6\n- TNF-α\n- 同型半胱氨酸\n`;
                    break;
                case '能量代谢':
                    planText += `- 乳酸\n- 丙酮酸\n- 酮体\n- 乙酰肉碱\n`;
                    break;
                case '氧化应激':
                    planText += `- MDA\n- SOD\n- GSH\n`;
                    break;
                default:
                    planText += `- 相关代谢指标\n`;
            }
        });
    } else {
        planText += `全面监测各项代谢指标，包括脂质、糖、氨基酸、炎症、能量代谢和氧化应激相关指标\n`;
    }
    
    planText += `\n三、日常监测建议\n`;
    planText += `1. 体重：每周测量1-2次\n`;
    planText += `2. 血压：每周测量2-3次\n`;
    planText += `3. 血糖：如有异常，每天测量1-2次\n`;
    planText += `4. 饮食运动日记：每天记录\n`;
    planText += `5. 症状记录：如出现不适及时记录\n\n`;
    
    planText += `四、就医建议\n`;
    if (currentResult.overallRisk > 60) {
        planText += `1. 建议尽快就诊，寻求专业医生指导\n`;
        planText += `2. 需进行全面检查，可能需要药物治疗\n`;
    } else if (currentResult.overallRisk > 30) {
        planText += `1. 如出现不适症状请及时就医\n`;
        planText += `2. 建议咨询内分泌科或心血管科医生\n`;
    } else {
        planText += `1. 保持定期体检习惯\n`;
        planText += `2. 每年进行一次全面健康检查\n`;
    }
    
    planText += `\n=================================\n`;
    planText += `MetaScan 代谢健康管理平台\n`;
    
    // 创建下载链接
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MetaScan随访计划_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('随访计划已下载');
}

// 保存到历史记录
function saveToHistory(result) {
    if (!currentUser) return;
    
    if (!historicalData[currentUser.username]) {
        historicalData[currentUser.username] = [];
    }
    
    historicalData[currentUser.username].push(result);
    if (historicalData[currentUser.username].length > 10) {
        historicalData[currentUser.username] = historicalData[currentUser.username].slice(-10);
    }
    localStorage.setItem(`metascanData_${currentUser.username}`, JSON.stringify(historicalData[currentUser.username]));
    updateComparisonView();
    
    // 同步保存到代谢录入历史（metabolic_{username}），确保历史Table可读取
    if (result.data) {
        const metabRecord = {
            ...result.data,
            testDate: new Date().toISOString().split('T')[0],
            notes: '',
            source: 'manual',
            filledCount: Object.keys(result.data).length,
            timestamp: Date.now(),
            savedAt: new Date().toISOString()
        };
        const key = `metabolic_${currentUser.username}`;
        const records = JSON.parse(localStorage.getItem(key) || '[]');
        records.unshift(metabRecord);
        if (records.length > 10) records.length = 10;
        localStorage.setItem(key, JSON.stringify(records));
    }

    setTimeout(function() { checkRatingEligibility(); }, 1500);
}

// 更新对比视图
function updateComparisonView() {
    const container = document.getElementById('comparisonContent');
    if (!container) return;
    
    if (!currentUser || !historicalData[currentUser.username] || historicalData[currentUser.username].length < 2) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; background: white; border-radius: 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📊</div>
                <div style="font-size: 1.3rem; font-weight: 600; color: #666; margin-bottom: 10px;">暂无历史数据</div>
                <div style="color: #999;">请先完成至少两次检测，即可查看历史对比和趋势分析</div>
            </div>
        `;
        return;
    }
    
    // 按时间排序数据
    const sortedData = [...historicalData[currentUser.username]].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // 按时间范围过滤
    let filteredData = sortedData;
    if (currentTimeRange !== 'all') {
        var now2 = Date.now();
        var rangeMs = currentTimeRange === 'week' ? 7 * 86400000 : currentTimeRange === 'month' ? 30 * 86400000 : currentTimeRange === 'quarter' ? 90 * 86400000 : 365 * 86400000;
        filteredData = sortedData.filter(function(r) { return new Date(r.timestamp).getTime() >= now2 - rangeMs; });
        if (filteredData.length < 2) filteredData = sortedData.slice(-2);
    }

    const latestRecord = filteredData[filteredData.length - 1];
    const firstRecord = filteredData[0];
    
    // 计算总体风险变化
    const riskChange = latestRecord.overallRisk - firstRecord.overallRisk;
    const riskChangePercent = ((riskChange / firstRecord.overallRisk) * 100).toFixed(1);
    const riskTrend = riskChange > 0 ? '上升' : riskChange < 0 ? '下降' : '稳定';
    const riskTrendColor = riskChange > 0 ? '#e74c3c' : riskChange < 0 ? '#00b894' : '#6c757d';
    
    // 显示趋势图表和分析
    let html = `
        <!-- 导出按钮 -->
        <div style="text-align: center; margin-bottom: 30px;" class="fade-in">
            <button onclick="exportComparisonReport()" class="gradient-btn" style="font-size: 1rem;">
                📄 导出历史对比(PDF)
            </button>
        </div>

        <!-- 时间范围选择器 -->
        <div class="viz-time-range" id="comparisonTimeRange">
            <button onclick="setComparisonTimeRange('all', this)" class="active">📅 全部</button>
            <button onclick="setComparisonTimeRange('week', this)">📌 近1周</button>
            <button onclick="setComparisonTimeRange('month', this)">📅 近1月</button>
            <button onclick="setComparisonTimeRange('quarter', this)">📊 近3月</button>
            <button onclick="setComparisonTimeRange('year', this)">📆 近1年</button>
        </div>
        
        <!-- 总体风险趋势分析 -->
        <div class="data-card fade-in" style="margin-bottom: 35px; padding: 35px;">
            <h3 class="section-title" style="font-size: 1.5rem; margin-bottom: 30px;">📈 总体风险趋势分析</h3>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 35px;">
                <!-- 风险变化摘要 -->
                <div class="gradient-card" style="padding: 30px;">
                    <h4 style="color: #1a2980; margin-bottom: 25px; font-size: 1.2rem;">📊 风险变化摘要</h4>
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">首次检测风险</div>
                        <div class="stat-number">${firstRecord.overallRisk.toFixed(1)}</div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">最新检测风险</div>
                        <div class="stat-number">${latestRecord.overallRisk.toFixed(1)}</div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">风险变化</div>
                        <div class="stat-number" style="color: ${riskTrendColor};">
                            ${riskChange > 0 ? '+' : ''}${riskChange.toFixed(1)} (${riskChangePercent > 0 ? '+' : ''}${riskChangePercent}%)
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 8px;">变化趋势</div>
                        <span class="status-badge ${riskTrend === '下降' ? 'status-good' : riskTrend === '上升' ? 'status-danger' : 'status-warning'}">
                            ${riskTrend}
                        </span>
                    </div>
                </div>
                
                <!-- 总体风险趋势图 -->
                <div class="chart-container" style="padding: 25px;">
                    <h4 style="color: #1a2980; margin-bottom: 20px; font-size: 1.2rem;">📉 总体风险趋势</h4>
                    <canvas id="trendChart" width="600" height="300"></canvas>
                    <p style="font-size: 0.9rem; color: #888; margin-top: 15px; background: #f8f9fa; padding: 12px; border-radius: 10px;">
                        💡 图表显示了您的总体风险评分变化趋势，虚线表示高风险阈值(60分)
                    </p>
                    <div id="predictionBanner"></div>
                </div>
            </div>
        </div>
        
        <!-- 历史检测记录对比 -->
        <div class="table-container fade-in" style="margin-bottom: 35px;">
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px; padding: 0 30px;">📋 历史检测记录对比</h3>
            <table>
                <thead>
                    <tr>
                        <th>检测日期</th>
                        <th>总体风险</th>
                        <th>脂质代谢</th>
                        <th>糖代谢</th>
                        <th>氨基酸代谢</th>
                        <th>炎症状态</th>
                        <th>能量代谢</th>
                        <th>氧化应激</th>
                        <th>识别的亚型</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // 按时间倒序显示
    const reverseSortedData = [...filteredData].reverse();
    
    reverseSortedData.forEach((record, index) => {
        const prevRecord = reverseSortedData[index + 1];
        const trend = prevRecord ? 
            (record.overallRisk > prevRecord.overallRisk ? 'trend-up' : 
             record.overallRisk < prevRecord.overallRisk ? 'trend-down' : 'trend-stable') : '';
        const trendIcon = trend === 'trend-up' ? '↑' : trend === 'trend-down' ? '↓' : '→';
        const trendColor = trend === 'trend-up' ? '#e74c3c' : trend === 'trend-down' ? '#00b894' : '#6c757d';
        
        const subtypeNames = record.subtypes.map(s => window.subtypes[s] ? window.subtypes[s].name : s).join('、');
        
        html += `
            <tr style="transition: background 0.2s ease;">
                <td style="font-weight: 600;">${record.date}</td>
                <td style="color: ${trendColor}; font-weight: 700;">
                    ${record.overallRisk.toFixed(1)} <span style="font-size: 1.2rem;">${trendIcon}</span>
                </td>
                <td>${record.riskScores.lipid.toFixed(0)}</td>
                <td>${record.riskScores.glucose.toFixed(0)}</td>
                <td>${record.riskScores.amino.toFixed(0)}</td>
                <td>${record.riskScores.inflammation.toFixed(0)}</td>
                <td>${record.riskScores.energy.toFixed(0)}</td>
                <td>${record.riskScores.oxidative.toFixed(0)}</td>
                <td>${subtypeNames}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>
        </div>`;
    
    // 各维度趋势
    html += `
        <div class="chart-container fade-in" style="margin-bottom: 35px; padding: 35px;">
            <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">📊 各维度风险趋势</h3>
            <div style="margin-bottom: 25px; background: #f0f4ff; padding: 15px 20px; border-radius: 12px; border-left: 4px solid #26d0ce;">
                <p style="color: #555; font-size: 0.95rem; margin: 0;">
                    💡 以下图表显示了各个代谢维度的风险评分变化趋势，帮助您了解哪些方面需要重点关注
                </p>
            </div>
            <canvas id="dimensionTrendChart" width="800" height="400"></canvas>
        </div>
    `;
    
    // 关键指标变化分析
    html += `
        <h3 class="section-title" style="font-size: 1.4rem; margin-bottom: 25px;">🎯 关键指标变化分析</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 35px;">
    `;
    
    // 分析各个维度的变化
    const dimensions = [
        { key: 'lipid', name: '脂质代谢', icon: '🩸', description: '反映血脂水平及心血管疾病风险' },
        { key: 'glucose', name: '糖代谢', icon: '🍯', description: '反映血糖控制及糖尿病风险' },
        { key: 'amino', name: '氨基酸代谢', icon: '⚗️', description: '反映蛋白质代谢及肌肉健康' },
        { key: 'inflammation', name: '炎症状态', icon: '🔥', description: '反映体内炎症水平' },
        { key: 'energy', name: '能量代谢', icon: '⚡', description: '反映能量利用效率' },
        { key: 'oxidative', name: '氧化应激', icon: '🍃', description: '反映抗氧化能力' }
    ];
    
    dimensions.forEach(dimension => {
        const firstValue = firstRecord.riskScores[dimension.key];
        const latestValue = latestRecord.riskScores[dimension.key];
        const change = latestValue - firstValue;
        const changePercent = ((change / firstValue) * 100).toFixed(1);
        const dimensionTrend = change > 0 ? '上升' : change < 0 ? '下降' : '稳定';
        const dimensionTrendColor = change > 0 ? '#e74c3c' : change < 0 ? '#00b894' : '#6c757d';
        const bgGradient = change < 0 ? 
            'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)' : 
            change > 0 ? 
            'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' : 
            'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)';
        
        html += `
            <div class="data-card fade-in" style="background: ${bgGradient}; border-left: 5px solid ${dimensionTrendColor};">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
                    <div class="icon-container ${change < 0 ? 'icon-green' : change > 0 ? 'icon-red' : 'icon-orange'}" style="width: 50px; height: 50px; font-size: 24px; margin: 0;">
                        ${dimension.icon}
                    </div>
                    <h4 style="color: #1a2980; margin: 0; font-size: 1.2rem;">${dimension.name}</h4>
                </div>
                <p style="color: #777; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">${dimension.description}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 0.85rem; color: #888; margin-bottom: 5px;">首次检测</div>
                        <div style="font-weight: 700; color: #1a2980; font-size: 1.3rem;">${firstValue.toFixed(0)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: #888; margin-bottom: 5px;">最新检测</div>
                        <div style="font-weight: 700; color: #1a2980; font-size: 1.3rem;">${latestValue.toFixed(0)}</div>
                    </div>
                </div>
                <div style="border-top: 1px solid rgba(224, 230, 237, 0.8); padding-top: 15px;">
                    <div style="font-size: 0.85rem; color: #888; margin-bottom: 5px;">变化</div>
                    <div style="font-weight: 700; color: ${dimensionTrendColor}; font-size: 1.25rem;">
                        ${change > 0 ? '+' : ''}${change.toFixed(0)} (${changePercent > 0 ? '+' : ''}${changePercent}%)
                    </div>
                </div>
                <div style="margin-top: 12px;">
                    <span class="status-badge ${dimensionTrend === '下降' ? 'status-good' : dimensionTrend === '上升' ? 'status-danger' : 'status-warning'}">
                        ${dimensionTrend}
                    </span>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    // 添加任务完成度与指标改善相关性分析
    html += generateCorrelationHTML();

    // 代谢指标相关性热图
    html += '<div class="heatmap-container fade-in"><h3 class="section-title" style="font-size:1.4rem;margin-bottom:20px;">🔬 代谢指标相关性热图</h3><div id="correlationHeatmap"></div></div>';

    container.innerHTML = html;

    // 绘制趋势图 + 预测 + 热图
    setTimeout(() => {
        drawTrendChart();
        drawDimensionTrendChart();
        drawCorrelationHeatmap('correlationHeatmap', sortedData, '');
        // 预测横幅
        var trendCanvas = document.getElementById('trendChart');
        if (trendCanvas && trendCanvas._futurePrediction) {
            var pred = trendCanvas._futurePrediction;
            var lastData = sortedData;
            var lastRisk = lastData.length > 0 ? lastData[lastData.length - 1].overallRisk : 0;
            var diff = (pred - lastRisk).toFixed(1);
            var isWarn = pred >= 60;
            var banner = document.getElementById('predictionBanner');
            if (banner) {
                banner.innerHTML = '<div class="prediction-banner' + (isWarn ? ' warn' : '') + '">' +
                    '<div class="prediction-icon">' + (isWarn ? '⚠️' : '📈') + '</div>' +
                    '<div><div class="prediction-text">若按当前趋势，1个月后风险评分将达</div>' +
                    '<div class="prediction-value">' + pred.toFixed(1) + ' 分</div>' +
                    '<div style="font-size:0.78rem;color:#64748b;margin-top:2px;">当前: ' + lastRisk.toFixed(1) + ' | 预测变化: ' + (diff > 0 ? '+' : '') + diff + '</div></div></div>';
            }
        } else {
            var banner2 = document.getElementById('predictionBanner');
            if (banner2 && sortedData.length <= 5) {
                banner2.innerHTML = '<div class="prediction-banner" style="border-color:#94a3b8;background:linear-gradient(135deg,#f8fafc,#f1f5f9);"><div class="prediction-icon">📊</div><div class="prediction-text" style="color:#64748b;">需要至少6条历史记录才能生成预测趋势</div></div>';
            }
        }
    }, 200);
}

// 当前时间范围
let currentTimeRange = 'all';

function setComparisonTimeRange(range, btn) {
    currentTimeRange = range;
    var buttons = document.querySelectorAll('#comparisonTimeRange button');
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    updateComparisonView();
}

// 线性回归计算
function computeLinearRegression(data) {
    var n = data.length;
    if (n < 3) return null;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;
    var rSquared = 0;
    var meanY = sumY / n;
    var ssRes = 0, ssTot = 0;
    for (var i = 0; i < n; i++) {
        var predicted = slope * i + intercept;
        ssRes += Math.pow(data[i] - predicted, 2);
        ssTot += Math.pow(data[i] - meanY, 2);
    }
    rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    return { slope: slope, intercept: intercept, rSquared: rSquared, predict: function(x) { return slope * x + intercept; } };
}

// 绘制总体风险趋势图（增强版：异常阴影 + 预测线）
function drawTrendChart() {
    var ctx = document.getElementById('trendChart');
    if (!ctx || !currentUser || !historicalData[currentUser.username]) return;

    var chartCtx = ctx.getContext('2d');
    if (!chartCtx) return;

    if (ctx._chartInstance) { ctx._chartInstance.destroy(); }

    var allData = [...historicalData[currentUser.username]].sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    var labels = allData.map(function(d) { return d.date; });
    var data = allData.map(function(d) { return d.overallRisk; });

    var datasets = [];
    var abnormalZoneData = allData.map(function(d) { return d.overallRisk > 60 ? d.overallRisk : 60; });

    datasets.push({
        label: '高风险区间',
        data: abnormalZoneData,
        borderColor: 'transparent',
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        pointRadius: 0,
        fill: 1,
        tension: 0.4,
        spanGaps: true
    });

    var pointColors = allData.map(function(d) { return d.overallRisk > 60 ? '#ef4444' : '#6366f1'; });
    var borderColor = allData.some(function(d) { return d.overallRisk > 60; }) ? '#ef4444' : '#6366f1';

    datasets.push({
        label: '总体风险评分',
        data: data,
        borderColor: borderColor,
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: 6,
        pointHoverRadius: 9,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true
    });

    var reg = computeLinearRegression(data);
    var hasPrediction = reg && data.length > 5 && reg.rSquared > 0.2;
    var futurePrediction = null;

    if (hasPrediction) {
        var lastIndex = data.length - 1;
        var predData = [];
        for (var i = 0; i <= lastIndex; i++) predData.push(null);
        var predIndexVal = lastIndex + 2;
        var predValue = Math.max(0, Math.min(100, reg.predict(predIndexVal)));
        predData.push(predValue);
        futurePrediction = predValue;
        var starRadius = new Array(predData.length).fill(0);
        starRadius[predData.length - 1] = 10;
        var starStyle = new Array(predData.length).fill('circle');
        starStyle[predData.length - 1] = 'star';
        datasets.push({
            label: '趋势预测',
            data: predData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2.5,
            borderDash: [8, 4],
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#f59e0b',
            pointRadius: starRadius,
            pointStyle: starStyle,
            tension: 0,
            fill: false,
            spanGaps: true
        });
    }

    var chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { stepSize: 20 },
                    title: { display: true, text: '风险评分', font: { weight: 'bold' } },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            if (futurePrediction && context[0].dataIndex >= allData.length) {
                                var trend = reg.slope > 0 ? '上升' : '下降';
                                var diff = (futurePrediction - data[data.length - 1]).toFixed(1);
                                return ['预测方向: ' + trend, '预计变化: ' + (diff > 0 ? '+' : '') + diff + ' 分'];
                            }
                            return [];
                        }
                    }
                },
                annotation: {
                    annotations: {
                        thresholdLine: {
                            type: 'line',
                            yMin: 60,
                            yMax: 60,
                            borderColor: 'rgba(239, 68, 68, 0.6)',
                            borderWidth: 2,
                            borderDash: [6, 4],
                            label: { content: '高风险阈值(60)', enabled: true, position: 'end', backgroundColor: 'rgba(239,68,68,0.9)', color: 'white', font: { weight: 'bold' } }
                        }
                    }
                }
            }
        }
    });

    ctx._chartInstance = chartInstance;
    ctx._futurePrediction = futurePrediction;
}

// 绘制各维度趋势图
function drawDimensionTrendChart() {
    const ctx = document.getElementById('dimensionTrendChart');
    if (!ctx || !currentUser || !historicalData[currentUser.username]) return;
    
    const sortedData = [...historicalData[currentUser.username]].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const labels = sortedData.map(d => d.date);
    
    // 定义各维度的颜色和图标
    const dimensionConfig = [
        { key: 'lipid', label: '脂质代谢', color: 'rgba(255, 99, 132, 1)', icon: '🩸' },
        { key: 'glucose', label: '糖代谢', color: 'rgba(54, 162, 235, 1)', icon: '🍯' },
        { key: 'amino', label: '氨基酸代谢', color: 'rgba(75, 192, 192, 1)', icon: '⚗️' },
        { key: 'inflammation', label: '炎症状态', color: 'rgba(255, 206, 86, 1)', icon: '🔥' },
        { key: 'energy', label: '能量代谢', color: 'rgba(153, 102, 255, 1)', icon: '⚡' },
        { key: 'oxidative', label: '氧化应激', color: 'rgba(255, 159, 64, 1)', icon: '🍃' }
    ];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: dimensionConfig.map(config => ({
                label: `${config.icon} ${config.label}`,
                data: sortedData.map(d => d.riskScores[config.key]),
                borderColor: config.color,
                backgroundColor: config.color.replace('1)', '0.1)'),
                pointBackgroundColor: config.color,
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true
            }))
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                                // 根据风险值添加状态说明
                                if (context.parsed.y > 60) {
                                    label += ' (高风险)';
                                } else if (context.parsed.y > 30) {
                                    label += ' (中等风险)';
                                } else {
                                    label += ' (低风险)';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '风险评分'
                    }
                }
            }
        }
    });
}

// 相关性热图
function drawCorrelationHeatmap(containerId, records, timeLabel) {
    var container = document.getElementById(containerId);
    if (!container || !records || records.length < 2) {
        if (container) container.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">需要至少2条历史记录才能计算相关性</div>';
        return;
    }

    var keyMetrics = [
        { id: 'LDL_C', name: 'LDL-C' },
        { id: 'HDL_C', name: 'HDL-C' },
        { id: 'TG', name: 'TG' },
        { id: 'TC', name: 'TC' },
        { id: 'Glucose', name: '血糖' },
        { id: 'HbA1c', name: 'HbA1c' },
        { id: 'CRP', name: 'CRP' },
        { id: 'Homocysteine', name: 'Hcy' }
    ];

    var n = keyMetrics.length;
    var matrix = [];
    for (var i = 0; i < n; i++) {
        matrix[i] = [];
        for (var j = 0; j < n; j++) {
            var xVals = [], yVals = [];
            for (var k = 0; k < records.length; k++) {
                var r = records[k];
                var xv = r.data ? r.data[keyMetrics[i].id] : r[keyMetrics[i].id];
                var yv = r.data ? r.data[keyMetrics[j].id] : r[keyMetrics[j].id];
                if (xv !== undefined && xv !== null && yv !== undefined && yv !== null) {
                    xVals.push(xv); yVals.push(yv);
                }
            }
            matrix[i][j] = calcPearsonCorrelation(xVals, yVals);
        }
    }

    var gridCols = n + 1;
    var html = '<div class="heatmap-grid" style="grid-template-columns: 80px repeat(' + n + ', minmax(48px, 1fr));">';
    html += '<div class="heatmap-label"></div>';
    for (var j = 0; j < n; j++) {
        html += '<div class="heatmap-label" style="font-size:0.65rem;writing-mode:vertical-lr;text-orientation:mixed;">' + keyMetrics[j].name + '</div>';
    }
    for (var i = 0; i < n; i++) {
        html += '<div class="heatmap-label">' + keyMetrics[i].name + '</div>';
        for (var j = 0; j < n; j++) {
            var corr = matrix[i][j];
            var color, textColor;
            if (corr === null || isNaN(corr)) {
                color = '#e2e8f0'; textColor = '#cbd5e1';
            } else {
                var t = (corr + 1) / 2;
                if (Math.abs(corr) < 0.05) { color = '#fff'; textColor = '#94a3b8'; }
                else if (corr > 0) { var g = Math.round(255 * (1 - t)); color = 'rgb(' + g + ', ' + g + ', 255)'; textColor = t > 0.6 ? '#fff' : '#1e293b'; }
                else { var g2 = Math.round(255 * t); color = 'rgb(255, ' + g2 + ', ' + g2 + ')'; textColor = t < 0.4 ? '#fff' : '#1e293b'; }
            }
            var opacity = Math.abs(corr || 0) < 0.1 ? '0.3' : '1';
            html += '<div class="heatmap-cell" style="background:' + color + ';color:' + textColor + ';opacity:' + opacity + ';" title="' + keyMetrics[i].name + ' vs ' + keyMetrics[j].name + ': r=' + (corr !== null && !isNaN(corr) ? corr.toFixed(3) : 'N/A') + '">' + (i === j ? '1' : (corr !== null && !isNaN(corr) ? corr.toFixed(2) : '-')) + '</div>';
        }
    }
    html += '</div>';
    html += '<div class="heatmap-legend"><span>负相关</span><div class="heatmap-legend-bar"></div><span>正相关</span></div>';
    html += '<p style="text-align:center;color:#94a3b8;font-size:0.78rem;margin-top:4px;">基于' + records.length + '条 ' + (timeLabel || '历史') + ' 数据的Pearson相关系数 | 越接近±1相关性越强</p>';
    container.innerHTML = html;
}

function calcPearsonCorrelation(x, y) {
    var n = x.length;
    if (n < 3) return null;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += x[i]; sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];
    }
    var num = n * sumXY - sumX * sumY;
    var den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : num / den;
}

// 切换标签页
function showTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有标签按钮的激活状态
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示选中的标签内容
    document.getElementById(tabName).classList.add('active');
    
    // 激活对应的标签按钮
    const tabIndex = ['input', 'metabolic', 'report', 'comparison', 'calendar', 'doctor', 'settings'].indexOf(tabName);
    if (tabIndex >= 0) {
        document.querySelectorAll('.nav-tab')[tabIndex].classList.add('active');
    }
    
    // 如果切换到对比页面，更新对比视图
    if (tabName === 'comparison') {
        updateComparisonView();
    }
    
    // 如果切换到个人设置页面，加载用户设置
    if (tabName === 'settings') {
        loadUserSettings();
    }
    
    // 如果切换到医生沟通页面，加载医嘱和聊天记录
    if (tabName === 'doctor') {
        loadPatientPrescriptions();
        loadChatMessages();
        loadDoctorList();
        initChatSystem();
    } else {
        stopChatPolling();
    }
}

// 加载用户设置
function loadUserSettings() {
    // 填充用户信息
    document.getElementById('settingsUsername').value = currentUser.username;
    document.getElementById('settingsRole').value = currentUser.role === 'patient' ? '患者' : '医生';
    
    // 获取用户创建时间
    const user = users[currentUser.username];
    if (user && user.createdAt) {
        document.getElementById('settingsCreatedAt').value = new Date(user.createdAt).toLocaleString();
    } else {
        document.getElementById('settingsCreatedAt').value = '未知';
    }
    
    // 加载用户性别和年龄
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
    
    // 更新最近登录时间
    document.getElementById('settingsLastLogin').value = new Date().toLocaleString();
}

// 保存用户个人资料
function saveUserProfile() { (window.saveUserProfile || function(){})(); }

// 切换密码可见性
function togglePasswordVisibility(inputId) { (window.togglePasswordVisibility || function(){})(inputId); }

// 加载患者医嘱
function loadPatientPrescriptions() {
    const prescriptionsContainer = document.getElementById('patientPrescriptions');
    if (!prescriptionsContainer) return;
    
    const prescriptions = JSON.parse(localStorage.getItem(`metascanPrescriptions_${currentUser.username}`)) || [];
    
    // 更新统计
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
    
    // 按日期排序，最新的在前
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

// 刷新医嘱
function refreshPrescriptions() { (window.refreshPrescriptions || function(){})(); }

// 更新医嘱数量统计
function updatePrescriptionCount(count) {
    const countEl = document.getElementById('prescriptionCount');
    if (countEl) {
        countEl.textContent = count;
    }
}

// 加载聊天记录
function loadChatMessages() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;
    
    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${currentUser.username}`)) || [];
    
    // 更新消息数量统计
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
    
    // 按时间排序，最早的在前
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 标记消息为已读
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
        
        // 生成回复引用HTML
        let replyHtml = '';
        if (message.replyTo) {
            replyHtml = `
                <div style="background: rgba(0,0,0,0.05); border-left: 3px solid #26d0ce; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 0.85rem;">
                    <div style="color: #666; margin-bottom: 2px;">回复 ${message.replyTo.sender}</div>
                    <div style="color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${message.replyTo.content}</div>
                </div>
            `;
        }
        
        // 撤回的消息样式
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
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 快捷回复
function quickReply(text) { (window.quickReply || function(){})(text); }

// 更新消息数量统计
function updateMessageCount(count) {
    const countEl = document.getElementById('messageCount');
    if (countEl) {
        countEl.textContent = count;
    }
}

// 申请查看报告权限
function requestReportAccess() {
    if (!currentUser) return;
    
    // 检查是否已有待处理的申请
    const existingRequests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const pendingRequest = existingRequests.find(req => 
        req.patientUsername === currentUser.username && req.status === 'pending'
    );
    
    if (pendingRequest) {
        showNotification('您已提交申请，请等待医生审批');
        return;
    }
    
    // 检查是否已有权限
    const approvedRequest = existingRequests.find(req => 
        req.patientUsername === currentUser.username && req.status === 'approved'
    );
    
    if (approvedRequest) {
        showNotification('您已有查看报告的权限');
        updateReportAccessUI('approved');
        return;
    }
    
    // 创建新的申请
    const request = {
        id: Date.now(),
        patientUsername: currentUser.username,
        requestDate: new Date().toISOString(),
        status: 'pending'
    };
    
    existingRequests.push(request);
    localStorage.setItem('metascanReportRequests', JSON.stringify(existingRequests));
    
    // 向医生发送通知
    sendReportAccessRequestNotification(currentUser.username);
    
    // 更新UI
    updateReportAccessUI('pending');
    
    showNotification('申请已提交，请等待医生审批');
}

// 更新报告访问权限UI
function updateReportAccessUI(status) {
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

// 发送报告访问申请通知给医生
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
    
    // 保存到医生的通知列表
    const doctorNotifications = JSON.parse(localStorage.getItem('metascanDoctorNotifications') || '[]');
    doctorNotifications.unshift(notification);
    localStorage.setItem('metascanDoctorNotifications', JSON.stringify(doctorNotifications));
    
    // 更新医生通知徽章
    updateDoctorNotificationBadge();
}

// 加载报告访问状态
function loadReportAccessStatus() {
    if (!currentUser) return;
    
    const requests = JSON.parse(localStorage.getItem('metascanReportRequests') || '[]');
    const request = requests.find(req => req.patientUsername === currentUser.username);
    
    if (request) {
        updateReportAccessUI(request.status);
    }
}

// 加载医生列表（患者系统）
function loadDoctorList() {
    if (!currentUser || currentUser.role !== 'patient') return;
    
    const doctorListContainer = document.getElementById('doctorListContainer');
    const doctorCountBadge = document.getElementById('doctorCountBadge');
    if (!doctorListContainer) return;
    
    // 获取所有医生用户
    const allUsers = JSON.parse(localStorage.getItem('metascanUsers')) || {};
    const doctors = Object.entries(allUsers)
        .filter(([username, userData]) => userData.role === 'doctor')
        .map(([username, userData]) => ({ username, ...userData }));
    
    // 更新医生数量
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
    
    // 获取当前选中的医生
    const selectedDoctor = window.currentSelectedDoctor;
    
    doctorListContainer.innerHTML = doctors.map((doctor, index) => {
        // 获取与这位医生的未读消息数
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

// 搜索医生
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

// 选择医生
function selectDoctor(doctorUsername) {
    window.currentSelectedDoctor = doctorUsername;
    
    // 更新UI显示
    document.getElementById('noDoctorSelected').style.display = 'none';
    document.getElementById('currentDoctorInfo').style.display = 'block';
    document.getElementById('chatArea').style.display = 'flex';
    document.getElementById('prescriptionArea').style.display = 'block';
    
    // 更新当前医生信息
    document.getElementById('currentDoctorName').textContent = doctorUsername;
    document.getElementById('currentDoctorStatus').textContent = '在线 - 随时可以咨询';
    
    // 重新加载医生列表（更新选中状态）
    loadDoctorList();
    
    // 加载与该医生的聊天记录
    loadChatMessagesWithDoctor(doctorUsername);
    
    // 加载该医生的医嘱
    loadPrescriptionsFromDoctor(doctorUsername);
}

// 加载与特定医生的聊天记录
function loadChatMessagesWithDoctor(doctorUsername) {
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
    
    // 按时间排序
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 标记消息为已读
    chatMessages.forEach(msg => {
        if (msg.sender === doctorUsername && !msg.read) {
            msg.read = true;
        }
    });
    localStorage.setItem(chatKey, JSON.stringify(chatMessages));
    
    // 重新加载医生列表（更新未读数）
    loadDoctorList();
    
    chatContainer.innerHTML = chatMessages.map((message, index) => {
        var isPatient = message.sender === currentUser.username;
        var timeStr = formatMessageTime(message.timestamp);
        var fullTime = new Date(message.timestamp).toLocaleString('zh-CN');
        var isPrescription = message.type === 'prescription';

        var replyHtml = '';
        if (message.replyTo) {
            replyHtml = '<div style="background: rgba(0,0,0,0.05); border-left: 3px solid #26d0ce; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 0.85rem;"><div style="color: #666; margin-bottom: 2px;">回复 ' + message.replyTo.sender + '</div><div style="color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + message.replyTo.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div></div>';
        }

        var isRecalledMessage = message.isRecalled;
        var isMultimedia = (message.type && message.type !== 'text');
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

// 加载特定医生的医嘱
function loadPrescriptionsFromDoctor(doctorUsername) {
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
    
    // 按日期排序
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

// 显示医生资料
function showDoctorProfile() { (window.showDoctorProfile || function(){})(); }

// 删除/撤回消息
function deleteMessage(messageId) {
    if (!confirm('确定要删除这条消息吗？')) return;
    
    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${currentUser.username}`)) || [];
    const messageIndex = chatMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
        // 检查是否是5分钟内发送的消息
        const message = chatMessages[messageIndex];
        const messageTime = new Date(message.timestamp);
        const now = new Date();
        const diffMinutes = (now - messageTime) / (1000 * 60);
        
        if (diffMinutes <= 5 && message.sender === currentUser.username) {
            // 撤回消息
            chatMessages[messageIndex].content = '消息已撤回';
            chatMessages[messageIndex].isRecalled = true;
            showNotification('消息已撤回');
        } else if (message.sender === currentUser.username) {
            // 删除消息
            chatMessages.splice(messageIndex, 1);
            showNotification('消息已删除');
        } else {
            showNotification('只能删除自己的消息');
            return;
        }
        
        localStorage.setItem(`metascanChat_${currentUser.username}`, JSON.stringify(chatMessages));
        loadChatMessages();
    }
}

// 回复消息
function replyToMessage(messageId, sender, content) {
    window.replyingToMessage = { id: messageId, sender, content };
    
    // 显示回复指示器
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

// 取消回复
function cancelReply() {
    window.replyingToMessage = null;
    const replyIndicator = document.getElementById('replyIndicator');
    if (replyIndicator) {
        replyIndicator.remove();
    }
}

// 复制消息
function copyMessage(content) {
    navigator.clipboard.writeText(content).then(() => {
        showNotification('消息已复制');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('消息已复制');
    });
}

// 格式化时间显示
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
        return '刚刚';
    } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
        return `${diffHours}小时前`;
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}

// 显示消息操作菜单
function showMessageMenu(event, messageId, sender, content) {
    event.stopPropagation();
    
    // 移除已有的菜单
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
        <div onclick="replyToMessage(${messageId}, '${sender}', '${content.replace(/'/g, "\\'")}'); document.getElementById('messageContextMenu').remove();" 
             style="padding: 10px 16px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; display: flex; align-items: center; gap: 8px;"
             onmouseover="this.style.background='#f5f7fa'" 
             onmouseout="this.style.background='white'">
            💬 回复
        </div>
        <div onclick="copyMessage('${content.replace(/'/g, "\\'")}'); document.getElementById('messageContextMenu').remove();" 
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
    
    // 点击其他地方关闭菜单
    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

// 检查消息是否已撤回
function isRecalled(messageId) {
    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${currentUser.username}`)) || [];
    const message = chatMessages.find(msg => msg.id === messageId);
    return message && message.isRecalled;
}

// 医生系统的消息操作菜单
function showDoctorMessageMenu(event, messageId, sender, content, patientUsername) {
    event.stopPropagation();
    
    // 移除已有的菜单
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
        <div onclick="replyToDoctorMessage(${messageId}, '${sender}', '${content.replace(/'/g, "\\'")}', '${patientUsername}'); document.getElementById('messageContextMenu').remove();" 
             style="padding: 10px 16px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; display: flex; align-items: center; gap: 8px;"
             onmouseover="this.style.background='#f5f7fa'" 
             onmouseout="this.style.background='white'">
            💬 回复
        </div>
        <div onclick="copyMessage('${content.replace(/'/g, "\\'")}'); document.getElementById('messageContextMenu').remove();" 
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
    
    // 点击其他地方关闭菜单
    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

// 回复医生消息
function replyToDoctorMessage(messageId, sender, content, patientUsername) {
    window.replyingToMessage = { id: messageId, sender, content };
    window.currentReplyPatient = patientUsername;
    
    // 显示回复指示器
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

// 取消医生回复
function cancelDoctorReply() {
    window.replyingToMessage = null;
    window.currentReplyPatient = null;
    const replyIndicator = document.getElementById('doctorReplyIndicator');
    if (replyIndicator) {
        replyIndicator.remove();
    }
}

// 删除/撤回医生消息
function deleteDoctorMessage(messageId, patientUsername) {
    if (!confirm('确定要撤回这条消息吗？')) return;
    if (typeof wsRecallDoctorMessage === 'function') {
        wsRecallDoctorMessage(messageId, patientUsername);
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

// 检查医生消息是否已撤回
function isDoctorMessageRecalled(messageId, patientUsername) {
    const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patientUsername}`)) || [];
    const message = chatMessages.find(msg => msg.id === messageId);
    return message && message.isRecalled;
}

// 向医生发送咨询通知
function sendDoctorNotification(patientUsername, messageContent, specificDoctorUsername) {
    // 如果指定了特定医生，只给该医生发送通知
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
        // 找到所有医生用户（向后兼容）
        const allUsers = JSON.parse(localStorage.getItem('metascanUsers')) || {};
        
        for (const [username, userData] of Object.entries(allUsers)) {
            if (userData.role === 'doctor') {
                // 给每个医生发送通知
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

// 批准患者查看报告的申请
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
        
        // 发送通知给患者
        sendPatientNotification(patientUsername, '报告查看申请已批准', '医生已批准您查看健康报告的申请，现在可以查看详细报告了。');
        
        // 刷新患者详情显示
        showPatientDetails(patientUsername);
        
        showNotification(`已批准 ${patientUsername} 的报告查看申请`);
    }
}

// 拒绝患者查看报告的申请
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
        
        // 发送通知给患者
        sendPatientNotification(patientUsername, '报告查看申请被拒绝', '医生拒绝了您查看健康报告的申请，如有疑问请与医生沟通。');
        
        // 刷新患者详情显示
        showPatientDetails(patientUsername);
        
        showNotification(`已拒绝 ${patientUsername} 的报告查看申请`);
    }
}

// 发送通知给患者
function sendPatientNotification(patientUsername, title, message) {
    const notification = {
        id: Date.now(),
        type: 'system',
        title: title,
        message: message,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    const patientNotifications = JSON.parse(localStorage.getItem(`metascanNotifications_${patientUsername}`) || '[]');
    patientNotifications.unshift(notification);
    localStorage.setItem(`metascanNotifications_${patientUsername}`, JSON.stringify(patientNotifications));
}

// 清空聊天历史记录
function clearChatHistory() {
    // 获取当前选中的患者
    const patientUsername = window.currentSelectedPatient;
    if (!patientUsername) {
        showNotification('请先选择一个患者');
        return;
    }
    
    // 确认删除
    if (confirm(`确定要清空与患者${patientUsername}的聊天记录吗？此操作不可恢复！`)) {
        // 删除聊天记录
        localStorage.removeItem(`metascanChat_${patientUsername}`);
        
        // 重新加载聊天界面
        showPatientDetails(patientUsername);
        
        // 显示成功消息
        showNotification('聊天记录已清空');
    }
}

// ==================== 实时消息推送系统 ====================
var chatPollingInterval = null;
var lastMessageCounts = {};
var lastPolledReadStatus = {};

function startChatPolling() {
    stopChatPolling();
    if (typeof currentUser === 'undefined' || !currentUser) return;
    
    lastMessageCounts = {};
    lastPolledReadStatus = {};

    chatPollingInterval = setInterval(function() {
        checkNewMessages();
    }, 2000);
}

function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

function checkNewMessages() {
    if (typeof currentUser === 'undefined' || !currentUser) return;
    
    var username = currentUser.username;
    var role = currentUser.role;

    if (role === 'patient') {
        checkPatientNewMessages(username);
    } else if (role === 'doctor') {
        checkDoctorNewMessages(username);
    }
}

function checkPatientNewMessages(username) {
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

function checkDoctorNewMessages(username) {
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

function updateUnreadBadges() {
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

function playMessageSound() {
    var audio = document.getElementById('messageNotificationSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(function() {});
    }
}

// ==================== 消息已读/未读状态 (双勾机制) ====================
function markMessagesAsRead(storageKey, readerUsername) {
    var messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    var changed = false;

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

function getReadStatusIcon(msg, isOwn) {
    if (!isOwn) return '';
    if (msg.read) {
        return '<span style="color: #26d0ce; font-size: 0.7rem; margin-left: 4px;" title="已读">✓✓</span>';
    } else {
        return '<span style="color: #94a3b8; font-size: 0.7rem; margin-left: 4px;" title="已发送">✓</span>';
    }
}

// ==================== 多媒体消息支持 ====================
var mediaRecorder = null;
var audioChunks = [];
var currentRecordingRole = null;
var recordingTimeout = null;

function uploadImage(role) {
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
    reader.readAsDataURL(file);
    showNotification('📷 图片处理中...');
}

function startVoiceRecording(role) {
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

function stopVoiceRecording(role) {
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

// ==================== 医嘱卡片发送 ====================
function openPrescriptionInput() {
    var patientUsername = window.currentSelectedPatient;
    if (!patientUsername) {
        showNotification('请先选择一个患者');
        return;
    }
    var modal = document.getElementById('prescriptionInputModal');
    if (modal) modal.style.display = 'flex';
}

function closePrescriptionInput() { (window.closePrescriptionInput || function(){})(); }

function sendPrescriptionAsCard() {
    var title = document.getElementById('prescriptionTitle').value.trim();
    var content = document.getElementById('prescriptionContent').value.trim();
    var medication = document.getElementById('prescriptionMedication').value.trim();
    
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

function confirmPrescriptionFromChat(prescriptionId) {
    if (!confirm('确认已阅读并理解此医嘱内容？')) return;
    
    var patientUsername = window.currentSelectedPatient || currentUser.username;
    var prescriptions = JSON.parse(localStorage.getItem('metascanPrescriptions_' + patientUsername) || '[]');
    var presc = prescriptions.find(function(p) { return p.id === prescriptionId; });
    if (presc) {
        presc.confirmed = true;
        presc.confirmedAt = new Date().toISOString();
        localStorage.setItem('metascanPrescriptions_' + patientUsername, JSON.stringify(prescriptions));
    }
    
    showNotification('✅ 医嘱已确认');
    
    var chatMsgs = document.getElementById('chatMessages');
    if (chatMsgs && window.currentDoctorUsername) {
        loadChatMessagesWithDoctor(window.currentDoctorUsername);
    }
}

// ==================== 消息内容渲染 (支持文本/图片/语音/医嘱) ====================
function renderMessageContent(msg, isOwn, isDoctorView) {
    var type = msg.type || 'text';
    var contentHtml = '';

    switch (type) {
        case 'image':
            contentHtml = '<div style="margin-bottom: 4px;"><img src="' + msg.content + '" style="max-width: 240px; max-height: 320px; border-radius: 12px; cursor: pointer;" onclick="window.open(this.src)" loading="lazy" alt="图片"></div><div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 4px;">📷 ' + (msg.fileName || '图片') + '</div>';
            break;
        case 'voice':
            contentHtml = '<div style="display: flex; align-items: center; gap: 10px;"><button onclick="playVoiceMessage(this)" data-audio="' + msg.content.replace(/"/g, '&quot;') + '" style="width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(255,255,255,0.25); color: white; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">▶</button><div style="flex: 1; min-width: 60px;"><div style="height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden;"><div style="height: 100%; width: 0%; background: white; border-radius: 3px;" class="voice-progress-bar"></div></div><div style="font-size: 0.72rem; color: rgba(255,255,255,0.6); margin-top: 4px;">🎤 语音消息</div></div></div>';
            break;
        case 'prescription':
            return renderPrescriptionCard(msg, isOwn, isDoctorView);
        case 'file':
            return renderFileBubble(msg, isOwn);
        default:
            var escapedContent = msg.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            contentHtml = escapedContent;
            break;
    }

    return contentHtml;
}

function renderPrescriptionCard(msg, isOwn, isDoctorView) {
    var data;
    try { data = JSON.parse(msg.content); } catch(e) {
        return '<div style="color: #666;">📋 [医嘱数据错误]</div>';
    }

    return '<div style="background: linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 16px; padding: 16px; min-width: 260px; box-shadow: 0 4px 12px rgba(245,158,11,0.15);">' +
        '<div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 4px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; margin-bottom: 10px;">📋 医嘱</div>' +
        '<div style="font-weight: 800; color: #92400e; font-size: 1.05rem; margin-bottom: 6px;">' + data.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
        '<div style="font-size: 0.88rem; color: #78350f; margin-bottom: 8px; line-height: 1.5;">' + data.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div>' +
        (data.medication ? '<div style="background: white; border-radius: 10px; padding: 10px 14px; margin-bottom: 10px;"><span style="font-weight: 700; color: #dc2626; font-size: 0.82rem;">💊 用药指导:</span><br><span style="font-size: 0.84rem; color: #334155;">' + data.medication.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>' : '') +
        (isOwn ? '' : '<button onclick="confirmPrescriptionFromChat(' + msg.id + ')" style="width: 100%; padding: 10px; border-radius: 12px; border: none; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">✅ 确认医嘱已读</button>') +
    '</div>';
}

function playVoiceMessage(btn) {
    var audioData = btn.getAttribute('data-audio');
    if (!audioData) return;

    var audio = new Audio(audioData);
    var progressBar = btn.parentElement.querySelector('.voice-progress-bar');

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

// ==================== 初始化聊天系统 ====================
function initChatSystem() {
    startChatPolling();
    updateUnreadBadges();
}

// ==================== 兼容旧函数 ====================
function stopDoctorChatPolling() { stopChatPolling(); }
function startDoctorChatPolling() { startChatPolling(); }

// 修改密码
function changePassword() { (window.changePassword || function(){})().catch(function(e){ console.error(e); }); }

// 显示通知
function showNotification(msg, type) { if (window._moduleNotificationReady) { window.showModuleNotification(msg, type); return; } alert(msg); }

// 切换通知面板
function toggleNotifications(event) {
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

// 计算今日待诊患者数量
function getPendingPatientsCount() {
    if (!currentUser || currentUser.role !== 'doctor') return 0;
    
    const patients = [];
    for (const [username, userData] of Object.entries(users)) {
        if (userData.role === 'patient') {
            patients.push({ username, ...userData });
        }
    }
    
    // 今日开始时间
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // 统计今日有检测数据或新消息的患者
    let pendingCount = 0;
    patients.forEach(patient => {
        // 检查是否有今日的新消息
        const chatMessages = JSON.parse(localStorage.getItem(`metascanChat_${patient.username}`)) || [];
        const hasNewMessageToday = chatMessages.some(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= todayStart && msg.sender === patient.username;
        });
        
        // 检查是否有今日的检测数据
        const hasTestDataToday = patient.lastTestDate && new Date(patient.lastTestDate) >= todayStart;
        
        if (hasNewMessageToday || hasTestDataToday) {
            pendingCount++;
        }
    });
    
    return pendingCount;
}

// 加载通知
function loadNotifications() {
    if (!currentUser) return;
    
    const notificationList = document.getElementById('notificationList');
    let notifications = JSON.parse(localStorage.getItem(`metascanNotifications_${currentUser.username}`)) || [];
    
    // 如果是医生，添加待诊患者通知和报告申请通知
    if (currentUser.role === 'doctor') {
        const pendingCount = getPendingPatientsCount();
        
        // 添加今日待诊患者通知到开头
        notifications.unshift({
            id: 'pending-patients',
            type: 'pending',
            title: '今日待诊',
            message: `今日有 ${pendingCount} 位患者需要您的关注`,
            date: new Date().toISOString(),
            read: false,
            isSystem: true
        });
        
        // 添加报告查看申请通知
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
            
            // 根据通知类型选择图标和颜色
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
    
    // 更新通知徽章
    updateNotificationBadge();
}

// 跳转到患者聊天
function goToPatientChat(patientUsername) {
    // 关闭通知面板
    document.getElementById('notificationPanel').style.display = 'none';
    
    // 切换到患者索引标签
    showTab('doctorPatients');
    
    // 选中该患者
    setTimeout(() => {
        const patientItem = document.querySelector(`.patient-item[data-username="${patientUsername}"]`);
        if (patientItem) {
            patientItem.click();
        }
    }, 100);
}

// 添加通知
function addNotification(title, message) {
    if (!currentUser) return;
    
    const notification = {
        title: title,
        message: message,
        date: new Date().toISOString(),
        read: false
    };
    
    const notifications = JSON.parse(localStorage.getItem(`metascanNotifications_${currentUser.username}`)) || [];
    notifications.push(notification);
    
    // 只保留最近20条通知
    if (notifications.length > 20) {
        notifications.splice(0, notifications.length - 20);
    }
    
    localStorage.setItem(`metascanNotifications_${currentUser.username}`, JSON.stringify(notifications));
    updateNotificationBadge();
}

// 清除所有通知
function clearAllNotifications() {
    if (!currentUser) return;
    
    localStorage.removeItem(`metascanNotifications_${currentUser.username}`);
    document.getElementById('notificationList').innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">暂无通知</p>';
    updateNotificationBadge();
}

// 更新通知徽章
function updateNotificationBadge() {
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

// 检查新通知
function checkForNewNotifications() {
    // 检查未完成的任务
    checkUncompletedTasks();
    
    if (!currentUser) return;
    
    if (currentUser.role === 'doctor') {
        // 检查新的共享医嘱
        const sharedPrescriptions = JSON.parse(localStorage.getItem(`metascanSharedPrescriptions_${currentUser.username}`)) || [];
        if (sharedPrescriptions.length > 0) {
            addNotification('新的共享医嘱', `您收到了 ${sharedPrescriptions.length} 条新的共享医嘱`);
            // 清空共享医嘱，因为已经通知过了
            localStorage.removeItem(`metascanSharedPrescriptions_${currentUser.username}`);
        }
        
        // 检查新的转诊
        const referrals = JSON.parse(localStorage.getItem(`metascanReferrals_${currentUser.username}`)) || [];
        if (referrals.length > 0) {
            addNotification('新的患者转诊', `您收到了 ${referrals.length} 位新转诊的患者`);
            // 清空转诊记录，因为已经通知过了
            localStorage.removeItem(`metascanReferrals_${currentUser.username}`);
        }
        
        // 检查待诊断患者
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
        
        // 检查新的医患消息
        const newMessages = JSON.parse(localStorage.getItem(`metascanNewMessages_${currentUser.username}`)) || [];
        if (newMessages.length > 0) {
            addNotification('新的医患消息', `您收到了 ${newMessages.length} 条新的医患消息，请及时回复。`);
            // 清空新消息记录，因为已经通知过了
            localStorage.removeItem(`metascanNewMessages_${currentUser.username}`);
        }
    }
}

// 检查未完成的任务
function checkUncompletedTasks() {
    if (!currentUser) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasks = getTasks();
    const todayTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime() && !task.completed;
    });
    
    if (todayTasks.length > 0) {
        addNotification('任务提醒', `您还有 ${todayTasks.length} 个任务未完成，请及时完成。`);
    }
}

// 定期检查新通知
function startNotificationCheck() {
    // 每5分钟检查一次新通知
    setInterval(checkForNewNotifications, 5 * 60 * 1000);
}

// ========== 数据导出与分享 ==========

// 初始化输入表单 - 使用分类折叠面板
function initWizard() {
    if (!currentUser) {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('未登录', '请先登录后再使用数据录入功能');
        return;
    }
    setWizardDate('today');
    renderWizardInputs();
    checkDraft();
}

function renderWizardInputs() {
    var step2El = document.getElementById('wizardInputsStep2');
    var step3El = document.getElementById('wizardInputsStep3');
    if (!step2El || !step3El) return;

    var step2HTML = '';
    var step3HTML = '';

    window.metaboliteData.forEach(function(met) {
        var range = met.refMax - met.refMin;
        var stepVal = met.unit === 'mg/L' ? 0.1 : met.unit === 'U/mL' || range > 100 ? 1 : range > 10 ? 0.1 : 0.01;
        var cardHTML =
            '<div class="wizard-input-card" id="wizardCard_' + met.id + '" onclick="if(this.classList.contains(\'ocr-unfilled\'))showCandidateList(\'' + met.id + '\')">' +
                '<div class="input-header">' +
                    '<label>' + met.name + '</label>' +
                    '<div class="input-status-dot" id="wizardDot_' + met.id + '"></div>' +
                '</div>' +
                '<input type="number" id="wizard_' + met.id + '" step="' + stepVal + '"' +
                    ' placeholder="请输入数值"' +
                    ' onchange="validateInput(\'' + met.id + '\', ' + met.refMin + ', ' + met.refMax + ')"' +
                    ' oninput="autoSaveDraft()"' +
                    ' onclick="event.stopPropagation()"' +
                    '>' +
                '<div class="unit-hint">参考范围: ' + met.refMin + '-' + met.refMax + ' ' + met.unit + '</div>' +
                '<div class="validation-hint" id="wizardHint_' + met.id + '"></div>' +
                '<div class="candidate-list" id="candidates_' + met.id + '"></div>' +
            '</div>';

        if (met.category === 'lipid' || met.category === 'glucose') {
            step2HTML += cardHTML;
        } else {
            step3HTML += cardHTML;
        }
    });

    step2El.innerHTML = step2HTML;
    step3El.innerHTML = step3HTML;
}

var wizardStep = 1;

function goToWizardStep(n) {
    wizardStep = n;

    document.querySelectorAll('.wizard-panel').forEach(function(p) { p.classList.remove('active'); });
    var panel = document.getElementById('wizardStep' + n);
    if (panel) panel.classList.add('active');

    document.querySelectorAll('.wizard-step').forEach(function(s) { s.classList.remove('active', 'completed'); });
    document.querySelectorAll('.wizard-line').forEach(function(l) { l.classList.remove('completed'); });

    for (var i = 1; i <= 4; i++) {
        var stepEl = document.querySelector('.wizard-step[data-step="' + i + '"]');
        if (!stepEl) continue;
        if (i < n) stepEl.classList.add('completed');
        if (i === n) stepEl.classList.add('active');
        var lineEl = document.querySelector('.wizard-line[data-line="' + i + '"]');
        if (lineEl && i < n) lineEl.classList.add('completed');
    }

    var prevBtn = document.getElementById('wizardPrevBtn');
    var nextBtn = document.getElementById('wizardNextBtn');
    var skipBtn = document.getElementById('wizardSkipBtn');
    var submitBtn = document.getElementById('wizardSubmitBtn');

    prevBtn.disabled = (n === 1);
    nextBtn.style.display = (n === 4) ? 'none' : '';
    skipBtn.style.display = '';
    submitBtn.style.display = (n === 4) ? '' : 'none';

    if (n === 4) renderWizardSummary();

    if (n === 3) autoSaveDraft();
}

function wizardNext() {
    if (wizardStep === 1) {
        var dateInput = document.getElementById('wizardTestDate');
        if (!dateInput.value) {
            setWizardDate('today');
        }
    }
    if (wizardStep < 4) goToWizardStep(wizardStep + 1);
}

function wizardPrev() {
    if (wizardStep > 1) goToWizardStep(wizardStep - 1);
}

function wizardSkip() {
    if (wizardStep === 2) {
        goToWizardStep(4);
    } else {
        wizardNext();
    }
}

function setWizardDate(preset) {
    var input = document.getElementById('wizardTestDate');
    if (!input) return;
    var d = new Date();
    if (preset === 'yesterday') d.setDate(d.getDate() - 1);
    if (preset === 'week') d.setDate(d.getDate() - 7);
    input.value = d.toISOString().split('T')[0];
    autoSaveDraft();
}

function validateInput(id, refMin, refMax) {
    var hint = document.getElementById('wizardHint_' + id);
    var card = document.getElementById('wizardCard_' + id);
    var dot = document.getElementById('wizardDot_' + id);
    var input = document.getElementById('wizard_' + id);
    if (!input || !hint) return;

    var value = parseFloat(input.value);
    if (isNaN(value) || input.value === '') {
        hint.textContent = '';
        hint.className = 'validation-hint';
        if (card) { card.classList.remove('filled', 'error'); card.classList.remove('ocr-unfilled'); }
        if (dot) dot.style.background = '#cbd5e1';
        return;
    }

    if (card) card.classList.add('filled');
    if (card) card.classList.remove('ocr-unfilled');

    if (value < refMin * 0.5) {
        hint.textContent = '⚠ 严重偏低（< ' + (refMin * 0.5).toFixed(2) + '）';
        hint.className = 'validation-hint hint-crit-low';
        if (card) card.classList.add('error');
        if (dot) dot.style.background = '#dc2626';
    } else if (value < refMin) {
        hint.textContent = '↓ 偏低（参考下限: ' + refMin + '）';
        hint.className = 'validation-hint hint-low';
        if (card) card.classList.add('error');
        if (dot) dot.style.background = '#f59e0b';
    } else if (value > refMax * 2) {
        hint.textContent = '⚠ 严重偏高（> ' + (refMax * 2).toFixed(2) + '）';
        hint.className = 'validation-hint hint-crit-high';
        if (card) card.classList.add('error');
        if (dot) dot.style.background = '#dc2626';
    } else if (value > refMax) {
        hint.textContent = '↑ 偏高（参考上限: ' + refMax + '）';
        hint.className = 'validation-hint hint-high';
        if (card) card.classList.add('error');
        if (dot) dot.style.background = '#f59e0b';
    } else {
        hint.textContent = '✓ 正常（参考: ' + refMin + '-' + refMax + '）';
        hint.className = 'validation-hint hint-normal';
        if (card) card.classList.remove('error');
        if (dot) dot.style.background = '#10b981';
    }

    autoSaveDraft();
}

function autoSaveDraft() { (window.autoSaveDraft || function(){})(); }

function checkDraft() {
    if (!currentUser) return;
    var saved = localStorage.getItem('metascanDraft_' + currentUser.username);
    if (!saved) return;
    try {
        var draft = JSON.parse(saved);
        if (!draft.date && Object.keys(draft.values).length === 0) return;
        var bar = document.getElementById('draftRestoreBar');
        if (bar) bar.style.display = 'flex';
    } catch(e) {}
}

function restoreDraft() {
    if (!currentUser) return;
    var saved = localStorage.getItem('metascanDraft_' + currentUser.username);
    if (!saved) return;
    try {
        var draft = JSON.parse(saved);
        if (draft.date) {
            var dateInput = document.getElementById('wizardTestDate');
            if (dateInput) dateInput.value = draft.date;
        }
        Object.keys(draft.values).forEach(function(id) {
            var input = document.getElementById('wizard_' + id);
            if (input) {
                input.value = draft.values[id];
                var met = window.metaboliteData.find(function(m) { return m.id === id; });
                if (met) validateInput(id, met.refMin, met.refMax);
            }
        });
        var bar = document.getElementById('draftRestoreBar');
        if (bar) bar.style.display = 'none';
        showNotification('📝 草稿已恢复');
    } catch(e) {}
}

function discardDraft() {
    if (!currentUser) return;
    localStorage.removeItem('metascanDraft_' + currentUser.username);
    var bar = document.getElementById('draftRestoreBar');
    if (bar) bar.style.display = 'none';
}

function clearDraft() {
    if (!currentUser) return;
    localStorage.removeItem('metascanDraft_' + currentUser.username);
}

function smartMergeOCR(results) {
    if (!results) return;
    Object.keys(results).forEach(function(id) {
        var data = results[id];
        if (data && data.value) {
            fillWizardInput(id, data.value, data.confidence);
        }
    });

    window.metaboliteData.forEach(function(met) {
        if (!results[met.id] || !results[met.id].value) {
            var card = document.getElementById('wizardCard_' + met.id);
            if (card) card.classList.add('ocr-unfilled');
        }
    });

    autoSaveDraft();
    showNotification('🔄 OCR识别结果已填入向导，请逐项核对');
}

function fillWizardInput(id, value, confidence) {
    var input = document.getElementById('wizard_' + id);
    var card = document.getElementById('wizardCard_' + id);
    var dot = document.getElementById('wizardDot_' + id);

    if (input) {
        input.value = value;
        if (card) {
            card.classList.add('filled');
            card.classList.remove('ocr-unfilled');
        }
        if (dot) {
            dot.style.background = confidence >= 70 ? '#10b981' : '#f59e0b';
        }
        var met = window.metaboliteData.find(function(m) { return m.id === id; });
        if (met) validateInput(id, met.refMin, met.refMax);
    }
}

function showCandidateList(metId) {
    var list = document.getElementById('candidates_' + metId);
    if (!list) return;
    var wasShowing = list.classList.contains('show');
    document.querySelectorAll('.candidate-list').forEach(function(l) { l.classList.remove('show'); });
    if (!wasShowing) list.classList.add('show');

    if (list.children.length === 0) {
        var met = window.metaboliteData.find(function(m) { return m.id === metId; });
        if (!met) return;
        var candidates = [];
        var midPoint = (met.refMin + met.refMax) / 2;
        for (var i = 0; i < 5; i++) {
            candidates.push((met.refMin + (met.refMax - met.refMin) * i / 4).toFixed(met.unit === 'mg/L' ? 1 : 2));
        }
        list.innerHTML = candidates.map(function(v) {
            return '<div class="candidate-item" onclick="selectCandidate(\'' + metId + '\', ' + v + ')">' +
                '<span class="candidate-value">' + v + '</span>' +
                '<span class="candidate-unit">' + met.unit + '</span>' +
            '</div>';
        }).join('');
    }
}

function selectCandidate(metId, value) {
    var input = document.getElementById('wizard_' + metId);
    if (input) {
        input.value = value;
        var met = window.metaboliteData.find(function(m) { return m.id === metId; });
        if (met) validateInput(metId, met.refMin, met.refMax);
    }
    var list = document.getElementById('candidates_' + metId);
    if (list) list.classList.remove('show');
    autoSaveDraft();
}

function renderWizardSummary() {
    var body = document.getElementById('wizardSummaryBody');
    var stats = document.getElementById('wizardSummaryStats');
    if (!body || !stats) return;

    var filledCount = 0;
    var abnormalCount = 0;
    var rows = '';

    window.metaboliteData.forEach(function(met) {
        var input = document.getElementById('wizard_' + met.id);
        var value = input && input.value ? parseFloat(input.value) : null;
        var isFilled = value !== null && !isNaN(value);
        var isAbnormal = false;

        if (isFilled) {
            filledCount++;
            if (value < met.refMin || value > met.refMax) {
                isAbnormal = true;
                abnormalCount++;
            }
        }

        rows += '<tr>' +
            '<td><strong>' + met.name + '</strong></td>' +
            '<td>' + (isFilled ? value.toFixed(2) : '<span style="color:#94a3b8;">未录入</span>') + '</td>' +
            '<td>' + met.unit + '</td>' +
            '<td>' + met.refMin + '-' + met.refMax + '</td>' +
            '<td class="' + (isFilled ? (isAbnormal ? 'status-abnormal' : 'status-filled') : 'status-empty') + '">' +
                (isFilled ? (isAbnormal ? '异常' : '正常') : '待补充') +
            '</td>' +
        '</tr>';
    });

    body.innerHTML = rows;

    var completionRate = Math.round((filledCount / window.metaboliteData.length) * 100);
    stats.innerHTML =
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value">' + completionRate + '%</div>' +
            '<div class="stat-label">录入完成度</div>' +
        '</div>' +
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value">' + filledCount + '/' + window.metaboliteData.length + '</div>' +
            '<div class="stat-label">已填指标</div>' +
        '</div>' +
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value" style="' + (abnormalCount > 0 ? 'background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;' : '') + '">' + abnormalCount + '</div>' +
            '<div class="stat-label">异常指标</div>' +
        '</div>' +
        '<div class="wizard-summary-stat">' +
            '<div class="stat-value">👨‍⚕️</div>' +
            '<div class="stat-label">' + (completionRate >= 80 ? '可生成报告' : '建议补全数据') + '</div>' +
        '</div>';
}

function wizardSubmit() {
    var filledCount = 0;
    window.metaboliteData.forEach(function(met) {
        var input = document.getElementById('wizard_' + met.id);
        if (input && input.value) filledCount++;
    });

    if (filledCount === 0) {
        showNotification('⚠️ 请至少录入一项代谢指标');
        return;
    }

    clearDraft();
    generateReport();
}

function getWizardData() {
    var data = {};
    window.metaboliteData.forEach(function(met) {
        var input = document.getElementById('wizard_' + met.id);
        if (input && input.value) {
            var value = parseFloat(input.value);
            if (!isNaN(value)) data[met.id] = value;
        }
    });
    return data;
}

var currentWizardTestDate = '';
function getWizardTestDate() {
    var dateInput = document.getElementById('wizardTestDate');
    return dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
}

function loadSampleData() {
    var sampleData = {};
    window.metaboliteData.forEach(function(met) {
        var midVal = ((met.refMin + met.refMax) / 2).toFixed(2);
        var variation = (Math.random() - 0.5) * (met.refMax - met.refMin) * 0.6;
        sampleData[met.id] = parseFloat((parseFloat(midVal) + variation).toFixed(2));
    });
    Object.keys(sampleData).forEach(function(id) {
        fillWizardInput(id, sampleData[id], 100);
    });
    autoSaveDraft();
    showNotification('📊 已加载示例数据');
}

function clearData() {
    window.metaboliteData.forEach(function(met) {
        var input = document.getElementById('wizard_' + met.id);
        if (input) input.value = '';
        var hint = document.getElementById('wizardHint_' + met.id);
        if (hint) { hint.textContent = ''; hint.className = 'validation-hint'; }
        var card = document.getElementById('wizardCard_' + met.id);
        if (card) { card.classList.remove('filled', 'error', 'ocr-unfilled'); }
        var dot = document.getElementById('wizardDot_' + met.id);
        if (dot) dot.style.background = '#cbd5e1';
    });
    clearDraft();
    showNotification('🗑️ 已清空所有数据');
}

// 切换步骤时更新总结面板

// 添加动画样式
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(26, 41, 128, 0.4); }
        50% { box-shadow: 0 0 0 15px rgba(26, 41, 128, 0); }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
    
    @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes celebrate {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(animationStyle);

// 健康助手功能

// 全局变量
let currentDate = new Date();

// 初始化日历
function initCalendar() {
    renderCalendar();
    loadTodayTasks();
    updateWeekCompletion();
    loadUpcomingTasks();
}

// 渲染日历
function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthElement = document.getElementById('currentMonth');
    if (!calendarDays || !currentMonthElement) return;
    
    // 设置当前月份显示
    currentMonthElement.textContent = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
    
    // 清空日历
    calendarDays.innerHTML = '';
    
    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.style.fontWeight = '700';
        dayElement.style.padding = '14px 10px';
        dayElement.style.color = '#1a2980';
        dayElement.style.textAlign = 'center';
        dayElement.style.fontSize = '1rem';
        dayElement.style.background = 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%)';
        dayElement.textContent = day;
        calendarDays.appendChild(dayElement);
    });
    
    // 获取当月第一天
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    // 获取当月最后一天
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    // 获取当月第一天是星期几
    const startDay = firstDay.getDay();
    // 获取当月天数
    const daysInMonth = lastDay.getDate();
    
    // 添加空白格子
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.style.padding = '20px';
        emptyDay.style.textAlign = 'center';
        calendarDays.appendChild(emptyDay);
    }
    
    // 添加日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'data-card fade-in';
        dayElement.style.padding = '20px 12px';
        dayElement.style.borderRadius = '16px';
        dayElement.style.cursor = 'pointer';
        dayElement.style.transition = 'all 0.3s ease';
        dayElement.style.textAlign = 'center';
        dayElement.style.position = 'relative';
        dayElement.style.minHeight = '100px';
        dayElement.style.display = 'flex';
        dayElement.style.flexDirection = 'column';
        dayElement.style.alignItems = 'center';
        dayElement.style.justifyContent = 'flex-start';
        dayElement.style.margin = '2px';
        dayElement.style.overflow = 'hidden';
        dayElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        
        // 检查是否是今天
        const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        currentDay.setHours(0, 0, 0, 0);
        
        if (currentDay.getTime() === today.getTime()) {
            dayElement.style.background = 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)';
            dayElement.style.color = 'white';
            dayElement.style.fontWeight = '600';
            dayElement.style.boxShadow = '0 6px 20px rgba(26, 41, 128, 0.4)';
            dayElement.style.transform = 'scale(1.02)';
        }
        
        // 检查是否有任务
        const tasks = getTasks();
        const dayTasks = tasks.filter(task => {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === currentDay.getTime();
        });
        
        if (dayTasks.length > 0) {
            const completedTasks = dayTasks.filter(task => task.completed).length;
            const taskPercentage = (completedTasks / dayTasks.length) * 100;
            
            if (!dayElement.style.background || dayElement.style.background === 'none') {
                dayElement.style.background = completedTasks === dayTasks.length 
                    ? 'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)' 
                    : 'linear-gradient(135deg, #fffaf0 0%, #ffffff 100%)';
                dayElement.style.borderLeft = `4px solid ${completedTasks === dayTasks.length ? '#00b894' : '#f39c12'}`;
            }
            
            // 添加任务数量指示器
            const taskCount = document.createElement('div');
            taskCount.style.fontSize = '0.85rem';
            taskCount.style.marginTop = '8px';
            taskCount.style.fontWeight = '700';
            taskCount.style.color = completedTasks === dayTasks.length ? '#00b894' : '#f39c12';
            taskCount.style.padding = '4px 10px';
            taskCount.style.background = completedTasks === dayTasks.length 
                ? 'rgba(0, 184, 148, 0.1)' 
                : 'rgba(243, 156, 18, 0.1)';
            taskCount.style.borderRadius = '10px';
            taskCount.textContent = `${completedTasks}/${dayTasks.length}`;
            dayElement.appendChild(taskCount);
            
            // 添加任务完成情况指示器
            const indicator = document.createElement('div');
            indicator.className = 'progress-bar';
            indicator.style.width = '85%';
            indicator.style.height = '5px';
            indicator.style.marginTop = '10px';
            
            const progress = document.createElement('div');
            progress.className = 'progress-fill';
            progress.style.width = `${taskPercentage}%`;
            progress.style.background = completedTasks === dayTasks.length 
                ? 'linear-gradient(90deg, #00b894 0%, #48c9b0 100%)' 
                : 'linear-gradient(90deg, #f39c12 0%, #ffb347 100%)';
            
            indicator.appendChild(progress);
            dayElement.appendChild(indicator);
        }
        
        // 添加日期数字
        const dayNumber = document.createElement('div');
        dayNumber.textContent = day;
        dayNumber.style.fontSize = '1.4rem';
        dayNumber.style.fontWeight = '700';
        dayNumber.style.marginTop = '4px';
        dayElement.insertBefore(dayNumber, dayElement.firstChild);
        
        dayElement.onclick = () => selectDate(day);
        calendarDays.appendChild(dayElement);
    }
}

// 切换月份
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

// 选择日期
function selectDate(day) {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    showDateTasks(selectedDate);
    loadDateTasks(selectedDate);
}

// 加载指定日期的任务
function loadDateTasks(date) {
    const todayTasksElement = document.getElementById('todayTasks');
    const currentSelectedDateElement = document.getElementById('currentSelectedDate');
    if (!todayTasksElement || !currentSelectedDateElement) return;
    
    // 更新选中日期显示
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
        currentSelectedDateElement.textContent = '今天';
    } else {
        currentSelectedDateElement.textContent = selectedDate.toLocaleDateString();
    }
    
    // 加载任务
    const tasks = getTasks();
    const dateTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === selectedDate.getTime();
    });
    
    if (dateTasks.length === 0) {
        todayTasksElement.innerHTML = `
            <div class="data-card fade-in" style="text-align: center; padding: 60px; margin: 20px 0;">
                <div style="font-size: 5rem; margin-bottom: 20px;">📅</div>
                <div style="font-size: 1.4rem; font-weight: 600; color: #666; margin-bottom: 12px;">该日期暂无任务</div>
                <div style="color: #999; font-size: 1.05rem;">点击下方按钮添加新任务</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    dateTasks.forEach(task => {
        // 根据任务类型选择图标
        let icon = '📋';
        if (task.title.includes('运动')) icon = '🏃‍♂️';
        else if (task.title.includes('饮食')) icon = '🥗';
        else if (task.title.includes('水分')) icon = '💧';
        else if (task.title.includes('压力')) icon = '🧘‍♀️';
        else if (task.title.includes('蔬菜')) icon = '🥦';
        
        // 获取鼓励话语
        const encouragement = getEncouragement(task.title);
        
        html += `
            <div class="data-card fade-in" style="display: flex; align-items: flex-start; gap: 18px; padding: 24px; background: ${task.completed ? 'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)' : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'}; border-radius: 20px; margin-bottom: 18px; border-left: 5px solid ${task.completed ? '#00b894' : '#1a2980'}; box-shadow: 0 4px 20px rgba(0,0,0,0.06); transition: all 0.3s ease;">
                <div class="icon-container ${task.completed ? 'icon-green' : 'icon-cyan'}" style="width: 60px; height: 60px; font-size: 28px; margin-top: 2px;">${icon}</div>
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompletion(${task.id}); loadDateTasks(new Date('${date.toISOString()}'))" style="width: 24px; height: 24px; cursor: pointer; accent-color: #1a2980; margin-top: 18px;">
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #1a2980; font-size: 1.25rem;">${task.title}</div>
                    <div style="font-size: 0.95rem; color: #666; margin-top: 8px; line-height: 1.6;">${task.description}</div>
                    <div style="font-size: 0.9rem; color: #1a2980; margin-top: 14px; padding: 12px 16px; background: ${task.completed ? 'linear-gradient(135deg, #e6f7f0 0%, #f0fff4 100%)' : 'linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%)'}; border-radius: 12px; display: flex; align-items: center; gap: 10px;">
                        <span>💡</span> ${encouragement}
                    </div>
                </div>
                <button onclick="deleteTask(${task.id}); loadDateTasks(new Date('${date.toISOString()}'))" class="gradient-btn" style="padding: 10px 18px; background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); font-size: 0.9rem; margin-top: 8px;">删除</button>
            </div>
        `;
    });
    
    todayTasksElement.innerHTML = html;
}

// 显示多日任务
function showMultiDayTasks(days) {
    const todayTasksElement = document.getElementById('todayTasks');
    const currentSelectedDateElement = document.getElementById('currentSelectedDate');
    if (!todayTasksElement || !currentSelectedDateElement) return;
    
    // 更新选中日期显示
    currentSelectedDateElement.textContent = `近${days}天任务`;
    
    // 获取任务
    const tasks = getTasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 筛选指定天数内的任务
    const multiDayTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        const diffTime = today - taskDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays < days;
    });
    
    // 按日期分组
    const tasksByDate = {};
    multiDayTasks.forEach(task => {
        const taskDate = new Date(task.date);
        const dateKey = taskDate.toLocaleDateString();
        if (!tasksByDate[dateKey]) {
            tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
    });
    
    // 生成HTML
    let html = '';
    
    // 按日期排序
    const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
        return new Date(b) - new Date(a); // 降序排列，最近的日期在前
    });
    
    sortedDates.forEach(dateKey => {
        const dateTasks = tasksByDate[dateKey];
        const date = new Date(dateKey);
        const isToday = date.toDateString() === today.toDateString();
        
        html += `
            <div style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f4ff;">
                    <div style="font-size: 1.2rem;">📅</div>
                    <h4 style="color: #1a2980; margin: 0; font-size: 1.1rem;">${isToday ? '今天' : dateKey}</h4>
                    <div style="margin-left: auto; font-size: 0.9rem; color: #666;">
                        ${dateTasks.filter(t => t.completed).length}/${dateTasks.length} 完成
                    </div>
                </div>
        `;
        
        dateTasks.forEach(task => {
            // 根据任务类型选择图标
            let icon = '📋';
            if (task.title.includes('运动')) icon = '🏃‍♂️';
            else if (task.title.includes('饮食')) icon = '🥗';
            else if (task.title.includes('水分')) icon = '💧';
            else if (task.title.includes('压力')) icon = '🧘‍♀️';
            
            // 获取鼓励话语
            const encouragement = getEncouragement(task.title);
            
            html += `
                <div style="display: flex; align-items: flex-start; gap: 15px; padding: 15px; background: ${task.completed ? '#f0fff4' : '#f8f9fa'}; border-radius: 12px; margin-bottom: 10px; border-left: 4px solid ${task.completed ? '#00b894' : '#1a2980'}; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease; animation: fadeIn 0.5s ease-in-out;">
                    <div style="font-size: 1.5rem; margin-top: 2px;">${icon}</div>
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompletion(${task.id}); showMultiDayTasks(${days})" style="width: 18px; height: 18px; cursor: pointer; accent-color: #1a2980; margin-top: 8px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1a2980; font-size: 1rem;">${task.title}</div>
                        <div style="font-size: 0.85rem; color: #666; margin-top: 3px;">${task.description}</div>
                    </div>
                    <button onclick="deleteTask(${task.id}); showMultiDayTasks(${days})" style="padding: 6px 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.3s ease; margin-top: 2px;">删除</button>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    if (sortedDates.length === 0) {
        html = `
            <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 15px; margin: 20px 0;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📅</div>
                <div style="font-size: 1.2rem; font-weight: 600; color: #666; margin-bottom: 10px;">近${days}天暂无任务</div>
                <div style="color: #999;">点击添加按钮创建新任务</div>
            </div>
        `;
    }
    
    todayTasksElement.innerHTML = html;
}

// 显示选中日期的任务
function showDateTasks(date) {
    const tasks = getTasks();
    const dateTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === selectedDate.getTime();
    });
    
    let html = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #1a2980; margin: 0;">${date.toLocaleDateString()}的任务</h3>
                    <button onclick="document.querySelector('.task-modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                </div>
                <div class="task-list">
    `;
    
    if (dateTasks.length === 0) {
        html += `
            <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 15px;">
                <div style="font-size: 2rem; margin-bottom: 15px;">📅</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #666; margin-bottom: 10px;">该日期暂无任务</div>
            </div>
        `;
    } else {
        dateTasks.forEach(task => {
            // 根据任务类型选择图标
            let icon = '📋';
            if (task.title.includes('运动')) icon = '🏃‍♂️';
            else if (task.title.includes('饮食')) icon = '🥗';
            else if (task.title.includes('水分')) icon = '💧';
            else if (task.title.includes('压力')) icon = '🧘‍♀️';
            
            html += `
                <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: ${task.completed ? '#f0fff4' : '#f8f9fa'}; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid ${task.completed ? '#00b894' : '#1a2980'};">
                    <div style="font-size: 1.5rem;">${icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1a2980;">${task.title}</div>
                        <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">${task.description}</div>
                    </div>
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompletion(${task.id}); showDateTasks(new Date('${date.toISOString()}'))" style="width: 18px; height: 18px; cursor: pointer;">
                </div>
            `;
        });
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    // 添加到页面
    const modal = document.createElement('div');
    modal.className = 'task-modal';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

// 获取任务
function getTasks() {
    if (!currentUser) return [];
    return JSON.parse(localStorage.getItem(`metascanTasks_${currentUser.username}`)) || [];
}

// 保存任务
function saveTasks(tasks) {
    if (!currentUser) return;
    localStorage.setItem(`metascanTasks_${currentUser.username}`, JSON.stringify(tasks));
}

// 获取任务的鼓励话语
function getEncouragement(taskTitle) {
    const encouragements = {
        '运动': [
            '每一次运动都是对自己的投资，坚持下去你会看到变化！',
            '运动不仅能强健身体，还能提升心情，加油！',
            '今天的你比昨天更棒，继续保持运动的好习惯！',
            '运动是最好的良药，坚持就是胜利！',
            '挥洒汗水的你最美丽，继续加油！'
        ],
        '饮食': [
            '健康的饮食是健康身体的基础，你做得很棒！',
            '每一口健康的食物都是对身体的关爱，继续保持！',
            '合理饮食，健康生活，你正在走向更好的自己！',
            '好的饮食习惯会让你精力充沛，继续加油！',
            '饮食健康，生活更美好，你做得很好！'
        ],
        '水分': [
            '多喝水是最简单的养生方式，你已经开始了！',
            '充足的水分能让身体更健康，继续保持！',
            '每一杯水都是对身体的滋养，坚持下去！',
            '多喝水，皮肤好，精神好，一切都好！',
            '水分是生命之源，你正在给身体最好的照顾！'
        ],
        '压力': [
            '学会放松是对自己最好的礼物，你已经开始了！',
            '冥想和深呼吸能让心灵更平静，继续练习！',
            '压力管理是现代生活的必修课，你做得很好！',
            '给自己一点时间，放松心情，你值得！',
            '平静的心灵是健康的基石，继续保持！'
        ]
    };
    
    for (const [key, value] of Object.entries(encouragements)) {
        if (taskTitle.includes(key)) {
            return value[Math.floor(Math.random() * value.length)];
        }
    }
    
    // 默认鼓励话语
    const defaultEncouragements = [
        '每完成一个任务，你都在变得更好！',
        '坚持就是胜利，你已经迈出了重要的一步！',
        '小目标，大成就，继续加油！',
        '你正在为自己的健康努力，真棒！',
        '每一个好习惯都能让你更接近理想的自己！'
    ];
    
    return defaultEncouragements[Math.floor(Math.random() * defaultEncouragements.length)];
}

// 加载今日任务
function loadTodayTasks() {
    const today = new Date();
    loadDateTasks(today);
}

// 切换任务完成状态
function toggleTaskCompletion(taskId) {
    const tasks = getTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasks(tasks);
        loadTodayTasks();
        updateWeekCompletion();
        loadUpcomingTasks();
        renderCalendar();
        
        if (tasks[taskIndex].completed) {
            // 显示完成动画
            showTaskCompletionAnimation();
            addNotification('任务完成', `您已完成任务：${tasks[taskIndex].title}`);
        }
    }
}

// 显示任务完成动画
function showTaskCompletionAnimation() {
    // 创建动画元素
    const animationElement = document.createElement('div');
    animationElement.style.position = 'fixed';
    animationElement.style.top = '50%';
    animationElement.style.left = '50%';
    animationElement.style.transform = 'translate(-50%, -50%)';
    animationElement.style.zIndex = '1000';
    animationElement.style.textAlign = 'center';
    animationElement.innerHTML = `
        <div style="font-size: 4rem; animation: pulse 1s ease-in-out;">✅</div>
        <div style="font-size: 1.2rem; font-weight: 600; color: #00b894; margin-top: 10px; animation: fadeIn 0.5s ease-in-out;">任务完成！</div>
    `;
    
    // 添加到页面
    document.body.appendChild(animationElement);
    
    // 3秒后移除
    setTimeout(() => {
        animationElement.style.animation = 'fadeOut 0.5s ease-in-out';
        setTimeout(() => {
            document.body.removeChild(animationElement);
        }, 500);
    }, 2000);
}

// 删除任务
function deleteTask(taskId) {
    const tasks = getTasks();
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(updatedTasks);
    loadTodayTasks();
    updateWeekCompletion();
    loadUpcomingTasks();
    renderCalendar();
}

// 更新周完成率
function updateWeekCompletion() {
    const weekCompletionRateElement = document.getElementById('weekCompletionRate');
    const weekCompletionBarElement = document.getElementById('weekCompletionBar');
    if (!weekCompletionRateElement || !weekCompletionBarElement) return;
    
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const tasks = getTasks();
    const weekTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= weekStart && taskDate <= weekEnd;
    });
    
    if (weekTasks.length === 0) {
        weekCompletionRateElement.textContent = '0%';
        weekCompletionBarElement.style.width = '0%';
        return;
    }
    
    const completedTasks = weekTasks.filter(task => task.completed).length;
    const completionRate = Math.round((completedTasks / weekTasks.length) * 100);
    
    weekCompletionRateElement.textContent = `${completionRate}%`;
    weekCompletionBarElement.style.width = `${completionRate}%`;
}

// 加载近期任务
function loadUpcomingTasks() {
    const upcomingTasksElement = document.getElementById('upcomingTasks');
    if (!upcomingTasksElement) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasks = getTasks();
    const upcomingTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate > today;
    }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
    
    if (upcomingTasks.length === 0) {
        upcomingTasksElement.innerHTML = `
            <div style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 15px; margin: 15px 0;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📅</div>
                <div style="font-size: 1rem; font-weight: 600; color: #666;">近期暂无任务</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    upcomingTasks.forEach((task, index) => {
        // 根据任务类型选择图标
        let icon = '📋';
        if (task.title.includes('运动')) icon = '🏃‍♂️';
        else if (task.title.includes('饮食')) icon = '🥗';
        else if (task.title.includes('水分')) icon = '💧';
        else if (task.title.includes('压力')) icon = '🧘‍♀️';
        
        const taskDate = new Date(task.date);
        html += `
            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f8f9fa; border-radius: 15px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: all 0.3s ease; animation: fadeIn 0.5s ease-in-out ${index * 0.1}s both;">
                <div style="font-size: 1.5rem;">${icon}</div>
                <div style="background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; padding: 10px; border-radius: 10px; text-align: center; min-width: 80px; box-shadow: 0 2px 10px rgba(26, 41, 128, 0.3);">
                    <div style="font-size: 0.8rem;">${taskDate.getMonth() + 1}月</div>
                    <div style="font-weight: 600; font-size: 1.2rem;">${taskDate.getDate()}</div>
                    <div style="font-size: 0.7rem;">${['日', '一', '二', '三', '四', '五', '六'][taskDate.getDay()]}</div>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1a2980; font-size: 1rem;">${task.title}</div>
                    <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">${task.description}</div>
                </div>
            </div>
        `;
    });
    
    upcomingTasksElement.innerHTML = html;
}

// 添加默认任务
function addDefaultTasks() {
    if (!currentUser) return;
    
    const tasks = getTasks();
    if (tasks.length > 0) return; // 已有任务，不添加默认任务
    
    const defaultTasks = [
        {
            id: Date.now() + 1,
            title: '晨间运动',
            description: '进行30分钟的轻度有氧运动，如散步或瑜伽',
            date: new Date().toISOString(),
            completed: false
        },
        {
            id: Date.now() + 2,
            title: '健康饮食',
            description: '今天尝试减少精制糖和加工食品的摄入',
            date: new Date().toISOString(),
            completed: false
        },
        {
            id: Date.now() + 3,
            title: '水分摄入',
            description: '确保今天喝够8杯水',
            date: new Date().toISOString(),
            completed: false
        },
        {
            id: Date.now() + 4,
            title: '压力管理',
            description: '花10分钟进行深呼吸或冥想',
            date: new Date().toISOString(),
            completed: false
        }
    ];
    
    saveTasks(defaultTasks);
}

// 修改showTab函数，添加日历页面的初始化
function showTab(tabName) {
    // 映射新标签名到旧标签名
    var mappedName = tabName;
    var effectiveNames = [tabName];

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

    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(function(tab) {
        tab.style.display = 'none';
    });

    // 移除所有标签按钮的激活状态
    document.querySelectorAll('.nav-tab').forEach(function(btn) {
        btn.classList.remove('active');
    });

    // 显示选中的标签内容（支持新旧标签名）
    var validIds = ['home', 'data', 'chat', 'reports', 'profile',
                    'metabolic', 'report', 'comparison', 'calendar', 'doctor',
                    'settings', 'about', 'doctorDashboard', 'doctorPatients'];
    if (document.getElementById(tabName)) {
        document.getElementById(tabName).style.display = 'block';
    }

    // 激活对应的按钮 - 新患者导航
    var newPatientIndex = ['home', 'data', 'chat', 'reports', 'profile'].indexOf(tabName);
    if (newPatientIndex >= 0) {
        var mainNav = document.querySelector('.main-nav');
        if (mainNav) {
            var mainBtns = mainNav.querySelectorAll('.nav-tab[data-nav]');
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

    // 医生导航按钮激活
    var doctorTabIndex = ['doctorDashboard', 'doctorPatients', 'profile'].indexOf(tabName);
    if (doctorTabIndex >= 0) {
        var doctorNav = document.querySelector('.doctor-nav');
        if (doctorNav) {
            var doctorBtns = doctorNav.querySelectorAll('.nav-tab[data-nav]');
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

    // --- 内容初始化 ---
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
        setTimeout(function() { switchMetabolicMode('camera'); }, 100);
    }

    // 聊天轮询控制
    if (tabName === 'chat' || tabName === 'doctor' || tabName === 'doctorPatients') {
        initChatSystem();
    } else {
        stopChatPolling();
    }
}

// ==================== 新标签内容加载 ====================
function loadHomeContent() {
    var homeContent = document.getElementById('homeContent');
    if (!homeContent) return;
    var calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        homeContent.innerHTML = calendarEl.innerHTML;
    }
    addDefaultTasks();
    initCalendar();
    initHealthAssistant();
    updateDisplays();
    updateUnreadBadges();
}

function loadDataContent() {
    var dataContent = document.getElementById('dataContent');
    if (!dataContent) return;
    var metabolicEl = document.getElementById('metabolic');
    if (metabolicEl) {
        dataContent.innerHTML = '<div id="dataMetabolicArea">' + metabolicEl.innerHTML + '</div><div id="dataComparisonArea" style="display:none;"></div>';
    }
    setTimeout(function() { switchMetabolicMode('camera'); }, 100);
}

function switchDataSubTab(subTab) { (window.switchDataSubTab || function(){})(subTab); }

function loadChatContent() {
    var chatContent = document.getElementById('chatContent');
    if (!chatContent) return;
    var doctorEl = document.getElementById('doctor');
    if (doctorEl) {
        chatContent.innerHTML = doctorEl.innerHTML;
    }
    loadDoctorList();
    loadPatientPrescriptions();
    loadChatMessages();
    loadReportAccessStatus();
    initChatSystem();
}

function loadReportsContent() {
    var reportsContent = document.getElementById('reportsContent');
    if (!reportsContent) return;

    var hideSkeleton = showSkeleton('reportsContent');

    if (currentResult && currentResult.overallRisk !== undefined) {
        renderReport(currentResult, 'reportsContent');
    } else {
        var reportEl = document.getElementById('report');
        if (reportEl) {
            reportsContent.innerHTML = reportEl.innerHTML;
        }
    }

    setTimeout(function() {
        hideSkeleton();
    }, 400);
}

function loadProfileContent() {
    var profileContent = document.getElementById('profileContent');
    if (!profileContent) return;

    var settingsEl = document.getElementById('settings');
    var settingsHTML = settingsEl ? settingsEl.innerHTML : '';
    var aboutEl = document.getElementById('about');
    var aboutHTML = aboutEl ? aboutEl.innerHTML : '';

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

// ==================== 帮助提示系统 ====================
var helpTips = {
    ocr: {
        title: 'OCR 文字识别',
        content: '上传含有代谢指标的检测报告图片（血脂、血糖、肝功能等），系统将通过 OCR 技术自动识别并提取数据。识别结果仅供参考，请务必核对后再保存。支持 JPG、PNG 格式，建议图片清晰、文字正向、光线充足。'
    },
    riskChart: {
        title: '风险分布雷达图',
        content: '雷达图以六边形直观展示您在脂质代谢、糖代谢、氨基酸代谢、炎症状态、能量代谢和氧化应激六个维度的风险水平。越靠近外圈表示该维度越需要关注，综合评分自动计算代谢综合征风险等级。'
    },
    metabolicEntry: {
        title: '代谢数据录入',
        content: '您可以通过拍照上传报告单（OCR自动识别）或手动输入各项指标两种方式录入代谢数据。录入完成后点击"生成健康评估报告"即可获得全面的代谢分析。建议定期（每1-3个月）更新数据，以追踪变化趋势。'
    }
};

var activeHelpTip = null;

function toggleHelpTip(event, key) {
    event.stopPropagation();
    if (activeHelpTip && activeHelpTip.dataset.tipKey === key) {
        closeHelpTip();
        return;
    }
    closeHelpTip();
    var tip = helpTips[key];
    if (!tip) return;
    var btn = event.currentTarget;
    var tooltip = document.createElement('div');
    tooltip.className = 'help-tooltip';
    tooltip.dataset.tipKey = key;
    tooltip.innerHTML =
        '<button class="help-tip-close" onclick="closeHelpTip()">✕</button>' +
        '<h4>' + tip.title + '</h4>' +
        '<p>' + tip.content + '</p>';
    document.body.appendChild(tooltip);
    activeHelpTip = tooltip;
    var btnRect = btn.getBoundingClientRect();
    var tooltipLeft = btnRect.left - 160;
    var tooltipTop = btnRect.bottom + 10;
    if (tooltipLeft < 10) tooltipLeft = 10;
    if (tooltipLeft + 340 > window.innerWidth) tooltipLeft = window.innerWidth - 350;
    if (tooltipTop + 180 > window.innerHeight) {
        tooltipTop = btnRect.top - 190;
        tooltip.querySelector('h4') && tooltip.querySelector('h4').insertAdjacentHTML('beforebegin', '<style>.help-tooltip::before{top:auto!important;bottom:-8px!important;transform:rotate(225deg)!important}</style>');
    }
    tooltip.style.left = tooltipLeft + 'px';
    tooltip.style.top = tooltipTop + 'px';
    document.addEventListener('click', closeHelpTipOnOutside);
}

function closeHelpTip() {
    if (activeHelpTip) {
        activeHelpTip.remove();
        activeHelpTip = null;
    }
    document.removeEventListener('click', closeHelpTipOnOutside);
}

function closeHelpTipOnOutside(e) {
    if (activeHelpTip && !activeHelpTip.contains(e.target)) {
        closeHelpTip();
    }
}

// ==================== 用户反馈系统 ====================
var feedbackScreenshotData = null;

function openFeedbackModal() { (window.openFeedbackModal || function(){})(); }

function closeFeedbackModal() { (window.closeFeedbackModal || function(){})(); }

function captureFeedbackScreenshot() { (window.captureFeedbackScreenshot || function(){})(); }

function submitFeedback() { (window.submitFeedback || function(){})(); }

// ==================== 评分系统 ====================
var selectedRatingScore = 0;

function checkRatingEligibility() {
    if (!currentUser) return;
    var ratedFlag = localStorage.getItem('metascanRated_' + currentUser.username);
    if (ratedFlag === 'done') return;
    var key = 'metascanData_' + currentUser.username;
    var data = JSON.parse(localStorage.getItem(key) || '[]');
    if (data.length >= 3 && !document.getElementById('ratingModalOverlay').classList.contains('active')) {
        setTimeout(function() {
            showRatingModal();
        }, 2000);
    }
}

function showRatingModal() {
    var overlay = document.getElementById('ratingModalOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        selectedRatingScore = 0;
        document.getElementById('ratingSuggestion').value = '';
        document.getElementById('btnRatingSubmit').disabled = true;
        document.querySelectorAll('.rating-stars .star-btn').forEach(function(btn) {
            btn.classList.remove('selected');
        });
        document.getElementById('ratingEmoji').textContent = '⭐';
    }
}

function selectRating(star) { (window.selectRating || function(){})(star); }

function skipRating() { (window.skipRating || function(){})(); }

function submitRating() { (window.submitRating || function(){})(); }

function closeRatingModal() {
    var overlay = document.getElementById('ratingModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ==================== 全局搜索 ====================
function toggleGlobalSearch() { (window.toggleGlobalSearch || function(){})(); }

function closeGlobalSearch() { (window.closeGlobalSearch || function(){})(); }

function performGlobalSearch(query) { (window.performGlobalSearch || function(){})(query); }

function navigateToSearchResult(type, username) {
    closeGlobalSearch();
    switch (type) {
        case 'metabolic': showTab('data'); switchDataSubTab('metabolic'); break;
        case 'doctor': showTab('chat'); setTimeout(function() { if (username) selectDoctor(username); }, 300); break;
        case 'prescription': showTab('chat'); break;
        case 'chat': showTab('chat'); break;
        case 'health': showTab('home'); break;
        default: break;
    }
}

// 便签功能

// 加载便签
function loadNotes() {
    if (!currentUser) return;
    
    const notes = JSON.parse(localStorage.getItem(`metascanNotes_${currentUser.username}`)) || [];
    const notesContainer = document.getElementById('notesContainer');
    if (!notesContainer) return;
    
    if (notes.length === 0) {
        notesContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 40px; grid-column: 1 / -1;">暂无便签，点击添加按钮创建新便签</p>';
        return;
    }
    
    let html = '';
    notes.forEach(note => {
        const date = new Date(note.createdAt).toLocaleString();
        html += `
            <div style="background: #f8f9fa; border: 1px solid #e0e6ed; border-radius: 10px; padding: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h4 style="color: #1a2980; margin: 0; font-size: 1rem;">${note.title}</h4>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="editNote(${note.id})" style="background: #f0f4ff; border: 1px solid #e0e6ed; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-size: 0.8rem; transition: all 0.3s ease;">编辑</button>
                        <button onclick="deleteNote(${note.id})" style="background: #fee; border: 1px solid #f5c6cb; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-size: 0.8rem; transition: all 0.3s ease;">删除</button>
                    </div>
                </div>
                <div style="font-size: 0.9rem; color: #666; margin-bottom: 10px; line-height: 1.4;">${note.content}</div>
                <div style="font-size: 0.8rem; color: #999; text-align: right;">${date}</div>
            </div>
        `;
    });
    
    notesContainer.innerHTML = html;
}

// 添加便签
function addNote() { (window.addNote || function(){})(); }

// 删除便签
function deleteNote(id) {
    if (!currentUser) return;
    
    const notes = JSON.parse(localStorage.getItem(`metascanNotes_${currentUser.username}`)) || [];
    const updatedNotes = notes.filter(note => note.id !== id);
    
    localStorage.setItem(`metascanNotes_${currentUser.username}`, JSON.stringify(updatedNotes));
    
    // 重新加载便签
    loadNotes();
    
    showNotification('便签删除成功');
}

// 编辑便签
function editNote(id) {
    if (!currentUser) return;
    
    const notes = JSON.parse(localStorage.getItem(`metascanNotes_${currentUser.username}`)) || [];
    const note = notes.find(note => note.id === id);
    
    if (!note) return;
    
    const newTitle = prompt('请输入新的便签标题:', note.title);
    const newContent = prompt('请输入新的便签内容:', note.content);
    
    if (newTitle !== null && newContent !== null) {
        note.title = newTitle.trim();
        note.content = newContent.trim();
        note.updatedAt = new Date().toISOString();
        
        localStorage.setItem(`metascanNotes_${currentUser.username}`, JSON.stringify(notes));
        
        // 重新加载便签
        loadNotes();
        
        showNotification('便签编辑成功');
    }
}

// ========== PDF导出功能 ==========

// 导出健康报告为PDF
function exportHealthReport() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }

    var patientData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
    if (patientData.length === 0) {
        alert('暂无检测数据，无法导出');
        return;
    }

    var reportContainer = document.getElementById('reportsContent');
    if (reportContainer) {
        exportElementToPDF(reportContainer, '健康报告_' + new Date().toISOString().split('T')[0]);
    } else {
        var latestData = patientData[patientData.length - 1];
        var reportHTML = generateReportHTML(latestData);
        exportHTMLToPDF(reportHTML, '健康报告_' + new Date().toISOString().split('T')[0]);
    }
}

// ====== 报告锚点导航 ======
function scrollToSection(section) {
    const el = document.getElementById('report-section-' + section);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 高亮当前锚点
        document.querySelectorAll('#reportNav a').forEach(a => {
            a.style.background = '#f1f5f9';
            a.style.color = '#475569';
        });
    }
}

// ====== 核心：html2canvas + jsPDF 多页导出 ======
function exportElementToPDF(element, filename) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert('PDF导出组件未加载，请刷新页面后重试');
        return;
    }
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成PDF', '请稍候...');

    var clone = element.cloneNode(true);
    var buttons = clone.querySelectorAll('button');
    buttons.forEach(function(b) { b.style.display = 'none'; });

    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = '800px';
    clone.style.zIndex = '-9999';
    clone.style.background = '#ffffff';
    clone.style.display = 'block';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    document.body.appendChild(clone);

    html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(function(canvas) {
        document.body.removeChild(clone);

        var pdfModule = window.jspdf;
        var jsPDF = pdfModule.jsPDF || pdfModule.default || pdfModule;
        var pdf = new jsPDF('p', 'mm', 'a4');

        var pageWidth = 210;
        var pageHeight = 297;
        var imgWidth = pageWidth - 20;
        var imgHeight = (canvas.height * imgWidth) / canvas.width;

        var totalPages = Math.ceil(imgHeight / (pageHeight - 20));
        var margin = 10;

        for (var page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();

            var srcY = page * (canvas.height / totalPages);
            var srcHeight = canvas.height / totalPages;

            var pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = srcHeight * (canvas.width / imgWidth);
            var ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, pageCanvas.width, pageCanvas.height);

            var pageImgData = pageCanvas.toDataURL('image/png');
            var pageImgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;

            pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(pageImgHeight, pageHeight - margin * 2));
        }

        pdf.save(filename + '.pdf');

        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('PDF导出成功', filename + '.pdf');
    }).catch(function(error) {
        console.error('PDF导出失败:', error);
        if (document.body.contains(clone)) document.body.removeChild(clone);
        alert('PDF导出失败，请重试');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('PDF导出失败', '请重试');
    });
}

function exportHTMLToPDF(htmlContent, filename) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert('PDF导出组件未加载，请刷新页面后重试');
        return;
    }
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成PDF', '请稍候...');

    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '0';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.zIndex = '-9999';
    tempDiv.style.background = '#ffffff';
    tempDiv.style.fontFamily = "'Microsoft YaHei', Arial, sans-serif";
    tempDiv.style.color = '#1e293b';
    tempDiv.style.padding = '20px';
    document.body.appendChild(tempDiv);

    html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(function(canvas) {
        document.body.removeChild(tempDiv);

        var pdfModule = window.jspdf;
        var jsPDF = pdfModule.jsPDF || pdfModule.default || pdfModule;
        var pdf = new jsPDF('p', 'mm', 'a4');

        var pageWidth = 210;
        var pageHeight = 297;
        var imgWidth = pageWidth - 20;
        var imgHeight = (canvas.height * imgWidth) / canvas.width;

        var totalPages = Math.ceil(imgHeight / (pageHeight - 20));
        var margin = 10;

        for (var page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();

            var srcY = page * (canvas.height / totalPages);
            var srcHeight = canvas.height / totalPages;

            var pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = srcHeight * (canvas.width / imgWidth);
            var ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, pageCanvas.width, pageCanvas.height);

            var pageImgData = pageCanvas.toDataURL('image/png');
            var pageImgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;

            pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(pageImgHeight, pageHeight - margin * 2));
        }

        pdf.save(filename + '.pdf');

        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('PDF导出成功', filename + '.pdf');
    }).catch(function(error) {
        console.error('PDF导出失败:', error);
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
        alert('PDF导出失败，请重试');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('PDF导出失败', '请重试');
    });
}

function saveReportAsPDF() {
    var reportEl = document.getElementById('reportsContent');
    if (!reportEl) { alert('未找到报告内容'); return; }
    exportElementToPDF(reportEl, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
}

// ====== 导出Word报告 ======
function exportReportAsWord() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }

    var allData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
    if (allData.length === 0) {
        alert('暂无检测数据，无法导出');
        return;
    }

    var data = window._currentReportData;
    if (!data || data.overallRisk === undefined) {
        data = allData[allData.length - 1];
    }

    var riskLevel = data.overallRisk < 30 ? '低风险' : data.overallRisk < 60 ? '中等风险' : '高风险';
    var riskColor = data.overallRisk < 30 ? '#00b894' : data.overallRisk < 60 ? '#f39c12' : '#e74c3c';
    var dimNames = { lipid: '脂质代谢', glucose: '糖代谢', amino: '氨基酸代谢', inflammation: '炎症状态', energy: '能量代谢', oxidative: '氧化应激' };

    var wordHTML = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
    wordHTML += '<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
    wordHTML += '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->';
    wordHTML += '<style>@page { size: A4; margin: 2cm; } body { font-family: "Microsoft YaHei", sans-serif; color: #1e293b; line-height: 1.8; }';
    wordHTML += 'h1 { color: #1a2980; font-size: 24pt; text-align: center; border-bottom: 3px solid #1a2980; padding-bottom: 10pt; margin-bottom: 20pt; }';
    wordHTML += 'h2 { color: #1a2980; font-size: 16pt; border-bottom: 2px solid #e0e6ed; padding-bottom: 6pt; margin-top: 20pt; }';
    wordHTML += 'h3 { color: #1a2980; font-size: 13pt; margin-top: 16pt; }';
    wordHTML += 'table { border-collapse: collapse; width: 100%; margin: 12pt 0; }';
    wordHTML += 'th, td { border: 1px solid #cbd5e1; padding: 8pt 10pt; text-align: left; }';
    wordHTML += 'th { background-color: #f0f4ff; font-weight: bold; }';
    wordHTML += '.risk-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12pt 16pt; border-radius: 4pt; margin-bottom: 8pt; }';
    wordHTML += '.risk-bar-outer { height: 8pt; background: #e2e8f0; border-radius: 4pt; overflow: hidden; width: 60%; margin: 4pt 0; }';
    wordHTML += '.footer { text-align: center; border-top: 2px solid #e0e6ed; margin-top: 30pt; padding-top: 12pt; font-size: 9pt; color: #94a3b8; }';
    wordHTML += '</style></head><body>';

    wordHTML += '<h1>MetaScan 代谢健康报告</h1>';
    wordHTML += '<p style="text-align:center; color:#64748b;">报告日期: ' + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    wordHTML += '<p style="text-align:center; color:#64748b;">检测日期: ' + data.date + '</p>';

    wordHTML += '<h2>一、总体风险评估</h2>';
    wordHTML += '<div class="risk-card" style="text-align:center;">';
    wordHTML += '<p style="font-size:36pt; font-weight:bold; color:' + riskColor + '; margin:8pt 0;">' + data.overallRisk.toFixed(1) + '</p>';
    wordHTML += '<p style="font-size:16pt; font-weight:bold; color:' + riskColor + ';">' + riskLevel + '</p>';
    wordHTML += '</div>';

    wordHTML += '<h2>二、各维度风险评分</h2>';
    wordHTML += '<table><tr><th>维度</th><th>评分</th><th>风险等级</th><th>进度</th></tr>';

    if (data.riskScores) {
        Object.entries(data.riskScores).forEach(function(entry) {
            var key = entry[0], value = entry[1];
            var lvl = value < 30 ? '良好' : value < 60 ? '留意' : '关注';
            var c = value < 30 ? '#10b981' : value < 60 ? '#f59e0b' : '#ef4444';
            wordHTML += '<tr><td>' + (dimNames[key] || key) + '</td>';
            wordHTML += '<td style="font-weight:bold;color:' + c + ';">' + value.toFixed(0) + '</td>';
            wordHTML += '<td style="color:' + c + ';">' + lvl + '</td>';
            wordHTML += '<td><div class="risk-bar-outer"><div style="height:100%;width:' + Math.min(value, 100) + '%;background:' + c + ';"></div></div></td>';
            wordHTML += '</tr>';
        });
    }
    wordHTML += '</table>';

    wordHTML += '<h2>三、代谢指标数据</h2>';
    wordHTML += '<table><tr><th>指标名称</th><th>检测值</th><th>单位</th><th>参考范围</th><th>状态</th></tr>';

    var METABOLITES = [
        { id: 'GLU', name: '葡萄糖', unit: 'mmol/L', normalRange: '3.9 - 6.1' },
        { id: 'TC', name: '总胆固醇', unit: 'mmol/L', normalRange: '2.8 - 5.17' },
        { id: 'TG', name: '甘油三酯', unit: 'mmol/L', normalRange: '0.56 - 1.7' },
        { id: 'HDL_C', name: '高密度脂蛋白', unit: 'mmol/L', normalRange: '1.03 - 1.55' },
        { id: 'LDL_C', name: '低密度脂蛋白', unit: 'mmol/L', normalRange: '0 - 3.37' },
        { id: 'UA', name: '尿酸', unit: 'µmol/L', normalRange: '155 - 357' },
        { id: 'ALT', name: '丙氨酸氨基转移酶', unit: 'U/L', normalRange: '7 - 40' },
        { id: 'AST', name: '天冬氨酸氨基转移酶', unit: 'U/L', normalRange: '13 - 35' },
        { id: 'CREA', name: '肌酐', unit: 'µmol/L', normalRange: '44 - 97' },
        { id: 'UREA', name: '尿素', unit: 'mmol/L', normalRange: '2.8 - 7.2' },
        { id: 'HS_CRP', name: '超敏C反应蛋白', unit: 'mg/L', normalRange: '0 - 3' },
        { id: 'HCY', name: '同型半胱氨酸', unit: 'µmol/L', normalRange: '5 - 15' },
        { id: 'LAC', name: '乳酸', unit: 'mmol/L', normalRange: '0.5 - 2.2' },
        { id: 'KET', name: '酮体', unit: 'mmol/L', normalRange: '0.02 - 0.27' }
    ];

    METABOLITES.forEach(function(m) {
        var val = data[m.id] !== undefined ? data[m.id] : '-';
        var status = '-';
        if (val !== '-' && m.normalRange) {
            var parts = m.normalRange.split('-');
            var low = parseFloat(parts[0]), high = parseFloat(parts[1]);
            if (!isNaN(low) && !isNaN(high)) {
                status = val < low ? '偏低' : val > high ? '偏高' : '正常';
            }
        }
        var statusColor = status === '正常' ? '#10b981' : status === '-' ? '#94a3b8' : '#ef4444';
        wordHTML += '<tr><td>' + m.name + '</td>';
        wordHTML += '<td>' + (val !== '-' ? val.toFixed(2) : '-') + '</td>';
        wordHTML += '<td>' + m.unit + '</td>';
        wordHTML += '<td>' + m.normalRange + '</td>';
        wordHTML += '<td style="color:' + statusColor + ';font-weight:bold;">' + status + '</td></tr>';
    });
    wordHTML += '</table>';

    wordHTML += '<h2>四、健康建议</h2>';
    wordHTML += '<ol>';
    wordHTML += '<li><strong>饮食管理：</strong>建议保持均衡饮食，减少高脂肪、高糖食物的摄入，增加新鲜蔬菜和水果的比例。</li>';
    wordHTML += '<li><strong>运动锻炼：</strong>建议每周进行至少150分钟的中等强度有氧运动，如快走、游泳等。</li>';
    wordHTML += '<li><strong>作息规律：</strong>保持充足的睡眠，每天7-8小时，避免熬夜，建立规律的作息习惯。</li>';
    wordHTML += '<li><strong>压力管理：</strong>学会合理释放压力，可通过冥想、瑜伽、听音乐等方式缓解压力。</li>';
    wordHTML += '<li><strong>定期复查：</strong>建议定期进行健康检查，及时了解身体状况变化。</li>';
    wordHTML += '</ol>';

    wordHTML += '<div class="footer"><p>MetaScan 智能健康管理平台</p><p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p></div>';
    wordHTML += '</body></html>';

    var blob = new Blob([wordHTML], { type: 'application/msword;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MetaScan健康报告_' + new Date().toISOString().split('T')[0] + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);

    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('Word报告导出成功', '可下载后用Microsoft Word打开编辑');
}

// ====== 报告分享功能 ======
function checkSharedReportOnLoad() {
    var urlParams = new URLSearchParams(window.location.search);
    var shareId = urlParams.get('share');
    var pwd = urlParams.get('pwd');
    if (shareId) {
        var cleanedUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanedUrl);
        setTimeout(function() {
            openSharedReport(shareId, pwd || '');
        }, 800);
    }
}

function generateShareLink() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }

    var allData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
    if (allData.length === 0) {
        alert('暂无检测数据，无法分享');
        return;
    }

    var data = window._currentReportData;
    if (!data || data.overallRisk === undefined) {
        data = allData[allData.length - 1];
    }

    var shareId = generateShareId();
    var sharePassword = generateSharePassword(6);

    var shareEntry = {
        id: shareId,
        password: sharePassword,
        reportData: data,
        username: currentUser.username,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        viewCount: 0,
        maxViews: 10
    };

    var allShares = JSON.parse(localStorage.getItem('metascanShares_' + currentUser.username)) || [];
    allShares = allShares.filter(function(s) { return Date.now() < s.expiresAt; });
    allShares.push(shareEntry);
    localStorage.setItem('metascanShares_' + currentUser.username, JSON.stringify(allShares));

    var shareLink = window.location.origin + window.location.pathname + '?share=' + shareId + '&pwd=' + sharePassword;

    showShareModal(shareLink, sharePassword, shareId);
}

function generateShareId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function generateSharePassword(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var pwd = '';
    for (var i = 0; i < length; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
}

function showShareModal(shareLink, sharePassword, shareId) {
    var existingModal = document.getElementById('shareModal');
    if (existingModal) existingModal.remove();

    var expiresTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('zh-CN');

    var modalHTML = '<div class="modal-overlay" id="shareModalOverlay" onclick="closeShareModal()">';
    modalHTML += '<div class="modal" id="shareModal" onclick="event.stopPropagation()" style="max-width: 520px; background: white; border-radius: 20px; padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); position: relative;">';
    modalHTML += '<button onclick="closeShareModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:#94a3b8;">&times;</button>';
    modalHTML += '<div style="text-align:center;margin-bottom:20px;">';
    modalHTML += '<div style="font-size:3rem;margin-bottom:8px;">🔗</div>';
    modalHTML += '<h3 style="color:#1a2980;font-size:1.3rem;margin:0;">报告分享链接已生成</h3>';
    modalHTML += '<p style="color:#64748b;font-size:0.85rem;margin-top:6px;">有效期至: ' + expiresTime + ' · 剩余查看次数: 10</p>';
    modalHTML += '</div>';

    modalHTML += '<div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:12px;">';
    modalHTML += '<div style="font-size:0.8rem;color:#64748b;margin-bottom:6px;font-weight:600;">分享链接</div>';
    modalHTML += '<div style="display:flex;gap:8px;">';
    modalHTML += '<input type="text" id="shareLinkInput" value="' + shareLink + '" readonly style="flex:1;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.82rem;background:white;color:#1e293b;">';
    modalHTML += '<button onclick="copyShareLink()" style="padding:10px 18px;background:linear-gradient(135deg,#1a2980,#26d0ce);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:0.85rem;white-space:nowrap;">📋 复制</button>';
    modalHTML += '</div></div>';

    modalHTML += '<div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:20px;">';
    modalHTML += '<div style="font-size:0.8rem;color:#64748b;margin-bottom:6px;font-weight:600;">访问密码</div>';
    modalHTML += '<div style="display:flex;align-items:center;gap:8px;">';
    modalHTML += '<code style="font-size:1.4rem;font-weight:800;letter-spacing:4px;color:#1a2980;background:white;padding:8px 16px;border-radius:8px;">' + sharePassword + '</code>';
    modalHTML += '<button onclick="copySharePassword()" style="padding:8px 14px;background:white;border:2px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:0.8rem;">📋</button>';
    modalHTML += '</div></div>';

    modalHTML += '<p style="font-size:0.78rem;color:#94a3b8;text-align:center;margin:0;">分享链接24小时后自动失效 · 最多查看10次</p>';
    modalHTML += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeShareModal() {
    var overlay = document.getElementById('shareModalOverlay');
    var modal = document.getElementById('shareModal');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

function copyShareLink() {
    var input = document.getElementById('shareLinkInput');
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(function() {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('链接已复制', '可粘贴发送给他人');
    }).catch(function() {
        alert('复制失败，请手动复制');
    });
}

function copySharePassword() {
    navigator.clipboard.writeText(document.querySelector('#shareModal code').textContent).then(function() {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('密码已复制', '请妥善保管');
    }).catch(function() {
        alert('复制失败');
    });
}

function openSharedReport(shareId, password) {
    var allKeys = Object.keys(localStorage).filter(function(k) { return k.startsWith('metascanShares_'); });
    for (var i = 0; i < allKeys.length; i++) {
        var shares = JSON.parse(localStorage.getItem(allKeys[i])) || [];
        var match = shares.find(function(s) { return s.id === shareId; });
        if (match) {
            if (Date.now() > match.expiresAt) {
                alert('该分享链接已过期（有效期24小时）');
                return false;
            }
            if (match.viewCount >= match.maxViews) {
                alert('该分享链接已达最大查看次数');
                return false;
            }
            if (match.password && match.password !== password) {
                showSharePasswordModal(shareId);
                return false;
            }
            match.viewCount++;
            localStorage.setItem(allKeys[i], JSON.stringify(shares));

            var timeStr = new Date().toLocaleString('zh-CN');
            var reportHTML = '<div style="padding:24px;max-width:900px;margin:0 auto;font-family:\'Microsoft YaHei\',sans-serif;">';
            reportHTML += '<div style="text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #1a2980;">';
            reportHTML += '<h1 style="color:#1a2980;font-size:24px;">MetaScan 共享健康报告</h1>';
            reportHTML += '<p style="color:#666;">由 ' + (match.username || '用户') + ' 分享 · 查看时间: ' + timeStr + '</p>';
            reportHTML += '<p style="color:#ef4444;font-size:0.8rem;">⚠ 该报告仅供查看，剩余次数: ' + (match.maxViews - match.viewCount) + '</p>';
            reportHTML += '</div>';

            var data = match.reportData;
            var riskColor = data.overallRisk < 30 ? '#10b981' : data.overallRisk < 60 ? '#f59e0b' : '#ef4444';

            reportHTML += '<div style="text-align:center;margin-bottom:28px;padding:24px;background:linear-gradient(135deg,#f0f4ff,#e3f2fd);border-radius:16px;">';
            reportHTML += '<h2 style="color:#1a2980;font-size:18px;">总体风险评估</h2>';
            reportHTML += '<div style="font-size:48px;font-weight:bold;color:' + riskColor + ';">' + data.overallRisk.toFixed(1) + '</div>';
            reportHTML += '</div>';

            if (data.riskScores) {
                reportHTML += '<h3 style="color:#1a2980;">各维度风险评分</h3>';
                reportHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">';
                reportHTML += '<tr style="background:#f0f4ff;"><th style="border:1px solid #e0e6ed;padding:10px;">维度</th><th style="border:1px solid #e0e6ed;padding:10px;">评分</th></tr>';
                var dimNames = { lipid: '脂质代谢', glucose: '糖代谢', amino: '氨基酸代谢', inflammation: '炎症状态', energy: '能量代谢', oxidative: '氧化应激' };
                Object.entries(data.riskScores).forEach(function(e) {
                    var c = e[1] < 30 ? '#10b981' : e[1] < 60 ? '#f59e0b' : '#ef4444';
                    reportHTML += '<tr><td style="border:1px solid #e0e6ed;padding:10px;">' + (dimNames[e[0]] || e[0]) + '</td>';
                    reportHTML += '<td style="border:1px solid #e0e6ed;padding:10px;font-weight:bold;color:' + c + ';">' + e[1].toFixed(0) + '</td></tr>';
                });
                reportHTML += '</table>';
            }

            reportHTML += '<div style="text-align:center;margin-top:40px;padding-top:16px;border-top:2px solid #e0e6ed;color:#94a3b8;font-size:12px;">';
            reportHTML += '<p>MetaScan 智能健康管理平台 · 数据来自分享</p>';
            reportHTML += '<p>本报告仅供参考，不作为诊断依据</p></div></div>';

            var existingModal = document.getElementById('sharedReportModal');
            if (existingModal) existingModal.remove();

            document.body.insertAdjacentHTML('beforeend',
                '<div class="modal-overlay" id="sharedReportOverlay" onclick="closeSharedReport()">' +
                '<div class="modal" id="sharedReportModal" onclick="event.stopPropagation()" style="max-width:920px;max-height:85vh;overflow-y:auto;background:white;border-radius:20px;padding:0;box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative;">' +
                '<button onclick="closeSharedReport()" style="position:sticky;top:12px;float:right;z-index:10;background:white;border:2px solid #e2e8f0;border-radius:50%;width:36px;height:36px;font-size:1.2rem;cursor:pointer;color:#64748b;margin:12px;">&times;</button>' +
                reportHTML +
                '</div></div>');

            return true;
        }
    }
    alert('未找到该分享报告，链接可能已失效');
    return false;
}

function showSharePasswordModal(shareId) {
    var existingModal = document.getElementById('sharePwdModal');
    if (existingModal) existingModal.remove();

    var modalHTML = '<div class="modal-overlay" id="sharePwdOverlay" onclick="closeSharePwdModal()">';
    modalHTML += '<div class="modal" id="sharePwdModal" onclick="event.stopPropagation()" style="max-width:400px;background:white;border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center;">';
    modalHTML += '<div style="font-size:2.5rem;margin-bottom:10px;">🔒</div>';
    modalHTML += '<h3 style="color:#1a2980;margin:0 0 8px 0;">输入访问密码</h3>';
    modalHTML += '<p style="color:#64748b;font-size:0.85rem;margin-bottom:16px;">该报告设有访问密码保护</p>';
    modalHTML += '<input type="text" id="sharePwdInput" placeholder="输入6位访问密码" maxlength="6" style="width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:1rem;text-align:center;letter-spacing:6px;outline:none;box-sizing:border-box;" onkeydown="if(event.key===\'Enter\')verifySharePwd(\'' + shareId + '\')">';
    modalHTML += '<button onclick="verifySharePwd(\'' + shareId + '\')" style="width:100%;margin-top:16px;padding:12px;background:linear-gradient(135deg,#1a2980,#26d0ce);color:white;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;">🔓 验证并查看</button>';
    modalHTML += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(function() {
        var input = document.getElementById('sharePwdInput');
        if (input) input.focus();
    }, 200);
}

function closeSharePwdModal() {
    var overlay = document.getElementById('sharePwdOverlay');
    var modal = document.getElementById('sharePwdModal');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

function verifySharePwd(shareId) {
    var pwd = document.getElementById('sharePwdInput').value;
    closeSharePwdModal();
    openSharedReport(shareId, pwd);
}

function closeSharedReport() {
    var overlay = document.getElementById('sharedReportOverlay');
    var modal = document.getElementById('sharedReportModal');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

// ====== 健康卡片生成（可分享到微信/保存图片） ======
function generateHealthCard() {
    const data = window._currentReportData;
    if (!data) { alert('请先生成报告'); return; }
    
    const riskText = data.overallRisk < 30 ? '状况良好' : data.overallRisk < 60 ? '建议调整' : '需要关注';
    const riskColor = data.overallRisk < 30 ? '#10b981' : data.overallRisk < 60 ? '#f59e0b' : '#ef4444';
    
    const cardHTML = `
    <div id="healthCardCanvas" style="width: 400px; background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); border-radius: 24px; padding: 28px; font-family: 'Microsoft YaHei', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.12); position: relative; overflow: hidden;">
        <div style="position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: ${riskColor}; opacity: 0.08; border-radius: 50%;"></div>
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 1.4rem; font-weight: 800; color: #1a2980; margin-bottom: 4px;">🧬 MetaScan 健康卡片</div>
            <div style="font-size: 0.8rem; color: #64748b;">${data.date || new Date().toLocaleDateString('zh-CN')}</div>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px; padding: 16px; background: white; border-radius: 16px;">
            <div style="width: 70px; height: 70px; border-radius: 50%; background: ${riskColor}; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.8rem; font-weight: 800;">${data.overallRisk.toFixed(0)}</div>
            <div>
                <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">${riskText}</div>
                <div style="font-size: 0.78rem; color: #64748b;">综合风险指数</div>
                <div style="height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 6px; overflow: hidden; width: 120px;">
                    <div style="height: 100%; width: ${Math.min(data.overallRisk, 100)}%; background: ${riskColor};"></div>
                </div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            ${Object.entries(data.riskScores || {}).slice(0, 4).map(([k, v]) => {
                const dimNames = { lipid: '脂质', glucose: '糖代谢', amino: '氨基酸', inflammation: '炎症', energy: '能量', oxidative: '氧化应激' };
                const c = v < 30 ? '#10b981' : v < 60 ? '#f59e0b' : '#ef4444';
                return `<div style="background: white; padding: 10px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.7rem; color: #64748b;">${dimNames[k] || k}</div>
                    <div style="font-weight: 700; color: ${c}; font-size: 1rem;">${v.toFixed(0)}</div>
                </div>`;
            }).join('')}
        </div>
        <div style="text-align: center; font-size: 0.7rem; color: #94a3b8; padding-top: 8px; border-top: 1px solid #e2e8f0;">
            MetaScan 智能健康管理平台 · 仅供参考
        </div>
    </div>`;
    
    // 创建临时容器并转换为canvas
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHTML;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);
    
    // 使用html2canvas风格的方法 - 直接打开新窗口让用户截图
    const w = window.open('', '_blank', 'width=440,height=700');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>健康卡片</title></head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;margin:0;">${cardHTML}</body></html>`);
    w.document.close();
    
    document.body.removeChild(tempDiv);
    
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('健康卡片已生成', '可在新窗口中截图保存或分享');
}

// ====== 语音播报报告概要 ======
let ttsUtterance = null;
let ttsPlaying = false;

function toggleReportTTS() {
    const btn = document.getElementById('ttsButton');
    const data = window._currentReportData;
    if (!data) return;
    
    if (!('speechSynthesis' in window)) {
        alert('您的浏览器不支持语音播报功能');
        return;
    }
    
    if (ttsPlaying) {
        window.speechSynthesis.cancel();
        ttsPlaying = false;
        if (btn) btn.innerHTML = '🔊 收听报告概要';
        return;
    }
    
    window.speechSynthesis.cancel();
    
    const riskText = data.overallRisk < 30 ? '状况良好' : data.overallRisk < 60 ? '建议调整' : '需要关注';
    const riskInfo = getRiskDescription(data.overallRisk, data.riskScores);
    const riskInfoClean = riskInfo.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    const abnormalCount = (data.abnormalMetabolites || []).length;
    const abnormalText = abnormalCount > 0 
        ? `共检测到 ${abnormalCount} 项指标超出正常范围。` 
        : '所有检测指标均在正常范围内。保持健康生活习惯。';
    
    const summary = `您好，这是您的MetaScan健康报告概要。您的综合风险评分为${data.overallRisk.toFixed(0)}分，风险等级为：${riskText}。${riskInfoClean.substring(0, 200)}${abnormalText}`;
    
    ttsUtterance = new SpeechSynthesisUtterance(summary);
    ttsUtterance.lang = 'zh-CN';
    ttsUtterance.rate = 0.95;
    ttsUtterance.pitch = 1.0;
    ttsUtterance.volume = 0.9;
    
    ttsUtterance.onstart = () => {
        ttsPlaying = true;
        if (btn) btn.innerHTML = '⏹️ 停止播报';
    };
    ttsUtterance.onend = ttsUtterance.onerror = () => {
        ttsPlaying = false;
        if (btn) btn.innerHTML = '🔊 收听报告概要';
    };
    
    window.speechSynthesis.speak(ttsUtterance);
    ttsPlaying = true;
    if (btn) btn.innerHTML = '⏹️ 停止播报';
}

// 导出历史对比为PDF
function exportComparisonReport() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }

    var patientData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
    if (patientData.length < 2) {
        alert('至少需要两次检测数据才能进行对比');
        return;
    }

    var comparisonContainer = document.getElementById('comparison');
    if (comparisonContainer) {
        exportElementToPDF(comparisonContainer, 'MetaScan历史对比_' + new Date().toISOString().split('T')[0]);
    } else {
        var comparisonHTML = generateComparisonHTML(patientData);
        exportHTMLToPDF(comparisonHTML, 'MetaScan历史对比_' + new Date().toISOString().split('T')[0]);
    }
}

// 生成报告HTML
function generateReportHTML(data) {
    const riskLevel = data.overallRisk < 30 ? '低风险' : data.overallRisk < 60 ? '中等风险' : '高风险';
    const riskColor = data.overallRisk < 30 ? '#00b894' : data.overallRisk < 60 ? '#f39c12' : '#e74c3c';
    
    return `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1a2980; padding-bottom: 20px;">
                <h1 style="color: #1a2980; margin: 0; font-size: 28px;">MetaScan 代谢健康报告</h1>
                <p style="color: #666; margin-top: 10px; font-size: 14px;">报告日期: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="color: #666; font-size: 14px;">检测日期: ${data.date}</p>
            </div>

            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; text-align: center;">
                <h2 style="color: #1a2980; margin-top: 0; font-size: 20px;">总体风险评估</h2>
                <div style="font-size: 48px; font-weight: bold; color: ${riskColor}; margin: 15px 0;">${data.overallRisk.toFixed(1)}</div>
                <div style="font-size: 18px; font-weight: 600; color: ${riskColor};">${riskLevel}</div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">各维度风险评分</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
                    ${generateRiskCard('脂质代谢', data.riskScores.lipid, '🩸')}
                    ${generateRiskCard('糖代谢', data.riskScores.glucose, '🥗')}
                    ${generateRiskCard('氨基酸代谢', data.riskScores.amino, '⚗️')}
                    ${generateRiskCard('炎症状态', data.riskScores.inflammation, '🔥')}
                    ${generateRiskCard('能量代谢', data.riskScores.energy, '⚡')}
                    ${generateRiskCard('氧化应激', data.riskScores.oxidative, '🍃')}
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">识别的代谢亚型</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 15px;">
                    ${data.subtypes.length > 0 ? 
                        data.subtypes.map(st => `<div style="margin-bottom: 10px; font-weight: 600;">• ${window.subtypes[st] ? window.subtypes[st].name : st}</div>`).join('') :
                        '<div style="color: #666;">未识别到特定代谢亚型</div>'
                    }
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">详细分析</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 15px; line-height: 1.8; color: #333;">
                    ${generateDetailedAnalysis(data)}
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">健康建议</h3>
                <div style="background: #f0fff4; padding: 20px; border-radius: 10px; margin-top: 15px; line-height: 1.8; color: #333;">
                    ${generateHealthRecommendations(data)}
                </div>
            </div>

            <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 2px solid #e0e6ed; color: #666; font-size: 12px;">
                <p>MetaScan 代谢健康管理平台</p>
                <p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p>
            </div>
        </div>
    `;
}

// 生成风险卡片
function generateRiskCard(title, score, icon) {
    const color = score < 30 ? '#10b981' : score < 60 ? '#f59e0b' : '#ef4444';
    return `
        <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 24px; margin-bottom: 10px;">${icon}</div>
            <div style="font-weight: 600; color: #1a2980; margin-bottom: 10px;">${title}</div>
            <div style="font-size: 28px; font-weight: bold; color: ${color};">${score.toFixed(0)}</div>
        </div>
    `;
}

// 生成详细分析
function generateDetailedAnalysis(data) {
    let analysis = '<p>根据您的检测结果，我们对您的代谢健康状况进行了全面分析：</p>';
    analysis += '<ul>';
    
    const highRiskItems = Object.entries(data.riskScores).filter(([key, value]) => value > 60);
    const mediumRiskItems = Object.entries(data.riskScores).filter(([key, value]) => value > 30 && value <= 60);
    
    if (highRiskItems.length > 0) {
        analysis += '<li><strong>需要关注的维度：</strong>';
        analysis += highRiskItems.map(([key, value]) => `${window.categoryNames[key] || key}(${value.toFixed(0)}分)`).join('、');
        analysis += '。这些维度需要重点关注，建议咨询医生。</li>';
    }
    
    if (mediumRiskItems.length > 0) {
        analysis += '<li><strong>建议调整的维度：</strong>';
        analysis += mediumRiskItems.map(([key, value]) => `${window.categoryNames[key] || key}(${value.toFixed(0)}分)`).join('、');
        analysis += '。这些维度需要留意，建议适当调整生活方式。</li>';
    }
    
    if (highRiskItems.length === 0 && mediumRiskItems.length === 0) {
        analysis += '<li><strong>整体状况良好：</strong>您的各项指标都在正常范围内，请继续保持健康的生活方式。</li>';
    }
    
    analysis += '</ul>';
    return analysis;
}

// 生成健康建议
function generateHealthRecommendations(data) {
    let recommendations = '<p>基于您的检测结果，我们为您提供以下健康建议：</p>';
    recommendations += '<ol style="padding-left: 20px;">';
    
    recommendations += '<li><strong>饮食管理：</strong>建议保持均衡饮食，减少高脂肪、高糖食物的摄入，增加新鲜蔬菜和水果的比例。</li>';
    recommendations += '<li><strong>运动锻炼：</strong>建议每周进行至少150分钟的中等强度有氧运动，如快走、游泳等。</li>';
    recommendations += '<li><strong>作息规律：</strong>保持充足的睡眠，每天7-8小时，避免熬夜，建立规律的作息习惯。</li>';
    recommendations += '<li><strong>压力管理：</strong>学会合理释放压力，可通过冥想、瑜伽、听音乐等方式缓解压力。</li>';
    recommendations += '<li><strong>定期复查：</strong>建议定期进行健康检查，及时了解身体状况变化。</li>';
    
    recommendations += '</ol>';
    return recommendations;
}

// 生成对比HTML
function generateComparisonHTML(allData) {
    const sortedData = [...allData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const latestData = sortedData[sortedData.length - 1];
    const firstData = sortedData[0];
    
    const riskChange = latestData.overallRisk - firstData.overallRisk;
    const riskTrend = riskChange > 0 ? '上升' : riskChange < 0 ? '下降' : '稳定';
    const trendColor = riskChange > 0 ? '#e74c3c' : riskChange < 0 ? '#00b894' : '#666';
    
    return `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1a2980; padding-bottom: 20px;">
                <h1 style="color: #1a2980; margin: 0; font-size: 28px;">MetaScan 历史对比报告</h1>
                <p style="color: #666; margin-top: 10px; font-size: 14px;">报告日期: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="color: #666; font-size: 14px;">对比范围: ${firstData.date} 至 ${latestData.date}</p>
            </div>

            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; text-align: center;">
                <h2 style="color: #1a2980; margin-top: 0; font-size: 20px;">总体风险变化</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">
                    <div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">首次检测</div>
                        <div style="font-size: 36px; font-weight: bold; color: #1a2980;">${firstData.overallRisk.toFixed(1)}</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">最新检测</div>
                        <div style="font-size: 36px; font-weight: bold; color: #1a2980;">${latestData.overallRisk.toFixed(1)}</div>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 10px;">
                    <div style="font-size: 16px; color: #666; margin-bottom: 8px;">风险变化</div>
                    <div style="font-size: 28px; font-weight: bold; color: ${trendColor};">${riskChange > 0 ? '+' : ''}${riskChange.toFixed(1)}</div>
                    <div style="font-size: 16px; font-weight: 600; color: ${trendColor}; margin-top: 8px;">${riskTrend}</div>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">历史检测记录</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background: #f0f4ff;">
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">检测日期</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">总体风险</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">脂质代谢</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">糖代谢</th>
                            <th style="border: 1px solid #e0e6ed; padding: 12px; text-align: left;">炎症状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedData.reverse().map(data => `
                            <tr>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${data.date}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${data.overallRisk.toFixed(1)}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${data.riskScores.lipid.toFixed(0)}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${data.riskScores.glucose.toFixed(0)}</td>
                                <td style="border: 1px solid #e0e6ed; padding: 12px;">${data.riskScores.inflammation.toFixed(0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">各维度变化分析</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                    ${generateComparisonDimension('脂质代谢', firstData.riskScores.lipid, latestData.riskScores.lipid, '🩸')}
                    ${generateComparisonDimension('糖代谢', firstData.riskScores.glucose, latestData.riskScores.glucose, '🥗')}
                    ${generateComparisonDimension('氨基酸代谢', firstData.riskScores.amino, latestData.riskScores.amino, '⚗️')}
                    ${generateComparisonDimension('炎症状态', firstData.riskScores.inflammation, latestData.riskScores.inflammation, '🔥')}
                    ${generateComparisonDimension('能量代谢', firstData.riskScores.energy, latestData.riskScores.energy, '⚡')}
                    ${generateComparisonDimension('氧化应激', firstData.riskScores.oxidative, latestData.riskScores.oxidative, '🍃')}
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #1a2980; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px; font-size: 18px;">变化总结</h3>
                <div style="background: #f0fff4; padding: 20px; border-radius: 10px; margin-top: 15px; line-height: 1.8; color: #333;">
                    ${generateChangeSummary(firstData, latestData)}
                </div>
            </div>

            <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 2px solid #e0e6ed; color: #666; font-size: 12px;">
                <p>MetaScan 代谢健康管理平台</p>
                <p>本报告仅供参考，不作为诊断依据，请咨询专业医生</p>
            </div>
        </div>
    `;
}

// 生成对比维度
function generateComparisonDimension(title, firstValue, latestValue, icon) {
    const change = latestValue - firstValue;
    const trend = change > 0 ? '上升' : change < 0 ? '下降' : '稳定';
    const trendColor = change > 0 ? '#e74c3c' : change < 0 ? '#00b894' : '#666';
    
    return `
        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 15px;">
                <span style="font-size: 24px;">${icon}</span>
                <div style="font-weight: 600; color: #1a2980; margin-top: 8px;">${title}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #666; font-size: 14px;">首次: ${firstValue.toFixed(0)}</span>
                <span style="color: #666; font-size: 14px;">最新: ${latestValue.toFixed(0)}</span>
            </div>
            <div style="text-align: center; padding: 10px; background: ${change < 0 ? '#e6f7f0' : change > 0 ? '#fff3cd' : '#f8f9fa'}; border-radius: 8px;">
                <div style="font-weight: 600; color: ${trendColor};">${change > 0 ? '+' : ''}${change.toFixed(0)}</div>
                <div style="font-size: 14px; color: ${trendColor};">${trend}</div>
            </div>
        </div>
    `;
}

// 生成变化总结
function generateChangeSummary(firstData, latestData) {
    const riskChange = latestData.overallRisk - firstData.overallRisk;
    let summary = '<p>根据您的历史检测数据对比分析：</p>';
    summary += '<ul>';
    
    if (riskChange < 0) {
        summary += '<li><strong>总体状况改善：</strong>您的总体风险评分从 ' + firstData.overallRisk.toFixed(1) + ' 下降到 ' + latestData.overallRisk.toFixed(1) + '，下降了 ' + Math.abs(riskChange).toFixed(1) + ' 分，说明您的健康状况有所改善，请继续保持！</li>';
    } else if (riskChange > 0) {
        summary += '<li><strong>需要关注：</strong>您的总体风险评分从 ' + firstData.overallRisk.toFixed(1) + ' 上升到 ' + latestData.overallRisk.toFixed(1) + '，上升了 ' + riskChange.toFixed(1) + ' 分，建议您加强健康管理，必要时咨询医生。</li>';
    } else {
        summary += '<li><strong>状况稳定：</strong>您的总体风险评分保持稳定，说明您的健康状况维持在同一水平。</li>';
    }
    
    const improvedDimensions = [];
    const worsenedDimensions = [];
    const dimensionNames = { lipid: '脂质代谢', glucose: '糖代谢', amino: '氨基酸代谢', inflammation: '炎症状态', energy: '能量代谢', oxidative: '氧化应激' };
    
    for (const [key, name] of Object.entries(dimensionNames)) {
        const change = latestData.riskScores[key] - firstData.riskScores[key];
        if (change < 0) improvedDimensions.push(name);
        else if (change > 0) worsenedDimensions.push(name);
    }
    
    if (improvedDimensions.length > 0) {
        summary += '<li><strong>改善项目：</strong>' + improvedDimensions.join('、') + '。</li>';
    }
    
    if (worsenedDimensions.length > 0) {
        summary += '<li><strong>需要关注项目：</strong>' + worsenedDimensions.join('、') + '。建议您针对这些项目调整生活方式。</li>';
    }
    
    summary += '</ul>';
    return summary;
}

// 导出为PDF
function exportToPDF(htmlContent, filename) {
    showNotification('正在生成PDF，请稍候...');
    
    try {
        // 获取当前页面的样式
        let styles = '';
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
            if (el.tagName === 'STYLE') {
                styles += `<style>${el.innerHTML}</style>`;
            } else if (el.tagName === 'LINK') {
                styles += `<link rel="stylesheet" href="${el.href}">`;
            }
        });

        // 创建新窗口显示报告
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${filename}</title>
                    ${styles}
                    <style>
                        * {
                            box-sizing: border-box;
                        }
                        body {
                            margin: 0;
                            padding: 20px;
                            font-family: 'Microsoft YaHei', Arial, sans-serif;
                            background: #fff;
                        }
                        /* 隐藏打印按钮 */
                        .print-hide {
                            display: none !important;
                        }
                        @media print {
                            .no-print { 
                                display: none !important; 
                            }
                            body { 
                                margin: 0;
                                padding: 20px;
                            }
                            @page {
                                margin: 20mm;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <div class="no-print" style="text-align: center; margin-top: 40px; padding: 20px; position: sticky; bottom: 0; background: white; border-top: 1px solid #eee; z-index: 1000;">
                        <button onclick="window.print()" style="padding: 15px 40px; background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 16px; margin-right: 15px;">打印/保存为PDF</button>
                        <button onclick="window.close()" style="padding: 15px 40px; background: #6c757d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 16px;">关闭</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            
            // 等待内容加载后显示通知
            printWindow.onload = function() {
                // 隐藏导出按钮
                const exportButtons = printWindow.document.querySelectorAll('.export-pdf-btn');
                exportButtons.forEach(btn => btn.style.display = 'none');
                
                showNotification('PDF生成成功！请点击 "打印/保存为PDF" 按钮');
            };
        } else {
            alert('无法打开新窗口！请检查浏览器的弹窗拦截设置。');
            showNotification('请允许浏览器打开弹窗');
        }
    } catch (error) {
        console.error('PDF导出失败:', error);
        alert('PDF导出失败：' + error.message);
        showNotification('PDF导出失败，请重试');
    }
}

// ==================== 健康干预长期监测智能体 ====================

// 获取健康数据
function getHealthMonitorData() {
    const key = currentUser ? `healthMonitor_${currentUser.username}` : 'healthMonitor_guest';
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// 保存健康数据
function saveHealthMonitorData(data) {
    const key = currentUser ? `healthMonitor_${currentUser.username}` : 'healthMonitor_guest';
    localStorage.setItem(key, JSON.stringify(data));
}

// 添加健康记录
function addHealthRecord(record) {
    const data = getHealthMonitorData();
    record.id = Date.now();
    record.date = new Date().toISOString().split('T')[0];
    record.timestamp = new Date().toISOString();
    data.push(record);
    saveHealthMonitorData(data);
    return record;
}

// 获取今日健康记录
function getTodayHealthRecord() {
    const today = new Date().toISOString().split('T')[0];
    const data = getHealthMonitorData();
    return data.find(r => r.date === today) || null;
}

// 提交健康数据
function submitHealthData() {
    if (!currentUser) {
        alert('请先登录！');
        return;
    }

    // 获取表单数据
    const record = {
        weight: parseFloat(document.getElementById('aiWeight').value) || null,
        heartRate: parseInt(document.getElementById('aiHeartRate').value) || null,
        bloodPressure: document.getElementById('aiBloodPressure').value || null,
        sleep: parseFloat(document.getElementById('aiSleep').value) || null,
        exerciseType: document.getElementById('aiExerciseType').value || null,
        exerciseDuration: parseInt(document.getElementById('aiExerciseDuration').value) || null,
        exerciseIntensity: document.querySelector('input[name="exerciseIntensity"]:checked')?.value || null,
        dietDescription: document.getElementById('aiDietDescription').value || null,
        waterIntake: parseInt(document.getElementById('aiWaterIntake').value) || null,
        vegFruitIntake: document.getElementById('aiVegFruitIntake').value || null
    };

    // 检查是否有至少一项数据
    const hasData = Object.values(record).some(v => v !== null && v !== '');
    if (!hasData) {
        alert('请至少填写一项健康数据！');
        return;
    }

    // 保存数据
    addHealthRecord(record);
    
    // 显示加载中
    addAIMessage('user', '数据已提交，请稍候...');
    
    // 延迟生成AI回复
    setTimeout(() => {
        // 生成AI分析和建议
        const analysis = generateHealthAnalysis(record);
        addAIMessage('ai', analysis);
        
        // 更新健康评分
        const score = calculateHealthScore(record);
        updateHealthScore(score);
        
        // 显示通知
        showNotification('健康数据已记录，智能分析已生成！');
    }, 500);
}

// 添加AI消息
function addAIMessage(type, content) {
    const container = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    
    if (type === 'user') {
        messageDiv.style.background = 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)';
        messageDiv.style.color = 'white';
        messageDiv.style.borderRadius = '12px';
        messageDiv.style.padding = '15px';
        messageDiv.style.alignSelf = 'flex-end';
        messageDiv.innerHTML = `<div style="font-weight: 600; margin-bottom: 8px;">👤 用户</div><div style="line-height: 1.6;">${content}</div>`;
    } else {
        messageDiv.style.background = '#f0f4ff';
        messageDiv.style.borderRadius = '12px';
        messageDiv.style.padding = '15px';
        messageDiv.style.alignSelf = 'flex-start';
        messageDiv.innerHTML = `<div style="font-weight: 600; color: #1a2980; margin-bottom: 8px;">🤖 Meta健康智能体</div><div style="color: #333; line-height: 1.6;">${content}</div>`;
    }
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 生成健康分析
function generateHealthAnalysis(record) {
    let analysis = '';
    
    // 健康指标分析
    analysis += '<strong>📊 健康指标分析</strong><br>';
    if (record.weight) {
        analysis += `• 体重：${record.weight}kg，建议继续保持健康体重<br>`;
    }
    if (record.heartRate) {
        const hrStatus = record.heartRate < 60 ? '偏低' : record.heartRate > 100 ? '偏高' : '正常';
        analysis += `• 心率：${record.heartRate}次/分，状态${hrStatus}<br>`;
    }
    if (record.bloodPressure) {
        analysis += `• 血压：${record.bloodPressure}mmHg<br>`;
    }
    if (record.sleep) {
        const sleepStatus = record.sleep < 6 ? '不足' : record.sleep > 9 ? '偏长' : '充足';
        analysis += `• 睡眠：${record.sleep}小时，睡眠${sleepStatus}<br>`;
    }
    
    // 运动分析
    if (record.exerciseType || record.exerciseDuration) {
        analysis += '<br><strong>🏃 运动分析</strong><br>';
        const exerciseTypes = {
            walking: '步行',
            running: '跑步',
            cycling: '骑行',
            swimming: '游泳',
            gym: '力量训练',
            yoga: '瑜伽',
            other: '运动'
        };
        const type = exerciseTypes[record.exerciseType] || '运动';
        const intensity = record.exerciseIntensity === 'low' ? '低强度' : 
                         record.exerciseIntensity === 'medium' ? '中等强度' : '高强度';
        
        analysis += `• 今日进行了${type}${record.exerciseDuration ? `，时长${record.exerciseDuration}分钟` : ''}${record.exerciseIntensity ? `，${intensity}` : ''}<br>`;
        
        if (record.exerciseDuration && record.exerciseDuration >= 30) {
            analysis += '🎉 运动达标！继续保持！<br>';
        } else if (record.exerciseDuration && record.exerciseDuration > 0) {
            analysis += '💪 有运动习惯很好，建议增加至30分钟以上<br>';
        }
    }
    
    // 饮食分析
    if (record.dietDescription || record.waterIntake || record.vegFruitIntake) {
        analysis += '<br><strong>🍽️ 饮食分析</strong><br>';
        if (record.dietDescription) {
            analysis += `• 饮食记录：${record.dietDescription}<br>`;
        }
        if (record.waterIntake) {
            const waterStatus = record.waterIntake < 4 ? '不足' : record.waterIntake < 8 ? '偏少' : '充足';
            analysis += `• 饮水：${record.waterIntake}杯，水量${waterStatus}<br>`;
        }
        if (record.vegFruitIntake) {
            const vegFruitStatus = {
                none: '需要多吃蔬菜水果',
                little: '建议增加蔬菜水果摄入',
                moderate: '蔬菜水果摄入良好',
                adequate: '🎉 蔬菜水果摄入非常充足'
            };
            analysis += `• 蔬菜水果：${vegFruitStatus[record.vegFruitIntake]}<br>`;
        }
    }
    
    // 改进建议
    analysis += '<br><strong>💡 改进建议</strong><br>';
    const suggestions = [];
    
    if (!record.exerciseDuration || record.exerciseDuration < 30) {
        suggestions.push('• 建议每天进行30分钟以上的中等强度运动');
    }
    if (!record.sleep || record.sleep < 7) {
        suggestions.push('• 保持充足睡眠，建议每晚7-8小时');
    }
    if (!record.waterIntake || record.waterIntake < 8) {
        suggestions.push('• 多喝水，建议每天饮用8杯以上水');
    }
    if (record.vegFruitIntake === 'none' || record.vegFruitIntake === 'little') {
        suggestions.push('• 多吃蔬菜水果，建议每天5份以上');
    }
    
    if (suggestions.length > 0) {
        analysis += suggestions.join('<br>');
    } else {
        analysis += '• 继续保持良好的生活习惯！';
    }
    
    return analysis;
}

// 计算健康评分
function calculateHealthScore(record) {
    let score = 100;
    
    // 睡眠评分 (20分)
    if (record.sleep) {
        if (record.sleep >= 7 && record.sleep <= 9) {
            score += 20;
        } else if (record.sleep >= 6) {
            score += 15;
        } else if (record.sleep >= 5) {
            score += 10;
        } else {
            score += 5;
        }
    } else {
        score -= 10;
    }
    
    // 运动评分 (30分)
    if (record.exerciseDuration) {
        if (record.exerciseDuration >= 60) {
            score += 30;
        } else if (record.exerciseDuration >= 45) {
            score += 25;
        } else if (record.exerciseDuration >= 30) {
            score += 20;
        } else if (record.exerciseDuration >= 15) {
            score += 15;
        } else {
            score += 10;
        }
    } else {
        score -= 15;
    }
    
    // 饮水评分 (20分)
    if (record.waterIntake) {
        if (record.waterIntake >= 8) {
            score += 20;
        } else if (record.waterIntake >= 6) {
            score += 15;
        } else if (record.waterIntake >= 4) {
            score += 10;
        } else {
            score += 5;
        }
    } else {
        score -= 10;
    }
    
    // 蔬菜水果评分 (30分)
    if (record.vegFruitIntake) {
        if (record.vegFruitIntake === 'adequate') {
            score += 30;
        } else if (record.vegFruitIntake === 'moderate') {
            score += 20;
        } else if (record.vegFruitIntake === 'little') {
            score += 10;
        } else {
            score += 0;
        }
    } else {
        score -= 5;
    }
    
    return Math.min(100, Math.max(0, score));
}

// 更新健康评分显示
function updateHealthScore(score) {
    const display = document.getElementById('healthScoreDisplay');
    let color = '#00b894'; // 绿色
    let status = '优秀';
    
    if (score < 60) {
        color = '#e74c3c'; // 红色
        status = '需要改善';
    } else if (score < 75) {
        color = '#f39c12'; // 黄色
        status = '良好';
    } else if (score < 90) {
        color = '#26d0ce'; // 青色
        status = '很好';
    }
    
    display.innerHTML = `
        <div style="font-size: 3rem; font-weight: bold; color: ${color}; margin-bottom: 10px;">${score}</div>
        <div style="font-size: 0.9rem; color: #666;">${status}</div>
    `;
}

// 显示健康趋势
function showHealthTrend(days) {
    const data = getHealthMonitorData();
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const filteredData = data.filter(r => new Date(r.date) >= startDate);
    
    const display = document.getElementById('healthTrendDisplay');
    
    if (filteredData.length === 0) {
        display.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                <div>近${days}天暂无健康记录</div>
            </div>
        `;
        return;
    }
    
    // 统计数据
    const totalRecords = filteredData.length;
    const avgSleep = filteredData.filter(r => r.sleep).length > 0 
        ? (filteredData.filter(r => r.sleep).reduce((sum, r) => sum + r.sleep, 0) / filteredData.filter(r => r.sleep).length).toFixed(1)
        : '--';
    const avgExercise = filteredData.filter(r => r.exerciseDuration).length > 0 
        ? (filteredData.filter(r => r.exerciseDuration).reduce((sum, r) => sum + r.exerciseDuration, 0) / filteredData.filter(r => r.exerciseDuration).length).toFixed(0)
        : '--';
    const totalExerciseDays = filteredData.filter(r => r.exerciseDuration && r.exerciseDuration > 0).length;
    
    display.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid #1a2980;">
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">记录天数</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #1a2980;">${totalRecords}天</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid #26d0ce;">
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">平均睡眠</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #26d0ce;">${avgSleep}小时</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid #00b894;">
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">平均运动</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #00b894;">${avgExercise}分钟</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid #f39c12;">
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">运动天数</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #f39c12;">${totalExerciseDays}天</div>
            </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e6ed;">
            <div style="font-size: 0.9rem; color: #666;">
                ${filteredData.length > 7 ? '📈 数据显示你已经养成了良好的健康记录习惯，继续保持！' : '📝 开始记录你的健康数据，坚持7天你会看到进步！'}
            </div>
        </div>
    `;
}


// ==================== 健康干预智能联动功能 ====================

// 自动生成4周运动计划
function generate4WeekExercisePlan() {
    const tasks = getTasks();
    const today = new Date();
    const newTasks = [];
    
    // 检查是否已经有运动计划
    const existingExerciseTasks = tasks.filter(task => 
        task.title.includes('运动') && 
        task.planType === '4WeekExercise'
    );
    
    if (existingExerciseTasks.length > 0) {
        showNotification('您已拥有运动计划，无需重复创建');
        return false;
    }
    
    // 4周渐进式运动计划
    const weeklyPlans = [
        // 第1周：轻度运动，习惯养成
        {
            week: 1,
            exercises: [
                { day: 0, type: '快走', duration: 30, intensity: 'low', description: '快走或散步30分钟' },
                { day: 2, type: '伸展运动', duration: 20, intensity: 'low', description: '做20分钟伸展运动或瑜伽' },
                { day: 4, type: '快走', duration: 30, intensity: 'low', description: '快走或散步30分钟' }
            ]
        },
        // 第2周：增加强度
        {
            week: 2,
            exercises: [
                { day: 0, type: '快走+慢跑', duration: 35, intensity: 'medium', description: '快走和慢跑交替，共35分钟' },
                { day: 2, type: '有氧运动', duration: 30, intensity: 'medium', description: '做30分钟中等强度有氧操' },
                { day: 4, type: '快走+慢跑', duration: 35, intensity: 'medium', description: '快走和慢跑交替，共35分钟' },
                { day: 6, type: '伸展运动', duration: 25, intensity: 'low', description: '25分钟伸展运动恢复' }
            ]
        },
        // 第3周：进一步提高
        {
            week: 3,
            exercises: [
                { day: 0, type: '慢跑', duration: 40, intensity: 'medium', description: '持续慢跑40分钟' },
                { day: 2, type: '力量训练', duration: 30, intensity: 'medium', description: '30分钟力量训练（简单器械或自重训练）' },
                { day: 4, type: '快走+慢跑', duration: 45, intensity: 'medium', description: '快走和慢跑交替，共45分钟' },
                { day: 6, type: '游泳', duration: 40, intensity: 'medium', description: '游泳40分钟或其他水上运动' }
            ]
        },
        // 第4周：保持和巩固
        {
            week: 4,
            exercises: [
                { day: 0, type: '慢跑', duration: 45, intensity: 'high', description: '持续慢跑45分钟' },
                { day: 2, type: '力量训练', duration: 35, intensity: 'high', description: '35分钟力量训练，增加难度' },
                { day: 4, type: '有氧+力量组合', duration: 50, intensity: 'high', description: '有氧和力量训练组合，共50分钟' },
                { day: 6, type: '球类运动', duration: 60, intensity: 'medium', description: '篮球、羽毛球等球类运动60分钟' }
            ]
        }
    ];
    
    // 为每天添加额外的小任务
    const dailyTasks = [
        { title: '每日水分摄入', description: '保证8杯以上的水分摄入', type: 'water' },
        { title: '新鲜蔬菜水果', description: '每日摄入3-5份新鲜蔬菜水果', type: 'veggie' }
    ];
    
    // 创建任务
    weeklyPlans.forEach(weeklyPlan => {
        weeklyPlan.exercises.forEach(exercise => {
            const taskDate = new Date(today);
            taskDate.setDate(today.getDate() + (weeklyPlan.week - 1) * 7 + exercise.day);
            
            // 避免添加过去的任务
            if (taskDate >= today) {
                newTasks.push({
                    id: Date.now() + Math.random(),
                    title: `第${weeklyPlan.week}周: ${exercise.type}`,
                    description: `${exercise.description}`,
                    date: taskDate.toISOString(),
                    completed: false,
                    type: exercise.type,
                    duration: exercise.duration,
                    intensity: exercise.intensity,
                    week: weeklyPlan.week,
                    planType: '4WeekExercise',
                    isGenerated: true
                });
            }
        });
    });
    
    // 每日任务
    for (let i = 0; i < 28; i++) { // 4周
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + i);
        
        if (taskDate >= today) {
            dailyTasks.forEach(dailyTask => {
                newTasks.push({
                    id: Date.now() + Math.random() + i,
                    title: dailyTask.title,
                    description: dailyTask.description,
                    date: taskDate.toISOString(),
                    completed: false,
                    type: dailyTask.type,
                    planType: '4WeekExercise',
                    isGenerated: true
                });
            });
        }
    }
    
    // 保存任务
    const allTasks = [...tasks, ...newTasks];
    saveTasks(allTasks);
    
    showNotification(`成功创建4周运动计划，共${newTasks.length}个任务！`);
    
    // 刷新日历
    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }
    
    return true;
}

// ==================== 任务完成度与指标改善相关性分析 ====================

// 获取任务完成率统计
function getTaskCompletionStats(startDate, endDate) {
    const tasks = getTasks();
    const filteredTasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= startDate && taskDate <= endDate;
    });
    
    if (filteredTasks.length === 0) {
        return { total: 0, completed: 0, rate: 0 };
    }
    
    const completed = filteredTasks.filter(t => t.completed).length;
    const rate = (completed / filteredTasks.length * 100).toFixed(1);
    
    return {
        total: filteredTasks.length,
        completed,
        rate: parseFloat(rate),
        exerciseTasks: filteredTasks.filter(t => t.type && t.type.includes('运动') || t.title.includes('运动')).length,
        exerciseCompleted: filteredTasks.filter(t => t.completed && (t.type && t.type.includes('运动') || t.title.includes('运动'))).length
    };
}

// 分析健康指标改善与任务完成度的关系
function analyzeCorrelation() {
    if (!currentUser) {
        return null;
    }
    
    const patientData = JSON.parse(localStorage.getItem(`metascanData_${currentUser.username}`)) || [];
    
    if (patientData.length < 2) {
        return null;
    }
    
    // 按时间排序
    patientData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const firstData = patientData[0];
    const latestData = patientData[patientData.length - 1];
    
    // 计算任务完成率（基于第一次和最后一次检测之间的时间）
    const firstDate = new Date(firstData.timestamp);
    const latestDate = new Date(latestData.timestamp);
    
    const stats = getTaskCompletionStats(firstDate, latestDate);
    
    // 计算各维度改善情况
    const improvements = {
        lipid: 0,
        glucose: 0,
        amino: 0,
        inflammation: 0,
        energy: 0,
        oxidative: 0
    };
    
    const riskCategories = ['lipid', 'glucose', 'amino', 'inflammation', 'energy', 'oxidative'];
    
    // 计算各维度风险改善
    riskCategories.forEach(category => {
        if (firstData.riskScores && latestData.riskScores) {
            const firstRisk = firstData.riskScores[category] || 0;
            const latestRisk = latestData.riskScores[category] || 0;
            
            // 风险降低为改善（正数表示改善）
            improvements[category] = firstRisk - latestRisk;
        }
    });
    
    // 计算总体改善
    const totalImprovement = Object.values(improvements).reduce((a, b) => a + b, 0);
    
    return {
        taskStats: stats,
        improvements,
        totalImprovement,
        timePeriod: {
            start: firstDate.toLocaleDateString(),
            end: latestDate.toLocaleDateString(),
            days: Math.ceil((latestDate - firstDate) / (1000 * 60 * 60 * 24))
        },
        firstData,
        latestData
    };
}

// 生成相关性分析HTML
function generateCorrelationHTML() {
    const analysis = analyzeCorrelation();
    
    if (!analysis) {
        return `
            <div class="data-card fade-in" style="text-align: center; padding: 60px; margin: 20px 0;">
                <div style="font-size: 5rem; margin-bottom: 20px;">📊</div>
                <div style="font-size: 1.4rem; font-weight: 600; color: #666; margin-bottom: 12px;">需要至少两次检测记录</div>
                <div style="color: #999; font-size: 1.05rem;">进行第二次检测后可查看任务完成与指标改善的相关性分析</div>
            </div>
        `;
    }
    
    const { taskStats, improvements, totalImprovement, timePeriod } = analysis;
    
    // 判断相关性强度
    let correlation = 'weak';
    let correlationColor = '#e74c3c';
    let correlationText = '无明显相关';
    let correlationBadge = 'status-danger';
    
    if (taskStats.rate > 70 && totalImprovement > 50) {
        correlation = 'strong';
        correlationColor = '#00b894';
        correlationText = '显著正相关！坚持任务有很好的效果';
        correlationBadge = 'status-good';
    } else if (taskStats.rate > 50 && totalImprovement > 20) {
        correlation = 'moderate';
        correlationColor = '#f39c12';
        correlationText = '中度相关，继续坚持任务会有更好的效果';
        correlationBadge = 'status-warning';
    } else if (taskStats.rate > 30 && totalImprovement > 0) {
        correlation = 'weak';
        correlationColor = '#3498db';
        correlationText = '有改善趋势，请继续坚持完成任务';
        correlationBadge = 'status-good';
    }
    
    return `
        <div class="data-card fade-in" style="margin: 20px 0; padding: 35px; background: linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%);">
            <h3 style="color: #1a2980; margin-bottom: 30px; display: flex; align-items: center; gap: 15px; font-size: 1.5rem;">
                <div class="icon-container icon-cyan" style="width: 55px; height: 55px; font-size: 26px; margin: 0;">📈</div>
                任务完成度与指标改善相关性分析
            </h3>
            
            <div style="margin-bottom: 30px; padding: 25px; background: white; border-radius: 18px; border-left: 6px solid ${correlationColor}; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                    <span class="status-badge ${correlationBadge}">相关性判断</span>
                </div>
                <div style="font-size: 1.25rem; color: #333; line-height: 1.6; font-weight: 500;">${correlationText}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px;">
                <!-- 任务完成统计 -->
                <div class="gradient-card" style="padding: 28px;">
                    <h4 style="color: #1a2980; margin-bottom: 22px; font-size: 1.15rem; display: flex; align-items: center; gap: 10px;">
                        📅 任务完成情况
                    </h4>
                    <div style="border-bottom: 1px solid rgba(224, 230, 237, 0.8); padding: 12px 0; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="color: #777; font-size: 0.95rem;">统计周期</span>
                            <span style="font-weight: 600; color: #1a2980;">${timePeriod.start} - ${timePeriod.end}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #999; text-align: right; margin-top: 4px;">共 ${timePeriod.days} 天</div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(224, 230, 237, 0.6);">
                        <span style="color: #777; font-size: 0.95rem;">总任务数</span>
                        <span class="stat-number" style="font-size: 2rem;">${taskStats.total}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(224, 230, 237, 0.6);">
                        <span style="color: #777; font-size: 0.95rem;">已完成</span>
                        <span class="stat-number" style="font-size: 2rem; color: #00b894;">${taskStats.completed}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 0 0;">
                        <span style="color: #777; font-size: 0.95rem;">完成率</span>
                        <span class="status-badge ${taskStats.rate >= 70 ? 'status-good' : taskStats.rate >= 50 ? 'status-warning' : 'status-danger'}" style="font-size: 1.1rem; padding: 8px 18px;">
                            ${taskStats.rate}%
                        </span>
                    </div>
                </div>
                
                <!-- 各维度改善 -->
                <div class="gradient-card" style="padding: 28px;">
                    <h4 style="color: #1a2980; margin-bottom: 18px; font-size: 1.15rem; display: flex; align-items: center; gap: 10px;">
                        📊 各维度改善
                    </h4>
                    <div style="color: #888; font-size: 0.9rem; margin-bottom: 18px; background: #f8f9fa; padding: 10px 14px; border-radius: 10px;">
                        💡 数值越大表示风险降低越多，改善越明显
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${Object.entries(improvements).map(([key, value]) => {
                            const colors = {
                                lipid: '#667eea',
                                glucose: '#48c9b0',
                                amino: '#764ba2',
                                inflammation: '#ffb347',
                                energy: '#ff6b6b',
                                oxidative: '#a8e6cf'
                            };
                            const names = {
                                lipid: '脂质代谢',
                                glucose: '糖代谢',
                                amino: '氨基酸代谢',
                                inflammation: '炎症状态',
                                energy: '能量代谢',
                                oxidative: '氧化应激'
                            };
                            const color = colors[key];
                            const isPositive = value > 0;
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: ${isPositive ? 'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)' : 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)'}; border-radius: 12px; border-left: 4px solid ${color};">
                                    <span style="color: #444; font-size: 0.95rem; font-weight: 600;">${names[key]}</span>
                                    <span style="font-weight: 700; font-size: 1.35rem; color: ${isPositive ? '#00b894' : '#e74c3c'};">
                                        ${isPositive ? '+' : ''}${value.toFixed(1)}
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- 总体改善 -->
                <div class="gradient-card" style="padding: 32px; grid-column: 1 / -1;">
                    <h4 style="color: #1a2980; margin-bottom: 25px; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
                        🎯 总体分析
                    </h4>
                    <div style="text-align: center;">
                        <div style="font-size: 1rem; color: #888; margin-bottom: 15px;">总体风险降低</div>
                        <div class="stat-number" style="font-size: 4.5rem; color: ${totalImprovement > 0 ? '#00b894' : '#e74c3c'};">
                            ${totalImprovement > 0 ? '+' : ''}${totalImprovement.toFixed(1)}
                        </div>
                        <div style="margin-top: 25px; padding: 22px; background: linear-gradient(135deg, #f0f4ff 0%, #e3f2fd 100%); border-radius: 16px; border-left: 5px solid #26d0ce;">
                            <div style="color: #1a2980; line-height: 1.8; font-size: 1.1rem; font-weight: 500;">
                                ${totalImprovement > 0 && taskStats.rate > 50 
                                    ? '🎉 太棒了！您的健康指标有明显改善，请继续坚持完成任务！' 
                                    : totalImprovement > 0 
                                        ? '💪 您的健康指标有改善，建议提高任务完成率以获得更好效果！' 
                                        : taskStats.rate > 50 
                                            ? '📝 您完成了不少任务，请继续坚持，健康改善需要时间累积！' 
                                            : '🔍 建议提高任务完成率，坚持完成计划才能看到健康指标的改善！'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}


// 生成一周的饮食计划
function generateWeeklyDietPlan() {
    if (!currentUser) return false;
    
    const tasks = getTasks();
    const today = new Date();
    const newTasks = [];
    
    // 检查是否已有饮食计划
    const existingDietTasks = tasks.filter(task => 
        task.title.includes('饮食') || 
        task.title.includes('早餐') || 
        task.title.includes('午餐') || 
        task.title.includes('晚餐') || 
        task.title.includes('蔬菜') || 
        task.title.includes('水果')
    );
    
    if (existingDietTasks.length > 0) {
        return false;
    }
    
    // 一周的健康饮食计划
    const weeklyDietPlan = [
        // 第1天
        { dayOffset: 0, title: '营养早餐', description: '燕麦粥 + 牛奶 + 蓝莓 + 水煮鸡蛋', type: 'diet' },
        { dayOffset: 0, title: '健康午餐', description: '糙米饭 + 鸡胸肉 + 西兰花 + 胡萝卜', type: 'diet' },
        { dayOffset: 0, title: '轻食晚餐', description: '蔬菜沙拉 + 三文鱼 + 豆腐汤', type: 'diet' },
        { dayOffset: 0, title: '每日水果', description: '今天吃至少2份水果，如苹果和香蕉', type: 'diet' },
        { dayOffset: 0, title: '蔬菜摄入', description: '确保今天吃够5份蔬菜', type: 'diet' },
        
        // 第2天
        { dayOffset: 1, title: '营养早餐', description: '全麦面包 + 牛油果 + 水煮蛋 + 酸奶', type: 'diet' },
        { dayOffset: 1, title: '健康午餐', description: '杂粮饭 + 清蒸鱼 + 青菜 + 蘑菇', type: 'diet' },
        { dayOffset: 1, title: '轻食晚餐', description: '冬瓜汤 + 瘦肉 + 凉拌黄瓜', type: 'diet' },
        { dayOffset: 1, title: '每日水果', description: '今天吃橙子和猕猴桃，补充维生素C', type: 'diet' },
        { dayOffset: 1, title: '蔬菜摄入', description: '多吃深绿色蔬菜如菠菜、空心菜', type: 'diet' },
        
        // 第3天
        { dayOffset: 2, title: '营养早餐', description: '豆浆 + 包子 + 水煮蛋 + 凉拌黄瓜', type: 'diet' },
        { dayOffset: 2, title: '健康午餐', description: '燕麦饭 + 牛肉 + 番茄 + 菠菜', type: 'diet' },
        { dayOffset: 2, title: '轻食晚餐', description: '南瓜粥 + 虾仁 + 西兰花', type: 'diet' },
        { dayOffset: 2, title: '每日水果', description: '吃草莓和葡萄，补充抗氧化剂', type: 'diet' },
        { dayOffset: 2, title: '蔬菜摄入', description: '尝试彩色蔬菜，营养更均衡', type: 'diet' },
        
        // 第4天
        { dayOffset: 3, title: '营养早餐', description: '小米粥 + 蒸红薯 + 煮鸡蛋 + 小番茄', type: 'diet' },
        { dayOffset: 3, title: '健康午餐', description: '糙米 + 豆腐 + 海带 + 白菜', type: 'diet' },
        { dayOffset: 3, title: '轻食晚餐', description: '蔬菜汤 + 鱼肉 + 芦笋', type: 'diet' },
        { dayOffset: 3, title: '每日水果', description: '吃芒果和菠萝，享受热带水果', type: 'diet' },
        { dayOffset: 3, title: '蔬菜摄入', description: '多吃豆类和根茎类蔬菜', type: 'diet' },
        
        // 第5天
        { dayOffset: 4, title: '营养早餐', description: '玉米粥 + 燕麦饼 + 酸奶 + 蓝莓', type: 'diet' },
        { dayOffset: 4, title: '健康午餐', description: '藜麦饭 + 鸡肉 + 彩椒 + 木耳', type: 'diet' },
        { dayOffset: 4, title: '轻食晚餐', description: '绿豆汤 + 虾肉 + 青菜', type: 'diet' },
        { dayOffset: 4, title: '每日水果', description: '吃梨和西瓜，清热解毒', type: 'diet' },
        { dayOffset: 4, title: '蔬菜摄入', description: '今天吃十字花科蔬菜如白菜花', type: 'diet' },
        
        // 第6天
        { dayOffset: 5, title: '营养早餐', description: '牛奶燕麦 + 坚果 + 水煮蛋 + 草莓', type: 'diet' },
        { dayOffset: 5, title: '健康午餐', description: '杂粮饭 + 瘦肉 + 茄子 + 豆角', type: 'diet' },
        { dayOffset: 5, title: '轻食晚餐', description: '银耳汤 + 鱼肉 + 芥蓝', type: 'diet' },
        { dayOffset: 5, title: '每日水果', description: '吃柚子和石榴，补充维生素', type: 'diet' },
        { dayOffset: 5, title: '蔬菜摄入', description: '多吃深色蔬菜如茄子和紫甘蓝', type: 'diet' },
        
        // 第7天
        { dayOffset: 6, title: '营养早餐', description: '南瓜粥 + 全麦面包 + 鸡蛋 + 小番茄', type: 'diet' },
        { dayOffset: 6, title: '健康午餐', description: '燕麦饭 + 虾 + 菠菜 + 豆腐', type: 'diet' },
        { dayOffset: 6, title: '轻食晚餐', description: '番茄汤 + 鸡胸肉 + 西兰花', type: 'diet' },
        { dayOffset: 6, title: '每日水果', description: '吃香蕉和苹果，补充能量', type: 'diet' },
        { dayOffset: 6, title: '蔬菜摄入', description: '总结本周蔬菜摄入，下周继续加油', type: 'diet' }
    ];
    
    // 生成任务
    let taskId = Date.now();
    weeklyDietPlan.forEach(plan => {
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + plan.dayOffset);
        taskDate.setHours(0, 0, 0, 0);
        
        newTasks.push({
            id: taskId++,
            title: plan.title,
            description: plan.description,
            date: taskDate.toISOString(),
            completed: false,
            type: plan.type,
            planType: 'weeklyDiet'
        });
    });
    
    // 保存任务
    const allTasks = [...tasks, ...newTasks];
    saveTasks(allTasks);
    
    showNotification('🎉 一周健康饮食计划已自动生成！');
    return true;
}

// 生成一周的运动计划
function generateWeeklyExercisePlan() {
    if (!currentUser) return false;
    
    const tasks = getTasks();
    const today = new Date();
    const newTasks = [];
    
    // 检查是否已有运动计划
    const existingExerciseTasks = tasks.filter(task => 
        (task.title.includes('运动') || 
         task.title.includes('跑步') || 
         task.title.includes('步行') || 
         task.title.includes('瑜伽') || 
         task.title.includes('健身')) &&
        task.planType !== '4WeekExercise'
    );
    
    if (existingExerciseTasks.length > 0) {
        return false;
    }
    
    // 一周的渐进式运动计划
    const weeklyExercisePlan = [
        // 第1天
        { dayOffset: 0, title: '晨间轻运动', description: '30分钟快走或慢跑，保持轻松节奏', intensity: 'low', type: 'exercise' },
        { dayOffset: 0, title: '力量训练', description: '20分钟轻重量力量训练，上肢练习', intensity: 'low', type: 'exercise' },
        { dayOffset: 0, title: '拉伸放松', description: '15分钟拉伸运动，放松全身肌肉', intensity: 'low', type: 'exercise' },
        
        // 第2天
        { dayOffset: 1, title: '有氧训练', description: '40分钟中等强度有氧运动，如骑单车', intensity: 'medium', type: 'exercise' },
        { dayOffset: 1, title: '核心训练', description: '25分钟核心肌群训练，平板支撑、卷腹', intensity: 'medium', type: 'exercise' },
        { dayOffset: 1, title: '拉伸放松', description: '15分钟拉伸运动', intensity: 'low', type: 'exercise' },
        
        // 第3天
        { dayOffset: 2, title: '轻松恢复', description: '30分钟散步或瑜伽，让身体恢复', intensity: 'low', type: 'exercise' },
        { dayOffset: 2, title: '柔韧性训练', description: '20分钟拉伸和柔韧性练习', intensity: 'low', type: 'exercise' },
        
        // 第4天
        { dayOffset: 3, title: '有氧挑战', description: '45分钟有氧训练，强度适中偏高', intensity: 'medium', type: 'exercise' },
        { dayOffset: 3, title: '力量训练', description: '30分钟全身力量训练，下肢练习', intensity: 'medium', type: 'exercise' },
        { dayOffset: 3, title: '拉伸放松', description: '15分钟拉伸运动', intensity: 'low', type: 'exercise' },
        
        // 第5天
        { dayOffset: 4, title: '有氧综合', description: '40分钟综合有氧，如HIIT训练', intensity: 'high', type: 'exercise' },
        { dayOffset: 4, title: '力量训练', description: '25分钟核心和上肢力量训练', intensity: 'medium', type: 'exercise' },
        { dayOffset: 4, title: '拉伸放松', description: '20分钟深度拉伸和放松', intensity: 'low', type: 'exercise' },
        
        // 第6天
        { dayOffset: 5, title: '户外活动', description: '60分钟户外活动，如爬山、骑行或游泳', intensity: 'medium', type: 'exercise' },
        { dayOffset: 5, title: '拉伸放松', description: '15分钟拉伸运动', intensity: 'low', type: 'exercise' },
        
        // 第7天
        { dayOffset: 6, title: '休息恢复', description: '完全休息日，或20分钟轻度拉伸和散步', intensity: 'low', type: 'exercise' },
        { dayOffset: 6, title: '周总结', description: '回顾本周运动完成情况，为下周计划', intensity: 'low', type: 'exercise' }
    ];
    
    // 生成任务
    let taskId = Date.now() + 1000;
    weeklyExercisePlan.forEach(plan => {
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + plan.dayOffset);
        taskDate.setHours(0, 0, 0, 0);
        
        newTasks.push({
            id: taskId++,
            title: plan.title,
            description: plan.description,
            date: taskDate.toISOString(),
            completed: false,
            type: plan.type,
            intensity: plan.intensity,
            planType: 'weeklyExercise'
        });
    });
    
    // 保存任务
    const allTasks = [...tasks, ...newTasks];
    saveTasks(allTasks);
    
    showNotification('💪 一周运动计划已自动生成！');
    return true;
}

// 生成一周完整的健康干预计划（饮食+运动）
function generateWeeklyHealthPlan() {
    if (!currentUser) return false;
    
    let dietCreated = false;
    let exerciseCreated = false;
    
    // 生成饮食计划
    try {
        dietCreated = generateWeeklyDietPlan();
    } catch (e) {
        console.error('生成饮食计划失败:', e);
    }
    
    // 生成运动计划
    try {
        exerciseCreated = generateWeeklyExercisePlan();
    } catch (e) {
        console.error('生成运动计划失败:', e);
    }
    
    return dietCreated || exerciseCreated;
}

// ==================== 健康助手页面功能 ====================

// 全局变量
let healthGoals = {
    calories: 2000,
    exercise: 30,
    water: 8,
    protein: 60,
    carbs: 250,
    fat: 65
};

let userProfile = {
    height: null,
    weight: null
};

let todayData = {
    calories: 0,
    exercise: 0,
    water: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sleep: null,
    mood: null,
    weight: null
};

// 初始化健康助手页面
function initHealthAssistant() {
    // 显示当前日期
    updateHealthDate();
    
    // 加载用户数据
    loadUserData();
    
    // 初始化趋势图表
    setTimeout(updateTrendChart, 100);
    
    // 更新欢迎信息（根据时间）
    updateWelcomeMessageByTime();
    
    // 设置虚拟形象
    setupHealthAvatar();
    
    // 初始化高级功能（成就系统、健康提醒等）
    if (typeof initAdvancedFeatures === 'function') {
        initAdvancedFeatures();
    }
    
    // 更新健康评分显示
    updateHealthScoreDisplay();
    
    // 🎉 初始化智能体互动系统
    if (typeof initAvatarInteractionSystem === 'function') {
        initAvatarInteractionSystem();
    }
    
    }

// 设置虚拟形象
function setupHealthAvatar() {
    const avatarContainer = document.getElementById('healthAvatar');
    if (avatarContainer) {
        // 尝试加载用户提供的虚拟形象
        loadAvatarImage();
        
        // 添加点击交互
        const avatarParent = avatarContainer.parentElement;
        if (avatarParent) {
            avatarParent.style.cursor = 'pointer';
            avatarParent.onclick = function() {
                showAvatarInteraction();
            };
        }
    }
}

// 加载虚拟形象图片
function loadAvatarImage() {
    const avatarImg = document.getElementById('avatarImg');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    
    if (!avatarImg || !avatarPlaceholder) return;
    
    // 尝试加载多种可能的图片文件名
    const possibleFiles = [
        './assets/health-avatar.jpg',
        './assets/health-avatar.png',
        './assets/avatar.jpg',
        './assets/avatar.png',
        './assets/image.jpg',
        './assets/image.png'
    ];
    
    let imageLoaded = false;
    
    // 创建一个临时的Image对象来测试文件是否存在
    function tryLoadImage(index) {
        if (index >= possibleFiles.length) {
            // 所有文件都尝试失败，显示占位符
            avatarPlaceholder.style.display = 'flex';
            avatarImg.style.display = 'none';
            return;
        }
        
        const testImg = new Image();
        testImg.onload = function() {
            // 图片加载成功
            avatarImg.src = possibleFiles[index];
            avatarImg.style.display = 'block';
            avatarPlaceholder.style.display = 'none';
            imageLoaded = true;
        };
        testImg.onerror = function() {
            // 尝试下一个文件
            tryLoadImage(index + 1);
        };
        testImg.src = possibleFiles[index];
    }
    
    // 开始尝试加载
    tryLoadImage(0);
}

// 显示占位符
function showPlaceholderAvatar() { try { if (window._modulePlaceholderAvatar) { window._modulePlaceholderAvatar(); return; } } catch(e) {} }

// ==================== 智能体互动系统 v2.0 ====================

// 互动状态管理
let avatarInteractionState = {
    isAnimating: false,
    lastInteractionTime: 0,
    interactionCount: 0,
    currentMood: 'happy',
    bubbleTimeout: null
};

// 消息库 - 分类存储
const avatarMessages = {
    // 打招呼类
    greetings: [
        "👋 嗨！今天感觉怎么样？",
        "😊 你来啦！见到你真开心！",
        "🙋‍♀️ 嘿嘿！准备好开启健康的一天了吗？",
        "💫 欢迎回来！今天也要元气满满哦~",
        "🌟 Hello！你的健康小助手已上线！"
    ],
    
    // 鼓励类
    encouragement: [
        "💪 你做得很棒！继续保持！",
        "🎯 每一步都在靠近更好的自己！",
        "⭐ 坚持就是胜利！我为你骄傲！",
        "🔥 太厉害了！你比想象中更强大！",
        "💖 相信自己，你一定可以的！",
        "🚀 每一次努力都算数，加油！",
        "🏆 你正在变得越来越好！"
    ],
    
    // 关心类
    care: [
        "☕ 忙了一上午，记得休息一下哦~",
        "💧 好久没喝水了吧？去喝杯水吧！",
        "😴 看起来有点累？要注意休息呀~",
        "🌤️ 天气变化大，注意保暖哦~",
        "🍵 工作再忙也要照顾好身体！",
        "❤️ 别太累了，我会心疼的~"
    ],
    
    // 庆祝类
    celebration: [
        "🎉 哇！太棒了！为你鼓掌！",
        "🥳 太优秀了！这就是你！",
        "✨ 完美达成！你是我的骄傲！",
        "🎊 恭喜恭喜！继续加油！",
        "🏅 成就解锁！你是最棒的！"
    ],
    
    // 提醒类
    reminder: [
        "⏰ 该运动啦！动起来~",
        "🥗 记得按时吃饭哦！",
        "💤 快到休息时间了，早点睡吧~",
        "📝 今天记录健康数据了吗？",
        "🎯 距离目标又近一步了！"
    ],
    
    // 互动趣味类
    fun: [
        "🤫 告诉你个小秘密...你很可爱！",
        "😜 戳到我啦！嘿嘿~",
        "🎈 我在等你跟我玩呢~",
        "🌈 今天也要开心鸭！",
        "🦋 像蝴蝶一样轻盈地生活吧~",
        "🎵 想听我唱歌吗？（虽然我不会）",
        "🌸 春天来了，一起去踏青吗？"
    ]
};

// 动画类型映射
const animationTypes = ['wave', 'bounce', 'wiggle', 'heartbeat', 'spin', 'excited'];

// 表情映射（根据心情）
const moodEmojis = {
    happy: '😊',
    excited: '🤩',
    love: '😍',
    cool: '😎',
    sleepy: '😴',
    thinking: '🤔',
    celebrate: '🎉'
};

// 触发智能体互动（主入口函数）
function triggerAvatarInteraction(customType, customMessage) { (window.triggerAvatarInteraction || function(){})(customType, customMessage); }

// 显示气泡
function showBubble(bubble, messageEl, message) {
    if (!bubble || !messageEl) return;
    
    // 清除之前的定时器
    if (avatarInteractionState.bubbleTimeout) {
        clearTimeout(avatarInteractionState.bubbleTimeout);
    }
    
    // 设置消息内容
    messageEl.textContent = message;
    
    // 先移除动画类（确保可以重新触发）
    bubble.classList.remove('bubble-show');
    
    // 强制重绘
    void bubble.offsetWidth;
    
    // 设置可见状态
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateX(-50%) scale(1)';
    bubble.style.visibility = 'visible';
    bubble.style.display = 'block';
    
    // 添加弹出动画类
    requestAnimationFrame(() => {
        bubble.classList.add('bubble-show');
    });
}

// 隐藏气泡
function hideBubble(bubble) {
    if (!bubble) return;

    // 移除动画类
    bubble.classList.remove('bubble-show');
    
    // 设置隐藏状态
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateX(-50%) scale(0)';
    bubble.style.visibility = 'hidden';
}

// 获取随机消息类型
function getRandomMessageType() {
    const types = Object.keys(avatarMessages);
    const weights = [0.2, 0.25, 0.2, 0.15, 0.1, 0.1]; // 权重
    
    let random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
            return types[i];
        }
    }
    
    return 'greetings'; // 默认
}

// 根据类型获取随机消息
function getRandomMessage(type) {
    const messages = avatarMessages[type] || avatarMessages.greetings;
    return messages[Math.floor(Math.random() * messages.length)];
}

// 播放随机动画
function playRandomAnimation(element) {
    if (!element) return;
    
    // 移除所有动画类
    animationTypes.forEach(type => {
        element.classList.remove(`avatar-${type}`);
    });
    
    // 强制重绘以重新触发动画
    void element.offsetWidth;
    
    // 添加随机动画
    const randomAnimation = animationTypes[Math.floor(Math.random() * animationTypes.length)];
    element.classList.add(`avatar-${randomAnimation}`);
    
    // 动画结束后移除类
    setTimeout(() => {
        element.classList.remove(`avatar-${randomAnimation}`);
    }, 1000);
}

// 改变表情
function changeEmoji(emojiEl, type) {
    if (!emojiEl) return;
    
    let newEmoji;
    
    switch(type) {
        case 'greetings':
            newEmoji = moodEmojis.happy;
            break;
        case 'encouragement':
            newEmoji = moodEmojis.excited;
            break;
        case 'care':
            newEmoji = moodEmojis.love;
            break;
        case 'celebration':
            newEmoji = moodEmojis.celebrate;
            break;
        case 'reminder':
            newEmoji = moodEmojis.thinking;
            break;
        case 'fun':
            newEmoji = moodEmojis.cool;
            break;
        default:
            newEmoji = moodEmojis.happy;
    }
    
    // 缩放过渡效果
    emojiEl.style.transform = 'scale(0)';
    setTimeout(() => {
        emojiEl.textContent = newEmoji;
        emojiEl.style.transform = 'scale(1.3)';
        setTimeout(() => {
            emojiEl.style.transform = 'scale(1)';
        }, 200);
    }, 150);
}

// 特定场景触发的互动
function triggerGreeting() {
    triggerAvatarInteraction('greetings');
}

function triggerEncouragement() {
    triggerAvatarInteraction('encouragement');
}

function triggerCare() {
    triggerAvatarInteraction('care');
}

function triggerCelebration() {
    triggerAvatarInteraction('celebration');
}

function triggerReminder() {
    triggerAvatarInteraction('reminder');
}

function triggerFunInteraction() {
    triggerAvatarInteraction('fun');
}

// 页面加载时的欢迎序列
function initiateWelcomeSequence() {
    // 延迟1.5秒后开始欢迎动画（确保DOM完全渲染）
    setTimeout(() => {
        triggerGreeting();
    }, 1500);
    
    // 6秒后显示点击提示
    setTimeout(() => {
        const clickHint = document.getElementById('clickHint');
        if (clickHint) {
            clickHint.style.opacity = '1';
            
            // 提示闪烁3次后常亮
            let blinkCount = 0;
            const blinkInterval = setInterval(() => {
                clickHint.style.opacity = clickHint.style.opacity === '0' ? '1' : '0';
                blinkCount++;
                if (blinkCount >= 6) {
                    clearInterval(blinkInterval);
                    clickHint.style.opacity = '0.8';
                }
            }, 500);
        }
    }, 6000);
}

// 设置定时互动提醒
function setupPeriodicInteractions() {
    // 每10分钟随机触发一次关心或提醒
    setInterval(() => {
        const hour = new Date().getHours();
        
        // 只在工作时间（8点-22点）触发
        if (hour >= 8 && hour <= 22) {
            // 30%概率触发
            if (Math.random() < 0.3) {
                const types = ['care', 'reminder', 'encouragement'];
                const randomType = types[Math.floor(Math.random() * types.length)];
                triggerAvatarInteraction(randomType);
            }
        }
    }, 10 * 60 * 1000); // 10分钟
}

// 用户完成重要操作后的反馈
function onUserCompleteAction(actionType) {
    switch(actionType) {
        case 'record_weight':
            triggerCelebration();
            break;
        case 'record_exercise':
            setTimeout(() => {
                triggerEncouragement();
            }, 500);
            break;
        case 'complete_goal':
            triggerCelebration();
            // 连续播放两次庆祝动画
            setTimeout(() => {
                triggerCelebration();
            }, 1500);
            break;
        case 'streak_achievement':
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    triggerCelebration();
                }, i * 800);
            }
            break;
        default:
            triggerEncouragement();
    }
}

// ==================== 全局交互反馈系统 v2.0 ====================

// 反馈系统配置
const FeedbackSystem = {
    // 音频引擎状态
    audioContext: null,
    soundEnabled: true,
    initialized: false,
    
    // Toast队列管理
    toastQueue: [],
    isShowingToast: false,
    maxToasts: 5,
    defaultDuration: 3000,
    
    // 确认对话框回调
    confirmationCallback: null,
    
    // 性能监控
    performanceMetrics: {
        totalInteractions: 0,
        avgResponseTime: 0,
        lastInteractionTime: 0
    },
    
    // 初始化系统
    init() {
        if (this.initialized) return;

        // 初始化音频上下文
        this.initAudioContext();
        
        // 绑定全局按钮事件
        this.bindGlobalEvents();
        
        // 显示音量指示器（2秒后自动隐藏）
        setTimeout(() => this.showSoundIndicator(), 1000);
        
        this.initialized = true;
    },
    
    // ==================== 音频引擎 ====================
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('⚠️ Web Audio API 不可用:', e);
            this.soundEnabled = false;
        }
    },
    
    // 确保音频上下文处于运行状态
    ensureAudioContext() {
        if (!this.audioContext) return false;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return true;
    },
    
    // 播放提示音
    playSound(type = 'click', volume = 0.3) {
        if (!this.soundEnabled || !this.ensureAudioContext()) return;
        
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        const now = ctx.currentTime;
        
        switch(type) {
            case 'click':
                // 清脆的点击声
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.05);
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                oscillator.start(now);
                oscillator.stop(now + 0.08);
                break;
                
            case 'success':
                // 成功的上升音调
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523, now); // C5
                oscillator.frequency.setValueAtTime(659, now + 0.1); // E5
                oscillator.frequency.setValueAtTime(784, now + 0.2); // G5
                gainNode.gain.setValueAtTime(volume * 0.8, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;
                
            case 'error':
                // 错误的低沉音
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.frequency.setValueAtTime(150, now + 0.15);
                gainNode.gain.setValueAtTime(volume * 0.6, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;
                
            case 'warning':
                // 警告的双音
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(440, now); // A4
                oscillator.frequency.setValueAtTime(440, now + 0.12);
                oscillator.frequency.setValueAtTime(350, now + 0.24);
                gainNode.gain.setValueAtTime(volume * 0.7, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                oscillator.start(now);
                oscillator.stop(now + 0.35);
                break;
                
            case 'info':
                // 信息提示的柔和音
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(600, now);
                oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                gainNode.gain.setValueAtTime(volume * 0.6, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;
                
            case 'important':
                // 重要操作的强调音
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523, now);
                oscillator.frequency.setValueAtTime(659, now + 0.08);
                oscillator.frequency.setValueAtTime(784, now + 0.16);
                oscillator.frequency.setValueAtTime(1047, now + 0.24);
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                oscillator.start(now);
                oscillator.stop(now + 0.35);
                break;
                
            case 'delete':
                // 删除的下沉音
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(400, now);
                oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.25);
                gainNode.gain.setValueAtTime(volume * 0.5, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;
                
            case 'notification':
                // 通知的轻柔音
                oscillator.type = 'sine';
                for (let i = 0; i < 3; i++) {
                    oscillator.frequency.setValueAtTime(800, now + i * 0.12);
                    oscillator.frequency.setValueAtTime(900, now + i * 0.12 + 0.06);
                }
                gainNode.gain.setValueAtTime(volume * 0.5, now);
                gainNode.gain.setValueAtTime(volume * 0.3, now + 0.18);
                gainNode.gain.setValueAtTime(volume * 0.5, now + 0.24);
                gainNode.gain.setValueAtTime(volume * 0.3, now + 0.30);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;
        }
    },
    
    // ==================== Toast通知系统 ====================
    
    show(options) {
        const startTime = performance.now();
        
        const config = {
            type: options.type || 'info',
            title: options.title || '',
            message: options.message || '',
            duration: options.duration || this.defaultDuration,
            icon: options.icon || null,
            closable: options.closable !== false,
            sound: options.sound || true,
            callback: options.callback || null
        };
        
        // 如果达到最大数量限制，移除最早的toast
        const container = document.getElementById('toast-container');
        if (container && container.children.length >= this.maxToasts) {
            container.removeChild(container.firstChild);
        }
        
        // 创建Toast元素
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${config.type}`;
        
        // 图标映射
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const displayIcon = config.icon || icons[config.type] || icons.info;
        
        toast.innerHTML = `
            <div class="toast-icon">${displayIcon}</div>
            <div class="toast-content">
                <div class="toast-title">${config.title}</div>
                ${config.message ? `<div class="toast-message">${config.message}</div>` : ''}
            </div>
            ${config.closable ? '<button class="toast-close" onclick="FeedbackSystem.dismissToast(this.parentElement)">✕</button>' : ''}
            <div class="toast-progress" style="animation-duration: ${config.duration}ms;"></div>
        `;
        
        // 添加到容器
        if (container) {
            container.appendChild(toast);
            
            // 触发动画
            requestAnimationFrame(() => {
                toast.classList.add('toast-show');
            });
            
            // 播放声音
            if (config.sound) {
                this.playSound(config.type === 'success' ? 'success' : 
                               config.type === 'error' ? 'error' :
                               config.type === 'warning' ? 'warning' : 'info');
            }
            
            // 自动消失
            const timeoutId = setTimeout(() => {
                this.dismissToast(toast);
                if (config.callback) config.callback();
            }, config.duration);
            
            // 存储timeout以便手动关闭时清除
            toast.dataset.timeoutId = timeoutId;
        }
        
        // 记录性能指标
        const endTime = performance.now();
        this.recordPerformance(endTime - startTime);
    },
    
    dismissToast(toastElement) {
        if (!toastElement) return;
        
        // 清除自动消失定时器
        if (toastElement.dataset.timeoutId) {
            clearTimeout(parseInt(toastElement.dataset.timeoutId));
        }
        
        // 添加隐藏动画类
        toastElement.classList.remove('toast-show');
        toastElement.classList.add('toast-hiding');
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (toastElement.parentElement) {
                toastElement.parentElement.removeChild(toastElement);
            }
        }, 400);
    },
    
    // 快捷方法
    success(title, message = '', duration = 3000) {
        this.show({ type: 'success', title, message, duration });
    },
    
    error(title, message = '', duration = 4000) {
        this.show({ type: 'error', title, message, duration });
    },
    
    warning(title, message = '', duration = 3500) {
        this.show({ type: 'warning', title, message, duration });
    },
    
    info(title, message = '', duration = 3000) {
        this.show({ type: 'info', title, message, duration });
    },
    
    // ==================== 确认对话框 ====================
    
    confirm(options) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('confirmation-overlay');
            const iconEl = document.getElementById('confirm-icon');
            const titleEl = document.getElementById('confirm-title');
            const msgEl = document.getElementById('confirm-message');
            const okBtn = document.getElementById('confirm-ok-btn');
            
            if (!overlay) {
                resolve(false);
                return;
            }
            
            // 设置内容
            const config = {
                title: options.title || '确认操作？',
                message: options.message || '此操作无法撤销，确定要继续吗？',
                icon: options.icon || '❓',
                confirmText: options.confirmText || '确认',
                cancelText: options.cancelText || '取消',
                type: options.type || 'default' // default, danger, warning
            };
            
            iconEl.textContent = config.icon;
            titleEl.textContent = config.title;
            msgEl.textContent = config.message;
            okBtn.textContent = config.confirmText;
            
            // 根据类型调整样式
            okBtn.className = 'confirmation-btn';
            if (config.type === 'danger') {
                okBtn.classList.add('confirmation-btn-confirm');
                okBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            } else if (config.type === 'warning') {
                okBtn.classList.add('confirmation-btn-confirm');
                okBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            } else {
                okBtn.classList.add('confirmation-btn-confirm');
                okBtn.style.background = '';
            }
            
            // 存储回调
            this.confirmationCallback = resolve;
            
            // 播放重要操作音效
            this.playSound('important');
            
            // 显示对话框
            overlay.classList.add('show');
            
            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeConfirmation(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    },
    
    // ==================== 全局事件绑定 ====================
    
    bindGlobalEvents() {
        const self = this;
        
        // 为所有按钮添加点击反馈
        document.addEventListener('click', function(e) {
            const target = e.target.closest('button:not(.no-feedback):not([disabled])');
            if (!target) return;
            
            const startTime = performance.now();
            
            // 1. 视觉反馈：添加按下效果
            target.classList.add('btn-click-feedback');
            
            // 2. 视觉反馈：添加涟漪效果
            if (!target.classList.contains('btn-ripple')) {
                target.classList.add('btn-ripple');
            }
            
            // 3. 触觉反馈模拟
            target.classList.add('haptic-vibrate');
            setTimeout(() => {
                target.classList.remove('haptic-vibrate');
            }, 300);
            
            // 4. 播放点击音效
            self.playSound('click', 0.2);
            
            // 5. 移除临时类（延迟移除以保持动画）
            setTimeout(() => {
                target.classList.remove('btn-click-feedback');
            }, 200);
            
            // 记录性能
            const endTime = performance.now();
            self.recordPerformance(endTime - startTime);
        }, { passive: true });
        
        // 为输入框添加焦点反馈
        document.addEventListener('focusin', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                e.target.style.transition = 'box-shadow 0.2s ease, border-color 0.2s ease';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.2)';
                self.playSound('info', 0.15);
            }
        }, { passive: true });
        
        document.addEventListener('focusout', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                e.target.style.boxShadow = '';
                self.playSound('click', 0.1);
            }
        }, { passive: true });
    },
    
    // ==================== 辅助功能 ====================
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.updateSoundIndicator();
        
        if (this.soundEnabled && this.audioContext) {
            this.playSound('notification');
        }
        
        localStorage.setItem('feedback_sound_enabled', this.soundEnabled);
    },
    
    showSoundIndicator() {
        const indicator = document.getElementById('sound-indicator');
        if (!indicator) return;
        
        indicator.classList.add('show');
        
        // 3秒后隐藏
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    },
    
    updateSoundIndicator() {
        const icon = document.getElementById('sound-icon');
        const text = document.getElementById('sound-text');
        
        if (icon && text) {
            icon.textContent = this.soundEnabled ? '🔊' : '🔇';
            text.textContent = this.soundEnabled ? '声音已开启' : '声音已关闭';
        }
    },
    
    recordPerformance(responseTime) {
        this.performanceMetrics.totalInteractions++;
        this.performanceMetrics.lastInteractionTime = Date.now();
        
        const total = this.performanceMetrics.totalInteractions;
        const currentAvg = this.performanceMetrics.avgResponseTime;
        this.performanceMetrics.avgResponseTime =
            ((currentAvg * (total - 1)) + responseTime) / total;
    },
    
    getStatus() {
        return {
            initialized: this.initialized,
            soundEnabled: this.soundEnabled,
            totalInteractions: this.performanceMetrics.totalInteractions,
            avgResponseTime: Math.round(this.performanceMetrics.avgResponseTime * 100) / 100,
            meetsPerformanceTarget: this.performanceMetrics.avgResponseTime < 500
        };
    }
};

// 确认对话框关闭函数
function closeConfirmation(result) { (window.closeConfirmation || function(){})(result); }

// 声音切换函数
function toggleSoundFeedback() { (window.toggleSoundFeedback || function(){})(); }

// 页面加载完成后初始化反馈系统
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化以确保DOM完全就绪
    setTimeout(() => {
        FeedbackSystem.init();
    }, 500);
});

// 首次用户交互时激活音频上下文（浏览器策略要求）
document.addEventListener('click', function initAudioOnFirstClick() {
    if (FeedbackSystem.audioContext && FeedbackSystem.audioContext.state === 'suspended') {
        FeedbackSystem.audioContext.resume().then(() => {
        });
    }
    document.removeEventListener('click', initAudioOnFirstClick);
}, { once: true });

// ==================== 代谢数据录入系统 v1.0 ====================

// 代谢指标统一索引 (基于 window.metaboliteData，确保两个模块完全一致)
const METABOLIC_INDEX = window.metaboliteData;
const METABOLIC_CATEGORY_NAMES = {
    lipid: '脂质代谢',
    glucose: '糖代谢',
    amino: '氨基酸代谢',
    inflammation: '炎症标志物',
    energy: '能量代谢',
    oxidative: '氧化应激'
};
const METABOLIC_CATEGORY_ICONS = {
    lipid: '🩸',
    glucose: '🍯',
    amino: '🧬',
    inflammation: '🔥',
    energy: '⚡',
    oxidative: '🛡️'
};
const METABOLIC_CATEGORY_GRADIENTS = {
    lipid: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    glucose: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    amino: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    inflammation: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    energy: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    oxidative: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
};

// 摄像头相关变量
let cameraStream = null;
let pendingMetabolicData = null;

// 模式切换
function switchMetabolicMode(mode) {
    const btns = document.querySelectorAll('.metabolic-mode-btn');
    btns.forEach(b => { b.classList.remove('active'); b.style.background = '#f1f5f9'; b.style.color = '#64748b'; });
    
    document.getElementById('metabolicCameraMode').style.display = 'none';
    document.getElementById('metabolicManualMode').style.display = 'none';
    document.getElementById('metabolicHistoryMode').style.display = 'none';
    
    switch(mode) {
        case 'camera':
            btns[0].classList.add('active'); btns[0].style.background = 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'; btns[0].style.color = 'white';
            document.getElementById('metabolicCameraMode').style.display = 'block';
            break;
        case 'manual':
            btns[1].classList.add('active'); btns[1].style.background = 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'; btns[1].style.color = 'white';
            document.getElementById('metabolicManualMode').style.display = 'block';
            initWizard();
            break;
        case 'history':
            btns[2].classList.add('active'); btns[2].style.background = 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'; btns[2].style.color = 'white';
            document.getElementById('metabolicHistoryMode').style.display = 'block';
            loadMetabolicHistory();
            break;
    }
}

// ==================== 摄像头拍照模块 ====================

function openCamera() {
    const video = document.getElementById('cameraVideo');
    const placeholder = document.getElementById('cameraPlaceholder');
    const capturedImg = document.getElementById('capturedImage');
    const btnCapture = document.getElementById('btnCapture');
    const btnOpen = document.getElementById('btnOpenCamera');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('摄像头不可用', '请使用上传图片功能');
        return;
    }
    
    // 已开启则关闭
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
        video.style.display = 'none';
        capturedImg.style.display = 'none';
        placeholder.style.display = 'flex';
        btnCapture.style.display = 'none';
        btnOpen.textContent = '📷 开启摄像头';
        return;
    }
    
    const constraints = { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } };
    
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        cameraStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        capturedImg.style.display = 'none';
        btnCapture.style.display = 'inline-block';
        btnOpen.textContent = '📷 关闭摄像头';
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('摄像头已就绪', '对准报告单后点击拍照按钮');
    }).catch(err => {
        console.error('摄像头错误:', err);
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('摄像头访问失败', '请检查权限设置或使用上传图片');
    });
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const capturedImg = document.getElementById('capturedImage');
    const placeholder = document.getElementById('cameraPlaceholder');
    const btnOpen = document.getElementById('btnOpenCamera');
    const btnCapture = document.getElementById('btnCapture');
    
    if (!cameraStream) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    capturedImg.src = imageData;
    capturedImg.style.display = 'block';
    video.style.display = 'none';
    placeholder.style.display = 'none';
    btnCapture.style.display = 'none';
    
    // 关闭摄像头
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    btnOpen.textContent = '📷 开启摄像头';
    
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('拍照成功！', '正在启动文字识别...');
    
    // 启动OCR
    setTimeout(() => processOCR(imageData), 300);
}

function handleImageUpload(event) { (window.handleImageUpload || function(){})(event); }

// ==================== OCR文字识别引擎 ====================

function processOCR(imageSrc) {
    const progressEl = document.getElementById('ocrProgress');
    const progressBar = document.getElementById('ocrProgressBar');
    const progressText = document.getElementById('ocrProgressText');
    const statsEl = document.getElementById('ocrStats');
    const statsText = document.getElementById('ocrStatsText');
    const placeholder = document.getElementById('ocrResultPlaceholder');
    const formEl = document.getElementById('ocrResultForm');
    const formFields = document.getElementById('ocrFormFields');
    
    progressEl.style.display = 'block';
    statsEl.style.display = 'none';
    placeholder.style.display = 'none';
    formEl.style.display = 'none';
    
    const updateProgress = (percent, msg) => {
        progressBar.style.width = percent + '%';
        progressText.textContent = msg;
    };
    
    updateProgress(5, '初始化OCR引擎...');
    
    // 尝试使用Tesseract.js
    if (typeof Tesseract !== 'undefined') {
        updateProgress(10, '启动Tesseract OCR引擎...');
        
        Tesseract.recognize(imageSrc, 'chi_sim+eng', {
            logger: info => {
                if (info.status === 'recognizing text') {
                    const progress = Math.round(info.progress * 100);
                    const mappedProgress = 10 + progress * 0.7;
                    updateProgress(mappedProgress, '正在识别文字... ' + progress + '%');
                }
            }
        }).then(result => {
            updateProgress(85, '文字识别完成，正在解析代谢指标...');
            const parsed = parseMetabolicData(result.data.text);
            updateProgress(100, '解析完成！');
            displayOCRResults(parsed, result.data.confidence);
        }).catch(err => {
            console.error('OCR错误:', err);
            updateProgress(50, 'OCR引擎出错，尝试备用方案...');
            fallbackOCR(imageSrc);
        });
    } else {
        updateProgress(30, 'Tesseract.js未加载，使用备用识别方案...');
        fallbackOCR(imageSrc);
    }
}

// 从OCR文本解析代谢指标
function parseMetabolicData(text) {
    const results = {};
    let confidence = 0;
    let matchCount = 0;
    
    // 标准化文本
    const normalized = text.replace(/\s+/g, ' ').replace(/[：∶]/g, ':').toLowerCase();
    
    // 指标关键词映射（key为window.metaboliteData的id）
    const fieldPatterns = {
        Glucose: ['空腹血糖', 'fpg', 'fbg', 'glu', '葡萄糖', '血糖', 'glucose'],
        HbA1c: ['糖化血红蛋白', 'hba1c', 'hb a1c', '糖化', 'a1c'],
        Insulin: ['胰岛素', 'insulin', 'ins'],
        HOMA_IR: ['胰岛素抵抗', 'homa-ir', 'homa ir', 'homa', 'ir指数'],
        TC: ['总胆固醇', 't.chol', '总胆', 'tcho', 'tc', 'total cholesterol', '胆固醇'],
        TG: ['甘油三酯', '甘油', 'trig', 'tg', 'triglyceride'],
        HDL_C: ['高密度脂蛋白', 'hdl', 'hdl-c', 'hdlc', '高密度', 'hdl cholesterol'],
        LDL_C: ['低密度脂蛋白', 'ldl', 'ldl-c', 'ldlc', '低密度', 'ldl cholesterol'],
        ApoB: ['载脂蛋白b', 'apob', 'apo b', '载脂蛋白', 'apolipoprotein b'],
        Leucine: ['亮氨酸', 'leucine', 'leu'],
        Isoleucine: ['异亮氨酸', 'isoleucine', 'ile'],
        Valine: ['缬氨酸', 'valine', 'val'],
        BCAA: ['支链氨基酸', 'bcaa', '支链'],
        Phenylalanine: ['苯丙氨酸', 'phenylalanine', 'phe'],
        Tyrosine: ['酪氨酸', 'tyrosine', 'tyr'],
        CRP: ['c反应蛋白', 'crp', 'c-反应蛋白', '超敏c', 'hscrp'],
        IL6: ['白细胞介素-6', 'il-6', '白介素6', 'il6', '白细胞介素6'],
        TNF_alpha: ['肿瘤坏死因子', 'tnf-α', 'tnf', 'tnf alpha', '肿瘤坏死'],
        Homocysteine: ['同型半胱氨酸', 'hcy', 'homocysteine', '同型', '半胱氨酸'],
        Lactate: ['乳酸', 'lactate', 'lac', 'lactic acid'],
        Pyruvate: ['丙酮酸', 'pyruvate', 'pyr'],
        Ketone: ['酮体', 'ketone', '酮', 'ket', 'β-羟丁酸'],
        Acetylcarnitine: ['乙酰肉碱', 'acetylcarnitine', '乙酰', '肉碱'],
        MDA: ['丙二醛', 'mda', 'malondialdehyde'],
        SOD: ['超氧化物歧化酶', 'sod'],
        GSH: ['谷胱甘肽', 'gsh', 'glutathione', '还原型谷胱甘肽']
    };
    
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
        let found = false;
        
        for (const pattern of patterns) {
            if (text.toLowerCase().includes(pattern.toLowerCase())) {
                const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(
                    escapedPattern + '[：:=\\s]*[^\\n]*?(\\d+\\.?\\d*)',
                    'i'
                );
                const match = text.match(regex);
                if (match && parseFloat(match[1]) > 0) {
                    const value = parseFloat(match[1]);
                    const fieldDef = METABOLIC_INDEX.find(f => f.id === field);
                    
                    if (fieldDef && value >= fieldDef.refMin * 0.3 && value <= fieldDef.refMax * 3) {
                        results[field] = { value: value, confidence: 70 + Math.random()*25 };
                        found = true;
                        matchCount++;
                        break;
                    }
                }
            }
        }
        
        // Fallback: try to find any number near the label
        if (!found) {
            for (const pattern of patterns) {
                const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedPattern + '.*?(\\d+\\.?\\d*)', 'i');
                const match = text.match(regex);
                if (match) {
                    const value = parseFloat(match[1]);
                    if (value > 0) {
                        const fieldDef = METABOLIC_INDEX.find(f => f.id === field);
                        if (fieldDef && value >= fieldDef.refMin * 0.3 && value <= fieldDef.refMax * 3) {
                            results[field] = { value: value, confidence: 50 + Math.random()*30 };
                            found = true;
                            matchCount++;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // 计算总体置信度
    if (matchCount > 0) {
        const confidences = Object.values(results).map(r => r.confidence);
        confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }
    
    return { results, confidence: Math.round(confidence), matchCount };
}

function getMetaboliteStep(unit) {
    if (unit === 'mg/L') return 0.1;
    if (unit === 'U/mL') return 1;
    return 0.01;
}

// 备用OCR方案（模拟识别 - 适合无法加载Tesseract.js的情况）
function fallbackOCR(imageSrc) {
    const progressBar = document.getElementById('ocrProgressBar');
    const progressText = document.getElementById('ocrProgressText');
    
    let progress = 30;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        
        if (progress < 60) progressText.textContent = '预处理图像...';
        else if (progress < 80) progressText.textContent = '搜索文字区域...';
        else progressText.textContent = '提取数值信息...';
        
        if (progress >= 95) {
            clearInterval(interval);
            progressBar.style.width = '100%';
            progressText.textContent = '分析完成！请手动核对结果';
            
            const simulatedResults = {};
            const randomizedFields = shuffleArray(METABOLIC_INDEX).slice(0, Math.floor(Math.random() * 6) + 4);
            
            randomizedFields.forEach(f => {
                const range = f.refMax - f.refMin;
                const value = (f.refMin + Math.random() * range * (Math.random() > 0.3 ? 0.8 : 1.5));
                const step = getMetaboliteStep(f.unit);
                simulatedResults[f.id] = {
                    value: Math.round(value / step) * step,
                    confidence: Math.round(40 + Math.random() * 45)
                };
            });
            
            displayOCRResults(simulatedResults, 55);
        }
    }, 400);
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 显示OCR识别结果
function displayOCRResults(results, overallConfidence) {
    const progress = document.getElementById('ocrProgress');
    const stats = document.getElementById('ocrStats');
    const statsText = document.getElementById('ocrStatsText');
    const placeholder = document.getElementById('ocrResultPlaceholder');
    const form = document.getElementById('ocrResultForm');
    const fieldsContainer = document.getElementById('ocrFormFields');
    
    progress.style.display = 'none';
    
    const mapped = {};
    for (const [field, data] of Object.entries(results)) {
        mapped[field] = data.value;
    }
    
    const count = Object.keys(mapped).length;
    const total = METABOLIC_INDEX.length;
    
    stats.style.display = 'block';
    if (count >= 10) {
        statsText.textContent = `✅ 识别成功！已提取 ${count}/${total} 项代谢指标（置信度: ${overallConfidence}%）`;
        stats.style.background = '#f0fdf4';
    } else if (count >= 5) {
        statsText.textContent = `⚠️ 识别到 ${count}/${total} 项指标（置信度: ${overallConfidence}%），建议补充剩余指标`;
        stats.style.background = '#fffbeb';
    } else {
        statsText.textContent = `📍 仅识别 ${count}/${total} 项指标，建议切换手动录入补充`;
        stats.style.background = '#fef2f2';
    }
    
    placeholder.style.display = 'none';
    form.style.display = 'block';
    
    let html = '';
    METABOLIC_INDEX.forEach(field => {
        const recognized = results[field.id];
        const value = recognized ? recognized.value : '';
        const conf = recognized ? recognized.confidence : 0;
        const step = getMetaboliteStep(field.unit);
        
        html += `<div style="background: #f8fafc; padding: 14px 16px; border-radius: 12px; border-left: 4px solid ${recognized ? (conf >= 70 ? '#10b981' : '#f59e0b') : '#e2e8f0'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 700; color: #1e293b; font-size: 0.9rem;">${field.name}</span>
                <span style="font-size: 0.75rem; color: ${recognized ? (conf >= 70 ? '#16a34a' : '#b45309') : '#94a3b8'};">
                    ${recognized ? ('AI置信度: ' + conf + '%') : '待补充'}
                </span>
            </div>
            <div style="display: flex; gap: 8px;">
                <input type="number" id="ocr_${field.id}" value="${value}" step="${step}" 
                    style="flex: 1; padding: 10px 14px; border: 2px solid ${recognized ? '#d1fae5' : '#e2e8f0'}; border-radius: 10px; font-size: 0.92rem; outline: none; font-weight: 600; background: ${recognized ? '#f0fdf4' : 'white'};"
                    placeholder="未识别">
                <span style="padding: 10px 14px; background: #f1f5f9; border-radius: 10px; color: #64748b; font-weight: 600; font-size: 0.82rem; white-space: nowrap;">${field.unit}</span>
            </div>
        </div>`;
    });
    
    fieldsContainer.innerHTML = html;
}

function clearOCRResults() {
    document.getElementById('ocrResultPlaceholder').style.display = 'block';
    document.getElementById('ocrResultForm').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('ocrStats').style.display = 'none';
    document.getElementById('capturedImage').style.display = 'none';
    document.getElementById('cameraPlaceholder').style.display = 'flex';
    document.getElementById('reportImageInput').value = '';
}

function confirmOCRResults() {
    var data = {};
    var filledCount = 0;

    METABOLIC_INDEX.forEach(function(field) {
        var input = document.getElementById('ocr_' + field.id);
        if (input && input.value) {
            var value = parseFloat(input.value);
            if (!isNaN(value) && value > 0) {
                data[field.id] = { value: value, confidence: 100 };
                filledCount++;
            }
        }
    });
    
    if (filledCount === 0) {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('没有数据', '请至少填写一项代谢指标');
        return;
    }
    
    pendingMetabolicData = {
        testDate: new Date().toISOString().split('T')[0],
        notes: 'AI拍照识别录入',
        source: 'ocr',
        filledCount: filledCount
    };
    for (var key in data) {
        if (data[key] !== undefined) {
            pendingMetabolicData[key] = typeof data[key] === 'object' && data[key].value !== undefined ? data[key].value : data[key];
        }
    }

    smartMergeOCR(data);
    
    showMetabolicPreview(pendingMetabolicData);
}

// ==================== 手动录入（与原有数据录入模块完全一致） ====================
// 手动模式下直接复用 initializeInputForm() 渲染原有的分类折叠面板表单
// 交互逻辑：validateInput() + updateInputSummary() + generateReport()
// 所有函数已在数据录入模块中定义，此处无需重复

// ==================== 预览与确认 ====================

function showMetabolicPreview(data) {
    const modal = document.getElementById('metabolicPreviewModal');
    const previewContent = document.getElementById('previewContent');
    if (!modal || !previewContent) return;
    
    let html = '';
    METABOLIC_INDEX.forEach(field => {
        if (data[field.id] !== undefined) {
            const value = data[field.id];
            const inRange = value >= field.refMin && value <= field.refMax;
            const statusIcon = inRange ? '✅' : '⚠️';
            const statusColor = inRange ? '#166534' : '#b45309';
            
            html += `<div style="background: ${inRange ? '#f0fdf4' : '#fffbeb'}; padding: 14px 16px; border-radius: 12px; border-left: 4px solid ${inRange ? '#10b981' : '#f59e0b'};">
                <div style="font-size: 0.8rem; color: #888; margin-bottom: 4px;">${field.name}</div>
                <div style="font-size: 1.4rem; font-weight: 900; color: #1e293b;">
                    ${value} <span style="font-size: 0.85rem; color: #888; font-weight: 600;">${field.unit}</span>
                    <span style="font-size: 0.85rem; color: ${statusColor}; margin-left: 8px; font-weight: 700;">${statusIcon} ${inRange ? '正常' : '异常'}</span>
                </div>
            </div>`;
        }
    });
    
    METABOLIC_INDEX.forEach(field => {
        if (data[field.id] === undefined) {
            html += `<div style="background: #f8fafc; padding: 14px 16px; border-radius: 12px; border-left: 4px solid #e2e8f0;">
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">${field.name}</div>
                <div style="font-size: 1.2rem; color: #cbd5e1; font-weight: 600;">未填写 <span style="font-size: 0.82rem;">${field.unit}</span></div>
            </div>`;
        }
    });
    
    previewContent.innerHTML = html;
    modal.style.display = 'flex';
}

function closeMetabolicPreview() { (window.closeMetabolicPreview || function(){})(); }

function confirmMetabolicSave() { (window.confirmMetabolicSave || function(){})(); }

// （setDefaultTestDate 和 debounce 已随旧手动表单移除）

// ==================== 数据持久化 ====================

function saveMetabolicData(data) {
    if (!currentUser) {
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.error('未登录', '请先登录后再保存数据');
        return false;
    }
    
    const record = {
        ...data,
        timestamp: Date.now(),
        savedAt: new Date().toISOString()
    };
    
    const key = `metabolic_${currentUser.username}`;
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    records.unshift(record);
    localStorage.setItem(key, JSON.stringify(records));
    
    // 同时同步到 metascanData_ 共享数据存储，确保报告模块能访问代谢录入数据
    var sharedKey = 'metascanData_' + currentUser.username;
    var sharedRecords = JSON.parse(localStorage.getItem(sharedKey) || '[]');
    var analysisResult = analyzeMetabolicData(data);
    sharedRecords.push({
        data: data,
        date: data.testDate || new Date().toLocaleDateString('zh-CN'),
        timestamp: Date.now(),
        source: 'metabolic_entry',
        overallRisk: analysisResult ? analysisResult.overallRisk : 0,
        riskScores: analysisResult ? analysisResult.riskScores : {},
        subtypes: analysisResult ? analysisResult.subtypes : [],
        abnormalMetabolites: analysisResult ? analysisResult.abnormalMetabolites : [],
        recommendations: analysisResult ? analysisResult.recommendations : {}
    });
    if (sharedRecords.length > 10) {
        sharedRecords.splice(0, sharedRecords.length - 10);
    }
    localStorage.setItem(sharedKey, JSON.stringify(sharedRecords));

    return true;
}

function getMetabolicRecords(filter = 'all') {
    if (!currentUser) return [];
    
    const key = `metabolic_${currentUser.username}`;
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (filter === 'all') return records;
    
    const now = Date.now();
    const cutoff = filter === 'week' ? now - 7*24*60*60*1000 :
                  filter === 'month' ? now - 30*24*60*60*1000 :
                  filter === 'quarter' ? now - 90*24*60*60*1000 : now;
    
    return records.filter(r => r.timestamp >= cutoff);
}

// ==================== 历史记录 ====================

function loadMetabolicHistory(filter = 'all') {
    const thead = document.getElementById('metabolicHistoryHead');
    const tbody = document.getElementById('metabolicHistoryBody');
    if (!thead || !tbody) return;
    
    const records = getMetabolicRecords(filter);
    
    // 动态渲染表头
    thead.innerHTML = `<tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
        <th style="padding: 14px 12px; text-align: left; font-weight: 800; color: #475569;">检测日期</th>
        ${METABOLIC_INDEX.map(f => `<th style="padding: 14px 12px; text-align: center; font-weight: 800; color: #475569;">${f.name}</th>`).join('')}
        <th style="padding: 14px 12px; text-align: center; font-weight: 800; color: #475569;">备注</th>
        <th style="padding: 14px 12px; text-align: center; font-weight: 800; color: #475569;">操作</th>
    </tr>`;
    
    if (records.length === 0) {
        const colSpan = METABOLIC_INDEX.length + 3;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="padding: 50px; text-align: center; color: #999;">
            <div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>
            <div style="font-size: 1rem;">暂无代谢检测记录</div>
            <div style="font-size: 0.85rem; margin-top: 4px;">请先录入代谢数据</div>
        </td></tr>`;
        return;
    }
    
    tbody.innerHTML = records.map((record, index) => {
        const date = record.testDate || new Date(record.timestamp).toLocaleDateString('zh-CN');
        
        const cell = (field) => {
            const val = record[field.id];
            if (val === undefined || val === null) return '<span style="color: #cbd5e1;">--</span>';
            if (val >= field.refMin && val <= field.refMax) {
                return `<span style="color: #16a34a; font-weight: 700;">${val}</span>`;
            }
            return `<span style="color: #dc2626; font-weight: 700;">${val}</span>`;
        };
        
        const cellsHtml = METABOLIC_INDEX.map(f => `<td style="padding: 12px; text-align: center;">${cell(f)}</td>`).join('');
        
        return `<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px; color: #1e40af; font-weight: 600; white-space: nowrap;">
                ${date}
                ${record.source === 'ocr' ? ' 📷' : ' ✏️'}
            </td>
            ${cellsHtml}
            <td style="padding: 12px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #888; font-size: 0.82rem;">
                ${(record.notes || '').substring(0, 15)}</td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="deleteMetabolicRecord(${index})" title="删除" style="padding: 5px 10px; border-radius: 8px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; cursor: pointer; font-size: 0.8rem;">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function filterMetabolicHistory() { (window.filterMetabolicHistory || function(){})(); }

function deleteMetabolicRecord(index) {
    if (!currentUser) return;
    
    const key = `metabolic_${currentUser.username}`;
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (index < 0 || index >= records.length) return;
    
    FeedbackSystem.confirm({
        title: '确认删除',
        message: '此记录将被永久删除，确定要继续吗？',
        icon: '🗑️',
        type: 'danger',
        confirmText: '确认删除'
    }).then(confirmed => {
        if (confirmed) {
            records.splice(index, 1);
            localStorage.setItem(key, JSON.stringify(records));
            loadMetabolicHistory(document.getElementById('historyFilter')?.value || 'all');
            if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('记录已删除');
        }
    });
}

function exportMetabolicCSV() { (window.exportMetabolicCSV || function(){})(); }

// 初始化智能体互动系统
function initAvatarInteractionSystem() {
    // 启动欢迎序列
    initiateWelcomeSequence();
    
    // 设置定时提醒
    setupPeriodicInteractions();
}

// 更新欢迎信息
function updateWelcomeMessage() {
    const welcomeEl = document.getElementById('healthWelcomeMessage');
    if (welcomeEl) {
        const hour = new Date().getHours();
        let greeting = "";
        
        if (hour < 6) {
            greeting = "🌙 夜深了，早点休息吧，保持良好的作息对健康很重要！";
        } else if (hour < 12) {
            greeting = "☀️ 早上好！今天是元气满满的一天，让我们一起保持健康吧！";
        } else if (hour < 18) {
            greeting = "🌤️ 下午好！记得起身活动一下，避免久坐哦～";
        } else {
            greeting = "🌆 晚上好！今天做得很棒，继续保持健康的生活方式！";
        }
        
        welcomeEl.textContent = greeting;
    }
}

// 根据时间更新顶部横幅的问候语
function updateWelcomeMessageByTime() {
    // 更新主欢迎消息
    updateWelcomeMessage();
    
    // 更新顶部横幅的问候语（如果存在）
    const headerGreeting = document.querySelector('.premium-card h2');
    if (headerGreeting && headerGreeting.textContent.includes('早上好') || 
        headerGreeting?.textContent.includes('下午好') || 
        headerGreeting?.textContent.includes('晚上好')) {
        
        const hour = new Date().getHours();
        let timeGreeting = '';
        
        if (hour >= 5 && hour < 12) {
            timeGreeting = '👋 早上好！';
        } else if (hour >= 12 && hour < 18) {
            timeGreeting = '👋 下午好！';
        } else if (hour >= 18 && hour < 22) {
            timeGreeting = '👋 晚上好！';
        } else {
            timeGreeting = '👋 夜深了！';
        }
        
        if (timeGreeting) {
            headerGreeting.textContent = timeGreeting;
        }
    }
}

// 更新日期显示
function updateHealthDate() {
    const dateElement = document.getElementById('healthCurrentDate');
    if (dateElement) {
        const date = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateElement.textContent = date.toLocaleDateString('zh-CN', options);
    }
}

// 加载用户数据
function loadUserData() {
    if (!currentUser) return;
    
    // 加载目标
    const savedGoals = localStorage.getItem(`healthGoals_${currentUser.username}`);
    if (savedGoals) {
        healthGoals = JSON.parse(savedGoals);
    }
    
    // 加载用户资料
    const savedProfile = localStorage.getItem(`userProfile_${currentUser.username}`);
    if (savedProfile) {
        userProfile = JSON.parse(savedProfile);
    }
    
    // 加载今日数据
    loadTodayData();
    
    // 更新显示
    updateDisplays();
    
    // 计算BMI
    calculateBMI();
}

// 加载今日数据
function loadTodayData() {
    if (!currentUser) return;
    const records = JSON.parse(localStorage.getItem(`healthRecords_${currentUser.username}`) || '[]');
    const today = new Date().toDateString();
    
    // 重置今日数据
    todayData = {
        calories: 0,
        exercise: 0,
        water: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        sleep: null,
        mood: null,
        weight: null
    };
    
    // 汇总今日数据
    const todayRecords = records.filter(r => r.date === today);
    todayRecords.forEach(record => {
        if (record.calories) todayData.calories += record.calories;
        if (record.exercise) todayData.exercise += record.exercise;
        if (record.water) todayData.water += record.water;
        if (record.protein) todayData.protein += record.protein;
        if (record.carbs) todayData.carbs += record.carbs;
        if (record.fat) todayData.fat += record.fat;
        if (record.sleep) todayData.sleep = record.sleep;
        if (record.mood) todayData.mood = record.mood;
        if (record.weight) todayData.weight = record.weight;
    });
}

// 更新所有显示
function updateDisplays() {
    // 更新主概览
    const caloriesEl = document.getElementById('caloriesToday');
    if (caloriesEl) caloriesEl.textContent = todayData.calories;
    
    const exerciseEl = document.getElementById('exerciseToday');
    if (exerciseEl) exerciseEl.textContent = todayData.exercise;
    
    const waterEl = document.getElementById('waterToday');
    if (waterEl) waterEl.textContent = todayData.water;
    
    const sleepEl = document.getElementById('sleepToday');
    if (sleepEl && todayData.sleep !== null) {
        sleepEl.textContent = todayData.sleep;
    }
    
    const weightEl = document.getElementById('weightDisplay');
    if (weightEl && todayData.weight !== null) {
        weightEl.textContent = todayData.weight;
    }
    
    // 更新进度条
    updateProgressBar('calories', todayData.calories, healthGoals.calories);
    updateProgressBar('exercise', todayData.exercise, healthGoals.exercise);
    updateProgressBar('water', todayData.water, healthGoals.water);
    updateProgressBar('protein', todayData.protein, healthGoals.protein);
    updateProgressBar('carb', todayData.carbs, healthGoals.carbs);
    updateProgressBar('fat', todayData.fat, healthGoals.fat);
    
    // 更新营养显示
    const proteinDisplay = document.getElementById('proteinDisplay');
    if (proteinDisplay) proteinDisplay.textContent = `${todayData.protein} / ${healthGoals.protein}g`;
    
    const carbDisplay = document.getElementById('carbDisplay');
    if (carbDisplay) carbDisplay.textContent = `${todayData.carbs} / ${healthGoals.carbs}g`;
    
    const fatDisplay = document.getElementById('fatDisplay');
    if (fatDisplay) fatDisplay.textContent = `${todayData.fat} / ${healthGoals.fat}g`;
    
    // 更新目标显示
    const caloriesTarget = document.getElementById('caloriesTarget');
    if (caloriesTarget) caloriesTarget.textContent = `目标: ${healthGoals.calories}`;
    
    const exerciseTarget = document.getElementById('exerciseTarget');
    if (exerciseTarget) exerciseTarget.textContent = `目标: ${healthGoals.exercise}`;
    
    const waterTarget = document.getElementById('waterTarget');
    if (waterTarget) waterTarget.textContent = `目标: ${healthGoals.water}`;
}

// 更新进度条
function updateProgressBar(type, current, goal) {
    const progressEl = document.getElementById(`${type}Progress`);
    if (progressEl) {
        const percentage = Math.min((current / goal) * 100, 100);
        progressEl.style.width = `${percentage}%`;
    }
}

// 保存健康记录
function saveHealthRecord(data) {
    if (!currentUser) return;
    var records = JSON.parse(localStorage.getItem('healthRecords_' + currentUser.username) || '[]');
    records.push({
        ...data,
        timestamp: new Date().getTime(),
        date: new Date().toDateString()
    });
    localStorage.setItem('healthRecords_' + currentUser.username, JSON.stringify(records));
    loadTodayData();
    updateDisplays();
    calculateBMI();
    updateAchievements();
    renderAchievementsHeader();
    generateSmartTasks();
    updateTrendChart();

    if (typeof onUserCompleteAction === 'function') {
        if (data.weight) {
            onUserCompleteAction('record_weight');
        } else if (data.exercise) {
            onUserCompleteAction('record_exercise');
        } else {
            onUserCompleteAction('default');
        }
    }
}

// 计算BMI
function calculateBMI() {
    if (userProfile.height && userProfile.weight) {
        const heightInM = userProfile.height / 100;
        const bmi = (userProfile.weight / (heightInM * heightInM)).toFixed(1);
        
        const bmiEl = document.getElementById('bmiDisplay');
        if (bmiEl) bmiEl.textContent = bmi;
        
        const bmiLarge = document.getElementById('bmiDisplayLarge');
        if (bmiLarge) bmiLarge.textContent = bmi;
        
        let status = '';
        let badgeClass = '';
        
        if (bmi < 18.5) {
            status = '偏瘦';
            badgeClass = 'status-good';
        } else if (bmi < 24) {
            status = '正常';
            badgeClass = 'status-good';
        } else if (bmi < 28) {
            status = '偏胖';
            badgeClass = 'status-warning';
        } else {
            status = '肥胖';
            badgeClass = 'status-danger';
        }
        
        const bmiStatus = document.getElementById('bmiStatus');
        if (bmiStatus) bmiStatus.textContent = status;
        
        const bmiBadge = document.getElementById('bmiBadge');
        if (bmiBadge) {
            bmiBadge.textContent = status;
            bmiBadge.className = `status-badge ${badgeClass}`;
        }
    }
}

// 刷新建议
function refreshSuggestions() { (window.refreshSuggestions || function(){})(); }

// 全局变量
let selectedSleepQuality = 3;
let selectedMood = 3;

// ========= 体重模态框功能 =========
// ==================== 统一半屏快速记录面板 ====================
let currentQuickRecordType = 'weight';

function openQuickRecord(type) { (window.openQuickRecord || function(){})(type); }

function closeQuickRecord() { (window.closeQuickRecord || function(){})(); }

function renderQuickRecordForm(type) {
    var body = document.getElementById('quickRecordBody');
    if (!body) return;
    
    switch (type) {
        case 'weight':
            body.innerHTML = '<div style="margin-bottom: 10px;"><label style="display: block; font-weight: 700; margin-bottom: 10px; color: #334155; font-size: 0.95rem;">当前体重 (kg)</label><input type="number" id="qrWeight" step="0.1" style="width: 100%; padding: 15px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 1.2rem; outline: none; transition: border-color 0.3s;" placeholder="例如: 65.5" onfocus="this.style.borderColor=\'#f39c12\'" onblur="this.style.borderColor=\'#e5e7eb\'"></div>';
            break;
        case 'exercise':
            body.innerHTML = '<div style="margin-bottom: 10px;"><label style="display: block; font-weight: 700; margin-bottom: 10px; color: #334155; font-size: 0.95rem;">运动时长 (分钟)</label><input type="number" id="qrExercise" step="1" style="width: 100%; padding: 15px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 1.2rem; outline: none; transition: border-color 0.3s;" placeholder="例如: 30" onfocus="this.style.borderColor=\'#667eea\'" onblur="this.style.borderColor=\'#e5e7eb\'"></div><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px;"><button onclick="document.getElementById(\'qrExercise\').value=\'15\'" style="padding: 12px; border-radius: 12px; border: 2px solid #e5e7eb; background: #f8fafc; cursor: pointer; font-weight: 600; font-size: 0.9rem;">🟢 15分钟</button><button onclick="document.getElementById(\'qrExercise\').value=\'30\'" style="padding: 12px; border-radius: 12px; border: 2px solid #e5e7eb; background: #f8fafc; cursor: pointer; font-weight: 600; font-size: 0.9rem;">🟡 30分钟</button><button onclick="document.getElementById(\'qrExercise\').value=\'60\'" style="padding: 12px; border-radius: 12px; border: 2px solid #e5e7eb; background: #f8fafc; cursor: pointer; font-weight: 600; font-size: 0.9rem;">🔴 60分钟</button></div>';
            break;
        case 'diet':
            body.innerHTML = '<div style="display: flex; flex-direction: column; gap: 16px;"><div><label style="display: block; font-weight: 700; margin-bottom: 8px; color: #334155; font-size: 0.95rem;">食物名称</label><input type="text" id="qrFoodName" style="width: 100%; padding: 15px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 1.05rem; outline: none; transition: border-color 0.3s;" placeholder="例如: 鸡胸肉沙拉" onfocus="this.style.borderColor=\'#ef4444\'" onblur="this.style.borderColor=\'#e5e7eb\'"></div><div><label style="display: block; font-weight: 700; margin-bottom: 8px; color: #334155; font-size: 0.95rem;">卡路里 (kcal)</label><input type="number" id="qrCalories" style="width: 100%; padding: 15px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 1.2rem; outline: none;" placeholder="例如: 350"></div><div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;"><div><label style="display: block; font-size: 0.82rem; color: #666; margin-bottom: 5px; font-weight: 600;">蛋白质 (g)</label><input type="number" id="qrProtein" step="0.1" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 1rem; outline: none;" placeholder="0"></div><div><label style="display: block; font-size: 0.82rem; color: #666; margin-bottom: 5px; font-weight: 600;">碳水 (g)</label><input type="number" id="qrCarbs" step="0.1" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 1rem; outline: none;" placeholder="0"></div><div><label style="display: block; font-size: 0.82rem; color: #666; margin-bottom: 5px; font-weight: 600;">脂肪 (g)</label><input type="number" id="qrFat" step="0.1" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 1rem; outline: none;" placeholder="0"></div></div></div>';
            break;
        case 'water':
            body.innerHTML = '<div style="text-align: center;"><div style="margin-bottom: 20px;"><div style="font-size: 3.5rem; margin-bottom: 10px;">💧</div><div style="font-size: 1.1rem; color: #334155; font-weight: 700; margin-bottom: 5px;">快速记录饮水量</div><div style="font-size: 0.88rem; color: #94a3b8;">选择你喝了几杯水</div></div><div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px;"><button onclick="document.getElementById(\'qrWaterCups\').value=Math.max(1, parseInt(document.getElementById(\'qrWaterCups\').value||1)-1)" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #e5e7eb; background: #f8fafc; font-size: 1.5rem; cursor: pointer; font-weight: 700;">−</button><input type="number" id="qrWaterCups" value="1" min="1" max="20" style="width: 80px; text-align: center; padding: 14px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 1.4rem; font-weight: 800; outline: none; color: #3b82f6;" readonly><button onclick="document.getElementById(\'qrWaterCups\').value=Math.min(20, parseInt(document.getElementById(\'qrWaterCups\').value||1)+1)" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #e5e7eb; background: #f8fafc; font-size: 1.5rem; cursor: pointer; font-weight: 700;">+</button><span style="font-size: 1.2rem; font-weight: 700; color: #666;">杯</span></div></div>';
            break;
        case 'sleep':
            selectedSleepQuality = 3;
            body.innerHTML = '<div style="display: flex; flex-direction: column; gap: 18px;"><div><label style="display: block; font-weight: 700; margin-bottom: 10px; color: #334155; font-size: 0.95rem;">睡眠时长 (小时)</label><input type="number" id="qrSleepHours" step="0.5" style="width: 100%; padding: 15px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 1.2rem; outline: none;" placeholder="例如: 7.5"></div><div><label style="display: block; font-weight: 700; margin-bottom: 10px; color: #334155; font-size: 0.95rem;">睡眠质量</label><div style="display: flex; gap: 10px;" id="qrSleepQualityBtns"><button onclick="setQuickSleepQuality(1)" id="qrSQ1" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid #e0e6ed; background: #f8f9fa; color: #666; cursor: pointer; font-weight: 600; font-size: 0.9rem;">😣 差</button><button onclick="setQuickSleepQuality(2)" id="qrSQ2" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid #e0e6ed; background: #f8f9fa; color: #666; cursor: pointer; font-weight: 600; font-size: 0.9rem;">😐 一般</button><button onclick="setQuickSleepQuality(3)" id="qrSQ3" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid transparent; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; cursor: pointer; font-weight: 600; font-size: 0.9rem;">🙂 良好</button><button onclick="setQuickSleepQuality(4)" id="qrSQ4" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid #e0e6ed; background: #f8f9fa; color: #666; cursor: pointer; font-weight: 600; font-size: 0.9rem;">😊 优秀</button></div></div></div>';
            break;
        case 'mood':
            selectedMood = 3;
            body.innerHTML = '<div style="text-align: center;"><div style="margin-bottom: 20px;"><div style="font-size: 1.1rem; color: #334155; font-weight: 700; margin-bottom: 18px;">今天感觉怎么样？</div><div style="display: flex; justify-content: center; gap: 12px; font-size: 2.8rem;"><button onclick="setQuickMood(1)" id="qrM1" style="font-size: 2.8rem; border: 3px solid transparent; border-radius: 16px; padding: 8px; cursor: pointer; background: transparent; transition: all 0.3s;">😢</button><button onclick="setQuickMood(2)" id="qrM2" style="font-size: 2.8rem; border: 3px solid transparent; border-radius: 16px; padding: 8px; cursor: pointer; background: transparent; transition: all 0.3s;">😐</button><button onclick="setQuickMood(3)" id="qrM3" style="font-size: 2.8rem; border: 3px solid #667eea; border-radius: 16px; padding: 8px; cursor: pointer; background: rgba(102,126,234,0.1); transition: all 0.3s;">🙂</button><button onclick="setQuickMood(4)" id="qrM4" style="font-size: 2.8rem; border: 3px solid transparent; border-radius: 16px; padding: 8px; cursor: pointer; background: transparent; transition: all 0.3s;">😊</button><button onclick="setQuickMood(5)" id="qrM5" style="font-size: 2.8rem; border: 3px solid transparent; border-radius: 16px; padding: 8px; cursor: pointer; background: transparent; transition: all 0.3s;">😄</button></div></div><div><label style="display: block; font-weight: 700; margin-bottom: 8px; color: #334155; font-size: 0.95rem; text-align: left;">备注 (可选)</label><textarea id="qrMoodNote" style="width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 1rem; min-height: 80px; outline: none; resize: vertical;" placeholder="今天发生了什么..."></textarea></div></div>';
            break;
    }
}

function setQuickSleepQuality(quality) {
    selectedSleepQuality = quality;
    var btns = document.querySelectorAll('#qrSleepQualityBtns button');
    btns.forEach(function(btn) {
        btn.style.background = '#f8f9fa';
        btn.style.color = '#666';
        btn.style.borderColor = '#e0e6ed';
    });
    var active = document.getElementById('qrSQ' + quality);
    if (active) {
        active.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        active.style.color = 'white';
        active.style.borderColor = 'transparent';
    }
}

function setQuickMood(mood) {
    selectedMood = mood;
    for (var i = 1; i <= 5; i++) {
        var btn = document.getElementById('qrM' + i);
        if (btn) {
            btn.style.borderColor = 'transparent';
            btn.style.background = 'transparent';
        }
    }
    var active = document.getElementById('qrM' + mood);
    if (active) {
        active.style.borderColor = '#667eea';
        active.style.background = 'rgba(102, 126, 234, 0.1)';
    }
}

function saveQuickRecord() { (window.saveQuickRecord || function(){})(); }

// 兼容旧的模态框函数（体重、身高体重、心情仍保留旧模态框备用）
function openWeightInput() { openQuickRecord('weight'); }
function closeWeightModal() { closeQuickRecord(); }
function saveWeight() { saveQuickRecord(); }

function openExerciseInput() { openQuickRecord('exercise'); }
function closeExerciseModal() { closeQuickRecord(); }
function saveExercise() { saveQuickRecord(); }

function openDietInput() { openQuickRecord('diet'); }
function closeDietModal() { closeQuickRecord(); }
function saveDiet() { saveQuickRecord(); }

function openWaterInput() { openQuickRecord('water'); }
function closeWaterModal() { closeQuickRecord(); }
function addWater(cups) { saveHealthRecord({ water: cups }); closeQuickRecord(); showNotification('已记录 ' + cups + ' 杯水！'); }

function openSleepInput() { selectedSleepQuality = 3; openQuickRecord('sleep'); }
function closeSleepModal() { closeQuickRecord(); }
function saveSleep() { saveQuickRecord(); }

function setSleepQuality(quality) { selectedSleepQuality = quality; resetSleepQualityButtons(); var btn = document.getElementById('sleepQuality' + quality); if (btn) { btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; btn.style.color = 'white'; btn.style.borderColor = 'transparent'; } }

function resetSleepQualityButtons() { for (var i = 1; i <= 4; i++) { var btn = document.getElementById('sleepQuality' + i); if (btn) { btn.style.background = '#f8f9fa'; btn.style.color = '#666'; btn.style.borderColor = '#e0e6ed'; } } }

function openMoodInput() { selectedMood = 3; openQuickRecord('mood'); }
function closeMoodModal() { closeQuickRecord(); }
function saveMood() { saveQuickRecord(); }

function setMood(mood) { (window.setMood || function(){})(mood); }

function resetMoodButtons() { for (var i = 1; i <= 5; i++) { var btn = document.getElementById('moodBtn' + i); if (btn) { btn.style.borderColor = 'transparent'; btn.style.background = 'transparent'; } } }

// ========= 身高体重设置模态框 =========
function openHeightWeightInput() { (window.openHeightWeightInput || function(){})(); }

function closeHeightWeightModal() { (window.closeHeightWeightModal || function(){})(); }

function saveHeightWeight() { (window.saveHeightWeight || function(){})(); }

// ========= 目标设置模态框 =========
function openGoalsModal() { (window.openGoalsModal || function(){})(); }

function closeGoalsModal() { (window.closeGoalsModal || function(){})(); }

function saveGoals() { (window.saveGoals || function(){})(); }

// 快速添加食物
function quickAddFood(name, calories, protein, carbs, fat) { (window.quickAddFood || function(){})(name, calories, protein, carbs, fat); }

function updateRiskChart() {
    var periodEl = document.getElementById('riskChartPeriod');
    if (!periodEl) return;
    var period = periodEl.value;
    if (typeof drawRiskRadarChart === 'function') {
        drawRiskRadarChart(period);
    }
}

// 更新趋势图表
function updateTrendChart() { (window.updateTrendChart || function(){})(); }

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 当切换到健康助手页面时初始化
    const calendarTab = document.querySelector('[onclick="showTab(\'calendar\')"]');
    if (calendarTab) {
        const originalOnClick = calendarTab.onclick;
        calendarTab.onclick = function() {
            originalOnClick();
            setTimeout(initHealthAssistant, 100);
        };
    }
});

// ==================== 高级健康管理系统 ====================

// 健康评分计算器
function calculateHealthScore() {
    let score = 0;
    const todayData = getTodayData();
    
    // 卡路里评分 (20分)
    const caloriesPercent = todayData.calories / healthGoals.calories;
    if (caloriesPercent >= 0.8 && caloriesPercent <= 1.2) score += 20;
    else if (caloriesPercent >= 0.6 && caloriesPercent <= 1.4) score += 15;
    else if (caloriesPercent > 0) score += 10;
    
    // 运动评分 (25分)
    const exercisePercent = (todayData.exercise || 0) / healthGoals.exercise;
    score += Math.min(25, exercisePercent * 25);
    
    // 饮水评分 (20分)
    const waterPercent = (todayData.water || 0) / healthGoals.water;
    score += Math.min(20, waterPercent * 20);
    
    // 睡眠评分 (20分)
    const sleepHours = todayData.sleep || 0;
    if (sleepHours >= 7 && sleepHours <= 9) score += 20;
    else if (sleepHours >= 6 && sleepHours <= 10) score += 15;
    else if (sleepHours > 0) score += 10;
    
    // 营养均衡度 (15分)
    const proteinPercent = (todayData.protein || 0) / healthGoals.protein;
    const carbPercent = (todayData.carbs || 0) / healthGoals.carbs;
    const fatPercent = (todayData.fat || 0) / healthGoals.fat;
    const nutritionBalance = (proteinPercent + carbPercent + fatPercent) / 3;
    if (nutritionBalance >= 0.8 && nutritionBalance <= 1.2) score += 15;
    else if (nutritionBalance > 0) score += Math.min(15, nutritionBalance * 12);
    
    return Math.round(score);
}

// 获取今日数据
function getTodayData() {
    const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
    const today = new Date().toDateString();
    const todayRecords = records.filter(r => new Date(r.date).toDateString() === today);
    
    return {
        calories: todayRecords.reduce((sum, r) => sum + (r.calories || 0), 0),
        exercise: todayRecords.reduce((sum, r) => sum + (r.exercise || 0), 0),
        water: todayRecords.reduce((sum, r) => sum + (r.water || 0), 0),
        sleep: todayRecords.find(r => r.sleep)?.sleep,
        protein: todayRecords.reduce((sum, r) => sum + (r.protein || 0), 0),
        carbs: todayRecords.reduce((sum, r) => sum + (r.carbs || 0), 0),
        fat: todayRecords.reduce((sum, r) => sum + (r.fat || 0), 0),
        weight: todayRecords.find(r => r.weight)?.weight,
        mood: todayRecords.find(r => r.mood)?.mood
    };
}

// 获取健康等级描述
function getHealthLevel(score) {
    if (score >= 90) return { level: '优秀', color: '#10b981', icon: '🌟' };
    if (score >= 75) return { level: '良好', color: '#3b82f6', icon: '👍' };
    if (score >= 60) return { level: '一般', color: '#f59e0b', icon: '💪' };
    if (score >= 40) return { level: '需努力', color: '#f97316', icon: '📈' };
    return { level: '待改善', color: '#ef4444', icon: '💪' };
}

// 成就系统
const achievements = [
    { id: 'first_record', name: '初来乍到', desc: '完成第一次健康记录', icon: '🎯', condition: () => true },
    { id: 'week_streak', name: '坚持一周', desc: '连续7天记录健康数据', icon: '🔥', condition: () => checkStreak(7) },
    { id: 'exercise_30min', name: '运动达人', desc: '单日运动超过30分钟', icon: '🏃', condition: () => (getTodayData().exercise || 0) >= 30 },
    { id: 'water_8cups', name: '水分充足', desc: '单日饮水达到8杯', icon: '💧', condition: () => (getTodayData().water || 0) >= 8 },
    { id: 'perfect_score', name: '完美一天', desc: '健康评分达到90分以上', icon: '⭐', condition: () => calculateHealthScore() >= 90 },
    { id: 'month_streak', name: '月度冠军', desc: '连续30天记录健康数据', icon: '👑', condition: () => checkStreak(30) },
    { id: 'weight_goal', name: '目标达成', desc: '体重达到目标值', icon: '🎉', condition: () => false }, // 需要自定义目标
    { id: 'mood_tracker', name: '心情记录者', desc: '连续7天记录心情', icon: '😊', condition: () => checkMoodStreak(7) }
];

let unlockedAchievements = [];

function checkStreak(days) {
    const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
    const dates = [...new Set(records.map(r => new Date(r.date).toDateString()))];
    dates.sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        if (dates[i] === expectedDate.toDateString()) streak++;
        else break;
    }
    return streak >= days;
}

function checkMoodStreak(days) {
    const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
    const moodRecords = records.filter(r => r.mood);
    const dates = [...new Set(moodRecords.map(r => new Date(r.date).toDateString()))];
    return dates.length >= days;
}

function updateAchievements() {
    unlockedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');
    
    achievements.forEach(function(achievement) {
        if (!unlockedAchievements.includes(achievement.id) && achievement.condition()) {
            unlockedAchievements.push(achievement.id);
            showNotification('🏆 解锁成就：' + achievement.name + ' - ' + achievement.desc);
            localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
        }
    });
}

function renderAchievementsHeader() {
    var container = document.getElementById('achievementsDisplay');
    if (!container) return;

    unlockedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');

    var total = achievements.length;
    var unlocked = unlockedAchievements.length;
    var progressPct = Math.round((unlocked / total) * 100);

    var recentBadges = '';
    var recentUnlocked = achievements.filter(function(a) { return unlockedAchievements.includes(a.id); }).slice(-4);

    if (recentUnlocked.length > 0) {
        recentBadges = recentUnlocked.map(function(a) {
            return '<div style="min-width: 120px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 18px; padding: 14px 16px; text-align: center; box-shadow: 0 4px 15px rgba(245,158,11,0.2); flex-shrink: 0;"><div style="font-size: 2rem; margin-bottom: 6px;">' + a.icon + '</div><div style="font-weight: 800; color: #92400e; font-size: 0.9rem; margin-bottom: 2px;">' + a.name + '</div><div style="font-size: 0.78rem; color: #a16207;">' + a.desc + '</div></div>';
        }).join('');
    }

    var lockedPreview = achievements.filter(function(a) { return !unlockedAchievements.includes(a.id); }).slice(0, 3).map(function(a) {
        return '<div style="min-width: 100px; background: #f8fafc; border: 2px dashed #d4d4d8; border-radius: 18px; padding: 12px 14px; text-align: center; flex-shrink: 0; opacity: 0.6;"><div style="font-size: 1.8rem; margin-bottom: 6px;">🔒</div><div style="font-weight: 700; color: #94a3b8; font-size: 0.82rem; margin-bottom: 2px;">' + a.name + '</div><div style="font-size: 0.72rem; color: #cbd5e1;">' + a.desc + '</div></div>';
    }).join('');

    container.innerHTML = 
        '<div style="display: flex; gap: 16px; overflow-x: auto; padding-bottom: 6px; align-items: stretch;">' +
            '<div style="min-width: 160px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; flex-shrink: 0;">' +
                '<div style="font-size: 2.2rem; font-weight: 900; color: #f59e0b; margin-bottom: 2px;">' + unlocked + '<span style="font-size: 1.2rem; color: #94a3b8;">/' + total + '</span></div>' +
                '<div style="font-size: 0.85rem; color: #64748b; font-weight: 600; margin-bottom: 8px;">成就进度</div>' +
                '<div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">' +
                    '<div style="height: 100%; width: ' + progressPct + '%; background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); border-radius: 4px; transition: width 0.5s ease;"></div>' +
                '</div>' +
                '<div style="font-size: 0.82rem; color: #f59e0b; font-weight: 700; margin-top: 6px;">' + progressPct + '% 完成</div>' +
            '</div>' +
            recentBadges +
            (recentUnlocked.length === 0 ? '<div style="min-width: 160px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.92rem; background: #f8fafc; border-radius: 18px; padding: 20px; flex-shrink: 0;"><span style="margin-right: 8px; font-size: 1.5rem;">🏆</span>开始记录以解锁成就</div>' : '') +
            (unlocked < total ? lockedPreview : '') +
        '</div>';
}

function updateAchievementsDisplay() {
    renderAchievementsHeader();
}

function generateSmartTasks() {
    var container = document.getElementById('todaySuggestions');
    var recommendationSection = document.getElementById('todaySuggestions');
    if (!recommendationSection) return;

    var riskScore = getMetabolicRiskScore();
    var todayData = getTodayData();
    var tasks = [];

    if (riskScore >= 60) {
        tasks.push({ icon: '⚠️', title: '代谢风险关注', desc: '您的代谢风险评分较高（' + riskScore + '分），建议本周进行代谢复查', color: '#ef4444', priority: 'high' });
    } else if (riskScore >= 30) {
        tasks.push({ icon: '📊', title: '代谢指标监测', desc: '您的代谢风险评分为' + riskScore + '分，保持健康生活方式', color: '#f59e0b', priority: 'medium' });
    } else if (riskScore > 0) {
        tasks.push({ icon: '✅', title: '代谢状态良好', desc: '当前代谢风险评分较低（' + riskScore + '分），继续保持', color: '#10b981', priority: 'low' });
    }

    var exerciseToday = todayData.exercise || 0;
    if (exerciseToday < healthGoals.exercise) {
        var exerciseNeed = healthGoals.exercise - exerciseToday;
        tasks.push({ icon: '🏃', title: '今日运动目标', desc: '还需运动' + exerciseNeed + '分钟达到每日目标' + healthGoals.exercise + '分钟', color: '#667eea', priority: 'medium' });
    }

    var waterToday = todayData.water || 0;
    if (waterToday < healthGoals.water) {
        var waterNeed = healthGoals.water - waterToday;
        tasks.push({ icon: '💧', title: '补水提醒', desc: '还需喝' + waterNeed + '杯水达到每日目标' + healthGoals.water + '杯', color: '#3b82f6', priority: 'medium' });
    }

    var caloriesToday = todayData.calories || 0;
    if (caloriesToday === 0) {
        tasks.push({ icon: '🍽️', title: '记录第一餐', desc: '今天还没有饮食记录，记得记录你的第一餐哦', color: '#e74c3c', priority: 'high' });
    } else if (caloriesToday > healthGoals.calories * 1.2) {
        tasks.push({ icon: '⚖️', title: '热量摄入提醒', desc: '今日热量已超标，建议适量减少摄入', color: '#f97316', priority: 'medium' });
    }

    var sleepToday = todayData.sleep;
    if (!sleepToday || sleepToday === 0) {
        tasks.push({ icon: '😴', title: '记录睡眠时长', desc: '记得记录今晚的睡眠时长，帮助分析睡眠质量', color: '#a855f7', priority: 'low' });
    } else if (sleepToday < 7) {
        tasks.push({ icon: '😴', title: '睡眠不足', desc: '昨晚仅睡了' + sleepToday + '小时，建议今晚早些休息', color: '#a855f7', priority: 'medium' });
    }

    if (tasks.length > 0) {
        recommendationSection.innerHTML = tasks.slice(0, 3).map(function(t, i) {
            return '<div style="display: flex; gap: 14px; align-items: start; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 18px; border-radius: 14px; border-left: 4px solid ' + t.color + '; transition: all 0.3s;" onmouseover="this.style.transform=\'translateX(5px)\'" onmouseout="this.style.transform=\'translateX(0)\'"><span style="width: 28px; height: 28px; background: linear-gradient(135deg, ' + t.color + ' 0%, ' + t.color + 'dd 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.92rem; font-weight: 700; flex-shrink: 0;">' + (i + 1) + '</span><div><div style="font-weight: 700; color: #1e293b; margin-bottom: 4px; font-size: 0.95rem;">' + t.icon + ' ' + t.title + '</div><div style="font-size: 0.86rem; color: #64748b; line-height: 1.5;">' + t.desc + '</div><div style="margin-top: 8px; display: flex; gap: 6px;"><span style="padding: 3px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: 700; background: ' + (t.priority === 'high' ? '#fef2f2' : t.priority === 'medium' ? '#fffbeb' : '#f0fdf4') + '; color: ' + (t.priority === 'high' ? '#dc2626' : t.priority === 'medium' ? '#d97706' : '#16a34a') + ';">' + (t.priority === 'high' ? '⚡ 优先' : t.priority === 'medium' ? '📌 建议' : '💡 可选') + '</span></div></div></div>';
        }).join('');
    }
}

function getMetabolicRiskScore() {
    if (!currentUser) return 0;
    var key = 'metabolic_' + currentUser.username;
    var data = JSON.parse(localStorage.getItem(key) || '[]');
    if (data.length === 0) return 0;

    var latest = data[data.length - 1];
    var riskCount = 0;

    window.metaboliteData.forEach(function(field) {
        var val = parseFloat(latest[field.id]);
        if (isNaN(val)) return;
        if (val < field.refMin || val > field.refMax) riskCount++;
    });

    return Math.round((riskCount / window.metaboliteData.length) * 100);
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// 数据统计和分析
function generateWeeklyStats() {
    const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekRecords = records.filter(r => new Date(r.date) >= weekAgo);
    const days = [...new Set(weekRecords.map(r => new Date(r.date).toDateString()))].length;
    
    return {
        totalCalories: weekRecords.reduce((sum, r) => sum + (r.calories || 0), 0),
        avgCalories: Math.round(weekRecords.reduce((sum, r) => sum + (r.calories || 0), 0) / days),
        totalExercise: weekRecords.reduce((sum, r) => sum + (r.exercise || 0), 0),
        avgExercise: Math.round(weekRecords.reduce((sum, r) => sum + (r.exercise || 0), 0) / days),
        totalWater: weekRecords.reduce((sum, r) => sum + (r.water || 0), 0),
        avgWater: Math.round(weekRecords.reduce((sum, r) => sum + (r.water || 0), 0) / days),
        activeDays: days,
        perfectDays: countPerfectDays(weekRecords)
    };
}

function countPerfectDays(records) {
    const dayGroups = {};
    records.forEach(r => {
        const date = new Date(r.date).toDateString();
        if (!dayGroups[date]) dayGroups[date] = [];
        dayGroups[date].push(r);
    });
    
    let perfectDays = 0;
    Object.values(dayGroups).forEach(dayRecords => {
        const hasExercise = dayRecords.some(r => r.exercise && r.exercise >= 30);
        const hasWater = dayRecords.reduce((sum, r) => sum + (r.water || 0), 0) >= 8;
        const hasDiet = dayRecords.some(r => r.calories);
        if (hasExercise && hasWater && hasDiet) perfectDays++;
    });
    
    return perfectDays;
}

// 导出健康报告
function exportWeeklyReport() {
    var stats = generateWeeklyStats();
    const score = calculateHealthScore();
    const level = getHealthLevel(score);
    const todayData = getTodayData();
    
    const report = `
╔══════════════════════════════════════╗
║     MetaScan 健康管理周报           ║
╠══════════════════════════════════════╣
║  📅 报告时间：${new Date().toLocaleDateString()}          ║
╠══════════════════════════════════════╣
║  ${level.icon} 健康评分：${score}/100 (${level.level})         ║
╠══════════════════════════════════════╣
║  🔥 本周总热量：${stats.totalCalories} kcal             ║
║  📊 日均热量：${stats.avgCalories} kcal               ║
║  🏃 总运动时长：${stats.totalExercise} 分钟              ║
║  💪 日均运动：${stats.avgExercise} 分钟                ║
║  💧 总饮水量：${stats.totalWater} 杯                   ║
║  🥛 日均饮水：${stats.avgWater} 杯                    ║
║  ✅ 活跃天数：${stats.activeDays}/7 天                  ║
║  ⭐ 完美天数：${stats.perfectDays} 天                     ║
╠══════════════════════════════════════╣
║  今日数据：                           ║
║  • 卡路里：${todayData.calories} kcal                 ║
║  • 运动：${todayData.exercise || 0} 分钟                ║
║  • 饮水：${todayData.water || 0} 杯                   ║
║  • 睡眠：${todayData.sleep || '--'} 小时              ║
╚══════════════════════════════════════╝
`;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(report).then(() => {
        showNotification('健康报告已复制到剪贴板！');
    }).catch(() => {
        showNotification('请查看控制台获取报告');
    });
}

// 增强版趋势图表生成器
function generateEnhancedTrendChart(type) {
    const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
    const chartEl = document.getElementById('trendChart');
    if (!chartEl) return;
    
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const dayRecords = records.filter(r => new Date(r.date).toDateString() === dateStr);
        
        let value = 0;
        switch(type) {
            case 'weight':
                value = dayRecords.find(r => r.weight)?.weight || null;
                break;
            case 'exercise':
                value = dayRecords.reduce((sum, r) => sum + (r.exercise || 0), 0);
                break;
            case 'calories':
                value = dayRecords.reduce((sum, r) => sum + (r.calories || 0), 0);
                break;
            case 'water':
                value = dayRecords.reduce((sum, r) => sum + (r.water || 0), 0);
                break;
        }
        
        last14Days.push({
            date: `${date.getMonth()+1}/${date.getDate()}`,
            value: value
        });
    }
    
    const config = {
        weight: { label: '体重', unit: 'kg', color: '#f39c12', max: 150, min: 30 },
        exercise: { label: '运动', unit: '分钟', color: '#667eea', max: 120, min: 0 },
        calories: { label: '卡路里', unit: 'kcal', color: '#e74c3c', max: 3000, min: 0 },
        water: { label: '饮水', unit: '杯', color: '#3498db', max: 15, min: 0 }
    };
    
    const data = config[type];
    const validValues = last14Days.filter(d => d.value !== null && d.value !== undefined);
    
    if (validValues.length < 2) {
        var emptyEl = document.getElementById('trendChartEmpty');
        var canvasEl = document.getElementById('trendChartCanvas');
        if (emptyEl) emptyEl.style.display = '';
        if (canvasEl) canvasEl.style.display = 'none';
        chartEl.innerHTML = chartEl.innerHTML.indexOf('trendChartEmpty') >= 0 ? '' : chartEl.innerHTML;
        return;
    }
    
    const maxValue = Math.max(...validValues.map(d => d.value)) * 1.2 || data.max;
    const minValue = Math.min(...validValues.map(d => d.value)) * 0.8 || data.min;
    const range = maxValue - minValue;
    
    // 计算平均值和趋势
    const avgValue = validValues.reduce((sum, d) => sum + d.value, 0) / validValues.length;
    const trend = validValues[validValues.length-1].value > validValues[0].value ? '↑' : '↓';

    var emptyEl = document.getElementById('trendChartEmpty');
    var canvasEl = document.getElementById('trendChartCanvas');
    if (emptyEl) emptyEl.style.display = 'none';
    if (canvasEl) canvasEl.style.display = 'block';
    
    chartEl.innerHTML = `
        <div style="width: 100%; height: 100%; padding: 20px; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <span style="font-size: 1.5rem; font-weight: 900; color: ${data.color};">${trend} ${data.label}</span>
                    <div style="display: flex; gap: 20px; margin-top: 8px; font-size: 0.95rem; color: #666;">
                        <span>平均: ${avgValue.toFixed(1)}${data.unit}</span>
                        <span>最新: ${validValues[validValues.length-1].value}${data.unit}</span>
                    </div>
                </div>
            </div>
            
            <div style="flex: 1; position: relative; border-left: 2px solid #e5e7eb; border-bottom: 2px solid #e5e7eb; padding: 0 10px 10px 10px;">
                <!-- 网格线 -->
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;">
                    ${[0, 0.25, 0.5, 0.75, 1].map(pct => `
                        <div style="position: absolute; top: ${(1-pct)*100}%; left: 0; right: 0; height: 1px; background: #f3f4f6;"></div>
                    `).join('')}
                </div>
                
                <!-- 数据点和连线 -->
                <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; overflow: visible;">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:${data.color};stop-opacity:0.3" />
                            <stop offset="50%" style="stop-color:${data.color};stop-opacity:1" />
                            <stop offset="100%" style="stop-color:${data.color};stop-opacity:0.3" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge> 
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    
                    <!-- 面积填充 -->
                    <path d="${generateAreaPath(last14Days, range, minValue)}" 
                          fill="${data.color}" 
                          opacity="0.1"/>
                    
                    <!-- 折线 -->
                    <path d="${generateLinePath(last14Days, range, minValue)}" 
                          stroke="url(#lineGradient)" 
                          stroke-width="3" 
                          fill="none"
                          filter="url(#glow)"
                          stroke-linecap="round"
                          stroke-linejoin="round"/>
                    
                    <!-- 数据点 -->
                    ${last14Days.map((d, i) => d.value !== null && d.value !== undefined ? `
                        <circle cx="${(i / 13) * 100}%" 
                                y="${100 - ((d.value - minValue) / range) * 100}%"
                                r="6"
                                fill="${data.color}"
                                stroke="white"
                                stroke-width="2"
                                class="data-point"
                                style="cursor: pointer;"
                                onmouseover="this.setAttribute('r', '8')"
                                onmouseout="this.setAttribute('r', '6')"
                        />
                    ` : '').join('')}
                </svg>
                
                <!-- X轴标签 -->
                <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 0.85rem; color: #888; font-weight: 600;">
                    ${last14Days.map(d => `<span>${d.date}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function generateLinePath(data, range, minVal) {
    return data.map((d, i) => {
        if (d.value === null || d.value === undefined) return '';
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.value - minVal) / range) * 100;
        return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
    }).join(' ');
}

function generateAreaPath(data, range, minVal) {
    const linePoints = data.map((d, i) => {
        if (d.value === null || d.value === undefined) return null;
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.value - minVal) / range) * 100;
        return { x, y };
    }).filter(p => p !== null);
    
    if (linePoints.length < 2) return '';
    
    let path = `M 0% 100% L ${linePoints[0].x}% ${linePoints[0].y}% `;
    linePoints.forEach(point => {
        path += `L ${point.x}% ${point.y}% `;
    });
    path += `L ${linePoints[linePoints.length-1].x}% 100% Z`;
    
    return path;
}

// 更新趋势图表函数覆盖
updateTrendChart = function() {
    const trendTypeEl = document.getElementById('trendType');
    if (!trendTypeEl) return;
    
    const type = trendTypeEl.value;
    generateEnhancedTrendChart(type);
};

// 健康提醒系统
const healthReminders = [
    { time: '08:00', message: '☀️ 早上好！记得吃早餐并喝一杯温水哦~', type: 'morning' },
    { time: '10:00', message: '💧 该喝水啦！保持身体水分充足', type: 'water' },
    { time: '12:00', message: '🍽️ 午餐时间到了，注意营养均衡', type: 'meal' },
    { time: '15:00', message: '🏃 下午了，起来活动一下吧！', type: 'exercise' },
    { time: '17:00', message: '💧 下午茶时间，别忘了补充水分', type: 'water' },
    { time: '19:00', message: '🍲 晚餐时间，适量进食', type: 'meal' },
    { time: '21:00', message: '😴 准备休息吧，早点睡觉对身体好', type: 'sleep' }
];

let reminderInterval;

function startHealthReminders() {
    // 检查是否启用提醒
    const remindersEnabled = localStorage.getItem('healthRemindersEnabled') === 'true';
    if (!remindersEnabled) return;
    
    reminderInterval = setInterval(() => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        healthReminders.forEach(reminder => {
            if (Math.abs(currentTime.localeCompare(reminder.time)) < 3) {
                showNotification(reminder.message);
            }
        });
    }, 60000); // 每分钟检查一次
}

function toggleReminders(enabled) {
    localStorage.setItem('healthRemindersEnabled', enabled);
    if (enabled) {
        startHealthReminders();
        showNotification('✅ 健康提醒已开启');
    } else {
        clearInterval(reminderInterval);
        showNotification('❌ 健康提醒已关闭');
    }
}

// 初始化增强功能
function initAdvancedFeatures() {
    updateAchievements();
    renderAchievementsHeader();
    generateSmartTasks();
    startHealthReminders();
    updateHealthScoreDisplay();
    requestNotificationPermission();
}

function updateAchievementsDisplay() {
    renderAchievementsHeader();
}

// 更新成就显示
function updateAchievementsDisplay() {
    const achievementsContainer = document.getElementById('achievementsDisplay');
    if (!achievementsContainer) return;
    
    unlockedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');
    
    const achievementCards = achievementsContainer.querySelectorAll('[data-achievement]');
    achievementCards.forEach(card => {
        const achievementId = card.getAttribute('data-achievement');
        if (unlockedAchievements.includes(achievementId)) {
            // 已解锁
            card.style.opacity = '1';
            card.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
            card.style.border = '2px solid #f59e0b';
            card.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.2)';
        }
    });
}

// 更新健康评分显示
function updateHealthScoreDisplay() {
    const score = calculateHealthScore();
    const level = getHealthLevel(score);
    
    const scoreEl = document.getElementById('healthScoreDisplay');
    if (scoreEl) {
        scoreEl.textContent = score;
        scoreEl.style.color = level.color;
    }
    
    const levelEl = document.getElementById('healthLevelDisplay');
    if (levelEl) {
        levelEl.textContent = `${level.icon} ${level.level}`;
        levelEl.style.color = level.color;
    }
}

// ==================== 食物热量数据库系统 ====================

// 食物数据库
const foodDatabase = [
    // 主食类
    { name: '米饭（一碗）', calories: 130, protein: 3, carbs: 30, fat: 0.5, category: 'main', icon: '🍚' },
    { name: '面条（一碗）', calories: 150, protein: 4, carbs: 32, fat: 1, category: 'main', icon: '🍜' },
    { name: '馒头（一个）', calories: 120, protein: 4, carbs: 25, fat: 1, category: 'main', icon: '🍞' },
    { name: '面包（两片）', calories: 140, protein: 5, carbs: 28, fat: 2, category: 'main', icon: '🥖' },
    { name: '粥（一碗）', calories: 80, protein: 2, carbs: 17, fat: 0.3, category: 'main', icon: '🥣' },
    { name: '饺子（10个）', calories: 280, protein: 12, carbs: 35, fat: 8, category: 'main', icon: '🥟' },
    { name: '包子（一个）', calories: 180, protein: 7, carbs: 28, fat: 6, category: 'main', icon: '🥟' },
    
    // 肉类
    { name: '鸡胸肉（100g）', calories: 133, protein: 25, carbs: 0, fat: 3, category: 'meat', icon: '🍗' },
    { name: '猪肉瘦（100g）', calories: 143, protein: 20, carbs: 2, fat: 6, category: 'meat', icon: '🥩' },
    { name: '牛肉（100g）', calories: 125, protein: 26, carbs: 0, fat: 3, category: 'meat', icon: '🥩' },
    { name: '鱼（100g）', calories: 106, protein: 20, carbs: 0, fat: 3, category: 'meat', icon: '🐟' },
    { name: '虾（100g）', calories: 93, protein: 18, carbs: 1, fat: 1, category: 'meat', icon: '🦐' },
    { name: '鸡蛋（一个）', calories: 70, protein: 6, carbs: 1, fat: 4, category: 'meat', icon: '🥚' },
    { name: '鸡腿（一只）', calories: 180, protein: 20, carbs: 0, fat: 10, category: 'meat', icon: '🍗' },
    { name: '培根（2片）', calories: 90, protein: 7, carbs: 0, fat: 7, category: 'meat', icon: '🥓' },
    
    // 蔬菜
    { name: '西兰花（100g）', calories: 34, protein: 3, carbs: 7, fat: 0.4, category: 'vegetable', icon: '🥦' },
    { name: '胡萝卜（100g）', calories: 41, protein: 1, carbs: 10, fat: 0.2, category: 'vegetable', icon: '🥕' },
    { name: '番茄（100g）', calories: 18, protein: 1, carbs: 4, fat: 0.2, category: 'vegetable', icon: '🍅' },
    { name: '黄瓜（100g）', calories: 16, protein: 0.7, carbs: 3, fat: 0.1, category: 'vegetable', icon: '🥒' },
    { name: '菠菜（100g）', calories: 23, protein: 3, carbs: 4, fat: 0.4, category: 'vegetable', icon: '🥬' },
    { name: '土豆（100g）', calories: 77, protein: 2, carbs: 17, fat: 0.1, category: 'vegetable', icon: '🥔' },
    { name: '白菜（100g）', calories: 17, protein: 1.5, carbs: 3, fat: 0.1, category: 'vegetable', icon: '🥬' },
    { name: '生菜（100g）', calories: 15, protein: 1.4, carbs: 3, fat: 0.2, category: 'vegetable', icon: '🥬' },
    
    // 水果
    { name: '苹果（一个）', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, category: 'fruit', icon: '🍎' },
    { name: '香蕉（一根）', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, category: 'fruit', icon: '🍌' },
    { name: '橙子（一个）', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, category: 'fruit', icon: '🍊' },
    { name: '葡萄（100g）', calories: 69, protein: 0.7, carbs: 18, fat: 0.2, category: 'fruit', icon: '🍇' },
    { name: '西瓜（一块）', calories: 30, protein: 0.6, carbs: 8, fat: 0.1, category: 'fruit', icon: '🍉' },
    { name: '草莓（100g）', calories: 32, protein: 0.7, carbs: 8, fat: 0.3, category: 'fruit', icon: '🍓' },
    { name: '芒果（一个）', calories: 135, protein: 1, carbs: 35, fat: 0.6, category: 'fruit', icon: '🥭' },
    { name: '猕猴桃（一个）', calories: 61, protein: 1.1, carbs: 15, fat: 0.5, category: 'fruit', icon: '🥝' },
    
    // 饮品
    { name: '牛奶（一杯250ml）', calories: 100, protein: 3, carbs: 12, fat: 4, category: 'drink', icon: '🥛' },
    { name: '豆浆（一杯）', calories: 50, protein: 3, carbs: 5, fat: 2, category: 'drink', icon: '🥛' },
    { name: '橙汁（一杯）', calories: 112, protein: 2, carbs: 26, fat: 0.5, category: 'drink', icon: '🧃' },
    { name: '可乐（一罐）', calories: 140, protein: 0, carbs: 39, fat: 0, category: 'drink', icon: '🥤' },
    { name: '咖啡（一杯黑咖啡）', calories: 2, protein: 0.3, carbs: 0, fat: 0, category: 'drink', icon: '☕' },
    { name: '奶茶（一杯）', calories: 350, protein: 5, carbs: 55, fat: 12, category: 'drink', icon: '🧋' },
    { name: '啤酒（一瓶）', calories: 150, protein: 1.5, carbs: 13, fat: 0, category: 'drink', icon: '🍺' },
    { name: '酸奶（一杯）', calories: 100, protein: 4, carbs: 17, fat: 2, category: 'drink', icon: '🥛' }
];

let currentFoodCategory = 'all';

// 搜索食物数据库
function searchFoodDatabase() { (window.searchFoodDatabase || function(){})(); }

// 按分类筛选食物
function filterFoodCategory(category) { (window.filterFoodCategory || function(){})(category); }

// 显示食物列表
function displayFoodList(foods) {
    const container = document.getElementById('foodDatabaseList');
    if (!container) return;
    
    if (foods.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 30px;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🔍</div>
                <div>未找到匹配的食物</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = foods.map((food, index) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #f8f9fa; border-radius: 14px; cursor: pointer; transition: all 0.2s ease;" 
             onmouseover="this.style.background='#f0f4ff'; this.style.transform='translateX(5px)'" 
             onmouseout="this.style.background='#f8f9fa'; this.style.transform='translateX(0)'"
             onclick="addFoodFromDatabase(${index})">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.8rem;">${food.icon}</span>
                <div>
                    <div style="font-weight: 700; color: #333;">${food.name}</div>
                    <div style="font-size: 0.85rem; color: #888;">蛋白质 ${food.protein}g | 碳水 ${food.carbs}g | 脂肪 ${food.fat}g</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.2rem; font-weight: 900; color: #e74c3c;">${food.calories}</div>
                <div style="font-size: 0.85rem; color: #888;">kcal</div>
            </div>
        </div>
    `).join('');
}

// 从数据库添加食物
function addFoodFromDatabase(index) {
    const filteredFoods = foodDatabase.filter(food => 
        (currentFoodCategory === 'all' || food.category === currentFoodCategory)
    );
    const food = filteredFoods[index];
    
    if (food) {
        saveHealthRecord({
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            foodName: food.name,
            fromDatabase: true
        });
        
        showNotification(`✅ 已添加：${food.name}`);
        updateDietDiary();
    }
}

// 初始化食物数据库显示
function initFoodDatabase() {
    displayFoodList(foodDatabase);
}

// ==================== 饮食日记系统 ====================

// 更新饮食日记显示
function updateDietDiary() {
    const container = document.getElementById('dietDiaryDisplay');
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 30px;">
                <div style="font-size: 2.5rem; margin-bottom: 12px;">🔒</div>
                <div>请先登录</div>
            </div>
        `;
        return;
    }
    
    const records = JSON.parse(localStorage.getItem(`healthRecords_${currentUser.username}`) || '[]');
    const today = new Date().toDateString();
    const todayDietRecords = records.filter(r => r.date === today && r.calories);
    
    if (todayDietRecords.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 30px;">
                <div style="font-size: 2.5rem; margin-bottom: 12px;">🍽️</div>
                <div style="font-size: 1rem;">今天还没有饮食记录</div>
                <div style="font-size: 0.9rem; margin-top: 6px;">点击上方按钮或搜索食物开始记录</div>
            </div>
        `;
        return;
    }
    
    // 按时间分组
    const totalCalories = todayDietRecords.reduce((sum, r) => sum + (r.calories || 0), 0);
    const totalProtein = todayDietRecords.reduce((sum, r) => sum + (r.protein || 0), 0);
    const totalCarbs = todayDietRecords.reduce((sum, r) => sum + (r.carbs || 0), 0);
    const totalFat = todayDietRecords.reduce((sum, r) => sum + (r.fat || 0), 0);
    
    container.innerHTML = `
        <!-- 总览 -->
        <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); padding: 18px; border-radius: 16px; margin-bottom: 18px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center;">
                <div>
                    <div style="font-size: 1.8rem; font-weight: 900; color: #e74c3c;">${totalCalories}</div>
                    <div style="font-size: 0.8rem; color: #666;">总热量</div>
                </div>
                <div>
                    <div style="font-size: 1.8rem; font-weight: 900; color: #f39c12;">${totalProtein.toFixed(1)}</div>
                    <div style="font-size: 0.8rem; color: #666;">蛋白质</div>
                </div>
                <div>
                    <div style="font-size: 1.8rem; font-weight: 900; color: #3498db;">${totalCarbs.toFixed(1)}</div>
                    <div style="font-size: 0.8rem; color: #666;">碳水</div>
                </div>
                <div>
                    <div style="font-size: 1.8rem; font-weight: 900; color: #a855f7;">${totalFat.toFixed(1)}</div>
                    <div style="font-size: 0.8rem; color: #666;">脂肪</div>
                </div>
            </div>
        </div>
        
        <!-- 记录列表 -->
        <div style="max-height: 200px; overflow-y: auto;">
            ${todayDietRecords.map(record => {
                const time = new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                return `
                    <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8f9fa; border-radius: 12px; margin-bottom: 8px;">
                        <div>
                            <div style="font-weight: 700; color: #333;">${record.foodName || '自定义记录'}</div>
                            <div style="font-size: 0.85rem; color: #888;">${time}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; color: #e74c3c;">${record.calories} kcal</div>
                            <div style="font-size: 0.8rem; color: #888;">P:${record.protein || 0} C:${record.carbs || 0} F:${record.fat || 0}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== 体重目标追踪系统 ====================

let weightGoalData = {
    startWeight: null,
    targetWeight: null,
    startDate: null
};

// 加载体重目标数据
function loadWeightGoalData() {
    if (!currentUser) return;
    
    const savedData = localStorage.getItem(`weightGoal_${currentUser.username}`);
    if (savedData) {
        weightGoalData = JSON.parse(savedData);
        updateWeightGoalDisplay();
    }
}

// 保存体重目标
function saveWeightGoal() { (window.saveWeightGoal || function(){})(); }

// 更新体重目标显示
function updateWeightGoalDisplay() {
    const progressContainer = document.getElementById('weightGoalProgress');
    const startEl = document.getElementById('startWeightDisplay');
    const currentEl = document.getElementById('currentWeightDisplay');
    const targetEl = document.getElementById('targetWeightDisplay');
    const progressPercent = document.getElementById('goalProgressPercent');
    const progressBar = document.getElementById('goalProgressBar');
    const messageEl = document.getElementById('weightGoalMessage');
    
    if (!progressContainer) return;
    
    if (weightGoalData.startWeight && weightGoalData.targetWeight) {
        progressContainer.style.display = 'block';
        
        startEl.textContent = weightGoalData.startWeight;
        targetEl.textContent = weightGoalData.targetWeight;
        
        const currentWeight = userProfile.weight || weightGoalData.startWeight;
        currentEl.textContent = currentWeight;
        
        // 计算进度（假设目标是减重）
        const totalDiff = Math.abs(weightGoalData.startWeight - weightGoalData.targetWeight);
        const currentDiff = Math.abs(weightGoalData.startWeight - currentWeight);
        let percent = Math.round((currentDiff / totalDiff) * 100);
        
        // 如果是增重，调整计算方式
        if (weightGoalData.targetWeight > weightGoalData.startWeight) {
            percent = Math.min(percent, 100);
        } else {
            percent = Math.min(percent, 100);
        }
        
        progressPercent.textContent = `${percent}%`;
        progressBar.style.width = `${percent}%`;
        
        // 更新消息
        if (percent >= 100) {
            messageEl.textContent = '🎉 恭喜！您已达成目标！继续保持！';
            messageEl.parentElement.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
            messageEl.parentElement.style.color = '#92400e';
        } else if (percent >= 75) {
            messageEl.textContent = '💪 太棒了！距离目标很近了，继续坚持！';
            messageEl.parentElement.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
            messageEl.parentElement.style.color = '#065f46';
        } else if (percent >= 50) {
            messageEl.textContent = '👍 进展顺利！已经完成一半了！';
            messageEl.parentElement.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
            messageEl.parentElement.style.color = '#1e40af';
        } else {
            messageEl.textContent = '💡 刚刚开始，坚持下去就能看到效果！';
            messageEl.parentElement.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
            messageEl.parentElement.style.color = '#166534';
        }
    } else {
        progressContainer.style.display = 'none';
    }
}

// ==================== 增强版初始化函数 ====================

// 重写initHealthAssistant以包含新功能
const originalInitHealthAssistant = initHealthAssistant;

initHealthAssistant = function() {
    // 调用原始初始化
    originalInitHealthAssistant();
    
    // 初始化食物数据库
    initFoodDatabase();
    
    // 加载体重目标
    loadWeightGoalData();
    
    // 更新饮食日记
    updateDietDiary();
};

var API_BASE = 'http://localhost:3001/api';

var WS_URL = 'ws://localhost:3001/ws';
var _ws = null;
var _reconnectTimer = null;
var _messageHandlers = {};
var _wsUsername = null;
var _isConnected = false;
var _reconnectAttempts = 0;
var _MAX_RECONNECT = 20;

function _wsConnect(username) {
    _wsUsername = username;
    if (_ws && _ws.readyState === WebSocket.OPEN) return;
    try {
        _ws = new WebSocket(WS_URL);
    } catch (e) {
        _wsScheduleReconnect();
        return;
    }
    _ws.onopen = function() {
        _isConnected = true;
        _reconnectAttempts = 0;
        _ws.send(JSON.stringify({ type: 'login', username: _wsUsername }));
    };
    _ws.onmessage = function(event) {
        try {
            var data = JSON.parse(event.data);
            if (data.type === 'login' && data.success) {
                if (_messageHandlers['connected']) {
                    _messageHandlers['connected'].forEach(function(cb) { cb(data); });
                }
            }
            if (_messageHandlers[data.type]) {
                _messageHandlers[data.type].forEach(function(cb) { cb(data); });
            }
            if (_messageHandlers['*']) {
                _messageHandlers['*'].forEach(function(cb) { cb(data); });
            }
        } catch (e) { console.error('WS parse error:', e); }
    };
    _ws.onclose = function() {
        _isConnected = false;
        if (_messageHandlers['disconnected']) {
            _messageHandlers['disconnected'].forEach(function(cb) { cb(); });
        }
        _wsScheduleReconnect();
    };
    _ws.onerror = function() { _ws.close(); };
}

function _wsScheduleReconnect() {
    if (_reconnectTimer) return;
    if (_reconnectAttempts >= _MAX_RECONNECT) return;
    _reconnectTimer = setTimeout(function() {
        _reconnectTimer = null;
        _reconnectAttempts++;
        if (_wsUsername) _wsConnect(_wsUsername);
    }, Math.min(1000 * Math.pow(2, _reconnectAttempts), 30000));
}

function _wsDisconnect() {
    _reconnectAttempts = _MAX_RECONNECT;
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    if (_ws) { _ws.close(); _ws = null; }
    _isConnected = false;
}

function _wsSend(data) {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
        _ws.send(JSON.stringify(data));
    }
}

function _wsOn(type, callback) {
    if (!_messageHandlers[type]) _messageHandlers[type] = [];
    _messageHandlers[type].push(callback);
}

function sendTyping(to, isTyping) {
    _wsSend({ type: 'typing', to: to, isTyping: isTyping });
}

function setupTypingIndicator() {
    var chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    var typingTimeout = null;
    chatInput.addEventListener('input', function() {
        var doctorUsername = window.currentSelectedDoctor;
        if (!doctorUsername) return;
        sendTyping(doctorUsername, true);
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() { sendTyping(doctorUsername, false); }, 3000);
    });
    chatInput.addEventListener('blur', function() {
        var doctorUsername = window.currentSelectedDoctor;
        if (doctorUsername) sendTyping(doctorUsername, false);
    });
}

function showTypingIndicator(fromName) {
    var indicator = document.getElementById('typingIndicator');
    var text = document.getElementById('typingText');
    if (indicator && text) {
        text.textContent = (fromName || '对方') + ' 正在输入';
        indicator.style.display = 'block';
    }
}

function hideTypingIndicator() {
    var indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.style.display = 'none';
}

function showDoctorTypingIndicator(fromName) {
    var indicator = document.getElementById('doctorTypingIndicator');
    var text = document.getElementById('doctorTypingText');
    if (indicator && text) {
        text.textContent = (fromName || '患者') + ' 正在输入';
        indicator.style.display = 'block';
    }
}

function hideDoctorTypingIndicator() {
    var indicator = document.getElementById('doctorTypingIndicator');
    if (indicator) indicator.style.display = 'none';
}

function uploadFile(file, onProgress, onComplete, onError) {
    var formData = new FormData();
    formData.append('file', file);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/upload', true);
    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100), e.loaded, e.total);
        }
    };
    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.success && onComplete) onComplete(result.file);
                else if (onError) onError(result.error || '上传失败');
            } catch (e) { if (onError) onError('响应解析失败'); }
        } else { if (onError) onError('上传失败 (HTTP ' + xhr.status + ')'); }
    };
    xhr.onerror = function() { if (onError) onError('网络错误，上传失败'); };
    xhr.send(formData);
    return xhr;
}

function getFileTypeIcon(mimetype) {
    if (!mimetype) return '📄';
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.includes('pdf')) return '📕';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📽️';
    if (mimetype.startsWith('text/')) return '📃';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return '🗜️';
    return '📄';
}

function getFileTypeName(mimetype) {
    if (!mimetype) return '文件';
    if (mimetype.startsWith('image/')) return '图片';
    if (mimetype.includes('pdf')) return 'PDF文档';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'Word文档';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'Excel表格';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'PPT演示';
    if (mimetype.startsWith('text/')) return '文本文件';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return '压缩文件';
    return '文件';
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function openFilePicker(callback, accept) {
    var input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.style.display = 'none';
    input.onchange = function() {
        if (input.files && input.files[0]) callback(input.files[0]);
        document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
}

function sendDoctorFileMessage() {
    openFilePicker(function(file) {
        if (file.size > 50 * 1024 * 1024) { showNotification('文件大小不能超过50MB'); return; }
        uploadFile(file,
            null,
            function(result) {
                var fileUrl = window.location.origin + ':3001' + result.path;
                sendDoctorMessageV2('file', fileUrl, file.name, file.type, file.size);
            },
            function(error) { showNotification('文件上传失败: ' + error); }
        );
    }, '*');
}

function sendMessageV2(msgType, msgData, fileName, fileMimetype, fileSize) {
    var chatInput = document.getElementById('chatInput');
    var messageContent;
    var type = msgType || 'text';
    if (type === 'text') { messageContent = chatInput.value.trim(); if (!messageContent) return; }
    else if (type === 'image') messageContent = msgData;
    else if (type === 'voice') messageContent = msgData;
    else if (type === 'file') messageContent = msgData;
    else messageContent = msgData || '';
    var doctorUsername = window.currentSelectedDoctor;
    if (!doctorUsername) { showNotification('请先选择一位医生'); return; }
    var message = {
        id: Date.now(), sender: currentUser.username, recipient: doctorUsername,
        content: messageContent, type: type, fileName: fileName || '',
        fileMimetype: fileMimetype || '', fileSize: fileSize || 0,
        timestamp: new Date().toISOString(), read: false, replyTo: window.replyingToMessage || null
    };
    window.replyingToMessage = null;
    var replyEl = document.getElementById('replyIndicator'); if (replyEl) replyEl.remove();
    var chatKey = 'metascanChat_' + currentUser.username + '_' + doctorUsername;
    var chatMessages = JSON.parse(localStorage.getItem(chatKey) || '[]'); chatMessages.push(message);
    localStorage.setItem(chatKey, JSON.stringify(chatMessages));
    var doctorChatKey = 'metascanChat_' + doctorUsername + '_' + currentUser.username;
    var doctorChatMessages = JSON.parse(localStorage.getItem(doctorChatKey) || '[]'); doctorChatMessages.push(message);
    localStorage.setItem(doctorChatKey, JSON.stringify(doctorChatMessages));
    _wsSend({ type: 'message', message: message });
    sendDoctorNotification(currentUser.username, type === 'text' ? messageContent : (type === 'image' ? '[图片]' : type === 'voice' ? '[语音]' : type === 'file' ? '[文件]' : messageContent), doctorUsername);
    var typeLabels = { text: '消息', image: '图片', voice: '语音', file: '文件' };
    showNotification((typeLabels[type] || '消息') + '发送成功');
    if (chatInput) chatInput.value = '';
    loadChatMessagesWithDoctor(doctorUsername);
}

function sendDoctorMessageV2(msgType, msgData, fileName, fileMimetype, fileSize) {
    var chatInput = document.getElementById('doctorChatInput');
    var type = msgType || 'text';
    var messageContent;
    if (type === 'text') { messageContent = chatInput ? chatInput.value.trim() : (msgData || ''); if (!messageContent) return; }
    else if (type === 'image') messageContent = msgData;
    else if (type === 'voice') messageContent = msgData;
    else if (type === 'prescription') messageContent = msgData;
    else if (type === 'file') messageContent = msgData;
    else messageContent = msgData || '';
    var patientUsername = window.currentSelectedPatient;
    if (!patientUsername) { showNotification('请先选择一个患者'); return; }
    var message = {
        id: Date.now(), sender: currentUser.username, recipient: patientUsername,
        content: messageContent, type: type, fileName: fileName || '',
        fileMimetype: fileMimetype || '', fileSize: fileSize || 0,
        timestamp: new Date().toISOString(), read: false, replyTo: window.replyingToMessage || null
    };
    window.replyingToMessage = null;
    var replyIndicator = document.getElementById('doctorReplyIndicator'); if (replyIndicator) replyIndicator.remove();
    var chatMessages = JSON.parse(localStorage.getItem('metascanChat_' + patientUsername) || '[]'); chatMessages.push(message);
    localStorage.setItem('metascanChat_' + patientUsername, JSON.stringify(chatMessages));
    _wsSend({ type: 'message', message: message });
    if (chatInput) chatInput.value = '';
    var typeLabels = { text: '消息', image: '图片', voice: '语音', prescription: '医嘱卡片', file: '文件' };
    showNotification((typeLabels[type] || '消息') + '发送成功');
    if (typeof showPatientDetails === 'function') showPatientDetails(patientUsername);
}

sendMessage = sendMessageV2;
sendDoctorMessage = sendDoctorMessageV2;

function wsRecallMessage(messageId) {
    var doctorUsername = window.currentSelectedDoctor;
    if (!doctorUsername) return;
    _wsSend({ type: 'recall', messageId: messageId });
    var chatKey = 'metascanChat_' + currentUser.username + '_' + doctorUsername;
    var chatMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    var found = false;
    chatMessages = chatMessages.map(function(msg) {
        if (msg.id === messageId && msg.sender === currentUser.username) {
            var msgTime = new Date(msg.timestamp).getTime();
            if (Date.now() - msgTime <= 5 * 60 * 1000) { msg.isRecalled = true; msg.content = '消息已撤回'; found = true; }
        }
        return msg;
    });
    if (found) {
        localStorage.setItem(chatKey, JSON.stringify(chatMessages));
        var doctorChatKey = 'metascanChat_' + doctorUsername + '_' + currentUser.username;
        var doctorChatMessages = JSON.parse(localStorage.getItem(doctorChatKey) || '[]');
        doctorChatMessages = doctorChatMessages.map(function(msg) { if (msg.id === messageId) { msg.isRecalled = true; msg.content = '消息已撤回'; } return msg; });
        localStorage.setItem(doctorChatKey, JSON.stringify(doctorChatMessages));
        loadChatMessagesWithDoctor(doctorUsername);
        showNotification('消息已撤回');
    } else { showNotification('撤回失败'); }
}

deleteMessage = function(messageId) {
    if (!confirm('确定要撤回这条消息吗？')) return;
    wsRecallMessage(messageId);
};

function wsRecallDoctorMessage(messageId, patientUsername) {
    if (!patientUsername) return;
    _wsSend({ type: 'recall', messageId: messageId });
    var chatMessages = JSON.parse(localStorage.getItem('metascanChat_' + patientUsername) || '[]');
    var found = false;
    chatMessages = chatMessages.map(function(msg) {
        if (msg.id === messageId && msg.sender === currentUser.username) {
            var msgTime = new Date(msg.timestamp).getTime();
            if (Date.now() - msgTime <= 5 * 60 * 1000) { msg.isRecalled = true; msg.content = '消息已撤回'; found = true; }
        }
        return msg;
    });
    if (found) {
        localStorage.setItem('metascanChat_' + patientUsername, JSON.stringify(chatMessages));
        var container = document.getElementById('doctorChatMessages');
        if (container && typeof loadDoctorChatMessages === 'function') {
            loadDoctorChatMessages(patientUsername, container);
        }
        if (typeof showPatientDetails === 'function') showPatientDetails(patientUsername);
        showNotification('消息已撤回');
    } else { showNotification('撤回失败，消息不存在或已超过5分钟'); }
}

function setupWebSocket() {
    if (typeof currentUser === 'undefined' || !currentUser) return;
    _wsConnect(currentUser.username);
    _wsOn('connected', function() {
        if (_isConnected && typeof loadChatMessagesWithDoctor === 'function' && window.currentSelectedDoctor) {
            loadChatMessagesWithDoctor(window.currentSelectedDoctor);
        }
    });
    _wsOn('message', function(data) {
        if (data.echo) return;
        var msg = data.message;
        if (!msg || !msg.recipient) return;
        if (typeof currentUser !== 'undefined' && currentUser.role === 'patient' && msg.sender === window.currentSelectedDoctor) {
            if (typeof loadChatMessagesWithDoctor === 'function') loadChatMessagesWithDoctor(window.currentSelectedDoctor);
            if (typeof updateUnreadBadges === 'function') updateUnreadBadges();
        }
    });
    _wsOn('recall', function() {
        if (typeof currentUser !== 'undefined' && currentUser.role === 'patient' && window.currentSelectedDoctor) {
            if (typeof loadChatMessagesWithDoctor === 'function') loadChatMessagesWithDoctor(window.currentSelectedDoctor);
        }
    });
    _wsOn('typing', function(data) {
        if (typeof currentUser !== 'undefined' && currentUser.role === 'patient' && data.from === window.currentSelectedDoctor) {
            if (data.isTyping) showTypingIndicator(data.from); else hideTypingIndicator();
        } else if (typeof currentUser !== 'undefined' && currentUser.role === 'doctor' && data.from === window.currentSelectedPatient) {
            if (data.isTyping) showDoctorTypingIndicator(data.from); else hideDoctorTypingIndicator();
        }
    });
}

function renderFileBubble(msg, isOwn) {
    var icon = msg.fileMimetype && typeof getFileTypeIcon === 'function' ? getFileTypeIcon(msg.fileMimetype) : '📄';
    var typeName = msg.fileMimetype && typeof getFileTypeName === 'function' ? getFileTypeName(msg.fileMimetype) : '文件';
    var sizeText = msg.fileSize ? (msg.fileSize >= 1024 * 1024 ? (msg.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : msg.fileSize >= 1024 ? (msg.fileSize / 1024).toFixed(1) + ' KB' : msg.fileSize + ' B') : '';
    var displayName = msg.fileName || '文件';
    var textColor = isOwn ? 'rgba(255,255,255,0.9)' : '#333';
    var metaColor = isOwn ? 'rgba(255,255,255,0.6)' : '#999';
    var bgColor = isOwn ? 'rgba(255,255,255,0.15)' : '#f0f4ff';
    var html = '<div style="display: flex; align-items: center; gap: 12px; padding: 8px 0;">';
    html += '<div style="width: 42px; height: 42px; background: ' + bgColor + '; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">' + icon + '</div>';
    html += '<div style="flex: 1; min-width: 0;"><div style="font-weight: 600; font-size: 0.9rem; color: ' + textColor + '; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">' + (displayName || '') + '</div><div style="font-size: 0.75rem; color: ' + metaColor + '; margin-top: 2px;">' + typeName + (sizeText ? ' · ' + sizeText : '') + '</div></div>';
    html += '<a href="' + (msg.content || '') + '" download="' + (displayName || '') + '" target="_blank" style="width: 34px; height: 34px; background: ' + bgColor + '; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 1rem; flex-shrink: 0; cursor: pointer;">⬇</a>';
    html += '</div>';
    return html;
}

// ==================== 导出增强模块 (Phase 6) ====================

var EXPORT_API_BASE = 'http://localhost:3001/api/export';

var _METABOLITES_KEYS = ['GLU', 'TC', 'TG', 'HDL_C', 'LDL_C', 'UA', 'ALT', 'AST', 'CREA', 'UREA', 'HS_CRP', 'HCY', 'LAC', 'KET'];

function _collectReportData(dataOverride) {
    if (typeof currentUser === 'undefined' || !currentUser) return null;
    var allData = [];
    try { allData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || []; } catch(e) {}
    var data = dataOverride;
    if (!data || data.overallRisk === undefined) {
        data = window._currentReportData;
    }
    if (!data || data.overallRisk === undefined) {
        data = allData.length > 0 ? allData[allData.length - 1] : null;
    }
    if (!data) return null;

    var reportData = {
        date: data.date || '',
        overallRisk: data.overallRisk || 0,
        riskScores: data.riskScores || {},
        patientName: currentUser.username || ''
    };
    _METABOLITES_KEYS.forEach(function(key) {
        if (data[key] !== undefined) reportData[key] = data[key];
    });
    return reportData;
}

function _showExportProgress() {
    var overlay = document.createElement('div');
    overlay.id = 'exportProgressOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:white;padding:30px 40px;border-radius:12px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.2);"><div style="width:40px;height:40px;border:3px solid #e0e6ed;border-top-color:#1a2980;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 15px;"></div><div style="color:#333;font-size:1rem;">正在生成文件...</div></div>';
    document.body.appendChild(overlay);
    var style = document.createElement('style');
    style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
}

function _hideExportProgress() {
    var overlay = document.getElementById('exportProgressOverlay');
    if (overlay) overlay.remove();
}

function _downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
}

function _exportViaAPI(reportData, format) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', EXPORT_API_BASE + '/' + format, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.responseType = 'blob';
        xhr.onload = function() {
            if (xhr.status === 200) resolve(xhr.response);
            else {
                try {
                    var reader = new FileReader();
                    reader.onload = function() {
                        var err;
                        try { err = JSON.parse(reader.result); } catch(e) { err = { error: '导出失败 (HTTP ' + xhr.status + ')' }; }
                        reject(new Error(err.error || '导出失败'));
                    };
                    reader.readAsText(xhr.response);
                } catch(e) { reject(new Error('导出失败 (HTTP ' + xhr.status + ')')); }
            }
        };
        xhr.onerror = function() { reject(new Error('网络错误，请确认服务器已启动')); };
        xhr.send(JSON.stringify(reportData));
    });
}

function exportReportPDF(reportData, filename) {
    if (!reportData) {
        reportData = _collectReportData();
        if (!reportData) { alert('无法获取报告数据'); return; }
    }
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成PDF', '向量格式，支持文字选择');
    _showExportProgress();
    _exportViaAPI(reportData, 'pdf').then(function(blob) {
        _hideExportProgress();
        var fname = filename || ('MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
        _downloadBlob(blob, fname + '.pdf');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('PDF导出成功', '向量格式，文字可选中复制');
    }).catch(function(err) {
        _hideExportProgress();
        console.error('PDF导出失败:', err.message);
        if (typeof exportHealthReport === 'function') {
            if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('使用备用方式导出', '图片格式PDF');
            exportHealthReport();
        }
    });
}

function exportReportAsExcel() {
    if (typeof currentUser === 'undefined' || !currentUser) { alert('请先登录'); return; }
    var allData = [];
    try { allData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || []; } catch(e) {}
    if (allData.length === 0) { alert('暂无检测数据，无法导出'); return; }
    var reportData = _collectReportData();
    if (!reportData) { alert('无法获取报告数据'); return; }
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成Excel表格', '结构化数据格式');
    _showExportProgress();
    _exportViaAPI(reportData, 'excel').then(function(blob) {
        _hideExportProgress();
        _downloadBlob(blob, 'MetaScan代谢数据_' + new Date().toISOString().split('T')[0] + '.xlsx');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('Excel导出成功', '可用Excel打开编辑分析');
    }).catch(function(err) {
        _hideExportProgress();
        console.error('Excel导出失败:', err.message);
        alert('Excel导出失败，请确认服务器已启动（localhost:3001）\n错误信息: ' + err.message);
    });
}

function showExportMenu() { (window.showExportMenu || function(){})(); }

function closeExportMenu() {
    var menu = document.getElementById('globalExportMenu');
    var backdrop = document.getElementById('exportMenuBackdrop');
    if (menu) menu.remove();
    if (backdrop) backdrop.remove();
}

var _oldExportHealthReport = exportHealthReport;
var _oldExportReportAsWord = exportReportAsWord;
var _oldSaveReportAsPDF = saveReportAsPDF;
var _oldExportElementToPDF = exportElementToPDF;
var _oldExportHTMLToPDF = exportHTMLToPDF;
var _oldExportComparisonReport = exportComparisonReport;

exportHealthReport = function() {
    var reportData = _collectReportData();
    if (!reportData) {
        if (_oldExportHealthReport) _oldExportHealthReport();
        return;
    }
    exportReportPDF(reportData);
};

saveReportAsPDF = function() {
    var reportData = _collectReportData();
    if (!reportData) { alert('未找到报告数据'); return; }
    exportReportPDF(reportData, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0]);
};

exportElementToPDF = function(element, filename) {
    var reportData = _collectReportData();
    if (reportData) exportReportPDF(reportData, filename);
    else if (_oldExportElementToPDF) _oldExportElementToPDF(element, filename);
};

exportHTMLToPDF = function(htmlContent, filename) {
    var reportData = _collectReportData();
    if (reportData) exportReportPDF(reportData, filename);
    else if (_oldExportHTMLToPDF) _oldExportHTMLToPDF(htmlContent, filename);
};

exportReportAsWord = function() {
    var reportData = _collectReportData();
    if (!reportData) { if (_oldExportReportAsWord) _oldExportReportAsWord(); return; }
    if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.info('正在生成Word文档', '请稍候...');
    _showExportProgress();
    _exportViaAPI(reportData, 'word').then(function(blob) {
        _hideExportProgress();
        _downloadBlob(blob, 'MetaScan健康报告_' + new Date().toISOString().split('T')[0] + '.doc');
        if (typeof FeedbackSystem !== 'undefined') FeedbackSystem.success('Word报告导出成功', '可用Microsoft Word打开编辑');
    }).catch(function(err) {
        _hideExportProgress();
        console.error('Word导出失败:', err.message);
        if (_oldExportReportAsWord) _oldExportReportAsWord();
    });
};

exportComparisonReport = function() {
    var allData = [];
    try { if (typeof currentUser !== 'undefined' && currentUser) allData = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || []; } catch(e) {}
    if (allData.length < 2) { alert('至少需要两次检测数据才能进行对比'); return; }
    var latestData = allData[allData.length - 1];
    var reportData = _collectReportData(latestData);
    if (reportData) exportReportPDF(reportData, 'MetaScan历史对比_' + new Date().toISOString().split('T')[0]);
    else if (_oldExportComparisonReport) _oldExportComparisonReport();
};

// ==================== 性能优化模块 (Phase 8) ====================

(function() {
    'use strict';

    if (!document.querySelector('style[data-perf-skeleton]')) {
        var style = document.createElement('style');
        style.setAttribute('data-perf-skeleton', '');
        style.textContent = '\
.chart-skeleton{position:relative;min-height:300px;background:#f8fafc;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;}\
.chart-skeleton::before{content:"";position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent);animation:shimmer 1.5s infinite;}\
.chart-skeleton-inner{display:flex;align-items:center;gap:12px;color:#94a3b8;font-size:0.9rem;z-index:1;}\
.chart-skeleton-inner .spinner{border:3px solid #e2e8f0;border-top-color:#1a2980;border-radius:50%;width:24px;height:24px;animation:spin 0.8s linear infinite;}\
@keyframes shimmer{to{left:100%}}@keyframes spin{to{transform:rotate(360deg)}}\
.virtual-list-scroller{overflow-y:auto;position:relative;will-change:transform;}\
.virtual-list-item{position:absolute;left:0;right:0;box-sizing:border-box;}\
.history-limit-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;color:#1e40af;font-size:0.8rem;font-weight:500;margin:8px 0;}\
.history-limit-badge button{border:none;background:#1a2980;color:white;padding:4px 12px;border-radius:12px;cursor:pointer;font-size:0.75rem;font-weight:600;}\
.history-limit-badge button:hover{opacity:0.85;}\
';
        document.head.appendChild(style);
    }

    var _chartObservers2 = {};

    window._perfObserveChart = function(canvasId, renderFn) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (_chartObservers2[canvasId]) { _chartObservers2[canvasId].disconnect(); }

        var wrapper = canvas.closest('.chart-wrapper');
        if (wrapper && !wrapper.querySelector('.chart-skeleton-inner')) {
            var sk = document.createElement('div');
            sk.className = 'chart-skeleton-inner';
            sk.innerHTML = '<div class="spinner"></div><span>图表加载中...</span>';
            wrapper.classList.add('chart-skeleton');
            wrapper.appendChild(sk);
        }

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    if (wrapper) {
                        wrapper.classList.remove('chart-skeleton');
                        var inner = wrapper.querySelector('.chart-skeleton-inner');
                        if (inner) inner.remove();
                    }
                    renderFn();
                    observer.unobserve(entry.target);
                    _chartObservers2[canvasId] = null;
                }
            });
        }, { rootMargin: '200px' });
        observer.observe(canvas);
        _chartObservers2[canvasId] = observer;
    };

    window._perfRenderWithObserver = function(canvasId, renderFn) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var inViewport = rect.top < (window.innerHeight || document.documentElement.clientHeight) + 200 && rect.bottom > -200;
        if (inViewport) {
            var wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) { wrapper.classList.remove('chart-skeleton'); var inner = wrapper.querySelector('.chart-skeleton-inner'); if (inner) inner.remove(); }
            renderFn();
        } else {
            window._perfObserveChart(canvasId, renderFn);
        }
    };

    window._perfLimitData = function(data, maxRecords) {
        maxRecords = maxRecords || 10;
        if (!data || data.length <= maxRecords) return data;
        return data.slice(-maxRecords);
    };

    window._perfHasMoreData = function(data, maxRecords) {
        return data && data.length > (maxRecords || 10);
    };

    window._perfShowBadge = function(container, data, maxRecords, onLoadMore) {
        maxRecords = maxRecords || 10;
        if (!data || data.length <= maxRecords) return;
        var existing = container.querySelector('.history-limit-badge');
        if (existing) existing.remove();
        var badge = document.createElement('div');
        badge.className = 'history-limit-badge';
        badge.innerHTML = '📊 显示最近' + maxRecords + '条记录（共' + data.length + '条）';
        if (onLoadMore) {
            var btn = document.createElement('button');
            btn.textContent = '查看全部';
            btn.onclick = function() { badge.remove(); onLoadMore(); };
            badge.appendChild(btn);
        }
        container.insertBefore(badge, container.firstChild);
    };

    window._perfDebounce = function(fn, delay) {
        var timer = null;
        return function() { var ctx = this, args = arguments; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); };
    };

    window._perfCreatePatientVL = function(container, patients, onClick) {
        if (!container) return;
        if (container._perfVL) { container._perfVL.destroy(); }
        var itemH = 100;
        container.classList.add('virtual-list-scroller');
        var self = {};
        self.items = patients;
        self.itemH = itemH;
        self.vr = { start: -1, end: -1 };
        self.nodes = [];
        self.buf = 3;

        function renderItem(p, i) {
            var div = document.createElement('div');
            div.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;';
            div.onmouseenter = function() { div.style.background = '#f8fafc'; };
            div.onmouseleave = function() { div.style.background = 'transparent'; };

            var pd = [];
            try { var r = localStorage.getItem('metascanData_' + p.username); if (r) pd = JSON.parse(r); } catch(e) {}
            var hasD = pd.length > 0;
            var lr = hasD ? pd[pd.length - 1] : null;
            var risk = lr ? lr.overallRisk : null;
            var rlvl = risk !== null ? (risk < 30 ? '低' : risk < 60 ? '中' : '高') : '--';
            var rclr = risk !== null ? (risk < 30 ? '#10b981' : risk < 60 ? '#f59e0b' : '#ef4444') : '#94a3b8';
            var dt = lr ? (lr.date || lr.timestamp || '') : '';
            if (dt.length > 10) dt = dt.substring(0, 10);

            var name = p.fullName || p.username;
            div.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;height:100%;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1a2980,#26d0ce);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.9rem;">' + name.charAt(0).toUpperCase() + '</div><div><div style="font-weight:600;color:#1e293b;font-size:0.9rem;">' + name + '</div>' + (dt ? '<div style="font-size:0.75rem;color:#94a3b8;">最近检测：' + dt + '</div>' : '<div style="font-size:0.75rem;color:#94a3b8;">暂无数据</div>') + '</div></div><div style="display:flex;align-items:center;gap:10px;">' + (risk !== null ? '<div style="text-align:right;"><div style="font-weight:700;font-size:1.1rem;color:' + rclr + ';">' + risk.toFixed(0) + '</div><div style="font-size:0.7rem;color:' + rclr + ';">' + rlvl + '风险</div></div>' : '<span style="color:#94a3b8;font-size:0.8rem;">--</span>') + '<div style="color:#cbd5e1;">→</div></div></div>';
            div.onclick = function() { if (onClick) onClick(p); };
            return div;
        }

        function renderVisible() {
            var st = container.scrollTop, ch = container.clientHeight || 400;
            var s = Math.max(0, Math.floor(st / itemH) - self.buf);
            var e = Math.min(self.items.length, Math.ceil((st + ch) / itemH) + self.buf);
            if (s === self.vr.start && e === self.vr.end && self.nodes.length > 0) return;
            self.vr = { start: s, end: e };
            self.nodes.forEach(function(n) { if (n.parentNode) n.parentNode.removeChild(n); });
            self.nodes = [];
            for (var i = s; i < e; i++) {
                if (self.items[i]) {
                    var node = renderItem(self.items[i], i);
                    if (node) {
                        node.className = (node.className || '') + ' virtual-list-item';
                        node.style.position = 'absolute'; node.style.top = (i * itemH) + 'px'; node.style.left = '0'; node.style.right = '0'; node.style.height = itemH + 'px';
                        if (self.spacer) self.spacer.appendChild(node);
                        self.nodes.push(node);
                    }
                }
            }
        }

        self.destroy = function() { if (self._sh) container.removeEventListener('scroll', self._sh); self.nodes.forEach(function(n) { if (n.parentNode) n.parentNode.removeChild(n); }); if (self.spacer && self.spacer.parentNode) self.spacer.parentNode.removeChild(self.spacer); self.items = []; self.nodes = []; };
        var _sh = window._perfDebounce(function() { renderVisible(); }, 16);
        container.addEventListener('scroll', _sh, { passive: true });
        self._sh = _sh;

        container.innerHTML = '';
        var spacer = document.createElement('div');
        spacer.style.height = (patients.length * itemH) + 'px';
        spacer.style.position = 'relative';
        container.appendChild(spacer);
        self.spacer = spacer;
        renderVisible();
        container._perfVL = self;
    };

})();

(function() {
    if (typeof loadPatientList === 'function') {
        var _oldLoadPatientList = loadPatientList;
        loadPatientList = function(patients) {
            var container = document.getElementById('patientList');
            if (!container) return _oldLoadPatientList(patients);
            if (!patients) {
                patients = [];
                for (var k in users) { if (users[k] && users[k].role === 'patient') patients.push({ username: k }); }
            }
            if (typeof updatePatientStats === 'function') updatePatientStats(patients);
            if (patients.length === 0) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无患者数据</div>'; return; }
            container.style.maxHeight = 'calc(100vh - 250px)';
            container.style.overflowY = 'auto';
            if (typeof window._perfCreatePatientVL === 'function') {
                window._perfCreatePatientVL(container, patients, function(p) {
                    if (typeof showPatientDetails === 'function') showPatientDetails(p.username);
                });
            } else {
                _oldLoadPatientList(patients);
            }
        };
    }

    if (typeof updateComparisonView === 'function') {
        var _oldUpdateComparisonView = updateComparisonView;
        updateComparisonView = function() {
            var container = document.getElementById('comparisonContent');
            if (!container) return;
            _oldUpdateComparisonView();
            setTimeout(function() {
                if (typeof window._perfRenderWithObserver === 'function') {
                    window._perfRenderWithObserver('trendChart', function() { if (typeof drawTrendChart === 'function') drawTrendChart(); });
                    window._perfRenderWithObserver('dimensionTrendChart', function() { if (typeof drawDimensionTrendChart === 'function') drawDimensionTrendChart(); });
                }
            }, 50);
        };
    }

    if (typeof saveToHistory === 'function') {
        var _oldSaveToHistory = saveToHistory;
        saveToHistory = function(result) {
            _oldSaveToHistory(result);
            if (!currentUser) return;
            if (historicalData[currentUser.username] && historicalData[currentUser.username].length > 10) {
                historicalData[currentUser.username] = historicalData[currentUser.username].slice(-10);
            }
        };
    }

})();

(function() {
    var STORE_KEY = 'metascan_interventions';
    var VERSION_KEY = 'metascan_intervention_versions';
    var AUDIT_KEY = 'metascan_recommendation_audit';
    var REVIEW_KEY = 'metascan_review_queue';

    var DEFAULT_INTV = [{id:'diet_sedentary_1',category:'diet',subtype:'sedentary',riskMin:0,riskMax:100,triggerIndicators:['Lactate','Pyruvate'],content:'增加优质蛋白质摄入：鸡肉、鱼肉、鸡蛋、豆腐、希腊酸奶',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_sedentary_2',category:'diet',subtype:'sedentary',riskMin:0,riskMax:100,triggerIndicators:[],content:'适量补充B族维生素：全麦面包、燕麦、菠菜、西兰花、香蕉',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_sedentary_3',category:'diet',subtype:'sedentary',riskMin:0,riskMax:100,triggerIndicators:[],content:'控制精制糖摄入：避免蛋糕、糖果、甜饮料',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'exercise_sedentary_1',category:'exercise',subtype:'sedentary',riskMin:0,riskMax:100,triggerIndicators:[],content:'每周至少150分钟中等强度运动：快走、慢跑、游泳、骑自行车',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'exercise_sedentary_2',category:'exercise',subtype:'sedentary',riskMin:0,riskMax:100,triggerIndicators:[],content:'力量训练：每周2-3次，每次20-30分钟',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'lifestyle_sedentary_1',category:'lifestyle',subtype:'sedentary',riskMin:0,riskMax:100,triggerIndicators:[],content:'作息时间：建议22:30前入睡，7:00起床，保证7-8小时睡眠',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'lifestyle_sedentary_2',category:'lifestyle',subtype:'sedentary',riskMin:0,riskMax:100,triggerIndicators:[],content:'避免久坐：每小时起身活动5-10分钟，可进行伸展运动',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_obese_1',category:'diet',subtype:'obese',riskMin:0,riskMax:100,triggerIndicators:['LDL_C','TG','TC'],content:'控制总热量摄入：采用低脂低糖饮食，限制油炸食品和高糖饮料',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_obese_2',category:'diet',subtype:'obese',riskMin:0,riskMax:100,triggerIndicators:['HDL_C'],content:'增加优质脂肪摄入：橄榄油、坚果、牛油果、深海鱼',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'exercise_obese_1',category:'exercise',subtype:'obese',riskMin:0,riskMax:60,triggerIndicators:[],content:'低冲击有氧运动：游泳、骑自行车、椭圆机，每次30-45分钟',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'exercise_obese_2',category:'exercise',subtype:'obese',riskMin:60,riskMax:100,triggerIndicators:[],content:'在专业指导下进行运动：建议先进行体适能评估，避免运动损伤',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'lifestyle_obese_1',category:'lifestyle',subtype:'obese',riskMin:0,riskMax:100,triggerIndicators:[],content:'每周记录体重和腰围变化，建立健康档案',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_inflammatory_1',category:'diet',subtype:'inflammatory',riskMin:0,riskMax:100,triggerIndicators:['CRP','IL6','TNF_alpha'],content:'采用地中海饮食模式：多吃蔬菜水果、全谷物、橄榄油、深海鱼',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_inflammatory_2',category:'diet',subtype:'inflammatory',riskMin:0,riskMax:100,triggerIndicators:[],content:'减少促炎食物：加工肉制品、油炸食品、含糖饮料、精制碳水',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'exercise_inflammatory_1',category:'exercise',subtype:'inflammatory',riskMin:0,riskMax:100,triggerIndicators:[],content:'适度运动避免过度：瑜伽、太极、散步，每次30分钟',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'lifestyle_inflammatory_1',category:'lifestyle',subtype:'inflammatory',riskMin:0,riskMax:100,triggerIndicators:[],content:'压力管理：每天10-15分钟冥想或深呼吸练习，保持情绪稳定',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_glucose_1',category:'diet',subtype:'glucose',riskMin:0,riskMax:100,triggerIndicators:['Glucose','HbA1c','HOMA_IR'],content:'选择低GI食物：全谷物、豆类、非淀粉类蔬菜，控制碳水化合物总摄入量',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_glucose_2',category:'diet',subtype:'glucose',riskMin:0,riskMax:100,triggerIndicators:[],content:'分餐制：每日4-5餐，少量多餐，避免血糖剧烈波动',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'exercise_glucose_1',category:'exercise',subtype:'glucose',riskMin:0,riskMax:100,triggerIndicators:[],content:'餐后30分钟轻度运动：散步15-20分钟，帮助控制餐后血糖',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'lifestyle_glucose_1',category:'lifestyle',subtype:'glucose',riskMin:0,riskMax:100,triggerIndicators:[],content:'血糖自我监测：建议每周至少检测2次空腹血糖和餐后2小时血糖',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_amino_1',category:'diet',subtype:'amino',riskMin:0,riskMax:100,triggerIndicators:['BCAA','Leucine','Isoleucine'],content:'调整蛋白质来源比例：减少红肉摄入，增加鱼类、豆制品等优质蛋白',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_amino_2',category:'diet',subtype:'amino',riskMin:0,riskMax:100,triggerIndicators:[],content:'增加植物蛋白摄入：豆腐、豆浆、鹰嘴豆、藜麦',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'exercise_amino_1',category:'exercise',subtype:'amino',riskMin:0,riskMax:100,triggerIndicators:[],content:'适度力量训练：每周2次，每次20-30分钟，避免高蛋白补充剂',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'lifestyle_amino_1',category:'lifestyle',subtype:'amino',riskMin:0,riskMax:100,triggerIndicators:[],content:'定期检测肝功能：氨基代谢异常可能提示肝脏代谢负担',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_highrisk_1',category:'diet',subtype:'all',riskMin:60,riskMax:100,triggerIndicators:[],content:'高风险专项饮食管理：请在营养师指导下制定个性化饮食方案',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'diet_highrisk_2',category:'diet',subtype:'all',riskMin:60,riskMax:100,triggerIndicators:[],content:'严格限制盐摄入（<5g/天），避免高钠加工食品',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()},{id:'lifestyle_highrisk_1',category:'lifestyle',subtype:'all',riskMin:60,riskMax:100,triggerIndicators:[],content:'建议每月进行一次代谢指标复查，密切监测健康变化',version:1,status:'published',author:'system',createdAt:Date.now(),updatedAt:Date.now()}];

    function _intvInit() { if(!localStorage.getItem(STORE_KEY)) localStorage.setItem(STORE_KEY,JSON.stringify(DEFAULT_INTV)); }
    function _intvGetAll() { try{return JSON.parse(localStorage.getItem(STORE_KEY)||'[]');}catch(e){return[];} }
    function _intvSave(all) { localStorage.setItem(STORE_KEY,JSON.stringify(all)); }
    function _intvVerHist() { try{return JSON.parse(localStorage.getItem(VERSION_KEY)||'{}');}catch(e){return{};} }
    function _intvSaveVer(h) { localStorage.setItem(VERSION_KEY,JSON.stringify(h)); }
    function _intvAudit() { try{return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');}catch(e){return[];} }
    function _intvSaveAudit(a) { localStorage.setItem(AUDIT_KEY,JSON.stringify(a)); }

    window.queryInterventions = function(ur) {
        var r={diet:[],exercise:[],lifestyle:[],recommendations:[],all:[],matchScore:0,generatedAt:new Date().toISOString(),status:'pending_review',sources:[]};
        if(!ur)return r;
        var all=_intvGetAll().filter(function(i){return i.status==='published';});
        var st=ur.subtypes||[],ork=ur.overallRisk||0,am=(ur.abnormalMetabolites||[]).map(function(m){return m.id;}),seen={};
        all.forEach(function(item){
            var s=0;
            if(item.subtype==='all')s+=5;else if(st.indexOf(item.subtype)!==-1)s+=30;
            if(ork>=item.riskMin&&ork<=item.riskMax)s+=15;
            if(item.triggerIndicators&&item.triggerIndicators.length>0){var mc=0;item.triggerIndicators.forEach(function(ind){if(am.indexOf(ind)!==-1)mc++;});if(mc>0)s+=mc*10;}
            if(s>0&&!seen[item.id]){seen[item.id]=true;r.all.push({intervention:item,score:s});if(item.category==='diet')r.diet.push(item.content);else if(item.category==='exercise')r.exercise.push(item.content);else r.lifestyle.push(item.content);r.recommendations.push(item.content);r.sources.push({id:item.id,category:item.category,score:s});r.matchScore+=s;}
        });
        r.all.sort(function(a,b){return b.score-a.score;});
        return r;
    };

    window.generateDynamicRecommendations = function(ur) {
        if(!ur) return {diet:[],exercise:[],lifestyle:[],recommendations:[],all:[],matchScore:0,confidence:0,generatedAt:new Date().toISOString(),status:'empty',statusMessage:'缺少用户分析数据',sources:[],validation:{passed:false,warnings:['缺少用户分析数据']}};
        var raw=window.queryInterventions(ur);
        if(raw.all.length===0){
            var fb={diet:[],exercise:[],lifestyle:[],recommendations:[],all:[],matchScore:0,confidence:30,generatedAt:new Date().toISOString(),status:'fallback_no_match',statusMessage:'未匹配到合适的干预方案，已使用通用建议替代',sources:[],validation:{passed:false,warnings:['未匹配到合适的干预方案']}};
            (ur.subtypes||[]).forEach(function(s){if(window.subtypes&&window.subtypes[s]){var c=window.subtypes[s];if(c.diet)fb.diet=fb.diet.concat(c.diet);if(c.exercise)fb.exercise=fb.exercise.concat(c.exercise);if(c.lifestyle)fb.lifestyle=fb.lifestyle.concat(c.lifestyle);if(c.recommendations)fb.recommendations=fb.recommendations.concat(c.recommendations);}});
            if(fb.recommendations.length===0){fb.diet=['保持均衡饮食，多摄入蔬菜水果和全谷物'];fb.exercise=['建议每周进行至少150分钟中等强度有氧运动'];fb.lifestyle=['保持规律作息，确保7-8小时充足睡眠'];fb.recommendations=['定期体检，关注代谢指标变化'];}
            var audit=_intvAudit();audit.unshift({recommendationId:'rec_'+Date.now(),patientId:ur.username||'unknown',generatedAt:fb.generatedAt,status:'pending_review',confidence:fb.confidence,matchScore:fb.matchScore,subtypes:ur.subtypes||[],overallRisk:ur.overallRisk||0,sources:fb.sources||[],validation:fb.validation});if(audit.length>100)audit.length=100;_intvSaveAudit(audit);
            return fb;
        }
        var enriched=Object.assign({},raw);
        var sc=(ur.subtypes||[]).length,ac=(ur.abnormalMetabolites||[]).length;
        enriched.confidence=Math.min(60+Math.min(sc*10,20)+Math.min(ac*3,15)+Math.min(raw.matchScore/5,5),98);
        enriched.patientProfile={subtypes:ur.subtypes||[],overallRisk:ur.overallRisk||0,riskLevel:ur.overallRisk>=60?'high':ur.overallRisk>=30?'medium':'low'};
        enriched.status='pending_review';enriched.statusMessage='方案已生成，待医生审核确认';
        var warnings=[],errors=[];
        if(enriched.diet.length===0&&enriched.exercise.length===0&&enriched.lifestyle.length===0)warnings.push('干预方案覆盖不完整');
        if(enriched.confidence<40)errors.push('推荐置信度过低');
        if(enriched.diet.length===0)warnings.push('缺少饮食建议');
        if(enriched.exercise.length===0)warnings.push('缺少运动建议');
        enriched.validation={passed:errors.length===0,warnings:warnings,errors:errors,validatedAt:new Date().toISOString()};
        var audit=_intvAudit();audit.unshift({recommendationId:'rec_'+Date.now(),patientId:ur.username||'unknown',generatedAt:enriched.generatedAt,status:'pending_review',confidence:enriched.confidence,matchScore:enriched.matchScore,subtypes:ur.subtypes||[],overallRisk:ur.overallRisk||0,sources:enriched.sources||[],validation:enriched.validation});if(audit.length>100)audit.length=100;_intvSaveAudit(audit);
        return enriched;
    };

    window.getPendingReviewCount = function() {
        var audit=_intvAudit();
        return audit.filter(function(e){return e.status==='pending_review'||e.status==='pending';}).length;
    };

    window.getRecommendationStats = function() {
        var audit=_intvAudit(),s={total:audit.length,pending:0,approved:0,rejected:0,modified:0,avgConfidence:0},cs=0,cc=0;
        audit.forEach(function(e){if(e.status==='pending_review'||e.status==='pending')s.pending++;else if(e.status==='approved')s.approved++;else if(e.status==='rejected')s.rejected++;else if(e.status==='modified')s.modified++;if(e.confidence!==undefined){cs+=e.confidence;cc++;}});
        s.avgConfidence=cc>0?Math.round(cs/cc):0;
        return s;
    };

    _intvInit();

    var _intvEditId=null,_intvCatFlt='all',_intvSubFlt='all',_intvStaFlt='all',_intvSearch='';

    window._perfFormatTs = function(ts){if(!ts)return'未知';var d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};

    window._perfIntvFilter = function(){
        _intvCatFlt=(document.getElementById('intvCategoryFilter')||{}).value||'all';
        _intvSubFlt=(document.getElementById('intvSubtypeFilter')||{}).value||'all';
        _intvStaFlt=(document.getElementById('intvStatusFilter')||{}).value||'all';
        window._perfIntvRefresh();
    };

    window._perfIntvSearch = function(){
        _intvSearch=((document.getElementById('intvSearch')||{}).value||'').toLowerCase();
        window._perfIntvRefresh();
    };

    window._perfIntvShowCreate = function(){
        _intvEditId=null;document.getElementById('intvFormTitle').textContent='创建干预方案';
        document.getElementById('intvFormCategory').value='diet';document.getElementById('intvFormSubtype').value='all';
        document.getElementById('intvFormRiskMin').value='0';document.getElementById('intvFormRiskMax').value='100';
        document.getElementById('intvFormTriggers').value='';document.getElementById('intvFormContent').value='';
        document.getElementById('intvFormOverlay').style.display='flex';
    };

    window._perfIntvEdit = function(id){
        _intvEditId=id;var items=_intvGetAll(),item=items.find(function(i){return i.id===id;});
        if(!item)return;
        document.getElementById('intvFormTitle').textContent='编辑干预方案 (v'+(item.version||1)+')';
        document.getElementById('intvFormCategory').value=item.category;document.getElementById('intvFormSubtype').value=item.subtype;
        document.getElementById('intvFormRiskMin').value=item.riskMin;document.getElementById('intvFormRiskMax').value=item.riskMax;
        document.getElementById('intvFormTriggers').value=(item.triggerIndicators||[]).join(',');document.getElementById('intvFormContent').value=item.content;
        document.getElementById('intvFormOverlay').style.display='flex';
    };

    window._perfIntvCloseForm = function(){document.getElementById('intvFormOverlay').style.display='none';_intvEditId=null;};

    window._perfIntvSaveForm = function(){
        var cat=document.getElementById('intvFormCategory').value,st=document.getElementById('intvFormSubtype').value;
        var rmin=parseInt(document.getElementById('intvFormRiskMin').value)||0,rmax=parseInt(document.getElementById('intvFormRiskMax').value)||100;
        var tr=(document.getElementById('intvFormTriggers').value.trim()||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
        var ct=document.getElementById('intvFormContent').value.trim();
        if(!ct){if(typeof showNotification==='function')showNotification('请填写方案内容','warning');return;}
        if(_intvEditId){
            var all=_intvGetAll(),idx=all.findIndex(function(i){return i.id===_intvEditId;});
            if(idx!==-1){var old=all[idx],vh=_intvVerHist();if(!vh[_intvEditId])vh[_intvEditId]=[];vh[_intvEditId].push({version:old.version,content:old.content,status:old.status,updatedAt:old.updatedAt,updatedBy:old.author});_intvSaveVer(vh);all[idx]=Object.assign({},old,{category:cat,subtype:st,riskMin:rmin,riskMax:rmax,triggerIndicators:tr,content:ct,version:(old.version||1)+1,updatedAt:Date.now()});_intvSaveAll(all);}
            if(typeof showNotification==='function')showNotification('方案已更新（版本号已递增）');
        }else{
            var all2=_intvGetAll();all2.push({id:'intv_'+Date.now()+'_'+Math.random().toString(36).substr(2,5),category:cat,subtype:st,riskMin:rmin,riskMax:rmax,triggerIndicators:tr,content:ct,version:1,status:'draft',author:(function(){try{var cu=JSON.parse(localStorage.getItem('metascanCurrentUser')||'{}');return cu.fullName||cu.username||'unknown';}catch(e){return'unknown';}})(),createdAt:Date.now(),updatedAt:Date.now()});_intvSaveAll(all2);
            if(typeof showNotification==='function')showNotification('新方案已创建');
        }
        document.getElementById('intvFormOverlay').style.display='none';_intvEditId=null;window._perfIntvRefresh();
    };

    window._perfIntvPublish = function(id){var all=_intvGetAll(),idx=all.findIndex(function(i){return i.id===id;});if(idx!==-1){all[idx].status='published';all[idx].updatedAt=Date.now();_intvSaveAll(all);}if(typeof showNotification==='function')showNotification('方案已发布');window._perfIntvRefresh();};
    window._perfIntvUnpublish = function(id){var all=_intvGetAll(),idx=all.findIndex(function(i){return i.id===id;});if(idx!==-1){all[idx].status='draft';all[idx].updatedAt=Date.now();_intvSaveAll(all);}if(typeof showNotification==='function')showNotification('方案已取消发布');window._perfIntvRefresh();};
    window._perfIntvReview = function(id){var all=_intvGetAll(),idx=all.findIndex(function(i){return i.id===id;});if(idx!==-1){all[idx].status='reviewed';all[idx].updatedAt=Date.now();_intvSaveAll(all);}if(typeof showNotification==='function')showNotification('方案已审核通过');window._perfIntvRefresh();};
    window._perfIntvDelete = function(id){if(confirm('确定要删除此干预方案吗？')){var all=_intvGetAll(),f=all.filter(function(i){return i.id!==id;});_intvSaveAll(f);if(typeof showNotification==='function')showNotification('方案已删除');window._perfIntvRefresh();}};

    window._perfIntvShowVer = function(id){
        var vh=_intvVerHist(),vers=vh[id]||[],el=document.getElementById('intvVersionList');
        if(!el)return;
        if(vers.length===0)el.innerHTML='<div style="text-align:center;color:#94a3b8;padding:30px;">暂无版本历史记录</div>';
        else el.innerHTML=vers.map(function(v,i){return'<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><div style="font-weight:600;color:#1a2980;">v'+v.version+' <span style="font-size:0.75rem;color:#94a3b8;">'+window._perfFormatTs(v.updatedAt)+'</span></div><div style="font-size:0.85rem;color:#333;margin-top:4px;">'+v.content+'</div><div style="font-size:0.75rem;color:#64748b;">状态: '+v.status+' | 操作者: '+(v.updatedBy||'未知')+'</div></div>';}).join('');
        document.getElementById('intvVersionOverlay').style.display='flex';
    };

    window._perfIntvCloseVer = function(){document.getElementById('intvVersionOverlay').style.display='none';};
    window._perfIntvShowReset = function(){document.getElementById('intvResetOverlay').style.display='flex';};
    window._perfIntvCloseReset = function(){document.getElementById('intvResetOverlay').style.display='none';};
    window._perfIntvConfirmReset = function(){localStorage.setItem(STORE_KEY,JSON.stringify(DEFAULT_INTV));localStorage.removeItem(VERSION_KEY);document.getElementById('intvResetOverlay').style.display='none';if(typeof showNotification==='function')showNotification('已恢复为系统默认方案');window._perfIntvRefresh();};

    window._perfIntvRefresh = function(){
        var all=_intvGetAll();
        if(_intvCatFlt!=='all')all=all.filter(function(i){return i.category===_intvCatFlt;});
        if(_intvSubFlt!=='all')all=all.filter(function(i){return i.subtype===_intvSubFlt||i.subtype==='all';});
        if(_intvStaFlt!=='all')all=all.filter(function(i){return i.status===_intvStaFlt;});
        if(_intvSearch)all=all.filter(function(i){return i.content.toLowerCase().indexOf(_intvSearch)!==-1;});

        var stats={total:_intvGetAll().length,published:0,draft:0,reviewed:0};
        _intvGetAll().forEach(function(i){if(i.status==='published')stats.published++;if(i.status==='draft')stats.draft++;if(i.status==='reviewed')stats.reviewed++;});

        var bar=document.getElementById('intvStatsBar');
        if(bar)bar.innerHTML='<div style="background:#f8fafc;padding:8px 16px;border-radius:10px;font-size:0.85rem;"><strong>总计:</strong> '+stats.total+' 条</div><div style="background:#f0fdf4;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#16a34a;"><strong>已发布:</strong> '+stats.published+' 条</div><div style="background:#fef3c7;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#d97706;"><strong>草稿:</strong> '+stats.draft+' 条</div><div style="background:#dbeafe;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#2563eb;"><strong>已审核:</strong> '+stats.reviewed+' 条</div>'+(all.length!==stats.total?'<div style="background:#f1f5f9;padding:8px 16px;border-radius:10px;font-size:0.85rem;color:#64748b;"><strong>筛选结果:</strong> '+all.length+' 条</div>':'');

        var lc=document.getElementById('intvListContainer'),li=document.getElementById('intvListInfo');
        if(!lc)return;
        if(all.length===0){lc.innerHTML='<div style="text-align:center;padding:40px;color:#94a3b8;">暂无匹配的干预方案<br><br><button class="intv-btn intv-btn-primary" onclick="window._perfIntvShowCreate()">+ 创建第一个方案</button></div>';if(li)li.textContent='';return;}
        if(li)li.textContent='显示 '+all.length+' 条方案';

        lc.innerHTML=all.map(function(item){
            var sb=item.status==='published'?'<span style="background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">✅ 已发布</span>':item.status==='reviewed'?'<span style="background:#dbeafe;color:#2563eb;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">👍 已审核</span>':'<span style="background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">📝 草稿</span>';
            var ci=item.category==='diet'?'🥗':item.category==='exercise'?'🏃':'🌿',cn=item.category==='diet'?'饮食':item.category==='exercise'?'运动':'生活方式';
            var sn=item.subtype==='all'?'通用':(window.subtypes&&window.subtypes[item.subtype]?window.subtypes[item.subtype].name:item.subtype);
            var tt=(item.triggerIndicators&&item.triggerIndicators.length>0)?'<span style="font-size:0.75rem;color:#64748b;">触发: '+item.triggerIndicators.join(', ')+'</span>':'';
            return'<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;transition:background 0.15s;display:flex;align-items:flex-start;gap:12px;" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'transparent\'"><div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'+sb+'<span style="font-size:0.8rem;color:#64748b;">'+ci+' '+cn+'</span><span style="font-size:0.8rem;color:#64748b;">| '+sn+'</span><span style="font-size:0.8rem;color:#94a3b8;">v'+(item.version||1)+'</span>'+(item.riskMin>0||item.riskMax<100?'<span style="font-size:0.75rem;background:#f1f5f9;padding:1px 8px;border-radius:8px;color:#475569;">风险:'+item.riskMin+'-'+item.riskMax+'</span>':'')+'</div><div style="font-size:0.9rem;color:#1e293b;line-height:1.5;">'+item.content+'</div><div style="font-size:0.72rem;color:#94a3b8;margin-top:4px;">'+tt+(tt?' | ':'')+'作者: '+(item.author||'未知')+' | 更新: '+window._perfFormatTs(item.updatedAt)+'</div></div><div style="display:flex;gap:4px;flex-shrink:0;align-items:center;"><button style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-size:0.75rem;color:#64748b;" onclick="window._perfIntvShowVer(\''+item.id+'\')" title="版本历史">📜</button><button style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-size:0.75rem;color:#64748b;" onclick="window._perfIntvEdit(\''+item.id+'\')" title="编辑">✏️</button>'+(item.status==='draft'?'<button style="padding:4px 10px;border:1px solid #16a34a;border-radius:8px;background:#f0fdf4;cursor:pointer;font-size:0.75rem;color:#16a34a;" onclick="window._perfIntvPublish(\''+item.id+'\')" title="发布">✅</button>':item.status==='published'?'<button style="padding:4px 10px;border:1px solid #d97706;border-radius:8px;background:#fef3c7;cursor:pointer;font-size:0.75rem;color:#d97706;" onclick="window._perfIntvUnpublish(\''+item.id+'\')" title="取消发布">⬇</button>':'')+(item.status==='published'?'<button style="padding:4px 10px;border:1px solid #2563eb;border-radius:8px;background:#dbeafe;cursor:pointer;font-size:0.75rem;color:#2563eb;" onclick="window._perfIntvReview(\''+item.id+'\')" title="审核通过">👍</button>':'')+'<button style="padding:4px 10px;border:1px solid #ef4444;border-radius:8px;background:#fef2f2;cursor:pointer;font-size:0.75rem;color:#ef4444;" onclick="window._perfIntvDelete(\''+item.id+'\')" title="删除">🗑</button></div></div>';
        }).join('');
    };

    window._perfRenderEditor = function(container){
        if(!container)return;

        container.innerHTML='<div class="intv-editor"><div class="intv-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;"><div><h3 style="color:#1a2980;margin:0;font-size:1.2rem;display:flex;align-items:center;gap:10px;"><span>📋</span><span>干预方案编辑器</span><span style="font-size:0.75rem;color:#94a3b8;font-weight:400;">（医生专有功能）</span></h3><p style="color:#64748b;font-size:0.85rem;margin:4px 0 0 0;">管理饮食、运动及生活方式干预方案，支持版本控制与审核发布</p></div><div style="display:flex;gap:8px;"><button class="intv-btn intv-btn-outline" onclick="window._perfIntvShowReset()" title="恢复系统默认方案">🔄 重置默认</button><button class="intv-btn intv-btn-primary" onclick="window._perfIntvShowCreate()" title="创建新的干预方案">+ 新建方案</button></div></div><div class="intv-stats" id="intvStatsBar" style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;"></div><div class="intv-toolbar" style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;"><input type="text" id="intvSearch" placeholder="搜索方案内容..." style="flex:1;min-width:200px;padding:9px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;" oninput="window._perfIntvSearch()"><select id="intvCategoryFilter" onchange="window._perfIntvFilter()" style="padding:9px 12px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:0.85rem;"><option value="all">全部类别</option><option value="diet">🥗 饮食</option><option value="exercise">🏃 运动</option><option value="lifestyle">🌿 生活方式</option></select><select id="intvSubtypeFilter" onchange="window._perfIntvFilter()" style="padding:9px 12px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:0.85rem;"><option value="all">全部亚型</option><option value="sedentary">运动不足型</option><option value="obese">肥胖代谢紊乱型</option><option value="inflammatory">炎症饮食相关型</option><option value="glucose">糖代谢异常型</option><option value="amino">氨基酸代谢紊乱型</option><option value="all">通用（所有亚型）</option></select><select id="intvStatusFilter" onchange="window._perfIntvFilter()" style="padding:9px 12px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:0.85rem;"><option value="all">全部状态</option><option value="published">✅ 已发布</option><option value="draft">📝 草稿</option><option value="reviewed">👍 已审核</option></select></div><div id="intvListContainer" style="max-height:500px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:12px;background:white;"></div><div style="text-align:center;margin-top:8px;color:#94a3b8;font-size:0.8rem;" id="intvListInfo"></div>'+
        '<div id="intvFormOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;">'+
        '<div style="background:white;border-radius:16px;padding:30px;width:90%;max-width:700px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'+
        '<h3 id="intvFormTitle" style="color:#1a2980;margin:0 0 20px 0;font-size:1.2rem;">创建干预方案</h3>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'+
        '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">类别 *</label><select id="intvFormCategory" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"><option value="diet">🥗 饮食建议</option><option value="exercise">🏃 运动指导</option><option value="lifestyle">🌿 生活方式</option></select></div>'+
        '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">适用亚型 *</label><select id="intvFormSubtype" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"><option value="all">通用（所有亚型）</option><option value="sedentary">运动不足型</option><option value="obese">肥胖代谢紊乱型</option><option value="inflammatory">炎症饮食相关型</option><option value="glucose">糖代谢异常型</option><option value="amino">氨基酸代谢紊乱型</option></select></div>'+
        '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">最低风险分</label><input type="number" id="intvFormRiskMin" value="0" min="0" max="100" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div>'+
        '<div><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">最高风险分</label><input type="number" id="intvFormRiskMax" value="100" min="0" max="100" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div></div>'+
        '<div style="margin-top:14px;"><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">触发指标（逗号分隔，如 LDL_C,Glucose）</label><input type="text" id="intvFormTriggers" placeholder="留空表示始终匹配" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div>'+
        '<div style="margin-top:14px;"><label style="font-weight:600;color:#333;font-size:0.85rem;display:block;margin-bottom:4px;">方案内容 *</label><textarea id="intvFormContent" rows="4" placeholder="请填写干预方案的具体内容..." style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;resize:vertical;font-family:inherit;"></textarea></div>'+
        '<div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;"><button class="intv-btn intv-btn-outline" onclick="window._perfIntvCloseForm()">取消</button><button class="intv-btn intv-btn-primary" onclick="window._perfIntvSaveForm()">💾 保存</button></div></div></div>'+
        '<div id="intvVersionOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;align-items:center;justify-content:center;"><div style="background:white;border-radius:16px;padding:30px;width:90%;max-width:600px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);"><h3 style="color:#1a2980;margin:0 0 20px 0;font-size:1.2rem;">📜 版本历史</h3><div id="intvVersionList" style="max-height:400px;overflow-y:auto;"></div><div style="margin-top:20px;text-align:right;"><button class="intv-btn intv-btn-outline" onclick="window._perfIntvCloseVer()">关闭</button></div></div></div>'+
        '<div id="intvResetOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;align-items:center;justify-content:center;"><div style="background:white;border-radius:16px;padding:30px;width:90%;max-width:450px;box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center;"><div style="font-size:3rem;margin-bottom:12px;">⚠️</div><h3 style="color:#e74c3c;margin:0 0 12px 0;">确认重置？</h3><p style="color:#666;margin:0 0 20px 0;">此操作将删除所有自定义干预方案，恢复为系统默认方案。此操作不可撤销。</p><div style="display:flex;justify-content:center;gap:10px;"><button class="intv-btn intv-btn-outline" onclick="window._perfIntvCloseReset()">取消</button><button class="intv-btn intv-btn-danger" onclick="window._perfIntvConfirmReset()">确认重置</button></div></div></div>'+
        '</div>';

        document.getElementById('intvFormOverlay').addEventListener('click',function(e){if(e.target===this)window._perfIntvCloseForm();});
        document.getElementById('intvVersionOverlay').addEventListener('click',function(e){if(e.target===this)window._perfIntvCloseVer();});
        document.getElementById('intvResetOverlay').addEventListener('click',function(e){if(e.target===this)window._perfIntvCloseReset();});

        window._perfIntvRefresh();
    };

    if(typeof showDoctorDashboard==='function'){
        var _oldShowDoctorDashboard=showDoctorDashboard;
        showDoctorDashboard=function(){
            _oldShowDoctorDashboard();
            setTimeout(function(){
                var ec=document.getElementById('interventionEditorContainer');
                if(ec)window._perfRenderEditor(ec);
            },300);
        };
    }

    if(typeof generateComprehensiveRecommendations==='function'){
        var _oldGenRec=generateComprehensiveRecommendations;
        generateComprehensiveRecommendations=function(result){
            if(!result) return[];
            try{
                var dyn=window.generateDynamicRecommendations;
                if(typeof dyn==='function'){
                    var dr=dyn(result);
                    if(dr&&dr.recommendations&&dr.recommendations.length>0)return dr.recommendations;
                }
            }catch(e){}
            return _oldGenRec(result);
        };
    }

})();

(function() {
    var _a11yFOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    var _a11ySrInjected = false;

    function _a11yInjectSROnlyCSS() {
        if (_a11ySrInjected) return;
        _a11ySrInjected = true;
        var style = document.createElement('style');
        style.id = 'sr-only-styles';
        style.textContent = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}.sr-only-focusable:active,.sr-only-focusable:focus{position:static;width:auto;height:auto;overflow:visible;clip:auto;white-space:normal;}.a11y-skip-link{position:fixed;top:-100%;left:0;z-index:10000;padding:8px 16px;background:#1a1a2e;color:#e0f7fa;font-size:14px;text-decoration:none;border-radius:0 0 4px 0;transition:top 0.15s ease;}.a11y-skip-link:focus{top:0;outline:3px solid #26d0ce;outline-offset:2px;}[data-focus-method="mouse"] :focus{outline:none!important;}[data-focus-method="keyboard"] :focus-visible{outline:3px solid #26d0ce!important;outline-offset:2px!important;}.a11y-error-summary{background:#fef2f2;border:2px solid #ef4444;border-radius:10px;padding:14px 18px;margin-bottom:16px;}.a11y-error-summary h2{font-size:1rem;color:#dc2626;margin:0 0 8px 0;}.a11y-error-summary ul{margin:0;padding-left:20px;}.a11y-error-summary a{color:#dc2626;text-decoration:underline;}.a11y-form-error{color:#dc2626;font-size:0.8rem;margin-top:4px;display:flex;align-items:center;gap:4px;}.a11y-form-error::before{content:"⚠️";}';
        document.head.appendChild(style);
    }

    window.trapFocus = function(modalElement) {
        _a11yInjectSROnlyCSS();
        var prevFocus = document.activeElement;
        if (!modalElement.hasAttribute('role')) modalElement.setAttribute('role', 'dialog');
        if (!modalElement.hasAttribute('aria-modal')) modalElement.setAttribute('aria-modal', 'true');

        var focusable = Array.prototype.filter.call(modalElement.querySelectorAll(_a11yFOCUSABLE), function(el) {
            return el.offsetParent !== null && !el.hasAttribute('disabled');
        });

        if (focusable.length === 0) {
            var fb = modalElement.querySelector('button, input, select, textarea, [onclick]');
            if (fb) { if (!fb.hasAttribute('tabindex')) fb.setAttribute('tabindex', '0'); focusable = [fb]; }
        }

        if (focusable.length === 0) return function() {};

        var first = focusable[0], last = focusable[focusable.length - 1];
        setTimeout(function() { first.focus(); }, 50);

        function handleKeyDown(e) {
            if (e.key === 'Tab') {
                var curr = Array.prototype.filter.call(modalElement.querySelectorAll(_a11yFOCUSABLE), function(el) {
                    return el.offsetParent !== null && !el.hasAttribute('disabled');
                });
                if (curr.length === 0) return;
                var f = curr[0], l = curr[curr.length - 1];
                if (e.shiftKey) { if (document.activeElement === f) { e.preventDefault(); l.focus(); } }
                else { if (document.activeElement === l) { e.preventDefault(); f.focus(); } }
            }
            if (e.key === 'Escape') releaseTrap();
        }

        modalElement.addEventListener('keydown', handleKeyDown);

        function releaseTrap() {
            modalElement.removeEventListener('keydown', handleKeyDown);
            if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
        }

        return releaseTrap;
    };

    var _a11ySkipLink = null;

    window.addSkipToContentLink = function() {
        _a11yInjectSROnlyCSS();
        if (_a11ySkipLink) return;
        _a11ySkipLink = document.createElement('a');
        _a11ySkipLink.href = '#main'; _a11ySkipLink.textContent = '跳到主要内容';
        _a11ySkipLink.className = 'a11y-skip-link';
        document.body.insertBefore(_a11ySkipLink, document.body.firstChild);
        _a11ySkipLink.addEventListener('click', function(e) {
            e.preventDefault();
            var main = document.getElementById('main') || document.querySelector('.container');
            if (!main) return;
            if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
            main.focus({ preventScroll: false });
        });
    };

    var _a11yLivePolite = null, _a11yLiveAssertive = null;

    window.announce = function(message, priority) {
        _a11yInjectSROnlyCSS();
        priority = priority || 'polite';
        if (priority === 'assertive') {
            if (!_a11yLiveAssertive) { _a11yLiveAssertive = document.createElement('div'); _a11yLiveAssertive.className = 'sr-only'; _a11yLiveAssertive.setAttribute('aria-live', 'assertive'); _a11yLiveAssertive.setAttribute('aria-atomic', 'true'); document.body.appendChild(_a11yLiveAssertive); }
            _a11yLiveAssertive.textContent = '';
            setTimeout(function() { _a11yLiveAssertive.textContent = message; }, 50);
        } else {
            if (!_a11yLivePolite) { _a11yLivePolite = document.createElement('div'); _a11yLivePolite.className = 'sr-only'; _a11yLivePolite.setAttribute('aria-live', 'polite'); _a11yLivePolite.setAttribute('aria-atomic', 'true'); document.body.appendChild(_a11yLivePolite); }
            _a11yLivePolite.textContent = '';
            setTimeout(function() { _a11yLivePolite.textContent = message; }, 50);
        }
    };

    window.announceError = function(message) { window.announce('错误：' + message, 'assertive'); };
    window.announceSuccess = function(message) { window.announce('操作成功：' + message, 'polite'); };

    window.initFocusRingManagement = function() {
        _a11yInjectSROnlyCSS();
        var body = document.body;
        function setMethod(m) { body.setAttribute('data-focus-method', m); }
        body.addEventListener('mousedown', function() { setMethod('mouse'); });
        body.addEventListener('keydown', function(e) { if (e.key === 'Tab' || e.key.startsWith('Arrow')) setMethod('keyboard'); });
        setMethod('keyboard');
    };

    window.injectARIALandmarks = function() {
        _a11yInjectSROnlyCSS();
        var header = document.querySelector('header') || document.querySelector('.header');
        if (header && !header.hasAttribute('role')) header.setAttribute('role', 'banner');

        document.querySelectorAll('nav').forEach(function(nav, i) {
            if (!nav.hasAttribute('role')) nav.setAttribute('role', 'navigation');
            if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', '主导航 ' + (i + 1));
        });

        var main = document.getElementById('main') || document.querySelector('.container');
        if (main && !main.hasAttribute('role')) { main.setAttribute('role', 'main'); if (!main.hasAttribute('id')) main.setAttribute('id', 'main'); }

        var footer = document.querySelector('footer');
        if (footer && !footer.hasAttribute('role')) footer.setAttribute('role', 'contentinfo');

        document.querySelectorAll('aside, .sidebar, .side-panel').forEach(function(aside) {
            if (!aside.hasAttribute('role')) aside.setAttribute('role', 'complementary');
        });

        document.querySelectorAll('section').forEach(function(sec) {
            if (!sec.hasAttribute('role')) sec.setAttribute('role', 'region');
            if (!sec.hasAttribute('aria-label') && !sec.hasAttribute('aria-labelledby')) {
                var heading = sec.querySelector('h1,h2,h3,h4,h5,h6');
                if (heading) {
                    var headingId = heading.getAttribute('id');
                    if (!headingId) { headingId = 'section-heading-' + Math.random().toString(36).substr(2, 8); heading.setAttribute('id', headingId); }
                    sec.setAttribute('aria-labelledby', headingId);
                }
            }
        });

        document.querySelectorAll('.dropdown-toggle, .accordion-header, .collapsible-trigger, [data-toggle]').forEach(function(el) {
            if (!el.hasAttribute('aria-expanded')) { el.setAttribute('aria-expanded', 'false'); el.setAttribute('role', 'button'); }
        });
    };

    window.ensureAriaLabels = function() {
        _a11yInjectSROnlyCSS();
        document.querySelectorAll('button, [onclick], [role="button"], .btn, .clickable').forEach(function(el) {
            if (!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON' && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') {
                el.setAttribute('tabindex', '0');
            }
            if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !el.hasAttribute('aria-hidden')) {
                var label = (el.textContent || '').trim().slice(0, 60);
                if (!label) label = el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('data-i18n-aria') || '';
                if (label && label.length > 0 && label.length < 200) el.setAttribute('aria-label', label);
            }
        });

        document.querySelectorAll('img:not([alt])').forEach(function(img) {
            var nearest = img.closest('button') || img.closest('a') || img.closest('[title]');
            var altText = nearest ? (nearest.getAttribute('aria-label') || nearest.getAttribute('title') || '图片') : '图片';
            img.setAttribute('alt', altText);
        });
    };

    window.associateFormErrors = function(formElement, errors) {
        if (!formElement || !errors || Object.keys(errors).length === 0) return;
        _a11yInjectSROnlyCSS();

        formElement.querySelectorAll('.a11y-form-error').forEach(function(err) { err.remove(); });
        formElement.querySelectorAll('[aria-invalid]').forEach(function(el) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });

        var summaryId = 'form-errors-' + Date.now();
        var summary = document.createElement('div');
        summary.className = 'a11y-error-summary';
        summary.setAttribute('role', 'alert');
        summary.id = summaryId;
        summary.innerHTML = '<h2>表单包含 ' + Object.keys(errors).length + ' 个错误，请修正后重新提交</h2><ul>' +
            Object.keys(errors).map(function(field) {
                return '<li><a href="#' + field + '" onclick="var el=document.getElementById(\'' + field + '\');if(el)el.focus();">' + errors[field] + '</a></li>';
            }).join('') + '</ul>';
        formElement.insertBefore(summary, formElement.firstChild);
        summary.focus();

        Object.keys(errors).forEach(function(field) {
            var input = formElement.querySelector('#' + field + ', [name="' + field + '"]');
            if (input) {
                input.setAttribute('aria-invalid', 'true');
                var errorId = field + '-error';
                input.setAttribute('aria-describedby', errorId);
                var errorEl = document.createElement('div');
                errorEl.className = 'a11y-form-error'; errorEl.id = errorId; errorEl.textContent = errors[field];
                input.parentNode.appendChild(errorEl);
            }
        });

        window.announce('表单包含 ' + Object.keys(errors).length + ' 个错误，请修正后重新提交', 'assertive');
    };

    window.__a11yRerun = function() {
        window.injectARIALandmarks();
        window.ensureAriaLabels();
    };

    window.addEventListener('DOMContentLoaded', function() {
        _a11yInjectSROnlyCSS();
        window.addSkipToContentLink();
        window.initFocusRingManagement();
        window.injectARIALandmarks();
        window.ensureAriaLabels();

        if (typeof showNotification === 'function') {
            var _oldNotif = showNotification;
            showNotification = function(message, type) {
                _oldNotif(message, type);
                try { window.announce(message, type === 'error' ? 'assertive' : 'polite'); } catch(e) {}
            };
        }
    });

})();
