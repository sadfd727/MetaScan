var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

function generatePNG(size, outputPath) {
    var width = size;
    var height = size;
    var r = 5, g = 150, b = 105;

    var signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    var rawData = Buffer.alloc((width * 3 + 1) * height);
    for (var y = 0; y < height; y++) {
        var rowOffset = y * (width * 3 + 1);
        rawData[rowOffset] = 0;
        for (var x = 0; x < width; x++) {
            var pixelOffset = rowOffset + 1 + x * 3;

            var cx = width / 2, cy = height / 2;
            var dx = (x - cx) / (width * 0.45);
            var dy = (y - cy) / (height * 0.45);
            var dist = Math.sqrt(dx * dx + dy * dy);

            var cornerRadius = size * 0.19;
            var inCorner =
                (x < cornerRadius && y < cornerRadius && Math.sqrt(Math.pow(cornerRadius - x, 2) + Math.pow(cornerRadius - y, 2)) > cornerRadius) ||
                (x > width - cornerRadius && y < cornerRadius && Math.sqrt(Math.pow(x - (width - cornerRadius), 2) + Math.pow(cornerRadius - y, 2)) > cornerRadius) ||
                (x < cornerRadius && y > height - cornerRadius && Math.sqrt(Math.pow(cornerRadius - x, 2) + Math.pow(y - (height - cornerRadius), 2)) > cornerRadius) ||
                (x > width - cornerRadius && y > height - cornerRadius && Math.sqrt(Math.pow(x - (width - cornerRadius), 2) + Math.pow(y - (height - cornerRadius), 2)) > cornerRadius);

            if (inCorner) {
                rawData[pixelOffset] = 240;
                rawData[pixelOffset + 1] = 253;
                rawData[pixelOffset + 2] = 244;
            } else {
                var shade = 0.92 + dist * 0.08;
                rawData[pixelOffset] = Math.min(255, Math.round(r * shade));
                rawData[pixelOffset + 1] = Math.min(255, Math.round(g * shade));
                rawData[pixelOffset + 2] = Math.min(255, Math.round(b * shade));
            }
        }
    }

    var compressed = zlib.deflateSync(rawData);

    function createChunk(type, data) {
        var length = Buffer.alloc(4);
        length.writeUInt32BE(data.length, 0);
        var typeBuffer = Buffer.from(type, 'ascii');
        var crcData = Buffer.concat([typeBuffer, data]);
        var crc = crc32(crcData);
        var crcBuffer = Buffer.alloc(4);
        crcBuffer.writeUInt32BE(crc >>> 0, 0);
        return Buffer.concat([length, typeBuffer, data, crcBuffer]);
    }

    var ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    var chunks = [
        createChunk('IHDR', ihdr),
        createChunk('IDAT', compressed),
        createChunk('IEND', Buffer.alloc(0))
    ];

    var png = Buffer.concat([signature].concat(chunks));

    var dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, png);
    console.log('Generated:', outputPath, '(' + size + 'x' + size + ', ' + png.length + ' bytes)');
}

function crc32(buf) {
    var crcTable = [];
    for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c;
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF);
}

var iconsDir = path.join(__dirname, '..', 'public', 'icons');
generatePNG(192, path.join(iconsDir, 'icon-192.png'));
generatePNG(512, path.join(iconsDir, 'icon-512.png'));