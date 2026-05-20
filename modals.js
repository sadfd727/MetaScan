export function setMood(mood) { selectedMood = mood; resetMoodButtons(); var btn = document.getElementById('moodBtn' + mood); if (btn) { btn.style.borderColor = '#667eea'; btn.style.background = 'rgba(102, 126, 234, 0.1)'; } }

export function openHeightWeightInput() {
    var modal = document.getElementById('heightWeightModal');
    if (modal) {
        modal.style.display = 'flex';
        var heightInput = document.getElementById('heightInput');
        var weightInputModal = document.getElementById('weightInputModal');
        if (heightInput && userProfile.height) heightInput.value = userProfile.height;
        if (weightInputModal && userProfile.weight) weightInputModal.value = userProfile.weight;
    }
}

export function closeHeightWeightModal() {
    var modal = document.getElementById('heightWeightModal');
    if (modal) modal.style.display = 'none';
}

export function saveHeightWeight() {
    var heightInput = document.getElementById('heightInput');
    var weightInputModal = document.getElementById('weightInputModal');
    var height = parseFloat(heightInput.value);
    var weight = parseFloat(weightInputModal.value);

    if (!isNaN(height) && !isNaN(weight)) {
        userProfile.height = height;
        userProfile.weight = weight;
        saveUserProfile();
        saveHealthRecord({ weight: weight });
        closeHeightWeightModal();
        showNotification('身高体重已保存！');
    } else {
        showNotification('请输入有效的数值！');
    }
}

export function openGoalsModal() {
    const modal = document.getElementById('goalsModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('goalCalories').value = healthGoals.calories;
        document.getElementById('goalExercise').value = healthGoals.exercise;
        document.getElementById('goalWater').value = healthGoals.water;
        document.getElementById('goalProtein').value = healthGoals.protein;
        document.getElementById('goalCarbs').value = healthGoals.carbs;
        document.getElementById('goalFat').value = healthGoals.fat;
    }
}

export function closeGoalsModal() {
    const modal = document.getElementById('goalsModal');
    if (modal) modal.style.display = 'none';
}

export function saveGoals() {
    const calories = parseInt(document.getElementById('goalCalories').value);
    const exercise = parseInt(document.getElementById('goalExercise').value);
    const water = parseInt(document.getElementById('goalWater').value);
    const protein = parseInt(document.getElementById('goalProtein').value);
    const carbs = parseInt(document.getElementById('goalCarbs').value);
    const fat = parseInt(document.getElementById('goalFat').value);

    if (!isNaN(calories) && !isNaN(exercise) && !isNaN(water)) {
        healthGoals = {
            calories: calories,
            exercise: exercise,
            water: water,
            protein: protein || 60,
            carbs: carbs || 250,
            fat: fat || 65
        };

        if (currentUser) {
            localStorage.setItem(`healthGoals_${currentUser.username}`, JSON.stringify(healthGoals));
        }

        updateDisplays();
        closeGoalsModal();
        showNotification('目标已更新！');
    } else {
        showNotification('请输入有效的数值！');
    }
}