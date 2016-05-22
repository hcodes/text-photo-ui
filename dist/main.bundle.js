(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* Riot v2.4.0, @license MIT */

;(function(window, undefined) {
  'use strict';
var riot = { version: 'v2.4.0', settings: {} },
  // be aware, internal usage
  // ATTENTION: prefix the global dynamic variables with `__`

  // counter to give a unique id to all the Tag instances
  __uid = 0,
  // tags instances cache
  __virtualDom = [],
  // tags implementation cache
  __tagImpl = {},

  /**
   * Const
   */
  GLOBAL_MIXIN = '__global_mixin',

  // riot specific prefixes
  RIOT_PREFIX = 'riot-',
  RIOT_TAG = RIOT_PREFIX + 'tag',
  RIOT_TAG_IS = 'data-is',

  // for typeof == '' comparisons
  T_STRING = 'string',
  T_OBJECT = 'object',
  T_UNDEF  = 'undefined',
  T_FUNCTION = 'function',
  // special native tags that cannot be treated like the others
  SPECIAL_TAGS_REGEX = /^(?:t(?:body|head|foot|[rhd])|caption|col(?:group)?|opt(?:ion|group))$/,
  RESERVED_WORDS_BLACKLIST = /^(?:_(?:item|id|parent)|update|root|(?:un)?mount|mixin|is(?:Mounted|Loop)|tags|parent|opts|trigger|o(?:n|ff|ne))$/,
  // SVG tags list https://www.w3.org/TR/SVG/attindex.html#PresentationAttributes
  SVG_TAGS_LIST = ['altGlyph', 'animate', 'animateColor', 'circle', 'clipPath', 'defs', 'ellipse', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feFlood', 'feGaussianBlur', 'feImage', 'feMerge', 'feMorphology', 'feOffset', 'feSpecularLighting', 'feTile', 'feTurbulence', 'filter', 'font', 'foreignObject', 'g', 'glyph', 'glyphRef', 'image', 'line', 'linearGradient', 'marker', 'mask', 'missing-glyph', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect', 'stop', 'svg', 'switch', 'symbol', 'text', 'textPath', 'tref', 'tspan', 'use'],

  // version# for IE 8-11, 0 for others
  IE_VERSION = (window && window.document || {}).documentMode | 0,

  // detect firefox to fix #1374
  FIREFOX = window && !!window.InstallTrigger
/* istanbul ignore next */
riot.observable = function(el) {

  /**
   * Extend the original object or create a new empty one
   * @type { Object }
   */

  el = el || {}

  /**
   * Private variables
   */
  var callbacks = {},
    slice = Array.prototype.slice

  /**
   * Private Methods
   */

  /**
   * Helper function needed to get and loop all the events in a string
   * @param   { String }   e - event string
   * @param   {Function}   fn - callback
   */
  function onEachEvent(e, fn) {
    var es = e.split(' '), l = es.length, i = 0, name, indx
    for (; i < l; i++) {
      name = es[i]
      indx = name.indexOf('.')
      if (name) fn( ~indx ? name.substring(0, indx) : name, i, ~indx ? name.slice(indx + 1) : null)
    }
  }

  /**
   * Public Api
   */

  // extend the el object adding the observable methods
  Object.defineProperties(el, {
    /**
     * Listen to the given space separated list of `events` and
     * execute the `callback` each time an event is triggered.
     * @param  { String } events - events ids
     * @param  { Function } fn - callback function
     * @returns { Object } el
     */
    on: {
      value: function(events, fn) {
        if (typeof fn != 'function')  return el

        onEachEvent(events, function(name, pos, ns) {
          (callbacks[name] = callbacks[name] || []).push(fn)
          fn.typed = pos > 0
          fn.ns = ns
        })

        return el
      },
      enumerable: false,
      writable: false,
      configurable: false
    },

    /**
     * Removes the given space separated list of `events` listeners
     * @param   { String } events - events ids
     * @param   { Function } fn - callback function
     * @returns { Object } el
     */
    off: {
      value: function(events, fn) {
        if (events == '*' && !fn) callbacks = {}
        else {
          onEachEvent(events, function(name, pos, ns) {
            if (fn || ns) {
              var arr = callbacks[name]
              for (var i = 0, cb; cb = arr && arr[i]; ++i) {
                if (cb == fn || ns && cb.ns == ns) arr.splice(i--, 1)
              }
            } else delete callbacks[name]
          })
        }
        return el
      },
      enumerable: false,
      writable: false,
      configurable: false
    },

    /**
     * Listen to the given space separated list of `events` and
     * execute the `callback` at most once
     * @param   { String } events - events ids
     * @param   { Function } fn - callback function
     * @returns { Object } el
     */
    one: {
      value: function(events, fn) {
        function on() {
          el.off(events, on)
          fn.apply(el, arguments)
        }
        return el.on(events, on)
      },
      enumerable: false,
      writable: false,
      configurable: false
    },

    /**
     * Execute all callback functions that listen to
     * the given space separated list of `events`
     * @param   { String } events - events ids
     * @returns { Object } el
     */
    trigger: {
      value: function(events) {

        // getting the arguments
        var arglen = arguments.length - 1,
          args = new Array(arglen),
          fns

        for (var i = 0; i < arglen; i++) {
          args[i] = arguments[i + 1] // skip first argument
        }

        onEachEvent(events, function(name, pos, ns) {

          fns = slice.call(callbacks[name] || [], 0)

          for (var i = 0, fn; fn = fns[i]; ++i) {
            if (fn.busy) continue
            fn.busy = 1
            if (!ns || fn.ns == ns) fn.apply(el, fn.typed ? [name].concat(args) : args)
            if (fns[i] !== fn) { i-- }
            fn.busy = 0
          }

          if (callbacks['*'] && name != '*')
            el.trigger.apply(el, ['*', name].concat(args))

        })

        return el
      },
      enumerable: false,
      writable: false,
      configurable: false
    }
  })

  return el

}
/* istanbul ignore next */
;(function(riot) {

/**
 * Simple client-side router
 * @module riot-route
 */


var RE_ORIGIN = /^.+?\/\/+[^\/]+/,
  EVENT_LISTENER = 'EventListener',
  REMOVE_EVENT_LISTENER = 'remove' + EVENT_LISTENER,
  ADD_EVENT_LISTENER = 'add' + EVENT_LISTENER,
  HAS_ATTRIBUTE = 'hasAttribute',
  REPLACE = 'replace',
  POPSTATE = 'popstate',
  HASHCHANGE = 'hashchange',
  TRIGGER = 'trigger',
  MAX_EMIT_STACK_LEVEL = 3,
  win = typeof window != 'undefined' && window,
  doc = typeof document != 'undefined' && document,
  hist = win && history,
  loc = win && (hist.location || win.location), // see html5-history-api
  prot = Router.prototype, // to minify more
  clickEvent = doc && doc.ontouchstart ? 'touchstart' : 'click',
  started = false,
  central = riot.observable(),
  routeFound = false,
  debouncedEmit,
  base, current, parser, secondParser, emitStack = [], emitStackLevel = 0

/**
 * Default parser. You can replace it via router.parser method.
 * @param {string} path - current path (normalized)
 * @returns {array} array
 */
function DEFAULT_PARSER(path) {
  return path.split(/[/?#]/)
}

/**
 * Default parser (second). You can replace it via router.parser method.
 * @param {string} path - current path (normalized)
 * @param {string} filter - filter string (normalized)
 * @returns {array} array
 */
function DEFAULT_SECOND_PARSER(path, filter) {
  var re = new RegExp('^' + filter[REPLACE](/\*/g, '([^/?#]+?)')[REPLACE](/\.\./, '.*') + '$'),
    args = path.match(re)

  if (args) return args.slice(1)
}

/**
 * Simple/cheap debounce implementation
 * @param   {function} fn - callback
 * @param   {number} delay - delay in seconds
 * @returns {function} debounced function
 */
function debounce(fn, delay) {
  var t
  return function () {
    clearTimeout(t)
    t = setTimeout(fn, delay)
  }
}

/**
 * Set the window listeners to trigger the routes
 * @param {boolean} autoExec - see route.start
 */
function start(autoExec) {
  debouncedEmit = debounce(emit, 1)
  win[ADD_EVENT_LISTENER](POPSTATE, debouncedEmit)
  win[ADD_EVENT_LISTENER](HASHCHANGE, debouncedEmit)
  doc[ADD_EVENT_LISTENER](clickEvent, click)
  if (autoExec) emit(true)
}

/**
 * Router class
 */
function Router() {
  this.$ = []
  riot.observable(this) // make it observable
  central.on('stop', this.s.bind(this))
  central.on('emit', this.e.bind(this))
}

function normalize(path) {
  return path[REPLACE](/^\/|\/$/, '')
}

function isString(str) {
  return typeof str == 'string'
}

/**
 * Get the part after domain name
 * @param {string} href - fullpath
 * @returns {string} path from root
 */
function getPathFromRoot(href) {
  return (href || loc.href)[REPLACE](RE_ORIGIN, '')
}

/**
 * Get the part after base
 * @param {string} href - fullpath
 * @returns {string} path from base
 */
function getPathFromBase(href) {
  return base[0] == '#'
    ? (href || loc.href || '').split(base)[1] || ''
    : (loc ? getPathFromRoot(href) : href || '')[REPLACE](base, '')
}

function emit(force) {
  // the stack is needed for redirections
  var isRoot = emitStackLevel == 0
  if (MAX_EMIT_STACK_LEVEL <= emitStackLevel) return

  emitStackLevel++
  emitStack.push(function() {
    var path = getPathFromBase()
    if (force || path != current) {
      central[TRIGGER]('emit', path)
      current = path
    }
  })
  if (isRoot) {
    while (emitStack.length) {
      emitStack[0]()
      emitStack.shift()
    }
    emitStackLevel = 0
  }
}

function click(e) {
  if (
    e.which != 1 // not left click
    || e.metaKey || e.ctrlKey || e.shiftKey // or meta keys
    || e.defaultPrevented // or default prevented
  ) return

  var el = e.target
  while (el && el.nodeName != 'A') el = el.parentNode

  if (
    !el || el.nodeName != 'A' // not A tag
    || el[HAS_ATTRIBUTE]('download') // has download attr
    || !el[HAS_ATTRIBUTE]('href') // has no href attr
    || el.target && el.target != '_self' // another window or frame
    || el.href.indexOf(loc.href.match(RE_ORIGIN)[0]) == -1 // cross origin
  ) return

  if (el.href != loc.href) {
    if (
      el.href.split('#')[0] == loc.href.split('#')[0] // internal jump
      || base != '#' && getPathFromRoot(el.href).indexOf(base) !== 0 // outside of base
      || !go(getPathFromBase(el.href), el.title || doc.title) // route not found
    ) return
  }

  e.preventDefault()
}

/**
 * Go to the path
 * @param {string} path - destination path
 * @param {string} title - page title
 * @param {boolean} shouldReplace - use replaceState or pushState
 * @returns {boolean} - route not found flag
 */
function go(path, title, shouldReplace) {
  if (hist) { // if a browser
    path = base + normalize(path)
    title = title || doc.title
    // browsers ignores the second parameter `title`
    shouldReplace
      ? hist.replaceState(null, title, path)
      : hist.pushState(null, title, path)
    // so we need to set it manually
    doc.title = title
    routeFound = false
    emit()
    return routeFound
  }

  // Server-side usage: directly execute handlers for the path
  return central[TRIGGER]('emit', getPathFromBase(path))
}

/**
 * Go to path or set action
 * a single string:                go there
 * two strings:                    go there with setting a title
 * two strings and boolean:        replace history with setting a title
 * a single function:              set an action on the default route
 * a string/RegExp and a function: set an action on the route
 * @param {(string|function)} first - path / action / filter
 * @param {(string|RegExp|function)} second - title / action
 * @param {boolean} third - replace flag
 */
prot.m = function(first, second, third) {
  if (isString(first) && (!second || isString(second))) go(first, second, third || false)
  else if (second) this.r(first, second)
  else this.r('@', first)
}

/**
 * Stop routing
 */
prot.s = function() {
  this.off('*')
  this.$ = []
}

/**
 * Emit
 * @param {string} path - path
 */
prot.e = function(path) {
  this.$.concat('@').some(function(filter) {
    var args = (filter == '@' ? parser : secondParser)(normalize(path), normalize(filter))
    if (typeof args != 'undefined') {
      this[TRIGGER].apply(null, [filter].concat(args))
      return routeFound = true // exit from loop
    }
  }, this)
}

/**
 * Register route
 * @param {string} filter - filter for matching to url
 * @param {function} action - action to register
 */
prot.r = function(filter, action) {
  if (filter != '@') {
    filter = '/' + normalize(filter)
    this.$.push(filter)
  }
  this.on(filter, action)
}

var mainRouter = new Router()
var route = mainRouter.m.bind(mainRouter)

/**
 * Create a sub router
 * @returns {function} the method of a new Router object
 */
route.create = function() {
  var newSubRouter = new Router()
  // assign sub-router's main method
  var router = newSubRouter.m.bind(newSubRouter)
  // stop only this sub-router
  router.stop = newSubRouter.s.bind(newSubRouter)
  return router
}

/**
 * Set the base of url
 * @param {(str|RegExp)} arg - a new base or '#' or '#!'
 */
route.base = function(arg) {
  base = arg || '#'
  current = getPathFromBase() // recalculate current path
}

/** Exec routing right now **/
route.exec = function() {
  emit(true)
}

/**
 * Replace the default router to yours
 * @param {function} fn - your parser function
 * @param {function} fn2 - your secondParser function
 */
route.parser = function(fn, fn2) {
  if (!fn && !fn2) {
    // reset parser for testing...
    parser = DEFAULT_PARSER
    secondParser = DEFAULT_SECOND_PARSER
  }
  if (fn) parser = fn
  if (fn2) secondParser = fn2
}

/**
 * Helper function to get url query as an object
 * @returns {object} parsed query
 */
route.query = function() {
  var q = {}
  var href = loc.href || current
  href[REPLACE](/[?&](.+?)=([^&]*)/g, function(_, k, v) { q[k] = v })
  return q
}

/** Stop routing **/
route.stop = function () {
  if (started) {
    if (win) {
      win[REMOVE_EVENT_LISTENER](POPSTATE, debouncedEmit)
      win[REMOVE_EVENT_LISTENER](HASHCHANGE, debouncedEmit)
      doc[REMOVE_EVENT_LISTENER](clickEvent, click)
    }
    central[TRIGGER]('stop')
    started = false
  }
}

/**
 * Start routing
 * @param {boolean} autoExec - automatically exec after starting if true
 */
route.start = function (autoExec) {
  if (!started) {
    if (win) {
      if (document.readyState == 'complete') start(autoExec)
      // the timeout is needed to solve
      // a weird safari bug https://github.com/riot/route/issues/33
      else win[ADD_EVENT_LISTENER]('load', function() {
        setTimeout(function() { start(autoExec) }, 1)
      })
    }
    started = true
  }
}

/** Prepare the router **/
route.base()
route.parser()

riot.route = route
})(riot)
/* istanbul ignore next */

/**
 * The riot template engine
 * @version v2.4.0
 */
/**
 * riot.util.brackets
 *
 * - `brackets    ` - Returns a string or regex based on its parameter
 * - `brackets.set` - Change the current riot brackets
 *
 * @module
 */

var brackets = (function (UNDEF) {

  var
    REGLOB = 'g',

    R_MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g,

    R_STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'/g,

    S_QBLOCKS = R_STRINGS.source + '|' +
      /(?:\breturn\s+|(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/]))/.source + '|' +
      /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?(\/)[gim]*/.source,

    FINDBRACES = {
      '(': RegExp('([()])|'   + S_QBLOCKS, REGLOB),
      '[': RegExp('([[\\]])|' + S_QBLOCKS, REGLOB),
      '{': RegExp('([{}])|'   + S_QBLOCKS, REGLOB)
    },

    DEFAULT = '{ }'

  var _pairs = [
    '{', '}',
    '{', '}',
    /{[^}]*}/,
    /\\([{}])/g,
    /\\({)|{/g,
    RegExp('\\\\(})|([[({])|(})|' + S_QBLOCKS, REGLOB),
    DEFAULT,
    /^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S.*)\s*}/,
    /(^|[^\\]){=[\S\s]*?}/
  ]

  var
    cachedBrackets = UNDEF,
    _regex,
    _cache = [],
    _settings

  function _loopback (re) { return re }

  function _rewrite (re, bp) {
    if (!bp) bp = _cache
    return new RegExp(
      re.source.replace(/{/g, bp[2]).replace(/}/g, bp[3]), re.global ? REGLOB : ''
    )
  }

  function _create (pair) {
    if (pair === DEFAULT) return _pairs

    var arr = pair.split(' ')

    if (arr.length !== 2 || /[\x00-\x1F<>a-zA-Z0-9'",;\\]/.test(pair)) { // eslint-disable-line
      throw new Error('Unsupported brackets "' + pair + '"')
    }
    arr = arr.concat(pair.replace(/(?=[[\]()*+?.^$|])/g, '\\').split(' '))

    arr[4] = _rewrite(arr[1].length > 1 ? /{[\S\s]*?}/ : _pairs[4], arr)
    arr[5] = _rewrite(pair.length > 3 ? /\\({|})/g : _pairs[5], arr)
    arr[6] = _rewrite(_pairs[6], arr)
    arr[7] = RegExp('\\\\(' + arr[3] + ')|([[({])|(' + arr[3] + ')|' + S_QBLOCKS, REGLOB)
    arr[8] = pair
    return arr
  }

  function _brackets (reOrIdx) {
    return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _cache[reOrIdx]
  }

  _brackets.split = function split (str, tmpl, _bp) {
    // istanbul ignore next: _bp is for the compiler
    if (!_bp) _bp = _cache

    var
      parts = [],
      match,
      isexpr,
      start,
      pos,
      re = _bp[6]

    isexpr = start = re.lastIndex = 0

    while ((match = re.exec(str))) {

      pos = match.index

      if (isexpr) {

        if (match[2]) {
          re.lastIndex = skipBraces(str, match[2], re.lastIndex)
          continue
        }
        if (!match[3]) {
          continue
        }
      }

      if (!match[1]) {
        unescapeStr(str.slice(start, pos))
        start = re.lastIndex
        re = _bp[6 + (isexpr ^= 1)]
        re.lastIndex = start
      }
    }

    if (str && start < str.length) {
      unescapeStr(str.slice(start))
    }

    return parts

    function unescapeStr (s) {
      if (tmpl || isexpr) {
        parts.push(s && s.replace(_bp[5], '$1'))
      } else {
        parts.push(s)
      }
    }

    function skipBraces (s, ch, ix) {
      var
        match,
        recch = FINDBRACES[ch]

      recch.lastIndex = ix
      ix = 1
      while ((match = recch.exec(s))) {
        if (match[1] &&
          !(match[1] === ch ? ++ix : --ix)) break
      }
      return ix ? s.length : recch.lastIndex
    }
  }

  _brackets.hasExpr = function hasExpr (str) {
    return _cache[4].test(str)
  }

  _brackets.loopKeys = function loopKeys (expr) {
    var m = expr.match(_cache[9])

    return m
      ? { key: m[1], pos: m[2], val: _cache[0] + m[3].trim() + _cache[1] }
      : { val: expr.trim() }
  }

  _brackets.array = function array (pair) {
    return pair ? _create(pair) : _cache
  }

  function _reset (pair) {
    if ((pair || (pair = DEFAULT)) !== _cache[8]) {
      _cache = _create(pair)
      _regex = pair === DEFAULT ? _loopback : _rewrite
      _cache[9] = _regex(_pairs[9])
    }
    cachedBrackets = pair
  }

  function _setSettings (o) {
    var b

    o = o || {}
    b = o.brackets
    Object.defineProperty(o, 'brackets', {
      set: _reset,
      get: function () { return cachedBrackets },
      enumerable: true
    })
    _settings = o
    _reset(b)
  }

  Object.defineProperty(_brackets, 'settings', {
    set: _setSettings,
    get: function () { return _settings }
  })

  /* istanbul ignore next: in the browser riot is always in the scope */
  _brackets.settings = typeof riot !== 'undefined' && riot.settings || {}
  _brackets.set = _reset

  _brackets.R_STRINGS = R_STRINGS
  _brackets.R_MLCOMMS = R_MLCOMMS
  _brackets.S_QBLOCKS = S_QBLOCKS

  return _brackets

})()

/**
 * @module tmpl
 *
 * tmpl          - Root function, returns the template value, render with data
 * tmpl.hasExpr  - Test the existence of a expression inside a string
 * tmpl.loopKeys - Get the keys for an 'each' loop (used by `_each`)
 */

var tmpl = (function () {

  var _cache = {}

  function _tmpl (str, data) {
    if (!str) return str

    return (_cache[str] || (_cache[str] = _create(str))).call(data, _logErr)
  }

  _tmpl.haveRaw = brackets.hasRaw

  _tmpl.hasExpr = brackets.hasExpr

  _tmpl.loopKeys = brackets.loopKeys

  _tmpl.errorHandler = null

  function _logErr (err, ctx) {

    if (_tmpl.errorHandler) {

      err.riotData = {
        tagName: ctx && ctx.root && ctx.root.tagName,
        _riot_id: ctx && ctx._riot_id  //eslint-disable-line camelcase
      }
      _tmpl.errorHandler(err)
    }
  }

  function _create (str) {
    var expr = _getTmpl(str)

    if (expr.slice(0, 11) !== 'try{return ') expr = 'return ' + expr

/* eslint-disable */

    return new Function('E', expr + ';')
/* eslint-enable */
  }

  var
    CH_IDEXPR = '\u2057',
    RE_CSNAME = /^(?:(-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*)|\u2057(\d+)~):/,
    RE_QBLOCK = RegExp(brackets.S_QBLOCKS, 'g'),
    RE_DQUOTE = /\u2057/g,
    RE_QBMARK = /\u2057(\d+)~/g

  function _getTmpl (str) {
    var
      qstr = [],
      expr,
      parts = brackets.split(str.replace(RE_DQUOTE, '"'), 1)

    if (parts.length > 2 || parts[0]) {
      var i, j, list = []

      for (i = j = 0; i < parts.length; ++i) {

        expr = parts[i]

        if (expr && (expr = i & 1

            ? _parseExpr(expr, 1, qstr)

            : '"' + expr
                .replace(/\\/g, '\\\\')
                .replace(/\r\n?|\n/g, '\\n')
                .replace(/"/g, '\\"') +
              '"'

          )) list[j++] = expr

      }

      expr = j < 2 ? list[0]
           : '[' + list.join(',') + '].join("")'

    } else {

      expr = _parseExpr(parts[1], 0, qstr)
    }

    if (qstr[0]) {
      expr = expr.replace(RE_QBMARK, function (_, pos) {
        return qstr[pos]
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
      })
    }
    return expr
  }

  var
    RE_BREND = {
      '(': /[()]/g,
      '[': /[[\]]/g,
      '{': /[{}]/g
    }

  function _parseExpr (expr, asText, qstr) {

    expr = expr
          .replace(RE_QBLOCK, function (s, div) {
            return s.length > 2 && !div ? CH_IDEXPR + (qstr.push(s) - 1) + '~' : s
          })
          .replace(/\s+/g, ' ').trim()
          .replace(/\ ?([[\({},?\.:])\ ?/g, '$1')

    if (expr) {
      var
        list = [],
        cnt = 0,
        match

      while (expr &&
            (match = expr.match(RE_CSNAME)) &&
            !match.index
        ) {
        var
          key,
          jsb,
          re = /,|([[{(])|$/g

        expr = RegExp.rightContext
        key  = match[2] ? qstr[match[2]].slice(1, -1).trim().replace(/\s+/g, ' ') : match[1]

        while (jsb = (match = re.exec(expr))[1]) skipBraces(jsb, re)

        jsb  = expr.slice(0, match.index)
        expr = RegExp.rightContext

        list[cnt++] = _wrapExpr(jsb, 1, key)
      }

      expr = !cnt ? _wrapExpr(expr, asText)
           : cnt > 1 ? '[' + list.join(',') + '].join(" ").trim()' : list[0]
    }
    return expr

    function skipBraces (ch, re) {
      var
        mm,
        lv = 1,
        ir = RE_BREND[ch]

      ir.lastIndex = re.lastIndex
      while (mm = ir.exec(expr)) {
        if (mm[0] === ch) ++lv
        else if (!--lv) break
      }
      re.lastIndex = lv ? expr.length : ir.lastIndex
    }
  }

  // istanbul ignore next: not both
  var // eslint-disable-next-line max-len
    JS_CONTEXT = '"in this?this:' + (typeof window !== 'object' ? 'global' : 'window') + ').',
    JS_VARNAME = /[,{][$\w]+:|(^ *|[^$\w\.])(?!(?:typeof|true|false|null|undefined|in|instanceof|is(?:Finite|NaN)|void|NaN|new|Date|RegExp|Math)(?![$\w]))([$_A-Za-z][$\w]*)/g,
    JS_NOPROPS = /^(?=(\.[$\w]+))\1(?:[^.[(]|$)/

  function _wrapExpr (expr, asText, key) {
    var tb

    expr = expr.replace(JS_VARNAME, function (match, p, mvar, pos, s) {
      if (mvar) {
        pos = tb ? 0 : pos + match.length

        if (mvar !== 'this' && mvar !== 'global' && mvar !== 'window') {
          match = p + '("' + mvar + JS_CONTEXT + mvar
          if (pos) tb = (s = s[pos]) === '.' || s === '(' || s === '['
        } else if (pos) {
          tb = !JS_NOPROPS.test(s.slice(pos))
        }
      }
      return match
    })

    if (tb) {
      expr = 'try{return ' + expr + '}catch(e){E(e,this)}'
    }

    if (key) {

      expr = (tb
          ? 'function(){' + expr + '}.call(this)' : '(' + expr + ')'
        ) + '?"' + key + '":""'

    } else if (asText) {

      expr = 'function(v){' + (tb
          ? expr.replace('return ', 'v=') : 'v=(' + expr + ')'
        ) + ';return v||v===0?v:""}.call(this)'
    }

    return expr
  }

  // istanbul ignore next: compatibility fix for beta versions
  _tmpl.parse = function (s) { return s }

  _tmpl.version = brackets.version = 'v2.4.0'

  return _tmpl

})()

/*
  lib/browser/tag/mkdom.js

  Includes hacks needed for the Internet Explorer version 9 and below
  See: http://kangax.github.io/compat-table/es5/#ie8
       http://codeplanet.io/dropping-ie8/
*/
var mkdom = (function _mkdom() {
  var
    reHasYield  = /<yield\b/i,
    reYieldAll  = /<yield\s*(?:\/>|>([\S\s]*?)<\/yield\s*>)/ig,
    reYieldSrc  = /<yield\s+to=['"]([^'">]*)['"]\s*>([\S\s]*?)<\/yield\s*>/ig,
    reYieldDest = /<yield\s+from=['"]?([-\w]+)['"]?\s*(?:\/>|>([\S\s]*?)<\/yield\s*>)/ig
  var
    rootEls = { tr: 'tbody', th: 'tr', td: 'tr', col: 'colgroup' },
    tblTags = IE_VERSION && IE_VERSION < 10
      ? SPECIAL_TAGS_REGEX : /^(?:t(?:body|head|foot|[rhd])|caption|col(?:group)?)$/

  /**
   * Creates a DOM element to wrap the given content. Normally an `DIV`, but can be
   * also a `TABLE`, `SELECT`, `TBODY`, `TR`, or `COLGROUP` element.
   *
   * @param   {string} templ  - The template coming from the custom tag definition
   * @param   {string} [html] - HTML content that comes from the DOM element where you
   *           will mount the tag, mostly the original tag in the page
   * @returns {HTMLElement} DOM element with _templ_ merged through `YIELD` with the _html_.
   */
  function _mkdom(templ, html) {
    var
      match   = templ && templ.match(/^\s*<([-\w]+)/),
      tagName = match && match[1].toLowerCase(),
      el = mkEl('div', isSVGTag(tagName))

    // replace all the yield tags with the tag inner html
    templ = replaceYield(templ, html)

    /* istanbul ignore next */
    if (tblTags.test(tagName))
      el = specialTags(el, templ, tagName)
    else
      setInnerHTML(el, templ)

    el.stub = true

    return el
  }

  /*
    Creates the root element for table or select child elements:
    tr/th/td/thead/tfoot/tbody/caption/col/colgroup/option/optgroup
  */
  function specialTags(el, templ, tagName) {
    var
      select = tagName[0] === 'o',
      parent = select ? 'select>' : 'table>'

    // trim() is important here, this ensures we don't have artifacts,
    // so we can check if we have only one element inside the parent
    el.innerHTML = '<' + parent + templ.trim() + '</' + parent
    parent = el.firstChild

    // returns the immediate parent if tr/th/td/col is the only element, if not
    // returns the whole tree, as this can include additional elements
    if (select) {
      parent.selectedIndex = -1  // for IE9, compatible w/current riot behavior
    } else {
      // avoids insertion of cointainer inside container (ex: tbody inside tbody)
      var tname = rootEls[tagName]
      if (tname && parent.childElementCount === 1) parent = $(tname, parent)
    }
    return parent
  }

  /*
    Replace the yield tag from any tag template with the innerHTML of the
    original tag in the page
  */
  function replaceYield(templ, html) {
    // do nothing if no yield
    if (!reHasYield.test(templ)) return templ

    // be careful with #1343 - string on the source having `$1`
    var src = {}

    html = html && html.replace(reYieldSrc, function (_, ref, text) {
      src[ref] = src[ref] || text   // preserve first definition
      return ''
    }).trim()

    return templ
      .replace(reYieldDest, function (_, ref, def) {  // yield with from - to attrs
        return src[ref] || def || ''
      })
      .replace(reYieldAll, function (_, def) {        // yield without any "from"
        return html || def || ''
      })
  }

  return _mkdom

})()

/**
 * Convert the item looped into an object used to extend the child tag properties
 * @param   { Object } expr - object containing the keys used to extend the children tags
 * @param   { * } key - value to assign to the new object returned
 * @param   { * } val - value containing the position of the item in the array
 * @returns { Object } - new object containing the values of the original item
 *
 * The variables 'key' and 'val' are arbitrary.
 * They depend on the collection type looped (Array, Object)
 * and on the expression used on the each tag
 *
 */
function mkitem(expr, key, val) {
  var item = {}
  item[expr.key] = key
  if (expr.pos) item[expr.pos] = val
  return item
}

/**
 * Unmount the redundant tags
 * @param   { Array } items - array containing the current items to loop
 * @param   { Array } tags - array containing all the children tags
 */
function unmountRedundant(items, tags) {

  var i = tags.length,
    j = items.length,
    t

  while (i > j) {
    t = tags[--i]
    tags.splice(i, 1)
    t.unmount()
  }
}

/**
 * Move the nested custom tags in non custom loop tags
 * @param   { Object } child - non custom loop tag
 * @param   { Number } i - current position of the loop tag
 */
function moveNestedTags(child, i) {
  Object.keys(child.tags).forEach(function(tagName) {
    var tag = child.tags[tagName]
    if (isArray(tag))
      each(tag, function (t) {
        moveChildTag(t, tagName, i)
      })
    else
      moveChildTag(tag, tagName, i)
  })
}

/**
 * Adds the elements for a virtual tag
 * @param { Tag } tag - the tag whose root's children will be inserted or appended
 * @param { Node } src - the node that will do the inserting or appending
 * @param { Tag } target - only if inserting, insert before this tag's first child
 */
function addVirtual(tag, src, target) {
  var el = tag._root, sib
  tag._virts = []
  while (el) {
    sib = el.nextSibling
    if (target)
      src.insertBefore(el, target._root)
    else
      src.appendChild(el)

    tag._virts.push(el) // hold for unmounting
    el = sib
  }
}

/**
 * Move virtual tag and all child nodes
 * @param { Tag } tag - first child reference used to start move
 * @param { Node } src  - the node that will do the inserting
 * @param { Tag } target - insert before this tag's first child
 * @param { Number } len - how many child nodes to move
 */
function moveVirtual(tag, src, target, len) {
  var el = tag._root, sib, i = 0
  for (; i < len; i++) {
    sib = el.nextSibling
    src.insertBefore(el, target._root)
    el = sib
  }
}


/**
 * Manage tags having the 'each'
 * @param   { Object } dom - DOM node we need to loop
 * @param   { Tag } parent - parent tag instance where the dom node is contained
 * @param   { String } expr - string contained in the 'each' attribute
 */
function _each(dom, parent, expr) {

  // remove the each property from the original tag
  remAttr(dom, 'each')

  var mustReorder = typeof getAttr(dom, 'no-reorder') !== T_STRING || remAttr(dom, 'no-reorder'),
    tagName = getTagName(dom),
    impl = __tagImpl[tagName] || { tmpl: getOuterHTML(dom) },
    useRoot = SPECIAL_TAGS_REGEX.test(tagName),
    root = dom.parentNode,
    ref = document.createTextNode(''),
    child = getTag(dom),
    isOption = tagName.toLowerCase() === 'option', // the option tags must be treated differently
    tags = [],
    oldItems = [],
    hasKeys,
    isVirtual = dom.tagName == 'VIRTUAL'

  // parse the each expression
  expr = tmpl.loopKeys(expr)

  // insert a marked where the loop tags will be injected
  root.insertBefore(ref, dom)

  // clean template code
  parent.one('before-mount', function () {

    // remove the original DOM node
    dom.parentNode.removeChild(dom)
    if (root.stub) root = parent.root

  }).on('update', function () {
    // get the new items collection
    var items = tmpl(expr.val, parent),
      // create a fragment to hold the new DOM nodes to inject in the parent tag
      frag = document.createDocumentFragment()

    // object loop. any changes cause full redraw
    if (!isArray(items)) {
      hasKeys = items || false
      items = hasKeys ?
        Object.keys(items).map(function (key) {
          return mkitem(expr, key, items[key])
        }) : []
    }

    // loop all the new items
    var i = 0,
      itemsLength = items.length

    for (; i < itemsLength; i++) {
      // reorder only if the items are objects
      var
        item = items[i],
        _mustReorder = mustReorder && item instanceof Object && !hasKeys,
        oldPos = oldItems.indexOf(item),
        pos = ~oldPos && _mustReorder ? oldPos : i,
        // does a tag exist in this position?
        tag = tags[pos]

      item = !hasKeys && expr.key ? mkitem(expr, item, i) : item

      // new tag
      if (
        !_mustReorder && !tag // with no-reorder we just update the old tags
        ||
        _mustReorder && !~oldPos || !tag // by default we always try to reorder the DOM elements
      ) {

        tag = new Tag(impl, {
          parent: parent,
          isLoop: true,
          hasImpl: !!__tagImpl[tagName],
          root: useRoot ? root : dom.cloneNode(),
          item: item
        }, dom.innerHTML)

        tag.mount()

        if (isVirtual) tag._root = tag.root.firstChild // save reference for further moves or inserts
        // this tag must be appended
        if (i == tags.length || !tags[i]) { // fix 1581
          if (isVirtual)
            addVirtual(tag, frag)
          else frag.appendChild(tag.root)
        }
        // this tag must be insert
        else {
          if (isVirtual)
            addVirtual(tag, root, tags[i])
          else root.insertBefore(tag.root, tags[i].root) // #1374 some browsers reset selected here
          oldItems.splice(i, 0, item)
        }

        tags.splice(i, 0, tag)
        pos = i // handled here so no move
      } else tag.update(item, true)

      // reorder the tag if it's not located in its previous position
      if (
        pos !== i && _mustReorder &&
        tags[i] // fix 1581 unable to reproduce it in a test!
      ) {
        // update the DOM
        if (isVirtual)
          moveVirtual(tag, root, tags[i], dom.childNodes.length)
        else root.insertBefore(tag.root, tags[i].root)
        // update the position attribute if it exists
        if (expr.pos)
          tag[expr.pos] = i
        // move the old tag instance
        tags.splice(i, 0, tags.splice(pos, 1)[0])
        // move the old item
        oldItems.splice(i, 0, oldItems.splice(pos, 1)[0])
        // if the loop tags are not custom
        // we need to move all their custom tags into the right position
        if (!child && tag.tags) moveNestedTags(tag, i)
      }

      // cache the original item to use it in the events bound to this node
      // and its children
      tag._item = item
      // cache the real parent tag internally
      defineProperty(tag, '_parent', parent)
    }

    // remove the redundant tags
    unmountRedundant(items, tags)

    // insert the new nodes
    if (isOption) {
      root.appendChild(frag)

      // #1374 FireFox bug in <option selected={expression}>
      if (FIREFOX && !root.multiple) {
        for (var n = 0; n < root.length; n++) {
          if (root[n].__riot1374) {
            root.selectedIndex = n  // clear other options
            delete root[n].__riot1374
            break
          }
        }
      }
    }
    else root.insertBefore(frag, ref)

    // set the 'tags' property of the parent tag
    // if child is 'undefined' it means that we don't need to set this property
    // for example:
    // we don't need store the `myTag.tags['div']` property if we are looping a div tag
    // but we need to track the `myTag.tags['child']` property looping a custom child node named `child`
    if (child) parent.tags[tagName] = tags

    // clone the items array
    oldItems = items.slice()

  })

}
/**
 * Object that will be used to inject and manage the css of every tag instance
 */
var styleManager = (function(_riot) {

  if (!window) return { // skip injection on the server
    add: function () {},
    inject: function () {}
  }

  var styleNode = (function () {
    // create a new style element with the correct type
    var newNode = mkEl('style')
    setAttr(newNode, 'type', 'text/css')

    // replace any user node or insert the new one into the head
    var userNode = $('style[type=riot]')
    if (userNode) {
      if (userNode.id) newNode.id = userNode.id
      userNode.parentNode.replaceChild(newNode, userNode)
    }
    else document.getElementsByTagName('head')[0].appendChild(newNode)

    return newNode
  })()

  // Create cache and shortcut to the correct property
  var cssTextProp = styleNode.styleSheet,
    stylesToInject = ''

  // Expose the style node in a non-modificable property
  Object.defineProperty(_riot, 'styleNode', {
    value: styleNode,
    writable: true
  })

  /**
   * Public api
   */
  return {
    /**
     * Save a tag style to be later injected into DOM
     * @param   { String } css [description]
     */
    add: function(css) {
      stylesToInject += css
    },
    /**
     * Inject all previously saved tag styles into DOM
     * innerHTML seems slow: http://jsperf.com/riot-insert-style
     */
    inject: function() {
      if (stylesToInject) {
        if (cssTextProp) cssTextProp.cssText += stylesToInject
        else styleNode.innerHTML += stylesToInject
        stylesToInject = ''
      }
    }
  }

})(riot)


function parseNamedElements(root, tag, childTags, forceParsingNamed) {

  walk(root, function(dom) {
    if (dom.nodeType == 1) {
      dom.isLoop = dom.isLoop ||
                  (dom.parentNode && dom.parentNode.isLoop || getAttr(dom, 'each'))
                    ? 1 : 0

      // custom child tag
      if (childTags) {
        var child = getTag(dom)

        if (child && !dom.isLoop)
          childTags.push(initChildTag(child, {root: dom, parent: tag}, dom.innerHTML, tag))
      }

      if (!dom.isLoop || forceParsingNamed)
        setNamed(dom, tag, [])
    }

  })

}

function parseExpressions(root, tag, expressions) {

  function addExpr(dom, val, extra) {
    if (tmpl.hasExpr(val)) {
      expressions.push(extend({ dom: dom, expr: val }, extra))
    }
  }

  walk(root, function(dom) {
    var type = dom.nodeType,
      attr

    // text node
    if (type == 3 && dom.parentNode.tagName != 'STYLE') addExpr(dom, dom.nodeValue)
    if (type != 1) return

    /* element */

    // loop
    attr = getAttr(dom, 'each')

    if (attr) { _each(dom, tag, attr); return false }

    // attribute expressions
    each(dom.attributes, function(attr) {
      var name = attr.name,
        bool = name.split('__')[1]

      addExpr(dom, attr.value, { attr: bool || name, bool: bool })
      if (bool) { remAttr(dom, name); return false }

    })

    // skip custom tags
    if (getTag(dom)) return false

  })

}
function Tag(impl, conf, innerHTML) {

  var self = riot.observable(this),
    opts = inherit(conf.opts) || {},
    parent = conf.parent,
    isLoop = conf.isLoop,
    hasImpl = conf.hasImpl,
    item = cleanUpData(conf.item),
    expressions = [],
    childTags = [],
    root = conf.root,
    tagName = root.tagName.toLowerCase(),
    attr = {},
    propsInSyncWithParent = [],
    dom

  // only call unmount if we have a valid __tagImpl (has name property)
  if (impl.name && root._tag) root._tag.unmount(true)

  // not yet mounted
  this.isMounted = false
  root.isLoop = isLoop

  // keep a reference to the tag just created
  // so we will be able to mount this tag multiple times
  root._tag = this

  // create a unique id to this tag
  // it could be handy to use it also to improve the virtual dom rendering speed
  defineProperty(this, '_riot_id', ++__uid) // base 1 allows test !t._riot_id

  extend(this, { parent: parent, root: root, opts: opts, tags: {} }, item)

  // grab attributes
  each(root.attributes, function(el) {
    var val = el.value
    // remember attributes with expressions only
    if (tmpl.hasExpr(val)) attr[el.name] = val
  })

  dom = mkdom(impl.tmpl, innerHTML)

  // options
  function updateOpts() {
    var ctx = hasImpl && isLoop ? self : parent || self

    // update opts from current DOM attributes
    each(root.attributes, function(el) {
      var val = el.value
      opts[toCamel(el.name)] = tmpl.hasExpr(val) ? tmpl(val, ctx) : val
    })
    // recover those with expressions
    each(Object.keys(attr), function(name) {
      opts[toCamel(name)] = tmpl(attr[name], ctx)
    })
  }

  function normalizeData(data) {
    for (var key in item) {
      if (typeof self[key] !== T_UNDEF && isWritable(self, key))
        self[key] = data[key]
    }
  }

  function inheritFromParent () {
    if (!self.parent || !isLoop) return
    each(Object.keys(self.parent), function(k) {
      // some properties must be always in sync with the parent tag
      var mustSync = !RESERVED_WORDS_BLACKLIST.test(k) && contains(propsInSyncWithParent, k)
      if (typeof self[k] === T_UNDEF || mustSync) {
        // track the property to keep in sync
        // so we can keep it updated
        if (!mustSync) propsInSyncWithParent.push(k)
        self[k] = self.parent[k]
      }
    })
  }

  /**
   * Update the tag expressions and options
   * @param   { * }  data - data we want to use to extend the tag properties
   * @param   { Boolean } isInherited - is this update coming from a parent tag?
   * @returns { self }
   */
  defineProperty(this, 'update', function(data, isInherited) {

    // make sure the data passed will not override
    // the component core methods
    data = cleanUpData(data)
    // inherit properties from the parent
    inheritFromParent()
    // normalize the tag properties in case an item object was initially passed
    if (data && isObject(item)) {
      normalizeData(data)
      item = data
    }
    extend(self, data)
    updateOpts()
    self.trigger('update', data)
    update(expressions, self)

    // the updated event will be triggered
    // once the DOM will be ready and all the re-flows are completed
    // this is useful if you want to get the "real" root properties
    // 4 ex: root.offsetWidth ...
    if (isInherited && self.parent)
      // closes #1599
      self.parent.one('updated', function() { self.trigger('updated') })
    else rAF(function() { self.trigger('updated') })

    return this
  })

  defineProperty(this, 'mixin', function() {
    each(arguments, function(mix) {
      var instance

      mix = typeof mix === T_STRING ? riot.mixin(mix) : mix

      // check if the mixin is a function
      if (isFunction(mix)) {
        // create the new mixin instance
        instance = new mix()
        // save the prototype to loop it afterwards
        mix = mix.prototype
      } else instance = mix

      // loop the keys in the function prototype or the all object keys
      each(Object.getOwnPropertyNames(mix), function(key) {
        // bind methods to self
        if (key != 'init')
          self[key] = isFunction(instance[key]) ?
                        instance[key].bind(self) :
                        instance[key]
      })

      // init method will be called automatically
      if (instance.init) instance.init.bind(self)()
    })
    return this
  })

  defineProperty(this, 'mount', function() {

    updateOpts()

    // add global mixins
    var globalMixin = riot.mixin(GLOBAL_MIXIN)
    if (globalMixin)
      for (var i in globalMixin)
        if (globalMixin.hasOwnProperty(i))
          self.mixin(globalMixin[i])

    // initialiation
    if (impl.fn) impl.fn.call(self, opts)

    // parse layout after init. fn may calculate args for nested custom tags
    parseExpressions(dom, self, expressions)

    // mount the child tags
    toggle(true)

    // update the root adding custom attributes coming from the compiler
    // it fixes also #1087
    if (impl.attrs)
      walkAttributes(impl.attrs, function (k, v) { setAttr(root, k, v) })
    if (impl.attrs || hasImpl)
      parseExpressions(self.root, self, expressions)

    if (!self.parent || isLoop) self.update(item)

    // internal use only, fixes #403
    self.trigger('before-mount')

    if (isLoop && !hasImpl) {
      // update the root attribute for the looped elements
      root = dom.firstChild
    } else {
      while (dom.firstChild) root.appendChild(dom.firstChild)
      if (root.stub) root = parent.root
    }

    defineProperty(self, 'root', root)

    // parse the named dom nodes in the looped child
    // adding them to the parent as well
    if (isLoop)
      parseNamedElements(self.root, self.parent, null, true)

    // if it's not a child tag we can trigger its mount event
    if (!self.parent || self.parent.isMounted) {
      self.isMounted = true
      self.trigger('mount')
    }
    // otherwise we need to wait that the parent event gets triggered
    else self.parent.one('mount', function() {
      // avoid to trigger the `mount` event for the tags
      // not visible included in an if statement
      if (!isInStub(self.root)) {
        self.parent.isMounted = self.isMounted = true
        self.trigger('mount')
      }
    })
  })


  defineProperty(this, 'unmount', function(keepRootTag) {
    var el = root,
      p = el.parentNode,
      ptag,
      tagIndex = __virtualDom.indexOf(self)

    self.trigger('before-unmount')

    // remove this tag instance from the global virtualDom variable
    if (~tagIndex)
      __virtualDom.splice(tagIndex, 1)

    if (p) {

      if (parent) {
        ptag = getImmediateCustomParentTag(parent)
        // remove this tag from the parent tags object
        // if there are multiple nested tags with same name..
        // remove this element form the array
        if (isArray(ptag.tags[tagName]))
          each(ptag.tags[tagName], function(tag, i) {
            if (tag._riot_id == self._riot_id)
              ptag.tags[tagName].splice(i, 1)
          })
        else
          // otherwise just delete the tag instance
          ptag.tags[tagName] = undefined
      }

      else
        while (el.firstChild) el.removeChild(el.firstChild)

      if (!keepRootTag)
        p.removeChild(el)
      else {
        // the riot-tag and the data-is attributes aren't needed anymore, remove them
        remAttr(p, RIOT_TAG_IS)
        remAttr(p, RIOT_TAG) // this will be removed in riot 3.0.0
      }

    }

    if (this._virts) {
      each(this._virts, function(v) {
        if (v.parentNode) v.parentNode.removeChild(v)
      })
    }

    self.trigger('unmount')
    toggle()
    self.off('*')
    self.isMounted = false
    delete root._tag

  })

  // proxy function to bind updates
  // dispatched from a parent tag
  function onChildUpdate(data) { self.update(data, true) }

  function toggle(isMount) {

    // mount/unmount children
    each(childTags, function(child) { child[isMount ? 'mount' : 'unmount']() })

    // listen/unlisten parent (events flow one way from parent to children)
    if (!parent) return
    var evt = isMount ? 'on' : 'off'

    // the loop tags will be always in sync with the parent automatically
    if (isLoop)
      parent[evt]('unmount', self.unmount)
    else {
      parent[evt]('update', onChildUpdate)[evt]('unmount', self.unmount)
    }
  }


  // named elements available for fn
  parseNamedElements(dom, this, childTags)

}
/**
 * Attach an event to a DOM node
 * @param { String } name - event name
 * @param { Function } handler - event callback
 * @param { Object } dom - dom node
 * @param { Tag } tag - tag instance
 */
function setEventHandler(name, handler, dom, tag) {

  dom[name] = function(e) {

    var ptag = tag._parent,
      item = tag._item,
      el

    if (!item)
      while (ptag && !item) {
        item = ptag._item
        ptag = ptag._parent
      }

    // cross browser event fix
    e = e || window.event

    // override the event properties
    if (isWritable(e, 'currentTarget')) e.currentTarget = dom
    if (isWritable(e, 'target')) e.target = e.srcElement
    if (isWritable(e, 'which')) e.which = e.charCode || e.keyCode

    e.item = item

    // prevent default behaviour (by default)
    if (handler.call(tag, e) !== true && !/radio|check/.test(dom.type)) {
      if (e.preventDefault) e.preventDefault()
      e.returnValue = false
    }

    if (!e.preventUpdate) {
      el = item ? getImmediateCustomParentTag(ptag) : tag
      el.update()
    }

  }

}


/**
 * Insert a DOM node replacing another one (used by if- attribute)
 * @param   { Object } root - parent node
 * @param   { Object } node - node replaced
 * @param   { Object } before - node added
 */
function insertTo(root, node, before) {
  if (!root) return
  root.insertBefore(before, node)
  root.removeChild(node)
}

/**
 * Update the expressions in a Tag instance
 * @param   { Array } expressions - expression that must be re evaluated
 * @param   { Tag } tag - tag instance
 */
function update(expressions, tag) {

  each(expressions, function(expr, i) {

    var dom = expr.dom,
      attrName = expr.attr,
      value = tmpl(expr.expr, tag),
      parent = expr.dom.parentNode

    if (expr.bool) {
      value = !!value
    } else if (value == null) {
      value = ''
    }

    // #1638: regression of #1612, update the dom only if the value of the
    // expression was changed
    if (expr.value === value) {
      return
    }
    expr.value = value

    // textarea and text nodes has no attribute name
    if (!attrName) {
      // about #815 w/o replace: the browser converts the value to a string,
      // the comparison by "==" does too, but not in the server
      value += ''
      // test for parent avoids error with invalid assignment to nodeValue
      if (parent) {
        if (parent.tagName === 'TEXTAREA') {
          parent.value = value                    // #1113
          if (!IE_VERSION) dom.nodeValue = value  // #1625 IE throws here, nodeValue
        }                                         // will be available on 'updated'
        else dom.nodeValue = value
      }
      return
    }

    // ~~#1612: look for changes in dom.value when updating the value~~
    if (attrName === 'value') {
      dom.value = value
      return
    }

    // remove original attribute
    remAttr(dom, attrName)

    // event handler
    if (isFunction(value)) {
      setEventHandler(attrName, value, dom, tag)

    // if- conditional
    } else if (attrName == 'if') {
      var stub = expr.stub,
        add = function() { insertTo(stub.parentNode, stub, dom) },
        remove = function() { insertTo(dom.parentNode, dom, stub) }

      // add to DOM
      if (value) {
        if (stub) {
          add()
          dom.inStub = false
          // avoid to trigger the mount event if the tags is not visible yet
          // maybe we can optimize this avoiding to mount the tag at all
          if (!isInStub(dom)) {
            walk(dom, function(el) {
              if (el._tag && !el._tag.isMounted)
                el._tag.isMounted = !!el._tag.trigger('mount')
            })
          }
        }
      // remove from DOM
      } else {
        stub = expr.stub = stub || document.createTextNode('')
        // if the parentNode is defined we can easily replace the tag
        if (dom.parentNode)
          remove()
        // otherwise we need to wait the updated event
        else (tag.parent || tag).one('updated', remove)

        dom.inStub = true
      }
    // show / hide
    } else if (attrName === 'show') {
      dom.style.display = value ? '' : 'none'

    } else if (attrName === 'hide') {
      dom.style.display = value ? 'none' : ''

    } else if (expr.bool) {
      dom[attrName] = value
      if (value) setAttr(dom, attrName, attrName)
      if (FIREFOX && attrName === 'selected' && dom.tagName === 'OPTION') {
        dom.__riot1374 = value   // #1374
      }

    } else if (value === 0 || value && typeof value !== T_OBJECT) {
      // <img src="{ expr }">
      if (startsWith(attrName, RIOT_PREFIX) && attrName != RIOT_TAG) {
        attrName = attrName.slice(RIOT_PREFIX.length)
      }
      setAttr(dom, attrName, value)
    }

  })

}
/**
 * Specialized function for looping an array-like collection with `each={}`
 * @param   { Array } els - collection of items
 * @param   {Function} fn - callback function
 * @returns { Array } the array looped
 */
function each(els, fn) {
  var len = els ? els.length : 0

  for (var i = 0, el; i < len; i++) {
    el = els[i]
    // return false -> current item was removed by fn during the loop
    if (el != null && fn(el, i) === false) i--
  }
  return els
}

/**
 * Detect if the argument passed is a function
 * @param   { * } v - whatever you want to pass to this function
 * @returns { Boolean } -
 */
function isFunction(v) {
  return typeof v === T_FUNCTION || false   // avoid IE problems
}

/**
 * Get the outer html of any DOM node SVGs included
 * @param   { Object } el - DOM node to parse
 * @returns { String } el.outerHTML
 */
function getOuterHTML(el) {
  if (el.outerHTML) return el.outerHTML
  // some browsers do not support outerHTML on the SVGs tags
  else {
    var container = mkEl('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

/**
 * Set the inner html of any DOM node SVGs included
 * @param { Object } container - DOM node where we will inject the new html
 * @param { String } html - html to inject
 */
function setInnerHTML(container, html) {
  if (typeof container.innerHTML != T_UNDEF) container.innerHTML = html
  // some browsers do not support innerHTML on the SVGs tags
  else {
    var doc = new DOMParser().parseFromString(html, 'application/xml')
    container.appendChild(
      container.ownerDocument.importNode(doc.documentElement, true)
    )
  }
}

/**
 * Checks wether a DOM node must be considered part of an svg document
 * @param   { String }  name - tag name
 * @returns { Boolean } -
 */
function isSVGTag(name) {
  return ~SVG_TAGS_LIST.indexOf(name)
}

/**
 * Detect if the argument passed is an object, exclude null.
 * NOTE: Use isObject(x) && !isArray(x) to excludes arrays.
 * @param   { * } v - whatever you want to pass to this function
 * @returns { Boolean } -
 */
function isObject(v) {
  return v && typeof v === T_OBJECT         // typeof null is 'object'
}

/**
 * Remove any DOM attribute from a node
 * @param   { Object } dom - DOM node we want to update
 * @param   { String } name - name of the property we want to remove
 */
function remAttr(dom, name) {
  dom.removeAttribute(name)
}

/**
 * Convert a string containing dashes to camel case
 * @param   { String } string - input string
 * @returns { String } my-string -> myString
 */
function toCamel(string) {
  return string.replace(/-(\w)/g, function(_, c) {
    return c.toUpperCase()
  })
}

/**
 * Get the value of any DOM attribute on a node
 * @param   { Object } dom - DOM node we want to parse
 * @param   { String } name - name of the attribute we want to get
 * @returns { String | undefined } name of the node attribute whether it exists
 */
function getAttr(dom, name) {
  return dom.getAttribute(name)
}

/**
 * Set any DOM attribute
 * @param { Object } dom - DOM node we want to update
 * @param { String } name - name of the property we want to set
 * @param { String } val - value of the property we want to set
 */
function setAttr(dom, name, val) {
  dom.setAttribute(name, val)
}

/**
 * Detect the tag implementation by a DOM node
 * @param   { Object } dom - DOM node we need to parse to get its tag implementation
 * @returns { Object } it returns an object containing the implementation of a custom tag (template and boot function)
 */
function getTag(dom) {
  return dom.tagName && __tagImpl[getAttr(dom, RIOT_TAG_IS) ||
    getAttr(dom, RIOT_TAG) || dom.tagName.toLowerCase()]
}
/**
 * Add a child tag to its parent into the `tags` object
 * @param   { Object } tag - child tag instance
 * @param   { String } tagName - key where the new tag will be stored
 * @param   { Object } parent - tag instance where the new child tag will be included
 */
function addChildTag(tag, tagName, parent) {
  var cachedTag = parent.tags[tagName]

  // if there are multiple children tags having the same name
  if (cachedTag) {
    // if the parent tags property is not yet an array
    // create it adding the first cached tag
    if (!isArray(cachedTag))
      // don't add the same tag twice
      if (cachedTag !== tag)
        parent.tags[tagName] = [cachedTag]
    // add the new nested tag to the array
    if (!contains(parent.tags[tagName], tag))
      parent.tags[tagName].push(tag)
  } else {
    parent.tags[tagName] = tag
  }
}

/**
 * Move the position of a custom tag in its parent tag
 * @param   { Object } tag - child tag instance
 * @param   { String } tagName - key where the tag was stored
 * @param   { Number } newPos - index where the new tag will be stored
 */
function moveChildTag(tag, tagName, newPos) {
  var parent = tag.parent,
    tags
  // no parent no move
  if (!parent) return

  tags = parent.tags[tagName]

  if (isArray(tags))
    tags.splice(newPos, 0, tags.splice(tags.indexOf(tag), 1)[0])
  else addChildTag(tag, tagName, parent)
}

/**
 * Create a new child tag including it correctly into its parent
 * @param   { Object } child - child tag implementation
 * @param   { Object } opts - tag options containing the DOM node where the tag will be mounted
 * @param   { String } innerHTML - inner html of the child node
 * @param   { Object } parent - instance of the parent tag including the child custom tag
 * @returns { Object } instance of the new child tag just created
 */
function initChildTag(child, opts, innerHTML, parent) {
  var tag = new Tag(child, opts, innerHTML),
    tagName = getTagName(opts.root),
    ptag = getImmediateCustomParentTag(parent)
  // fix for the parent attribute in the looped elements
  tag.parent = ptag
  // store the real parent tag
  // in some cases this could be different from the custom parent tag
  // for example in nested loops
  tag._parent = parent

  // add this tag to the custom parent tag
  addChildTag(tag, tagName, ptag)
  // and also to the real parent tag
  if (ptag !== parent)
    addChildTag(tag, tagName, parent)
  // empty the child node once we got its template
  // to avoid that its children get compiled multiple times
  opts.root.innerHTML = ''

  return tag
}

/**
 * Loop backward all the parents tree to detect the first custom parent tag
 * @param   { Object } tag - a Tag instance
 * @returns { Object } the instance of the first custom parent tag found
 */
function getImmediateCustomParentTag(tag) {
  var ptag = tag
  while (!getTag(ptag.root)) {
    if (!ptag.parent) break
    ptag = ptag.parent
  }
  return ptag
}

/**
 * Helper function to set an immutable property
 * @param   { Object } el - object where the new property will be set
 * @param   { String } key - object key where the new property will be stored
 * @param   { * } value - value of the new property
* @param   { Object } options - set the propery overriding the default options
 * @returns { Object } - the initial object
 */
function defineProperty(el, key, value, options) {
  Object.defineProperty(el, key, extend({
    value: value,
    enumerable: false,
    writable: false,
    configurable: true
  }, options))
  return el
}

/**
 * Get the tag name of any DOM node
 * @param   { Object } dom - DOM node we want to parse
 * @returns { String } name to identify this dom node in riot
 */
function getTagName(dom) {
  var child = getTag(dom),
    namedTag = getAttr(dom, 'name'),
    tagName = namedTag && !tmpl.hasExpr(namedTag) ?
                namedTag :
              child ? child.name : dom.tagName.toLowerCase()

  return tagName
}

/**
 * Extend any object with other properties
 * @param   { Object } src - source object
 * @returns { Object } the resulting extended object
 *
 * var obj = { foo: 'baz' }
 * extend(obj, {bar: 'bar', foo: 'bar'})
 * console.log(obj) => {bar: 'bar', foo: 'bar'}
 *
 */
function extend(src) {
  var obj, args = arguments
  for (var i = 1; i < args.length; ++i) {
    if (obj = args[i]) {
      for (var key in obj) {
        // check if this property of the source object could be overridden
        if (isWritable(src, key))
          src[key] = obj[key]
      }
    }
  }
  return src
}

/**
 * Check whether an array contains an item
 * @param   { Array } arr - target array
 * @param   { * } item - item to test
 * @returns { Boolean } Does 'arr' contain 'item'?
 */
function contains(arr, item) {
  return ~arr.indexOf(item)
}

/**
 * Check whether an object is a kind of array
 * @param   { * } a - anything
 * @returns {Boolean} is 'a' an array?
 */
function isArray(a) { return Array.isArray(a) || a instanceof Array }

/**
 * Detect whether a property of an object could be overridden
 * @param   { Object }  obj - source object
 * @param   { String }  key - object property
 * @returns { Boolean } is this property writable?
 */
function isWritable(obj, key) {
  var props = Object.getOwnPropertyDescriptor(obj, key)
  return typeof obj[key] === T_UNDEF || props && props.writable
}


/**
 * With this function we avoid that the internal Tag methods get overridden
 * @param   { Object } data - options we want to use to extend the tag instance
 * @returns { Object } clean object without containing the riot internal reserved words
 */
function cleanUpData(data) {
  if (!(data instanceof Tag) && !(data && typeof data.trigger == T_FUNCTION))
    return data

  var o = {}
  for (var key in data) {
    if (!RESERVED_WORDS_BLACKLIST.test(key)) o[key] = data[key]
  }
  return o
}

/**
 * Walk down recursively all the children tags starting dom node
 * @param   { Object }   dom - starting node where we will start the recursion
 * @param   { Function } fn - callback to transform the child node just found
 */
function walk(dom, fn) {
  if (dom) {
    // stop the recursion
    if (fn(dom) === false) return
    else {
      dom = dom.firstChild

      while (dom) {
        walk(dom, fn)
        dom = dom.nextSibling
      }
    }
  }
}

/**
 * Minimize risk: only zero or one _space_ between attr & value
 * @param   { String }   html - html string we want to parse
 * @param   { Function } fn - callback function to apply on any attribute found
 */
function walkAttributes(html, fn) {
  var m,
    re = /([-\w]+) ?= ?(?:"([^"]*)|'([^']*)|({[^}]*}))/g

  while (m = re.exec(html)) {
    fn(m[1].toLowerCase(), m[2] || m[3] || m[4])
  }
}

/**
 * Check whether a DOM node is in stub mode, useful for the riot 'if' directive
 * @param   { Object }  dom - DOM node we want to parse
 * @returns { Boolean } -
 */
function isInStub(dom) {
  while (dom) {
    if (dom.inStub) return true
    dom = dom.parentNode
  }
  return false
}

/**
 * Create a generic DOM node
 * @param   { String } name - name of the DOM node we want to create
 * @param   { Boolean } isSvg - should we use a SVG as parent node?
 * @returns { Object } DOM node just created
 */
function mkEl(name, isSvg) {
  return isSvg ?
    document.createElementNS('http://www.w3.org/2000/svg', 'svg') :
    document.createElement(name)
}

/**
 * Shorter and fast way to select multiple nodes in the DOM
 * @param   { String } selector - DOM selector
 * @param   { Object } ctx - DOM node where the targets of our search will is located
 * @returns { Object } dom nodes found
 */
function $$(selector, ctx) {
  return (ctx || document).querySelectorAll(selector)
}

/**
 * Shorter and fast way to select a single node in the DOM
 * @param   { String } selector - unique dom selector
 * @param   { Object } ctx - DOM node where the target of our search will is located
 * @returns { Object } dom node found
 */
function $(selector, ctx) {
  return (ctx || document).querySelector(selector)
}

/**
 * Simple object prototypal inheritance
 * @param   { Object } parent - parent object
 * @returns { Object } child instance
 */
function inherit(parent) {
  function Child() {}
  Child.prototype = parent
  return new Child()
}

/**
 * Get the name property needed to identify a DOM node in riot
 * @param   { Object } dom - DOM node we need to parse
 * @returns { String | undefined } give us back a string to identify this dom node
 */
function getNamedKey(dom) {
  return getAttr(dom, 'id') || getAttr(dom, 'name')
}

/**
 * Set the named properties of a tag element
 * @param { Object } dom - DOM node we need to parse
 * @param { Object } parent - tag instance where the named dom element will be eventually added
 * @param { Array } keys - list of all the tag instance properties
 */
function setNamed(dom, parent, keys) {
  // get the key value we want to add to the tag instance
  var key = getNamedKey(dom),
    isArr,
    // add the node detected to a tag instance using the named property
    add = function(value) {
      // avoid to override the tag properties already set
      if (contains(keys, key)) return
      // check whether this value is an array
      isArr = isArray(value)
      // if the key was never set
      if (!value)
        // set it once on the tag instance
        parent[key] = dom
      // if it was an array and not yet set
      else if (!isArr || isArr && !contains(value, dom)) {
        // add the dom node into the array
        if (isArr)
          value.push(dom)
        else
          parent[key] = [value, dom]
      }
    }

  // skip the elements with no named properties
  if (!key) return

  // check whether this key has been already evaluated
  if (tmpl.hasExpr(key))
    // wait the first updated event only once
    parent.one('mount', function() {
      key = getNamedKey(dom)
      add(parent[key])
    })
  else
    add(parent[key])

}

/**
 * Faster String startsWith alternative
 * @param   { String } src - source string
 * @param   { String } str - test string
 * @returns { Boolean } -
 */
function startsWith(src, str) {
  return src.slice(0, str.length) === str
}

/**
 * requestAnimationFrame function
 * Adapted from https://gist.github.com/paulirish/1579671, license MIT
 */
var rAF = (function (w) {
  var raf = w.requestAnimationFrame    ||
            w.mozRequestAnimationFrame || w.webkitRequestAnimationFrame

  if (!raf || /iP(ad|hone|od).*OS 6/.test(w.navigator.userAgent)) {  // buggy iOS6
    var lastTime = 0

    raf = function (cb) {
      var nowtime = Date.now(), timeout = Math.max(16 - (nowtime - lastTime), 0)
      setTimeout(function () { cb(lastTime = nowtime + timeout) }, timeout)
    }
  }
  return raf

})(window || {})

/**
 * Mount a tag creating new Tag instance
 * @param   { Object } root - dom node where the tag will be mounted
 * @param   { String } tagName - name of the riot tag we want to mount
 * @param   { Object } opts - options to pass to the Tag instance
 * @returns { Tag } a new Tag instance
 */
function mountTo(root, tagName, opts) {
  var tag = __tagImpl[tagName],
    // cache the inner HTML to fix #855
    innerHTML = root._innerHTML = root._innerHTML || root.innerHTML

  // clear the inner html
  root.innerHTML = ''

  if (tag && root) tag = new Tag(tag, { root: root, opts: opts }, innerHTML)

  if (tag && tag.mount) {
    tag.mount()
    // add this tag to the virtualDom variable
    if (!contains(__virtualDom, tag)) __virtualDom.push(tag)
  }

  return tag
}
/**
 * Riot public api
 */

// share methods for other riot parts, e.g. compiler
riot.util = { brackets: brackets, tmpl: tmpl }

/**
 * Create a mixin that could be globally shared across all the tags
 */
riot.mixin = (function() {
  var mixins = {},
    globals = mixins[GLOBAL_MIXIN] = {},
    _id = 0

  /**
   * Create/Return a mixin by its name
   * @param   { String }  name - mixin name (global mixin if object)
   * @param   { Object }  mixin - mixin logic
   * @param   { Boolean } g - is global?
   * @returns { Object }  the mixin logic
   */
  return function(name, mixin, g) {
    // Unnamed global
    if (isObject(name)) {
      riot.mixin('__unnamed_'+_id++, name, true)
      return
    }

    var store = g ? globals : mixins

    // Getter
    if (!mixin) return store[name]
    // Setter
    store[name] = extend(store[name] || {}, mixin)
  }

})()

/**
 * Create a new riot tag implementation
 * @param   { String }   name - name/id of the new riot tag
 * @param   { String }   html - tag template
 * @param   { String }   css - custom tag css
 * @param   { String }   attrs - root tag attributes
 * @param   { Function } fn - user function
 * @returns { String } name/id of the tag just created
 */
riot.tag = function(name, html, css, attrs, fn) {
  if (isFunction(attrs)) {
    fn = attrs
    if (/^[\w\-]+\s?=/.test(css)) {
      attrs = css
      css = ''
    } else attrs = ''
  }
  if (css) {
    if (isFunction(css)) fn = css
    else styleManager.add(css)
  }
  name = name.toLowerCase()
  __tagImpl[name] = { name: name, tmpl: html, attrs: attrs, fn: fn }
  return name
}

/**
 * Create a new riot tag implementation (for use by the compiler)
 * @param   { String }   name - name/id of the new riot tag
 * @param   { String }   html - tag template
 * @param   { String }   css - custom tag css
 * @param   { String }   attrs - root tag attributes
 * @param   { Function } fn - user function
 * @returns { String } name/id of the tag just created
 */
riot.tag2 = function(name, html, css, attrs, fn) {
  if (css) styleManager.add(css)
  //if (bpair) riot.settings.brackets = bpair
  __tagImpl[name] = { name: name, tmpl: html, attrs: attrs, fn: fn }
  return name
}

/**
 * Mount a tag using a specific tag implementation
 * @param   { String } selector - tag DOM selector
 * @param   { String } tagName - tag implementation name
 * @param   { Object } opts - tag logic
 * @returns { Array } new tags instances
 */
riot.mount = function(selector, tagName, opts) {

  var els,
    allTags,
    tags = []

  // helper functions

  function addRiotTags(arr) {
    var list = ''
    each(arr, function (e) {
      if (!/[^-\w]/.test(e)) {
        e = e.trim().toLowerCase()
        list += ',[' + RIOT_TAG_IS + '="' + e + '"],[' + RIOT_TAG + '="' + e + '"]'
      }
    })
    return list
  }

  function selectAllTags() {
    var keys = Object.keys(__tagImpl)
    return keys + addRiotTags(keys)
  }

  function pushTags(root) {
    if (root.tagName) {
      var riotTag = getAttr(root, RIOT_TAG_IS) || getAttr(root, RIOT_TAG)

      // have tagName? force riot-tag to be the same
      if (tagName && riotTag !== tagName) {
        riotTag = tagName
        setAttr(root, RIOT_TAG_IS, tagName)
        setAttr(root, RIOT_TAG, tagName) // this will be removed in riot 3.0.0
      }
      var tag = mountTo(root, riotTag || root.tagName.toLowerCase(), opts)

      if (tag) tags.push(tag)
    } else if (root.length) {
      each(root, pushTags)   // assume nodeList
    }
  }

  // ----- mount code -----

  // inject styles into DOM
  styleManager.inject()

  if (isObject(tagName)) {
    opts = tagName
    tagName = 0
  }

  // crawl the DOM to find the tag
  if (typeof selector === T_STRING) {
    if (selector === '*')
      // select all the tags registered
      // and also the tags found with the riot-tag attribute set
      selector = allTags = selectAllTags()
    else
      // or just the ones named like the selector
      selector += addRiotTags(selector.split(/, */))

    // make sure to pass always a selector
    // to the querySelectorAll function
    els = selector ? $$(selector) : []
  }
  else
    // probably you have passed already a tag or a NodeList
    els = selector

  // select all the registered and mount them inside their root elements
  if (tagName === '*') {
    // get all custom tags
    tagName = allTags || selectAllTags()
    // if the root els it's just a single tag
    if (els.tagName)
      els = $$(tagName, els)
    else {
      // select all the children for all the different root elements
      var nodeList = []
      each(els, function (_el) {
        nodeList.push($$(tagName, _el))
      })
      els = nodeList
    }
    // get rid of the tagName
    tagName = 0
  }

  pushTags(els)

  return tags
}

/**
 * Update all the tags instances created
 * @returns { Array } all the tags instances
 */
riot.update = function() {
  return each(__virtualDom, function(tag) {
    tag.update()
  })
}

/**
 * Export the Virtual DOM
 */
riot.vdom = __virtualDom

/**
 * Export the Tag constructor
 */
riot.Tag = Tag
  // support CommonJS, AMD & browser
  /* istanbul ignore next */
  if (typeof exports === T_OBJECT)
    module.exports = riot
  else if (typeof define === T_FUNCTION && typeof define.amd !== T_UNDEF)
    define(function() { return riot })
  else
    window.riot = riot

})(typeof window != 'undefined' ? window : void 0);

},{}],2:[function(require,module,exports){
if (typeof window.setImmediate !== 'function') {
    window.setImmediate = function(callback) {
        return setTimeout(callback, 1);
    };
}

var Async = {
    add: function(callback) {
        if (typeof callback === 'function') {
            this._callbacks.push(callback);
        }
    },
    clear: function() {
        this._callbacks = [];
    },
    run: function(onEach, onEnd) {
        var that = this,
            i = 0,
            total = that._callbacks.length,
            onLast = function() {
                console.timeEnd('async');
                onEnd();
                that.clear();
            }

        console.time('async');

        if (!total) {
            onLast();
            return;
        }

        (function each() {
            setImmediate(function() {
                onEach(i, total);
                that._callbacks[i]();
                i++;
                if(i >= total) {
                    onLast();
                } else {
                    each();
                }
            });
        })();
    },
    _callbacks: []
};

module.exports = Async;

},{}],3:[function(require,module,exports){
var Async = require('./async');

var escapeHTML = (function () {
    var chr = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };
    return function (text) {
        return text.replace(/[\"&<>]/g, function (a) { return chr[a]; });
    };
}());

var Generator = {
    start: function(data) {
        var img = new Image();
        this._imageObject = img;
        img.onload = function() {
            this._start(data);
        }.bind(this);
        img.src = data.url;
    },
    _start: function(data) {
        if (!this._isInited) {
            this._canvas = document.createElement('canvas');
            this._ctxCanvas = this._canvas.getContext('2d');

            this._isInited = true;
        }

        Object.keys(data).forEach(function(key) {
            this[key] = data[key];
        }, this);

        this._canvas.width = this.width;
        this._canvas.height = this.height;

        this._ctxCanvas.drawImage(this._imageObject, 0, 0);

        this.text = this.text.replace(/\r/g, '');

        var preparedText = this.prepareText(),
            container = document.querySelector('.photo__text-photo');

        this._textWithoutN = preparedText.textWithoutN;

        container.style.fontSize = this.fontSize + 'px';
        container.style.fontFamily = this.fontFamily;
        container.style.lineHeight = this.lineHeight + 'px';
        container.style.fontWeight = this.bold ? 'bold' : 'normal';
        container.style.width = this.width + 'px';
        container.style.height = this.height + 'px';
        container.style.backgroundColor = this.backgroundColor;
        container.style.whiteSpace = 'nowrap';

        container.innerHTML = preparedText.html;

        container.classList.add('photo__text-photo_visible');

        this._spans = container.querySelectorAll('span');
        this._buffer = [];

        var delta = Math.ceil(this._spans.length / 100);
        if (delta < 1) {
            delta = 1;
        }

        for (var i = 0, len = this._spans.length; i < len; i += delta) {
            this.addRequest(i, (i + delta) > len ? len : i + delta);
        }

        Async.run(data.onprogress, function() {
            data.callback(this.prepareData());
        }.bind(this));
    },
    getAverageColor: function(imageData) {
        var data = imageData.data,
            r = 0,
            g = 0,
            b = 0,
            len = data.length,
            step = 8,
            count = len / step;

        for (var i = 0; i < len; i += step) {
            r += data[i]; // red
            g += data[i + 1]; // green
            b += data[i + 2]; // blue
        }

        return {
            r: Math.floor(r / count),
            g: Math.floor(g / count),
            b: Math.floor(b / count)
        };
    },
    addRequest: function(from, to) {
        var that = this,
            photoWidth = that.width,
            photoHeight = that.height;

        Async.add(function() {
            for (var i = from; i < to; i++) {
                var el = that._spans[i],
                    width = el.offsetWidth,
                    height = el.offsetHeight,
                    pos = {
                        left: el.offsetLeft,
                        top: el.offsetTop
                    };

                if (!width || !height || pos.left >= photoWidth || pos.top >= photoHeight) {
                    continue;
                }

                var imageData = that._ctxCanvas.getImageData(pos.left, pos.top, width, height),
                    color = that.getAverageColor(imageData);

                that._buffer[i] = {
                    x: pos.left,
                    y: pos.top,
                    w: width,
                    h: height,
                    l: that._textWithoutN[i],
                    r: color.r,
                    g: color.g,
                    b: color.b
                };
            }
        });
    },
    prepareText: function() {
        var letters = this.text,
            html = '',
            text = '',
            textWithoutN = '';

        for (var i = 0; i < letters.length; i++) {
            var letter = letters[i],
                escapedLetter = escapeHTML(letter);
            if (letter === '\n') {
                html += '<br />';
            } else {
                textWithoutN += letter;
                text += escapedLetter;
                html += '<span>' + escapedLetter + '</span>';
            }
        }

        return {
            textWithoutN: textWithoutN,
            text: text,
            html: html
        };
    },
    prepareData: function(preparedText) {
        var row = [],
            data = [],
            buffer = this._buffer,
            oldY = buffer[0].y;

        data.push(row);
        for(var i = 0; i < buffer.length; i++) {
            var item = buffer[i];
            if (!item || item.l === undefined) {
                console.log(i, item, i-1, buffer[i-1]);
                continue;
            }

            if(item.y != oldY) {
                row = [];
                data.push(row);

                oldY = item.y;
            }

            row.push({
                l: item.l,
                r: item.r,
                g: item.g,
                b: item.b
            });
        }

        return {
            width: this.width,
            height: this.height,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            backgroundColor: this.backgroundColor,
            lineHeight: this.lineHeight,
            bold: this.bold,
            data: data
        };
    }
};

module.exports = Generator;

},{"./async":2}],4:[function(require,module,exports){
var riot = require('riot');
require('../tags/app.tag');
require('../tags/prefs.tag');
require('../tags/photo.tag');
riot.mount('*');

},{"../tags/app.tag":6,"../tags/photo.tag":7,"../tags/prefs.tag":8,"riot":1}],5:[function(require,module,exports){
function textPhoto(id, data, inverse) {
    if (!id || !data) {
        return;
    }

    var elem;
    if (typeof id === 'string') {
        elem = document.getElementById(id);
    } else {
        elem = id;
    }

    if (!elem) {
        return;
    }

    var style = elem.style;
    style.width = data.width + 'px';
    style.height = data.height + 'px';
    style.backgroundColor = data.backgroundColor;
    style.fontSize = data.fontSize + 'px';
    style.lineHeight = data.lineHeight + 'px';
    style.fontFamily = data.fontFamily;

    if (data.bold) {
        style.fontWeight = 'bold';
    }

    style.overflow = 'hidden';
    style.whiteSpace = 'nowrap';

    var map = data.data,
        text = '',
        delta = 40;

    for (var x = 0; x < map.length; x++) {
        for (var y = 0; y < map[x].length; y++) {
            var val = map[x][y];

            if (inverse) {
                var r1 = val.r + delta,
                    b1 = val.b + delta,
                    g1 = val.g + delta;
                if (r1 > 255) {
                    r1 = 255;
                } else if (r1 < 0) {
                    r1 = 0;
                }

                if (g1 > 255) {
                    g1 = 255;
                } else if (g1 < 0) {
                    g1 = 0;
                }

                if (b1 > 255) {
                    b1 = 255;
                } else if (b1 < 0) {
                    b1 = 0;
                }

                text += '<span style="background-color:rgb(' + val.r + ',' + val.g + ',' + val.b +
                    '); color:rgb(' + r1 + ',' + g1 + ',' + b1 + ')">' + val.l + '<\/span>';
            } else {
                text += '<span style="color:rgb(' + val.r + ',' + val.g + ',' + val.b +
                    ')">' + val.l + '<\/span>';
            }
        }

        text += '<br />';
    }

    elem.innerHTML = text;
}

module.exports = textPhoto;

},{}],6:[function(require,module,exports){
var riot = require('riot');
module.exports = riot.tag2('app', '<div class="paranja {paranja_visible: paranjaVisible}"></div> <navbar> <navbar__sandwich onclick="{onClickSandwich}">&#9776;</navbar__sandwich><navbar__text>Text photo</navbar__text> </navbar> <photo prefs="{prefs}"></photo> <div riot-tag="prefs" data="{prefs}"></prefs>', '', 'class="{app_prefs: showPrefs}" riot-style="background-color: {prefs.backgroundColor}"', function(opts) {
var self = this;

self.prefs = {
    backgroundColor: '#000000',
    bold: false,
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    lineHeight: 20,
    width: 1024,
    height: 768,
    url: 'images/red_flower.jpg'
};

self.showPrefs = false;

this.onClickSandwich = function(e) {
    self.showPrefs = !self.showPrefs;
    self.tags.photo.update();
}.bind(this)

self.tags.photo.on('hide-prefs', function() {
    self.showPrefs = false;
    self.tags.prefs.update();
});

self.paranjaVisible = false;

self.tags.photo.on('show-paranja', function() {
    self.paranjaVisible = true;
    self.update();
});

self.tags.photo.on('hide-paranja', function() {
    self.paranjaVisible = false;
    self.update();
});

self.tags.prefs.on('change', function() {
    self.tags.photo.update();
});
});

},{"riot":1}],7:[function(require,module,exports){
var riot = require('riot');
module.exports = riot.tag2('photo', '<div class="pbar" riot-style="width: {pbarValue}%"></div> <div class="photo__control"> <input type="button" class="photo__generate" onclick="{onClickGenerate}" value="Generate"> <input type="button" class="photo__save" onclick="{onClickSave}" value="Save"> </div> <div class="photo__result"></div> <div class="photo {\'photo_left-pad\': opts.prefs.visible}" riot-style="background-color: {opts.prefs.backgroundColor}"> <div class="photo__text-photo"></div> <textarea class="photo__input {photo__input_visible: text}" spellcheck="false" riot-style=" background: url({opts.prefs.url}) 0 0 no-repeat; width: {opts.prefs.width}px; height: {opts.prefs.height}px; color: {opts.prefs.color}; line-height: {opts.prefs.lineHeight}px; font-size: {opts.prefs.fontSize}px; font-family: {opts.prefs.fontFamily}; font-weight: {opts.prefs.bold ? \'bold\' : \'normal\'}; " onchange="{onChangeText}">{text}</textarea> </div>', '', '', function(opts) {
var self = this,
    lastResult = '',
    Generator = require('../scripts/generator'),
    textPhoto = require('../scripts/text-photo');

self.pbarValue = 0;
var text = '';
var exText = 'Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! Hello world!!! ! Hello world!!! Hello world!!! Hello world!!! Hello world!!!\n';

for (var i = 0; i < 50; i++) {
    text += exText;
}

self.text = text;

this.showTextPhoto = function(data) {
    var div = document.createElement('div');
    div.className = 'photo__result';
    document.body.appendChild(div);
    div.style.display = 'block';
    textPhoto(div, data);
}.bind(this)

this.onChangeText = function(e) {
    self.text = e.target.value;
}.bind(this)

this.onClickGenerate = function() {
    self.trigger('hide-prefs');
    self.trigger('show-paranja');

    var data = {};

    [
        'width',
        'height',
        'bold',
        'backgroundColor',
        'fontFamily',
        'fontSize',
        'lineHeight',
        'url',
        'text'
    ].forEach(function(key) {
        data[key] = opts.prefs[key];
    });

    data.onprogress = function(value, total) {
        self.pbarValue = value / (total || 1) * 100;
        self.update();
    };

    data.callback = function(res) {
        self.pbarValue = 0;
        self.update();

        self.showTextPhoto(res);

        lastResult = res;
    };

    data.text = self.text;

    Generator.start(data);
}.bind(this)
});

},{"../scripts/generator":3,"../scripts/text-photo":5,"riot":1}],8:[function(require,module,exports){
var riot = require('riot');
module.exports = riot.tag2('prefs', '<div class="prefs__title">Prefs</div> <table class="prefs__properties"> <tr> <td>background-color</td> <td><input class="prefs__bg-color" onchange="{onChangeBackgroundColor}" value="{opts.data.backgroundColor}" type="{\'color\'}"></td> </tr> <tr> <td>color</td> <td><input class="prefs__color" onchange="{onChangeColor}" value="{opts.data.color}" type="{\'color\'}"></td> </tr> <tr> <td>font-family</td> <td> <input class="prefs__font-family" type="text" onchange="{onChangeFontFamily}" value="{opts.data.fontFamily}"> </td> </tr> <tr> <td>font-size</td> <td> <input class="prefs__font-size" onchange="{onChangeFontSize}" value="{opts.data.fontSize}" type="{\'number\'}">px </td> </tr> <tr> <td>line-height</td> <td><input class="prefs__line-height" onchange="{onChangeLineHeight}" value="{opts.data.lineHeight}" type="{\'number\'}">px</td> </tr> <tr> <td></td> <td><input type="checkbox" onclick="{onClickBold}" __checked="{opts.data.bold}" id="bold" class="prefs__bold"> <label for="bold">bold</label></td> </tr> </table> <div class="prefs__title">Image</div> <table class="prefs__properties"> <tr> <td colspan="2"><input class="prefs__url" type="file" onchange="{onChangeUrl}"></td> </tr> <tr> <td>width</td> <td><input class="prefs__width" onchange="{onChangeWidth}" value="{opts.data.width}" type="{\'number\'}"> px</td> </tr> <tr> <td>height</td> <td> <input class="prefs__height" onchange="{onChangeHeight}" value="{opts.data.height}" type="{\'number\'}"> px </td> </tr> </table> </prefs>', '', 'class="prefs {prefs_visible: opts.data.visible}"', function(opts) {
var self = this;

this.onChangeWidth = function(e) {
    opts.data.width = e.target.value;
    self.trigger('change');
}.bind(this)

this.onChangeHeight = function(e) {
    opts.data.height = e.target.value;
    self.trigger('change');
}.bind(this)

this.onChangeUrl = function(e) {
    var files = e.target.files;

    if (FileReader && files && files.length) {
        var img = new FileReader();
        img.onload = function() {
            var imageSize = new Image();
            imageSize.src = img.result;
            imageSize.onload = function() {
                opts.data.width = imageSize.width;
                opts.data.height = imageSize.height;
                opts.data.url = img.result;

                self.trigger('change');
            };
        };

        img.readAsDataURL(files[0]);
    }
}.bind(this)

this.onChangeBackgroundColor = function(e) {
    opts.data.backgroundColor = e.target.value;
    self.trigger('change');
}.bind(this)

this.onChangeColor = function(e) {
    opts.data.color = e.target.value;
    self.trigger('change');
}.bind(this)

this.onChangeFontSize = function(e) {
    opts.data.fontSize = e.target.value;
    self.trigger('change');
}.bind(this)

this.onChangeFontFamily = function(e) {
    opts.data.fontFamily = e.target.value;
    self.trigger('change');
}.bind(this)

this.onChangeLineHeight = function(e) {
    opts.data.lineHeight = e.target.value;
    self.trigger('change');
}.bind(this)

this.onClickBold = function(e) {
    opts.data.bold = e.target.checked;
    self.trigger('change');
}.bind(this)

});

},{"riot":1}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcmlvdC9yaW90LmpzIiwic2NyaXB0cy9hc3luYy5qcyIsInNjcmlwdHMvZ2VuZXJhdG9yLmpzIiwic2NyaXB0cy9tYWluLmpzIiwic2NyaXB0cy90ZXh0LXBob3RvLmpzIiwidGFncy9hcHAudGFnIiwidGFncy9waG90by50YWciLCJ0YWdzL3ByZWZzLnRhZyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BrRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIFJpb3QgdjIuNC4wLCBAbGljZW5zZSBNSVQgKi9cblxuOyhmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xuICAndXNlIHN0cmljdCc7XG52YXIgcmlvdCA9IHsgdmVyc2lvbjogJ3YyLjQuMCcsIHNldHRpbmdzOiB7fSB9LFxuICAvLyBiZSBhd2FyZSwgaW50ZXJuYWwgdXNhZ2VcbiAgLy8gQVRURU5USU9OOiBwcmVmaXggdGhlIGdsb2JhbCBkeW5hbWljIHZhcmlhYmxlcyB3aXRoIGBfX2BcblxuICAvLyBjb3VudGVyIHRvIGdpdmUgYSB1bmlxdWUgaWQgdG8gYWxsIHRoZSBUYWcgaW5zdGFuY2VzXG4gIF9fdWlkID0gMCxcbiAgLy8gdGFncyBpbnN0YW5jZXMgY2FjaGVcbiAgX192aXJ0dWFsRG9tID0gW10sXG4gIC8vIHRhZ3MgaW1wbGVtZW50YXRpb24gY2FjaGVcbiAgX190YWdJbXBsID0ge30sXG5cbiAgLyoqXG4gICAqIENvbnN0XG4gICAqL1xuICBHTE9CQUxfTUlYSU4gPSAnX19nbG9iYWxfbWl4aW4nLFxuXG4gIC8vIHJpb3Qgc3BlY2lmaWMgcHJlZml4ZXNcbiAgUklPVF9QUkVGSVggPSAncmlvdC0nLFxuICBSSU9UX1RBRyA9IFJJT1RfUFJFRklYICsgJ3RhZycsXG4gIFJJT1RfVEFHX0lTID0gJ2RhdGEtaXMnLFxuXG4gIC8vIGZvciB0eXBlb2YgPT0gJycgY29tcGFyaXNvbnNcbiAgVF9TVFJJTkcgPSAnc3RyaW5nJyxcbiAgVF9PQkpFQ1QgPSAnb2JqZWN0JyxcbiAgVF9VTkRFRiAgPSAndW5kZWZpbmVkJyxcbiAgVF9GVU5DVElPTiA9ICdmdW5jdGlvbicsXG4gIC8vIHNwZWNpYWwgbmF0aXZlIHRhZ3MgdGhhdCBjYW5ub3QgYmUgdHJlYXRlZCBsaWtlIHRoZSBvdGhlcnNcbiAgU1BFQ0lBTF9UQUdTX1JFR0VYID0gL14oPzp0KD86Ym9keXxoZWFkfGZvb3R8W3JoZF0pfGNhcHRpb258Y29sKD86Z3JvdXApP3xvcHQoPzppb258Z3JvdXApKSQvLFxuICBSRVNFUlZFRF9XT1JEU19CTEFDS0xJU1QgPSAvXig/Ol8oPzppdGVtfGlkfHBhcmVudCl8dXBkYXRlfHJvb3R8KD86dW4pP21vdW50fG1peGlufGlzKD86TW91bnRlZHxMb29wKXx0YWdzfHBhcmVudHxvcHRzfHRyaWdnZXJ8byg/Om58ZmZ8bmUpKSQvLFxuICAvLyBTVkcgdGFncyBsaXN0IGh0dHBzOi8vd3d3LnczLm9yZy9UUi9TVkcvYXR0aW5kZXguaHRtbCNQcmVzZW50YXRpb25BdHRyaWJ1dGVzXG4gIFNWR19UQUdTX0xJU1QgPSBbJ2FsdEdseXBoJywgJ2FuaW1hdGUnLCAnYW5pbWF0ZUNvbG9yJywgJ2NpcmNsZScsICdjbGlwUGF0aCcsICdkZWZzJywgJ2VsbGlwc2UnLCAnZmVCbGVuZCcsICdmZUNvbG9yTWF0cml4JywgJ2ZlQ29tcG9uZW50VHJhbnNmZXInLCAnZmVDb21wb3NpdGUnLCAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsICdmZURpc3BsYWNlbWVudE1hcCcsICdmZUZsb29kJywgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLCAnZmVNZXJnZScsICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJywgJ2ZlVGlsZScsICdmZVR1cmJ1bGVuY2UnLCAnZmlsdGVyJywgJ2ZvbnQnLCAnZm9yZWlnbk9iamVjdCcsICdnJywgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2ltYWdlJywgJ2xpbmUnLCAnbGluZWFyR3JhZGllbnQnLCAnbWFya2VyJywgJ21hc2snLCAnbWlzc2luZy1nbHlwaCcsICdwYXRoJywgJ3BhdHRlcm4nLCAncG9seWdvbicsICdwb2x5bGluZScsICdyYWRpYWxHcmFkaWVudCcsICdyZWN0JywgJ3N0b3AnLCAnc3ZnJywgJ3N3aXRjaCcsICdzeW1ib2wnLCAndGV4dCcsICd0ZXh0UGF0aCcsICd0cmVmJywgJ3RzcGFuJywgJ3VzZSddLFxuXG4gIC8vIHZlcnNpb24jIGZvciBJRSA4LTExLCAwIGZvciBvdGhlcnNcbiAgSUVfVkVSU0lPTiA9ICh3aW5kb3cgJiYgd2luZG93LmRvY3VtZW50IHx8IHt9KS5kb2N1bWVudE1vZGUgfCAwLFxuXG4gIC8vIGRldGVjdCBmaXJlZm94IHRvIGZpeCAjMTM3NFxuICBGSVJFRk9YID0gd2luZG93ICYmICEhd2luZG93Lkluc3RhbGxUcmlnZ2VyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xucmlvdC5vYnNlcnZhYmxlID0gZnVuY3Rpb24oZWwpIHtcblxuICAvKipcbiAgICogRXh0ZW5kIHRoZSBvcmlnaW5hbCBvYmplY3Qgb3IgY3JlYXRlIGEgbmV3IGVtcHR5IG9uZVxuICAgKiBAdHlwZSB7IE9iamVjdCB9XG4gICAqL1xuXG4gIGVsID0gZWwgfHwge31cblxuICAvKipcbiAgICogUHJpdmF0ZSB2YXJpYWJsZXNcbiAgICovXG4gIHZhciBjYWxsYmFja3MgPSB7fSxcbiAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZVxuXG4gIC8qKlxuICAgKiBQcml2YXRlIE1ldGhvZHNcbiAgICovXG5cbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiBuZWVkZWQgdG8gZ2V0IGFuZCBsb29wIGFsbCB0aGUgZXZlbnRzIGluIGEgc3RyaW5nXG4gICAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gICBlIC0gZXZlbnQgc3RyaW5nXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICBmbiAtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBvbkVhY2hFdmVudChlLCBmbikge1xuICAgIHZhciBlcyA9IGUuc3BsaXQoJyAnKSwgbCA9IGVzLmxlbmd0aCwgaSA9IDAsIG5hbWUsIGluZHhcbiAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgbmFtZSA9IGVzW2ldXG4gICAgICBpbmR4ID0gbmFtZS5pbmRleE9mKCcuJylcbiAgICAgIGlmIChuYW1lKSBmbiggfmluZHggPyBuYW1lLnN1YnN0cmluZygwLCBpbmR4KSA6IG5hbWUsIGksIH5pbmR4ID8gbmFtZS5zbGljZShpbmR4ICsgMSkgOiBudWxsKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgQXBpXG4gICAqL1xuXG4gIC8vIGV4dGVuZCB0aGUgZWwgb2JqZWN0IGFkZGluZyB0aGUgb2JzZXJ2YWJsZSBtZXRob2RzXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGVsLCB7XG4gICAgLyoqXG4gICAgICogTGlzdGVuIHRvIHRoZSBnaXZlbiBzcGFjZSBzZXBhcmF0ZWQgbGlzdCBvZiBgZXZlbnRzYCBhbmRcbiAgICAgKiBleGVjdXRlIHRoZSBgY2FsbGJhY2tgIGVhY2ggdGltZSBhbiBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogQHBhcmFtICB7IFN0cmluZyB9IGV2ZW50cyAtIGV2ZW50cyBpZHNcbiAgICAgKiBAcGFyYW0gIHsgRnVuY3Rpb24gfSBmbiAtIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMgeyBPYmplY3QgfSBlbFxuICAgICAqL1xuICAgIG9uOiB7XG4gICAgICB2YWx1ZTogZnVuY3Rpb24oZXZlbnRzLCBmbikge1xuICAgICAgICBpZiAodHlwZW9mIGZuICE9ICdmdW5jdGlvbicpICByZXR1cm4gZWxcblxuICAgICAgICBvbkVhY2hFdmVudChldmVudHMsIGZ1bmN0aW9uKG5hbWUsIHBvcywgbnMpIHtcbiAgICAgICAgICAoY2FsbGJhY2tzW25hbWVdID0gY2FsbGJhY2tzW25hbWVdIHx8IFtdKS5wdXNoKGZuKVxuICAgICAgICAgIGZuLnR5cGVkID0gcG9zID4gMFxuICAgICAgICAgIGZuLm5zID0gbnNcbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gZWxcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgZ2l2ZW4gc3BhY2Ugc2VwYXJhdGVkIGxpc3Qgb2YgYGV2ZW50c2AgbGlzdGVuZXJzXG4gICAgICogQHBhcmFtICAgeyBTdHJpbmcgfSBldmVudHMgLSBldmVudHMgaWRzXG4gICAgICogQHBhcmFtICAgeyBGdW5jdGlvbiB9IGZuIC0gY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7IE9iamVjdCB9IGVsXG4gICAgICovXG4gICAgb2ZmOiB7XG4gICAgICB2YWx1ZTogZnVuY3Rpb24oZXZlbnRzLCBmbikge1xuICAgICAgICBpZiAoZXZlbnRzID09ICcqJyAmJiAhZm4pIGNhbGxiYWNrcyA9IHt9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG9uRWFjaEV2ZW50KGV2ZW50cywgZnVuY3Rpb24obmFtZSwgcG9zLCBucykge1xuICAgICAgICAgICAgaWYgKGZuIHx8IG5zKSB7XG4gICAgICAgICAgICAgIHZhciBhcnIgPSBjYWxsYmFja3NbbmFtZV1cbiAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGNiOyBjYiA9IGFyciAmJiBhcnJbaV07ICsraSkge1xuICAgICAgICAgICAgICAgIGlmIChjYiA9PSBmbiB8fCBucyAmJiBjYi5ucyA9PSBucykgYXJyLnNwbGljZShpLS0sIDEpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBkZWxldGUgY2FsbGJhY2tzW25hbWVdXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTGlzdGVuIHRvIHRoZSBnaXZlbiBzcGFjZSBzZXBhcmF0ZWQgbGlzdCBvZiBgZXZlbnRzYCBhbmRcbiAgICAgKiBleGVjdXRlIHRoZSBgY2FsbGJhY2tgIGF0IG1vc3Qgb25jZVxuICAgICAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gZXZlbnRzIC0gZXZlbnRzIGlkc1xuICAgICAqIEBwYXJhbSAgIHsgRnVuY3Rpb24gfSBmbiAtIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMgeyBPYmplY3QgfSBlbFxuICAgICAqL1xuICAgIG9uZToge1xuICAgICAgdmFsdWU6IGZ1bmN0aW9uKGV2ZW50cywgZm4pIHtcbiAgICAgICAgZnVuY3Rpb24gb24oKSB7XG4gICAgICAgICAgZWwub2ZmKGV2ZW50cywgb24pXG4gICAgICAgICAgZm4uYXBwbHkoZWwsIGFyZ3VtZW50cylcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWwub24oZXZlbnRzLCBvbilcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSBhbGwgY2FsbGJhY2sgZnVuY3Rpb25zIHRoYXQgbGlzdGVuIHRvXG4gICAgICogdGhlIGdpdmVuIHNwYWNlIHNlcGFyYXRlZCBsaXN0IG9mIGBldmVudHNgXG4gICAgICogQHBhcmFtICAgeyBTdHJpbmcgfSBldmVudHMgLSBldmVudHMgaWRzXG4gICAgICogQHJldHVybnMgeyBPYmplY3QgfSBlbFxuICAgICAqL1xuICAgIHRyaWdnZXI6IHtcbiAgICAgIHZhbHVlOiBmdW5jdGlvbihldmVudHMpIHtcblxuICAgICAgICAvLyBnZXR0aW5nIHRoZSBhcmd1bWVudHNcbiAgICAgICAgdmFyIGFyZ2xlbiA9IGFyZ3VtZW50cy5sZW5ndGggLSAxLFxuICAgICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYXJnbGVuKSxcbiAgICAgICAgICBmbnNcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ2xlbjsgaSsrKSB7XG4gICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpICsgMV0gLy8gc2tpcCBmaXJzdCBhcmd1bWVudFxuICAgICAgICB9XG5cbiAgICAgICAgb25FYWNoRXZlbnQoZXZlbnRzLCBmdW5jdGlvbihuYW1lLCBwb3MsIG5zKSB7XG5cbiAgICAgICAgICBmbnMgPSBzbGljZS5jYWxsKGNhbGxiYWNrc1tuYW1lXSB8fCBbXSwgMClcblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBmbjsgZm4gPSBmbnNbaV07ICsraSkge1xuICAgICAgICAgICAgaWYgKGZuLmJ1c3kpIGNvbnRpbnVlXG4gICAgICAgICAgICBmbi5idXN5ID0gMVxuICAgICAgICAgICAgaWYgKCFucyB8fCBmbi5ucyA9PSBucykgZm4uYXBwbHkoZWwsIGZuLnR5cGVkID8gW25hbWVdLmNvbmNhdChhcmdzKSA6IGFyZ3MpXG4gICAgICAgICAgICBpZiAoZm5zW2ldICE9PSBmbikgeyBpLS0gfVxuICAgICAgICAgICAgZm4uYnVzeSA9IDBcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzWycqJ10gJiYgbmFtZSAhPSAnKicpXG4gICAgICAgICAgICBlbC50cmlnZ2VyLmFwcGx5KGVsLCBbJyonLCBuYW1lXS5jb25jYXQoYXJncykpXG5cbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gZWxcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIGVsXG5cbn1cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG47KGZ1bmN0aW9uKHJpb3QpIHtcblxuLyoqXG4gKiBTaW1wbGUgY2xpZW50LXNpZGUgcm91dGVyXG4gKiBAbW9kdWxlIHJpb3Qtcm91dGVcbiAqL1xuXG5cbnZhciBSRV9PUklHSU4gPSAvXi4rP1xcL1xcLytbXlxcL10rLyxcbiAgRVZFTlRfTElTVEVORVIgPSAnRXZlbnRMaXN0ZW5lcicsXG4gIFJFTU9WRV9FVkVOVF9MSVNURU5FUiA9ICdyZW1vdmUnICsgRVZFTlRfTElTVEVORVIsXG4gIEFERF9FVkVOVF9MSVNURU5FUiA9ICdhZGQnICsgRVZFTlRfTElTVEVORVIsXG4gIEhBU19BVFRSSUJVVEUgPSAnaGFzQXR0cmlidXRlJyxcbiAgUkVQTEFDRSA9ICdyZXBsYWNlJyxcbiAgUE9QU1RBVEUgPSAncG9wc3RhdGUnLFxuICBIQVNIQ0hBTkdFID0gJ2hhc2hjaGFuZ2UnLFxuICBUUklHR0VSID0gJ3RyaWdnZXInLFxuICBNQVhfRU1JVF9TVEFDS19MRVZFTCA9IDMsXG4gIHdpbiA9IHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LFxuICBkb2MgPSB0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcgJiYgZG9jdW1lbnQsXG4gIGhpc3QgPSB3aW4gJiYgaGlzdG9yeSxcbiAgbG9jID0gd2luICYmIChoaXN0LmxvY2F0aW9uIHx8IHdpbi5sb2NhdGlvbiksIC8vIHNlZSBodG1sNS1oaXN0b3J5LWFwaVxuICBwcm90ID0gUm91dGVyLnByb3RvdHlwZSwgLy8gdG8gbWluaWZ5IG1vcmVcbiAgY2xpY2tFdmVudCA9IGRvYyAmJiBkb2Mub250b3VjaHN0YXJ0ID8gJ3RvdWNoc3RhcnQnIDogJ2NsaWNrJyxcbiAgc3RhcnRlZCA9IGZhbHNlLFxuICBjZW50cmFsID0gcmlvdC5vYnNlcnZhYmxlKCksXG4gIHJvdXRlRm91bmQgPSBmYWxzZSxcbiAgZGVib3VuY2VkRW1pdCxcbiAgYmFzZSwgY3VycmVudCwgcGFyc2VyLCBzZWNvbmRQYXJzZXIsIGVtaXRTdGFjayA9IFtdLCBlbWl0U3RhY2tMZXZlbCA9IDBcblxuLyoqXG4gKiBEZWZhdWx0IHBhcnNlci4gWW91IGNhbiByZXBsYWNlIGl0IHZpYSByb3V0ZXIucGFyc2VyIG1ldGhvZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gY3VycmVudCBwYXRoIChub3JtYWxpemVkKVxuICogQHJldHVybnMge2FycmF5fSBhcnJheVxuICovXG5mdW5jdGlvbiBERUZBVUxUX1BBUlNFUihwYXRoKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KC9bLz8jXS8pXG59XG5cbi8qKlxuICogRGVmYXVsdCBwYXJzZXIgKHNlY29uZCkuIFlvdSBjYW4gcmVwbGFjZSBpdCB2aWEgcm91dGVyLnBhcnNlciBtZXRob2QuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCAtIGN1cnJlbnQgcGF0aCAobm9ybWFsaXplZClcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWx0ZXIgLSBmaWx0ZXIgc3RyaW5nIChub3JtYWxpemVkKVxuICogQHJldHVybnMge2FycmF5fSBhcnJheVxuICovXG5mdW5jdGlvbiBERUZBVUxUX1NFQ09ORF9QQVJTRVIocGF0aCwgZmlsdGVyKSB7XG4gIHZhciByZSA9IG5ldyBSZWdFeHAoJ14nICsgZmlsdGVyW1JFUExBQ0VdKC9cXCovZywgJyhbXi8/I10rPyknKVtSRVBMQUNFXSgvXFwuXFwuLywgJy4qJykgKyAnJCcpLFxuICAgIGFyZ3MgPSBwYXRoLm1hdGNoKHJlKVxuXG4gIGlmIChhcmdzKSByZXR1cm4gYXJncy5zbGljZSgxKVxufVxuXG4vKipcbiAqIFNpbXBsZS9jaGVhcCBkZWJvdW5jZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtICAge2Z1bmN0aW9ufSBmbiAtIGNhbGxiYWNrXG4gKiBAcGFyYW0gICB7bnVtYmVyfSBkZWxheSAtIGRlbGF5IGluIHNlY29uZHNcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gZGVib3VuY2VkIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGRlYm91bmNlKGZuLCBkZWxheSkge1xuICB2YXIgdFxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIGNsZWFyVGltZW91dCh0KVxuICAgIHQgPSBzZXRUaW1lb3V0KGZuLCBkZWxheSlcbiAgfVxufVxuXG4vKipcbiAqIFNldCB0aGUgd2luZG93IGxpc3RlbmVycyB0byB0cmlnZ2VyIHRoZSByb3V0ZXNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYXV0b0V4ZWMgLSBzZWUgcm91dGUuc3RhcnRcbiAqL1xuZnVuY3Rpb24gc3RhcnQoYXV0b0V4ZWMpIHtcbiAgZGVib3VuY2VkRW1pdCA9IGRlYm91bmNlKGVtaXQsIDEpXG4gIHdpbltBRERfRVZFTlRfTElTVEVORVJdKFBPUFNUQVRFLCBkZWJvdW5jZWRFbWl0KVxuICB3aW5bQUREX0VWRU5UX0xJU1RFTkVSXShIQVNIQ0hBTkdFLCBkZWJvdW5jZWRFbWl0KVxuICBkb2NbQUREX0VWRU5UX0xJU1RFTkVSXShjbGlja0V2ZW50LCBjbGljaylcbiAgaWYgKGF1dG9FeGVjKSBlbWl0KHRydWUpXG59XG5cbi8qKlxuICogUm91dGVyIGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFJvdXRlcigpIHtcbiAgdGhpcy4kID0gW11cbiAgcmlvdC5vYnNlcnZhYmxlKHRoaXMpIC8vIG1ha2UgaXQgb2JzZXJ2YWJsZVxuICBjZW50cmFsLm9uKCdzdG9wJywgdGhpcy5zLmJpbmQodGhpcykpXG4gIGNlbnRyYWwub24oJ2VtaXQnLCB0aGlzLmUuYmluZCh0aGlzKSlcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGhbUkVQTEFDRV0oL15cXC98XFwvJC8sICcnKVxufVxuXG5mdW5jdGlvbiBpc1N0cmluZyhzdHIpIHtcbiAgcmV0dXJuIHR5cGVvZiBzdHIgPT0gJ3N0cmluZydcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHBhcnQgYWZ0ZXIgZG9tYWluIG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBocmVmIC0gZnVsbHBhdGhcbiAqIEByZXR1cm5zIHtzdHJpbmd9IHBhdGggZnJvbSByb290XG4gKi9cbmZ1bmN0aW9uIGdldFBhdGhGcm9tUm9vdChocmVmKSB7XG4gIHJldHVybiAoaHJlZiB8fCBsb2MuaHJlZilbUkVQTEFDRV0oUkVfT1JJR0lOLCAnJylcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHBhcnQgYWZ0ZXIgYmFzZVxuICogQHBhcmFtIHtzdHJpbmd9IGhyZWYgLSBmdWxscGF0aFxuICogQHJldHVybnMge3N0cmluZ30gcGF0aCBmcm9tIGJhc2VcbiAqL1xuZnVuY3Rpb24gZ2V0UGF0aEZyb21CYXNlKGhyZWYpIHtcbiAgcmV0dXJuIGJhc2VbMF0gPT0gJyMnXG4gICAgPyAoaHJlZiB8fCBsb2MuaHJlZiB8fCAnJykuc3BsaXQoYmFzZSlbMV0gfHwgJydcbiAgICA6IChsb2MgPyBnZXRQYXRoRnJvbVJvb3QoaHJlZikgOiBocmVmIHx8ICcnKVtSRVBMQUNFXShiYXNlLCAnJylcbn1cblxuZnVuY3Rpb24gZW1pdChmb3JjZSkge1xuICAvLyB0aGUgc3RhY2sgaXMgbmVlZGVkIGZvciByZWRpcmVjdGlvbnNcbiAgdmFyIGlzUm9vdCA9IGVtaXRTdGFja0xldmVsID09IDBcbiAgaWYgKE1BWF9FTUlUX1NUQUNLX0xFVkVMIDw9IGVtaXRTdGFja0xldmVsKSByZXR1cm5cblxuICBlbWl0U3RhY2tMZXZlbCsrXG4gIGVtaXRTdGFjay5wdXNoKGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gZ2V0UGF0aEZyb21CYXNlKClcbiAgICBpZiAoZm9yY2UgfHwgcGF0aCAhPSBjdXJyZW50KSB7XG4gICAgICBjZW50cmFsW1RSSUdHRVJdKCdlbWl0JywgcGF0aClcbiAgICAgIGN1cnJlbnQgPSBwYXRoXG4gICAgfVxuICB9KVxuICBpZiAoaXNSb290KSB7XG4gICAgd2hpbGUgKGVtaXRTdGFjay5sZW5ndGgpIHtcbiAgICAgIGVtaXRTdGFja1swXSgpXG4gICAgICBlbWl0U3RhY2suc2hpZnQoKVxuICAgIH1cbiAgICBlbWl0U3RhY2tMZXZlbCA9IDBcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGljayhlKSB7XG4gIGlmIChcbiAgICBlLndoaWNoICE9IDEgLy8gbm90IGxlZnQgY2xpY2tcbiAgICB8fCBlLm1ldGFLZXkgfHwgZS5jdHJsS2V5IHx8IGUuc2hpZnRLZXkgLy8gb3IgbWV0YSBrZXlzXG4gICAgfHwgZS5kZWZhdWx0UHJldmVudGVkIC8vIG9yIGRlZmF1bHQgcHJldmVudGVkXG4gICkgcmV0dXJuXG5cbiAgdmFyIGVsID0gZS50YXJnZXRcbiAgd2hpbGUgKGVsICYmIGVsLm5vZGVOYW1lICE9ICdBJykgZWwgPSBlbC5wYXJlbnROb2RlXG5cbiAgaWYgKFxuICAgICFlbCB8fCBlbC5ub2RlTmFtZSAhPSAnQScgLy8gbm90IEEgdGFnXG4gICAgfHwgZWxbSEFTX0FUVFJJQlVURV0oJ2Rvd25sb2FkJykgLy8gaGFzIGRvd25sb2FkIGF0dHJcbiAgICB8fCAhZWxbSEFTX0FUVFJJQlVURV0oJ2hyZWYnKSAvLyBoYXMgbm8gaHJlZiBhdHRyXG4gICAgfHwgZWwudGFyZ2V0ICYmIGVsLnRhcmdldCAhPSAnX3NlbGYnIC8vIGFub3RoZXIgd2luZG93IG9yIGZyYW1lXG4gICAgfHwgZWwuaHJlZi5pbmRleE9mKGxvYy5ocmVmLm1hdGNoKFJFX09SSUdJTilbMF0pID09IC0xIC8vIGNyb3NzIG9yaWdpblxuICApIHJldHVyblxuXG4gIGlmIChlbC5ocmVmICE9IGxvYy5ocmVmKSB7XG4gICAgaWYgKFxuICAgICAgZWwuaHJlZi5zcGxpdCgnIycpWzBdID09IGxvYy5ocmVmLnNwbGl0KCcjJylbMF0gLy8gaW50ZXJuYWwganVtcFxuICAgICAgfHwgYmFzZSAhPSAnIycgJiYgZ2V0UGF0aEZyb21Sb290KGVsLmhyZWYpLmluZGV4T2YoYmFzZSkgIT09IDAgLy8gb3V0c2lkZSBvZiBiYXNlXG4gICAgICB8fCAhZ28oZ2V0UGF0aEZyb21CYXNlKGVsLmhyZWYpLCBlbC50aXRsZSB8fCBkb2MudGl0bGUpIC8vIHJvdXRlIG5vdCBmb3VuZFxuICAgICkgcmV0dXJuXG4gIH1cblxuICBlLnByZXZlbnREZWZhdWx0KClcbn1cblxuLyoqXG4gKiBHbyB0byB0aGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBkZXN0aW5hdGlvbiBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgLSBwYWdlIHRpdGxlXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHNob3VsZFJlcGxhY2UgLSB1c2UgcmVwbGFjZVN0YXRlIG9yIHB1c2hTdGF0ZVxuICogQHJldHVybnMge2Jvb2xlYW59IC0gcm91dGUgbm90IGZvdW5kIGZsYWdcbiAqL1xuZnVuY3Rpb24gZ28ocGF0aCwgdGl0bGUsIHNob3VsZFJlcGxhY2UpIHtcbiAgaWYgKGhpc3QpIHsgLy8gaWYgYSBicm93c2VyXG4gICAgcGF0aCA9IGJhc2UgKyBub3JtYWxpemUocGF0aClcbiAgICB0aXRsZSA9IHRpdGxlIHx8IGRvYy50aXRsZVxuICAgIC8vIGJyb3dzZXJzIGlnbm9yZXMgdGhlIHNlY29uZCBwYXJhbWV0ZXIgYHRpdGxlYFxuICAgIHNob3VsZFJlcGxhY2VcbiAgICAgID8gaGlzdC5yZXBsYWNlU3RhdGUobnVsbCwgdGl0bGUsIHBhdGgpXG4gICAgICA6IGhpc3QucHVzaFN0YXRlKG51bGwsIHRpdGxlLCBwYXRoKVxuICAgIC8vIHNvIHdlIG5lZWQgdG8gc2V0IGl0IG1hbnVhbGx5XG4gICAgZG9jLnRpdGxlID0gdGl0bGVcbiAgICByb3V0ZUZvdW5kID0gZmFsc2VcbiAgICBlbWl0KClcbiAgICByZXR1cm4gcm91dGVGb3VuZFxuICB9XG5cbiAgLy8gU2VydmVyLXNpZGUgdXNhZ2U6IGRpcmVjdGx5IGV4ZWN1dGUgaGFuZGxlcnMgZm9yIHRoZSBwYXRoXG4gIHJldHVybiBjZW50cmFsW1RSSUdHRVJdKCdlbWl0JywgZ2V0UGF0aEZyb21CYXNlKHBhdGgpKVxufVxuXG4vKipcbiAqIEdvIHRvIHBhdGggb3Igc2V0IGFjdGlvblxuICogYSBzaW5nbGUgc3RyaW5nOiAgICAgICAgICAgICAgICBnbyB0aGVyZVxuICogdHdvIHN0cmluZ3M6ICAgICAgICAgICAgICAgICAgICBnbyB0aGVyZSB3aXRoIHNldHRpbmcgYSB0aXRsZVxuICogdHdvIHN0cmluZ3MgYW5kIGJvb2xlYW46ICAgICAgICByZXBsYWNlIGhpc3Rvcnkgd2l0aCBzZXR0aW5nIGEgdGl0bGVcbiAqIGEgc2luZ2xlIGZ1bmN0aW9uOiAgICAgICAgICAgICAgc2V0IGFuIGFjdGlvbiBvbiB0aGUgZGVmYXVsdCByb3V0ZVxuICogYSBzdHJpbmcvUmVnRXhwIGFuZCBhIGZ1bmN0aW9uOiBzZXQgYW4gYWN0aW9uIG9uIHRoZSByb3V0ZVxuICogQHBhcmFtIHsoc3RyaW5nfGZ1bmN0aW9uKX0gZmlyc3QgLSBwYXRoIC8gYWN0aW9uIC8gZmlsdGVyXG4gKiBAcGFyYW0geyhzdHJpbmd8UmVnRXhwfGZ1bmN0aW9uKX0gc2Vjb25kIC0gdGl0bGUgLyBhY3Rpb25cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gdGhpcmQgLSByZXBsYWNlIGZsYWdcbiAqL1xucHJvdC5tID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCwgdGhpcmQpIHtcbiAgaWYgKGlzU3RyaW5nKGZpcnN0KSAmJiAoIXNlY29uZCB8fCBpc1N0cmluZyhzZWNvbmQpKSkgZ28oZmlyc3QsIHNlY29uZCwgdGhpcmQgfHwgZmFsc2UpXG4gIGVsc2UgaWYgKHNlY29uZCkgdGhpcy5yKGZpcnN0LCBzZWNvbmQpXG4gIGVsc2UgdGhpcy5yKCdAJywgZmlyc3QpXG59XG5cbi8qKlxuICogU3RvcCByb3V0aW5nXG4gKi9cbnByb3QucyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm9mZignKicpXG4gIHRoaXMuJCA9IFtdXG59XG5cbi8qKlxuICogRW1pdFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBwYXRoXG4gKi9cbnByb3QuZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdGhpcy4kLmNvbmNhdCgnQCcpLnNvbWUoZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgdmFyIGFyZ3MgPSAoZmlsdGVyID09ICdAJyA/IHBhcnNlciA6IHNlY29uZFBhcnNlcikobm9ybWFsaXplKHBhdGgpLCBub3JtYWxpemUoZmlsdGVyKSlcbiAgICBpZiAodHlwZW9mIGFyZ3MgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbVFJJR0dFUl0uYXBwbHkobnVsbCwgW2ZpbHRlcl0uY29uY2F0KGFyZ3MpKVxuICAgICAgcmV0dXJuIHJvdXRlRm91bmQgPSB0cnVlIC8vIGV4aXQgZnJvbSBsb29wXG4gICAgfVxuICB9LCB0aGlzKVxufVxuXG4vKipcbiAqIFJlZ2lzdGVyIHJvdXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsdGVyIC0gZmlsdGVyIGZvciBtYXRjaGluZyB0byB1cmxcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGFjdGlvbiAtIGFjdGlvbiB0byByZWdpc3RlclxuICovXG5wcm90LnIgPSBmdW5jdGlvbihmaWx0ZXIsIGFjdGlvbikge1xuICBpZiAoZmlsdGVyICE9ICdAJykge1xuICAgIGZpbHRlciA9ICcvJyArIG5vcm1hbGl6ZShmaWx0ZXIpXG4gICAgdGhpcy4kLnB1c2goZmlsdGVyKVxuICB9XG4gIHRoaXMub24oZmlsdGVyLCBhY3Rpb24pXG59XG5cbnZhciBtYWluUm91dGVyID0gbmV3IFJvdXRlcigpXG52YXIgcm91dGUgPSBtYWluUm91dGVyLm0uYmluZChtYWluUm91dGVyKVxuXG4vKipcbiAqIENyZWF0ZSBhIHN1YiByb3V0ZXJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gdGhlIG1ldGhvZCBvZiBhIG5ldyBSb3V0ZXIgb2JqZWN0XG4gKi9cbnJvdXRlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbmV3U3ViUm91dGVyID0gbmV3IFJvdXRlcigpXG4gIC8vIGFzc2lnbiBzdWItcm91dGVyJ3MgbWFpbiBtZXRob2RcbiAgdmFyIHJvdXRlciA9IG5ld1N1YlJvdXRlci5tLmJpbmQobmV3U3ViUm91dGVyKVxuICAvLyBzdG9wIG9ubHkgdGhpcyBzdWItcm91dGVyXG4gIHJvdXRlci5zdG9wID0gbmV3U3ViUm91dGVyLnMuYmluZChuZXdTdWJSb3V0ZXIpXG4gIHJldHVybiByb3V0ZXJcbn1cblxuLyoqXG4gKiBTZXQgdGhlIGJhc2Ugb2YgdXJsXG4gKiBAcGFyYW0geyhzdHJ8UmVnRXhwKX0gYXJnIC0gYSBuZXcgYmFzZSBvciAnIycgb3IgJyMhJ1xuICovXG5yb3V0ZS5iYXNlID0gZnVuY3Rpb24oYXJnKSB7XG4gIGJhc2UgPSBhcmcgfHwgJyMnXG4gIGN1cnJlbnQgPSBnZXRQYXRoRnJvbUJhc2UoKSAvLyByZWNhbGN1bGF0ZSBjdXJyZW50IHBhdGhcbn1cblxuLyoqIEV4ZWMgcm91dGluZyByaWdodCBub3cgKiovXG5yb3V0ZS5leGVjID0gZnVuY3Rpb24oKSB7XG4gIGVtaXQodHJ1ZSlcbn1cblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBkZWZhdWx0IHJvdXRlciB0byB5b3Vyc1xuICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gLSB5b3VyIHBhcnNlciBmdW5jdGlvblxuICogQHBhcmFtIHtmdW5jdGlvbn0gZm4yIC0geW91ciBzZWNvbmRQYXJzZXIgZnVuY3Rpb25cbiAqL1xucm91dGUucGFyc2VyID0gZnVuY3Rpb24oZm4sIGZuMikge1xuICBpZiAoIWZuICYmICFmbjIpIHtcbiAgICAvLyByZXNldCBwYXJzZXIgZm9yIHRlc3RpbmcuLi5cbiAgICBwYXJzZXIgPSBERUZBVUxUX1BBUlNFUlxuICAgIHNlY29uZFBhcnNlciA9IERFRkFVTFRfU0VDT05EX1BBUlNFUlxuICB9XG4gIGlmIChmbikgcGFyc2VyID0gZm5cbiAgaWYgKGZuMikgc2Vjb25kUGFyc2VyID0gZm4yXG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGdldCB1cmwgcXVlcnkgYXMgYW4gb2JqZWN0XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBwYXJzZWQgcXVlcnlcbiAqL1xucm91dGUucXVlcnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHEgPSB7fVxuICB2YXIgaHJlZiA9IGxvYy5ocmVmIHx8IGN1cnJlbnRcbiAgaHJlZltSRVBMQUNFXSgvWz8mXSguKz8pPShbXiZdKikvZywgZnVuY3Rpb24oXywgaywgdikgeyBxW2tdID0gdiB9KVxuICByZXR1cm4gcVxufVxuXG4vKiogU3RvcCByb3V0aW5nICoqL1xucm91dGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHN0YXJ0ZWQpIHtcbiAgICBpZiAod2luKSB7XG4gICAgICB3aW5bUkVNT1ZFX0VWRU5UX0xJU1RFTkVSXShQT1BTVEFURSwgZGVib3VuY2VkRW1pdClcbiAgICAgIHdpbltSRU1PVkVfRVZFTlRfTElTVEVORVJdKEhBU0hDSEFOR0UsIGRlYm91bmNlZEVtaXQpXG4gICAgICBkb2NbUkVNT1ZFX0VWRU5UX0xJU1RFTkVSXShjbGlja0V2ZW50LCBjbGljaylcbiAgICB9XG4gICAgY2VudHJhbFtUUklHR0VSXSgnc3RvcCcpXG4gICAgc3RhcnRlZCA9IGZhbHNlXG4gIH1cbn1cblxuLyoqXG4gKiBTdGFydCByb3V0aW5nXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGF1dG9FeGVjIC0gYXV0b21hdGljYWxseSBleGVjIGFmdGVyIHN0YXJ0aW5nIGlmIHRydWVcbiAqL1xucm91dGUuc3RhcnQgPSBmdW5jdGlvbiAoYXV0b0V4ZWMpIHtcbiAgaWYgKCFzdGFydGVkKSB7XG4gICAgaWYgKHdpbikge1xuICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gJ2NvbXBsZXRlJykgc3RhcnQoYXV0b0V4ZWMpXG4gICAgICAvLyB0aGUgdGltZW91dCBpcyBuZWVkZWQgdG8gc29sdmVcbiAgICAgIC8vIGEgd2VpcmQgc2FmYXJpIGJ1ZyBodHRwczovL2dpdGh1Yi5jb20vcmlvdC9yb3V0ZS9pc3N1ZXMvMzNcbiAgICAgIGVsc2Ugd2luW0FERF9FVkVOVF9MSVNURU5FUl0oJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgc3RhcnQoYXV0b0V4ZWMpIH0sIDEpXG4gICAgICB9KVxuICAgIH1cbiAgICBzdGFydGVkID0gdHJ1ZVxuICB9XG59XG5cbi8qKiBQcmVwYXJlIHRoZSByb3V0ZXIgKiovXG5yb3V0ZS5iYXNlKClcbnJvdXRlLnBhcnNlcigpXG5cbnJpb3Qucm91dGUgPSByb3V0ZVxufSkocmlvdClcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5cbi8qKlxuICogVGhlIHJpb3QgdGVtcGxhdGUgZW5naW5lXG4gKiBAdmVyc2lvbiB2Mi40LjBcbiAqL1xuLyoqXG4gKiByaW90LnV0aWwuYnJhY2tldHNcbiAqXG4gKiAtIGBicmFja2V0cyAgICBgIC0gUmV0dXJucyBhIHN0cmluZyBvciByZWdleCBiYXNlZCBvbiBpdHMgcGFyYW1ldGVyXG4gKiAtIGBicmFja2V0cy5zZXRgIC0gQ2hhbmdlIHRoZSBjdXJyZW50IHJpb3QgYnJhY2tldHNcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxudmFyIGJyYWNrZXRzID0gKGZ1bmN0aW9uIChVTkRFRikge1xuXG4gIHZhclxuICAgIFJFR0xPQiA9ICdnJyxcblxuICAgIFJfTUxDT01NUyA9IC9cXC9cXCpbXipdKlxcKisoPzpbXipcXC9dW14qXSpcXCorKSpcXC8vZyxcblxuICAgIFJfU1RSSU5HUyA9IC9cIlteXCJcXFxcXSooPzpcXFxcW1xcU1xcc11bXlwiXFxcXF0qKSpcInwnW14nXFxcXF0qKD86XFxcXFtcXFNcXHNdW14nXFxcXF0qKSonL2csXG5cbiAgICBTX1FCTE9DS1MgPSBSX1NUUklOR1Muc291cmNlICsgJ3wnICtcbiAgICAgIC8oPzpcXGJyZXR1cm5cXHMrfCg/OlskXFx3XFwpXFxdXXxcXCtcXCt8LS0pXFxzKihcXC8pKD8hWypcXC9dKSkvLnNvdXJjZSArICd8JyArXG4gICAgICAvXFwvKD89W14qXFwvXSlbXltcXC9cXFxcXSooPzooPzpcXFsoPzpcXFxcLnxbXlxcXVxcXFxdKikqXFxdfFxcXFwuKVteW1xcL1xcXFxdKikqPyhcXC8pW2dpbV0qLy5zb3VyY2UsXG5cbiAgICBGSU5EQlJBQ0VTID0ge1xuICAgICAgJygnOiBSZWdFeHAoJyhbKCldKXwnICAgKyBTX1FCTE9DS1MsIFJFR0xPQiksXG4gICAgICAnWyc6IFJlZ0V4cCgnKFtbXFxcXF1dKXwnICsgU19RQkxPQ0tTLCBSRUdMT0IpLFxuICAgICAgJ3snOiBSZWdFeHAoJyhbe31dKXwnICAgKyBTX1FCTE9DS1MsIFJFR0xPQilcbiAgICB9LFxuXG4gICAgREVGQVVMVCA9ICd7IH0nXG5cbiAgdmFyIF9wYWlycyA9IFtcbiAgICAneycsICd9JyxcbiAgICAneycsICd9JyxcbiAgICAve1tefV0qfS8sXG4gICAgL1xcXFwoW3t9XSkvZyxcbiAgICAvXFxcXCh7KXx7L2csXG4gICAgUmVnRXhwKCdcXFxcXFxcXCh9KXwoW1soe10pfCh9KXwnICsgU19RQkxPQ0tTLCBSRUdMT0IpLFxuICAgIERFRkFVTFQsXG4gICAgL15cXHMqe1xcXj9cXHMqKFskXFx3XSspKD86XFxzKixcXHMqKFxcUyspKT9cXHMraW5cXHMrKFxcUy4qKVxccyp9LyxcbiAgICAvKF58W15cXFxcXSl7PVtcXFNcXHNdKj99L1xuICBdXG5cbiAgdmFyXG4gICAgY2FjaGVkQnJhY2tldHMgPSBVTkRFRixcbiAgICBfcmVnZXgsXG4gICAgX2NhY2hlID0gW10sXG4gICAgX3NldHRpbmdzXG5cbiAgZnVuY3Rpb24gX2xvb3BiYWNrIChyZSkgeyByZXR1cm4gcmUgfVxuXG4gIGZ1bmN0aW9uIF9yZXdyaXRlIChyZSwgYnApIHtcbiAgICBpZiAoIWJwKSBicCA9IF9jYWNoZVxuICAgIHJldHVybiBuZXcgUmVnRXhwKFxuICAgICAgcmUuc291cmNlLnJlcGxhY2UoL3svZywgYnBbMl0pLnJlcGxhY2UoL30vZywgYnBbM10pLCByZS5nbG9iYWwgPyBSRUdMT0IgOiAnJ1xuICAgIClcbiAgfVxuXG4gIGZ1bmN0aW9uIF9jcmVhdGUgKHBhaXIpIHtcbiAgICBpZiAocGFpciA9PT0gREVGQVVMVCkgcmV0dXJuIF9wYWlyc1xuXG4gICAgdmFyIGFyciA9IHBhaXIuc3BsaXQoJyAnKVxuXG4gICAgaWYgKGFyci5sZW5ndGggIT09IDIgfHwgL1tcXHgwMC1cXHgxRjw+YS16QS1aMC05J1wiLDtcXFxcXS8udGVzdChwYWlyKSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIGJyYWNrZXRzIFwiJyArIHBhaXIgKyAnXCInKVxuICAgIH1cbiAgICBhcnIgPSBhcnIuY29uY2F0KHBhaXIucmVwbGFjZSgvKD89W1tcXF0oKSorPy5eJHxdKS9nLCAnXFxcXCcpLnNwbGl0KCcgJykpXG5cbiAgICBhcnJbNF0gPSBfcmV3cml0ZShhcnJbMV0ubGVuZ3RoID4gMSA/IC97W1xcU1xcc10qP30vIDogX3BhaXJzWzRdLCBhcnIpXG4gICAgYXJyWzVdID0gX3Jld3JpdGUocGFpci5sZW5ndGggPiAzID8gL1xcXFwoe3x9KS9nIDogX3BhaXJzWzVdLCBhcnIpXG4gICAgYXJyWzZdID0gX3Jld3JpdGUoX3BhaXJzWzZdLCBhcnIpXG4gICAgYXJyWzddID0gUmVnRXhwKCdcXFxcXFxcXCgnICsgYXJyWzNdICsgJyl8KFtbKHtdKXwoJyArIGFyclszXSArICcpfCcgKyBTX1FCTE9DS1MsIFJFR0xPQilcbiAgICBhcnJbOF0gPSBwYWlyXG4gICAgcmV0dXJuIGFyclxuICB9XG5cbiAgZnVuY3Rpb24gX2JyYWNrZXRzIChyZU9ySWR4KSB7XG4gICAgcmV0dXJuIHJlT3JJZHggaW5zdGFuY2VvZiBSZWdFeHAgPyBfcmVnZXgocmVPcklkeCkgOiBfY2FjaGVbcmVPcklkeF1cbiAgfVxuXG4gIF9icmFja2V0cy5zcGxpdCA9IGZ1bmN0aW9uIHNwbGl0IChzdHIsIHRtcGwsIF9icCkge1xuICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0OiBfYnAgaXMgZm9yIHRoZSBjb21waWxlclxuICAgIGlmICghX2JwKSBfYnAgPSBfY2FjaGVcblxuICAgIHZhclxuICAgICAgcGFydHMgPSBbXSxcbiAgICAgIG1hdGNoLFxuICAgICAgaXNleHByLFxuICAgICAgc3RhcnQsXG4gICAgICBwb3MsXG4gICAgICByZSA9IF9icFs2XVxuXG4gICAgaXNleHByID0gc3RhcnQgPSByZS5sYXN0SW5kZXggPSAwXG5cbiAgICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhzdHIpKSkge1xuXG4gICAgICBwb3MgPSBtYXRjaC5pbmRleFxuXG4gICAgICBpZiAoaXNleHByKSB7XG5cbiAgICAgICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICAgICAgcmUubGFzdEluZGV4ID0gc2tpcEJyYWNlcyhzdHIsIG1hdGNoWzJdLCByZS5sYXN0SW5kZXgpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1hdGNoWzNdKSB7XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIW1hdGNoWzFdKSB7XG4gICAgICAgIHVuZXNjYXBlU3RyKHN0ci5zbGljZShzdGFydCwgcG9zKSlcbiAgICAgICAgc3RhcnQgPSByZS5sYXN0SW5kZXhcbiAgICAgICAgcmUgPSBfYnBbNiArIChpc2V4cHIgXj0gMSldXG4gICAgICAgIHJlLmxhc3RJbmRleCA9IHN0YXJ0XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN0ciAmJiBzdGFydCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgIHVuZXNjYXBlU3RyKHN0ci5zbGljZShzdGFydCkpXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnRzXG5cbiAgICBmdW5jdGlvbiB1bmVzY2FwZVN0ciAocykge1xuICAgICAgaWYgKHRtcGwgfHwgaXNleHByKSB7XG4gICAgICAgIHBhcnRzLnB1c2gocyAmJiBzLnJlcGxhY2UoX2JwWzVdLCAnJDEnKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnRzLnB1c2gocylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBza2lwQnJhY2VzIChzLCBjaCwgaXgpIHtcbiAgICAgIHZhclxuICAgICAgICBtYXRjaCxcbiAgICAgICAgcmVjY2ggPSBGSU5EQlJBQ0VTW2NoXVxuXG4gICAgICByZWNjaC5sYXN0SW5kZXggPSBpeFxuICAgICAgaXggPSAxXG4gICAgICB3aGlsZSAoKG1hdGNoID0gcmVjY2guZXhlYyhzKSkpIHtcbiAgICAgICAgaWYgKG1hdGNoWzFdICYmXG4gICAgICAgICAgIShtYXRjaFsxXSA9PT0gY2ggPyArK2l4IDogLS1peCkpIGJyZWFrXG4gICAgICB9XG4gICAgICByZXR1cm4gaXggPyBzLmxlbmd0aCA6IHJlY2NoLmxhc3RJbmRleFxuICAgIH1cbiAgfVxuXG4gIF9icmFja2V0cy5oYXNFeHByID0gZnVuY3Rpb24gaGFzRXhwciAoc3RyKSB7XG4gICAgcmV0dXJuIF9jYWNoZVs0XS50ZXN0KHN0cilcbiAgfVxuXG4gIF9icmFja2V0cy5sb29wS2V5cyA9IGZ1bmN0aW9uIGxvb3BLZXlzIChleHByKSB7XG4gICAgdmFyIG0gPSBleHByLm1hdGNoKF9jYWNoZVs5XSlcblxuICAgIHJldHVybiBtXG4gICAgICA/IHsga2V5OiBtWzFdLCBwb3M6IG1bMl0sIHZhbDogX2NhY2hlWzBdICsgbVszXS50cmltKCkgKyBfY2FjaGVbMV0gfVxuICAgICAgOiB7IHZhbDogZXhwci50cmltKCkgfVxuICB9XG5cbiAgX2JyYWNrZXRzLmFycmF5ID0gZnVuY3Rpb24gYXJyYXkgKHBhaXIpIHtcbiAgICByZXR1cm4gcGFpciA/IF9jcmVhdGUocGFpcikgOiBfY2FjaGVcbiAgfVxuXG4gIGZ1bmN0aW9uIF9yZXNldCAocGFpcikge1xuICAgIGlmICgocGFpciB8fCAocGFpciA9IERFRkFVTFQpKSAhPT0gX2NhY2hlWzhdKSB7XG4gICAgICBfY2FjaGUgPSBfY3JlYXRlKHBhaXIpXG4gICAgICBfcmVnZXggPSBwYWlyID09PSBERUZBVUxUID8gX2xvb3BiYWNrIDogX3Jld3JpdGVcbiAgICAgIF9jYWNoZVs5XSA9IF9yZWdleChfcGFpcnNbOV0pXG4gICAgfVxuICAgIGNhY2hlZEJyYWNrZXRzID0gcGFpclxuICB9XG5cbiAgZnVuY3Rpb24gX3NldFNldHRpbmdzIChvKSB7XG4gICAgdmFyIGJcblxuICAgIG8gPSBvIHx8IHt9XG4gICAgYiA9IG8uYnJhY2tldHNcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgJ2JyYWNrZXRzJywge1xuICAgICAgc2V0OiBfcmVzZXQsXG4gICAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNhY2hlZEJyYWNrZXRzIH0sXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgfSlcbiAgICBfc2V0dGluZ3MgPSBvXG4gICAgX3Jlc2V0KGIpXG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoX2JyYWNrZXRzLCAnc2V0dGluZ3MnLCB7XG4gICAgc2V0OiBfc2V0U2V0dGluZ3MsXG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBfc2V0dGluZ3MgfVxuICB9KVxuXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0OiBpbiB0aGUgYnJvd3NlciByaW90IGlzIGFsd2F5cyBpbiB0aGUgc2NvcGUgKi9cbiAgX2JyYWNrZXRzLnNldHRpbmdzID0gdHlwZW9mIHJpb3QgIT09ICd1bmRlZmluZWQnICYmIHJpb3Quc2V0dGluZ3MgfHwge31cbiAgX2JyYWNrZXRzLnNldCA9IF9yZXNldFxuXG4gIF9icmFja2V0cy5SX1NUUklOR1MgPSBSX1NUUklOR1NcbiAgX2JyYWNrZXRzLlJfTUxDT01NUyA9IFJfTUxDT01NU1xuICBfYnJhY2tldHMuU19RQkxPQ0tTID0gU19RQkxPQ0tTXG5cbiAgcmV0dXJuIF9icmFja2V0c1xuXG59KSgpXG5cbi8qKlxuICogQG1vZHVsZSB0bXBsXG4gKlxuICogdG1wbCAgICAgICAgICAtIFJvb3QgZnVuY3Rpb24sIHJldHVybnMgdGhlIHRlbXBsYXRlIHZhbHVlLCByZW5kZXIgd2l0aCBkYXRhXG4gKiB0bXBsLmhhc0V4cHIgIC0gVGVzdCB0aGUgZXhpc3RlbmNlIG9mIGEgZXhwcmVzc2lvbiBpbnNpZGUgYSBzdHJpbmdcbiAqIHRtcGwubG9vcEtleXMgLSBHZXQgdGhlIGtleXMgZm9yIGFuICdlYWNoJyBsb29wICh1c2VkIGJ5IGBfZWFjaGApXG4gKi9cblxudmFyIHRtcGwgPSAoZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2FjaGUgPSB7fVxuXG4gIGZ1bmN0aW9uIF90bXBsIChzdHIsIGRhdGEpIHtcbiAgICBpZiAoIXN0cikgcmV0dXJuIHN0clxuXG4gICAgcmV0dXJuIChfY2FjaGVbc3RyXSB8fCAoX2NhY2hlW3N0cl0gPSBfY3JlYXRlKHN0cikpKS5jYWxsKGRhdGEsIF9sb2dFcnIpXG4gIH1cblxuICBfdG1wbC5oYXZlUmF3ID0gYnJhY2tldHMuaGFzUmF3XG5cbiAgX3RtcGwuaGFzRXhwciA9IGJyYWNrZXRzLmhhc0V4cHJcblxuICBfdG1wbC5sb29wS2V5cyA9IGJyYWNrZXRzLmxvb3BLZXlzXG5cbiAgX3RtcGwuZXJyb3JIYW5kbGVyID0gbnVsbFxuXG4gIGZ1bmN0aW9uIF9sb2dFcnIgKGVyciwgY3R4KSB7XG5cbiAgICBpZiAoX3RtcGwuZXJyb3JIYW5kbGVyKSB7XG5cbiAgICAgIGVyci5yaW90RGF0YSA9IHtcbiAgICAgICAgdGFnTmFtZTogY3R4ICYmIGN0eC5yb290ICYmIGN0eC5yb290LnRhZ05hbWUsXG4gICAgICAgIF9yaW90X2lkOiBjdHggJiYgY3R4Ll9yaW90X2lkICAvL2VzbGludC1kaXNhYmxlLWxpbmUgY2FtZWxjYXNlXG4gICAgICB9XG4gICAgICBfdG1wbC5lcnJvckhhbmRsZXIoZXJyKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9jcmVhdGUgKHN0cikge1xuICAgIHZhciBleHByID0gX2dldFRtcGwoc3RyKVxuXG4gICAgaWYgKGV4cHIuc2xpY2UoMCwgMTEpICE9PSAndHJ5e3JldHVybiAnKSBleHByID0gJ3JldHVybiAnICsgZXhwclxuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xuXG4gICAgcmV0dXJuIG5ldyBGdW5jdGlvbignRScsIGV4cHIgKyAnOycpXG4vKiBlc2xpbnQtZW5hYmxlICovXG4gIH1cblxuICB2YXJcbiAgICBDSF9JREVYUFIgPSAnXFx1MjA1NycsXG4gICAgUkVfQ1NOQU1FID0gL14oPzooLT9bX0EtWmEtelxceEEwLVxceEZGXVstXFx3XFx4QTAtXFx4RkZdKil8XFx1MjA1NyhcXGQrKX4pOi8sXG4gICAgUkVfUUJMT0NLID0gUmVnRXhwKGJyYWNrZXRzLlNfUUJMT0NLUywgJ2cnKSxcbiAgICBSRV9EUVVPVEUgPSAvXFx1MjA1Ny9nLFxuICAgIFJFX1FCTUFSSyA9IC9cXHUyMDU3KFxcZCspfi9nXG5cbiAgZnVuY3Rpb24gX2dldFRtcGwgKHN0cikge1xuICAgIHZhclxuICAgICAgcXN0ciA9IFtdLFxuICAgICAgZXhwcixcbiAgICAgIHBhcnRzID0gYnJhY2tldHMuc3BsaXQoc3RyLnJlcGxhY2UoUkVfRFFVT1RFLCAnXCInKSwgMSlcblxuICAgIGlmIChwYXJ0cy5sZW5ndGggPiAyIHx8IHBhcnRzWzBdKSB7XG4gICAgICB2YXIgaSwgaiwgbGlzdCA9IFtdXG5cbiAgICAgIGZvciAoaSA9IGogPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcblxuICAgICAgICBleHByID0gcGFydHNbaV1cblxuICAgICAgICBpZiAoZXhwciAmJiAoZXhwciA9IGkgJiAxXG5cbiAgICAgICAgICAgID8gX3BhcnNlRXhwcihleHByLCAxLCBxc3RyKVxuXG4gICAgICAgICAgICA6ICdcIicgKyBleHByXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxyXFxuP3xcXG4vZywgJ1xcXFxuJylcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICtcbiAgICAgICAgICAgICAgJ1wiJ1xuXG4gICAgICAgICAgKSkgbGlzdFtqKytdID0gZXhwclxuXG4gICAgICB9XG5cbiAgICAgIGV4cHIgPSBqIDwgMiA/IGxpc3RbMF1cbiAgICAgICAgICAgOiAnWycgKyBsaXN0LmpvaW4oJywnKSArICddLmpvaW4oXCJcIiknXG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICBleHByID0gX3BhcnNlRXhwcihwYXJ0c1sxXSwgMCwgcXN0cilcbiAgICB9XG5cbiAgICBpZiAocXN0clswXSkge1xuICAgICAgZXhwciA9IGV4cHIucmVwbGFjZShSRV9RQk1BUkssIGZ1bmN0aW9uIChfLCBwb3MpIHtcbiAgICAgICAgcmV0dXJuIHFzdHJbcG9zXVxuICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJylcbiAgICAgICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gZXhwclxuICB9XG5cbiAgdmFyXG4gICAgUkVfQlJFTkQgPSB7XG4gICAgICAnKCc6IC9bKCldL2csXG4gICAgICAnWyc6IC9bW1xcXV0vZyxcbiAgICAgICd7JzogL1t7fV0vZ1xuICAgIH1cblxuICBmdW5jdGlvbiBfcGFyc2VFeHByIChleHByLCBhc1RleHQsIHFzdHIpIHtcblxuICAgIGV4cHIgPSBleHByXG4gICAgICAgICAgLnJlcGxhY2UoUkVfUUJMT0NLLCBmdW5jdGlvbiAocywgZGl2KSB7XG4gICAgICAgICAgICByZXR1cm4gcy5sZW5ndGggPiAyICYmICFkaXYgPyBDSF9JREVYUFIgKyAocXN0ci5wdXNoKHMpIC0gMSkgKyAnficgOiBzXG4gICAgICAgICAgfSlcbiAgICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpLnRyaW0oKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXCA/KFtbXFwoe30sP1xcLjpdKVxcID8vZywgJyQxJylcblxuICAgIGlmIChleHByKSB7XG4gICAgICB2YXJcbiAgICAgICAgbGlzdCA9IFtdLFxuICAgICAgICBjbnQgPSAwLFxuICAgICAgICBtYXRjaFxuXG4gICAgICB3aGlsZSAoZXhwciAmJlxuICAgICAgICAgICAgKG1hdGNoID0gZXhwci5tYXRjaChSRV9DU05BTUUpKSAmJlxuICAgICAgICAgICAgIW1hdGNoLmluZGV4XG4gICAgICAgICkge1xuICAgICAgICB2YXJcbiAgICAgICAgICBrZXksXG4gICAgICAgICAganNiLFxuICAgICAgICAgIHJlID0gLyx8KFtbeyhdKXwkL2dcblxuICAgICAgICBleHByID0gUmVnRXhwLnJpZ2h0Q29udGV4dFxuICAgICAgICBrZXkgID0gbWF0Y2hbMl0gPyBxc3RyW21hdGNoWzJdXS5zbGljZSgxLCAtMSkudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKSA6IG1hdGNoWzFdXG5cbiAgICAgICAgd2hpbGUgKGpzYiA9IChtYXRjaCA9IHJlLmV4ZWMoZXhwcikpWzFdKSBza2lwQnJhY2VzKGpzYiwgcmUpXG5cbiAgICAgICAganNiICA9IGV4cHIuc2xpY2UoMCwgbWF0Y2guaW5kZXgpXG4gICAgICAgIGV4cHIgPSBSZWdFeHAucmlnaHRDb250ZXh0XG5cbiAgICAgICAgbGlzdFtjbnQrK10gPSBfd3JhcEV4cHIoanNiLCAxLCBrZXkpXG4gICAgICB9XG5cbiAgICAgIGV4cHIgPSAhY250ID8gX3dyYXBFeHByKGV4cHIsIGFzVGV4dClcbiAgICAgICAgICAgOiBjbnQgPiAxID8gJ1snICsgbGlzdC5qb2luKCcsJykgKyAnXS5qb2luKFwiIFwiKS50cmltKCknIDogbGlzdFswXVxuICAgIH1cbiAgICByZXR1cm4gZXhwclxuXG4gICAgZnVuY3Rpb24gc2tpcEJyYWNlcyAoY2gsIHJlKSB7XG4gICAgICB2YXJcbiAgICAgICAgbW0sXG4gICAgICAgIGx2ID0gMSxcbiAgICAgICAgaXIgPSBSRV9CUkVORFtjaF1cblxuICAgICAgaXIubGFzdEluZGV4ID0gcmUubGFzdEluZGV4XG4gICAgICB3aGlsZSAobW0gPSBpci5leGVjKGV4cHIpKSB7XG4gICAgICAgIGlmIChtbVswXSA9PT0gY2gpICsrbHZcbiAgICAgICAgZWxzZSBpZiAoIS0tbHYpIGJyZWFrXG4gICAgICB9XG4gICAgICByZS5sYXN0SW5kZXggPSBsdiA/IGV4cHIubGVuZ3RoIDogaXIubGFzdEluZGV4XG4gICAgfVxuICB9XG5cbiAgLy8gaXN0YW5idWwgaWdub3JlIG5leHQ6IG5vdCBib3RoXG4gIHZhciAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIEpTX0NPTlRFWFQgPSAnXCJpbiB0aGlzP3RoaXM6JyArICh0eXBlb2Ygd2luZG93ICE9PSAnb2JqZWN0JyA/ICdnbG9iYWwnIDogJ3dpbmRvdycpICsgJykuJyxcbiAgICBKU19WQVJOQU1FID0gL1sse11bJFxcd10rOnwoXiAqfFteJFxcd1xcLl0pKD8hKD86dHlwZW9mfHRydWV8ZmFsc2V8bnVsbHx1bmRlZmluZWR8aW58aW5zdGFuY2VvZnxpcyg/OkZpbml0ZXxOYU4pfHZvaWR8TmFOfG5ld3xEYXRlfFJlZ0V4cHxNYXRoKSg/IVskXFx3XSkpKFskX0EtWmEtel1bJFxcd10qKS9nLFxuICAgIEpTX05PUFJPUFMgPSAvXig/PShcXC5bJFxcd10rKSlcXDEoPzpbXi5bKF18JCkvXG5cbiAgZnVuY3Rpb24gX3dyYXBFeHByIChleHByLCBhc1RleHQsIGtleSkge1xuICAgIHZhciB0YlxuXG4gICAgZXhwciA9IGV4cHIucmVwbGFjZShKU19WQVJOQU1FLCBmdW5jdGlvbiAobWF0Y2gsIHAsIG12YXIsIHBvcywgcykge1xuICAgICAgaWYgKG12YXIpIHtcbiAgICAgICAgcG9zID0gdGIgPyAwIDogcG9zICsgbWF0Y2gubGVuZ3RoXG5cbiAgICAgICAgaWYgKG12YXIgIT09ICd0aGlzJyAmJiBtdmFyICE9PSAnZ2xvYmFsJyAmJiBtdmFyICE9PSAnd2luZG93Jykge1xuICAgICAgICAgIG1hdGNoID0gcCArICcoXCInICsgbXZhciArIEpTX0NPTlRFWFQgKyBtdmFyXG4gICAgICAgICAgaWYgKHBvcykgdGIgPSAocyA9IHNbcG9zXSkgPT09ICcuJyB8fCBzID09PSAnKCcgfHwgcyA9PT0gJ1snXG4gICAgICAgIH0gZWxzZSBpZiAocG9zKSB7XG4gICAgICAgICAgdGIgPSAhSlNfTk9QUk9QUy50ZXN0KHMuc2xpY2UocG9zKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG1hdGNoXG4gICAgfSlcblxuICAgIGlmICh0Yikge1xuICAgICAgZXhwciA9ICd0cnl7cmV0dXJuICcgKyBleHByICsgJ31jYXRjaChlKXtFKGUsdGhpcyl9J1xuICAgIH1cblxuICAgIGlmIChrZXkpIHtcblxuICAgICAgZXhwciA9ICh0YlxuICAgICAgICAgID8gJ2Z1bmN0aW9uKCl7JyArIGV4cHIgKyAnfS5jYWxsKHRoaXMpJyA6ICcoJyArIGV4cHIgKyAnKSdcbiAgICAgICAgKSArICc/XCInICsga2V5ICsgJ1wiOlwiXCInXG5cbiAgICB9IGVsc2UgaWYgKGFzVGV4dCkge1xuXG4gICAgICBleHByID0gJ2Z1bmN0aW9uKHYpeycgKyAodGJcbiAgICAgICAgICA/IGV4cHIucmVwbGFjZSgncmV0dXJuICcsICd2PScpIDogJ3Y9KCcgKyBleHByICsgJyknXG4gICAgICAgICkgKyAnO3JldHVybiB2fHx2PT09MD92OlwiXCJ9LmNhbGwodGhpcyknXG4gICAgfVxuXG4gICAgcmV0dXJuIGV4cHJcbiAgfVxuXG4gIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0OiBjb21wYXRpYmlsaXR5IGZpeCBmb3IgYmV0YSB2ZXJzaW9uc1xuICBfdG1wbC5wYXJzZSA9IGZ1bmN0aW9uIChzKSB7IHJldHVybiBzIH1cblxuICBfdG1wbC52ZXJzaW9uID0gYnJhY2tldHMudmVyc2lvbiA9ICd2Mi40LjAnXG5cbiAgcmV0dXJuIF90bXBsXG5cbn0pKClcblxuLypcbiAgbGliL2Jyb3dzZXIvdGFnL21rZG9tLmpzXG5cbiAgSW5jbHVkZXMgaGFja3MgbmVlZGVkIGZvciB0aGUgSW50ZXJuZXQgRXhwbG9yZXIgdmVyc2lvbiA5IGFuZCBiZWxvd1xuICBTZWU6IGh0dHA6Ly9rYW5nYXguZ2l0aHViLmlvL2NvbXBhdC10YWJsZS9lczUvI2llOFxuICAgICAgIGh0dHA6Ly9jb2RlcGxhbmV0LmlvL2Ryb3BwaW5nLWllOC9cbiovXG52YXIgbWtkb20gPSAoZnVuY3Rpb24gX21rZG9tKCkge1xuICB2YXJcbiAgICByZUhhc1lpZWxkICA9IC88eWllbGRcXGIvaSxcbiAgICByZVlpZWxkQWxsICA9IC88eWllbGRcXHMqKD86XFwvPnw+KFtcXFNcXHNdKj8pPFxcL3lpZWxkXFxzKj4pL2lnLFxuICAgIHJlWWllbGRTcmMgID0gLzx5aWVsZFxccyt0bz1bJ1wiXShbXidcIj5dKilbJ1wiXVxccyo+KFtcXFNcXHNdKj8pPFxcL3lpZWxkXFxzKj4vaWcsXG4gICAgcmVZaWVsZERlc3QgPSAvPHlpZWxkXFxzK2Zyb209WydcIl0/KFstXFx3XSspWydcIl0/XFxzKig/OlxcLz58PihbXFxTXFxzXSo/KTxcXC95aWVsZFxccyo+KS9pZ1xuICB2YXJcbiAgICByb290RWxzID0geyB0cjogJ3Rib2R5JywgdGg6ICd0cicsIHRkOiAndHInLCBjb2w6ICdjb2xncm91cCcgfSxcbiAgICB0YmxUYWdzID0gSUVfVkVSU0lPTiAmJiBJRV9WRVJTSU9OIDwgMTBcbiAgICAgID8gU1BFQ0lBTF9UQUdTX1JFR0VYIDogL14oPzp0KD86Ym9keXxoZWFkfGZvb3R8W3JoZF0pfGNhcHRpb258Y29sKD86Z3JvdXApPykkL1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgRE9NIGVsZW1lbnQgdG8gd3JhcCB0aGUgZ2l2ZW4gY29udGVudC4gTm9ybWFsbHkgYW4gYERJVmAsIGJ1dCBjYW4gYmVcbiAgICogYWxzbyBhIGBUQUJMRWAsIGBTRUxFQ1RgLCBgVEJPRFlgLCBgVFJgLCBvciBgQ09MR1JPVVBgIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSAgIHtzdHJpbmd9IHRlbXBsICAtIFRoZSB0ZW1wbGF0ZSBjb21pbmcgZnJvbSB0aGUgY3VzdG9tIHRhZyBkZWZpbml0aW9uXG4gICAqIEBwYXJhbSAgIHtzdHJpbmd9IFtodG1sXSAtIEhUTUwgY29udGVudCB0aGF0IGNvbWVzIGZyb20gdGhlIERPTSBlbGVtZW50IHdoZXJlIHlvdVxuICAgKiAgICAgICAgICAgd2lsbCBtb3VudCB0aGUgdGFnLCBtb3N0bHkgdGhlIG9yaWdpbmFsIHRhZyBpbiB0aGUgcGFnZVxuICAgKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9IERPTSBlbGVtZW50IHdpdGggX3RlbXBsXyBtZXJnZWQgdGhyb3VnaCBgWUlFTERgIHdpdGggdGhlIF9odG1sXy5cbiAgICovXG4gIGZ1bmN0aW9uIF9ta2RvbSh0ZW1wbCwgaHRtbCkge1xuICAgIHZhclxuICAgICAgbWF0Y2ggICA9IHRlbXBsICYmIHRlbXBsLm1hdGNoKC9eXFxzKjwoWy1cXHddKykvKSxcbiAgICAgIHRhZ05hbWUgPSBtYXRjaCAmJiBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpLFxuICAgICAgZWwgPSBta0VsKCdkaXYnLCBpc1NWR1RhZyh0YWdOYW1lKSlcblxuICAgIC8vIHJlcGxhY2UgYWxsIHRoZSB5aWVsZCB0YWdzIHdpdGggdGhlIHRhZyBpbm5lciBodG1sXG4gICAgdGVtcGwgPSByZXBsYWNlWWllbGQodGVtcGwsIGh0bWwpXG5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGlmICh0YmxUYWdzLnRlc3QodGFnTmFtZSkpXG4gICAgICBlbCA9IHNwZWNpYWxUYWdzKGVsLCB0ZW1wbCwgdGFnTmFtZSlcbiAgICBlbHNlXG4gICAgICBzZXRJbm5lckhUTUwoZWwsIHRlbXBsKVxuXG4gICAgZWwuc3R1YiA9IHRydWVcblxuICAgIHJldHVybiBlbFxuICB9XG5cbiAgLypcbiAgICBDcmVhdGVzIHRoZSByb290IGVsZW1lbnQgZm9yIHRhYmxlIG9yIHNlbGVjdCBjaGlsZCBlbGVtZW50czpcbiAgICB0ci90aC90ZC90aGVhZC90Zm9vdC90Ym9keS9jYXB0aW9uL2NvbC9jb2xncm91cC9vcHRpb24vb3B0Z3JvdXBcbiAgKi9cbiAgZnVuY3Rpb24gc3BlY2lhbFRhZ3MoZWwsIHRlbXBsLCB0YWdOYW1lKSB7XG4gICAgdmFyXG4gICAgICBzZWxlY3QgPSB0YWdOYW1lWzBdID09PSAnbycsXG4gICAgICBwYXJlbnQgPSBzZWxlY3QgPyAnc2VsZWN0PicgOiAndGFibGU+J1xuXG4gICAgLy8gdHJpbSgpIGlzIGltcG9ydGFudCBoZXJlLCB0aGlzIGVuc3VyZXMgd2UgZG9uJ3QgaGF2ZSBhcnRpZmFjdHMsXG4gICAgLy8gc28gd2UgY2FuIGNoZWNrIGlmIHdlIGhhdmUgb25seSBvbmUgZWxlbWVudCBpbnNpZGUgdGhlIHBhcmVudFxuICAgIGVsLmlubmVySFRNTCA9ICc8JyArIHBhcmVudCArIHRlbXBsLnRyaW0oKSArICc8LycgKyBwYXJlbnRcbiAgICBwYXJlbnQgPSBlbC5maXJzdENoaWxkXG5cbiAgICAvLyByZXR1cm5zIHRoZSBpbW1lZGlhdGUgcGFyZW50IGlmIHRyL3RoL3RkL2NvbCBpcyB0aGUgb25seSBlbGVtZW50LCBpZiBub3RcbiAgICAvLyByZXR1cm5zIHRoZSB3aG9sZSB0cmVlLCBhcyB0aGlzIGNhbiBpbmNsdWRlIGFkZGl0aW9uYWwgZWxlbWVudHNcbiAgICBpZiAoc2VsZWN0KSB7XG4gICAgICBwYXJlbnQuc2VsZWN0ZWRJbmRleCA9IC0xICAvLyBmb3IgSUU5LCBjb21wYXRpYmxlIHcvY3VycmVudCByaW90IGJlaGF2aW9yXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGF2b2lkcyBpbnNlcnRpb24gb2YgY29pbnRhaW5lciBpbnNpZGUgY29udGFpbmVyIChleDogdGJvZHkgaW5zaWRlIHRib2R5KVxuICAgICAgdmFyIHRuYW1lID0gcm9vdEVsc1t0YWdOYW1lXVxuICAgICAgaWYgKHRuYW1lICYmIHBhcmVudC5jaGlsZEVsZW1lbnRDb3VudCA9PT0gMSkgcGFyZW50ID0gJCh0bmFtZSwgcGFyZW50KVxuICAgIH1cbiAgICByZXR1cm4gcGFyZW50XG4gIH1cblxuICAvKlxuICAgIFJlcGxhY2UgdGhlIHlpZWxkIHRhZyBmcm9tIGFueSB0YWcgdGVtcGxhdGUgd2l0aCB0aGUgaW5uZXJIVE1MIG9mIHRoZVxuICAgIG9yaWdpbmFsIHRhZyBpbiB0aGUgcGFnZVxuICAqL1xuICBmdW5jdGlvbiByZXBsYWNlWWllbGQodGVtcGwsIGh0bWwpIHtcbiAgICAvLyBkbyBub3RoaW5nIGlmIG5vIHlpZWxkXG4gICAgaWYgKCFyZUhhc1lpZWxkLnRlc3QodGVtcGwpKSByZXR1cm4gdGVtcGxcblxuICAgIC8vIGJlIGNhcmVmdWwgd2l0aCAjMTM0MyAtIHN0cmluZyBvbiB0aGUgc291cmNlIGhhdmluZyBgJDFgXG4gICAgdmFyIHNyYyA9IHt9XG5cbiAgICBodG1sID0gaHRtbCAmJiBodG1sLnJlcGxhY2UocmVZaWVsZFNyYywgZnVuY3Rpb24gKF8sIHJlZiwgdGV4dCkge1xuICAgICAgc3JjW3JlZl0gPSBzcmNbcmVmXSB8fCB0ZXh0ICAgLy8gcHJlc2VydmUgZmlyc3QgZGVmaW5pdGlvblxuICAgICAgcmV0dXJuICcnXG4gICAgfSkudHJpbSgpXG5cbiAgICByZXR1cm4gdGVtcGxcbiAgICAgIC5yZXBsYWNlKHJlWWllbGREZXN0LCBmdW5jdGlvbiAoXywgcmVmLCBkZWYpIHsgIC8vIHlpZWxkIHdpdGggZnJvbSAtIHRvIGF0dHJzXG4gICAgICAgIHJldHVybiBzcmNbcmVmXSB8fCBkZWYgfHwgJydcbiAgICAgIH0pXG4gICAgICAucmVwbGFjZShyZVlpZWxkQWxsLCBmdW5jdGlvbiAoXywgZGVmKSB7ICAgICAgICAvLyB5aWVsZCB3aXRob3V0IGFueSBcImZyb21cIlxuICAgICAgICByZXR1cm4gaHRtbCB8fCBkZWYgfHwgJydcbiAgICAgIH0pXG4gIH1cblxuICByZXR1cm4gX21rZG9tXG5cbn0pKClcblxuLyoqXG4gKiBDb252ZXJ0IHRoZSBpdGVtIGxvb3BlZCBpbnRvIGFuIG9iamVjdCB1c2VkIHRvIGV4dGVuZCB0aGUgY2hpbGQgdGFnIHByb3BlcnRpZXNcbiAqIEBwYXJhbSAgIHsgT2JqZWN0IH0gZXhwciAtIG9iamVjdCBjb250YWluaW5nIHRoZSBrZXlzIHVzZWQgdG8gZXh0ZW5kIHRoZSBjaGlsZHJlbiB0YWdzXG4gKiBAcGFyYW0gICB7ICogfSBrZXkgLSB2YWx1ZSB0byBhc3NpZ24gdG8gdGhlIG5ldyBvYmplY3QgcmV0dXJuZWRcbiAqIEBwYXJhbSAgIHsgKiB9IHZhbCAtIHZhbHVlIGNvbnRhaW5pbmcgdGhlIHBvc2l0aW9uIG9mIHRoZSBpdGVtIGluIHRoZSBhcnJheVxuICogQHJldHVybnMgeyBPYmplY3QgfSAtIG5ldyBvYmplY3QgY29udGFpbmluZyB0aGUgdmFsdWVzIG9mIHRoZSBvcmlnaW5hbCBpdGVtXG4gKlxuICogVGhlIHZhcmlhYmxlcyAna2V5JyBhbmQgJ3ZhbCcgYXJlIGFyYml0cmFyeS5cbiAqIFRoZXkgZGVwZW5kIG9uIHRoZSBjb2xsZWN0aW9uIHR5cGUgbG9vcGVkIChBcnJheSwgT2JqZWN0KVxuICogYW5kIG9uIHRoZSBleHByZXNzaW9uIHVzZWQgb24gdGhlIGVhY2ggdGFnXG4gKlxuICovXG5mdW5jdGlvbiBta2l0ZW0oZXhwciwga2V5LCB2YWwpIHtcbiAgdmFyIGl0ZW0gPSB7fVxuICBpdGVtW2V4cHIua2V5XSA9IGtleVxuICBpZiAoZXhwci5wb3MpIGl0ZW1bZXhwci5wb3NdID0gdmFsXG4gIHJldHVybiBpdGVtXG59XG5cbi8qKlxuICogVW5tb3VudCB0aGUgcmVkdW5kYW50IHRhZ3NcbiAqIEBwYXJhbSAgIHsgQXJyYXkgfSBpdGVtcyAtIGFycmF5IGNvbnRhaW5pbmcgdGhlIGN1cnJlbnQgaXRlbXMgdG8gbG9vcFxuICogQHBhcmFtICAgeyBBcnJheSB9IHRhZ3MgLSBhcnJheSBjb250YWluaW5nIGFsbCB0aGUgY2hpbGRyZW4gdGFnc1xuICovXG5mdW5jdGlvbiB1bm1vdW50UmVkdW5kYW50KGl0ZW1zLCB0YWdzKSB7XG5cbiAgdmFyIGkgPSB0YWdzLmxlbmd0aCxcbiAgICBqID0gaXRlbXMubGVuZ3RoLFxuICAgIHRcblxuICB3aGlsZSAoaSA+IGopIHtcbiAgICB0ID0gdGFnc1stLWldXG4gICAgdGFncy5zcGxpY2UoaSwgMSlcbiAgICB0LnVubW91bnQoKVxuICB9XG59XG5cbi8qKlxuICogTW92ZSB0aGUgbmVzdGVkIGN1c3RvbSB0YWdzIGluIG5vbiBjdXN0b20gbG9vcCB0YWdzXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGNoaWxkIC0gbm9uIGN1c3RvbSBsb29wIHRhZ1xuICogQHBhcmFtICAgeyBOdW1iZXIgfSBpIC0gY3VycmVudCBwb3NpdGlvbiBvZiB0aGUgbG9vcCB0YWdcbiAqL1xuZnVuY3Rpb24gbW92ZU5lc3RlZFRhZ3MoY2hpbGQsIGkpIHtcbiAgT2JqZWN0LmtleXMoY2hpbGQudGFncykuZm9yRWFjaChmdW5jdGlvbih0YWdOYW1lKSB7XG4gICAgdmFyIHRhZyA9IGNoaWxkLnRhZ3NbdGFnTmFtZV1cbiAgICBpZiAoaXNBcnJheSh0YWcpKVxuICAgICAgZWFjaCh0YWcsIGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIG1vdmVDaGlsZFRhZyh0LCB0YWdOYW1lLCBpKVxuICAgICAgfSlcbiAgICBlbHNlXG4gICAgICBtb3ZlQ2hpbGRUYWcodGFnLCB0YWdOYW1lLCBpKVxuICB9KVxufVxuXG4vKipcbiAqIEFkZHMgdGhlIGVsZW1lbnRzIGZvciBhIHZpcnR1YWwgdGFnXG4gKiBAcGFyYW0geyBUYWcgfSB0YWcgLSB0aGUgdGFnIHdob3NlIHJvb3QncyBjaGlsZHJlbiB3aWxsIGJlIGluc2VydGVkIG9yIGFwcGVuZGVkXG4gKiBAcGFyYW0geyBOb2RlIH0gc3JjIC0gdGhlIG5vZGUgdGhhdCB3aWxsIGRvIHRoZSBpbnNlcnRpbmcgb3IgYXBwZW5kaW5nXG4gKiBAcGFyYW0geyBUYWcgfSB0YXJnZXQgLSBvbmx5IGlmIGluc2VydGluZywgaW5zZXJ0IGJlZm9yZSB0aGlzIHRhZydzIGZpcnN0IGNoaWxkXG4gKi9cbmZ1bmN0aW9uIGFkZFZpcnR1YWwodGFnLCBzcmMsIHRhcmdldCkge1xuICB2YXIgZWwgPSB0YWcuX3Jvb3QsIHNpYlxuICB0YWcuX3ZpcnRzID0gW11cbiAgd2hpbGUgKGVsKSB7XG4gICAgc2liID0gZWwubmV4dFNpYmxpbmdcbiAgICBpZiAodGFyZ2V0KVxuICAgICAgc3JjLmluc2VydEJlZm9yZShlbCwgdGFyZ2V0Ll9yb290KVxuICAgIGVsc2VcbiAgICAgIHNyYy5hcHBlbmRDaGlsZChlbClcblxuICAgIHRhZy5fdmlydHMucHVzaChlbCkgLy8gaG9sZCBmb3IgdW5tb3VudGluZ1xuICAgIGVsID0gc2liXG4gIH1cbn1cblxuLyoqXG4gKiBNb3ZlIHZpcnR1YWwgdGFnIGFuZCBhbGwgY2hpbGQgbm9kZXNcbiAqIEBwYXJhbSB7IFRhZyB9IHRhZyAtIGZpcnN0IGNoaWxkIHJlZmVyZW5jZSB1c2VkIHRvIHN0YXJ0IG1vdmVcbiAqIEBwYXJhbSB7IE5vZGUgfSBzcmMgIC0gdGhlIG5vZGUgdGhhdCB3aWxsIGRvIHRoZSBpbnNlcnRpbmdcbiAqIEBwYXJhbSB7IFRhZyB9IHRhcmdldCAtIGluc2VydCBiZWZvcmUgdGhpcyB0YWcncyBmaXJzdCBjaGlsZFxuICogQHBhcmFtIHsgTnVtYmVyIH0gbGVuIC0gaG93IG1hbnkgY2hpbGQgbm9kZXMgdG8gbW92ZVxuICovXG5mdW5jdGlvbiBtb3ZlVmlydHVhbCh0YWcsIHNyYywgdGFyZ2V0LCBsZW4pIHtcbiAgdmFyIGVsID0gdGFnLl9yb290LCBzaWIsIGkgPSAwXG4gIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBzaWIgPSBlbC5uZXh0U2libGluZ1xuICAgIHNyYy5pbnNlcnRCZWZvcmUoZWwsIHRhcmdldC5fcm9vdClcbiAgICBlbCA9IHNpYlxuICB9XG59XG5cblxuLyoqXG4gKiBNYW5hZ2UgdGFncyBoYXZpbmcgdGhlICdlYWNoJ1xuICogQHBhcmFtICAgeyBPYmplY3QgfSBkb20gLSBET00gbm9kZSB3ZSBuZWVkIHRvIGxvb3BcbiAqIEBwYXJhbSAgIHsgVGFnIH0gcGFyZW50IC0gcGFyZW50IHRhZyBpbnN0YW5jZSB3aGVyZSB0aGUgZG9tIG5vZGUgaXMgY29udGFpbmVkXG4gKiBAcGFyYW0gICB7IFN0cmluZyB9IGV4cHIgLSBzdHJpbmcgY29udGFpbmVkIGluIHRoZSAnZWFjaCcgYXR0cmlidXRlXG4gKi9cbmZ1bmN0aW9uIF9lYWNoKGRvbSwgcGFyZW50LCBleHByKSB7XG5cbiAgLy8gcmVtb3ZlIHRoZSBlYWNoIHByb3BlcnR5IGZyb20gdGhlIG9yaWdpbmFsIHRhZ1xuICByZW1BdHRyKGRvbSwgJ2VhY2gnKVxuXG4gIHZhciBtdXN0UmVvcmRlciA9IHR5cGVvZiBnZXRBdHRyKGRvbSwgJ25vLXJlb3JkZXInKSAhPT0gVF9TVFJJTkcgfHwgcmVtQXR0cihkb20sICduby1yZW9yZGVyJyksXG4gICAgdGFnTmFtZSA9IGdldFRhZ05hbWUoZG9tKSxcbiAgICBpbXBsID0gX190YWdJbXBsW3RhZ05hbWVdIHx8IHsgdG1wbDogZ2V0T3V0ZXJIVE1MKGRvbSkgfSxcbiAgICB1c2VSb290ID0gU1BFQ0lBTF9UQUdTX1JFR0VYLnRlc3QodGFnTmFtZSksXG4gICAgcm9vdCA9IGRvbS5wYXJlbnROb2RlLFxuICAgIHJlZiA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSxcbiAgICBjaGlsZCA9IGdldFRhZyhkb20pLFxuICAgIGlzT3B0aW9uID0gdGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnb3B0aW9uJywgLy8gdGhlIG9wdGlvbiB0YWdzIG11c3QgYmUgdHJlYXRlZCBkaWZmZXJlbnRseVxuICAgIHRhZ3MgPSBbXSxcbiAgICBvbGRJdGVtcyA9IFtdLFxuICAgIGhhc0tleXMsXG4gICAgaXNWaXJ0dWFsID0gZG9tLnRhZ05hbWUgPT0gJ1ZJUlRVQUwnXG5cbiAgLy8gcGFyc2UgdGhlIGVhY2ggZXhwcmVzc2lvblxuICBleHByID0gdG1wbC5sb29wS2V5cyhleHByKVxuXG4gIC8vIGluc2VydCBhIG1hcmtlZCB3aGVyZSB0aGUgbG9vcCB0YWdzIHdpbGwgYmUgaW5qZWN0ZWRcbiAgcm9vdC5pbnNlcnRCZWZvcmUocmVmLCBkb20pXG5cbiAgLy8gY2xlYW4gdGVtcGxhdGUgY29kZVxuICBwYXJlbnQub25lKCdiZWZvcmUtbW91bnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyByZW1vdmUgdGhlIG9yaWdpbmFsIERPTSBub2RlXG4gICAgZG9tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZG9tKVxuICAgIGlmIChyb290LnN0dWIpIHJvb3QgPSBwYXJlbnQucm9vdFxuXG4gIH0pLm9uKCd1cGRhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gZ2V0IHRoZSBuZXcgaXRlbXMgY29sbGVjdGlvblxuICAgIHZhciBpdGVtcyA9IHRtcGwoZXhwci52YWwsIHBhcmVudCksXG4gICAgICAvLyBjcmVhdGUgYSBmcmFnbWVudCB0byBob2xkIHRoZSBuZXcgRE9NIG5vZGVzIHRvIGluamVjdCBpbiB0aGUgcGFyZW50IHRhZ1xuICAgICAgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgLy8gb2JqZWN0IGxvb3AuIGFueSBjaGFuZ2VzIGNhdXNlIGZ1bGwgcmVkcmF3XG4gICAgaWYgKCFpc0FycmF5KGl0ZW1zKSkge1xuICAgICAgaGFzS2V5cyA9IGl0ZW1zIHx8IGZhbHNlXG4gICAgICBpdGVtcyA9IGhhc0tleXMgP1xuICAgICAgICBPYmplY3Qua2V5cyhpdGVtcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICByZXR1cm4gbWtpdGVtKGV4cHIsIGtleSwgaXRlbXNba2V5XSlcbiAgICAgICAgfSkgOiBbXVxuICAgIH1cblxuICAgIC8vIGxvb3AgYWxsIHRoZSBuZXcgaXRlbXNcbiAgICB2YXIgaSA9IDAsXG4gICAgICBpdGVtc0xlbmd0aCA9IGl0ZW1zLmxlbmd0aFxuXG4gICAgZm9yICg7IGkgPCBpdGVtc0xlbmd0aDsgaSsrKSB7XG4gICAgICAvLyByZW9yZGVyIG9ubHkgaWYgdGhlIGl0ZW1zIGFyZSBvYmplY3RzXG4gICAgICB2YXJcbiAgICAgICAgaXRlbSA9IGl0ZW1zW2ldLFxuICAgICAgICBfbXVzdFJlb3JkZXIgPSBtdXN0UmVvcmRlciAmJiBpdGVtIGluc3RhbmNlb2YgT2JqZWN0ICYmICFoYXNLZXlzLFxuICAgICAgICBvbGRQb3MgPSBvbGRJdGVtcy5pbmRleE9mKGl0ZW0pLFxuICAgICAgICBwb3MgPSB+b2xkUG9zICYmIF9tdXN0UmVvcmRlciA/IG9sZFBvcyA6IGksXG4gICAgICAgIC8vIGRvZXMgYSB0YWcgZXhpc3QgaW4gdGhpcyBwb3NpdGlvbj9cbiAgICAgICAgdGFnID0gdGFnc1twb3NdXG5cbiAgICAgIGl0ZW0gPSAhaGFzS2V5cyAmJiBleHByLmtleSA/IG1raXRlbShleHByLCBpdGVtLCBpKSA6IGl0ZW1cblxuICAgICAgLy8gbmV3IHRhZ1xuICAgICAgaWYgKFxuICAgICAgICAhX211c3RSZW9yZGVyICYmICF0YWcgLy8gd2l0aCBuby1yZW9yZGVyIHdlIGp1c3QgdXBkYXRlIHRoZSBvbGQgdGFnc1xuICAgICAgICB8fFxuICAgICAgICBfbXVzdFJlb3JkZXIgJiYgIX5vbGRQb3MgfHwgIXRhZyAvLyBieSBkZWZhdWx0IHdlIGFsd2F5cyB0cnkgdG8gcmVvcmRlciB0aGUgRE9NIGVsZW1lbnRzXG4gICAgICApIHtcblxuICAgICAgICB0YWcgPSBuZXcgVGFnKGltcGwsIHtcbiAgICAgICAgICBwYXJlbnQ6IHBhcmVudCxcbiAgICAgICAgICBpc0xvb3A6IHRydWUsXG4gICAgICAgICAgaGFzSW1wbDogISFfX3RhZ0ltcGxbdGFnTmFtZV0sXG4gICAgICAgICAgcm9vdDogdXNlUm9vdCA/IHJvb3QgOiBkb20uY2xvbmVOb2RlKCksXG4gICAgICAgICAgaXRlbTogaXRlbVxuICAgICAgICB9LCBkb20uaW5uZXJIVE1MKVxuXG4gICAgICAgIHRhZy5tb3VudCgpXG5cbiAgICAgICAgaWYgKGlzVmlydHVhbCkgdGFnLl9yb290ID0gdGFnLnJvb3QuZmlyc3RDaGlsZCAvLyBzYXZlIHJlZmVyZW5jZSBmb3IgZnVydGhlciBtb3ZlcyBvciBpbnNlcnRzXG4gICAgICAgIC8vIHRoaXMgdGFnIG11c3QgYmUgYXBwZW5kZWRcbiAgICAgICAgaWYgKGkgPT0gdGFncy5sZW5ndGggfHwgIXRhZ3NbaV0pIHsgLy8gZml4IDE1ODFcbiAgICAgICAgICBpZiAoaXNWaXJ0dWFsKVxuICAgICAgICAgICAgYWRkVmlydHVhbCh0YWcsIGZyYWcpXG4gICAgICAgICAgZWxzZSBmcmFnLmFwcGVuZENoaWxkKHRhZy5yb290KVxuICAgICAgICB9XG4gICAgICAgIC8vIHRoaXMgdGFnIG11c3QgYmUgaW5zZXJ0XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChpc1ZpcnR1YWwpXG4gICAgICAgICAgICBhZGRWaXJ0dWFsKHRhZywgcm9vdCwgdGFnc1tpXSlcbiAgICAgICAgICBlbHNlIHJvb3QuaW5zZXJ0QmVmb3JlKHRhZy5yb290LCB0YWdzW2ldLnJvb3QpIC8vICMxMzc0IHNvbWUgYnJvd3NlcnMgcmVzZXQgc2VsZWN0ZWQgaGVyZVxuICAgICAgICAgIG9sZEl0ZW1zLnNwbGljZShpLCAwLCBpdGVtKVxuICAgICAgICB9XG5cbiAgICAgICAgdGFncy5zcGxpY2UoaSwgMCwgdGFnKVxuICAgICAgICBwb3MgPSBpIC8vIGhhbmRsZWQgaGVyZSBzbyBubyBtb3ZlXG4gICAgICB9IGVsc2UgdGFnLnVwZGF0ZShpdGVtLCB0cnVlKVxuXG4gICAgICAvLyByZW9yZGVyIHRoZSB0YWcgaWYgaXQncyBub3QgbG9jYXRlZCBpbiBpdHMgcHJldmlvdXMgcG9zaXRpb25cbiAgICAgIGlmIChcbiAgICAgICAgcG9zICE9PSBpICYmIF9tdXN0UmVvcmRlciAmJlxuICAgICAgICB0YWdzW2ldIC8vIGZpeCAxNTgxIHVuYWJsZSB0byByZXByb2R1Y2UgaXQgaW4gYSB0ZXN0IVxuICAgICAgKSB7XG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgRE9NXG4gICAgICAgIGlmIChpc1ZpcnR1YWwpXG4gICAgICAgICAgbW92ZVZpcnR1YWwodGFnLCByb290LCB0YWdzW2ldLCBkb20uY2hpbGROb2Rlcy5sZW5ndGgpXG4gICAgICAgIGVsc2Ugcm9vdC5pbnNlcnRCZWZvcmUodGFnLnJvb3QsIHRhZ3NbaV0ucm9vdClcbiAgICAgICAgLy8gdXBkYXRlIHRoZSBwb3NpdGlvbiBhdHRyaWJ1dGUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChleHByLnBvcylcbiAgICAgICAgICB0YWdbZXhwci5wb3NdID0gaVxuICAgICAgICAvLyBtb3ZlIHRoZSBvbGQgdGFnIGluc3RhbmNlXG4gICAgICAgIHRhZ3Muc3BsaWNlKGksIDAsIHRhZ3Muc3BsaWNlKHBvcywgMSlbMF0pXG4gICAgICAgIC8vIG1vdmUgdGhlIG9sZCBpdGVtXG4gICAgICAgIG9sZEl0ZW1zLnNwbGljZShpLCAwLCBvbGRJdGVtcy5zcGxpY2UocG9zLCAxKVswXSlcbiAgICAgICAgLy8gaWYgdGhlIGxvb3AgdGFncyBhcmUgbm90IGN1c3RvbVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIG1vdmUgYWxsIHRoZWlyIGN1c3RvbSB0YWdzIGludG8gdGhlIHJpZ2h0IHBvc2l0aW9uXG4gICAgICAgIGlmICghY2hpbGQgJiYgdGFnLnRhZ3MpIG1vdmVOZXN0ZWRUYWdzKHRhZywgaSlcbiAgICAgIH1cblxuICAgICAgLy8gY2FjaGUgdGhlIG9yaWdpbmFsIGl0ZW0gdG8gdXNlIGl0IGluIHRoZSBldmVudHMgYm91bmQgdG8gdGhpcyBub2RlXG4gICAgICAvLyBhbmQgaXRzIGNoaWxkcmVuXG4gICAgICB0YWcuX2l0ZW0gPSBpdGVtXG4gICAgICAvLyBjYWNoZSB0aGUgcmVhbCBwYXJlbnQgdGFnIGludGVybmFsbHlcbiAgICAgIGRlZmluZVByb3BlcnR5KHRhZywgJ19wYXJlbnQnLCBwYXJlbnQpXG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIHRoZSByZWR1bmRhbnQgdGFnc1xuICAgIHVubW91bnRSZWR1bmRhbnQoaXRlbXMsIHRhZ3MpXG5cbiAgICAvLyBpbnNlcnQgdGhlIG5ldyBub2Rlc1xuICAgIGlmIChpc09wdGlvbikge1xuICAgICAgcm9vdC5hcHBlbmRDaGlsZChmcmFnKVxuXG4gICAgICAvLyAjMTM3NCBGaXJlRm94IGJ1ZyBpbiA8b3B0aW9uIHNlbGVjdGVkPXtleHByZXNzaW9ufT5cbiAgICAgIGlmIChGSVJFRk9YICYmICFyb290Lm11bHRpcGxlKSB7XG4gICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgcm9vdC5sZW5ndGg7IG4rKykge1xuICAgICAgICAgIGlmIChyb290W25dLl9fcmlvdDEzNzQpIHtcbiAgICAgICAgICAgIHJvb3Quc2VsZWN0ZWRJbmRleCA9IG4gIC8vIGNsZWFyIG90aGVyIG9wdGlvbnNcbiAgICAgICAgICAgIGRlbGV0ZSByb290W25dLl9fcmlvdDEzNzRcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Ugcm9vdC5pbnNlcnRCZWZvcmUoZnJhZywgcmVmKVxuXG4gICAgLy8gc2V0IHRoZSAndGFncycgcHJvcGVydHkgb2YgdGhlIHBhcmVudCB0YWdcbiAgICAvLyBpZiBjaGlsZCBpcyAndW5kZWZpbmVkJyBpdCBtZWFucyB0aGF0IHdlIGRvbid0IG5lZWQgdG8gc2V0IHRoaXMgcHJvcGVydHlcbiAgICAvLyBmb3IgZXhhbXBsZTpcbiAgICAvLyB3ZSBkb24ndCBuZWVkIHN0b3JlIHRoZSBgbXlUYWcudGFnc1snZGl2J11gIHByb3BlcnR5IGlmIHdlIGFyZSBsb29waW5nIGEgZGl2IHRhZ1xuICAgIC8vIGJ1dCB3ZSBuZWVkIHRvIHRyYWNrIHRoZSBgbXlUYWcudGFnc1snY2hpbGQnXWAgcHJvcGVydHkgbG9vcGluZyBhIGN1c3RvbSBjaGlsZCBub2RlIG5hbWVkIGBjaGlsZGBcbiAgICBpZiAoY2hpbGQpIHBhcmVudC50YWdzW3RhZ05hbWVdID0gdGFnc1xuXG4gICAgLy8gY2xvbmUgdGhlIGl0ZW1zIGFycmF5XG4gICAgb2xkSXRlbXMgPSBpdGVtcy5zbGljZSgpXG5cbiAgfSlcblxufVxuLyoqXG4gKiBPYmplY3QgdGhhdCB3aWxsIGJlIHVzZWQgdG8gaW5qZWN0IGFuZCBtYW5hZ2UgdGhlIGNzcyBvZiBldmVyeSB0YWcgaW5zdGFuY2VcbiAqL1xudmFyIHN0eWxlTWFuYWdlciA9IChmdW5jdGlvbihfcmlvdCkge1xuXG4gIGlmICghd2luZG93KSByZXR1cm4geyAvLyBza2lwIGluamVjdGlvbiBvbiB0aGUgc2VydmVyXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7fSxcbiAgICBpbmplY3Q6IGZ1bmN0aW9uICgpIHt9XG4gIH1cblxuICB2YXIgc3R5bGVOb2RlID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjcmVhdGUgYSBuZXcgc3R5bGUgZWxlbWVudCB3aXRoIHRoZSBjb3JyZWN0IHR5cGVcbiAgICB2YXIgbmV3Tm9kZSA9IG1rRWwoJ3N0eWxlJylcbiAgICBzZXRBdHRyKG5ld05vZGUsICd0eXBlJywgJ3RleHQvY3NzJylcblxuICAgIC8vIHJlcGxhY2UgYW55IHVzZXIgbm9kZSBvciBpbnNlcnQgdGhlIG5ldyBvbmUgaW50byB0aGUgaGVhZFxuICAgIHZhciB1c2VyTm9kZSA9ICQoJ3N0eWxlW3R5cGU9cmlvdF0nKVxuICAgIGlmICh1c2VyTm9kZSkge1xuICAgICAgaWYgKHVzZXJOb2RlLmlkKSBuZXdOb2RlLmlkID0gdXNlck5vZGUuaWRcbiAgICAgIHVzZXJOb2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIHVzZXJOb2RlKVxuICAgIH1cbiAgICBlbHNlIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQobmV3Tm9kZSlcblxuICAgIHJldHVybiBuZXdOb2RlXG4gIH0pKClcblxuICAvLyBDcmVhdGUgY2FjaGUgYW5kIHNob3J0Y3V0IHRvIHRoZSBjb3JyZWN0IHByb3BlcnR5XG4gIHZhciBjc3NUZXh0UHJvcCA9IHN0eWxlTm9kZS5zdHlsZVNoZWV0LFxuICAgIHN0eWxlc1RvSW5qZWN0ID0gJydcblxuICAvLyBFeHBvc2UgdGhlIHN0eWxlIG5vZGUgaW4gYSBub24tbW9kaWZpY2FibGUgcHJvcGVydHlcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KF9yaW90LCAnc3R5bGVOb2RlJywge1xuICAgIHZhbHVlOiBzdHlsZU5vZGUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSlcblxuICAvKipcbiAgICogUHVibGljIGFwaVxuICAgKi9cbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBTYXZlIGEgdGFnIHN0eWxlIHRvIGJlIGxhdGVyIGluamVjdGVkIGludG8gRE9NXG4gICAgICogQHBhcmFtICAgeyBTdHJpbmcgfSBjc3MgW2Rlc2NyaXB0aW9uXVxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24oY3NzKSB7XG4gICAgICBzdHlsZXNUb0luamVjdCArPSBjc3NcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluamVjdCBhbGwgcHJldmlvdXNseSBzYXZlZCB0YWcgc3R5bGVzIGludG8gRE9NXG4gICAgICogaW5uZXJIVE1MIHNlZW1zIHNsb3c6IGh0dHA6Ly9qc3BlcmYuY29tL3Jpb3QtaW5zZXJ0LXN0eWxlXG4gICAgICovXG4gICAgaW5qZWN0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChzdHlsZXNUb0luamVjdCkge1xuICAgICAgICBpZiAoY3NzVGV4dFByb3ApIGNzc1RleHRQcm9wLmNzc1RleHQgKz0gc3R5bGVzVG9JbmplY3RcbiAgICAgICAgZWxzZSBzdHlsZU5vZGUuaW5uZXJIVE1MICs9IHN0eWxlc1RvSW5qZWN0XG4gICAgICAgIHN0eWxlc1RvSW5qZWN0ID0gJydcbiAgICAgIH1cbiAgICB9XG4gIH1cblxufSkocmlvdClcblxuXG5mdW5jdGlvbiBwYXJzZU5hbWVkRWxlbWVudHMocm9vdCwgdGFnLCBjaGlsZFRhZ3MsIGZvcmNlUGFyc2luZ05hbWVkKSB7XG5cbiAgd2Fsayhyb290LCBmdW5jdGlvbihkb20pIHtcbiAgICBpZiAoZG9tLm5vZGVUeXBlID09IDEpIHtcbiAgICAgIGRvbS5pc0xvb3AgPSBkb20uaXNMb29wIHx8XG4gICAgICAgICAgICAgICAgICAoZG9tLnBhcmVudE5vZGUgJiYgZG9tLnBhcmVudE5vZGUuaXNMb29wIHx8IGdldEF0dHIoZG9tLCAnZWFjaCcpKVxuICAgICAgICAgICAgICAgICAgICA/IDEgOiAwXG5cbiAgICAgIC8vIGN1c3RvbSBjaGlsZCB0YWdcbiAgICAgIGlmIChjaGlsZFRhZ3MpIHtcbiAgICAgICAgdmFyIGNoaWxkID0gZ2V0VGFnKGRvbSlcblxuICAgICAgICBpZiAoY2hpbGQgJiYgIWRvbS5pc0xvb3ApXG4gICAgICAgICAgY2hpbGRUYWdzLnB1c2goaW5pdENoaWxkVGFnKGNoaWxkLCB7cm9vdDogZG9tLCBwYXJlbnQ6IHRhZ30sIGRvbS5pbm5lckhUTUwsIHRhZykpXG4gICAgICB9XG5cbiAgICAgIGlmICghZG9tLmlzTG9vcCB8fCBmb3JjZVBhcnNpbmdOYW1lZClcbiAgICAgICAgc2V0TmFtZWQoZG9tLCB0YWcsIFtdKVxuICAgIH1cblxuICB9KVxuXG59XG5cbmZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbnMocm9vdCwgdGFnLCBleHByZXNzaW9ucykge1xuXG4gIGZ1bmN0aW9uIGFkZEV4cHIoZG9tLCB2YWwsIGV4dHJhKSB7XG4gICAgaWYgKHRtcGwuaGFzRXhwcih2YWwpKSB7XG4gICAgICBleHByZXNzaW9ucy5wdXNoKGV4dGVuZCh7IGRvbTogZG9tLCBleHByOiB2YWwgfSwgZXh0cmEpKVxuICAgIH1cbiAgfVxuXG4gIHdhbGsocm9vdCwgZnVuY3Rpb24oZG9tKSB7XG4gICAgdmFyIHR5cGUgPSBkb20ubm9kZVR5cGUsXG4gICAgICBhdHRyXG5cbiAgICAvLyB0ZXh0IG5vZGVcbiAgICBpZiAodHlwZSA9PSAzICYmIGRvbS5wYXJlbnROb2RlLnRhZ05hbWUgIT0gJ1NUWUxFJykgYWRkRXhwcihkb20sIGRvbS5ub2RlVmFsdWUpXG4gICAgaWYgKHR5cGUgIT0gMSkgcmV0dXJuXG5cbiAgICAvKiBlbGVtZW50ICovXG5cbiAgICAvLyBsb29wXG4gICAgYXR0ciA9IGdldEF0dHIoZG9tLCAnZWFjaCcpXG5cbiAgICBpZiAoYXR0cikgeyBfZWFjaChkb20sIHRhZywgYXR0cik7IHJldHVybiBmYWxzZSB9XG5cbiAgICAvLyBhdHRyaWJ1dGUgZXhwcmVzc2lvbnNcbiAgICBlYWNoKGRvbS5hdHRyaWJ1dGVzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgICB2YXIgbmFtZSA9IGF0dHIubmFtZSxcbiAgICAgICAgYm9vbCA9IG5hbWUuc3BsaXQoJ19fJylbMV1cblxuICAgICAgYWRkRXhwcihkb20sIGF0dHIudmFsdWUsIHsgYXR0cjogYm9vbCB8fCBuYW1lLCBib29sOiBib29sIH0pXG4gICAgICBpZiAoYm9vbCkgeyByZW1BdHRyKGRvbSwgbmFtZSk7IHJldHVybiBmYWxzZSB9XG5cbiAgICB9KVxuXG4gICAgLy8gc2tpcCBjdXN0b20gdGFnc1xuICAgIGlmIChnZXRUYWcoZG9tKSkgcmV0dXJuIGZhbHNlXG5cbiAgfSlcblxufVxuZnVuY3Rpb24gVGFnKGltcGwsIGNvbmYsIGlubmVySFRNTCkge1xuXG4gIHZhciBzZWxmID0gcmlvdC5vYnNlcnZhYmxlKHRoaXMpLFxuICAgIG9wdHMgPSBpbmhlcml0KGNvbmYub3B0cykgfHwge30sXG4gICAgcGFyZW50ID0gY29uZi5wYXJlbnQsXG4gICAgaXNMb29wID0gY29uZi5pc0xvb3AsXG4gICAgaGFzSW1wbCA9IGNvbmYuaGFzSW1wbCxcbiAgICBpdGVtID0gY2xlYW5VcERhdGEoY29uZi5pdGVtKSxcbiAgICBleHByZXNzaW9ucyA9IFtdLFxuICAgIGNoaWxkVGFncyA9IFtdLFxuICAgIHJvb3QgPSBjb25mLnJvb3QsXG4gICAgdGFnTmFtZSA9IHJvb3QudGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxuICAgIGF0dHIgPSB7fSxcbiAgICBwcm9wc0luU3luY1dpdGhQYXJlbnQgPSBbXSxcbiAgICBkb21cblxuICAvLyBvbmx5IGNhbGwgdW5tb3VudCBpZiB3ZSBoYXZlIGEgdmFsaWQgX190YWdJbXBsIChoYXMgbmFtZSBwcm9wZXJ0eSlcbiAgaWYgKGltcGwubmFtZSAmJiByb290Ll90YWcpIHJvb3QuX3RhZy51bm1vdW50KHRydWUpXG5cbiAgLy8gbm90IHlldCBtb3VudGVkXG4gIHRoaXMuaXNNb3VudGVkID0gZmFsc2VcbiAgcm9vdC5pc0xvb3AgPSBpc0xvb3BcblxuICAvLyBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSB0YWcganVzdCBjcmVhdGVkXG4gIC8vIHNvIHdlIHdpbGwgYmUgYWJsZSB0byBtb3VudCB0aGlzIHRhZyBtdWx0aXBsZSB0aW1lc1xuICByb290Ll90YWcgPSB0aGlzXG5cbiAgLy8gY3JlYXRlIGEgdW5pcXVlIGlkIHRvIHRoaXMgdGFnXG4gIC8vIGl0IGNvdWxkIGJlIGhhbmR5IHRvIHVzZSBpdCBhbHNvIHRvIGltcHJvdmUgdGhlIHZpcnR1YWwgZG9tIHJlbmRlcmluZyBzcGVlZFxuICBkZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX3Jpb3RfaWQnLCArK19fdWlkKSAvLyBiYXNlIDEgYWxsb3dzIHRlc3QgIXQuX3Jpb3RfaWRcblxuICBleHRlbmQodGhpcywgeyBwYXJlbnQ6IHBhcmVudCwgcm9vdDogcm9vdCwgb3B0czogb3B0cywgdGFnczoge30gfSwgaXRlbSlcblxuICAvLyBncmFiIGF0dHJpYnV0ZXNcbiAgZWFjaChyb290LmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGVsKSB7XG4gICAgdmFyIHZhbCA9IGVsLnZhbHVlXG4gICAgLy8gcmVtZW1iZXIgYXR0cmlidXRlcyB3aXRoIGV4cHJlc3Npb25zIG9ubHlcbiAgICBpZiAodG1wbC5oYXNFeHByKHZhbCkpIGF0dHJbZWwubmFtZV0gPSB2YWxcbiAgfSlcblxuICBkb20gPSBta2RvbShpbXBsLnRtcGwsIGlubmVySFRNTClcblxuICAvLyBvcHRpb25zXG4gIGZ1bmN0aW9uIHVwZGF0ZU9wdHMoKSB7XG4gICAgdmFyIGN0eCA9IGhhc0ltcGwgJiYgaXNMb29wID8gc2VsZiA6IHBhcmVudCB8fCBzZWxmXG5cbiAgICAvLyB1cGRhdGUgb3B0cyBmcm9tIGN1cnJlbnQgRE9NIGF0dHJpYnV0ZXNcbiAgICBlYWNoKHJvb3QuYXR0cmlidXRlcywgZnVuY3Rpb24oZWwpIHtcbiAgICAgIHZhciB2YWwgPSBlbC52YWx1ZVxuICAgICAgb3B0c1t0b0NhbWVsKGVsLm5hbWUpXSA9IHRtcGwuaGFzRXhwcih2YWwpID8gdG1wbCh2YWwsIGN0eCkgOiB2YWxcbiAgICB9KVxuICAgIC8vIHJlY292ZXIgdGhvc2Ugd2l0aCBleHByZXNzaW9uc1xuICAgIGVhY2goT2JqZWN0LmtleXMoYXR0ciksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIG9wdHNbdG9DYW1lbChuYW1lKV0gPSB0bXBsKGF0dHJbbmFtZV0sIGN0eClcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplRGF0YShkYXRhKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGl0ZW0pIHtcbiAgICAgIGlmICh0eXBlb2Ygc2VsZltrZXldICE9PSBUX1VOREVGICYmIGlzV3JpdGFibGUoc2VsZiwga2V5KSlcbiAgICAgICAgc2VsZltrZXldID0gZGF0YVtrZXldXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5oZXJpdEZyb21QYXJlbnQgKCkge1xuICAgIGlmICghc2VsZi5wYXJlbnQgfHwgIWlzTG9vcCkgcmV0dXJuXG4gICAgZWFjaChPYmplY3Qua2V5cyhzZWxmLnBhcmVudCksIGZ1bmN0aW9uKGspIHtcbiAgICAgIC8vIHNvbWUgcHJvcGVydGllcyBtdXN0IGJlIGFsd2F5cyBpbiBzeW5jIHdpdGggdGhlIHBhcmVudCB0YWdcbiAgICAgIHZhciBtdXN0U3luYyA9ICFSRVNFUlZFRF9XT1JEU19CTEFDS0xJU1QudGVzdChrKSAmJiBjb250YWlucyhwcm9wc0luU3luY1dpdGhQYXJlbnQsIGspXG4gICAgICBpZiAodHlwZW9mIHNlbGZba10gPT09IFRfVU5ERUYgfHwgbXVzdFN5bmMpIHtcbiAgICAgICAgLy8gdHJhY2sgdGhlIHByb3BlcnR5IHRvIGtlZXAgaW4gc3luY1xuICAgICAgICAvLyBzbyB3ZSBjYW4ga2VlcCBpdCB1cGRhdGVkXG4gICAgICAgIGlmICghbXVzdFN5bmMpIHByb3BzSW5TeW5jV2l0aFBhcmVudC5wdXNoKGspXG4gICAgICAgIHNlbGZba10gPSBzZWxmLnBhcmVudFtrXVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSB0YWcgZXhwcmVzc2lvbnMgYW5kIG9wdGlvbnNcbiAgICogQHBhcmFtICAgeyAqIH0gIGRhdGEgLSBkYXRhIHdlIHdhbnQgdG8gdXNlIHRvIGV4dGVuZCB0aGUgdGFnIHByb3BlcnRpZXNcbiAgICogQHBhcmFtICAgeyBCb29sZWFuIH0gaXNJbmhlcml0ZWQgLSBpcyB0aGlzIHVwZGF0ZSBjb21pbmcgZnJvbSBhIHBhcmVudCB0YWc/XG4gICAqIEByZXR1cm5zIHsgc2VsZiB9XG4gICAqL1xuICBkZWZpbmVQcm9wZXJ0eSh0aGlzLCAndXBkYXRlJywgZnVuY3Rpb24oZGF0YSwgaXNJbmhlcml0ZWQpIHtcblxuICAgIC8vIG1ha2Ugc3VyZSB0aGUgZGF0YSBwYXNzZWQgd2lsbCBub3Qgb3ZlcnJpZGVcbiAgICAvLyB0aGUgY29tcG9uZW50IGNvcmUgbWV0aG9kc1xuICAgIGRhdGEgPSBjbGVhblVwRGF0YShkYXRhKVxuICAgIC8vIGluaGVyaXQgcHJvcGVydGllcyBmcm9tIHRoZSBwYXJlbnRcbiAgICBpbmhlcml0RnJvbVBhcmVudCgpXG4gICAgLy8gbm9ybWFsaXplIHRoZSB0YWcgcHJvcGVydGllcyBpbiBjYXNlIGFuIGl0ZW0gb2JqZWN0IHdhcyBpbml0aWFsbHkgcGFzc2VkXG4gICAgaWYgKGRhdGEgJiYgaXNPYmplY3QoaXRlbSkpIHtcbiAgICAgIG5vcm1hbGl6ZURhdGEoZGF0YSlcbiAgICAgIGl0ZW0gPSBkYXRhXG4gICAgfVxuICAgIGV4dGVuZChzZWxmLCBkYXRhKVxuICAgIHVwZGF0ZU9wdHMoKVxuICAgIHNlbGYudHJpZ2dlcigndXBkYXRlJywgZGF0YSlcbiAgICB1cGRhdGUoZXhwcmVzc2lvbnMsIHNlbGYpXG5cbiAgICAvLyB0aGUgdXBkYXRlZCBldmVudCB3aWxsIGJlIHRyaWdnZXJlZFxuICAgIC8vIG9uY2UgdGhlIERPTSB3aWxsIGJlIHJlYWR5IGFuZCBhbGwgdGhlIHJlLWZsb3dzIGFyZSBjb21wbGV0ZWRcbiAgICAvLyB0aGlzIGlzIHVzZWZ1bCBpZiB5b3Ugd2FudCB0byBnZXQgdGhlIFwicmVhbFwiIHJvb3QgcHJvcGVydGllc1xuICAgIC8vIDQgZXg6IHJvb3Qub2Zmc2V0V2lkdGggLi4uXG4gICAgaWYgKGlzSW5oZXJpdGVkICYmIHNlbGYucGFyZW50KVxuICAgICAgLy8gY2xvc2VzICMxNTk5XG4gICAgICBzZWxmLnBhcmVudC5vbmUoJ3VwZGF0ZWQnLCBmdW5jdGlvbigpIHsgc2VsZi50cmlnZ2VyKCd1cGRhdGVkJykgfSlcbiAgICBlbHNlIHJBRihmdW5jdGlvbigpIHsgc2VsZi50cmlnZ2VyKCd1cGRhdGVkJykgfSlcblxuICAgIHJldHVybiB0aGlzXG4gIH0pXG5cbiAgZGVmaW5lUHJvcGVydHkodGhpcywgJ21peGluJywgZnVuY3Rpb24oKSB7XG4gICAgZWFjaChhcmd1bWVudHMsIGZ1bmN0aW9uKG1peCkge1xuICAgICAgdmFyIGluc3RhbmNlXG5cbiAgICAgIG1peCA9IHR5cGVvZiBtaXggPT09IFRfU1RSSU5HID8gcmlvdC5taXhpbihtaXgpIDogbWl4XG5cbiAgICAgIC8vIGNoZWNrIGlmIHRoZSBtaXhpbiBpcyBhIGZ1bmN0aW9uXG4gICAgICBpZiAoaXNGdW5jdGlvbihtaXgpKSB7XG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgbmV3IG1peGluIGluc3RhbmNlXG4gICAgICAgIGluc3RhbmNlID0gbmV3IG1peCgpXG4gICAgICAgIC8vIHNhdmUgdGhlIHByb3RvdHlwZSB0byBsb29wIGl0IGFmdGVyd2FyZHNcbiAgICAgICAgbWl4ID0gbWl4LnByb3RvdHlwZVxuICAgICAgfSBlbHNlIGluc3RhbmNlID0gbWl4XG5cbiAgICAgIC8vIGxvb3AgdGhlIGtleXMgaW4gdGhlIGZ1bmN0aW9uIHByb3RvdHlwZSBvciB0aGUgYWxsIG9iamVjdCBrZXlzXG4gICAgICBlYWNoKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG1peCksIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAvLyBiaW5kIG1ldGhvZHMgdG8gc2VsZlxuICAgICAgICBpZiAoa2V5ICE9ICdpbml0JylcbiAgICAgICAgICBzZWxmW2tleV0gPSBpc0Z1bmN0aW9uKGluc3RhbmNlW2tleV0pID9cbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW2tleV0uYmluZChzZWxmKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZVtrZXldXG4gICAgICB9KVxuXG4gICAgICAvLyBpbml0IG1ldGhvZCB3aWxsIGJlIGNhbGxlZCBhdXRvbWF0aWNhbGx5XG4gICAgICBpZiAoaW5zdGFuY2UuaW5pdCkgaW5zdGFuY2UuaW5pdC5iaW5kKHNlbGYpKClcbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH0pXG5cbiAgZGVmaW5lUHJvcGVydHkodGhpcywgJ21vdW50JywgZnVuY3Rpb24oKSB7XG5cbiAgICB1cGRhdGVPcHRzKClcblxuICAgIC8vIGFkZCBnbG9iYWwgbWl4aW5zXG4gICAgdmFyIGdsb2JhbE1peGluID0gcmlvdC5taXhpbihHTE9CQUxfTUlYSU4pXG4gICAgaWYgKGdsb2JhbE1peGluKVxuICAgICAgZm9yICh2YXIgaSBpbiBnbG9iYWxNaXhpbilcbiAgICAgICAgaWYgKGdsb2JhbE1peGluLmhhc093blByb3BlcnR5KGkpKVxuICAgICAgICAgIHNlbGYubWl4aW4oZ2xvYmFsTWl4aW5baV0pXG5cbiAgICAvLyBpbml0aWFsaWF0aW9uXG4gICAgaWYgKGltcGwuZm4pIGltcGwuZm4uY2FsbChzZWxmLCBvcHRzKVxuXG4gICAgLy8gcGFyc2UgbGF5b3V0IGFmdGVyIGluaXQuIGZuIG1heSBjYWxjdWxhdGUgYXJncyBmb3IgbmVzdGVkIGN1c3RvbSB0YWdzXG4gICAgcGFyc2VFeHByZXNzaW9ucyhkb20sIHNlbGYsIGV4cHJlc3Npb25zKVxuXG4gICAgLy8gbW91bnQgdGhlIGNoaWxkIHRhZ3NcbiAgICB0b2dnbGUodHJ1ZSlcblxuICAgIC8vIHVwZGF0ZSB0aGUgcm9vdCBhZGRpbmcgY3VzdG9tIGF0dHJpYnV0ZXMgY29taW5nIGZyb20gdGhlIGNvbXBpbGVyXG4gICAgLy8gaXQgZml4ZXMgYWxzbyAjMTA4N1xuICAgIGlmIChpbXBsLmF0dHJzKVxuICAgICAgd2Fsa0F0dHJpYnV0ZXMoaW1wbC5hdHRycywgZnVuY3Rpb24gKGssIHYpIHsgc2V0QXR0cihyb290LCBrLCB2KSB9KVxuICAgIGlmIChpbXBsLmF0dHJzIHx8IGhhc0ltcGwpXG4gICAgICBwYXJzZUV4cHJlc3Npb25zKHNlbGYucm9vdCwgc2VsZiwgZXhwcmVzc2lvbnMpXG5cbiAgICBpZiAoIXNlbGYucGFyZW50IHx8IGlzTG9vcCkgc2VsZi51cGRhdGUoaXRlbSlcblxuICAgIC8vIGludGVybmFsIHVzZSBvbmx5LCBmaXhlcyAjNDAzXG4gICAgc2VsZi50cmlnZ2VyKCdiZWZvcmUtbW91bnQnKVxuXG4gICAgaWYgKGlzTG9vcCAmJiAhaGFzSW1wbCkge1xuICAgICAgLy8gdXBkYXRlIHRoZSByb290IGF0dHJpYnV0ZSBmb3IgdGhlIGxvb3BlZCBlbGVtZW50c1xuICAgICAgcm9vdCA9IGRvbS5maXJzdENoaWxkXG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlIChkb20uZmlyc3RDaGlsZCkgcm9vdC5hcHBlbmRDaGlsZChkb20uZmlyc3RDaGlsZClcbiAgICAgIGlmIChyb290LnN0dWIpIHJvb3QgPSBwYXJlbnQucm9vdFxuICAgIH1cblxuICAgIGRlZmluZVByb3BlcnR5KHNlbGYsICdyb290Jywgcm9vdClcblxuICAgIC8vIHBhcnNlIHRoZSBuYW1lZCBkb20gbm9kZXMgaW4gdGhlIGxvb3BlZCBjaGlsZFxuICAgIC8vIGFkZGluZyB0aGVtIHRvIHRoZSBwYXJlbnQgYXMgd2VsbFxuICAgIGlmIChpc0xvb3ApXG4gICAgICBwYXJzZU5hbWVkRWxlbWVudHMoc2VsZi5yb290LCBzZWxmLnBhcmVudCwgbnVsbCwgdHJ1ZSlcblxuICAgIC8vIGlmIGl0J3Mgbm90IGEgY2hpbGQgdGFnIHdlIGNhbiB0cmlnZ2VyIGl0cyBtb3VudCBldmVudFxuICAgIGlmICghc2VsZi5wYXJlbnQgfHwgc2VsZi5wYXJlbnQuaXNNb3VudGVkKSB7XG4gICAgICBzZWxmLmlzTW91bnRlZCA9IHRydWVcbiAgICAgIHNlbGYudHJpZ2dlcignbW91bnQnKVxuICAgIH1cbiAgICAvLyBvdGhlcndpc2Ugd2UgbmVlZCB0byB3YWl0IHRoYXQgdGhlIHBhcmVudCBldmVudCBnZXRzIHRyaWdnZXJlZFxuICAgIGVsc2Ugc2VsZi5wYXJlbnQub25lKCdtb3VudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgdG8gdHJpZ2dlciB0aGUgYG1vdW50YCBldmVudCBmb3IgdGhlIHRhZ3NcbiAgICAgIC8vIG5vdCB2aXNpYmxlIGluY2x1ZGVkIGluIGFuIGlmIHN0YXRlbWVudFxuICAgICAgaWYgKCFpc0luU3R1YihzZWxmLnJvb3QpKSB7XG4gICAgICAgIHNlbGYucGFyZW50LmlzTW91bnRlZCA9IHNlbGYuaXNNb3VudGVkID0gdHJ1ZVxuICAgICAgICBzZWxmLnRyaWdnZXIoJ21vdW50JylcbiAgICAgIH1cbiAgICB9KVxuICB9KVxuXG5cbiAgZGVmaW5lUHJvcGVydHkodGhpcywgJ3VubW91bnQnLCBmdW5jdGlvbihrZWVwUm9vdFRhZykge1xuICAgIHZhciBlbCA9IHJvb3QsXG4gICAgICBwID0gZWwucGFyZW50Tm9kZSxcbiAgICAgIHB0YWcsXG4gICAgICB0YWdJbmRleCA9IF9fdmlydHVhbERvbS5pbmRleE9mKHNlbGYpXG5cbiAgICBzZWxmLnRyaWdnZXIoJ2JlZm9yZS11bm1vdW50JylcblxuICAgIC8vIHJlbW92ZSB0aGlzIHRhZyBpbnN0YW5jZSBmcm9tIHRoZSBnbG9iYWwgdmlydHVhbERvbSB2YXJpYWJsZVxuICAgIGlmICh+dGFnSW5kZXgpXG4gICAgICBfX3ZpcnR1YWxEb20uc3BsaWNlKHRhZ0luZGV4LCAxKVxuXG4gICAgaWYgKHApIHtcblxuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwdGFnID0gZ2V0SW1tZWRpYXRlQ3VzdG9tUGFyZW50VGFnKHBhcmVudClcbiAgICAgICAgLy8gcmVtb3ZlIHRoaXMgdGFnIGZyb20gdGhlIHBhcmVudCB0YWdzIG9iamVjdFxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgbmVzdGVkIHRhZ3Mgd2l0aCBzYW1lIG5hbWUuLlxuICAgICAgICAvLyByZW1vdmUgdGhpcyBlbGVtZW50IGZvcm0gdGhlIGFycmF5XG4gICAgICAgIGlmIChpc0FycmF5KHB0YWcudGFnc1t0YWdOYW1lXSkpXG4gICAgICAgICAgZWFjaChwdGFnLnRhZ3NbdGFnTmFtZV0sIGZ1bmN0aW9uKHRhZywgaSkge1xuICAgICAgICAgICAgaWYgKHRhZy5fcmlvdF9pZCA9PSBzZWxmLl9yaW90X2lkKVxuICAgICAgICAgICAgICBwdGFnLnRhZ3NbdGFnTmFtZV0uc3BsaWNlKGksIDEpXG4gICAgICAgICAgfSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgIC8vIG90aGVyd2lzZSBqdXN0IGRlbGV0ZSB0aGUgdGFnIGluc3RhbmNlXG4gICAgICAgICAgcHRhZy50YWdzW3RhZ05hbWVdID0gdW5kZWZpbmVkXG4gICAgICB9XG5cbiAgICAgIGVsc2VcbiAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpXG5cbiAgICAgIGlmICgha2VlcFJvb3RUYWcpXG4gICAgICAgIHAucmVtb3ZlQ2hpbGQoZWwpXG4gICAgICBlbHNlIHtcbiAgICAgICAgLy8gdGhlIHJpb3QtdGFnIGFuZCB0aGUgZGF0YS1pcyBhdHRyaWJ1dGVzIGFyZW4ndCBuZWVkZWQgYW55bW9yZSwgcmVtb3ZlIHRoZW1cbiAgICAgICAgcmVtQXR0cihwLCBSSU9UX1RBR19JUylcbiAgICAgICAgcmVtQXR0cihwLCBSSU9UX1RBRykgLy8gdGhpcyB3aWxsIGJlIHJlbW92ZWQgaW4gcmlvdCAzLjAuMFxuICAgICAgfVxuXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3ZpcnRzKSB7XG4gICAgICBlYWNoKHRoaXMuX3ZpcnRzLCBmdW5jdGlvbih2KSB7XG4gICAgICAgIGlmICh2LnBhcmVudE5vZGUpIHYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh2KVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBzZWxmLnRyaWdnZXIoJ3VubW91bnQnKVxuICAgIHRvZ2dsZSgpXG4gICAgc2VsZi5vZmYoJyonKVxuICAgIHNlbGYuaXNNb3VudGVkID0gZmFsc2VcbiAgICBkZWxldGUgcm9vdC5fdGFnXG5cbiAgfSlcblxuICAvLyBwcm94eSBmdW5jdGlvbiB0byBiaW5kIHVwZGF0ZXNcbiAgLy8gZGlzcGF0Y2hlZCBmcm9tIGEgcGFyZW50IHRhZ1xuICBmdW5jdGlvbiBvbkNoaWxkVXBkYXRlKGRhdGEpIHsgc2VsZi51cGRhdGUoZGF0YSwgdHJ1ZSkgfVxuXG4gIGZ1bmN0aW9uIHRvZ2dsZShpc01vdW50KSB7XG5cbiAgICAvLyBtb3VudC91bm1vdW50IGNoaWxkcmVuXG4gICAgZWFjaChjaGlsZFRhZ3MsIGZ1bmN0aW9uKGNoaWxkKSB7IGNoaWxkW2lzTW91bnQgPyAnbW91bnQnIDogJ3VubW91bnQnXSgpIH0pXG5cbiAgICAvLyBsaXN0ZW4vdW5saXN0ZW4gcGFyZW50IChldmVudHMgZmxvdyBvbmUgd2F5IGZyb20gcGFyZW50IHRvIGNoaWxkcmVuKVxuICAgIGlmICghcGFyZW50KSByZXR1cm5cbiAgICB2YXIgZXZ0ID0gaXNNb3VudCA/ICdvbicgOiAnb2ZmJ1xuXG4gICAgLy8gdGhlIGxvb3AgdGFncyB3aWxsIGJlIGFsd2F5cyBpbiBzeW5jIHdpdGggdGhlIHBhcmVudCBhdXRvbWF0aWNhbGx5XG4gICAgaWYgKGlzTG9vcClcbiAgICAgIHBhcmVudFtldnRdKCd1bm1vdW50Jywgc2VsZi51bm1vdW50KVxuICAgIGVsc2Uge1xuICAgICAgcGFyZW50W2V2dF0oJ3VwZGF0ZScsIG9uQ2hpbGRVcGRhdGUpW2V2dF0oJ3VubW91bnQnLCBzZWxmLnVubW91bnQpXG4gICAgfVxuICB9XG5cblxuICAvLyBuYW1lZCBlbGVtZW50cyBhdmFpbGFibGUgZm9yIGZuXG4gIHBhcnNlTmFtZWRFbGVtZW50cyhkb20sIHRoaXMsIGNoaWxkVGFncylcblxufVxuLyoqXG4gKiBBdHRhY2ggYW4gZXZlbnQgdG8gYSBET00gbm9kZVxuICogQHBhcmFtIHsgU3RyaW5nIH0gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSB7IEZ1bmN0aW9uIH0gaGFuZGxlciAtIGV2ZW50IGNhbGxiYWNrXG4gKiBAcGFyYW0geyBPYmplY3QgfSBkb20gLSBkb20gbm9kZVxuICogQHBhcmFtIHsgVGFnIH0gdGFnIC0gdGFnIGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIHNldEV2ZW50SGFuZGxlcihuYW1lLCBoYW5kbGVyLCBkb20sIHRhZykge1xuXG4gIGRvbVtuYW1lXSA9IGZ1bmN0aW9uKGUpIHtcblxuICAgIHZhciBwdGFnID0gdGFnLl9wYXJlbnQsXG4gICAgICBpdGVtID0gdGFnLl9pdGVtLFxuICAgICAgZWxcblxuICAgIGlmICghaXRlbSlcbiAgICAgIHdoaWxlIChwdGFnICYmICFpdGVtKSB7XG4gICAgICAgIGl0ZW0gPSBwdGFnLl9pdGVtXG4gICAgICAgIHB0YWcgPSBwdGFnLl9wYXJlbnRcbiAgICAgIH1cblxuICAgIC8vIGNyb3NzIGJyb3dzZXIgZXZlbnQgZml4XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50XG5cbiAgICAvLyBvdmVycmlkZSB0aGUgZXZlbnQgcHJvcGVydGllc1xuICAgIGlmIChpc1dyaXRhYmxlKGUsICdjdXJyZW50VGFyZ2V0JykpIGUuY3VycmVudFRhcmdldCA9IGRvbVxuICAgIGlmIChpc1dyaXRhYmxlKGUsICd0YXJnZXQnKSkgZS50YXJnZXQgPSBlLnNyY0VsZW1lbnRcbiAgICBpZiAoaXNXcml0YWJsZShlLCAnd2hpY2gnKSkgZS53aGljaCA9IGUuY2hhckNvZGUgfHwgZS5rZXlDb2RlXG5cbiAgICBlLml0ZW0gPSBpdGVtXG5cbiAgICAvLyBwcmV2ZW50IGRlZmF1bHQgYmVoYXZpb3VyIChieSBkZWZhdWx0KVxuICAgIGlmIChoYW5kbGVyLmNhbGwodGFnLCBlKSAhPT0gdHJ1ZSAmJiAhL3JhZGlvfGNoZWNrLy50ZXN0KGRvbS50eXBlKSkge1xuICAgICAgaWYgKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKCFlLnByZXZlbnRVcGRhdGUpIHtcbiAgICAgIGVsID0gaXRlbSA/IGdldEltbWVkaWF0ZUN1c3RvbVBhcmVudFRhZyhwdGFnKSA6IHRhZ1xuICAgICAgZWwudXBkYXRlKClcbiAgICB9XG5cbiAgfVxuXG59XG5cblxuLyoqXG4gKiBJbnNlcnQgYSBET00gbm9kZSByZXBsYWNpbmcgYW5vdGhlciBvbmUgKHVzZWQgYnkgaWYtIGF0dHJpYnV0ZSlcbiAqIEBwYXJhbSAgIHsgT2JqZWN0IH0gcm9vdCAtIHBhcmVudCBub2RlXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IG5vZGUgLSBub2RlIHJlcGxhY2VkXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGJlZm9yZSAtIG5vZGUgYWRkZWRcbiAqL1xuZnVuY3Rpb24gaW5zZXJ0VG8ocm9vdCwgbm9kZSwgYmVmb3JlKSB7XG4gIGlmICghcm9vdCkgcmV0dXJuXG4gIHJvb3QuaW5zZXJ0QmVmb3JlKGJlZm9yZSwgbm9kZSlcbiAgcm9vdC5yZW1vdmVDaGlsZChub2RlKVxufVxuXG4vKipcbiAqIFVwZGF0ZSB0aGUgZXhwcmVzc2lvbnMgaW4gYSBUYWcgaW5zdGFuY2VcbiAqIEBwYXJhbSAgIHsgQXJyYXkgfSBleHByZXNzaW9ucyAtIGV4cHJlc3Npb24gdGhhdCBtdXN0IGJlIHJlIGV2YWx1YXRlZFxuICogQHBhcmFtICAgeyBUYWcgfSB0YWcgLSB0YWcgaW5zdGFuY2VcbiAqL1xuZnVuY3Rpb24gdXBkYXRlKGV4cHJlc3Npb25zLCB0YWcpIHtcblxuICBlYWNoKGV4cHJlc3Npb25zLCBmdW5jdGlvbihleHByLCBpKSB7XG5cbiAgICB2YXIgZG9tID0gZXhwci5kb20sXG4gICAgICBhdHRyTmFtZSA9IGV4cHIuYXR0cixcbiAgICAgIHZhbHVlID0gdG1wbChleHByLmV4cHIsIHRhZyksXG4gICAgICBwYXJlbnQgPSBleHByLmRvbS5wYXJlbnROb2RlXG5cbiAgICBpZiAoZXhwci5ib29sKSB7XG4gICAgICB2YWx1ZSA9ICEhdmFsdWVcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgIHZhbHVlID0gJydcbiAgICB9XG5cbiAgICAvLyAjMTYzODogcmVncmVzc2lvbiBvZiAjMTYxMiwgdXBkYXRlIHRoZSBkb20gb25seSBpZiB0aGUgdmFsdWUgb2YgdGhlXG4gICAgLy8gZXhwcmVzc2lvbiB3YXMgY2hhbmdlZFxuICAgIGlmIChleHByLnZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGV4cHIudmFsdWUgPSB2YWx1ZVxuXG4gICAgLy8gdGV4dGFyZWEgYW5kIHRleHQgbm9kZXMgaGFzIG5vIGF0dHJpYnV0ZSBuYW1lXG4gICAgaWYgKCFhdHRyTmFtZSkge1xuICAgICAgLy8gYWJvdXQgIzgxNSB3L28gcmVwbGFjZTogdGhlIGJyb3dzZXIgY29udmVydHMgdGhlIHZhbHVlIHRvIGEgc3RyaW5nLFxuICAgICAgLy8gdGhlIGNvbXBhcmlzb24gYnkgXCI9PVwiIGRvZXMgdG9vLCBidXQgbm90IGluIHRoZSBzZXJ2ZXJcbiAgICAgIHZhbHVlICs9ICcnXG4gICAgICAvLyB0ZXN0IGZvciBwYXJlbnQgYXZvaWRzIGVycm9yIHdpdGggaW52YWxpZCBhc3NpZ25tZW50IHRvIG5vZGVWYWx1ZVxuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBpZiAocGFyZW50LnRhZ05hbWUgPT09ICdURVhUQVJFQScpIHtcbiAgICAgICAgICBwYXJlbnQudmFsdWUgPSB2YWx1ZSAgICAgICAgICAgICAgICAgICAgLy8gIzExMTNcbiAgICAgICAgICBpZiAoIUlFX1ZFUlNJT04pIGRvbS5ub2RlVmFsdWUgPSB2YWx1ZSAgLy8gIzE2MjUgSUUgdGhyb3dzIGhlcmUsIG5vZGVWYWx1ZVxuICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aWxsIGJlIGF2YWlsYWJsZSBvbiAndXBkYXRlZCdcbiAgICAgICAgZWxzZSBkb20ubm9kZVZhbHVlID0gdmFsdWVcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIH5+IzE2MTI6IGxvb2sgZm9yIGNoYW5nZXMgaW4gZG9tLnZhbHVlIHdoZW4gdXBkYXRpbmcgdGhlIHZhbHVlfn5cbiAgICBpZiAoYXR0ck5hbWUgPT09ICd2YWx1ZScpIHtcbiAgICAgIGRvbS52YWx1ZSA9IHZhbHVlXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyByZW1vdmUgb3JpZ2luYWwgYXR0cmlidXRlXG4gICAgcmVtQXR0cihkb20sIGF0dHJOYW1lKVxuXG4gICAgLy8gZXZlbnQgaGFuZGxlclxuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgc2V0RXZlbnRIYW5kbGVyKGF0dHJOYW1lLCB2YWx1ZSwgZG9tLCB0YWcpXG5cbiAgICAvLyBpZi0gY29uZGl0aW9uYWxcbiAgICB9IGVsc2UgaWYgKGF0dHJOYW1lID09ICdpZicpIHtcbiAgICAgIHZhciBzdHViID0gZXhwci5zdHViLFxuICAgICAgICBhZGQgPSBmdW5jdGlvbigpIHsgaW5zZXJ0VG8oc3R1Yi5wYXJlbnROb2RlLCBzdHViLCBkb20pIH0sXG4gICAgICAgIHJlbW92ZSA9IGZ1bmN0aW9uKCkgeyBpbnNlcnRUbyhkb20ucGFyZW50Tm9kZSwgZG9tLCBzdHViKSB9XG5cbiAgICAgIC8vIGFkZCB0byBET01cbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICBpZiAoc3R1Yikge1xuICAgICAgICAgIGFkZCgpXG4gICAgICAgICAgZG9tLmluU3R1YiA9IGZhbHNlXG4gICAgICAgICAgLy8gYXZvaWQgdG8gdHJpZ2dlciB0aGUgbW91bnQgZXZlbnQgaWYgdGhlIHRhZ3MgaXMgbm90IHZpc2libGUgeWV0XG4gICAgICAgICAgLy8gbWF5YmUgd2UgY2FuIG9wdGltaXplIHRoaXMgYXZvaWRpbmcgdG8gbW91bnQgdGhlIHRhZyBhdCBhbGxcbiAgICAgICAgICBpZiAoIWlzSW5TdHViKGRvbSkpIHtcbiAgICAgICAgICAgIHdhbGsoZG9tLCBmdW5jdGlvbihlbCkge1xuICAgICAgICAgICAgICBpZiAoZWwuX3RhZyAmJiAhZWwuX3RhZy5pc01vdW50ZWQpXG4gICAgICAgICAgICAgICAgZWwuX3RhZy5pc01vdW50ZWQgPSAhIWVsLl90YWcudHJpZ2dlcignbW91bnQnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIC8vIHJlbW92ZSBmcm9tIERPTVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3R1YiA9IGV4cHIuc3R1YiA9IHN0dWIgfHwgZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpXG4gICAgICAgIC8vIGlmIHRoZSBwYXJlbnROb2RlIGlzIGRlZmluZWQgd2UgY2FuIGVhc2lseSByZXBsYWNlIHRoZSB0YWdcbiAgICAgICAgaWYgKGRvbS5wYXJlbnROb2RlKVxuICAgICAgICAgIHJlbW92ZSgpXG4gICAgICAgIC8vIG90aGVyd2lzZSB3ZSBuZWVkIHRvIHdhaXQgdGhlIHVwZGF0ZWQgZXZlbnRcbiAgICAgICAgZWxzZSAodGFnLnBhcmVudCB8fCB0YWcpLm9uZSgndXBkYXRlZCcsIHJlbW92ZSlcblxuICAgICAgICBkb20uaW5TdHViID0gdHJ1ZVxuICAgICAgfVxuICAgIC8vIHNob3cgLyBoaWRlXG4gICAgfSBlbHNlIGlmIChhdHRyTmFtZSA9PT0gJ3Nob3cnKSB7XG4gICAgICBkb20uc3R5bGUuZGlzcGxheSA9IHZhbHVlID8gJycgOiAnbm9uZSdcblxuICAgIH0gZWxzZSBpZiAoYXR0ck5hbWUgPT09ICdoaWRlJykge1xuICAgICAgZG9tLnN0eWxlLmRpc3BsYXkgPSB2YWx1ZSA/ICdub25lJyA6ICcnXG5cbiAgICB9IGVsc2UgaWYgKGV4cHIuYm9vbCkge1xuICAgICAgZG9tW2F0dHJOYW1lXSA9IHZhbHVlXG4gICAgICBpZiAodmFsdWUpIHNldEF0dHIoZG9tLCBhdHRyTmFtZSwgYXR0ck5hbWUpXG4gICAgICBpZiAoRklSRUZPWCAmJiBhdHRyTmFtZSA9PT0gJ3NlbGVjdGVkJyAmJiBkb20udGFnTmFtZSA9PT0gJ09QVElPTicpIHtcbiAgICAgICAgZG9tLl9fcmlvdDEzNzQgPSB2YWx1ZSAgIC8vICMxMzc0XG4gICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSAwIHx8IHZhbHVlICYmIHR5cGVvZiB2YWx1ZSAhPT0gVF9PQkpFQ1QpIHtcbiAgICAgIC8vIDxpbWcgc3JjPVwieyBleHByIH1cIj5cbiAgICAgIGlmIChzdGFydHNXaXRoKGF0dHJOYW1lLCBSSU9UX1BSRUZJWCkgJiYgYXR0ck5hbWUgIT0gUklPVF9UQUcpIHtcbiAgICAgICAgYXR0ck5hbWUgPSBhdHRyTmFtZS5zbGljZShSSU9UX1BSRUZJWC5sZW5ndGgpXG4gICAgICB9XG4gICAgICBzZXRBdHRyKGRvbSwgYXR0ck5hbWUsIHZhbHVlKVxuICAgIH1cblxuICB9KVxuXG59XG4vKipcbiAqIFNwZWNpYWxpemVkIGZ1bmN0aW9uIGZvciBsb29waW5nIGFuIGFycmF5LWxpa2UgY29sbGVjdGlvbiB3aXRoIGBlYWNoPXt9YFxuICogQHBhcmFtICAgeyBBcnJheSB9IGVscyAtIGNvbGxlY3Rpb24gb2YgaXRlbXNcbiAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gZm4gLSBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybnMgeyBBcnJheSB9IHRoZSBhcnJheSBsb29wZWRcbiAqL1xuZnVuY3Rpb24gZWFjaChlbHMsIGZuKSB7XG4gIHZhciBsZW4gPSBlbHMgPyBlbHMubGVuZ3RoIDogMFxuXG4gIGZvciAodmFyIGkgPSAwLCBlbDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZWwgPSBlbHNbaV1cbiAgICAvLyByZXR1cm4gZmFsc2UgLT4gY3VycmVudCBpdGVtIHdhcyByZW1vdmVkIGJ5IGZuIGR1cmluZyB0aGUgbG9vcFxuICAgIGlmIChlbCAhPSBudWxsICYmIGZuKGVsLCBpKSA9PT0gZmFsc2UpIGktLVxuICB9XG4gIHJldHVybiBlbHNcbn1cblxuLyoqXG4gKiBEZXRlY3QgaWYgdGhlIGFyZ3VtZW50IHBhc3NlZCBpcyBhIGZ1bmN0aW9uXG4gKiBAcGFyYW0gICB7ICogfSB2IC0gd2hhdGV2ZXIgeW91IHdhbnQgdG8gcGFzcyB0byB0aGlzIGZ1bmN0aW9uXG4gKiBAcmV0dXJucyB7IEJvb2xlYW4gfSAtXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odikge1xuICByZXR1cm4gdHlwZW9mIHYgPT09IFRfRlVOQ1RJT04gfHwgZmFsc2UgICAvLyBhdm9pZCBJRSBwcm9ibGVtc1xufVxuXG4vKipcbiAqIEdldCB0aGUgb3V0ZXIgaHRtbCBvZiBhbnkgRE9NIG5vZGUgU1ZHcyBpbmNsdWRlZFxuICogQHBhcmFtICAgeyBPYmplY3QgfSBlbCAtIERPTSBub2RlIHRvIHBhcnNlXG4gKiBAcmV0dXJucyB7IFN0cmluZyB9IGVsLm91dGVySFRNTFxuICovXG5mdW5jdGlvbiBnZXRPdXRlckhUTUwoZWwpIHtcbiAgaWYgKGVsLm91dGVySFRNTCkgcmV0dXJuIGVsLm91dGVySFRNTFxuICAvLyBzb21lIGJyb3dzZXJzIGRvIG5vdCBzdXBwb3J0IG91dGVySFRNTCBvbiB0aGUgU1ZHcyB0YWdzXG4gIGVsc2Uge1xuICAgIHZhciBjb250YWluZXIgPSBta0VsKCdkaXYnKVxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlbC5jbG9uZU5vZGUodHJ1ZSkpXG4gICAgcmV0dXJuIGNvbnRhaW5lci5pbm5lckhUTUxcbiAgfVxufVxuXG4vKipcbiAqIFNldCB0aGUgaW5uZXIgaHRtbCBvZiBhbnkgRE9NIG5vZGUgU1ZHcyBpbmNsdWRlZFxuICogQHBhcmFtIHsgT2JqZWN0IH0gY29udGFpbmVyIC0gRE9NIG5vZGUgd2hlcmUgd2Ugd2lsbCBpbmplY3QgdGhlIG5ldyBodG1sXG4gKiBAcGFyYW0geyBTdHJpbmcgfSBodG1sIC0gaHRtbCB0byBpbmplY3RcbiAqL1xuZnVuY3Rpb24gc2V0SW5uZXJIVE1MKGNvbnRhaW5lciwgaHRtbCkge1xuICBpZiAodHlwZW9mIGNvbnRhaW5lci5pbm5lckhUTUwgIT0gVF9VTkRFRikgY29udGFpbmVyLmlubmVySFRNTCA9IGh0bWxcbiAgLy8gc29tZSBicm93c2VycyBkbyBub3Qgc3VwcG9ydCBpbm5lckhUTUwgb24gdGhlIFNWR3MgdGFnc1xuICBlbHNlIHtcbiAgICB2YXIgZG9jID0gbmV3IERPTVBhcnNlcigpLnBhcnNlRnJvbVN0cmluZyhodG1sLCAnYXBwbGljYXRpb24veG1sJylcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoXG4gICAgICBjb250YWluZXIub3duZXJEb2N1bWVudC5pbXBvcnROb2RlKGRvYy5kb2N1bWVudEVsZW1lbnQsIHRydWUpXG4gICAgKVxuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIHdldGhlciBhIERPTSBub2RlIG11c3QgYmUgY29uc2lkZXJlZCBwYXJ0IG9mIGFuIHN2ZyBkb2N1bWVudFxuICogQHBhcmFtICAgeyBTdHJpbmcgfSAgbmFtZSAtIHRhZyBuYW1lXG4gKiBAcmV0dXJucyB7IEJvb2xlYW4gfSAtXG4gKi9cbmZ1bmN0aW9uIGlzU1ZHVGFnKG5hbWUpIHtcbiAgcmV0dXJuIH5TVkdfVEFHU19MSVNULmluZGV4T2YobmFtZSlcbn1cblxuLyoqXG4gKiBEZXRlY3QgaWYgdGhlIGFyZ3VtZW50IHBhc3NlZCBpcyBhbiBvYmplY3QsIGV4Y2x1ZGUgbnVsbC5cbiAqIE5PVEU6IFVzZSBpc09iamVjdCh4KSAmJiAhaXNBcnJheSh4KSB0byBleGNsdWRlcyBhcnJheXMuXG4gKiBAcGFyYW0gICB7ICogfSB2IC0gd2hhdGV2ZXIgeW91IHdhbnQgdG8gcGFzcyB0byB0aGlzIGZ1bmN0aW9uXG4gKiBAcmV0dXJucyB7IEJvb2xlYW4gfSAtXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHYpIHtcbiAgcmV0dXJuIHYgJiYgdHlwZW9mIHYgPT09IFRfT0JKRUNUICAgICAgICAgLy8gdHlwZW9mIG51bGwgaXMgJ29iamVjdCdcbn1cblxuLyoqXG4gKiBSZW1vdmUgYW55IERPTSBhdHRyaWJ1dGUgZnJvbSBhIG5vZGVcbiAqIEBwYXJhbSAgIHsgT2JqZWN0IH0gZG9tIC0gRE9NIG5vZGUgd2Ugd2FudCB0byB1cGRhdGVcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gbmFtZSAtIG5hbWUgb2YgdGhlIHByb3BlcnR5IHdlIHdhbnQgdG8gcmVtb3ZlXG4gKi9cbmZ1bmN0aW9uIHJlbUF0dHIoZG9tLCBuYW1lKSB7XG4gIGRvbS5yZW1vdmVBdHRyaWJ1dGUobmFtZSlcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIGNvbnRhaW5pbmcgZGFzaGVzIHRvIGNhbWVsIGNhc2VcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gc3RyaW5nIC0gaW5wdXQgc3RyaW5nXG4gKiBAcmV0dXJucyB7IFN0cmluZyB9IG15LXN0cmluZyAtPiBteVN0cmluZ1xuICovXG5mdW5jdGlvbiB0b0NhbWVsKHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoLy0oXFx3KS9nLCBmdW5jdGlvbihfLCBjKSB7XG4gICAgcmV0dXJuIGMudG9VcHBlckNhc2UoKVxuICB9KVxufVxuXG4vKipcbiAqIEdldCB0aGUgdmFsdWUgb2YgYW55IERPTSBhdHRyaWJ1dGUgb24gYSBub2RlXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGRvbSAtIERPTSBub2RlIHdlIHdhbnQgdG8gcGFyc2VcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gbmFtZSAtIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZSB3ZSB3YW50IHRvIGdldFxuICogQHJldHVybnMgeyBTdHJpbmcgfCB1bmRlZmluZWQgfSBuYW1lIG9mIHRoZSBub2RlIGF0dHJpYnV0ZSB3aGV0aGVyIGl0IGV4aXN0c1xuICovXG5mdW5jdGlvbiBnZXRBdHRyKGRvbSwgbmFtZSkge1xuICByZXR1cm4gZG9tLmdldEF0dHJpYnV0ZShuYW1lKVxufVxuXG4vKipcbiAqIFNldCBhbnkgRE9NIGF0dHJpYnV0ZVxuICogQHBhcmFtIHsgT2JqZWN0IH0gZG9tIC0gRE9NIG5vZGUgd2Ugd2FudCB0byB1cGRhdGVcbiAqIEBwYXJhbSB7IFN0cmluZyB9IG5hbWUgLSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB3ZSB3YW50IHRvIHNldFxuICogQHBhcmFtIHsgU3RyaW5nIH0gdmFsIC0gdmFsdWUgb2YgdGhlIHByb3BlcnR5IHdlIHdhbnQgdG8gc2V0XG4gKi9cbmZ1bmN0aW9uIHNldEF0dHIoZG9tLCBuYW1lLCB2YWwpIHtcbiAgZG9tLnNldEF0dHJpYnV0ZShuYW1lLCB2YWwpXG59XG5cbi8qKlxuICogRGV0ZWN0IHRoZSB0YWcgaW1wbGVtZW50YXRpb24gYnkgYSBET00gbm9kZVxuICogQHBhcmFtICAgeyBPYmplY3QgfSBkb20gLSBET00gbm9kZSB3ZSBuZWVkIHRvIHBhcnNlIHRvIGdldCBpdHMgdGFnIGltcGxlbWVudGF0aW9uXG4gKiBAcmV0dXJucyB7IE9iamVjdCB9IGl0IHJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY3VzdG9tIHRhZyAodGVtcGxhdGUgYW5kIGJvb3QgZnVuY3Rpb24pXG4gKi9cbmZ1bmN0aW9uIGdldFRhZyhkb20pIHtcbiAgcmV0dXJuIGRvbS50YWdOYW1lICYmIF9fdGFnSW1wbFtnZXRBdHRyKGRvbSwgUklPVF9UQUdfSVMpIHx8XG4gICAgZ2V0QXR0cihkb20sIFJJT1RfVEFHKSB8fCBkb20udGFnTmFtZS50b0xvd2VyQ2FzZSgpXVxufVxuLyoqXG4gKiBBZGQgYSBjaGlsZCB0YWcgdG8gaXRzIHBhcmVudCBpbnRvIHRoZSBgdGFnc2Agb2JqZWN0XG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IHRhZyAtIGNoaWxkIHRhZyBpbnN0YW5jZVxuICogQHBhcmFtICAgeyBTdHJpbmcgfSB0YWdOYW1lIC0ga2V5IHdoZXJlIHRoZSBuZXcgdGFnIHdpbGwgYmUgc3RvcmVkXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IHBhcmVudCAtIHRhZyBpbnN0YW5jZSB3aGVyZSB0aGUgbmV3IGNoaWxkIHRhZyB3aWxsIGJlIGluY2x1ZGVkXG4gKi9cbmZ1bmN0aW9uIGFkZENoaWxkVGFnKHRhZywgdGFnTmFtZSwgcGFyZW50KSB7XG4gIHZhciBjYWNoZWRUYWcgPSBwYXJlbnQudGFnc1t0YWdOYW1lXVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBjaGlsZHJlbiB0YWdzIGhhdmluZyB0aGUgc2FtZSBuYW1lXG4gIGlmIChjYWNoZWRUYWcpIHtcbiAgICAvLyBpZiB0aGUgcGFyZW50IHRhZ3MgcHJvcGVydHkgaXMgbm90IHlldCBhbiBhcnJheVxuICAgIC8vIGNyZWF0ZSBpdCBhZGRpbmcgdGhlIGZpcnN0IGNhY2hlZCB0YWdcbiAgICBpZiAoIWlzQXJyYXkoY2FjaGVkVGFnKSlcbiAgICAgIC8vIGRvbid0IGFkZCB0aGUgc2FtZSB0YWcgdHdpY2VcbiAgICAgIGlmIChjYWNoZWRUYWcgIT09IHRhZylcbiAgICAgICAgcGFyZW50LnRhZ3NbdGFnTmFtZV0gPSBbY2FjaGVkVGFnXVxuICAgIC8vIGFkZCB0aGUgbmV3IG5lc3RlZCB0YWcgdG8gdGhlIGFycmF5XG4gICAgaWYgKCFjb250YWlucyhwYXJlbnQudGFnc1t0YWdOYW1lXSwgdGFnKSlcbiAgICAgIHBhcmVudC50YWdzW3RhZ05hbWVdLnB1c2godGFnKVxuICB9IGVsc2Uge1xuICAgIHBhcmVudC50YWdzW3RhZ05hbWVdID0gdGFnXG4gIH1cbn1cblxuLyoqXG4gKiBNb3ZlIHRoZSBwb3NpdGlvbiBvZiBhIGN1c3RvbSB0YWcgaW4gaXRzIHBhcmVudCB0YWdcbiAqIEBwYXJhbSAgIHsgT2JqZWN0IH0gdGFnIC0gY2hpbGQgdGFnIGluc3RhbmNlXG4gKiBAcGFyYW0gICB7IFN0cmluZyB9IHRhZ05hbWUgLSBrZXkgd2hlcmUgdGhlIHRhZyB3YXMgc3RvcmVkXG4gKiBAcGFyYW0gICB7IE51bWJlciB9IG5ld1BvcyAtIGluZGV4IHdoZXJlIHRoZSBuZXcgdGFnIHdpbGwgYmUgc3RvcmVkXG4gKi9cbmZ1bmN0aW9uIG1vdmVDaGlsZFRhZyh0YWcsIHRhZ05hbWUsIG5ld1Bvcykge1xuICB2YXIgcGFyZW50ID0gdGFnLnBhcmVudCxcbiAgICB0YWdzXG4gIC8vIG5vIHBhcmVudCBubyBtb3ZlXG4gIGlmICghcGFyZW50KSByZXR1cm5cblxuICB0YWdzID0gcGFyZW50LnRhZ3NbdGFnTmFtZV1cblxuICBpZiAoaXNBcnJheSh0YWdzKSlcbiAgICB0YWdzLnNwbGljZShuZXdQb3MsIDAsIHRhZ3Muc3BsaWNlKHRhZ3MuaW5kZXhPZih0YWcpLCAxKVswXSlcbiAgZWxzZSBhZGRDaGlsZFRhZyh0YWcsIHRhZ05hbWUsIHBhcmVudClcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgY2hpbGQgdGFnIGluY2x1ZGluZyBpdCBjb3JyZWN0bHkgaW50byBpdHMgcGFyZW50XG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGNoaWxkIC0gY2hpbGQgdGFnIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IG9wdHMgLSB0YWcgb3B0aW9ucyBjb250YWluaW5nIHRoZSBET00gbm9kZSB3aGVyZSB0aGUgdGFnIHdpbGwgYmUgbW91bnRlZFxuICogQHBhcmFtICAgeyBTdHJpbmcgfSBpbm5lckhUTUwgLSBpbm5lciBodG1sIG9mIHRoZSBjaGlsZCBub2RlXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IHBhcmVudCAtIGluc3RhbmNlIG9mIHRoZSBwYXJlbnQgdGFnIGluY2x1ZGluZyB0aGUgY2hpbGQgY3VzdG9tIHRhZ1xuICogQHJldHVybnMgeyBPYmplY3QgfSBpbnN0YW5jZSBvZiB0aGUgbmV3IGNoaWxkIHRhZyBqdXN0IGNyZWF0ZWRcbiAqL1xuZnVuY3Rpb24gaW5pdENoaWxkVGFnKGNoaWxkLCBvcHRzLCBpbm5lckhUTUwsIHBhcmVudCkge1xuICB2YXIgdGFnID0gbmV3IFRhZyhjaGlsZCwgb3B0cywgaW5uZXJIVE1MKSxcbiAgICB0YWdOYW1lID0gZ2V0VGFnTmFtZShvcHRzLnJvb3QpLFxuICAgIHB0YWcgPSBnZXRJbW1lZGlhdGVDdXN0b21QYXJlbnRUYWcocGFyZW50KVxuICAvLyBmaXggZm9yIHRoZSBwYXJlbnQgYXR0cmlidXRlIGluIHRoZSBsb29wZWQgZWxlbWVudHNcbiAgdGFnLnBhcmVudCA9IHB0YWdcbiAgLy8gc3RvcmUgdGhlIHJlYWwgcGFyZW50IHRhZ1xuICAvLyBpbiBzb21lIGNhc2VzIHRoaXMgY291bGQgYmUgZGlmZmVyZW50IGZyb20gdGhlIGN1c3RvbSBwYXJlbnQgdGFnXG4gIC8vIGZvciBleGFtcGxlIGluIG5lc3RlZCBsb29wc1xuICB0YWcuX3BhcmVudCA9IHBhcmVudFxuXG4gIC8vIGFkZCB0aGlzIHRhZyB0byB0aGUgY3VzdG9tIHBhcmVudCB0YWdcbiAgYWRkQ2hpbGRUYWcodGFnLCB0YWdOYW1lLCBwdGFnKVxuICAvLyBhbmQgYWxzbyB0byB0aGUgcmVhbCBwYXJlbnQgdGFnXG4gIGlmIChwdGFnICE9PSBwYXJlbnQpXG4gICAgYWRkQ2hpbGRUYWcodGFnLCB0YWdOYW1lLCBwYXJlbnQpXG4gIC8vIGVtcHR5IHRoZSBjaGlsZCBub2RlIG9uY2Ugd2UgZ290IGl0cyB0ZW1wbGF0ZVxuICAvLyB0byBhdm9pZCB0aGF0IGl0cyBjaGlsZHJlbiBnZXQgY29tcGlsZWQgbXVsdGlwbGUgdGltZXNcbiAgb3B0cy5yb290LmlubmVySFRNTCA9ICcnXG5cbiAgcmV0dXJuIHRhZ1xufVxuXG4vKipcbiAqIExvb3AgYmFja3dhcmQgYWxsIHRoZSBwYXJlbnRzIHRyZWUgdG8gZGV0ZWN0IHRoZSBmaXJzdCBjdXN0b20gcGFyZW50IHRhZ1xuICogQHBhcmFtICAgeyBPYmplY3QgfSB0YWcgLSBhIFRhZyBpbnN0YW5jZVxuICogQHJldHVybnMgeyBPYmplY3QgfSB0aGUgaW5zdGFuY2Ugb2YgdGhlIGZpcnN0IGN1c3RvbSBwYXJlbnQgdGFnIGZvdW5kXG4gKi9cbmZ1bmN0aW9uIGdldEltbWVkaWF0ZUN1c3RvbVBhcmVudFRhZyh0YWcpIHtcbiAgdmFyIHB0YWcgPSB0YWdcbiAgd2hpbGUgKCFnZXRUYWcocHRhZy5yb290KSkge1xuICAgIGlmICghcHRhZy5wYXJlbnQpIGJyZWFrXG4gICAgcHRhZyA9IHB0YWcucGFyZW50XG4gIH1cbiAgcmV0dXJuIHB0YWdcbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gc2V0IGFuIGltbXV0YWJsZSBwcm9wZXJ0eVxuICogQHBhcmFtICAgeyBPYmplY3QgfSBlbCAtIG9iamVjdCB3aGVyZSB0aGUgbmV3IHByb3BlcnR5IHdpbGwgYmUgc2V0XG4gKiBAcGFyYW0gICB7IFN0cmluZyB9IGtleSAtIG9iamVjdCBrZXkgd2hlcmUgdGhlIG5ldyBwcm9wZXJ0eSB3aWxsIGJlIHN0b3JlZFxuICogQHBhcmFtICAgeyAqIH0gdmFsdWUgLSB2YWx1ZSBvZiB0aGUgbmV3IHByb3BlcnR5XG4qIEBwYXJhbSAgIHsgT2JqZWN0IH0gb3B0aW9ucyAtIHNldCB0aGUgcHJvcGVyeSBvdmVycmlkaW5nIHRoZSBkZWZhdWx0IG9wdGlvbnNcbiAqIEByZXR1cm5zIHsgT2JqZWN0IH0gLSB0aGUgaW5pdGlhbCBvYmplY3RcbiAqL1xuZnVuY3Rpb24gZGVmaW5lUHJvcGVydHkoZWwsIGtleSwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVsLCBrZXksIGV4dGVuZCh7XG4gICAgdmFsdWU6IHZhbHVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSwgb3B0aW9ucykpXG4gIHJldHVybiBlbFxufVxuXG4vKipcbiAqIEdldCB0aGUgdGFnIG5hbWUgb2YgYW55IERPTSBub2RlXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGRvbSAtIERPTSBub2RlIHdlIHdhbnQgdG8gcGFyc2VcbiAqIEByZXR1cm5zIHsgU3RyaW5nIH0gbmFtZSB0byBpZGVudGlmeSB0aGlzIGRvbSBub2RlIGluIHJpb3RcbiAqL1xuZnVuY3Rpb24gZ2V0VGFnTmFtZShkb20pIHtcbiAgdmFyIGNoaWxkID0gZ2V0VGFnKGRvbSksXG4gICAgbmFtZWRUYWcgPSBnZXRBdHRyKGRvbSwgJ25hbWUnKSxcbiAgICB0YWdOYW1lID0gbmFtZWRUYWcgJiYgIXRtcGwuaGFzRXhwcihuYW1lZFRhZykgP1xuICAgICAgICAgICAgICAgIG5hbWVkVGFnIDpcbiAgICAgICAgICAgICAgY2hpbGQgPyBjaGlsZC5uYW1lIDogZG9tLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuXG4gIHJldHVybiB0YWdOYW1lXG59XG5cbi8qKlxuICogRXh0ZW5kIGFueSBvYmplY3Qgd2l0aCBvdGhlciBwcm9wZXJ0aWVzXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IHNyYyAtIHNvdXJjZSBvYmplY3RcbiAqIEByZXR1cm5zIHsgT2JqZWN0IH0gdGhlIHJlc3VsdGluZyBleHRlbmRlZCBvYmplY3RcbiAqXG4gKiB2YXIgb2JqID0geyBmb286ICdiYXonIH1cbiAqIGV4dGVuZChvYmosIHtiYXI6ICdiYXInLCBmb286ICdiYXInfSlcbiAqIGNvbnNvbGUubG9nKG9iaikgPT4ge2JhcjogJ2JhcicsIGZvbzogJ2Jhcid9XG4gKlxuICovXG5mdW5jdGlvbiBleHRlbmQoc3JjKSB7XG4gIHZhciBvYmosIGFyZ3MgPSBhcmd1bWVudHNcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmdzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKG9iaiA9IGFyZ3NbaV0pIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgLy8gY2hlY2sgaWYgdGhpcyBwcm9wZXJ0eSBvZiB0aGUgc291cmNlIG9iamVjdCBjb3VsZCBiZSBvdmVycmlkZGVuXG4gICAgICAgIGlmIChpc1dyaXRhYmxlKHNyYywga2V5KSlcbiAgICAgICAgICBzcmNba2V5XSA9IG9ialtrZXldXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBzcmNcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIGFycmF5IGNvbnRhaW5zIGFuIGl0ZW1cbiAqIEBwYXJhbSAgIHsgQXJyYXkgfSBhcnIgLSB0YXJnZXQgYXJyYXlcbiAqIEBwYXJhbSAgIHsgKiB9IGl0ZW0gLSBpdGVtIHRvIHRlc3RcbiAqIEByZXR1cm5zIHsgQm9vbGVhbiB9IERvZXMgJ2FycicgY29udGFpbiAnaXRlbSc/XG4gKi9cbmZ1bmN0aW9uIGNvbnRhaW5zKGFyciwgaXRlbSkge1xuICByZXR1cm4gfmFyci5pbmRleE9mKGl0ZW0pXG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhbiBvYmplY3QgaXMgYSBraW5kIG9mIGFycmF5XG4gKiBAcGFyYW0gICB7ICogfSBhIC0gYW55dGhpbmdcbiAqIEByZXR1cm5zIHtCb29sZWFufSBpcyAnYScgYW4gYXJyYXk/XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXkoYSkgeyByZXR1cm4gQXJyYXkuaXNBcnJheShhKSB8fCBhIGluc3RhbmNlb2YgQXJyYXkgfVxuXG4vKipcbiAqIERldGVjdCB3aGV0aGVyIGEgcHJvcGVydHkgb2YgYW4gb2JqZWN0IGNvdWxkIGJlIG92ZXJyaWRkZW5cbiAqIEBwYXJhbSAgIHsgT2JqZWN0IH0gIG9iaiAtIHNvdXJjZSBvYmplY3RcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gIGtleSAtIG9iamVjdCBwcm9wZXJ0eVxuICogQHJldHVybnMgeyBCb29sZWFuIH0gaXMgdGhpcyBwcm9wZXJ0eSB3cml0YWJsZT9cbiAqL1xuZnVuY3Rpb24gaXNXcml0YWJsZShvYmosIGtleSkge1xuICB2YXIgcHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwga2V5KVxuICByZXR1cm4gdHlwZW9mIG9ialtrZXldID09PSBUX1VOREVGIHx8IHByb3BzICYmIHByb3BzLndyaXRhYmxlXG59XG5cblxuLyoqXG4gKiBXaXRoIHRoaXMgZnVuY3Rpb24gd2UgYXZvaWQgdGhhdCB0aGUgaW50ZXJuYWwgVGFnIG1ldGhvZHMgZ2V0IG92ZXJyaWRkZW5cbiAqIEBwYXJhbSAgIHsgT2JqZWN0IH0gZGF0YSAtIG9wdGlvbnMgd2Ugd2FudCB0byB1c2UgdG8gZXh0ZW5kIHRoZSB0YWcgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHsgT2JqZWN0IH0gY2xlYW4gb2JqZWN0IHdpdGhvdXQgY29udGFpbmluZyB0aGUgcmlvdCBpbnRlcm5hbCByZXNlcnZlZCB3b3Jkc1xuICovXG5mdW5jdGlvbiBjbGVhblVwRGF0YShkYXRhKSB7XG4gIGlmICghKGRhdGEgaW5zdGFuY2VvZiBUYWcpICYmICEoZGF0YSAmJiB0eXBlb2YgZGF0YS50cmlnZ2VyID09IFRfRlVOQ1RJT04pKVxuICAgIHJldHVybiBkYXRhXG5cbiAgdmFyIG8gPSB7fVxuICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgIGlmICghUkVTRVJWRURfV09SRFNfQkxBQ0tMSVNULnRlc3Qoa2V5KSkgb1trZXldID0gZGF0YVtrZXldXG4gIH1cbiAgcmV0dXJuIG9cbn1cblxuLyoqXG4gKiBXYWxrIGRvd24gcmVjdXJzaXZlbHkgYWxsIHRoZSBjaGlsZHJlbiB0YWdzIHN0YXJ0aW5nIGRvbSBub2RlXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9ICAgZG9tIC0gc3RhcnRpbmcgbm9kZSB3aGVyZSB3ZSB3aWxsIHN0YXJ0IHRoZSByZWN1cnNpb25cbiAqIEBwYXJhbSAgIHsgRnVuY3Rpb24gfSBmbiAtIGNhbGxiYWNrIHRvIHRyYW5zZm9ybSB0aGUgY2hpbGQgbm9kZSBqdXN0IGZvdW5kXG4gKi9cbmZ1bmN0aW9uIHdhbGsoZG9tLCBmbikge1xuICBpZiAoZG9tKSB7XG4gICAgLy8gc3RvcCB0aGUgcmVjdXJzaW9uXG4gICAgaWYgKGZuKGRvbSkgPT09IGZhbHNlKSByZXR1cm5cbiAgICBlbHNlIHtcbiAgICAgIGRvbSA9IGRvbS5maXJzdENoaWxkXG5cbiAgICAgIHdoaWxlIChkb20pIHtcbiAgICAgICAgd2Fsayhkb20sIGZuKVxuICAgICAgICBkb20gPSBkb20ubmV4dFNpYmxpbmdcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBNaW5pbWl6ZSByaXNrOiBvbmx5IHplcm8gb3Igb25lIF9zcGFjZV8gYmV0d2VlbiBhdHRyICYgdmFsdWVcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gICBodG1sIC0gaHRtbCBzdHJpbmcgd2Ugd2FudCB0byBwYXJzZVxuICogQHBhcmFtICAgeyBGdW5jdGlvbiB9IGZuIC0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gYXBwbHkgb24gYW55IGF0dHJpYnV0ZSBmb3VuZFxuICovXG5mdW5jdGlvbiB3YWxrQXR0cmlidXRlcyhodG1sLCBmbikge1xuICB2YXIgbSxcbiAgICByZSA9IC8oWy1cXHddKykgPz0gPyg/OlwiKFteXCJdKil8JyhbXiddKil8KHtbXn1dKn0pKS9nXG5cbiAgd2hpbGUgKG0gPSByZS5leGVjKGh0bWwpKSB7XG4gICAgZm4obVsxXS50b0xvd2VyQ2FzZSgpLCBtWzJdIHx8IG1bM10gfHwgbVs0XSlcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYSBET00gbm9kZSBpcyBpbiBzdHViIG1vZGUsIHVzZWZ1bCBmb3IgdGhlIHJpb3QgJ2lmJyBkaXJlY3RpdmVcbiAqIEBwYXJhbSAgIHsgT2JqZWN0IH0gIGRvbSAtIERPTSBub2RlIHdlIHdhbnQgdG8gcGFyc2VcbiAqIEByZXR1cm5zIHsgQm9vbGVhbiB9IC1cbiAqL1xuZnVuY3Rpb24gaXNJblN0dWIoZG9tKSB7XG4gIHdoaWxlIChkb20pIHtcbiAgICBpZiAoZG9tLmluU3R1YikgcmV0dXJuIHRydWVcbiAgICBkb20gPSBkb20ucGFyZW50Tm9kZVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIGdlbmVyaWMgRE9NIG5vZGVcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gbmFtZSAtIG5hbWUgb2YgdGhlIERPTSBub2RlIHdlIHdhbnQgdG8gY3JlYXRlXG4gKiBAcGFyYW0gICB7IEJvb2xlYW4gfSBpc1N2ZyAtIHNob3VsZCB3ZSB1c2UgYSBTVkcgYXMgcGFyZW50IG5vZGU/XG4gKiBAcmV0dXJucyB7IE9iamVjdCB9IERPTSBub2RlIGp1c3QgY3JlYXRlZFxuICovXG5mdW5jdGlvbiBta0VsKG5hbWUsIGlzU3ZnKSB7XG4gIHJldHVybiBpc1N2ZyA/XG4gICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdzdmcnKSA6XG4gICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKVxufVxuXG4vKipcbiAqIFNob3J0ZXIgYW5kIGZhc3Qgd2F5IHRvIHNlbGVjdCBtdWx0aXBsZSBub2RlcyBpbiB0aGUgRE9NXG4gKiBAcGFyYW0gICB7IFN0cmluZyB9IHNlbGVjdG9yIC0gRE9NIHNlbGVjdG9yXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGN0eCAtIERPTSBub2RlIHdoZXJlIHRoZSB0YXJnZXRzIG9mIG91ciBzZWFyY2ggd2lsbCBpcyBsb2NhdGVkXG4gKiBAcmV0dXJucyB7IE9iamVjdCB9IGRvbSBub2RlcyBmb3VuZFxuICovXG5mdW5jdGlvbiAkJChzZWxlY3RvciwgY3R4KSB7XG4gIHJldHVybiAoY3R4IHx8IGRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKVxufVxuXG4vKipcbiAqIFNob3J0ZXIgYW5kIGZhc3Qgd2F5IHRvIHNlbGVjdCBhIHNpbmdsZSBub2RlIGluIHRoZSBET01cbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gc2VsZWN0b3IgLSB1bmlxdWUgZG9tIHNlbGVjdG9yXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGN0eCAtIERPTSBub2RlIHdoZXJlIHRoZSB0YXJnZXQgb2Ygb3VyIHNlYXJjaCB3aWxsIGlzIGxvY2F0ZWRcbiAqIEByZXR1cm5zIHsgT2JqZWN0IH0gZG9tIG5vZGUgZm91bmRcbiAqL1xuZnVuY3Rpb24gJChzZWxlY3RvciwgY3R4KSB7XG4gIHJldHVybiAoY3R4IHx8IGRvY3VtZW50KS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKVxufVxuXG4vKipcbiAqIFNpbXBsZSBvYmplY3QgcHJvdG90eXBhbCBpbmhlcml0YW5jZVxuICogQHBhcmFtICAgeyBPYmplY3QgfSBwYXJlbnQgLSBwYXJlbnQgb2JqZWN0XG4gKiBAcmV0dXJucyB7IE9iamVjdCB9IGNoaWxkIGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIGluaGVyaXQocGFyZW50KSB7XG4gIGZ1bmN0aW9uIENoaWxkKCkge31cbiAgQ2hpbGQucHJvdG90eXBlID0gcGFyZW50XG4gIHJldHVybiBuZXcgQ2hpbGQoKVxufVxuXG4vKipcbiAqIEdldCB0aGUgbmFtZSBwcm9wZXJ0eSBuZWVkZWQgdG8gaWRlbnRpZnkgYSBET00gbm9kZSBpbiByaW90XG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IGRvbSAtIERPTSBub2RlIHdlIG5lZWQgdG8gcGFyc2VcbiAqIEByZXR1cm5zIHsgU3RyaW5nIHwgdW5kZWZpbmVkIH0gZ2l2ZSB1cyBiYWNrIGEgc3RyaW5nIHRvIGlkZW50aWZ5IHRoaXMgZG9tIG5vZGVcbiAqL1xuZnVuY3Rpb24gZ2V0TmFtZWRLZXkoZG9tKSB7XG4gIHJldHVybiBnZXRBdHRyKGRvbSwgJ2lkJykgfHwgZ2V0QXR0cihkb20sICduYW1lJylcbn1cblxuLyoqXG4gKiBTZXQgdGhlIG5hbWVkIHByb3BlcnRpZXMgb2YgYSB0YWcgZWxlbWVudFxuICogQHBhcmFtIHsgT2JqZWN0IH0gZG9tIC0gRE9NIG5vZGUgd2UgbmVlZCB0byBwYXJzZVxuICogQHBhcmFtIHsgT2JqZWN0IH0gcGFyZW50IC0gdGFnIGluc3RhbmNlIHdoZXJlIHRoZSBuYW1lZCBkb20gZWxlbWVudCB3aWxsIGJlIGV2ZW50dWFsbHkgYWRkZWRcbiAqIEBwYXJhbSB7IEFycmF5IH0ga2V5cyAtIGxpc3Qgb2YgYWxsIHRoZSB0YWcgaW5zdGFuY2UgcHJvcGVydGllc1xuICovXG5mdW5jdGlvbiBzZXROYW1lZChkb20sIHBhcmVudCwga2V5cykge1xuICAvLyBnZXQgdGhlIGtleSB2YWx1ZSB3ZSB3YW50IHRvIGFkZCB0byB0aGUgdGFnIGluc3RhbmNlXG4gIHZhciBrZXkgPSBnZXROYW1lZEtleShkb20pLFxuICAgIGlzQXJyLFxuICAgIC8vIGFkZCB0aGUgbm9kZSBkZXRlY3RlZCB0byBhIHRhZyBpbnN0YW5jZSB1c2luZyB0aGUgbmFtZWQgcHJvcGVydHlcbiAgICBhZGQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgLy8gYXZvaWQgdG8gb3ZlcnJpZGUgdGhlIHRhZyBwcm9wZXJ0aWVzIGFscmVhZHkgc2V0XG4gICAgICBpZiAoY29udGFpbnMoa2V5cywga2V5KSkgcmV0dXJuXG4gICAgICAvLyBjaGVjayB3aGV0aGVyIHRoaXMgdmFsdWUgaXMgYW4gYXJyYXlcbiAgICAgIGlzQXJyID0gaXNBcnJheSh2YWx1ZSlcbiAgICAgIC8vIGlmIHRoZSBrZXkgd2FzIG5ldmVyIHNldFxuICAgICAgaWYgKCF2YWx1ZSlcbiAgICAgICAgLy8gc2V0IGl0IG9uY2Ugb24gdGhlIHRhZyBpbnN0YW5jZVxuICAgICAgICBwYXJlbnRba2V5XSA9IGRvbVxuICAgICAgLy8gaWYgaXQgd2FzIGFuIGFycmF5IGFuZCBub3QgeWV0IHNldFxuICAgICAgZWxzZSBpZiAoIWlzQXJyIHx8IGlzQXJyICYmICFjb250YWlucyh2YWx1ZSwgZG9tKSkge1xuICAgICAgICAvLyBhZGQgdGhlIGRvbSBub2RlIGludG8gdGhlIGFycmF5XG4gICAgICAgIGlmIChpc0FycilcbiAgICAgICAgICB2YWx1ZS5wdXNoKGRvbSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHBhcmVudFtrZXldID0gW3ZhbHVlLCBkb21dXG4gICAgICB9XG4gICAgfVxuXG4gIC8vIHNraXAgdGhlIGVsZW1lbnRzIHdpdGggbm8gbmFtZWQgcHJvcGVydGllc1xuICBpZiAoIWtleSkgcmV0dXJuXG5cbiAgLy8gY2hlY2sgd2hldGhlciB0aGlzIGtleSBoYXMgYmVlbiBhbHJlYWR5IGV2YWx1YXRlZFxuICBpZiAodG1wbC5oYXNFeHByKGtleSkpXG4gICAgLy8gd2FpdCB0aGUgZmlyc3QgdXBkYXRlZCBldmVudCBvbmx5IG9uY2VcbiAgICBwYXJlbnQub25lKCdtb3VudCcsIGZ1bmN0aW9uKCkge1xuICAgICAga2V5ID0gZ2V0TmFtZWRLZXkoZG9tKVxuICAgICAgYWRkKHBhcmVudFtrZXldKVxuICAgIH0pXG4gIGVsc2VcbiAgICBhZGQocGFyZW50W2tleV0pXG5cbn1cblxuLyoqXG4gKiBGYXN0ZXIgU3RyaW5nIHN0YXJ0c1dpdGggYWx0ZXJuYXRpdmVcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gc3JjIC0gc291cmNlIHN0cmluZ1xuICogQHBhcmFtICAgeyBTdHJpbmcgfSBzdHIgLSB0ZXN0IHN0cmluZ1xuICogQHJldHVybnMgeyBCb29sZWFuIH0gLVxuICovXG5mdW5jdGlvbiBzdGFydHNXaXRoKHNyYywgc3RyKSB7XG4gIHJldHVybiBzcmMuc2xpY2UoMCwgc3RyLmxlbmd0aCkgPT09IHN0clxufVxuXG4vKipcbiAqIHJlcXVlc3RBbmltYXRpb25GcmFtZSBmdW5jdGlvblxuICogQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3BhdWxpcmlzaC8xNTc5NjcxLCBsaWNlbnNlIE1JVFxuICovXG52YXIgckFGID0gKGZ1bmN0aW9uICh3KSB7XG4gIHZhciByYWYgPSB3LnJlcXVlc3RBbmltYXRpb25GcmFtZSAgICB8fFxuICAgICAgICAgICAgdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblxuICBpZiAoIXJhZiB8fCAvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qody5uYXZpZ2F0b3IudXNlckFnZW50KSkgeyAgLy8gYnVnZ3kgaU9TNlxuICAgIHZhciBsYXN0VGltZSA9IDBcblxuICAgIHJhZiA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgdmFyIG5vd3RpbWUgPSBEYXRlLm5vdygpLCB0aW1lb3V0ID0gTWF0aC5tYXgoMTYgLSAobm93dGltZSAtIGxhc3RUaW1lKSwgMClcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBjYihsYXN0VGltZSA9IG5vd3RpbWUgKyB0aW1lb3V0KSB9LCB0aW1lb3V0KVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmFmXG5cbn0pKHdpbmRvdyB8fCB7fSlcblxuLyoqXG4gKiBNb3VudCBhIHRhZyBjcmVhdGluZyBuZXcgVGFnIGluc3RhbmNlXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IHJvb3QgLSBkb20gbm9kZSB3aGVyZSB0aGUgdGFnIHdpbGwgYmUgbW91bnRlZFxuICogQHBhcmFtICAgeyBTdHJpbmcgfSB0YWdOYW1lIC0gbmFtZSBvZiB0aGUgcmlvdCB0YWcgd2Ugd2FudCB0byBtb3VudFxuICogQHBhcmFtICAgeyBPYmplY3QgfSBvcHRzIC0gb3B0aW9ucyB0byBwYXNzIHRvIHRoZSBUYWcgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHsgVGFnIH0gYSBuZXcgVGFnIGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIG1vdW50VG8ocm9vdCwgdGFnTmFtZSwgb3B0cykge1xuICB2YXIgdGFnID0gX190YWdJbXBsW3RhZ05hbWVdLFxuICAgIC8vIGNhY2hlIHRoZSBpbm5lciBIVE1MIHRvIGZpeCAjODU1XG4gICAgaW5uZXJIVE1MID0gcm9vdC5faW5uZXJIVE1MID0gcm9vdC5faW5uZXJIVE1MIHx8IHJvb3QuaW5uZXJIVE1MXG5cbiAgLy8gY2xlYXIgdGhlIGlubmVyIGh0bWxcbiAgcm9vdC5pbm5lckhUTUwgPSAnJ1xuXG4gIGlmICh0YWcgJiYgcm9vdCkgdGFnID0gbmV3IFRhZyh0YWcsIHsgcm9vdDogcm9vdCwgb3B0czogb3B0cyB9LCBpbm5lckhUTUwpXG5cbiAgaWYgKHRhZyAmJiB0YWcubW91bnQpIHtcbiAgICB0YWcubW91bnQoKVxuICAgIC8vIGFkZCB0aGlzIHRhZyB0byB0aGUgdmlydHVhbERvbSB2YXJpYWJsZVxuICAgIGlmICghY29udGFpbnMoX192aXJ0dWFsRG9tLCB0YWcpKSBfX3ZpcnR1YWxEb20ucHVzaCh0YWcpXG4gIH1cblxuICByZXR1cm4gdGFnXG59XG4vKipcbiAqIFJpb3QgcHVibGljIGFwaVxuICovXG5cbi8vIHNoYXJlIG1ldGhvZHMgZm9yIG90aGVyIHJpb3QgcGFydHMsIGUuZy4gY29tcGlsZXJcbnJpb3QudXRpbCA9IHsgYnJhY2tldHM6IGJyYWNrZXRzLCB0bXBsOiB0bXBsIH1cblxuLyoqXG4gKiBDcmVhdGUgYSBtaXhpbiB0aGF0IGNvdWxkIGJlIGdsb2JhbGx5IHNoYXJlZCBhY3Jvc3MgYWxsIHRoZSB0YWdzXG4gKi9cbnJpb3QubWl4aW4gPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBtaXhpbnMgPSB7fSxcbiAgICBnbG9iYWxzID0gbWl4aW5zW0dMT0JBTF9NSVhJTl0gPSB7fSxcbiAgICBfaWQgPSAwXG5cbiAgLyoqXG4gICAqIENyZWF0ZS9SZXR1cm4gYSBtaXhpbiBieSBpdHMgbmFtZVxuICAgKiBAcGFyYW0gICB7IFN0cmluZyB9ICBuYW1lIC0gbWl4aW4gbmFtZSAoZ2xvYmFsIG1peGluIGlmIG9iamVjdClcbiAgICogQHBhcmFtICAgeyBPYmplY3QgfSAgbWl4aW4gLSBtaXhpbiBsb2dpY1xuICAgKiBAcGFyYW0gICB7IEJvb2xlYW4gfSBnIC0gaXMgZ2xvYmFsP1xuICAgKiBAcmV0dXJucyB7IE9iamVjdCB9ICB0aGUgbWl4aW4gbG9naWNcbiAgICovXG4gIHJldHVybiBmdW5jdGlvbihuYW1lLCBtaXhpbiwgZykge1xuICAgIC8vIFVubmFtZWQgZ2xvYmFsXG4gICAgaWYgKGlzT2JqZWN0KG5hbWUpKSB7XG4gICAgICByaW90Lm1peGluKCdfX3VubmFtZWRfJytfaWQrKywgbmFtZSwgdHJ1ZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBzdG9yZSA9IGcgPyBnbG9iYWxzIDogbWl4aW5zXG5cbiAgICAvLyBHZXR0ZXJcbiAgICBpZiAoIW1peGluKSByZXR1cm4gc3RvcmVbbmFtZV1cbiAgICAvLyBTZXR0ZXJcbiAgICBzdG9yZVtuYW1lXSA9IGV4dGVuZChzdG9yZVtuYW1lXSB8fCB7fSwgbWl4aW4pXG4gIH1cblxufSkoKVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyByaW90IHRhZyBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtICAgeyBTdHJpbmcgfSAgIG5hbWUgLSBuYW1lL2lkIG9mIHRoZSBuZXcgcmlvdCB0YWdcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gICBodG1sIC0gdGFnIHRlbXBsYXRlXG4gKiBAcGFyYW0gICB7IFN0cmluZyB9ICAgY3NzIC0gY3VzdG9tIHRhZyBjc3NcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gICBhdHRycyAtIHJvb3QgdGFnIGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSAgIHsgRnVuY3Rpb24gfSBmbiAtIHVzZXIgZnVuY3Rpb25cbiAqIEByZXR1cm5zIHsgU3RyaW5nIH0gbmFtZS9pZCBvZiB0aGUgdGFnIGp1c3QgY3JlYXRlZFxuICovXG5yaW90LnRhZyA9IGZ1bmN0aW9uKG5hbWUsIGh0bWwsIGNzcywgYXR0cnMsIGZuKSB7XG4gIGlmIChpc0Z1bmN0aW9uKGF0dHJzKSkge1xuICAgIGZuID0gYXR0cnNcbiAgICBpZiAoL15bXFx3XFwtXStcXHM/PS8udGVzdChjc3MpKSB7XG4gICAgICBhdHRycyA9IGNzc1xuICAgICAgY3NzID0gJydcbiAgICB9IGVsc2UgYXR0cnMgPSAnJ1xuICB9XG4gIGlmIChjc3MpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjc3MpKSBmbiA9IGNzc1xuICAgIGVsc2Ugc3R5bGVNYW5hZ2VyLmFkZChjc3MpXG4gIH1cbiAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKVxuICBfX3RhZ0ltcGxbbmFtZV0gPSB7IG5hbWU6IG5hbWUsIHRtcGw6IGh0bWwsIGF0dHJzOiBhdHRycywgZm46IGZuIH1cbiAgcmV0dXJuIG5hbWVcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgcmlvdCB0YWcgaW1wbGVtZW50YXRpb24gKGZvciB1c2UgYnkgdGhlIGNvbXBpbGVyKVxuICogQHBhcmFtICAgeyBTdHJpbmcgfSAgIG5hbWUgLSBuYW1lL2lkIG9mIHRoZSBuZXcgcmlvdCB0YWdcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gICBodG1sIC0gdGFnIHRlbXBsYXRlXG4gKiBAcGFyYW0gICB7IFN0cmluZyB9ICAgY3NzIC0gY3VzdG9tIHRhZyBjc3NcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gICBhdHRycyAtIHJvb3QgdGFnIGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSAgIHsgRnVuY3Rpb24gfSBmbiAtIHVzZXIgZnVuY3Rpb25cbiAqIEByZXR1cm5zIHsgU3RyaW5nIH0gbmFtZS9pZCBvZiB0aGUgdGFnIGp1c3QgY3JlYXRlZFxuICovXG5yaW90LnRhZzIgPSBmdW5jdGlvbihuYW1lLCBodG1sLCBjc3MsIGF0dHJzLCBmbikge1xuICBpZiAoY3NzKSBzdHlsZU1hbmFnZXIuYWRkKGNzcylcbiAgLy9pZiAoYnBhaXIpIHJpb3Quc2V0dGluZ3MuYnJhY2tldHMgPSBicGFpclxuICBfX3RhZ0ltcGxbbmFtZV0gPSB7IG5hbWU6IG5hbWUsIHRtcGw6IGh0bWwsIGF0dHJzOiBhdHRycywgZm46IGZuIH1cbiAgcmV0dXJuIG5hbWVcbn1cblxuLyoqXG4gKiBNb3VudCBhIHRhZyB1c2luZyBhIHNwZWNpZmljIHRhZyBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtICAgeyBTdHJpbmcgfSBzZWxlY3RvciAtIHRhZyBET00gc2VsZWN0b3JcbiAqIEBwYXJhbSAgIHsgU3RyaW5nIH0gdGFnTmFtZSAtIHRhZyBpbXBsZW1lbnRhdGlvbiBuYW1lXG4gKiBAcGFyYW0gICB7IE9iamVjdCB9IG9wdHMgLSB0YWcgbG9naWNcbiAqIEByZXR1cm5zIHsgQXJyYXkgfSBuZXcgdGFncyBpbnN0YW5jZXNcbiAqL1xucmlvdC5tb3VudCA9IGZ1bmN0aW9uKHNlbGVjdG9yLCB0YWdOYW1lLCBvcHRzKSB7XG5cbiAgdmFyIGVscyxcbiAgICBhbGxUYWdzLFxuICAgIHRhZ3MgPSBbXVxuXG4gIC8vIGhlbHBlciBmdW5jdGlvbnNcblxuICBmdW5jdGlvbiBhZGRSaW90VGFncyhhcnIpIHtcbiAgICB2YXIgbGlzdCA9ICcnXG4gICAgZWFjaChhcnIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICBpZiAoIS9bXi1cXHddLy50ZXN0KGUpKSB7XG4gICAgICAgIGUgPSBlLnRyaW0oKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxpc3QgKz0gJyxbJyArIFJJT1RfVEFHX0lTICsgJz1cIicgKyBlICsgJ1wiXSxbJyArIFJJT1RfVEFHICsgJz1cIicgKyBlICsgJ1wiXSdcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsaXN0XG4gIH1cblxuICBmdW5jdGlvbiBzZWxlY3RBbGxUYWdzKCkge1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoX190YWdJbXBsKVxuICAgIHJldHVybiBrZXlzICsgYWRkUmlvdFRhZ3Moa2V5cylcbiAgfVxuXG4gIGZ1bmN0aW9uIHB1c2hUYWdzKHJvb3QpIHtcbiAgICBpZiAocm9vdC50YWdOYW1lKSB7XG4gICAgICB2YXIgcmlvdFRhZyA9IGdldEF0dHIocm9vdCwgUklPVF9UQUdfSVMpIHx8IGdldEF0dHIocm9vdCwgUklPVF9UQUcpXG5cbiAgICAgIC8vIGhhdmUgdGFnTmFtZT8gZm9yY2UgcmlvdC10YWcgdG8gYmUgdGhlIHNhbWVcbiAgICAgIGlmICh0YWdOYW1lICYmIHJpb3RUYWcgIT09IHRhZ05hbWUpIHtcbiAgICAgICAgcmlvdFRhZyA9IHRhZ05hbWVcbiAgICAgICAgc2V0QXR0cihyb290LCBSSU9UX1RBR19JUywgdGFnTmFtZSlcbiAgICAgICAgc2V0QXR0cihyb290LCBSSU9UX1RBRywgdGFnTmFtZSkgLy8gdGhpcyB3aWxsIGJlIHJlbW92ZWQgaW4gcmlvdCAzLjAuMFxuICAgICAgfVxuICAgICAgdmFyIHRhZyA9IG1vdW50VG8ocm9vdCwgcmlvdFRhZyB8fCByb290LnRhZ05hbWUudG9Mb3dlckNhc2UoKSwgb3B0cylcblxuICAgICAgaWYgKHRhZykgdGFncy5wdXNoKHRhZylcbiAgICB9IGVsc2UgaWYgKHJvb3QubGVuZ3RoKSB7XG4gICAgICBlYWNoKHJvb3QsIHB1c2hUYWdzKSAgIC8vIGFzc3VtZSBub2RlTGlzdFxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tIG1vdW50IGNvZGUgLS0tLS1cblxuICAvLyBpbmplY3Qgc3R5bGVzIGludG8gRE9NXG4gIHN0eWxlTWFuYWdlci5pbmplY3QoKVxuXG4gIGlmIChpc09iamVjdCh0YWdOYW1lKSkge1xuICAgIG9wdHMgPSB0YWdOYW1lXG4gICAgdGFnTmFtZSA9IDBcbiAgfVxuXG4gIC8vIGNyYXdsIHRoZSBET00gdG8gZmluZCB0aGUgdGFnXG4gIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFRfU1RSSU5HKSB7XG4gICAgaWYgKHNlbGVjdG9yID09PSAnKicpXG4gICAgICAvLyBzZWxlY3QgYWxsIHRoZSB0YWdzIHJlZ2lzdGVyZWRcbiAgICAgIC8vIGFuZCBhbHNvIHRoZSB0YWdzIGZvdW5kIHdpdGggdGhlIHJpb3QtdGFnIGF0dHJpYnV0ZSBzZXRcbiAgICAgIHNlbGVjdG9yID0gYWxsVGFncyA9IHNlbGVjdEFsbFRhZ3MoKVxuICAgIGVsc2VcbiAgICAgIC8vIG9yIGp1c3QgdGhlIG9uZXMgbmFtZWQgbGlrZSB0aGUgc2VsZWN0b3JcbiAgICAgIHNlbGVjdG9yICs9IGFkZFJpb3RUYWdzKHNlbGVjdG9yLnNwbGl0KC8sICovKSlcblxuICAgIC8vIG1ha2Ugc3VyZSB0byBwYXNzIGFsd2F5cyBhIHNlbGVjdG9yXG4gICAgLy8gdG8gdGhlIHF1ZXJ5U2VsZWN0b3JBbGwgZnVuY3Rpb25cbiAgICBlbHMgPSBzZWxlY3RvciA/ICQkKHNlbGVjdG9yKSA6IFtdXG4gIH1cbiAgZWxzZVxuICAgIC8vIHByb2JhYmx5IHlvdSBoYXZlIHBhc3NlZCBhbHJlYWR5IGEgdGFnIG9yIGEgTm9kZUxpc3RcbiAgICBlbHMgPSBzZWxlY3RvclxuXG4gIC8vIHNlbGVjdCBhbGwgdGhlIHJlZ2lzdGVyZWQgYW5kIG1vdW50IHRoZW0gaW5zaWRlIHRoZWlyIHJvb3QgZWxlbWVudHNcbiAgaWYgKHRhZ05hbWUgPT09ICcqJykge1xuICAgIC8vIGdldCBhbGwgY3VzdG9tIHRhZ3NcbiAgICB0YWdOYW1lID0gYWxsVGFncyB8fCBzZWxlY3RBbGxUYWdzKClcbiAgICAvLyBpZiB0aGUgcm9vdCBlbHMgaXQncyBqdXN0IGEgc2luZ2xlIHRhZ1xuICAgIGlmIChlbHMudGFnTmFtZSlcbiAgICAgIGVscyA9ICQkKHRhZ05hbWUsIGVscylcbiAgICBlbHNlIHtcbiAgICAgIC8vIHNlbGVjdCBhbGwgdGhlIGNoaWxkcmVuIGZvciBhbGwgdGhlIGRpZmZlcmVudCByb290IGVsZW1lbnRzXG4gICAgICB2YXIgbm9kZUxpc3QgPSBbXVxuICAgICAgZWFjaChlbHMsIGZ1bmN0aW9uIChfZWwpIHtcbiAgICAgICAgbm9kZUxpc3QucHVzaCgkJCh0YWdOYW1lLCBfZWwpKVxuICAgICAgfSlcbiAgICAgIGVscyA9IG5vZGVMaXN0XG4gICAgfVxuICAgIC8vIGdldCByaWQgb2YgdGhlIHRhZ05hbWVcbiAgICB0YWdOYW1lID0gMFxuICB9XG5cbiAgcHVzaFRhZ3MoZWxzKVxuXG4gIHJldHVybiB0YWdzXG59XG5cbi8qKlxuICogVXBkYXRlIGFsbCB0aGUgdGFncyBpbnN0YW5jZXMgY3JlYXRlZFxuICogQHJldHVybnMgeyBBcnJheSB9IGFsbCB0aGUgdGFncyBpbnN0YW5jZXNcbiAqL1xucmlvdC51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGVhY2goX192aXJ0dWFsRG9tLCBmdW5jdGlvbih0YWcpIHtcbiAgICB0YWcudXBkYXRlKClcbiAgfSlcbn1cblxuLyoqXG4gKiBFeHBvcnQgdGhlIFZpcnR1YWwgRE9NXG4gKi9cbnJpb3QudmRvbSA9IF9fdmlydHVhbERvbVxuXG4vKipcbiAqIEV4cG9ydCB0aGUgVGFnIGNvbnN0cnVjdG9yXG4gKi9cbnJpb3QuVGFnID0gVGFnXG4gIC8vIHN1cHBvcnQgQ29tbW9uSlMsIEFNRCAmIGJyb3dzZXJcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSBUX09CSkVDVClcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJpb3RcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gVF9GVU5DVElPTiAmJiB0eXBlb2YgZGVmaW5lLmFtZCAhPT0gVF9VTkRFRilcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiByaW90IH0pXG4gIGVsc2VcbiAgICB3aW5kb3cucmlvdCA9IHJpb3RcblxufSkodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHZvaWQgMCk7XG4iLCJpZiAodHlwZW9mIHdpbmRvdy5zZXRJbW1lZGlhdGUgIT09ICdmdW5jdGlvbicpIHtcclxuICAgIHdpbmRvdy5zZXRJbW1lZGlhdGUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xyXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxKTtcclxuICAgIH07XHJcbn1cclxuXHJcbnZhciBBc3luYyA9IHtcclxuICAgIGFkZDogZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IFtdO1xyXG4gICAgfSxcclxuICAgIHJ1bjogZnVuY3Rpb24ob25FYWNoLCBvbkVuZCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcyxcclxuICAgICAgICAgICAgaSA9IDAsXHJcbiAgICAgICAgICAgIHRvdGFsID0gdGhhdC5fY2FsbGJhY2tzLmxlbmd0aCxcclxuICAgICAgICAgICAgb25MYXN0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ2FzeW5jJyk7XHJcbiAgICAgICAgICAgICAgICBvbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5jbGVhcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnNvbGUudGltZSgnYXN5bmMnKTtcclxuXHJcbiAgICAgICAgaWYgKCF0b3RhbCkge1xyXG4gICAgICAgICAgICBvbkxhc3QoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIGVhY2goKSB7XHJcbiAgICAgICAgICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIG9uRWFjaChpLCB0b3RhbCk7XHJcbiAgICAgICAgICAgICAgICB0aGF0Ll9jYWxsYmFja3NbaV0oKTtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgICAgIGlmKGkgPj0gdG90YWwpIHtcclxuICAgICAgICAgICAgICAgICAgICBvbkxhc3QoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWFjaCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KSgpO1xyXG4gICAgfSxcclxuICAgIF9jYWxsYmFja3M6IFtdXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFzeW5jO1xyXG4iLCJ2YXIgQXN5bmMgPSByZXF1aXJlKCcuL2FzeW5jJyk7XHJcblxyXG52YXIgZXNjYXBlSFRNTCA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY2hyID0geyAnXCInOiAnJnF1b3Q7JywgJyYnOiAnJmFtcDsnLCAnPCc6ICcmbHQ7JywgJz4nOiAnJmd0OycgfTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGV4dCkge1xyXG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1tcXFwiJjw+XS9nLCBmdW5jdGlvbiAoYSkgeyByZXR1cm4gY2hyW2FdOyB9KTtcclxuICAgIH07XHJcbn0oKSk7XHJcblxyXG52YXIgR2VuZXJhdG9yID0ge1xyXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICB2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgdGhpcy5faW1hZ2VPYmplY3QgPSBpbWc7XHJcbiAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLl9zdGFydChkYXRhKTtcclxuICAgICAgICB9LmJpbmQodGhpcyk7XHJcbiAgICAgICAgaW1nLnNyYyA9IGRhdGEudXJsO1xyXG4gICAgfSxcclxuICAgIF9zdGFydDogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgIGlmICghdGhpcy5faXNJbml0ZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICAgICAgIHRoaXMuX2N0eENhbnZhcyA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5faXNJbml0ZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcclxuICAgICAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSB0aGlzLndpZHRoO1xyXG4gICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodDtcclxuXHJcbiAgICAgICAgdGhpcy5fY3R4Q2FudmFzLmRyYXdJbWFnZSh0aGlzLl9pbWFnZU9iamVjdCwgMCwgMCk7XHJcblxyXG4gICAgICAgIHRoaXMudGV4dCA9IHRoaXMudGV4dC5yZXBsYWNlKC9cXHIvZywgJycpO1xyXG5cclxuICAgICAgICB2YXIgcHJlcGFyZWRUZXh0ID0gdGhpcy5wcmVwYXJlVGV4dCgpLFxyXG4gICAgICAgICAgICBjb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGhvdG9fX3RleHQtcGhvdG8nKTtcclxuXHJcbiAgICAgICAgdGhpcy5fdGV4dFdpdGhvdXROID0gcHJlcGFyZWRUZXh0LnRleHRXaXRob3V0TjtcclxuXHJcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmZvbnRTaXplID0gdGhpcy5mb250U2l6ZSArICdweCc7XHJcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmZvbnRGYW1pbHkgPSB0aGlzLmZvbnRGYW1pbHk7XHJcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmxpbmVIZWlnaHQgPSB0aGlzLmxpbmVIZWlnaHQgKyAncHgnO1xyXG4gICAgICAgIGNvbnRhaW5lci5zdHlsZS5mb250V2VpZ2h0ID0gdGhpcy5ib2xkID8gJ2JvbGQnIDogJ25vcm1hbCc7XHJcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLndpZHRoID0gdGhpcy53aWR0aCArICdweCc7XHJcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmhlaWdodCA9IHRoaXMuaGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICBjb250YWluZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5iYWNrZ3JvdW5kQ29sb3I7XHJcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLndoaXRlU3BhY2UgPSAnbm93cmFwJztcclxuXHJcbiAgICAgICAgY29udGFpbmVyLmlubmVySFRNTCA9IHByZXBhcmVkVGV4dC5odG1sO1xyXG5cclxuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgncGhvdG9fX3RleHQtcGhvdG9fdmlzaWJsZScpO1xyXG5cclxuICAgICAgICB0aGlzLl9zcGFucyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJyk7XHJcbiAgICAgICAgdGhpcy5fYnVmZmVyID0gW107XHJcblxyXG4gICAgICAgIHZhciBkZWx0YSA9IE1hdGguY2VpbCh0aGlzLl9zcGFucy5sZW5ndGggLyAxMDApO1xyXG4gICAgICAgIGlmIChkZWx0YSA8IDEpIHtcclxuICAgICAgICAgICAgZGVsdGEgPSAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuX3NwYW5zLmxlbmd0aDsgaSA8IGxlbjsgaSArPSBkZWx0YSkge1xyXG4gICAgICAgICAgICB0aGlzLmFkZFJlcXVlc3QoaSwgKGkgKyBkZWx0YSkgPiBsZW4gPyBsZW4gOiBpICsgZGVsdGEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgQXN5bmMucnVuKGRhdGEub25wcm9ncmVzcywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGRhdGEuY2FsbGJhY2sodGhpcy5wcmVwYXJlRGF0YSgpKTtcclxuICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgfSxcclxuICAgIGdldEF2ZXJhZ2VDb2xvcjogZnVuY3Rpb24oaW1hZ2VEYXRhKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSBpbWFnZURhdGEuZGF0YSxcclxuICAgICAgICAgICAgciA9IDAsXHJcbiAgICAgICAgICAgIGcgPSAwLFxyXG4gICAgICAgICAgICBiID0gMCxcclxuICAgICAgICAgICAgbGVuID0gZGF0YS5sZW5ndGgsXHJcbiAgICAgICAgICAgIHN0ZXAgPSA4LFxyXG4gICAgICAgICAgICBjb3VudCA9IGxlbiAvIHN0ZXA7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IHN0ZXApIHtcclxuICAgICAgICAgICAgciArPSBkYXRhW2ldOyAvLyByZWRcclxuICAgICAgICAgICAgZyArPSBkYXRhW2kgKyAxXTsgLy8gZ3JlZW5cclxuICAgICAgICAgICAgYiArPSBkYXRhW2kgKyAyXTsgLy8gYmx1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcjogTWF0aC5mbG9vcihyIC8gY291bnQpLFxyXG4gICAgICAgICAgICBnOiBNYXRoLmZsb29yKGcgLyBjb3VudCksXHJcbiAgICAgICAgICAgIGI6IE1hdGguZmxvb3IoYiAvIGNvdW50KVxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG4gICAgYWRkUmVxdWVzdDogZnVuY3Rpb24oZnJvbSwgdG8pIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXMsXHJcbiAgICAgICAgICAgIHBob3RvV2lkdGggPSB0aGF0LndpZHRoLFxyXG4gICAgICAgICAgICBwaG90b0hlaWdodCA9IHRoYXQuaGVpZ2h0O1xyXG5cclxuICAgICAgICBBc3luYy5hZGQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBmcm9tOyBpIDwgdG87IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGVsID0gdGhhdC5fc3BhbnNbaV0sXHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGggPSBlbC5vZmZzZXRXaWR0aCxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQgPSBlbC5vZmZzZXRIZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiBlbC5vZmZzZXRMZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3A6IGVsLm9mZnNldFRvcFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF3aWR0aCB8fCAhaGVpZ2h0IHx8IHBvcy5sZWZ0ID49IHBob3RvV2lkdGggfHwgcG9zLnRvcCA+PSBwaG90b0hlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhciBpbWFnZURhdGEgPSB0aGF0Ll9jdHhDYW52YXMuZ2V0SW1hZ2VEYXRhKHBvcy5sZWZ0LCBwb3MudG9wLCB3aWR0aCwgaGVpZ2h0KSxcclxuICAgICAgICAgICAgICAgICAgICBjb2xvciA9IHRoYXQuZ2V0QXZlcmFnZUNvbG9yKGltYWdlRGF0YSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5fYnVmZmVyW2ldID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IHBvcy5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IHBvcy50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgdzogd2lkdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgaDogaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgIGw6IHRoYXQuX3RleHRXaXRob3V0TltpXSxcclxuICAgICAgICAgICAgICAgICAgICByOiBjb2xvci5yLFxyXG4gICAgICAgICAgICAgICAgICAgIGc6IGNvbG9yLmcsXHJcbiAgICAgICAgICAgICAgICAgICAgYjogY29sb3IuYlxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIHByZXBhcmVUZXh0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgbGV0dGVycyA9IHRoaXMudGV4dCxcclxuICAgICAgICAgICAgaHRtbCA9ICcnLFxyXG4gICAgICAgICAgICB0ZXh0ID0gJycsXHJcbiAgICAgICAgICAgIHRleHRXaXRob3V0TiA9ICcnO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxldHRlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGxldHRlciA9IGxldHRlcnNbaV0sXHJcbiAgICAgICAgICAgICAgICBlc2NhcGVkTGV0dGVyID0gZXNjYXBlSFRNTChsZXR0ZXIpO1xyXG4gICAgICAgICAgICBpZiAobGV0dGVyID09PSAnXFxuJykge1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGJyIC8+JztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRleHRXaXRob3V0TiArPSBsZXR0ZXI7XHJcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IGVzY2FwZWRMZXR0ZXI7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8c3Bhbj4nICsgZXNjYXBlZExldHRlciArICc8L3NwYW4+JztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdGV4dFdpdGhvdXROOiB0ZXh0V2l0aG91dE4sXHJcbiAgICAgICAgICAgIHRleHQ6IHRleHQsXHJcbiAgICAgICAgICAgIGh0bWw6IGh0bWxcclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuICAgIHByZXBhcmVEYXRhOiBmdW5jdGlvbihwcmVwYXJlZFRleHQpIHtcclxuICAgICAgICB2YXIgcm93ID0gW10sXHJcbiAgICAgICAgICAgIGRhdGEgPSBbXSxcclxuICAgICAgICAgICAgYnVmZmVyID0gdGhpcy5fYnVmZmVyLFxyXG4gICAgICAgICAgICBvbGRZID0gYnVmZmVyWzBdLnk7XHJcblxyXG4gICAgICAgIGRhdGEucHVzaChyb3cpO1xyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGl0ZW0gPSBidWZmZXJbaV07XHJcbiAgICAgICAgICAgIGlmICghaXRlbSB8fCBpdGVtLmwgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coaSwgaXRlbSwgaS0xLCBidWZmZXJbaS0xXSk7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoaXRlbS55ICE9IG9sZFkpIHtcclxuICAgICAgICAgICAgICAgIHJvdyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZGF0YS5wdXNoKHJvdyk7XHJcblxyXG4gICAgICAgICAgICAgICAgb2xkWSA9IGl0ZW0ueTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcm93LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbDogaXRlbS5sLFxyXG4gICAgICAgICAgICAgICAgcjogaXRlbS5yLFxyXG4gICAgICAgICAgICAgICAgZzogaXRlbS5nLFxyXG4gICAgICAgICAgICAgICAgYjogaXRlbS5iXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgd2lkdGg6IHRoaXMud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIGZvbnRTaXplOiB0aGlzLmZvbnRTaXplLFxyXG4gICAgICAgICAgICBmb250RmFtaWx5OiB0aGlzLmZvbnRGYW1pbHksXHJcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogdGhpcy5iYWNrZ3JvdW5kQ29sb3IsXHJcbiAgICAgICAgICAgIGxpbmVIZWlnaHQ6IHRoaXMubGluZUhlaWdodCxcclxuICAgICAgICAgICAgYm9sZDogdGhpcy5ib2xkLFxyXG4gICAgICAgICAgICBkYXRhOiBkYXRhXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2VuZXJhdG9yO1xyXG4iLCJ2YXIgcmlvdCA9IHJlcXVpcmUoJ3Jpb3QnKTtcclxucmVxdWlyZSgnLi4vdGFncy9hcHAudGFnJyk7XHJcbnJlcXVpcmUoJy4uL3RhZ3MvcHJlZnMudGFnJyk7XHJcbnJlcXVpcmUoJy4uL3RhZ3MvcGhvdG8udGFnJyk7XHJcbnJpb3QubW91bnQoJyonKTtcclxuIiwiZnVuY3Rpb24gdGV4dFBob3RvKGlkLCBkYXRhLCBpbnZlcnNlKSB7XHJcbiAgICBpZiAoIWlkIHx8ICFkYXRhKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBlbGVtO1xyXG4gICAgaWYgKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBlbGVtID0gaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFlbGVtKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzdHlsZSA9IGVsZW0uc3R5bGU7XHJcbiAgICBzdHlsZS53aWR0aCA9IGRhdGEud2lkdGggKyAncHgnO1xyXG4gICAgc3R5bGUuaGVpZ2h0ID0gZGF0YS5oZWlnaHQgKyAncHgnO1xyXG4gICAgc3R5bGUuYmFja2dyb3VuZENvbG9yID0gZGF0YS5iYWNrZ3JvdW5kQ29sb3I7XHJcbiAgICBzdHlsZS5mb250U2l6ZSA9IGRhdGEuZm9udFNpemUgKyAncHgnO1xyXG4gICAgc3R5bGUubGluZUhlaWdodCA9IGRhdGEubGluZUhlaWdodCArICdweCc7XHJcbiAgICBzdHlsZS5mb250RmFtaWx5ID0gZGF0YS5mb250RmFtaWx5O1xyXG5cclxuICAgIGlmIChkYXRhLmJvbGQpIHtcclxuICAgICAgICBzdHlsZS5mb250V2VpZ2h0ID0gJ2JvbGQnO1xyXG4gICAgfVxyXG5cclxuICAgIHN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XHJcbiAgICBzdHlsZS53aGl0ZVNwYWNlID0gJ25vd3JhcCc7XHJcblxyXG4gICAgdmFyIG1hcCA9IGRhdGEuZGF0YSxcclxuICAgICAgICB0ZXh0ID0gJycsXHJcbiAgICAgICAgZGVsdGEgPSA0MDtcclxuXHJcbiAgICBmb3IgKHZhciB4ID0gMDsgeCA8IG1hcC5sZW5ndGg7IHgrKykge1xyXG4gICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgbWFwW3hdLmxlbmd0aDsgeSsrKSB7XHJcbiAgICAgICAgICAgIHZhciB2YWwgPSBtYXBbeF1beV07XHJcblxyXG4gICAgICAgICAgICBpZiAoaW52ZXJzZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHIxID0gdmFsLnIgKyBkZWx0YSxcclxuICAgICAgICAgICAgICAgICAgICBiMSA9IHZhbC5iICsgZGVsdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgZzEgPSB2YWwuZyArIGRlbHRhO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIxID4gMjU1KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcjEgPSAyNTU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHIxIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHIxID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZzEgPiAyNTUpIHtcclxuICAgICAgICAgICAgICAgICAgICBnMSA9IDI1NTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZzEgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZzEgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChiMSA+IDI1NSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGIxID0gMjU1O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChiMSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBiMSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGV4dCArPSAnPHNwYW4gc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOnJnYignICsgdmFsLnIgKyAnLCcgKyB2YWwuZyArICcsJyArIHZhbC5iICtcclxuICAgICAgICAgICAgICAgICAgICAnKTsgY29sb3I6cmdiKCcgKyByMSArICcsJyArIGcxICsgJywnICsgYjEgKyAnKVwiPicgKyB2YWwubCArICc8XFwvc3Bhbj4nO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGV4dCArPSAnPHNwYW4gc3R5bGU9XCJjb2xvcjpyZ2IoJyArIHZhbC5yICsgJywnICsgdmFsLmcgKyAnLCcgKyB2YWwuYiArXHJcbiAgICAgICAgICAgICAgICAgICAgJylcIj4nICsgdmFsLmwgKyAnPFxcL3NwYW4+JztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGV4dCArPSAnPGJyIC8+JztcclxuICAgIH1cclxuXHJcbiAgICBlbGVtLmlubmVySFRNTCA9IHRleHQ7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdGV4dFBob3RvO1xyXG4iLCJ2YXIgcmlvdCA9IHJlcXVpcmUoJ3Jpb3QnKTtcbm1vZHVsZS5leHBvcnRzID0gcmlvdC50YWcyKCdhcHAnLCAnPGRpdiBjbGFzcz1cInBhcmFuamEge3BhcmFuamFfdmlzaWJsZTogcGFyYW5qYVZpc2libGV9XCI+PC9kaXY+IDxuYXZiYXI+IDxuYXZiYXJfX3NhbmR3aWNoIG9uY2xpY2s9XCJ7b25DbGlja1NhbmR3aWNofVwiPiYjOTc3Njs8L25hdmJhcl9fc2FuZHdpY2g+PG5hdmJhcl9fdGV4dD5UZXh0IHBob3RvPC9uYXZiYXJfX3RleHQ+IDwvbmF2YmFyPiA8cGhvdG8gcHJlZnM9XCJ7cHJlZnN9XCI+PC9waG90bz4gPGRpdiByaW90LXRhZz1cInByZWZzXCIgZGF0YT1cIntwcmVmc31cIj48L3ByZWZzPicsICcnLCAnY2xhc3M9XCJ7YXBwX3ByZWZzOiBzaG93UHJlZnN9XCIgcmlvdC1zdHlsZT1cImJhY2tncm91bmQtY29sb3I6IHtwcmVmcy5iYWNrZ3JvdW5kQ29sb3J9XCInLCBmdW5jdGlvbihvcHRzKSB7XG52YXIgc2VsZiA9IHRoaXM7XG5cbnNlbGYucHJlZnMgPSB7XG4gICAgYmFja2dyb3VuZENvbG9yOiAnIzAwMDAwMCcsXG4gICAgYm9sZDogZmFsc2UsXG4gICAgY29sb3I6ICcjZmZmZmZmJyxcbiAgICBmb250RmFtaWx5OiAnQXJpYWwsIHNhbnMtc2VyaWYnLFxuICAgIGZvbnRTaXplOiAxNixcbiAgICBsaW5lSGVpZ2h0OiAyMCxcbiAgICB3aWR0aDogMTAyNCxcbiAgICBoZWlnaHQ6IDc2OCxcbiAgICB1cmw6ICdpbWFnZXMvcmVkX2Zsb3dlci5qcGcnXG59O1xuXG5zZWxmLnNob3dQcmVmcyA9IGZhbHNlO1xuXG50aGlzLm9uQ2xpY2tTYW5kd2ljaCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBzZWxmLnNob3dQcmVmcyA9ICFzZWxmLnNob3dQcmVmcztcbiAgICBzZWxmLnRhZ3MucGhvdG8udXBkYXRlKCk7XG59LmJpbmQodGhpcylcblxuc2VsZi50YWdzLnBob3RvLm9uKCdoaWRlLXByZWZzJywgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5zaG93UHJlZnMgPSBmYWxzZTtcbiAgICBzZWxmLnRhZ3MucHJlZnMudXBkYXRlKCk7XG59KTtcblxuc2VsZi5wYXJhbmphVmlzaWJsZSA9IGZhbHNlO1xuXG5zZWxmLnRhZ3MucGhvdG8ub24oJ3Nob3ctcGFyYW5qYScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYucGFyYW5qYVZpc2libGUgPSB0cnVlO1xuICAgIHNlbGYudXBkYXRlKCk7XG59KTtcblxuc2VsZi50YWdzLnBob3RvLm9uKCdoaWRlLXBhcmFuamEnLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLnBhcmFuamFWaXNpYmxlID0gZmFsc2U7XG4gICAgc2VsZi51cGRhdGUoKTtcbn0pO1xuXG5zZWxmLnRhZ3MucHJlZnMub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYudGFncy5waG90by51cGRhdGUoKTtcbn0pO1xufSk7XG4iLCJ2YXIgcmlvdCA9IHJlcXVpcmUoJ3Jpb3QnKTtcbm1vZHVsZS5leHBvcnRzID0gcmlvdC50YWcyKCdwaG90bycsICc8ZGl2IGNsYXNzPVwicGJhclwiIHJpb3Qtc3R5bGU9XCJ3aWR0aDoge3BiYXJWYWx1ZX0lXCI+PC9kaXY+IDxkaXYgY2xhc3M9XCJwaG90b19fY29udHJvbFwiPiA8aW5wdXQgdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwicGhvdG9fX2dlbmVyYXRlXCIgb25jbGljaz1cIntvbkNsaWNrR2VuZXJhdGV9XCIgdmFsdWU9XCJHZW5lcmF0ZVwiPiA8aW5wdXQgdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwicGhvdG9fX3NhdmVcIiBvbmNsaWNrPVwie29uQ2xpY2tTYXZlfVwiIHZhbHVlPVwiU2F2ZVwiPiA8L2Rpdj4gPGRpdiBjbGFzcz1cInBob3RvX19yZXN1bHRcIj48L2Rpdj4gPGRpdiBjbGFzcz1cInBob3RvIHtcXCdwaG90b19sZWZ0LXBhZFxcJzogb3B0cy5wcmVmcy52aXNpYmxlfVwiIHJpb3Qtc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiB7b3B0cy5wcmVmcy5iYWNrZ3JvdW5kQ29sb3J9XCI+IDxkaXYgY2xhc3M9XCJwaG90b19fdGV4dC1waG90b1wiPjwvZGl2PiA8dGV4dGFyZWEgY2xhc3M9XCJwaG90b19faW5wdXQge3Bob3RvX19pbnB1dF92aXNpYmxlOiB0ZXh0fVwiIHNwZWxsY2hlY2s9XCJmYWxzZVwiIHJpb3Qtc3R5bGU9XCIgYmFja2dyb3VuZDogdXJsKHtvcHRzLnByZWZzLnVybH0pIDAgMCBuby1yZXBlYXQ7IHdpZHRoOiB7b3B0cy5wcmVmcy53aWR0aH1weDsgaGVpZ2h0OiB7b3B0cy5wcmVmcy5oZWlnaHR9cHg7IGNvbG9yOiB7b3B0cy5wcmVmcy5jb2xvcn07IGxpbmUtaGVpZ2h0OiB7b3B0cy5wcmVmcy5saW5lSGVpZ2h0fXB4OyBmb250LXNpemU6IHtvcHRzLnByZWZzLmZvbnRTaXplfXB4OyBmb250LWZhbWlseToge29wdHMucHJlZnMuZm9udEZhbWlseX07IGZvbnQtd2VpZ2h0OiB7b3B0cy5wcmVmcy5ib2xkID8gXFwnYm9sZFxcJyA6IFxcJ25vcm1hbFxcJ307IFwiIG9uY2hhbmdlPVwie29uQ2hhbmdlVGV4dH1cIj57dGV4dH08L3RleHRhcmVhPiA8L2Rpdj4nLCAnJywgJycsIGZ1bmN0aW9uKG9wdHMpIHtcbnZhciBzZWxmID0gdGhpcyxcbiAgICBsYXN0UmVzdWx0ID0gJycsXG4gICAgR2VuZXJhdG9yID0gcmVxdWlyZSgnLi4vc2NyaXB0cy9nZW5lcmF0b3InKSxcbiAgICB0ZXh0UGhvdG8gPSByZXF1aXJlKCcuLi9zY3JpcHRzL3RleHQtcGhvdG8nKTtcblxuc2VsZi5wYmFyVmFsdWUgPSAwO1xudmFyIHRleHQgPSAnJztcbnZhciBleFRleHQgPSAnSGVsbG8gd29ybGQhISEgSGVsbG8gd29ybGQhISEgSGVsbG8gd29ybGQhISEgSGVsbG8gd29ybGQhISEgSGVsbG8gd29ybGQhISEgSGVsbG8gd29ybGQhISEgSGVsbG8gd29ybGQhISEgSGVsbG8gd29ybGQhISEgISBIZWxsbyB3b3JsZCEhISBIZWxsbyB3b3JsZCEhISBIZWxsbyB3b3JsZCEhISBIZWxsbyB3b3JsZCEhIVxcbic7XG5cbmZvciAodmFyIGkgPSAwOyBpIDwgNTA7IGkrKykge1xuICAgIHRleHQgKz0gZXhUZXh0O1xufVxuXG5zZWxmLnRleHQgPSB0ZXh0O1xuXG50aGlzLnNob3dUZXh0UGhvdG8gPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5jbGFzc05hbWUgPSAncGhvdG9fX3Jlc3VsdCc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkaXYpO1xuICAgIGRpdi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICB0ZXh0UGhvdG8oZGl2LCBkYXRhKTtcbn0uYmluZCh0aGlzKVxuXG50aGlzLm9uQ2hhbmdlVGV4dCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBzZWxmLnRleHQgPSBlLnRhcmdldC52YWx1ZTtcbn0uYmluZCh0aGlzKVxuXG50aGlzLm9uQ2xpY2tHZW5lcmF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHNlbGYudHJpZ2dlcignaGlkZS1wcmVmcycpO1xuICAgIHNlbGYudHJpZ2dlcignc2hvdy1wYXJhbmphJyk7XG5cbiAgICB2YXIgZGF0YSA9IHt9O1xuXG4gICAgW1xuICAgICAgICAnd2lkdGgnLFxuICAgICAgICAnaGVpZ2h0JyxcbiAgICAgICAgJ2JvbGQnLFxuICAgICAgICAnYmFja2dyb3VuZENvbG9yJyxcbiAgICAgICAgJ2ZvbnRGYW1pbHknLFxuICAgICAgICAnZm9udFNpemUnLFxuICAgICAgICAnbGluZUhlaWdodCcsXG4gICAgICAgICd1cmwnLFxuICAgICAgICAndGV4dCdcbiAgICBdLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGRhdGFba2V5XSA9IG9wdHMucHJlZnNba2V5XTtcbiAgICB9KTtcblxuICAgIGRhdGEub25wcm9ncmVzcyA9IGZ1bmN0aW9uKHZhbHVlLCB0b3RhbCkge1xuICAgICAgICBzZWxmLnBiYXJWYWx1ZSA9IHZhbHVlIC8gKHRvdGFsIHx8IDEpICogMTAwO1xuICAgICAgICBzZWxmLnVwZGF0ZSgpO1xuICAgIH07XG5cbiAgICBkYXRhLmNhbGxiYWNrID0gZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgIHNlbGYucGJhclZhbHVlID0gMDtcbiAgICAgICAgc2VsZi51cGRhdGUoKTtcblxuICAgICAgICBzZWxmLnNob3dUZXh0UGhvdG8ocmVzKTtcblxuICAgICAgICBsYXN0UmVzdWx0ID0gcmVzO1xuICAgIH07XG5cbiAgICBkYXRhLnRleHQgPSBzZWxmLnRleHQ7XG5cbiAgICBHZW5lcmF0b3Iuc3RhcnQoZGF0YSk7XG59LmJpbmQodGhpcylcbn0pO1xuIiwidmFyIHJpb3QgPSByZXF1aXJlKCdyaW90Jyk7XG5tb2R1bGUuZXhwb3J0cyA9IHJpb3QudGFnMigncHJlZnMnLCAnPGRpdiBjbGFzcz1cInByZWZzX190aXRsZVwiPlByZWZzPC9kaXY+IDx0YWJsZSBjbGFzcz1cInByZWZzX19wcm9wZXJ0aWVzXCI+IDx0cj4gPHRkPmJhY2tncm91bmQtY29sb3I8L3RkPiA8dGQ+PGlucHV0IGNsYXNzPVwicHJlZnNfX2JnLWNvbG9yXCIgb25jaGFuZ2U9XCJ7b25DaGFuZ2VCYWNrZ3JvdW5kQ29sb3J9XCIgdmFsdWU9XCJ7b3B0cy5kYXRhLmJhY2tncm91bmRDb2xvcn1cIiB0eXBlPVwie1xcJ2NvbG9yXFwnfVwiPjwvdGQ+IDwvdHI+IDx0cj4gPHRkPmNvbG9yPC90ZD4gPHRkPjxpbnB1dCBjbGFzcz1cInByZWZzX19jb2xvclwiIG9uY2hhbmdlPVwie29uQ2hhbmdlQ29sb3J9XCIgdmFsdWU9XCJ7b3B0cy5kYXRhLmNvbG9yfVwiIHR5cGU9XCJ7XFwnY29sb3JcXCd9XCI+PC90ZD4gPC90cj4gPHRyPiA8dGQ+Zm9udC1mYW1pbHk8L3RkPiA8dGQ+IDxpbnB1dCBjbGFzcz1cInByZWZzX19mb250LWZhbWlseVwiIHR5cGU9XCJ0ZXh0XCIgb25jaGFuZ2U9XCJ7b25DaGFuZ2VGb250RmFtaWx5fVwiIHZhbHVlPVwie29wdHMuZGF0YS5mb250RmFtaWx5fVwiPiA8L3RkPiA8L3RyPiA8dHI+IDx0ZD5mb250LXNpemU8L3RkPiA8dGQ+IDxpbnB1dCBjbGFzcz1cInByZWZzX19mb250LXNpemVcIiBvbmNoYW5nZT1cIntvbkNoYW5nZUZvbnRTaXplfVwiIHZhbHVlPVwie29wdHMuZGF0YS5mb250U2l6ZX1cIiB0eXBlPVwie1xcJ251bWJlclxcJ31cIj5weCA8L3RkPiA8L3RyPiA8dHI+IDx0ZD5saW5lLWhlaWdodDwvdGQ+IDx0ZD48aW5wdXQgY2xhc3M9XCJwcmVmc19fbGluZS1oZWlnaHRcIiBvbmNoYW5nZT1cIntvbkNoYW5nZUxpbmVIZWlnaHR9XCIgdmFsdWU9XCJ7b3B0cy5kYXRhLmxpbmVIZWlnaHR9XCIgdHlwZT1cIntcXCdudW1iZXJcXCd9XCI+cHg8L3RkPiA8L3RyPiA8dHI+IDx0ZD48L3RkPiA8dGQ+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG9uY2xpY2s9XCJ7b25DbGlja0JvbGR9XCIgX19jaGVja2VkPVwie29wdHMuZGF0YS5ib2xkfVwiIGlkPVwiYm9sZFwiIGNsYXNzPVwicHJlZnNfX2JvbGRcIj4gPGxhYmVsIGZvcj1cImJvbGRcIj5ib2xkPC9sYWJlbD48L3RkPiA8L3RyPiA8L3RhYmxlPiA8ZGl2IGNsYXNzPVwicHJlZnNfX3RpdGxlXCI+SW1hZ2U8L2Rpdj4gPHRhYmxlIGNsYXNzPVwicHJlZnNfX3Byb3BlcnRpZXNcIj4gPHRyPiA8dGQgY29sc3Bhbj1cIjJcIj48aW5wdXQgY2xhc3M9XCJwcmVmc19fdXJsXCIgdHlwZT1cImZpbGVcIiBvbmNoYW5nZT1cIntvbkNoYW5nZVVybH1cIj48L3RkPiA8L3RyPiA8dHI+IDx0ZD53aWR0aDwvdGQ+IDx0ZD48aW5wdXQgY2xhc3M9XCJwcmVmc19fd2lkdGhcIiBvbmNoYW5nZT1cIntvbkNoYW5nZVdpZHRofVwiIHZhbHVlPVwie29wdHMuZGF0YS53aWR0aH1cIiB0eXBlPVwie1xcJ251bWJlclxcJ31cIj4gcHg8L3RkPiA8L3RyPiA8dHI+IDx0ZD5oZWlnaHQ8L3RkPiA8dGQ+IDxpbnB1dCBjbGFzcz1cInByZWZzX19oZWlnaHRcIiBvbmNoYW5nZT1cIntvbkNoYW5nZUhlaWdodH1cIiB2YWx1ZT1cIntvcHRzLmRhdGEuaGVpZ2h0fVwiIHR5cGU9XCJ7XFwnbnVtYmVyXFwnfVwiPiBweCA8L3RkPiA8L3RyPiA8L3RhYmxlPiA8L3ByZWZzPicsICcnLCAnY2xhc3M9XCJwcmVmcyB7cHJlZnNfdmlzaWJsZTogb3B0cy5kYXRhLnZpc2libGV9XCInLCBmdW5jdGlvbihvcHRzKSB7XG52YXIgc2VsZiA9IHRoaXM7XG5cbnRoaXMub25DaGFuZ2VXaWR0aCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBvcHRzLmRhdGEud2lkdGggPSBlLnRhcmdldC52YWx1ZTtcbiAgICBzZWxmLnRyaWdnZXIoJ2NoYW5nZScpO1xufS5iaW5kKHRoaXMpXG5cbnRoaXMub25DaGFuZ2VIZWlnaHQgPSBmdW5jdGlvbihlKSB7XG4gICAgb3B0cy5kYXRhLmhlaWdodCA9IGUudGFyZ2V0LnZhbHVlO1xuICAgIHNlbGYudHJpZ2dlcignY2hhbmdlJyk7XG59LmJpbmQodGhpcylcblxudGhpcy5vbkNoYW5nZVVybCA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgZmlsZXMgPSBlLnRhcmdldC5maWxlcztcblxuICAgIGlmIChGaWxlUmVhZGVyICYmIGZpbGVzICYmIGZpbGVzLmxlbmd0aCkge1xuICAgICAgICB2YXIgaW1nID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGltYWdlU2l6ZSA9IG5ldyBJbWFnZSgpO1xuICAgICAgICAgICAgaW1hZ2VTaXplLnNyYyA9IGltZy5yZXN1bHQ7XG4gICAgICAgICAgICBpbWFnZVNpemUub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgb3B0cy5kYXRhLndpZHRoID0gaW1hZ2VTaXplLndpZHRoO1xuICAgICAgICAgICAgICAgIG9wdHMuZGF0YS5oZWlnaHQgPSBpbWFnZVNpemUuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIG9wdHMuZGF0YS51cmwgPSBpbWcucmVzdWx0O1xuXG4gICAgICAgICAgICAgICAgc2VsZi50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgaW1nLnJlYWRBc0RhdGFVUkwoZmlsZXNbMF0pO1xuICAgIH1cbn0uYmluZCh0aGlzKVxuXG50aGlzLm9uQ2hhbmdlQmFja2dyb3VuZENvbG9yID0gZnVuY3Rpb24oZSkge1xuICAgIG9wdHMuZGF0YS5iYWNrZ3JvdW5kQ29sb3IgPSBlLnRhcmdldC52YWx1ZTtcbiAgICBzZWxmLnRyaWdnZXIoJ2NoYW5nZScpO1xufS5iaW5kKHRoaXMpXG5cbnRoaXMub25DaGFuZ2VDb2xvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICBvcHRzLmRhdGEuY29sb3IgPSBlLnRhcmdldC52YWx1ZTtcbiAgICBzZWxmLnRyaWdnZXIoJ2NoYW5nZScpO1xufS5iaW5kKHRoaXMpXG5cbnRoaXMub25DaGFuZ2VGb250U2l6ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBvcHRzLmRhdGEuZm9udFNpemUgPSBlLnRhcmdldC52YWx1ZTtcbiAgICBzZWxmLnRyaWdnZXIoJ2NoYW5nZScpO1xufS5iaW5kKHRoaXMpXG5cbnRoaXMub25DaGFuZ2VGb250RmFtaWx5ID0gZnVuY3Rpb24oZSkge1xuICAgIG9wdHMuZGF0YS5mb250RmFtaWx5ID0gZS50YXJnZXQudmFsdWU7XG4gICAgc2VsZi50cmlnZ2VyKCdjaGFuZ2UnKTtcbn0uYmluZCh0aGlzKVxuXG50aGlzLm9uQ2hhbmdlTGluZUhlaWdodCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBvcHRzLmRhdGEubGluZUhlaWdodCA9IGUudGFyZ2V0LnZhbHVlO1xuICAgIHNlbGYudHJpZ2dlcignY2hhbmdlJyk7XG59LmJpbmQodGhpcylcblxudGhpcy5vbkNsaWNrQm9sZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBvcHRzLmRhdGEuYm9sZCA9IGUudGFyZ2V0LmNoZWNrZWQ7XG4gICAgc2VsZi50cmlnZ2VyKCdjaGFuZ2UnKTtcbn0uYmluZCh0aGlzKVxuXG59KTtcbiJdfQ==
