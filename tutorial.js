var tutorialOpen = false;
var tutorialCurrentSection = null;
var onboardingActive = false;

// ==================== 教程数据 ====================
var TUTORIAL_DATA = {
    beginner: {
        title: '新手入门指南',
        icon: '🚀',
        sections: [
            {
                id: 'register',
                title: '1. 注册与登录',
                content: '<p><strong>步骤一：注册账号</strong></p>' +
                    '<p>在登录页面点击"创建新账户"，输入用户名和密码即可注册。</p>' +
                    '<p><strong>步骤二：登录</strong></p>' +
                    '<p>输入用户名和密码后点击"登录"。登录成功后进入主页仪表盘。</p>' +
                    '<div class="tutorial-tip">💡 提示：密码长度至少6位，用户名支持字母、数字和下划线</div>'
            },
            {
                id: 'first-data',
                title: '2. 录入代谢物浓度数据',
                content: '<p>切换到<strong>"数据"</strong>标签页，系统支持三种录入方式：</p>' +
                    '<ul><li><strong>📷 拍照识别</strong>：用摄像头拍摄化验单，AI自动识别代谢物数值</li>' +
                    '<li><strong>📝 手动录入</strong>：26种代谢物全部展示，按六大通路分组，直接填写浓度值</li>' +
                    '<li><strong>📋 历史记录</strong>：查看所有过往检测记录，支持时间筛选和CSV导出</li></ul>' +
                    '<p><strong>手动录入流程：</strong></p>' +
                    '<ol><li>选择检测日期</li><li>26种代谢物按通路分组（氨基酸代谢、糖分代谢、能量代谢等）</li>' +
                    '<li>在对应代谢物的输入框中填写浓度值（不需要填写的留空即可）</li>' +
                    '<li>系统自动比对参考范围，实时显示"正常/偏低/偏高"状态</li><li>确认并提交</li></ol>' +
                    '<div class="tutorial-tip">💡 提示：至少需要输入一项代谢物浓度才能生成报告</div>'
            },
            {
                id: 'first-report',
                title: '3. 查看健康评估报告',
                content: '<p>数据提交后，自动跳转到<strong>"报告"</strong>标签页。报告包含：</p>' +
                    '<ul><li><strong>📊 综合风险评分</strong>：0-100分，分数越高风险越大</li>' +
                    '<li><strong>🧪 健康摘要统计</strong>：检测数量、正常/异常指标数、涉及通路数</li>' +
                    '<li><strong>📈 六维风险雷达图</strong>：六大代谢通路评分可视化</li>' +
                    '<li><strong>🎯 异常分布饼图</strong>：正常/偏低/偏高指标占比一览</li>' +
                    '<li><strong>📊 浓度对比柱状图</strong>：偏离参考范围最大的代谢物对比</li>' +
                    '<li><strong>📉 偏离度瀑布图</strong>：每项代谢物偏离参考范围的程度</li>' +
                    '<li><strong>🩺 六大通路健康总览</strong>：通俗易懂的代谢通路卡片</li>' +
                    '<li><strong>💪 个性化健康方案</strong>：饮食建议、运动方案及干预时间线</li></ul>' +
                    '<div class="tutorial-tip">💡 提示：报告支持导出PDF、Word格式，可生成健康卡片分享</div>'
            },
            {
                id: 'ai-assistant',
                title: '4. 使用DeepSeek AI健康助手',
                content: '<p>切换到<strong>"AI助手"</strong>标签页，即可与DeepSeek AI对话：</p>' +
                    '<p><strong>可以问什么？</strong></p>' +
                    '<ul><li>代谢指标解读："肌酐偏高意味着什么？"</li>' +
                    '<li>饮食建议："尿酸高应该怎么吃？"</li>' +
                    '<li>运动指导："每天运动多久合适？"</li>' +
                    '<li>报告解读："帮我分析这份检测报告"</li></ul>' +
                    '<p>助手会记住对话上下文，支持多轮追问。对话历史会自动保存。</p>' +
                    '<div class="tutorial-tip">⚠️ AI建议仅供参考，不能替代专业医生诊断</div>'
            },
            {
                id: 'history-track',
                title: '5. 历史记录追踪',
                content: '<p>在<strong>"数据"</strong>标签页切换到"历史记录"子标签：</p>' +
                    '<ul><li>全部检测记录以表格形式展示，26项代谢物浓度一目了然</li>' +
                    '<li>支持按<strong>全部/本周/本月/近3月</strong>筛选记录</li>' +
                    '<li>绿色数值=正常，红色数值=异常</li>' +
                    '<li><strong>导出CSV</strong>：一键导出所有历史数据为Excel可打开的CSV文件</li>' +
                    '<li>支持<strong>删除</strong>单条记录</li></ul>' +
                    '<div class="tutorial-tip">💡 提示：系统自动保存每次检测，无需手动操作</div>'
            }
        ]
    },
    advanced: {
        title: '高级功能指南',
        icon: '🔧',
        sections: [
            {
                id: 'charts-guide',
                title: '多维度图表解读',
                content: '<p>报告页面包含<strong>8种可视化图表</strong>，帮你全面了解代谢状况：</p>' +
                    '<ul><li><strong>📈 雷达图</strong>：六通路风险一目了然，越靠近边缘风险越高</li>' +
                    '<li><strong>🎯 环形饼图</strong>：正常/偏低/偏高指标占比分布</li>' +
                    '<li><strong>📊 浓度柱状图</strong>：横向对比偏离最大的代谢物，蓝=偏低 红=偏高 绿=正常</li>' +
                    '<li><strong>📉 偏离瀑布图</strong>：每项偏离参考范围中点的百分比程度</li>' +
                    '<li><strong>🍩 通路环形图</strong>：异常指标在各通路的分布情况</li>' +
                    '<li><strong>📈 趋势折线图</strong>：多次检测风险评分变化趋势</li></ul>' +
                    '<div class="tutorial-tip">💡 提示：悬停图表可查看详细数值和说明</div>'
            },
            {
                id: 'history-compare',
                title: '历史数据对比',
                content: '<p>在<strong>"数据"</strong>标签页的历史记录中：</p>' +
                    '<ul><li>所有检测记录以行展示，26项代谢物以列展示</li>' +
                    '<li>选择时间范围（全部/本周/本月/近3月）查看趋势</li>' +
                    '<li>绿色数值=在参考范围内，红色数值=超出参考范围</li>' +
                    '<li>导出CSV后可导入Excel进行自由对比和图表分析</li></ul>' +
                    '<div class="tutorial-tip">💡 提示：定期检测可追踪代谢变化趋势，评估健康干预效果</div>'
            },
            {
                id: 'health-plans',
                title: '个性化健康方案',
                content: '<p>系统基于代谢数据自动生成健康计划：</p>' +
                    '<ul><li><strong>📅 周计划</strong>：每日饮食+运动+监测安排</li>' +
                    '<li><strong>🏃 运动方案</strong>：基于代谢状态的个性化运动建议</li>' +
                    '<li><strong>🍎 膳食建议</strong>：参考范围外的代谢物对应食物推荐与避免</li>' +
                    '<li><strong>📋 干预时间线</strong>：分阶段的改善目标和里程碑</li></ul>' +
                    '<div class="tutorial-tip">💡 提示：方案会根据后续检测数据动态调整</div>'
            },
            {
                id: 'ocr-camera',
                title: '拍照识别录入',
                content: '<p>在<strong>"数据"</strong>标签页选择"拍照识别"模式：</p>' +
                    '<ul><li>用摄像头拍摄化验单/检测报告</li>' +
                    '<li>AI自动识别代谢物名称和浓度数值</li>' +
                    '<li>识别结果可手动修正后再提交</li>' +
                    '<li>适合有纸质化验单的用户快速录入</li></ul>' +
                    '<div class="tutorial-tip">⚠️ 拍照识别可能存在误差，建议核对后再提交</div>'
            },
            {
                id: 'report-export',
                title: '报告导出与分享',
                content: '<p>在报告页面顶部工具栏可进行以下操作：</p>' +
                    '<ul><li><strong>📄 导出PDF</strong>：专业排版的完整报告（含所有图表）</li>' +
                    '<li><strong>📝 导出Word</strong>：可编辑的文档格式</li>' +
                    '<li><strong>🃏 健康卡片</strong>：精简版核心指标一页展示</li>' +
                    '<li><strong>📤 分享报告</strong>：一键分享检测结果</li>' +
                    '<li><strong>🔊 语音播报</strong>：朗读报告主要内容（老年人友好）</li></ul>' +
                    '<div class="tutorial-tip">💡 提示：导出文件包含完整的代谢数据、风险分析和建议</div>'
            }
        ]
    },
    faq: {
        title: '常见问题与排错',
        icon: '❓',
        sections: [
            {
                id: 'faq-data',
                title: 'Q: 报告生成失败怎么办？',
                content: '<p><strong>可能原因及解决：</strong></p>' +
                    '<ul><li>未录入任何代谢物浓度 → 至少填写一项代谢物后再提交</li>' +
                    '<li>所有值都在正常范围 → 系统仍会生成报告，风险评分较低（正常现象）</li>' +
                    '<li>浏览器缓存问题 → 尝试清除缓存或切换无痕模式重试</li>' +
                    '<li>同日重复提交 → 同一天只能保存一份报告，修改请在当天记录上操作</li></ul>'
            },
            {
                id: 'faq-ai',
                title: 'Q: AI助手没反应？',
                content: '<p><strong>排查步骤：</strong></p>' +
                    '<ol><li>确认后端服务器正在运行（终端需执行<code> node server.mjs </code>）</li>' +
                    '<li>确认 DeepSeek API Key 已配置（<code> $env:DEEPSEEK_API_KEY="sk-xxx" </code>）</li>' +
                    '<li>检查网络连接是否正常</li>' +
                    '<li>API 有频率限制，如频繁请求请稍等片刻</li></ol>' +
                    '<div class="tutorial-tip">💡 提示：离线状态下使用本地规则引擎仍可分析数据</div>'
            },
            {
                id: 'faq-login',
                title: 'Q: 登录失败或忘记密码？',
                content: '<p>目前版本支持在"设置"页面修改密码。如完全忘记密码：</p>' +
                    '<ol><li>清除浏览器 localStorage（F12 → Application → Clear storage）</li>' +
                    '<li>重新注册新账号</li></ol>' +
                    '<div class="tutorial-tip">⚠️ 重要：清除 localStorage 会导致历史数据丢失，请提前导出备份</div>'
            },
            {
                id: 'faq-slow',
                title: 'Q: 图表不显示或系统卡顿？',
                content: '<p><strong>优化建议：</strong></p>' +
                    '<ul><li>使用 Chrome 或 Edge 最新版本浏览器</li>' +
                    '<li>关闭不必要的浏览器扩展</li>' +
                    '<li>清理历史记录和聊天记录释放空间</li>' +
                    '<li>如使用拍照识别，建议用较小的图片（< 2MB）测试</li></ul>' +
                    '<div class="tutorial-tip">💡 提示：系统数据存储在浏览器本地，建议定期导出备份</div>'
            }
        ]
    }
};

