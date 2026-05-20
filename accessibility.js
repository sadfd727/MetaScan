import { showNotification } from './notifications.js';

var FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
var focusTrapCleanups = new WeakMap();
var srStylesInjected = false;

function injectSROnlyCSS() {
    if (srStylesInjected) return;
    srStylesInjected = true;
    var style = document.createElement('style');
    style.id = 'sr-only-styles';
    style.textContent = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}' +
        '.sr-only-focusable:active,.sr-only-focusable:focus{position:static;width:auto;height:auto;overflow:visible;clip:auto;white-space:normal;}' +
        '.a11y-skip-link{position:fixed;top:-100%;left:0;z-index:10000;padding:8px 16px;background:#1a1a2e;color:#e0f7fa;font-size:14px;text-decoration:none;border-radius:0 0 4px 0;transition:top 0.15s ease;}' +
        '.a11y-skip-link:focus{top:0;outline:3px solid #26d0ce;outline-offset:2px;}' +
        '[data-focus-method="mouse"] :focus{outline:none!important;}' +
        '[data-focus-method="keyboard"] :focus-visible{outline:3px solid #26d0ce!important;outline-offset:2px!important;}' +
        '.a11y-loading-indicator[aria-busy="true"]::before{content:"";display:inline-block;width:16px;height:16px;border:2px solid #ccc;border-top-color:#1a2980;border-radius:50%;animation:a11y-spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;}' +
        '@keyframes a11y-spin{to{transform:rotate(360deg);}}' +
        '.a11y-error-summary{background:#fef2f2;border:2px solid #ef4444;border-radius:10px;padding:14px 18px;margin-bottom:16px;}' +
        '.a11y-error-summary h2{font-size:1rem;color:#dc2626;margin:0 0 8px 0;}' +
        '.a11y-error-summary ul{margin:0;padding-left:20px;}' +
        '.a11y-error-summary a{color:#dc2626;text-decoration:underline;}' +
        '.a11y-form-error{color:#dc2626;font-size:0.8rem;margin-top:4px;display:flex;align-items:center;gap:4px;}' +
        '.a11y-form-error::before{content:\"⚠️\";}';
    document.head.appendChild(style);
}

