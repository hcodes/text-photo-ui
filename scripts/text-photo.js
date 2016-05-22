function textPhoto(id, data, inverse) {
    if (!id || !data) {
        return;
    }

    var elem;
    if (typeof id === 'string') {
        elem = document.getElementById(id);
    } else {
        elem = id;
    }

    if (!elem) {
        return;
    }

    var style = elem.style;
    style.width = data.width + 'px';
    style.height = data.height + 'px';
    style.backgroundColor = data.backgroundColor;
    style.fontSize = data.fontSize + 'px';
    style.lineHeight = data.lineHeight + 'px';
    style.fontFamily = data.fontFamily;

    if (data.bold) {
        style.fontWeight = 'bold';
    }

    style.overflow = 'hidden';
    style.whiteSpace = 'nowrap';

    var map = data.data,
        text = '',
        delta = 40;

    for (var x = 0; x < map.length; x++) {
        for (var y = 0; y < map[x].length; y++) {
            var val = map[x][y];

            if (inverse) {
                var r1 = val.r + delta,
                    b1 = val.b + delta,
                    g1 = val.g + delta;
                if (r1 > 255) {
                    r1 = 255;
                } else if (r1 < 0) {
                    r1 = 0;
                }

                if (g1 > 255) {
                    g1 = 255;
                } else if (g1 < 0) {
                    g1 = 0;
                }

                if (b1 > 255) {
                    b1 = 255;
                } else if (b1 < 0) {
                    b1 = 0;
                }

                text += '<span style="background-color:rgb(' + val.r + ',' + val.g + ',' + val.b +
                    '); color:rgb(' + r1 + ',' + g1 + ',' + b1 + ')">' + val.l + '<\/span>';
            } else {
                text += '<span style="color:rgb(' + val.r + ',' + val.g + ',' + val.b +
                    ')">' + val.l + '<\/span>';
            }
        }

        text += '<br />';
    }

    elem.innerHTML = text;
}

module.exports = textPhoto;