// ==================== 教程UI ====================
function createTutorialUI() {
    if (document.getElementById('tutorialOverlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.className = 'tutorial-overlay';
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeTutorial();
    });

    overlay.innerHTML =
        '<div class="tutorial-panel" id="tutorialPanel">' +
            '<div class="tutorial-header">' +
                '<div class="tutorial-header-left">' +
                    '<span class="tutorial-header-icon">📖</span>' +
                    '<div>' +
                        '<div class="tutorial-header-title">使用教程</div>' +
                        '<div class="tutorial-header-subtitle">MetaScan 代谢健康管理平台</div>' +
                    '</div>' +
                '</div>' +
                '<button class="tutorial-close-btn" id="tutorialCloseBtn">&times;</button>' +
            '</div>' +
            '<div class="tutorial-tabs" id="tutorialTabs"></div>' +
            '<div class="tutorial-body" id="tutorialBody">' +
                '<div class="tutorial-sections" id="tutorialSections"></div>' +
                '<div class="tutorial-detail" id="tutorialDetail">' +
                    '<div class="tutorial-detail-empty">' +
                        '<div style="font-size:3rem;margin-bottom:16px;">📖</div>' +
                        '<div style="color:#64748b;">请从左侧选择章节查看详细内容</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="tutorial-footer">' +
                '<span class="tutorial-version">MetaScan v2.0 · 2026</span>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    document.getElementById('tutorialCloseBtn').addEventListener('click', closeTutorial);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && tutorialOpen) closeTutorial();
    });

    renderTutorialTabs();
    renderTutorialSections('beginner');
}

