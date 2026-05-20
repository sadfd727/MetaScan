export function initParticleBackground() {
    var container = document.createElement('div');
    container.className = 'particle-container';
    container.id = 'particleBg';
    document.body.prepend(container);

    var canvas = document.createElement('canvas');
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var particles = [];
    var maxParticles = 40;
    var colors = ['rgba(26,41,128,0.12)', 'rgba(38,208,206,0.10)', 'rgba(102,126,234,0.08)', 'rgba(129,212,250,0.10)'];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            dx: (Math.random() - 0.5) * 0.6,
            dy: (Math.random() - 0.5) * 0.6,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: Math.random() * 300 + 200
        };
    }

    for (var i = 0; i < maxParticles; i++) {
        particles.push(createParticle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(function(p, i) {
            p.x += p.dx;
            p.y += p.dy;
            p.life--;

            if (p.life <= 0 || p.x < -10 || p.x > canvas.width + 10 || p.y < -10 || p.y > canvas.height + 10) {
                particles[i] = createParticle();
                return;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            for (var j = i + 1; j < particles.length; j++) {
                var q = particles[j];
                var dist = Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
                if (dist < 140) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = 'rgba(26,41,128,' + (0.04 * (1 - dist / 140)).toFixed(3) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        });

        requestAnimationFrame(animate);
    }

    animate();
}

export function initScrollReveal() {
    var observerOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    function observeSections() {
        var sections = document.querySelectorAll('.reveal-section');
        sections.forEach(function(section) { observer.observe(section); });
    }

    observeSections();

    window._reObserveScrollReveal = observeSections;
}

export function renderPathwayNetwork(containerId, pathwayScores, matchResults) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var pathways = [
        { id: 'amino_acid', name: '氨基酸代谢', icon: '🧬', desc: '蛋白质与肌肉健康', score: pathwayScores.amino_acid || 0 },
        { id: 'carbohydrate', name: '糖分代谢', icon: '🍚', desc: '血糖与能量供应', score: pathwayScores.carbohydrate || 0 },
        { id: 'organic_acid', name: '能量代谢', icon: '⚡', desc: '细胞能量工厂(TCA循环)', score: pathwayScores.organic_acid || 0 },
        { id: 'sulfur', name: '解毒与抗氧化', icon: '🛡️', desc: '肝脏解毒与细胞保护', score: pathwayScores.sulfur || 0 },
        { id: 'nitrogen', name: '肾脏排泄功能', icon: '🫘', desc: '尿酸、肌酐等代谢废物', score: pathwayScores.nitrogen || 0 },
        { id: 'xenobiotic', name: '药物与毒素代谢', icon: '💊', desc: '外源物质分解与排出', score: pathwayScores.xenobiotic || 0 }
    ];

    var abnormalCount = 0;
    if (matchResults) {
        matchResults.forEach(function(m) {
            if (m.status === 'low' || m.status === 'high') abnormalCount++;
        });
    }

    var html = '';

    html += '<div style="text-align:center;margin-bottom:20px;">';
    if (abnormalCount === 0) {
        html += '<div style="font-size:3rem;margin-bottom:8px;">✅</div>';
        html += '<div style="font-size:1.2rem;font-weight:700;color:#16a34a;">您的代谢指标整体表现良好</div>';
        html += '<div style="color:#64748b;font-size:0.95rem;margin-top:4px;">所有检测指标均在参考范围内</div>';
    } else if (abnormalCount <= 3) {
        html += '<div style="font-size:3rem;margin-bottom:8px;">⚠️</div>';
        html += '<div style="font-size:1.2rem;font-weight:700;color:#d97706;">部分指标需要关注</div>';
        html += '<div style="color:#64748b;font-size:0.95rem;margin-top:4px;">有 <b style="color:#d97706;">' + abnormalCount + '</b> 项指标不在正常范围，建议咨询医生</div>';
    } else {
        html += '<div style="font-size:3rem;margin-bottom:8px;">🔴</div>';
        html += '<div style="font-size:1.2rem;font-weight:700;color:#dc2626;">多个指标出现异常</div>';
        html += '<div style="color:#64748b;font-size:0.95rem;margin-top:4px;">有 <b style="color:#dc2626;">' + abnormalCount + '</b> 项指标不在正常范围，请尽快就医</div>';
    }
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">';

    pathways.forEach(function(p) {
        var statusColor, statusBg, statusIcon, statusText, barColor;
        if (p.score <= 30) {
            statusColor = '#16a34a';
            statusBg = '#f0fdf4';
            statusIcon = '✅';
            statusText = '状态良好';
            barColor = '#16a34a';
        } else if (p.score <= 60) {
            statusColor = '#d97706';
            statusBg = '#fffbeb';
            statusIcon = '⚠️';
            statusText = '需要注意';
            barColor = '#f59e0b';
        } else {
            statusColor = '#dc2626';
            statusBg = '#fef2f2';
            statusIcon = '🔴';
            statusText = '需要关注';
            barColor = '#ef4444';
        }

        html += '<div style="background:white;border-radius:18px;padding:20px 16px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:2px solid ' + statusBg + ';transition:transform 0.2s;" onmouseover="this.style.transform=\'translateY(-3px)\'" onmouseout="this.style.transform=\'translateY(0)\'">';

        html += '<div style="font-size:2.4rem;margin-bottom:8px;">' + p.icon + '</div>';
        html += '<div style="font-size:1.1rem;font-weight:800;color:#1e293b;margin-bottom:4px;">' + p.name + '</div>';
        html += '<div style="font-size:0.82rem;color:#94a3b8;margin-bottom:12px;">' + p.desc + '</div>';

        // 彩色进度条
        html += '<div style="height:10px;background:#e2e8f0;border-radius:6px;margin:0 8px 10px 8px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + Math.min(100, Math.max(0, p.score)) + '%;background:' + barColor + ';border-radius:6px;transition:width 1.2s ease;"></div>';
        html += '</div>';

        // 状态徽章
        html += '<span style="display:inline-block;padding:6px 16px;border-radius:12px;font-weight:700;font-size:0.9rem;background:' + statusBg + ';color:' + statusColor + ';">';
        html += statusIcon + ' ' + statusText;
        html += '</span>';

        html += '</div>';
    });

    html += '</div>';

    // 简单说明
    html += '<div style="text-align:center;margin-top:16px;color:#94a3b8;font-size:0.85rem;">';
    html += '🟢 绿色 = 健康 | 🟡 黄色 = 关注 | 🔴 红色 = 建议就医';
    html += '</div>';

    container.innerHTML = html;
}

export function renderPathwayGauge(containerId, label, score, color) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var radius = 48;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - score / 100);

    container.innerHTML = '<div class="pathway-gauge" style="margin:0 auto;">'
        + '<svg width="120" height="120" viewBox="0 0 120 120">'
        + '<circle class="gauge-track" cx="60" cy="60" r="' + radius + '"/>'
        + '<circle class="gauge-fill" cx="60" cy="60" r="' + radius + '" style="stroke:' + color + ';stroke-dasharray:' + circumference + ';stroke-dashoffset:' + circumference + ';" id="gaugeFill_' + containerId + '"/>'
        + '</svg>'
        + '<div class="gauge-label" style="color:' + color + ';">' + score + '%</div>'
        + '</div>'
        + '<div style="text-align:center;margin-top:8px;font-weight:600;color:#1a2980;">' + label + '</div>';

    setTimeout(function() {
        var fill = document.getElementById('gaugeFill_' + containerId);
        if (fill) fill.style.strokeDashoffset = offset;
    }, 200);
}

