var CACHE_VERSION = 'metascan-v2';
var STATIC_CACHE = CACHE_VERSION + '-static';
var DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';
var API_CACHE = CACHE_VERSION + '-api';
var IMAGE_CACHE = CACHE_VERSION + '-images';

var PRECACHE_URLS = [
    '/index.html',
    '/index-vue.html',
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg'
];

var API_TIMEOUT_MS = 8000;

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(function(cache) {
            return cache.addAll(PRECACHE_URLS).catch(function(err) {
                console.warn('[SW] 预缓存部分失败:', err.message);
            });
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) {
                    return key.startsWith('metascan-') &&
                           key !== STATIC_CACHE &&
                           key !== DYNAMIC_CACHE &&
                           key !== API_CACHE &&
                           key !== IMAGE_CACHE;
                }).map(function(key) {
                    return caches.delete(key);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);
    var request = event.request;

    if (request.method !== 'GET') {
        if (request.method === 'POST' && url.pathname.startsWith('/api/')) {
            return;
        }
        return;
    }

    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstWithTimeout(request, API_TIMEOUT_MS));
        return;
    }

    if (url.pathname.startsWith('/ws')) {
        return;
    }

    if (isStaticAsset(url)) {
        event.respondWith(cacheFirstWithRefresh(request));
        return;
    }

    if (isImage(url)) {
        event.respondWith(cacheFirstWithRefresh(request, IMAGE_CACHE));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(navigateOfflineFallback(request));
        return;
    }

    event.respondWith(cacheFirstWithRefresh(request));
});

self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncPendingMessages());
    }
    if (event.tag === 'sync-metabolic-data') {
        event.waitUntil(syncPendingMetabolicData());
    }
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CACHE_URLS') {
        var urls = event.data.urls || [];
        caches.open(DYNAMIC_CACHE).then(function(cache) {
            urls.forEach(function(u) { cache.add(u).catch(function() {}); });
        });
    }
    if (event.data && event.data.type === 'CLEAR_CACHES') {
        caches.keys().then(function(keys) {
            keys.forEach(function(k) { caches.delete(k); });
        }).then(function() {
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({ type: 'CLEARED' });
            }
        });
    }
});

function networkFirstWithTimeout(request, timeoutMs) {
    return new Promise(function(resolve) {
        var timeoutId = setTimeout(function() {
            timeoutId = null;
            resolveFromCache(request, API_CACHE, resolve);
        }, timeoutMs);

        fetch(request).then(function(response) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                if (response && response.status === 200) {
                    var cloned = response.clone();
                    caches.open(API_CACHE).then(function(cache) {
                        cache.put(request, cloned);
                    });
                }
                resolve(response);
            }
        }).catch(function() {
            if (timeoutId) {
                clearTimeout(timeoutId);
                resolveFromCache(request, API_CACHE, resolve);
            }
        });
    });
}

function cacheFirstWithRefresh(request, cacheName) {
    var targetCache = cacheName || DYNAMIC_CACHE;

    return caches.match(request).then(function(cached) {
        var fetchPromise = fetch(request).then(function(response) {
            if (response && response.status === 200) {
                var cloned = response.clone();
                caches.open(targetCache).then(function(cache) {
                    cache.put(request, cloned);
                });
            }
            return response;
        }).catch(function() {
            return cached || new Response('', { status: 408 });
        });

        return cached || fetchPromise;
    });
}

function navigateOfflineFallback(request) {
    return fetch(request).then(function(response) {
        if (response && response.status === 200) {
            var cloned = response.clone();
            caches.open(DYNAMIC_CACHE).then(function(cache) {
                cache.put(request, cloned);
            });
        }
        return response;
    }).catch(function() {
        return caches.match(request).then(function(cached) {
            return cached || caches.match('/offline.html');
        });
    });
}

function resolveFromCache(request, cacheName, resolve) {
    caches.match(request).then(function(cached) {
        if (cached) {
            resolve(cached);
        } else {
            caches.match('/offline.html').then(function(fallback) {
                resolve(fallback || new Response(
                    JSON.stringify({ error: 'offline', detail: '当前处于离线状态，数据可能不是最新的' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                ));
            });
        }
    });
}

function isStaticAsset(url) {
    var path = url.pathname;
    return /\.(js|css|woff2?|ttf|eot)$/.test(path) ||
           path.startsWith('/dist/') ||
           path.startsWith('/assets/');
}

function isImage(url) {
    return /\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname);
}

function syncPendingMessages() {
    return getPendingQueue('msg-queue').then(function(queue) {
        return processQueue(queue, '/api/messages', 'sync-messages');
    });
}

function syncPendingMetabolicData() {
    return getPendingQueue('data-queue').then(function(queue) {
        return processQueue(queue, '/api/diagnosis', 'sync-metabolic-data');
    });
}

function getPendingQueue(key) {
    return new Promise(function(resolve) {
        var channel = new BroadcastChannel('pwa-sync');
        channel.postMessage({ type: 'GET_QUEUE', key: key });
        channel.onmessage = function(e) {
            if (e.data && e.data.type === 'QUEUE_DATA' && e.data.key === key) {
                channel.close();
                resolve(e.data.queue || []);
            }
        };
        setTimeout(function() { channel.close(); resolve([]); }, 2000);
    });
}

function processQueue(queue, endpoint, tag) {
    if (!queue || queue.length === 0) return Promise.resolve();
    return Promise.all(queue.map(function(item) {
        return fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(function(r) {
            return r.ok;
        }).catch(function() {
            return false;
        });
    })).then(function(results) {
        if (results.every(Boolean)) {
            notifyQueueCompleted(tag);
            return true;
        }
        return false;
    });
}

function notifyQueueCompleted(tag) {
    var channel = new BroadcastChannel('pwa-sync');
    channel.postMessage({ type: 'QUEUE_COMPLETED', tag: tag });
    setTimeout(function() { channel.close(); }, 500);
}