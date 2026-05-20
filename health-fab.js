var fabEl = null;
var fabElms = null;
var isDragging = false;
var dragStartX = 0;
var dragStartY = 0;
var fabStartX = 0;
var fabStartY = 0;
var hasMoved = false;
var fabX = 24;
var fabY = -1;
var fabVisible = true;
var dragThreshold = 5;

var DEFAULT_ICON = '👩‍⚕️';
var STORAGE_KEY_POS = 'metascan_health_fab_position';

function loadPosition() {
    try {
        var stored = localStorage.getItem(STORAGE_KEY_POS);
        if (stored) {
            var pos = JSON.parse(stored);
            if (typeof pos.x === 'number' && typeof pos.y === 'number') {
                fabX = pos.x;
                fabY = pos.y;
            }
        }
    } catch (e) {}
}

function savePosition() {
    try {
        localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x: fabX, y: fabY }));
    } catch (e) {}
}

function clampPosition() {
    if (!fabEl) return;
    var maxX = window.innerWidth - fabEl.offsetWidth - 8;
    var maxY = window.innerHeight - fabEl.offsetHeight - 8;
    fabX = Math.max(8, Math.min(fabX, maxX));
    fabY = Math.max(8, Math.min(fabY, maxY));
}

function applyPosition() {
    if (!fabEl) return;
    fabEl.style.left = fabX + 'px';
    fabEl.style.bottom = fabY + 'px';
    fabEl.style.top = 'auto';
    fabEl.style.right = 'auto';
}

function createFab() {
    if (fabEl) return;

    loadPosition();

    if (fabY === -1) {
        fabY = 24;
    }

    var fab = document.createElement('div');
    fab.id = 'healthAssistantFab';
    fab.className = 'health-fab';
    fab.title = '智能健康助手 · DeepSeek V4';
    fab.setAttribute('role', 'button');
    fab.setAttribute('aria-label', '打开智能健康助手');
    fab.tabIndex = 0;

    fab.innerHTML =
        '<div class="health-fab-ring"></div>' +
        '<div class="health-fab-inner">' +
            '<img class="health-fab-icon-img" id="fabIconImg" src="" alt="" style="display:none;">' +
            '<span class="health-fab-icon-emoji" id="fabIconEmoji">' + DEFAULT_ICON + '</span>' +
        '</div>' +
        '<div class="health-fab-badge" id="fabBadge">AI</div>' +
        '<div class="health-fab-pulse"></div>' +
        '<div class="health-fab-tooltip">智能健康助手</div>';

    document.body.appendChild(fab);
    fabEl = fab;

    tryLoadIcon();

    clampPosition();
    applyPosition();

    fab.addEventListener('mousedown', onDragStart);
    fab.addEventListener('touchstart', onDragStart, { passive: false });
    fab.addEventListener('click', onClick);
    fab.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleAIChat();
        }
    });

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);

    window.addEventListener('resize', function() {
        clampPosition();
        applyPosition();
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    startIdleAnimation();
}

function tryLoadIcon() {
    var imgEl = document.getElementById('fabIconImg');
    if (!imgEl) return;

    var testImg = new Image();
    testImg.onload = function() {
        imgEl.src = './assets/health-avatar.png';
        imgEl.style.display = 'block';
        var emojiEl = document.getElementById('fabIconEmoji');
        if (emojiEl) emojiEl.style.display = 'none';
    };
    testImg.onerror = function() {
        imgEl.style.display = 'none';
        var emojiEl = document.getElementById('fabIconEmoji');
        if (emojiEl) emojiEl.style.display = 'block';
    };
    testImg.src = './assets/health-avatar.png';
}

function handleVisibilityChange() {
    if (document.hidden) {
        hideFab();
    } else {
        showFab();
    }
}

function showFab() {
    if (!fabEl) return;
    fabVisible = true;
    fabEl.classList.add('visible');
    fabEl.classList.remove('hidden');
    clampPosition();
    applyPosition();
}

function hideFab() {
    if (!fabEl) return;
    fabVisible = false;
    fabEl.classList.add('hidden');
    fabEl.classList.remove('visible');
}

function onDragStart(e) {
    if (e.target.closest('.health-fab') !== fabEl && e.target !== fabEl) return;
    isDragging = true;
    hasMoved = false;

    var point = e.touches ? e.touches[0] : e;
    dragStartX = point.clientX;
    dragStartY = point.clientY;
    fabStartX = fabX;
    fabStartY = fabY;

    fabEl.classList.add('dragging');

    if (e.cancelable) e.preventDefault();
}

function onDragMove(e) {
    if (!isDragging) return;

    var point = e.touches ? e.touches[0] : e;
    var dx = point.clientX - dragStartX;
    var dy = point.clientY - dragStartY;

    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
        hasMoved = true;
    }

    fabX = fabStartX + dx;
    fabY = fabStartY - dy;

    clampPosition();
    applyPosition();

    if (e.cancelable) e.preventDefault();
}

function onDragEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    fabEl.classList.remove('dragging');

    if (hasMoved) {
        savePosition();
    }
}

var preventClick = false;
function onClick(e) {
    if (hasMoved) return;

    setTimeout(function() { preventClick = false; }, 10);

    try {
        if (typeof toggleAIChat === 'function') {
            toggleAIChat();
        } else if (typeof window.toggleAIChat === 'function') {
            window.toggleAIChat();
        }
    } catch (err) {}
}

var idleTimer = null;
function startIdleAnimation() {
    resetIdleTimer();
    var events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(function(evt) {
        document.addEventListener(evt, resetIdleTimer);
    });
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (fabEl) fabEl.classList.remove('idle');
    idleTimer = setTimeout(function() {
        if (fabEl && !isDragging) fabEl.classList.add('idle');
    }, 6000);
}

export function initHealthFab() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            createFab();
            setTimeout(function() { if (fabEl) fabEl.classList.add('visible'); }, 400);
        });
    } else {
        createFab();
        setTimeout(function() { if (fabEl) fabEl.classList.add('visible'); }, 400);
    }
}

export function showHealthFab() { showFab(); }
export function hideHealthFab() { hideFab(); }
export function updateFabIcon(emoji) {
    var el = document.getElementById('fabIconEmoji');
    if (el) el.textContent = emoji;
}

if (document.readyState !== 'loading') {
    createFab();
    setTimeout(function() { if (fabEl) fabEl.classList.add('visible'); }, 400);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        createFab();
        setTimeout(function() { if (fabEl) fabEl.classList.add('visible'); }, 400);
    });
}

window.initHealthFab = initHealthFab;
window.showHealthFab = showHealthFab;
window.hideHealthFab = hideHealthFab;
window.updateFabIcon = updateFabIcon;