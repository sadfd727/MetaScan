import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import crypto from 'crypto';
import { generatePDFReport, generateWordReport, generateExcelReport } from './server-export.mjs';
import { analyzeWithAI, configureAIDiagnosis, getAIMetrics } from './src/ai-diagnosis.js';

var AI_API_KEY = process.env.DEEPSEEK_API_KEY || '';

if (AI_API_KEY) {
    configureAIDiagnosis({ apiKey: AI_API_KEY });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const WS_PORT = 3001;

const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_DIR = path.join(DATA_DIR, 'messages');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

[DATA_DIR, MESSAGES_DIR, UPLOADS_DIR].forEach(function(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf-8');
}

var connectedClients = {};
var authTokens = {};

var rateLimitStore = {};

function rateLimiter(windowMs, maxRequests) {
    return function(req, res, next) {
        var key = req.ip || 'unknown';
        var now = Date.now();
        if (!rateLimitStore[key]) {
            rateLimitStore[key] = { count: 0, resetAt: now + windowMs };
        }
        var entry = rateLimitStore[key];
        if (now > entry.resetAt) {
            entry.count = 0;
            entry.resetAt = now + windowMs;
        }
        entry.count++;
        if (entry.count > maxRequests) {
            return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
        }
        next();
    };
}

function hashPassword(password) {
    var salt = crypto.randomBytes(16).toString('hex');
    var hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return salt + ':' + hash;
}

function verifyPassword(password, stored) {
    if (!stored || typeof stored !== 'string') return false;
    if (!stored.includes(':')) {
        return stored === password;
    }
    var parts = stored.split(':');
    if (parts.length !== 2) return false;
    var salt = parts[0];
    var hash = parts[1];
    var verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verify));
    } catch (e) {
        return false;
    }
}

function validateString(val, minLen, maxLen) {
    return typeof val === 'string' && val.trim().length >= (minLen || 0) && val.trim().length <= (maxLen || Infinity);
}

function validateEnum(val, allowed) {
    return allowed.includes(val);
}

setInterval(function() {
    var now = Date.now();
    Object.keys(rateLimitStore).forEach(function(key) {
        if (now > rateLimitStore[key].resetAt) {
            delete rateLimitStore[key];
        }
    });
}, 60000);

function readJSON(filePath) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
    catch (e) { return {}; }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getMessageFile(username) {
    return path.join(MESSAGES_DIR, username + '.json');
}

function getMessages(username) {
    var filePath = getMessageFile(username);
    return readJSON(filePath);
}

function saveMessages(username, messages) {
    var filePath = getMessageFile(username);
    writeJSON(filePath, messages);
}

function addMessage(username, message) {
    var messages = getMessages(username);
    if (!Array.isArray(messages)) messages = [];
    messages.push(message);
    saveMessages(username, messages);
}

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function(req, file, cb) {
        var ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});

var upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        var allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-rar-compressed',
            'application/json', 'application/xml', 'text/xml'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型: ' + file.mimetype));
        }
    }
});

var app = express();

app.use(function(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; font-src 'self' https://cdnjs.cloudflare.com; connect-src 'self' ws: wss:; frame-src 'none';");
    next();
});

