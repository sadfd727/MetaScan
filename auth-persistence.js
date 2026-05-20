var APP_SALT = 'MetaScan_v2_2026_persist';
var STORE_KEY_CREDS = 'metascan_auth_persist';
var STORE_KEY_REMEMBER = 'metascan_auth_remember_flag';

function storageAvailable(type) {
    var key = '__mss_test__';
    try {
        var storage = type === 'local' ? localStorage : sessionStorage;
        storage.setItem(key, '1');
        var val = storage.getItem(key);
        storage.removeItem(key);
        return val === '1';
    } catch (e) {
        return false;
    }
}

var _localOk = null;
var _sessionOk = null;

function localOk() {
    if (_localOk === null) _localOk = storageAvailable('local');
    return _localOk;
}

function sessionOk() {
    if (_sessionOk === null) _sessionOk = storageAvailable('session');
    return _sessionOk;
}

var _cryptoOk = null;
function cryptoOk() {
    if (_cryptoOk === null) {
        _cryptoOk = typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.encrypt === 'function';
    }
    return _cryptoOk;
}

function getLs() { return localOk() ? localStorage : null; }
function getSs() { return sessionOk() ? sessionStorage : null; }

function memStore() {
    if (!_memStore) _memStore = {};
    return _memStore;
}
var _memStore = null;

function safeGet(store, key, fallback) {
    if (!store) {
        var mem = memStore();
        return key in mem ? mem[key] : fallback;
    }
    try {
        var val = store.getItem(key);
        if (val === null || val === undefined) return fallback;
        return val;
    } catch (e) { return fallback; }
}

function safeSet(store, key, value) {
    if (!store) {
        var mem = memStore();
        mem[key] = value;
        return;
    }
    try { store.setItem(key, value); } catch (e) {
        try {
            var mem = memStore();
            mem[key] = value;
        } catch (e2) {}
    }
}

function safeRemove(store, key) {
    if (!store) {
        var mem = memStore();
        delete mem[key];
        return;
    }
    try { store.removeItem(key); } catch (e) {}
}

function safeGetObj(store, key, fallback) {
    var str = safeGet(store, key, null);
    if (!str) return fallback;
    try { return JSON.parse(str); } catch (e) { return fallback; }
}

function safeSetObj(store, key, obj) {
    try { safeSet(store, key, JSON.stringify(obj)); } catch (e) {}
}

function deriveKeyMaterial(userSalt) {
    var encoder = new TextEncoder();
    var data = encoder.encode(APP_SALT + '::' + userSalt + '::' + (navigator.userAgent || '').substring(0, 40));
    return crypto.subtle.digest('SHA-256', data);
}

async function importAesKey(rawKey) {
    return crypto.subtle.importKey('raw', new Uint8Array(rawKey), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) { bin += String.fromCharCode(bytes[i]); }
    return btoa(bin);
}

function base64ToArrayBuffer(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
    return bytes.buffer;
}

async function encryptCredentials(username, password, role) {
    if (!cryptoOk()) { return fallbackEncode(username, password, role); }

    try {
        var keyMaterial = await deriveKeyMaterial(username);
        var aesKey = await importAesKey(keyMaterial);

        var iv = crypto.getRandomValues(new Uint8Array(12));
        var encoder = new TextEncoder();
        var plaintext = encoder.encode(JSON.stringify({ u: username, p: password, r: role, t: Date.now() }));

        var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, plaintext);

        return {
            ct: arrayBufferToBase64(ciphertext),
            iv: arrayBufferToBase64(iv),
            ver: 2
        };
    } catch (e) {
        return fallbackEncode(username, password, role);
    }
}

