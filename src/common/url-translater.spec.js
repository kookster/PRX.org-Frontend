describe('url translater', function () {
  beforeEach(module('prx.url-translate'));

  it ('can define translations', function () {
    module(function (urlTranslateProvider) {
      urlTranslateProvider.translate('/foo', '/bar');
    });
    inject(function (urlTranslate) {});
  });

  it ('can use the translations it has defined', function () {
    module(function (urlTranslateProvider) {
      urlTranslateProvider.translate('/foo', '/bar');
    });
    inject(function (urlTranslate) {
      expect(urlTranslate('/foo')).toEqual('/bar');
    });
  });

  it ('returns whatever is passed in if a translation is not defined', function () {
    inject(function (urlTranslate) {
      expect(urlTranslate('/asdf')).toEqual('/asdf');
    });
  });

  it ('can use uri matchers', function () {
    module(function (urlTranslateProvider) {
      urlTranslateProvider.translate('/foo/*splat', '/test');
    });
    inject(function (urlTranslate) {
      expect(urlTranslate('/foo/bar/baz')).toEqual('/test');
    });
  });

  it ('can use uri templates', function () {
    module(function (urlTranslateProvider) {
      urlTranslateProvider.translate('/stories/:storyId', '/pieces/{storyId}');
    });
    inject(function (urlTranslate) {
      expect(urlTranslate('/stories/123')).toEqual('/pieces/123');
    });
  });

  it ('matches once', function () {
    module(function (urlTranslateProvider) {
      urlTranslateProvider.translate('/stories/:storyId', '/pieces/{storyId}')
      .translate('/stories/:storyId/*splat', '/pieces/{storyId}/more{/splat*}');
    });
    inject(function (urlTranslate) {
      expect(urlTranslate('/stories/123')).toEqual('/pieces/123');
      expect(urlTranslate('/stories/123/details/here')).toEqual('/pieces/123/more/details/here');
    });
  });
});