app.use(cors({
    origin: function(origin, callback) {
        var allowed = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173'];
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', function(req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), wsPort: WS_PORT });
});

app.post('/api/auth/login', rateLimiter(15 * 60 * 1000, 20), function(req, res) {
    var body = req.body || {};
    var username = body.username;
    var password = body.password;

    if (!validateString(username, 1, 30) || !validateString(password, 1, 128)) {
        return res.status(400).json({ error: '用户名或密码格式无效' });
    }

    var users = readJSON(USERS_FILE);
    if (!users[username]) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }
    if (!verifyPassword(password, users[username].password)) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    var token = crypto.randomBytes(32).toString('hex');
    authTokens[username] = { token: token, createdAt: Date.now() };

    res.json({ success: true, user: { username: username, role: users[username].role, token: token } });
});

app.post('/api/auth/register', rateLimiter(15 * 60 * 1000, 10), function(req, res) {
    var body = req.body || {};
    var username = body.username;
    var password = body.password;
    var role = body.role;

    if (!validateString(username, 2, 30)) {
        return res.status(400).json({ error: '用户名需为2-30个字符' });
    }
    if (!validateString(password, 6, 128)) {
        return res.status(400).json({ error: '密码长度需为6-128个字符' });
    }
    if (role && !validateEnum(role, ['patient', 'doctor'])) {
        return res.status(400).json({ error: '无效的用户角色' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: '用户名只能包含字母、数字和下划线' });
    }

    var users = readJSON(USERS_FILE);
    if (users[username]) {
        return res.status(409).json({ error: '用户名已存在' });
    }
    users[username] = {
        password: hashPassword(password),
        role: role || 'patient',
        createdAt: new Date().toISOString()
    };
    writeJSON(USERS_FILE, users);
    res.json({ success: true, user: { username: username, role: users[username].role } });
});

app.get('/api/messages/:username', function(req, res) {
    var messages = getMessages(req.params.username);
    res.json(messages);
});

app.post('/api/messages', function(req, res) {
    var body = req.body || {};
    var sender = body.sender;
    var recipient = body.recipient;
    var content = body.content;
    var type = body.type;
    var fileName = body.fileName;
    var replyTo = body.replyTo;

    if (!validateString(sender, 1, 30)) {
        return res.status(400).json({ error: '缺少有效的发送者' });
    }
    if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: '缺少消息内容' });
    }
    if (content.length > 50000) {
        return res.status(400).json({ error: '消息内容过长' });
    }
    if (type && !['text', 'image', 'voice', 'file', 'prescription'].includes(type)) {
        return res.status(400).json({ error: '无效的消息类型' });
    }

    var message = {
        id: uuidv4(),
        sender: sender,
        recipient: recipient || '',
        content: content,
        type: type || 'text',
        fileName: fileName || '',
        timestamp: new Date().toISOString(),
        read: false,
        readAt: null,
        replyTo: replyTo || null,
        isRecalled: false
    };
    addMessage(sender, message);
    if (recipient && recipient !== sender) {
        addMessage(recipient, message);
    }

    if (connectedClients[recipient] && connectedClients[recipient].readyState === 1) {
        connectedClients[recipient].send(JSON.stringify({ type: 'message', message: message }));
    }
    if (connectedClients[sender] && connectedClients[sender].readyState === 1) {
        connectedClients[sender].send(JSON.stringify({ type: 'message', message: message }));
    }

    res.json({ success: true, message: message });
});

app.put('/api/messages/:id/read', function(req, res) {
    var { reader } = req.body;
    var messageId = req.params.id;
    if (!reader) return res.status(400).json({ error: '缺少读者信息' });
    var messages = getMessages(reader);
    var found = false;
    messages = messages.map(function(msg) {
        if (msg.id === messageId) {
            found = true;
            msg.read = true;
            msg.readAt = new Date().toISOString();
        }
        return msg;
    });
    if (found) {
        saveMessages(reader, messages);
        if (connectedClients[reader]) {
            connectedClients[reader].send(JSON.stringify({ type: 'read', messageId: messageId, reader: reader }));
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ error: '消息未找到' });
    }
});

app.put('/api/messages/:id/read-all', function(req, res) {
    var { reader, sender } = req.body;
    if (!reader) return res.status(400).json({ error: '缺少读者信息' });
    var messages = getMessages(reader);
    var count = 0;
    messages = messages.map(function(msg) {
        if (msg.sender === sender && !msg.read) {
            msg.read = true;
            msg.readAt = new Date().toISOString();
            count++;
        }
        return msg;
    });
    saveMessages(reader, messages);
    if (connectedClients[reader]) {
        connectedClients[reader].send(JSON.stringify({ type: 'readAll', reader: reader, sender: sender }));
    }
    res.json({ success: true, markedCount: count });
});

app.put('/api/messages/:id/recall', function(req, res) {
    var body = req.body || {};
    var username = body.username;
    var messageId = req.params.id;

    if (!validateString(username, 1, 30)) {
        return res.status(400).json({ error: '缺少有效的用户名' });
    }

    var senderMessages = getMessages(username);
    var found = false;
    var recalledMsg = null;
    senderMessages = senderMessages.map(function(msg) {
        if (msg.id === messageId) {
            var msgTime = new Date(msg.timestamp).getTime();
            var now = Date.now();
            if (now - msgTime > 5 * 60 * 1000) {
                return msg;
            }
            found = true;
            msg.isRecalled = true;
            msg.content = '消息已撤回';
            recalledMsg = msg;
        }
        return msg;
    });
    if (!found || !recalledMsg) {
        return res.status(400).json({ error: '撤回失败，消息不存在或已超过5分钟' });
    }
    saveMessages(username, senderMessages);
    if (recalledMsg.recipient && recalledMsg.recipient !== username) {
        var recipientMessages = getMessages(recalledMsg.recipient);
        recipientMessages = recipientMessages.map(function(msg) {
            if (msg.id === messageId) {
                msg.isRecalled = true;
                msg.content = '消息已撤回';
            }
            return msg;
        });
        saveMessages(recalledMsg.recipient, recipientMessages);
        if (connectedClients[recalledMsg.recipient]) {
            connectedClients[recalledMsg.recipient].send(JSON.stringify({ type: 'recall', messageId: messageId, sender: username, recipient: recalledMsg.recipient }));
        }
    }
    res.json({ success: true, message: recalledMsg });
});