async function decryptCredentials(blob, username) {
    if (!blob || !blob.ct) return null;

    if (blob.ver === 1 || !cryptoOk()) { return fallbackDecode(blob); }

    try {
        var keyMaterial = await deriveKeyMaterial(username);
        var aesKey = await importAesKey(keyMaterial);

        var ciphertext = base64ToArrayBuffer(blob.ct);
        var iv = new Uint8Array(base64ToArrayBuffer(blob.iv));

        var plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, ciphertext);

        var decoder = new TextDecoder();
        var json = JSON.parse(decoder.decode(plaintext));

        if (!json.u || !json.p || !json.r) return null;

        if (json.u !== username) return null;

        return { username: json.u, password: json.p, role: json.r };
    } catch (e) {
        if (blob.ver !== 2) return null;
        return fallbackDecode(blob);
    }
}

function fallbackEncode(username, password, role) {
    var data = JSON.stringify({ u: username, p: password, r: role, t: Date.now() });
    var encoded = '';
    for (var i = 0; i < data.length; i++) { encoded += String.fromCharCode(data.charCodeAt(i) ^ 0x5A); }
    return { ct: btoa(encoded), iv: '', ver: 1 };
}

function fallbackDecode(blob) {
    try {
        var decoded = '';
        var raw = atob(blob.ct);
        for (var i = 0; i < raw.length; i++) { decoded += String.fromCharCode(raw.charCodeAt(i) ^ 0x5A); }
        var json = JSON.parse(decoded);
        if (!json.u || !json.p || !json.r) return null;
        return { username: json.u, password: json.p, role: json.r };
    } catch (e) { return null; }
}

function parseRememberFlag() {
    try {
        var val = localStorage.getItem(STORE_KEY_REMEMBER);
        return val === 'true' || val === '1';
    } catch (e) { return false; }
}

function saveRememberFlag(enabled) {
    try { localStorage.setItem(STORE_KEY_REMEMBER, enabled ? 'true' : 'false'); } catch (e) {}
}

export function isRememberEnabled() {
    return parseRememberFlag();
}

export function getRememberedUsername() {
    var data = safeGetObj(getLs(), STORE_KEY_CREDS, null);
    return data && data.username ? data.username : null;
}

export async function saveCredentials(username, password, role) {
    if (!username || !password) return false;

    saveRememberFlag(true);

    try {
        var encrypted = await encryptCredentials(username, password, role);
        var store = getLs();
        if (!store) {
            var mem = memStore();
            mem[STORE_KEY_CREDS] = JSON.stringify(encrypted);
            var mem2 = memStore();
            mem2['_auth_username'] = username;
            return true;
        }

        safeSetObj(store, STORE_KEY_CREDS, {
            ct: encrypted.ct,
            iv: encrypted.iv || '',
            ver: encrypted.ver || 2,
            username: username
        });

        return true;
    } catch (e) {
        console.warn('[AuthPersistence] save credentials failed:', e);
        return false;
    }
}

export async function loadCredentials() {
    if (!isRememberEnabled()) return null;

    var data = safeGetObj(getLs(), STORE_KEY_CREDS, null);
    if (!data || !data.username || !data.ct) {
        var mem = memStore();
        var raw = mem[STORE_KEY_CREDS];
        if (raw) {
            try { data = JSON.parse(raw); } catch (e) {}
        }
        if (!data || !data.username || !data.ct) return null;
    }

    if (!dataIsValid(data)) {
        clearCredentials();
        return null;
    }

    try {
        var result = await decryptCredentials(data, data.username);
        if (!result) {
            clearCredentials();
            return null;
        }
        return result;
    } catch (e) {
        console.warn('[AuthPersistence] decrypt failed:', e);
        return null;
    }
}

function dataIsValid(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.username || typeof data.username !== 'string' || data.username.length < 1 || data.username.length > 50) return false;
    if (!data.ct || typeof data.ct !== 'string' || data.ct.length < 4 || data.ct.length > 5000) return false;
    if (data.ver !== undefined && (typeof data.ver !== 'number' || data.ver < 1 || data.ver > 5)) return false;
    return true;
}

