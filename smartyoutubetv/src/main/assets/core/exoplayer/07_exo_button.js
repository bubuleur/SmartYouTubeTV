console.log("Scripts::Running core script exo_button.js");

function ExoButton(selector) {
    this.TAG = 'ExoButton';
    this.selector = selector;

    this.decorator = new ExoButtonDecorator(this);

    /**
     * Return first element that exists (array of selectors case)
     * @returns element element or null
     */
    this.findToggle = function() {
        var btn = null;

        if (Utils.isArray(this.selector)) {
            var revision = ExoUtils.getPlayerRevision();
            var idx = revision == ExoUtils.SECOND_REVISION ? 0 : 1;
            btn = Utils.$(this.selector[idx]);
        } else {
            btn = Utils.$(this.selector);
        }

        btn || Log.w(this.TAG, "unable to find " + this.selector);

        return btn;
    };

    this.getChecked = function() {
        if (ExoUtils.playerIsClosed()) {
            return null; // element not exists (see ActionReceiver.java for details)
        }

        var toggle = this.findToggle();

        if (!toggle) {
            this.isChecked = null;
        } else {
            var isChecked = Utils.hasClass(toggle, YouTubeClasses.ELEMENT_CHECKED);
            var isDisabled = Utils.hasClass(toggle, YouTubeClasses.ELEMENT_DISABLED);
            this.isChecked = isDisabled ? null : isChecked;
        }

        Log.d(this.TAG, "getChecked: " + this.selector + " " + this.isChecked);

        return this.isChecked;
    };
    
    this.setChecked = function(doChecked) {
        if (ExoUtils.playerIsClosed()) {
            console.log("ExoButton: setChecked: video is closed already... do nothing: " + this.selector);
            return;
        }

        var isChecked = this.getChecked();

        if (isChecked == null) {
            console.log("ExoButton: button is disabled or not exists: exiting: " + this.selector);
            return;
        }

        if (isChecked == doChecked) {
            console.log("ExoButton: setChecked: already checked... do nothing: " + this.selector + ' ' + isChecked);
            return;
        }

        console.log("ExoButton: setChecked: " + this.selector + ' ' + doChecked + ' ' + this.findToggle());
        EventUtils.triggerEnter(this.findToggle());
        this.isChecked = doChecked;
    };

    this.decorator.apply();
}

ExoButton.fromSelector = function(selector) {
    function createButton(selector) {
        console.log("ExoButton: fromSelector: create button " + selector);
        switch (selector) {
            case PlayerActivityMapping.TRACK_ENDED:
                return new TrackEndFakeButton(selector);
            case PlayerActivityMapping.BUTTON_SUGGESTIONS:
                return new SuggestionsFakeButton(selector);
            case PlayerActivityMapping.BUTTON_BACK:
                return new BackButton(selector);
            case PlayerActivityMapping.BUTTON_PREV:
            case PlayerActivityMapping.BUTTON_NEXT:
                return new NextPrevButton(selector);
            default:
                // all other buttons is processed here
                return new ExoButton(selector);
        }
    }

    return createButton(selector);

    // 'this' is reference to ExoButton
    // if (!this.btnMap)
    //     this.btnMap = {};
    // if (!this.btnMap[selector]) {
    //     this.btnMap[selector] = createButton(selector);
    // } else {
    //     console.log("ExoButton: fromSelector: getting button from cache " + selector);
    // }
    // return this.btnMap[selector];
};

// ExoButton.resetCache = function() {
//     if (this.btnMap)
//         delete this.btnMap;
// };