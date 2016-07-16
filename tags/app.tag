<app class="{app_prefs: showPrefs}" style="background-color: {prefs.backgroundColor}">
    <div class="paranja {paranja_visible: paranjaVisible}"></div>
    <navbar>
        <navbar__sandwich onclick={onClickSandwich}>&#9776;</navbar__sandwich><navbar__text>Text photo</navbar__text>
    </navbar>
    <photo prefs={prefs}></photo>
    <div riot-tag="prefs" data={prefs}></prefs>
<script>
var self = this;

self.prefs = {
    backgroundColor: '#000000',
    bold: false,
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    lineHeight: 20,
    width: 1024,
    height: 768,
    url: 'images/red_flower.jpg'
};

self.showPrefs = true;

onClickSandwich(e) {
    self.showPrefs = !self.showPrefs;
    self.tags.photo.update();
}

self.tags.photo.on('hide-prefs', function() {
    self.showPrefs = false;
    self.tags.prefs.update();
});

self.paranjaVisible = false;

self.tags.photo.on('show-paranja', function() {
    self.paranjaVisible = true;
    self.update();
});

self.tags.photo.on('hide-paranja', function() {
    self.paranjaVisible = false;
    self.update();
});

self.tags.prefs.on('change', function() {
    self.tags.photo.update();
});

self.tags.prefs.on('changeText', function(data) {
    self.tags.photo.trigger('changeText', data);
});

</script>
</app>
