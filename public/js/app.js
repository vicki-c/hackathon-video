App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

App.Router.map(function() {
    this.resource('video', { path: '/:video_id' });
});

App.VideoRoute = Ember.Route.extend({
    model: function(params) {
        return {
            video_id: params.video_id,
            video_url: 'http://www.youtube.com/watch?v=' + params.video_id
        };
    }
});

App.VideoPlayerView = Ember.View.extend({
    didInsertElement : function() {
        // JavaScript object for later use
        var player = new MediaElementPlayer('#player', {
            success: function(media, domNode, player) {
                // add HTML5 events to the YouTube API media object
                media.addEventListener('play', function() {
                    console.log('yeah, it is playing!');
                }, false);
         
                media.addEventListener('timeupdate', function() {
        // access HTML5-like properties
                    console.log('current: ' + media.currentTime);
                }, false);
         
                // add click events to control player
                myMuteButton.addEventListener('click', function() {
                    // HTML5 has a "muted" setter, but we have to use a function here
                    media.setMuted(true);
                }, false);
            }
        });
        // ... more code ...
        player.play();
    }
});