describe('prx.stories', function () {
  beforeEach(module('prx.stories', 'angular-hal-mock'));

  describe ('Story mixin', function () {
    var  ngHal, mock;
    beforeEach(inject(function (_ngHal_) {
      ngHal = _ngHal_;
      mock = ngHal.mock('http://meta.prx.org/model/story');
    }));

    it('gets the image', function () {
      mock.stubFollow('prx:image', ngHal.mockEnclosure('http://meta.prx.org/model/image', 'foo.png'));
      mock.transform();
      expect(mock.imageUrl).toEqual('foo.png');
    });

    it ('gets null if the image fails', function () {
      mock.transform();
      expect(mock.imageUrl).toEqual(null);
    });

    it ('correctly copies the length property to duration', function () {
      mock.length = 1234;
      mock.transform();
      expect(mock.duration).toBe(1234);
      expect(mock.length).not.toBeDefined();
    });

    it ('returns title for toString()', function () {
      mock.title = 'asdf';
      expect(mock.toString()).toEqual('asdf');
    });
  });

  describe ('StoryCtrl', function () {
    it ('attaches the story and accounts injected to $scope', inject(function ($controller) {
      var sigil = 'sigil';
      var scope = {};
      var controller = $controller('StoryCtrl', {story: sigil, account: sigil, audioUrls: [sigil], $scope: scope});
      expect(controller.current).toBe(sigil);
      expect(controller.account).toBe(sigil);
    }));

    xit ('starts playback of the story if autoPlay is requested', inject(function ($controller) {
      var player = jasmine.createSpyObj('player', ['play']);
      $controller('StoryCtrl', {story: 'sigil', prxPlayer: player, account: {}, $stateParams: {autoPlay: true}, $scope: {}, audioUrls: []});
      expect(player.play).toHaveBeenCalled();
      expect(player.play.calls.mostRecent().args[0].story).toEqual('sigil');
    }));
  });

  describe ('StoryDetailCtrl', function () {
    it ('attaches the story injected to $scope', inject(function ($controller) {
      var foo = 'asd', scope = {};
      var ctrl = $controller('StoryDetailCtrl', {story: foo, $scope: scope});
      expect(ctrl.current).toBe(foo);
    }));
  });

  describe ('story state', function () {
    var state, $injector, ngHal;
    beforeEach(inject(function ($state, _$injector_, _ngHal_) {
      state = $state.get('story.show');
      $injector = _$injector_;
      ngHal = _ngHal_;
    }));

    it ('gets the story based on the storyId', function () {
      var spy = ngHal.stubFollowOne('prx:story', ngHal.mock());
      $injector.invoke(state.resolve.story, null, {$stateParams: {storyId: 123}});
      expect(spy.calls.mostRecent().args[0]).toEqual({id: 123});
    });

    it ('gets the account based on the story', inject(function (ngHal, $rootScope) {
      var story = ngHal.mock(), account;
      story.stubFollow('prx:account', {a:1});
      expect($injector.
          invoke(state.resolve.account, null, {story: story}).
          get('a')).toResolveTo(1);
    }));

    it ('gets the audioUrls based on the story', function () {
      var story = ngHal.mock('http://meta.prx.org/model/story'),
        file1 = ngHal.mockEnclosure('file1.mp3'),
        file2 = ngHal.mockEnclosure('file2.mp3');
      story.stubFollow('prx:audio', [file1, file2]);
      expect($injector.invoke(state.resolve.audioUrls, null, {
        story: story
      }).get(1).get('url')).toResolveTo('file2.mp3');
    });

    it ('sets the title appropriately', function () {
      expect($injector.invoke(state.title, null, {story: "story", account: "account"})).toEqual("story by account");
    });
  });

  describe('prxSocialActions directive', function () {
    var elem;
    beforeEach(module('templates'));

    beforeEach(inject(function ($compile, $rootScope) {
      elem = $compile('<prx-social-actions text="sigil"></prx-social-actions>')($rootScope);
      $rootScope.$digest();
    }));

    it('compiles', function () {
      expect(elem).toBeDefined();
    });

    it('sets $location on scope', function() {
      expect(elem.isolateScope().$location).toBeDefined();
    });
  });

});
