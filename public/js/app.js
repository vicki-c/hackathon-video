App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

App.ApplicationAdapter = DS.FixtureAdapter.extend();

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

App.VideoTranscription = DS.Model.extend({
    sourceSegments: DS.hasMany('segment'),
    targetSegments: DS.hasMany('segment')
});

App.Segment = DS.Model.extend({
    text: DS.attr('string'),
    start: DS.attr(),
    end: DS.attr()
});

App.VideoController = Ember.ObjectController.extend({
    actions: {
        timeUpdated: function(time){
            console.log('current: ' + time);
        }
    }
});

App.VideoPlayerView = Ember.View.extend({
    didInsertElement : function() {
        // JavaScript object for later use
        var self = this;
        var player = new MediaElementPlayer('#player', {
            alwaysShowControls: true,
            features: ['playpause','current','progress'],
            
            success: function(media, domNode, player) {
                // add HTML5 events to the YouTube API media object
                media.addEventListener('play', function() {
                    console.log('yeah, it is playing!');
                }, false);
         
                media.addEventListener('timeupdate', function() {
                    // access HTML5-like properties
                    self.get('controller').send('timeUpdated', media.currentTime);
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