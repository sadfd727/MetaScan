import { showNotification } from './notifications.js';
import { hashPassword, verifyPassword } from './utils.js';
import { persistSession, restoreSession, clearSession, clearCredentials, saveCredentials, isRememberEnabled, autoFillLoginForm } from './auth-persistence.js';

var API_BASE_URL = 'http://localhost:3001';
if (typeof window !== 'undefined' && window.location && window.location.port === '3001') {
    API_BASE_URL = '';
}

function serverLogin(username, password) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', API_BASE_URL + '/api/auth/login', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 8000;
        xhr.onload = function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (xhr.status === 200 && data.success) {
                    console.log('[Auth] 服务端登录成功:', username);
                    resolve(data.user);
                } else {
                    console.warn('[Auth] 服务端登录拒绝:', username, data.error || '登录失败');
                    reject(new Error(data.error || '登录失败'));
                }
            } catch (e) {
                console.error('[Auth] 服务端响应解析失败:', e);
                reject(new Error('服务器响应异常'));
            }
        };
        xhr.onerror = function() {
            console.warn('[Auth] 无法连接认证服务器');
            reject(new Error('无法连接服务器'));
        };
        xhr.ontimeout = function() {
            console.warn('[Auth] 认证服务器超时');
            reject(new Error('服务器请求超时'));
        };
        xhr.send(JSON.stringify({ username: username, password: password }));
    });
}

function serverRegister(username, password, role) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', API_BASE_URL + '/api/auth/register', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 8000;
        xhr.onload = function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (xhr.status === 200 && data.success) {
                    console.log('[Auth] 服务端注册成功:', username);
                    resolve(data.user);
                } else if (xhr.status === 409) {
                    console.log('[Auth] 服务端注册: 用户已存在（同步）:', username);
                    resolve({ username: username, role: role });
                } else {
                    console.warn('[Auth] 服务端注册失败:', username, data.error || '注册失败');
                    reject(new Error(data.error || '注册失败'));
                }
            } catch (e) {
                console.error('[Auth] 服务端注册响应解析失败:', e);
                reject(new Error('服务器响应异常'));
            }
        };
        xhr.onerror = function() {
            console.warn('[Auth] 注册时无法连接服务器');
            reject(new Error('无法连接服务器'));
        };
        xhr.ontimeout = function() {
            console.warn('[Auth] 注册服务器超时');
            reject(new Error('服务器请求超时'));
        };
        xhr.send(JSON.stringify({ username: username, password: password, role: role }));
    });
}

function syncUserToServer(username, password, role) {
    serverRegister(username, password, role).then(function() {
        console.log('[Auth] 用户已同步至服务端:', username);
    }).catch(function(e) {
        console.warn('[Auth] 用户同步至服务端失败（不影响本地使用）:', username, e.message);
    });
}

export let users = {};
try {
    if (typeof localStorage !== 'undefined') {
        var storedUsers = localStorage.getItem('metascanUsers');
        if (storedUsers) { users = JSON.parse(storedUsers); }
    }
} catch (e) { console.error('Failed to parse users data:', e); users = {}; }

export let currentUser = null;

try {
    var restored = restoreSession();
    if (restored) { currentUser = restored; }
} catch (e) { console.error('Failed to restore session:', e); currentUser = null; }

export let historicalData = {};
export let currentResult = null;
export function setCurrentResult(val) {
    currentResult = val;
    window._currentReportData = val;
    if (currentUser && val) {
        try { localStorage.setItem('metascanResult_' + currentUser.username, JSON.stringify(val)); } catch(e) {}
    }
}
export function getCurrentResult() {
    if (currentResult) return currentResult;
    if (currentUser) {
        try {
            var saved = localStorage.getItem('metascanResult_' + currentUser.username);
            if (saved) { currentResult = JSON.parse(saved); window._currentReportData = currentResult; return currentResult; }
        } catch(e) {}
    }
    return null;
}

var sessionTimeoutId = null;
var activityListeners = [];

export function checkLoginStatus() {
    if (currentUser) {
        var loginPageEl = document.getElementById('loginPage');
        if (loginPageEl) loginPageEl.style.display = 'none';
        loadUserData();
        if (currentUser.role === 'doctor') { showDoctorDashboard(); }
    } else {
        autoFillLoginForm().then(function(filled) {
            var loginPageEl2 = document.getElementById('loginPage');
            if (loginPageEl2) loginPageEl2.style.display = 'flex';
        });
        var loginPageEl2 = document.getElementById('loginPage');
        if (loginPageEl2) loginPageEl2.style.display = 'flex';
    }
}

