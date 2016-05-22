if (typeof window.setImmediate !== 'function') {
    window.setImmediate = function(callback) {
        return setTimeout(callback, 1);
    };
}

var Async = {
    add: function(callback) {
        if (typeof callback === 'function') {
            this._callbacks.push(callback);
        }
    },
    clear: function() {
        this._callbacks = [];
    },
    run: function(onEach, onEnd) {
        var that = this,
            i = 0,
            total = that._callbacks.length,
            onLast = function() {
                console.timeEnd('async');
                onEnd();
                that.clear();
            }

        console.time('async');

        if (!total) {
            onLast();
            return;
        }

        (function each() {
            setImmediate(function() {
                onEach(i, total);
                that._callbacks[i]();
                i++;
                if(i >= total) {
                    onLast();
                } else {
                    each();
                }
            });
        })();
    },
    _callbacks: []
};

module.exports = Async;
