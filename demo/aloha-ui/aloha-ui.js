(function (aloha) {
	'use strict';
	
	var Dom = aloha.dom;
	var Keys = aloha.keys;
	var Editor = aloha.editor;
	var Events = aloha.events;
	var Editing = aloha.editing;
	var Overrides = aloha.overrides;
	var Selections = aloha.selections;
	var Boundaries = aloha.boundaries;
	var Arrays = aloha.arrays;
	var ACTION_CLASS_PREFIX = 'aloha-action-';

	var $$ = (function () {
		/**
		 * jQuery-like wrapper for document.querySelectorAll
		 * Will accept a selector or an element
		 *
		 * @param  {string|Element} selector
		 * @return {Array.<Element>}
		 */
		function $$ (selectorOrElement) {
			this.elements = typeof selectorOrElement === 'string'
				? Arrays.coerce(document.querySelectorAll(selectorOrElement))
				: [selectorOrElement];
		}
		$$.prototype = {
			/**
			 * Array of matched elements
			 * @type {Array.<Element>}
			 */
			elements : [],
			/**
			 * Attaches event handlers for an event
			 *
			 * @param {string}   event
			 * @param {function} handler
			 * @return {$$}
			 */
			on : function (event, handler) {
				this.elements.forEach(function (element) {
					Events.add(element, event, handler);
				});
				return this;
			},
			/**
			 * Adds a class
			 *
			 * @param {string} className
			 * @return {$$}
			 */
			addClass : function (className) {
				this.elements.forEach(function (element) {
					Dom.addClass(element, className);
				});
				return this;
			},
			/**
			 * Removes a class
			 *
			 * @param {string} className
			 * @return {$$}
			 */
			removeClass : function (className) {
				this.elements.forEach(function (element) {
					Dom.removeClass(element, className);
				});
				return this;
			},
			/**
			 * Updates an attribute
			 *
			 * @param {string} name
			 * @param {string} value
			 * @return {$$}
			 */
			setAttr : function (name, value) {
				this.elements.forEach(function (element) {
					Dom.setAttr(element, name, value);
				});
				return this;
			}
		};
		return function (selectorOrElement) {
			return new $$(selectorOrElement);
		};
	})();

	/**
	 * Executes an action based on the given parameters list
	 *
	 * @private
	 * @param  {!Array.<string>}   params
	 * @param  {!Array.<Boundary>} boundaries
	 * @return {Array.<Boundary>}
	 */
	function execute(params, boundaries) {
		var action = params.shift();
		return aloha.editor.ui.actions[action]
		     ? aloha.editor.ui.actions[action].apply(window, boundaries.concat(params))
		     : boundaries;
	}

	/**
	 * Parse an element and it's parent elements
	 * whether an aloha-action-* class name is present.
	 * An array will be returned, containing the whole
	 * matching class at index 0, and the parameters
	 * split by dash as the following keys.
	 *
	 * @private
	 * @param  {!Element} element
	 * @return {Array.<string>}
	 */
	function parseActionParams(element) {
		var match;
		var parameters = [];
		Dom.childAndParentsUntil(element, function (element) {
			if (element.className) {
				match = element.className.match(/aloha-action-(\S+)/);
			}
			if (match || Dom.hasClass(element, 'aloha-ui')) {
				return true;
			}
			return false;
		});
		if (match) {
			parameters = match[1].split('-');
			parameters.unshift(match[0]);
		}
		return parameters;
	}

	/**
	 * Deactivates all ui buttons.
	 *
	 * @private
	 */
	function resetUi() {
		$$('.aloha-ui .active').removeClass('active');
	}

	/**
	 * Toggles ui action buttons to active state based on the given list of
	 * formats.
	 *
	 * @private
	 * @param {Array.<string>} formats
	 */
	function activateButtons(formats) {
		var selectors = formats.reduce(function (list, format) {
			return list.concat('.aloha-ui .' + ACTION_CLASS_PREFIX + format);
		}, []);
		$$(selectors.join(',')).addClass('active');
	}

	/**
	 * Updates ui menu buttons based on the given list of formats.
	 *
	 * @private
	 * @param {Array.<string>} formats
	 */
	function activateMenus(formats) {
		var selectors = formats.reduce(function (list, format) {
			return list.concat('.aloha-ui .dropdown-menu .' + ACTION_CLASS_PREFIX + format);
		}, []);
		var items = $$(selectors.join(','));
		if (0 === items.elements.length) {
			return;
		}
		var item = items.elements[0];
		var group = Dom.upWhile(item, function (node) {
			return !Dom.hasClass(node, 'btn-group');
		});
		var toggler = group.querySelector('.dropdown-toggle');
		Dom.addClass(toggler, 'active');
		toggler.firstChild.data = item.textContent + ' ';
	}

	/**
	 * Computes a list of all active formats determined from the given
	 * selection.
	 *
	 * Formats are simply a lists of node names which reflect semantic formatting.
	 *
	 * @private
	 * @param  {!Selection} selection
	 * @return {Array.<string>}
	 */
	function activeFormats(selection) {
		var nodes = Dom.childAndParentsUntilIncl(
			Boundaries.container(selection.boundaries[0]),
			function (node) { return Dom.isEditingHost(node.parentNode); }
		);
		var overrides = Overrides.joinToSet(
			selection.formatting,
			selection.overrides
		);
		var active = nodes.map(function (node) { return node.nodeName; });
		var unactive = [];
		overrides.forEach(function (override) {
			var format = Overrides.stateToNode[override[0]];
			if (format) {
				if (override[1]) {
					active.push(format);
				} else {
					unactive.push(format);
				}
			}
		});
		return Arrays.difference(Arrays.unique(active), unactive);
	}

	/**
	 * Updates the ui according to current state overrides.
	 *
	 * Sets to active all ui toolbar elements that match the current overrides.
	 *
	 * @private
	 * @param {!Event} event
	 */
	function updateUi(selection) {
		resetUi();
		var formats = activeFormats(selection);
		activateButtons(formats);
		activateMenus(formats);
		aloha.editor.ui.updateHandlers.forEach(function (handler) {
			handler(selection, formats);
		});
	}

	var eventLoop = { inEditable: false };

	$$(document).on('mousedown', function (event) {
		eventLoop.inEditable = false;
	});

	$$(document).on('mouseup', function (event) {
		if (eventLoop.inEditable) {
			return;
		}
		var ui = Dom.upWhile(event.target, function (node) {
			return !Dom.hasClass(node, 'aloha-ui');
		});
		if (!ui) {
			Editor.selection = null;
			resetUi();
		}
	});

	$$('.aloha-ui').on('mousedown', function (event) {
		if (event.target.nodeName === 'INPUT') {
			return;
		}
		var params = parseActionParams(event.target);
		var selection = Editor.selection;
		if (params && selection) {
			selection.boundaries = execute(params, selection.boundaries);
			Selections.select(
				selection,
				selection.boundaries[0],
				selection.boundaries[1],
				selection.focus
			);
		}
		updateUi(selection);
	});
	
	/**
	 * Handles UI updates invoked by event
	 *
	 * @param  {!Event} event
	 * @return {Event}
	 */
	function handleUi(event) {
		if ('keydown' === event.type) {
			var handler = Keys.shortcutHandler(event.meta, event.keycode, aloha.editor.ui.shortcuts);
			if (handler) {
				event.selection.boundaries = handler(
					event.selection.boundaries[0], 
					event.selection.boundaries[1]
				);
				if (handler.name === 'insertLink') {
					event.preventSelection = true;
				}
				return event;
			}
		}
		var type = event.type;
		if ('mouseup' === type || 'aloha.mouseup' === type) {
			eventLoop.inEditable = true;
		}
		if ('keydown' === type || 'keyup' === type || 'click' === type) {
			updateUi(event.selection);
		}
		return event;
	}

	aloha.editor.stack.unshift(handleUi);

	// exports
	aloha.editor.ui = {
		'$$'           : $$,
		shortcuts      : {},
		actions        : {
			'aloha-action-B'       : Editing.format,
			'aloha-action-I'       : Editing.format,
			'aloha-action-H2'      : Editing.format,
			'aloha-action-H3'      : Editing.format,
			'aloha-action-H4'      : Editing.format,
			'aloha-action-P'       : Editing.format,
			'aloha-action-PRE'     : Editing.format,
			'aloha-action-OL'      : Editing.format,
			'aloha-action-UL'      : Editing.format,
			'aloha-action-unformat': function (start, end) {
				var boundaries = [start, end];
				['B', 'I', 'U'].forEach(function (format) {
					boundaries = Editing.unformat(
						boundaries[0],
						boundaries[1],
						format
					);
				});
				return boundaries;
			}
		},
		update         : updateUi,
		updateHandlers : []
	};
}(window.aloha));