var lightboxOverlay = null;
var lightboxImg = null;
var currentImageSrc = '';
var currentImageAlt = '';

var ZOOM_IN_CURSOR = 'zoom-in';

var INTERACTIVE_IMAGE_SELECTOR = 'img.enlargeable, #capturedImage, #avatarImg, #feedbackScreenshotImg';

function createLightbox() {
    if (lightboxOverlay) return;

    lightboxOverlay = document.createElement('div');
    lightboxOverlay.id = 'imageLightboxOverlay';
    lightboxOverlay.className = 'img-lightbox-overlay';
    lightboxOverlay.setAttribute('role', 'dialog');
    lightboxOverlay.setAttribute('aria-label', '图片查看器');

    lightboxOverlay.innerHTML =
        '<div class="img-lightbox-backdrop"></div>' +
        '<button class="img-lightbox-close" aria-label="关闭">&times;</button>' +
        '<div class="img-lightbox-container">' +
            '<img class="img-lightbox-image" id="lightboxImage" alt="">' +
        '</div>' +
        '<div class="img-lightbox-toolbar">' +
            '<button class="img-lightbox-download-btn" id="lightboxDownloadBtn" aria-label="下载图片">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>' +
                '<span>下载原图</span>' +
            '</button>' +
            '<span class="img-lightbox-filename" id="lightboxFilename"></span>' +
        '</div>';

    document.body.appendChild(lightboxOverlay);

    lightboxImg = document.getElementById('lightboxImage');

    lightboxOverlay.addEventListener('click', function(e) {
        if (e.target === lightboxOverlay || e.target.classList.contains('img-lightbox-backdrop')) {
            closeLightbox();
        }
    });

    document.querySelector('.img-lightbox-close').addEventListener('click', closeLightbox);

    document.getElementById('lightboxDownloadBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        downloadImage();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) {
            closeLightbox();
        }
    });
}

function openLightbox(imgEl) {
    if (!imgEl || !imgEl.src || imgEl.src === '' || imgEl.src === window.location.href) return;

    createLightbox();

    currentImageSrc = imgEl.src;
    currentImageAlt = imgEl.alt || '';

    lightboxImg.src = currentImageSrc;
    lightboxImg.alt = currentImageAlt;

    var filenameEl = document.getElementById('lightboxFilename');
    if (filenameEl) {
        filenameEl.textContent = getDisplayFilename(imgEl);
    }

    lightboxOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if (!lightboxOverlay) return;
    lightboxOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function getDisplayFilename(imgEl) {
    var alt = imgEl.alt || '';
    if (alt && alt.length > 0 && alt.length < 50) {
        return alt;
    }

    var src = imgEl.src || '';
    if (src.startsWith('data:')) {
        var mimeMatch = src.match(/^data:(image\/\w+)/);
        var ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png';
        return '图片.' + ext;
    }

    try {
        var url = new URL(src);
        var pathname = url.pathname;
        var filename = pathname.split('/').pop();
        if (filename && filename.length > 0) return decodeURIComponent(filename);
    } catch (e) {}

    return '图片.png';
}

function generateDownloadFilename() {
    if (currentImageSrc.startsWith('data:')) {
        var mimeMatch = currentImageSrc.match(/^data:(image\/\w+)/);
        var ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png';
        ext = ext === 'jpeg' ? 'jpg' : ext;
        var now = new Date();
        var ts = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        return 'metascan_image_' + ts + '.' + ext;
    }

    try {
        var url = new URL(currentImageSrc);
        var pathname = url.pathname;
        var filename = pathname.split('/').pop();
        if (filename && filename.length > 0) {
            return decodeURIComponent(filename).replace(/[<>:"/\\|?*]/g, '_');
        }
    } catch (e) {}

    return 'metascan_image.png';
}

function downloadImage() {
    if (!currentImageSrc) return;

    var anchor = document.createElement('a');
    anchor.href = currentImageSrc;
    anchor.download = generateDownloadFilename();
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

function addImageInteraction(img) {
    if (img.dataset.imageViewerReady === 'true') return;
    img.dataset.imageViewerReady = 'true';

    if (img.id === 'avatarImg' || img.id === 'feedbackScreenshotImg') {
        img.style.cursor = ZOOM_IN_CURSOR;
    } else {
        img.classList.add('enlargeable-image');
    }

    img.addEventListener('click', function(e) {
        e.stopPropagation();
        openLightbox(img);
    });

    img.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(img);
        }
    });
}

function scanAndAttach() {
    var images = document.querySelectorAll(INTERACTIVE_IMAGE_SELECTOR);
    images.forEach(function(img) {
        addImageInteraction(img);
    });
}

function setupMutationObserver() {
    if (window._imageViewerObserver) return;
    window._imageViewerObserver = new MutationObserver(function(mutations) {
        var needsScan = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches(INTERACTIVE_IMAGE_SELECTOR)) {
                            addImageInteraction(node);
                        }
                        if (node.querySelectorAll) {
                            var imgs = node.querySelectorAll(INTERACTIVE_IMAGE_SELECTOR);
                            imgs.forEach(function(img) { addImageInteraction(img); });
                        }
                    }
                });
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                if (mutation.target.matches && mutation.target.matches(INTERACTIVE_IMAGE_SELECTOR)) {
                    addImageInteraction(mutation.target);
                }
            }
        });
    });

    window._imageViewerObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });
}

export function initImageViewer() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            createLightbox();
            scanAndAttach();
            setupMutationObserver();
        });
    } else {
        createLightbox();
        scanAndAttach();
        setupMutationObserver();
    }
}

if (document.readyState !== 'loading') {
    createLightbox();
    scanAndAttach();
    setupMutationObserver();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        createLightbox();
        scanAndAttach();
        setupMutationObserver();
    });
}

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.downloadImage = downloadImage;