function renderTutorialTabs() {
    var tabs = document.getElementById('tutorialTabs');
    if (!tabs) return;

    var categories = Object.keys(TUTORIAL_DATA);
    var html = '';
    categories.forEach(function(cat) {
        var data = TUTORIAL_DATA[cat];
        var active = (cat === 'beginner') ? ' active' : '';
        html += '<button class="tutorial-tab' + active + '" data-cat="' + cat + '">' +
            data.icon + ' ' + data.title + '</button>';
    });
    tabs.innerHTML = html;

    tabs.querySelectorAll('.tutorial-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            tabs.querySelectorAll('.tutorial-tab').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            renderTutorialSections(this.dataset.cat);
            document.getElementById('tutorialDetail').innerHTML =
                '<div class="tutorial-detail-empty">' +
                '<div style="font-size:3rem;margin-bottom:16px;">' + TUTORIAL_DATA[this.dataset.cat].icon + '</div>' +
                '<div style="color:#64748b;">请从左侧选择章节查看详细内容</div></div>';
        });
    });
}

function renderTutorialSections(category) {
    var container = document.getElementById('tutorialSections');
    if (!container) return;
    var data = TUTORIAL_DATA[category];
    if (!data) return;
    var html = '';
    data.sections.forEach(function(sec) {
        html += '<button class="tutorial-section-link" data-section="' + sec.id + '" data-cat="' + category + '">' +
            sec.title + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.tutorial-section-link').forEach(function(btn) {
        btn.addEventListener('click', function() {
            container.querySelectorAll('.tutorial-section-link').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            showSectionDetail(category, this.dataset.section);
        });
    });
}

