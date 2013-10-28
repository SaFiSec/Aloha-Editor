/* keys.js is part of Aloha Editor project http://aloha-editor.org
 *
 * Aloha Editor is a WYSIWYG HTML5 inline editing library and editor.
 * Copyright (c) 2010-2013 Gentics Software GmbH, Vienna, Austria.
 * Contributors http://aloha-editor.org/contribution.php
 *
 * @todo:
 * consider https://github.com/nostrademons/keycode.js/blob/master/keycode.js
 */
define([
	'events',
	'pubsub',
	'ranges',
	'misc'
], function Keys(
	events,
	pubsub,
	ranges,
	misc
) {
	'use strict';

	if ('undefined' !== typeof mandox) {
		eval(uate)('keys');
	}

	/**
	 * A map of key names to their keycode.
	 *
	 * @type {object<string, number>}
	 */
	var CODES = {
		'alt'       : 18,
		'backspace' : 8,
		'capslock'  : 20,
		'control'   : 17,
		'delete'    : 46,
		'enter'     : 13,
		'escape'    : 27,
		'f1'        : 112,
		'f12'       : 123,
		'shift'     : 16,
		'space'     : 32,
		'tab'       : 9,
		'undo'      : 90,
		'bold'      : 66,
		'italic'    : 73
	};

	/**
	 * Arrow keys
	 *
	 * @type {Object}
	 */
	var ARROWS = {
		37 : 'left',
		38 : 'up',
		39 : 'right',
		40 : 'down'
	};

	/**
	 * Publishes messages on the keyup event.
	 *
	 * @param {Event} event
	 */
	function onUp(event) {
		var message = {
			event: event,
			code: event.keyCode,
			range: ranges.get()
		};
		pubsub.publish('aloha.key.up.' + event.keyCode, message);
	}

	/**
	 * Publishes messages on the keydown event.
	 *
	 * @param {Event} event
	 */
	function onDown(event) {
		var message = {
			event: event,
			code: event.keyCode,
			range: ranges.get()
		};
		var called = {};
		pubsub.publish('aloha.key.down.' + event.keyCode, message, called);
	}

	/**
	 * Publishes messages on the keypress event.
	 *
	 * @param {Event} event
	 */
	function onPress(event) {
		var message = {
			event: event,
			code: event.keyCode,
			range: ranges.get()
		};
		pubsub.publish('aloha.key.press.' + event.keyCode, message);
	}

	function subscribe(channel, code, callback) {
		if ('function' === typeof code) {
			pubsub.subscribe('aloha.key.' + channel, code);
		} else {
			pubsub.subscribe(
				'aloha.key.' + channel + '.' + (CODES[code] || code),
				callback
			);
		}
	}

	/**
	 * Publishes messages on the keydown event.
	 *
	 * @param {Function(Object)} callback
	 */
	function up(code, callback) {
		subscribe('up', code, callback);
	}

	/**
	 * Publishes messages on the keyup event.
	 *
	 * @param {Function(Object)} callback
	 */
	function down(code, callback) {
		subscribe('down', code, callback);
	}

	/**
	 * Publishes messages on the keypress event.
	 *
	 * @param {Function(Object)} callback
	 */
	function press(code, callback) {
		subscribe('press', code, callback);
	}

	function on(channels, callback) {
		if ('string' === typeof channels) {
			channels = channels.split(' ');
		}
		var i;
		for (i = 0; i < channels.length; i++) {
			subscribe(channels[i], callback);
		}
	}

	function code(event) {
		return event.keyCode || event.which;
	}

	/**
	 * Functions for working with key events.
	 */
	var exports = {
		on      : on,
		up      : up,
		down    : down,
		press   : press,
		onUp    : onUp,
		onDown  : onDown,
		onPress : onPress,
		code    : code,
		ARROWS  : ARROWS,
		CODES   : CODES
	};

	exports['on']      = exports.on;
	exports['up']      = exports.up;
	exports['down']    = exports.down;
	exports['press']   = exports.press;
	exports['onUp']    = exports.onUp;
	exports['onDown']  = exports.onDown;
	exports['onPress'] = exports.onPress;
	exports['code']    = exports.code;
	exports['ARROWS']  = exports.ARROWS;
	exports['CODES']   = exports.CODES;

	return exports;
});