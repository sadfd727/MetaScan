import { toggleAIChat } from './ai-chat.js';

var avatarInteractionState = {
    isAnimating: false,
    lastInteractionTime: 0,
    interactionCount: 0
};

var messages = {
    greeting: [
        '你好呀！有什么健康问题想问吗？👋',
        '今天感觉怎么样？需要我帮你分析健康数据吗？',
        '我是你的健康助手，随时可以问我哦～💚',
        '记得喝水、规律作息哦！有什么我可以帮忙的？',
        '你的代谢数据看起来不错！想了解更多吗？',
        '需要我帮你制定饮食或运动计划吗？🍎',
        '最近睡眠怎么样？好的睡眠对代谢很重要哦～'
    ],
    encouragement: [
        '你做得很棒！继续保持！💪',
        '坚持就是胜利！健康是长期投资～',
        '别忘了今天的小目标哦！✨',
        '你的努力不会白费，身体会感谢你的！'
    ],
    tip: [
        '记得每小时起来活动一下哦～',
        '多喝水可以促进代谢，今天喝够8杯了吗？',
        '深色蔬菜富含抗氧化物，对身体很好！',
        '规律作息能帮助稳定血糖和激素水平～'
    ]
};

var emojiMap = {
    greeting: '👋',
    encouragement: '💪',
    tip: '💡',
    default: '👩‍⚕️'
};

function getRandomMessageType() {
    var types = ['greeting', 'encouragement', 'tip'];
    return types[Math.floor(Math.random() * types.length)];
}

function getRandomMessage(type) {
    var pool = messages[type] || messages.greeting;
    return pool[Math.floor(Math.random() * pool.length)];
}

function showBubble(bubble, messageEl, message) {
    if (!bubble || !messageEl) return;
    messageEl.textContent = message;
    bubble.style.transform = 'translateX(-50%) scale(1)';
    bubble.style.opacity = '1';
}

function hideBubble(bubble) {
    if (!bubble) return;
    bubble.style.transform = 'translateX(-50%) scale(0)';
    bubble.style.opacity = '0';
}

function playRandomAnimation(avatar) {
    if (!avatar) return;
    var animations = ['avatar-wave', 'avatar-bounce', 'avatar-wiggle', 'avatar-heartbeat', 'avatar-spin', 'avatar-excited'];
    var anim = animations[Math.floor(Math.random() * animations.length)];
    avatar.classList.add(anim);
    setTimeout(function() {
        avatar.classList.remove(anim);
    }, 1200);
}

function changeEmoji(emojiEl, type) {
    if (!emojiEl) return;
    emojiEl.textContent = emojiMap[type] || emojiMap.default;
}

export function showPlaceholderAvatar() {
    const avatarImg = document.getElementById('avatarImg');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');

    if (avatarImg) avatarImg.style.display = 'none';
    if (avatarPlaceholder) avatarPlaceholder.style.display = 'flex';
}

export function triggerAvatarInteraction(customType, customMessage) {
    var fab = document.getElementById('healthAssistantFab');
    if (fab) {
        fab.classList.add('visible');
        fab.classList.remove('hidden');
        setTimeout(function() {
            var emoji = document.getElementById('fabIconEmoji');
            if (emoji) {
                var original = emoji.textContent;
                emoji.style.transform = 'scale(1.3)';
                setTimeout(function() {
                    emoji.style.transform = 'scale(1)';
                }, 200);
            }
        }, 50);
    }
    toggleAIChat();
}

window.triggerAvatarInteraction = triggerAvatarInteraction;
window.showPlaceholderAvatar = showPlaceholderAvatar;