<prefs class="prefs {prefs_visible: opts.data.visible}">
    <div class="prefs__title">Prefs</div>
    <table class="prefs__properties">
      <tr>
          <td>background-color</td>
          <td><input class="prefs__bg-color" type="color" onchange={onChangeBackgroundColor} value={opts.data.backgroundColor} /></td>
      </tr>
      <tr>
          <td>color</td>
          <td><input class="prefs__color" type="color" onchange={onChangeColor} value={opts.data.color} /></td>
      </tr>
      <tr>
          <td>font-family</td>
          <td>
              <input class="prefs__font-family" type="text" onchange={onChangeFontFamily} value={opts.data.fontFamily} />
          </td>
      </tr>
      <tr>
          <td>font-size</td>
          <td>
              <input class="prefs__font-size" type="number" onchange={onChangeFontSize} value={opts.data.fontSize} />px
          </td>
      </tr>
      <tr>
          <td>line-height</td>
          <td><input class="prefs__line-height" type="number" onchange={onChangeLineHeight} value={opts.data.lineHeight} />px</td>
      </tr>
      <tr>
          <td></td>
          <td><input type="checkbox" onclick={onClickBold} checked="{opts.data.bold}" id="bold" class="prefs__bold" /> <label for="bold">bold</label></td>
      </tr>
    </table>

    <div class="prefs__title">Image</div>
    <table class="prefs__properties">
      <tr>
          <td colspan="2"><input class="prefs__url" type="file" onchange={onChangeUrl} /></td>
      </tr>
      <tr>
          <td>width</td>
          <td><input class="prefs__width" type="number" onchange={onChangeWidth} value={opts.data.width} /> px</td>
      </tr>
      <tr>
          <td>height</td>
          <td>
              <input class="prefs__height" type="number" onchange={onChangeHeight} value={opts.data.height} /> px
          </td>
      </tr>
    </table>

    <div class="prefs__title">Fill</div>
    <table class="prefs__properties">
        <tr>
            <td colspan="2">
                <label><input type="radio" name="fill-value" value="0" onclick={onClickFillRadio} /> A-Z</label><br/>
                <label><input type="radio" name="fill-value" value="1" onclick={onClickFillRadio} /> 0-9</label><br/>
                <label><input type="radio" checked="checked" name="fill-value" value="2" onclick={onClickFillRadio} /> A-Za-z0-9</label><br/>
                <label><input type="radio" name="fill-value" value="3" onclick={onClickFillRadio} /> <input type="text" class="prefs__pattern" placeholder="Input your pattern" onchange={onChangeFillPattern} value="{fillPattern}" /></label>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <input type="button" value="Fill" onclick={onClickFill} />
            </td>
        </tr>
    </table>
</prefs>
<script>
var self = this;
self.fillValue = '2';

onClickFillRadio(e) {
    self.fillValue = e.target.value;
}

onChangeFillPattern(e) {
    self.fillPattern = e.target.value;
}

onClickFill(e) {
    var symWidth = Math.floor(opts.data.width / opts.data.fontSize) * 3;
    var symHeight = Math.floor(opts.data.height / opts.data.lineHeight) + 1;
    var text = '';
    var randomPattern;
    var line;
    switch (self.fillValue) {
        case '0':
            randomPattern = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            break;
        case '1':
            randomPattern = '0123456789';
            break;
        case '2':
            randomPattern = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            break;
    }

    for (var i = 0; i < symHeight; i++) {
        line = '';
        for (var n = 0; n < symWidth; n++) {
            if (self.fillValue === '3') {
                line += self.fillPattern;
                if (line.length > symWidth) {
                    break;
                }
            } else {
                line += getRandomSymbol(randomPattern);
            }
        }
        text += line + '\n';
    }

    self.trigger('changeText', text);
}

function getRandomSymbol(str) {
    return str[Math.floor(Math.random() * str.length)];
}

onChangeWidth(e) {
    opts.data.width = e.target.value;
    self.trigger('change');
}

onChangeHeight(e) {
    opts.data.height = e.target.value;
    self.trigger('change');
}

onChangeUrl(e) {
    var files = e.target.files;

    if (FileReader && files && files.length) {
        var img = new FileReader();
        img.onload = function() {
            var imageSize = new Image();
            imageSize.src = img.result;
            imageSize.onload = function() {
                opts.data.width = imageSize.width;
                opts.data.height = imageSize.height;
                opts.data.url = img.result;

                self.trigger('change');
            };
        };

        img.readAsDataURL(files[0]);
    }
}

onChangeBackgroundColor(e) {
    opts.data.backgroundColor = e.target.value;
    self.trigger('change');
}

onChangeColor(e) {
    opts.data.color = e.target.value;
    self.trigger('change');
}

onChangeFontSize(e) {
    opts.data.fontSize = e.target.value;
    self.trigger('change');
}

onChangeFontFamily(e) {
    opts.data.fontFamily = e.target.value;
    self.trigger('change');
}

onChangeLineHeight(e) {
    opts.data.lineHeight = e.target.value;
    self.trigger('change');
}

onClickBold(e) {
    opts.data.bold = e.target.checked;
    self.trigger('change');
}

</script>
</prefs>