function showSectionDetail(category, sectionId) {
    var detail = document.getElementById('tutorialDetail');
    if (!detail) return;
    var data = TUTORIAL_DATA[category];
    if (!data) return;
    var section = data.sections.find(function(s) { return s.id === sectionId; });
    if (!section) return;
    tutorialCurrentSection = { category: category, sectionId: sectionId };
    detail.innerHTML =
        '<h2 class="tutorial-detail-title">' + section.title + '</h2>' +
        '<div class="tutorial-detail-content">' + section.content + '</div>';
    detail.scrollTop = 0;
}

export function openTutorial(initialCategory, initialSection) {
    if (tutorialOpen) return;
    createTutorialUI();
    var overlay = document.getElementById('tutorialOverlay');
    overlay.style.display = 'flex';
    setTimeout(function() { overlay.classList.add('active'); }, 10);
    tutorialOpen = true;
    var category = initialCategory || 'beginner';
    renderTutorialSections(category);
    var tabs = document.getElementById('tutorialTabs');
    if (tabs) {
        tabs.querySelectorAll('.tutorial-tab').forEach(function(b) { b.classList.remove('active'); });
        var targetTab = tabs.querySelector('[data-cat="' + category + '"]');
        if (targetTab) targetTab.classList.add('active');
    }
    if (initialSection) {
        showSectionDetail(category, initialSection);
        var sectionLinks = document.getElementById('tutorialSections');
        if (sectionLinks) {
            sectionLinks.querySelectorAll('.tutorial-section-link').forEach(function(b) { b.classList.remove('active'); });
            var targetLink = sectionLinks.querySelector('[data-section="' + initialSection + '"]');
            if (targetLink) targetLink.classList.add('active');
        }
    }
}

