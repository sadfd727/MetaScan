import { LANGUAGES } from './config.js';
import { showNotification } from './notifications.js';

export var currentLang = localStorage.getItem('metascanLang') || 'zh-CN';

export function t(key, lang) {
    lang = lang || currentLang;
    var dict = LANGUAGES[lang] || LANGUAGES['zh-CN'];
    return dict[key] || (LANGUAGES['zh-CN'][key] || key);
}

export function setLanguage(lang) {
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

export function applyTranslations() {
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

export function initI18n() {
    document.documentElement.setAttribute('lang', currentLang);
    applyTranslations();
}

export function renderLanguageSelector() {
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