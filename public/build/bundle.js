
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

    /* src\components\Navbar.svelte generated by Svelte v3.48.0 */

    const { console: console_1$1 } = globals;
    const file$3 = "src\\components\\Navbar.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (58:20) {#each characters as character}
    function create_each_block$1(ctx) {
    	let button;
    	let t_value = /*character*/ ctx[19] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[12](/*character*/ ctx[19]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "dropdown-item");
    			add_location(button, file$3, 58, 24, 2818);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "blur", /*clearMenu*/ ctx[5], false, false, false),
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(58:20) {#each characters as character}",
    		ctx
    	});

    	return block;
    }

    // (85:0) {#if model.alert}
    function create_if_block$1(ctx) {
    	let div;
    	let strong;
    	let t_value = /*model*/ ctx[0].alert + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			t = text(t_value);
    			add_location(strong, file$3, 86, 4, 4629);
    			attr_dev(div, "class", "alert alert-static alert success btn text-center w-100");
    			add_location(div, file$3, 85, 0, 4555);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*model*/ 1 && t_value !== (t_value = /*model*/ ctx[0].alert + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(85:0) {#if model.alert}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let nav;
    	let button0;
    	let span;
    	let t0;
    	let div5;
    	let ul;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let a2;
    	let t6;
    	let a3;
    	let t8;
    	let a4;
    	let t10;
    	let a5;
    	let t12;
    	let a6;
    	let t14;
    	let a7;
    	let t16;
    	let a8;
    	let t18;
    	let a9;
    	let t20;
    	let li0;
    	let a10;
    	let t22;
    	let div0;
    	let div0_style_value;
    	let t23;
    	let li1;
    	let a11;
    	let t25;
    	let div1;
    	let button1;
    	let t27;
    	let button2;
    	let div1_style_value;
    	let t29;
    	let div4;
    	let div3;
    	let button3;
    	let t31;
    	let div2;
    	let button4;
    	let t33;
    	let button5;
    	let t35;
    	let button6;
    	let t37;
    	let button7;
    	let t39;
    	let button8;
    	let div2_style_value;
    	let t41;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let each_value = /*characters*/ ctx[8];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	let if_block = /*model*/ ctx[0].alert && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			button0 = element("button");
    			span = element("span");
    			t0 = space();
    			div5 = element("div");
    			ul = element("ul");
    			a0 = element("a");
    			a0.textContent = "Abilities";
    			t2 = space();
    			a1 = element("a");
    			a1.textContent = "Advancement";
    			t4 = space();
    			a2 = element("a");
    			a2.textContent = "Bio";
    			t6 = space();
    			a3 = element("a");
    			a3.textContent = "Circles";
    			t8 = space();
    			a4 = element("a");
    			a4.textContent = "Inventory";
    			t10 = space();
    			a5 = element("a");
    			a5.textContent = "Notes";
    			t12 = space();
    			a6 = element("a");
    			a6.textContent = "Skills";
    			t14 = space();
    			a7 = element("a");
    			a7.textContent = "Spells";
    			t16 = space();
    			a8 = element("a");
    			a8.textContent = "Traits";
    			t18 = space();
    			a9 = element("a");
    			a9.textContent = "Wises";
    			t20 = space();
    			li0 = element("li");
    			a10 = element("a");
    			a10.textContent = "Characters";
    			t22 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t23 = space();
    			li1 = element("li");
    			a11 = element("a");
    			a11.textContent = "Mods";
    			t25 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.textContent = "Colonial Marines";
    			t27 = space();
    			button2 = element("button");
    			button2.textContent = "Torchbearer";
    			t29 = space();
    			div4 = element("div");
    			div3 = element("div");
    			button3 = element("button");
    			button3.textContent = "Options";
    			t31 = space();
    			div2 = element("div");
    			button4 = element("button");
    			button4.textContent = "Save";
    			t33 = space();
    			button5 = element("button");
    			button5.textContent = "Export";
    			t35 = space();
    			button6 = element("button");
    			button6.textContent = "Import";
    			t37 = space();
    			button7 = element("button");
    			button7.textContent = "Delete";
    			t39 = space();
    			button8 = element("button");
    			button8.textContent = "Delete all";
    			t41 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(span, "class", "navbar-toggler-icon");
    			add_location(span, file$3, 40, 8, 1222);
    			attr_dev(button0, "class", "navbar-toggler");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$3, 39, 4, 1138);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "nav-item nav-link");
    			toggle_class(a0, "active", /*model*/ ctx[0].tab == 'abilities');
    			add_location(a0, file$3, 44, 12, 1424);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-item nav-link");
    			toggle_class(a1, "active", /*model*/ ctx[0].tab == 'advancement');
    			add_location(a1, file$3, 45, 12, 1529);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "nav-item nav-link");
    			toggle_class(a2, "active", /*model*/ ctx[0].tab == 'bio');
    			add_location(a2, file$3, 46, 12, 1638);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "nav-item nav-link");
    			toggle_class(a3, "active", /*model*/ ctx[0].tab == 'circles');
    			add_location(a3, file$3, 47, 12, 1731);
    			attr_dev(a4, "href", "#");
    			attr_dev(a4, "class", "nav-item nav-link");
    			toggle_class(a4, "active", /*model*/ ctx[0].tab == 'inventory');
    			add_location(a4, file$3, 48, 12, 1832);
    			attr_dev(a5, "href", "#");
    			attr_dev(a5, "class", "nav-item nav-link");
    			toggle_class(a5, "active", /*model*/ ctx[0].tab == 'notes');
    			add_location(a5, file$3, 49, 12, 1937);
    			attr_dev(a6, "href", "#");
    			attr_dev(a6, "class", "nav-item nav-link");
    			toggle_class(a6, "active", /*model*/ ctx[0].tab == 'skills');
    			add_location(a6, file$3, 50, 12, 2034);
    			attr_dev(a7, "href", "#");
    			attr_dev(a7, "class", "nav-item nav-link");
    			toggle_class(a7, "active", /*model*/ ctx[0].tab == 'spells');
    			add_location(a7, file$3, 51, 12, 2133);
    			attr_dev(a8, "href", "#");
    			attr_dev(a8, "class", "nav-item nav-link");
    			toggle_class(a8, "active", /*model*/ ctx[0].tab == 'traits');
    			add_location(a8, file$3, 52, 12, 2232);
    			attr_dev(a9, "href", "#");
    			attr_dev(a9, "class", "nav-item nav-link");
    			toggle_class(a9, "active", /*model*/ ctx[0].tab == 'wises');
    			add_location(a9, file$3, 53, 12, 2331);
    			attr_dev(a10, "href", "#");
    			attr_dev(a10, "class", "nav-link dropdown-toggle");
    			toggle_class(a10, "disabled", !/*characters*/ ctx[8].length);
    			add_location(a10, file$3, 55, 16, 2476);
    			attr_dev(div0, "class", "dropdown-menu");
    			attr_dev(div0, "style", div0_style_value = `display: ${/*menu*/ ctx[4] == 'characters' ? 'block' : 'none'}`);
    			add_location(div0, file$3, 56, 16, 2648);
    			attr_dev(li0, "class", "nav-item dropdown");
    			add_location(li0, file$3, 54, 12, 2428);
    			attr_dev(a11, "href", "#");
    			attr_dev(a11, "class", "nav-link dropdown-toggle");
    			add_location(a11, file$3, 63, 16, 3092);
    			attr_dev(button1, "class", "dropdown-item");
    			add_location(button1, file$3, 65, 20, 3323);
    			attr_dev(button2, "class", "dropdown-item");
    			add_location(button2, file$3, 66, 20, 3466);
    			attr_dev(div1, "class", "dropdown-menu");
    			attr_dev(div1, "style", div1_style_value = `display: ${/*menu*/ ctx[4] == 'mods' ? 'block' : 'none'}`);
    			add_location(div1, file$3, 64, 16, 3216);
    			attr_dev(li1, "class", "nav-item dropdown");
    			add_location(li1, file$3, 62, 12, 3044);
    			attr_dev(ul, "class", "navbar-nav mr-auto");
    			add_location(ul, file$3, 43, 8, 1379);
    			attr_dev(button3, "href", "#");
    			attr_dev(button3, "class", "dropdown-toggle btn btn-light border border-dark");
    			add_location(button3, file$3, 72, 16, 3765);
    			attr_dev(button4, "class", "dropdown-item");
    			add_location(button4, file$3, 74, 20, 4039);
    			attr_dev(button5, "class", "dropdown-item");
    			add_location(button5, file$3, 75, 20, 4124);
    			attr_dev(button6, "class", "dropdown-item");
    			add_location(button6, file$3, 76, 20, 4211);
    			attr_dev(button7, "class", "dropdown-item");
    			add_location(button7, file$3, 77, 20, 4298);
    			attr_dev(button8, "class", "dropdown-item");
    			add_location(button8, file$3, 78, 20, 4385);
    			attr_dev(div2, "class", "dropdown-menu");
    			attr_dev(div2, "style", div2_style_value = `display: ${/*menu*/ ctx[4] == 'options' ? 'block' : 'none'}`);
    			add_location(div2, file$3, 73, 16, 3929);
    			attr_dev(div3, "class", "nav-item dropdown");
    			add_location(div3, file$3, 71, 12, 3716);
    			attr_dev(div4, "class", "navbar-nav");
    			add_location(div4, file$3, 70, 8, 3678);
    			attr_dev(div5, "id", "$" + this.id + "_nav");
    			attr_dev(div5, "class", "collapse navbar-collapse");
    			set_style(div5, "display", /*navDisplay*/ ctx[3], false);
    			add_location(div5, file$3, 42, 4, 1284);
    			attr_dev(nav, "class", "navbar navbar-expand-md navbar-light bg-light");
    			add_location(nav, file$3, 38, 0, 1073);
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
    			append_dev(ul, a0);
    			append_dev(ul, t2);
    			append_dev(ul, a1);
    			append_dev(ul, t4);
    			append_dev(ul, a2);
    			append_dev(ul, t6);
    			append_dev(ul, a3);
    			append_dev(ul, t8);
    			append_dev(ul, a4);
    			append_dev(ul, t10);
    			append_dev(ul, a5);
    			append_dev(ul, t12);
    			append_dev(ul, a6);
    			append_dev(ul, t14);
    			append_dev(ul, a7);
    			append_dev(ul, t16);
    			append_dev(ul, a8);
    			append_dev(ul, t18);
    			append_dev(ul, a9);
    			append_dev(ul, t20);
    			append_dev(ul, li0);
    			append_dev(li0, a10);
    			append_dev(li0, t22);
    			append_dev(li0, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(ul, t23);
    			append_dev(ul, li1);
    			append_dev(li1, a11);
    			append_dev(li1, t25);
    			append_dev(li1, div1);
    			append_dev(div1, button1);
    			append_dev(div1, t27);
    			append_dev(div1, button2);
    			append_dev(div5, t29);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, button3);
    			append_dev(div3, t31);
    			append_dev(div3, div2);
    			append_dev(div2, button4);
    			append_dev(div2, t33);
    			append_dev(div2, button5);
    			append_dev(div2, t35);
    			append_dev(div2, button6);
    			append_dev(div2, t37);
    			append_dev(div2, button7);
    			append_dev(div2, t39);
    			append_dev(div2, button8);
    			insert_dev(target, t41, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[10], false, false, false),
    					listen_dev(a10, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(a10, "click", /*click_handler_1*/ ctx[11], false, false, false),
    					listen_dev(a11, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(a11, "click", /*click_handler_3*/ ctx[13], false, false, false),
    					listen_dev(button1, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[14], false, false, false),
    					listen_dev(button2, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button2, "click", /*click_handler_5*/ ctx[15], false, false, false),
    					listen_dev(button3, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button3, "click", /*click_handler_6*/ ctx[16], false, false, false),
    					listen_dev(button4, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button5, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button6, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button7, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button8, "blur", /*clearMenu*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*model*/ 1) {
    				toggle_class(a0, "active", /*model*/ ctx[0].tab == 'abilities');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a1, "active", /*model*/ ctx[0].tab == 'advancement');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a2, "active", /*model*/ ctx[0].tab == 'bio');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a3, "active", /*model*/ ctx[0].tab == 'circles');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a4, "active", /*model*/ ctx[0].tab == 'inventory');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a5, "active", /*model*/ ctx[0].tab == 'notes');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a6, "active", /*model*/ ctx[0].tab == 'skills');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a7, "active", /*model*/ ctx[0].tab == 'spells');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a8, "active", /*model*/ ctx[0].tab == 'traits');
    			}

    			if (dirty & /*model*/ 1) {
    				toggle_class(a9, "active", /*model*/ ctx[0].tab == 'wises');
    			}

    			if (dirty & /*clearMenu, changeCharacter, JSON, localStorage, characters*/ 290) {
    				each_value = /*characters*/ ctx[8];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*menu*/ 16 && div0_style_value !== (div0_style_value = `display: ${/*menu*/ ctx[4] == 'characters' ? 'block' : 'none'}`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*menu*/ 16 && div1_style_value !== (div1_style_value = `display: ${/*menu*/ ctx[4] == 'mods' ? 'block' : 'none'}`)) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			if (dirty & /*menu*/ 16 && div2_style_value !== (div2_style_value = `display: ${/*menu*/ ctx[4] == 'options' ? 'block' : 'none'}`)) {
    				attr_dev(div2, "style", div2_style_value);
    			}

    			if (dirty & /*navDisplay*/ 8) {
    				set_style(div5, "display", /*navDisplay*/ ctx[3], false);
    			}

    			if (/*model*/ ctx[0].alert) {
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
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t41);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots('Navbar', slots, []);
    	let { model = character() } = $$props;
    	let { changeCharacter = () => 0 } = $$props;
    	let { changeMod = () => 0 } = $$props;
    	let { changeTab = () => 0 } = $$props;
    	let isOpen = false;
    	let navDisplay = 'none';
    	let menu = '';

    	function clearMenu(e) {
    		console.log(e.relatedTarget);
    		if (e.relatedTarget?.className.includes('dropdown-item')) return;
    		$$invalidate(4, menu = '');
    	}

    	function handleUpdate(event) {
    		isOpen = event.detail.isOpen;
    	}

    	function setMenu(item) {
    		$$invalidate(4, menu = item);
    		console.log('menu = ' + menu);
    	}

    	function toggleNav() {
    		$$invalidate(3, navDisplay = navDisplay == 'none' ? 'block' : 'none');
    	}

    	let characters = [...new Array(window.localStorage.length)].map((x, i) => window.localStorage.key(i));
    	characters.sort((a, b) => a.localeCompare(b));
    	const writable_props = ['model', 'changeCharacter', 'changeMod', 'changeTab'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => toggleNav();
    	const click_handler_1 = () => setMenu('characters');
    	const click_handler_2 = character => changeCharacter(JSON.parse(localStorage[character]));
    	const click_handler_3 = () => setMenu('mods');
    	const click_handler_4 = () => changeMod('colonialMarines');
    	const click_handler_5 = () => changeMod('torchbearer');
    	const click_handler_6 = () => setMenu('options');

    	$$self.$$set = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    		if ('changeCharacter' in $$props) $$invalidate(1, changeCharacter = $$props.changeCharacter);
    		if ('changeMod' in $$props) $$invalidate(2, changeMod = $$props.changeMod);
    		if ('changeTab' in $$props) $$invalidate(9, changeTab = $$props.changeTab);
    	};

    	$$self.$capture_state = () => ({
    		character,
    		model,
    		changeCharacter,
    		changeMod,
    		changeTab,
    		isOpen,
    		navDisplay,
    		menu,
    		clearMenu,
    		handleUpdate,
    		setMenu,
    		toggleNav,
    		characters
    	});

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    		if ('changeCharacter' in $$props) $$invalidate(1, changeCharacter = $$props.changeCharacter);
    		if ('changeMod' in $$props) $$invalidate(2, changeMod = $$props.changeMod);
    		if ('changeTab' in $$props) $$invalidate(9, changeTab = $$props.changeTab);
    		if ('isOpen' in $$props) isOpen = $$props.isOpen;
    		if ('navDisplay' in $$props) $$invalidate(3, navDisplay = $$props.navDisplay);
    		if ('menu' in $$props) $$invalidate(4, menu = $$props.menu);
    		if ('characters' in $$props) $$invalidate(8, characters = $$props.characters);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		model,
    		changeCharacter,
    		changeMod,
    		navDisplay,
    		menu,
    		clearMenu,
    		setMenu,
    		toggleNav,
    		characters,
    		changeTab,
    		click_handler,
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

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			model: 0,
    			changeCharacter: 1,
    			changeMod: 2,
    			changeTab: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$3.name
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

    	get changeTab() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set changeTab(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Condition.svelte generated by Svelte v3.48.0 */

    const file$2 = "src\\components\\Condition.svelte";

    function create_fragment$2(ctx) {
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
    			add_location(button, file$2, 4, 0, 57);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { selected: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Condition",
    			options,
    			id: create_fragment$2.name
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

    const { console: console_1 } = globals;
    const file$1 = "src\\components\\Conditions.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (61:0) {:else}
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
    			add_location(button, file$1, 62, 4, 3055);
    			attr_dev(div, "class", "container-fluid");
    			add_location(div, file$1, 61, 0, 3020);
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
    		source: "(61:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (24:0) {#if shown}
    function create_if_block(ctx) {
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
    		$$slots: { default: [create_default_slot_7] },
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
    		$$slots: { default: [create_default_slot_6] },
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
    		$$slots: { default: [create_default_slot_5] },
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
    		$$slots: { default: [create_default_slot_4] },
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
    		$$slots: { default: [create_default_slot_3] },
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
    		$$slots: { default: [create_default_slot_2] },
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
    		$$slots: { default: [create_default_slot_1] },
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
    		$$slots: { default: [create_default_slot] },
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
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			add_location(div0, file$1, 26, 8, 1179);
    			attr_dev(button0, "class", "btn badge btn-light border border-dark");
    			add_location(button0, file$1, 37, 12, 1972);
    			attr_dev(button1, "class", "btn badge btn-light border border-dark");
    			add_location(button1, file$1, 38, 12, 2084);
    			attr_dev(div1, "class", "btn-group position-topright");
    			add_location(div1, file$1, 36, 8, 1917);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$1, 25, 4, 1151);
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$1, 45, 20, 2483);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$1, 47, 24, 2640);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "close");
    			add_location(button2, file$1, 46, 20, 2544);
    			attr_dev(div3, "class", "modal-header");
    			add_location(div3, file$1, 44, 16, 2435);
    			attr_dev(div4, "class", "modal-body");
    			add_location(div4, file$1, 50, 16, 2752);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file$1, 43, 12, 2390);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file$1, 42, 8, 2334);
    			attr_dev(div7, "class", "modal fade");
    			attr_dev(div7, "tabindex", "-1");
    			toggle_class(div7, "show", /*showHelp*/ ctx[2]);
    			set_style(div7, "display", /*showHelp*/ ctx[2] ? 'block' : 'none', false);
    			add_location(div7, file$1, 41, 4, 2220);
    			attr_dev(div8, "class", "container-fluid");
    			add_location(div8, file$1, 24, 0, 1116);
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
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(24:0) {#if shown}",
    		ctx
    	});

    	return block;
    }

    // (28:12) <Condition bind:selected={model.conditions.fresh}>
    function create_default_slot_7(ctx) {
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
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(28:12) <Condition bind:selected={model.conditions.fresh}>",
    		ctx
    	});

    	return block;
    }

    // (29:12) <Condition bind:selected={model.conditions.hungry}>
    function create_default_slot_6(ctx) {
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
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(29:12) <Condition bind:selected={model.conditions.hungry}>",
    		ctx
    	});

    	return block;
    }

    // (30:12) <Condition bind:selected={model.conditions.angry}>
    function create_default_slot_5(ctx) {
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
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(30:12) <Condition bind:selected={model.conditions.angry}>",
    		ctx
    	});

    	return block;
    }

    // (31:12) <Condition bind:selected={model.conditions.afraid}>
    function create_default_slot_4(ctx) {
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
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(31:12) <Condition bind:selected={model.conditions.afraid}>",
    		ctx
    	});

    	return block;
    }

    // (32:12) <Condition bind:selected={model.conditions.exhausted}>
    function create_default_slot_3(ctx) {
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
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(32:12) <Condition bind:selected={model.conditions.exhausted}>",
    		ctx
    	});

    	return block;
    }

    // (33:12) <Condition bind:selected={model.conditions.injured}>
    function create_default_slot_2(ctx) {
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
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(33:12) <Condition bind:selected={model.conditions.injured}>",
    		ctx
    	});

    	return block;
    }

    // (34:12) <Condition bind:selected={model.conditions.sick}>
    function create_default_slot_1(ctx) {
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
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(34:12) <Condition bind:selected={model.conditions.sick}>",
    		ctx
    	});

    	return block;
    }

    // (35:12) <Condition bind:selected={model.conditions.dead}>
    function create_default_slot(ctx) {
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
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(35:12) <Condition bind:selected={model.conditions.dead}>",
    		ctx
    	});

    	return block;
    }

    // (52:20) {#each help as x}
    function create_each_block(ctx) {
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
    			add_location(h5, file$1, 52, 24, 2841);
    			add_location(p, file$1, 53, 24, 2885);
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
    		id: create_each_block.name,
    		type: "each",
    		source: "(52:20) {#each help as x}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Conditions', slots, []);
    	let { model = character() } = $$props;
    	console.log(model);
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Conditions> was created with unknown prop '${key}'`);
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Conditions",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get model() {
    		throw new Error("<Conditions>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set model(value) {
    		throw new Error("<Conditions>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let link;
    	let t0;
    	let main;
    	let navbar;
    	let t1;
    	let conditions;
    	let current;

    	navbar = new Navbar({
    			props: { model: /*model*/ ctx[0] },
    			$$inline: true
    		});

    	conditions = new Conditions({
    			props: { model: /*model*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t1 = space();
    			create_component(conditions.$$.fragment);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css");
    			attr_dev(link, "integrity", "sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh");
    			attr_dev(link, "crossorigin", "anonymous");
    			add_location(link, file, 9, 1, 215);
    			attr_dev(main, "id", "app");
    			add_location(main, file, 12, 0, 443);
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
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(conditions.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(conditions.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(conditions);
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ character, Navbar, Conditions, model });

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [model];
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