export function closeTutorial() {
    var overlay = document.getElementById('tutorialOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(function() { overlay.style.display = 'none'; }, 300);
    tutorialOpen = false;
    tutorialCurrentSection = null;
}

export function toggleTutorial() {
    if (tutorialOpen) { closeTutorial(); } else { openTutorial(); }
}

// ==================== 新手引导 Walkthrough ====================
var ONBOARDING_STEPS = [
    {
        title: '欢迎使用 MetaScan 智能体',
        desc: 'MetaScan 是一款代谢健康评估平台。通过录入代谢物浓度数据，自动生成可视化健康报告，帮助你直观了解自身代谢状况。\n\n点击"下一步"开始快速入门引导。',
        icon: '👋',
        position: 'center'
    },
    {
        title: '第1步：录入代谢物浓度',
        desc: '点击顶部导航栏的 <b>"数据"</b> 标签页，进入代谢物录入页面。系统支持三种录入方式：拍照识别、手动录入、历史记录。',
        icon: '📝',
        highlight: '#tab-metabolic',
        position: 'bottom'
    },
    {
        title: '第2步：手动录入',
        desc: '在数据页面选择 <b>"手动录入"</b> 模式。26种代谢物按六大通路分组全部展示，只需在对应输入框中填写浓度值即可。<br><br>系统会自动比对参考范围，实时显示正常/偏低/偏高状态。',
        icon: '🔢',
        highlight: '.metabolic-mode-selector',
        position: 'bottom'
    },
    {
        title: '第3步：提交并生成报告',
        desc: '填写完浓度数据后，确认日期无误，点击 <b>"提交数据"</b> 按钮。\n\n系统会自动生成全面的代谢健康报告，包含多维图表、风险评估和个性化建议。',
        icon: '📊',
        highlight: '.wizard-submit-btn',
        position: 'top',
        needTab: 'data'
    },
    {
        title: '第4步：查看健康报告',
        desc: '提交后自动跳转到 <b>"报告"</b> 标签页。报告中包含：<br>• 综合风险评分<br>• 雷达图、柱状图、饼图等8种图表<br>• 六大通路健康总览<br>• 个性化饮食运动建议',
        icon: '📋',
        highlight: '#tab-reports',
        position: 'bottom'
    },
    {
        title: '第5步：AI 智能助手',
        desc: '切换到 <b>"AI助手"</b> 标签页，与 DeepSeek AI 对话。\n\n可以询问代谢指标解读、饮食建议、运动指导等问题，助手会记住对话上下文。',
        icon: '🤖',
        highlight: '#tab-chat',
        position: 'bottom'
    },
    {
        title: '准备就绪！',
        desc: '你现在可以开始使用 MetaScan 了。\n\n💡 随时点击右上角 <b>"📖 使用教程"</b> 查看更多详细指南。\n\n祝您健康！',
        icon: '🎉',
        position: 'center'
    }
];

var currentOnboardingStep = 0;

function createOnboardingUI() {
    if (document.getElementById('onboardingOverlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'onboarding-overlay';

    overlay.innerHTML =
        '<div class="onboarding-backdrop" id="onboardingBackdrop"></div>' +
        '<div class="onboarding-tooltip" id="onboardingTooltip">' +
            '<div class="onboarding-tooltip-header">' +
                '<span class="onboarding-step-icon" id="onboardingStepIcon">👋</span>' +
                '<div>' +
                    '<div class="onboarding-step-title" id="onboardingStepTitle"></div>' +
                    '<div class="onboarding-step-desc" id="onboardingStepDesc"></div>' +
                '</div>' +
            '</div>' +
            '<div class="onboarding-tooltip-footer">' +
                '<div class="onboarding-dots" id="onboardingDots"></div>' +
                '<div class="onboarding-actions">' +
                    '<button class="onboarding-skip-btn" id="onboardingSkipBtn">跳过引导</button>' +
                    '<button class="onboarding-prev-btn" id="onboardingPrevBtn">上一步</button>' +
                    '<button class="onboarding-next-btn" id="onboardingNextBtn">下一步</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    document.getElementById('onboardingSkipBtn').addEventListener('click', finishOnboarding);
    document.getElementById('onboardingPrevBtn').addEventListener('click', prevOnboardingStep);
    document.getElementById('onboardingNextBtn').addEventListener('click', nextOnboardingStep);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && onboardingActive) finishOnboarding();
    });

    renderOnboardingDots();
    renderOnboardingStep(0);
    overlay.style.display = 'block';
    onboardingActive = true;
}

function renderOnboardingDots() {
    var dots = document.getElementById('onboardingDots');
    if (!dots) return;
    dots.innerHTML = ONBOARDING_STEPS.map(function(_, i) {
        return '<span class="onboarding-dot' + (i === 0 ? ' active' : '') + '"></span>';
    }).join('');
}