app.post('/api/upload', upload.single('file'), function(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
    }
    res.json({
        success: true,
        file: {
            id: uuidv4(),
            originalName: req.file.originalname,
            fileName: req.file.filename,
            path: '/uploads/' + req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        }
    });
});

app.get('/api/users', function(req, res) {
    var users = readJSON(USERS_FILE);
    var userList = Object.keys(users).map(function(username) {
        return { username: username, role: users[username].role, createdAt: users[username].createdAt };
    });
    res.json(userList);
});

app.post('/api/export/pdf', function(req, res) {
    try {
        var reportData = req.body;
        if (!reportData || Object.keys(reportData).length === 0) {
            return res.status(400).json({ error: '报告数据不能为空' });
        }
        generatePDFReport(reportData).then(function(buffer) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="MetaScan_' + (new Date().toISOString().split('T')[0]) + '.pdf"');
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        }).catch(function(err) {
            console.error('PDF生成失败:', err.message);
            res.status(500).json({ error: 'PDF生成失败，请稍后重试' });
        });
    } catch (err) {
        console.error('PDF导出异常:', err.message);
        res.status(500).json({ error: 'PDF导出异常，请稍后重试' });
    }
});

app.post('/api/export/word', function(req, res) {
    try {
        var reportData = req.body;
        if (!reportData || Object.keys(reportData).length === 0) {
            return res.status(400).json({ error: '报告数据不能为空' });
        }
        generateWordReport(reportData).then(function(buffer) {
            res.setHeader('Content-Type', 'application/msword;charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="MetaScan_' + (new Date().toISOString().split('T')[0]) + '.doc"');
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        }).catch(function(err) {
            console.error('Word生成失败:', err.message);
            res.status(500).json({ error: 'Word生成失败，请稍后重试' });
        });
    } catch (err) {
        console.error('Word导出异常:', err.message);
        res.status(500).json({ error: 'Word导出异常，请稍后重试' });
    }
});

app.post('/api/export/excel', function(req, res) {
    try {
        var reportData = req.body;
        if (!reportData || Object.keys(reportData).length === 0) {
            return res.status(400).json({ error: '报告数据不能为空' });
        }
        generateExcelReport(reportData).then(function(buffer) {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="MetaScan_' + (new Date().toISOString().split('T')[0]) + '.xlsx"');
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        }).catch(function(err) {
            console.error('Excel生成失败:', err.message);
            res.status(500).json({ error: 'Excel生成失败，请稍后重试' });
        });
    } catch (err) {
        console.error('Excel导出异常:', err.message);
        res.status(500).json({ error: 'Excel导出异常，请稍后重试' });
    }
});

app.post('/api/diagnosis', async function(req, res) {
    try {
        if (!AI_API_KEY) {
            return res.status(503).json({
                error: 'AI诊断服务未启用',
                detail: '请设置DEEPSEEK_API_KEY环境变量以启用AI诊断功能'
            });
        }

        var input = req.body;
        if (!input.data || Object.keys(input.data).length === 0) {
            return res.status(400).json({ error: '代谢数据不能为空' });
        }

        var startTime = Date.now();
        var result = await analyzeWithAI(input.data, input.historicalRecords || null);

        result.serverProcessingTimeMs = Date.now() - startTime;

        if (result.isFallback) {
            res.json({
                success: false,
                note: result.aiDiagnosisNote,
                result: result,
                metrics: getAIMetrics?.() || {}
            });
        } else {
            res.json({
                success: true,
                result: result,
                metrics: getAIMetrics?.() || {}
            });
        }
    } catch (err) {
        console.error('AI诊断异常:', err.message);
        res.status(500).json({
            error: 'AI诊断失败，请稍后重试'
        });
    }
});

app.post('/api/diagnosis/config', function(req, res) {
    var body = req.body || {};
    var authUsername = body.username;
    var authPassword = body.password;

    if (!validateString(authUsername, 1, 30) || !validateString(authPassword, 1, 128)) {
        return res.status(401).json({ error: '需要认证' });
    }
    var users = readJSON(USERS_FILE);
    if (!users[authUsername]) {
        return res.status(401).json({ error: '需要认证' });
    }
    if (!verifyPassword(authPassword, users[authUsername].password)) {
        return res.status(401).json({ error: '需要认证' });
    }

    var config = body;
    if (config.apiKey) {
        AI_API_KEY = config.apiKey;
        configureAIDiagnosis({ apiKey: AI_API_KEY });
    }
    res.json({
        success: true,
        aiEnabled: !!AI_API_KEY,
        model: 'deepseek-chat'
    });
});

