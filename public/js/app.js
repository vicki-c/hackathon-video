App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

App.ApplicationAdapter = DS.FixtureAdapter.extend();

App.Router.map(function() {
    this.resource('video', { path: '/:video_id' });
});

App.VideoRoute = Ember.Route.extend({
    model: function(params) {
        var model = this.store.createRecord('video', {
            videoId: params.video_id
        });
        return model;
    }
});

App.Video = DS.Model.extend({
    videoId: DS.attr('string'),
    sourceSegments: DS.hasMany('segment'),
    targetSegments: DS.hasMany('segment'),
    videoUrl: function() {
        return 'http://www.youtube.com/watch?v=' + this.get('videoId')
    }.property('videoId')
});

App.Segment = DS.Model.extend({
    text: DS.attr('string'),
    start: DS.attr(),
    end: DS.attr()
});

App.VideoController = Ember.ObjectController.extend({
    nextCutoff: 0,
    cutoff: 8,
    sourceProgress: 0,
    actions: {
        timeUpdated: function(media){
            var time = media.currentTime, total = media.duration;
            console.log('current: ' + time, total, this.get('model.sourceSegments'));
            if(time > this.get('nextCutoff')) {
                var segment = this.store.createRecord('segment', {
                    start: time
                });
                this.get('model.sourceSegments').pushObject(segment);
                segment.save();
                this.set('nextCutoff', this.get('nextCutoff')+this.get('cutoff'));
                this.set('sourceProgress', Math.ceil(time*100/total));
            }
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
                    self.get('controller').send('timeUpdated', media);
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