function renderOnboardingStep(step) {
    currentOnboardingStep = step;
    var data = ONBOARDING_STEPS[step];
    if (!data) return;

    document.getElementById('onboardingStepIcon').textContent = data.icon;
    document.getElementById('onboardingStepTitle').innerHTML = data.title;
    document.getElementById('onboardingStepDesc').innerHTML = data.desc.replace(/\n/g, '<br>');

    var prevBtn = document.getElementById('onboardingPrevBtn');
    var nextBtn = document.getElementById('onboardingNextBtn');
    prevBtn.style.display = step === 0 ? 'none' : 'inline-block';
    if (step === ONBOARDING_STEPS.length - 1) {
        nextBtn.textContent = '开始使用';
        nextBtn.classList.add('onboarding-finish-btn');
    } else {
        nextBtn.textContent = '下一步';
        nextBtn.classList.remove('onboarding-finish-btn');
    }

    var dots = document.getElementById('onboardingDots');
    if (dots) {
        dots.querySelectorAll('.onboarding-dot').forEach(function(d, i) {
            d.classList.toggle('active', i === step);
        });
    }

    // 切换 tab（如果该步骤需要特定页面）
    if (data.needTab && typeof showTab === 'function') {
        showTab(data.needTab);
    }

    // 高亮元素 & 定位 tooltip
    var tooltip = document.getElementById('onboardingTooltip');
    var backdrop = document.getElementById('onboardingBackdrop');
    var highlightEl = data.highlight ? document.querySelector(data.highlight) : null;

    tooltip.className = 'onboarding-tooltip onboarding-pos-' + (data.position || 'center');

    if (highlightEl && data.position !== 'center') {
        var rect = highlightEl.getBoundingClientRect();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        highlightEl.classList.add('onboarding-highlight');

        // 定位 backdrop 高亮区域
        backdrop.style.display = 'block';
        backdrop.style.setProperty('--hl-top', (rect.top + scrollTop) + 'px');
        backdrop.style.setProperty('--hl-left', (rect.left + scrollLeft) + 'px');
        backdrop.style.setProperty('--hl-width', rect.width + 'px');
        backdrop.style.setProperty('--hl-height', rect.height + 'px');

        // 定位 tooltip
        var tipRect = tooltip.getBoundingClientRect();
        var tipLeft = rect.left + scrollLeft + (rect.width / 2) - (tipRect.width / 2);
        if (data.position === 'bottom') {
            tooltip.style.top = (rect.bottom + scrollTop + 16) + 'px';
            tooltip.style.left = Math.max(16, tipLeft) + 'px';
        } else if (data.position === 'top') {
            tooltip.style.top = (rect.top + scrollTop - tipRect.height - 16) + 'px';
            tooltip.style.left = Math.max(16, tipLeft) + 'px';
        } else if (data.position === 'left') {
            tooltip.style.top = (rect.top + scrollTop + (rect.height / 2) - (tipRect.height / 2)) + 'px';
            tooltip.style.left = (rect.left + scrollLeft - tipRect.width - 16) + 'px';
        } else if (data.position === 'right') {
            tooltip.style.top = (rect.top + scrollTop + (rect.height / 2) - (tipRect.height / 2)) + 'px';
            tooltip.style.left = (rect.right + scrollLeft + 16) + 'px';
        }
    } else {
        backdrop.style.display = 'block';
        backdrop.style.setProperty('--hl-top', '0');
        backdrop.style.setProperty('--hl-left', '0');
        backdrop.style.setProperty('--hl-width', '0');
        backdrop.style.setProperty('--hl-height', '0');
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }
}

function clearHighlights() {
    document.querySelectorAll('.onboarding-highlight').forEach(function(el) {
        el.classList.remove('onboarding-highlight');
    });
}

function nextOnboardingStep() {
    clearHighlights();
    if (currentOnboardingStep >= ONBOARDING_STEPS.length - 1) {
        finishOnboarding();
    } else {
        renderOnboardingStep(currentOnboardingStep + 1);
    }
}

function prevOnboardingStep() {
    if (currentOnboardingStep > 0) {
        clearHighlights();
        renderOnboardingStep(currentOnboardingStep - 1);
    }
}

function finishOnboarding() {
    clearHighlights();
    var overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.style.display = 'none';
    onboardingActive = false;
    try {
        localStorage.setItem('metascan_onboarding_done', '1');
    } catch(e) {}
}

export function startOnboarding() {
    if (onboardingActive) return;
    if (tutorialOpen) closeTutorial();
    currentOnboardingStep = 0;
    createOnboardingUI();
}

export function checkFirstVisit() {
    try {
        if (!localStorage.getItem('metascan_onboarding_done')) {
            setTimeout(function() { startOnboarding(); }, 800);
        }
    } catch(e) {}
}

// ==================== 全局暴露 ====================
window.openTutorial = openTutorial;
window.closeTutorial = closeTutorial;
window.toggleTutorial = toggleTutorial;
window.startOnboarding = startOnboarding;
window.checkFirstVisit = checkFirstVisit;