// 切换表单
export function toggleForm(formType) {
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

// 重置密码功能
export async function resetPassword() {
    try {
        var usernameEl = document.getElementById('forgotUsername');
        var newPwdEl = document.getElementById('newPassword');
        var confirmPwdEl = document.getElementById('confirmNewPassword');
        var roleEl = document.querySelector('input[name="forgotRole"]:checked');

        if (!usernameEl || !newPwdEl || !confirmPwdEl || !roleEl) {
            showError('表单加载失败，请刷新页面');
            return;
        }

        var username = usernameEl.value.trim();
        var newPassword = newPwdEl.value;
        var confirmNewPassword = confirmPwdEl.value;
        var role = roleEl.value;

        if (!username || !newPassword || !confirmNewPassword) {
            showError('请填写所有字段');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showError('两次输入的新密码不一致');
            return;
        }

        if (!users[username]) {
            showError('用户名不存在');
            return;
        }

        if (users[username].role !== role) {
            showError('角色选择错误');
            return;
        }

        users[username].password = await hashPassword(newPassword);
        localStorage.setItem('metascanUsers', JSON.stringify(users));

        showNotification('密码重置成功！');

        toggleForm('login');

        var usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.value = username;
    } catch (e) {
        console.error('[Auth] 重置密码失败:', e);
        showError('重置密码失败，请稍后重试');
    }
}

// 登录功能（服务端优先 + 本地回退）
export async function login() {
    try {
        var usernameEl = document.getElementById('username');
        var passwordEl = document.getElementById('password');
        var roleEl = document.querySelector('input[name="role"]:checked');

        if (!usernameEl || !passwordEl || !roleEl) {
            showError('表单加载失败，请刷新页面');
            console.error('[Auth] 登录表单DOM元素缺失');
            return;
        }

        var username = usernameEl.value.trim();
        var password = passwordEl.value;
        var role = roleEl.value;

        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }

        if (username.length > 30) {
            showError('用户名过长');
            return;
        }

        var rememberEl = document.getElementById('rememberMe');
        var rememberMe = rememberEl ? rememberEl.checked : false;

        var authSuccess = false;
        var finalRole = role;
        var serverToken = '';
        var authSource = '';

        // ★★★ 第一步：尝试服务端认证（主路径） ★★★
        try {
            var serverResult = await serverLogin(username, password);
            serverToken = serverResult.token || '';
            finalRole = serverResult.role || role;
            authSuccess = true;
            authSource = 'server';
            console.log('[Auth] ✅ 服务端认证通过:', username, '角色:', finalRole);
        } catch (serverErr) {
            console.warn('[Auth] 服务端认证未通过，尝试本地验证:', serverErr.message);

            // ★★★ 第二步：回退到 localStorage 本地验证（离线/兼容） ★★★
            if (users[username]) {
                var storedPassword = users[username].password;
                var localValid = false;
                var needsMigration = false;

                if (storedPassword.indexOf(':') !== -1) {
                    try {
                        localValid = await verifyPassword(password, storedPassword);
                    } catch (e) {
                        console.warn('[Auth] 本地密码验证异常:', e);
                        localValid = false;
                    }
                } else {
                    var legacyHash = '';
                    var hashVal = 0;
                    for (var i = 0; i < password.length; i++) {
                        var charCode = password.charCodeAt(i);
                        hashVal = ((hashVal << 5) - hashVal) + charCode;
                        hashVal = hashVal & hashVal;
                    }
                    legacyHash = hashVal.toString();
                    localValid = (storedPassword === legacyHash);
                    needsMigration = true;
                }

                if (localValid && users[username].role === role) {
                    authSuccess = true;
                    authSource = 'local';
                    finalRole = role;
                    console.log('[Auth] ✅ 本地认证通过:', username);

                    if (needsMigration) {
                        users[username].password = await hashPassword(password);
                        localStorage.setItem('metascanUsers', JSON.stringify(users));
                    }

                    // 异步同步到服务端（不影响本次登录）
                    syncUserToServer(username, password, role);
                } else if (!localValid) {
                    console.warn('[Auth] 本地密码验证失败:', username);
                    showError('用户名或密码错误');
                    return;
                } else if (users[username].role !== role) {
                    console.warn('[Auth] 本地角色不匹配:', username, '期望:', role, '实际:', users[username].role);
                    showError('角色选择错误');
                    return;
                }
            } else {
                // 用户既不在服务端也不在本地 localStorage
                console.warn('[Auth] 用户不存在（服务端+本地均无）:', username);
                showError('用户名或密码错误');
                return;
            }
        }

        if (!authSuccess) {
            showError('登录失败，请稍后重试');
            return;
        }

        // ★★★ 第三步：设置会话 ★★★
        currentUser = {
            username: username,
            role: finalRole,
            lastActivity: new Date().toISOString(),
            token: serverToken,
            _authSource: authSource
        };
        persistSession(currentUser, rememberMe);

        if (rememberMe) {
            saveCredentials(username, password, finalRole);
        }

        if (finalRole === 'doctor') {
            sessionStorage.setItem('doctorLoginTime', Date.now().toString());
        }

        // ★★★ 第四步：UI 切换 ★★★
        var loginPageEl = document.getElementById('loginPage');
        var containerEl = document.querySelector('.container');
        if (loginPageEl) loginPageEl.style.display = 'none';
        if (containerEl) containerEl.style.display = 'block';

        if (finalRole === 'doctor') {
            var patientNav = document.querySelector('.nav-tabs:not(.doctor-nav)');
            var doctorNav = document.querySelector('.doctor-nav');
            if (patientNav) patientNav.style.display = 'none';
            if (doctorNav) doctorNav.style.display = 'flex';
            showDoctorDashboard();
        } else {
            var patientNav2 = document.querySelector('.nav-tabs:not(.doctor-nav)');
            var doctorNav2 = document.querySelector('.doctor-nav');
            if (patientNav2) patientNav2.style.display = 'flex';
            if (doctorNav2) doctorNav2.style.display = 'none';
            showTab('home');
        }

        loadUserData();
        showNotification('登录成功！');
        startSessionTimeout();
        console.log('[Auth] 登录完成, 来源:', authSource, '用户:', username);
    } catch (e) {
        console.error('[Auth] 登录流程异常:', e);
        showError('登录失败，请稍后重试');
    }
}

