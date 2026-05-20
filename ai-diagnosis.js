import { formatPrompt } from './preprocess.js';
import { parseAIResponse, createFallbackResult } from './postprocess.js';

var CONFIG = {
    apiKey: '',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    maxTokens: 4096,
    temperature: 0.3,
    timeoutMs: 30000,
    maxRetries: 2,
    retryDelayMs: 1000
};

var metrics = {
    totalCalls: 0,
    successCalls: 0,
    fallbackCalls: 0,
    totalLatencyMs: 0,
    lastCallTimestamp: null,
    lastLatencyMs: 0,
    errors: []
};

export function configureAIDiagnosis(options) {
    if (options.apiKey) CONFIG.apiKey = options.apiKey;
    if (options.baseURL) CONFIG.baseURL = options.baseURL;
    if (options.model) CONFIG.model = options.model;
    if (options.maxTokens) CONFIG.maxTokens = options.maxTokens;
    if (options.temperature !== undefined) CONFIG.temperature = options.temperature;
    if (options.timeoutMs) CONFIG.timeoutMs = options.timeoutMs;
    if (options.maxRetries !== undefined) CONFIG.maxRetries = options.maxRetries;
    if (options.retryDelayMs) CONFIG.retryDelayMs = options.retryDelayMs;
}

export function getAIMetrics() {
    return {
        totalCalls: metrics.totalCalls,
        successCalls: metrics.successCalls,
        fallbackCalls: metrics.fallbackCalls,
        successRate: metrics.totalCalls > 0
            ? Math.round((metrics.successCalls / metrics.totalCalls) * 10000) / 100
            : 0,
        avgLatencyMs: metrics.successCalls > 0
            ? Math.round(metrics.totalLatencyMs / metrics.successCalls)
            : 0,
        lastLatencyMs: metrics.lastLatencyMs,
        lastCallTimestamp: metrics.lastCallTimestamp,
        recentErrors: metrics.errors.slice(-5)
    };
}

export function clearAIMetrics() {
    metrics.totalCalls = 0;
    metrics.successCalls = 0;
    metrics.fallbackCalls = 0;
    metrics.totalLatencyMs = 0;
    metrics.lastCallTimestamp = null;
    metrics.lastLatencyMs = 0;
    metrics.errors = [];
}

export async function analyzeWithAI(data, historicalRecords) {
    metrics.totalCalls++;
    metrics.lastCallTimestamp = new Date().toISOString();

    if (!CONFIG.apiKey) {
        logError('API key未配置，已回退至规则引擎');
        metrics.fallbackCalls++;
        return createFallbackResult('API key未配置');
    }

    var prompt = formatPrompt(data, historicalRecords);
    var startTime = Date.now();

    try {
        var responseText = await callWithRetry(prompt, CONFIG.maxRetries);
        var elapsed = Date.now() - startTime;

        metrics.successCalls++;
        metrics.totalLatencyMs += elapsed;
        metrics.lastLatencyMs = elapsed;

        var result = parseAIResponse(responseText, data);
        result.processingTimeMs = elapsed;
        result.model = CONFIG.model;

        logInfo('AI分析成功, 耗时: ' + elapsed + 'ms, tokens: ~' + estimateTokens(responseText));
        return result;
    } catch (e) {
        var elapsed = Date.now() - startTime;
        metrics.fallbackCalls++;
        logError('AI分析失败 (' + e.message + '), 耗时: ' + elapsed + 'ms, 已回退至规则引擎');

        var fallback = createFallbackResult('AI分析异常: ' + e.message);
        fallback.processingTimeMs = elapsed;
        return fallback;
    }
}

function callWithRetry(prompt, retriesLeft) {
    return callDeepSeekAPI(prompt).catch(function(err) {
        if (retriesLeft <= 0) throw err;
        logWarn('API调用失败，剩余重试: ' + retriesLeft + ', 错误: ' + err.message);
        return delay(CONFIG.retryDelayMs).then(function() {
            return callWithRetry(prompt, retriesLeft - 1);
        });
    });
}

function callDeepSeekAPI(prompt) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() {
        controller.abort();
    }, CONFIG.timeoutMs);

    return fetch(CONFIG.baseURL + '/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + CONFIG.apiKey
        },
        body: JSON.stringify({
            model: CONFIG.model,
            messages: [
                { role: 'system', content: prompt.systemPrompt },
                { role: 'user', content: prompt.userPrompt }
            ],
            max_tokens: CONFIG.maxTokens,
            temperature: CONFIG.temperature,
            stream: false
        }),
        signal: controller.signal
    }).then(function(response) {
        clearTimeout(timeoutId);
        if (!response.ok) {
            return response.text().then(function(body) {
                var statusText = getHTTPErrorText(response.status);
                throw new Error(statusText + ' (HTTP ' + response.status + '): ' + body.slice(0, 200));
            });
        }
        return response.json();
    }).then(function(data) {
        if (!data.choices || data.choices.length === 0) {
            throw new Error('API返回空结果');
        }
        return data.choices[0].message.content;
    }).catch(function(err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('API请求超时 (' + CONFIG.timeoutMs + 'ms)');
        }
        if (err.message && err.message.indexOf('HTTP') !== -1) {
            throw err;
        }
        throw new Error('API连接失败: ' + err.message);
    });
}

function getHTTPErrorText(status) {
    var errors = {
        400: '请求参数错误', 401: 'API密钥无效',
        402: '账户余额不足', 403: '访问被拒绝',
        429: '请求频率过高', 500: '服务器内部错误',
        502: '网关错误', 503: '服务暂不可用'
    };
    return errors[status] || '未知错误';
}

function delay(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

function estimateTokens(responseText) {
    return Math.round(responseText.length / 2);
}

function logInfo(msg) {
    if (typeof console !== 'undefined' && console.info) {
        console.info('[AI-Diagnosis] ' + msg);
    }
}

function logWarn(msg) {
    if (typeof console !== 'undefined' && console.warn) {
        console.warn('[AI-Diagnosis] ' + msg);
    }
}

function logError(msg) {
    if (typeof console !== 'undefined' && console.error) {
        console.error('[AI-Diagnosis] ' + msg);
    }
    metrics.errors.push({
        timestamp: new Date().toISOString(),
        message: msg
    });
    if (metrics.errors.length > 50) {
        metrics.errors = metrics.errors.slice(-50);
    }
}

export {
    callDeepSeekAPI,
    getHTTPErrorText
};