import { showNotification } from './notifications.js';

export function initTheme() {
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

export function toggleTheme() {
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('metascanTheme', newTheme);
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var icon = document.getElementById('themeToggleIcon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ==================== 无障碍访问系统 ====================
export function initAccessibility() {
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

export function initKeyboardNavigation() {
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

export function toggleHighContrast() {
    var current = document.documentElement.getAttribute('data-contrast') === 'high';
    var enabled = !current;
    applyHighContrast(enabled);
    localStorage.setItem('metascanContrast', enabled ? 'high' : 'normal');
    showNotification(enabled ? '🔲 高对比度模式已开启' : '🔲 高对比度模式已关闭');
}

export function applyHighContrast(enabled) {
    document.documentElement.setAttribute('data-contrast', enabled ? 'high' : '');
}

export function announceToScreenReader(message) {
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