export function trapFocus(modalElement) {
    injectSROnlyCSS();
    var previousFocus = document.activeElement;

    if (!modalElement.hasAttribute('role')) {
        modalElement.setAttribute('role', 'dialog');
    }
    if (!modalElement.hasAttribute('aria-modal')) {
        modalElement.setAttribute('aria-modal', 'true');
    }

    var focusableElements = modalElement.querySelectorAll(FOCUSABLE_SELECTOR);
    var focusable = Array.prototype.filter.call(focusableElements, function(el) {
        return el.offsetParent !== null && !el.hasAttribute('disabled');
    });

    if (focusable.length === 0) {
        var firstBtn = modalElement.querySelector('button, input, select, textarea, [onclick]');
        if (firstBtn) {
            if (!firstBtn.hasAttribute('tabindex')) firstBtn.setAttribute('tabindex', '0');
            focusable = [firstBtn];
        }
    }

    if (focusable.length === 0) return function() {};

    var firstFocusable = focusable[0];
    var lastFocusable = focusable[focusable.length - 1];

    setTimeout(function() { firstFocusable.focus(); }, 50);

    function handleKeyDown(e) {
        if (e.key === 'Tab') {
            var currentFocusable = modalElement.querySelectorAll(FOCUSABLE_SELECTOR);
            var currentArr = Array.prototype.filter.call(currentFocusable, function(el) {
                return el.offsetParent !== null && !el.hasAttribute('disabled');
            });
            if (currentArr.length === 0) return;
            var first = currentArr[0];
            var last = currentArr[currentArr.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        if (e.key === 'Escape') {
            releaseTrap();
        }
    }

    modalElement.addEventListener('keydown', handleKeyDown);

    function releaseTrap() {
        modalElement.removeEventListener('keydown', handleKeyDown);
        focusTrapCleanups.delete(modalElement);
        if (previousFocus && typeof previousFocus.focus === 'function') {
            previousFocus.focus();
        }
    }

    focusTrapCleanups.set(modalElement, releaseTrap);

    return releaseTrap;
}

var skipLinkElement = null;

export function addSkipToContentLink() {
    injectSROnlyCSS();
    if (skipLinkElement) return;

    skipLinkElement = document.createElement('a');
    skipLinkElement.href = '#main';
    skipLinkElement.textContent = '跳到主要内容';
    skipLinkElement.className = 'a11y-skip-link';

    document.body.insertBefore(skipLinkElement, document.body.firstChild);

    skipLinkElement.addEventListener('click', function(e) {
        e.preventDefault();
        var main = document.getElementById('main') || document.querySelector('.container');
        if (!main) return;

        if (!main.hasAttribute('tabindex')) {
            main.setAttribute('tabindex', '-1');
        }
        main.focus({ preventScroll: false });
    });
}

var liveRegionPolite = null;
var liveRegionAssertive = null;
var loadingRegion = null;

function ensureLiveRegion(priority) {
    if (priority === 'assertive') {
        if (!liveRegionAssertive) {
            liveRegionAssertive = document.createElement('div');
            liveRegionAssertive.className = 'sr-only';
            liveRegionAssertive.setAttribute('aria-live', 'assertive');
            liveRegionAssertive.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegionAssertive);
        }
        return liveRegionAssertive;
    } else {
        if (!liveRegionPolite) {
            liveRegionPolite = document.createElement('div');
            liveRegionPolite.className = 'sr-only';
            liveRegionPolite.setAttribute('aria-live', 'polite');
            liveRegionPolite.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegionPolite);
        }
        return liveRegionPolite;
    }
}

function ensureLoadingRegion() {
    injectSROnlyCSS();
    if (!loadingRegion) {
        loadingRegion = document.createElement('div');
        loadingRegion.className = 'sr-only';
        loadingRegion.setAttribute('aria-live', 'polite');
        loadingRegion.setAttribute('aria-atomic', 'true');
        loadingRegion.setAttribute('role', 'status');
        document.body.appendChild(loadingRegion);
    }
    return loadingRegion;
}

export function announce(message, priority) {
    injectSROnlyCSS();
    priority = priority || 'polite';
    var region = ensureLiveRegion(priority);
    region.textContent = '';
    setTimeout(function() {
        region.textContent = message;
    }, 50);
}

export function announceLoading(start, message) {
    injectSROnlyCSS();
    var region = ensureLoadingRegion();
    if (start) {
        region.textContent = message || '正在加载，请稍候...';
    } else {
        region.textContent = '加载完成';
    }
}

export function announceError(message) {
    announce('错误：' + message, 'assertive');
}

export function announceSuccess(message) {
    announce('操作成功：' + message, 'polite');
}

var focusMethodStyleInjected = false;

export function initFocusRingManagement() {
    injectSROnlyCSS();
    var body = document.body;

    function setFocusMethod(method) {
        body.setAttribute('data-focus-method', method);
    }

    body.addEventListener('mousedown', function() {
        setFocusMethod('mouse');
    });

    body.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
            setFocusMethod('keyboard');
        }
    });

    setFocusMethod('keyboard');
}

