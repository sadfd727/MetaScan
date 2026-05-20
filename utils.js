var XSS_REPLACEMENTS = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
    '=': '&#x3d;'
};

export function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`=]/g, function(char) {
        return XSS_REPLACEMENTS[char] || char;
    });
}

export function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(char) {
        return XSS_REPLACEMENTS[char] || char;
    });
}

var PBKDF2_ITERATIONS = 210000;
var PBKDF2_KEY_LEN = 32;

function bufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function hashPassword(password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var encoder = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    var derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        PBKDF2_KEY_LEN * 8
    );
    return bufferToBase64(salt) + ':' + bufferToBase64(derivedBits);
}

export async function verifyPassword(password, storedHash) {
    if (!storedHash || storedHash.indexOf(':') === -1) {
        return false;
    }
    var parts = storedHash.split(':');
    var salt = base64ToBuffer(parts[0]);
    var encoder = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    var derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        PBKDF2_KEY_LEN * 8
    );
    return bufferToBase64(derivedBits) === parts[1];
}

export function formatMessageTime(timestamp) {
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

export function getReadStatusIcon(msg, isOwn) {
    if (!isOwn) return '';
    if (msg.read) {
        return '<span style="color: #26d0ce; font-size: 0.7rem; margin-left: 4px;" title="已读">✓✓</span>';
    } else {
        return '<span style="color: #94a3b8; font-size: 0.7rem; margin-left: 4px;" title="已发送">✓</span>';
    }
}

export function showSkeleton(containerId) {
    var placeholder = document.querySelector('#' + containerId + ' .skeleton-placeholder');
    var content = document.querySelector('#' + containerId + ' .skeleton-content');
    if (placeholder) placeholder.classList.add('active');
    if (content) content.classList.remove('active');
    return function() {
        if (placeholder) placeholder.classList.remove('active');
        if (content) content.classList.add('active');
    };
}

export function getTodayData() {
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