// 会话超时检查
export function startSessionTimeout() {
    if (sessionTimeoutId) clearInterval(sessionTimeoutId);
    sessionTimeoutId = setInterval(function() {
        if (currentUser) {
            var lastActivity = new Date(currentUser.lastActivity);
            var now = new Date();
            var timeDiff = now - lastActivity;
            var minutesDiff = timeDiff / (1000 * 60);

            if (minutesDiff > 30) {
                logout();
                showNotification('会话已超时，请重新登录');
            }
        }
    }, 5 * 60 * 1000);
}

// 更新活动时间
export function updateActivity() {
    if (currentUser) {
        currentUser.lastActivity = new Date().toISOString();
        persistSession(currentUser, currentUser._rememberMe === true);
    }
}

// 为所有用户交互添加活动时间更新
export function setupActivityTracking() {
    removeActivityTracking();
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    activityListeners = [
        { target: document, type: 'mousemove', handler: updateActivity },
        { target: document, type: 'keypress', handler: updateActivity },
        { target: document, type: 'click', handler: updateActivity },
        { target: window, type: 'scroll', handler: updateActivity }
    ];
}

function removeActivityTracking() {
    activityListeners.forEach(function(listener) {
        listener.target.removeEventListener(listener.type, listener.handler);
    });
    activityListeners = [];
}