export function initRovingTabindex(containerSelector) {
    var container = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!container) return;

    var tabs = container.querySelectorAll('[role="tab"]');
    if (tabs.length === 0) return;

    var tabArray = Array.prototype.slice.call(tabs);

    function setActiveTab(index) {
        tabArray.forEach(function(tab, i) {
            tab.setAttribute('tabindex', i === index ? '0' : '-1');
            tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
    }

    setActiveTab(0);

    container.addEventListener('keydown', function(e) {
        var currentIndex = tabArray.indexOf(document.activeElement);
        if (currentIndex === -1) return;

        var handled = false;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            var nextIndex = currentIndex + 1;
            if (nextIndex >= tabArray.length) nextIndex = 0;
            setActiveTab(nextIndex);
            tabArray[nextIndex].focus();
            tabArray[nextIndex].click();
            handled = true;
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            var prevIndex = currentIndex - 1;
            if (prevIndex < 0) prevIndex = tabArray.length - 1;
            setActiveTab(prevIndex);
            tabArray[prevIndex].focus();
            tabArray[prevIndex].click();
            handled = true;
        }

        if (e.key === 'Home') {
            e.preventDefault();
            setActiveTab(0);
            tabArray[0].focus();
            tabArray[0].click();
            handled = true;
        }

        if (e.key === 'End') {
            e.preventDefault();
            var lastIndex = tabArray.length - 1;
            setActiveTab(lastIndex);
            tabArray[lastIndex].focus();
            tabArray[lastIndex].click();
            handled = true;
        }
    });

    container.addEventListener('click', function(e) {
        var tab = e.target.closest('[role="tab"]');
        if (!tab) return;

        var index = tabArray.indexOf(tab);
        if (index !== -1) {
            setActiveTab(index);
        }
    });
}

export function injectARIALandmarks() {
    var header = document.querySelector('header') || document.querySelector('.header');
    if (header && !header.hasAttribute('role')) {
        header.setAttribute('role', 'banner');
    }

    var navs = document.querySelectorAll('nav');
    navs.forEach(function(nav, i) {
        if (!nav.hasAttribute('role')) nav.setAttribute('role', 'navigation');
        if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', '主导航 ' + (i + 1));
    });

    var mainArea = document.getElementById('main') || document.querySelector('.container');
    if (mainArea && !mainArea.hasAttribute('role')) {
        mainArea.setAttribute('role', 'main');
        if (!mainArea.hasAttribute('id')) mainArea.setAttribute('id', 'main');
    }

    var footer = document.querySelector('footer');
    if (footer && !footer.hasAttribute('role')) {
        footer.setAttribute('role', 'contentinfo');
    }

    var asides = document.querySelectorAll('aside, .sidebar, .side-panel');
    asides.forEach(function(aside) {
        if (!aside.hasAttribute('role')) aside.setAttribute('role', 'complementary');
    });

    document.querySelectorAll('section').forEach(function(sec) {
        if (!sec.hasAttribute('role')) sec.setAttribute('role', 'region');
        if (!sec.hasAttribute('aria-label') && !sec.hasAttribute('aria-labelledby')) {
            var heading = sec.querySelector('h1,h2,h3,h4,h5,h6');
            if (heading) {
                var headingId = heading.getAttribute('id');
                if (!headingId) {
                    headingId = 'section-heading-' + Math.random().toString(36).substr(2, 8);
                    heading.setAttribute('id', headingId);
                }
                sec.setAttribute('aria-labelledby', headingId);
            }
        }
    });

    injectAriaExpandedOnToggles();
}

export function injectAriaExpandedOnToggles() {
    document.querySelectorAll('.dropdown-toggle, .accordion-header, .collapsible-trigger, [data-toggle]').forEach(function(el) {
        if (!el.hasAttribute('aria-expanded')) {
            el.setAttribute('aria-expanded', 'false');
            el.setAttribute('role', 'button');

            el.addEventListener('click', function() {
                var current = el.getAttribute('aria-expanded') === 'true';
                el.setAttribute('aria-expanded', current ? 'false' : 'true');
            });
        }
    });
}

