App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

App.ApplicationAdapter = DS.FixtureAdapter.extend();

App.Router.map(function() {
    this.resource('video', { path: '/:source_language/:target_language/:video_id' });
});

App.VideoRoute = Ember.Route.extend({
    model: function(params) {
        var model = this.store.createRecord('video', {
            videoId: params.video_id,
            sourceLanguage: params.source_language,
            targetLanguage: params.target_language
        });
        return model;
    }
});

App.Video = DS.Model.extend({
    videoId: DS.attr('string'),
    sourceLanguage: DS.attr('string'),
    targetLanguage: DS.attr('string'),
    segments: DS.hasMany('segment'),
    videoUrl: function() {
        return 'http://www.youtube.com/watch?v=' + this.get('videoId');
    }.property('videoId'),
    sourceLanguageName: function() {
        return _LANGUAGES[this.get('sourceLanguage')];
    }.property('sourceLanguage'),
    targetLanguageName: function() {
        return _LANGUAGES[this.get('targetLanguage')];
    }.property('targetLanguage')
});

App.Segment = DS.Model.extend({
    text: DS.attr('string'),
    sourceLanguage: DS.attr('string'),
    targetLanguage: DS.attr('string'),
    start: DS.attr(),
    end: DS.attr(),
    translation: DS.attr('string'),
    nothingSaid: DS.attr(),
    widthStyle : function() {
        return 'width: 200px';
    },
    sourceLanguageName: function() {
        return _LANGUAGES[this.get('sourceLanguage')];
    }.property('sourceLanguage'),
    targetLanguageName: function() {
        return _LANGUAGES[this.get('targetLanguage')];
    }.property('targetLanguage'),
    transcribed: function() {
        return this.get('text') || this.get('nothingSaid');
    }.property('text', 'nothingSaid')
});

var _SEGMENT_WIDTH = 200;
var _LANGUAGES = {
    es: 'Spanish',
    en: 'English',
    fr: 'French',
    de: 'German'
}

App.VideoController = Ember.ObjectController.extend({
    cutoff: 6,
    sourceProgress: 0,
    targetProgress: 0,
    time: 0,
    total: 0,
    allTranslated: true,
    playing: false,
    inputting: false,
    actions: {
        canPlay : function(media) {
            this.set('media', media);
        },
        playing : function() {
            this.set('playing', true);
            this.set('inputting', false);
        },
        timeUpdated : function(media){
            var time = media.currentTime;
            this.set('time', time);
            this.set('total', media.duration); // HACK

            var segment = this._findSegment(time);
            if(!segment || time > (this.get('cutoff') + segment.get('start'))) {
                //console.log('timer', time, segment);
                if(segment) {
                    segment.set('end', time);
                    media.pause();

                    this.set('playing', false);
                    this.set('inputting', true);
                } else {
                    segment = this._makeNewSegment();
                }
            }
            if(segment) {
                // HACK
                var $orig = $('.original #'+segment.id);
                if($orig.width() < _SEGMENT_WIDTH) {
                    var segmentProgress = (time - segment.get('start'))/this.get('cutoff');
                    $orig.css('width', Math.min(_SEGMENT_WIDTH, segmentProgress*_SEGMENT_WIDTH));
                }
                var $trans = $('.translation #'+segment.id);
                if($trans.width() < _SEGMENT_WIDTH) {
                    var segmentProgress = (time - segment.get('start'))/this.get('cutoff');
                    $trans.css('width', Math.min(_SEGMENT_WIDTH, segmentProgress*_SEGMENT_WIDTH));
                }
                if($orig.position() && !$orig.data('scrolled')) {
                    $('.language-track-list').scrollTo($orig, {
                        onAfter: function() {
                            var x = $orig.position().left;
                            var w = $orig.parent().width();
                            if(x > w/2) {
                                $orig.find('.popover').css('left', $orig.position().left - 450).show();
                                if($trans.find('.popover').size() > 0) {
                                    $trans.find('.popover').css('left', $trans.position().left - 450).show();
                                }
                            } else {
                                $orig.find('.popover').css('left', $orig.position().left + 250).show();
                                if($trans.find('.popover').size() > 0) {
                                    $trans.find('.popover').css('left', $trans.position().left + 250).show();
                                }
                            }
                        }
                    });
                    //$orig.ScrollTo();
                    $orig.data('scrolled', true);
                }
            }
        },
        startTranscribing : function() {
            var segments = this.get('model.segments');
            if(segments.get('lastObject')) {
                this.get('media').setCurrentTime(segments.get('lastObject').get('start'));
            }
            this.get('media').play();
        },
        submitTranscription : function(segment) {
            if(segment.get('end') <= this.get('time')) {
                this._makeNewSegment();
            }

            // HACK
            $('.original #'+segment.id).data('scrolled', undefined);
            $('.translation #'+segment.id).data('scrolled', undefined);

            var progress = Math.ceil(segment.get('end')*100/this.get('total'));
            this.set('sourceProgress', Math.max(this.get('sourceProgress'), progress));

            this.set('allTranslated', !this.get('model.segments').any(function(seg) {
                return (seg.get('text') && !seg.get('translation') && !seg.get('nothingSaid'));
            }));

            this.get('media').play();
        },
        replay : function(segment) {
            this.get('media').setCurrentTime(segment.get('start'));
            this.get('media').play();
        },
        skipTranscription : function(segment) {
            if(segment.get('end') <= this.get('time')) {
                this._makeNewSegment();
            }

            // HACK
            $('.original #'+segment.id).data('scrolled', undefined);
            $('.translation #'+segment.id).data('scrolled', undefined);

            var progress = Math.ceil(segment.get('end')*100/this.get('total'));
            this.set('sourceProgress', Math.max(this.get('sourceProgress'), progress));
            
            this.get('media').play();
        },
        startTranslating : function() {
            var segments = this.get('model.segments');
            var segmentIndex = -1;
            segments.forEach(function(segment, index) {
                segment.set('translating', segment.get('translation') || segment.get('nothingSaid'));
                if(!segment.get('translating') && segmentIndex < 0) {
                    segmentIndex = index;
                }
            });
            segments.setEach('focus', false);

            //console.log('startTranslating', segmentIndex);
            var segment = this.get('model.segments').objectAt(segmentIndex);
            segment.set('translating', true);
            segment.set('focus', true);

            this._playSegment(segment);
        },
        submitTranslation : function(segment) {
            this.set('allTranslated', !this.get('model.segments').any(function(seg) {
                return (!seg.get('translation') && !seg.get('nothingSaid'));
            }));
            // HACK
            $('.original #'+segment.id).data('scrolled', undefined);
            $('.translation #'+segment.id).data('scrolled', undefined);

            this.set('allTranslated', !this.get('model.segments').any(function(seg) {
                return (seg.get('text') && !seg.get('translation') && !seg.get('nothingSaid'));
            }));
        },
        focusSegment : function(segment) {
            if(segment.get('focus')) {
                return;
            }
            var segments = this.get('model.segments');
            segments.setEach('focus', false);
            segment.set('focus', true);
            this._playSegment(segment);
        }
    },
    _findSegment : function(time) {
        var segments = this.get('model.segments');
        var fittingSegments = segments.filter(function(segment, index) {
            //console.log(segment.get('start'), segment.get('end'));
            return segment.get('start') <= time && (!segment.get('end') || segment.get('end') >= time);
        });
        //console.log(time, segments, fittingSegments);
        if(fittingSegments.length > 0) {
            return fittingSegments.objectAt(fittingSegments.length-1);
        }
        //console.log(time, segments, fittingSegments);
        return null;
    },
    _makeNewSegment : function() {
        var segments = this.get('model.segments');
        var segment = this.store.createRecord('segment', {
            sourceLanguage: this.get('sourceLanguage'), // hack?
            targetLanguage: this.get('targetLanguage'),
            start: this.get('time'),
            focus: true
        });
        //console.log('make new segment', this.get('time'), segment)
        segments.pushObject(segment);
        segment.save();
        //this.set('allTranslated', false);

        return segment;
    },
    _playSegment : function(segment) {
        this.get('media').setCurrentTime(segment.get('start'));
        this.get('media').play();
    }
});

