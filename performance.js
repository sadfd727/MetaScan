var chartObservers = {};
var registeredCharts = [];

var SKELETON_CSS_INJECTED = false;

function injectSkeletonCSS() {
    if (SKELETON_CSS_INJECTED) return;
    SKELETON_CSS_INJECTED = true;
    var style = document.createElement('style');
    style.textContent = '\
.chart-skeleton{position:relative;min-height:300px;background:#f8fafc;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;}\
.chart-skeleton::before{content:"";position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent);animation:shimmer 1.5s infinite;}\
.chart-skeleton-inner{display:flex;align-items:center;gap:12px;color:#94a3b8;font-size:0.9rem;z-index:1;}\
.chart-skeleton-inner .spinner{border:3px solid #e2e8f0;border-top-color:#1a2980;border-radius:50%;width:24px;height:24px;animation:spin 0.8s linear infinite;}\
@keyframes shimmer{to{left:100%}}\
@keyframes spin{to{transform:rotate(360deg)}}\
.virtual-list-scroller{overflow-y:auto;position:relative;will-change:transform;}\
.virtual-list-item{position:absolute;left:0;right:0;box-sizing:border-box;}\
.history-limit-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;color:#1e40af;font-size:0.8rem;font-weight:500;margin:8px 0;}\
.history-limit-badge button{border:none;background:#1a2980;color:white;padding:4px 12px;border-radius:12px;cursor:pointer;font-size:0.75rem;font-weight:600;}\
.history-limit-badge button:hover{opacity:0.85;}\
';
    document.head.appendChild(style);
}

injectSkeletonCSS();

export function observeChart(canvasId, renderFn) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (chartObservers[canvasId]) {
        chartObservers[canvasId].disconnect();
    }

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
                chartObservers[canvasId] = null;
            }
        });
    }, { rootMargin: '200px' });

    observer.observe(canvas);
    chartObservers[canvasId] = observer;
}

export function registerChartsEager(ids) {
    ids.forEach(function(id) {
        var canvas = document.getElementById(id);
        if (canvas) {
            var wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.classList.remove('chart-skeleton');
                var inner = wrapper.querySelector('.chart-skeleton-inner');
                if (inner) inner.remove();
            }
        }
    });
}

export function renderWithObserver(canvasId, renderFn) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var rect = canvas.getBoundingClientRect();
    var inViewport = (
        rect.top < (window.innerHeight || document.documentElement.clientHeight) + 200 &&
        rect.bottom > -200
    );

    if (inViewport) {
        if (canvas.closest) {
            var wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.classList.remove('chart-skeleton');
                var inner = wrapper.querySelector('.chart-skeleton-inner');
                if (inner) inner.remove();
            }
        }
        renderFn();
    } else {
        observeChart(canvasId, renderFn);
    }
}

export function disconnectAllChartObservers() {
    Object.keys(chartObservers).forEach(function(key) {
        if (chartObservers[key]) chartObservers[key].disconnect();
    });
    chartObservers = {};
}

export function VirtualList(container, itemHeight, renderFn) {
    this.container = container;
    this.itemHeight = itemHeight || 80;
    this.renderFn = renderFn;
    this.items = [];
    this.visibleRange = { start: 0, end: 0 };
    this.renderedNodes = [];
    this.bufferSize = 3;
    this._scrollHandler = null;
    this._resizeHandler = null;

    container.classList.add('virtual-list-scroller');

    var self = this;

    this.setItems = function(items) {
        self.items = items;
        self.container.innerHTML = '';
        var spacer = document.createElement('div');
        spacer.className = 'virtual-list-spacer';
        spacer.style.height = (items.length * self.itemHeight) + 'px';
        spacer.style.position = 'relative';
        self.container.appendChild(spacer);
        self.spacer = spacer;

        self.renderedNodes.forEach(function(n) { if (n.parentNode) n.parentNode.removeChild(n); });
        self.renderedNodes = [];
        self.visibleRange = { start: -1, end: -1 };
        self.renderVisible();
    };

    this.renderVisible = function() {
        var scrollTop = self.container.scrollTop;
        var containerHeight = self.container.clientHeight || 400;
        var start = Math.max(0, Math.floor(scrollTop / self.itemHeight) - self.bufferSize);
        var end = Math.min(self.items.length, Math.ceil((scrollTop + containerHeight) / self.itemHeight) + self.bufferSize);

        if (start === self.visibleRange.start && end === self.visibleRange.end && self.renderedNodes.length > 0) return;
        self.visibleRange = { start: start, end: end };

        self.renderedNodes.forEach(function(node) { if (node.parentNode) node.parentNode.removeChild(node); });
        self.renderedNodes = [];

        for (var i = start; i < end; i++) {
            if (self.items[i]) {
                var node = self.renderFn(self.items[i], i);
                if (node) {
                    node.className = (node.className || '') + ' virtual-list-item';
                    node.style.position = 'absolute';
                    node.style.top = (i * self.itemHeight) + 'px';
                    node.style.left = '0';
                    node.style.right = '0';
                    node.style.height = self.itemHeight + 'px';
                    if (self.spacer) self.spacer.appendChild(node);
                    self.renderedNodes.push(node);
                }
            }
        }
    };

    this.updateItemHeights = function(heights) {
        if (heights && heights.length === self.items.length) {
            var totalHeight = 0;
            for (var i = 0; i < self.items.length; i++) {
                totalHeight += (heights[i] || self.itemHeight);
            }
            if (self.spacer) self.spacer.style.height = totalHeight + 'px';
        }
    };

    var _onScroll = debounce(function() { self.renderVisible(); }, 16);
    this.container.addEventListener('scroll', _onScroll, { passive: true });
    this._scrollHandler = _onScroll;

    var _onResize = debounce(function() { self.renderVisible(); }, 50);
    window.addEventListener('resize', _onResize);
    this._resizeHandler = _onResize;

    this.scrollToIndex = function(index) {
        if (self.spacer && index >= 0 && index < self.items.length) {
            self.container.scrollTop = index * self.itemHeight;
            self.renderVisible();
        }
    };

    this.getScrollPosition = function() {
        return self.container.scrollTop;
    };

    this.destroy = function() {
        if (self._scrollHandler) self.container.removeEventListener('scroll', self._scrollHandler);
        if (self._resizeHandler) window.removeEventListener('resize', self._resizeHandler);
        self.renderedNodes.forEach(function(n) { if (n.parentNode) n.parentNode.removeChild(n); });
        if (self.spacer && self.spacer.parentNode) self.spacer.parentNode.removeChild(self.spacer);
        self.items = [];
        self.renderedNodes = [];
    };
}

