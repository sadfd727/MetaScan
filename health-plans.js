import { currentUser, historicalData } from './auth.js';
import { showNotification } from './notifications.js';
import { getTasks, saveTasks } from './storage.js';

export function saveToHistory(result) {
    if (!currentUser) return;

    if (!historicalData[currentUser.username]) {
        historicalData[currentUser.username] = [];
    }

    historicalData[currentUser.username].push(result);
    if (historicalData[currentUser.username].length > 365) {
        historicalData[currentUser.username] = historicalData[currentUser.username].slice(-365);
    }
    localStorage.setItem(`metascanData_${currentUser.username}`, JSON.stringify(historicalData[currentUser.username]));
    if (typeof window.updateComparisonView === 'function') {
        window.updateComparisonView();
    }

    if (result.matchResults || result.data) {
        var metabRecord;
        if (result.matchResults) {
            metabRecord = {
                mzPeaks: result.mzPeaks || [],
                matchedCount: result.matchedCount || 0,
                totalFingerprints: result.totalFingerprints || 26,
                coverageRate: result.coverageRate || 0,
                overallScore: result.overallCoverageScore || result.overallRisk || 0,
                pathwayScores: result.pathwayScores || result.riskScores || {},
                testDate: result.testDate || result.date || new Date().toISOString().split('T')[0],
                notes: '',
                source: 'manual',
                timestamp: Date.now(),
                savedAt: new Date().toISOString()
            };

            result.matchResults.forEach(function(m) {
                var key = m.metaboliteId || m.name;
                if (m.concentration !== undefined) {
                    metabRecord[key] = m.concentration;
                }
            });
        } else {
            metabRecord = {
                ...result.data,
                testDate: new Date().toISOString().split('T')[0],
                notes: '',
                source: 'manual',
                filledCount: Object.keys(result.data).length,
                timestamp: Date.now(),
                savedAt: new Date().toISOString()
            };
        }
        var key = 'metabolic_' + currentUser.username;
        var records = JSON.parse(localStorage.getItem(key) || '[]');
        records.unshift(metabRecord);
        if (records.length > 10) records.length = 10;
        localStorage.setItem(key, JSON.stringify(records));
    }

    setTimeout(function() { 
        if (typeof window.checkRatingEligibility === 'function') {
            window.checkRatingEligibility(); 
        }
    }, 1500);
}

export function generate4WeekExercisePlan() {
    const tasks = getTasks(currentUser.username);
    const today = new Date();
    const newTasks = [];

    const existingExerciseTasks = tasks.filter(task =>
        task.title.includes('运动') &&
        task.planType === '4WeekExercise'
    );

    if (existingExerciseTasks.length > 0) {
        showNotification('您已拥有运动计划，无需重复创建');
        return false;
    }

    const weeklyPlans = [
        {
            week: 1,
            exercises: [
                { day: 0, type: '快走', duration: 30, intensity: 'low', description: '快走或散步30分钟' },
                { day: 2, type: '伸展运动', duration: 20, intensity: 'low', description: '做20分钟伸展运动或瑜伽' },
                { day: 4, type: '快走', duration: 30, intensity: 'low', description: '快走或散步30分钟' }
            ]
        },
        {
            week: 2,
            exercises: [
                { day: 0, type: '快走+慢跑', duration: 35, intensity: 'medium', description: '快走和慢跑交替，共35分钟' },
                { day: 2, type: '有氧运动', duration: 30, intensity: 'medium', description: '做30分钟中等强度有氧操' },
                { day: 4, type: '快走+慢跑', duration: 35, intensity: 'medium', description: '快走和慢跑交替，共35分钟' },
                { day: 6, type: '伸展运动', duration: 25, intensity: 'low', description: '25分钟伸展运动恢复' }
            ]
        },
        {
            week: 3,
            exercises: [
                { day: 0, type: '慢跑', duration: 40, intensity: 'medium', description: '持续慢跑40分钟' },
                { day: 2, type: '力量训练', duration: 30, intensity: 'medium', description: '30分钟力量训练（简单器械或自重训练）' },
                { day: 4, type: '快走+慢跑', duration: 45, intensity: 'medium', description: '快走和慢跑交替，共45分钟' },
                { day: 6, type: '游泳', duration: 40, intensity: 'medium', description: '游泳40分钟或其他水上运动' }
            ]
        },
        {
            week: 4,
            exercises: [
                { day: 0, type: '慢跑', duration: 45, intensity: 'high', description: '持续慢跑45分钟' },
                { day: 2, type: '力量训练', duration: 35, intensity: 'high', description: '35分钟力量训练，增加难度' },
                { day: 4, type: '有氧+力量组合', duration: 50, intensity: 'high', description: '有氧和力量训练组合，共50分钟' },
                { day: 6, type: '球类运动', duration: 60, intensity: 'medium', description: '篮球、羽毛球等球类运动60分钟' }
            ]
        }
    ];

    const dailyTasks = [
        { title: '每日水分摄入', description: '保证8杯以上的水分摄入', type: 'water' },
        { title: '新鲜蔬菜水果', description: '每日摄入3-5份新鲜蔬菜水果', type: 'veggie' }
    ];

    weeklyPlans.forEach(weeklyPlan => {
        weeklyPlan.exercises.forEach(exercise => {
            const taskDate = new Date(today);
            taskDate.setDate(today.getDate() + (weeklyPlan.week - 1) * 7 + exercise.day);

            if (taskDate >= today) {
                newTasks.push({
                    id: Date.now() + Math.random(),
                    title: `第${weeklyPlan.week}周: ${exercise.type}`,
                    description: `${exercise.description}`,
                    date: taskDate.toISOString(),
                    completed: false,
                    type: exercise.type,
                    duration: exercise.duration,
                    intensity: exercise.intensity,
                    week: weeklyPlan.week,
                    planType: '4WeekExercise',
                    isGenerated: true
                });
            }
        });
    });

    for (let i = 0; i < 28; i++) {
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + i);

        if (taskDate >= today) {
            dailyTasks.forEach(dailyTask => {
                newTasks.push({
                    id: Date.now() + Math.random() + i,
                    title: dailyTask.title,
                    description: dailyTask.description,
                    date: taskDate.toISOString(),
                    completed: false,
                    type: dailyTask.type,
                    planType: '4WeekExercise',
                    isGenerated: true
                });
            });
        }
    }

    const allTasks = [...tasks, ...newTasks];
    saveTasks(currentUser.username, allTasks);

    showNotification(`成功创建4周运动计划，共${newTasks.length}个任务！`);

    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }

    return true;
}

