<photo>
    <div class="pbar" style="width: {pbarValue}%"></div>

    <div class="photo__control">
        <input type="button" class="photo__generate" onclick={onClickGenerate} value="Generate" />
        <input type="button" class="photo__save" onclick={onClickSave} value="Save" />
    </div>

    <div class="photo__result"></div>

    <div class="photo {'photo_left-pad': opts.prefs.visible}" style="background-color: {opts.prefs.backgroundColor}">
        <div class="photo__text-photo"></div>
        <textarea class="photo__input {photo__input_visible: text}" spellcheck="false" style="
            background: url({opts.prefs.url}) 0 0 no-repeat;
            width: {opts.prefs.width}px;
            height: {opts.prefs.height}px;
            color: {opts.prefs.color};
            line-height: {opts.prefs.lineHeight}px;
            font-size: {opts.prefs.fontSize}px;
            font-family: {opts.prefs.fontFamily};
            font-weight: {opts.prefs.bold ? 'bold' : 'normal'};
            " onchange="{onChangeText}">{text}</textarea>
    </div>
<script>
var self = this,
    lastResult = '',
    Generator = require('../scripts/generator'),
    textPhoto = require('../scripts/text-photo');

self.pbarValue = 0;
var text = '';
var exText = 'Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! ! Hello world!!! Hello world!!! Hello world!!! Hello world!!!\n';

for (var i = 0; i < 50; i++) {
    text += exText;
}

self.text = text;

showTextPhoto(data) {
    var div = document.createElement('div');
    div.className = 'photo__result';
    document.body.appendChild(div);
    div.style.display = 'block';
    textPhoto(div, data);
}

onChangeText(e) {
    self.text = e.target.value;
}

onClickGenerate() {
    self.trigger('hide-prefs');
    self.trigger('show-paranja');

    var data = {};

    [
        'width',
        'height',
        'bold',
        'backgroundColor',
        'fontFamily',
        'fontSize',
        'lineHeight',
        'url',
        'text'
    ].forEach(function(key) {
        data[key] = opts.prefs[key];
    });

    data.onprogress = function(value, total) {
        self.pbarValue = value / (total || 1) * 100;
        self.update();
    };

    data.callback = function(res) {
        self.pbarValue = 0;
        self.update();
        //self.trigger('hide-paranja');
        self.showTextPhoto(res);

        lastResult = res;
    };

    data.text = self.text;

    Generator.start(data);
}
</script>
</photo>