export function createPatientVirtualList(container, patients, onPatientClick) {
    if (!container) return null;

    if (container._virtualList) {
        container._virtualList.destroy();
    }

    var vl = new VirtualList(container, 100, function(patient, index) {
        var div = document.createElement('div');
        div.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background 0.15s;';
        div.onmouseenter = function() { div.style.background = '#f8fafc'; };
        div.onmouseleave = function() { div.style.background = 'transparent'; };

        var patientData = [];
        try {
            var raw = localStorage.getItem('metascanData_' + patient.username);
            if (raw) patientData = JSON.parse(raw);
        } catch (e) {}

        var hasData = patientData.length > 0;
        var lastRecord = hasData ? patientData[patientData.length - 1] : null;
        var risk = lastRecord ? lastRecord.overallRisk : null;
        var riskLevel = risk !== null ? (risk < 30 ? '低' : risk < 60 ? '中' : '高') : '--';
        var riskColor = risk !== null ? (risk < 30 ? '#10b981' : risk < 60 ? '#f59e0b' : '#ef4444') : '#94a3b8';
        var date = lastRecord ? (lastRecord.date || lastRecord.timestamp || '') : '';
        if (date && date.length > 10) date = date.substring(0, 10);

        var displayName = patient.fullName || patient.username;

        div.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;height:100%;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
            '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1a2980,#26d0ce);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.9rem;">' +
            (displayName.charAt(0).toUpperCase()) +
            '</div>' +
            '<div><div style="font-weight:600;color:#1e293b;font-size:0.9rem;">' + displayName + '</div>' +
            (date ? '<div style="font-size:0.75rem;color:#94a3b8;">最近检测：' + date + '</div>' : '<div style="font-size:0.75rem;color:#94a3b8;">暂无数据</div>') +
            '</div></div>' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
            (risk !== null ? '<div style="text-align:right;"><div style="font-weight:700;font-size:1.1rem;color:' + riskColor + ';">' + risk.toFixed(0) + '</div><div style="font-size:0.7rem;color:' + riskColor + ';">' + riskLevel + '风险</div></div>' : '<span style="color:#94a3b8;font-size:0.8rem;">--</span>') +
            '<div style="color:#cbd5e1;">→</div></div>';

        div.onclick = function() {
            if (onPatientClick) onPatientClick(patient);
        };

        return div;
    });

    vl.setItems(patients);
    container._virtualList = vl;
    return vl;
}

export function limitHistoricalData(data, maxRecords) {
    maxRecords = maxRecords || 10;
    if (!data || data.length <= maxRecords) return data;
    return data.slice(-maxRecords);
}

export function hasMoreData(data, maxRecords) {
    return data && data.length > (maxRecords || 10);
}

export function showHistoryLimitBadge(container, data, maxRecords, onLoadMore) {
    maxRecords = maxRecords || 10;
    if (!data || data.length <= maxRecords) return;

    var existingBadge = container.querySelector('.history-limit-badge');
    if (existingBadge) existingBadge.remove();

    var badge = document.createElement('div');
    badge.className = 'history-limit-badge';
    badge.innerHTML = '📊 显示最近' + maxRecords + '条记录（共' + data.length + '条）';

    if (onLoadMore) {
        var btn = document.createElement('button');
        btn.textContent = '查看全部';
        btn.onclick = function() {
            badge.remove();
            onLoadMore();
        };
        badge.appendChild(btn);
    }

    container.insertBefore(badge, container.firstChild);
}

export function debounce(fn, delay) {
    var timer = null;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() { fn.apply(context, args); }, delay);
    };
}

export function afterPaint(callback) {
    if (typeof requestAnimationFrame === 'function') {
        return requestAnimationFrame(function() {
            requestAnimationFrame(callback);
        });
    }
    return setTimeout(callback, 0);
}