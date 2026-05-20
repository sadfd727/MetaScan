export function safeParseJSON(str, fallback) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
}

export function safeGetItem(key, fallback) {
    try {
        var val = localStorage.getItem(key);
        return val !== null ? safeParseJSON(val, fallback) : fallback;
    } catch (e) {
        return fallback;
    }
}

export function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {}
}

export function getTasks(username) {
    return JSON.parse(localStorage.getItem('metascanTasks_' + username)) || [];
}

export function saveTasks(username, tasks) {
    localStorage.setItem('metascanTasks_' + username, JSON.stringify(tasks));
}