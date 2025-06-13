(function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	function create_slot(definition, ctx, $$scope, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, $$scope, fn) {
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
	}

	function get_slot_changes(definition, $$scope, dirty, fn) {
		if (definition[2] && fn) {
			const lets = definition[2](fn(dirty));
			if ($$scope.dirty === undefined) {
				return lets;
			}
			if (typeof lets === 'object') {
				const merged = [];
				const len = Math.max($$scope.dirty.length, lets.length);
				for (let i = 0; i < len; i += 1) {
					merged[i] = $$scope.dirty[i] | lets[i];
				}
				return merged;
			}
			return $$scope.dirty | lets;
		}
		return $$scope.dirty;
	}

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * Schedules a callback to run immediately after the component has been updated.
	 *
	 * The first time the callback runs will be after the initial `onMount`
	 *
	 * https://svelte.dev/docs/svelte#afterupdate
	 * @param {() => any} fn
	 * @returns {void}
	 */
	function afterUpdate(fn) {
		get_current_component().$$.after_update.push(fn);
	}

	/**
	 * Schedules a callback to run immediately before the component is unmounted.
	 *
	 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
	 * only one that runs inside a server-side component.
	 *
	 * https://svelte.dev/docs/svelte#ondestroy
	 * @param {() => any} fn
	 * @returns {void}
	 */
	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	/**
	 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
	 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
	 *
	 * Component events created with `createEventDispatcher` create a
	 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
	 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
	 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
	 * property and can contain any type of data.
	 *
	 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
	 * ```ts
	 * const dispatch = createEventDispatcher<{
	 *  loaded: never; // does not take a detail argument
	 *  change: string; // takes a detail argument of type string, which is required
	 *  optional: number | null; // takes an optional detail argument of type number
	 * }>();
	 * ```
	 *
	 * https://svelte.dev/docs/svelte#createeventdispatcher
	 * @template {Record<string, any>} [EventMap=any]
	 * @returns {import('./public.js').EventDispatcher<EventMap>}
	 */
	function createEventDispatcher() {
		const component = get_current_component();
		return (type, detail, { cancelable = false } = {}) => {
			const callbacks = component.$$.callbacks[type];
			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
				callbacks.slice().forEach((fn) => {
					fn.call(component, event);
				});
				return !event.defaultPrevented;
			}
			return true;
		};
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	/** @returns {void} */
	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function outro_and_destroy_block(block, lookup) {
		transition_out(block, 1, 1, () => {
			lookup.delete(block.key);
		});
	}

	/** @returns {any[]} */
	function update_keyed_each(
		old_blocks,
		dirty,
		get_key,
		dynamic,
		ctx,
		list,
		lookup,
		node,
		destroy,
		create_each_block,
		next,
		get_context
	) {
		let o = old_blocks.length;
		let n = list.length;
		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;
		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();
		const updates = [];
		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);
			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				// defer updates until all the DOM shuffling is done
				updates.push(() => block.p(child_ctx, dirty));
			}
			new_lookup.set(key, (new_blocks[i] = block));
			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}
		const will_move = new Set();
		const did_move = new Set();
		/** @returns {void} */
		function insert(block) {
			transition_in(block, 1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}
		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;
			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			} else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			} else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			} else if (did_move.has(old_key)) {
				o--;
			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);
			} else {
				will_move.add(old_key);
				o--;
			}
		}
		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}
		while (n) insert(new_blocks[n - 1]);
		run_all(updates);
		return new_blocks;
	}

	/** @returns {void} */
	function bind(component, name, callback) {
		const index = component.$$.props[name];
		if (index !== undefined) {
			component.$$.bound[index] = callback;
			callback(component.$$.ctx[index]);
		}
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify
	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	const ability = ({ name, cap }) => {
	    return {
	        name,
	        cap,
	        rating: 0,
	        pass: 0,
	        fail: 0
	    }
	};

	const nature = () => {
	    return {
	        current: 3,
	        maximum: 3,
	        pass: 0,
	        fail: 0,
	        descriptors: []
	    }
	};

	const abilities = () => {
	    return {
	        health: ability({ name: 'Health', cap: 7 }),
	        will: ability({ name: 'Will', cap: 7 }),
	        nature: nature(),
	        resources: ability({ name: 'Resources', cap: 10 }),
	        circles: ability({ name: 'Circles', cap: 10 }),
	        lifestyle: 0,
	        might: 3,
	        precedence: 0
	    }
	};

	const advancement = () => {
	    return {
	        currentFate: 0,
	        currentPersona: 0,
	        spentFate: 0,
	        spentPersona: 0,
	        levelBenefits: []
	    };
	};

	const bio = () => {
	    return {
	        name: '',
	        parents: '',
	        mentor: '',
	        age: '',
	        home: '',
	        level: '',
	        raiment: '',
	        stock: '',
	        classValue: '',
	        belief: '',
	        creed: '',
	        goal: '',
	        instinct: '',
	        epithet: ''
	    }
	};

	const circles = () => {
	    return {
	        friends: [],
	        enemies: []
	    };
	};

	const conditions = () => {
	    return {
	        shown: true,
	        fresh: false,
	        hungry: false,
	        angry: false,
	        afraid: false,
	        exhausted: false,
	        injured: false,
	        sick: false,
	        dead: false
	    }
	};

	const container = ({ name, size, format }) => {
	    return {
	        id: crypto.randomUUID(),
	        name,
	        size,
	        format,
	        items: []
	    }
	};

	const inventory = () => [
	    container({ name: 'Head', size: 1, format: 'static' }),
	    container({ name: 'Neck', size: 1, format: 'static' }),
	    container({ name: 'Hands (worn)', size: 2, format: 'static' }),
	    container({ name: 'Hands (carried)', size: 2, format: 'static' }),
	    container({ name: 'Feet', size: 1, format: 'static' }),
	    container({ name: 'Torso', size: 3, format: 'static' }),
	    container({ name: 'Belt', size: 3, format: 'static' }),
	    container({ name: 'Pockets', size: 1, format: 'pockets' }),
	    container({ name: 'Backpack', size: 6, format: 'pack' }),
	    container({ name: 'Ground', size: 1, format: 'pockets' }),
	    container({ name: 'Stash', size: 12, format: 'stash' })
	];

	const skill = ({ name = '', bluck = 'Health', readonly = true, special = false }) => {
	    return {
	        id: crypto.randomUUID(),
	        name,
	        bluck,
	        readonly,
	        special,
	        cap: 7,
	        rating: 0,
	        pass: 0,
	        fail: 0
	    };
	};

	const skills = () => {
	    return {
	        show: 'all',
	        lockSpecialty: false,
	        skills: [
	            skill({ name: 'Alchemist', bluck: 'Will' }),
	            skill({ name: 'Arcanist', bluck: 'Will' }),
	            skill({ name: 'Armorer', bluck: 'Health' }),
	            skill({ name: 'Cartographer', bluck: 'Will', special: true }),
	            skill({ name: 'Commander', bluck: 'Will' }),
	            skill({ name: 'Cook', bluck: 'Will', special: true }),
	            skill({ name: 'Criminal', bluck: 'Health', special: true }),
	            skill({ name: 'Dungeoneer', bluck: 'Health', special: true }),
	            skill({ name: 'Fighter', bluck: 'Health' }),
	            skill({ name: 'Haggler', bluck: 'Will', special: true }),
	            skill({ name: 'Healer', bluck: 'Will', special: true }),
	            skill({ name: 'Hunter', bluck: 'Health', special: true }),
	            skill({ name: 'Lore Master', bluck: 'Will' }),
	            skill({ name: 'Manipulator', bluck: 'Will', special: true }),
	            skill({ name: 'Mentor', bluck: 'Will' }),
	            skill({ name: 'Orator', bluck: 'Will', special: true }),
	            skill({ name: 'Pathfinder', bluck: 'Health', special: true }),
	            skill({ name: 'Persuader', bluck: 'Will', special: true }),
	            skill({ name: 'Rider', bluck: 'Health', special: true }),
	            skill({ name: 'Ritualist', bluck: 'Will' }),
	            skill({ name: 'Sapper', bluck: 'Health', special: true }),
	            skill({ name: 'Scavenger', bluck: 'Health', special: true }),
	            skill({ name: 'Scholar', bluck: 'Will' }),
	            skill({ name: 'Scout', bluck: 'Will', special: true }),
	            skill({ name: 'Survivalist', bluck: 'Health', special: true }),
	            skill({ name: 'Theologian', bluck: 'Will' })
	        ]
	    };
	};

	const spells = () => {
	    return {
	        burden: 0,
	        urdr: 0,
	        memory: 0,
	        spells: []
	    } 
	};

	const character = () => {
	    return {
	        navbar: { tab: 'bio' },
	        abilities: abilities(),
	        advancement: advancement(),
	        bio: bio(),
	        circles: circles(),
	        conditions: conditions(),
	        inventory: inventory(),
	        mod: 'torchbearer',
	        notes: [],
	        skills: skills(),
	        spells: spells(),
	        traits: [],
	        wises: []
	    };
	};

	/* src\components\Bubbles.svelte generated by Svelte v4.2.20 */

	function get_each_context$e(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		child_ctx[9] = i;
		return child_ctx;
	}

	// (15:8) {#each arr as x,i}
	function create_each_block$e(ctx) {
		let button;
		let mounted;
		let dispose;

		function click_handler() {
			return /*click_handler*/ ctx[6](/*i*/ ctx[9]);
		}

		return {
			c() {
				button = element("button");
				attr(button, "class", "bubble btn border border-dark");
				toggle_class(button, "btn-dark", /*value*/ ctx[0] > /*i*/ ctx[9]);
				toggle_class(button, "btn-light", /*value*/ ctx[0] <= /*i*/ ctx[9]);
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (!mounted) {
					dispose = listen(button, "click", click_handler);
					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty & /*value*/ 1) {
					toggle_class(button, "btn-dark", /*value*/ ctx[0] > /*i*/ ctx[9]);
				}

				if (dirty & /*value*/ 1) {
					toggle_class(button, "btn-light", /*value*/ ctx[0] <= /*i*/ ctx[9]);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	function create_fragment$u(ctx) {
		let div1;
		let small;
		let t;
		let div0;
		let current;
		const default_slot_template = /*#slots*/ ctx[5].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
		let each_value = ensure_array_like(/*arr*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$e(get_each_context$e(ctx, each_value, i));
		}

		return {
			c() {
				div1 = element("div");
				small = element("small");
				if (default_slot) default_slot.c();
				t = space();
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(small, "class", "align-self-center");
				set_style(small, "width", "3em");
				attr(div1, "class", "d-flex w-100");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, small);

				if (default_slot) {
					default_slot.m(small, null);
				}

				append(div1, t);
				append(div1, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[4],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
							null
						);
					}
				}

				if (dirty & /*value, handleClick, arr*/ 7) {
					each_value = ensure_array_like(/*arr*/ ctx[1]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$e(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$e(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if (default_slot) default_slot.d(detaching);
				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance$u($$self, $$props, $$invalidate) {
		let arr;
		let { $$slots: slots = {}, $$scope } = $$props;
		let { count = 6 } = $$props;
		let { value = 0 } = $$props;

		function handleClick(i) {
			$$invalidate(0, value = value == i + 1 ? i : i + 1);
		}

		const click_handler = i => handleClick(i);

		$$self.$$set = $$props => {
			if ('count' in $$props) $$invalidate(3, count = $$props.count);
			if ('value' in $$props) $$invalidate(0, value = $$props.value);
			if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*count*/ 8) {
				$$invalidate(1, arr = [...new Array(count)]);
			}
		};

		return [value, arr, handleClick, count, $$scope, slots, click_handler];
	}

	class Bubbles extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$u, create_fragment$u, safe_not_equal, { count: 3, value: 0 });
		}
	}

	/* src\components\Ability.svelte generated by Svelte v4.2.20 */

	function create_if_block_1$i(ctx) {
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding(value) {
			/*bubbles_value_binding*/ ctx[4](value);
		}

		let bubbles_props = {
			count: /*maxPass*/ ctx[1],
			$$slots: { default: [create_default_slot_1$6] },
			$$scope: { ctx }
		};

		if (/*ability*/ ctx[0].pass !== void 0) {
			bubbles_props.value = /*ability*/ ctx[0].pass;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

		return {
			c() {
				create_component(bubbles.$$.fragment);
			},
			m(target, anchor) {
				mount_component(bubbles, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*maxPass*/ 2) bubbles_changes.count = /*maxPass*/ ctx[1];

				if (dirty & /*$$scope*/ 64) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*ability*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*ability*/ ctx[0].pass;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(bubbles, detaching);
			}
		};
	}

	// (23:12) <Bubbles count={maxPass} bind:value={ability.pass}>
	function create_default_slot_1$6(ctx) {
		let t;

		return {
			c() {
				t = text("Pass");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (25:8) {#if maxFail > 0 && ability.rating < ability.cap}
	function create_if_block$l(ctx) {
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding_1(value) {
			/*bubbles_value_binding_1*/ ctx[5](value);
		}

		let bubbles_props = {
			count: /*maxFail*/ ctx[2],
			$$slots: { default: [create_default_slot$7] },
			$$scope: { ctx }
		};

		if (/*ability*/ ctx[0].fail !== void 0) {
			bubbles_props.value = /*ability*/ ctx[0].fail;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_1));

		return {
			c() {
				create_component(bubbles.$$.fragment);
			},
			m(target, anchor) {
				mount_component(bubbles, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*maxFail*/ 4) bubbles_changes.count = /*maxFail*/ ctx[2];

				if (dirty & /*$$scope*/ 64) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*ability*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*ability*/ ctx[0].fail;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(bubbles, detaching);
			}
		};
	}

	// (26:12) <Bubbles count={maxFail} bind:value={ability.fail}>
	function create_default_slot$7(ctx) {
		let t;

		return {
			c() {
				t = text("Fail");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$t(ctx) {
		let div2;
		let div1;
		let div0;
		let h20;
		let t0_value = /*ability*/ ctx[0].name + "";
		let t0;
		let t1;
		let h21;
		let button;
		let t2_value = /*ability*/ ctx[0].rating + "";
		let t2;
		let t3;
		let t4;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block_1$i(ctx);
		let if_block1 = /*maxFail*/ ctx[2] > 0 && /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block$l(ctx);

		return {
			c() {
				div2 = element("div");
				div1 = element("div");
				div0 = element("div");
				h20 = element("h2");
				t0 = text(t0_value);
				t1 = space();
				h21 = element("h2");
				button = element("button");
				t2 = text(t2_value);
				t3 = space();
				if (if_block0) if_block0.c();
				t4 = space();
				if (if_block1) if_block1.c();
				attr(h20, "class", "mr-auto");
				attr(button, "class", "badge btn btn-dark");
				attr(div0, "class", "d-flex");
				attr(div1, "class", "card-body");
				attr(div2, "class", "card text-nowrap");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, div0);
				append(div0, h20);
				append(h20, t0);
				append(div0, t1);
				append(div0, h21);
				append(h21, button);
				append(button, t2);
				append(div1, t3);
				if (if_block0) if_block0.m(div1, null);
				append(div1, t4);
				if (if_block1) if_block1.m(div1, null);
				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*handleClick*/ ctx[3]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if ((!current || dirty & /*ability*/ 1) && t0_value !== (t0_value = /*ability*/ ctx[0].name + "")) set_data(t0, t0_value);
				if ((!current || dirty & /*ability*/ 1) && t2_value !== (t2_value = /*ability*/ ctx[0].rating + "")) set_data(t2, t2_value);

				if (/*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap) {
					if (if_block0) {
						if_block0.p(ctx, dirty);

						if (dirty & /*ability*/ 1) {
							transition_in(if_block0, 1);
						}
					} else {
						if_block0 = create_if_block_1$i(ctx);
						if_block0.c();
						transition_in(if_block0, 1);
						if_block0.m(div1, t4);
					}
				} else if (if_block0) {
					group_outros();

					transition_out(if_block0, 1, 1, () => {
						if_block0 = null;
					});

					check_outros();
				}

				if (/*maxFail*/ ctx[2] > 0 && /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty & /*maxFail, ability*/ 5) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block$l(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block0);
				transition_in(if_block1);
				current = true;
			},
			o(local) {
				transition_out(if_block0);
				transition_out(if_block1);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				mounted = false;
				dispose();
			}
		};
	}

	function instance$t($$self, $$props, $$invalidate) {
		let maxFail;
		let maxPass;
		let { ability } = $$props;

		function handleClick(e) {
			$$invalidate(0, ability.rating += e.shiftKey ? -1 : 1, ability);
			if (ability.rating < 0) $$invalidate(0, ability.rating = ability.cap, ability);
			if (ability.rating > ability.cap) $$invalidate(0, ability.rating = 0, ability);
		}

		function bubbles_value_binding(value) {
			if ($$self.$$.not_equal(ability.pass, value)) {
				ability.pass = value;
				$$invalidate(0, ability);
			}
		}

		function bubbles_value_binding_1(value) {
			if ($$self.$$.not_equal(ability.fail, value)) {
				ability.fail = value;
				$$invalidate(0, ability);
			}
		}

		$$self.$$set = $$props => {
			if ('ability' in $$props) $$invalidate(0, ability = $$props.ability);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*ability*/ 1) {
				$$invalidate(2, maxFail = ability.rating < 2 ? 0 : ability.rating - 1);
			}

			if ($$self.$$.dirty & /*ability*/ 1) {
				$$invalidate(1, maxPass = ability.rating < 1 ? 1 : ability.rating);
			}
		};

		return [
			ability,
			maxPass,
			maxFail,
			handleClick,
			bubbles_value_binding,
			bubbles_value_binding_1
		];
	}

	class Ability extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$t, create_fragment$t, safe_not_equal, { ability: 0 });
		}
	}

	/* src\components\TagList.svelte generated by Svelte v4.2.20 */

	function get_each_context$d(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[9] = list[i];
		child_ctx[11] = i;
		return child_ctx;
	}

	// (36:12) {:else}
	function create_else_block$g(ctx) {
		let button;
		let t_value = /*item*/ ctx[9] + "";
		let t;
		let mounted;
		let dispose;

		function click_handler() {
			return /*click_handler*/ ctx[6](/*i*/ ctx[11]);
		}

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn badge badge-dark p-2 my-1 mr-1");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", click_handler);
					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[9] + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (34:12) {#if i == editIndex}
	function create_if_block_2$a(ctx) {
		let span;
		let t_value = /*item*/ ctx[9] + "";
		let t;

		return {
			c() {
				span = element("span");
				t = text(t_value);
				attr(span, "class", "btn badge badge-light border border-dark p-2 my-1 mr-1");
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, t);
			},
			p(ctx, dirty) {
				if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[9] + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (33:8) {#each items as item, i}
	function create_each_block$d(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*i*/ ctx[11] == /*editIndex*/ ctx[2]) return create_if_block_2$a;
			return create_else_block$g;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};
	}

	// (40:8) {#if !editing}
	function create_if_block_1$h(ctx) {
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				button.textContent = "add";
				attr(button, "class", "btn badge badge-light border border-dark p-2 ml-0 mt-1 mb-1");
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (!mounted) {
					dispose = listen(button, "click", /*add*/ ctx[4]);
					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (44:4) {#if editing}
	function create_if_block$k(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				/*input_1_binding*/ ctx[7](input_1);
				set_input_value(input_1, /*items*/ ctx[0][/*editIndex*/ ctx[2]]);

				if (!mounted) {
					dispose = [
						listen(input_1, "input", /*input_1_input_handler*/ ctx[8]),
						listen(input_1, "blur", /*end*/ ctx[5])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*items, editIndex*/ 5 && input_1.value !== /*items*/ ctx[0][/*editIndex*/ ctx[2]]) {
					set_input_value(input_1, /*items*/ ctx[0][/*editIndex*/ ctx[2]]);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[7](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function create_fragment$s(ctx) {
		let div1;
		let div0;
		let t0;
		let t1;
		let each_value = ensure_array_like(/*items*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$d(get_each_context$d(ctx, each_value, i));
		}

		let if_block0 = !/*editing*/ ctx[1] && create_if_block_1$h(ctx);
		let if_block1 = /*editing*/ ctx[1] && create_if_block$k(ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t0 = space();
				if (if_block0) if_block0.c();
				t1 = space();
				if (if_block1) if_block1.c();
				attr(div0, "class", "d-flex flex-wrap");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				append(div0, t0);
				if (if_block0) if_block0.m(div0, null);
				append(div1, t1);
				if (if_block1) if_block1.m(div1, null);
			},
			p(ctx, [dirty]) {
				if (dirty & /*items, editIndex, editing*/ 7) {
					each_value = ensure_array_like(/*items*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$d(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$d(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, t0);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				if (!/*editing*/ ctx[1]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_1$h(ctx);
						if_block0.c();
						if_block0.m(div0, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (/*editing*/ ctx[1]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block$k(ctx);
						if_block1.c();
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
			}
		};
	}

	function instance$s($$self, $$props, $$invalidate) {
		let { items = [] } = $$props;
		let editing = false;
		let editIndex = -1;
		let input;

		function add() {
			items.push('');
			$$invalidate(2, editIndex = items.length - 1);
			$$invalidate(1, editing = true);
			$$invalidate(0, items);
		}

		function end() {
			if (!items[editIndex]) items.splice(editIndex, 1);
			$$invalidate(1, editing = false);
			$$invalidate(2, editIndex = -1);
			$$invalidate(0, items);
		}

		afterUpdate(() => {
			if (input) input.focus();
		});

		const click_handler = i => {
			$$invalidate(1, editing = true);
			$$invalidate(2, editIndex = i);
		};

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(3, input);
			});
		}

		function input_1_input_handler() {
			items[editIndex] = this.value;
			$$invalidate(0, items);
		}

		$$self.$$set = $$props => {
			if ('items' in $$props) $$invalidate(0, items = $$props.items);
		};

		return [
			items,
			editing,
			editIndex,
			input,
			add,
			end,
			click_handler,
			input_1_binding,
			input_1_input_handler
		];
	}

	class TagList extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$s, create_fragment$s, safe_not_equal, { items: 0 });
		}
	}

	/* src\components\Nature.svelte generated by Svelte v4.2.20 */

	function create_if_block_1$g(ctx) {
		let div;
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding(value) {
			/*bubbles_value_binding*/ ctx[5](value);
		}

		let bubbles_props = {
			count: /*maxPass*/ ctx[1],
			$$slots: { default: [create_default_slot_1$5] },
			$$scope: { ctx }
		};

		if (/*nature*/ ctx[0].pass !== void 0) {
			bubbles_props.value = /*nature*/ ctx[0].pass;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

		return {
			c() {
				div = element("div");
				create_component(bubbles.$$.fragment);
				attr(div, "class", "d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(bubbles, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*maxPass*/ 2) bubbles_changes.count = /*maxPass*/ ctx[1];

				if (dirty & /*$$scope*/ 256) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*nature*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*nature*/ ctx[0].pass;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(bubbles);
			}
		};
	}

	// (37:12) <Bubbles count={maxPass} bind:value={nature.pass}>
	function create_default_slot_1$5(ctx) {
		let t;

		return {
			c() {
				t = text("pass");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (40:8) {#if maxFail > 0 && nature.maximum < maxNature}
	function create_if_block$j(ctx) {
		let div;
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding_1(value) {
			/*bubbles_value_binding_1*/ ctx[6](value);
		}

		let bubbles_props = {
			count: /*maxFail*/ ctx[2],
			$$slots: { default: [create_default_slot$6] },
			$$scope: { ctx }
		};

		if (/*nature*/ ctx[0].fail !== void 0) {
			bubbles_props.value = /*nature*/ ctx[0].fail;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_1));

		return {
			c() {
				div = element("div");
				create_component(bubbles.$$.fragment);
				attr(div, "class", "d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(bubbles, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*maxFail*/ 4) bubbles_changes.count = /*maxFail*/ ctx[2];

				if (dirty & /*$$scope*/ 256) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*nature*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*nature*/ ctx[0].fail;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(bubbles);
			}
		};
	}

	// (42:12) <Bubbles count={maxFail} bind:value={nature.fail}>
	function create_default_slot$6(ctx) {
		let t;

		return {
			c() {
				t = text("fail");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$r(ctx) {
		let div3;
		let div2;
		let div0;
		let h20;
		let t1;
		let h21;
		let button0;
		let t2_value = /*nature*/ ctx[0].current + "";
		let t2;
		let t3;
		let h22;
		let t5;
		let h23;
		let button1;
		let t6_value = /*nature*/ ctx[0].maximum + "";
		let t6;
		let t7;
		let t8;
		let t9;
		let div1;
		let taglist;
		let updating_items;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*nature*/ ctx[0].maximum < maxNature && create_if_block_1$g(ctx);
		let if_block1 = /*maxFail*/ ctx[2] > 0 && /*nature*/ ctx[0].maximum < maxNature && create_if_block$j(ctx);

		function taglist_items_binding(value) {
			/*taglist_items_binding*/ ctx[7](value);
		}

		let taglist_props = {};

		if (/*nature*/ ctx[0].descriptors !== void 0) {
			taglist_props.items = /*nature*/ ctx[0].descriptors;
		}

		taglist = new TagList({ props: taglist_props });
		binding_callbacks.push(() => bind(taglist, 'items', taglist_items_binding));

		return {
			c() {
				div3 = element("div");
				div2 = element("div");
				div0 = element("div");
				h20 = element("h2");
				h20.textContent = "Nature";
				t1 = space();
				h21 = element("h2");
				button0 = element("button");
				t2 = text(t2_value);
				t3 = space();
				h22 = element("h2");
				h22.innerHTML = `<span class="m-1">/</span>`;
				t5 = space();
				h23 = element("h2");
				button1 = element("button");
				t6 = text(t6_value);
				t7 = space();
				if (if_block0) if_block0.c();
				t8 = space();
				if (if_block1) if_block1.c();
				t9 = space();
				div1 = element("div");
				create_component(taglist.$$.fragment);
				attr(h20, "class", "mr-auto");
				attr(button0, "class", "btn badge btn-dark");
				attr(button1, "class", "btn badge btn-dark");
				attr(div0, "class", "d-flex");
				attr(div1, "class", "mt-2");
				attr(div2, "class", "card-body");
				attr(div3, "id", "$" + this.id);
				attr(div3, "class", "card text-nowrap");
			},
			m(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div2);
				append(div2, div0);
				append(div0, h20);
				append(div0, t1);
				append(div0, h21);
				append(h21, button0);
				append(button0, t2);
				append(div0, t3);
				append(div0, h22);
				append(div0, t5);
				append(div0, h23);
				append(h23, button1);
				append(button1, t6);
				append(div2, t7);
				if (if_block0) if_block0.m(div2, null);
				append(div2, t8);
				if (if_block1) if_block1.m(div2, null);
				append(div2, t9);
				append(div2, div1);
				mount_component(taglist, div1, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*currentClick*/ ctx[3]),
						listen(button1, "click", /*maxClick*/ ctx[4])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if ((!current || dirty & /*nature*/ 1) && t2_value !== (t2_value = /*nature*/ ctx[0].current + "")) set_data(t2, t2_value);
				if ((!current || dirty & /*nature*/ 1) && t6_value !== (t6_value = /*nature*/ ctx[0].maximum + "")) set_data(t6, t6_value);

				if (/*nature*/ ctx[0].maximum < maxNature) {
					if (if_block0) {
						if_block0.p(ctx, dirty);

						if (dirty & /*nature*/ 1) {
							transition_in(if_block0, 1);
						}
					} else {
						if_block0 = create_if_block_1$g(ctx);
						if_block0.c();
						transition_in(if_block0, 1);
						if_block0.m(div2, t8);
					}
				} else if (if_block0) {
					group_outros();

					transition_out(if_block0, 1, 1, () => {
						if_block0 = null;
					});

					check_outros();
				}

				if (/*maxFail*/ ctx[2] > 0 && /*nature*/ ctx[0].maximum < maxNature) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty & /*maxFail, nature*/ 5) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block$j(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(div2, t9);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}

				const taglist_changes = {};

				if (!updating_items && dirty & /*nature*/ 1) {
					updating_items = true;
					taglist_changes.items = /*nature*/ ctx[0].descriptors;
					add_flush_callback(() => updating_items = false);
				}

				taglist.$set(taglist_changes);
			},
			i(local) {
				if (current) return;
				transition_in(if_block0);
				transition_in(if_block1);
				transition_in(taglist.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(if_block0);
				transition_out(if_block1);
				transition_out(taglist.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div3);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				destroy_component(taglist);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	const maxNature = 7;

	function instance$r($$self, $$props, $$invalidate) {
		let maxFail;
		let maxPass;
		let { nature } = $$props;

		function currentClick(e) {
			$$invalidate(0, nature.current += e.shiftKey ? -1 : 1, nature);
			if (nature.current > nature.maximum) $$invalidate(0, nature.current = 0, nature); else if (nature.current < 0) $$invalidate(0, nature.current = nature.maximum, nature);
		}

		function maxClick(e) {
			$$invalidate(0, nature.maximum += e.shiftKey ? -1 : 1, nature);
			if (nature.maximum > maxNature) $$invalidate(0, nature.maximum = 0, nature); else if (nature.maximum < 0) $$invalidate(0, nature.maximum = maxNature, nature);
			if (nature.current > nature.maximum) $$invalidate(0, nature.current = nature.maximum, nature);
		}

		function bubbles_value_binding(value) {
			if ($$self.$$.not_equal(nature.pass, value)) {
				nature.pass = value;
				$$invalidate(0, nature);
			}
		}

		function bubbles_value_binding_1(value) {
			if ($$self.$$.not_equal(nature.fail, value)) {
				nature.fail = value;
				$$invalidate(0, nature);
			}
		}

		function taglist_items_binding(value) {
			if ($$self.$$.not_equal(nature.descriptors, value)) {
				nature.descriptors = value;
				$$invalidate(0, nature);
			}
		}

		$$self.$$set = $$props => {
			if ('nature' in $$props) $$invalidate(0, nature = $$props.nature);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*nature*/ 1) {
				$$invalidate(2, maxFail = nature.maximum < 2 ? 0 : nature.maximum - 1);
			}

			if ($$self.$$.dirty & /*nature*/ 1) {
				$$invalidate(1, maxPass = nature.maximum < 1 ? 1 : nature.maximum);
			}
		};

		return [
			nature,
			maxPass,
			maxFail,
			currentClick,
			maxClick,
			bubbles_value_binding,
			bubbles_value_binding_1,
			taglist_items_binding
		];
	}

	class Nature extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$r, create_fragment$r, safe_not_equal, { nature: 0 });
		}
	}

	/* src\components\Abilities.svelte generated by Svelte v4.2.20 */

	function create_fragment$q(ctx) {
		let div9;
		let div8;
		let div0;
		let ability0;
		let t0;
		let ability1;
		let t1;
		let nature;
		let t2;
		let div7;
		let ability2;
		let t3;
		let ability3;
		let t4;
		let div2;
		let div1;
		let h20;
		let t6;
		let h5;
		let button0;
		let t8;
		let h21;
		let button1;
		let t9_value = /*model*/ ctx[0].abilities.lifestyle + "";
		let t9;
		let t10;
		let div4;
		let div3;
		let h22;
		let t12;
		let h23;
		let button2;
		let t13_value = /*model*/ ctx[0].abilities.might + "";
		let t13;
		let t14;
		let div6;
		let div5;
		let h24;
		let t16;
		let h25;
		let button3;
		let t17_value = /*model*/ ctx[0].abilities.precedence + "";
		let t17;
		let current;
		let mounted;
		let dispose;

		ability0 = new Ability({
				props: { ability: /*model*/ ctx[0].abilities.will }
			});

		ability1 = new Ability({
				props: {
					ability: /*model*/ ctx[0].abilities.health
				}
			});

		nature = new Nature({
				props: {
					nature: /*model*/ ctx[0].abilities.nature
				}
			});

		ability2 = new Ability({
				props: {
					ability: /*model*/ ctx[0].abilities.resources
				}
			});

		ability3 = new Ability({
				props: {
					ability: /*model*/ ctx[0].abilities.circles
				}
			});

		return {
			c() {
				div9 = element("div");
				div8 = element("div");
				div0 = element("div");
				create_component(ability0.$$.fragment);
				t0 = space();
				create_component(ability1.$$.fragment);
				t1 = space();
				create_component(nature.$$.fragment);
				t2 = space();
				div7 = element("div");
				create_component(ability2.$$.fragment);
				t3 = space();
				create_component(ability3.$$.fragment);
				t4 = space();
				div2 = element("div");
				div1 = element("div");
				h20 = element("h2");
				h20.textContent = "Lifestyle";
				t6 = space();
				h5 = element("h5");
				button0 = element("button");
				button0.textContent = "reset";
				t8 = space();
				h21 = element("h2");
				button1 = element("button");
				t9 = text(t9_value);
				t10 = space();
				div4 = element("div");
				div3 = element("div");
				h22 = element("h2");
				h22.textContent = "Might";
				t12 = space();
				h23 = element("h2");
				button2 = element("button");
				t13 = text(t13_value);
				t14 = space();
				div6 = element("div");
				div5 = element("div");
				h24 = element("h2");
				h24.textContent = "Precedence";
				t16 = space();
				h25 = element("h2");
				button3 = element("button");
				t17 = text(t17_value);
				attr(div0, "class", "col-md-6");
				attr(button0, "class", "btn badge btn-light border align-self-center");
				attr(h5, "class", "ml-2");
				attr(button1, "class", "btn badge btn-dark");
				attr(h21, "class", "ml-auto");
				attr(div1, "class", "card-body d-flex");
				attr(div2, "class", "card");
				attr(h22, "class", "mr-auto");
				attr(button2, "class", "btn badge btn-dark");
				attr(div3, "class", "card-body d-flex");
				attr(div4, "class", "card");
				attr(h24, "class", "mr-auto");
				attr(button3, "class", "btn badge btn-dark");
				attr(div5, "class", "card-body d-flex");
				attr(div6, "class", "card");
				attr(div7, "class", "col-md-6");
				attr(div8, "class", "row");
				attr(div9, "id", "$" + this.id);
				attr(div9, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div8);
				append(div8, div0);
				mount_component(ability0, div0, null);
				append(div0, t0);
				mount_component(ability1, div0, null);
				append(div0, t1);
				mount_component(nature, div0, null);
				append(div8, t2);
				append(div8, div7);
				mount_component(ability2, div7, null);
				append(div7, t3);
				mount_component(ability3, div7, null);
				append(div7, t4);
				append(div7, div2);
				append(div2, div1);
				append(div1, h20);
				append(div1, t6);
				append(div1, h5);
				append(h5, button0);
				append(div1, t8);
				append(div1, h21);
				append(h21, button1);
				append(button1, t9);
				append(div7, t10);
				append(div7, div4);
				append(div4, div3);
				append(div3, h22);
				append(div3, t12);
				append(div3, h23);
				append(h23, button2);
				append(button2, t13);
				append(div7, t14);
				append(div7, div6);
				append(div6, div5);
				append(div5, h24);
				append(div5, t16);
				append(div5, h25);
				append(h25, button3);
				append(button3, t17);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler*/ ctx[2]),
						listen(button1, "click", /*click_handler_1*/ ctx[3]),
						listen(button2, "click", /*click_handler_2*/ ctx[4]),
						listen(button3, "click", /*click_handler_3*/ ctx[5])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				const ability0_changes = {};
				if (dirty & /*model*/ 1) ability0_changes.ability = /*model*/ ctx[0].abilities.will;
				ability0.$set(ability0_changes);
				const ability1_changes = {};
				if (dirty & /*model*/ 1) ability1_changes.ability = /*model*/ ctx[0].abilities.health;
				ability1.$set(ability1_changes);
				const nature_changes = {};
				if (dirty & /*model*/ 1) nature_changes.nature = /*model*/ ctx[0].abilities.nature;
				nature.$set(nature_changes);
				const ability2_changes = {};
				if (dirty & /*model*/ 1) ability2_changes.ability = /*model*/ ctx[0].abilities.resources;
				ability2.$set(ability2_changes);
				const ability3_changes = {};
				if (dirty & /*model*/ 1) ability3_changes.ability = /*model*/ ctx[0].abilities.circles;
				ability3.$set(ability3_changes);
				if ((!current || dirty & /*model*/ 1) && t9_value !== (t9_value = /*model*/ ctx[0].abilities.lifestyle + "")) set_data(t9, t9_value);
				if ((!current || dirty & /*model*/ 1) && t13_value !== (t13_value = /*model*/ ctx[0].abilities.might + "")) set_data(t13, t13_value);
				if ((!current || dirty & /*model*/ 1) && t17_value !== (t17_value = /*model*/ ctx[0].abilities.precedence + "")) set_data(t17, t17_value);
			},
			i(local) {
				if (current) return;
				transition_in(ability0.$$.fragment, local);
				transition_in(ability1.$$.fragment, local);
				transition_in(nature.$$.fragment, local);
				transition_in(ability2.$$.fragment, local);
				transition_in(ability3.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(ability0.$$.fragment, local);
				transition_out(ability1.$$.fragment, local);
				transition_out(nature.$$.fragment, local);
				transition_out(ability2.$$.fragment, local);
				transition_out(ability3.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div9);
				}

				destroy_component(ability0);
				destroy_component(ability1);
				destroy_component(nature);
				destroy_component(ability2);
				destroy_component(ability3);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$q($$self, $$props, $$invalidate) {
		let { model } = $$props;

		function increment(e, args) {
			let val = model.abilities[args.ability] + (e.shiftKey ? -1 : 1);
			if (val < 0) val = args.max;
			if (val > args.max) val = 0;
			$$invalidate(0, model.abilities[args.ability] = val, model);
		}

		const click_handler = () => $$invalidate(0, model.abilities.lifestyle = 0, model);
		const click_handler_1 = e => increment(e, { max: 99, ability: 'lifestyle' });
		const click_handler_2 = e => increment(e, { max: 8, ability: 'might' });
		const click_handler_3 = e => increment(e, { max: 7, ability: 'precedence' });

		$$self.$$set = $$props => {
			if ('model' in $$props) $$invalidate(0, model = $$props.model);
		};

		return [
			model,
			increment,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3
		];
	}

	class Abilities extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$q, create_fragment$q, safe_not_equal, { model: 0 });
		}
	}

	/* src\components\Advancement.svelte generated by Svelte v4.2.20 */

	function get_each_context$c(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[12] = list[i];
		return child_ctx;
	}

	function get_each_context_1$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[15] = list[i];
		return child_ctx;
	}

	// (43:8) {#each ['Fate', 'Persona'] as artha}
	function create_each_block_1$3(ctx) {
		let div5;
		let div4;
		let div3;
		let h2;
		let t1;
		let div2;
		let div0;
		let button0;
		let t2_value = /*model*/ ctx[0].advancement[`current${/*artha*/ ctx[15]}`] + "";
		let t2;
		let t3;
		let button1;
		let t5;
		let div1;
		let button2;
		let t6_value = /*model*/ ctx[0].advancement[`spent${/*artha*/ ctx[15]}`] + "";
		let t6;
		let t7;
		let t8;
		let button3;
		let mounted;
		let dispose;

		function click_handler() {
			return /*click_handler*/ ctx[6](/*artha*/ ctx[15]);
		}

		function click_handler_1() {
			return /*click_handler_1*/ ctx[7](/*artha*/ ctx[15]);
		}

		function click_handler_2() {
			return /*click_handler_2*/ ctx[8](/*artha*/ ctx[15]);
		}

		function click_handler_3() {
			return /*click_handler_3*/ ctx[9](/*artha*/ ctx[15]);
		}

		return {
			c() {
				div5 = element("div");
				div4 = element("div");
				div3 = element("div");
				h2 = element("h2");
				h2.textContent = `${/*artha*/ ctx[15]}`;
				t1 = space();
				div2 = element("div");
				div0 = element("div");
				button0 = element("button");
				t2 = text(t2_value);
				t3 = space();
				button1 = element("button");
				button1.textContent = "↓";
				t5 = space();
				div1 = element("div");
				button2 = element("button");
				t6 = text(t6_value);
				t7 = text(" spent");
				t8 = space();
				button3 = element("button");
				button3.textContent = "←";
				attr(h2, "class", "card-subtitle mb-1");
				attr(button0, "class", "btn btn-dark");
				attr(button1, "class", "btn btn-light border border-dark");
				attr(div0, "class", "btn-group align-self-center mr-1");
				attr(button2, "class", "btn btn-dark");
				attr(button3, "class", "btn btn-light border border-dark");
				attr(div1, "class", "btn-group align-self-center");
				attr(div2, "class", "d-flex");
				attr(div3, "class", "card-body");
				attr(div4, "class", "card");
				attr(div5, "class", "col-md-6");
			},
			m(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div4);
				append(div4, div3);
				append(div3, h2);
				append(div3, t1);
				append(div3, div2);
				append(div2, div0);
				append(div0, button0);
				append(button0, t2);
				append(div0, t3);
				append(div0, button1);
				append(div2, t5);
				append(div2, div1);
				append(div1, button2);
				append(button2, t6);
				append(button2, t7);
				append(div1, t8);
				append(div1, button3);

				if (!mounted) {
					dispose = [
						listen(button0, "click", click_handler),
						listen(button1, "click", click_handler_1),
						listen(button2, "click", click_handler_2),
						listen(button3, "click", click_handler_3)
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*model*/ 1 && t2_value !== (t2_value = /*model*/ ctx[0].advancement[`current${/*artha*/ ctx[15]}`] + "")) set_data(t2, t2_value);
				if (dirty & /*model*/ 1 && t6_value !== (t6_value = /*model*/ ctx[0].advancement[`spent${/*artha*/ ctx[15]}`] + "")) set_data(t6, t6_value);
			},
			d(detaching) {
				if (detaching) {
					detach(div5);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (70:16) {:else}
	function create_else_block$f(ctx) {
		let div0;
		let h5;
		let t1;
		let button;
		let t3;
		let div1;
		let table;
		let thead;
		let t9;
		let tbody;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(/*levels*/ ctx[2]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$c(get_each_context$c(ctx, each_value, i));
		}

		return {
			c() {
				div0 = element("div");
				h5 = element("h5");
				h5.textContent = "Level Requirements";
				t1 = space();
				button = element("button");
				button.innerHTML = `<span aria-hidden="true">✗</span>`;
				t3 = space();
				div1 = element("div");
				table = element("table");
				thead = element("thead");
				thead.innerHTML = `<tr><th>Level</th> <th>Fate</th> <th>Persona</th></tr>`;
				t9 = space();
				tbody = element("tbody");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(h5, "id", "levelRequirementsTitle");
				attr(button, "type", "button");
				attr(button, "class", "position-topright close");
				attr(button, "aria-label", "Close");
				attr(div0, "class", "card-header");
				attr(table, "class", "table");
				attr(div1, "class", "card-body");
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				append(div0, h5);
				append(div0, t1);
				append(div0, button);
				insert(target, t3, anchor);
				insert(target, div1, anchor);
				append(div1, table);
				append(table, thead);
				append(table, t9);
				append(table, tbody);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(tbody, null);
					}
				}

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_5*/ ctx[11]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*levels*/ 4) {
					each_value = ensure_array_like(/*levels*/ ctx[2]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$c(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$c(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(tbody, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t3);
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};
	}

	// (64:16) {#if !showHelp}
	function create_if_block$i(ctx) {
		let div;
		let h2;
		let t1;
		let taglist;
		let t2;
		let button;
		let current;
		let mounted;
		let dispose;

		taglist = new TagList({
				props: {
					items: /*model*/ ctx[0].advancement.levelBenefits
				}
			});

		return {
			c() {
				div = element("div");
				h2 = element("h2");
				h2.textContent = "Level Benefits";
				t1 = space();
				create_component(taglist.$$.fragment);
				t2 = space();
				button = element("button");
				button.textContent = "?";
				attr(h2, "class", "mr-auto");
				attr(button, "class", "position-topright btn badge btn-light border border-dark");
				attr(div, "class", "card-body");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h2);
				append(div, t1);
				mount_component(taglist, div, null);
				append(div, t2);
				append(div, button);
				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_4*/ ctx[10]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				const taglist_changes = {};
				if (dirty & /*model*/ 1) taglist_changes.items = /*model*/ ctx[0].advancement.levelBenefits;
				taglist.$set(taglist_changes);
			},
			i(local) {
				if (current) return;
				transition_in(taglist.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(taglist.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(taglist);
				mounted = false;
				dispose();
			}
		};
	}

	// (87:28) {#each levels as level}
	function create_each_block$c(ctx) {
		let tr;
		let td0;
		let t1;
		let td1;
		let t3;
		let td2;
		let t5;

		return {
			c() {
				tr = element("tr");
				td0 = element("td");
				td0.textContent = `${/*level*/ ctx[12].level}`;
				t1 = space();
				td1 = element("td");
				td1.textContent = `${/*level*/ ctx[12].fate}`;
				t3 = space();
				td2 = element("td");
				td2.textContent = `${/*level*/ ctx[12].persona}`;
				t5 = space();
			},
			m(target, anchor) {
				insert(target, tr, anchor);
				append(tr, td0);
				append(tr, t1);
				append(tr, td1);
				append(tr, t3);
				append(tr, td2);
				append(tr, t5);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(tr);
				}
			}
		};
	}

	function create_fragment$p(ctx) {
		let div3;
		let div2;
		let t;
		let div1;
		let div0;
		let current_block_type_index;
		let if_block;
		let current;
		let each_value_1 = ensure_array_like(['Fate', 'Persona']);
		let each_blocks = [];

		for (let i = 0; i < 2; i += 1) {
			each_blocks[i] = create_each_block_1$3(get_each_context_1$3(ctx, each_value_1, i));
		}

		const if_block_creators = [create_if_block$i, create_else_block$f];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (!/*showHelp*/ ctx[1]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				div3 = element("div");
				div2 = element("div");

				for (let i = 0; i < 2; i += 1) {
					each_blocks[i].c();
				}

				t = space();
				div1 = element("div");
				div0 = element("div");
				if_block.c();
				attr(div0, "class", "card");
				attr(div1, "class", "col-12");
				attr(div2, "class", "row");
				attr(div3, "class", "container-fluid text-nowrap");
			},
			m(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div2);

				for (let i = 0; i < 2; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div2, null);
					}
				}

				append(div2, t);
				append(div2, div1);
				append(div1, div0);
				if_blocks[current_block_type_index].m(div0, null);
				current = true;
			},
			p(ctx, [dirty]) {
				if (dirty & /*unspend, spend, model, change*/ 57) {
					each_value_1 = ensure_array_like(['Fate', 'Persona']);
					let i;

					for (i = 0; i < 2; i += 1) {
						const child_ctx = get_each_context_1$3(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1$3(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div2, t);
						}
					}

					for (; i < 2; i += 1) {
						each_blocks[i].d(1);
					}
				}

				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div0, null);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div3);
				}

				destroy_each(each_blocks, detaching);
				if_blocks[current_block_type_index].d();
			}
		};
	}

	function instance$p($$self, $$props, $$invalidate) {
		let { model } = $$props;
		let showHelp = false;

		const levels = [
			{ level: 1, fate: 0, persona: 0 },
			{ level: 2, fate: 3, persona: 3 },
			{ level: 3, fate: 7, persona: 6 },
			{ level: 4, fate: 14, persona: 12 },
			{ level: 5, fate: 22, persona: 20 },
			{ level: 6, fate: 31, persona: 30 },
			{ level: 7, fate: 41, persona: 42 },
			{ level: 8, fate: 52, persona: 56 },
			{ level: 9, fate: 64, persona: 72 },
			{ level: 10, fate: 78, persona: 98 }
		];

		function change(property, val) {
			$$invalidate(0, model.advancement[property] += val, model);
			if (model.advancement[property] < 0) $$invalidate(0, model.advancement[property] = 0, model);
		}

		function spend(artha) {
			if (model.advancement[`current${artha}`] == 0) return;
			$$invalidate(0, model.advancement[`current${artha}`]--, model);
			$$invalidate(0, model.advancement[`spent${artha}`]++, model);
		}

		function unspend(artha) {
			if (model.advancement[`spent${artha}`] == 0) return;
			$$invalidate(0, model.advancement[`current${artha}`]++, model);
			$$invalidate(0, model.advancement[`spent${artha}`]--, model);
		}

		const click_handler = artha => change(`current${artha}`, 1);
		const click_handler_1 = artha => change(`current${artha}`, -1);
		const click_handler_2 = artha => spend(artha);
		const click_handler_3 = artha => unspend(artha);
		const click_handler_4 = () => $$invalidate(1, showHelp = true);
		const click_handler_5 = () => $$invalidate(1, showHelp = false);

		$$self.$$set = $$props => {
			if ('model' in $$props) $$invalidate(0, model = $$props.model);
		};

		return [
			model,
			showHelp,
			levels,
			change,
			spend,
			unspend,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			click_handler_5
		];
	}

	class Advancement extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$p, create_fragment$p, safe_not_equal, { model: 0 });
		}
	}

	/* src\components\TextArea.svelte generated by Svelte v4.2.20 */

	function get_each_context$b(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[15] = list[i];
		child_ctx[17] = i;
		return child_ctx;
	}

	// (33:0) {:else}
	function create_else_block$e(ctx) {
		let span;
		let t;
		let button;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[10].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

		function select_block_type_1(ctx, dirty) {
			if (/*matches*/ ctx[1].length == 0) return create_if_block_1$f;
			return create_else_block_1$6;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				span = element("span");
				if (default_slot) default_slot.c();
				t = space();
				button = element("button");
				if_block.c();
				attr(span, "class", "py-2 border-bottom font-weight-bold");
				attr(button, "class", "btn btn-light text-left align-top wrap w-100");
				set_style(button, "min-height", "2.5em");
			},
			m(target, anchor) {
				insert(target, span, anchor);

				if (default_slot) {
					default_slot.m(span, null);
				}

				insert(target, t, anchor);
				insert(target, button, anchor);
				if_block.m(button, null);
				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[14]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 512)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[9],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, null),
							null
						);
					}
				}

				if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(button, null);
					}
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(span);
					detach(t);
					detach(button);
				}

				if (default_slot) default_slot.d(detaching);
				if_block.d();
				mounted = false;
				dispose();
			}
		};
	}

	// (24:0) {#if active}
	function create_if_block$h(ctx) {
		let span;
		let t;
		let textarea;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[10].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

		return {
			c() {
				span = element("span");
				if (default_slot) default_slot.c();
				t = space();
				textarea = element("textarea");
				attr(span, "class", "py-2 border-bottom font-weight-bold");
				attr(textarea, "class", "flex-grow-1 form-control");
			},
			m(target, anchor) {
				insert(target, span, anchor);

				if (default_slot) {
					default_slot.m(span, null);
				}

				insert(target, t, anchor);
				insert(target, textarea, anchor);
				/*textarea_binding*/ ctx[11](textarea);
				set_input_value(textarea, /*content*/ ctx[0]);
				current = true;

				if (!mounted) {
					dispose = [
						listen(textarea, "input", /*textarea_input_handler*/ ctx[12]),
						listen(textarea, "blur", /*blur_handler*/ ctx[13]),
						listen(textarea, "focus", /*resizeInput*/ ctx[6]),
						listen(textarea, "keyup", /*resizeInput*/ ctx[6])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 512)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[9],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, null),
							null
						);
					}
				}

				if (dirty & /*content*/ 1) {
					set_input_value(textarea, /*content*/ ctx[0]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(span);
					detach(t);
					detach(textarea);
				}

				if (default_slot) default_slot.d(detaching);
				/*textarea_binding*/ ctx[11](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (38:4) {:else}
	function create_else_block_1$6(ctx) {
		let each_1_anchor;
		let each_value = ensure_array_like(/*matches*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$b(get_each_context$b(ctx, each_value, i));
		}

		return {
			c() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert(target, each_1_anchor, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*content, matches, lastFragment, firstFragment*/ 51) {
					each_value = ensure_array_like(/*matches*/ ctx[1]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$b(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$b(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			d(detaching) {
				if (detaching) {
					detach(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	// (36:4) {#if matches.length == 0}
	function create_if_block_1$f(ctx) {
		let t;

		return {
			c() {
				t = text(/*content*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*content*/ 1) set_data(t, /*content*/ ctx[0]);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (40:12) {#if i == 0}
	function create_if_block_3$4(ctx) {
		let t;

		return {
			c() {
				t = text(/*firstFragment*/ ctx[5]);
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*firstFragment*/ 32) set_data(t, /*firstFragment*/ ctx[5]);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (40:183) {:else}
	function create_else_block_2$2(ctx) {
		let t;

		return {
			c() {
				t = text(/*lastFragment*/ ctx[4]);
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*lastFragment*/ 16) set_data(t, /*lastFragment*/ ctx[4]);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (40:83) {#if i < matches.length - 1}
	function create_if_block_2$9(ctx) {
		let t_value = /*content*/ ctx[0].substring(/*match*/ ctx[15].index + /*match*/ ctx[15][0].length, /*matches*/ ctx[1][/*i*/ ctx[17] + 1].index) + "";
		let t;

		return {
			c() {
				t = text(t_value);
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*content, matches*/ 3 && t_value !== (t_value = /*content*/ ctx[0].substring(/*match*/ ctx[15].index + /*match*/ ctx[15][0].length, /*matches*/ ctx[1][/*i*/ ctx[17] + 1].index) + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (39:8) {#each matches as match, i}
	function create_each_block$b(ctx) {
		let span;
		let t_value = /*match*/ ctx[15][0] + "";
		let t;
		let if_block1_anchor;
		let if_block0 = /*i*/ ctx[17] == 0 && create_if_block_3$4(ctx);

		function select_block_type_2(ctx, dirty) {
			if (/*i*/ ctx[17] < /*matches*/ ctx[1].length - 1) return create_if_block_2$9;
			return create_else_block_2$2;
		}

		let current_block_type = select_block_type_2(ctx);
		let if_block1 = current_block_type(ctx);

		return {
			c() {
				if (if_block0) if_block0.c();
				span = element("span");
				t = text(t_value);
				if_block1.c();
				if_block1_anchor = empty();
				attr(span, "class", "bg-info");
			},
			m(target, anchor) {
				if (if_block0) if_block0.m(target, anchor);
				insert(target, span, anchor);
				append(span, t);
				if_block1.m(target, anchor);
				insert(target, if_block1_anchor, anchor);
			},
			p(ctx, dirty) {
				if (/*i*/ ctx[17] == 0) if_block0.p(ctx, dirty);
				if (dirty & /*matches*/ 2 && t_value !== (t_value = /*match*/ ctx[15][0] + "")) set_data(t, t_value);

				if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type(ctx);

					if (if_block1) {
						if_block1.c();
						if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
					}
				}
			},
			d(detaching) {
				if (detaching) {
					detach(span);
					detach(if_block1_anchor);
				}

				if (if_block0) if_block0.d(detaching);
				if_block1.d(detaching);
			}
		};
	}

	function create_fragment$o(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$h, create_else_block$e];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*active*/ ctx[2]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	function instance$o($$self, $$props, $$invalidate) {
		let regexp;
		let matches;
		let firstFragment;
		let lastFragment;
		let { $$slots: slots = {}, $$scope } = $$props;
		let { content = '' } = $$props;
		let { highlight = '' } = $$props;
		let active = false;
		let control;

		function resizeInput() {
			if (control) $$invalidate(3, control.style.height = `${control.scrollHeight + 2}px`, control);
		}

		afterUpdate(() => {
			if (active) control.focus();
		});

		function textarea_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				control = $$value;
				$$invalidate(3, control);
			});
		}

		function textarea_input_handler() {
			content = this.value;
			$$invalidate(0, content);
		}

		const blur_handler = () => $$invalidate(2, active = false);
		const click_handler = () => $$invalidate(2, active = true);

		$$self.$$set = $$props => {
			if ('content' in $$props) $$invalidate(0, content = $$props.content);
			if ('highlight' in $$props) $$invalidate(7, highlight = $$props.highlight);
			if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*highlight*/ 128) {
				$$invalidate(8, regexp = new RegExp(highlight, 'gi'));
			}

			if ($$self.$$.dirty & /*content, regexp*/ 257) {
				$$invalidate(1, matches = [...content.matchAll(regexp)]);
			}

			if ($$self.$$.dirty & /*matches, content*/ 3) {
				$$invalidate(5, firstFragment = matches.length == 0
				? ''
				: content.substring(0, matches[0].index));
			}

			if ($$self.$$.dirty & /*matches, content*/ 3) {
				$$invalidate(4, lastFragment = matches.length == 0
				? ''
				: content.substring(matches[matches.length - 1].index + matches[matches.length - 1][0].length));
			}
		};

		return [
			content,
			matches,
			active,
			control,
			lastFragment,
			firstFragment,
			resizeInput,
			highlight,
			regexp,
			$$scope,
			slots,
			textarea_binding,
			textarea_input_handler,
			blur_handler,
			click_handler
		];
	}

	class TextArea extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$o, create_fragment$o, safe_not_equal, { content: 0, highlight: 7 });
		}
	}

	/* src\components\TextInput.svelte generated by Svelte v4.2.20 */

	function create_else_block$d(ctx) {
		let div;
		let span;
		let t0;
		let button;
		let t1;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[4].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

		return {
			c() {
				div = element("div");
				span = element("span");
				if (default_slot) default_slot.c();
				t0 = space();
				button = element("button");
				t1 = text(/*content*/ ctx[0]);
				attr(span, "class", "align-self-center text-right border-right pr-1 py-2 font-weight-bold");
				set_style(span, "width", "4.5em");
				attr(button, "class", "flex-grow-1 btn btn-light text-left");
				attr(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, span);

				if (default_slot) {
					default_slot.m(span, null);
				}

				append(div, t0);
				append(div, button);
				append(button, t1);
				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[8]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[3],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
							null
						);
					}
				}

				if (!current || dirty & /*content*/ 1) set_data(t1, /*content*/ ctx[0]);
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				dispose();
			}
		};
	}

	// (14:0) {#if active}
	function create_if_block$g(ctx) {
		let div;
		let span;
		let t;
		let input;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[4].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

		return {
			c() {
				div = element("div");
				span = element("span");
				if (default_slot) default_slot.c();
				t = space();
				input = element("input");
				attr(span, "class", "align-self-center text-right mr-1 py-2 font-weight-bold");
				set_style(span, "width", "4.5em");
				set_style(span, "height", "2.5em");
				attr(input, "class", "flex-grow-1 form-control");
				attr(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, span);

				if (default_slot) {
					default_slot.m(span, null);
				}

				append(div, t);
				append(div, input);
				/*input_binding*/ ctx[5](input);
				set_input_value(input, /*content*/ ctx[0]);
				current = true;

				if (!mounted) {
					dispose = [
						listen(input, "input", /*input_input_handler*/ ctx[6]),
						listen(input, "blur", /*blur_handler*/ ctx[7])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[3],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
							null
						);
					}
				}

				if (dirty & /*content*/ 1 && input.value !== /*content*/ ctx[0]) {
					set_input_value(input, /*content*/ ctx[0]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if (default_slot) default_slot.d(detaching);
				/*input_binding*/ ctx[5](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function create_fragment$n(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$g, create_else_block$d];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*active*/ ctx[1]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	function instance$n($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		let { content = '' } = $$props;
		let active = false;
		let control;

		afterUpdate(() => {
			if (active) control.focus();
		});

		function input_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				control = $$value;
				$$invalidate(2, control);
			});
		}

		function input_input_handler() {
			content = this.value;
			$$invalidate(0, content);
		}

		const blur_handler = () => $$invalidate(1, active = false);
		const click_handler = () => $$invalidate(1, active = true);

		$$self.$$set = $$props => {
			if ('content' in $$props) $$invalidate(0, content = $$props.content);
			if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
		};

		return [
			content,
			active,
			control,
			$$scope,
			slots,
			input_binding,
			input_input_handler,
			blur_handler,
			click_handler
		];
	}

	class TextInput extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$n, create_fragment$n, safe_not_equal, { content: 0 });
		}
	}

	/* src\components\Bio.svelte generated by Svelte v4.2.20 */

	function create_default_slot_13(ctx) {
		let t;

		return {
			c() {
				t = text("Name");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (14:16) <TextInput bind:content={model.bio.stock}>
	function create_default_slot_12(ctx) {
		let t;

		return {
			c() {
				t = text("Stock");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (15:16) <TextInput bind:content={model.bio.classValue}>
	function create_default_slot_11(ctx) {
		let t;

		return {
			c() {
				t = text("Class");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (16:16) <TextInput bind:content={model.bio.home}>
	function create_default_slot_10(ctx) {
		let t;

		return {
			c() {
				t = text("Home");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (17:16) <TextInput bind:content={model.bio.raiment}>
	function create_default_slot_9$1(ctx) {
		let t;

		return {
			c() {
				t = text("Raiment");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (18:16) <TextInput bind:content={model.bio.epithet}>
	function create_default_slot_8$1(ctx) {
		let t;

		return {
			c() {
				t = text("Epithet");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (19:16) <TextInput bind:content={model.bio.parents}>
	function create_default_slot_7$2(ctx) {
		let t;

		return {
			c() {
				t = text("Parents");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (20:16) <TextInput bind:content={model.bio.mentor}>
	function create_default_slot_6$2(ctx) {
		let t;

		return {
			c() {
				t = text("Mentor");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (21:16) <TextInput bind:content={model.bio.age}>
	function create_default_slot_5$2(ctx) {
		let t;

		return {
			c() {
				t = text("Age");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (22:16) <TextInput bind:content={model.bio.level}>
	function create_default_slot_4$2(ctx) {
		let t;

		return {
			c() {
				t = text("Level");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (30:20) <TextArea bind:content={model.bio.belief}>
	function create_default_slot_3$2(ctx) {
		let t;

		return {
			c() {
				t = text("Belief");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (33:20) <TextArea bind:content={model.bio.creed}>
	function create_default_slot_2$3(ctx) {
		let t;

		return {
			c() {
				t = text("Creed");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (36:20) <TextArea bind:content={model.bio.goal}>
	function create_default_slot_1$4(ctx) {
		let t;

		return {
			c() {
				t = text("Goal");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (39:20) <TextArea bind:content={model.bio.instinct}>
	function create_default_slot$5(ctx) {
		let t;

		return {
			c() {
				t = text("Instinct");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$m(ctx) {
		let div10;
		let div2;
		let div1;
		let div0;
		let textinput0;
		let updating_content;
		let t0;
		let textinput1;
		let updating_content_1;
		let t1;
		let textinput2;
		let updating_content_2;
		let t2;
		let textinput3;
		let updating_content_3;
		let t3;
		let textinput4;
		let updating_content_4;
		let t4;
		let textinput5;
		let updating_content_5;
		let t5;
		let textinput6;
		let updating_content_6;
		let t6;
		let textinput7;
		let updating_content_7;
		let t7;
		let textinput8;
		let updating_content_8;
		let t8;
		let textinput9;
		let updating_content_9;
		let t9;
		let div9;
		let div8;
		let div7;
		let div3;
		let textarea0;
		let updating_content_10;
		let t10;
		let div4;
		let textarea1;
		let updating_content_11;
		let t11;
		let div5;
		let textarea2;
		let updating_content_12;
		let t12;
		let div6;
		let textarea3;
		let updating_content_13;
		let current;

		function textinput0_content_binding(value) {
			/*textinput0_content_binding*/ ctx[1](value);
		}

		let textinput0_props = {
			$$slots: { default: [create_default_slot_13] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.name !== void 0) {
			textinput0_props.content = /*model*/ ctx[0].bio.name;
		}

		textinput0 = new TextInput({ props: textinput0_props });
		binding_callbacks.push(() => bind(textinput0, 'content', textinput0_content_binding));

		function textinput1_content_binding(value) {
			/*textinput1_content_binding*/ ctx[2](value);
		}

		let textinput1_props = {
			$$slots: { default: [create_default_slot_12] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.stock !== void 0) {
			textinput1_props.content = /*model*/ ctx[0].bio.stock;
		}

		textinput1 = new TextInput({ props: textinput1_props });
		binding_callbacks.push(() => bind(textinput1, 'content', textinput1_content_binding));

		function textinput2_content_binding(value) {
			/*textinput2_content_binding*/ ctx[3](value);
		}

		let textinput2_props = {
			$$slots: { default: [create_default_slot_11] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.classValue !== void 0) {
			textinput2_props.content = /*model*/ ctx[0].bio.classValue;
		}

		textinput2 = new TextInput({ props: textinput2_props });
		binding_callbacks.push(() => bind(textinput2, 'content', textinput2_content_binding));

		function textinput3_content_binding(value) {
			/*textinput3_content_binding*/ ctx[4](value);
		}

		let textinput3_props = {
			$$slots: { default: [create_default_slot_10] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.home !== void 0) {
			textinput3_props.content = /*model*/ ctx[0].bio.home;
		}

		textinput3 = new TextInput({ props: textinput3_props });
		binding_callbacks.push(() => bind(textinput3, 'content', textinput3_content_binding));

		function textinput4_content_binding(value) {
			/*textinput4_content_binding*/ ctx[5](value);
		}

		let textinput4_props = {
			$$slots: { default: [create_default_slot_9$1] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.raiment !== void 0) {
			textinput4_props.content = /*model*/ ctx[0].bio.raiment;
		}

		textinput4 = new TextInput({ props: textinput4_props });
		binding_callbacks.push(() => bind(textinput4, 'content', textinput4_content_binding));

		function textinput5_content_binding(value) {
			/*textinput5_content_binding*/ ctx[6](value);
		}

		let textinput5_props = {
			$$slots: { default: [create_default_slot_8$1] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.epithet !== void 0) {
			textinput5_props.content = /*model*/ ctx[0].bio.epithet;
		}

		textinput5 = new TextInput({ props: textinput5_props });
		binding_callbacks.push(() => bind(textinput5, 'content', textinput5_content_binding));

		function textinput6_content_binding(value) {
			/*textinput6_content_binding*/ ctx[7](value);
		}

		let textinput6_props = {
			$$slots: { default: [create_default_slot_7$2] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.parents !== void 0) {
			textinput6_props.content = /*model*/ ctx[0].bio.parents;
		}

		textinput6 = new TextInput({ props: textinput6_props });
		binding_callbacks.push(() => bind(textinput6, 'content', textinput6_content_binding));

		function textinput7_content_binding(value) {
			/*textinput7_content_binding*/ ctx[8](value);
		}

		let textinput7_props = {
			$$slots: { default: [create_default_slot_6$2] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.mentor !== void 0) {
			textinput7_props.content = /*model*/ ctx[0].bio.mentor;
		}

		textinput7 = new TextInput({ props: textinput7_props });
		binding_callbacks.push(() => bind(textinput7, 'content', textinput7_content_binding));

		function textinput8_content_binding(value) {
			/*textinput8_content_binding*/ ctx[9](value);
		}

		let textinput8_props = {
			$$slots: { default: [create_default_slot_5$2] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.age !== void 0) {
			textinput8_props.content = /*model*/ ctx[0].bio.age;
		}

		textinput8 = new TextInput({ props: textinput8_props });
		binding_callbacks.push(() => bind(textinput8, 'content', textinput8_content_binding));

		function textinput9_content_binding(value) {
			/*textinput9_content_binding*/ ctx[10](value);
		}

		let textinput9_props = {
			$$slots: { default: [create_default_slot_4$2] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.level !== void 0) {
			textinput9_props.content = /*model*/ ctx[0].bio.level;
		}

		textinput9 = new TextInput({ props: textinput9_props });
		binding_callbacks.push(() => bind(textinput9, 'content', textinput9_content_binding));

		function textarea0_content_binding(value) {
			/*textarea0_content_binding*/ ctx[11](value);
		}

		let textarea0_props = {
			$$slots: { default: [create_default_slot_3$2] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.belief !== void 0) {
			textarea0_props.content = /*model*/ ctx[0].bio.belief;
		}

		textarea0 = new TextArea({ props: textarea0_props });
		binding_callbacks.push(() => bind(textarea0, 'content', textarea0_content_binding));

		function textarea1_content_binding(value) {
			/*textarea1_content_binding*/ ctx[12](value);
		}

		let textarea1_props = {
			$$slots: { default: [create_default_slot_2$3] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.creed !== void 0) {
			textarea1_props.content = /*model*/ ctx[0].bio.creed;
		}

		textarea1 = new TextArea({ props: textarea1_props });
		binding_callbacks.push(() => bind(textarea1, 'content', textarea1_content_binding));

		function textarea2_content_binding(value) {
			/*textarea2_content_binding*/ ctx[13](value);
		}

		let textarea2_props = {
			$$slots: { default: [create_default_slot_1$4] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.goal !== void 0) {
			textarea2_props.content = /*model*/ ctx[0].bio.goal;
		}

		textarea2 = new TextArea({ props: textarea2_props });
		binding_callbacks.push(() => bind(textarea2, 'content', textarea2_content_binding));

		function textarea3_content_binding(value) {
			/*textarea3_content_binding*/ ctx[14](value);
		}

		let textarea3_props = {
			$$slots: { default: [create_default_slot$5] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].bio.instinct !== void 0) {
			textarea3_props.content = /*model*/ ctx[0].bio.instinct;
		}

		textarea3 = new TextArea({ props: textarea3_props });
		binding_callbacks.push(() => bind(textarea3, 'content', textarea3_content_binding));

		return {
			c() {
				div10 = element("div");
				div2 = element("div");
				div1 = element("div");
				div0 = element("div");
				create_component(textinput0.$$.fragment);
				t0 = space();
				create_component(textinput1.$$.fragment);
				t1 = space();
				create_component(textinput2.$$.fragment);
				t2 = space();
				create_component(textinput3.$$.fragment);
				t3 = space();
				create_component(textinput4.$$.fragment);
				t4 = space();
				create_component(textinput5.$$.fragment);
				t5 = space();
				create_component(textinput6.$$.fragment);
				t6 = space();
				create_component(textinput7.$$.fragment);
				t7 = space();
				create_component(textinput8.$$.fragment);
				t8 = space();
				create_component(textinput9.$$.fragment);
				t9 = space();
				div9 = element("div");
				div8 = element("div");
				div7 = element("div");
				div3 = element("div");
				create_component(textarea0.$$.fragment);
				t10 = space();
				div4 = element("div");
				create_component(textarea1.$$.fragment);
				t11 = space();
				div5 = element("div");
				create_component(textarea2.$$.fragment);
				t12 = space();
				div6 = element("div");
				create_component(textarea3.$$.fragment);
				attr(div0, "class", "row");
				attr(div1, "class", "card-body");
				attr(div2, "class", "card");
				attr(div3, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
				attr(div4, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
				attr(div5, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
				attr(div6, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
				attr(div7, "class", "row");
				attr(div8, "class", "card-body");
				attr(div9, "class", "card");
				attr(div10, "id", "$" + this.id);
				attr(div10, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div10, anchor);
				append(div10, div2);
				append(div2, div1);
				append(div1, div0);
				mount_component(textinput0, div0, null);
				append(div0, t0);
				mount_component(textinput1, div0, null);
				append(div0, t1);
				mount_component(textinput2, div0, null);
				append(div0, t2);
				mount_component(textinput3, div0, null);
				append(div0, t3);
				mount_component(textinput4, div0, null);
				append(div0, t4);
				mount_component(textinput5, div0, null);
				append(div0, t5);
				mount_component(textinput6, div0, null);
				append(div0, t6);
				mount_component(textinput7, div0, null);
				append(div0, t7);
				mount_component(textinput8, div0, null);
				append(div0, t8);
				mount_component(textinput9, div0, null);
				append(div10, t9);
				append(div10, div9);
				append(div9, div8);
				append(div8, div7);
				append(div7, div3);
				mount_component(textarea0, div3, null);
				append(div7, t10);
				append(div7, div4);
				mount_component(textarea1, div4, null);
				append(div7, t11);
				append(div7, div5);
				mount_component(textarea2, div5, null);
				append(div7, t12);
				append(div7, div6);
				mount_component(textarea3, div6, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const textinput0_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput0_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content && dirty & /*model*/ 1) {
					updating_content = true;
					textinput0_changes.content = /*model*/ ctx[0].bio.name;
					add_flush_callback(() => updating_content = false);
				}

				textinput0.$set(textinput0_changes);
				const textinput1_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput1_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_1 && dirty & /*model*/ 1) {
					updating_content_1 = true;
					textinput1_changes.content = /*model*/ ctx[0].bio.stock;
					add_flush_callback(() => updating_content_1 = false);
				}

				textinput1.$set(textinput1_changes);
				const textinput2_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput2_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_2 && dirty & /*model*/ 1) {
					updating_content_2 = true;
					textinput2_changes.content = /*model*/ ctx[0].bio.classValue;
					add_flush_callback(() => updating_content_2 = false);
				}

				textinput2.$set(textinput2_changes);
				const textinput3_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput3_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_3 && dirty & /*model*/ 1) {
					updating_content_3 = true;
					textinput3_changes.content = /*model*/ ctx[0].bio.home;
					add_flush_callback(() => updating_content_3 = false);
				}

				textinput3.$set(textinput3_changes);
				const textinput4_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput4_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_4 && dirty & /*model*/ 1) {
					updating_content_4 = true;
					textinput4_changes.content = /*model*/ ctx[0].bio.raiment;
					add_flush_callback(() => updating_content_4 = false);
				}

				textinput4.$set(textinput4_changes);
				const textinput5_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput5_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_5 && dirty & /*model*/ 1) {
					updating_content_5 = true;
					textinput5_changes.content = /*model*/ ctx[0].bio.epithet;
					add_flush_callback(() => updating_content_5 = false);
				}

				textinput5.$set(textinput5_changes);
				const textinput6_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput6_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_6 && dirty & /*model*/ 1) {
					updating_content_6 = true;
					textinput6_changes.content = /*model*/ ctx[0].bio.parents;
					add_flush_callback(() => updating_content_6 = false);
				}

				textinput6.$set(textinput6_changes);
				const textinput7_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput7_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_7 && dirty & /*model*/ 1) {
					updating_content_7 = true;
					textinput7_changes.content = /*model*/ ctx[0].bio.mentor;
					add_flush_callback(() => updating_content_7 = false);
				}

				textinput7.$set(textinput7_changes);
				const textinput8_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput8_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_8 && dirty & /*model*/ 1) {
					updating_content_8 = true;
					textinput8_changes.content = /*model*/ ctx[0].bio.age;
					add_flush_callback(() => updating_content_8 = false);
				}

				textinput8.$set(textinput8_changes);
				const textinput9_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textinput9_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_9 && dirty & /*model*/ 1) {
					updating_content_9 = true;
					textinput9_changes.content = /*model*/ ctx[0].bio.level;
					add_flush_callback(() => updating_content_9 = false);
				}

				textinput9.$set(textinput9_changes);
				const textarea0_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textarea0_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_10 && dirty & /*model*/ 1) {
					updating_content_10 = true;
					textarea0_changes.content = /*model*/ ctx[0].bio.belief;
					add_flush_callback(() => updating_content_10 = false);
				}

				textarea0.$set(textarea0_changes);
				const textarea1_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textarea1_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_11 && dirty & /*model*/ 1) {
					updating_content_11 = true;
					textarea1_changes.content = /*model*/ ctx[0].bio.creed;
					add_flush_callback(() => updating_content_11 = false);
				}

				textarea1.$set(textarea1_changes);
				const textarea2_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textarea2_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_12 && dirty & /*model*/ 1) {
					updating_content_12 = true;
					textarea2_changes.content = /*model*/ ctx[0].bio.goal;
					add_flush_callback(() => updating_content_12 = false);
				}

				textarea2.$set(textarea2_changes);
				const textarea3_changes = {};

				if (dirty & /*$$scope*/ 32768) {
					textarea3_changes.$$scope = { dirty, ctx };
				}

				if (!updating_content_13 && dirty & /*model*/ 1) {
					updating_content_13 = true;
					textarea3_changes.content = /*model*/ ctx[0].bio.instinct;
					add_flush_callback(() => updating_content_13 = false);
				}

				textarea3.$set(textarea3_changes);
			},
			i(local) {
				if (current) return;
				transition_in(textinput0.$$.fragment, local);
				transition_in(textinput1.$$.fragment, local);
				transition_in(textinput2.$$.fragment, local);
				transition_in(textinput3.$$.fragment, local);
				transition_in(textinput4.$$.fragment, local);
				transition_in(textinput5.$$.fragment, local);
				transition_in(textinput6.$$.fragment, local);
				transition_in(textinput7.$$.fragment, local);
				transition_in(textinput8.$$.fragment, local);
				transition_in(textinput9.$$.fragment, local);
				transition_in(textarea0.$$.fragment, local);
				transition_in(textarea1.$$.fragment, local);
				transition_in(textarea2.$$.fragment, local);
				transition_in(textarea3.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(textinput0.$$.fragment, local);
				transition_out(textinput1.$$.fragment, local);
				transition_out(textinput2.$$.fragment, local);
				transition_out(textinput3.$$.fragment, local);
				transition_out(textinput4.$$.fragment, local);
				transition_out(textinput5.$$.fragment, local);
				transition_out(textinput6.$$.fragment, local);
				transition_out(textinput7.$$.fragment, local);
				transition_out(textinput8.$$.fragment, local);
				transition_out(textinput9.$$.fragment, local);
				transition_out(textarea0.$$.fragment, local);
				transition_out(textarea1.$$.fragment, local);
				transition_out(textarea2.$$.fragment, local);
				transition_out(textarea3.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div10);
				}

				destroy_component(textinput0);
				destroy_component(textinput1);
				destroy_component(textinput2);
				destroy_component(textinput3);
				destroy_component(textinput4);
				destroy_component(textinput5);
				destroy_component(textinput6);
				destroy_component(textinput7);
				destroy_component(textinput8);
				destroy_component(textinput9);
				destroy_component(textarea0);
				destroy_component(textarea1);
				destroy_component(textarea2);
				destroy_component(textarea3);
			}
		};
	}

	function instance$m($$self, $$props, $$invalidate) {
		let { model } = $$props;

		function textinput0_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.name, value)) {
				model.bio.name = value;
				$$invalidate(0, model);
			}
		}

		function textinput1_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.stock, value)) {
				model.bio.stock = value;
				$$invalidate(0, model);
			}
		}

		function textinput2_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.classValue, value)) {
				model.bio.classValue = value;
				$$invalidate(0, model);
			}
		}

		function textinput3_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.home, value)) {
				model.bio.home = value;
				$$invalidate(0, model);
			}
		}

		function textinput4_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.raiment, value)) {
				model.bio.raiment = value;
				$$invalidate(0, model);
			}
		}

		function textinput5_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.epithet, value)) {
				model.bio.epithet = value;
				$$invalidate(0, model);
			}
		}

		function textinput6_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.parents, value)) {
				model.bio.parents = value;
				$$invalidate(0, model);
			}
		}

		function textinput7_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.mentor, value)) {
				model.bio.mentor = value;
				$$invalidate(0, model);
			}
		}

		function textinput8_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.age, value)) {
				model.bio.age = value;
				$$invalidate(0, model);
			}
		}

		function textinput9_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.level, value)) {
				model.bio.level = value;
				$$invalidate(0, model);
			}
		}

		function textarea0_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.belief, value)) {
				model.bio.belief = value;
				$$invalidate(0, model);
			}
		}

		function textarea1_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.creed, value)) {
				model.bio.creed = value;
				$$invalidate(0, model);
			}
		}

		function textarea2_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.goal, value)) {
				model.bio.goal = value;
				$$invalidate(0, model);
			}
		}

		function textarea3_content_binding(value) {
			if ($$self.$$.not_equal(model.bio.instinct, value)) {
				model.bio.instinct = value;
				$$invalidate(0, model);
			}
		}

		$$self.$$set = $$props => {
			if ('model' in $$props) $$invalidate(0, model = $$props.model);
		};

		return [
			model,
			textinput0_content_binding,
			textinput1_content_binding,
			textinput2_content_binding,
			textinput3_content_binding,
			textinput4_content_binding,
			textinput5_content_binding,
			textinput6_content_binding,
			textinput7_content_binding,
			textinput8_content_binding,
			textinput9_content_binding,
			textarea0_content_binding,
			textarea1_content_binding,
			textarea2_content_binding,
			textarea3_content_binding
		];
	}

	class Bio extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$m, create_fragment$m, safe_not_equal, { model: 0 });
		}
	}

	/* src\components\Circle.svelte generated by Svelte v4.2.20 */

	function get_each_context$a(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[11] = list[i];
		child_ctx[12] = list;
		child_ctx[13] = i;
		return child_ctx;
	}

	// (34:12) {:else}
	function create_else_block$c(ctx) {
		let button;
		let t_value = /*item*/ ctx[11] + "";
		let t;
		let mounted;
		let dispose;

		function click_handler() {
			return /*click_handler*/ ctx[9](/*i*/ ctx[13]);
		}

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn btn-light border-bottom text-left");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", click_handler);
					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[11] + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (32:12) {#if editIndex == i}
	function create_if_block$f(ctx) {
		let input_1;
		let mounted;
		let dispose;

		function input_1_input_handler() {
			/*input_1_input_handler*/ ctx[7].call(input_1, /*each_value*/ ctx[12], /*i*/ ctx[13]);
		}

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control my-1");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				set_input_value(input_1, /*item*/ ctx[11]);
				/*input_1_binding*/ ctx[8](input_1);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*endEdit*/ ctx[4]),
						listen(input_1, "input", input_1_input_handler)
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty & /*items*/ 1 && input_1.value !== /*item*/ ctx[11]) {
					set_input_value(input_1, /*item*/ ctx[11]);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[8](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (31:12) {#each items as item, i}
	function create_each_block$a(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*editIndex*/ ctx[2] == /*i*/ ctx[13]) return create_if_block$f;
			return create_else_block$c;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};
	}

	function create_fragment$l(ctx) {
		let div3;
		let div2;
		let div0;
		let h2;
		let t0;
		let t1;
		let div1;
		let button0;
		let t3;
		let button1;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[6].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
		let each_value = ensure_array_like(/*items*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$a(get_each_context$a(ctx, each_value, i));
		}

		return {
			c() {
				div3 = element("div");
				div2 = element("div");
				div0 = element("div");
				h2 = element("h2");
				if (default_slot) default_slot.c();
				t0 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t1 = space();
				div1 = element("div");
				button0 = element("button");
				button0.textContent = "Add";
				t3 = space();
				button1 = element("button");
				button1.textContent = "a → z";
				attr(div0, "class", "d-flex flex-column");
				attr(button0, "class", "btn btn-light border my-1");
				attr(button1, "class", "btn btn-light border my-1");
				attr(div1, "class", "btn-group");
				attr(div2, "class", "card-body");
				attr(div3, "class", "card");
			},
			m(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div2);
				append(div2, div0);
				append(div0, h2);

				if (default_slot) {
					default_slot.m(h2, null);
				}

				append(div0, t0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				append(div2, t1);
				append(div2, div1);
				append(div1, button0);
				append(div1, t3);
				append(div1, button1);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*add*/ ctx[3]),
						listen(button1, "click", /*click_handler_1*/ ctx[10])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[5],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
							null
						);
					}
				}

				if (dirty & /*items, input, endEdit, editIndex*/ 23) {
					each_value = ensure_array_like(/*items*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$a(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$a(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div3);
				}

				if (default_slot) default_slot.d(detaching);
				destroy_each(each_blocks, detaching);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$l($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		let { items = [] } = $$props;
		let input;
		let editIndex = -1;

		function add() {
			items.push('');
			$$invalidate(0, items);
			$$invalidate(2, editIndex = items.length - 1);
		}

		function endEdit() {
			if (!items[editIndex]) items.splice(editIndex, 1);
			$$invalidate(2, editIndex = -1);
		}

		afterUpdate(() => {
			if (input) input.focus();
		});

		function input_1_input_handler(each_value, i) {
			each_value[i] = this.value;
			$$invalidate(0, items);
		}

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(1, input);
			});
		}

		const click_handler = i => $$invalidate(2, editIndex = i);

		const click_handler_1 = () => {
			items.sort();
			$$invalidate(0, items);
		};

		$$self.$$set = $$props => {
			if ('items' in $$props) $$invalidate(0, items = $$props.items);
			if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
		};

		return [
			items,
			input,
			editIndex,
			add,
			endEdit,
			$$scope,
			slots,
			input_1_input_handler,
			input_1_binding,
			click_handler,
			click_handler_1
		];
	}

	class Circle extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$l, create_fragment$l, safe_not_equal, { items: 0 });
		}
	}

	/* src\components\Follower.svelte generated by Svelte v4.2.20 */

	function create_else_block_1$5(ctx) {
		let button;
		let t_value = /*follower*/ ctx[0].name + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn btn-light w-100 text-left font-weight-bold");
				set_style(button, "min-height", "2.2em");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[9]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*follower*/ 1 && t_value !== (t_value = /*follower*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (29:8) {#if editName}
	function create_if_block_2$8(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				/*input_1_binding*/ ctx[7](input_1);
				set_input_value(input_1, /*follower*/ ctx[0].name);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler*/ ctx[6]),
						listen(input_1, "input", /*input_1_input_handler*/ ctx[8])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*follower*/ 1 && input_1.value !== /*follower*/ ctx[0].name) {
					set_input_value(input_1, /*follower*/ ctx[0].name);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[7](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (36:8) {:else}
	function create_else_block$b(ctx) {
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				button.textContent = "show";
				attr(button, "class", "badge btn btn-light border ml-1 p-2");
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_2*/ ctx[11]);
					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (34:8) {#if !collapse}
	function create_if_block_1$e(ctx) {
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				button.textContent = "hide";
				attr(button, "class", "badge btn btn-light border ml-1 p-2");
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_1*/ ctx[10]);
					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (44:4) {#if !collapse}
	function create_if_block$e(ctx) {
		let div3;
		let div2;
		let div0;
		let taglist;
		let t0;
		let textarea;
		let updating_content;
		let t1;
		let div1;
		let button;
		let current;
		let mounted;
		let dispose;

		taglist = new TagList({
				props: { items: /*follower*/ ctx[0].tags }
			});

		function textarea_content_binding(value) {
			/*textarea_content_binding*/ ctx[14](value);
		}

		let textarea_props = {};

		if (/*follower*/ ctx[0].description !== void 0) {
			textarea_props.content = /*follower*/ ctx[0].description;
		}

		textarea = new TextArea({ props: textarea_props });
		binding_callbacks.push(() => bind(textarea, 'content', textarea_content_binding));

		return {
			c() {
				div3 = element("div");
				div2 = element("div");
				div0 = element("div");
				create_component(taglist.$$.fragment);
				t0 = space();
				create_component(textarea.$$.fragment);
				t1 = space();
				div1 = element("div");
				button = element("button");
				button.textContent = "Delete";
				attr(div0, "class", "mb-1");
				attr(button, "class", "btn btn-dark");
				attr(div1, "class", "mt-1");
				attr(div2, "class", "card-body p-2");
				attr(div3, "class", "card");
			},
			m(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div2);
				append(div2, div0);
				mount_component(taglist, div0, null);
				append(div2, t0);
				mount_component(textarea, div2, null);
				append(div2, t1);
				append(div2, div1);
				append(div1, button);
				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_5*/ ctx[15]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				const taglist_changes = {};
				if (dirty & /*follower*/ 1) taglist_changes.items = /*follower*/ ctx[0].tags;
				taglist.$set(taglist_changes);
				const textarea_changes = {};

				if (!updating_content && dirty & /*follower*/ 1) {
					updating_content = true;
					textarea_changes.content = /*follower*/ ctx[0].description;
					add_flush_callback(() => updating_content = false);
				}

				textarea.$set(textarea_changes);
			},
			i(local) {
				if (current) return;
				transition_in(taglist.$$.fragment, local);
				transition_in(textarea.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(taglist.$$.fragment, local);
				transition_out(textarea.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div3);
				}

				destroy_component(taglist);
				destroy_component(textarea);
				mounted = false;
				dispose();
			}
		};
	}

	function create_fragment$k(ctx) {
		let div2;
		let div1;
		let button0;
		let t0_value = /*follower*/ ctx[0].conditions + "";
		let t0;
		let t1;
		let t2;
		let t3;
		let div0;
		let button1;
		let t5;
		let button2;
		let t7;
		let current;
		let mounted;
		let dispose;

		function select_block_type(ctx, dirty) {
			if (/*editName*/ ctx[3]) return create_if_block_2$8;
			return create_else_block_1$5;
		}

		let current_block_type = select_block_type(ctx);
		let if_block0 = current_block_type(ctx);

		function select_block_type_1(ctx, dirty) {
			if (!/*collapse*/ ctx[2]) return create_if_block_1$e;
			return create_else_block$b;
		}

		let current_block_type_1 = select_block_type_1(ctx);
		let if_block1 = current_block_type_1(ctx);
		let if_block2 = !/*collapse*/ ctx[2] && create_if_block$e(ctx);

		return {
			c() {
				div2 = element("div");
				div1 = element("div");
				button0 = element("button");
				t0 = text(t0_value);
				t1 = space();
				if_block0.c();
				t2 = space();
				if_block1.c();
				t3 = space();
				div0 = element("div");
				button1 = element("button");
				button1.textContent = "↑";
				t5 = space();
				button2 = element("button");
				button2.textContent = "↓";
				t7 = space();
				if (if_block2) if_block2.c();
				attr(button0, "class", "btn btn-dark");
				attr(button0, "title", "Number of conditions");
				attr(button1, "class", "badge btn btn-light border ml-1 p-2");
				attr(button2, "class", "badge btn btn-light border p-2");
				attr(div0, "class", "btn-group");
				attr(div1, "class", "d-flex");
				attr(div2, "class", "mb-2");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, button0);
				append(button0, t0);
				append(div1, t1);
				if_block0.m(div1, null);
				append(div1, t2);
				if_block1.m(div1, null);
				append(div1, t3);
				append(div1, div0);
				append(div0, button1);
				append(div0, t5);
				append(div0, button2);
				append(div2, t7);
				if (if_block2) if_block2.m(div2, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*handleClick*/ ctx[5]),
						listen(button1, "click", /*click_handler_3*/ ctx[12]),
						listen(button2, "click", /*click_handler_4*/ ctx[13])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if ((!current || dirty & /*follower*/ 1) && t0_value !== (t0_value = /*follower*/ ctx[0].conditions + "")) set_data(t0, t0_value);

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(ctx);

					if (if_block0) {
						if_block0.c();
						if_block0.m(div1, t2);
					}
				}

				if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type_1(ctx);

					if (if_block1) {
						if_block1.c();
						if_block1.m(div1, t3);
					}
				}

				if (!/*collapse*/ ctx[2]) {
					if (if_block2) {
						if_block2.p(ctx, dirty);

						if (dirty & /*collapse*/ 4) {
							transition_in(if_block2, 1);
						}
					} else {
						if_block2 = create_if_block$e(ctx);
						if_block2.c();
						transition_in(if_block2, 1);
						if_block2.m(div2, null);
					}
				} else if (if_block2) {
					group_outros();

					transition_out(if_block2, 1, 1, () => {
						if_block2 = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block2);
				current = true;
			},
			o(local) {
				transition_out(if_block2);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				if_block0.d();
				if_block1.d();
				if (if_block2) if_block2.d();
				mounted = false;
				run_all(dispose);
			}
		};
	}

	const max = 6;

	function instance$k($$self, $$props, $$invalidate) {
		let { follower } = $$props;
		let { actions } = $$props;
		let collapse = true;
		let editName = false;
		let input;

		function handleClick(e) {
			$$invalidate(0, follower.conditions += e.shiftKey ? -1 : 1, follower);
			if (follower.conditions < 0) $$invalidate(0, follower.conditions = max, follower);
			if (follower.conditions > max) $$invalidate(0, follower.conditions = 0, follower);
		}

		afterUpdate(() => {
			if (input) input.focus();
		});

		const blur_handler = () => $$invalidate(3, editName = false);

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(4, input);
			});
		}

		function input_1_input_handler() {
			follower.name = this.value;
			$$invalidate(0, follower);
		}

		const click_handler = () => $$invalidate(3, editName = true);
		const click_handler_1 = () => $$invalidate(2, collapse = true);
		const click_handler_2 = () => $$invalidate(2, collapse = false);
		const click_handler_3 = () => actions.move(follower, -1);
		const click_handler_4 = () => actions.move(follower, 1);

		function textarea_content_binding(value) {
			if ($$self.$$.not_equal(follower.description, value)) {
				follower.description = value;
				$$invalidate(0, follower);
			}
		}

		const click_handler_5 = () => actions.delete(follower);

		$$self.$$set = $$props => {
			if ('follower' in $$props) $$invalidate(0, follower = $$props.follower);
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
		};

		return [
			follower,
			actions,
			collapse,
			editName,
			input,
			handleClick,
			blur_handler,
			input_1_binding,
			input_1_input_handler,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			textarea_content_binding,
			click_handler_5
		];
	}

	class Follower extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$k, create_fragment$k, safe_not_equal, { follower: 0, actions: 1 });
		}
	}

	const follower = () => {
	    return {
	        id: crypto.randomUUID(),
	        name: 'New follower',
	        conditions: 0,
	        description: '',
	        tags: []
	    }
	};

	/* src\components\Followers.svelte generated by Svelte v4.2.20 */

	function get_each_context$9(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[3] = list[i];
		return child_ctx;
	}

	// (42:8) {#each followers as follower (follower.id)}
	function create_each_block$9(key_1, ctx) {
		let first;
		let follower_1;
		let current;

		follower_1 = new Follower({
				props: {
					follower: /*follower*/ ctx[3],
					actions: /*actions*/ ctx[1]
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(follower_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(follower_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const follower_1_changes = {};
				if (dirty & /*followers*/ 1) follower_1_changes.follower = /*follower*/ ctx[3];
				follower_1.$set(follower_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(follower_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(follower_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(follower_1, detaching);
			}
		};
	}

	function create_fragment$j(ctx) {
		let div2;
		let div1;
		let h2;
		let t1;
		let div0;
		let button;
		let t3;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(/*followers*/ ctx[0]);
		const get_key = ctx => /*follower*/ ctx[3].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$9(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$9(key, child_ctx));
		}

		return {
			c() {
				div2 = element("div");
				div1 = element("div");
				h2 = element("h2");
				h2.textContent = "Followers";
				t1 = space();
				div0 = element("div");
				button = element("button");
				button.textContent = "Add follower";
				t3 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(button, "class", "btn btn-light border mb-1 mr-1");
				attr(div0, "class", "d-flex mb-1");
				attr(div1, "class", "card-body");
				attr(div2, "class", "card");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, h2);
				append(div1, t1);
				append(div1, div0);
				append(div0, button);
				append(div1, t3);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*add*/ ctx[2]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*followers, actions*/ 3) {
					each_value = ensure_array_like(/*followers*/ ctx[0]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$9, null, get_each_context$9);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				dispose();
			}
		};
	}

	function instance$j($$self, $$props, $$invalidate) {
		let { followers = [] } = $$props;
		if (!followers) followers = [];

		const actions = {
			delete: follower => {
				if (!confirm(`Delete ${follower.name}?`)) return;
				let index = followers.indexOf(follower);
				followers.splice(index, 1);
				$$invalidate(0, followers);
			},
			move: (follower, n) => {
				let index = followers.indexOf(follower);
				followers.splice(index, 1);
				index += n;
				if (index < 0) index = followers.length; else if (index > followers.length) index = 0;
				followers.splice(index, 0, follower);
				$$invalidate(0, followers);
			}
		};

		function add() {
			followers.push(follower());
			$$invalidate(0, followers);
		}

		$$self.$$set = $$props => {
			if ('followers' in $$props) $$invalidate(0, followers = $$props.followers);
		};

		return [followers, actions, add];
	}

	class Followers extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$j, create_fragment$j, safe_not_equal, { followers: 0 });
		}
	}

	/* src\components\Circles.svelte generated by Svelte v4.2.20 */

	function create_default_slot_1$3(ctx) {
		let t;

		return {
			c() {
				t = text("Friends");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (17:12) <Circle items={circles.enemies}>
	function create_default_slot$4(ctx) {
		let t;

		return {
			c() {
				t = text("Enemies");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$i(ctx) {
		let div3;
		let followers;
		let t0;
		let div2;
		let div0;
		let circle0;
		let t1;
		let div1;
		let circle1;
		let current;

		followers = new Followers({
				props: { followers: /*circles*/ ctx[0].followers }
			});

		circle0 = new Circle({
				props: {
					items: /*circles*/ ctx[0].friends,
					$$slots: { default: [create_default_slot_1$3] },
					$$scope: { ctx }
				}
			});

		circle1 = new Circle({
				props: {
					items: /*circles*/ ctx[0].enemies,
					$$slots: { default: [create_default_slot$4] },
					$$scope: { ctx }
				}
			});

		return {
			c() {
				div3 = element("div");
				create_component(followers.$$.fragment);
				t0 = space();
				div2 = element("div");
				div0 = element("div");
				create_component(circle0.$$.fragment);
				t1 = space();
				div1 = element("div");
				create_component(circle1.$$.fragment);
				attr(div0, "class", "col-md-6");
				attr(div1, "class", "col-md-6");
				attr(div2, "class", "row");
				attr(div3, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div3, anchor);
				mount_component(followers, div3, null);
				append(div3, t0);
				append(div3, div2);
				append(div2, div0);
				mount_component(circle0, div0, null);
				append(div2, t1);
				append(div2, div1);
				mount_component(circle1, div1, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const followers_changes = {};
				if (dirty & /*circles*/ 1) followers_changes.followers = /*circles*/ ctx[0].followers;
				followers.$set(followers_changes);
				const circle0_changes = {};
				if (dirty & /*circles*/ 1) circle0_changes.items = /*circles*/ ctx[0].friends;

				if (dirty & /*$$scope*/ 2) {
					circle0_changes.$$scope = { dirty, ctx };
				}

				circle0.$set(circle0_changes);
				const circle1_changes = {};
				if (dirty & /*circles*/ 1) circle1_changes.items = /*circles*/ ctx[0].enemies;

				if (dirty & /*$$scope*/ 2) {
					circle1_changes.$$scope = { dirty, ctx };
				}

				circle1.$set(circle1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(followers.$$.fragment, local);
				transition_in(circle0.$$.fragment, local);
				transition_in(circle1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(followers.$$.fragment, local);
				transition_out(circle0.$$.fragment, local);
				transition_out(circle1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div3);
				}

				destroy_component(followers);
				destroy_component(circle0);
				destroy_component(circle1);
			}
		};
	}

	function instance$i($$self, $$props, $$invalidate) {
		let { circles } = $$props;
		if (!circles.followers) circles.followers = [];

		$$self.$$set = $$props => {
			if ('circles' in $$props) $$invalidate(0, circles = $$props.circles);
		};

		return [circles];
	}

	class Circles extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$i, create_fragment$i, safe_not_equal, { circles: 0 });
		}
	}

	/* src\components\Condition.svelte generated by Svelte v4.2.20 */

	function create_fragment$h(ctx) {
		let button;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[2].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

		return {
			c() {
				button = element("button");
				if (default_slot) default_slot.c();
				attr(button, "class", "border border-dark btn m-1");
				toggle_class(button, "btn-dark", /*selected*/ ctx[0]);
				toggle_class(button, "btn-light", !/*selected*/ ctx[0]);
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (default_slot) {
					default_slot.m(button, null);
				}

				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[3]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[1],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
							null
						);
					}
				}

				if (!current || dirty & /*selected*/ 1) {
					toggle_class(button, "btn-dark", /*selected*/ ctx[0]);
				}

				if (!current || dirty & /*selected*/ 1) {
					toggle_class(button, "btn-light", !/*selected*/ ctx[0]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				dispose();
			}
		};
	}

	function instance$h($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		let { selected = false } = $$props;
		const click_handler = () => $$invalidate(0, selected = !selected);

		$$self.$$set = $$props => {
			if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
			if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
		};

		return [selected, $$scope, slots, click_handler];
	}

	class Condition extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$h, create_fragment$h, safe_not_equal, { selected: 0 });
		}
	}

	/* src\components\Conditions.svelte generated by Svelte v4.2.20 */

	function get_each_context$8(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[16] = list[i];
		return child_ctx;
	}

	// (56:0) {:else}
	function create_else_block_1$4(ctx) {
		let div;
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				button = element("button");
				button.textContent = "Conditions";
				attr(button, "class", "btn btn-light border col");
				attr(div, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, button);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_3*/ ctx[15]);
					mounted = true;
				}
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (22:0) {#if shown}
	function create_if_block$d(ctx) {
		let div1;
		let div0;
		let current_block_type_index;
		let if_block;
		let current;
		const if_block_creators = [create_if_block_1$d, create_else_block$a];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (!/*showHelp*/ ctx[2]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_1(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				if_block.c();
				attr(div0, "class", "card");
				attr(div1, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				if_blocks[current_block_type_index].m(div0, null);
				current = true;
			},
			p(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div0, null);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	// (40:8) {:else}
	function create_else_block$a(ctx) {
		let div0;
		let h5;
		let t1;
		let button;
		let t3;
		let div1;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(/*help*/ ctx[3]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$8(get_each_context$8(ctx, each_value, i));
		}

		return {
			c() {
				div0 = element("div");
				h5 = element("h5");
				h5.textContent = "Conditions";
				t1 = space();
				button = element("button");
				button.innerHTML = `<span aria-hidden="true">✗</span>`;
				t3 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(h5, "class", "card-title");
				attr(button, "type", "button");
				attr(button, "class", "close position-topright");
				attr(div0, "class", "card-header");
				attr(div1, "class", "card-body");
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				append(div0, h5);
				append(div0, t1);
				append(div0, button);
				insert(target, t3, anchor);
				insert(target, div1, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_2*/ ctx[14]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*help*/ 8) {
					each_value = ensure_array_like(/*help*/ ctx[3]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$8(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$8(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t3);
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};
	}

	// (25:8) {#if !showHelp}
	function create_if_block_1$d(ctx) {
		let div0;
		let condition0;
		let updating_selected;
		let t0;
		let condition1;
		let updating_selected_1;
		let t1;
		let condition2;
		let updating_selected_2;
		let t2;
		let condition3;
		let updating_selected_3;
		let t3;
		let condition4;
		let updating_selected_4;
		let t4;
		let condition5;
		let updating_selected_5;
		let t5;
		let condition6;
		let updating_selected_6;
		let t6;
		let condition7;
		let updating_selected_7;
		let t7;
		let div1;
		let button0;
		let t9;
		let button1;
		let current;
		let mounted;
		let dispose;

		function condition0_selected_binding(value) {
			/*condition0_selected_binding*/ ctx[4](value);
		}

		let condition0_props = {
			$$slots: { default: [create_default_slot_7$1] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.fresh !== void 0) {
			condition0_props.selected = /*model*/ ctx[0].conditions.fresh;
		}

		condition0 = new Condition({ props: condition0_props });
		binding_callbacks.push(() => bind(condition0, 'selected', condition0_selected_binding));

		function condition1_selected_binding(value) {
			/*condition1_selected_binding*/ ctx[5](value);
		}

		let condition1_props = {
			$$slots: { default: [create_default_slot_6$1] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.hungry !== void 0) {
			condition1_props.selected = /*model*/ ctx[0].conditions.hungry;
		}

		condition1 = new Condition({ props: condition1_props });
		binding_callbacks.push(() => bind(condition1, 'selected', condition1_selected_binding));

		function condition2_selected_binding(value) {
			/*condition2_selected_binding*/ ctx[6](value);
		}

		let condition2_props = {
			$$slots: { default: [create_default_slot_5$1] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.angry !== void 0) {
			condition2_props.selected = /*model*/ ctx[0].conditions.angry;
		}

		condition2 = new Condition({ props: condition2_props });
		binding_callbacks.push(() => bind(condition2, 'selected', condition2_selected_binding));

		function condition3_selected_binding(value) {
			/*condition3_selected_binding*/ ctx[7](value);
		}

		let condition3_props = {
			$$slots: { default: [create_default_slot_4$1] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.afraid !== void 0) {
			condition3_props.selected = /*model*/ ctx[0].conditions.afraid;
		}

		condition3 = new Condition({ props: condition3_props });
		binding_callbacks.push(() => bind(condition3, 'selected', condition3_selected_binding));

		function condition4_selected_binding(value) {
			/*condition4_selected_binding*/ ctx[8](value);
		}

		let condition4_props = {
			$$slots: { default: [create_default_slot_3$1] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.exhausted !== void 0) {
			condition4_props.selected = /*model*/ ctx[0].conditions.exhausted;
		}

		condition4 = new Condition({ props: condition4_props });
		binding_callbacks.push(() => bind(condition4, 'selected', condition4_selected_binding));

		function condition5_selected_binding(value) {
			/*condition5_selected_binding*/ ctx[9](value);
		}

		let condition5_props = {
			$$slots: { default: [create_default_slot_2$2] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.injured !== void 0) {
			condition5_props.selected = /*model*/ ctx[0].conditions.injured;
		}

		condition5 = new Condition({ props: condition5_props });
		binding_callbacks.push(() => bind(condition5, 'selected', condition5_selected_binding));

		function condition6_selected_binding(value) {
			/*condition6_selected_binding*/ ctx[10](value);
		}

		let condition6_props = {
			$$slots: { default: [create_default_slot_1$2] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.sick !== void 0) {
			condition6_props.selected = /*model*/ ctx[0].conditions.sick;
		}

		condition6 = new Condition({ props: condition6_props });
		binding_callbacks.push(() => bind(condition6, 'selected', condition6_selected_binding));

		function condition7_selected_binding(value) {
			/*condition7_selected_binding*/ ctx[11](value);
		}

		let condition7_props = {
			$$slots: { default: [create_default_slot$3] },
			$$scope: { ctx }
		};

		if (/*model*/ ctx[0].conditions.dead !== void 0) {
			condition7_props.selected = /*model*/ ctx[0].conditions.dead;
		}

		condition7 = new Condition({ props: condition7_props });
		binding_callbacks.push(() => bind(condition7, 'selected', condition7_selected_binding));

		return {
			c() {
				div0 = element("div");
				create_component(condition0.$$.fragment);
				t0 = space();
				create_component(condition1.$$.fragment);
				t1 = space();
				create_component(condition2.$$.fragment);
				t2 = space();
				create_component(condition3.$$.fragment);
				t3 = space();
				create_component(condition4.$$.fragment);
				t4 = space();
				create_component(condition5.$$.fragment);
				t5 = space();
				create_component(condition6.$$.fragment);
				t6 = space();
				create_component(condition7.$$.fragment);
				t7 = space();
				div1 = element("div");
				button0 = element("button");
				button0.textContent = "?";
				t9 = space();
				button1 = element("button");
				button1.textContent = "✗";
				attr(div0, "class", "card-body d-flex flex-wrap");
				attr(button0, "class", "btn badge btn-light border border-dark");
				attr(button1, "class", "btn badge btn-light border border-dark");
				attr(div1, "class", "btn-group position-topright");
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				mount_component(condition0, div0, null);
				append(div0, t0);
				mount_component(condition1, div0, null);
				append(div0, t1);
				mount_component(condition2, div0, null);
				append(div0, t2);
				mount_component(condition3, div0, null);
				append(div0, t3);
				mount_component(condition4, div0, null);
				append(div0, t4);
				mount_component(condition5, div0, null);
				append(div0, t5);
				mount_component(condition6, div0, null);
				append(div0, t6);
				mount_component(condition7, div0, null);
				insert(target, t7, anchor);
				insert(target, div1, anchor);
				append(div1, button0);
				append(div1, t9);
				append(div1, button1);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler*/ ctx[12]),
						listen(button1, "click", /*click_handler_1*/ ctx[13])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				const condition0_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition0_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected && dirty & /*model*/ 1) {
					updating_selected = true;
					condition0_changes.selected = /*model*/ ctx[0].conditions.fresh;
					add_flush_callback(() => updating_selected = false);
				}

				condition0.$set(condition0_changes);
				const condition1_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition1_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected_1 && dirty & /*model*/ 1) {
					updating_selected_1 = true;
					condition1_changes.selected = /*model*/ ctx[0].conditions.hungry;
					add_flush_callback(() => updating_selected_1 = false);
				}

				condition1.$set(condition1_changes);
				const condition2_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition2_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected_2 && dirty & /*model*/ 1) {
					updating_selected_2 = true;
					condition2_changes.selected = /*model*/ ctx[0].conditions.angry;
					add_flush_callback(() => updating_selected_2 = false);
				}

				condition2.$set(condition2_changes);
				const condition3_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition3_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected_3 && dirty & /*model*/ 1) {
					updating_selected_3 = true;
					condition3_changes.selected = /*model*/ ctx[0].conditions.afraid;
					add_flush_callback(() => updating_selected_3 = false);
				}

				condition3.$set(condition3_changes);
				const condition4_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition4_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected_4 && dirty & /*model*/ 1) {
					updating_selected_4 = true;
					condition4_changes.selected = /*model*/ ctx[0].conditions.exhausted;
					add_flush_callback(() => updating_selected_4 = false);
				}

				condition4.$set(condition4_changes);
				const condition5_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition5_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected_5 && dirty & /*model*/ 1) {
					updating_selected_5 = true;
					condition5_changes.selected = /*model*/ ctx[0].conditions.injured;
					add_flush_callback(() => updating_selected_5 = false);
				}

				condition5.$set(condition5_changes);
				const condition6_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition6_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected_6 && dirty & /*model*/ 1) {
					updating_selected_6 = true;
					condition6_changes.selected = /*model*/ ctx[0].conditions.sick;
					add_flush_callback(() => updating_selected_6 = false);
				}

				condition6.$set(condition6_changes);
				const condition7_changes = {};

				if (dirty & /*$$scope*/ 524288) {
					condition7_changes.$$scope = { dirty, ctx };
				}

				if (!updating_selected_7 && dirty & /*model*/ 1) {
					updating_selected_7 = true;
					condition7_changes.selected = /*model*/ ctx[0].conditions.dead;
					add_flush_callback(() => updating_selected_7 = false);
				}

				condition7.$set(condition7_changes);
			},
			i(local) {
				if (current) return;
				transition_in(condition0.$$.fragment, local);
				transition_in(condition1.$$.fragment, local);
				transition_in(condition2.$$.fragment, local);
				transition_in(condition3.$$.fragment, local);
				transition_in(condition4.$$.fragment, local);
				transition_in(condition5.$$.fragment, local);
				transition_in(condition6.$$.fragment, local);
				transition_in(condition7.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(condition0.$$.fragment, local);
				transition_out(condition1.$$.fragment, local);
				transition_out(condition2.$$.fragment, local);
				transition_out(condition3.$$.fragment, local);
				transition_out(condition4.$$.fragment, local);
				transition_out(condition5.$$.fragment, local);
				transition_out(condition6.$$.fragment, local);
				transition_out(condition7.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t7);
					detach(div1);
				}

				destroy_component(condition0);
				destroy_component(condition1);
				destroy_component(condition2);
				destroy_component(condition3);
				destroy_component(condition4);
				destroy_component(condition5);
				destroy_component(condition6);
				destroy_component(condition7);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (48:12) {#each help as x}
	function create_each_block$8(ctx) {
		let h5;
		let t1;
		let p;

		return {
			c() {
				h5 = element("h5");
				h5.textContent = `${/*x*/ ctx[16].title}`;
				t1 = space();
				p = element("p");
				p.textContent = `${/*x*/ ctx[16].text}`;
			},
			m(target, anchor) {
				insert(target, h5, anchor);
				insert(target, t1, anchor);
				insert(target, p, anchor);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(h5);
					detach(t1);
					detach(p);
				}
			}
		};
	}

	// (27:12) <Condition bind:selected={model.conditions.fresh}>
	function create_default_slot_7$1(ctx) {
		let t;

		return {
			c() {
				t = text("Fresh");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (28:12) <Condition bind:selected={model.conditions.hungry}>
	function create_default_slot_6$1(ctx) {
		let t;

		return {
			c() {
				t = text("Hungry and Thirsty");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (29:12) <Condition bind:selected={model.conditions.angry}>
	function create_default_slot_5$1(ctx) {
		let t;

		return {
			c() {
				t = text("Angry");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (30:12) <Condition bind:selected={model.conditions.afraid}>
	function create_default_slot_4$1(ctx) {
		let t;

		return {
			c() {
				t = text("Afraid");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (31:12) <Condition bind:selected={model.conditions.exhausted}>
	function create_default_slot_3$1(ctx) {
		let t;

		return {
			c() {
				t = text("Exhausted");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (32:12) <Condition bind:selected={model.conditions.injured}>
	function create_default_slot_2$2(ctx) {
		let t;

		return {
			c() {
				t = text("Injured");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (33:12) <Condition bind:selected={model.conditions.sick}>
	function create_default_slot_1$2(ctx) {
		let t;

		return {
			c() {
				t = text("Sick");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (34:12) <Condition bind:selected={model.conditions.dead}>
	function create_default_slot$3(ctx) {
		let t;

		return {
			c() {
				t = text("Dead");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$g(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$d, create_else_block_1$4];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*shown*/ ctx[1]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	function instance$g($$self, $$props, $$invalidate) {
		let { model = character() } = $$props;
		let shown = true;
		let showHelp = false;

		const help = [
			{
				title: 'Fresh',
				text: '+1D to all tests (except circles and resources) until other condition.'
			},
			{
				title: 'Hungry and Thirsty',
				text: '-1 disposition to any conflict.'
			},
			{
				title: 'Angry (Ob 2 Will)',
				text: "Can't use wises or beneficial traits."
			},
			{
				title: 'Afraid (Ob 3 Will)',
				text: "Can't help or use Beginner's Luck."
			},
			{
				title: 'Exhausted (Ob 3 Health)',
				text: '-1 disposition to any conflict. Instinct takes a turn and carries a -1s penalty.'
			},
			{
				title: 'Injured (Ob 4 Health)',
				text: '-1D to skills, Nature, Will, and Health (but not recovery).'
			},
			{
				title: 'Sick (Ob 3 Will)',
				text: "-1D to skills, Nature, Will, and Health (but not recovery). Can't practice, learn, or advance."
			},
			{
				title: 'Dead',
				text: "May not use wises, test, or help."
			}
		];

		function condition0_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.fresh, value)) {
				model.conditions.fresh = value;
				$$invalidate(0, model);
			}
		}

		function condition1_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.hungry, value)) {
				model.conditions.hungry = value;
				$$invalidate(0, model);
			}
		}

		function condition2_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.angry, value)) {
				model.conditions.angry = value;
				$$invalidate(0, model);
			}
		}

		function condition3_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.afraid, value)) {
				model.conditions.afraid = value;
				$$invalidate(0, model);
			}
		}

		function condition4_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.exhausted, value)) {
				model.conditions.exhausted = value;
				$$invalidate(0, model);
			}
		}

		function condition5_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.injured, value)) {
				model.conditions.injured = value;
				$$invalidate(0, model);
			}
		}

		function condition6_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.sick, value)) {
				model.conditions.sick = value;
				$$invalidate(0, model);
			}
		}

		function condition7_selected_binding(value) {
			if ($$self.$$.not_equal(model.conditions.dead, value)) {
				model.conditions.dead = value;
				$$invalidate(0, model);
			}
		}

		const click_handler = () => $$invalidate(2, showHelp = true);
		const click_handler_1 = () => $$invalidate(1, shown = false);
		const click_handler_2 = () => $$invalidate(2, showHelp = false);
		const click_handler_3 = () => $$invalidate(1, shown = true);

		$$self.$$set = $$props => {
			if ('model' in $$props) $$invalidate(0, model = $$props.model);
		};

		return [
			model,
			shown,
			showHelp,
			help,
			condition0_selected_binding,
			condition1_selected_binding,
			condition2_selected_binding,
			condition3_selected_binding,
			condition4_selected_binding,
			condition5_selected_binding,
			condition6_selected_binding,
			condition7_selected_binding,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3
		];
	}

	class Conditions extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$g, create_fragment$g, safe_not_equal, { model: 0 });
		}
	}

	/* src\components\Item.svelte generated by Svelte v4.2.20 */

	function create_else_block$9(ctx) {
		let span4;
		let span1;
		let t1;
		let span3;
		let span2;
		let t2_value = /*item*/ ctx[0].text + "";
		let t2;
		let t3;
		let t4;
		let button;
		let t5_value = /*item*/ ctx[0].size + "";
		let t5;
		let current;
		let mounted;
		let dispose;
		let if_block = /*item*/ ctx[0].stackSize && create_if_block_1$c(ctx);

		return {
			c() {
				span4 = element("span");
				span1 = element("span");
				span1.innerHTML = `<span style="align-self: center;">⦀</span>`;
				t1 = space();
				span3 = element("span");
				span2 = element("span");
				t2 = text(t2_value);
				t3 = space();
				if (if_block) if_block.c();
				t4 = space();
				button = element("button");
				t5 = text(t5_value);
				attr(span1, "tabindex", "0");
				attr(span1, "class", "btn btn-light border border-dark flex-grow-0 align-items-center d-flex");
				attr(span1, "draggable", "true");
				attr(span1, "title", "Move");
				attr(span3, "class", "btn btn-light text-left border border-dark flex-grow-1");
				attr(button, "class", "btn btn-light border border-dark flex-grow-0");
				attr(span4, "class", "d-flex btn-group mb-1");
				set_style(span4, "min-height", /*size*/ ctx[4] * 2.5 + "em");
				toggle_class(span4, "m-2", /*selected*/ ctx[2]);
			},
			m(target, anchor) {
				insert(target, span4, anchor);
				append(span4, span1);
				append(span4, t1);
				append(span4, span3);
				append(span3, span2);
				append(span2, t2);
				append(span3, t3);
				if (if_block) if_block.m(span3, null);
				append(span4, t4);
				append(span4, button);
				append(button, t5);
				current = true;

				if (!mounted) {
					dispose = [
						listen(span1, "dragstart", /*dragstart_handler*/ ctx[16]),
						listen(span1, "dragend", /*dragend_handler*/ ctx[17]),
						listen(span1, "click", /*select*/ ctx[5]),
						listen(button, "click", /*click_handler_8*/ ctx[19])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if ((!current || dirty & /*item*/ 1) && t2_value !== (t2_value = /*item*/ ctx[0].text + "")) set_data(t2, t2_value);

				if (/*item*/ ctx[0].stackSize) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*item*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_1$c(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(span3, null);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}

				if ((!current || dirty & /*item*/ 1) && t5_value !== (t5_value = /*item*/ ctx[0].size + "")) set_data(t5, t5_value);

				if (!current || dirty & /*size*/ 16) {
					set_style(span4, "min-height", /*size*/ ctx[4] * 2.5 + "em");
				}

				if (!current || dirty & /*selected*/ 4) {
					toggle_class(span4, "m-2", /*selected*/ ctx[2]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(span4);
				}

				if (if_block) if_block.d();
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (30:4) {#if editing}
	function create_if_block$c(ctx) {
		let div7;
		let div0;
		let input;
		let t0;
		let button0;
		let t1;
		let t2;
		let div2;
		let span0;
		let t3_value = /*item*/ ctx[0].size + "";
		let t3;
		let t4;
		let span1;
		let t6;
		let div1;
		let button1;
		let t7;
		let t8;
		let button2;
		let t9;
		let t10;
		let div4;
		let span2;
		let t11_value = /*item*/ ctx[0].stackSize + "";
		let t11;
		let t12;
		let span3;
		let t14;
		let div3;
		let button3;
		let t15;
		let t16;
		let button4;
		let t17;
		let t18;
		let div6;
		let div5;
		let button5;
		let t19;
		let t20;
		let button6;
		let t21;
		let t22;
		let button7;
		let t23;
		let mounted;
		let dispose;

		return {
			c() {
				div7 = element("div");
				div0 = element("div");
				input = element("input");
				t0 = space();
				button0 = element("button");
				t1 = text("Done");
				t2 = space();
				div2 = element("div");
				span0 = element("span");
				t3 = text(t3_value);
				t4 = space();
				span1 = element("span");
				span1.textContent = "Size";
				t6 = space();
				div1 = element("div");
				button1 = element("button");
				t7 = text("↑");
				t8 = space();
				button2 = element("button");
				t9 = text("↓");
				t10 = space();
				div4 = element("div");
				span2 = element("span");
				t11 = text(t11_value);
				t12 = space();
				span3 = element("span");
				span3.textContent = "Uses";
				t14 = space();
				div3 = element("div");
				button3 = element("button");
				t15 = text("↑");
				t16 = space();
				button4 = element("button");
				t17 = text("↓");
				t18 = space();
				div6 = element("div");
				div5 = element("div");
				button5 = element("button");
				t19 = text("↑");
				t20 = space();
				button6 = element("button");
				t21 = text("↓");
				t22 = space();
				button7 = element("button");
				t23 = text("Delete");
				attr(input, "class", "form-control flex-grow-1");
				set_style(input, "min-width", "0px");
				attr(button0, "class", "" + (btnStyle + " btn-light ml-1"));
				attr(div0, "class", "d-flex m-1");
				attr(span0, "class", "" + (btnStyle + " btn-dark"));
				attr(span1, "class", "ml-1");
				attr(button1, "class", btnStyle);
				attr(button2, "class", btnStyle);
				attr(div1, "class", "btn-group ml-auto");
				attr(div2, "class", "d-flex m-1 align-items-center");
				attr(span2, "class", "" + (btnStyle + " btn-dark"));
				attr(span3, "class", "ml-1");
				attr(button3, "class", btnStyle);
				attr(button4, "class", btnStyle);
				attr(div3, "class", "btn-group ml-auto");
				attr(div4, "class", "d-flex m-1 align-items-center");
				attr(button5, "class", "" + (btnStyle + " btn-light"));
				attr(button6, "class", "" + (btnStyle + " btn-light"));
				attr(div5, "class", "btn-group");
				attr(button7, "class", "" + (btnStyle + " btn-light ml-auto"));
				attr(div6, "class", "d-flex m-1 align-items-center");
				attr(div7, "class", "btn bg-light mb-1 p-0 w-100 border");
			},
			m(target, anchor) {
				insert(target, div7, anchor);
				append(div7, div0);
				append(div0, input);
				set_input_value(input, /*item*/ ctx[0].text);
				append(div0, t0);
				append(div0, button0);
				append(button0, t1);
				append(div7, t2);
				append(div7, div2);
				append(div2, span0);
				append(span0, t3);
				append(div2, t4);
				append(div2, span1);
				append(div2, t6);
				append(div2, div1);
				append(div1, button1);
				append(button1, t7);
				append(div1, t8);
				append(div1, button2);
				append(button2, t9);
				append(div7, t10);
				append(div7, div4);
				append(div4, span2);
				append(span2, t11);
				append(div4, t12);
				append(div4, span3);
				append(div4, t14);
				append(div4, div3);
				append(div3, button3);
				append(button3, t15);
				append(div3, t16);
				append(div3, button4);
				append(button4, t17);
				append(div7, t18);
				append(div7, div6);
				append(div6, div5);
				append(div5, button5);
				append(button5, t19);
				append(div5, t20);
				append(div5, button6);
				append(button6, t21);
				append(div6, t22);
				append(div6, button7);
				append(button7, t23);

				if (!mounted) {
					dispose = [
						listen(input, "input", /*input_input_handler*/ ctx[7]),
						listen(button0, "click", /*click_handler*/ ctx[8]),
						listen(button1, "click", /*click_handler_1*/ ctx[9]),
						listen(button2, "click", /*click_handler_2*/ ctx[10]),
						listen(button3, "click", /*click_handler_3*/ ctx[11]),
						listen(button4, "click", /*click_handler_4*/ ctx[12]),
						listen(button5, "click", /*click_handler_5*/ ctx[13]),
						listen(button6, "click", /*click_handler_6*/ ctx[14]),
						listen(button7, "click", /*click_handler_7*/ ctx[15])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*item*/ 1 && input.value !== /*item*/ ctx[0].text) {
					set_input_value(input, /*item*/ ctx[0].text);
				}

				if (dirty & /*item*/ 1 && t3_value !== (t3_value = /*item*/ ctx[0].size + "")) set_data(t3, t3_value);
				if (dirty & /*item*/ 1 && t11_value !== (t11_value = /*item*/ ctx[0].stackSize + "")) set_data(t11, t11_value);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div7);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (74:12) {#if item.stackSize}
	function create_if_block_1$c(ctx) {
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding(value) {
			/*bubbles_value_binding*/ ctx[18](value);
		}

		let bubbles_props = {
			count: /*item*/ ctx[0].stackSize,
			$$slots: { default: [create_default_slot$2] },
			$$scope: { ctx }
		};

		if (/*item*/ ctx[0].stack !== void 0) {
			bubbles_props.value = /*item*/ ctx[0].stack;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

		return {
			c() {
				create_component(bubbles.$$.fragment);
			},
			m(target, anchor) {
				mount_component(bubbles, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*item*/ 1) bubbles_changes.count = /*item*/ ctx[0].stackSize;

				if (dirty & /*$$scope*/ 1048576) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*item*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*item*/ ctx[0].stack;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(bubbles, detaching);
			}
		};
	}

	// (75:12) <Bubbles count={item.stackSize} bind:value={item.stack}>
	function create_default_slot$2(ctx) {
		let t;

		return {
			c() {
				t = text("Used");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$f(ctx) {
		let div;
		let current_block_type_index;
		let if_block;
		let current;
		const if_block_creators = [create_if_block$c, create_else_block$9];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*editing*/ ctx[3]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				div = element("div");
				if_block.c();
			},
			m(target, anchor) {
				insert(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	const btnStyle = 'btn border border-dark align-self-start';

	function instance$f($$self, $$props, $$invalidate) {
		let size;
		let { item } = $$props;
		let { actions } = $$props;
		let { selected = false } = $$props;
		let editing = false;

		function select() {
			actions.select(item);
		}

		function stackSize(n) {
			$$invalidate(0, item.stackSize += n, item);
			if (item.stackSize < 0) $$invalidate(0, item.stackSize = 0, item);
		}

		if (item.stackSize === undefined) {
			item.stackSize = 0;
			item.stack = 0;
		}

		function input_input_handler() {
			item.text = this.value;
			$$invalidate(0, item);
		}

		const click_handler = () => $$invalidate(3, editing = false);
		const click_handler_1 = () => actions.resize(item, 1);
		const click_handler_2 = () => actions.resize(item, -1);
		const click_handler_3 = () => stackSize(1);
		const click_handler_4 = () => stackSize(-1);
		const click_handler_5 = () => actions.move(item, -1);
		const click_handler_6 = () => actions.move(item, 1);
		const click_handler_7 = () => actions.delete(item);
		const dragstart_handler = () => actions.dragStart(item);
		const dragend_handler = () => actions.dragEnd();

		function bubbles_value_binding(value) {
			if ($$self.$$.not_equal(item.stack, value)) {
				item.stack = value;
				$$invalidate(0, item);
			}
		}

		const click_handler_8 = () => $$invalidate(3, editing = true);

		$$self.$$set = $$props => {
			if ('item' in $$props) $$invalidate(0, item = $$props.item);
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
			if ('selected' in $$props) $$invalidate(2, selected = $$props.selected);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*item*/ 1) {
				$$invalidate(4, size = item.stackSize ? item.size + 1 : item.size);
			}
		};

		return [
			item,
			actions,
			selected,
			editing,
			size,
			select,
			stackSize,
			input_input_handler,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			click_handler_5,
			click_handler_6,
			click_handler_7,
			dragstart_handler,
			dragend_handler,
			bubbles_value_binding,
			click_handler_8
		];
	}

	class Item extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$f, create_fragment$f, safe_not_equal, { item: 0, actions: 1, selected: 2 });
		}
	}

	/* src\components\Container.svelte generated by Svelte v4.2.20 */

	function get_each_context$7(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[25] = list[i];
		return child_ctx;
	}

	// (127:12) {:else}
	function create_else_block_1$3(ctx) {
		let h5;
		let span;
		let t_value = /*container*/ ctx[0].name + "";
		let t;

		return {
			c() {
				h5 = element("h5");
				span = element("span");
				t = text(t_value);
				attr(span, "class", "card-title mb-0");
				attr(h5, "class", "m-0");
			},
			m(target, anchor) {
				insert(target, h5, anchor);
				append(h5, span);
				append(span, t);
			},
			p(ctx, dirty) {
				if (dirty & /*container*/ 1 && t_value !== (t_value = /*container*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(h5);
				}
			}
		};
	}

	// (123:51) 
	function create_if_block_5$2(ctx) {
		let h4;
		let button;
		let t_value = /*container*/ ctx[0].name + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				h4 = element("h4");
				button = element("button");
				t = text(t_value);
				attr(button, "class", "badge btn btn-light text-left card-title w-100 mb-0");
				attr(h4, "class", "flex-grow-1 m-0");
			},
			m(target, anchor) {
				insert(target, h4, anchor);
				append(h4, button);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[21]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*container*/ 1 && t_value !== (t_value = /*container*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(h4);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (121:63) 
	function create_if_block_4$2(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control mr-2");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				/*input_1_binding*/ ctx[19](input_1);
				set_input_value(input_1, /*container*/ ctx[0].name);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler*/ ctx[18]),
						listen(input_1, "input", /*input_1_input_handler*/ ctx[20])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*container*/ 1 && input_1.value !== /*container*/ ctx[0].name) {
					set_input_value(input_1, /*container*/ ctx[0].name);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[19](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (117:12) {#if container.format == 'pack'}
	function create_if_block_3$3(ctx) {
		let h4;
		let button;
		let t_value = /*container*/ ctx[0].name + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				h4 = element("h4");
				button = element("button");
				t = text(t_value);
				attr(button, "class", "badge btn btn-light text-left card-title w-100 mb-0");
				attr(h4, "class", "flex-grow-1 m-0");
			},
			m(target, anchor) {
				insert(target, h4, anchor);
				append(h4, button);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*togglePack*/ ctx[15]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*container*/ 1 && t_value !== (t_value = /*container*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(h4);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (136:12) {:else}
	function create_else_block$8(ctx) {
		let h5;
		let span;
		let t0;
		let t1;
		let t2_value = /*container*/ ctx[0].size + "";
		let t2;

		return {
			c() {
				h5 = element("h5");
				span = element("span");
				t0 = text(/*occupied*/ ctx[3]);
				t1 = text(" / ");
				t2 = text(t2_value);
				attr(span, "class", "badge btn btn-light");
				attr(h5, "class", "ml-auto mr-1");
			},
			m(target, anchor) {
				insert(target, h5, anchor);
				append(h5, span);
				append(span, t0);
				append(span, t1);
				append(span, t2);
			},
			p(ctx, dirty) {
				if (dirty & /*occupied*/ 8) set_data(t0, /*occupied*/ ctx[3]);
				if (dirty & /*container*/ 1 && t2_value !== (t2_value = /*container*/ ctx[0].size + "")) set_data(t2, t2_value);
			},
			d(detaching) {
				if (detaching) {
					detach(h5);
				}
			}
		};
	}

	// (132:12) {#if canAdd}
	function create_if_block_2$7(ctx) {
		let h5;
		let span;
		let t;

		return {
			c() {
				h5 = element("h5");
				span = element("span");
				t = text(/*occupied*/ ctx[3]);
				attr(span, "class", "badge btn btn-light");
				attr(h5, "class", "ml-auto mr-1");
			},
			m(target, anchor) {
				insert(target, h5, anchor);
				append(h5, span);
				append(span, t);
			},
			p(ctx, dirty) {
				if (dirty & /*occupied*/ 8) set_data(t, /*occupied*/ ctx[3]);
			},
			d(detaching) {
				if (detaching) {
					detach(h5);
				}
			}
		};
	}

	// (148:16) {#each container.items as item (item.id)}
	function create_each_block$7(key_1, ctx) {
		let first;
		let item_1;
		let current;

		item_1 = new Item({
				props: {
					item: /*item*/ ctx[25],
					actions: /*itemActions*/ ctx[9],
					selected: /*selected*/ ctx[2] == /*item*/ ctx[25]
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(item_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(item_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const item_1_changes = {};
				if (dirty & /*container*/ 1) item_1_changes.item = /*item*/ ctx[25];
				if (dirty & /*selected, container*/ 5) item_1_changes.selected = /*selected*/ ctx[2] == /*item*/ ctx[25];
				item_1.$set(item_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(item_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(item_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(item_1, detaching);
			}
		};
	}

	// (151:16) {#if space > 0}
	function create_if_block_1$b(ctx) {
		let button;
		let button_class_value;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				button.disabled = /*disabled*/ ctx[7];

				attr(button, "class", button_class_value = "drop btn border mb-1 " + (/*disabled*/ ctx[7]
				? 'disabled btn-secondary'
				: 'btn-light'));

				set_style(button, "height", 2.5 * /*space*/ ctx[4] + "em");
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (!mounted) {
					dispose = [
						listen(button, "dragenter", /*dragEnter*/ ctx[11]),
						listen(button, "dragleave", dragLeave),
						listen(button, "dragover", /*dragOver*/ ctx[12]),
						listen(button, "drop", /*drop*/ ctx[13]),
						listen(button, "click", /*add*/ ctx[10])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*disabled*/ 128) {
					button.disabled = /*disabled*/ ctx[7];
				}

				if (dirty & /*disabled*/ 128 && button_class_value !== (button_class_value = "drop btn border mb-1 " + (/*disabled*/ ctx[7]
				? 'disabled btn-secondary'
				: 'btn-light'))) {
					attr(button, "class", button_class_value);
				}

				if (dirty & /*space*/ 16) {
					set_style(button, "height", 2.5 * /*space*/ ctx[4] + "em");
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (163:12) {#if container.format == 'custom'}
	function create_if_block$b(ctx) {
		let div;
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				button = element("button");
				button.textContent = "Delete";
				attr(button, "class", "btn btn-light border ml-auto");
				attr(div, "class", "d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, button);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_2*/ ctx[23]);
					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				dispose();
			}
		};
	}

	function create_fragment$e(ctx) {
		let div5;
		let div4;
		let div1;
		let t0;
		let t1;
		let div0;
		let button0;
		let t2;
		let t3;
		let button1;
		let t4;
		let t5;
		let div3;
		let div2;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t6;
		let t7;
		let current;
		let mounted;
		let dispose;

		function select_block_type(ctx, dirty) {
			if (/*container*/ ctx[0].format == 'pack') return create_if_block_3$3;
			if (/*container*/ ctx[0].format == 'custom' && /*editName*/ ctx[5]) return create_if_block_4$2;
			if (/*container*/ ctx[0].format == 'custom') return create_if_block_5$2;
			return create_else_block_1$3;
		}

		let current_block_type = select_block_type(ctx);
		let if_block0 = current_block_type(ctx);

		function select_block_type_1(ctx, dirty) {
			if (/*canAdd*/ ctx[8]) return create_if_block_2$7;
			return create_else_block$8;
		}

		let current_block_type_1 = select_block_type_1(ctx);
		let if_block1 = current_block_type_1(ctx);
		let each_value = ensure_array_like(/*container*/ ctx[0].items);
		const get_key = ctx => /*item*/ ctx[25].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$7(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$7(key, child_ctx));
		}

		let if_block2 = /*space*/ ctx[4] > 0 && create_if_block_1$b(ctx);
		let if_block3 = /*container*/ ctx[0].format == 'custom' && create_if_block$b(ctx);

		return {
			c() {
				div5 = element("div");
				div4 = element("div");
				div1 = element("div");
				if_block0.c();
				t0 = space();
				if_block1.c();
				t1 = space();
				div0 = element("div");
				button0 = element("button");
				t2 = text("hide");
				t3 = space();
				button1 = element("button");
				t4 = text("a → z");
				t5 = space();
				div3 = element("div");
				div2 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t6 = space();
				if (if_block2) if_block2.c();
				t7 = space();
				if (if_block3) if_block3.c();
				attr(button0, "class", smallButton);
				attr(button1, "class", smallButton);
				attr(div0, "class", "ml-1 btn-group");
				attr(div1, "class", "card-header p-2 d-flex");
				attr(div2, "class", "d-flex flex-column");
				attr(div3, "class", "card-body");
				attr(div4, "class", "card");
				attr(div5, "class", "col-lg-3 col-md-4 col-sm-6 my-1");
			},
			m(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div4);
				append(div4, div1);
				if_block0.m(div1, null);
				append(div1, t0);
				if_block1.m(div1, null);
				append(div1, t1);
				append(div1, div0);
				append(div0, button0);
				append(button0, t2);
				append(div0, t3);
				append(div0, button1);
				append(button1, t4);
				append(div4, t5);
				append(div4, div3);
				append(div3, div2);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div2, null);
					}
				}

				append(div2, t6);
				if (if_block2) if_block2.m(div2, null);
				append(div3, t7);
				if (if_block3) if_block3.m(div3, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler_1*/ ctx[22]),
						listen(button1, "click", /*sort*/ ctx[14])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(ctx);

					if (if_block0) {
						if_block0.c();
						if_block0.m(div1, t0);
					}
				}

				if_block1.p(ctx, dirty);

				if (dirty & /*container, itemActions, selected*/ 517) {
					each_value = ensure_array_like(/*container*/ ctx[0].items);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div2, outro_and_destroy_block, create_each_block$7, t6, get_each_context$7);
					check_outros();
				}

				if (/*space*/ ctx[4] > 0) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block_1$b(ctx);
						if_block2.c();
						if_block2.m(div2, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (/*container*/ ctx[0].format == 'custom') {
					if (if_block3) {
						if_block3.p(ctx, dirty);
					} else {
						if_block3 = create_if_block$b(ctx);
						if_block3.c();
						if_block3.m(div3, null);
					}
				} else if (if_block3) {
					if_block3.d(1);
					if_block3 = null;
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div5);
				}

				if_block0.d();
				if_block1.d();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				if (if_block2) if_block2.d();
				if (if_block3) if_block3.d();
				mounted = false;
				run_all(dispose);
			}
		};
	}

	const smallButton = 'badge btn btn-light border border-dark align-self-center p-2';

	function dragLeave(e) {
		e.target.classList.remove('dragover');
	}

	function instance$e($$self, $$props, $$invalidate) {
		let occupied;
		let space;
		let canTransfer;
		let disabled;
		let { container } = $$props;
		let { dragItem } = $$props;
		let { actions } = $$props;
		let { selected } = $$props;
		const canAdd = ['custom', 'pockets'].includes(container.format);

		const itemActions = {
			delete: item => {
				let i = container.items.indexOf(item);
				container.items.splice(i, 1);
				$$invalidate(0, container);
			},
			dragEnd: () => {
				actions.dragEnd();
			},
			dragStart: item => {
				actions.dragStart(container, item);
			},
			move: (item, n) => {
				let index = container.items.indexOf(item);
				container.items.splice(index, 1);
				index += n;
				if (index < 0) index = container.items.length; else if (index > container.items.length) index = 0;
				container.items.splice(index, 0, item);
				$$invalidate(0, container);
			},
			resize: (item, n) => {
				item.size += n;
				if (space - n < 0) item.size -= n;
				if (item.size == 0) item.size = 1;
				$$invalidate(0, container);
			},
			select: item => {
				actions.select(container, item);
			}
		};

		let editName = false;
		let input;
		let requiredSpace;

		function add() {
			if (space == 0) return;

			if (canTransfer) {
				actions.selectEnd(container);
			} else if (selected == null) {
				container.items.push({
					text: '',
					size: 1,
					id: crypto.randomUUID()
				});

				$$invalidate(0, container);
			}
		}

		function dragEnter(e) {
			if (canTransfer) e.target.classList.add('dragover');
		}

		function dragOver(e) {
			if (canTransfer) e.preventDefault();
		}

		function drop(e) {
			e.target.classList.remove('dragover');
			actions.dragEnd(container);
		}

		function sort() {
			container.items.sort((a, b) => a.text.localeCompare(b.text));
			$$invalidate(0, container);
		}

		function togglePack() {
			if (container.size == 6 && occupied <= 3) {
				$$invalidate(0, container.size = 3, container);
				$$invalidate(0, container.name = 'Satchel', container);
			} else {
				$$invalidate(0, container.size = 6, container);
				$$invalidate(0, container.name = 'Backpack', container);
			}
		}

		container.items.forEach(x => {
			if (!x.id) x.id = crypto.randomUUID();
		});

		afterUpdate(() => {
			if (input) input.focus();
		});

		const blur_handler = () => $$invalidate(5, editName = false);

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(6, input);
			});
		}

		function input_1_input_handler() {
			container.name = this.value;
			$$invalidate(0, container);
		}

		const click_handler = () => $$invalidate(5, editName = true);
		const click_handler_1 = () => actions.hide(container);
		const click_handler_2 = () => actions.delete(container);

		$$self.$$set = $$props => {
			if ('container' in $$props) $$invalidate(0, container = $$props.container);
			if ('dragItem' in $$props) $$invalidate(16, dragItem = $$props.dragItem);
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
			if ('selected' in $$props) $$invalidate(2, selected = $$props.selected);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*container*/ 1) {
				$$invalidate(3, occupied = container.items.reduce((a, b) => a + b.size, 0));
			}

			if ($$self.$$.dirty & /*container, occupied*/ 9) {
				$$invalidate(4, space = canAdd ? 1 : container.size - occupied);
			}

			if ($$self.$$.dirty & /*dragItem, selected*/ 65540) {
				{
					if (canAdd) $$invalidate(17, requiredSpace = 1); else if (dragItem != null) $$invalidate(17, requiredSpace = dragItem.size); else if (selected != null) $$invalidate(17, requiredSpace = selected.size); else $$invalidate(17, requiredSpace = 1);
				}
			}

			if ($$self.$$.dirty & /*dragItem, selected, space, requiredSpace*/ 196628) {
				canTransfer = (dragItem != null || selected != null) && space >= requiredSpace;
			}

			if ($$self.$$.dirty & /*space, requiredSpace*/ 131088) {
				$$invalidate(7, disabled = space < requiredSpace);
			}
		};

		return [
			container,
			actions,
			selected,
			occupied,
			space,
			editName,
			input,
			disabled,
			canAdd,
			itemActions,
			add,
			dragEnter,
			dragOver,
			drop,
			sort,
			togglePack,
			dragItem,
			requiredSpace,
			blur_handler,
			input_1_binding,
			input_1_input_handler,
			click_handler,
			click_handler_1,
			click_handler_2
		];
	}

	class Container extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$e, create_fragment$e, safe_not_equal, {
				container: 0,
				dragItem: 16,
				actions: 1,
				selected: 2
			});
		}
	}

	/* src\components\Inventory.svelte generated by Svelte v4.2.20 */

	function get_each_context$6(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		return child_ctx;
	}

	function get_each_context_1$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		child_ctx[10] = list;
		child_ctx[11] = i;
		return child_ctx;
	}

	// (78:24) {#if container.hide}
	function create_if_block_1$a(ctx) {
		let button;
		let t_value = /*container*/ ctx[7].name + "";
		let t;
		let mounted;
		let dispose;

		function click_handler() {
			return /*click_handler*/ ctx[5](/*container*/ ctx[7], /*each_value_1*/ ctx[10], /*container_index_1*/ ctx[11]);
		}

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn btn-light border mt-1 mr-1");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", click_handler);
					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*inventory*/ 1 && t_value !== (t_value = /*container*/ ctx[7].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (77:24) {#each inventory as container}
	function create_each_block_1$2(ctx) {
		let if_block_anchor;
		let if_block = /*container*/ ctx[7].hide && create_if_block_1$a(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, dirty) {
				if (/*container*/ ctx[7].hide) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1$a(ctx);
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	// (87:8) {#if !container.hide}
	function create_if_block$a(ctx) {
		let container_1;
		let current;

		container_1 = new Container({
				props: {
					container: /*container*/ ctx[7],
					dragItem: /*dragItem*/ ctx[1],
					actions: /*actions*/ ctx[3],
					selected: /*selected*/ ctx[2]
				}
			});

		return {
			c() {
				create_component(container_1.$$.fragment);
			},
			m(target, anchor) {
				mount_component(container_1, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const container_1_changes = {};
				if (dirty & /*inventory*/ 1) container_1_changes.container = /*container*/ ctx[7];
				if (dirty & /*dragItem*/ 2) container_1_changes.dragItem = /*dragItem*/ ctx[1];
				if (dirty & /*selected*/ 4) container_1_changes.selected = /*selected*/ ctx[2];
				container_1.$set(container_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(container_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(container_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(container_1, detaching);
			}
		};
	}

	// (86:8) {#each inventory as container (container.id)}
	function create_each_block$6(key_1, ctx) {
		let first;
		let if_block_anchor;
		let current;
		let if_block = !/*container*/ ctx[7].hide && create_if_block$a(ctx);

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				if (if_block) if_block.c();
				if_block_anchor = empty();
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;

				if (!/*container*/ ctx[7].hide) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*inventory*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$a(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	function create_fragment$d(ctx) {
		let div6;
		let div5;
		let div4;
		let div3;
		let div0;
		let t1;
		let div2;
		let button;
		let t3;
		let div1;
		let t4;
		let each_blocks = [];
		let each1_lookup = new Map();
		let current;
		let mounted;
		let dispose;
		let each_value_1 = ensure_array_like(/*inventory*/ ctx[0]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
		}

		let each_value = ensure_array_like(/*inventory*/ ctx[0]);
		const get_key = ctx => /*container*/ ctx[7].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$6(ctx, each_value, i);
			let key = get_key(child_ctx);
			each1_lookup.set(key, each_blocks[i] = create_each_block$6(key, child_ctx));
		}

		return {
			c() {
				div6 = element("div");
				div5 = element("div");
				div4 = element("div");
				div3 = element("div");
				div0 = element("div");
				div0.innerHTML = `<h5 class="m-0">Containers</h5>`;
				t1 = space();
				div2 = element("div");
				button = element("button");
				button.textContent = "Add container";
				t3 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t4 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div0, "class", "card-header p-2");
				attr(button, "class", "btn btn-light border");
				attr(div2, "class", "card-body d-flex flex-column");
				attr(div3, "class", "card");
				attr(div4, "class", "col-md-12 my-1");
				attr(div5, "class", "row");
				attr(div6, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div5);
				append(div5, div4);
				append(div4, div3);
				append(div3, div0);
				append(div3, t1);
				append(div3, div2);
				append(div2, button);
				append(div2, t3);
				append(div2, div1);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div1, null);
					}
				}

				append(div5, t4);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div5, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*add*/ ctx[4]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*inventory*/ 1) {
					each_value_1 = ensure_array_like(/*inventory*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_1$2(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(div1, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_1.length;
				}

				if (dirty & /*inventory, dragItem, actions, selected*/ 15) {
					each_value = ensure_array_like(/*inventory*/ ctx[0]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each1_lookup, div5, outro_and_destroy_block, create_each_block$6, null, get_each_context$6);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div6);
				}

				destroy_each(each_blocks_1, detaching);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				dispose();
			}
		};
	}

	function instance$d($$self, $$props, $$invalidate) {
		let { inventory } = $$props;
		let dragContainer;
		let dragItem;
		let selected;

		const actions = {
			delete: container => {
				if (!confirm(`Delete ${container.name} permanently?`)) return;
				let i = inventory.indexOf(container);
				inventory.splice(i, 1);
				$$invalidate(0, inventory);
			},
			dragEnd: container => {
				if (container) {
					let i = dragContainer.items.indexOf(dragItem);
					dragContainer.items.splice(i, 1);
					container.items.push(dragItem);
				}

				$$invalidate(1, dragItem = null);
				dragContainer = null;
				$$invalidate(2, selected = null);
				$$invalidate(0, inventory);
			},
			dragStart: (container, item) => {
				dragContainer = container;
				$$invalidate(1, dragItem = item);
				$$invalidate(0, inventory);
			},
			hide: container => {
				container.hide = true;
				$$invalidate(0, inventory);
			},
			select: (container, item) => {
				dragContainer = container;
				$$invalidate(2, selected = selected == item ? null : item);
				$$invalidate(0, inventory);
			},
			selectEnd: container => {
				let i = dragContainer.items.indexOf(selected);
				dragContainer.items.splice(i, 1);
				container.items.push(selected);
				$$invalidate(2, selected = null);
				dragContainer = null;
				$$invalidate(0, inventory);
			}
		};

		function add() {
			let c = container({
				name: 'new container',
				size: 1,
				format: 'custom'
			});

			inventory.push(c);
			$$invalidate(0, inventory);
		}

		const click_handler = (container, each_value_1, container_index_1) => $$invalidate(0, each_value_1[container_index_1].hide = false, inventory);

		$$self.$$set = $$props => {
			if ('inventory' in $$props) $$invalidate(0, inventory = $$props.inventory);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*inventory*/ 1) {
				{
					inventory.forEach(container => {
						if (!container.id) container.id = crypto.randomUUID();
					});
				}
			}
		};

		return [inventory, dragItem, selected, actions, add, click_handler];
	}

	class Inventory extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$d, create_fragment$d, safe_not_equal, { inventory: 0 });
		}
	}

	/* src\components\NavLink.svelte generated by Svelte v4.2.20 */

	function create_fragment$c(ctx) {
		let a;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[4].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

		return {
			c() {
				a = element("a");
				if (default_slot) default_slot.c();
				attr(a, "href", "#");
				attr(a, "class", "nav-item nav-link");
				toggle_class(a, "active", /*tab*/ ctx[0] == /*tabValue*/ ctx[1]);
			},
			m(target, anchor) {
				insert(target, a, anchor);

				if (default_slot) {
					default_slot.m(a, null);
				}

				current = true;

				if (!mounted) {
					dispose = listen(a, "click", /*setTab*/ ctx[2]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[3],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
							null
						);
					}
				}

				if (!current || dirty & /*tab, tabValue*/ 3) {
					toggle_class(a, "active", /*tab*/ ctx[0] == /*tabValue*/ ctx[1]);
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(a);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				dispose();
			}
		};
	}

	function instance$c($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		const dispatch = createEventDispatcher();
		let { tabValue } = $$props;
		let { tab = '' } = $$props;

		function setTab() {
			$$invalidate(0, tab = tabValue);
			dispatch('setTab', { tab: tabValue });
		}

		$$self.$$set = $$props => {
			if ('tabValue' in $$props) $$invalidate(1, tabValue = $$props.tabValue);
			if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
			if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
		};

		return [tab, tabValue, setTab, $$scope, slots];
	}

	class NavLink extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$c, create_fragment$c, safe_not_equal, { tabValue: 1, tab: 0 });
		}
	}

	const mods = {
	    colonialMarines: () => {
	        return {
	            navbar: { tab: 'bio' },
	            abilities: abilities(),
	            advancement: advancement(),
	            bio: bio(),
	            circles: circles(),
	            conditions: conditions(),
	            inventory: [
	                container({ name: 'Armament', size: 5, format: 'pockets' }),
	                container({ name: 'Protection', size: 2, format: 'static' }),
	                container({ name: 'Pack', size: 1, format: 'pockets' }),
	                container({ name: 'Combat Webbing', size: 1, format: 'pockets' })
	            ],
	            mod: 'colonialMarines',
	            notes: [],
	            skills: {
	                compact: false,
	                skills: [
	                    skill({ name: 'Admin', bluck: 'Will', special: true }),
	                    skill({ name: 'Armorer', bluck: 'Health', special: true }),
	                    skill({ name: 'Broker', bluck: 'Will', special: true }),
	                    skill({ name: 'Criminal', bluck: 'Will', special: true }),
	                    skill({ name: 'Executive', bluck: 'Will', special: true }),
	                    skill({ name: 'Gunner', bluck: 'Health', special: true }),
	                    skill({ name: 'Instructor', bluck: 'Health', special: true }),
	                    skill({ name: 'Leader', bluck: 'Health', special: true }),
	                    skill({ name: 'Manipulator', bluck: 'Will', special: true }),
	                    skill({ name: 'Medic', bluck: 'Will', special: true }),
	                    skill({ name: 'Operator', bluck: 'Health', special: true }),
	                    skill({ name: 'Persuader', bluck: 'Will', special: true }),
	                    skill({ name: 'Pilot', bluck: 'Health', special: true }),
	                    skill({ name: 'Programmer', bluck: 'Will', special: true }),
	                    skill({ name: 'Scavenger', bluck: 'Will', special: true }),
	                    skill({ name: 'Scientist', bluck: 'Will', special: true }),
	                    skill({ name: 'Scout', bluck: 'Will', special: true }),
	                    skill({ name: 'Soldier', bluck: 'Health', special: false }),
	                    skill({ name: 'Survivalist', bluck: 'Health', special: true }),
	                    skill({ name: 'Technician', bluck: 'Health', special: true })
	                ]
	            },
	            spells: spells(),
	            traits: [],
	            wises: []
	        }
	    },
	    torchbearer: character
	};

	const patch = (a, b) => {
	    for(let key in b) {
	        if(!a[key]) a[key] = b[key];
	        if(typeof(a[key]) == 'object') {
	            patch(a[key], b[key]);
	        }
	    }
	};

	var actions = {
	    delete: (model) => {
	        if(!confirm(`Delete ${model.bio.name}?`)) return;

	        localStorage.removeItem(model.bio.name);
	        return { success: `${model.bio.name} deleted from character storage` };
	    },
	    deleteAll: () => {
	        if(!confirm('Delete all saved characters?')) return;

	        localStorage.clear();
	        return { success: 'All characters deleted from character storage' };
	    },
	    export: (model) => {
	        let href = URL.createObjectURL(new Blob([JSON.stringify(model)]));
	        let a = document.createElement('a');
	        a.href = href;
	        a.download = `${model.bio.name}.tb2e`;
	        a.click();
	    },
	    import: (done) => {
	        let file = document.createElement('input');
	        file.type = 'file';
	        file.accept = '.tb2e';
	        file.onchange = (e) => {
	            e.target.files[0].text().then((t) => {
	                let key = JSON.parse(t).bio.name;
	                localStorage.setItem(key, t);
	                done(`${key} added to character storage`);
	            });
	        };
	        file.click();
	    },
	    load: (model, key) => {
	        let name = key;
	        if(name == `${model.bio.name}.tb2e`) return { model };

	        let alert = '';
	        if(model.bio.name && confirm(`Save ${model.bio.name} before changing characters?`)) {
	            localStorage.setItem(model.bio.name, JSON.stringify(model));
	            alert += `${model.bio.name} saved, `;
	        }

	        model = JSON.parse(localStorage.getItem(name));
	        if(!model.mod) model.mod = 'torchbearer';
	        
	        patch(model, mods[model.mod]());
	        return { model, alert: { success: `${alert}${model.bio.name} opened` }};
	    },
	    loadList: () => {
	        let characters = [...new Array(window.localStorage.length)].map((x,i) => window.localStorage.key(i));
	        characters = characters.filter(c => c.endsWith('.tb2e'));
	        characters.sort((a,b) => a.localeCompare(b));
	        return characters;
	    },
	    loadMod: (model, mod) => {
	        let alert = '';
	        if(model.bio.name && confirm(`Save ${model.bio.name} before changing characters?`)) {
	            localStorage.setItem(model.bio.name, JSON.stringify(model));
	            alert += `${model.bio.name} saved, `;
	        }

	        model = mods[mod]();
	        return { model, alert: { success: `${alert}${mod} loaded` }};
	    },
	    save: (model) => {
	        if(!model.bio.name)
	            return { error: 'Cannot save an unnamed character' };

	        localStorage.setItem(`${model.bio.name}.tb2e`, JSON.stringify(model));
	        return { success: `${model.bio.name} saved` };
	    }
	};

	const params = new URLSearchParams(window.location.search);
	const theme = params.get('theme') ?? 
	    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

	function setTheme(name) {
	    window.location.search = `theme=${name}`;
	}

	/* src\components\Navbar.svelte generated by Svelte v4.2.20 */

	function get_each_context$5(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[42] = list[i];
		return child_ctx;
	}

	// (111:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="abilities">
	function create_default_slot_9(ctx) {
		let t;

		return {
			c() {
				t = text("Abilities");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (112:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="advancement">
	function create_default_slot_8(ctx) {
		let t;

		return {
			c() {
				t = text("Advancement");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (113:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="bio">
	function create_default_slot_7(ctx) {
		let t;

		return {
			c() {
				t = text("Bio");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (114:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="circles">
	function create_default_slot_6(ctx) {
		let t;

		return {
			c() {
				t = text("Circles");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (115:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="inventory">
	function create_default_slot_5(ctx) {
		let t;

		return {
			c() {
				t = text("Inventory");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (116:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="notes">
	function create_default_slot_4(ctx) {
		let t;

		return {
			c() {
				t = text("Notes");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (117:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="skills">
	function create_default_slot_3(ctx) {
		let t;

		return {
			c() {
				t = text("Skills");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (118:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="spells">
	function create_default_slot_2$1(ctx) {
		let t;

		return {
			c() {
				t = text("Spells");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (119:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="traits">
	function create_default_slot_1$1(ctx) {
		let t;

		return {
			c() {
				t = text("Traits");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (120:12) <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="wises">
	function create_default_slot$1(ctx) {
		let t;

		return {
			c() {
				t = text("Wises");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (124:20) {#each characters as character}
	function create_each_block$5(ctx) {
		let button;
		let t_value = /*character*/ ctx[42] + "";
		let t;
		let mounted;
		let dispose;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[28](/*character*/ ctx[42]);
		}

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "dropdown-item");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = [
						listen(button, "blur", /*clearMenu*/ ctx[8]),
						listen(button, "click", click_handler_1)
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*characters*/ 8 && t_value !== (t_value = /*character*/ ctx[42] + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (156:23) 
	function create_if_block_1$9(ctx) {
		let button;
		let strong;
		let t_value = /*alert*/ ctx[4].error + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				strong = element("strong");
				t = text(t_value);
				attr(button, "class", "alert alert-static alert-danger btn text-center w-100");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, strong);
				append(strong, t);
				/*button_binding_1*/ ctx[37](button);

				if (!mounted) {
					dispose = [
						listen(button, "blur", /*blur_handler_1*/ ctx[38]),
						listen(button, "click", /*click_handler_8*/ ctx[39])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty[0] & /*alert*/ 16 && t_value !== (t_value = /*alert*/ ctx[4].error + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				/*button_binding_1*/ ctx[37](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (152:0) {#if alert?.success}
	function create_if_block$9(ctx) {
		let button;
		let strong;
		let t_value = /*alert*/ ctx[4].success + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				strong = element("strong");
				t = text(t_value);
				attr(button, "class", "alert alert-static alert-success btn text-center w-100");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, strong);
				append(strong, t);
				/*button_binding*/ ctx[34](button);

				if (!mounted) {
					dispose = [
						listen(button, "blur", /*blur_handler*/ ctx[35]),
						listen(button, "click", /*click_handler_7*/ ctx[36])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty[0] & /*alert*/ 16 && t_value !== (t_value = /*alert*/ ctx[4].success + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				/*button_binding*/ ctx[34](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function create_fragment$b(ctx) {
		let nav;
		let button0;
		let t0;
		let div5;
		let ul;
		let navlink0;
		let updating_tab;
		let t1;
		let navlink1;
		let updating_tab_1;
		let t2;
		let navlink2;
		let updating_tab_2;
		let t3;
		let navlink3;
		let updating_tab_3;
		let t4;
		let navlink4;
		let updating_tab_4;
		let t5;
		let navlink5;
		let updating_tab_5;
		let t6;
		let navlink6;
		let updating_tab_6;
		let t7;
		let navlink7;
		let updating_tab_7;
		let t8;
		let navlink8;
		let updating_tab_8;
		let t9;
		let navlink9;
		let updating_tab_9;
		let t10;
		let li0;
		let a0;
		let t12;
		let div0;
		let div0_style_value;
		let t13;
		let li1;
		let a1;
		let t15;
		let div1;
		let button1;
		let t17;
		let button2;
		let div1_style_value;
		let t19;
		let div4;
		let div3;
		let button3;
		let t21;
		let div2;
		let button4;
		let t23;
		let button5;
		let t25;
		let button6;
		let t27;
		let button7;
		let t29;
		let button8;
		let t31;
		let button9;
		let div2_style_value;
		let t34;
		let if_block_anchor;
		let current;
		let mounted;
		let dispose;

		function navlink0_tab_binding(value) {
			/*navlink0_tab_binding*/ ctx[17](value);
		}

		let navlink0_props = {
			tabValue: "abilities",
			$$slots: { default: [create_default_slot_9] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink0_props.tab = /*tab*/ ctx[0];
		}

		navlink0 = new NavLink({ props: navlink0_props });
		binding_callbacks.push(() => bind(navlink0, 'tab', navlink0_tab_binding));
		navlink0.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink1_tab_binding(value) {
			/*navlink1_tab_binding*/ ctx[18](value);
		}

		let navlink1_props = {
			tabValue: "advancement",
			$$slots: { default: [create_default_slot_8] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink1_props.tab = /*tab*/ ctx[0];
		}

		navlink1 = new NavLink({ props: navlink1_props });
		binding_callbacks.push(() => bind(navlink1, 'tab', navlink1_tab_binding));
		navlink1.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink2_tab_binding(value) {
			/*navlink2_tab_binding*/ ctx[19](value);
		}

		let navlink2_props = {
			tabValue: "bio",
			$$slots: { default: [create_default_slot_7] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink2_props.tab = /*tab*/ ctx[0];
		}

		navlink2 = new NavLink({ props: navlink2_props });
		binding_callbacks.push(() => bind(navlink2, 'tab', navlink2_tab_binding));
		navlink2.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink3_tab_binding(value) {
			/*navlink3_tab_binding*/ ctx[20](value);
		}

		let navlink3_props = {
			tabValue: "circles",
			$$slots: { default: [create_default_slot_6] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink3_props.tab = /*tab*/ ctx[0];
		}

		navlink3 = new NavLink({ props: navlink3_props });
		binding_callbacks.push(() => bind(navlink3, 'tab', navlink3_tab_binding));
		navlink3.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink4_tab_binding(value) {
			/*navlink4_tab_binding*/ ctx[21](value);
		}

		let navlink4_props = {
			tabValue: "inventory",
			$$slots: { default: [create_default_slot_5] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink4_props.tab = /*tab*/ ctx[0];
		}

		navlink4 = new NavLink({ props: navlink4_props });
		binding_callbacks.push(() => bind(navlink4, 'tab', navlink4_tab_binding));
		navlink4.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink5_tab_binding(value) {
			/*navlink5_tab_binding*/ ctx[22](value);
		}

		let navlink5_props = {
			tabValue: "notes",
			$$slots: { default: [create_default_slot_4] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink5_props.tab = /*tab*/ ctx[0];
		}

		navlink5 = new NavLink({ props: navlink5_props });
		binding_callbacks.push(() => bind(navlink5, 'tab', navlink5_tab_binding));
		navlink5.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink6_tab_binding(value) {
			/*navlink6_tab_binding*/ ctx[23](value);
		}

		let navlink6_props = {
			tabValue: "skills",
			$$slots: { default: [create_default_slot_3] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink6_props.tab = /*tab*/ ctx[0];
		}

		navlink6 = new NavLink({ props: navlink6_props });
		binding_callbacks.push(() => bind(navlink6, 'tab', navlink6_tab_binding));
		navlink6.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink7_tab_binding(value) {
			/*navlink7_tab_binding*/ ctx[24](value);
		}

		let navlink7_props = {
			tabValue: "spells",
			$$slots: { default: [create_default_slot_2$1] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink7_props.tab = /*tab*/ ctx[0];
		}

		navlink7 = new NavLink({ props: navlink7_props });
		binding_callbacks.push(() => bind(navlink7, 'tab', navlink7_tab_binding));
		navlink7.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink8_tab_binding(value) {
			/*navlink8_tab_binding*/ ctx[25](value);
		}

		let navlink8_props = {
			tabValue: "traits",
			$$slots: { default: [create_default_slot_1$1] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink8_props.tab = /*tab*/ ctx[0];
		}

		navlink8 = new NavLink({ props: navlink8_props });
		binding_callbacks.push(() => bind(navlink8, 'tab', navlink8_tab_binding));
		navlink8.$on("setTab", /*toggleNav*/ ctx[14]);

		function navlink9_tab_binding(value) {
			/*navlink9_tab_binding*/ ctx[26](value);
		}

		let navlink9_props = {
			tabValue: "wises",
			$$slots: { default: [create_default_slot$1] },
			$$scope: { ctx }
		};

		if (/*tab*/ ctx[0] !== void 0) {
			navlink9_props.tab = /*tab*/ ctx[0];
		}

		navlink9 = new NavLink({ props: navlink9_props });
		binding_callbacks.push(() => bind(navlink9, 'tab', navlink9_tab_binding));
		navlink9.$on("setTab", /*toggleNav*/ ctx[14]);
		let each_value = ensure_array_like(/*characters*/ ctx[3]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
		}

		function select_block_type(ctx, dirty) {
			if (/*alert*/ ctx[4]?.success) return create_if_block$9;
			if (/*alert*/ ctx[4]?.error) return create_if_block_1$9;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type && current_block_type(ctx);

		return {
			c() {
				nav = element("nav");
				button0 = element("button");
				button0.innerHTML = `<span class="navbar-toggler-icon"></span>`;
				t0 = space();
				div5 = element("div");
				ul = element("ul");
				create_component(navlink0.$$.fragment);
				t1 = space();
				create_component(navlink1.$$.fragment);
				t2 = space();
				create_component(navlink2.$$.fragment);
				t3 = space();
				create_component(navlink3.$$.fragment);
				t4 = space();
				create_component(navlink4.$$.fragment);
				t5 = space();
				create_component(navlink5.$$.fragment);
				t6 = space();
				create_component(navlink6.$$.fragment);
				t7 = space();
				create_component(navlink7.$$.fragment);
				t8 = space();
				create_component(navlink8.$$.fragment);
				t9 = space();
				create_component(navlink9.$$.fragment);
				t10 = space();
				li0 = element("li");
				a0 = element("a");
				a0.textContent = "Characters";
				t12 = space();
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t13 = space();
				li1 = element("li");
				a1 = element("a");
				a1.textContent = "Mods";
				t15 = space();
				div1 = element("div");
				button1 = element("button");
				button1.textContent = "Colonial Marines";
				t17 = space();
				button2 = element("button");
				button2.textContent = "Torchbearer";
				t19 = space();
				div4 = element("div");
				div3 = element("div");
				button3 = element("button");
				button3.textContent = "Options";
				t21 = space();
				div2 = element("div");
				button4 = element("button");
				button4.textContent = "Save";
				t23 = space();
				button5 = element("button");
				button5.textContent = "Export";
				t25 = space();
				button6 = element("button");
				button6.textContent = "Import";
				t27 = space();
				button7 = element("button");
				button7.textContent = "Delete";
				t29 = space();
				button8 = element("button");
				button8.textContent = "Delete all";
				t31 = space();
				button9 = element("button");
				button9.textContent = `${theme == 'dark' ? 'Light' : 'Dark'} mode`;
				t34 = space();
				if (if_block) if_block.c();
				if_block_anchor = empty();
				attr(button0, "class", "navbar-toggler");
				attr(button0, "type", "button");
				attr(a0, "href", "#");
				attr(a0, "class", "nav-link dropdown-toggle");
				toggle_class(a0, "disabled", !/*characters*/ ctx[3].length);
				attr(div0, "class", "dropdown-menu");
				attr(div0, "style", div0_style_value = `display: ${/*menu*/ ctx[2] == 'characters' ? 'block' : 'none'}`);
				attr(li0, "class", "nav-item dropdown");
				attr(a1, "href", "#");
				attr(a1, "class", "nav-link dropdown-toggle");
				attr(button1, "class", "dropdown-item");
				attr(button2, "class", "dropdown-item");
				attr(div1, "class", "dropdown-menu");
				attr(div1, "style", div1_style_value = `display: ${/*menu*/ ctx[2] == 'mods' ? 'block' : 'none'}`);
				attr(li1, "class", "nav-item dropdown");
				attr(ul, "class", "navbar-nav mr-auto");
				attr(button3, "href", "#");
				attr(button3, "class", "dropdown-toggle btn btn-light border border-dark");
				attr(button4, "class", "dropdown-item");
				attr(button5, "class", "dropdown-item");
				attr(button6, "class", "dropdown-item");
				attr(button7, "class", "dropdown-item");
				attr(button8, "class", "dropdown-item");
				attr(button9, "class", "dropdown-item");
				attr(div2, "class", "dropdown-menu");
				attr(div2, "style", div2_style_value = `display: ${/*menu*/ ctx[2] == 'options' ? 'block' : 'none'}`);
				attr(div3, "class", "nav-item dropdown");
				attr(div4, "class", "navbar-nav");
				attr(div5, "class", "collapse navbar-collapse");
				set_style(div5, "display", /*navDisplay*/ ctx[1]);
				attr(nav, "class", "navbar navbar-expand-md navbar-light bg-light");
			},
			m(target, anchor) {
				insert(target, nav, anchor);
				append(nav, button0);
				append(nav, t0);
				append(nav, div5);
				append(div5, ul);
				mount_component(navlink0, ul, null);
				append(ul, t1);
				mount_component(navlink1, ul, null);
				append(ul, t2);
				mount_component(navlink2, ul, null);
				append(ul, t3);
				mount_component(navlink3, ul, null);
				append(ul, t4);
				mount_component(navlink4, ul, null);
				append(ul, t5);
				mount_component(navlink5, ul, null);
				append(ul, t6);
				mount_component(navlink6, ul, null);
				append(ul, t7);
				mount_component(navlink7, ul, null);
				append(ul, t8);
				mount_component(navlink8, ul, null);
				append(ul, t9);
				mount_component(navlink9, ul, null);
				append(ul, t10);
				append(ul, li0);
				append(li0, a0);
				append(li0, t12);
				append(li0, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				append(ul, t13);
				append(ul, li1);
				append(li1, a1);
				append(li1, t15);
				append(li1, div1);
				append(div1, button1);
				append(div1, t17);
				append(div1, button2);
				append(div5, t19);
				append(div5, div4);
				append(div4, div3);
				append(div3, button3);
				append(div3, t21);
				append(div3, div2);
				append(div2, button4);
				append(div2, t23);
				append(div2, button5);
				append(div2, t25);
				append(div2, button6);
				append(div2, t27);
				append(div2, button7);
				append(div2, t29);
				append(div2, button8);
				append(div2, t31);
				append(div2, button9);
				insert(target, t34, anchor);
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*toggleNav*/ ctx[14]),
						listen(a0, "blur", /*clearMenu*/ ctx[8]),
						listen(a0, "click", /*click_handler*/ ctx[27]),
						listen(a1, "blur", /*clearMenu*/ ctx[8]),
						listen(a1, "click", /*click_handler_2*/ ctx[29]),
						listen(button1, "blur", /*clearMenu*/ ctx[8]),
						listen(button1, "click", /*click_handler_3*/ ctx[30]),
						listen(button2, "blur", /*clearMenu*/ ctx[8]),
						listen(button2, "click", /*click_handler_4*/ ctx[31]),
						listen(button3, "blur", /*clearMenu*/ ctx[8]),
						listen(button3, "click", /*click_handler_5*/ ctx[32]),
						listen(button4, "click", /*saveClick*/ ctx[12]),
						listen(button4, "blur", /*clearMenu*/ ctx[8]),
						listen(button5, "click", /*exportClick*/ ctx[11]),
						listen(button5, "blur", /*clearMenu*/ ctx[8]),
						listen(button6, "click", /*importClick*/ ctx[15]),
						listen(button6, "blur", /*clearMenu*/ ctx[8]),
						listen(button7, "click", /*deleteClick*/ ctx[9]),
						listen(button7, "blur", /*clearMenu*/ ctx[8]),
						listen(button8, "click", /*deleteAllClick*/ ctx[10]),
						listen(button8, "blur", /*clearMenu*/ ctx[8]),
						listen(button9, "click", /*click_handler_6*/ ctx[33])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				const navlink0_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink0_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab && dirty[0] & /*tab*/ 1) {
					updating_tab = true;
					navlink0_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab = false);
				}

				navlink0.$set(navlink0_changes);
				const navlink1_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink1_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_1 && dirty[0] & /*tab*/ 1) {
					updating_tab_1 = true;
					navlink1_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_1 = false);
				}

				navlink1.$set(navlink1_changes);
				const navlink2_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink2_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_2 && dirty[0] & /*tab*/ 1) {
					updating_tab_2 = true;
					navlink2_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_2 = false);
				}

				navlink2.$set(navlink2_changes);
				const navlink3_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink3_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_3 && dirty[0] & /*tab*/ 1) {
					updating_tab_3 = true;
					navlink3_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_3 = false);
				}

				navlink3.$set(navlink3_changes);
				const navlink4_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink4_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_4 && dirty[0] & /*tab*/ 1) {
					updating_tab_4 = true;
					navlink4_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_4 = false);
				}

				navlink4.$set(navlink4_changes);
				const navlink5_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink5_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_5 && dirty[0] & /*tab*/ 1) {
					updating_tab_5 = true;
					navlink5_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_5 = false);
				}

				navlink5.$set(navlink5_changes);
				const navlink6_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink6_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_6 && dirty[0] & /*tab*/ 1) {
					updating_tab_6 = true;
					navlink6_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_6 = false);
				}

				navlink6.$set(navlink6_changes);
				const navlink7_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink7_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_7 && dirty[0] & /*tab*/ 1) {
					updating_tab_7 = true;
					navlink7_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_7 = false);
				}

				navlink7.$set(navlink7_changes);
				const navlink8_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink8_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_8 && dirty[0] & /*tab*/ 1) {
					updating_tab_8 = true;
					navlink8_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_8 = false);
				}

				navlink8.$set(navlink8_changes);
				const navlink9_changes = {};

				if (dirty[1] & /*$$scope*/ 16384) {
					navlink9_changes.$$scope = { dirty, ctx };
				}

				if (!updating_tab_9 && dirty[0] & /*tab*/ 1) {
					updating_tab_9 = true;
					navlink9_changes.tab = /*tab*/ ctx[0];
					add_flush_callback(() => updating_tab_9 = false);
				}

				navlink9.$set(navlink9_changes);

				if (!current || dirty[0] & /*characters*/ 8) {
					toggle_class(a0, "disabled", !/*characters*/ ctx[3].length);
				}

				if (dirty[0] & /*clearMenu, changeCharacter, characters*/ 328) {
					each_value = ensure_array_like(/*characters*/ ctx[3]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$5(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$5(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				if (!current || dirty[0] & /*menu*/ 4 && div0_style_value !== (div0_style_value = `display: ${/*menu*/ ctx[2] == 'characters' ? 'block' : 'none'}`)) {
					attr(div0, "style", div0_style_value);
				}

				if (!current || dirty[0] & /*menu*/ 4 && div1_style_value !== (div1_style_value = `display: ${/*menu*/ ctx[2] == 'mods' ? 'block' : 'none'}`)) {
					attr(div1, "style", div1_style_value);
				}

				if (!current || dirty[0] & /*menu*/ 4 && div2_style_value !== (div2_style_value = `display: ${/*menu*/ ctx[2] == 'options' ? 'block' : 'none'}`)) {
					attr(div2, "style", div2_style_value);
				}

				if (dirty[0] & /*navDisplay*/ 2) {
					set_style(div5, "display", /*navDisplay*/ ctx[1]);
				}

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if (if_block) if_block.d(1);
					if_block = current_block_type && current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			i(local) {
				if (current) return;
				transition_in(navlink0.$$.fragment, local);
				transition_in(navlink1.$$.fragment, local);
				transition_in(navlink2.$$.fragment, local);
				transition_in(navlink3.$$.fragment, local);
				transition_in(navlink4.$$.fragment, local);
				transition_in(navlink5.$$.fragment, local);
				transition_in(navlink6.$$.fragment, local);
				transition_in(navlink7.$$.fragment, local);
				transition_in(navlink8.$$.fragment, local);
				transition_in(navlink9.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(navlink0.$$.fragment, local);
				transition_out(navlink1.$$.fragment, local);
				transition_out(navlink2.$$.fragment, local);
				transition_out(navlink3.$$.fragment, local);
				transition_out(navlink4.$$.fragment, local);
				transition_out(navlink5.$$.fragment, local);
				transition_out(navlink6.$$.fragment, local);
				transition_out(navlink7.$$.fragment, local);
				transition_out(navlink8.$$.fragment, local);
				transition_out(navlink9.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(nav);
					detach(t34);
					detach(if_block_anchor);
				}

				destroy_component(navlink0);
				destroy_component(navlink1);
				destroy_component(navlink2);
				destroy_component(navlink3);
				destroy_component(navlink4);
				destroy_component(navlink5);
				destroy_component(navlink6);
				destroy_component(navlink7);
				destroy_component(navlink8);
				destroy_component(navlink9);
				destroy_each(each_blocks, detaching);

				if (if_block) {
					if_block.d(detaching);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	const autosaveInterval = 10000; // 10s

	function instance$b($$self, $$props, $$invalidate) {
		let { model = character() } = $$props;
		let { tab = 'bio' } = $$props;
		let navDisplay = 'none';
		let menu = '';
		let characters = [];
		let alert;
		let dismiss;
		console.info('Initializing navbar');

		function changeCharacter(character) {
			let result = actions.load(model, character);
			$$invalidate(16, model = result.model);
			$$invalidate(4, alert = result.alert);
			toggleNav();
		}

		function changeMod(mod) {
			let result = actions.loadMod(model, mod);
			$$invalidate(16, model = result.model);
			$$invalidate(4, alert = result.alert);
			toggleNav();
		}

		function clearMenu(e) {
			if (e.relatedTarget?.className.includes('dropdown-item')) return;
			$$invalidate(2, menu = '');
		}

		function deleteClick() {
			$$invalidate(4, alert = actions.delete(model));
			loadCharacterList();
			toggleNav();
		}

		function deleteAllClick() {
			$$invalidate(4, alert = actions.deleteAll());
			loadCharacterList();
			toggleNav();
		}

		function exportClick() {
			actions.export(model);
			toggleNav();
		}

		function loadCharacterList() {
			$$invalidate(3, characters = actions.loadList());
		}

		function saveClick() {
			$$invalidate(4, alert = actions.save(model));
			$$invalidate(3, characters = actions.loadList());
			toggleNav();
		}

		function setMenu(item) {
			$$invalidate(2, menu = item);
		}

		function toggleNav() {
			$$invalidate(1, navDisplay = navDisplay == 'none' ? 'block' : 'none');
		}

		function importClick() {
			actions.import(msg => {
				$$invalidate(4, alert = { success: msg });
				$$invalidate(3, characters = actions.loadList());
			});

			toggleNav();
		}

		console.info('Loading character list');
		loadCharacterList();
		console.info('Configuring autosave');

		let autoSave = window.setInterval(
			() => {
				console.log(`Autosave (${model.bio.name})`);
				let saved = characters.find(x => x == model.bio.name) != null;
				if (saved) actions.save(model);
			},
			autosaveInterval
		);

		afterUpdate(() => {
			if (dismiss) dismiss.focus();
		});

		onDestroy(() => {
			clearInterval(autoSave);
		});

		function navlink0_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink1_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink2_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink3_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink4_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink5_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink6_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink7_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink8_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		function navlink9_tab_binding(value) {
			tab = value;
			$$invalidate(0, tab);
		}

		const click_handler = () => setMenu('characters');
		const click_handler_1 = character => changeCharacter(character);
		const click_handler_2 = () => setMenu('mods');
		const click_handler_3 = () => changeMod('colonialMarines');
		const click_handler_4 = () => changeMod('torchbearer');
		const click_handler_5 = () => setMenu('options');
		const click_handler_6 = () => setTheme(theme == 'dark' ? 'light' : 'dark');

		function button_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				dismiss = $$value;
				$$invalidate(5, dismiss);
			});
		}

		const blur_handler = () => $$invalidate(4, alert = null);
		const click_handler_7 = () => $$invalidate(4, alert = null);

		function button_binding_1($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				dismiss = $$value;
				$$invalidate(5, dismiss);
			});
		}

		const blur_handler_1 = () => $$invalidate(4, alert = null);
		const click_handler_8 = () => $$invalidate(4, alert = null);

		$$self.$$set = $$props => {
			if ('model' in $$props) $$invalidate(16, model = $$props.model);
			if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
		};

		return [
			tab,
			navDisplay,
			menu,
			characters,
			alert,
			dismiss,
			changeCharacter,
			changeMod,
			clearMenu,
			deleteClick,
			deleteAllClick,
			exportClick,
			saveClick,
			setMenu,
			toggleNav,
			importClick,
			model,
			navlink0_tab_binding,
			navlink1_tab_binding,
			navlink2_tab_binding,
			navlink3_tab_binding,
			navlink4_tab_binding,
			navlink5_tab_binding,
			navlink6_tab_binding,
			navlink7_tab_binding,
			navlink8_tab_binding,
			navlink9_tab_binding,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			click_handler_5,
			click_handler_6,
			button_binding,
			blur_handler,
			click_handler_7,
			button_binding_1,
			blur_handler_1,
			click_handler_8
		];
	}

	class Navbar extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$b, create_fragment$b, safe_not_equal, { model: 16, tab: 0 }, null, [-1, -1]);
		}
	}

	var dateUtil = {
	    shortDate: (dte = new Date()) => {
	        let dd = dte.getDate().toString();
	        if(dd.length == 1) dd = `0${dd}`;

	        let mm = (dte.getMonth() + 1).toString();
	        if(mm.length == 1) mm = `0${mm}`;

	        let yyyy = dte.getFullYear();
	        while(yyyy.length < 4) yyyy = `0${yyyy}`;

	        return `${yyyy}-${mm}-${dd}`
	    }
	};

	/* src\components\Note.svelte generated by Svelte v4.2.20 */

	function create_else_block$7(ctx) {
		let div4;
		let div3;
		let div2;
		let div0;
		let t0;
		let button0;
		let t2;
		let button1;
		let t4;
		let div1;
		let textarea;
		let updating_content;
		let current;
		let mounted;
		let dispose;

		function select_block_type_1(ctx, dirty) {
			if (/*editTitle*/ ctx[3]) return create_if_block_1$8;
			return create_else_block_1$2;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		function textarea_content_binding(value) {
			/*textarea_content_binding*/ ctx[15](value);
		}

		let textarea_props = { highlight: /*highlight*/ ctx[2] };

		if (/*note*/ ctx[0].content !== void 0) {
			textarea_props.content = /*note*/ ctx[0].content;
		}

		textarea = new TextArea({ props: textarea_props });
		binding_callbacks.push(() => bind(textarea, 'content', textarea_content_binding));

		return {
			c() {
				div4 = element("div");
				div3 = element("div");
				div2 = element("div");
				div0 = element("div");
				if_block.c();
				t0 = space();
				button0 = element("button");
				button0.textContent = "hide";
				t2 = space();
				button1 = element("button");
				button1.textContent = "delete";
				t4 = space();
				div1 = element("div");
				create_component(textarea.$$.fragment);
				attr(button0, "class", "badge btn btn-light border ml-1 p-2");
				attr(button1, "class", "badge btn btn-light border ml-1 p-2");
				attr(div0, "class", "d-flex");
				attr(div1, "class", "d-flex");
				attr(div2, "class", "card-body");
				attr(div3, "class", "card");
				attr(div4, "class", "col-12");
			},
			m(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div3);
				append(div3, div2);
				append(div2, div0);
				if_block.m(div0, null);
				append(div0, t0);
				append(div0, button0);
				append(div0, t2);
				append(div0, button1);
				append(div2, t4);
				append(div2, div1);
				mount_component(textarea, div1, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler_3*/ ctx[13]),
						listen(button1, "click", /*click_handler_4*/ ctx[14])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div0, t0);
					}
				}

				const textarea_changes = {};
				if (dirty & /*highlight*/ 4) textarea_changes.highlight = /*highlight*/ ctx[2];

				if (!updating_content && dirty & /*note*/ 1) {
					updating_content = true;
					textarea_changes.content = /*note*/ ctx[0].content;
					add_flush_callback(() => updating_content = false);
				}

				textarea.$set(textarea_changes);
			},
			i(local) {
				if (current) return;
				transition_in(textarea.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(textarea.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div4);
				}

				if_block.d();
				destroy_component(textarea);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (20:0) {#if collapse}
	function create_if_block$8(ctx) {
		let div;
		let h4;
		let button0;
		let t0_value = /*note*/ ctx[0].title + "";
		let t0;
		let t1;
		let button1;
		let t2_value = dateUtil.shortDate(/*dateValue*/ ctx[5]) + "";
		let t2;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				h4 = element("h4");
				button0 = element("button");
				t0 = text(t0_value);
				t1 = space();
				button1 = element("button");
				t2 = text(t2_value);
				attr(button0, "class", "badge btn btn-light w-100 text-left");
				set_style(button0, "min-height", "2.2em");
				attr(h4, "class", "flex-grow-1 m-0");
				attr(button1, "class", "badge btn btn-light border ml-1 p-2");
				attr(div, "class", "col-12 d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h4);
				append(h4, button0);
				append(button0, t0);
				append(div, t1);
				append(div, button1);
				append(button1, t2);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler*/ ctx[7]),
						listen(button1, "click", /*click_handler_1*/ ctx[8])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*note*/ 1 && t0_value !== (t0_value = /*note*/ ctx[0].title + "")) set_data(t0, t0_value);
				if (dirty & /*dateValue*/ 32 && t2_value !== (t2_value = dateUtil.shortDate(/*dateValue*/ ctx[5]) + "")) set_data(t2, t2_value);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (32:16) {:else}
	function create_else_block_1$2(ctx) {
		let button;
		let t_value = /*note*/ ctx[0].title + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn btn-light w-100 text-left font-weight-bold");
				set_style(button, "min-height", "2.2em");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_2*/ ctx[12]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*note*/ 1 && t_value !== (t_value = /*note*/ ctx[0].title + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (30:16) {#if editTitle}
	function create_if_block_1$8(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				/*input_1_binding*/ ctx[10](input_1);
				set_input_value(input_1, /*note*/ ctx[0].title);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler*/ ctx[9]),
						listen(input_1, "input", /*input_1_input_handler*/ ctx[11])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*note*/ 1 && input_1.value !== /*note*/ ctx[0].title) {
					set_input_value(input_1, /*note*/ ctx[0].title);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[10](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function create_fragment$a(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$8, create_else_block$7];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*collapse*/ ctx[6]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	function instance$a($$self, $$props, $$invalidate) {
		let collapse;
		let dateValue;
		let { actions } = $$props;
		let { note } = $$props;
		let { highlight } = $$props;
		let editTitle = false;
		let input;

		afterUpdate(() => {
			if (input) input.focus();
		});

		const click_handler = () => $$invalidate(6, collapse = false);
		const click_handler_1 = () => $$invalidate(6, collapse = false);
		const blur_handler = () => $$invalidate(3, editTitle = false);

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(4, input);
			});
		}

		function input_1_input_handler() {
			note.title = this.value;
			$$invalidate(0, note);
		}

		const click_handler_2 = () => $$invalidate(3, editTitle = true);
		const click_handler_3 = () => $$invalidate(6, collapse = true);
		const click_handler_4 = () => actions.delete(note);

		function textarea_content_binding(value) {
			if ($$self.$$.not_equal(note.content, value)) {
				note.content = value;
				$$invalidate(0, note);
			}
		}

		$$self.$$set = $$props => {
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
			if ('note' in $$props) $$invalidate(0, note = $$props.note);
			if ('highlight' in $$props) $$invalidate(2, highlight = $$props.highlight);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*highlight*/ 4) {
				$$invalidate(6, collapse = highlight == '');
			}

			if ($$self.$$.dirty & /*note*/ 1) {
				$$invalidate(5, dateValue = new Date(note.date));
			}
		};

		return [
			note,
			actions,
			highlight,
			editTitle,
			input,
			dateValue,
			collapse,
			click_handler,
			click_handler_1,
			blur_handler,
			input_1_binding,
			input_1_input_handler,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			textarea_content_binding
		];
	}

	class Note extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$a, create_fragment$a, safe_not_equal, { actions: 1, note: 0, highlight: 2 });
		}
	}

	/* src\components\Notes.svelte generated by Svelte v4.2.20 */

	function get_each_context$4(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[14] = list[i];
		return child_ctx;
	}

	// (76:24) {#each filtered as note (note.id)}
	function create_each_block$4(key_1, ctx) {
		let first;
		let note_1;
		let current;

		note_1 = new Note({
				props: {
					note: /*note*/ ctx[14],
					actions: /*actions*/ ctx[3],
					highlight: /*filter*/ ctx[0]
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(note_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(note_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const note_1_changes = {};
				if (dirty & /*filtered*/ 4) note_1_changes.note = /*note*/ ctx[14];
				if (dirty & /*filter*/ 1) note_1_changes.highlight = /*filter*/ ctx[0];
				note_1.$set(note_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(note_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(note_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(note_1, detaching);
			}
		};
	}

	function create_fragment$9(ctx) {
		let div9;
		let div8;
		let div7;
		let div6;
		let div5;
		let div2;
		let button0;
		let t1;
		let div1;
		let button1;
		let t3;
		let div0;
		let button2;
		let t5;
		let button3;
		let t7;
		let button4;
		let t9;
		let button5;
		let div0_style_value;
		let t11;
		let div3;
		let input;
		let t12;
		let div4;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(/*filtered*/ ctx[2]);
		const get_key = ctx => /*note*/ ctx[14].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$4(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
		}

		return {
			c() {
				div9 = element("div");
				div8 = element("div");
				div7 = element("div");
				div6 = element("div");
				div5 = element("div");
				div2 = element("div");
				button0 = element("button");
				button0.textContent = "Add note";
				t1 = space();
				div1 = element("div");
				button1 = element("button");
				button1.textContent = "Sort";
				t3 = space();
				div0 = element("div");
				button2 = element("button");
				button2.textContent = "Newest";
				t5 = space();
				button3 = element("button");
				button3.textContent = "Oldest";
				t7 = space();
				button4 = element("button");
				button4.textContent = "A → Z";
				t9 = space();
				button5 = element("button");
				button5.textContent = "Z → A";
				t11 = space();
				div3 = element("div");
				input = element("input");
				t12 = space();
				div4 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(button0, "class", "btn btn-light border mb-1 mr-1");
				attr(button1, "class", "dropdown-toggle btn btn-light border mb-1");
				attr(button2, "class", "dropdown-item");
				attr(button3, "class", "dropdown-item");
				attr(button4, "class", "dropdown-item");
				attr(button5, "class", "dropdown-item");
				attr(div0, "class", "dropdown-menu");
				attr(div0, "style", div0_style_value = `display: ${/*menu*/ ctx[1] == 'sort' ? 'block' : 'none'}`);
				attr(div1, "class", "dropdown");
				attr(div2, "class", "d-flex");
				attr(input, "class", "form-control");
				attr(input, "placeholder", "filter");
				attr(div3, "class", "d-flex");
				attr(div4, "class", "row mt-2");
				attr(div5, "class", "card-body");
				attr(div6, "class", "card");
				attr(div7, "class", "col");
				attr(div8, "class", "row");
				attr(div9, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div8);
				append(div8, div7);
				append(div7, div6);
				append(div6, div5);
				append(div5, div2);
				append(div2, button0);
				append(div2, t1);
				append(div2, div1);
				append(div1, button1);
				append(div1, t3);
				append(div1, div0);
				append(div0, button2);
				append(div0, t5);
				append(div0, button3);
				append(div0, t7);
				append(div0, button4);
				append(div0, t9);
				append(div0, button5);
				append(div5, t11);
				append(div5, div3);
				append(div3, input);
				set_input_value(input, /*filter*/ ctx[0]);
				append(div5, t12);
				append(div5, div4);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div4, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*add*/ ctx[4]),
						listen(button1, "blur", /*clearMenu*/ ctx[5]),
						listen(button1, "click", /*click_handler*/ ctx[8]),
						listen(button2, "blur", /*clearMenu*/ ctx[5]),
						listen(button2, "click", /*click_handler_1*/ ctx[9]),
						listen(button3, "blur", /*clearMenu*/ ctx[5]),
						listen(button3, "click", /*click_handler_2*/ ctx[10]),
						listen(button4, "blur", /*clearMenu*/ ctx[5]),
						listen(button4, "click", /*click_handler_3*/ ctx[11]),
						listen(button5, "blur", /*clearMenu*/ ctx[5]),
						listen(button5, "click", /*click_handler_4*/ ctx[12]),
						listen(input, "input", /*input_input_handler*/ ctx[13])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (!current || dirty & /*menu*/ 2 && div0_style_value !== (div0_style_value = `display: ${/*menu*/ ctx[1] == 'sort' ? 'block' : 'none'}`)) {
					attr(div0, "style", div0_style_value);
				}

				if (dirty & /*filter*/ 1 && input.value !== /*filter*/ ctx[0]) {
					set_input_value(input, /*filter*/ ctx[0]);
				}

				if (dirty & /*filtered, actions, filter*/ 13) {
					each_value = ensure_array_like(/*filtered*/ ctx[2]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div4, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div9);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$9($$self, $$props, $$invalidate) {
		let filtered;
		let { notes } = $$props;

		const actions = {
			delete: note => {
				if (!confirm(`Delete ${note.title}?`)) return;
				let i = notes.indexOf(note);
				notes.splice(i, 1);
				$$invalidate(7, notes);
			}
		};

		let filter = '';
		let menu = '';

		function add() {
			notes.splice(0, 0, {
				id: crypto.randomUUID(),
				title: 'New note',
				date: new Date().toISOString(),
				content: 'Enter your notes here'
			});

			$$invalidate(7, notes);
		}

		function clearMenu(e) {
			if (e.relatedTarget?.className.includes('dropdown-item')) return;
			$$invalidate(1, menu = '');
		}

		function sort(method) {
			if (method == 'alpha') notes.sort((a, b) => a.title.localeCompare(b.title)); else if (method == 'ralpha') notes.sort((a, b) => b.title.localeCompare(a.title)); else if (method == 'oldest') notes.sort((a, b) => a.date > b.date); else if (method == 'newest') notes.sort((a, b) => a.date < b.date);
			$$invalidate(7, notes);
		}

		const click_handler = () => $$invalidate(1, menu = 'sort');
		const click_handler_1 = () => sort("newest");
		const click_handler_2 = () => sort("oldest");
		const click_handler_3 = () => sort("alpha");
		const click_handler_4 = () => sort("ralpha");

		function input_input_handler() {
			filter = this.value;
			$$invalidate(0, filter);
		}

		$$self.$$set = $$props => {
			if ('notes' in $$props) $$invalidate(7, notes = $$props.notes);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*notes, filter*/ 129) {
				$$invalidate(2, filtered = notes.filter(x => !filter || x.title.toLowerCase().includes(filter.toLowerCase()) || x.content.toLowerCase().includes(filter.toLowerCase())));
			}

			if ($$self.$$.dirty & /*notes*/ 128) {
				{
					notes.forEach(note => {
						if (!note.id) note.id = crypto.randomUUID();
					});
				}
			}
		};

		return [
			filter,
			menu,
			filtered,
			actions,
			add,
			clearMenu,
			sort,
			notes,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			input_input_handler
		];
	}

	class Notes extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$9, create_fragment$9, safe_not_equal, { notes: 7 });
		}
	}

	/* src\components\Skill.svelte generated by Svelte v4.2.20 */

	function create_if_block_6$1(ctx) {
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				button.textContent = "Specialty";
				attr(button, "class", "badge btn btn-light ml-auto");
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (!mounted) {
					dispose = listen(button, "click", /*setSpecial*/ ctx[10]);
					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (50:16) {:else}
	function create_else_block_2$1(ctx) {
		let button0;
		let t0;
		let button0_class_value;
		let t1;
		let button1;
		let t2_value = /*skill*/ ctx[0].bluck + "";
		let t2;
		let mounted;
		let dispose;

		return {
			c() {
				button0 = element("button");
				t0 = text("Delete");
				t1 = space();
				button1 = element("button");
				t2 = text(t2_value);
				attr(button0, "class", button0_class_value = "badge btn btn-light " + /*margin*/ ctx[9]);
				attr(button1, "class", "badge btn badge-dark ml-1");
			},
			m(target, anchor) {
				insert(target, button0, anchor);
				append(button0, t0);
				insert(target, t1, anchor);
				insert(target, button1, anchor);
				append(button1, t2);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler*/ ctx[13]),
						listen(button1, "click", /*toggleBluck*/ ctx[12])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*margin*/ 512 && button0_class_value !== (button0_class_value = "badge btn btn-light " + /*margin*/ ctx[9])) {
					attr(button0, "class", button0_class_value);
				}

				if (dirty & /*skill*/ 1 && t2_value !== (t2_value = /*skill*/ ctx[0].bluck + "")) set_data(t2, t2_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button0);
					detach(t1);
					detach(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (48:16) {#if skill.readonly}
	function create_if_block_5$1(ctx) {
		let span;
		let t_value = /*skill*/ ctx[0].bluck + "";
		let t;
		let span_class_value;

		return {
			c() {
				span = element("span");
				t = text(t_value);
				attr(span, "class", span_class_value = "badge badge-light border border-dark " + /*margin*/ ctx[9]);
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, t);
			},
			p(ctx, dirty) {
				if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].bluck + "")) set_data(t, t_value);

				if (dirty & /*margin*/ 512 && span_class_value !== (span_class_value = "badge badge-light border border-dark " + /*margin*/ ctx[9])) {
					attr(span, "class", span_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (58:16) {:else}
	function create_else_block$6(ctx) {
		let div;
		let button;
		let mounted;
		let dispose;

		function select_block_type_2(ctx, dirty) {
			if (/*skill*/ ctx[0].specialty) return create_if_block_4$1;
			return create_else_block_1$1;
		}

		let current_block_type = select_block_type_2(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				div = element("div");
				button = element("button");
				if_block.c();
				attr(button, "class", nameBtnStyle);
				set_style(button, "min-height", "2.2em");
				attr(div, "class", "flex-grow-1");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, button);
				if_block.m(button, null);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_1*/ ctx[17]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(button, null);
					}
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if_block.d();
				mounted = false;
				dispose();
			}
		};
	}

	// (56:16) {#if editName}
	function create_if_block_3$2(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control mb-1 mr-1");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				/*input_1_binding*/ ctx[15](input_1);
				set_input_value(input_1, /*skill*/ ctx[0].name);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler*/ ctx[14]),
						listen(input_1, "input", /*input_1_input_handler*/ ctx[16])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*skill*/ 1 && input_1.value !== /*skill*/ ctx[0].name) {
					set_input_value(input_1, /*skill*/ ctx[0].name);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[15](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (63:24) {:else}
	function create_else_block_1$1(ctx) {
		let t_value = /*skill*/ ctx[0].name + "";
		let t;

		return {
			c() {
				t = text(t_value);
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (61:24) {#if skill.specialty}
	function create_if_block_4$1(ctx) {
		let u;
		let t_value = /*skill*/ ctx[0].name + "";
		let t;

		return {
			c() {
				u = element("u");
				t = text(t_value);
			},
			m(target, anchor) {
				insert(target, u, anchor);
				append(u, t);
			},
			p(ctx, dirty) {
				if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(u);
				}
			}
		};
	}

	// (71:12) {#if showPass}
	function create_if_block_2$6(ctx) {
		let div;
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding(value) {
			/*bubbles_value_binding*/ ctx[18](value);
		}

		let bubbles_props = {
			count: /*skill*/ ctx[0].rating,
			$$slots: { default: [create_default_slot_2] },
			$$scope: { ctx }
		};

		if (/*skill*/ ctx[0].pass !== void 0) {
			bubbles_props.value = /*skill*/ ctx[0].pass;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

		return {
			c() {
				div = element("div");
				create_component(bubbles.$$.fragment);
				attr(div, "class", "d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(bubbles, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*skill*/ 1) bubbles_changes.count = /*skill*/ ctx[0].rating;

				if (dirty & /*$$scope*/ 2097152) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*skill*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*skill*/ ctx[0].pass;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(bubbles);
			}
		};
	}

	// (73:16) <Bubbles bind:value={skill.pass} count={skill.rating}>
	function create_default_slot_2(ctx) {
		let t;

		return {
			c() {
				t = text("Pass");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (76:12) {#if showFail}
	function create_if_block_1$7(ctx) {
		let div;
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding_1(value) {
			/*bubbles_value_binding_1*/ ctx[19](value);
		}

		let bubbles_props = {
			count: /*skill*/ ctx[0].rating - 1,
			$$slots: { default: [create_default_slot_1] },
			$$scope: { ctx }
		};

		if (/*skill*/ ctx[0].fail !== void 0) {
			bubbles_props.value = /*skill*/ ctx[0].fail;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_1));

		return {
			c() {
				div = element("div");
				create_component(bubbles.$$.fragment);
				attr(div, "class", "d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(bubbles, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*skill*/ 1) bubbles_changes.count = /*skill*/ ctx[0].rating - 1;

				if (dirty & /*$$scope*/ 2097152) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*skill*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*skill*/ ctx[0].fail;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(bubbles);
			}
		};
	}

	// (78:16) <Bubbles bind:value={skill.fail} count={skill.rating - 1}>
	function create_default_slot_1(ctx) {
		let t;

		return {
			c() {
				t = text("Fail");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (81:12) {#if showLuck}
	function create_if_block$7(ctx) {
		let div;
		let bubbles;
		let updating_value;
		let current;

		function bubbles_value_binding_2(value) {
			/*bubbles_value_binding_2*/ ctx[20](value);
		}

		let bubbles_props = {
			count: /*bluckTries*/ ctx[2],
			$$slots: { default: [create_default_slot] },
			$$scope: { ctx }
		};

		if (/*skill*/ ctx[0].pass !== void 0) {
			bubbles_props.value = /*skill*/ ctx[0].pass;
		}

		bubbles = new Bubbles({ props: bubbles_props });
		binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_2));

		return {
			c() {
				div = element("div");
				create_component(bubbles.$$.fragment);
				attr(div, "class", "d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(bubbles, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const bubbles_changes = {};
				if (dirty & /*bluckTries*/ 4) bubbles_changes.count = /*bluckTries*/ ctx[2];

				if (dirty & /*$$scope*/ 2097152) {
					bubbles_changes.$$scope = { dirty, ctx };
				}

				if (!updating_value && dirty & /*skill*/ 1) {
					updating_value = true;
					bubbles_changes.value = /*skill*/ ctx[0].pass;
					add_flush_callback(() => updating_value = false);
				}

				bubbles.$set(bubbles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bubbles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bubbles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(bubbles);
			}
		};
	}

	// (83:16) <Bubbles bind:value={skill.pass} count={bluckTries}>
	function create_default_slot(ctx) {
		let t;

		return {
			c() {
				t = text("BL");
			},
			m(target, anchor) {
				insert(target, t, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$8(ctx) {
		let div4;
		let div3;
		let div2;
		let div0;
		let t0;
		let t1;
		let div1;
		let t2;
		let h4;
		let button;
		let t3_value = /*skill*/ ctx[0].rating + "";
		let t3;
		let t4;
		let t5;
		let t6;
		let current;
		let mounted;
		let dispose;
		let if_block0 = !/*lockspecial*/ ctx[3] && create_if_block_6$1(ctx);

		function select_block_type(ctx, dirty) {
			if (/*skill*/ ctx[0].readonly) return create_if_block_5$1;
			return create_else_block_2$1;
		}

		let current_block_type = select_block_type(ctx);
		let if_block1 = current_block_type(ctx);

		function select_block_type_1(ctx, dirty) {
			if (/*editName*/ ctx[4]) return create_if_block_3$2;
			return create_else_block$6;
		}

		let current_block_type_1 = select_block_type_1(ctx);
		let if_block2 = current_block_type_1(ctx);
		let if_block3 = /*showPass*/ ctx[8] && create_if_block_2$6(ctx);
		let if_block4 = /*showFail*/ ctx[7] && create_if_block_1$7(ctx);
		let if_block5 = /*showLuck*/ ctx[6] && create_if_block$7(ctx);

		return {
			c() {
				div4 = element("div");
				div3 = element("div");
				div2 = element("div");
				div0 = element("div");
				if (if_block0) if_block0.c();
				t0 = space();
				if_block1.c();
				t1 = space();
				div1 = element("div");
				if_block2.c();
				t2 = space();
				h4 = element("h4");
				button = element("button");
				t3 = text(t3_value);
				t4 = space();
				if (if_block3) if_block3.c();
				t5 = space();
				if (if_block4) if_block4.c();
				t6 = space();
				if (if_block5) if_block5.c();
				attr(div0, "class", "d-flex");
				attr(button, "class", "badge btn btn-dark");
				attr(div1, "class", "d-flex");
				attr(div2, "class", "card-body pt-1");
				attr(div3, "class", "card");
				attr(div4, "class", "col-lg-4 col-md-6");
			},
			m(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div3);
				append(div3, div2);
				append(div2, div0);
				if (if_block0) if_block0.m(div0, null);
				append(div0, t0);
				if_block1.m(div0, null);
				append(div2, t1);
				append(div2, div1);
				if_block2.m(div1, null);
				append(div1, t2);
				append(div1, h4);
				append(h4, button);
				append(button, t3);
				append(div2, t4);
				if (if_block3) if_block3.m(div2, null);
				append(div2, t5);
				if (if_block4) if_block4.m(div2, null);
				append(div2, t6);
				if (if_block5) if_block5.m(div2, null);
				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*ratingClick*/ ctx[11]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (!/*lockspecial*/ ctx[3]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_6$1(ctx);
						if_block0.c();
						if_block0.m(div0, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type(ctx);

					if (if_block1) {
						if_block1.c();
						if_block1.m(div0, null);
					}
				}

				if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2.d(1);
					if_block2 = current_block_type_1(ctx);

					if (if_block2) {
						if_block2.c();
						if_block2.m(div1, t2);
					}
				}

				if ((!current || dirty & /*skill*/ 1) && t3_value !== (t3_value = /*skill*/ ctx[0].rating + "")) set_data(t3, t3_value);

				if (/*showPass*/ ctx[8]) {
					if (if_block3) {
						if_block3.p(ctx, dirty);

						if (dirty & /*showPass*/ 256) {
							transition_in(if_block3, 1);
						}
					} else {
						if_block3 = create_if_block_2$6(ctx);
						if_block3.c();
						transition_in(if_block3, 1);
						if_block3.m(div2, t5);
					}
				} else if (if_block3) {
					group_outros();

					transition_out(if_block3, 1, 1, () => {
						if_block3 = null;
					});

					check_outros();
				}

				if (/*showFail*/ ctx[7]) {
					if (if_block4) {
						if_block4.p(ctx, dirty);

						if (dirty & /*showFail*/ 128) {
							transition_in(if_block4, 1);
						}
					} else {
						if_block4 = create_if_block_1$7(ctx);
						if_block4.c();
						transition_in(if_block4, 1);
						if_block4.m(div2, t6);
					}
				} else if (if_block4) {
					group_outros();

					transition_out(if_block4, 1, 1, () => {
						if_block4 = null;
					});

					check_outros();
				}

				if (/*showLuck*/ ctx[6]) {
					if (if_block5) {
						if_block5.p(ctx, dirty);

						if (dirty & /*showLuck*/ 64) {
							transition_in(if_block5, 1);
						}
					} else {
						if_block5 = create_if_block$7(ctx);
						if_block5.c();
						transition_in(if_block5, 1);
						if_block5.m(div2, null);
					}
				} else if (if_block5) {
					group_outros();

					transition_out(if_block5, 1, 1, () => {
						if_block5 = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block3);
				transition_in(if_block4);
				transition_in(if_block5);
				current = true;
			},
			o(local) {
				transition_out(if_block3);
				transition_out(if_block4);
				transition_out(if_block5);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div4);
				}

				if (if_block0) if_block0.d();
				if_block1.d();
				if_block2.d();
				if (if_block3) if_block3.d();
				if (if_block4) if_block4.d();
				if (if_block5) if_block5.d();
				mounted = false;
				dispose();
			}
		};
	}

	const nameBtnStyle = 'btn btn-light w-100 text-left font-weight-bold pl-2';

	function instance$8($$self, $$props, $$invalidate) {
		let margin;
		let showPass;
		let showFail;
		let showLuck;
		let { actions } = $$props;
		let { skill } = $$props;
		let { bluckTries } = $$props;
		let { lockspecial } = $$props;
		let editName = false;
		let input;

		function setSpecial() {
			if (!lockspecial) {
				actions.setSpecial(skill);
			}
		}

		function ratingClick(e) {
			$$invalidate(0, skill.rating += e.shiftKey ? -1 : 1, skill);
			if (skill.rating < 0) $$invalidate(0, skill.rating = skill.cap, skill); else if (skill.rating > skill.cap) $$invalidate(0, skill.rating = 0, skill);
		}

		function toggleBluck() {
			$$invalidate(0, skill.bluck = skill.bluck == 'Health' ? 'Will' : 'Health', skill);
		}

		afterUpdate(() => {
			if (input) input.focus();
		});

		const click_handler = () => actions.delete(skill);
		const blur_handler = () => $$invalidate(4, editName = false);

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(5, input);
			});
		}

		function input_1_input_handler() {
			skill.name = this.value;
			$$invalidate(0, skill);
		}

		const click_handler_1 = () => $$invalidate(4, editName = !skill.readonly);

		function bubbles_value_binding(value) {
			if ($$self.$$.not_equal(skill.pass, value)) {
				skill.pass = value;
				$$invalidate(0, skill);
			}
		}

		function bubbles_value_binding_1(value) {
			if ($$self.$$.not_equal(skill.fail, value)) {
				skill.fail = value;
				$$invalidate(0, skill);
			}
		}

		function bubbles_value_binding_2(value) {
			if ($$self.$$.not_equal(skill.pass, value)) {
				skill.pass = value;
				$$invalidate(0, skill);
			}
		}

		$$self.$$set = $$props => {
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
			if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
			if ('bluckTries' in $$props) $$invalidate(2, bluckTries = $$props.bluckTries);
			if ('lockspecial' in $$props) $$invalidate(3, lockspecial = $$props.lockspecial);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*lockspecial*/ 8) {
				$$invalidate(9, margin = lockspecial ? "ml-auto" : "ml-1");
			}

			if ($$self.$$.dirty & /*skill*/ 1) {
				$$invalidate(8, showPass = skill.rating >= 1 && skill.rating < skill.cap);
			}

			if ($$self.$$.dirty & /*skill*/ 1) {
				$$invalidate(7, showFail = skill.rating >= 2 && skill.rating < skill.cap);
			}

			if ($$self.$$.dirty & /*skill*/ 1) {
				$$invalidate(6, showLuck = skill.rating == 0);
			}
		};

		return [
			skill,
			actions,
			bluckTries,
			lockspecial,
			editName,
			input,
			showLuck,
			showFail,
			showPass,
			margin,
			setSpecial,
			ratingClick,
			toggleBluck,
			click_handler,
			blur_handler,
			input_1_binding,
			input_1_input_handler,
			click_handler_1,
			bubbles_value_binding,
			bubbles_value_binding_1,
			bubbles_value_binding_2
		];
	}

	class Skill extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$8, create_fragment$8, safe_not_equal, {
				actions: 1,
				skill: 0,
				bluckTries: 2,
				lockspecial: 3
			});
		}
	}

	/* src\components\Skills.svelte generated by Svelte v4.2.20 */

	function get_each_context$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[13] = list[i];
		return child_ctx;
	}

	// (74:24) {#each filtered as skill (skill.id)}
	function create_each_block$3(key_1, ctx) {
		let first;
		let skill_1;
		let current;

		skill_1 = new Skill({
				props: {
					actions: /*actions*/ ctx[4],
					skill: /*skill*/ ctx[13],
					bluckTries: /*bluckTries*/ ctx[1],
					lockspecial: /*skills*/ ctx[0].lockspecial
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(skill_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(skill_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const skill_1_changes = {};
				if (dirty & /*filtered*/ 8) skill_1_changes.skill = /*skill*/ ctx[13];
				if (dirty & /*bluckTries*/ 2) skill_1_changes.bluckTries = /*bluckTries*/ ctx[1];
				if (dirty & /*skills*/ 1) skill_1_changes.lockspecial = /*skills*/ ctx[0].lockspecial;
				skill_1.$set(skill_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(skill_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(skill_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(skill_1, detaching);
			}
		};
	}

	function create_fragment$7(ctx) {
		let div8;
		let div7;
		let div6;
		let div5;
		let div4;
		let div2;
		let button0;
		let t1;
		let div1;
		let button1;
		let t3;
		let div0;
		let button2;
		let t4;
		let button2_class_value;
		let t5;
		let button3;
		let t6;
		let button3_class_value;
		let t7;
		let button4;
		let t8;
		let button4_class_value;
		let t9;
		let button5;
		let t10;
		let button5_class_value;
		let t11;
		let div3;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(/*filtered*/ ctx[3]);
		const get_key = ctx => /*skill*/ ctx[13].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$3(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
		}

		return {
			c() {
				div8 = element("div");
				div7 = element("div");
				div6 = element("div");
				div5 = element("div");
				div4 = element("div");
				div2 = element("div");
				button0 = element("button");
				button0.textContent = "Add skill";
				t1 = space();
				div1 = element("div");
				button1 = element("button");
				button1.textContent = "Show skills";
				t3 = space();
				div0 = element("div");
				button2 = element("button");
				t4 = text("All");
				t5 = space();
				button3 = element("button");
				t6 = text("Known and learning");
				t7 = space();
				button4 = element("button");
				t8 = text("Known");
				t9 = space();
				button5 = element("button");
				t10 = text("Lock specialty");
				t11 = space();
				div3 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(button0, "class", "btn btn-light border mb-1 mr-1");
				attr(button1, "class", "dropdown-toggle btn btn-light border mb-1 mr-1");
				attr(button2, "class", button2_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'all' ? selectedStyle$1 : ''));
				attr(button3, "class", button3_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'bluck' ? selectedStyle$1 : ''));
				attr(button4, "class", button4_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'zero' ? selectedStyle$1 : ''));
				attr(div0, "class", "dropdown-menu");
				set_style(div0, "display", /*menu*/ ctx[2] == 'filter' ? 'block' : 'none');
				attr(div1, "class", "dropdown");
				attr(button5, "class", button5_class_value = "btn border mb-1 " + (/*skills*/ ctx[0].lockspecial ? 'btn-dark' : 'btn-light'));
				attr(div2, "class", "d-flex");
				attr(div3, "class", "row mt-2");
				attr(div4, "class", "card-body");
				attr(div5, "class", "card");
				attr(div6, "class", "col");
				attr(div7, "class", "row");
				attr(div8, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div8, anchor);
				append(div8, div7);
				append(div7, div6);
				append(div6, div5);
				append(div5, div4);
				append(div4, div2);
				append(div2, button0);
				append(div2, t1);
				append(div2, div1);
				append(div1, button1);
				append(div1, t3);
				append(div1, div0);
				append(div0, button2);
				append(button2, t4);
				append(div0, t5);
				append(div0, button3);
				append(button3, t6);
				append(div0, t7);
				append(div0, button4);
				append(button4, t8);
				append(div2, t9);
				append(div2, button5);
				append(button5, t10);
				append(div4, t11);
				append(div4, div3);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div3, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*add*/ ctx[5]),
						listen(button1, "blur", /*clearMenu*/ ctx[6]),
						listen(button1, "click", /*click_handler*/ ctx[8]),
						listen(button2, "blur", /*clearMenu*/ ctx[6]),
						listen(button2, "click", /*click_handler_1*/ ctx[9]),
						listen(button3, "blur", /*clearMenu*/ ctx[6]),
						listen(button3, "click", /*click_handler_2*/ ctx[10]),
						listen(button4, "blur", /*clearMenu*/ ctx[6]),
						listen(button4, "click", /*click_handler_3*/ ctx[11]),
						listen(button5, "click", /*click_handler_4*/ ctx[12])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (!current || dirty & /*skills*/ 1 && button2_class_value !== (button2_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'all' ? selectedStyle$1 : ''))) {
					attr(button2, "class", button2_class_value);
				}

				if (!current || dirty & /*skills*/ 1 && button3_class_value !== (button3_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'bluck' ? selectedStyle$1 : ''))) {
					attr(button3, "class", button3_class_value);
				}

				if (!current || dirty & /*skills*/ 1 && button4_class_value !== (button4_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'zero' ? selectedStyle$1 : ''))) {
					attr(button4, "class", button4_class_value);
				}

				if (dirty & /*menu*/ 4) {
					set_style(div0, "display", /*menu*/ ctx[2] == 'filter' ? 'block' : 'none');
				}

				if (!current || dirty & /*skills*/ 1 && button5_class_value !== (button5_class_value = "btn border mb-1 " + (/*skills*/ ctx[0].lockspecial ? 'btn-dark' : 'btn-light'))) {
					attr(button5, "class", button5_class_value);
				}

				if (dirty & /*actions, filtered, bluckTries, skills*/ 27) {
					each_value = ensure_array_like(/*filtered*/ ctx[3]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div3, outro_and_destroy_block, create_each_block$3, null, get_each_context$3);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div8);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	const selectedStyle$1 = 'bg-dark text-light';

	function instance$7($$self, $$props, $$invalidate) {
		let filtered;
		let { skills } = $$props;
		let { bluckTries } = $$props;

		const actions = {
			delete: skill => {
				if (!confirm(`Delete ${skill.name}?`)) return;
				let i = skills.skills.indexOf(skill);
				skills.skills.splice(i, 1);
				$$invalidate(0, skills);
			},
			setSpecial: skill => {
				skills.skills.forEach(skill => skill.specialty = false);
				skill.specialty = true;
				$$invalidate(0, skills);
			}
		};

		let menu;

		function add() {
			skills.skills.push(skill({ name: 'New Skill', readonly: false }));
			$$invalidate(0, skills);
		}

		function clearMenu(e) {
			if (e.relatedTarget?.className.includes('dropdown-item')) return;
			$$invalidate(2, menu = '');
		}

		function toggleLock() {
			$$invalidate(0, skills.lockspecial = !skills.lockspecial, skills);
			$$invalidate(0, skills);
		}

		const click_handler = () => $$invalidate(2, menu = 'filter');
		const click_handler_1 = () => $$invalidate(0, skills.show = 'all', skills);
		const click_handler_2 = () => $$invalidate(0, skills.show = 'bluck', skills);
		const click_handler_3 = () => $$invalidate(0, skills.show = 'zero', skills);
		const click_handler_4 = () => toggleLock();

		$$self.$$set = $$props => {
			if ('skills' in $$props) $$invalidate(0, skills = $$props.skills);
			if ('bluckTries' in $$props) $$invalidate(1, bluckTries = $$props.bluckTries);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*skills*/ 1) {
				$$invalidate(3, filtered = skills.skills.filter(skill => skills.show == 'all' || skills.show == 'bluck' && (skill.rating > 0 || skill.pass > 0) || skills.show == 'zero' && skill.rating > 0));
			}

			if ($$self.$$.dirty & /*skills*/ 1) {
				{
					skills.skills.forEach(skill => {
						if (!skill.id) skill.id = crypto.randomUUID();
					});
				}
			}
		};

		return [
			skills,
			bluckTries,
			menu,
			filtered,
			actions,
			add,
			clearMenu,
			toggleLock,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4
		];
	}

	class Skills extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$7, create_fragment$7, safe_not_equal, { skills: 0, bluckTries: 1 });
		}
	}

	/* src\components\Spell.svelte generated by Svelte v4.2.20 */

	function create_else_block$5(ctx) {
		let h4;
		let button;
		let t_value = /*spell*/ ctx[0].name + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				h4 = element("h4");
				button = element("button");
				t = text(t_value);
				attr(button, "class", "badge btn btn-light w-100 text-left");
				attr(h4, "class", "flex-grow-1");
			},
			m(target, anchor) {
				insert(target, h4, anchor);
				append(h4, button);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[15]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*spell*/ 1 && t_value !== (t_value = /*spell*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(h4);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (50:16) {#if editName}
	function create_if_block_2$5(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "flex-grow-1 form-control");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				/*input_1_binding*/ ctx[13](input_1);
				set_input_value(input_1, /*spell*/ ctx[0].name);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler*/ ctx[12]),
						listen(input_1, "input", /*input_1_input_handler*/ ctx[14])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*spell*/ 1 && input_1.value !== /*spell*/ ctx[0].name) {
					set_input_value(input_1, /*spell*/ ctx[0].name);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[13](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (67:46) 
	function create_if_block_1$6(ctx) {
		let button;
		let t;
		let button_class_value;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text("Relic");
				attr(button, "class", button_class_value = "btn " + /*inventoryClass*/ ctx[7] + " ml-auto mr-1");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_3*/ ctx[18]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*inventoryClass*/ 128 && button_class_value !== (button_class_value = "btn " + /*inventoryClass*/ ctx[7] + " ml-auto mr-1")) {
					attr(button, "class", button_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (61:16) {#if caster == 'magician'}
	function create_if_block$6(ctx) {
		let div;
		let button0;
		let t0;
		let button0_class_value;
		let t1;
		let button1;
		let t2;
		let button1_class_value;
		let t3;
		let button2;
		let t4;
		let button2_class_value;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				button0 = element("button");
				t0 = text("Spellbook");
				t1 = space();
				button1 = element("button");
				t2 = text("Scroll");
				t3 = space();
				button2 = element("button");
				t4 = text("Memorized");
				attr(button0, "class", button0_class_value = "btn " + /*inventoryClass*/ ctx[7] + " mr-1");
				attr(button1, "class", button1_class_value = "btn " + /*scrollClass*/ ctx[6] + " mr-1");
				attr(button2, "class", button2_class_value = "btn " + /*memoryClass*/ ctx[5] + " mr-1");
				attr(div, "class", "d-flex ml-auto");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, button0);
				append(button0, t0);
				append(div, t1);
				append(div, button1);
				append(button1, t2);
				append(div, t3);
				append(div, button2);
				append(button2, t4);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*setInventory*/ ctx[10]),
						listen(button1, "click", /*click_handler_2*/ ctx[17]),
						listen(button2, "click", /*setMemory*/ ctx[11])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*inventoryClass*/ 128 && button0_class_value !== (button0_class_value = "btn " + /*inventoryClass*/ ctx[7] + " mr-1")) {
					attr(button0, "class", button0_class_value);
				}

				if (dirty & /*scrollClass*/ 64 && button1_class_value !== (button1_class_value = "btn " + /*scrollClass*/ ctx[6] + " mr-1")) {
					attr(button1, "class", button1_class_value);
				}

				if (dirty & /*memoryClass*/ 32 && button2_class_value !== (button2_class_value = "btn " + /*memoryClass*/ ctx[5] + " mr-1")) {
					attr(button2, "class", button2_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	function create_fragment$6(ctx) {
		let div6;
		let div5;
		let div4;
		let div0;
		let t0;
		let button0;
		let t2;
		let div1;
		let h5;
		let button1;
		let t3_value = /*circles*/ ctx[8][/*spell*/ ctx[0].circle - 1] + "";
		let t3;
		let t4;
		let t5;
		let div2;
		let t6;
		let div3;
		let textarea;
		let updating_content;
		let current;
		let mounted;
		let dispose;

		function select_block_type(ctx, dirty) {
			if (/*editName*/ ctx[4]) return create_if_block_2$5;
			return create_else_block$5;
		}

		let current_block_type = select_block_type(ctx);
		let if_block0 = current_block_type(ctx);

		function select_block_type_1(ctx, dirty) {
			if (/*caster*/ ctx[2] == 'magician') return create_if_block$6;
			if (/*caster*/ ctx[2] == 'theurge') return create_if_block_1$6;
		}

		let current_block_type_1 = select_block_type_1(ctx);
		let if_block1 = current_block_type_1 && current_block_type_1(ctx);

		function textarea_content_binding(value) {
			/*textarea_content_binding*/ ctx[19](value);
		}

		let textarea_props = {};

		if (/*spell*/ ctx[0].description !== void 0) {
			textarea_props.content = /*spell*/ ctx[0].description;
		}

		textarea = new TextArea({ props: textarea_props });
		binding_callbacks.push(() => bind(textarea, 'content', textarea_content_binding));

		return {
			c() {
				div6 = element("div");
				div5 = element("div");
				div4 = element("div");
				div0 = element("div");
				if_block0.c();
				t0 = space();
				button0 = element("button");
				button0.textContent = "Delete";
				t2 = space();
				div1 = element("div");
				h5 = element("h5");
				button1 = element("button");
				t3 = text(t3_value);
				t4 = space();
				if (if_block1) if_block1.c();
				t5 = space();
				div2 = element("div");
				div2.innerHTML = ``;
				t6 = space();
				div3 = element("div");
				create_component(textarea.$$.fragment);
				attr(button0, "class", "badge btn btn-light");
				attr(div0, "class", "d-flex");
				attr(button1, "class", "badge btn btn-dark w-100 text-left");
				attr(div1, "class", "d-flex mt-1 flex-wrap");
				attr(div2, "class", "d-flex mt-1");
				attr(div3, "class", "d-flex mt-1");
				attr(div4, "class", "card-body");
				attr(div5, "class", "card");
				attr(div6, "class", "col-md-6");
			},
			m(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div5);
				append(div5, div4);
				append(div4, div0);
				if_block0.m(div0, null);
				append(div0, t0);
				append(div0, button0);
				append(div4, t2);
				append(div4, div1);
				append(div1, h5);
				append(h5, button1);
				append(button1, t3);
				append(div1, t4);
				if (if_block1) if_block1.m(div1, null);
				append(div4, t5);
				append(div4, div2);
				append(div4, t6);
				append(div4, div3);
				mount_component(textarea, div3, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler_1*/ ctx[16]),
						listen(button1, "click", /*circleClick*/ ctx[9])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(ctx);

					if (if_block0) {
						if_block0.c();
						if_block0.m(div0, t0);
					}
				}

				if ((!current || dirty & /*spell*/ 1) && t3_value !== (t3_value = /*circles*/ ctx[8][/*spell*/ ctx[0].circle - 1] + "")) set_data(t3, t3_value);

				if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if (if_block1) if_block1.d(1);
					if_block1 = current_block_type_1 && current_block_type_1(ctx);

					if (if_block1) {
						if_block1.c();
						if_block1.m(div1, null);
					}
				}

				const textarea_changes = {};

				if (!updating_content && dirty & /*spell*/ 1) {
					updating_content = true;
					textarea_changes.content = /*spell*/ ctx[0].description;
					add_flush_callback(() => updating_content = false);
				}

				textarea.$set(textarea_changes);
			},
			i(local) {
				if (current) return;
				transition_in(textarea.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(textarea.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div6);
				}

				if_block0.d();

				if (if_block1) {
					if_block1.d();
				}

				destroy_component(textarea);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		let inventoryClass;
		let scrollClass;
		let memoryClass;
		let { actions } = $$props;
		let { spell } = $$props;
		let { caster } = $$props;
		const circles = ['1st Circle', '2nd Circle', '3rd Circle', '4th Circle', '5th Circle'];
		let input;
		let editName = false;

		function circleClick(e) {
			$$invalidate(0, spell.circle += e.shiftKey ? -1 : 1, spell);
			if (spell.circle > 5) $$invalidate(0, spell.circle = 1, spell); else if (spell.circle < 1) $$invalidate(0, spell.circle = 5, spell);
			actions.refresh();
		}

		function setInventory() {
			$$invalidate(0, spell.inventory = !spell.inventory, spell);
			actions.refresh();
		}

		function setMemory() {
			$$invalidate(0, spell.memorized = !spell.memorized, spell);
			actions.refresh();
		}

		afterUpdate(() => {
			if (input) input.focus();
		});

		const blur_handler = () => $$invalidate(4, editName = false);

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(3, input);
			});
		}

		function input_1_input_handler() {
			spell.name = this.value;
			$$invalidate(0, spell);
		}

		const click_handler = () => $$invalidate(4, editName = true);
		const click_handler_1 = () => actions.delete(spell);
		const click_handler_2 = () => $$invalidate(0, spell.scroll = !spell.scroll, spell);
		const click_handler_3 = () => $$invalidate(0, spell.inventory = !spell.inventory, spell);

		function textarea_content_binding(value) {
			if ($$self.$$.not_equal(spell.description, value)) {
				spell.description = value;
				$$invalidate(0, spell);
			}
		}

		$$self.$$set = $$props => {
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
			if ('spell' in $$props) $$invalidate(0, spell = $$props.spell);
			if ('caster' in $$props) $$invalidate(2, caster = $$props.caster);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*spell*/ 1) {
				$$invalidate(7, inventoryClass = spell.inventory ? 'btn-dark' : 'btn-light border');
			}

			if ($$self.$$.dirty & /*spell*/ 1) {
				$$invalidate(6, scrollClass = spell.scroll ? 'btn-dark' : 'btn-light border');
			}

			if ($$self.$$.dirty & /*spell*/ 1) {
				$$invalidate(5, memoryClass = spell.memorized ? 'btn-dark' : 'btn-light border');
			}
		};

		return [
			spell,
			actions,
			caster,
			input,
			editName,
			memoryClass,
			scrollClass,
			inventoryClass,
			circles,
			circleClick,
			setInventory,
			setMemory,
			blur_handler,
			input_1_binding,
			input_1_input_handler,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			textarea_content_binding
		];
	}

	class Spell extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$6, create_fragment$6, safe_not_equal, { actions: 1, spell: 0, caster: 2 });
		}
	}

	/* src\components\Spells.svelte generated by Svelte v4.2.20 */

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[17] = list[i];
		return child_ctx;
	}

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[20] = list[i];
		return child_ctx;
	}

	// (114:24) {#if spells.urdr == 0}
	function create_if_block_3$1(ctx) {
		let div;
		let h3;
		let t1;
		let span1;
		let t2;
		let t3;
		let span2;
		let t5;
		let button;
		let t6_value = /*spells*/ ctx[0].memory + "";
		let t6;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				h3 = element("h3");
				h3.innerHTML = `<span class="align-self-center font-weight-bold mr-1">Memory palace</span>`;
				t1 = space();
				span1 = element("span");
				t2 = text(/*space*/ ctx[1]);
				t3 = space();
				span2 = element("span");
				span2.textContent = "/";
				t5 = space();
				button = element("button");
				t6 = text(t6_value);
				attr(span1, "class", "align-self-center btn badge-light border ml-auto");
				toggle_class(span1, "bg-danger", /*space*/ ctx[1] < 0);
				attr(span2, "class", "align-self-center mx-1");
				attr(button, "class", "align-self-center btn btn-dark");
				attr(div, "class", "d-flex col-md-6");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h3);
				append(div, t1);
				append(div, span1);
				append(span1, t2);
				append(div, t3);
				append(div, span2);
				append(div, t5);
				append(div, button);
				append(button, t6);

				if (!mounted) {
					dispose = listen(button, "click", /*memoryClick*/ ctx[12]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*space*/ 2) set_data(t2, /*space*/ ctx[1]);

				if (dirty & /*space*/ 2) {
					toggle_class(span1, "bg-danger", /*space*/ ctx[1] < 0);
				}

				if (dirty & /*spells*/ 1 && t6_value !== (t6_value = /*spells*/ ctx[0].memory + "")) set_data(t6, t6_value);
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (122:24) {#if spells.urdr > 0}
	function create_if_block_2$4(ctx) {
		let div;
		let h3;
		let t1;
		let button0;
		let t3;
		let button1;
		let t4_value = /*spells*/ ctx[0].burden + "";
		let t4;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				h3 = element("h3");
				h3.innerHTML = `<span class="align-self-center font-weight-bold">Burden</span>`;
				t1 = space();
				button0 = element("button");
				button0.textContent = "↓";
				t3 = space();
				button1 = element("button");
				t4 = text(t4_value);
				set_style(h3, "width", "5em");
				attr(button0, "class", "align-self-center btn btn-light border border-dark ml-auto");
				attr(button1, "class", "align-self-center btn btn-dark");
				toggle_class(button1, "bg-danger", /*spells*/ ctx[0].burden > /*spells*/ ctx[0].urdr);
				attr(div, "class", "d-flex col-md-6");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h3);
				append(div, t1);
				append(div, button0);
				append(div, t3);
				append(div, button1);
				append(button1, t4);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*burdenDownClick*/ ctx[10]),
						listen(button1, "click", /*burdenClick*/ ctx[9])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*spells*/ 1 && t4_value !== (t4_value = /*spells*/ ctx[0].burden + "")) set_data(t4, t4_value);

				if (dirty & /*spells*/ 1) {
					toggle_class(button1, "bg-danger", /*spells*/ ctx[0].burden > /*spells*/ ctx[0].urdr);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (129:24) {#if spells.memory == 0}
	function create_if_block_1$5(ctx) {
		let div;
		let h3;
		let t1;
		let button;
		let t2_value = /*spells*/ ctx[0].urdr + "";
		let t2;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				h3 = element("h3");
				h3.innerHTML = `<span class="align-self-center font-weight-bold">Urdr</span>`;
				t1 = space();
				button = element("button");
				t2 = text(t2_value);
				attr(button, "class", "align-self-center btn btn-dark ml-auto");
				attr(div, "class", "d-flex col-md-6");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h3);
				append(div, t1);
				append(div, button);
				append(button, t2);

				if (!mounted) {
					dispose = listen(button, "click", /*urdrClick*/ ctx[13]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*spells*/ 1 && t2_value !== (t2_value = /*spells*/ ctx[0].urdr + "")) set_data(t2, t2_value);
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (135:24) {#if spells.memory > 0}
	function create_if_block$5(ctx) {
		let div;
		let h3;
		let t1;
		let span1;
		let t2;

		return {
			c() {
				div = element("div");
				h3 = element("h3");
				h3.innerHTML = `<span class="align-self-center font-weight-bold">In Spellbook</span>`;
				t1 = space();
				span1 = element("span");
				t2 = text(/*inventory*/ ctx[6]);
				attr(span1, "class", "align-self-center btn badge-light border ml-auto");
				attr(div, "class", "d-flex col-md-6");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h3);
				append(div, t1);
				append(div, span1);
				append(span1, t2);
			},
			p(ctx, dirty) {
				if (dirty & /*inventory*/ 64) set_data(t2, /*inventory*/ ctx[6]);
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	// (146:32) {#each filters() as f}
	function create_each_block_1$1(ctx) {
		let button;
		let t0_value = /*f*/ ctx[20].text + "";
		let t0;
		let t1;
		let button_class_value;
		let mounted;
		let dispose;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[15](/*f*/ ctx[20]);
		}

		return {
			c() {
				button = element("button");
				t0 = text(t0_value);
				t1 = space();

				attr(button, "class", button_class_value = "dropdown-item " + (/*spells*/ ctx[0].show == /*f*/ ctx[20].val
				? selectedStyle
				: ''));
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t0);
				append(button, t1);

				if (!mounted) {
					dispose = [
						listen(button, "blur", /*clearMenu*/ ctx[11]),
						listen(button, "click", click_handler_1)
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*filters*/ 16 && t0_value !== (t0_value = /*f*/ ctx[20].text + "")) set_data(t0, t0_value);

				if (dirty & /*spells, filters*/ 17 && button_class_value !== (button_class_value = "dropdown-item " + (/*spells*/ ctx[0].show == /*f*/ ctx[20].val
				? selectedStyle
				: ''))) {
					attr(button, "class", button_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (159:24) {#each filtered as spell (spell.id)}
	function create_each_block$2(key_1, ctx) {
		let first;
		let spell_1;
		let current;

		spell_1 = new Spell({
				props: {
					spell: /*spell*/ ctx[17],
					caster: /*caster*/ ctx[5],
					actions: /*spellActions*/ ctx[7]
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(spell_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(spell_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const spell_1_changes = {};
				if (dirty & /*filtered*/ 8) spell_1_changes.spell = /*spell*/ ctx[17];
				if (dirty & /*caster*/ 32) spell_1_changes.caster = /*caster*/ ctx[5];
				spell_1.$set(spell_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(spell_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(spell_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(spell_1, detaching);
			}
		};
	}

	function create_fragment$5(ctx) {
		let div9;
		let div8;
		let div7;
		let div6;
		let div5;
		let div0;
		let t0;
		let t1;
		let t2;
		let t3;
		let div3;
		let div2;
		let button0;
		let t5;
		let div1;
		let t6;
		let button1;
		let t8;
		let div4;
		let each_blocks = [];
		let each1_lookup = new Map();
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*spells*/ ctx[0].urdr == 0 && create_if_block_3$1(ctx);
		let if_block1 = /*spells*/ ctx[0].urdr > 0 && create_if_block_2$4(ctx);
		let if_block2 = /*spells*/ ctx[0].memory == 0 && create_if_block_1$5(ctx);
		let if_block3 = /*spells*/ ctx[0].memory > 0 && create_if_block$5(ctx);
		let each_value_1 = ensure_array_like(/*filters*/ ctx[4]());
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
		}

		let each_value = ensure_array_like(/*filtered*/ ctx[3]);
		const get_key = ctx => /*spell*/ ctx[17].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$2(ctx, each_value, i);
			let key = get_key(child_ctx);
			each1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
		}

		return {
			c() {
				div9 = element("div");
				div8 = element("div");
				div7 = element("div");
				div6 = element("div");
				div5 = element("div");
				div0 = element("div");
				if (if_block0) if_block0.c();
				t0 = space();
				if (if_block1) if_block1.c();
				t1 = space();
				if (if_block2) if_block2.c();
				t2 = space();
				if (if_block3) if_block3.c();
				t3 = space();
				div3 = element("div");
				div2 = element("div");
				button0 = element("button");
				button0.textContent = "Show";
				t5 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t6 = space();
				button1 = element("button");
				button1.textContent = "Add spell";
				t8 = space();
				div4 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div0, "class", "row");
				attr(button0, "class", "dropdown-toggle btn btn-light border mb-1 mr-1");
				attr(div1, "class", "dropdown-menu");
				set_style(div1, "display", /*menu*/ ctx[2] == 'filters' ? 'block' : 'none');
				attr(div2, "class", "dropdown");
				attr(button1, "class", "btn btn-light border mb-1 mr-1");
				attr(div3, "class", "d-flex mt-2");
				attr(div4, "class", "row mt-2");
				attr(div5, "class", "card-body");
				attr(div6, "class", "card");
				attr(div7, "class", "col-12");
				attr(div8, "class", "row");
				attr(div9, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div8);
				append(div8, div7);
				append(div7, div6);
				append(div6, div5);
				append(div5, div0);
				if (if_block0) if_block0.m(div0, null);
				append(div0, t0);
				if (if_block1) if_block1.m(div0, null);
				append(div0, t1);
				if (if_block2) if_block2.m(div0, null);
				append(div0, t2);
				if (if_block3) if_block3.m(div0, null);
				append(div5, t3);
				append(div5, div3);
				append(div3, div2);
				append(div2, button0);
				append(div2, t5);
				append(div2, div1);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div1, null);
					}
				}

				append(div3, t6);
				append(div3, button1);
				append(div5, t8);
				append(div5, div4);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div4, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "blur", /*clearMenu*/ ctx[11]),
						listen(button0, "click", /*click_handler*/ ctx[14]),
						listen(button1, "click", /*add*/ ctx[8])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (/*spells*/ ctx[0].urdr == 0) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_3$1(ctx);
						if_block0.c();
						if_block0.m(div0, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (/*spells*/ ctx[0].urdr > 0) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_2$4(ctx);
						if_block1.c();
						if_block1.m(div0, t1);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (/*spells*/ ctx[0].memory == 0) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block_1$5(ctx);
						if_block2.c();
						if_block2.m(div0, t2);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (/*spells*/ ctx[0].memory > 0) {
					if (if_block3) {
						if_block3.p(ctx, dirty);
					} else {
						if_block3 = create_if_block$5(ctx);
						if_block3.c();
						if_block3.m(div0, null);
					}
				} else if (if_block3) {
					if_block3.d(1);
					if_block3 = null;
				}

				if (dirty & /*spells, filters, selectedStyle, clearMenu*/ 2065) {
					each_value_1 = ensure_array_like(/*filters*/ ctx[4]());
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_1$1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(div1, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_1.length;
				}

				if (dirty & /*menu*/ 4) {
					set_style(div1, "display", /*menu*/ ctx[2] == 'filters' ? 'block' : 'none');
				}

				if (dirty & /*filtered, caster, spellActions*/ 168) {
					each_value = ensure_array_like(/*filtered*/ ctx[3]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each1_lookup, div4, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div9);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				if (if_block3) if_block3.d();
				destroy_each(each_blocks_1, detaching);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	const selectedStyle = 'bg-dark text-light';
	const maxMemory = 9;
	const maxUrdr = 9;

	function instance$5($$self, $$props, $$invalidate) {
		let inventory;
		let space;
		let caster;
		let filters;
		let filtered;
		let { spells } = $$props;

		const spellActions = {
			delete: spell => {
				if (!confirm(`Delete ${spell.name}?`)) return;
				let i = spells.spells.indexOf(spell);
				spells.spells.splice(i, 1);
				refresh();
			},
			refresh
		};

		let menu = '';

		function add() {
			spells.spells.push({
				id: crypto.randomUUID(),
				name: '~new spell',
				circle: 1,
				memorized: false,
				inventory: false,
				scroll: false,
				description: 'Enter a description'
			});

			refresh();
		}

		function burdenClick(e) {
			$$invalidate(0, spells.burden += e.shiftKey ? -1 : 1, spells);
			if (spells.burden < 0) $$invalidate(0, spells.burden = 0, spells);
		}

		function burdenDownClick() {
			if (spells.burden > 0) $$invalidate(0, spells.burden--, spells);
		}

		function clearMenu(e) {
			if (e.relatedTarget?.className.includes('dropdown-item')) return;
			$$invalidate(2, menu = '');
		}

		function memoryClick(e) {
			$$invalidate(0, spells.memory += e.shiftKey ? -1 : 1, spells);
			if (spells.memory < 0) $$invalidate(0, spells.memory = maxMemory, spells); else if (spells.memory > maxMemory) $$invalidate(0, spells.memory = 0, spells);
		}

		function refresh() {
			$$invalidate(0, spells);

			spells.spells.sort((a, b) => {
				if (a.circle == b.circle) return a.name.localeCompare(b.name);
				return a.circle - b.circle;
			});
		}

		function urdrClick(e) {
			$$invalidate(0, spells.urdr += e.shiftKey ? -1 : 1, spells);
			if (spells.urdr < 0) $$invalidate(0, spells.urdr = maxUrdr, spells); else if (spells.urdr > maxUrdr) $$invalidate(0, spells.urdr = 0, spells);
		}

		spells.spells.forEach(spell => {
			if (!spell.id) spell.id = crypto.randomUUID();
		});

		const click_handler = () => $$invalidate(2, menu = 'filters');
		const click_handler_1 = f => $$invalidate(0, spells.show = f.val, spells);

		$$self.$$set = $$props => {
			if ('spells' in $$props) $$invalidate(0, spells = $$props.spells);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*spells*/ 1) {
				$$invalidate(6, inventory = spells.spells.reduce((a, b) => a + (b.inventory ? b.circle : 0), 0));
			}

			if ($$self.$$.dirty & /*spells*/ 1) {
				$$invalidate(1, space = spells.memory - spells.spells.reduce((a, b) => a + (b.memorized ? b.circle : 0), 0));
			}

			if ($$self.$$.dirty & /*spells*/ 1) {
				$$invalidate(5, caster = spells.memory > 0 ? 'magician' : 'theurge');
			}

			if ($$self.$$.dirty & /*spells*/ 1) {
				$$invalidate(4, filters = () => {
					let list = [{ val: 'all', text: 'All' }];

					if (spells.memory > 0) {
						list = list.concat([
							{ val: 'capacity', text: 'Can memorize' },
							{
								val: 'inventoryScroll',
								text: 'Inventory'
							},
							{ val: 'memory', text: 'Memorized' },
							{ val: 'scroll', text: 'Scrolls' },
							{ val: 'inventory', text: 'Spellbook' }
						]);
					} else if (spells.urdr > 0) {
						list = list.concat([
							{ val: 'inventory', text: 'Relic' },
							{ val: 'burden', text: 'Within burden' }
						]);
					}

					return list;
				});
			}

			if ($$self.$$.dirty & /*spells, space*/ 3) {
				$$invalidate(3, filtered = spells.spells.filter(spell => {
					if (!spells.show || spells.show == 'all') return true;
					if (spells.show == 'burden') return spell.circle <= spells.urdr - spells.burden;
					if (spells.show == 'capacity') return space >= spell.circle || spell.memorized;
					if (spells.show == 'inventory') return spell.inventory;
					if (spells.show == 'inventory&scroll') return spell.inventory || spell.scroll;
					if (spells.show == 'memory') return spell.memorized;
					if (spells.show == 'scroll') return spell.scroll;
				}));
			}
		};

		return [
			spells,
			space,
			menu,
			filtered,
			filters,
			caster,
			inventory,
			spellActions,
			add,
			burdenClick,
			burdenDownClick,
			clearMenu,
			memoryClick,
			urdrClick,
			click_handler,
			click_handler_1
		];
	}

	class Spells extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { spells: 0 });
		}
	}

	/* src\components\Trait.svelte generated by Svelte v4.2.20 */

	function create_else_block$4(ctx) {
		let button;
		let t_value = /*trait*/ ctx[0].name + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn btn-light w-100 text-left font-weight-bold flex-grow-1");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[10]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*trait*/ 1 && t_value !== (t_value = /*trait*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (37:16) {#if editName}
	function create_if_block_2$3(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control mb-1 mr-1");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				set_input_value(input_1, /*trait*/ ctx[0].name);
				/*input_1_binding*/ ctx[9](input_1);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler*/ ctx[7]),
						listen(input_1, "input", /*input_1_input_handler*/ ctx[8])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*trait*/ 1 && input_1.value !== /*trait*/ ctx[0].name) {
					set_input_value(input_1, /*trait*/ ctx[0].name);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[9](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (46:20) {#if trait.level < 3}
	function create_if_block_1$4(ctx) {
		let button;
		let t;
		let button_class_value;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text("+1D");
				attr(button, "class", button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 1 ? 'btn-dark' : 'btn-light'));
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_1*/ ctx[11]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*trait*/ 1 && button_class_value !== (button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 1 ? 'btn-dark' : 'btn-light'))) {
					attr(button, "class", button_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (49:20) {#if trait.level == 2}
	function create_if_block$4(ctx) {
		let button;
		let t;
		let button_class_value;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text("+1D");
				attr(button, "class", button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 2 ? 'btn-dark' : 'btn-light'));
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_2*/ ctx[12]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*trait*/ 1 && button_class_value !== (button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 2 ? 'btn-dark' : 'btn-light'))) {
					attr(button, "class", button_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	function create_fragment$4(ctx) {
		let div6;
		let div5;
		let div4;
		let div0;
		let t0;
		let button0;
		let t1_value = /*trait*/ ctx[0].level + "";
		let t1;
		let t2;
		let div3;
		let div1;
		let t3;
		let t4;
		let div2;
		let button1;
		let t5;
		let button1_class_value;
		let t6;
		let button2;
		let t7;
		let button2_class_value;
		let t8;
		let button3;
		let t9;
		let button3_class_value;
		let t10;
		let button4;
		let mounted;
		let dispose;

		function select_block_type(ctx, dirty) {
			if (/*editName*/ ctx[2]) return create_if_block_2$3;
			return create_else_block$4;
		}

		let current_block_type = select_block_type(ctx);
		let if_block0 = current_block_type(ctx);
		let if_block1 = /*trait*/ ctx[0].level < 3 && create_if_block_1$4(ctx);
		let if_block2 = /*trait*/ ctx[0].level == 2 && create_if_block$4(ctx);

		return {
			c() {
				div6 = element("div");
				div5 = element("div");
				div4 = element("div");
				div0 = element("div");
				if_block0.c();
				t0 = space();
				button0 = element("button");
				t1 = text(t1_value);
				t2 = space();
				div3 = element("div");
				div1 = element("div");
				if (if_block1) if_block1.c();
				t3 = space();
				if (if_block2) if_block2.c();
				t4 = space();
				div2 = element("div");
				button1 = element("button");
				t5 = text("✓");
				t6 = space();
				button2 = element("button");
				t7 = text("✓");
				t8 = space();
				button3 = element("button");
				t9 = text("Used");
				t10 = space();
				button4 = element("button");
				button4.textContent = "Delete";
				attr(button0, "tabindex", "0");
				attr(button0, "class", "btn btn-dark");
				attr(div0, "class", "d-flex mb-1");
				attr(div1, "class", "btn-group");
				attr(button1, "class", button1_class_value = "border border-dark btn " + (/*trait*/ ctx[0].checks >= 1 ? 'btn-dark' : 'btn-light'));
				attr(button2, "class", button2_class_value = "border border-dark btn " + (/*trait*/ ctx[0].checks >= 2 ? 'btn-dark' : 'btn-light'));
				attr(button3, "class", button3_class_value = "btn " + (/*trait*/ ctx[0].usedAgainst ? 'btn-dark' : 'btn-light') + " border border-dark");
				attr(div2, "class", "btn-group ml-1");
				attr(button4, "class", "btn btn-light border border-dark ml-auto");
				attr(div3, "class", "d-flex");
				attr(div4, "class", "card-body");
				attr(div5, "class", "card");
				attr(div6, "class", "col-md-6");
			},
			m(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div5);
				append(div5, div4);
				append(div4, div0);
				if_block0.m(div0, null);
				append(div0, t0);
				append(div0, button0);
				append(button0, t1);
				append(div4, t2);
				append(div4, div3);
				append(div3, div1);
				if (if_block1) if_block1.m(div1, null);
				append(div1, t3);
				if (if_block2) if_block2.m(div1, null);
				append(div3, t4);
				append(div3, div2);
				append(div2, button1);
				append(button1, t5);
				append(div2, t6);
				append(div2, button2);
				append(button2, t7);
				append(div2, t8);
				append(div2, button3);
				append(button3, t9);
				append(div3, t10);
				append(div3, button4);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*levelClick*/ ctx[4]),
						listen(button1, "click", /*click_handler_3*/ ctx[13]),
						listen(button2, "click", /*click_handler_4*/ ctx[14]),
						listen(button3, "click", /*click_handler_5*/ ctx[15]),
						listen(button4, "click", /*click_handler_6*/ ctx[16])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(ctx);

					if (if_block0) {
						if_block0.c();
						if_block0.m(div0, t0);
					}
				}

				if (dirty & /*trait*/ 1 && t1_value !== (t1_value = /*trait*/ ctx[0].level + "")) set_data(t1, t1_value);

				if (/*trait*/ ctx[0].level < 3) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_1$4(ctx);
						if_block1.c();
						if_block1.m(div1, t3);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (/*trait*/ ctx[0].level == 2) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block$4(ctx);
						if_block2.c();
						if_block2.m(div1, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (dirty & /*trait*/ 1 && button1_class_value !== (button1_class_value = "border border-dark btn " + (/*trait*/ ctx[0].checks >= 1 ? 'btn-dark' : 'btn-light'))) {
					attr(button1, "class", button1_class_value);
				}

				if (dirty & /*trait*/ 1 && button2_class_value !== (button2_class_value = "border border-dark btn " + (/*trait*/ ctx[0].checks >= 2 ? 'btn-dark' : 'btn-light'))) {
					attr(button2, "class", button2_class_value);
				}

				if (dirty & /*trait*/ 1 && button3_class_value !== (button3_class_value = "btn " + (/*trait*/ ctx[0].usedAgainst ? 'btn-dark' : 'btn-light') + " border border-dark")) {
					attr(button3, "class", button3_class_value);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div6);
				}

				if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				mounted = false;
				run_all(dispose);
			}
		};
	}

	const maxLevel = 3;

	function instance$4($$self, $$props, $$invalidate) {
		let { actions } = $$props;
		let { trait } = $$props;
		let editName = false;
		let input;

		function levelClick(e) {
			$$invalidate(0, trait.level += e.shiftKey ? -1 : 1, trait);
			if (trait.level > maxLevel) $$invalidate(0, trait.level = 1, trait); else if (trait.level < 1) $$invalidate(0, trait.level = maxLevel, trait);
		}

		function setChecks(n) {
			if (trait.checks == n) $$invalidate(0, trait.checks--, trait); else $$invalidate(0, trait.checks = n, trait);
		}

		function setUsed(n) {
			if (trait.used == n) $$invalidate(0, trait.used--, trait); else $$invalidate(0, trait.used = n, trait);
		}

		afterUpdate(() => {
			if (input) input.focus();
		});

		const blur_handler = () => $$invalidate(2, editName = false);

		function input_1_input_handler() {
			trait.name = this.value;
			$$invalidate(0, trait);
		}

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(3, input);
			});
		}

		const click_handler = () => $$invalidate(2, editName = true);
		const click_handler_1 = () => setUsed(1);
		const click_handler_2 = () => setUsed(2);
		const click_handler_3 = () => setChecks(1);
		const click_handler_4 = () => setChecks(2);
		const click_handler_5 = () => $$invalidate(0, trait.usedAgainst = !trait.usedAgainst, trait);
		const click_handler_6 = () => actions.delete(trait);

		$$self.$$set = $$props => {
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
			if ('trait' in $$props) $$invalidate(0, trait = $$props.trait);
		};

		return [
			trait,
			actions,
			editName,
			input,
			levelClick,
			setChecks,
			setUsed,
			blur_handler,
			input_1_input_handler,
			input_1_binding,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			click_handler_5,
			click_handler_6
		];
	}

	class Trait extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$4, create_fragment$4, safe_not_equal, { actions: 1, trait: 0 });
		}
	}

	/* src\components\Traits.svelte generated by Svelte v4.2.20 */

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[6] = list[i];
		return child_ctx;
	}

	// (58:8) {:else}
	function create_else_block$3(ctx) {
		let div0;
		let h5;
		let t1;
		let button;
		let t3;
		let div1;
		let mounted;
		let dispose;

		return {
			c() {
				div0 = element("div");
				h5 = element("h5");
				h5.textContent = "Traits";
				t1 = space();
				button = element("button");
				button.textContent = "✗";
				t3 = space();
				div1 = element("div");
				div1.innerHTML = `<p>Traits grant bonuses by level:</p> <ul><li>Level 1 traits grant +1D to a relevent test once per session</li> <li>Level 2 traits grant +1D to a relevent test twice per session</li> <li>Level 3 traits grant +1s to all relevent tests</li></ul> <p>Each trait can be used once per session to generate up to two checks.</p> <ul><li>One check is generated when used to apply a -1D penalty to an independent or versus test</li> <li>Two checks are generated when used to grant an opponent a +2D advantage in a versus test</li> <li>Two checks are generated when used to break a tie in an opponent&#39;s favor in a versus test</li></ul>`;
				attr(h5, "class", "card-title");
				attr(button, "class", "close position-topright");
				attr(button, "type", "button");
				attr(div0, "class", "card-header");
				attr(div1, "class", "card-body");
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				append(div0, h5);
				append(div0, t1);
				append(div0, button);
				insert(target, t3, anchor);
				insert(target, div1, anchor);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_1*/ ctx[5]);
					mounted = true;
				}
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t3);
					detach(div1);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (40:8) {#if !showHelp}
	function create_if_block$3(ctx) {
		let div2;
		let div0;
		let button;
		let t1;
		let t2;
		let div1;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let mounted;
		let dispose;
		let if_block = /*traits*/ ctx[0].length < 4 && create_if_block_1$3(ctx);
		let each_value = ensure_array_like(/*traits*/ ctx[0]);
		const get_key = ctx => /*trait*/ ctx[6].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$1(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
		}

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				button = element("button");
				button.textContent = "?";
				t1 = space();
				if (if_block) if_block.c();
				t2 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(button, "class", "btn badge btn-light border border-dark");
				attr(div0, "class", "btn-group position-topright");
				attr(div1, "class", "row");
				attr(div2, "class", "card-body");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, button);
				append(div2, t1);
				if (if_block) if_block.m(div2, null);
				append(div2, t2);
				append(div2, div1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[4]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (/*traits*/ ctx[0].length < 4) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1$3(ctx);
						if_block.c();
						if_block.m(div2, t2);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*traits, traitActions*/ 5) {
					each_value = ensure_array_like(/*traits*/ ctx[0]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				if (if_block) if_block.d();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (45:12) {#if traits.length < 4}
	function create_if_block_1$3(ctx) {
		let div1;
		let div0;
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				button = element("button");
				button.textContent = "Add trait";
				attr(button, "class", "btn btn-light border mb-1");
				attr(div0, "class", "col-md-12");
				attr(div1, "class", "row");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, button);

				if (!mounted) {
					dispose = listen(button, "click", /*add*/ ctx[3]);
					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (53:16) {#each traits as trait (trait.id)}
	function create_each_block$1(key_1, ctx) {
		let first;
		let trait_1;
		let current;

		trait_1 = new Trait({
				props: {
					trait: /*trait*/ ctx[6],
					actions: /*traitActions*/ ctx[2]
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(trait_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(trait_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const trait_1_changes = {};
				if (dirty & /*traits*/ 1) trait_1_changes.trait = /*trait*/ ctx[6];
				trait_1.$set(trait_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(trait_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(trait_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(trait_1, detaching);
			}
		};
	}

	function create_fragment$3(ctx) {
		let div1;
		let div0;
		let current_block_type_index;
		let if_block;
		let current;
		const if_block_creators = [create_if_block$3, create_else_block$3];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (!/*showHelp*/ ctx[1]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				if_block.c();
				attr(div0, "class", "card");
				attr(div1, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				if_blocks[current_block_type_index].m(div0, null);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div0, null);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { traits } = $$props;

		const traitActions = {
			delete: trait => {
				if (!confirm(`Delete ${trait.name}?`)) return;
				let i = traits.indexOf(trait);
				traits.splice(i, 1);
				$$invalidate(0, traits);
			}
		};

		let showHelp = false;

		function add() {
			traits.push({
				id: crypto.randomUUID(),
				name: 'New trait',
				level: 1,
				used: 0,
				usedAgainst: false,
				checks: 0
			});

			$$invalidate(0, traits);
		}

		const click_handler = () => $$invalidate(1, showHelp = true);
		const click_handler_1 = () => $$invalidate(1, showHelp = false);

		$$self.$$set = $$props => {
			if ('traits' in $$props) $$invalidate(0, traits = $$props.traits);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*traits*/ 1) {
				{
					traits.forEach(trait => {
						if (!trait.id) trait.id = crypto.randomUUID();
					});
				}
			}
		};

		return [traits, showHelp, traitActions, add, click_handler, click_handler_1];
	}

	class Traits extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$3, safe_not_equal, { traits: 0 });
		}
	}

	/* src\components\Wise.svelte generated by Svelte v4.2.20 */

	function create_else_block_1(ctx) {
		let div5;
		let div4;
		let div3;
		let div0;
		let t0;
		let div2;
		let div1;
		let button0;
		let t1;
		let button0_class_value;
		let t2;
		let button1;
		let t3;
		let button1_class_value;
		let t4;
		let button2;
		let t5;
		let button2_class_value;
		let t6;
		let button3;
		let t7;
		let button3_class_value;
		let t8;
		let button4;
		let mounted;
		let dispose;

		function select_block_type_2(ctx, dirty) {
			if (/*editName*/ ctx[3]) return create_if_block_2$2;
			return create_else_block_2;
		}

		let current_block_type = select_block_type_2(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				div5 = element("div");
				div4 = element("div");
				div3 = element("div");
				div0 = element("div");
				if_block.c();
				t0 = space();
				div2 = element("div");
				div1 = element("div");
				button0 = element("button");
				t1 = text("Pass");
				t2 = space();
				button1 = element("button");
				t3 = text("Fail");
				t4 = space();
				button2 = element("button");
				t5 = text("Fate");
				t6 = space();
				button3 = element("button");
				t7 = text("Persona");
				t8 = space();
				button4 = element("button");
				button4.textContent = "Forget";
				attr(div0, "class", "d-flex mb-1");
				attr(button0, "class", button0_class_value = "btn " + (/*wise*/ ctx[0].pass ? 'btn-dark' : 'btn-light') + " border border-dark");
				attr(button1, "class", button1_class_value = "btn " + (/*wise*/ ctx[0].fail ? 'btn-dark' : 'btn-light') + " border border-dark");
				attr(button2, "class", button2_class_value = "btn " + (/*wise*/ ctx[0].fate ? 'btn-dark' : 'btn-light') + " border border-dark");
				attr(button3, "class", button3_class_value = "btn " + (/*wise*/ ctx[0].persona ? 'btn-dark' : 'btn-light') + " border border-dark");
				attr(div1, "class", "btn-group");
				attr(button4, "class", "btn btn-light border ml-auto");
				attr(div2, "class", "d-flex");
				attr(div3, "class", "card-body");
				attr(div4, "class", "card");
				attr(div5, "class", "col-md-6");
			},
			m(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div4);
				append(div4, div3);
				append(div3, div0);
				if_block.m(div0, null);
				append(div3, t0);
				append(div3, div2);
				append(div2, div1);
				append(div1, button0);
				append(button0, t1);
				append(div1, t2);
				append(div1, button1);
				append(button1, t3);
				append(div1, t4);
				append(div1, button2);
				append(button2, t5);
				append(div1, t6);
				append(div1, button3);
				append(button3, t7);
				append(div2, t8);
				append(div2, button4);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler_3*/ ctx[13]),
						listen(button1, "click", /*click_handler_4*/ ctx[14]),
						listen(button2, "click", /*click_handler_5*/ ctx[15]),
						listen(button3, "click", /*click_handler_6*/ ctx[16]),
						listen(button4, "click", /*click_handler_7*/ ctx[17])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div0, null);
					}
				}

				if (dirty & /*wise*/ 1 && button0_class_value !== (button0_class_value = "btn " + (/*wise*/ ctx[0].pass ? 'btn-dark' : 'btn-light') + " border border-dark")) {
					attr(button0, "class", button0_class_value);
				}

				if (dirty & /*wise*/ 1 && button1_class_value !== (button1_class_value = "btn " + (/*wise*/ ctx[0].fail ? 'btn-dark' : 'btn-light') + " border border-dark")) {
					attr(button1, "class", button1_class_value);
				}

				if (dirty & /*wise*/ 1 && button2_class_value !== (button2_class_value = "btn " + (/*wise*/ ctx[0].fate ? 'btn-dark' : 'btn-light') + " border border-dark")) {
					attr(button2, "class", button2_class_value);
				}

				if (dirty & /*wise*/ 1 && button3_class_value !== (button3_class_value = "btn " + (/*wise*/ ctx[0].persona ? 'btn-dark' : 'btn-light') + " border border-dark")) {
					attr(button3, "class", button3_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div5);
				}

				if_block.d();
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (15:0) {#if wise.old}
	function create_if_block$2(ctx) {
		let div;
		let t0;
		let button;
		let mounted;
		let dispose;

		function select_block_type_1(ctx, dirty) {
			if (/*editName*/ ctx[3]) return create_if_block_1$2;
			return create_else_block$2;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				div = element("div");
				if_block.c();
				t0 = space();
				button = element("button");
				button.textContent = "Delete";
				attr(button, "class", "btn btn-light border ml-auto mb-1");
				attr(div, "class", "d-flex");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				if_block.m(div, null);
				append(div, t0);
				append(div, button);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_1*/ ctx[8]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, t0);
					}
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if_block.d();
				mounted = false;
				dispose();
			}
		};
	}

	// (31:16) {:else}
	function create_else_block_2(ctx) {
		let button;
		let t_value = /*wise*/ ctx[0].name + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn btn-light w-100 text-left font-weight-bold");
				set_style(button, "min-height", "2.2em");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_2*/ ctx[12]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*wise*/ 1 && t_value !== (t_value = /*wise*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (29:16) {#if editName}
	function create_if_block_2$2(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control mb-1");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				set_input_value(input_1, /*wise*/ ctx[0].name);
				/*input_1_binding_1*/ ctx[11](input_1);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler_1*/ ctx[9]),
						listen(input_1, "input", /*input_1_input_handler_1*/ ctx[10])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*wise*/ 1 && input_1.value !== /*wise*/ ctx[0].name) {
					set_input_value(input_1, /*wise*/ ctx[0].name);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding_1*/ ctx[11](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (19:4) {:else}
	function create_else_block$2(ctx) {
		let button;
		let t_value = /*wise*/ ctx[0].name + "";
		let t;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t = text(t_value);
				attr(button, "class", "btn btn-light border mb-1 mr-1 w-100 text-left");
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[7]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*wise*/ 1 && t_value !== (t_value = /*wise*/ ctx[0].name + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (17:4) {#if editName}
	function create_if_block_1$2(ctx) {
		let input_1;
		let mounted;
		let dispose;

		return {
			c() {
				input_1 = element("input");
				attr(input_1, "class", "form-control mb-1 mr-1");
			},
			m(target, anchor) {
				insert(target, input_1, anchor);
				set_input_value(input_1, /*wise*/ ctx[0].name);
				/*input_1_binding*/ ctx[6](input_1);

				if (!mounted) {
					dispose = [
						listen(input_1, "blur", /*blur_handler*/ ctx[4]),
						listen(input_1, "input", /*input_1_input_handler*/ ctx[5])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*wise*/ 1 && input_1.value !== /*wise*/ ctx[0].name) {
					set_input_value(input_1, /*wise*/ ctx[0].name);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(input_1);
				}

				/*input_1_binding*/ ctx[6](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function create_fragment$2(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*wise*/ ctx[0].old) return create_if_block$2;
			return create_else_block_1;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { actions } = $$props;
		let { wise } = $$props;
		let input;
		let editName = false;

		afterUpdate(() => {
			if (input) input.focus();
		});

		const blur_handler = () => $$invalidate(3, editName = false);

		function input_1_input_handler() {
			wise.name = this.value;
			$$invalidate(0, wise);
		}

		function input_1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(2, input);
			});
		}

		const click_handler = () => $$invalidate(3, editName = true);
		const click_handler_1 = () => actions.delete(wise);
		const blur_handler_1 = () => $$invalidate(3, editName = false);

		function input_1_input_handler_1() {
			wise.name = this.value;
			$$invalidate(0, wise);
		}

		function input_1_binding_1($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				input = $$value;
				$$invalidate(2, input);
			});
		}

		const click_handler_2 = () => $$invalidate(3, editName = true);
		const click_handler_3 = () => $$invalidate(0, wise.pass = !wise.pass, wise);
		const click_handler_4 = () => $$invalidate(0, wise.fail = !wise.fail, wise);
		const click_handler_5 = () => $$invalidate(0, wise.fate = !wise.fate, wise);
		const click_handler_6 = () => $$invalidate(0, wise.persona = !wise.persona, wise);

		const click_handler_7 = () => {
			$$invalidate(0, wise.old = true, wise);
			actions.refresh();
		};

		$$self.$$set = $$props => {
			if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
			if ('wise' in $$props) $$invalidate(0, wise = $$props.wise);
		};

		return [
			wise,
			actions,
			input,
			editName,
			blur_handler,
			input_1_input_handler,
			input_1_binding,
			click_handler,
			click_handler_1,
			blur_handler_1,
			input_1_input_handler_1,
			input_1_binding_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			click_handler_5,
			click_handler_6,
			click_handler_7
		];
	}

	class Wise extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { actions: 1, wise: 0 });
		}
	}

	/* src\components\Wises.svelte generated by Svelte v4.2.20 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[9] = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[9] = list[i];
		return child_ctx;
	}

	// (66:8) {:else}
	function create_else_block$1(ctx) {
		let div0;
		let h5;
		let t1;
		let button;
		let t3;
		let div1;
		let mounted;
		let dispose;

		return {
			c() {
				div0 = element("div");
				h5 = element("h5");
				h5.textContent = "Wises";
				t1 = space();
				button = element("button");
				button.textContent = "✗";
				t3 = space();
				div1 = element("div");

				div1.innerHTML = `<p>Wises can be used to help others in place of a relevent skill. Doing so isolates the helping character from receiving conditions from the test.</p> <p>Wises can be used to salvage a failed roll:</p> <ul><li><strong>Deeper understanding</strong> Spend a point of fate to reroll a single failed die</li> <li><strong>Of course!</strong> Spend a point of persona to reroll all failed dice</li></ul> <p>Once a wise has been used to help another in a failed and successful test, as well as <strong>deeper understanding</strong> 
                and <strong>of course!</strong>, the wise may be replaced with another, or a test for advancement may be marked for a skill related
                to the wise.</p>`;

				attr(h5, "class", "card-title");
				attr(button, "class", "close position-topright");
				attr(button, "type", "button");
				attr(div0, "class", "card-header");
				attr(div1, "class", "card-body");
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				append(div0, h5);
				append(div0, t1);
				append(div0, button);
				insert(target, t3, anchor);
				insert(target, div1, anchor);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler_1*/ ctx[7]);
					mounted = true;
				}
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t3);
					detach(div1);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (48:8) {#if !showHelp}
	function create_if_block_1$1(ctx) {
		let div2;
		let div0;
		let button;
		let t1;
		let t2;
		let div1;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let mounted;
		let dispose;
		let if_block = /*current*/ ctx[2].length < 4 && create_if_block_2$1(ctx);
		let each_value_1 = ensure_array_like(/*current*/ ctx[2]);
		const get_key = ctx => /*wise*/ ctx[9].id;

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
		}

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				button = element("button");
				button.textContent = "?";
				t1 = space();
				if (if_block) if_block.c();
				t2 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(button, "class", "btn badge btn-light border border-dark");
				attr(div0, "class", "btn-group position-topright");
				attr(div1, "class", "row");
				attr(div2, "class", "card-body");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, button);
				append(div2, t1);
				if (if_block) if_block.m(div2, null);
				append(div2, t2);
				append(div2, div1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[6]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (/*current*/ ctx[2].length < 4) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_2$1(ctx);
						if_block.c();
						if_block.m(div2, t2);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*current, wiseActions*/ 12) {
					each_value_1 = ensure_array_like(/*current*/ ctx[2]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div1, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value_1.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				if (if_block) if_block.d();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (53:12) {#if current.length < 4}
	function create_if_block_2$1(ctx) {
		let div1;
		let div0;
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				button = element("button");
				button.textContent = "Add wise";
				attr(button, "class", "btn btn-light border mb-1");
				attr(div0, "class", "col-md-12");
				attr(div1, "class", "row");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, button);

				if (!mounted) {
					dispose = listen(button, "click", /*add*/ ctx[4]);
					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				mounted = false;
				dispose();
			}
		};
	}

	// (61:16) {#each current as wise (wise.id)}
	function create_each_block_1(key_1, ctx) {
		let first;
		let wise_1;
		let current;

		wise_1 = new Wise({
				props: {
					wise: /*wise*/ ctx[9],
					actions: /*wiseActions*/ ctx[3]
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(wise_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(wise_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const wise_1_changes = {};
				if (dirty & /*current*/ 4) wise_1_changes.wise = /*wise*/ ctx[9];
				wise_1.$set(wise_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(wise_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(wise_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(wise_1, detaching);
			}
		};
	}

	// (86:4) {#if old.length > 0}
	function create_if_block$1(ctx) {
		let div2;
		let div1;
		let h4;
		let t1;
		let div0;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let each_value = ensure_array_like(/*old*/ ctx[1]);
		const get_key = ctx => /*wise*/ ctx[9].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		return {
			c() {
				div2 = element("div");
				div1 = element("div");
				h4 = element("h4");
				h4.textContent = "Previous Wises";
				t1 = space();
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div0, "class", "d-flex flex-column");
				attr(div1, "class", "card-body");
				attr(div2, "class", "card");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, h4);
				append(div1, t1);
				append(div1, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				current = true;
			},
			p(ctx, dirty) {
				if (dirty & /*old, wiseActions*/ 10) {
					each_value = ensure_array_like(/*old*/ ctx[1]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, outro_and_destroy_block, create_each_block, null, get_each_context);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};
	}

	// (91:16) {#each old as wise (wise.id)}
	function create_each_block(key_1, ctx) {
		let first;
		let wise_1;
		let current;

		wise_1 = new Wise({
				props: {
					wise: /*wise*/ ctx[9],
					actions: /*wiseActions*/ ctx[3]
				}
			});

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				create_component(wise_1.$$.fragment);
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				mount_component(wise_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const wise_1_changes = {};
				if (dirty & /*old*/ 2) wise_1_changes.wise = /*wise*/ ctx[9];
				wise_1.$set(wise_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(wise_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(wise_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
				}

				destroy_component(wise_1, detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		let div1;
		let div0;
		let current_block_type_index;
		let if_block0;
		let t;
		let current;
		const if_block_creators = [create_if_block_1$1, create_else_block$1];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (!/*showHelp*/ ctx[0]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		let if_block1 = /*old*/ ctx[1].length > 0 && create_if_block$1(ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				if_block0.c();
				t = space();
				if (if_block1) if_block1.c();
				attr(div0, "class", "card");
				attr(div1, "class", "container-fluid");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				if_blocks[current_block_type_index].m(div0, null);
				append(div1, t);
				if (if_block1) if_block1.m(div1, null);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block0 = if_blocks[current_block_type_index];

					if (!if_block0) {
						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block0.c();
					} else {
						if_block0.p(ctx, dirty);
					}

					transition_in(if_block0, 1);
					if_block0.m(div0, null);
				}

				if (/*old*/ ctx[1].length > 0) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty & /*old*/ 2) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block$1(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block0);
				transition_in(if_block1);
				current = true;
			},
			o(local) {
				transition_out(if_block0);
				transition_out(if_block1);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if_blocks[current_block_type_index].d();
				if (if_block1) if_block1.d();
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let current;
		let old;
		let { wises } = $$props;

		const wiseActions = {
			delete: wise => {
				if (!confirm(`Delete ${wise.name}?`)) return;
				let i = wises.indexOf(wise);
				wises.splice(i, 1);
				refresh();
			},
			refresh
		};

		let showHelp = false;

		function add() {
			wises.push({
				id: crypto.randomUUID(),
				name: 'New wise',
				pass: false,
				fail: false,
				fate: false,
				persona: false
			});

			refresh();
		}

		function refresh() {
			$$invalidate(5, wises);
		}

		const click_handler = () => $$invalidate(0, showHelp = true);
		const click_handler_1 = () => $$invalidate(0, showHelp = false);

		$$self.$$set = $$props => {
			if ('wises' in $$props) $$invalidate(5, wises = $$props.wises);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*wises*/ 32) {
				$$invalidate(2, current = wises.filter(x => !x.old));
			}

			if ($$self.$$.dirty & /*wises*/ 32) {
				$$invalidate(1, old = wises.filter(x => x.old));
			}

			if ($$self.$$.dirty & /*wises*/ 32) {
				{
					wises.forEach(wise => {
						if (!wise.id) wise.id = crypto.randomUUID();
					});
				}
			}
		};

		return [
			showHelp,
			old,
			current,
			wiseActions,
			add,
			wises,
			click_handler,
			click_handler_1
		];
	}

	class Wises extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { wises: 5 });
		}
	}

	/* src\App.svelte generated by Svelte v4.2.20 */

	function create_else_block(ctx) {
		let link;

		return {
			c() {
				link = element("link");
				attr(link, "rel", "stylesheet");
				attr(link, "href", "https://cdn.jsdelivr.net/npm/bootstrap@4.6.1/dist/css/bootstrap.min.css");
				attr(link, "integrity", "sha384-zCbKRCUGaJDkqS1kPbPd7TveP5iyJE0EjAuZQTgFLD2ylzuqKfdKlfG/eSrtxUkn");
				attr(link, "crossorigin", "anonymous");
			},
			m(target, anchor) {
				insert(target, link, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(link);
				}
			}
		};
	}

	// (26:1) {#if theme == 'dark'}
	function create_if_block_10(ctx) {
		let link;

		return {
			c() {
				link = element("link");
				attr(link, "rel", "stylesheet");
				attr(link, "href", "https://cdn.jsdelivr.net/gh/vinorodrigues/bootstrap-dark@0.6.1/dist/bootstrap-dark.min.css");
			},
			m(target, anchor) {
				insert(target, link, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(link);
				}
			}
		};
	}

	// (54:26) 
	function create_if_block_9(ctx) {
		let wises;
		let current;
		wises = new Wises({ props: { wises: /*model*/ ctx[0].wises } });

		return {
			c() {
				create_component(wises.$$.fragment);
			},
			m(target, anchor) {
				mount_component(wises, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const wises_changes = {};
				if (dirty & /*model*/ 1) wises_changes.wises = /*model*/ ctx[0].wises;
				wises.$set(wises_changes);
			},
			i(local) {
				if (current) return;
				transition_in(wises.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(wises.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(wises, detaching);
			}
		};
	}

	// (52:27) 
	function create_if_block_8(ctx) {
		let traits;
		let current;

		traits = new Traits({
				props: { traits: /*model*/ ctx[0].traits }
			});

		return {
			c() {
				create_component(traits.$$.fragment);
			},
			m(target, anchor) {
				mount_component(traits, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const traits_changes = {};
				if (dirty & /*model*/ 1) traits_changes.traits = /*model*/ ctx[0].traits;
				traits.$set(traits_changes);
			},
			i(local) {
				if (current) return;
				transition_in(traits.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(traits.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(traits, detaching);
			}
		};
	}

	// (50:27) 
	function create_if_block_7(ctx) {
		let spells;
		let current;

		spells = new Spells({
				props: { spells: /*model*/ ctx[0].spells }
			});

		return {
			c() {
				create_component(spells.$$.fragment);
			},
			m(target, anchor) {
				mount_component(spells, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const spells_changes = {};
				if (dirty & /*model*/ 1) spells_changes.spells = /*model*/ ctx[0].spells;
				spells.$set(spells_changes);
			},
			i(local) {
				if (current) return;
				transition_in(spells.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(spells.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(spells, detaching);
			}
		};
	}

	// (48:27) 
	function create_if_block_6(ctx) {
		let skills;
		let current;

		skills = new Skills({
				props: {
					skills: /*model*/ ctx[0].skills,
					bluckTries: /*model*/ ctx[0].abilities.nature.maximum
				}
			});

		return {
			c() {
				create_component(skills.$$.fragment);
			},
			m(target, anchor) {
				mount_component(skills, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const skills_changes = {};
				if (dirty & /*model*/ 1) skills_changes.skills = /*model*/ ctx[0].skills;
				if (dirty & /*model*/ 1) skills_changes.bluckTries = /*model*/ ctx[0].abilities.nature.maximum;
				skills.$set(skills_changes);
			},
			i(local) {
				if (current) return;
				transition_in(skills.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(skills.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(skills, detaching);
			}
		};
	}

	// (46:26) 
	function create_if_block_5(ctx) {
		let notes;
		let current;
		notes = new Notes({ props: { notes: /*model*/ ctx[0].notes } });

		return {
			c() {
				create_component(notes.$$.fragment);
			},
			m(target, anchor) {
				mount_component(notes, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const notes_changes = {};
				if (dirty & /*model*/ 1) notes_changes.notes = /*model*/ ctx[0].notes;
				notes.$set(notes_changes);
			},
			i(local) {
				if (current) return;
				transition_in(notes.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(notes.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(notes, detaching);
			}
		};
	}

	// (44:30) 
	function create_if_block_4(ctx) {
		let inventory;
		let current;

		inventory = new Inventory({
				props: { inventory: /*model*/ ctx[0].inventory }
			});

		return {
			c() {
				create_component(inventory.$$.fragment);
			},
			m(target, anchor) {
				mount_component(inventory, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const inventory_changes = {};
				if (dirty & /*model*/ 1) inventory_changes.inventory = /*model*/ ctx[0].inventory;
				inventory.$set(inventory_changes);
			},
			i(local) {
				if (current) return;
				transition_in(inventory.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(inventory.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(inventory, detaching);
			}
		};
	}

	// (42:28) 
	function create_if_block_3(ctx) {
		let circles;
		let current;

		circles = new Circles({
				props: { circles: /*model*/ ctx[0].circles }
			});

		return {
			c() {
				create_component(circles.$$.fragment);
			},
			m(target, anchor) {
				mount_component(circles, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const circles_changes = {};
				if (dirty & /*model*/ 1) circles_changes.circles = /*model*/ ctx[0].circles;
				circles.$set(circles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(circles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(circles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(circles, detaching);
			}
		};
	}

	// (40:24) 
	function create_if_block_2(ctx) {
		let bio;
		let current;
		bio = new Bio({ props: { model: /*model*/ ctx[0] } });

		return {
			c() {
				create_component(bio.$$.fragment);
			},
			m(target, anchor) {
				mount_component(bio, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const bio_changes = {};
				if (dirty & /*model*/ 1) bio_changes.model = /*model*/ ctx[0];
				bio.$set(bio_changes);
			},
			i(local) {
				if (current) return;
				transition_in(bio.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(bio.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(bio, detaching);
			}
		};
	}

	// (38:32) 
	function create_if_block_1(ctx) {
		let advancement;
		let current;
		advancement = new Advancement({ props: { model: /*model*/ ctx[0] } });

		return {
			c() {
				create_component(advancement.$$.fragment);
			},
			m(target, anchor) {
				mount_component(advancement, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const advancement_changes = {};
				if (dirty & /*model*/ 1) advancement_changes.model = /*model*/ ctx[0];
				advancement.$set(advancement_changes);
			},
			i(local) {
				if (current) return;
				transition_in(advancement.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(advancement.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(advancement, detaching);
			}
		};
	}

	// (36:1) {#if tab == 'abilities'}
	function create_if_block(ctx) {
		let abilities;
		let current;
		abilities = new Abilities({ props: { model: /*model*/ ctx[0] } });

		return {
			c() {
				create_component(abilities.$$.fragment);
			},
			m(target, anchor) {
				mount_component(abilities, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const abilities_changes = {};
				if (dirty & /*model*/ 1) abilities_changes.model = /*model*/ ctx[0];
				abilities.$set(abilities_changes);
			},
			i(local) {
				if (current) return;
				transition_in(abilities.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(abilities.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(abilities, detaching);
			}
		};
	}

	function create_fragment(ctx) {
		let if_block0_anchor;
		let t0;
		let main;
		let navbar;
		let updating_model;
		let updating_tab;
		let t1;
		let conditions;
		let t2;
		let current_block_type_index;
		let if_block1;
		let current;

		function select_block_type(ctx, dirty) {
			if (theme == 'dark') return create_if_block_10;
			return create_else_block;
		}

		let current_block_type = select_block_type();
		let if_block0 = current_block_type(ctx);

		function navbar_model_binding(value) {
			/*navbar_model_binding*/ ctx[2](value);
		}

		function navbar_tab_binding(value) {
			/*navbar_tab_binding*/ ctx[3](value);
		}

		let navbar_props = {};

		if (/*model*/ ctx[0] !== void 0) {
			navbar_props.model = /*model*/ ctx[0];
		}

		if (/*tab*/ ctx[1] !== void 0) {
			navbar_props.tab = /*tab*/ ctx[1];
		}

		navbar = new Navbar({ props: navbar_props });
		binding_callbacks.push(() => bind(navbar, 'model', navbar_model_binding));
		binding_callbacks.push(() => bind(navbar, 'tab', navbar_tab_binding));
		conditions = new Conditions({ props: { model: /*model*/ ctx[0] } });

		const if_block_creators = [
			create_if_block,
			create_if_block_1,
			create_if_block_2,
			create_if_block_3,
			create_if_block_4,
			create_if_block_5,
			create_if_block_6,
			create_if_block_7,
			create_if_block_8,
			create_if_block_9
		];

		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*tab*/ ctx[1] == 'abilities') return 0;
			if (/*tab*/ ctx[1] == 'advancement') return 1;
			if (/*tab*/ ctx[1] == 'bio') return 2;
			if (/*tab*/ ctx[1] == 'circles') return 3;
			if (/*tab*/ ctx[1] == 'inventory') return 4;
			if (/*tab*/ ctx[1] == 'notes') return 5;
			if (/*tab*/ ctx[1] == 'skills') return 6;
			if (/*tab*/ ctx[1] == 'spells') return 7;
			if (/*tab*/ ctx[1] == 'traits') return 8;
			if (/*tab*/ ctx[1] == 'wises') return 9;
			return -1;
		}

		if (~(current_block_type_index = select_block_type_1(ctx))) {
			if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		}

		return {
			c() {
				if_block0.c();
				if_block0_anchor = empty();
				t0 = space();
				main = element("main");
				create_component(navbar.$$.fragment);
				t1 = space();
				create_component(conditions.$$.fragment);
				t2 = space();
				if (if_block1) if_block1.c();
				attr(main, "id", "app");
			},
			m(target, anchor) {
				if_block0.m(document.head, null);
				append(document.head, if_block0_anchor);
				insert(target, t0, anchor);
				insert(target, main, anchor);
				mount_component(navbar, main, null);
				append(main, t1);
				mount_component(conditions, main, null);
				append(main, t2);

				if (~current_block_type_index) {
					if_blocks[current_block_type_index].m(main, null);
				}

				current = true;
			},
			p(ctx, [dirty]) {
				const navbar_changes = {};

				if (!updating_model && dirty & /*model*/ 1) {
					updating_model = true;
					navbar_changes.model = /*model*/ ctx[0];
					add_flush_callback(() => updating_model = false);
				}

				if (!updating_tab && dirty & /*tab*/ 2) {
					updating_tab = true;
					navbar_changes.tab = /*tab*/ ctx[1];
					add_flush_callback(() => updating_tab = false);
				}

				navbar.$set(navbar_changes);
				const conditions_changes = {};
				if (dirty & /*model*/ 1) conditions_changes.model = /*model*/ ctx[0];
				conditions.$set(conditions_changes);
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if (~current_block_type_index) {
						if_blocks[current_block_type_index].p(ctx, dirty);
					}
				} else {
					if (if_block1) {
						group_outros();

						transition_out(if_blocks[previous_block_index], 1, 1, () => {
							if_blocks[previous_block_index] = null;
						});

						check_outros();
					}

					if (~current_block_type_index) {
						if_block1 = if_blocks[current_block_type_index];

						if (!if_block1) {
							if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
							if_block1.c();
						} else {
							if_block1.p(ctx, dirty);
						}

						transition_in(if_block1, 1);
						if_block1.m(main, null);
					} else {
						if_block1 = null;
					}
				}
			},
			i(local) {
				if (current) return;
				transition_in(navbar.$$.fragment, local);
				transition_in(conditions.$$.fragment, local);
				transition_in(if_block1);
				current = true;
			},
			o(local) {
				transition_out(navbar.$$.fragment, local);
				transition_out(conditions.$$.fragment, local);
				transition_out(if_block1);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(t0);
					detach(main);
				}

				if_block0.d(detaching);
				detach(if_block0_anchor);
				destroy_component(navbar);
				destroy_component(conditions);

				if (~current_block_type_index) {
					if_blocks[current_block_type_index].d();
				}
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		console.info("Initializing character model");
		let model = character();
		console.info("Setting tab to bio");
		let tab = 'bio';

		function navbar_model_binding(value) {
			model = value;
			$$invalidate(0, model);
		}

		function navbar_tab_binding(value) {
			tab = value;
			$$invalidate(1, tab);
		}

		return [model, tab, navbar_model_binding, navbar_tab_binding];
	}

	class App extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, {});
		}
	}

	const app = new App({
		target: document.body,
		props: { }
	});

	return app;

})();