app.get('/api/diagnosis/status', function(req, res) {
    var authUsername = req.query.username;
    var authPassword = req.query.password;

    if (!validateString(authUsername, 1, 30) || !validateString(authPassword, 1, 128)) {
        return res.status(401).json({ error: '需要认证' });
    }
    var users = readJSON(USERS_FILE);
    if (!users[authUsername]) {
        return res.status(401).json({ error: '需要认证' });
    }
    if (!verifyPassword(authPassword, users[authUsername].password)) {
        return res.status(401).json({ error: '需要认证' });
    }

    res.json({
        aiEnabled: !!AI_API_KEY,
        model: AI_API_KEY ? 'deepseek-chat' : 'none',
        metrics: getAIMetrics?.() || {}
    });
});

var chatRateLimiter = rateLimiter(15 * 60 * 1000, 60);

app.post('/api/chat', chatRateLimiter, function(req, res) {
    var body = req.body || {};
    var messages = body.messages;
    var username = body.username || 'guest';
    var convId = body.convId || '';

    if (!AI_API_KEY) {
        return res.status(503).json({ error: 'AI服务未配置' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: '消息内容不能为空' });
    }

    if (messages.length > 35) {
        messages = messages.slice(-35);
    }

    if (!validateString(username, 1, 30)) {
        return res.status(400).json({ error: '无效的用户名' });
    }

    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 30000);

    fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + AI_API_KEY
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            max_tokens: 1024,
            temperature: 0.6,
            top_p: 0.9,
            stream: false
        }),
        signal: controller.signal
    }).then(function(response) {
        clearTimeout(timeoutId);
        if (!response.ok) {
            return response.text().then(function(t) {
                console.error('[Chat] API错误:', response.status, t);
                res.status(502).json({ error: 'AI服务响应异常' });
            });
        }
        return response.json();
    }).then(function(data) {
        if (!data || !data.choices || !data.choices[0]) {
            return res.status(502).json({ error: 'AI返回数据异常' });
        }
        var reply = data.choices[0].message.content || '';
        var newConvId = convId || (data.id || ('conv_' + Date.now().toString(36)));

        res.json({
            success: true,
            reply: reply,
            convId: newConvId,
            usage: data.usage || {}
        });
    }).catch(function(err) {
        clearTimeout(timeoutId);
        console.error('[Chat] 请求失败:', err.message);
        if (err.name === 'AbortError') {
            return res.status(504).json({ error: 'AI响应超时，请稍后重试' });
        }
        res.status(500).json({ error: 'AI服务暂时不可用，请稍后重试' });
    });
});

app.use('/dist', express.static(path.join(__dirname, 'dist')));

app.use('/manifest.json', function(req, res, next) {
    res.setHeader('Content-Type', 'application/manifest+json');
    next();
});

app.use('/sw.js', function(req, res, next) {
    res.setHeader('Service-Worker-Allowed', '/');
    next();
});

app.use(express.static(__dirname));

var server = createServer(app);

var wss = new WebSocketServer({ server: server, path: '/ws' });