export function generateWeeklyHealthPlan() {
    if (!currentUser) return false;

    showNotification('健康计划已准备就绪！');

    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }

    return true;
}

export function refreshSuggestions() {
    generateSmartTasks();
    showNotification('建议已刷新！');
}

export function openQuickRecord(type) {
    currentQuickRecordType = type;
    const overlay = document.getElementById('quickRecordOverlay');
    const sheet = document.getElementById('quickRecordSheet');
    if (!overlay) return;
    
    sheet.classList.remove('closing');
    overlay.classList.remove('closing');
    overlay.style.display = 'flex';
    
    var config = {
        weight:   { icon: '⚖️', title: '记录体重', subtitle: '保持追踪，见证变化', color: '#f39c12' },
        exercise: { icon: '🏃', title: '记录运动', subtitle: '每一次运动都值得记录', color: '#667eea' },
        diet:     { icon: '🍽️', title: '记录饮食', subtitle: '记录每一餐，管理更科学', color: '#e74c3c' },
        water:    { icon: '💧', title: '记录饮水', subtitle: '补水是健康的基础', color: '#3498db' },
        sleep:    { icon: '😴', title: '记录睡眠', subtitle: '优质睡眠助力健康', color: '#a855f7' },
        mood:     { icon: '😊', title: '记录心情', subtitle: '关注情绪健康', color: '#10b981' }
    };
    
    var c = config[type];
    if (!c) return;
    
    document.getElementById('quickRecordIcon').textContent = c.icon;
    document.getElementById('quickRecordTitle').textContent = c.title;
    document.getElementById('quickRecordSubtitle').textContent = c.subtitle;
    document.getElementById('quickRecordSaveBtn').style.background = 'linear-gradient(135deg, ' + c.color + ' 0%, ' + c.color + 'dd 100%)';
    
    renderQuickRecordForm(type);
}

export function closeQuickRecord() {
    var overlay = document.getElementById('quickRecordOverlay');
    var sheet = document.getElementById('quickRecordSheet');
    if (!overlay) return;
    
    overlay.classList.add('closing');
    sheet.classList.add('closing');
    
    setTimeout(function() {
        overlay.style.display = 'none';
        overlay.classList.remove('closing');
        sheet.classList.remove('closing');
    }, 250);
}

export function saveQuickRecord() {
    var type = currentQuickRecordType;
    
    switch (type) {
        case 'weight':
            var w = parseFloat(document.getElementById('qrWeight').value);
            if (!isNaN(w) && w > 0) {
                userProfile.weight = w;
                saveUserProfile();
                saveHealthRecord({ weight: w });
                closeQuickRecord();
                showNotification('⚖️ 体重已记录！');
            } else { showNotification('请输入有效的体重！'); }
            break;
        case 'exercise':
            var d = parseInt(document.getElementById('qrExercise').value);
            if (!isNaN(d) && d > 0) {
                saveHealthRecord({ exercise: d });
                closeQuickRecord();
                showNotification('🏃 运动已记录！');
            } else { showNotification('请输入有效的运动时长！'); }
            break;
        case 'diet':
            var name = document.getElementById('qrFoodName').value;
            var cal = parseInt(document.getElementById('qrCalories').value);
            var p = parseFloat(document.getElementById('qrProtein').value) || 0;
            var cb = parseFloat(document.getElementById('qrCarbs').value) || 0;
            var f = parseFloat(document.getElementById('qrFat').value) || 0;
            if (!isNaN(cal) && cal > 0) {
                saveHealthRecord({ calories: cal, protein: p, carbs: cb, fat: f, foodName: name || '饮食记录' });
                closeQuickRecord();
                showNotification('🍽️ 饮食已记录！');
            } else { showNotification('请输入有效的卡路里！'); }
            break;
        case 'water':
            var cups = parseInt(document.getElementById('qrWaterCups').value);
            if (!isNaN(cups) && cups > 0) {
                saveHealthRecord({ water: cups });
                closeQuickRecord();
                showNotification('💧 已记录 ' + cups + ' 杯水！');
            } else { showNotification('请选择饮水杯数！'); }
            break;
        case 'sleep':
            var h = parseFloat(document.getElementById('qrSleepHours').value);
            if (!isNaN(h) && h > 0) {
                saveHealthRecord({ sleep: h, sleepQuality: selectedSleepQuality });
                closeQuickRecord();
                showNotification('😴 睡眠已记录！');
            } else { showNotification('请输入有效的睡眠时间！'); }
            break;
        case 'mood':
            var emojis = ['😢', '😐', '🙂', '😊', '😄'];
            var moodEmoji = emojis[selectedMood - 1];
            var note = document.getElementById('qrMoodNote').value;
            saveHealthRecord({ mood: moodEmoji, moodNote: note });
            closeQuickRecord();
            showNotification('😊 心情已记录！');
            break;
    }
}