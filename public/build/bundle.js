
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
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
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
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
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
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
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
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
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
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
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
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
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

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
            compact: false,
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

    /* src\components\Bubbles.svelte generated by Svelte v3.48.0 */

    const file$c = "src\\components\\Bubbles.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (15:8) {#each arr as x,i}
    function create_each_block$3(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*i*/ ctx[9]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", "bubble btn border border-dark");
    			toggle_class(button, "btn-dark", /*value*/ ctx[0] > /*i*/ ctx[9]);
    			toggle_class(button, "btn-light", /*value*/ ctx[0] <= /*i*/ ctx[9]);
    			add_location(button, file$c, 15, 8, 354);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*value*/ 1) {
    				toggle_class(button, "btn-dark", /*value*/ ctx[0] > /*i*/ ctx[9]);
    			}

    			if (dirty & /*value*/ 1) {
    				toggle_class(button, "btn-light", /*value*/ ctx[0] <= /*i*/ ctx[9]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(15:8) {#each arr as x,i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let div1;
    	let small;
    	let t;
    	let div0;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	let each_value = /*arr*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			small = element("small");
    			if (default_slot) default_slot.c();
    			t = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(small, "class", "align-self-center");
    			set_style(small, "width", "3em");
    			add_location(small, file$c, 12, 4, 231);
    			add_location(div0, file$c, 13, 4, 311);
    			attr_dev(div1, "class", "d-flex w-100");
    			add_location(div1, file$c, 11, 0, 199);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, small);

    			if (default_slot) {
    				default_slot.m(small, null);
    			}

    			append_dev(div1, t);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    				each_value = /*arr*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let arr;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Bubbles', slots, ['default']);
    	let { count = 6 } = $$props;
    	let { value = 0 } = $$props;

    	function handleClick(i) {
    		$$invalidate(0, value = value == i + 1 ? i : i + 1);
    	}

    	const writable_props = ['count', 'value'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Bubbles> was created with unknown prop '${key}'`);
    	});

    	const click_handler = i => handleClick(i);

    	$$self.$$set = $$props => {
    		if ('count' in $$props) $$invalidate(3, count = $$props.count);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ count, value, handleClick, arr });

    	$$self.$inject_state = $$props => {
    		if ('count' in $$props) $$invalidate(3, count = $$props.count);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('arr' in $$props) $$invalidate(1, arr = $$props.arr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*count*/ 8) {
    			$$invalidate(1, arr = [...new Array(count)]);
    		}
    	};

    	return [value, arr, handleClick, count, $$scope, slots, click_handler];
    }

    class Bubbles extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { count: 3, value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bubbles",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get count() {
    		throw new Error("<Bubbles>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set count(value) {
    		throw new Error("<Bubbles>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Bubbles>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Bubbles>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Ability.svelte generated by Svelte v3.48.0 */
    const file$b = "src\\components\\Ability.svelte";

    // (22:8) {#if ability.rating < ability.cap}
    function create_if_block_1$3(ctx) {
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding(value) {
    		/*bubbles_value_binding*/ ctx[4](value);
    	}

    	let bubbles_props = {
    		count: /*maxPass*/ ctx[1],
    		$$slots: { default: [create_default_slot_1$4] },
    		$$scope: { ctx }
    	};

    	if (/*ability*/ ctx[0].pass !== void 0) {
    		bubbles_props.value = /*ability*/ ctx[0].pass;
    	}

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

    	const block = {
    		c: function create() {
    			create_component(bubbles.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(bubbles, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bubbles.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bubbles.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(bubbles, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(22:8) {#if ability.rating < ability.cap}",
    		ctx
    	});

    	return block;
    }

    // (23:12) <Bubbles count={maxPass} bind:value={ability.pass}>
    function create_default_slot_1$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("pass");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$4.name,
    		type: "slot",
    		source: "(23:12) <Bubbles count={maxPass} bind:value={ability.pass}>",
    		ctx
    	});

    	return block;
    }

    // (25:8) {#if maxFail > 0 && ability.rating < ability.cap}
    function create_if_block$7(ctx) {
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding_1(value) {
    		/*bubbles_value_binding_1*/ ctx[5](value);
    	}

    	let bubbles_props = {
    		count: /*maxFail*/ ctx[2],
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	};

    	if (/*ability*/ ctx[0].fail !== void 0) {
    		bubbles_props.value = /*ability*/ ctx[0].fail;
    	}

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_1));

    	const block = {
    		c: function create() {
    			create_component(bubbles.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(bubbles, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bubbles.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bubbles.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(bubbles, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(25:8) {#if maxFail > 0 && ability.rating < ability.cap}",
    		ctx
    	});

    	return block;
    }

    // (26:12) <Bubbles count={maxFail} bind:value={ability.fail}>
    function create_default_slot$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("fail");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(26:12) <Bubbles count={maxFail} bind:value={ability.fail}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
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
    	let if_block0 = /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block_1$3(ctx);
    	let if_block1 = /*maxFail*/ ctx[2] > 0 && /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block$7(ctx);

    	const block = {
    		c: function create() {
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
    			attr_dev(h20, "class", "mr-auto");
    			add_location(h20, file$b, 18, 12, 535);
    			attr_dev(button, "class", "badge btn btn-dark");
    			add_location(button, file$b, 19, 16, 592);
    			add_location(h21, file$b, 19, 12, 588);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$b, 17, 8, 501);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$b, 16, 4, 468);
    			attr_dev(div2, "class", "card text-nowrap");
    			add_location(div2, file$b, 15, 0, 432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h20);
    			append_dev(h20, t0);
    			append_dev(div0, t1);
    			append_dev(div0, h21);
    			append_dev(h21, button);
    			append_dev(button, t2);
    			append_dev(div1, t3);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t4);
    			if (if_block1) if_block1.m(div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleClick*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*ability*/ 1) && t0_value !== (t0_value = /*ability*/ ctx[0].name + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*ability*/ 1) && t2_value !== (t2_value = /*ability*/ ctx[0].rating + "")) set_data_dev(t2, t2_value);

    			if (/*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*ability*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$3(ctx);
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
    					if_block1 = create_if_block$7(ctx);
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let maxFail;
    	let maxPass;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Ability', slots, []);
    	let { ability } = $$props;

    	function handleClick(e) {
    		$$invalidate(0, ability.rating += e.shiftKey ? -1 : 1, ability);
    		if (ability.rating < 0) $$invalidate(0, ability.rating = ability.cap, ability);
    		if (ability.rating > ability.cap) $$invalidate(0, ability.rating = 0, ability);
    	}

    	const writable_props = ['ability'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Ability> was created with unknown prop '${key}'`);
    	});

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

    	$$self.$capture_state = () => ({
    		Bubbles,
    		ability,
    		handleClick,
    		maxPass,
    		maxFail
    	});

    	$$self.$inject_state = $$props => {
    		if ('ability' in $$props) $$invalidate(0, ability = $$props.ability);
    		if ('maxPass' in $$props) $$invalidate(1, maxPass = $$props.maxPass);
    		if ('maxFail' in $$props) $$invalidate(2, maxFail = $$props.maxFail);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Ability extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { ability: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ability",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ability*/ ctx[0] === undefined && !('ability' in props)) {
    			console.warn("<Ability> was created without expected prop 'ability'");
    		}
    	}

    	get ability() {
    		throw new Error("<Ability>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ability(value) {
    		throw new Error("<Ability>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\TagList.svelte generated by Svelte v3.48.0 */
    const file$a = "src\\components\\TagList.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (36:12) {:else}
    function create_else_block$3(ctx) {
    	let button;
    	let t_value = /*item*/ ctx[9] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*i*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn badge badge-dark p-2 my-1 mr-1");
    			add_location(button, file$a, 36, 12, 808);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[9] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(36:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (34:12) {#if i == editIndex}
    function create_if_block_2$1(ctx) {
    	let span;
    	let t_value = /*item*/ ctx[9] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "btn badge badge-light border border-dark p-2 my-1 mr-1");
    			add_location(span, file$a, 34, 12, 691);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[9] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(34:12) {#if i == editIndex}",
    		ctx
    	});

    	return block;
    }

    // (33:8) {#each items as item, i}
    function create_each_block$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*i*/ ctx[11] == /*editIndex*/ ctx[2]) return create_if_block_2$1;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
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
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(33:8) {#each items as item, i}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if !editing}
    function create_if_block_1$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "add";
    			attr_dev(button, "class", "btn badge badge-light border border-dark p-2 m-1");
    			add_location(button, file$a, 40, 8, 996);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*add*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(40:8) {#if !editing}",
    		ctx
    	});

    	return block;
    }

    // (44:4) {#if editing}
    function create_if_block$6(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control");
    			add_location(input_1, file$a, 44, 4, 1140);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			/*input_1_binding*/ ctx[7](input_1);
    			set_input_value(input_1, /*items*/ ctx[0][/*editIndex*/ ctx[2]]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[8]),
    					listen_dev(input_1, "blur", /*end*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items, editIndex*/ 5 && input_1.value !== /*items*/ ctx[0][/*editIndex*/ ctx[2]]) {
    				set_input_value(input_1, /*items*/ ctx[0][/*editIndex*/ ctx[2]]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[7](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(44:4) {#if editing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	let if_block0 = !/*editing*/ ctx[1] && create_if_block_1$2(ctx);
    	let if_block1 = /*editing*/ ctx[1] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "d-flex flex-wrap");
    			add_location(div0, file$a, 31, 4, 579);
    			add_location(div1, file$a, 30, 0, 568);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div1, t1);
    			if (if_block1) if_block1.m(div1, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items, editIndex, editing*/ 7) {
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
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
    					if_block0 = create_if_block_1$2(ctx);
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
    					if_block1 = create_if_block$6(ctx);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TagList', slots, []);
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

    	const writable_props = ['items'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TagList> was created with unknown prop '${key}'`);
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

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		items,
    		editing,
    		editIndex,
    		input,
    		add,
    		end
    	});

    	$$self.$inject_state = $$props => {
    		if ('items' in $$props) $$invalidate(0, items = $$props.items);
    		if ('editing' in $$props) $$invalidate(1, editing = $$props.editing);
    		if ('editIndex' in $$props) $$invalidate(2, editIndex = $$props.editIndex);
    		if ('input' in $$props) $$invalidate(3, input = $$props.input);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class TagList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TagList",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get items() {
    		throw new Error("<TagList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<TagList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Nature.svelte generated by Svelte v3.48.0 */
    const file$9 = "src\\components\\Nature.svelte";

    // (35:8) {#if nature.rating < maxNature}
    function create_if_block_1$1(ctx) {
    	let div;
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding(value) {
    		/*bubbles_value_binding*/ ctx[5](value);
    	}

    	let bubbles_props = {
    		count: /*maxPass*/ ctx[1],
    		$$slots: { default: [create_default_slot_1$3] },
    		$$scope: { ctx }
    	};

    	if (/*nature*/ ctx[0].pass !== void 0) {
    		bubbles_props.value = /*nature*/ ctx[0].pass;
    	}

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(bubbles.$$.fragment);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$9, 35, 8, 1280);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(bubbles, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bubbles.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bubbles.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(bubbles);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(35:8) {#if nature.rating < maxNature}",
    		ctx
    	});

    	return block;
    }

    // (37:12) <Bubbles count={maxPass} bind:value={nature.pass}>
    function create_default_slot_1$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("pass");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(37:12) <Bubbles count={maxPass} bind:value={nature.pass}>",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if maxFail > 0 && nature.rating < maxNature}
    function create_if_block$5(ctx) {
    	let div;
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding_1(value) {
    		/*bubbles_value_binding_1*/ ctx[6](value);
    	}

    	let bubbles_props = {
    		count: /*maxFail*/ ctx[2],
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	};

    	if (/*nature*/ ctx[0].fail !== void 0) {
    		bubbles_props.value = /*nature*/ ctx[0].fail;
    	}

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_1));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(bubbles.$$.fragment);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$9, 40, 8, 1475);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(bubbles, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bubbles.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bubbles.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(bubbles);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(40:8) {#if maxFail > 0 && nature.rating < maxNature}",
    		ctx
    	});

    	return block;
    }

    // (42:12) <Bubbles count={maxFail} bind:value={nature.fail}>
    function create_default_slot$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("fail");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(42:12) <Bubbles count={maxFail} bind:value={nature.fail}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
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
    	let span;
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
    	let if_block0 = /*nature*/ ctx[0].rating < maxNature && create_if_block_1$1(ctx);
    	let if_block1 = /*maxFail*/ ctx[2] > 0 && /*nature*/ ctx[0].rating < maxNature && create_if_block$5(ctx);

    	function taglist_items_binding(value) {
    		/*taglist_items_binding*/ ctx[7](value);
    	}

    	let taglist_props = {};

    	if (/*nature*/ ctx[0].descriptors !== void 0) {
    		taglist_props.items = /*nature*/ ctx[0].descriptors;
    	}

    	taglist = new TagList({ props: taglist_props, $$inline: true });
    	binding_callbacks.push(() => bind(taglist, 'items', taglist_items_binding));

    	const block = {
    		c: function create() {
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
    			span = element("span");
    			span.textContent = "/";
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
    			attr_dev(h20, "class", "mr-auto");
    			add_location(h20, file$9, 29, 12, 923);
    			attr_dev(button0, "class", "btn badge btn-dark");
    			add_location(button0, file$9, 30, 16, 972);
    			add_location(h21, file$9, 30, 12, 968);
    			attr_dev(span, "class", "m-1");
    			add_location(span, file$9, 31, 16, 1079);
    			add_location(h22, file$9, 31, 12, 1075);
    			attr_dev(button1, "class", "btn badge btn-dark");
    			add_location(button1, file$9, 32, 16, 1128);
    			add_location(h23, file$9, 32, 12, 1124);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$9, 28, 8, 889);
    			attr_dev(div1, "class", "mt-2");
    			add_location(div1, file$9, 44, 8, 1614);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$9, 27, 4, 856);
    			attr_dev(div3, "id", "$" + this.id);
    			attr_dev(div3, "class", "card text-nowrap");
    			add_location(div3, file$9, 26, 0, 804);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h20);
    			append_dev(div0, t1);
    			append_dev(div0, h21);
    			append_dev(h21, button0);
    			append_dev(button0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, h22);
    			append_dev(h22, span);
    			append_dev(div0, t5);
    			append_dev(div0, h23);
    			append_dev(h23, button1);
    			append_dev(button1, t6);
    			append_dev(div2, t7);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t8);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			mount_component(taglist, div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*currentClick*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*maxClick*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*nature*/ 1) && t2_value !== (t2_value = /*nature*/ ctx[0].current + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*nature*/ 1) && t6_value !== (t6_value = /*nature*/ ctx[0].maximum + "")) set_data_dev(t6, t6_value);

    			if (/*nature*/ ctx[0].rating < maxNature) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*nature*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
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

    			if (/*maxFail*/ ctx[2] > 0 && /*nature*/ ctx[0].rating < maxNature) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*maxFail, nature*/ 5) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$5(ctx);
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(taglist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(taglist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_component(taglist);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const maxNature = 7;

    function instance$9($$self, $$props, $$invalidate) {
    	let maxFail;
    	let maxPass;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Nature', slots, []);
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

    	const writable_props = ['nature'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Nature> was created with unknown prop '${key}'`);
    	});

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

    	$$self.$capture_state = () => ({
    		Bubbles,
    		TagList,
    		nature,
    		maxNature,
    		currentClick,
    		maxClick,
    		maxPass,
    		maxFail
    	});

    	$$self.$inject_state = $$props => {
    		if ('nature' in $$props) $$invalidate(0, nature = $$props.nature);
    		if ('maxPass' in $$props) $$invalidate(1, maxPass = $$props.maxPass);
    		if ('maxFail' in $$props) $$invalidate(2, maxFail = $$props.maxFail);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*nature*/ 1) {
    			$$invalidate(2, maxFail = nature.rating < 2 ? 0 : nature.rating - 1);
    		}

    		if ($$self.$$.dirty & /*nature*/ 1) {
    			$$invalidate(1, maxPass = nature.rating < 1 ? 1 : nature.rating);
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

    class Nature extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { nature: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nature",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*nature*/ ctx[0] === undefined && !('nature' in props)) {
    			console.warn("<Nature> was created without expected prop 'nature'");
    		}
    	}

    	get nature() {
    		throw new Error("<Nature>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nature(value) {
    		throw new Error("<Nature>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Abilities.svelte generated by Svelte v3.48.0 */
    const file$8 = "src\\components\\Abilities.svelte";

    function create_fragment$8(ctx) {
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
    			props: { ability: /*model*/ ctx[0].abilities.will },
    			$$inline: true
    		});

    	ability1 = new Ability({
    			props: {
    				ability: /*model*/ ctx[0].abilities.health
    			},
    			$$inline: true
    		});

    	nature = new Nature({
    			props: {
    				nature: /*model*/ ctx[0].abilities.nature
    			},
    			$$inline: true
    		});

    	ability2 = new Ability({
    			props: {
    				ability: /*model*/ ctx[0].abilities.resources
    			},
    			$$inline: true
    		});

    	ability3 = new Ability({
    			props: {
    				ability: /*model*/ ctx[0].abilities.circles
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
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
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$8, 17, 8, 454);
    			add_location(h20, file$8, 27, 20, 916);
    			attr_dev(button0, "class", "btn badge btn-light border align-self-center");
    			add_location(button0, file$8, 28, 37, 973);
    			attr_dev(h5, "class", "ml-2");
    			add_location(h5, file$8, 28, 20, 956);
    			attr_dev(button1, "class", "btn badge btn-dark");
    			add_location(button1, file$8, 29, 40, 1142);
    			attr_dev(h21, "class", "ml-auto");
    			add_location(h21, file$8, 29, 20, 1122);
    			attr_dev(div1, "class", "card-body d-flex");
    			add_location(div1, file$8, 26, 16, 864);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$8, 25, 12, 828);
    			attr_dev(h22, "class", "mr-auto");
    			add_location(h22, file$8, 34, 20, 1430);
    			attr_dev(button2, "class", "btn badge btn-dark");
    			add_location(button2, file$8, 35, 24, 1486);
    			add_location(h23, file$8, 35, 20, 1482);
    			attr_dev(div3, "class", "card-body d-flex");
    			add_location(div3, file$8, 33, 16, 1378);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$8, 32, 12, 1342);
    			attr_dev(h24, "class", "mr-auto");
    			add_location(h24, file$8, 40, 20, 1765);
    			attr_dev(button3, "class", "btn badge btn-dark");
    			add_location(button3, file$8, 41, 24, 1826);
    			add_location(h25, file$8, 41, 20, 1822);
    			attr_dev(div5, "class", "card-body d-flex");
    			add_location(div5, file$8, 39, 16, 1713);
    			attr_dev(div6, "class", "card");
    			add_location(div6, file$8, 38, 12, 1677);
    			attr_dev(div7, "class", "col-md-6");
    			add_location(div7, file$8, 22, 8, 672);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$8, 16, 4, 427);
    			attr_dev(div9, "id", "$" + this.id);
    			attr_dev(div9, "class", "container-fluid");
    			add_location(div9, file$8, 15, 0, 376);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div0);
    			mount_component(ability0, div0, null);
    			append_dev(div0, t0);
    			mount_component(ability1, div0, null);
    			append_dev(div0, t1);
    			mount_component(nature, div0, null);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			mount_component(ability2, div7, null);
    			append_dev(div7, t3);
    			mount_component(ability3, div7, null);
    			append_dev(div7, t4);
    			append_dev(div7, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h20);
    			append_dev(div1, t6);
    			append_dev(div1, h5);
    			append_dev(h5, button0);
    			append_dev(div1, t8);
    			append_dev(div1, h21);
    			append_dev(h21, button1);
    			append_dev(button1, t9);
    			append_dev(div7, t10);
    			append_dev(div7, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h22);
    			append_dev(div3, t12);
    			append_dev(div3, h23);
    			append_dev(h23, button2);
    			append_dev(button2, t13);
    			append_dev(div7, t14);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h24);
    			append_dev(div5, t16);
    			append_dev(div5, h25);
    			append_dev(h25, button3);
    			append_dev(button3, t17);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[3], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[4], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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
    			if ((!current || dirty & /*model*/ 1) && t9_value !== (t9_value = /*model*/ ctx[0].abilities.lifestyle + "")) set_data_dev(t9, t9_value);
    			if ((!current || dirty & /*model*/ 1) && t13_value !== (t13_value = /*model*/ ctx[0].abilities.might + "")) set_data_dev(t13, t13_value);
    			if ((!current || dirty & /*model*/ 1) && t17_value !== (t17_value = /*model*/ ctx[0].abilities.precedence + "")) set_data_dev(t17, t17_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(ability0.$$.fragment, local);
    			transition_in(ability1.$$.fragment, local);
    			transition_in(nature.$$.fragment, local);
    			transition_in(ability2.$$.fragment, local);
    			transition_in(ability3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(ability0.$$.fragment, local);
    			transition_out(ability1.$$.fragment, local);
    			transition_out(nature.$$.fragment, local);
    			transition_out(ability2.$$.fragment, local);
    			transition_out(ability3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			destroy_component(ability0);
    			destroy_component(ability1);
    			destroy_component(nature);
    			destroy_component(ability2);
    			destroy_component(ability3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Abilities', slots, []);
    	let { model } = $$props;

    	function increment(e, args) {
    		let val = model.abilities[args.ability] + (e.shiftKey ? -1 : 1);
    		if (val < 0) val = args.max;
    		if (val > args.max) val = 0;
    		$$invalidate(0, model.abilities[args.ability] = val, model);
    	}

    	const writable_props = ['model'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Abilities> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, model.abilities.lifestyle = 0, model);
    	const click_handler_1 = e => increment(e, { max: 99, ability: 'lifestyle' });
    	const click_handler_2 = e => increment(e, { max: 8, ability: 'might' });
    	const click_handler_3 = e => increment(e, { max: 7, ability: 'precedence' });

    	$$self.$$set = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    	};

    	$$self.$capture_state = () => ({ Ability, Nature, model, increment });

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		model,
    		increment,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class Abilities extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Abilities",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*model*/ ctx[0] === undefined && !('model' in props)) {
    			console.warn("<Abilities> was created without expected prop 'model'");
    		}
    	}

    	get model() {
    		throw new Error("<Abilities>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set model(value) {
    		throw new Error("<Abilities>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\TextArea.svelte generated by Svelte v3.48.0 */
    const file$7 = "src\\components\\TextArea.svelte";

    // (19:0) {:else}
    function create_else_block$2(ctx) {
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

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			button = element("button");
    			t1 = text(/*content*/ ctx[0]);
    			attr_dev(span, "class", "py-2 border-bottom font-weight-bold");
    			add_location(span, file$7, 20, 4, 574);
    			attr_dev(button, "class", "btn btn-light text-left align-top wrap");
    			set_style(button, "min-height", "2.5em");
    			add_location(button, file$7, 21, 4, 650);
    			attr_dev(div, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
    			add_location(div, file$7, 19, 0, 513);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append_dev(div, t0);
    			append_dev(div, button);
    			append_dev(button, t1);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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

    			if (!current || dirty & /*content*/ 1) set_data_dev(t1, /*content*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:0) {#if active}
    function create_if_block$4(ctx) {
    	let div;
    	let span;
    	let t;
    	let textarea;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t = space();
    			textarea = element("textarea");
    			attr_dev(span, "class", "py-2 border-bottom font-weight-bold");
    			add_location(span, file$7, 15, 4, 292);
    			attr_dev(textarea, "class", "flex-grow-1 form-control");
    			add_location(textarea, file$7, 16, 4, 368);
    			attr_dev(div, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
    			add_location(div, file$7, 14, 0, 231);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append_dev(div, t);
    			append_dev(div, textarea);
    			/*textarea_binding*/ ctx[5](textarea);
    			set_input_value(textarea, /*content*/ ctx[0]);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(textarea, "blur", /*blur_handler*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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

    			if (dirty & /*content*/ 1) {
    				set_input_value(textarea, /*content*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*textarea_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(14:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*active*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TextArea', slots, ['default']);
    	let { content = '' } = $$props;
    	let active = false;
    	let control;

    	afterUpdate(() => {
    		if (active) control.focus();
    	});

    	const writable_props = ['content'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TextArea> was created with unknown prop '${key}'`);
    	});

    	function textarea_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			control = $$value;
    			$$invalidate(2, control);
    		});
    	}

    	function textarea_input_handler() {
    		content = this.value;
    		$$invalidate(0, content);
    	}

    	const blur_handler = () => $$invalidate(1, active = false);
    	const click_handler = () => $$invalidate(1, active = true);

    	$$self.$$set = $$props => {
    		if ('content' in $$props) $$invalidate(0, content = $$props.content);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ afterUpdate, content, active, control });

    	$$self.$inject_state = $$props => {
    		if ('content' in $$props) $$invalidate(0, content = $$props.content);
    		if ('active' in $$props) $$invalidate(1, active = $$props.active);
    		if ('control' in $$props) $$invalidate(2, control = $$props.control);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		content,
    		active,
    		control,
    		$$scope,
    		slots,
    		textarea_binding,
    		textarea_input_handler,
    		blur_handler,
    		click_handler
    	];
    }

    class TextArea extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextArea",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get content() {
    		throw new Error("<TextArea>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<TextArea>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\TextInput.svelte generated by Svelte v3.48.0 */
    const file$6 = "src\\components\\TextInput.svelte";

    // (19:0) {:else}
    function create_else_block$1(ctx) {
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

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			button = element("button");
    			t1 = text(/*content*/ ctx[0]);
    			attr_dev(span, "class", "align-self-center text-right border-right pr-1 py-2 font-weight-bold");
    			set_style(span, "width", "4.5em");
    			add_location(span, file$6, 20, 4, 621);
    			attr_dev(button, "class", "flex-grow-1 btn btn-light text-left");
    			add_location(button, file$6, 21, 4, 752);
    			attr_dev(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
    			add_location(div, file$6, 19, 0, 558);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append_dev(div, t0);
    			append_dev(div, button);
    			append_dev(button, t1);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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

    			if (!current || dirty & /*content*/ 1) set_data_dev(t1, /*content*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:0) {#if active}
    function create_if_block$3(ctx) {
    	let div;
    	let span;
    	let t;
    	let input;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t = space();
    			input = element("input");
    			attr_dev(span, "class", "align-self-center text-right mr-1 py-2 font-weight-bold");
    			set_style(span, "width", "4.5em");
    			set_style(span, "height", "2.5em");
    			add_location(span, file$6, 15, 4, 294);
    			attr_dev(input, "class", "flex-grow-1 form-control");
    			add_location(input, file$6, 16, 4, 427);
    			attr_dev(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
    			add_location(div, file$6, 14, 0, 231);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append_dev(div, t);
    			append_dev(div, input);
    			/*input_binding*/ ctx[5](input);
    			set_input_value(input, /*content*/ ctx[0]);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[6]),
    					listen_dev(input, "blur", /*blur_handler*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*input_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(14:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*active*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TextInput', slots, ['default']);
    	let { content = '' } = $$props;
    	let active = false;
    	let control;

    	afterUpdate(() => {
    		if (active) control.focus();
    	});

    	const writable_props = ['content'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TextInput> was created with unknown prop '${key}'`);
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

    	$$self.$capture_state = () => ({ afterUpdate, content, active, control });

    	$$self.$inject_state = $$props => {
    		if ('content' in $$props) $$invalidate(0, content = $$props.content);
    		if ('active' in $$props) $$invalidate(1, active = $$props.active);
    		if ('control' in $$props) $$invalidate(2, control = $$props.control);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class TextInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextInput",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get content() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Bio.svelte generated by Svelte v3.48.0 */
    const file$5 = "src\\components\\Bio.svelte";

    // (13:16) <TextInput bind:content={model.bio.name}>
    function create_default_slot_13(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Name");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_13.name,
    		type: "slot",
    		source: "(13:16) <TextInput bind:content={model.bio.name}>",
    		ctx
    	});

    	return block;
    }

    // (14:16) <TextInput bind:content={model.bio.stock}>
    function create_default_slot_12(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Stock");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_12.name,
    		type: "slot",
    		source: "(14:16) <TextInput bind:content={model.bio.stock}>",
    		ctx
    	});

    	return block;
    }

    // (15:16) <TextInput bind:content={model.bio.classValue}>
    function create_default_slot_11(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Class");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(15:16) <TextInput bind:content={model.bio.classValue}>",
    		ctx
    	});

    	return block;
    }

    // (16:16) <TextInput bind:content={model.bio.home}>
    function create_default_slot_10(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Home");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(16:16) <TextInput bind:content={model.bio.home}>",
    		ctx
    	});

    	return block;
    }

    // (17:16) <TextInput bind:content={model.bio.raiment}>
    function create_default_slot_9$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Raiment");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9$1.name,
    		type: "slot",
    		source: "(17:16) <TextInput bind:content={model.bio.raiment}>",
    		ctx
    	});

    	return block;
    }

    // (18:16) <TextInput bind:content={model.bio.epithet}>
    function create_default_slot_8$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Epithet");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8$1.name,
    		type: "slot",
    		source: "(18:16) <TextInput bind:content={model.bio.epithet}>",
    		ctx
    	});

    	return block;
    }

    // (19:16) <TextInput bind:content={model.bio.parents}>
    function create_default_slot_7$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Parents");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7$2.name,
    		type: "slot",
    		source: "(19:16) <TextInput bind:content={model.bio.parents}>",
    		ctx
    	});

    	return block;
    }

    // (20:16) <TextInput bind:content={model.bio.mentor}>
    function create_default_slot_6$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Mentor");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6$2.name,
    		type: "slot",
    		source: "(20:16) <TextInput bind:content={model.bio.mentor}>",
    		ctx
    	});

    	return block;
    }

    // (21:16) <TextInput bind:content={model.bio.age}>
    function create_default_slot_5$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Age");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$2.name,
    		type: "slot",
    		source: "(21:16) <TextInput bind:content={model.bio.age}>",
    		ctx
    	});

    	return block;
    }

    // (22:16) <TextInput bind:content={model.bio.level}>
    function create_default_slot_4$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Level");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$2.name,
    		type: "slot",
    		source: "(22:16) <TextInput bind:content={model.bio.level}>",
    		ctx
    	});

    	return block;
    }

    // (29:16) <TextArea bind:content={model.bio.belief}>
    function create_default_slot_3$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Belief");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$2.name,
    		type: "slot",
    		source: "(29:16) <TextArea bind:content={model.bio.belief}>",
    		ctx
    	});

    	return block;
    }

    // (30:16) <TextArea bind:content={model.bio.creed}>
    function create_default_slot_2$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Creed");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$2.name,
    		type: "slot",
    		source: "(30:16) <TextArea bind:content={model.bio.creed}>",
    		ctx
    	});

    	return block;
    }

    // (31:16) <TextArea bind:content={model.bio.goal}>
    function create_default_slot_1$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Goal");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(31:16) <TextArea bind:content={model.bio.goal}>",
    		ctx
    	});

    	return block;
    }

    // (32:16) <TextArea bind:content={model.bio.instinct}>
    function create_default_slot$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Instinct");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(32:16) <TextArea bind:content={model.bio.instinct}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div6;
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
    	let div5;
    	let div4;
    	let div3;
    	let textarea0;
    	let updating_content_10;
    	let t10;
    	let textarea1;
    	let updating_content_11;
    	let t11;
    	let textarea2;
    	let updating_content_12;
    	let t12;
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

    	textinput0 = new TextInput({ props: textinput0_props, $$inline: true });
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

    	textinput1 = new TextInput({ props: textinput1_props, $$inline: true });
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

    	textinput2 = new TextInput({ props: textinput2_props, $$inline: true });
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

    	textinput3 = new TextInput({ props: textinput3_props, $$inline: true });
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

    	textinput4 = new TextInput({ props: textinput4_props, $$inline: true });
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

    	textinput5 = new TextInput({ props: textinput5_props, $$inline: true });
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

    	textinput6 = new TextInput({ props: textinput6_props, $$inline: true });
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

    	textinput7 = new TextInput({ props: textinput7_props, $$inline: true });
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

    	textinput8 = new TextInput({ props: textinput8_props, $$inline: true });
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

    	textinput9 = new TextInput({ props: textinput9_props, $$inline: true });
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

    	textarea0 = new TextArea({ props: textarea0_props, $$inline: true });
    	binding_callbacks.push(() => bind(textarea0, 'content', textarea0_content_binding));

    	function textarea1_content_binding(value) {
    		/*textarea1_content_binding*/ ctx[12](value);
    	}

    	let textarea1_props = {
    		$$slots: { default: [create_default_slot_2$2] },
    		$$scope: { ctx }
    	};

    	if (/*model*/ ctx[0].bio.creed !== void 0) {
    		textarea1_props.content = /*model*/ ctx[0].bio.creed;
    	}

    	textarea1 = new TextArea({ props: textarea1_props, $$inline: true });
    	binding_callbacks.push(() => bind(textarea1, 'content', textarea1_content_binding));

    	function textarea2_content_binding(value) {
    		/*textarea2_content_binding*/ ctx[13](value);
    	}

    	let textarea2_props = {
    		$$slots: { default: [create_default_slot_1$2] },
    		$$scope: { ctx }
    	};

    	if (/*model*/ ctx[0].bio.goal !== void 0) {
    		textarea2_props.content = /*model*/ ctx[0].bio.goal;
    	}

    	textarea2 = new TextArea({ props: textarea2_props, $$inline: true });
    	binding_callbacks.push(() => bind(textarea2, 'content', textarea2_content_binding));

    	function textarea3_content_binding(value) {
    		/*textarea3_content_binding*/ ctx[14](value);
    	}

    	let textarea3_props = {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	};

    	if (/*model*/ ctx[0].bio.instinct !== void 0) {
    		textarea3_props.content = /*model*/ ctx[0].bio.instinct;
    	}

    	textarea3 = new TextArea({ props: textarea3_props, $$inline: true });
    	binding_callbacks.push(() => bind(textarea3, 'content', textarea3_content_binding));

    	const block = {
    		c: function create() {
    			div6 = element("div");
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
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			create_component(textarea0.$$.fragment);
    			t10 = space();
    			create_component(textarea1.$$.fragment);
    			t11 = space();
    			create_component(textarea2.$$.fragment);
    			t12 = space();
    			create_component(textarea3.$$.fragment);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$5, 11, 12, 260);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$5, 10, 8, 223);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$5, 9, 4, 195);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$5, 27, 12, 1177);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$5, 26, 8, 1140);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$5, 25, 4, 1112);
    			attr_dev(div6, "id", "$" + this.id);
    			attr_dev(div6, "class", "container-fluid");
    			add_location(div6, file$5, 8, 0, 144);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			mount_component(textinput0, div0, null);
    			append_dev(div0, t0);
    			mount_component(textinput1, div0, null);
    			append_dev(div0, t1);
    			mount_component(textinput2, div0, null);
    			append_dev(div0, t2);
    			mount_component(textinput3, div0, null);
    			append_dev(div0, t3);
    			mount_component(textinput4, div0, null);
    			append_dev(div0, t4);
    			mount_component(textinput5, div0, null);
    			append_dev(div0, t5);
    			mount_component(textinput6, div0, null);
    			append_dev(div0, t6);
    			mount_component(textinput7, div0, null);
    			append_dev(div0, t7);
    			mount_component(textinput8, div0, null);
    			append_dev(div0, t8);
    			mount_component(textinput9, div0, null);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			mount_component(textarea0, div3, null);
    			append_dev(div3, t10);
    			mount_component(textarea1, div3, null);
    			append_dev(div3, t11);
    			mount_component(textarea2, div3, null);
    			append_dev(div3, t12);
    			mount_component(textarea3, div3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    		i: function intro(local) {
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
    		o: function outro(local) {
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
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

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Bio', slots, []);
    	let { model } = $$props;
    	const writable_props = ['model'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Bio> was created with unknown prop '${key}'`);
    	});

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

    	$$self.$capture_state = () => ({ TextArea, TextInput, model });

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Bio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bio",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*model*/ ctx[0] === undefined && !('model' in props)) {
    			console.warn("<Bio> was created without expected prop 'model'");
    		}
    	}

    	get model() {
    		throw new Error("<Bio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set model(value) {
    		throw new Error("<Bio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Condition.svelte generated by Svelte v3.48.0 */

    const file$4 = "src\\components\\Condition.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "border border-dark btn m-1");
    			toggle_class(button, "btn-dark", /*selected*/ ctx[0]);
    			toggle_class(button, "btn-light", !/*selected*/ ctx[0]);
    			add_location(button, file$4, 4, 0, 57);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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

    			if (dirty & /*selected*/ 1) {
    				toggle_class(button, "btn-dark", /*selected*/ ctx[0]);
    			}

    			if (dirty & /*selected*/ 1) {
    				toggle_class(button, "btn-light", !/*selected*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Condition', slots, ['default']);
    	let { selected = false } = $$props;
    	const writable_props = ['selected'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Condition> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, selected = !selected);

    	$$self.$$set = $$props => {
    		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ selected });

    	$$self.$inject_state = $$props => {
    		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selected, $$scope, slots, click_handler];
    }

    class Condition extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { selected: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Condition",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get selected() {
    		throw new Error("<Condition>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<Condition>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Conditions.svelte generated by Svelte v3.48.0 */
    const file$3 = "src\\components\\Conditions.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (59:0) {:else}
    function create_else_block(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "Conditions";
    			attr_dev(button, "class", "btn btn-light border col");
    			add_location(button, file$3, 60, 4, 3028);
    			attr_dev(div, "class", "container-fluid");
    			add_location(div, file$3, 59, 0, 2993);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(59:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#if shown}
    function create_if_block$2(ctx) {
    	let div8;
    	let div2;
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
    	let t11;
    	let div7;
    	let div6;
    	let div5;
    	let div3;
    	let h5;
    	let t13;
    	let button2;
    	let span;
    	let t15;
    	let div4;
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

    	condition0 = new Condition({ props: condition0_props, $$inline: true });
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

    	condition1 = new Condition({ props: condition1_props, $$inline: true });
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

    	condition2 = new Condition({ props: condition2_props, $$inline: true });
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

    	condition3 = new Condition({ props: condition3_props, $$inline: true });
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

    	condition4 = new Condition({ props: condition4_props, $$inline: true });
    	binding_callbacks.push(() => bind(condition4, 'selected', condition4_selected_binding));

    	function condition5_selected_binding(value) {
    		/*condition5_selected_binding*/ ctx[9](value);
    	}

    	let condition5_props = {
    		$$slots: { default: [create_default_slot_2$1] },
    		$$scope: { ctx }
    	};

    	if (/*model*/ ctx[0].conditions.injured !== void 0) {
    		condition5_props.selected = /*model*/ ctx[0].conditions.injured;
    	}

    	condition5 = new Condition({ props: condition5_props, $$inline: true });
    	binding_callbacks.push(() => bind(condition5, 'selected', condition5_selected_binding));

    	function condition6_selected_binding(value) {
    		/*condition6_selected_binding*/ ctx[10](value);
    	}

    	let condition6_props = {
    		$$slots: { default: [create_default_slot_1$1] },
    		$$scope: { ctx }
    	};

    	if (/*model*/ ctx[0].conditions.sick !== void 0) {
    		condition6_props.selected = /*model*/ ctx[0].conditions.sick;
    	}

    	condition6 = new Condition({ props: condition6_props, $$inline: true });
    	binding_callbacks.push(() => bind(condition6, 'selected', condition6_selected_binding));

    	function condition7_selected_binding(value) {
    		/*condition7_selected_binding*/ ctx[11](value);
    	}

    	let condition7_props = {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	if (/*model*/ ctx[0].conditions.dead !== void 0) {
    		condition7_props.selected = /*model*/ ctx[0].conditions.dead;
    	}

    	condition7 = new Condition({ props: condition7_props, $$inline: true });
    	binding_callbacks.push(() => bind(condition7, 'selected', condition7_selected_binding));
    	let each_value = /*help*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div2 = element("div");
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
    			t11 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div3 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Conditions";
    			t13 = space();
    			button2 = element("button");
    			span = element("span");
    			span.textContent = "✗";
    			t15 = space();
    			div4 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "card-body d-flex flex-wrap");
    			add_location(div0, file$3, 24, 8, 1152);
    			attr_dev(button0, "class", "btn badge btn-light border border-dark");
    			add_location(button0, file$3, 35, 12, 1945);
    			attr_dev(button1, "class", "btn badge btn-light border border-dark");
    			add_location(button1, file$3, 36, 12, 2057);
    			attr_dev(div1, "class", "btn-group position-topright");
    			add_location(div1, file$3, 34, 8, 1890);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$3, 23, 4, 1124);
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$3, 43, 20, 2456);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$3, 45, 24, 2613);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "close");
    			add_location(button2, file$3, 44, 20, 2517);
    			attr_dev(div3, "class", "modal-header");
    			add_location(div3, file$3, 42, 16, 2408);
    			attr_dev(div4, "class", "modal-body");
    			add_location(div4, file$3, 48, 16, 2725);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file$3, 41, 12, 2363);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file$3, 40, 8, 2307);
    			attr_dev(div7, "class", "modal fade");
    			attr_dev(div7, "tabindex", "-1");
    			toggle_class(div7, "show", /*showHelp*/ ctx[2]);
    			set_style(div7, "display", /*showHelp*/ ctx[2] ? 'block' : 'none', false);
    			add_location(div7, file$3, 39, 4, 2193);
    			attr_dev(div8, "class", "container-fluid");
    			add_location(div8, file$3, 22, 0, 1089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div2);
    			append_dev(div2, div0);
    			mount_component(condition0, div0, null);
    			append_dev(div0, t0);
    			mount_component(condition1, div0, null);
    			append_dev(div0, t1);
    			mount_component(condition2, div0, null);
    			append_dev(div0, t2);
    			mount_component(condition3, div0, null);
    			append_dev(div0, t3);
    			mount_component(condition4, div0, null);
    			append_dev(div0, t4);
    			mount_component(condition5, div0, null);
    			append_dev(div0, t5);
    			mount_component(condition6, div0, null);
    			append_dev(div0, t6);
    			mount_component(condition7, div0, null);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t9);
    			append_dev(div1, button1);
    			append_dev(div8, t11);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, h5);
    			append_dev(div3, t13);
    			append_dev(div3, button2);
    			append_dev(button2, span);
    			append_dev(div5, t15);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[13], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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

    			if (dirty & /*help*/ 8) {
    				each_value = /*help*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*showHelp*/ 4) {
    				toggle_class(div7, "show", /*showHelp*/ ctx[2]);
    			}

    			if (dirty & /*showHelp*/ 4) {
    				set_style(div7, "display", /*showHelp*/ ctx[2] ? 'block' : 'none', false);
    			}
    		},
    		i: function intro(local) {
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
    		o: function outro(local) {
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			destroy_component(condition0);
    			destroy_component(condition1);
    			destroy_component(condition2);
    			destroy_component(condition3);
    			destroy_component(condition4);
    			destroy_component(condition5);
    			destroy_component(condition6);
    			destroy_component(condition7);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(22:0) {#if shown}",
    		ctx
    	});

    	return block;
    }

    // (26:12) <Condition bind:selected={model.conditions.fresh}>
    function create_default_slot_7$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Fresh");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7$1.name,
    		type: "slot",
    		source: "(26:12) <Condition bind:selected={model.conditions.fresh}>",
    		ctx
    	});

    	return block;
    }

    // (27:12) <Condition bind:selected={model.conditions.hungry}>
    function create_default_slot_6$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Hungry and Thirsty");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6$1.name,
    		type: "slot",
    		source: "(27:12) <Condition bind:selected={model.conditions.hungry}>",
    		ctx
    	});

    	return block;
    }

    // (28:12) <Condition bind:selected={model.conditions.angry}>
    function create_default_slot_5$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Angry");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$1.name,
    		type: "slot",
    		source: "(28:12) <Condition bind:selected={model.conditions.angry}>",
    		ctx
    	});

    	return block;
    }

    // (29:12) <Condition bind:selected={model.conditions.afraid}>
    function create_default_slot_4$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Afraid");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(29:12) <Condition bind:selected={model.conditions.afraid}>",
    		ctx
    	});

    	return block;
    }

    // (30:12) <Condition bind:selected={model.conditions.exhausted}>
    function create_default_slot_3$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Exhausted");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(30:12) <Condition bind:selected={model.conditions.exhausted}>",
    		ctx
    	});

    	return block;
    }

    // (31:12) <Condition bind:selected={model.conditions.injured}>
    function create_default_slot_2$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Injured");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(31:12) <Condition bind:selected={model.conditions.injured}>",
    		ctx
    	});

    	return block;
    }

    // (32:12) <Condition bind:selected={model.conditions.sick}>
    function create_default_slot_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Sick");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(32:12) <Condition bind:selected={model.conditions.sick}>",
    		ctx
    	});

    	return block;
    }

    // (33:12) <Condition bind:selected={model.conditions.dead}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Dead");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(33:12) <Condition bind:selected={model.conditions.dead}>",
    		ctx
    	});

    	return block;
    }

    // (50:20) {#each help as x}
    function create_each_block$1(ctx) {
    	let h5;
    	let t0_value = /*x*/ ctx[16].title + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*x*/ ctx[16].text + "";
    	let t2;

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			add_location(h5, file$3, 50, 24, 2814);
    			add_location(p, file$3, 51, 24, 2858);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h5, anchor);
    			append_dev(h5, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h5);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(50:20) {#each help as x}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*shown*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Conditions', slots, []);
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

    	const writable_props = ['model'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Conditions> was created with unknown prop '${key}'`);
    	});

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

    	$$self.$capture_state = () => ({
    		character,
    		Condition,
    		model,
    		shown,
    		showHelp,
    		help
    	});

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    		if ('shown' in $$props) $$invalidate(1, shown = $$props.shown);
    		if ('showHelp' in $$props) $$invalidate(2, showHelp = $$props.showHelp);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Conditions extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Conditions",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get model() {
    		throw new Error("<Conditions>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set model(value) {
    		throw new Error("<Conditions>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\NavLink.svelte generated by Svelte v3.48.0 */

    const file$2 = "src\\components\\NavLink.svelte";

    function create_fragment$2(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "nav-item nav-link");
    			toggle_class(a, "active", /*tab*/ ctx[0] == /*tabValue*/ ctx[1]);
    			add_location(a, file$2, 5, 0, 75);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (dirty & /*tab, tabValue*/ 3) {
    				toggle_class(a, "active", /*tab*/ ctx[0] == /*tabValue*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NavLink', slots, ['default']);
    	let { tabValue } = $$props;
    	let { tab = '' } = $$props;
    	const writable_props = ['tabValue', 'tab'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NavLink> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, tab = tabValue);

    	$$self.$$set = $$props => {
    		if ('tabValue' in $$props) $$invalidate(1, tabValue = $$props.tabValue);
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ tabValue, tab });

    	$$self.$inject_state = $$props => {
    		if ('tabValue' in $$props) $$invalidate(1, tabValue = $$props.tabValue);
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tab, tabValue, $$scope, slots, click_handler];
    }

    class NavLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { tabValue: 1, tab: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NavLink",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tabValue*/ ctx[1] === undefined && !('tabValue' in props)) {
    			console.warn("<NavLink> was created without expected prop 'tabValue'");
    		}
    	}

    	get tabValue() {
    		throw new Error("<NavLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tabValue(value) {
    		throw new Error("<NavLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tab() {
    		throw new Error("<NavLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tab(value) {
    		throw new Error("<NavLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Navbar.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file$1 = "src\\components\\Navbar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    // (42:12) <NavLink bind:tab={tab} tabValue="abilities">
    function create_default_slot_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Abilities");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(42:12) <NavLink bind:tab={tab} tabValue=\\\"abilities\\\">",
    		ctx
    	});

    	return block;
    }

    // (43:12) <NavLink bind:tab={tab} tabValue="advancement">
    function create_default_slot_8(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Advancement");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(43:12) <NavLink bind:tab={tab} tabValue=\\\"advancement\\\">",
    		ctx
    	});

    	return block;
    }

    // (44:12) <NavLink bind:tab={tab} tabValue="bio">
    function create_default_slot_7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Bio");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(44:12) <NavLink bind:tab={tab} tabValue=\\\"bio\\\">",
    		ctx
    	});

    	return block;
    }

    // (45:12) <NavLink bind:tab={tab} tabValue="circles">
    function create_default_slot_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Circles");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(45:12) <NavLink bind:tab={tab} tabValue=\\\"circles\\\">",
    		ctx
    	});

    	return block;
    }

    // (46:12) <NavLink bind:tab={tab} tabValue="inventory">
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Inventory");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(46:12) <NavLink bind:tab={tab} tabValue=\\\"inventory\\\">",
    		ctx
    	});

    	return block;
    }

    // (47:12) <NavLink bind:tab={tab} tabValue="notes">
    function create_default_slot_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Notes");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(47:12) <NavLink bind:tab={tab} tabValue=\\\"notes\\\">",
    		ctx
    	});

    	return block;
    }

    // (48:12) <NavLink bind:tab={tab} tabValue="skills">
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Skills");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(48:12) <NavLink bind:tab={tab} tabValue=\\\"skills\\\">",
    		ctx
    	});

    	return block;
    }

    // (49:12) <NavLink bind:tab={tab} tabValue="spells">
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spells");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(49:12) <NavLink bind:tab={tab} tabValue=\\\"spells\\\">",
    		ctx
    	});

    	return block;
    }

    // (50:12) <NavLink bind:tab={tab} tabValue="traits">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Traits");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(50:12) <NavLink bind:tab={tab} tabValue=\\\"traits\\\">",
    		ctx
    	});

    	return block;
    }

    // (51:12) <NavLink bind:tab={tab} tabValue="wises">
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Wises");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(51:12) <NavLink bind:tab={tab} tabValue=\\\"wises\\\">",
    		ctx
    	});

    	return block;
    }

    // (55:20) {#each characters as character}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*character*/ ctx[29] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[22](/*character*/ ctx[29]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "dropdown-item");
    			add_location(button, file$1, 55, 24, 2496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button, "click", click_handler_2, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(55:20) {#each characters as character}",
    		ctx
    	});

    	return block;
    }

    // (82:0) {#if model.alert}
    function create_if_block$1(ctx) {
    	let div;
    	let strong;
    	let t_value = /*model*/ ctx[1].alert + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			t = text(t_value);
    			add_location(strong, file$1, 83, 4, 4307);
    			attr_dev(div, "class", "alert alert-static alert success btn text-center w-100");
    			add_location(div, file$1, 82, 0, 4233);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*model*/ 2 && t_value !== (t_value = /*model*/ ctx[1].alert + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(82:0) {#if model.alert}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let nav;
    	let button0;
    	let span;
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
    	let div2_style_value;
    	let t31;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;

    	function navlink0_tab_binding(value) {
    		/*navlink0_tab_binding*/ ctx[11](value);
    	}

    	let navlink0_props = {
    		tabValue: "abilities",
    		$$slots: { default: [create_default_slot_9] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink0_props.tab = /*tab*/ ctx[0];
    	}

    	navlink0 = new NavLink({ props: navlink0_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink0, 'tab', navlink0_tab_binding));

    	function navlink1_tab_binding(value) {
    		/*navlink1_tab_binding*/ ctx[12](value);
    	}

    	let navlink1_props = {
    		tabValue: "advancement",
    		$$slots: { default: [create_default_slot_8] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink1_props.tab = /*tab*/ ctx[0];
    	}

    	navlink1 = new NavLink({ props: navlink1_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink1, 'tab', navlink1_tab_binding));

    	function navlink2_tab_binding(value) {
    		/*navlink2_tab_binding*/ ctx[13](value);
    	}

    	let navlink2_props = {
    		tabValue: "bio",
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink2_props.tab = /*tab*/ ctx[0];
    	}

    	navlink2 = new NavLink({ props: navlink2_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink2, 'tab', navlink2_tab_binding));

    	function navlink3_tab_binding(value) {
    		/*navlink3_tab_binding*/ ctx[14](value);
    	}

    	let navlink3_props = {
    		tabValue: "circles",
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink3_props.tab = /*tab*/ ctx[0];
    	}

    	navlink3 = new NavLink({ props: navlink3_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink3, 'tab', navlink3_tab_binding));

    	function navlink4_tab_binding(value) {
    		/*navlink4_tab_binding*/ ctx[15](value);
    	}

    	let navlink4_props = {
    		tabValue: "inventory",
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink4_props.tab = /*tab*/ ctx[0];
    	}

    	navlink4 = new NavLink({ props: navlink4_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink4, 'tab', navlink4_tab_binding));

    	function navlink5_tab_binding(value) {
    		/*navlink5_tab_binding*/ ctx[16](value);
    	}

    	let navlink5_props = {
    		tabValue: "notes",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink5_props.tab = /*tab*/ ctx[0];
    	}

    	navlink5 = new NavLink({ props: navlink5_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink5, 'tab', navlink5_tab_binding));

    	function navlink6_tab_binding(value) {
    		/*navlink6_tab_binding*/ ctx[17](value);
    	}

    	let navlink6_props = {
    		tabValue: "skills",
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink6_props.tab = /*tab*/ ctx[0];
    	}

    	navlink6 = new NavLink({ props: navlink6_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink6, 'tab', navlink6_tab_binding));

    	function navlink7_tab_binding(value) {
    		/*navlink7_tab_binding*/ ctx[18](value);
    	}

    	let navlink7_props = {
    		tabValue: "spells",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink7_props.tab = /*tab*/ ctx[0];
    	}

    	navlink7 = new NavLink({ props: navlink7_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink7, 'tab', navlink7_tab_binding));

    	function navlink8_tab_binding(value) {
    		/*navlink8_tab_binding*/ ctx[19](value);
    	}

    	let navlink8_props = {
    		tabValue: "traits",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink8_props.tab = /*tab*/ ctx[0];
    	}

    	navlink8 = new NavLink({ props: navlink8_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink8, 'tab', navlink8_tab_binding));

    	function navlink9_tab_binding(value) {
    		/*navlink9_tab_binding*/ ctx[20](value);
    	}

    	let navlink9_props = {
    		tabValue: "wises",
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		navlink9_props.tab = /*tab*/ ctx[0];
    	}

    	navlink9 = new NavLink({ props: navlink9_props, $$inline: true });
    	binding_callbacks.push(() => bind(navlink9, 'tab', navlink9_tab_binding));
    	let each_value = /*characters*/ ctx[9];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*model*/ ctx[1].alert && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			button0 = element("button");
    			span = element("span");
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
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(span, "class", "navbar-toggler-icon");
    			add_location(span, file$1, 37, 8, 1170);
    			attr_dev(button0, "class", "navbar-toggler");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$1, 36, 4, 1086);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "nav-link dropdown-toggle");
    			toggle_class(a0, "disabled", !/*characters*/ ctx[9].length);
    			add_location(a0, file$1, 52, 16, 2154);
    			attr_dev(div0, "class", "dropdown-menu");
    			attr_dev(div0, "style", div0_style_value = `display: ${/*menu*/ ctx[5] == 'characters' ? 'block' : 'none'}`);
    			add_location(div0, file$1, 53, 16, 2326);
    			attr_dev(li0, "class", "nav-item dropdown");
    			add_location(li0, file$1, 51, 12, 2106);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-link dropdown-toggle");
    			add_location(a1, file$1, 60, 16, 2770);
    			attr_dev(button1, "class", "dropdown-item");
    			add_location(button1, file$1, 62, 20, 3001);
    			attr_dev(button2, "class", "dropdown-item");
    			add_location(button2, file$1, 63, 20, 3144);
    			attr_dev(div1, "class", "dropdown-menu");
    			attr_dev(div1, "style", div1_style_value = `display: ${/*menu*/ ctx[5] == 'mods' ? 'block' : 'none'}`);
    			add_location(div1, file$1, 61, 16, 2894);
    			attr_dev(li1, "class", "nav-item dropdown");
    			add_location(li1, file$1, 59, 12, 2722);
    			attr_dev(ul, "class", "navbar-nav mr-auto");
    			add_location(ul, file$1, 40, 8, 1327);
    			attr_dev(button3, "href", "#");
    			attr_dev(button3, "class", "dropdown-toggle btn btn-light border border-dark");
    			add_location(button3, file$1, 69, 16, 3443);
    			attr_dev(button4, "class", "dropdown-item");
    			add_location(button4, file$1, 71, 20, 3717);
    			attr_dev(button5, "class", "dropdown-item");
    			add_location(button5, file$1, 72, 20, 3802);
    			attr_dev(button6, "class", "dropdown-item");
    			add_location(button6, file$1, 73, 20, 3889);
    			attr_dev(button7, "class", "dropdown-item");
    			add_location(button7, file$1, 74, 20, 3976);
    			attr_dev(button8, "class", "dropdown-item");
    			add_location(button8, file$1, 75, 20, 4063);
    			attr_dev(div2, "class", "dropdown-menu");
    			attr_dev(div2, "style", div2_style_value = `display: ${/*menu*/ ctx[5] == 'options' ? 'block' : 'none'}`);
    			add_location(div2, file$1, 70, 16, 3607);
    			attr_dev(div3, "class", "nav-item dropdown");
    			add_location(div3, file$1, 68, 12, 3394);
    			attr_dev(div4, "class", "navbar-nav");
    			add_location(div4, file$1, 67, 8, 3356);
    			attr_dev(div5, "id", "$" + this.id + "_nav");
    			attr_dev(div5, "class", "collapse navbar-collapse");
    			set_style(div5, "display", /*navDisplay*/ ctx[4], false);
    			add_location(div5, file$1, 39, 4, 1232);
    			attr_dev(nav, "class", "navbar navbar-expand-md navbar-light bg-light");
    			add_location(nav, file$1, 35, 0, 1021);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, button0);
    			append_dev(button0, span);
    			append_dev(nav, t0);
    			append_dev(nav, div5);
    			append_dev(div5, ul);
    			mount_component(navlink0, ul, null);
    			append_dev(ul, t1);
    			mount_component(navlink1, ul, null);
    			append_dev(ul, t2);
    			mount_component(navlink2, ul, null);
    			append_dev(ul, t3);
    			mount_component(navlink3, ul, null);
    			append_dev(ul, t4);
    			mount_component(navlink4, ul, null);
    			append_dev(ul, t5);
    			mount_component(navlink5, ul, null);
    			append_dev(ul, t6);
    			mount_component(navlink6, ul, null);
    			append_dev(ul, t7);
    			mount_component(navlink7, ul, null);
    			append_dev(ul, t8);
    			mount_component(navlink8, ul, null);
    			append_dev(ul, t9);
    			mount_component(navlink9, ul, null);
    			append_dev(ul, t10);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(li0, t12);
    			append_dev(li0, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(ul, t13);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(li1, t15);
    			append_dev(li1, div1);
    			append_dev(div1, button1);
    			append_dev(div1, t17);
    			append_dev(div1, button2);
    			append_dev(div5, t19);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, button3);
    			append_dev(div3, t21);
    			append_dev(div3, div2);
    			append_dev(div2, button4);
    			append_dev(div2, t23);
    			append_dev(div2, button5);
    			append_dev(div2, t25);
    			append_dev(div2, button6);
    			append_dev(div2, t27);
    			append_dev(div2, button7);
    			append_dev(div2, t29);
    			append_dev(div2, button8);
    			insert_dev(target, t31, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[10], false, false, false),
    					listen_dev(a0, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(a0, "click", /*click_handler_1*/ ctx[21], false, false, false),
    					listen_dev(a1, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(a1, "click", /*click_handler_3*/ ctx[23], false, false, false),
    					listen_dev(button1, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[24], false, false, false),
    					listen_dev(button2, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button2, "click", /*click_handler_5*/ ctx[25], false, false, false),
    					listen_dev(button3, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button3, "click", /*click_handler_6*/ ctx[26], false, false, false),
    					listen_dev(button4, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button5, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button6, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button7, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button8, "blur", /*clearMenu*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const navlink0_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab && dirty[0] & /*tab*/ 1) {
    				updating_tab = true;
    				navlink0_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab = false);
    			}

    			navlink0.$set(navlink0_changes);
    			const navlink1_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_1 && dirty[0] & /*tab*/ 1) {
    				updating_tab_1 = true;
    				navlink1_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_1 = false);
    			}

    			navlink1.$set(navlink1_changes);
    			const navlink2_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_2 && dirty[0] & /*tab*/ 1) {
    				updating_tab_2 = true;
    				navlink2_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_2 = false);
    			}

    			navlink2.$set(navlink2_changes);
    			const navlink3_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink3_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_3 && dirty[0] & /*tab*/ 1) {
    				updating_tab_3 = true;
    				navlink3_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_3 = false);
    			}

    			navlink3.$set(navlink3_changes);
    			const navlink4_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink4_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_4 && dirty[0] & /*tab*/ 1) {
    				updating_tab_4 = true;
    				navlink4_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_4 = false);
    			}

    			navlink4.$set(navlink4_changes);
    			const navlink5_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink5_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_5 && dirty[0] & /*tab*/ 1) {
    				updating_tab_5 = true;
    				navlink5_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_5 = false);
    			}

    			navlink5.$set(navlink5_changes);
    			const navlink6_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink6_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_6 && dirty[0] & /*tab*/ 1) {
    				updating_tab_6 = true;
    				navlink6_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_6 = false);
    			}

    			navlink6.$set(navlink6_changes);
    			const navlink7_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink7_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_7 && dirty[0] & /*tab*/ 1) {
    				updating_tab_7 = true;
    				navlink7_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_7 = false);
    			}

    			navlink7.$set(navlink7_changes);
    			const navlink8_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink8_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_8 && dirty[0] & /*tab*/ 1) {
    				updating_tab_8 = true;
    				navlink8_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_8 = false);
    			}

    			navlink8.$set(navlink8_changes);
    			const navlink9_changes = {};

    			if (dirty[1] & /*$$scope*/ 2) {
    				navlink9_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_tab_9 && dirty[0] & /*tab*/ 1) {
    				updating_tab_9 = true;
    				navlink9_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab_9 = false);
    			}

    			navlink9.$set(navlink9_changes);

    			if (dirty[0] & /*clearMenu, changeCharacter, characters*/ 580) {
    				each_value = /*characters*/ ctx[9];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty[0] & /*menu*/ 32 && div0_style_value !== (div0_style_value = `display: ${/*menu*/ ctx[5] == 'characters' ? 'block' : 'none'}`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (!current || dirty[0] & /*menu*/ 32 && div1_style_value !== (div1_style_value = `display: ${/*menu*/ ctx[5] == 'mods' ? 'block' : 'none'}`)) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			if (!current || dirty[0] & /*menu*/ 32 && div2_style_value !== (div2_style_value = `display: ${/*menu*/ ctx[5] == 'options' ? 'block' : 'none'}`)) {
    				attr_dev(div2, "style", div2_style_value);
    			}

    			if (dirty[0] & /*navDisplay*/ 16) {
    				set_style(div5, "display", /*navDisplay*/ ctx[4], false);
    			}

    			if (/*model*/ ctx[1].alert) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
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
    		o: function outro(local) {
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
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
    			if (detaching) detach_dev(t31);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	let { model = character() } = $$props;
    	let { changeCharacter = () => 0 } = $$props;
    	let { changeMod = () => 0 } = $$props;
    	let { tab = 'bio' } = $$props;
    	let isOpen = false;
    	let navDisplay = 'none';
    	let menu = '';

    	function clearMenu(e) {
    		console.log(e.relatedTarget);
    		if (e.relatedTarget?.className.includes('dropdown-item')) return;
    		$$invalidate(5, menu = '');
    	}

    	function setMenu(item) {
    		$$invalidate(5, menu = item);
    		console.log('menu = ' + menu);
    	}

    	function toggleNav() {
    		$$invalidate(4, navDisplay = navDisplay == 'none' ? 'block' : 'none');
    	}

    	let characters = [...new Array(window.localStorage.length)].map((x, i) => window.localStorage.key(i));
    	characters.sort((a, b) => a.localeCompare(b));
    	let saved = characters.find(x => x == model.bio.name) != null;
    	if (saved) localStorage.setItem(model.bio.name, JSON.stringify(model));
    	const writable_props = ['model', 'changeCharacter', 'changeMod', 'tab'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => toggleNav();

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

    	const click_handler_1 = () => setMenu('characters');
    	const click_handler_2 = character => changeCharacter(JSON.parse(localStorage[character]));
    	const click_handler_3 = () => setMenu('mods');
    	const click_handler_4 = () => changeMod('colonialMarines');
    	const click_handler_5 = () => changeMod('torchbearer');
    	const click_handler_6 = () => setMenu('options');

    	$$self.$$set = $$props => {
    		if ('model' in $$props) $$invalidate(1, model = $$props.model);
    		if ('changeCharacter' in $$props) $$invalidate(2, changeCharacter = $$props.changeCharacter);
    		if ('changeMod' in $$props) $$invalidate(3, changeMod = $$props.changeMod);
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    	};

    	$$self.$capture_state = () => ({
    		character,
    		NavLink,
    		model,
    		changeCharacter,
    		changeMod,
    		tab,
    		isOpen,
    		navDisplay,
    		menu,
    		clearMenu,
    		setMenu,
    		toggleNav,
    		characters,
    		saved
    	});

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(1, model = $$props.model);
    		if ('changeCharacter' in $$props) $$invalidate(2, changeCharacter = $$props.changeCharacter);
    		if ('changeMod' in $$props) $$invalidate(3, changeMod = $$props.changeMod);
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    		if ('isOpen' in $$props) isOpen = $$props.isOpen;
    		if ('navDisplay' in $$props) $$invalidate(4, navDisplay = $$props.navDisplay);
    		if ('menu' in $$props) $$invalidate(5, menu = $$props.menu);
    		if ('characters' in $$props) $$invalidate(9, characters = $$props.characters);
    		if ('saved' in $$props) saved = $$props.saved;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		tab,
    		model,
    		changeCharacter,
    		changeMod,
    		navDisplay,
    		menu,
    		clearMenu,
    		setMenu,
    		toggleNav,
    		characters,
    		click_handler,
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
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6
    	];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				model: 1,
    				changeCharacter: 2,
    				changeMod: 3,
    				tab: 0
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get model() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set model(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get changeCharacter() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set changeCharacter(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get changeMod() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set changeMod(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tab() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tab(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */
    const file = "src\\App.svelte";

    // (36:26) 
    function create_if_block_9(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(36:26) ",
    		ctx
    	});

    	return block;
    }

    // (35:27) 
    function create_if_block_8(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(35:27) ",
    		ctx
    	});

    	return block;
    }

    // (34:27) 
    function create_if_block_7(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(34:27) ",
    		ctx
    	});

    	return block;
    }

    // (33:27) 
    function create_if_block_6(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(33:27) ",
    		ctx
    	});

    	return block;
    }

    // (32:26) 
    function create_if_block_5(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(32:26) ",
    		ctx
    	});

    	return block;
    }

    // (31:30) 
    function create_if_block_4(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(31:30) ",
    		ctx
    	});

    	return block;
    }

    // (30:28) 
    function create_if_block_3(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(30:28) ",
    		ctx
    	});

    	return block;
    }

    // (28:24) 
    function create_if_block_2(ctx) {
    	let bio;
    	let current;

    	bio = new Bio({
    			props: { model: /*model*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(bio.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(bio, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bio.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bio.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(bio, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(28:24) ",
    		ctx
    	});

    	return block;
    }

    // (27:32) 
    function create_if_block_1(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(27:32) ",
    		ctx
    	});

    	return block;
    }

    // (25:1) {#if tab == 'abilities'}
    function create_if_block(ctx) {
    	let abilities;
    	let current;

    	abilities = new Abilities({
    			props: { model: /*model*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(abilities.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(abilities, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(abilities.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(abilities.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(abilities, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(25:1) {#if tab == 'abilities'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link;
    	let t0;
    	let main;
    	let navbar;
    	let updating_tab;
    	let t1;
    	let conditions;
    	let t2;
    	let current_block_type_index;
    	let if_block;
    	let current;

    	function navbar_tab_binding(value) {
    		/*navbar_tab_binding*/ ctx[2](value);
    	}

    	let navbar_props = { model: /*model*/ ctx[1] };

    	if (/*tab*/ ctx[0] !== void 0) {
    		navbar_props.tab = /*tab*/ ctx[0];
    	}

    	navbar = new Navbar({ props: navbar_props, $$inline: true });
    	binding_callbacks.push(() => bind(navbar, 'tab', navbar_tab_binding));

    	conditions = new Conditions({
    			props: { model: /*model*/ ctx[1] },
    			$$inline: true
    		});

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

    	function select_block_type(ctx, dirty) {
    		if (/*tab*/ ctx[0] == 'abilities') return 0;
    		if (/*tab*/ ctx[0] == 'advancement') return 1;
    		if (/*tab*/ ctx[0] == 'bio') return 2;
    		if (/*tab*/ ctx[0] == 'circles') return 3;
    		if (/*tab*/ ctx[0] == 'inventory') return 4;
    		if (/*tab*/ ctx[0] == 'notes') return 5;
    		if (/*tab*/ ctx[0] == 'skills') return 6;
    		if (/*tab*/ ctx[0] == 'spells') return 7;
    		if (/*tab*/ ctx[0] == 'traits') return 8;
    		if (/*tab*/ ctx[0] == 'wises') return 9;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t1 = space();
    			create_component(conditions.$$.fragment);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css");
    			attr_dev(link, "integrity", "sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh");
    			attr_dev(link, "crossorigin", "anonymous");
    			add_location(link, file, 17, 1, 382);
    			attr_dev(main, "id", "app");
    			add_location(main, file, 20, 0, 610);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t1);
    			mount_component(conditions, main, null);
    			append_dev(main, t2);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(main, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const navbar_changes = {};

    			if (!updating_tab && dirty & /*tab*/ 1) {
    				updating_tab = true;
    				navbar_changes.tab = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tab = false);
    			}

    			navbar.$set(navbar_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(main, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(conditions.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(conditions.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(conditions);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let model = character();
    	let tab = 'bio';

    	function changeTab(newTab) {
    		$$invalidate(0, tab = newTab);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function navbar_tab_binding(value) {
    		tab = value;
    		$$invalidate(0, tab);
    	}

    	$$self.$capture_state = () => ({
    		character,
    		Abilities,
    		Bio,
    		Conditions,
    		Navbar,
    		model,
    		tab,
    		changeTab
    	});

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(1, model = $$props.model);
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tab, model, navbar_tab_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: { }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