// 注册功能（本地保存 + 服务端同步）
export async function register() {
    try {
        var usernameEl = document.getElementById('regUsername');
        var passwordEl = document.getElementById('regPassword');
        var confirmPwdEl = document.getElementById('regConfirmPassword');
        var roleEl = document.querySelector('input[name="regRole"]:checked');

        if (!usernameEl || !passwordEl || !confirmPwdEl || !roleEl) {
            showError('表单加载失败，请刷新页面');
            return;
        }

        var username = usernameEl.value.trim();
        var password = passwordEl.value;
        var confirmPassword = confirmPwdEl.value;
        var role = roleEl.value;

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

        console.log('[Auth] 开始注册:', username, '角色:', role);

        // 第一步：保存到 localStorage
        users[username] = {
            password: await hashPassword(password),
            role: role,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('metascanUsers', JSON.stringify(users));

        // 第二步：异步同步到服务端（不阻塞注册流程）
        serverRegister(username, password, role).then(function() {
            console.log('[Auth] ✅ 服务端注册同步成功:', username);
            showNotification('注册成功！');
        }).catch(function(e) {
            console.warn('[Auth] 服务端注册同步失败（仍可本地使用）:', username, e.message);
            showNotification('注册成功！数据将同步至其他设备');
        });

        // 第三步：设置当前会话
        currentUser = { username: username, role: role, lastActivity: new Date().toISOString() };
        persistSession(currentUser, false);

        if (role === 'patient') {
            historicalData[username] = [];
            localStorage.setItem('metascanData_' + username, JSON.stringify([]));
        }

        var loginPageEl = document.getElementById('loginPage');
        var containerEl = document.querySelector('.container');
        if (loginPageEl) loginPageEl.style.display = 'none';
        if (containerEl) containerEl.style.display = 'block';

        if (role === 'doctor') {
            var patientNav = document.querySelector('.nav-tabs:not(.doctor-nav)');
            var doctorNav = document.querySelector('.doctor-nav');
            if (patientNav) patientNav.style.display = 'none';
            if (doctorNav) doctorNav.style.display = 'flex';
            showDoctorDashboard();
        } else {
            var patientNav2 = document.querySelector('.nav-tabs:not(.doctor-nav)');
            var doctorNav2 = document.querySelector('.doctor-nav');
            if (patientNav2) patientNav2.style.display = 'flex';
            if (doctorNav2) doctorNav2.style.display = 'none';
            showTab('data');
        }

        startSessionTimeout();
    } catch (e) {
        console.error('[Auth] 注册失败:', e);
        showError('注册失败，请稍后重试');
    }
}

document.addEventListener('click', function(event) {
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
});

// 退出登录
export function logout() {
    var wasRemembered = currentUser && currentUser._rememberMe;

    currentUser = null;
    currentResult = null;
    clearSession();

    if (!wasRemembered) {
        clearCredentials();
    }

    try { localStorage.setItem('metascanUsers', JSON.stringify(users)); } catch (e) {}

    if (sessionTimeoutId) {
        clearInterval(sessionTimeoutId);
        sessionTimeoutId = null;
    }
    removeActivityTracking();

    var loginPageEl = document.getElementById('loginPage');
    var containerEl = document.querySelector('.container');
    if (loginPageEl) loginPageEl.style.display = 'flex';
    if (containerEl) containerEl.style.display = 'none';

    showNotification('已退出登录');
}

// 修改密码
export async function changePassword() {
    try {
        var currentPwdEl = document.getElementById('currentPassword');
        var newPwdEl = document.getElementById('settingsNewPassword');
        var confirmPwdEl = document.getElementById('settingsConfirmNewPassword');

        if (!currentPwdEl || !newPwdEl || !confirmPwdEl) {
            showNotification('表单加载失败，请刷新页面');
            return;
        }

        var currentPassword = currentPwdEl.value;
        var newPassword = newPwdEl.value;
        var confirmNewPassword = confirmPwdEl.value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showNotification('请填写所有密码字段');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showNotification('两次输入的新密码不一致');
            return;
        }

        if (!currentUser || !users[currentUser.username]) {
            showNotification('用户状态异常，请重新登录');
            return;
        }

        var user = users[currentUser.username];
        var storedPassword = user.password;
        var passwordValid = false;

        if (storedPassword.indexOf(':') !== -1) {
            passwordValid = await verifyPassword(currentPassword, storedPassword);
        } else {
            var hashVal = 0;
            for (var i = 0; i < currentPassword.length; i++) {
                var charCode = currentPassword.charCodeAt(i);
                hashVal = ((hashVal << 5) - hashVal) + charCode;
                hashVal = hashVal & hashVal;
            }
            passwordValid = (storedPassword === hashVal.toString());
        }

        if (!passwordValid) {
            showNotification('当前密码错误');
            return;
        }

        user.password = await hashPassword(newPassword);
        localStorage.setItem('metascanUsers', JSON.stringify(users));

        showNotification('密码修改成功！');

        currentPwdEl.value = '';
        newPwdEl.value = '';
        confirmPwdEl.value = '';
    } catch (e) {
        console.error('修改密码失败:', e);
        showNotification('密码修改失败，请稍后重试');
    }
}

export function saveUserProfile() {
    var genderEl = document.getElementById('settingsGender');
    var ageEl = document.getElementById('settingsAge');

    if (!genderEl || !ageEl) return;
    if (!currentUser || !users[currentUser.username]) return;

    var gender = genderEl.value;
    var age = ageEl.value;

    var user = users[currentUser.username];
    user.gender = gender;
    user.age = age;

    localStorage.setItem('metascanUsers', JSON.stringify(users));

    showNotification('个人资料保存成功');
}

export function togglePasswordVisibility(inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var button = input.nextElementSibling;
    if (!button) return;

    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '👁️‍🗨️';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

function showError(message) {
    var errorElement = document.getElementById('loginError');
    if (!errorElement) return;
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function loadUserData() {
    if (currentUser) {
        historicalData[currentUser.username] = JSON.parse(localStorage.getItem('metascanData_' + currentUser.username)) || [];
        try {
            var savedResult = localStorage.getItem('metascanResult_' + currentUser.username);
            if (savedResult) { currentResult = JSON.parse(savedResult); window._currentReportData = currentResult; }
        } catch(e) {}
    }
}

export function toggleDropdown(event) {
    event.stopPropagation();
    var dropdowns = document.getElementsByClassName('dropdown-content');
    for (var i = 0; i < dropdowns.length; i++) {
        var dropdown = dropdowns[i];
        var btn = dropdown.previousElementSibling;
        if (btn && btn.classList.contains('dropdown-btn')) {
            dropdown.classList.toggle('show');
        }
    }
}