var WS_URL = 'ws://localhost:3001/ws';
var ws = null;
var reconnectTimer = null;
var messageHandlers = {};
var currentUsername = null;
var isConnected = false;
var reconnectAttempts = 0;
var MAX_RECONNECT = 20;

function connect(username, token) {
    currentUsername = username;
    if (ws && ws.readyState === WebSocket.OPEN) return;

    try {
        ws = new WebSocket(WS_URL);
    } catch (e) {
        scheduleReconnect();
        return;
    }

    ws.onopen = function() {
        isConnected = true;
        reconnectAttempts = 0;
        var loginData = { type: 'login', username: currentUsername };
        if (token) loginData.token = token;
        ws.send(JSON.stringify(loginData));
    };

    ws.onmessage = function(event) {
        try {
            var data = JSON.parse(event.data);
            if (data.type === 'login' && data.success) {
                if (messageHandlers['connected']) {
                    messageHandlers['connected'].forEach(function(cb) { cb(data); });
                }
            }
            if (messageHandlers[data.type]) {
                messageHandlers[data.type].forEach(function(cb) { cb(data); });
            }
            if (messageHandlers['*']) {
                messageHandlers['*'].forEach(function(cb) { cb(data); });
            }
        } catch (e) {
            console.error('WS message parse error:', e);
        }
    };

    ws.onclose = function() {
        isConnected = false;
        if (messageHandlers['disconnected']) {
            messageHandlers['disconnected'].forEach(function(cb) { cb(); });
        }
        scheduleReconnect();
    };

    ws.onerror = function() {
        ws.close();
    };
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    if (reconnectAttempts >= MAX_RECONNECT) return;
    reconnectTimer = setTimeout(function() {
        reconnectTimer = null;
        reconnectAttempts++;
        if (currentUsername) {
            connect(currentUsername);
        }
    }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
}

function disconnect() {
    reconnectAttempts = MAX_RECONNECT;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    isConnected = false;
}

function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function on(type, callback) {
    if (!messageHandlers[type]) {
        messageHandlers[type] = [];
    }
    messageHandlers[type].push(callback);
}

function off(type, callback) {
    if (messageHandlers[type]) {
        messageHandlers[type] = messageHandlers[type].filter(function(cb) { return cb !== callback; });
    }
}

function sendTyping(to, isTyping) {
    send({ type: 'typing', to: to, isTyping: isTyping });
}

function getConnectionStatus() {
    return { connected: isConnected, username: currentUsername };
}

export { connect, disconnect, send, on, off, sendTyping, getConnectionStatus };