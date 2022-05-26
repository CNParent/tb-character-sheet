
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
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
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
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
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

    const file$i = "src\\components\\Bubbles.svelte";

    function get_each_context$7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (15:8) {#each arr as x,i}
    function create_each_block$7(ctx) {
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
    			add_location(button, file$i, 15, 8, 354);
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
    		id: create_each_block$7.name,
    		type: "each",
    		source: "(15:8) {#each arr as x,i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
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
    		each_blocks[i] = create_each_block$7(get_each_context$7(ctx, each_value, i));
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
    			add_location(small, file$i, 12, 4, 231);
    			add_location(div0, file$i, 13, 4, 311);
    			attr_dev(div1, "class", "d-flex w-100");
    			add_location(div1, file$i, 11, 0, 199);
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
    					const child_ctx = get_each_context$7(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$7(child_ctx);
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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { count: 3, value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bubbles",
    			options,
    			id: create_fragment$i.name
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
    const file$h = "src\\components\\Ability.svelte";

    // (22:8) {#if ability.rating < ability.cap}
    function create_if_block_1$7(ctx) {
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding(value) {
    		/*bubbles_value_binding*/ ctx[4](value);
    	}

    	let bubbles_props = {
    		count: /*maxPass*/ ctx[1],
    		$$slots: { default: [create_default_slot_1$5] },
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
    		id: create_if_block_1$7.name,
    		type: "if",
    		source: "(22:8) {#if ability.rating < ability.cap}",
    		ctx
    	});

    	return block;
    }

    // (23:12) <Bubbles count={maxPass} bind:value={ability.pass}>
    function create_default_slot_1$5(ctx) {
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
    		id: create_default_slot_1$5.name,
    		type: "slot",
    		source: "(23:12) <Bubbles count={maxPass} bind:value={ability.pass}>",
    		ctx
    	});

    	return block;
    }

    // (25:8) {#if maxFail > 0 && ability.rating < ability.cap}
    function create_if_block$b(ctx) {
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding_1(value) {
    		/*bubbles_value_binding_1*/ ctx[5](value);
    	}

    	let bubbles_props = {
    		count: /*maxFail*/ ctx[2],
    		$$slots: { default: [create_default_slot$6] },
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
    		id: create_if_block$b.name,
    		type: "if",
    		source: "(25:8) {#if maxFail > 0 && ability.rating < ability.cap}",
    		ctx
    	});

    	return block;
    }

    // (26:12) <Bubbles count={maxFail} bind:value={ability.fail}>
    function create_default_slot$6(ctx) {
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
    		id: create_default_slot$6.name,
    		type: "slot",
    		source: "(26:12) <Bubbles count={maxFail} bind:value={ability.fail}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
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
    	let if_block0 = /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block_1$7(ctx);
    	let if_block1 = /*maxFail*/ ctx[2] > 0 && /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block$b(ctx);

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
    			add_location(h20, file$h, 18, 12, 535);
    			attr_dev(button, "class", "badge btn btn-dark");
    			add_location(button, file$h, 19, 16, 592);
    			add_location(h21, file$h, 19, 12, 588);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$h, 17, 8, 501);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$h, 16, 4, 468);
    			attr_dev(div2, "class", "card text-nowrap");
    			add_location(div2, file$h, 15, 0, 432);
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
    					if_block0 = create_if_block_1$7(ctx);
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
    					if_block1 = create_if_block$b(ctx);
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { ability: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ability",
    			options,
    			id: create_fragment$h.name
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
    const file$g = "src\\components\\TagList.svelte";

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (36:12) {:else}
    function create_else_block$6(ctx) {
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
    			add_location(button, file$g, 36, 12, 808);
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
    		id: create_else_block$6.name,
    		type: "else",
    		source: "(36:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (34:12) {#if i == editIndex}
    function create_if_block_2$2(ctx) {
    	let span;
    	let t_value = /*item*/ ctx[9] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "btn badge badge-light border border-dark p-2 my-1 mr-1");
    			add_location(span, file$g, 34, 12, 691);
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
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(34:12) {#if i == editIndex}",
    		ctx
    	});

    	return block;
    }

    // (33:8) {#each items as item, i}
    function create_each_block$6(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*i*/ ctx[11] == /*editIndex*/ ctx[2]) return create_if_block_2$2;
    		return create_else_block$6;
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
    		id: create_each_block$6.name,
    		type: "each",
    		source: "(33:8) {#each items as item, i}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if !editing}
    function create_if_block_1$6(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "add";
    			attr_dev(button, "class", "btn badge badge-light border border-dark p-2 m-1");
    			add_location(button, file$g, 40, 8, 996);
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
    		id: create_if_block_1$6.name,
    		type: "if",
    		source: "(40:8) {#if !editing}",
    		ctx
    	});

    	return block;
    }

    // (44:4) {#if editing}
    function create_if_block$a(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control");
    			add_location(input_1, file$g, 44, 4, 1140);
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
    		id: create_if_block$a.name,
    		type: "if",
    		source: "(44:4) {#if editing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	let if_block0 = !/*editing*/ ctx[1] && create_if_block_1$6(ctx);
    	let if_block1 = /*editing*/ ctx[1] && create_if_block$a(ctx);

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
    			add_location(div0, file$g, 31, 4, 579);
    			add_location(div1, file$g, 30, 0, 568);
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
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
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
    					if_block0 = create_if_block_1$6(ctx);
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
    					if_block1 = create_if_block$a(ctx);
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
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TagList",
    			options,
    			id: create_fragment$g.name
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
    const file$f = "src\\components\\Nature.svelte";

    // (35:8) {#if nature.maximum < maxNature}
    function create_if_block_1$5(ctx) {
    	let div;
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding(value) {
    		/*bubbles_value_binding*/ ctx[5](value);
    	}

    	let bubbles_props = {
    		count: /*maxPass*/ ctx[1],
    		$$slots: { default: [create_default_slot_1$4] },
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
    			add_location(div, file$f, 35, 8, 1285);
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
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(35:8) {#if nature.maximum < maxNature}",
    		ctx
    	});

    	return block;
    }

    // (37:12) <Bubbles count={maxPass} bind:value={nature.pass}>
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
    		source: "(37:12) <Bubbles count={maxPass} bind:value={nature.pass}>",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if maxFail > 0 && nature.maximum < maxNature}
    function create_if_block$9(ctx) {
    	let div;
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding_1(value) {
    		/*bubbles_value_binding_1*/ ctx[6](value);
    	}

    	let bubbles_props = {
    		count: /*maxFail*/ ctx[2],
    		$$slots: { default: [create_default_slot$5] },
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
    			add_location(div, file$f, 40, 8, 1481);
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
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(40:8) {#if maxFail > 0 && nature.maximum < maxNature}",
    		ctx
    	});

    	return block;
    }

    // (42:12) <Bubbles count={maxFail} bind:value={nature.fail}>
    function create_default_slot$5(ctx) {
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
    		id: create_default_slot$5.name,
    		type: "slot",
    		source: "(42:12) <Bubbles count={maxFail} bind:value={nature.fail}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
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
    	let if_block0 = /*nature*/ ctx[0].maximum < maxNature && create_if_block_1$5(ctx);
    	let if_block1 = /*maxFail*/ ctx[2] > 0 && /*nature*/ ctx[0].maximum < maxNature && create_if_block$9(ctx);

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
    			add_location(h20, file$f, 29, 12, 927);
    			attr_dev(button0, "class", "btn badge btn-dark");
    			add_location(button0, file$f, 30, 16, 976);
    			add_location(h21, file$f, 30, 12, 972);
    			attr_dev(span, "class", "m-1");
    			add_location(span, file$f, 31, 16, 1083);
    			add_location(h22, file$f, 31, 12, 1079);
    			attr_dev(button1, "class", "btn badge btn-dark");
    			add_location(button1, file$f, 32, 16, 1132);
    			add_location(h23, file$f, 32, 12, 1128);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$f, 28, 8, 893);
    			attr_dev(div1, "class", "mt-2");
    			add_location(div1, file$f, 44, 8, 1620);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$f, 27, 4, 860);
    			attr_dev(div3, "id", "$" + this.id);
    			attr_dev(div3, "class", "card text-nowrap");
    			add_location(div3, file$f, 26, 0, 808);
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

    			if (/*nature*/ ctx[0].maximum < maxNature) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*nature*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$5(ctx);
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
    					if_block1 = create_if_block$9(ctx);
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const maxNature = 7;

    function instance$f($$self, $$props, $$invalidate) {
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

    class Nature extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { nature: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nature",
    			options,
    			id: create_fragment$f.name
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
    const file$e = "src\\components\\Abilities.svelte";

    function create_fragment$e(ctx) {
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
    			add_location(div0, file$e, 17, 8, 454);
    			add_location(h20, file$e, 27, 20, 916);
    			attr_dev(button0, "class", "btn badge btn-light border align-self-center");
    			add_location(button0, file$e, 28, 37, 973);
    			attr_dev(h5, "class", "ml-2");
    			add_location(h5, file$e, 28, 20, 956);
    			attr_dev(button1, "class", "btn badge btn-dark");
    			add_location(button1, file$e, 29, 40, 1142);
    			attr_dev(h21, "class", "ml-auto");
    			add_location(h21, file$e, 29, 20, 1122);
    			attr_dev(div1, "class", "card-body d-flex");
    			add_location(div1, file$e, 26, 16, 864);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$e, 25, 12, 828);
    			attr_dev(h22, "class", "mr-auto");
    			add_location(h22, file$e, 34, 20, 1430);
    			attr_dev(button2, "class", "btn badge btn-dark");
    			add_location(button2, file$e, 35, 24, 1486);
    			add_location(h23, file$e, 35, 20, 1482);
    			attr_dev(div3, "class", "card-body d-flex");
    			add_location(div3, file$e, 33, 16, 1378);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$e, 32, 12, 1342);
    			attr_dev(h24, "class", "mr-auto");
    			add_location(h24, file$e, 40, 20, 1765);
    			attr_dev(button3, "class", "btn badge btn-dark");
    			add_location(button3, file$e, 41, 24, 1826);
    			add_location(h25, file$e, 41, 20, 1822);
    			attr_dev(div5, "class", "card-body d-flex");
    			add_location(div5, file$e, 39, 16, 1713);
    			attr_dev(div6, "class", "card");
    			add_location(div6, file$e, 38, 12, 1677);
    			attr_dev(div7, "class", "col-md-6");
    			add_location(div7, file$e, 22, 8, 672);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$e, 16, 4, 427);
    			attr_dev(div9, "id", "$" + this.id);
    			attr_dev(div9, "class", "container-fluid");
    			add_location(div9, file$e, 15, 0, 376);
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Abilities",
    			options,
    			id: create_fragment$e.name
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

    /* src\components\Advancement.svelte generated by Svelte v3.48.0 */
    const file$d = "src\\components\\Advancement.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (43:8) {#each ['Fate', 'Persona'] as artha}
    function create_each_block_1$1(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let h2;
    	let t0;
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

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h2 = element("h2");
    			t0 = text(/*artha*/ ctx[15]);
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
    			attr_dev(h2, "class", "card-subtitle mb-1");
    			add_location(h2, file$d, 46, 20, 1431);
    			attr_dev(button0, "class", "btn btn-dark");
    			add_location(button0, file$d, 49, 28, 1618);
    			attr_dev(button1, "class", "btn btn-light border border-dark");
    			add_location(button1, file$d, 50, 28, 1771);
    			attr_dev(div0, "class", "btn-group align-self-center mr-1");
    			add_location(div0, file$d, 48, 24, 1542);
    			attr_dev(button2, "class", "btn btn-dark");
    			add_location(button2, file$d, 53, 28, 2011);
    			attr_dev(button3, "class", "btn btn-light border border-dark");
    			add_location(button3, file$d, 54, 28, 2151);
    			attr_dev(div1, "class", "btn-group align-self-center");
    			add_location(div1, file$d, 52, 24, 1940);
    			attr_dev(div2, "class", "d-flex");
    			add_location(div2, file$d, 47, 20, 1496);
    			attr_dev(div3, "class", "card-body");
    			add_location(div3, file$d, 45, 16, 1386);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$d, 44, 12, 1350);
    			attr_dev(div5, "class", "col-md-6");
    			add_location(div5, file$d, 43, 8, 1314);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h2);
    			append_dev(h2, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(button0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, button2);
    			append_dev(button2, t6);
    			append_dev(button2, t7);
    			append_dev(div1, t8);
    			append_dev(div1, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler, false, false, false),
    					listen_dev(button1, "click", click_handler_1, false, false, false),
    					listen_dev(button2, "click", click_handler_2, false, false, false),
    					listen_dev(button3, "click", click_handler_3, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*model*/ 1 && t2_value !== (t2_value = /*model*/ ctx[0].advancement[`current${/*artha*/ ctx[15]}`] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*model*/ 1 && t6_value !== (t6_value = /*model*/ ctx[0].advancement[`spent${/*artha*/ ctx[15]}`] + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(43:8) {#each ['Fate', 'Persona'] as artha}",
    		ctx
    	});

    	return block;
    }

    // (91:28) {#each levels as level}
    function create_each_block$5(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*level*/ ctx[12].level + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*level*/ ctx[12].fate + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*level*/ ctx[12].persona + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			add_location(td0, file$d, 92, 32, 4016);
    			add_location(td1, file$d, 93, 32, 4072);
    			add_location(td2, file$d, 94, 32, 4127);
    			add_location(tr, file$d, 91, 28, 3978);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(91:28) {#each levels as level}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let div9;
    	let div3;
    	let t0;
    	let div2;
    	let div1;
    	let div0;
    	let h2;
    	let t2;
    	let taglist;
    	let t3;
    	let button0;
    	let t5;
    	let div8;
    	let div7;
    	let div6;
    	let div4;
    	let h5;
    	let t7;
    	let button1;
    	let span;
    	let t9;
    	let div5;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t11;
    	let th1;
    	let t13;
    	let th2;
    	let t15;
    	let tbody;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = ['Fate', 'Persona'];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < 2; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	taglist = new TagList({
    			props: {
    				items: /*model*/ ctx[0].advancement.levelBenefits
    			},
    			$$inline: true
    		});

    	let each_value = /*levels*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div3 = element("div");

    			for (let i = 0; i < 2; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Level Benefits";
    			t2 = space();
    			create_component(taglist.$$.fragment);
    			t3 = space();
    			button0 = element("button");
    			button0.textContent = "?";
    			t5 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Level Requirements";
    			t7 = space();
    			button1 = element("button");
    			span = element("span");
    			span.textContent = "✗";
    			t9 = space();
    			div5 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Level";
    			t11 = space();
    			th1 = element("th");
    			th1.textContent = "Fate";
    			t13 = space();
    			th2 = element("th");
    			th2.textContent = "Persona";
    			t15 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "mr-auto");
    			add_location(h2, file$d, 64, 20, 2509);
    			attr_dev(button0, "class", "position-topright btn badge btn-light border border-dark");
    			add_location(button0, file$d, 66, 20, 2643);
    			attr_dev(div0, "class", "card-body");
    			add_location(div0, file$d, 63, 16, 2464);
    			attr_dev(div1, "class", "card");
    			add_location(div1, file$d, 62, 12, 2428);
    			attr_dev(div2, "class", "col-12");
    			add_location(div2, file$d, 61, 8, 2394);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$d, 41, 4, 1241);
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "levelRequirementsTitle");
    			add_location(h5, file$d, 75, 20, 3169);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$d, 77, 24, 3402);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "close");
    			attr_dev(button1, "data-dismiss", "modal");
    			attr_dev(button1, "aria-label", "Close");
    			add_location(button1, file$d, 76, 20, 3266);
    			attr_dev(div4, "class", "modal-header");
    			add_location(div4, file$d, 74, 16, 3121);
    			add_location(th0, file$d, 84, 32, 3682);
    			add_location(th1, file$d, 85, 32, 3730);
    			add_location(th2, file$d, 86, 32, 3777);
    			add_location(tr, file$d, 83, 28, 3644);
    			add_location(thead, file$d, 82, 24, 3607);
    			add_location(tbody, file$d, 89, 24, 3888);
    			attr_dev(table, "class", "table");
    			add_location(table, file$d, 81, 20, 3560);
    			attr_dev(div5, "class", "modal-body");
    			add_location(div5, file$d, 80, 16, 3514);
    			attr_dev(div6, "class", "modal-content");
    			add_location(div6, file$d, 73, 12, 3076);
    			attr_dev(div7, "class", "modal-dialog");
    			attr_dev(div7, "role", "document");
    			add_location(div7, file$d, 72, 8, 3020);
    			attr_dev(div8, "class", "modal fade");
    			attr_dev(div8, "tabindex", "-1");
    			attr_dev(div8, "role", "dialog");
    			attr_dev(div8, "aria-labelledby", "levelRequirements");
    			attr_dev(div8, "aria-hidden", "true");
    			toggle_class(div8, "show", /*showHelp*/ ctx[1]);
    			set_style(div8, "display", /*showHelp*/ ctx[1] ? 'block' : 'none', false);
    			add_location(div8, file$d, 71, 4, 2837);
    			attr_dev(div9, "id", "$" + this.id);
    			attr_dev(div9, "class", "container-fluid text-nowrap");
    			add_location(div9, file$d, 40, 0, 1178);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div3);

    			for (let i = 0; i < 2; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			mount_component(taglist, div0, null);
    			append_dev(div0, t3);
    			append_dev(div0, button0);
    			append_dev(div9, t5);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, h5);
    			append_dev(div4, t7);
    			append_dev(div4, button1);
    			append_dev(button1, span);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t11);
    			append_dev(tr, th1);
    			append_dev(tr, t13);
    			append_dev(tr, th2);
    			append_dev(table, t15);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_4*/ ctx[10], false, false, false),
    					listen_dev(button1, "click", /*click_handler_5*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*unspend, spend, model, change*/ 57) {
    				each_value_1 = ['Fate', 'Persona'];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < 2; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div3, t0);
    					}
    				}

    				for (; i < 2; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    			}

    			const taglist_changes = {};
    			if (dirty & /*model*/ 1) taglist_changes.items = /*model*/ ctx[0].advancement.levelBenefits;
    			taglist.$set(taglist_changes);

    			if (dirty & /*levels*/ 4) {
    				each_value = /*levels*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*showHelp*/ 2) {
    				toggle_class(div8, "show", /*showHelp*/ ctx[1]);
    			}

    			if (dirty & /*showHelp*/ 2) {
    				set_style(div8, "display", /*showHelp*/ ctx[1] ? 'block' : 'none', false);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(taglist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(taglist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks_1, detaching);
    			destroy_component(taglist);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Advancement', slots, []);
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

    	const writable_props = ['model'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Advancement> was created with unknown prop '${key}'`);
    	});

    	const click_handler = artha => change(`current${artha}`, 1);
    	const click_handler_1 = artha => change(`current${artha}`, -1);
    	const click_handler_2 = artha => spend(artha);
    	const click_handler_3 = artha => unspend(artha);
    	const click_handler_4 = () => $$invalidate(1, showHelp = true);
    	const click_handler_5 = () => $$invalidate(1, showHelp = false);

    	$$self.$$set = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    	};

    	$$self.$capture_state = () => ({
    		TagList,
    		model,
    		showHelp,
    		levels,
    		change,
    		spend,
    		unspend
    	});

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    		if ('showHelp' in $$props) $$invalidate(1, showHelp = $$props.showHelp);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Advancement extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Advancement",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*model*/ ctx[0] === undefined && !('model' in props)) {
    			console.warn("<Advancement> was created without expected prop 'model'");
    		}
    	}

    	get model() {
    		throw new Error("<Advancement>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set model(value) {
    		throw new Error("<Advancement>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\TextArea.svelte generated by Svelte v3.48.0 */
    const file$c = "src\\components\\TextArea.svelte";

    // (19:0) {:else}
    function create_else_block$5(ctx) {
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
    			add_location(span, file$c, 20, 4, 574);
    			attr_dev(button, "class", "btn btn-light text-left align-top wrap");
    			set_style(button, "min-height", "2.5em");
    			add_location(button, file$c, 21, 4, 650);
    			attr_dev(div, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
    			add_location(div, file$c, 19, 0, 513);
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
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:0) {#if active}
    function create_if_block$8(ctx) {
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
    			add_location(span, file$c, 15, 4, 292);
    			attr_dev(textarea, "class", "flex-grow-1 form-control");
    			add_location(textarea, file$c, 16, 4, 368);
    			attr_dev(div, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
    			add_location(div, file$c, 14, 0, 231);
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
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(14:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$8, create_else_block$5];
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextArea",
    			options,
    			id: create_fragment$c.name
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
    const file$b = "src\\components\\TextInput.svelte";

    // (19:0) {:else}
    function create_else_block$4(ctx) {
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
    			add_location(span, file$b, 20, 4, 621);
    			attr_dev(button, "class", "flex-grow-1 btn btn-light text-left");
    			add_location(button, file$b, 21, 4, 752);
    			attr_dev(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
    			add_location(div, file$b, 19, 0, 558);
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
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:0) {#if active}
    function create_if_block$7(ctx) {
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
    			add_location(span, file$b, 15, 4, 294);
    			attr_dev(input, "class", "flex-grow-1 form-control");
    			add_location(input, file$b, 16, 4, 427);
    			attr_dev(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
    			add_location(div, file$b, 14, 0, 231);
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
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(14:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$7, create_else_block$4];
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextInput",
    			options,
    			id: create_fragment$b.name
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
    const file$a = "src\\components\\Bio.svelte";

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
    function create_default_slot_1$3(ctx) {
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
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(31:16) <TextArea bind:content={model.bio.goal}>",
    		ctx
    	});

    	return block;
    }

    // (32:16) <TextArea bind:content={model.bio.instinct}>
    function create_default_slot$4(ctx) {
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
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(32:16) <TextArea bind:content={model.bio.instinct}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
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
    		$$slots: { default: [create_default_slot_1$3] },
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
    		$$slots: { default: [create_default_slot$4] },
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
    			add_location(div0, file$a, 11, 12, 260);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$a, 10, 8, 223);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$a, 9, 4, 195);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$a, 27, 12, 1177);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$a, 26, 8, 1140);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$a, 25, 4, 1112);
    			attr_dev(div6, "id", "$" + this.id);
    			attr_dev(div6, "class", "container-fluid");
    			add_location(div6, file$a, 8, 0, 144);
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bio",
    			options,
    			id: create_fragment$a.name
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

    /* src\components\Circle.svelte generated by Svelte v3.48.0 */
    const file$9 = "src\\components\\Circle.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[12] = list;
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (34:12) {:else}
    function create_else_block$3(ctx) {
    	let button;
    	let t_value = /*item*/ ctx[11] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*i*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn btn-light border-bottom text-left");
    			add_location(button, file$9, 34, 12, 795);
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
    			if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[11] + "")) set_data_dev(t, t_value);
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
    		source: "(34:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (32:12) {#if editIndex == i}
    function create_if_block$6(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	function input_1_input_handler() {
    		/*input_1_input_handler*/ ctx[7].call(input_1, /*each_value*/ ctx[12], /*i*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control my-1");
    			add_location(input_1, file$9, 32, 12, 673);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			set_input_value(input_1, /*item*/ ctx[11]);
    			/*input_1_binding*/ ctx[8](input_1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*endEdit*/ ctx[4], false, false, false),
    					listen_dev(input_1, "input", input_1_input_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*items*/ 1 && input_1.value !== /*item*/ ctx[11]) {
    				set_input_value(input_1, /*item*/ ctx[11]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[8](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(32:12) {#if editIndex == i}",
    		ctx
    	});

    	return block;
    }

    // (31:12) {#each items as item, i}
    function create_each_block$4(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*editIndex*/ ctx[2] == /*i*/ ctx[13]) return create_if_block$6;
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
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(31:12) {#each items as item, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
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
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
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
    			add_location(h2, file$9, 29, 12, 565);
    			attr_dev(div0, "class", "d-flex flex-column");
    			add_location(div0, file$9, 28, 8, 519);
    			attr_dev(button0, "class", "btn btn-light border my-1");
    			add_location(button0, file$9, 39, 12, 998);
    			attr_dev(button1, "class", "btn btn-light border my-1");
    			add_location(button1, file$9, 40, 12, 1081);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$9, 38, 8, 961);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$9, 27, 4, 486);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$9, 26, 0, 462);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h2);

    			if (default_slot) {
    				default_slot.m(h2, null);
    			}

    			append_dev(div0, t0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*add*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
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
    			if (detaching) detach_dev(div3);
    			if (default_slot) default_slot.d(detaching);
    			destroy_each(each_blocks, detaching);
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

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Circle', slots, ['default']);
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

    	const writable_props = ['items'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Circle> was created with unknown prop '${key}'`);
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

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		items,
    		input,
    		editIndex,
    		add,
    		endEdit
    	});

    	$$self.$inject_state = $$props => {
    		if ('items' in $$props) $$invalidate(0, items = $$props.items);
    		if ('input' in $$props) $$invalidate(1, input = $$props.input);
    		if ('editIndex' in $$props) $$invalidate(2, editIndex = $$props.editIndex);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Circle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Circle",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get items() {
    		throw new Error("<Circle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<Circle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Circles.svelte generated by Svelte v3.48.0 */
    const file$8 = "src\\components\\Circles.svelte";

    // (10:12) <Circle items={circles.friends}>
    function create_default_slot_1$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Friends");
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
    		source: "(10:12) <Circle items={circles.friends}>",
    		ctx
    	});

    	return block;
    }

    // (13:12) <Circle items={circles.enemies}>
    function create_default_slot$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Enemies");
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
    		source: "(13:12) <Circle items={circles.enemies}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let circle0;
    	let t;
    	let div1;
    	let circle1;
    	let current;

    	circle0 = new Circle({
    			props: {
    				items: /*circles*/ ctx[0].friends,
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	circle1 = new Circle({
    			props: {
    				items: /*circles*/ ctx[0].enemies,
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(circle0.$$.fragment);
    			t = space();
    			div1 = element("div");
    			create_component(circle1.$$.fragment);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$8, 8, 8, 154);
    			attr_dev(div1, "class", "col-md-6");
    			add_location(div1, file$8, 11, 8, 264);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$8, 7, 4, 127);
    			attr_dev(div3, "class", "container-fluid");
    			add_location(div3, file$8, 6, 0, 92);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			mount_component(circle0, div0, null);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			mount_component(circle1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(circle0.$$.fragment, local);
    			transition_in(circle1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(circle0.$$.fragment, local);
    			transition_out(circle1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(circle0);
    			destroy_component(circle1);
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
    	validate_slots('Circles', slots, []);
    	let { circles } = $$props;
    	const writable_props = ['circles'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Circles> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('circles' in $$props) $$invalidate(0, circles = $$props.circles);
    	};

    	$$self.$capture_state = () => ({ Circle, circles });

    	$$self.$inject_state = $$props => {
    		if ('circles' in $$props) $$invalidate(0, circles = $$props.circles);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [circles];
    }

    class Circles extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { circles: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Circles",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*circles*/ ctx[0] === undefined && !('circles' in props)) {
    			console.warn("<Circles> was created without expected prop 'circles'");
    		}
    	}

    	get circles() {
    		throw new Error("<Circles>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set circles(value) {
    		throw new Error("<Circles>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Condition.svelte generated by Svelte v3.48.0 */

    const file$7 = "src\\components\\Condition.svelte";

    function create_fragment$7(ctx) {
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
    			add_location(button, file$7, 4, 0, 57);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { selected: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Condition",
    			options,
    			id: create_fragment$7.name
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
    const file$6 = "src\\components\\Conditions.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (59:0) {:else}
    function create_else_block$2(ctx) {
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
    			add_location(button, file$6, 60, 4, 3028);
    			attr_dev(div, "class", "container-fluid");
    			add_location(div, file$6, 59, 0, 2993);
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
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(59:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#if shown}
    function create_if_block$5(ctx) {
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
    		$$slots: { default: [create_default_slot$2] },
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
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
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
    			add_location(div0, file$6, 24, 8, 1152);
    			attr_dev(button0, "class", "btn badge btn-light border border-dark");
    			add_location(button0, file$6, 35, 12, 1945);
    			attr_dev(button1, "class", "btn badge btn-light border border-dark");
    			add_location(button1, file$6, 36, 12, 2057);
    			attr_dev(div1, "class", "btn-group position-topright");
    			add_location(div1, file$6, 34, 8, 1890);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$6, 23, 4, 1124);
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$6, 43, 20, 2456);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$6, 45, 24, 2613);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "close");
    			add_location(button2, file$6, 44, 20, 2517);
    			attr_dev(div3, "class", "modal-header");
    			add_location(div3, file$6, 42, 16, 2408);
    			attr_dev(div4, "class", "modal-body");
    			add_location(div4, file$6, 48, 16, 2725);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file$6, 41, 12, 2363);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file$6, 40, 8, 2307);
    			attr_dev(div7, "class", "modal fade");
    			attr_dev(div7, "tabindex", "-1");
    			toggle_class(div7, "show", /*showHelp*/ ctx[2]);
    			set_style(div7, "display", /*showHelp*/ ctx[2] ? 'block' : 'none', false);
    			add_location(div7, file$6, 39, 4, 2193);
    			attr_dev(div8, "class", "container-fluid");
    			add_location(div8, file$6, 22, 0, 1089);
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
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
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
    		id: create_if_block$5.name,
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
    function create_default_slot$2(ctx) {
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
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(33:12) <Condition bind:selected={model.conditions.dead}>",
    		ctx
    	});

    	return block;
    }

    // (50:20) {#each help as x}
    function create_each_block$3(ctx) {
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
    			add_location(h5, file$6, 50, 24, 2814);
    			add_location(p, file$6, 51, 24, 2858);
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
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(50:20) {#each help as x}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$5, create_else_block$2];
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Conditions",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get model() {
    		throw new Error("<Conditions>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set model(value) {
    		throw new Error("<Conditions>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Item.svelte generated by Svelte v3.48.0 */
    const file$5 = "src\\components\\Item.svelte";

    // (55:4) {:else}
    function create_else_block$1(ctx) {
    	let span2;
    	let span1;
    	let span0;
    	let t0_value = /*item*/ ctx[0].text + "";
    	let t0;
    	let t1;
    	let t2;
    	let button;
    	let t3_value = /*item*/ ctx[0].size + "";
    	let t3;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*item*/ ctx[0].stackSize && create_if_block_1$4(ctx);

    	const block = {
    		c: function create() {
    			span2 = element("span");
    			span1 = element("span");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			button = element("button");
    			t3 = text(t3_value);
    			add_location(span0, file$5, 57, 12, 2426);
    			attr_dev(span1, "class", "btn btn-light text-left border border-dark flex-grow-1");
    			add_location(span1, file$5, 56, 8, 2343);
    			attr_dev(button, "class", "btn btn-light border border-dark flex-grow-0");
    			add_location(button, file$5, 62, 8, 2614);
    			attr_dev(span2, "draggable", "true");
    			attr_dev(span2, "class", "d-flex btn-group mb-1 w-100");
    			set_style(span2, "min-height", /*size*/ ctx[3] * 2.5 + "em");
    			add_location(span2, file$5, 55, 4, 2193);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span2, anchor);
    			append_dev(span2, span1);
    			append_dev(span1, span0);
    			append_dev(span0, t0);
    			append_dev(span1, t1);
    			if (if_block) if_block.m(span1, null);
    			append_dev(span2, t2);
    			append_dev(span2, button);
    			append_dev(button, t3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler_8*/ ctx[15], false, false, false),
    					listen_dev(span2, "dragstart", /*dragstart_handler*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*item*/ 1) && t0_value !== (t0_value = /*item*/ ctx[0].text + "")) set_data_dev(t0, t0_value);

    			if (/*item*/ ctx[0].stackSize) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(span1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*item*/ 1) && t3_value !== (t3_value = /*item*/ ctx[0].size + "")) set_data_dev(t3, t3_value);

    			if (!current || dirty & /*size*/ 8) {
    				set_style(span2, "min-height", /*size*/ ctx[3] * 2.5 + "em");
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
    			if (detaching) detach_dev(span2);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(55:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:4) {#if editing}
    function create_if_block$4(ctx) {
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

    	const block = {
    		c: function create() {
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
    			attr_dev(input, "class", "form-control flex-grow-1");
    			set_style(input, "min-width", "0px");
    			add_location(input, file$5, 27, 12, 623);
    			attr_dev(button0, "class", "" + (btnStyle + " btn-light ml-1"));
    			add_location(button0, file$5, 28, 12, 724);
    			attr_dev(div0, "class", "d-flex m-1");
    			add_location(div0, file$5, 26, 8, 585);
    			attr_dev(span0, "class", "" + (btnStyle + " btn-dark"));
    			add_location(span0, file$5, 31, 12, 895);
    			attr_dev(span1, "class", "ml-1");
    			add_location(span1, file$5, 32, 12, 961);
    			attr_dev(button1, "class", btnStyle);
    			add_location(button1, file$5, 34, 16, 1054);
    			attr_dev(button2, "class", btnStyle);
    			add_location(button2, file$5, 35, 16, 1155);
    			attr_dev(div1, "class", "btn-group ml-auto");
    			add_location(div1, file$5, 33, 12, 1005);
    			attr_dev(div2, "class", "d-flex m-1 align-items-center");
    			add_location(div2, file$5, 30, 8, 838);
    			attr_dev(span2, "class", "" + (btnStyle + " btn-dark"));
    			add_location(span2, file$5, 39, 12, 1342);
    			attr_dev(span3, "class", "ml-1");
    			add_location(span3, file$5, 40, 12, 1413);
    			attr_dev(button3, "class", btnStyle);
    			add_location(button3, file$5, 42, 16, 1506);
    			attr_dev(button4, "class", btnStyle);
    			add_location(button4, file$5, 43, 16, 1596);
    			attr_dev(div3, "class", "btn-group ml-auto");
    			add_location(div3, file$5, 41, 12, 1457);
    			attr_dev(div4, "class", "d-flex m-1 align-items-center");
    			add_location(div4, file$5, 38, 8, 1285);
    			attr_dev(button5, "class", "" + (btnStyle + " btn-light"));
    			add_location(button5, file$5, 48, 16, 1813);
    			attr_dev(button6, "class", "" + (btnStyle + " btn-light"));
    			add_location(button6, file$5, 49, 16, 1923);
    			attr_dev(div5, "class", "btn-group");
    			add_location(div5, file$5, 47, 12, 1772);
    			attr_dev(button7, "class", "" + (btnStyle + " btn-light ml-auto"));
    			add_location(button7, file$5, 51, 12, 2048);
    			attr_dev(div6, "class", "d-flex m-1 align-items-center");
    			add_location(div6, file$5, 46, 8, 1715);
    			attr_dev(div7, "class", "btn bg-light mb-1 p-0 w-100 border");
    			add_location(div7, file$5, 25, 4, 527);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*item*/ ctx[0].text);
    			append_dev(div0, t0);
    			append_dev(div0, button0);
    			append_dev(button0, t1);
    			append_dev(div7, t2);
    			append_dev(div7, div2);
    			append_dev(div2, span0);
    			append_dev(span0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, span1);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, button1);
    			append_dev(button1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, button2);
    			append_dev(button2, t9);
    			append_dev(div7, t10);
    			append_dev(div7, div4);
    			append_dev(div4, span2);
    			append_dev(span2, t11);
    			append_dev(div4, t12);
    			append_dev(div4, span3);
    			append_dev(div4, t14);
    			append_dev(div4, div3);
    			append_dev(div3, button3);
    			append_dev(button3, t15);
    			append_dev(div3, t16);
    			append_dev(div3, button4);
    			append_dev(button4, t17);
    			append_dev(div7, t18);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, button5);
    			append_dev(button5, t19);
    			append_dev(div5, t20);
    			append_dev(div5, button6);
    			append_dev(button6, t21);
    			append_dev(div6, t22);
    			append_dev(div6, button7);
    			append_dev(button7, t23);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[8], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[9], false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[10], false, false, false),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[11], false, false, false),
    					listen_dev(button6, "click", /*click_handler_6*/ ctx[12], false, false, false),
    					listen_dev(button7, "click", /*click_handler_7*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 1 && input.value !== /*item*/ ctx[0].text) {
    				set_input_value(input, /*item*/ ctx[0].text);
    			}

    			if (dirty & /*item*/ 1 && t3_value !== (t3_value = /*item*/ ctx[0].size + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*item*/ 1 && t11_value !== (t11_value = /*item*/ ctx[0].stackSize + "")) set_data_dev(t11, t11_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(25:4) {#if editing}",
    		ctx
    	});

    	return block;
    }

    // (59:12) {#if item.stackSize}
    function create_if_block_1$4(ctx) {
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding(value) {
    		/*bubbles_value_binding*/ ctx[14](value);
    	}

    	let bubbles_props = {
    		count: /*item*/ ctx[0].stackSize,
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	if (/*item*/ ctx[0].stack !== void 0) {
    		bubbles_props.value = /*item*/ ctx[0].stack;
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
    			if (dirty & /*item*/ 1) bubbles_changes.count = /*item*/ ctx[0].stackSize;

    			if (dirty & /*$$scope*/ 131072) {
    				bubbles_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*item*/ 1) {
    				updating_value = true;
    				bubbles_changes.value = /*item*/ ctx[0].stack;
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
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(59:12) {#if item.stackSize}",
    		ctx
    	});

    	return block;
    }

    // (60:12) <Bubbles count={item.stackSize} bind:value={item.stack}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Used");
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
    		source: "(60:12) <Bubbles count={item.stackSize} bind:value={item.stack}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$4, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*editing*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			add_location(div, file$5, 23, 0, 497);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
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
    				if_block.m(div, null);
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
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
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

    const btnStyle = 'btn border border-dark align-self-start';

    function instance$5($$self, $$props, $$invalidate) {
    	let size;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Item', slots, []);
    	let { item } = $$props;
    	let { actions } = $$props;
    	let editing = false;

    	function stackSize(n) {
    		$$invalidate(0, item.stackSize += n, item);
    		if (item.stackSize < 0) $$invalidate(0, item.stackSize = 0, item);
    	}

    	if (item.stackSize === undefined) {
    		item.stackSize = 0;
    		item.stack = 0;
    	}

    	const writable_props = ['item', 'actions'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Item> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		item.text = this.value;
    		$$invalidate(0, item);
    	}

    	const click_handler = () => $$invalidate(2, editing = false);
    	const click_handler_1 = () => actions.resize(item, 1);
    	const click_handler_2 = () => actions.resize(item, -1);
    	const click_handler_3 = () => stackSize(1);
    	const click_handler_4 = () => stackSize(-1);
    	const click_handler_5 = () => actions.move(item, -1);
    	const click_handler_6 = () => actions.move(item, 1);
    	const click_handler_7 = () => actions.delete(item);

    	function bubbles_value_binding(value) {
    		if ($$self.$$.not_equal(item.stack, value)) {
    			item.stack = value;
    			$$invalidate(0, item);
    		}
    	}

    	const click_handler_8 = () => $$invalidate(2, editing = true);
    	const dragstart_handler = () => actions.dragStart(item);

    	$$self.$$set = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    	};

    	$$self.$capture_state = () => ({
    		Bubbles,
    		item,
    		actions,
    		btnStyle,
    		editing,
    		stackSize,
    		size
    	});

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('editing' in $$props) $$invalidate(2, editing = $$props.editing);
    		if ('size' in $$props) $$invalidate(3, size = $$props.size);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*item*/ 1) {
    			$$invalidate(3, size = item.stackSize ? item.size + 1 : item.size);
    		}
    	};

    	return [
    		item,
    		actions,
    		editing,
    		size,
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
    		bubbles_value_binding,
    		click_handler_8,
    		dragstart_handler
    	];
    }

    class Item extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { item: 0, actions: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Item",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[0] === undefined && !('item' in props)) {
    			console.warn("<Item> was created without expected prop 'item'");
    		}

    		if (/*actions*/ ctx[1] === undefined && !('actions' in props)) {
    			console.warn("<Item> was created without expected prop 'actions'");
    		}
    	}

    	get item() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get actions() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Container.svelte generated by Svelte v3.48.0 */

    const { console: console_1$1 } = globals;
    const file$4 = "src\\components\\Container.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (107:12) {:else}
    function create_else_block_1(ctx) {
    	let h5;
    	let span;
    	let t_value = /*container*/ ctx[0].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "card-title mb-0");
    			add_location(span, file$4, 108, 16, 3511);
    			attr_dev(h5, "class", "m-0");
    			add_location(h5, file$4, 107, 12, 3477);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h5, anchor);
    			append_dev(h5, span);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*container*/ 1 && t_value !== (t_value = /*container*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(107:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (103:51) 
    function create_if_block_5$1(ctx) {
    	let h4;
    	let button;
    	let t_value = /*container*/ ctx[0].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "badge btn btn-light text-left card-title w-100 mb-0");
    			add_location(button, file$4, 104, 16, 3330);
    			attr_dev(h4, "class", "flex-grow-1 m-0");
    			add_location(h4, file$4, 103, 12, 3284);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, button);
    			append_dev(button, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*container*/ 1 && t_value !== (t_value = /*container*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(103:51) ",
    		ctx
    	});

    	return block;
    }

    // (101:63) 
    function create_if_block_4$1(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control mr-2");
    			add_location(input_1, file$4, 101, 12, 3138);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			/*input_1_binding*/ ctx[16](input_1);
    			set_input_value(input_1, /*container*/ ctx[0].name);

    			if (!mounted) {
    				dispose = listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[17]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*container*/ 1 && input_1.value !== /*container*/ ctx[0].name) {
    				set_input_value(input_1, /*container*/ ctx[0].name);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[16](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(101:63) ",
    		ctx
    	});

    	return block;
    }

    // (97:12) {#if container.format == 'pack'}
    function create_if_block_3$1(ctx) {
    	let h4;
    	let button;
    	let t_value = /*container*/ ctx[0].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "badge btn btn-light text-left card-title w-100 mb-0");
    			add_location(button, file$4, 98, 16, 2925);
    			attr_dev(h4, "class", "flex-grow-1 m-0");
    			add_location(h4, file$4, 97, 12, 2879);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*togglePack*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*container*/ 1 && t_value !== (t_value = /*container*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(97:12) {#if container.format == 'pack'}",
    		ctx
    	});

    	return block;
    }

    // (116:12) {:else}
    function create_else_block(ctx) {
    	let h5;
    	let span;
    	let t0;
    	let t1;
    	let t2_value = /*container*/ ctx[0].size + "";
    	let t2;

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			span = element("span");
    			t0 = text(/*occupied*/ ctx[2]);
    			t1 = text(" / ");
    			t2 = text(t2_value);
    			attr_dev(span, "class", "badge btn btn-light");
    			add_location(span, file$4, 117, 16, 3833);
    			attr_dev(h5, "class", "ml-auto mr-1");
    			add_location(h5, file$4, 116, 12, 3790);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h5, anchor);
    			append_dev(h5, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*occupied*/ 4) set_data_dev(t0, /*occupied*/ ctx[2]);
    			if (dirty & /*container*/ 1 && t2_value !== (t2_value = /*container*/ ctx[0].size + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(116:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (112:12) {#if canAdd}
    function create_if_block_2$1(ctx) {
    	let h5;
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			span = element("span");
    			t = text(/*occupied*/ ctx[2]);
    			attr_dev(span, "class", "badge btn btn-light");
    			add_location(span, file$4, 113, 16, 3685);
    			attr_dev(h5, "class", "ml-auto mr-1");
    			add_location(h5, file$4, 112, 12, 3642);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h5, anchor);
    			append_dev(h5, span);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*occupied*/ 4) set_data_dev(t, /*occupied*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(112:12) {#if canAdd}",
    		ctx
    	});

    	return block;
    }

    // (128:16) {#each container.items as item (item.id)}
    function create_each_block$2(key_1, ctx) {
    	let first;
    	let item;
    	let current;

    	item = new Item({
    			props: {
    				item: /*item*/ ctx[20],
    				actions: /*itemActions*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(item.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(item, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const item_changes = {};
    			if (dirty & /*container*/ 1) item_changes.item = /*item*/ ctx[20];
    			item.$set(item_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(item.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(item.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(item, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(128:16) {#each container.items as item (item.id)}",
    		ctx
    	});

    	return block;
    }

    // (131:16) {#if space > 0}
    function create_if_block_1$3(ctx) {
    	let button;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.disabled = /*disableAdd*/ ctx[5];

    			attr_dev(button, "class", button_class_value = "drop btn border mb-1 " + (/*disableAdd*/ ctx[5]
    			? 'disabled btn-secondary'
    			: 'btn-light'));

    			set_style(button, "height", 2.5 * /*space*/ ctx[3] + "em");
    			add_location(button, file$4, 131, 16, 4462);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "dragenter", /*dragEnter*/ ctx[10], false, false, false),
    					listen_dev(button, "dragleave", dragLeave, false, false, false),
    					listen_dev(button, "dragover", /*dragOver*/ ctx[11], false, false, false),
    					listen_dev(button, "drop", /*drop*/ ctx[12], false, false, false),
    					listen_dev(button, "click", /*add*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*disableAdd*/ 32) {
    				prop_dev(button, "disabled", /*disableAdd*/ ctx[5]);
    			}

    			if (dirty & /*disableAdd*/ 32 && button_class_value !== (button_class_value = "drop btn border mb-1 " + (/*disableAdd*/ ctx[5]
    			? 'disabled btn-secondary'
    			: 'btn-light'))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*space*/ 8) {
    				set_style(button, "height", 2.5 * /*space*/ ctx[3] + "em");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(131:16) {#if space > 0}",
    		ctx
    	});

    	return block;
    }

    // (144:12) {#if container.format == 'custom'}
    function create_if_block$3(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "class", "btn btn-light border ml-auto");
    			add_location(button, file$4, 145, 16, 5052);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$4, 144, 12, 5014);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[19], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(144:12) {#if container.format == 'custom'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
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
    		if (/*container*/ ctx[0].format == 'pack') return create_if_block_3$1;
    		if (/*container*/ ctx[0].format == 'custom' && /*editName*/ ctx[8]) return create_if_block_4$1;
    		if (/*container*/ ctx[0].format == 'custom') return create_if_block_5$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*canAdd*/ ctx[6]) return create_if_block_2$1;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);
    	let each_value = /*container*/ ctx[0].items;
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[20].id;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	let if_block2 = /*space*/ ctx[3] > 0 && create_if_block_1$3(ctx);
    	let if_block3 = /*container*/ ctx[0].format == 'custom' && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
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
    			attr_dev(button0, "class", smallButton);
    			add_location(button0, file$4, 121, 16, 4001);
    			attr_dev(button1, "class", smallButton);
    			add_location(button1, file$4, 122, 16, 4103);
    			attr_dev(div0, "class", "ml-1 btn-group");
    			add_location(div0, file$4, 120, 12, 3955);
    			attr_dev(div1, "class", "card-header p-2 d-flex");
    			add_location(div1, file$4, 95, 8, 2783);
    			attr_dev(div2, "class", "d-flex flex-column");
    			add_location(div2, file$4, 126, 12, 4235);
    			attr_dev(div3, "class", "card-body");
    			add_location(div3, file$4, 125, 8, 4198);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$4, 94, 4, 2755);
    			attr_dev(div5, "class", "col-lg-3 col-md-4 col-sm-6 my-1");
    			add_location(div5, file$4, 93, 0, 2704);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			if_block0.m(div1, null);
    			append_dev(div1, t0);
    			if_block1.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(button0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(button1, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t6);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(div3, t7);
    			if (if_block3) if_block3.m(div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button0, "click", /*click_handler*/ ctx[18], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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

    			if (dirty & /*container, itemActions*/ 129) {
    				each_value = /*container*/ ctx[0].items;
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div2, outro_and_destroy_block, create_each_block$2, t6, get_each_context$2);
    				check_outros();
    			}

    			if (/*space*/ ctx[3] > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$3(ctx);
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
    					if_block3 = create_if_block$3(ctx);
    					if_block3.c();
    					if_block3.m(div3, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if_block0.d();
    			if_block1.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
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

    const smallButton = 'badge btn btn-light border border-dark align-self-center p-2';

    function dragLeave(e) {
    	e.target.classList.remove('dragover');
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let occupied;
    	let space;
    	let canTransfer;
    	let disableAdd;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Container', slots, []);
    	let { container } = $$props;
    	let { dragItem } = $$props;
    	let { actions } = $$props;
    	const canAdd = ['custom', 'pockets'].includes(container.format);

    	const itemActions = {
    		delete: item => {
    			let i = container.items.indexOf(item);
    			container.items.splice(i, 1);
    			$$invalidate(0, container);
    		},
    		dragEnd: () => {
    			
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
    			console.log('resize(' + item + ', ' + n + ')');
    			item.size += n;
    			if (space - n < 0) item.size -= n;
    			if (item.size == 0) item.size = 1;
    			$$invalidate(0, container);
    		}
    	};

    	let editName = false;
    	let input;

    	function add() {
    		if (space == 0) return;

    		container.items.push({
    			text: '',
    			size: 1,
    			id: crypto.randomUUID()
    		});

    		$$invalidate(0, container);
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

    	const writable_props = ['container', 'dragItem', 'actions'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Container> was created with unknown prop '${key}'`);
    	});

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(4, input);
    		});
    	}

    	function input_1_input_handler() {
    		container.name = this.value;
    		$$invalidate(0, container);
    	}

    	const click_handler = () => actions.hide(container);
    	const click_handler_1 = () => actions.delete(container);

    	$$self.$$set = $$props => {
    		if ('container' in $$props) $$invalidate(0, container = $$props.container);
    		if ('dragItem' in $$props) $$invalidate(14, dragItem = $$props.dragItem);
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		Item,
    		container,
    		dragItem,
    		actions,
    		smallButton,
    		canAdd,
    		itemActions,
    		editName,
    		input,
    		add,
    		dragEnter,
    		dragLeave,
    		dragOver,
    		drop,
    		togglePack,
    		occupied,
    		canTransfer,
    		space,
    		disableAdd
    	});

    	$$self.$inject_state = $$props => {
    		if ('container' in $$props) $$invalidate(0, container = $$props.container);
    		if ('dragItem' in $$props) $$invalidate(14, dragItem = $$props.dragItem);
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('editName' in $$props) $$invalidate(8, editName = $$props.editName);
    		if ('input' in $$props) $$invalidate(4, input = $$props.input);
    		if ('occupied' in $$props) $$invalidate(2, occupied = $$props.occupied);
    		if ('canTransfer' in $$props) $$invalidate(15, canTransfer = $$props.canTransfer);
    		if ('space' in $$props) $$invalidate(3, space = $$props.space);
    		if ('disableAdd' in $$props) $$invalidate(5, disableAdd = $$props.disableAdd);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*container*/ 1) {
    			$$invalidate(2, occupied = container.items.reduce((a, b) => a + b.size, 0));
    		}

    		if ($$self.$$.dirty & /*container, occupied*/ 5) {
    			$$invalidate(3, space = canAdd ? 1 : container.size - occupied);
    		}

    		if ($$self.$$.dirty & /*dragItem, space*/ 16392) {
    			$$invalidate(15, canTransfer = dragItem != null && (canAdd || dragItem.size <= space));
    		}

    		if ($$self.$$.dirty & /*dragItem, space, canTransfer*/ 49160) {
    			$$invalidate(5, disableAdd = dragItem == null && space == 0 && !canTransfer);
    		}
    	};

    	return [
    		container,
    		actions,
    		occupied,
    		space,
    		input,
    		disableAdd,
    		canAdd,
    		itemActions,
    		editName,
    		add,
    		dragEnter,
    		dragOver,
    		drop,
    		togglePack,
    		dragItem,
    		canTransfer,
    		input_1_binding,
    		input_1_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Container extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { container: 0, dragItem: 14, actions: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Container",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*container*/ ctx[0] === undefined && !('container' in props)) {
    			console_1$1.warn("<Container> was created without expected prop 'container'");
    		}

    		if (/*dragItem*/ ctx[14] === undefined && !('dragItem' in props)) {
    			console_1$1.warn("<Container> was created without expected prop 'dragItem'");
    		}

    		if (/*actions*/ ctx[1] === undefined && !('actions' in props)) {
    			console_1$1.warn("<Container> was created without expected prop 'actions'");
    		}
    	}

    	get container() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set container(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dragItem() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dragItem(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get actions() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Inventory.svelte generated by Svelte v3.48.0 */
    const file$3 = "src\\components\\Inventory.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[9] = list;
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (55:24) {#if container.hidden}
    function create_if_block_1$2(ctx) {
    	let button;
    	let t_value = /*container*/ ctx[6].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*container*/ ctx[6], /*each_value_1*/ ctx[9], /*container_index_1*/ ctx[10]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn btn-light border mt-1 mr-1");
    			add_location(button, file$3, 55, 24, 1788);
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
    			if (dirty & /*inventory*/ 1 && t_value !== (t_value = /*container*/ ctx[6].name + "")) set_data_dev(t, t_value);
    		},
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
    		source: "(55:24) {#if container.hidden}",
    		ctx
    	});

    	return block;
    }

    // (54:24) {#each inventory as container}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let if_block = /*container*/ ctx[6].hidden && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*container*/ ctx[6].hidden) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(54:24) {#each inventory as container}",
    		ctx
    	});

    	return block;
    }

    // (64:8) {#if !container.hidden}
    function create_if_block$2(ctx) {
    	let container_1;
    	let current;

    	container_1 = new Container({
    			props: {
    				container: /*container*/ ctx[6],
    				dragItem: /*dragItem*/ ctx[1],
    				actions: /*actions*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(container_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(container_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const container_1_changes = {};
    			if (dirty & /*inventory*/ 1) container_1_changes.container = /*container*/ ctx[6];
    			if (dirty & /*dragItem*/ 2) container_1_changes.dragItem = /*dragItem*/ ctx[1];
    			container_1.$set(container_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(container_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(container_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(container_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(64:8) {#if !container.hidden}",
    		ctx
    	});

    	return block;
    }

    // (63:8) {#each inventory as container}
    function create_each_block$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*container*/ ctx[6].hidden && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!/*container*/ ctx[6].hidden) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*inventory*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
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
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(63:8) {#each inventory as container}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let h5;
    	let t1;
    	let div2;
    	let button;
    	let t3;
    	let div1;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*inventory*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*inventory*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Containers";
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

    			attr_dev(h5, "class", "m-0");
    			add_location(h5, file$3, 48, 20, 1420);
    			attr_dev(div0, "class", "card-header p-2");
    			add_location(div0, file$3, 47, 16, 1369);
    			attr_dev(button, "class", "btn btn-light border");
    			add_location(button, file$3, 51, 20, 1557);
    			add_location(div1, file$3, 52, 20, 1653);
    			attr_dev(div2, "class", "card-body d-flex flex-column");
    			add_location(div2, file$3, 50, 16, 1493);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$3, 46, 12, 1333);
    			attr_dev(div4, "class", "col-md-12 my-1");
    			add_location(div4, file$3, 45, 8, 1291);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$3, 44, 4, 1264);
    			attr_dev(div6, "class", "container-fluid");
    			add_location(div6, file$3, 43, 0, 1229);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h5);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    			append_dev(div2, t3);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div1, null);
    			}

    			append_dev(div5, t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div5, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*add*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*inventory*/ 1) {
    				each_value_1 = /*inventory*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*inventory, dragItem, actions*/ 7) {
    				each_value = /*inventory*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div5, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
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
    	validate_slots('Inventory', slots, []);
    	let { inventory } = $$props;
    	let dragContainer;
    	let dragItem;

    	const actions = {
    		delete: container => {
    			if (!confirm(`Delete ${container.name} permanently?`)) return;
    			let i = inventory.indexOf(container);
    			inventory.splice(i, 1);
    			$$invalidate(0, inventory);
    		},
    		dragEnd: container => {
    			let i = dragContainer.items.indexOf(dragItem);
    			dragContainer.items.splice(i, 1);
    			container.items.push(dragItem);
    			$$invalidate(1, dragItem = null);
    			dragContainer = null;
    			$$invalidate(0, inventory);
    		},
    		dragStart: (container, item) => {
    			dragContainer = container;
    			$$invalidate(1, dragItem = item);
    			$$invalidate(0, inventory);
    		},
    		hide: container => {
    			container.hidden = true;
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

    	const writable_props = ['inventory'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Inventory> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (container, each_value_1, container_index_1) => $$invalidate(0, each_value_1[container_index_1].hidden = false, inventory);

    	$$self.$$set = $$props => {
    		if ('inventory' in $$props) $$invalidate(0, inventory = $$props.inventory);
    	};

    	$$self.$capture_state = () => ({
    		container,
    		Container,
    		inventory,
    		dragContainer,
    		dragItem,
    		actions,
    		add
    	});

    	$$self.$inject_state = $$props => {
    		if ('inventory' in $$props) $$invalidate(0, inventory = $$props.inventory);
    		if ('dragContainer' in $$props) dragContainer = $$props.dragContainer;
    		if ('dragItem' in $$props) $$invalidate(1, dragItem = $$props.dragItem);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [inventory, dragItem, actions, add, click_handler];
    }

    class Inventory extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { inventory: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Inventory",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*inventory*/ ctx[0] === undefined && !('inventory' in props)) {
    			console.warn("<Inventory> was created without expected prop 'inventory'");
    		}
    	}

    	get inventory() {
    		throw new Error("<Inventory>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inventory(value) {
    		throw new Error("<Inventory>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
            if(name == model.bio.name) return { model };

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

            localStorage.setItem(model.bio.name, JSON.stringify(model));
            return { success: `${model.bio.name} saved` };
        }
    };

    /* src\components\Navbar.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file$1 = "src\\components\\Navbar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[42] = list[i];
    	return child_ctx;
    }

    // (97:12) <NavLink bind:tab={tab} tabValue="abilities">
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
    		source: "(97:12) <NavLink bind:tab={tab} tabValue=\\\"abilities\\\">",
    		ctx
    	});

    	return block;
    }

    // (98:12) <NavLink bind:tab={tab} tabValue="advancement">
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
    		source: "(98:12) <NavLink bind:tab={tab} tabValue=\\\"advancement\\\">",
    		ctx
    	});

    	return block;
    }

    // (99:12) <NavLink bind:tab={tab} tabValue="bio">
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
    		source: "(99:12) <NavLink bind:tab={tab} tabValue=\\\"bio\\\">",
    		ctx
    	});

    	return block;
    }

    // (100:12) <NavLink bind:tab={tab} tabValue="circles">
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
    		source: "(100:12) <NavLink bind:tab={tab} tabValue=\\\"circles\\\">",
    		ctx
    	});

    	return block;
    }

    // (101:12) <NavLink bind:tab={tab} tabValue="inventory">
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
    		source: "(101:12) <NavLink bind:tab={tab} tabValue=\\\"inventory\\\">",
    		ctx
    	});

    	return block;
    }

    // (102:12) <NavLink bind:tab={tab} tabValue="notes">
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
    		source: "(102:12) <NavLink bind:tab={tab} tabValue=\\\"notes\\\">",
    		ctx
    	});

    	return block;
    }

    // (103:12) <NavLink bind:tab={tab} tabValue="skills">
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
    		source: "(103:12) <NavLink bind:tab={tab} tabValue=\\\"skills\\\">",
    		ctx
    	});

    	return block;
    }

    // (104:12) <NavLink bind:tab={tab} tabValue="spells">
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
    		source: "(104:12) <NavLink bind:tab={tab} tabValue=\\\"spells\\\">",
    		ctx
    	});

    	return block;
    }

    // (105:12) <NavLink bind:tab={tab} tabValue="traits">
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
    		source: "(105:12) <NavLink bind:tab={tab} tabValue=\\\"traits\\\">",
    		ctx
    	});

    	return block;
    }

    // (106:12) <NavLink bind:tab={tab} tabValue="wises">
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
    		source: "(106:12) <NavLink bind:tab={tab} tabValue=\\\"wises\\\">",
    		ctx
    	});

    	return block;
    }

    // (110:20) {#each characters as character}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*character*/ ctx[42] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[29](/*character*/ ctx[42]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "dropdown-item");
    			add_location(button, file$1, 110, 24, 3621);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button, "click", click_handler_2, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*characters*/ 8 && t_value !== (t_value = /*character*/ ctx[42] + "")) set_data_dev(t, t_value);
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
    		source: "(110:20) {#each characters as character}",
    		ctx
    	});

    	return block;
    }

    // (141:23) 
    function create_if_block_1$1(ctx) {
    	let button;
    	let strong;
    	let t_value = /*alert*/ ctx[4].error + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			strong = element("strong");
    			t = text(t_value);
    			add_location(strong, file$1, 142, 4, 5832);
    			attr_dev(button, "class", "alert alert-static alert-danger btn text-center w-100");
    			add_location(button, file$1, 141, 0, 5677);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, strong);
    			append_dev(strong, t);
    			/*button_binding_1*/ ctx[37](button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "blur", /*blur_handler_1*/ ctx[38], false, false, false),
    					listen_dev(button, "click", /*click_handler_8*/ ctx[39], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*alert*/ 16 && t_value !== (t_value = /*alert*/ ctx[4].error + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			/*button_binding_1*/ ctx[37](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(141:23) ",
    		ctx
    	});

    	return block;
    }

    // (137:0) {#if alert?.success}
    function create_if_block$1(ctx) {
    	let button;
    	let strong;
    	let t_value = /*alert*/ ctx[4].success + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			strong = element("strong");
    			t = text(t_value);
    			add_location(strong, file$1, 138, 4, 5607);
    			attr_dev(button, "class", "alert alert-static alert-success btn text-center w-100");
    			add_location(button, file$1, 137, 0, 5451);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, strong);
    			append_dev(strong, t);
    			/*button_binding*/ ctx[34](button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "blur", /*blur_handler*/ ctx[35], false, false, false),
    					listen_dev(button, "click", /*click_handler_7*/ ctx[36], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*alert*/ 16 && t_value !== (t_value = /*alert*/ ctx[4].success + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			/*button_binding*/ ctx[34](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(137:0) {#if alert?.success}",
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
    		/*navlink0_tab_binding*/ ctx[18](value);
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
    		/*navlink1_tab_binding*/ ctx[19](value);
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
    		/*navlink2_tab_binding*/ ctx[20](value);
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
    		/*navlink3_tab_binding*/ ctx[21](value);
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
    		/*navlink4_tab_binding*/ ctx[22](value);
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
    		/*navlink5_tab_binding*/ ctx[23](value);
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
    		/*navlink6_tab_binding*/ ctx[24](value);
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
    		/*navlink7_tab_binding*/ ctx[25](value);
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
    		/*navlink8_tab_binding*/ ctx[26](value);
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
    		/*navlink9_tab_binding*/ ctx[27](value);
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
    	let each_value = /*characters*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*alert*/ ctx[4]?.success) return create_if_block$1;
    		if (/*alert*/ ctx[4]?.error) return create_if_block_1$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

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
    			add_location(span, file$1, 92, 8, 2295);
    			attr_dev(button0, "class", "navbar-toggler");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$1, 91, 4, 2211);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "nav-link dropdown-toggle");
    			toggle_class(a0, "disabled", !/*characters*/ ctx[3].length);
    			add_location(a0, file$1, 107, 16, 3279);
    			attr_dev(div0, "class", "dropdown-menu");
    			attr_dev(div0, "style", div0_style_value = `display: ${/*menu*/ ctx[2] == 'characters' ? 'block' : 'none'}`);
    			add_location(div0, file$1, 108, 16, 3451);
    			attr_dev(li0, "class", "nav-item dropdown");
    			add_location(li0, file$1, 106, 12, 3231);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-link dropdown-toggle");
    			add_location(a1, file$1, 115, 16, 3869);
    			attr_dev(button1, "class", "dropdown-item");
    			add_location(button1, file$1, 117, 20, 4100);
    			attr_dev(button2, "class", "dropdown-item");
    			add_location(button2, file$1, 118, 20, 4243);
    			attr_dev(div1, "class", "dropdown-menu");
    			attr_dev(div1, "style", div1_style_value = `display: ${/*menu*/ ctx[2] == 'mods' ? 'block' : 'none'}`);
    			add_location(div1, file$1, 116, 16, 3993);
    			attr_dev(li1, "class", "nav-item dropdown");
    			add_location(li1, file$1, 114, 12, 3821);
    			attr_dev(ul, "class", "navbar-nav mr-auto");
    			add_location(ul, file$1, 95, 8, 2452);
    			attr_dev(button3, "href", "#");
    			attr_dev(button3, "class", "dropdown-toggle btn btn-light border border-dark");
    			add_location(button3, file$1, 124, 16, 4542);
    			attr_dev(button4, "class", "dropdown-item");
    			add_location(button4, file$1, 126, 20, 4816);
    			attr_dev(button5, "class", "dropdown-item");
    			add_location(button5, file$1, 127, 20, 4922);
    			attr_dev(button6, "class", "dropdown-item");
    			add_location(button6, file$1, 128, 20, 5032);
    			attr_dev(button7, "class", "dropdown-item");
    			add_location(button7, file$1, 129, 20, 5142);
    			attr_dev(button8, "class", "dropdown-item");
    			add_location(button8, file$1, 130, 20, 5252);
    			attr_dev(div2, "class", "dropdown-menu");
    			attr_dev(div2, "style", div2_style_value = `display: ${/*menu*/ ctx[2] == 'options' ? 'block' : 'none'}`);
    			add_location(div2, file$1, 125, 16, 4706);
    			attr_dev(div3, "class", "nav-item dropdown");
    			add_location(div3, file$1, 123, 12, 4493);
    			attr_dev(div4, "class", "navbar-nav");
    			add_location(div4, file$1, 122, 8, 4455);
    			attr_dev(div5, "id", "$" + this.id + "_nav");
    			attr_dev(div5, "class", "collapse navbar-collapse");
    			set_style(div5, "display", /*navDisplay*/ ctx[1], false);
    			add_location(div5, file$1, 94, 4, 2357);
    			attr_dev(nav, "class", "navbar navbar-expand-md navbar-light bg-light");
    			add_location(nav, file$1, 90, 0, 2146);
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
    					listen_dev(button0, "click", /*click_handler*/ ctx[17], false, false, false),
    					listen_dev(a0, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(a0, "click", /*click_handler_1*/ ctx[28], false, false, false),
    					listen_dev(a1, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(a1, "click", /*click_handler_3*/ ctx[30], false, false, false),
    					listen_dev(button1, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[31], false, false, false),
    					listen_dev(button2, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button2, "click", /*click_handler_5*/ ctx[32], false, false, false),
    					listen_dev(button3, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button3, "click", /*click_handler_6*/ ctx[33], false, false, false),
    					listen_dev(button4, "click", /*saveClick*/ ctx[12], false, false, false),
    					listen_dev(button4, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button5, "click", /*exportClick*/ ctx[11], false, false, false),
    					listen_dev(button5, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button6, "click", /*importClick*/ ctx[15], false, false, false),
    					listen_dev(button6, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button7, "click", /*deleteClick*/ ctx[9], false, false, false),
    					listen_dev(button7, "blur", /*clearMenu*/ ctx[8], false, false, false),
    					listen_dev(button8, "click", /*deleteAllClick*/ ctx[10], false, false, false),
    					listen_dev(button8, "blur", /*clearMenu*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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

    			if (dirty[0] & /*characters*/ 8) {
    				toggle_class(a0, "disabled", !/*characters*/ ctx[3].length);
    			}

    			if (dirty[0] & /*clearMenu, changeCharacter, characters*/ 328) {
    				each_value = /*characters*/ ctx[3];
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

    			if (!current || dirty[0] & /*menu*/ 4 && div0_style_value !== (div0_style_value = `display: ${/*menu*/ ctx[2] == 'characters' ? 'block' : 'none'}`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (!current || dirty[0] & /*menu*/ 4 && div1_style_value !== (div1_style_value = `display: ${/*menu*/ ctx[2] == 'mods' ? 'block' : 'none'}`)) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			if (!current || dirty[0] & /*menu*/ 4 && div2_style_value !== (div2_style_value = `display: ${/*menu*/ ctx[2] == 'options' ? 'block' : 'none'}`)) {
    				attr_dev(div2, "style", div2_style_value);
    			}

    			if (dirty[0] & /*navDisplay*/ 2) {
    				set_style(div5, "display", /*navDisplay*/ ctx[1], false);
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

    			if (if_block) {
    				if_block.d(detaching);
    			}

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

    const autosaveInterval = 10000; // 10s

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	let { model = character() } = $$props;
    	let { tab = 'bio' } = $$props;
    	let navDisplay = 'none';
    	let menu = '';
    	let characters = [];
    	let alert;
    	let dismiss;

    	function changeCharacter(character) {
    		let result = actions.load(model, character);
    		$$invalidate(16, model = result.model);
    		$$invalidate(4, alert = result.alert);
    	}

    	function changeMod(mod) {
    		let result = actions.loadMod(model, mod);
    		$$invalidate(16, model = result.model);
    		$$invalidate(4, alert = result.alert);
    	}

    	function clearMenu(e) {
    		if (e.relatedTarget?.className.includes('dropdown-item')) return;
    		$$invalidate(2, menu = '');
    	}

    	function deleteClick() {
    		$$invalidate(4, alert = actions.delete(model));
    		loadCharacterList();
    	}

    	function deleteAllClick() {
    		$$invalidate(4, alert = actions.deleteAll());
    		loadCharacterList();
    	}

    	function exportClick() {
    		actions.export(model);
    	}

    	function loadCharacterList() {
    		$$invalidate(3, characters = actions.loadList());
    	}

    	function saveClick() {
    		$$invalidate(4, alert = actions.save(model));
    		$$invalidate(3, characters = actions.loadList());
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
    	}

    	loadCharacterList();

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

    	const writable_props = ['model', 'tab'];

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
    	const click_handler_2 = character => changeCharacter(character);
    	const click_handler_3 = () => setMenu('mods');
    	const click_handler_4 = () => changeMod('colonialMarines');
    	const click_handler_5 = () => changeMod('torchbearer');
    	const click_handler_6 = () => setMenu('options');

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

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		onDestroy,
    		character,
    		NavLink,
    		actions,
    		model,
    		tab,
    		autosaveInterval,
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
    		loadCharacterList,
    		saveClick,
    		setMenu,
    		toggleNav,
    		importClick,
    		autoSave
    	});

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(16, model = $$props.model);
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    		if ('navDisplay' in $$props) $$invalidate(1, navDisplay = $$props.navDisplay);
    		if ('menu' in $$props) $$invalidate(2, menu = $$props.menu);
    		if ('characters' in $$props) $$invalidate(3, characters = $$props.characters);
    		if ('alert' in $$props) $$invalidate(4, alert = $$props.alert);
    		if ('dismiss' in $$props) $$invalidate(5, dismiss = $$props.dismiss);
    		if ('autoSave' in $$props) autoSave = $$props.autoSave;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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
    		click_handler_6,
    		button_binding,
    		blur_handler,
    		click_handler_7,
    		button_binding_1,
    		blur_handler_1,
    		click_handler_8
    	];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { model: 16, tab: 0 }, null, [-1, -1]);

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

    	get tab() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tab(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */
    const file = "src\\App.svelte";

    // (38:26) 
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
    		source: "(38:26) ",
    		ctx
    	});

    	return block;
    }

    // (37:27) 
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
    		source: "(37:27) ",
    		ctx
    	});

    	return block;
    }

    // (36:27) 
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
    		source: "(36:27) ",
    		ctx
    	});

    	return block;
    }

    // (35:27) 
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
    		source: "(35:27) ",
    		ctx
    	});

    	return block;
    }

    // (34:26) 
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
    		source: "(34:26) ",
    		ctx
    	});

    	return block;
    }

    // (32:30) 
    function create_if_block_4(ctx) {
    	let inventory;
    	let current;

    	inventory = new Inventory({
    			props: { inventory: /*model*/ ctx[0].inventory },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(inventory.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(inventory, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const inventory_changes = {};
    			if (dirty & /*model*/ 1) inventory_changes.inventory = /*model*/ ctx[0].inventory;
    			inventory.$set(inventory_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inventory.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inventory.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(inventory, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(32:30) ",
    		ctx
    	});

    	return block;
    }

    // (30:28) 
    function create_if_block_3(ctx) {
    	let circles;
    	let current;

    	circles = new Circles({
    			props: { circles: /*model*/ ctx[0].circles },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(circles.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(circles, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const circles_changes = {};
    			if (dirty & /*model*/ 1) circles_changes.circles = /*model*/ ctx[0].circles;
    			circles.$set(circles_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(circles.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(circles.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(circles, detaching);
    		}
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
    			props: { model: /*model*/ ctx[0] },
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
    		p: function update(ctx, dirty) {
    			const bio_changes = {};
    			if (dirty & /*model*/ 1) bio_changes.model = /*model*/ ctx[0];
    			bio.$set(bio_changes);
    		},
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

    // (26:32) 
    function create_if_block_1(ctx) {
    	let advancement;
    	let current;

    	advancement = new Advancement({
    			props: { model: /*model*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(advancement.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(advancement, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const advancement_changes = {};
    			if (dirty & /*model*/ 1) advancement_changes.model = /*model*/ ctx[0];
    			advancement.$set(advancement_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(advancement.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(advancement.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(advancement, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(26:32) ",
    		ctx
    	});

    	return block;
    }

    // (24:1) {#if tab == 'abilities'}
    function create_if_block(ctx) {
    	let abilities;
    	let current;

    	abilities = new Abilities({
    			props: { model: /*model*/ ctx[0] },
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
    		p: function update(ctx, dirty) {
    			const abilities_changes = {};
    			if (dirty & /*model*/ 1) abilities_changes.model = /*model*/ ctx[0];
    			abilities.$set(abilities_changes);
    		},
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
    		source: "(24:1) {#if tab == 'abilities'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link;
    	let t0;
    	let main;
    	let navbar;
    	let updating_model;
    	let updating_tab;
    	let t1;
    	let conditions;
    	let t2;
    	let current_block_type_index;
    	let if_block;
    	let current;

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

    	navbar = new Navbar({ props: navbar_props, $$inline: true });
    	binding_callbacks.push(() => bind(navbar, 'model', navbar_model_binding));
    	binding_callbacks.push(() => bind(navbar, 'tab', navbar_tab_binding));

    	conditions = new Conditions({
    			props: { model: /*model*/ ctx[0] },
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
    			add_location(link, file, 16, 1, 497);
    			attr_dev(main, "id", "app");
    			add_location(main, file, 19, 0, 725);
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function navbar_model_binding(value) {
    		model = value;
    		$$invalidate(0, model);
    	}

    	function navbar_tab_binding(value) {
    		tab = value;
    		$$invalidate(1, tab);
    	}

    	$$self.$capture_state = () => ({
    		character,
    		Abilities,
    		Advancement,
    		Bio,
    		Circles,
    		Conditions,
    		Inventory,
    		Navbar,
    		model,
    		tab
    	});

    	$$self.$inject_state = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    		if ('tab' in $$props) $$invalidate(1, tab = $$props.tab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [model, tab, navbar_model_binding, navbar_tab_binding];
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
