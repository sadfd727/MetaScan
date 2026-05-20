// Diet & Food Management Module

export function quickAddFood(name, calories, protein, carbs, fat) {
    saveHealthRecord({
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        foodName: name
    });
    showNotification(`已添加 ${name}！`);
}

export function searchFoodDatabase() {
    const searchTerm = document.getElementById('foodSearchInput').value.toLowerCase();
    displayFoodList(foodDatabase.filter(food =>
        (currentFoodCategory === 'all' || food.category === currentFoodCategory) &&
        food.name.toLowerCase().includes(searchTerm)
    ));
}

export function filterFoodCategory(category) {
    currentFoodCategory = category;

    document.querySelectorAll('.food-category-btn').forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            btn.style.color = 'white';
            btn.classList.add('active');
        } else {
            btn.style.background = '#f3f4f6';
            btn.style.color = '#666';
            btn.classList.remove('active');
        }
    });

    searchFoodDatabase();
}

export function saveWeightGoal() {
    if (!currentUser) {
        showNotification('请先登录！');
        return;
    }

    const currentWeight = parseFloat(document.getElementById('currentWeightGoal').value);
    const targetWeight = parseFloat(document.getElementById('targetWeightGoal').value);

    if (!isNaN(currentWeight) && !isNaN(targetWeight)) {
        weightGoalData = {
            startWeight: currentWeight,
            targetWeight: targetWeight,
            startDate: new Date().toDateString()
        };

        localStorage.setItem(`weightGoal_${currentUser.username}`, JSON.stringify(weightGoalData));

        userProfile.weight = currentWeight;
        saveUserProfile();
        saveHealthRecord({ weight: currentWeight });

        updateWeightGoalDisplay();
        showNotification('✅ 体重目标已设定！加油！');
    } else {
        showNotification('请输入有效的体重数值！');
    }
}