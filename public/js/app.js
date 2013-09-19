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
    segments: DS.hasMany('segment'),
    videoUrl: function() {
        return 'http://www.youtube.com/watch?v=' + this.get('videoId')
    }.property('videoId')
});

App.Segment = DS.Model.extend({
    text: DS.attr('string'),
    start: DS.attr(),
    end: DS.attr(),
    translation: DS.attr('string')
});

App.VideoController = Ember.ObjectController.extend({
    nextCutoff: 0,
    cutoff: 6,
    sourceProgress: 0,
    time: 0,
    total: 0,
    actions: {
        canPlay : function(media) {
            this.set('media', media);
        },
        timeUpdated : function(media){
            var time = media.currentTime;
            this.set('time', time);
            this.set('total', media.duration); // HACK
            if(time > this.get('nextCutoff')) {
                var segment = this._findSegment(time);
                if(segment) {
                    segment.set('played', true);
                    segment.set('end', time);
                    media.pause();
                } else {
                    this._makeNewSegment();
                }
            }
        },
        submitTranscription : function(segment) {
            if(segment.get('end') <= this.get('time')) {
                this._makeNewSegment();
            }

            var progress = Math.ceil(segment.get('end')*100/this.get('total'));
            this.set('sourceProgress', Math.max(this.get('sourceProgress'), progress));

            this.get('media').play();
        },
        replay : function(segment) {
            this.get('media').setCurrentTime(segment.get('start'));
            this.get('media').play();
        },
        skip : function(segment) {
            if(segment.get('end') <= this.get('time')) {
                this._makeNewSegment();
            }

            var progress = Math.ceil(segment.get('end')*100/this.get('total'));
            this.set('sourceProgress', Math.max(this.get('sourceProgress'), progress));
            
            this.get('media').play();
        },
        startTranslating : function() {
            var segmentIndex = this.get('model.segments').filterBy('translated').length;

            var segment = this.get('model.segments').objectAt(segmentIndex);
            segment.set('translating', true);

            this.set('nextCutoff', segment.get('end'));
            this.get('media').setCurrentTime(segment.get('start'));
            this.get('media').play();
        }
    },
    _findSegment : function(time) {
        var segments = this.get('model.segments');
        var fittingSegments = segments.filter(function(segment, index) {
            return segment.get('start') <= time && (!segment.get('end') || segment.get('end') >= time);
        });
        if(fittingSegments.length == 1) {
            return fittingSegments.objectAt(0);
        }
        return null;
    },
    _makeNewSegment : function() {
        var segments = this.get('model.segments');
        var segment = this.store.createRecord('segment', {
            start: this.get('time')
        });
        segments.pushObject(segment);
        segment.save();
        this.set('nextCutoff', this.get('nextCutoff')+this.get('cutoff'));
    }
});

App.SourceSegmentController = Ember.ObjectController.extend({
    actions: {
        submitTranscription : function(segment) {
            segment.set('text', this.get('transcription'));
            segment.set('played', false);
            segment.set('done', true);
            this.set('transcription', '');

            this.get('target').send('submitTranscription', segment);
        },
        skip : function(segment) {
            segment.set('played', false);
            //segment.set('done', true);
            this.set('transcription', '');

            this.get('target').send('skip', segment);
        }
    },
    toggleNothingSaid : function() {
        this.set('transcription', '');
    }.observes('model.nothingSaid')
});

App.TargetSegmentController = Ember.ObjectController.extend({
    fetchHints : function() {
        if(!this.get('model.text')) {
            return;
        }

        var self = this;
        $.get('http://d.duolingo.com/words/hints/fr/en', {
            format: 'new',
            sentence: this.get('model.text')
        }, function(data) {
            self.set('hints', data.tokens);
        }, 'jsonp');
    }.observes('model.text')
});

App.HintableView = Ember.View.extend({
    tagName : 'span',
    classNames : ['hintable'],
    mouseEnter : function(e) {
        this.set('isShown', true);
    },
    mouseLeave : function(e) {
        this.set('isShown', false);
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