App.SourceSegmentController = Ember.ObjectController.extend({
    actions: {
        submitTranscription : function(segment) {
            //segment.set('text', this.get('transcription'));
            segment.set('played', false);
            segment.set('done', true);
            segment.set('focus', false);
            //this.set('transcription', '');

            this.get('target').send('submitTranscription', segment);
        },
        skipTranscription : function(segment) {
            segment.set('text', '');
            segment.set('played', false);
            //segment.set('done', true);
            //this.set('transcription', '');

            this.get('target').send('skipTranscription', segment);
        },
        close : function() {
            this.set('focus', false);
        },
        toggleKeyboard : function() {
            this.set('virtualKeyboard', !this.get('virtualKeyboard'));
        },
        onSoftKey : function(c) {
            // BIG HACK
            $('name=["transcription"]').insertAtCaret(c);
        }
    },
    toggleNothingSaid : function() {
        if(this.get('model.nothingSaid')) {
            //this.get('model').set('transcription', '');
            //this.get('model').set('translating', true);
        }
    }.observes('model.nothingSaid')
});

App.TargetSegmentController = Ember.ObjectController.extend({
    actions: {
        submitTranslation : function(segment) {
            //segment.set('translation', this.get('translation'));
            //segment.set('played', false);
            //segment.set('done', true);
            segment.set('focus', false);
            //this.set('translation', '');

            this.get('target').send('submitTranslation', segment);
        },
        close : function() {
            this.set('focus', false);
        }
    },
    fetchHints : function() {
        if(!this.get('model.text')) {
            return;
        }

        var self = this;
        $.get('http://d.duolingo.com/words/hints/'+this.get('model.sourceLanguage')+'/'+this.get('model.targetLanguage'), {
            format: 'new',
            sentence: this.get('model.text')
        }, function(data) {
            // hack
            for(var i = 0; i < data.tokens.length; i++) {
                if(!data.tokens[i].hint_table) {
                    continue;
                }
                for(var j = 0; j < data.tokens[i].hint_table.rows.length; j++) {
                    if(j < 5) {
                        data.tokens[i].hint_table.rows[j].show = true;
                    }
                }
            }
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
            enableKeyboard: false,
            features: ['playpause','current','progress'],
            
            success: function(media, domNode, player) {
                // add HTML5 events to the YouTube API media object
                media.addEventListener('play', function() {
                    console.log('yeah, it is playing!');
                    self.get('controller').send('playing', media);
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

jQuery.fn.extend({
insertAtCaret: function(myValue){
  return this.each(function(i) {
    if (document.selection) {
      //For browsers like Internet Explorer
      this.focus();
      var sel = document.selection.createRange();
      sel.text = myValue;
      this.focus();
    }
    else if (this.selectionStart || this.selectionStart == '0') {
      //For browsers like Firefox and Webkit based
      var startPos = this.selectionStart;
      var endPos = this.selectionEnd;
      var scrollTop = this.scrollTop;
      this.value = this.value.substring(0, startPos)+myValue+this.value.substring(endPos,this.value.length);
      this.focus();
      this.selectionStart = startPos + myValue.length;
      this.selectionEnd = startPos + myValue.length;
      this.scrollTop = scrollTop;
    } else {
      this.value += myValue;
      this.focus();
    }
  });
}
});