wss.on('connection', function(ws, req) {
    var clientUsername = null;
    var isAuthenticated = false;

    ws.on('message', function(data) {
        try {
            var parsed = JSON.parse(data.toString());

            if (parsed.type === 'login') {
                var loginUsername = parsed.username;
                var loginPassword = parsed.password;
                var loginToken = parsed.token;
                var users = readJSON(USERS_FILE);
                var authSuccess = false;

                if (loginToken && authTokens[loginUsername] && authTokens[loginUsername].token === loginToken) {
                    if (Date.now() - authTokens[loginUsername].createdAt < 24 * 60 * 60 * 1000) {
                        authSuccess = true;
                    }
                } else if (validateString(loginUsername, 1, 30) &&
                    users[loginUsername] &&
                    validateString(loginPassword, 1, 128) &&
                    verifyPassword(loginPassword, users[loginUsername].password)) {
                    var newToken = crypto.randomBytes(32).toString('hex');
                    authTokens[loginUsername] = { token: newToken, createdAt: Date.now() };
                    authSuccess = true;
                }

                if (authSuccess) {
                    clientUsername = loginUsername;
                    isAuthenticated = true;
                    connectedClients[clientUsername] = ws;
                    ws.send(JSON.stringify({ type: 'login', success: true, username: clientUsername }));
                } else {
                    ws.send(JSON.stringify({ type: 'login', success: false, error: '认证失败' }));
                }
                return;
            }

            if (!isAuthenticated && parsed.type !== 'login') {
                ws.send(JSON.stringify({ type: 'error', error: '请先登录' }));
                return;
            }

            if (parsed.type === 'typing') {
                var to = parsed.to;
                if (connectedClients[to] && connectedClients[to].readyState === 1) {
                    connectedClients[to].send(JSON.stringify({ type: 'typing', from: clientUsername, isTyping: parsed.isTyping }));
                }
            }

            if (parsed.type === 'message') {
                var msg = parsed.message;
                if (!msg || !validateString(msg.sender, 1, 30) || !msg.content || typeof msg.content !== 'string' || msg.content.length > 50000) {
                    ws.send(JSON.stringify({ type: 'error', error: '无效的消息格式' }));
                    return;
                }
                if (msg.type && !['text', 'image', 'voice', 'file', 'prescription'].includes(msg.type)) {
                    ws.send(JSON.stringify({ type: 'error', error: '无效的消息类型' }));
                    return;
                }
                if (msg.sender !== clientUsername) {
                    ws.send(JSON.stringify({ type: 'error', error: '发送者不匹配' }));
                    return;
                }
                if (!msg.id) msg.id = uuidv4();
                if (!msg.timestamp) msg.timestamp = new Date().toISOString();
                if (msg.read === undefined) msg.read = false;
                if (msg.isRecalled === undefined) msg.isRecalled = false;
                addMessage(msg.sender, msg);
                if (msg.recipient && msg.recipient !== msg.sender) {
                    addMessage(msg.recipient, msg);
                }
                if (connectedClients[msg.recipient] && connectedClients[msg.recipient].readyState === 1) {
                    connectedClients[msg.recipient].send(JSON.stringify({ type: 'message', message: msg }));
                }
                ws.send(JSON.stringify({ type: 'message', message: msg, echo: true }));
            }

            if (parsed.type === 'read') {
                var messageId = parsed.messageId;
                if (clientUsername) {
                    var msgs = getMessages(clientUsername);
                    msgs = msgs.map(function(m) {
                        if (m.id === messageId) { m.read = true; m.readAt = new Date().toISOString(); }
                        return m;
                    });
                    saveMessages(clientUsername, msgs);
                }
            }

            if (parsed.type === 'recall') {
                var recallId = parsed.messageId;
                var senderMsgs = getMessages(clientUsername);
                var foundMsg = null;
                senderMsgs = senderMsgs.map(function(m) {
                    if (m.id === recallId) {
                        var msgTime = new Date(m.timestamp).getTime();
                        if (Date.now() - msgTime <= 5 * 60 * 1000) {
                            m.isRecalled = true;
                            m.content = '消息已撤回';
                            foundMsg = m;
                        }
                    }
                    return m;
                });
                if (foundMsg) {
                    saveMessages(clientUsername, senderMsgs);
                    if (foundMsg.recipient && foundMsg.recipient !== clientUsername) {
                        var rcptMsgs = getMessages(foundMsg.recipient);
                        rcptMsgs = rcptMsgs.map(function(m) {
                            if (m.id === recallId) { m.isRecalled = true; m.content = '消息已撤回'; }
                            return m;
                        });
                        saveMessages(foundMsg.recipient, rcptMsgs);
                        if (connectedClients[foundMsg.recipient]) {
                            connectedClients[foundMsg.recipient].send(JSON.stringify({ type: 'recall', messageId: recallId, sender: clientUsername, recipient: foundMsg.recipient }));
                        }
                    }
                }
                ws.send(JSON.stringify({ type: 'recall', messageId: recallId, success: !!foundMsg }));
            }
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', error: e.message }));
        }
    });

    ws.on('close', function() {
        if (clientUsername) {
            delete connectedClients[clientUsername];
            Object.keys(connectedClients).forEach(function(user) {
                if (connectedClients[user] && connectedClients[user].readyState === 1) {
                    connectedClients[user].send(JSON.stringify({ type: 'userOffline', username: clientUsername }));
                }
            });
        }
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket连接成功，请发送login消息进行认证' }));
});

server.listen(PORT, function() {
    console.log('='.repeat(50));
    console.log('MetaScan Server 启动成功！');
    console.log('HTTP API:  http://localhost:' + PORT + '/api');
    console.log('WebSocket: ws://localhost:' + PORT + '/ws');
    console.log('文件上传:  http://localhost:' + PORT + '/api/upload');
    console.log('='.repeat(50));
});

export { app, server, wss };