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
    cutoff: 6,
    sourceProgress: 0,
    time: 0,
    total: 0,
    actions: {
        canPlay: function(media) {
            this.set('media', media);
        },
        timeUpdated: function(media){
            var time = media.currentTime;
            this.set('time', time);
            this.set('total', media.duration); // HACK
            if(time > this.get('nextCutoff')) {
                var segments = this.get('model.sourceSegments');

                var lastSegment = segments.get('lastObject');
                if(lastSegment) {
                    lastSegment.set('played', true);
                    lastSegment.set('end', time);
                    console.log('pause')
                    media.pause();
                } else {
                    this._makeNewSegment();
                }
            }
        },
        submitTranscription: function(segment) {
            if(segment.get('end') <= this.get('time')) {
                this._makeNewSegment();
            }

            var progress = Math.ceil(segment.get('end')*100/this.get('total'));
            this.set('sourceProgress', Math.max(this.get('sourceProgress'), progress));

            this.get('media').play();
        },
        replay: function(segment) {
            this.get('media').setCurrentTime(segment.get('start'));
            this.get('media').play();
        },
        skip: function(segment) {
            if(segment.get('end') <= this.get('time')) {
                this._makeNewSegment();
            }

            var progress = Math.ceil(segment.get('end')*100/this.get('total'));
            this.set('sourceProgress', Math.max(this.get('sourceProgress'), progress));
            
            this.get('media').play();
        }
    },
    _nextSegment: function() {

    },
    _makeNewSegment : function() {
        var segments = this.get('model.sourceSegments');
        var segment = this.store.createRecord('segment', {
            start: this.get('time')
        });
        segments.pushObject(segment);
        segment.save();
        this.set('nextCutoff', this.get('nextCutoff')+this.get('cutoff'));
    }
});

App.SegmentController = Ember.ObjectController.extend({
    actions: {
        submitTranscription: function(segment) {
            segment.set('text', this.get('transcription'));
            segment.set('played', false);
            segment.set('done', true);
            this.set('transcription', '');

            this.get('target').send('submitTranscription', segment);
        },
        skip: function(segment) {
            segment.set('played', false);
            segment.set('done', true);
            this.set('transcription', '');

            this.get('target').send('skip', segment);
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
         
                media.addEventListener('canplay', function() {
                    // access HTML5-like properties
                    self.get('controller').send('canPlay', media);
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