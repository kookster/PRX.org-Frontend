angular.module('prx.accounts', ['ui.router', 'prx.modelConfig', 'prx.url-translate'])
.config(function ($stateProvider, ngHalProvider) {
  $stateProvider.state('account', {
    abstract: true,
    title: 'Accounts',
  }).state('account.show', {
    url: '/accounts/:accountId',
    title: ['account', function (account) { return account.toString() + "’s Stories"; }],
    views: {
      '@': {
        templateUrl: "accounts/account.html",
        controller: 'AccountCtrl as account'
      }
    },
    resolve: {
      account: ['ngHal', '$stateParams', function (ngHal, $stateParams) {
        return ngHal.follow('prx:account', {id: $stateParams.accountId});
      }],
      recentStories: ['account', function (account) {
        return account.follow('prx:stories').follow('prx:items');
      }],
      translateUrl: ['account', 'urlTranslate', function (account, urlTranslate) {
        urlTranslate.addTranslation('/accounts/'+account.id, account.oldPath());
      }]
    }
  }).state('account.show.details', {
    url: '/details',
    views: {
      'modal@': {
        templateUrl: "accounts/detail_modal.html",
        controller: "AccountDetailsCtrl as account"
      }
    }
  });

  ngHalProvider.mixin('http://meta.prx.org/model/account/:type/*splat', ['resolved', 'type',
    function (resolved, type) {
      resolved.imageUrl = resolved.follow('prx:image').get('enclosureUrl').or(null);
      resolved.address = resolved.follow('prx:address');
      if (type == 'individual') {
        type = 'user';
      }
      return {
        oldPath: function () {
          return ['', type, this.path].join('/');
        }
      };
    }
  ]).mixin('http://meta.prx.org/model/account/*any', ['$q', function ($q) {
    return  {
      toString: function () { return this.name; },
      getStories: function () {
        return this.follow('prx:stories').follow('prx:items');
      },
      generatePlaylist: function (list) {
        var skip = [], self = this;

        return $q.all([this.getStories(), addToSkipList(list)]).then(function (data) {
          var stories = data[0];

          for (var i=0; i<stories.length; i++) {
            if (skip.indexOf(stories[i].id) === -1 && stories[i].duration) {
              return stories[i].toSoundParams().then(found);
            }
          }

          return $q.reject();
        });

        function addToSkipList (list) {
          skip.push(list.story.id);
          if (list.previous) {
            return list.previous().then(addToSkipList);
          }
        }

        function found (sfParams) {
          return angular.extend({}, sfParams, {
            producer: self,
            next: angular.bind(self, self.generatePlaylist)
          });
        }
      }
    };
  }]).mixin('http://meta.prx.org/model/address', {
    toString: function () {
      return this.city + ', ' + this.state;
    }
  });
})
.directive('limitToHtml', function ($timeout) {
  function findChild (element) {
    var children = element.contents();
    if (children.length) {
      return findChild(children.eq(children.length - 1));
    } else {
      return element;
    }
  }

  function removeEmptyTrailers (element) {
    var children = element.contents(), lastChild;
    if (children.length) {
      lastChild = children.eq(children.length - 1);
      if (lastChild.text().length) {
        removeEmptyTrailers(lastChild);
        if (isTextNode(lastChild)) {
          while(/\s/.test(lastChild.text()[lastChild.length-1])) {
            lastChild.text(lastChild.text().substr(0, lastChild.text().length-1));
          }
          if (lastChild.text() === '') {
            lastChild.remove();
          }
        }
      } else {
        lastChild.remove();
        removeEmptyTrailers(element);
      }
    }
  }

  function isTextNode(node) {
    return (node.nodeType || node[0] && node[0].nodeType) === 3;
  }

  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var altering = false;
      function notAltering () { altering = false; }
      scope.$watch(function () { return element.html(); }, function () {
        if (!altering) {
          altering = true;
          if (element.text().length > attrs.limitToHtml) {
              var lettersToRemove = element.text().length - attrs.limitToHtml, lastNode;
              while (lettersToRemove > 0) {
                lastNode = element;
                while (lastNode.text().length > lettersToRemove) {
                  if (lastNode.length == 1 && isTextNode(lastNode)) {
                    break;
                  } else {
                    lastNode = lastNode.contents();
                    lastNode = lastNode.eq(lastNode.length - 1);
                  }
                }
                var txt = lastNode.text();
                if (isTextNode(lastNode) && (txt.length - 15) > lettersToRemove) {
                  txt = txt.substr(0, txt.length - lettersToRemove + 1);
                  if (txt[txt.length - 1] == ' ') {
                    lastNode.text(txt.substr(0, txt.length - 1));
                  } else {
                    txt = txt.split(' ');
                    lastNode.text(txt.slice(0, txt.length - 1).join(' '));
                  }
                  lettersToRemove = 0;
                } else {
                  lettersToRemove -= txt.length;
                  lastNode.remove();
                }
              }
              removeEmptyTrailers(element);
              lastNode = findChild(element);
              lastNode.text(lastNode.text() + ' ...');
              scope[attrs.htmlLimited] = true;
            } else {
              scope[attrs.htmlLimited] = false;
            }
            $timeout(notAltering);
          }
      });
    }
  };
})
.directive('prxAccount', function () {
  return {
    restrict: 'E',
    scope: {account: '='},
    templateUrl: 'accounts/embedded_account.html',
    replace: true
  };
})
.directive('prxAccountRecentStories', function ($timeout) {
  return {
    restrict: 'E',
    scope: {
      account: '=',
      limit: '=',
      skip: '='
    },
    templateUrl: 'accounts/recent_stories.html',
    replace: true,
    link: function (scope) {
      $timeout(function () {
        if (!angular.isDefined(scope.loading)) {
          scope.loading = true;
        }
      }, 500);
      scope.account.follow('prx:stories').follow('prx:items').then(function (items) {
        scope.loading = false;
        scope.filteredStories = scope.$eval('stories | skip: skip | limitTo: (limit || 5)', {stories: items});
      });
    }
  };
})
.filter('skip', function () {
  var result = [];
  return function (elems, skip) {
    if (skip) {
      result.length = 0;
      angular.forEach(elems, function (elem) {
        if (elem.id != skip.id) {
          result.push(elem);
        }
      });
      return result;
    }
    return elems;
  };
})
.controller('AccountCtrl', function (account, recentStories) {
  this.current = account;
  this.recentStories = recentStories;
})
.controller('AccountDetailsCtrl', function (account) {
  this.current = account;
});
