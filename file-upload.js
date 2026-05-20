var API_BASE = 'http://localhost:3001/api';

function uploadFile(file, onProgress, onComplete, onError) {
    var formData = new FormData();
    formData.append('file', file);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/upload', true);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable && onProgress) {
            var percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent, e.loaded, e.total);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.success && onComplete) {
                    onComplete(result.file);
                } else if (onError) {
                    onError(result.error || '上传失败');
                }
            } catch (e) {
                if (onError) onError('响应解析失败');
            }
        } else {
            if (onError) onError('上传失败 (HTTP ' + xhr.status + ')');
        }
    };

    xhr.onerror = function() {
        if (onError) onError('网络错误，上传失败');
    };

    xhr.send(formData);
    return xhr;
}

function getFileTypeIcon(mimetype) {
    if (!mimetype) return '📄';
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.includes('pdf')) return '📕';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📽️';
    if (mimetype.startsWith('text/')) return '📃';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return '🗜️';
    return '📄';
}

function getFileTypeName(mimetype) {
    if (!mimetype) return '文件';
    if (mimetype.startsWith('image/')) return '图片';
    if (mimetype.includes('pdf')) return 'PDF文档';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'Word文档';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'Excel表格';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'PPT演示';
    if (mimetype.startsWith('text/')) return '文本文件';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return '压缩文件';
    return '文件';
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function openFilePicker(callback, accept) {
    var input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.style.display = 'none';
    input.onchange = function() {
        if (input.files && input.files[0]) {
            callback(input.files[0]);
        }
        document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
}

export { uploadFile, getFileTypeIcon, getFileTypeName, formatFileSize, openFilePicker, API_BASE };