export function associateFormErrors(formElement, errors) {
    if (!formElement) return;

    formElement.querySelectorAll('.a11y-form-error, .field-error').forEach(function(err) {
        err.remove();
    });

    formElement.querySelectorAll('[aria-invalid]').forEach(function(el) {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
    });

    if (!errors || Object.keys(errors).length === 0) return;

    var summaryId = 'form-errors-' + Date.now();
    var summary = document.createElement('div');
    summary.className = 'a11y-error-summary';
    summary.setAttribute('role', 'alert');
    summary.id = summaryId;
    summary.innerHTML = '<h2>表单包含 ' + Object.keys(errors).length + ' 个错误，请修正后重新提交</h2><ul>' +
        Object.keys(errors).map(function(field) {
            return '<li><a href="#' + field + '" onclick="var el=document.getElementById(\'' + field + '\');if(el)el.focus();">' + errors[field] + '</a></li>';
        }).join('') +
        '</ul>';
    formElement.insertBefore(summary, formElement.firstChild);
    summary.focus();

    Object.keys(errors).forEach(function(field) {
        var input = formElement.querySelector('#' + field + ', [name="' + field + '"]');
        if (input) {
            input.setAttribute('aria-invalid', 'true');
            var errorId = field + '-error';
            input.setAttribute('aria-describedby', errorId);

            var errorEl = document.createElement('div');
            errorEl.className = 'a11y-form-error';
            errorEl.id = errorId;
            errorEl.textContent = errors[field];
            input.parentNode.appendChild(errorEl);
        }
    });

    announce('表单包含 ' + Object.keys(errors).length + ' 个错误，请修正后重新提交', 'assertive');
}

export function setElementLoading(element, loading) {
    if (!element) return;
    if (loading) {
        element.setAttribute('aria-busy', 'true');
        if (!element.classList.contains('a11y-loading-indicator')) {
            element.classList.add('a11y-loading-indicator');
        }
        announceLoading(true, '正在加载内容');
    } else {
        element.removeAttribute('aria-busy');
        element.classList.remove('a11y-loading-indicator');
        announceLoading(false);
    }
}

export function ensureAriaLabels() {
    injectSROnlyCSS();
    var btnSelector = 'button, [onclick], [role="button"], .btn, .clickable';
    document.querySelectorAll(btnSelector).forEach(function(el) {
        if (!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON' && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') {
            el.setAttribute('tabindex', '0');
        }
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !el.hasAttribute('aria-hidden')) {
            var label = (el.textContent || '').trim().slice(0, 60);
            if (!label) {
                label = el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('data-label') || el.getAttribute('data-i18n-aria') || '';
            }
            if (label && label.length > 0 && label.length < 200) {
                el.setAttribute('aria-label', label);
            }
        }
    });

    document.querySelectorAll('img:not([alt])').forEach(function(img) {
        var nearestLabel = img.closest('button') || img.closest('a') || img.closest('[title]');
        var altText = nearestLabel ? (nearestLabel.getAttribute('aria-label') || nearestLabel.getAttribute('title') || '图片') : '图片';
        img.setAttribute('alt', altText);
    });

    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(function(input) {
        var label = document.querySelector('label[for="' + input.id + '"]');
        if (label) {
            var labelText = label.textContent.trim();
            if (labelText && labelText.length < 200) {
                input.setAttribute('aria-label', labelText);
            }
        }
    });
}

var auditResultCache = null;

export async function runA11yAudit(options) {
    options = options || {};
    try {
        var axe = await import('axe-core');
        axe.default.configure({
            branding: { application: 'MetaScan' }
        });

        var context = options.context || document;
        var axeOptions = options.axeOptions || {
            runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
            }
        };

        var results = await axe.default.run(context, axeOptions);

        var summary = {
            timestamp: new Date().toISOString(),
            totalViolations: results.violations.length,
            totalPasses: results.passes.length,
            totalIncomplete: results.incomplete.length,
            violationsBySeverity: { critical: 0, serious: 0, moderate: 0, minor: 0 },
            violations: [],
            score: 100
        };

        var severityWeights = { critical: 10, serious: 5, moderate: 2, minor: 1 };

        results.violations.forEach(function(v) {
            var severity = v.impact || 'moderate';
            summary.violationsBySeverity[severity] = (summary.violationsBySeverity[severity] || 0) + 1;
            summary.violations.push({
                id: v.id,
                impact: severity,
                description: v.description,
                help: v.help,
                helpUrl: v.helpUrl,
                nodesCount: v.nodes.length,
                tags: v.tags
            });
        });

        var totalDeductions = 0;
        results.violations.forEach(function(v) {
            var weight = severityWeights[v.impact] || 1;
            totalDeductions += weight * v.nodes.length;
        });
        summary.score = Math.max(0, 100 - Math.min(totalDeductions, 60));
        auditResultCache = summary;

        return summary;
    } catch (e) {
        console.error('A11y audit failed:', e);
        return {
            timestamp: new Date().toISOString(),
            totalViolations: 0,
            score: 0,
            error: e.message
        };
    }
}