export function clearCredentials() {
    saveRememberFlag(false);

    var ls = getLs();
    safeRemove(ls, STORE_KEY_CREDS);

    var mem = memStore();
    delete mem[STORE_KEY_CREDS];
    delete mem['_auth_username'];
}

export function persistSession(user, rememberMe) {
    if (!user || !user.username) return;

    user._savedAt = new Date().toISOString();
    user._rememberMe = rememberMe;

    if (rememberMe) {
        var ls = getLs();
        safeSetObj(ls, 'metascanCurrentUser', user);
        if (sessionOk()) { safeSet(sessionStorage, 'metascanCurrentUser', JSON.stringify(user)); }
    } else {
        var ss = getSs();
        safeSetObj(ss, 'metascanCurrentUser', user);
        var ls2 = getLs();
        safeRemove(ls2, 'metascanCurrentUser');
    }
}

export function restoreSession() {
    if (localOk()) {
        var lsData = safeGetObj(localStorage, 'metascanCurrentUser', null);
        if (lsData && lsData.username) {
            if (lsData._rememberMe) {
                if (lsData._savedAt) {
                    var savedTime = new Date(lsData._savedAt).getTime();
                    var maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
                    if (Date.now() - savedTime > maxAge) {
                        safeRemove(localStorage, 'metascanCurrentUser');
                        return null;
                    }
                }
                return lsData;
            }
            safeRemove(localStorage, 'metascanCurrentUser');
        }
    }

    if (sessionOk()) {
        var ssData = safeGetObj(sessionStorage, 'metascanCurrentUser', null);
        if (ssData && ssData.username) return ssData;
    }

    if (localOk()) {
        var lsLegacy = safeGetObj(localStorage, 'metascanCurrentUser', null);
        if (lsLegacy && lsLegacy.username && !lsLegacy._rememberMe) {
            if (sessionOk()) safeSetObj(sessionStorage, 'metascanCurrentUser', lsLegacy);
            safeRemove(localStorage, 'metascanCurrentUser');
            return lsLegacy;
        }
    }

    return null;
}

export function clearSession() {
    try {
        safeRemove(getLs(), 'metascanCurrentUser');
        safeRemove(getSs(), 'metascanCurrentUser');
    } catch (e) {}
}

export async function autoFillLoginForm() {
    if (!isRememberEnabled()) return false;

    try {
        var creds = await loadCredentials();
        if (!creds) return false;

        var usernameEl = document.getElementById('username');
        var passwordEl = document.getElementById('password');

        if (usernameEl && creds.username) {
            usernameEl.value = creds.username;
        }
        if (passwordEl && creds.password) {
            passwordEl.value = creds.password;
        }

        var roleEl = document.querySelector('input[name="role"][value="' + creds.role + '"]');
        if (roleEl) { roleEl.checked = true; }

        return true;
    } catch (e) {
        console.warn('[AuthPersistence] autoFill failed:', e);
        return false;
    }
}

export function isAutoFillAvailable() {
    if (!isRememberEnabled()) return false;

    var data = safeGetObj(getLs(), STORE_KEY_CREDS, null);
    if (!data) {
        var mem = memStore();
        if (mem[STORE_KEY_CREDS]) return true;
        return false;
    }
    return !!(data.ct && data.username);
}

export function getStorageDiagnostics() {
    return {
        localStorage: localOk(),
        sessionStorage: sessionOk(),
        webCrypto: cryptoOk(),
        rememberEnabled: isRememberEnabled(),
        hasSavedCredentials: isAutoFillAvailable()
    };
}

if (typeof window !== 'undefined') {
    window.isRememberEnabled = isRememberEnabled;
    window.saveCredentials = saveCredentials;
    window.loadCredentials = loadCredentials;
    window.clearCredentials = clearCredentials;
    window.persistSession = persistSession;
    window.restoreSession = restoreSession;
    window.clearSession = clearSession;
    window.autoFillLoginForm = autoFillLoginForm;
    window.getStorageDiagnostics = getStorageDiagnostics;
}