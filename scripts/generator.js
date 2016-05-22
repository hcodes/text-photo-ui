var Async = require('./async');

var escapeHTML = (function () {
    var chr = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };
    return function (text) {
        return text.replace(/[\"&<>]/g, function (a) { return chr[a]; });
    };
}());

var Generator = {
    start: function(data) {
        var img = new Image();
        this._imageObject = img;
        img.onload = function() {
            this._start(data);
        }.bind(this);
        img.src = data.url;
    },
    _start: function(data) {
        if (!this._isInited) {
            this._canvas = document.createElement('canvas');
            this._ctxCanvas = this._canvas.getContext('2d');

            this._isInited = true;
        }

        Object.keys(data).forEach(function(key) {
            this[key] = data[key];
        }, this);

        this._canvas.width = this.width;
        this._canvas.height = this.height;

        this._ctxCanvas.drawImage(this._imageObject, 0, 0);

        this.text = this.text.replace(/\r/g, '');

        var preparedText = this.prepareText(),
            container = document.querySelector('.photo__text-photo');

        this._textWithoutN = preparedText.textWithoutN;

        container.style.fontSize = this.fontSize + 'px';
        container.style.fontFamily = this.fontFamily;
        container.style.lineHeight = this.lineHeight + 'px';
        container.style.fontWeight = this.bold ? 'bold' : 'normal';
        container.style.width = this.width + 'px';
        container.style.height = this.height + 'px';
        container.style.backgroundColor = this.backgroundColor;
        container.style.whiteSpace = 'nowrap';

        container.innerHTML = preparedText.html;

        container.classList.add('photo__text-photo_visible');

        this._spans = container.querySelectorAll('span');
        this._buffer = [];

        var delta = Math.ceil(this._spans.length / 100);
        if (delta < 1) {
            delta = 1;
        }

        for (var i = 0, len = this._spans.length; i < len; i += delta) {
            this.addRequest(i, (i + delta) > len ? len : i + delta);
        }

        Async.run(data.onprogress, function() {
            data.callback(this.prepareData());
        }.bind(this));
    },
    getAverageColor: function(imageData) {
        var data = imageData.data,
            r = 0,
            g = 0,
            b = 0,
            len = data.length,
            step = 8,
            count = len / step;

        for (var i = 0; i < len; i += step) {
            r += data[i]; // red
            g += data[i + 1]; // green
            b += data[i + 2]; // blue
        }

        return {
            r: Math.floor(r / count),
            g: Math.floor(g / count),
            b: Math.floor(b / count)
        };
    },
    addRequest: function(from, to) {
        var that = this,
            photoWidth = that.width,
            photoHeight = that.height;

        Async.add(function() {
            for (var i = from; i < to; i++) {
                var el = that._spans[i],
                    width = el.offsetWidth,
                    height = el.offsetHeight,
                    pos = {
                        left: el.offsetLeft,
                        top: el.offsetTop
                    };

                if (!width || !height || pos.left >= photoWidth || pos.top >= photoHeight) {
                    continue;
                }

                var imageData = that._ctxCanvas.getImageData(pos.left, pos.top, width, height),
                    color = that.getAverageColor(imageData);

                that._buffer[i] = {
                    x: pos.left,
                    y: pos.top,
                    w: width,
                    h: height,
                    l: that._textWithoutN[i],
                    r: color.r,
                    g: color.g,
                    b: color.b
                };
            }
        });
    },
    prepareText: function() {
        var letters = this.text,
            html = '',
            text = '',
            textWithoutN = '';

        for (var i = 0; i < letters.length; i++) {
            var letter = letters[i],
                escapedLetter = escapeHTML(letter);
            if (letter === '\n') {
                html += '<br />';
            } else {
                textWithoutN += letter;
                text += escapedLetter;
                html += '<span>' + escapedLetter + '</span>';
            }
        }

        return {
            textWithoutN: textWithoutN,
            text: text,
            html: html
        };
    },
    prepareData: function(preparedText) {
        var row = [],
            data = [],
            buffer = this._buffer,
            oldY = buffer[0].y;

        data.push(row);
        for(var i = 0; i < buffer.length; i++) {
            var item = buffer[i];
            if (!item || item.l === undefined) {
                console.log(i, item, i-1, buffer[i-1]);
                continue;
            }

            if(item.y != oldY) {
                row = [];
                data.push(row);

                oldY = item.y;
            }

            row.push({
                l: item.l,
                r: item.r,
                g: item.g,
                b: item.b
            });
        }

        return {
            width: this.width,
            height: this.height,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            backgroundColor: this.backgroundColor,
            lineHeight: this.lineHeight,
            bold: this.bold,
            data: data
        };
    }
};

module.exports = Generator;