export function renderVideoEmbed(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''
        + '<div class="video-embed-wrapper">'
        + '<iframe src="https://www.youtube.com/embed/_vNaxBqKxUo?rel=0&modestbranding=1" '
        + 'title="代谢组学概述" frameborder="0" '
        + 'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" '
        + 'allowfullscreen loading="lazy"></iframe>'
        + '</div>'
        + '<p style="text-align:center;color:#94a3b8;font-size:0.82rem;margin-top:10px;">🎬 代谢组学概述 | 来源: Metabolomics Overview</p>';
}

export function createBubbleEffect(element) {
    if (!element) return;
    var rect = element.getBoundingClientRect();
    var bubble = document.createElement('div');
    bubble.className = 'bubble-anim';
    bubble.style.left = (Math.random() * rect.width) + 'px';
    bubble.style.bottom = '0px';
    bubble.style.width = (Math.random() * 20 + 8) + 'px';
    bubble.style.height = bubble.style.width;
    bubble.style.background = 'rgba(38,208,206,' + (Math.random() * 0.3 + 0.1) + ')';
    element.style.position = element.style.position || 'relative';
    element.style.overflow = element.style.overflow || 'hidden';
    element.appendChild(bubble);
    setTimeout(function() { if (bubble.parentNode) bubble.parentNode.removeChild(bubble); }, 3000);
}