export function getLatestAuditResult() {
    return auditResultCache;
}

export function generateA11ySummaryHTML(summary) {
    if (!summary) return '<p>暂无审计数据，请运行 runA11yAudit()</p>';

    var scoreColor = summary.score >= 90 ? '#16a34a' : summary.score >= 70 ? '#d97706' : '#ef4444';
    var scoreLabel = summary.score >= 90 ? '优秀' : summary.score >= 70 ? '良好' : '需改进';

    return '<div style="background:white;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">' +
        '<h2 style="color:#1a2980;margin:0 0 16px 0;font-size:1.2rem;">♿ WCAG 2.1 AA 可访问性审计</h2>' +
        '<div style="display:flex;gap:20px;align-items:center;margin-bottom:20px;">' +
        '<div style="text-align:center;">' +
        '<div style="font-size:3rem;color:' + scoreColor + ';font-weight:700;">' + summary.score + '</div>' +
        '<div style="color:' + scoreColor + ';font-size:0.9rem;font-weight:600;">' + scoreLabel + '</div>' +
        '<div style="color:#94a3b8;font-size:0.75rem;">可访问性评分</div></div>' +
        '<div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
        '<div style="background:#fef2f2;padding:8px 14px;border-radius:8px;font-size:0.85rem;"><strong style="color:#dc2626;">违规:</strong> ' + summary.totalViolations + '</div>' +
        '<div style="background:#fef3c7;padding:8px 14px;border-radius:8px;font-size:0.85rem;"><strong style="color:#d97706;">不完整:</strong> ' + (summary.totalIncomplete || 0) + '</div>' +
        '<div style="background:#f0fdf4;padding:8px 14px;border-radius:8px;font-size:0.85rem;"><strong style="color:#16a34a;">通过:</strong> ' + (summary.totalPasses || 0) + '</div>' +
        '</div>' +
        '<div style="margin-top:8px;font-size:0.8rem;color:#64748b;">审计时间: ' + summary.timestamp + '</div>' +
        '</div></div>' +
        (summary.violations && summary.violations.length > 0 ?
        '<div style="margin-top:16px;"><strong style="color:#dc2626;">违规详情 (' + summary.totalViolations + ' 项):</strong>' +
        summary.violations.map(function(v, i) {
            return '<div style="margin-top:8px;padding:10px 14px;background:#fef2f2;border-radius:8px;border-left:3px solid ' + (v.impact === 'critical' ? '#dc2626' : v.impact === 'serious' ? '#d97706' : '#94a3b8') + ';">' +
                '<strong>' + (i + 1) + '. [' + v.impact.toUpperCase() + ']</strong> ' + v.help +
                '<div style="font-size:0.8rem;color:#64748b;margin-top:4px;">影响: ' + v.nodesCount + ' 处 | 标签: ' + (v.tags || []).join(', ') + '</div>' +
                '</div>';
        }).join('') + '</div>' : '') +
        '</div>';
}

export function initAccessibilityEnhancements() {
    injectSROnlyCSS();
    addSkipToContentLink();
    initFocusRingManagement();
    injectARIALandmarks();
    ensureAriaLabels();
}

window.__a11yRerun = function() {
    injectARIALandmarks();
    ensureAriaLabels();
};