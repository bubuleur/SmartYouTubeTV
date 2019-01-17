console.log("Scripts::Running core script exo_utils.js");

/**
 * Note: if you intend to rename this var don't forget to do the same inside
 * <b>GetButtonStatesCommand</b> and <b>SyncButtonsCommand</b> classes<br/>
 *
 * Usage: <b>PressCommandBase.java</b><br/>
 * <code>ExoUtils.triggerEvent(ExoUtils.$('%s'), 'keyup', 13);</code><br/>
 *
 * Usage: <b>PressCommandBase.java</b><br/>
 * <code>ExoUtils.isDisabled(targetButton) && app && app.onGenericBooleanResult(false, %s);</code>
 * @constructor empty
 */
var ExoUtils = {
    TAG: 'ExoUtils',
    FIRST_REVISION: 'first_revision',
    SECOND_REVISION: 'second_revision',

    isComponentDisabled: function(element) {
        var el = element;
        if (Utils.isSelector(element)) {
            el = Utils.$(element);
        }
        var hasClass = Utils.hasClass(el, ExoConstants.disabledClass);
        console.log("ExoUtils.isDisabled: " + element + " " + hasClass);
        return hasClass;
    },

    isComponentHidden: function(element) {
        var el = element;
        if (Utils.isSelector(element)) {
            el = Utils.$(element);
        }
        var hasClass = Utils.hasClass(el, ExoConstants.hiddenClass);
        console.log("ExoUtils.isHidden: " + element + " " + hasClass);
        return hasClass;
    },

    // events order:
    // emptied
    // play
    // loadstart
    // loadedmetadata
    // loadeddata (first frame of the video has been loaded)
    // playing
    preparePlayer: function() {
        var $this = this;
        var player = Utils.$('video');
        var onPlayDelayMS = 2000;
        var onLoadDelayMS = 1000;
        var PLAYBACK_STARTED = "playback_started";

        if (!player || player.preparePlayerDone)
            return;

        // we can't pause video because history will not work
        function onLoad() {
            Log.d($this.TAG, 'preparePlayer: video has been loaded into webview... force start playback');
            setTimeout(function() {
                
            }, onLoadDelayMS);
        }

        function onPlaying() {
            setTimeout(function() {
                Log.d($this.TAG, "preparePlayer: oops, video not paused yet... doing pause...");
                // $this.sendAction(PLAYBACK_STARTED);
                player.pause(); // prevent background playback
            }, onPlayDelayMS);
        }

        // once player is created it will be reused by other videos
        // 'loadeddata' is first event when video can be muted
        // player.addEventListener(DefaultEvents.PLAYER_DATA_LOADED, onLoad, false);
        player.addEventListener(DefaultEvents.PLAYER_PLAYING, onPlaying, false);

        Utils.overrideProp(player, 'volume', 0);

        player.preparePlayerDone = true;
    },

    getViewCount: function() {
        var element = Utils.$(ExoConstants.viewCountSelector);
        if (element != null) {
            // don't rely on , symbol parsing here! because it depends on localization
            return element.innerHTML;
        }

        // new player ui
        element = Utils.$(ExoConstants.videoDetailsSelector);
        if (element != null) {
            var parts = element.innerHTML.split('•');
            if (parts.length >= 2) {
                return parts[1].trim();
            }
        }

        return "";
    },

    getVideoDate: function() {
        var element = Utils.$(ExoConstants.uploadDateSelector);
        if (element != null) {
            // don't rely on : symbol parsing here! because it depends on localization
            return element.innerHTML;
        }

        // new player ui
        element = Utils.$(ExoConstants.videoDetailsSelector);
        if (element != null) {
            var parts = element.innerHTML.split('•');
            if (parts.length >= 3) {
                return parts[2].trim();
            }
        }

        return "";
    },

    getScreenWidth: function() {
        return window.innerWidth;
    },

    /**
     * For other hidden ui parts see exoplayer.css
     */
    hidePlayerBackground: function() {
        Utils.$('body').style.backgroundImage = 'initial';
    },

    /**
     * For other hidden ui parts see exoplayer.css
     */
    showPlayerBackground: function() {
        Utils.$('body').style.backgroundImage = '';
    },

    /**
     * For other hidden ui parts see exoplayer.css
     */
    enablePlayerSuggestions: function() {
        Utils.show(ExoConstants.bottomUiSelector);
    },

    /**
     * For other hidden ui parts see exoplayer.css
     */
    disablePlayerSuggestions: function() {
        Utils.hide(ExoConstants.bottomUiSelector);
    },

    /**
     * Used when calling through app boundaries.
     */
    getButtonStates: function() {
        this.hidePlayerBackground();
        this.disablePlayerSuggestions();
        this.preparePlayer();
        new SuggestionsWatcher(null); // init watcher

        var states = {};

        // NOTE: we can't delay here so process in reverse order
        var reversedKeys = Object.keys(PlayerActivityMapping).reverse();

        for (var idx in reversedKeys) {
            var key = reversedKeys[idx];
            var selector = PlayerActivityMapping[key];
            var btn = ExoButton.fromSelector(selector);
            var newName = PlayerActivity[key];
            var isChecked = btn.getChecked();
            if (isChecked === null) // exclude disabled buttons from result
                continue;
            states[newName] = isChecked;
        }

        states[PlayerActivity.VIDEO_DATE] = this.getVideoDate();
        states[PlayerActivity.VIDEO_VIEW_COUNT] = this.getViewCount();
        states[PlayerActivity.SCREEN_WIDTH] = this.getScreenWidth();

        // don't let app to close video player (see ActionsReceiver.java)
        if (window.lastButtonName && window.lastButtonName == PlayerActivity.TRACK_ENDED) {
            states[PlayerActivity.BUTTON_NEXT] = null;
        }

        if (this.playerIsClosed()) {
            this.showPlayerBackground();
        }

        console.log("ExoUtils.getButtonStates: " + JSON.stringify(states));
        return states;
    },

    /**
     * Used when calling through app boundaries.
     */
    syncButtons: function(states) {
        var $this = this;
        // 'likes not saved' fix
        setTimeout(function() {
            $this.syncButtonsReal(states);
        }, 100);
    },

    syncButtonsReal: function(states) {
        this.preparePlayer();
        new SuggestionsWatcher(null); // init watcher

        window.lastButtonName = null;

        console.log("ExoUtils.syncButtons: " + JSON.stringify(states));

        for (var key in PlayerActivity) {
            var btnId = PlayerActivity[key];
            var isChecked = states[btnId];
            if (isChecked == undefined) // button gone, removed etc..
                continue;
            var selector = PlayerActivityMapping[key];
            var btn = ExoButton.fromSelector(selector);
            btn.setChecked(isChecked);
        }
    },

    sendAction: function(action) {
        // code that sends string constant to activity
        if (app && app.onGenericStringResult) {
            console.log("ExoUtils: sending action to the main app: " + action);
            app.onGenericStringResult(action);
        } else {
            console.log('ExoUtils: app not found');
        }
    },

    playerIsClosed: function() {
        return Utils.hasClass(Utils.$(ExoConstants.playerUiSelector), ExoConstants.noModelClass);
    },

    isDisabled: function(elem) {
        var hasClass = Utils.hasClass(elem, ExoConstants.disabledClass);
        console.log("ExoUtils: check elem is disabled: " + EventUtils.toSelector(elem) + ' ' + hasClass);
        return hasClass;
    },

    getPlayerRevision: function() {
        var title = Utils.$(ExoConstants.newPlayerTitleSelector);
        if (title)
            return this.SECOND_REVISION;

        return this.FIRST_REVISION;
    }
};