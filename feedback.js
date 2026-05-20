const FeedbackSystem = {
    audioContext: null,
    soundEnabled: true,
    initialized: false,

    toastQueue: [],
    isShowingToast: false,
    maxToasts: 5,
    defaultDuration: 3000,

    confirmationCallback: null,

    performanceMetrics: {
        totalInteractions: 0,
        avgResponseTime: 0,
        lastInteractionTime: 0
    },

    init() {
        if (this.initialized) return;

        this.initAudioContext();

        this.bindGlobalEvents();

        setTimeout(() => this.showSoundIndicator(), 1000);

        this.initialized = true;
    },

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('⚠️ Web Audio API 不可用:', e);
            this.soundEnabled = false;
        }
    },

    ensureAudioContext() {
        if (!this.audioContext) return false;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return true;
    },

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
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.05);
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                oscillator.start(now);
                oscillator.stop(now + 0.08);
                break;

            case 'success':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523, now);
                oscillator.frequency.setValueAtTime(659, now + 0.1);
                oscillator.frequency.setValueAtTime(784, now + 0.2);
                gainNode.gain.setValueAtTime(volume * 0.8, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;

            case 'error':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.frequency.setValueAtTime(150, now + 0.15);
                gainNode.gain.setValueAtTime(volume * 0.6, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;

            case 'warning':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(440, now);
                oscillator.frequency.setValueAtTime(440, now + 0.12);
                oscillator.frequency.setValueAtTime(350, now + 0.24);
                gainNode.gain.setValueAtTime(volume * 0.7, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                oscillator.start(now);
                oscillator.stop(now + 0.35);
                break;

            case 'info':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(600, now);
                oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                gainNode.gain.setValueAtTime(volume * 0.6, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;

            case 'important':
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
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(400, now);
                oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.25);
                gainNode.gain.setValueAtTime(volume * 0.5, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;

            case 'notification':
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

        const container = document.getElementById('toast-container');
        if (container && container.children.length >= this.maxToasts) {
            container.removeChild(container.firstChild);
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${config.type}`;

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

        if (container) {
            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add('toast-show');
            });

            if (config.sound) {
                this.playSound(config.type === 'success' ? 'success' : 
                               config.type === 'error' ? 'error' :
                               config.type === 'warning' ? 'warning' : 'info');
            }

            const timeoutId = setTimeout(() => {
                this.dismissToast(toast);
                if (config.callback) config.callback();
            }, config.duration);

            toast.dataset.timeoutId = timeoutId;
        }

        const endTime = performance.now();
        this.recordPerformance(endTime - startTime);
    },

    dismissToast(toastElement) {
        if (!toastElement) return;

        if (toastElement.dataset.timeoutId) {
            clearTimeout(parseInt(toastElement.dataset.timeoutId));
        }

        toastElement.classList.remove('toast-show');
        toastElement.classList.add('toast-hiding');

        setTimeout(() => {
            if (toastElement.parentElement) {
                toastElement.parentElement.removeChild(toastElement);
            }
        }, 400);
    },

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

            const config = {
                title: options.title || '确认操作？',
                message: options.message || '此操作无法撤销，确定要继续吗？',
                icon: options.icon || '❓',
                confirmText: options.confirmText || '确认',
                cancelText: options.cancelText || '取消',
                type: options.type || 'default'
            };

            iconEl.textContent = config.icon;
            titleEl.textContent = config.title;
            msgEl.textContent = config.message;
            okBtn.textContent = config.confirmText;

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

            this.confirmationCallback = resolve;

            this.playSound('important');

            overlay.classList.add('show');

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeConfirmation(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    },

    bindGlobalEvents() {
        const self = this;

        document.addEventListener('click', function(e) {
            const target = e.target.closest('button:not(.no-feedback):not([disabled])');
            if (!target) return;

            const startTime = performance.now();

            target.classList.add('btn-click-feedback');

            if (!target.classList.contains('btn-ripple')) {
                target.classList.add('btn-ripple');
            }

            target.classList.add('haptic-vibrate');
            setTimeout(() => {
                target.classList.remove('haptic-vibrate');
            }, 300);

            self.playSound('click', 0.2);

            setTimeout(() => {
                target.classList.remove('btn-click-feedback');
            }, 200);

            const endTime = performance.now();
            self.recordPerformance(endTime - startTime);
        }, { passive: true });

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

export { FeedbackSystem };
export default FeedbackSystem;

export function openFeedbackModal() {
    var overlay = document.getElementById('feedbackModalOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.getElementById('feedbackText').value = '';
        feedbackScreenshotData = null;
        var preview = document.getElementById('feedbackScreenshotPreview');
        if (preview) preview.style.display = 'none';
        document.body.style.overflow = 'hidden';
        setTimeout(function() {
            document.getElementById('feedbackText').focus();
        }, 300);
    }
}

export function closeFeedbackModal() {
    var overlay = document.getElementById('feedbackModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

export function captureFeedbackScreenshot() {
    if (typeof html2canvas === 'undefined') {
        showNotification('📸 截图功能需要页面完全加载，请稍后再试');
        return;
    }
    var fab = document.getElementById('feedbackFab');
    var overlay = document.getElementById('feedbackModalOverlay');
    var ratingOverlay = document.getElementById('ratingModalOverlay');
    if (fab) fab.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (ratingOverlay) ratingOverlay.style.display = 'none';
    html2canvas(document.body, {
        scale: 0.5,
        useCORS: true,
        allowTaint: true
    }).then(function(canvas) {
        feedbackScreenshotData = canvas.toDataURL('image/jpeg', 0.7);
        var preview = document.getElementById('feedbackScreenshotPreview');
        var img = document.getElementById('feedbackScreenshotImg');
        if (preview && img) {
            img.src = feedbackScreenshotData;
            preview.style.display = 'block';
        }
        if (fab) fab.style.display = 'flex';
        if (overlay) overlay.style.display = '';
        if (ratingOverlay) ratingOverlay.style.display = '';
        showNotification('📸 截图已生成，将随反馈一同提交');
    }).catch(function(err) {
        if (fab) fab.style.display = 'flex';
        if (overlay) overlay.style.display = '';
        if (ratingOverlay) ratingOverlay.style.display = '';
        showNotification('⚠️ 截图失败，请重试');
        console.error('Screenshot error:', err);
    });
}

export function submitFeedback() {
    var text = document.getElementById('feedbackText').value.trim();
    if (!text) {
        showNotification('⚠️ 请输入反馈内容');
        return;
    }
    var feedback = {
        text: text,
        screenshot: feedbackScreenshotData,
        timestamp: new Date().toISOString(),
        page: window.location.href,
        user: currentUser ? currentUser.username : 'guest'
    };
    var feedbacks = JSON.parse(localStorage.getItem('metascanFeedbacks') || '[]');
    feedbacks.unshift(feedback);
    if (feedbacks.length > 50) feedbacks.length = 50;
    localStorage.setItem('metascanFeedbacks', JSON.stringify(feedbacks));
    document.getElementById('feedbackText').value = '';
    feedbackScreenshotData = null;
    var preview = document.getElementById('feedbackScreenshotPreview');
    if (preview) preview.style.display = 'none';
    var modalContent = document.querySelector('.feedback-modal');
    if (modalContent) {
        modalContent.innerHTML =
            '<div class="feedback-success-check">✓</div>' +
            '<h3 style="text-align:center;">感谢您的反馈！</h3>' +
            '<p style="text-align:center;color:#64748b;margin-bottom:18px;">我们会认真阅读每一条意见，持续优化体验</p>' +
            '<button onclick="closeFeedbackModal()" style="width:100%;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%);color:white;font-weight:700;font-size:0.95rem;cursor:pointer;">关闭</button>';
    }
    setTimeout(function() {
        closeFeedbackModal();
        setTimeout(function() {
            var modal = document.querySelector('.feedback-modal');
            if (modal) {
                modal.innerHTML =
                    '<h3>💬 意见反馈</h3>' +
                    '<p class="feedback-subtitle">我们非常重视您的使用体验，请告诉我们您的想法或遇到的问题。</p>' +
                    '<textarea id="feedbackText" placeholder="请描述您遇到的问题、改进建议或任何想法..."></textarea>' +
                    '<button class="btn-feedback-screenshot" onclick="captureFeedbackScreenshot()">📸 截取当前页面</button>' +
                    '<div class="feedback-screenshot-preview" id="feedbackScreenshotPreview"><img id="feedbackScreenshotImg" src="" alt="截图预览"></div>' +
                    '<div class="feedback-actions"><button class="btn-feedback-cancel" onclick="closeFeedbackModal()">取消</button><button class="btn-feedback-submit" onclick="submitFeedback()">提交反馈</button></div>';
            }
        }, 500);
    }, 2000);
    showNotification('✅ 反馈提交成功，感谢您的宝贵意见！');
}

export function selectRating(star) {
    selectedRatingScore = star;
    document.querySelectorAll('.rating-stars .star-btn').forEach(function(btn, i) {
        if (i < star) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    document.getElementById('btnRatingSubmit').disabled = false;
    var emojis = ['😞', '😐', '😊', '😄', '🤩'];
    document.getElementById('ratingEmoji').textContent = emojis[star - 1] || '⭐';
}

export function skipRating() {
    if (currentUser) {
        localStorage.setItem('metascanRated_' + currentUser.username, 'skipped');
    }
    var overlay = document.getElementById('ratingModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

export function submitRating() {
    if (selectedRatingScore === 0) return;
    var suggestion = document.getElementById('ratingSuggestion').value.trim();
    var rating = {
        score: selectedRatingScore,
        suggestion: suggestion,
        timestamp: new Date().toISOString(),
        user: currentUser ? currentUser.username : 'guest',
        reportCount: currentUser ? (JSON.parse(localStorage.getItem('metascanData_' + currentUser.username) || '[]')).length : 0
    };
    var ratings = JSON.parse(localStorage.getItem('metascanRatings') || '[]');
    ratings.unshift(rating);
    if (ratings.length > 50) ratings.length = 50;
    localStorage.setItem('metascanRatings', JSON.stringify(ratings));
    if (currentUser) {
        localStorage.setItem('metascanRated_' + currentUser.username, 'done');
    }
    var overlay = document.getElementById('ratingModalOverlay');
    if (overlay) {
        var modal = document.querySelector('.rating-modal');
        if (modal) {
            var starsDisplay = '';
            for (var i = 0; i < selectedRatingScore; i++) starsDisplay += '⭐';
            modal.innerHTML =
                '<div class="feedback-success-check">✓</div>' +
                '<h3>感谢您的评价！</h3>' +
                '<div style="font-size:2rem;margin:12px 0;">' + starsDisplay + '</div>' +
                '<p style="color:#64748b;margin-bottom:18px;">您的反馈将帮助我们不断改进</p>' +
                '<button onclick="closeRatingModal()" style="width:100%;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;font-weight:700;font-size:0.95rem;cursor:pointer;">关闭</button>';
        }
        setTimeout(function() {
            closeRatingModal();
        }, 2500);
    }
    showNotification('⭐ 感谢您的 ' + selectedRatingScore + ' 星评价！');
}