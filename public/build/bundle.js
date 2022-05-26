
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

    /* src\components\Bubbles.svelte generated by Svelte v3.48.0 */

    const file$s = "src\\components\\Bubbles.svelte";

    function get_each_context$c(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (15:8) {#each arr as x,i}
    function create_each_block$c(ctx) {
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
    			add_location(button, file$s, 15, 8, 354);
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
    		id: create_each_block$c.name,
    		type: "each",
    		source: "(15:8) {#each arr as x,i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$s(ctx) {
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
    		each_blocks[i] = create_each_block$c(get_each_context$c(ctx, each_value, i));
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
    			add_location(small, file$s, 12, 4, 231);
    			add_location(div0, file$s, 13, 4, 311);
    			attr_dev(div1, "class", "d-flex w-100");
    			add_location(div1, file$s, 11, 0, 199);
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
    					const child_ctx = get_each_context$c(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$c(child_ctx);
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
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, { count: 3, value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bubbles",
    			options,
    			id: create_fragment$s.name
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
    const file$r = "src\\components\\Ability.svelte";

    // (22:8) {#if ability.rating < ability.cap}
    function create_if_block_1$e(ctx) {
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
    		id: create_if_block_1$e.name,
    		type: "if",
    		source: "(22:8) {#if ability.rating < ability.cap}",
    		ctx
    	});

    	return block;
    }

    // (23:12) <Bubbles count={maxPass} bind:value={ability.pass}>
    function create_default_slot_1$6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pass");
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
    		id: create_default_slot_1$6.name,
    		type: "slot",
    		source: "(23:12) <Bubbles count={maxPass} bind:value={ability.pass}>",
    		ctx
    	});

    	return block;
    }

    // (25:8) {#if maxFail > 0 && ability.rating < ability.cap}
    function create_if_block$j(ctx) {
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
    		id: create_if_block$j.name,
    		type: "if",
    		source: "(25:8) {#if maxFail > 0 && ability.rating < ability.cap}",
    		ctx
    	});

    	return block;
    }

    // (26:12) <Bubbles count={maxFail} bind:value={ability.fail}>
    function create_default_slot$7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Fail");
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
    		id: create_default_slot$7.name,
    		type: "slot",
    		source: "(26:12) <Bubbles count={maxFail} bind:value={ability.fail}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$r(ctx) {
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
    	let if_block0 = /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block_1$e(ctx);
    	let if_block1 = /*maxFail*/ ctx[2] > 0 && /*ability*/ ctx[0].rating < /*ability*/ ctx[0].cap && create_if_block$j(ctx);

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
    			add_location(h20, file$r, 18, 12, 535);
    			attr_dev(button, "class", "badge btn btn-dark");
    			add_location(button, file$r, 19, 16, 592);
    			add_location(h21, file$r, 19, 12, 588);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$r, 17, 8, 501);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$r, 16, 4, 468);
    			attr_dev(div2, "class", "card text-nowrap");
    			add_location(div2, file$r, 15, 0, 432);
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
    					if_block0 = create_if_block_1$e(ctx);
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
    					if_block1 = create_if_block$j(ctx);
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
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, { ability: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ability",
    			options,
    			id: create_fragment$r.name
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
    const file$q = "src\\components\\TagList.svelte";

    function get_each_context$b(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (36:12) {:else}
    function create_else_block$b(ctx) {
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
    			add_location(button, file$q, 36, 12, 808);
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
    		id: create_else_block$b.name,
    		type: "else",
    		source: "(36:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (34:12) {#if i == editIndex}
    function create_if_block_2$8(ctx) {
    	let span;
    	let t_value = /*item*/ ctx[9] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "btn badge badge-light border border-dark p-2 my-1 mr-1");
    			add_location(span, file$q, 34, 12, 691);
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
    		id: create_if_block_2$8.name,
    		type: "if",
    		source: "(34:12) {#if i == editIndex}",
    		ctx
    	});

    	return block;
    }

    // (33:8) {#each items as item, i}
    function create_each_block$b(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*i*/ ctx[11] == /*editIndex*/ ctx[2]) return create_if_block_2$8;
    		return create_else_block$b;
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
    		id: create_each_block$b.name,
    		type: "each",
    		source: "(33:8) {#each items as item, i}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if !editing}
    function create_if_block_1$d(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "add";
    			attr_dev(button, "class", "btn badge badge-light border border-dark p-2 m-1");
    			add_location(button, file$q, 40, 8, 996);
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
    		id: create_if_block_1$d.name,
    		type: "if",
    		source: "(40:8) {#if !editing}",
    		ctx
    	});

    	return block;
    }

    // (44:4) {#if editing}
    function create_if_block$i(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control");
    			add_location(input_1, file$q, 44, 4, 1140);
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
    		id: create_if_block$i.name,
    		type: "if",
    		source: "(44:4) {#if editing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$q(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$b(get_each_context$b(ctx, each_value, i));
    	}

    	let if_block0 = !/*editing*/ ctx[1] && create_if_block_1$d(ctx);
    	let if_block1 = /*editing*/ ctx[1] && create_if_block$i(ctx);

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
    			add_location(div0, file$q, 31, 4, 579);
    			add_location(div1, file$q, 30, 0, 568);
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
    					const child_ctx = get_each_context$b(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$b(child_ctx);
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
    					if_block0 = create_if_block_1$d(ctx);
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
    					if_block1 = create_if_block$i(ctx);
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
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TagList",
    			options,
    			id: create_fragment$q.name
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
    const file$p = "src\\components\\Nature.svelte";

    // (35:8) {#if nature.maximum < maxNature}
    function create_if_block_1$c(ctx) {
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

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(bubbles.$$.fragment);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$p, 35, 8, 1285);
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
    		id: create_if_block_1$c.name,
    		type: "if",
    		source: "(35:8) {#if nature.maximum < maxNature}",
    		ctx
    	});

    	return block;
    }

    // (37:12) <Bubbles count={maxPass} bind:value={nature.pass}>
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
    		source: "(37:12) <Bubbles count={maxPass} bind:value={nature.pass}>",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if maxFail > 0 && nature.maximum < maxNature}
    function create_if_block$h(ctx) {
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

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_1));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(bubbles.$$.fragment);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$p, 40, 8, 1481);
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
    		id: create_if_block$h.name,
    		type: "if",
    		source: "(40:8) {#if maxFail > 0 && nature.maximum < maxNature}",
    		ctx
    	});

    	return block;
    }

    // (42:12) <Bubbles count={maxFail} bind:value={nature.fail}>
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
    		source: "(42:12) <Bubbles count={maxFail} bind:value={nature.fail}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$p(ctx) {
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
    	let if_block0 = /*nature*/ ctx[0].maximum < maxNature && create_if_block_1$c(ctx);
    	let if_block1 = /*maxFail*/ ctx[2] > 0 && /*nature*/ ctx[0].maximum < maxNature && create_if_block$h(ctx);

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
    			add_location(h20, file$p, 29, 12, 927);
    			attr_dev(button0, "class", "btn badge btn-dark");
    			add_location(button0, file$p, 30, 16, 976);
    			add_location(h21, file$p, 30, 12, 972);
    			attr_dev(span, "class", "m-1");
    			add_location(span, file$p, 31, 16, 1083);
    			add_location(h22, file$p, 31, 12, 1079);
    			attr_dev(button1, "class", "btn badge btn-dark");
    			add_location(button1, file$p, 32, 16, 1132);
    			add_location(h23, file$p, 32, 12, 1128);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$p, 28, 8, 893);
    			attr_dev(div1, "class", "mt-2");
    			add_location(div1, file$p, 44, 8, 1620);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$p, 27, 4, 860);
    			attr_dev(div3, "id", "$" + this.id);
    			attr_dev(div3, "class", "card text-nowrap");
    			add_location(div3, file$p, 26, 0, 808);
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
    					if_block0 = create_if_block_1$c(ctx);
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
    					if_block1 = create_if_block$h(ctx);
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
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const maxNature = 7;

    function instance$p($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, { nature: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nature",
    			options,
    			id: create_fragment$p.name
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
    const file$o = "src\\components\\Abilities.svelte";

    function create_fragment$o(ctx) {
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
    			add_location(div0, file$o, 17, 8, 454);
    			add_location(h20, file$o, 27, 20, 916);
    			attr_dev(button0, "class", "btn badge btn-light border align-self-center");
    			add_location(button0, file$o, 28, 37, 973);
    			attr_dev(h5, "class", "ml-2");
    			add_location(h5, file$o, 28, 20, 956);
    			attr_dev(button1, "class", "btn badge btn-dark");
    			add_location(button1, file$o, 29, 40, 1142);
    			attr_dev(h21, "class", "ml-auto");
    			add_location(h21, file$o, 29, 20, 1122);
    			attr_dev(div1, "class", "card-body d-flex");
    			add_location(div1, file$o, 26, 16, 864);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$o, 25, 12, 828);
    			attr_dev(h22, "class", "mr-auto");
    			add_location(h22, file$o, 34, 20, 1430);
    			attr_dev(button2, "class", "btn badge btn-dark");
    			add_location(button2, file$o, 35, 24, 1486);
    			add_location(h23, file$o, 35, 20, 1482);
    			attr_dev(div3, "class", "card-body d-flex");
    			add_location(div3, file$o, 33, 16, 1378);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$o, 32, 12, 1342);
    			attr_dev(h24, "class", "mr-auto");
    			add_location(h24, file$o, 40, 20, 1765);
    			attr_dev(button3, "class", "btn badge btn-dark");
    			add_location(button3, file$o, 41, 24, 1826);
    			add_location(h25, file$o, 41, 20, 1822);
    			attr_dev(div5, "class", "card-body d-flex");
    			add_location(div5, file$o, 39, 16, 1713);
    			attr_dev(div6, "class", "card");
    			add_location(div6, file$o, 38, 12, 1677);
    			attr_dev(div7, "class", "col-md-6");
    			add_location(div7, file$o, 22, 8, 672);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$o, 16, 4, 427);
    			attr_dev(div9, "id", "$" + this.id);
    			attr_dev(div9, "class", "container-fluid");
    			add_location(div9, file$o, 15, 0, 376);
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
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Abilities",
    			options,
    			id: create_fragment$o.name
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
    const file$n = "src\\components\\Advancement.svelte";

    function get_each_context$a(ctx, list, i) {
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
    			add_location(h2, file$n, 46, 20, 1431);
    			attr_dev(button0, "class", "btn btn-dark");
    			add_location(button0, file$n, 49, 28, 1618);
    			attr_dev(button1, "class", "btn btn-light border border-dark");
    			add_location(button1, file$n, 50, 28, 1771);
    			attr_dev(div0, "class", "btn-group align-self-center mr-1");
    			add_location(div0, file$n, 48, 24, 1542);
    			attr_dev(button2, "class", "btn btn-dark");
    			add_location(button2, file$n, 53, 28, 2011);
    			attr_dev(button3, "class", "btn btn-light border border-dark");
    			add_location(button3, file$n, 54, 28, 2151);
    			attr_dev(div1, "class", "btn-group align-self-center");
    			add_location(div1, file$n, 52, 24, 1940);
    			attr_dev(div2, "class", "d-flex");
    			add_location(div2, file$n, 47, 20, 1496);
    			attr_dev(div3, "class", "card-body");
    			add_location(div3, file$n, 45, 16, 1386);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$n, 44, 12, 1350);
    			attr_dev(div5, "class", "col-md-6");
    			add_location(div5, file$n, 43, 8, 1314);
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
    		id: create_each_block_1$3.name,
    		type: "each",
    		source: "(43:8) {#each ['Fate', 'Persona'] as artha}",
    		ctx
    	});

    	return block;
    }

    // (91:28) {#each levels as level}
    function create_each_block$a(ctx) {
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
    			add_location(td0, file$n, 92, 32, 4016);
    			add_location(td1, file$n, 93, 32, 4072);
    			add_location(td2, file$n, 94, 32, 4127);
    			add_location(tr, file$n, 91, 28, 3978);
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
    		id: create_each_block$a.name,
    		type: "each",
    		source: "(91:28) {#each levels as level}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
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
    		each_blocks_1[i] = create_each_block_1$3(get_each_context_1$3(ctx, each_value_1, i));
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
    		each_blocks[i] = create_each_block$a(get_each_context$a(ctx, each_value, i));
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
    			add_location(h2, file$n, 64, 20, 2509);
    			attr_dev(button0, "class", "position-topright btn badge btn-light border border-dark");
    			add_location(button0, file$n, 66, 20, 2643);
    			attr_dev(div0, "class", "card-body");
    			add_location(div0, file$n, 63, 16, 2464);
    			attr_dev(div1, "class", "card");
    			add_location(div1, file$n, 62, 12, 2428);
    			attr_dev(div2, "class", "col-12");
    			add_location(div2, file$n, 61, 8, 2394);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$n, 41, 4, 1241);
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "levelRequirementsTitle");
    			add_location(h5, file$n, 75, 20, 3169);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$n, 77, 24, 3402);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "close");
    			attr_dev(button1, "data-dismiss", "modal");
    			attr_dev(button1, "aria-label", "Close");
    			add_location(button1, file$n, 76, 20, 3266);
    			attr_dev(div4, "class", "modal-header");
    			add_location(div4, file$n, 74, 16, 3121);
    			add_location(th0, file$n, 84, 32, 3682);
    			add_location(th1, file$n, 85, 32, 3730);
    			add_location(th2, file$n, 86, 32, 3777);
    			add_location(tr, file$n, 83, 28, 3644);
    			add_location(thead, file$n, 82, 24, 3607);
    			add_location(tbody, file$n, 89, 24, 3888);
    			attr_dev(table, "class", "table");
    			add_location(table, file$n, 81, 20, 3560);
    			attr_dev(div5, "class", "modal-body");
    			add_location(div5, file$n, 80, 16, 3514);
    			attr_dev(div6, "class", "modal-content");
    			add_location(div6, file$n, 73, 12, 3076);
    			attr_dev(div7, "class", "modal-dialog");
    			attr_dev(div7, "role", "document");
    			add_location(div7, file$n, 72, 8, 3020);
    			attr_dev(div8, "class", "modal fade");
    			attr_dev(div8, "tabindex", "-1");
    			attr_dev(div8, "role", "dialog");
    			attr_dev(div8, "aria-labelledby", "levelRequirements");
    			attr_dev(div8, "aria-hidden", "true");
    			toggle_class(div8, "show", /*showHelp*/ ctx[1]);
    			set_style(div8, "display", /*showHelp*/ ctx[1] ? 'block' : 'none', false);
    			add_location(div8, file$n, 71, 4, 2837);
    			attr_dev(div9, "id", "$" + this.id);
    			attr_dev(div9, "class", "container-fluid text-nowrap");
    			add_location(div9, file$n, 40, 0, 1178);
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
    					const child_ctx = get_each_context_1$3(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$3(child_ctx);
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
    					const child_ctx = get_each_context$a(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$a(child_ctx);
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
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Advancement",
    			options,
    			id: create_fragment$n.name
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
    const file$m = "src\\components\\TextArea.svelte";

    // (19:0) {:else}
    function create_else_block$a(ctx) {
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
    			add_location(span, file$m, 20, 4, 574);
    			attr_dev(button, "class", "btn btn-light text-left align-top wrap");
    			set_style(button, "min-height", "2.5em");
    			add_location(button, file$m, 21, 4, 650);
    			attr_dev(div, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
    			add_location(div, file$m, 19, 0, 513);
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
    		id: create_else_block$a.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:0) {#if active}
    function create_if_block$g(ctx) {
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
    			add_location(span, file$m, 15, 4, 292);
    			attr_dev(textarea, "class", "flex-grow-1 form-control");
    			add_location(textarea, file$m, 16, 4, 368);
    			attr_dev(div, "class", "d-flex flex-column mb-1 col-lg-3 col-md-4");
    			add_location(div, file$m, 14, 0, 231);
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
    		id: create_if_block$g.name,
    		type: "if",
    		source: "(14:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$m(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$g, create_else_block$a];
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
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextArea",
    			options,
    			id: create_fragment$m.name
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
    const file$l = "src\\components\\TextInput.svelte";

    // (19:0) {:else}
    function create_else_block$9(ctx) {
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
    			add_location(span, file$l, 20, 4, 621);
    			attr_dev(button, "class", "flex-grow-1 btn btn-light text-left");
    			add_location(button, file$l, 21, 4, 752);
    			attr_dev(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
    			add_location(div, file$l, 19, 0, 558);
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
    		id: create_else_block$9.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:0) {#if active}
    function create_if_block$f(ctx) {
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
    			add_location(span, file$l, 15, 4, 294);
    			attr_dev(input, "class", "flex-grow-1 form-control");
    			add_location(input, file$l, 16, 4, 427);
    			attr_dev(div, "class", "d-flex mb-1 border-bottom col-lg-3 col-md-4");
    			add_location(div, file$l, 14, 0, 231);
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
    		id: create_if_block$f.name,
    		type: "if",
    		source: "(14:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$l(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$f, create_else_block$9];
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
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextInput",
    			options,
    			id: create_fragment$l.name
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
    const file$k = "src\\components\\Bio.svelte";

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
    function create_default_slot_2$3(ctx) {
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
    		id: create_default_slot_2$3.name,
    		type: "slot",
    		source: "(30:16) <TextArea bind:content={model.bio.creed}>",
    		ctx
    	});

    	return block;
    }

    // (31:16) <TextArea bind:content={model.bio.goal}>
    function create_default_slot_1$4(ctx) {
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
    		id: create_default_slot_1$4.name,
    		type: "slot",
    		source: "(31:16) <TextArea bind:content={model.bio.goal}>",
    		ctx
    	});

    	return block;
    }

    // (32:16) <TextArea bind:content={model.bio.instinct}>
    function create_default_slot$5(ctx) {
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
    		id: create_default_slot$5.name,
    		type: "slot",
    		source: "(32:16) <TextArea bind:content={model.bio.instinct}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$k(ctx) {
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
    		$$slots: { default: [create_default_slot_2$3] },
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
    		$$slots: { default: [create_default_slot_1$4] },
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
    		$$slots: { default: [create_default_slot$5] },
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
    			add_location(div0, file$k, 11, 12, 260);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$k, 10, 8, 223);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$k, 9, 4, 195);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$k, 27, 12, 1177);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$k, 26, 8, 1140);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$k, 25, 4, 1112);
    			attr_dev(div6, "id", "$" + this.id);
    			attr_dev(div6, "class", "container-fluid");
    			add_location(div6, file$k, 8, 0, 144);
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
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bio",
    			options,
    			id: create_fragment$k.name
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
    const file$j = "src\\components\\Circle.svelte";

    function get_each_context$9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[12] = list;
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (34:12) {:else}
    function create_else_block$8(ctx) {
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
    			add_location(button, file$j, 34, 12, 795);
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
    		id: create_else_block$8.name,
    		type: "else",
    		source: "(34:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (32:12) {#if editIndex == i}
    function create_if_block$e(ctx) {
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
    			add_location(input_1, file$j, 32, 12, 673);
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
    		id: create_if_block$e.name,
    		type: "if",
    		source: "(32:12) {#if editIndex == i}",
    		ctx
    	});

    	return block;
    }

    // (31:12) {#each items as item, i}
    function create_each_block$9(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*editIndex*/ ctx[2] == /*i*/ ctx[13]) return create_if_block$e;
    		return create_else_block$8;
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
    		id: create_each_block$9.name,
    		type: "each",
    		source: "(31:12) {#each items as item, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$j(ctx) {
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
    		each_blocks[i] = create_each_block$9(get_each_context$9(ctx, each_value, i));
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
    			add_location(h2, file$j, 29, 12, 565);
    			attr_dev(div0, "class", "d-flex flex-column");
    			add_location(div0, file$j, 28, 8, 519);
    			attr_dev(button0, "class", "btn btn-light border my-1");
    			add_location(button0, file$j, 39, 12, 998);
    			attr_dev(button1, "class", "btn btn-light border my-1");
    			add_location(button1, file$j, 40, 12, 1081);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$j, 38, 8, 961);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$j, 27, 4, 486);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$j, 26, 0, 462);
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
    					const child_ctx = get_each_context$9(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$9(child_ctx);
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
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Circle",
    			options,
    			id: create_fragment$j.name
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
    const file$i = "src\\components\\Circles.svelte";

    // (10:12) <Circle items={circles.friends}>
    function create_default_slot_1$3(ctx) {
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
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(10:12) <Circle items={circles.friends}>",
    		ctx
    	});

    	return block;
    }

    // (13:12) <Circle items={circles.enemies}>
    function create_default_slot$4(ctx) {
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
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(13:12) <Circle items={circles.enemies}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
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
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	circle1 = new Circle({
    			props: {
    				items: /*circles*/ ctx[0].enemies,
    				$$slots: { default: [create_default_slot$4] },
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
    			add_location(div0, file$i, 8, 8, 154);
    			attr_dev(div1, "class", "col-md-6");
    			add_location(div1, file$i, 11, 8, 264);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$i, 7, 4, 127);
    			attr_dev(div3, "class", "container-fluid");
    			add_location(div3, file$i, 6, 0, 92);
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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { circles: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Circles",
    			options,
    			id: create_fragment$i.name
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

    const file$h = "src\\components\\Condition.svelte";

    function create_fragment$h(ctx) {
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
    			add_location(button, file$h, 4, 0, 57);
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { selected: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Condition",
    			options,
    			id: create_fragment$h.name
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
    const file$g = "src\\components\\Conditions.svelte";

    function get_each_context$8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (59:0) {:else}
    function create_else_block$7(ctx) {
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
    			add_location(button, file$g, 60, 4, 3028);
    			attr_dev(div, "class", "container-fluid");
    			add_location(div, file$g, 59, 0, 2993);
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
    		id: create_else_block$7.name,
    		type: "else",
    		source: "(59:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#if shown}
    function create_if_block$d(ctx) {
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
    		$$slots: { default: [create_default_slot_2$2] },
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
    		$$slots: { default: [create_default_slot_1$2] },
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
    		$$slots: { default: [create_default_slot$3] },
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
    		each_blocks[i] = create_each_block$8(get_each_context$8(ctx, each_value, i));
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
    			add_location(div0, file$g, 24, 8, 1152);
    			attr_dev(button0, "class", "btn badge btn-light border border-dark");
    			add_location(button0, file$g, 35, 12, 1945);
    			attr_dev(button1, "class", "btn badge btn-light border border-dark");
    			add_location(button1, file$g, 36, 12, 2057);
    			attr_dev(div1, "class", "btn-group position-topright");
    			add_location(div1, file$g, 34, 8, 1890);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$g, 23, 4, 1124);
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$g, 43, 20, 2456);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$g, 45, 24, 2613);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "close");
    			add_location(button2, file$g, 44, 20, 2517);
    			attr_dev(div3, "class", "modal-header");
    			add_location(div3, file$g, 42, 16, 2408);
    			attr_dev(div4, "class", "modal-body");
    			add_location(div4, file$g, 48, 16, 2725);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file$g, 41, 12, 2363);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file$g, 40, 8, 2307);
    			attr_dev(div7, "class", "modal fade");
    			attr_dev(div7, "tabindex", "-1");
    			toggle_class(div7, "show", /*showHelp*/ ctx[2]);
    			set_style(div7, "display", /*showHelp*/ ctx[2] ? 'block' : 'none', false);
    			add_location(div7, file$g, 39, 4, 2193);
    			attr_dev(div8, "class", "container-fluid");
    			add_location(div8, file$g, 22, 0, 1089);
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
    					const child_ctx = get_each_context$8(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$8(child_ctx);
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
    		id: create_if_block$d.name,
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
    function create_default_slot_2$2(ctx) {
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
    		id: create_default_slot_2$2.name,
    		type: "slot",
    		source: "(31:12) <Condition bind:selected={model.conditions.injured}>",
    		ctx
    	});

    	return block;
    }

    // (32:12) <Condition bind:selected={model.conditions.sick}>
    function create_default_slot_1$2(ctx) {
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
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(32:12) <Condition bind:selected={model.conditions.sick}>",
    		ctx
    	});

    	return block;
    }

    // (33:12) <Condition bind:selected={model.conditions.dead}>
    function create_default_slot$3(ctx) {
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
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(33:12) <Condition bind:selected={model.conditions.dead}>",
    		ctx
    	});

    	return block;
    }

    // (50:20) {#each help as x}
    function create_each_block$8(ctx) {
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
    			add_location(h5, file$g, 50, 24, 2814);
    			add_location(p, file$g, 51, 24, 2858);
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
    		id: create_each_block$8.name,
    		type: "each",
    		source: "(50:20) {#each help as x}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$d, create_else_block$7];
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
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { model: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Conditions",
    			options,
    			id: create_fragment$g.name
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
    const file$f = "src\\components\\Item.svelte";

    // (55:4) {:else}
    function create_else_block$6(ctx) {
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
    	let if_block = /*item*/ ctx[0].stackSize && create_if_block_1$b(ctx);

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
    			add_location(span0, file$f, 57, 12, 2426);
    			attr_dev(span1, "class", "btn btn-light text-left border border-dark flex-grow-1");
    			add_location(span1, file$f, 56, 8, 2343);
    			attr_dev(button, "class", "btn btn-light border border-dark flex-grow-0");
    			add_location(button, file$f, 62, 8, 2614);
    			attr_dev(span2, "draggable", "true");
    			attr_dev(span2, "class", "d-flex btn-group mb-1 w-100");
    			set_style(span2, "min-height", /*size*/ ctx[3] * 2.5 + "em");
    			add_location(span2, file$f, 55, 4, 2193);
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
    					if_block = create_if_block_1$b(ctx);
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
    		id: create_else_block$6.name,
    		type: "else",
    		source: "(55:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:4) {#if editing}
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
    			add_location(input, file$f, 27, 12, 623);
    			attr_dev(button0, "class", "" + (btnStyle + " btn-light ml-1"));
    			add_location(button0, file$f, 28, 12, 724);
    			attr_dev(div0, "class", "d-flex m-1");
    			add_location(div0, file$f, 26, 8, 585);
    			attr_dev(span0, "class", "" + (btnStyle + " btn-dark"));
    			add_location(span0, file$f, 31, 12, 895);
    			attr_dev(span1, "class", "ml-1");
    			add_location(span1, file$f, 32, 12, 961);
    			attr_dev(button1, "class", btnStyle);
    			add_location(button1, file$f, 34, 16, 1054);
    			attr_dev(button2, "class", btnStyle);
    			add_location(button2, file$f, 35, 16, 1155);
    			attr_dev(div1, "class", "btn-group ml-auto");
    			add_location(div1, file$f, 33, 12, 1005);
    			attr_dev(div2, "class", "d-flex m-1 align-items-center");
    			add_location(div2, file$f, 30, 8, 838);
    			attr_dev(span2, "class", "" + (btnStyle + " btn-dark"));
    			add_location(span2, file$f, 39, 12, 1342);
    			attr_dev(span3, "class", "ml-1");
    			add_location(span3, file$f, 40, 12, 1413);
    			attr_dev(button3, "class", btnStyle);
    			add_location(button3, file$f, 42, 16, 1506);
    			attr_dev(button4, "class", btnStyle);
    			add_location(button4, file$f, 43, 16, 1596);
    			attr_dev(div3, "class", "btn-group ml-auto");
    			add_location(div3, file$f, 41, 12, 1457);
    			attr_dev(div4, "class", "d-flex m-1 align-items-center");
    			add_location(div4, file$f, 38, 8, 1285);
    			attr_dev(button5, "class", "" + (btnStyle + " btn-light"));
    			add_location(button5, file$f, 48, 16, 1813);
    			attr_dev(button6, "class", "" + (btnStyle + " btn-light"));
    			add_location(button6, file$f, 49, 16, 1923);
    			attr_dev(div5, "class", "btn-group");
    			add_location(div5, file$f, 47, 12, 1772);
    			attr_dev(button7, "class", "" + (btnStyle + " btn-light ml-auto"));
    			add_location(button7, file$f, 51, 12, 2048);
    			attr_dev(div6, "class", "d-flex m-1 align-items-center");
    			add_location(div6, file$f, 46, 8, 1715);
    			attr_dev(div7, "class", "btn bg-light mb-1 p-0 w-100 border");
    			add_location(div7, file$f, 25, 4, 527);
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
    		id: create_if_block$c.name,
    		type: "if",
    		source: "(25:4) {#if editing}",
    		ctx
    	});

    	return block;
    }

    // (59:12) {#if item.stackSize}
    function create_if_block_1$b(ctx) {
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding(value) {
    		/*bubbles_value_binding*/ ctx[14](value);
    	}

    	let bubbles_props = {
    		count: /*item*/ ctx[0].stackSize,
    		$$slots: { default: [create_default_slot$2] },
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
    		id: create_if_block_1$b.name,
    		type: "if",
    		source: "(59:12) {#if item.stackSize}",
    		ctx
    	});

    	return block;
    }

    // (60:12) <Bubbles count={item.stackSize} bind:value={item.stack}>
    function create_default_slot$2(ctx) {
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
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(60:12) <Bubbles count={item.stackSize} bind:value={item.stack}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$c, create_else_block$6];
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
    			add_location(div, file$f, 23, 0, 497);
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const btnStyle = 'btn border border-dark align-self-start';

    function instance$f($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { item: 0, actions: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Item",
    			options,
    			id: create_fragment$f.name
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
    const file$e = "src\\components\\Container.svelte";

    function get_each_context$7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (112:12) {:else}
    function create_else_block_1$4(ctx) {
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
    			add_location(span, file$e, 113, 16, 3723);
    			attr_dev(h5, "class", "m-0");
    			add_location(h5, file$e, 112, 12, 3689);
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
    		id: create_else_block_1$4.name,
    		type: "else",
    		source: "(112:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (108:51) 
    function create_if_block_5$2(ctx) {
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
    			add_location(button, file$e, 109, 16, 3509);
    			attr_dev(h4, "class", "flex-grow-1 m-0");
    			add_location(h4, file$e, 108, 12, 3463);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[20], false, false, false);
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
    		id: create_if_block_5$2.name,
    		type: "if",
    		source: "(108:51) ",
    		ctx
    	});

    	return block;
    }

    // (106:63) 
    function create_if_block_4$2(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control mr-2");
    			add_location(input_1, file$e, 106, 12, 3284);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			/*input_1_binding*/ ctx[18](input_1);
    			set_input_value(input_1, /*container*/ ctx[0].name);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*blur_handler*/ ctx[17], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[19])
    				];

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
    			/*input_1_binding*/ ctx[18](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(106:63) ",
    		ctx
    	});

    	return block;
    }

    // (102:12) {#if container.format == 'pack'}
    function create_if_block_3$4(ctx) {
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
    			add_location(button, file$e, 103, 16, 3071);
    			attr_dev(h4, "class", "flex-grow-1 m-0");
    			add_location(h4, file$e, 102, 12, 3025);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*togglePack*/ ctx[14], false, false, false);
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
    		id: create_if_block_3$4.name,
    		type: "if",
    		source: "(102:12) {#if container.format == 'pack'}",
    		ctx
    	});

    	return block;
    }

    // (121:12) {:else}
    function create_else_block$5(ctx) {
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
    			add_location(span, file$e, 122, 16, 4045);
    			attr_dev(h5, "class", "ml-auto mr-1");
    			add_location(h5, file$e, 121, 12, 4002);
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
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(121:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (117:12) {#if canAdd}
    function create_if_block_2$7(ctx) {
    	let h5;
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			span = element("span");
    			t = text(/*occupied*/ ctx[2]);
    			attr_dev(span, "class", "badge btn btn-light");
    			add_location(span, file$e, 118, 16, 3897);
    			attr_dev(h5, "class", "ml-auto mr-1");
    			add_location(h5, file$e, 117, 12, 3854);
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
    		id: create_if_block_2$7.name,
    		type: "if",
    		source: "(117:12) {#if canAdd}",
    		ctx
    	});

    	return block;
    }

    // (133:16) {#each container.items as item (item.id)}
    function create_each_block$7(key_1, ctx) {
    	let first;
    	let item;
    	let current;

    	item = new Item({
    			props: {
    				item: /*item*/ ctx[23],
    				actions: /*itemActions*/ ctx[8]
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
    			if (dirty & /*container*/ 1) item_changes.item = /*item*/ ctx[23];
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
    		id: create_each_block$7.name,
    		type: "each",
    		source: "(133:16) {#each container.items as item (item.id)}",
    		ctx
    	});

    	return block;
    }

    // (136:16) {#if space > 0}
    function create_if_block_1$a(ctx) {
    	let button;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.disabled = /*disableAdd*/ ctx[6];

    			attr_dev(button, "class", button_class_value = "drop btn border mb-1 " + (/*disableAdd*/ ctx[6]
    			? 'disabled btn-secondary'
    			: 'btn-light'));

    			set_style(button, "height", 2.5 * /*space*/ ctx[3] + "em");
    			add_location(button, file$e, 136, 16, 4690);
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
    			if (dirty & /*disableAdd*/ 64) {
    				prop_dev(button, "disabled", /*disableAdd*/ ctx[6]);
    			}

    			if (dirty & /*disableAdd*/ 64 && button_class_value !== (button_class_value = "drop btn border mb-1 " + (/*disableAdd*/ ctx[6]
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
    		id: create_if_block_1$a.name,
    		type: "if",
    		source: "(136:16) {#if space > 0}",
    		ctx
    	});

    	return block;
    }

    // (149:12) {#if container.format == 'custom'}
    function create_if_block$b(ctx) {
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
    			add_location(button, file$e, 150, 16, 5280);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$e, 149, 12, 5242);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[22], false, false, false);
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
    		id: create_if_block$b.name,
    		type: "if",
    		source: "(149:12) {#if container.format == 'custom'}",
    		ctx
    	});

    	return block;
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
    		if (/*container*/ ctx[0].format == 'pack') return create_if_block_3$4;
    		if (/*container*/ ctx[0].format == 'custom' && /*editName*/ ctx[4]) return create_if_block_4$2;
    		if (/*container*/ ctx[0].format == 'custom') return create_if_block_5$2;
    		return create_else_block_1$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*canAdd*/ ctx[7]) return create_if_block_2$7;
    		return create_else_block$5;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);
    	let each_value = /*container*/ ctx[0].items;
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[23].id;
    	validate_each_keys(ctx, each_value, get_each_context$7, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$7(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$7(key, child_ctx));
    	}

    	let if_block2 = /*space*/ ctx[3] > 0 && create_if_block_1$a(ctx);
    	let if_block3 = /*container*/ ctx[0].format == 'custom' && create_if_block$b(ctx);

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
    			add_location(button0, file$e, 126, 16, 4213);
    			attr_dev(button1, "class", smallButton);
    			add_location(button1, file$e, 127, 16, 4315);
    			attr_dev(div0, "class", "ml-1 btn-group");
    			add_location(div0, file$e, 125, 12, 4167);
    			attr_dev(div1, "class", "card-header p-2 d-flex");
    			add_location(div1, file$e, 100, 8, 2929);
    			attr_dev(div2, "class", "d-flex flex-column");
    			add_location(div2, file$e, 131, 12, 4463);
    			attr_dev(div3, "class", "card-body");
    			add_location(div3, file$e, 130, 8, 4426);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$e, 99, 4, 2901);
    			attr_dev(div5, "class", "col-lg-3 col-md-4 col-sm-6 my-1");
    			add_location(div5, file$e, 98, 0, 2850);
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
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[21], false, false, false),
    					listen_dev(button1, "click", /*sort*/ ctx[13], false, false, false)
    				];

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

    			if (dirty & /*container, itemActions*/ 257) {
    				each_value = /*container*/ ctx[0].items;
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$7, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div2, outro_and_destroy_block, create_each_block$7, t6, get_each_context$7);
    				check_outros();
    			}

    			if (/*space*/ ctx[3] > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$a(ctx);
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

    const smallButton = 'badge btn btn-light border border-dark align-self-center p-2';

    function dragLeave(e) {
    	e.target.classList.remove('dragover');
    }

    function instance$e($$self, $$props, $$invalidate) {
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

    	const writable_props = ['container', 'dragItem', 'actions'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Container> was created with unknown prop '${key}'`);
    	});

    	const blur_handler = () => $$invalidate(4, editName = false);

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(5, input);
    		});
    	}

    	function input_1_input_handler() {
    		container.name = this.value;
    		$$invalidate(0, container);
    	}

    	const click_handler = () => $$invalidate(4, editName = true);
    	const click_handler_1 = () => actions.hide(container);
    	const click_handler_2 = () => actions.delete(container);

    	$$self.$$set = $$props => {
    		if ('container' in $$props) $$invalidate(0, container = $$props.container);
    		if ('dragItem' in $$props) $$invalidate(15, dragItem = $$props.dragItem);
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
    		sort,
    		togglePack,
    		occupied,
    		canTransfer,
    		space,
    		disableAdd
    	});

    	$$self.$inject_state = $$props => {
    		if ('container' in $$props) $$invalidate(0, container = $$props.container);
    		if ('dragItem' in $$props) $$invalidate(15, dragItem = $$props.dragItem);
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('editName' in $$props) $$invalidate(4, editName = $$props.editName);
    		if ('input' in $$props) $$invalidate(5, input = $$props.input);
    		if ('occupied' in $$props) $$invalidate(2, occupied = $$props.occupied);
    		if ('canTransfer' in $$props) $$invalidate(16, canTransfer = $$props.canTransfer);
    		if ('space' in $$props) $$invalidate(3, space = $$props.space);
    		if ('disableAdd' in $$props) $$invalidate(6, disableAdd = $$props.disableAdd);
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

    		if ($$self.$$.dirty & /*dragItem, space*/ 32776) {
    			$$invalidate(16, canTransfer = dragItem != null && (canAdd || dragItem.size <= space));
    		}

    		if ($$self.$$.dirty & /*dragItem, space, canTransfer*/ 98312) {
    			$$invalidate(6, disableAdd = dragItem == null && space == 0 && !canTransfer);
    		}
    	};

    	return [
    		container,
    		actions,
    		occupied,
    		space,
    		editName,
    		input,
    		disableAdd,
    		canAdd,
    		itemActions,
    		add,
    		dragEnter,
    		dragOver,
    		drop,
    		sort,
    		togglePack,
    		dragItem,
    		canTransfer,
    		blur_handler,
    		input_1_binding,
    		input_1_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Container extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { container: 0, dragItem: 15, actions: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Container",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*container*/ ctx[0] === undefined && !('container' in props)) {
    			console_1$1.warn("<Container> was created without expected prop 'container'");
    		}

    		if (/*dragItem*/ ctx[15] === undefined && !('dragItem' in props)) {
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
    const file$d = "src\\components\\Inventory.svelte";

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[9] = list;
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (61:24) {#if container.hide}
    function create_if_block_1$9(ctx) {
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
    			add_location(button, file$d, 61, 24, 1925);
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
    		id: create_if_block_1$9.name,
    		type: "if",
    		source: "(61:24) {#if container.hide}",
    		ctx
    	});

    	return block;
    }

    // (60:24) {#each inventory as container}
    function create_each_block_1$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*container*/ ctx[6].hide && create_if_block_1$9(ctx);

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
    			if (/*container*/ ctx[6].hide) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$9(ctx);
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
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(60:24) {#each inventory as container}",
    		ctx
    	});

    	return block;
    }

    // (70:8) {#if !container.hide}
    function create_if_block$a(ctx) {
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
    		id: create_if_block$a.name,
    		type: "if",
    		source: "(70:8) {#if !container.hide}",
    		ctx
    	});

    	return block;
    }

    // (69:8) {#each inventory as container (container.id)}
    function create_each_block$6(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let current;
    	let if_block = !/*container*/ ctx[6].hide && create_if_block$a(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!/*container*/ ctx[6].hide) {
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
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$6.name,
    		type: "each",
    		source: "(69:8) {#each inventory as container (container.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
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
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*inventory*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	let each_value = /*inventory*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*container*/ ctx[6].id;
    	validate_each_keys(ctx, each_value, get_each_context$6, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$6(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block$6(key, child_ctx));
    	}

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
    			add_location(h5, file$d, 54, 20, 1559);
    			attr_dev(div0, "class", "card-header p-2");
    			add_location(div0, file$d, 53, 16, 1508);
    			attr_dev(button, "class", "btn btn-light border");
    			add_location(button, file$d, 57, 20, 1696);
    			add_location(div1, file$d, 58, 20, 1792);
    			attr_dev(div2, "class", "card-body d-flex flex-column");
    			add_location(div2, file$d, 56, 16, 1632);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$d, 52, 12, 1472);
    			attr_dev(div4, "class", "col-md-12 my-1");
    			add_location(div4, file$d, 51, 8, 1430);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$d, 50, 4, 1403);
    			attr_dev(div6, "class", "container-fluid");
    			add_location(div6, file$d, 49, 0, 1368);
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

    			if (dirty & /*inventory, dragItem, actions*/ 7) {
    				each_value = /*inventory*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$6, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each1_lookup, div5, outro_and_destroy_block, create_each_block$6, null, get_each_context$6);
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
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks_1, detaching);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
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
    			container.hide = true;
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

    	const click_handler = (container, each_value_1, container_index_1) => $$invalidate(0, each_value_1[container_index_1].hide = false, inventory);

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

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*inventory*/ 1) {
    			{
    				inventory.forEach(container => {
    					if (!container.id) container.id = crypto.randomUUID();
    				});
    			}
    		}
    	};

    	return [inventory, dragItem, actions, add, click_handler];
    }

    class Inventory extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { inventory: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Inventory",
    			options,
    			id: create_fragment$d.name
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

    const file$c = "src\\components\\NavLink.svelte";

    function create_fragment$c(ctx) {
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
    			add_location(a, file$c, 5, 0, 75);
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { tabValue: 1, tab: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NavLink",
    			options,
    			id: create_fragment$c.name
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
    const file$b = "src\\components\\Navbar.svelte";

    function get_each_context$5(ctx, list, i) {
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
    function create_default_slot_2$1(ctx) {
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
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(104:12) <NavLink bind:tab={tab} tabValue=\\\"spells\\\">",
    		ctx
    	});

    	return block;
    }

    // (105:12) <NavLink bind:tab={tab} tabValue="traits">
    function create_default_slot_1$1(ctx) {
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
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(105:12) <NavLink bind:tab={tab} tabValue=\\\"traits\\\">",
    		ctx
    	});

    	return block;
    }

    // (106:12) <NavLink bind:tab={tab} tabValue="wises">
    function create_default_slot$1(ctx) {
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
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(106:12) <NavLink bind:tab={tab} tabValue=\\\"wises\\\">",
    		ctx
    	});

    	return block;
    }

    // (110:20) {#each characters as character}
    function create_each_block$5(ctx) {
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
    			add_location(button, file$b, 110, 24, 3601);
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
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(110:20) {#each characters as character}",
    		ctx
    	});

    	return block;
    }

    // (141:23) 
    function create_if_block_1$8(ctx) {
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
    			add_location(strong, file$b, 142, 4, 5812);
    			attr_dev(button, "class", "alert alert-static alert-danger btn text-center w-100");
    			add_location(button, file$b, 141, 0, 5657);
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
    		id: create_if_block_1$8.name,
    		type: "if",
    		source: "(141:23) ",
    		ctx
    	});

    	return block;
    }

    // (137:0) {#if alert?.success}
    function create_if_block$9(ctx) {
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
    			add_location(strong, file$b, 138, 4, 5587);
    			attr_dev(button, "class", "alert alert-static alert-success btn text-center w-100");
    			add_location(button, file$b, 137, 0, 5431);
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
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(137:0) {#if alert?.success}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
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
    		$$slots: { default: [create_default_slot_2$1] },
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
    		$$slots: { default: [create_default_slot_1$1] },
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
    		$$slots: { default: [create_default_slot$1] },
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
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*alert*/ ctx[4]?.success) return create_if_block$9;
    		if (/*alert*/ ctx[4]?.error) return create_if_block_1$8;
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
    			add_location(span, file$b, 92, 8, 2295);
    			attr_dev(button0, "class", "navbar-toggler");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$b, 91, 4, 2211);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "nav-link dropdown-toggle");
    			toggle_class(a0, "disabled", !/*characters*/ ctx[3].length);
    			add_location(a0, file$b, 107, 16, 3259);
    			attr_dev(div0, "class", "dropdown-menu");
    			attr_dev(div0, "style", div0_style_value = `display: ${/*menu*/ ctx[2] == 'characters' ? 'block' : 'none'}`);
    			add_location(div0, file$b, 108, 16, 3431);
    			attr_dev(li0, "class", "nav-item dropdown");
    			add_location(li0, file$b, 106, 12, 3211);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-link dropdown-toggle");
    			add_location(a1, file$b, 115, 16, 3849);
    			attr_dev(button1, "class", "dropdown-item");
    			add_location(button1, file$b, 117, 20, 4080);
    			attr_dev(button2, "class", "dropdown-item");
    			add_location(button2, file$b, 118, 20, 4223);
    			attr_dev(div1, "class", "dropdown-menu");
    			attr_dev(div1, "style", div1_style_value = `display: ${/*menu*/ ctx[2] == 'mods' ? 'block' : 'none'}`);
    			add_location(div1, file$b, 116, 16, 3973);
    			attr_dev(li1, "class", "nav-item dropdown");
    			add_location(li1, file$b, 114, 12, 3801);
    			attr_dev(ul, "class", "navbar-nav mr-auto");
    			add_location(ul, file$b, 95, 8, 2432);
    			attr_dev(button3, "href", "#");
    			attr_dev(button3, "class", "dropdown-toggle btn btn-light border border-dark");
    			add_location(button3, file$b, 124, 16, 4522);
    			attr_dev(button4, "class", "dropdown-item");
    			add_location(button4, file$b, 126, 20, 4796);
    			attr_dev(button5, "class", "dropdown-item");
    			add_location(button5, file$b, 127, 20, 4902);
    			attr_dev(button6, "class", "dropdown-item");
    			add_location(button6, file$b, 128, 20, 5012);
    			attr_dev(button7, "class", "dropdown-item");
    			add_location(button7, file$b, 129, 20, 5122);
    			attr_dev(button8, "class", "dropdown-item");
    			add_location(button8, file$b, 130, 20, 5232);
    			attr_dev(div2, "class", "dropdown-menu");
    			attr_dev(div2, "style", div2_style_value = `display: ${/*menu*/ ctx[2] == 'options' ? 'block' : 'none'}`);
    			add_location(div2, file$b, 125, 16, 4686);
    			attr_dev(div3, "class", "nav-item dropdown");
    			add_location(div3, file$b, 123, 12, 4473);
    			attr_dev(div4, "class", "navbar-nav");
    			add_location(div4, file$b, 122, 8, 4435);
    			attr_dev(div5, "class", "collapse navbar-collapse");
    			set_style(div5, "display", /*navDisplay*/ ctx[1], false);
    			add_location(div5, file$b, 94, 4, 2357);
    			attr_dev(nav, "class", "navbar navbar-expand-md navbar-light bg-light");
    			add_location(nav, file$b, 90, 0, 2146);
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const autosaveInterval = 10000; // 10s

    function instance$b($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { model: 16, tab: 0 }, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$b.name
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

    /* src\components\Note.svelte generated by Svelte v3.48.0 */
    const file$a = "src\\components\\Note.svelte";

    // (24:0) {:else}
    function create_else_block$4(ctx) {
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
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*editTitle*/ ctx[3]) return create_if_block_2$6;
    		return create_else_block_2$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*editContent*/ ctx[4]) return create_if_block_1$7;
    		return create_else_block_1$3;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			button0 = element("button");
    			button0.textContent = "hide";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "delete";
    			t4 = space();
    			div1 = element("div");
    			if_block1.c();
    			attr_dev(button0, "class", "badge btn btn-light border ml-1 p-2");
    			add_location(button0, file$a, 33, 16, 1253);
    			attr_dev(button1, "class", "badge btn btn-light border ml-1 p-2");
    			add_location(button1, file$a, 34, 16, 1369);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$a, 27, 12, 833);
    			attr_dev(div1, "class", "d-flex");
    			add_location(div1, file$a, 36, 12, 1508);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$a, 26, 8, 796);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$a, 25, 4, 768);
    			attr_dev(div4, "class", "col-12");
    			add_location(div4, file$a, 24, 0, 742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			if_block0.m(div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, button0);
    			append_dev(div0, t2);
    			append_dev(div0, button1);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			if_block1.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_3*/ ctx[13], false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if_block0.d();
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(24:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (19:0) {#if collapse}
    function create_if_block$8(ctx) {
    	let div;
    	let h4;
    	let button0;
    	let t0_value = /*note*/ ctx[0].title + "";
    	let t0;
    	let t1;
    	let button1;
    	let t2_value = dateUtil.shortDate(/*dateValue*/ ctx[6]) + "";
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h4 = element("h4");
    			button0 = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			button1 = element("button");
    			t2 = text(t2_value);
    			attr_dev(button0, "class", "badge btn btn-light w-100 text-left");
    			set_style(button0, "min-height", "2.2em");
    			add_location(button0, file$a, 20, 32, 452);
    			attr_dev(h4, "class", "flex-grow-1 m-0");
    			add_location(h4, file$a, 20, 4, 424);
    			attr_dev(button1, "class", "badge btn btn-light border ml-1 p-2");
    			add_location(button1, file$a, 21, 4, 597);
    			attr_dev(div, "class", "col-12 d-flex");
    			add_location(div, file$a, 19, 0, 391);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h4);
    			append_dev(h4, button0);
    			append_dev(button0, t0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*note*/ 1 && t0_value !== (t0_value = /*note*/ ctx[0].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*dateValue*/ 64 && t2_value !== (t2_value = dateUtil.shortDate(/*dateValue*/ ctx[6]) + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(19:0) {#if collapse}",
    		ctx
    	});

    	return block;
    }

    // (31:16) {:else}
    function create_else_block_2$2(ctx) {
    	let h4;
    	let button;
    	let t_value = /*note*/ ctx[0].title + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn btn-light w-100 text-left");
    			set_style(button, "min-height", "2.2em");
    			add_location(button, file$a, 31, 44, 1079);
    			attr_dev(h4, "class", "flex-grow-1 m-0");
    			add_location(h4, file$a, 31, 16, 1051);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*note*/ 1 && t_value !== (t_value = /*note*/ ctx[0].title + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2$2.name,
    		type: "else",
    		source: "(31:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (29:16) {#if editTitle}
    function create_if_block_2$6(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control");
    			add_location(input_1, file$a, 29, 16, 904);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			/*input_1_binding*/ ctx[10](input_1);
    			set_input_value(input_1, /*note*/ ctx[0].title);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*blur_handler*/ ctx[9], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[11])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*note*/ 1 && input_1.value !== /*note*/ ctx[0].title) {
    				set_input_value(input_1, /*note*/ ctx[0].title);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[10](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$6.name,
    		type: "if",
    		source: "(29:16) {#if editTitle}",
    		ctx
    	});

    	return block;
    }

    // (40:16) {:else}
    function create_else_block_1$3(ctx) {
    	let button;
    	let t_value = /*note*/ ctx[0].content + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn btn-light text-left align-top wrap w-100 border");
    			set_style(button, "min-height", "2.5em");
    			add_location(button, file$a, 40, 16, 1758);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_5*/ ctx[18], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*note*/ 1 && t_value !== (t_value = /*note*/ ctx[0].content + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$3.name,
    		type: "else",
    		source: "(40:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (38:16) {#if editContent}
    function create_if_block_1$7(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "class", "flex-grow-1 form-control");
    			add_location(textarea, file$a, 38, 16, 1581);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			/*textarea_binding*/ ctx[15](textarea);
    			set_input_value(textarea, /*note*/ ctx[0].content);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "blur", /*blur_handler_1*/ ctx[16], false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*note*/ 1) {
    				set_input_value(textarea, /*note*/ ctx[0].content);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			/*textarea_binding*/ ctx[15](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$7.name,
    		type: "if",
    		source: "(38:16) {#if editContent}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*collapse*/ ctx[2]) return create_if_block$8;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
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
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	let dateValue;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Note', slots, []);
    	let { actions } = $$props;
    	let { note } = $$props;
    	let collapse = true;
    	let editTitle = false;
    	let editContent = false;
    	let input;

    	afterUpdate(() => {
    		if (input) input.focus();
    	});

    	const writable_props = ['actions', 'note'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Note> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, collapse = false);
    	const click_handler_1 = () => $$invalidate(2, collapse = false);
    	const blur_handler = () => $$invalidate(3, editTitle = false);

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(5, input);
    		});
    	}

    	function input_1_input_handler() {
    		note.title = this.value;
    		$$invalidate(0, note);
    	}

    	const click_handler_2 = () => $$invalidate(3, editTitle = true);
    	const click_handler_3 = () => $$invalidate(2, collapse = true);
    	const click_handler_4 = () => actions.delete(note);

    	function textarea_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(5, input);
    		});
    	}

    	const blur_handler_1 = () => $$invalidate(4, editContent = false);

    	function textarea_input_handler() {
    		note.content = this.value;
    		$$invalidate(0, note);
    	}

    	const click_handler_5 = () => $$invalidate(4, editContent = true);

    	$$self.$$set = $$props => {
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('note' in $$props) $$invalidate(0, note = $$props.note);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		dateUtil,
    		actions,
    		note,
    		collapse,
    		editTitle,
    		editContent,
    		input,
    		dateValue
    	});

    	$$self.$inject_state = $$props => {
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('note' in $$props) $$invalidate(0, note = $$props.note);
    		if ('collapse' in $$props) $$invalidate(2, collapse = $$props.collapse);
    		if ('editTitle' in $$props) $$invalidate(3, editTitle = $$props.editTitle);
    		if ('editContent' in $$props) $$invalidate(4, editContent = $$props.editContent);
    		if ('input' in $$props) $$invalidate(5, input = $$props.input);
    		if ('dateValue' in $$props) $$invalidate(6, dateValue = $$props.dateValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*note*/ 1) {
    			$$invalidate(6, dateValue = new Date(note.date));
    		}
    	};

    	return [
    		note,
    		actions,
    		collapse,
    		editTitle,
    		editContent,
    		input,
    		dateValue,
    		click_handler,
    		click_handler_1,
    		blur_handler,
    		input_1_binding,
    		input_1_input_handler,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		textarea_binding,
    		blur_handler_1,
    		textarea_input_handler,
    		click_handler_5
    	];
    }

    class Note extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { actions: 1, note: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Note",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*actions*/ ctx[1] === undefined && !('actions' in props)) {
    			console.warn("<Note> was created without expected prop 'actions'");
    		}

    		if (/*note*/ ctx[0] === undefined && !('note' in props)) {
    			console.warn("<Note> was created without expected prop 'note'");
    		}
    	}

    	get actions() {
    		throw new Error("<Note>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Note>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get note() {
    		throw new Error("<Note>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set note(value) {
    		throw new Error("<Note>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Notes.svelte generated by Svelte v3.48.0 */
    const file$9 = "src\\components\\Notes.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (74:24) {#each filtered as note (note.id)}
    function create_each_block$4(key_1, ctx) {
    	let first;
    	let note;
    	let current;

    	note = new Note({
    			props: {
    				note: /*note*/ ctx[14],
    				actions: /*actions*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(note.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(note, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const note_changes = {};
    			if (dirty & /*filtered*/ 4) note_changes.note = /*note*/ ctx[14];
    			note.$set(note_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(note.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(note.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(note, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(74:24) {#each filtered as note (note.id)}",
    		ctx
    	});

    	return block;
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
    	let each_value = /*filtered*/ ctx[2];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*note*/ ctx[14].id;
    	validate_each_keys(ctx, each_value, get_each_context$4, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
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

    			attr_dev(button0, "class", "btn btn-light border mb-1 mr-1");
    			add_location(button0, file$9, 58, 24, 1643);
    			attr_dev(button1, "class", "dropdown-toggle btn btn-light border mb-1");
    			add_location(button1, file$9, 60, 28, 1800);
    			attr_dev(button2, "class", "dropdown-item");
    			add_location(button2, file$9, 62, 32, 2071);
    			attr_dev(button3, "class", "dropdown-item");
    			add_location(button3, file$9, 63, 32, 2202);
    			attr_dev(button4, "class", "dropdown-item");
    			add_location(button4, file$9, 64, 32, 2333);
    			attr_dev(button5, "class", "dropdown-item");
    			add_location(button5, file$9, 65, 32, 2467);
    			attr_dev(div0, "class", "dropdown-menu");
    			attr_dev(div0, "style", div0_style_value = `display: ${/*menu*/ ctx[1] == 'sort' ? 'block' : 'none'}`);
    			add_location(div0, file$9, 61, 28, 1952);
    			attr_dev(div1, "class", "dropdown");
    			add_location(div1, file$9, 59, 24, 1748);
    			attr_dev(div2, "class", "d-flex");
    			add_location(div2, file$9, 57, 20, 1597);
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", "filter");
    			add_location(input, file$9, 70, 24, 2732);
    			attr_dev(div3, "class", "d-flex");
    			add_location(div3, file$9, 69, 20, 2686);
    			attr_dev(div4, "class", "row mt-2");
    			add_location(div4, file$9, 72, 20, 2851);
    			attr_dev(div5, "class", "card-body");
    			add_location(div5, file$9, 56, 16, 1552);
    			attr_dev(div6, "class", "card");
    			add_location(div6, file$9, 55, 12, 1516);
    			attr_dev(div7, "class", "col");
    			add_location(div7, file$9, 54, 8, 1485);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$9, 53, 4, 1458);
    			attr_dev(div9, "class", "container-fluid");
    			add_location(div9, file$9, 52, 0, 1423);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, button1);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, button2);
    			append_dev(div0, t5);
    			append_dev(div0, button3);
    			append_dev(div0, t7);
    			append_dev(div0, button4);
    			append_dev(div0, t9);
    			append_dev(div0, button5);
    			append_dev(div5, t11);
    			append_dev(div5, div3);
    			append_dev(div3, input);
    			set_input_value(input, /*filter*/ ctx[0]);
    			append_dev(div5, t12);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*add*/ ctx[4], false, false, false),
    					listen_dev(button1, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[8], false, false, false),
    					listen_dev(button2, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button2, "click", /*click_handler_1*/ ctx[9], false, false, false),
    					listen_dev(button3, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button3, "click", /*click_handler_2*/ ctx[10], false, false, false),
    					listen_dev(button4, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button4, "click", /*click_handler_3*/ ctx[11], false, false, false),
    					listen_dev(button5, "blur", /*clearMenu*/ ctx[5], false, false, false),
    					listen_dev(button5, "click", /*click_handler_4*/ ctx[12], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*menu*/ 2 && div0_style_value !== (div0_style_value = `display: ${/*menu*/ ctx[1] == 'sort' ? 'block' : 'none'}`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*filter*/ 1 && input.value !== /*filter*/ ctx[0]) {
    				set_input_value(input, /*filter*/ ctx[0]);
    			}

    			if (dirty & /*filtered, actions*/ 12) {
    				each_value = /*filtered*/ ctx[2];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$4, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div4, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
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
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

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
    	let filtered;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Notes', slots, []);
    	let { notes } = $$props;

    	const actions = {
    		delete: note => {
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

    	const writable_props = ['notes'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Notes> was created with unknown prop '${key}'`);
    	});

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

    	$$self.$capture_state = () => ({
    		Note,
    		notes,
    		actions,
    		filter,
    		menu,
    		add,
    		clearMenu,
    		sort,
    		filtered
    	});

    	$$self.$inject_state = $$props => {
    		if ('notes' in $$props) $$invalidate(7, notes = $$props.notes);
    		if ('filter' in $$props) $$invalidate(0, filter = $$props.filter);
    		if ('menu' in $$props) $$invalidate(1, menu = $$props.menu);
    		if ('filtered' in $$props) $$invalidate(2, filtered = $$props.filtered);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Notes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { notes: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Notes",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*notes*/ ctx[7] === undefined && !('notes' in props)) {
    			console.warn("<Notes> was created without expected prop 'notes'");
    		}
    	}

    	get notes() {
    		throw new Error("<Notes>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set notes(value) {
    		throw new Error("<Notes>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Skill.svelte generated by Svelte v3.48.0 */
    const file$8 = "src\\components\\Skill.svelte";

    // (44:16) {:else}
    function create_else_block_3(ctx) {
    	let button;
    	let t_value = /*skill*/ ctx[0].bluck + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "badge btn badge-dark");
    			add_location(button, file$8, 44, 16, 1248);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleBluck*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].bluck + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(44:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (42:16) {#if skill.readonly}
    function create_if_block_7$1(ctx) {
    	let span;
    	let t_value = /*skill*/ ctx[0].bluck + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "badge badge-light border border-dark");
    			add_location(span, file$8, 42, 16, 1134);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].bluck + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7$1.name,
    		type: "if",
    		source: "(42:16) {#if skill.readonly}",
    		ctx
    	});

    	return block;
    }

    // (51:16) {:else}
    function create_else_block$3(ctx) {
    	let h4;

    	function select_block_type_2(ctx, dirty) {
    		if (/*skill*/ ctx[0].special) return create_if_block_4$1;
    		if (!/*skill*/ ctx[0].readonly) return create_if_block_6$1;
    		return create_else_block_2$1;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			if_block.c();
    			attr_dev(h4, "class", "flex-grow-1");
    			add_location(h4, file$8, 51, 16, 1613);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			if_block.m(h4, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(h4, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(51:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (49:16) {#if editName}
    function create_if_block_3$3(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control mb-1 mr-1");
    			add_location(input_1, file$8, 49, 16, 1457);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			/*input_1_binding*/ ctx[13](input_1);
    			set_input_value(input_1, /*skill*/ ctx[0].name);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*blur_handler*/ ctx[12], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && input_1.value !== /*skill*/ ctx[0].name) {
    				set_input_value(input_1, /*skill*/ ctx[0].name);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[13](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$3.name,
    		type: "if",
    		source: "(49:16) {#if editName}",
    		ctx
    	});

    	return block;
    }

    // (63:20) {:else}
    function create_else_block_2$1(ctx) {
    	let span;
    	let t_value = /*skill*/ ctx[0].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "badge w-100 text-left");
    			add_location(span, file$8, 63, 20, 2226);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2$1.name,
    		type: "else",
    		source: "(63:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (61:46) 
    function create_if_block_6$1(ctx) {
    	let button;
    	let t_value = /*skill*/ ctx[0].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "badge btn btn-light w-100 text-left");
    			add_location(button, file$8, 61, 20, 2069);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(61:46) ",
    		ctx
    	});

    	return block;
    }

    // (53:20) {#if skill.special}
    function create_if_block_4$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	function select_block_type_3(ctx, dirty) {
    		if (/*skill*/ ctx[0].specialty) return create_if_block_5$1;
    		return create_else_block_1$2;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if_block.c();
    			attr_dev(button, "class", "badge btn btn-light w-100 text-left");
    			add_location(button, file$8, 53, 20, 1700);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			if_block.m(button, null);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*setSpecial*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(53:20) {#if skill.special}",
    		ctx
    	});

    	return block;
    }

    // (57:24) {:else}
    function create_else_block_1$2(ctx) {
    	let t_value = /*skill*/ ctx[0].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(57:24) {:else}",
    		ctx
    	});

    	return block;
    }

    // (55:24) {#if skill.specialty}
    function create_if_block_5$1(ctx) {
    	let u;
    	let t_value = /*skill*/ ctx[0].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			u = element("u");
    			t = text(t_value);
    			add_location(u, file$8, 55, 24, 1847);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, u, anchor);
    			append_dev(u, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t_value !== (t_value = /*skill*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(u);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(55:24) {#if skill.specialty}",
    		ctx
    	});

    	return block;
    }

    // (70:12) {#if showPass}
    function create_if_block_2$5(ctx) {
    	let div;
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding(value) {
    		/*bubbles_value_binding*/ ctx[16](value);
    	}

    	let bubbles_props = {
    		count: /*skill*/ ctx[0].rating,
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*skill*/ ctx[0].pass !== void 0) {
    		bubbles_props.value = /*skill*/ ctx[0].pass;
    	}

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(bubbles.$$.fragment);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$8, 70, 12, 2524);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(bubbles, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const bubbles_changes = {};
    			if (dirty & /*skill*/ 1) bubbles_changes.count = /*skill*/ ctx[0].rating;

    			if (dirty & /*$$scope*/ 524288) {
    				bubbles_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*skill*/ 1) {
    				updating_value = true;
    				bubbles_changes.value = /*skill*/ ctx[0].pass;
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
    		id: create_if_block_2$5.name,
    		type: "if",
    		source: "(70:12) {#if showPass}",
    		ctx
    	});

    	return block;
    }

    // (72:16) <Bubbles bind:value={skill.pass} count={skill.rating}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pass");
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
    		source: "(72:16) <Bubbles bind:value={skill.pass} count={skill.rating}>",
    		ctx
    	});

    	return block;
    }

    // (75:12) {#if showFail}
    function create_if_block_1$6(ctx) {
    	let div;
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding_1(value) {
    		/*bubbles_value_binding_1*/ ctx[17](value);
    	}

    	let bubbles_props = {
    		count: /*skill*/ ctx[0].rating - 1,
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*skill*/ ctx[0].fail !== void 0) {
    		bubbles_props.value = /*skill*/ ctx[0].fail;
    	}

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_1));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(bubbles.$$.fragment);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$8, 75, 12, 2711);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(bubbles, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const bubbles_changes = {};
    			if (dirty & /*skill*/ 1) bubbles_changes.count = /*skill*/ ctx[0].rating - 1;

    			if (dirty & /*$$scope*/ 524288) {
    				bubbles_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*skill*/ 1) {
    				updating_value = true;
    				bubbles_changes.value = /*skill*/ ctx[0].fail;
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
    		id: create_if_block_1$6.name,
    		type: "if",
    		source: "(75:12) {#if showFail}",
    		ctx
    	});

    	return block;
    }

    // (77:16) <Bubbles bind:value={skill.fail} count={skill.rating - 1}>
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Fail");
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
    		source: "(77:16) <Bubbles bind:value={skill.fail} count={skill.rating - 1}>",
    		ctx
    	});

    	return block;
    }

    // (80:12) {#if showLuck}
    function create_if_block$7(ctx) {
    	let div;
    	let bubbles;
    	let updating_value;
    	let current;

    	function bubbles_value_binding_2(value) {
    		/*bubbles_value_binding_2*/ ctx[18](value);
    	}

    	let bubbles_props = {
    		count: /*bluckTries*/ ctx[1],
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*skill*/ ctx[0].pass !== void 0) {
    		bubbles_props.value = /*skill*/ ctx[0].pass;
    	}

    	bubbles = new Bubbles({ props: bubbles_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubbles, 'value', bubbles_value_binding_2));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(bubbles.$$.fragment);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$8, 80, 12, 2902);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(bubbles, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const bubbles_changes = {};
    			if (dirty & /*bluckTries*/ 2) bubbles_changes.count = /*bluckTries*/ ctx[1];

    			if (dirty & /*$$scope*/ 524288) {
    				bubbles_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*skill*/ 1) {
    				updating_value = true;
    				bubbles_changes.value = /*skill*/ ctx[0].pass;
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
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(80:12) {#if showLuck}",
    		ctx
    	});

    	return block;
    }

    // (82:16) <Bubbles bind:value={skill.pass} count={bluckTries}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("BL");
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
    		source: "(82:16) <Bubbles bind:value={skill.pass} count={bluckTries}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let h4;
    	let button;
    	let t2_value = /*skill*/ ctx[0].rating + "";
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*skill*/ ctx[0].readonly) return create_if_block_7$1;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*editName*/ ctx[2]) return create_if_block_3$3;
    		return create_else_block$3;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);
    	let if_block2 = /*showPass*/ ctx[6] && create_if_block_2$5(ctx);
    	let if_block3 = /*showFail*/ ctx[5] && create_if_block_1$6(ctx);
    	let if_block4 = /*showLuck*/ ctx[4] && create_if_block$7(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			div1 = element("div");
    			if_block1.c();
    			t1 = space();
    			h4 = element("h4");
    			button = element("button");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			if (if_block3) if_block3.c();
    			t5 = space();
    			if (if_block4) if_block4.c();
    			attr_dev(div0, "class", "d-flex flex-row-reverse");
    			add_location(div0, file$8, 40, 12, 1041);
    			attr_dev(button, "class", "badge btn btn-dark");
    			add_location(button, file$8, 67, 20, 2376);
    			add_location(h4, file$8, 67, 16, 2372);
    			attr_dev(div1, "class", "d-flex");
    			add_location(div1, file$8, 47, 12, 1387);
    			attr_dev(div2, "class", "card-body pt-1");
    			add_location(div2, file$8, 39, 8, 999);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$8, 38, 4, 971);
    			attr_dev(div4, "class", "col-lg-4 col-md-6");
    			add_location(div4, file$8, 37, 0, 934);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			if_block0.m(div0, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			if_block1.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, h4);
    			append_dev(h4, button);
    			append_dev(button, t2);
    			append_dev(div2, t3);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(div2, t4);
    			if (if_block3) if_block3.m(div2, null);
    			append_dev(div2, t5);
    			if (if_block4) if_block4.m(div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*ratingClick*/ ctx[8], false, false, false);
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
    					if_block0.m(div0, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div1, t1);
    				}
    			}

    			if ((!current || dirty & /*skill*/ 1) && t2_value !== (t2_value = /*skill*/ ctx[0].rating + "")) set_data_dev(t2, t2_value);

    			if (/*showPass*/ ctx[6]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*showPass*/ 64) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_2$5(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div2, t4);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*showFail*/ ctx[5]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*showFail*/ 32) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_1$6(ctx);
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

    			if (/*showLuck*/ ctx[4]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);

    					if (dirty & /*showLuck*/ 16) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block$7(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div2, null);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if_block0.d();
    			if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			mounted = false;
    			dispose();
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
    	let showPass;
    	let showFail;
    	let showLuck;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Skill', slots, []);
    	let { actions } = $$props;
    	let { skill } = $$props;
    	let { bluckTries } = $$props;
    	let { lockSpecial } = $$props;
    	let editName = false;
    	let input;

    	function setSpecial() {
    		if (!lockSpecial) {
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

    	const writable_props = ['actions', 'skill', 'bluckTries', 'lockSpecial'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Skill> was created with unknown prop '${key}'`);
    	});

    	const blur_handler = () => $$invalidate(2, editName = false);

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(3, input);
    		});
    	}

    	function input_1_input_handler() {
    		skill.name = this.value;
    		$$invalidate(0, skill);
    	}

    	const click_handler = () => $$invalidate(2, editName = true);

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
    		if ('actions' in $$props) $$invalidate(10, actions = $$props.actions);
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    		if ('bluckTries' in $$props) $$invalidate(1, bluckTries = $$props.bluckTries);
    		if ('lockSpecial' in $$props) $$invalidate(11, lockSpecial = $$props.lockSpecial);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		Bubbles,
    		actions,
    		skill,
    		bluckTries,
    		lockSpecial,
    		editName,
    		input,
    		setSpecial,
    		ratingClick,
    		toggleBluck,
    		showLuck,
    		showFail,
    		showPass
    	});

    	$$self.$inject_state = $$props => {
    		if ('actions' in $$props) $$invalidate(10, actions = $$props.actions);
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    		if ('bluckTries' in $$props) $$invalidate(1, bluckTries = $$props.bluckTries);
    		if ('lockSpecial' in $$props) $$invalidate(11, lockSpecial = $$props.lockSpecial);
    		if ('editName' in $$props) $$invalidate(2, editName = $$props.editName);
    		if ('input' in $$props) $$invalidate(3, input = $$props.input);
    		if ('showLuck' in $$props) $$invalidate(4, showLuck = $$props.showLuck);
    		if ('showFail' in $$props) $$invalidate(5, showFail = $$props.showFail);
    		if ('showPass' in $$props) $$invalidate(6, showPass = $$props.showPass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*skill*/ 1) {
    			$$invalidate(6, showPass = skill.rating >= 1 && skill.rating < skill.cap);
    		}

    		if ($$self.$$.dirty & /*skill*/ 1) {
    			$$invalidate(5, showFail = skill.rating >= 2 && skill.rating < skill.cap);
    		}

    		if ($$self.$$.dirty & /*skill*/ 1) {
    			$$invalidate(4, showLuck = skill.rating == 0);
    		}
    	};

    	return [
    		skill,
    		bluckTries,
    		editName,
    		input,
    		showLuck,
    		showFail,
    		showPass,
    		setSpecial,
    		ratingClick,
    		toggleBluck,
    		actions,
    		lockSpecial,
    		blur_handler,
    		input_1_binding,
    		input_1_input_handler,
    		click_handler,
    		bubbles_value_binding,
    		bubbles_value_binding_1,
    		bubbles_value_binding_2
    	];
    }

    class Skill extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			actions: 10,
    			skill: 0,
    			bluckTries: 1,
    			lockSpecial: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skill",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*actions*/ ctx[10] === undefined && !('actions' in props)) {
    			console.warn("<Skill> was created without expected prop 'actions'");
    		}

    		if (/*skill*/ ctx[0] === undefined && !('skill' in props)) {
    			console.warn("<Skill> was created without expected prop 'skill'");
    		}

    		if (/*bluckTries*/ ctx[1] === undefined && !('bluckTries' in props)) {
    			console.warn("<Skill> was created without expected prop 'bluckTries'");
    		}

    		if (/*lockSpecial*/ ctx[11] === undefined && !('lockSpecial' in props)) {
    			console.warn("<Skill> was created without expected prop 'lockSpecial'");
    		}
    	}

    	get actions() {
    		throw new Error("<Skill>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Skill>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get skill() {
    		throw new Error("<Skill>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skill(value) {
    		throw new Error("<Skill>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bluckTries() {
    		throw new Error("<Skill>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bluckTries(value) {
    		throw new Error("<Skill>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lockSpecial() {
    		throw new Error("<Skill>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lockSpecial(value) {
    		throw new Error("<Skill>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Skills.svelte generated by Svelte v3.48.0 */
    const file$7 = "src\\components\\Skills.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (67:24) {#each filtered as skill (skill.id)}
    function create_each_block$3(key_1, ctx) {
    	let first;
    	let skill_1;
    	let current;

    	skill_1 = new Skill({
    			props: {
    				actions: /*actions*/ ctx[4],
    				skill: /*skill*/ ctx[12],
    				bluckTries: /*bluckTries*/ ctx[1],
    				lockSpecial: /*skills*/ ctx[0].lockSpecial
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(skill_1.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(skill_1, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const skill_1_changes = {};
    			if (dirty & /*filtered*/ 8) skill_1_changes.skill = /*skill*/ ctx[12];
    			if (dirty & /*bluckTries*/ 2) skill_1_changes.bluckTries = /*bluckTries*/ ctx[1];
    			if (dirty & /*skills*/ 1) skill_1_changes.lockSpecial = /*skills*/ ctx[0].lockSpecial;
    			skill_1.$set(skill_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skill_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skill_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(skill_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(67:24) {#each filtered as skill (skill.id)}",
    		ctx
    	});

    	return block;
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
    	let each_value = /*filtered*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*skill*/ ctx[12].id;
    	validate_each_keys(ctx, each_value, get_each_context$3, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
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

    			attr_dev(button0, "class", "btn btn-light border mb-1 mr-1");
    			add_location(button0, file$7, 50, 24, 1482);
    			attr_dev(button1, "class", "dropdown-toggle btn btn-light border mb-1 mr-1");
    			add_location(button1, file$7, 52, 28, 1640);
    			attr_dev(button2, "class", button2_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'all' ? selectedStyle$1 : ''));
    			add_location(button2, file$7, 54, 32, 1919);
    			attr_dev(button3, "class", button3_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'bluck' ? selectedStyle$1 : ''));
    			add_location(button3, file$7, 55, 32, 2096);
    			attr_dev(button4, "class", button4_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'zero' ? selectedStyle$1 : ''));
    			add_location(button4, file$7, 56, 32, 2292);
    			attr_dev(div0, "class", "dropdown-menu");
    			set_style(div0, "display", /*menu*/ ctx[2] == 'filter' ? 'block' : 'none', false);
    			add_location(div0, file$7, 53, 28, 1806);
    			attr_dev(div1, "class", "dropdown");
    			add_location(div1, file$7, 51, 24, 1588);
    			attr_dev(button5, "class", button5_class_value = "btn border mb-1 " + (/*skills*/ ctx[0].lockspecial ? 'btn-dark' : 'btn-light'));
    			add_location(button5, file$7, 59, 24, 2533);
    			attr_dev(div2, "class", "d-flex");
    			add_location(div2, file$7, 49, 20, 1436);
    			attr_dev(div3, "class", "row mt-2");
    			add_location(div3, file$7, 65, 20, 2864);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$7, 48, 16, 1391);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$7, 47, 12, 1355);
    			attr_dev(div6, "class", "col");
    			add_location(div6, file$7, 46, 8, 1324);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$7, 45, 4, 1297);
    			attr_dev(div8, "class", "container-fluid");
    			add_location(div8, file$7, 44, 0, 1262);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, button1);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, button2);
    			append_dev(button2, t4);
    			append_dev(div0, t5);
    			append_dev(div0, button3);
    			append_dev(button3, t6);
    			append_dev(div0, t7);
    			append_dev(div0, button4);
    			append_dev(button4, t8);
    			append_dev(div2, t9);
    			append_dev(div2, button5);
    			append_dev(button5, t10);
    			append_dev(div4, t11);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*add*/ ctx[5], false, false, false),
    					listen_dev(button1, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(button2, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button2, "click", /*click_handler_1*/ ctx[8], false, false, false),
    					listen_dev(button3, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button3, "click", /*click_handler_2*/ ctx[9], false, false, false),
    					listen_dev(button4, "blur", /*clearMenu*/ ctx[6], false, false, false),
    					listen_dev(button4, "click", /*click_handler_3*/ ctx[10], false, false, false),
    					listen_dev(button5, "click", /*click_handler_4*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*skills*/ 1 && button2_class_value !== (button2_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'all' ? selectedStyle$1 : ''))) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (!current || dirty & /*skills*/ 1 && button3_class_value !== (button3_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'bluck' ? selectedStyle$1 : ''))) {
    				attr_dev(button3, "class", button3_class_value);
    			}

    			if (!current || dirty & /*skills*/ 1 && button4_class_value !== (button4_class_value = "dropdown-item " + (/*skills*/ ctx[0].show == 'zero' ? selectedStyle$1 : ''))) {
    				attr_dev(button4, "class", button4_class_value);
    			}

    			if (dirty & /*menu*/ 4) {
    				set_style(div0, "display", /*menu*/ ctx[2] == 'filter' ? 'block' : 'none', false);
    			}

    			if (!current || dirty & /*skills*/ 1 && button5_class_value !== (button5_class_value = "btn border mb-1 " + (/*skills*/ ctx[0].lockspecial ? 'btn-dark' : 'btn-light'))) {
    				attr_dev(button5, "class", button5_class_value);
    			}

    			if (dirty & /*actions, filtered, bluckTries, skills*/ 27) {
    				each_value = /*filtered*/ ctx[3];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$3, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div3, outro_and_destroy_block, create_each_block$3, null, get_each_context$3);
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
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
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

    const selectedStyle$1 = 'bg-dark text-light';

    function instance$7($$self, $$props, $$invalidate) {
    	let filtered;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Skills', slots, []);
    	let { skills } = $$props;
    	let { bluckTries } = $$props;

    	const actions = {
    		delete: skill => {
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

    	const writable_props = ['skills', 'bluckTries'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Skills> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, menu = 'filter');
    	const click_handler_1 = () => $$invalidate(0, skills.show = 'all', skills);
    	const click_handler_2 = () => $$invalidate(0, skills.show = 'bluck', skills);
    	const click_handler_3 = () => $$invalidate(0, skills.show = 'zero', skills);
    	const click_handler_4 = () => $$invalidate(0, skills.lockspecial = !skills.lockspecial, skills);

    	$$self.$$set = $$props => {
    		if ('skills' in $$props) $$invalidate(0, skills = $$props.skills);
    		if ('bluckTries' in $$props) $$invalidate(1, bluckTries = $$props.bluckTries);
    	};

    	$$self.$capture_state = () => ({
    		Skill,
    		skill,
    		skills,
    		bluckTries,
    		selectedStyle: selectedStyle$1,
    		actions,
    		menu,
    		add,
    		clearMenu,
    		filtered
    	});

    	$$self.$inject_state = $$props => {
    		if ('skills' in $$props) $$invalidate(0, skills = $$props.skills);
    		if ('bluckTries' in $$props) $$invalidate(1, bluckTries = $$props.bluckTries);
    		if ('menu' in $$props) $$invalidate(2, menu = $$props.menu);
    		if ('filtered' in $$props) $$invalidate(3, filtered = $$props.filtered);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Skills extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { skills: 0, bluckTries: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skills",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*skills*/ ctx[0] === undefined && !('skills' in props)) {
    			console.warn("<Skills> was created without expected prop 'skills'");
    		}

    		if (/*bluckTries*/ ctx[1] === undefined && !('bluckTries' in props)) {
    			console.warn("<Skills> was created without expected prop 'bluckTries'");
    		}
    	}

    	get skills() {
    		throw new Error("<Skills>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skills(value) {
    		throw new Error("<Skills>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bluckTries() {
    		throw new Error("<Skills>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bluckTries(value) {
    		throw new Error("<Skills>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Spell.svelte generated by Svelte v3.48.0 */
    const file$6 = "src\\components\\Spell.svelte";

    // (51:16) {:else}
    function create_else_block_1$1(ctx) {
    	let h4;
    	let button;
    	let t_value = /*spell*/ ctx[0].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "badge btn btn-light w-100 text-left");
    			add_location(button, file$6, 52, 20, 1441);
    			attr_dev(h4, "class", "flex-grow-1");
    			add_location(h4, file$6, 51, 16, 1395);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*spell*/ 1 && t_value !== (t_value = /*spell*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(51:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (49:16) {#if editName}
    function create_if_block_3$2(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "flex-grow-1 form-control");
    			add_location(input_1, file$6, 49, 16, 1237);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			/*input_1_binding*/ ctx[14](input_1);
    			set_input_value(input_1, /*spell*/ ctx[0].name);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*blur_handler*/ ctx[13], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*spell*/ 1 && input_1.value !== /*spell*/ ctx[0].name) {
    				set_input_value(input_1, /*spell*/ ctx[0].name);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[14](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(49:16) {#if editName}",
    		ctx
    	});

    	return block;
    }

    // (66:46) 
    function create_if_block_2$4(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Relic");
    			attr_dev(button, "class", button_class_value = "btn " + /*inventoryClass*/ ctx[8] + " ml-auto mr-1");
    			add_location(button, file$6, 66, 16, 2415);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[19], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inventoryClass*/ 256 && button_class_value !== (button_class_value = "btn " + /*inventoryClass*/ ctx[8] + " ml-auto mr-1")) {
    				attr_dev(button, "class", button_class_value);
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
    		id: create_if_block_2$4.name,
    		type: "if",
    		source: "(66:46) ",
    		ctx
    	});

    	return block;
    }

    // (60:16) {#if caster == 'magician'}
    function create_if_block_1$5(ctx) {
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

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			t0 = text("Spellbook");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("Scroll");
    			t3 = space();
    			button2 = element("button");
    			t4 = text("Memorized");
    			attr_dev(button0, "class", button0_class_value = "btn " + /*inventoryClass*/ ctx[8] + " mr-1");
    			add_location(button0, file$6, 61, 20, 2019);
    			attr_dev(button1, "class", button1_class_value = "btn " + /*scrollClass*/ ctx[7] + " mr-1");
    			add_location(button1, file$6, 62, 20, 2125);
    			attr_dev(button2, "class", button2_class_value = "btn " + /*memoryClass*/ ctx[6] + " mr-1");
    			add_location(button2, file$6, 63, 20, 2247);
    			attr_dev(div, "class", "d-flex ml-auto");
    			add_location(div, file$6, 60, 16, 1969);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(button0, t0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(button1, t2);
    			append_dev(div, t3);
    			append_dev(div, button2);
    			append_dev(button2, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*setInventory*/ ctx[11], false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[18], false, false, false),
    					listen_dev(button2, "click", /*setMemory*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inventoryClass*/ 256 && button0_class_value !== (button0_class_value = "btn " + /*inventoryClass*/ ctx[8] + " mr-1")) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (dirty & /*scrollClass*/ 128 && button1_class_value !== (button1_class_value = "btn " + /*scrollClass*/ ctx[7] + " mr-1")) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty & /*memoryClass*/ 64 && button2_class_value !== (button2_class_value = "btn " + /*memoryClass*/ ctx[6] + " mr-1")) {
    				attr_dev(button2, "class", button2_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(60:16) {#if caster == 'magician'}",
    		ctx
    	});

    	return block;
    }

    // (75:16) {:else}
    function create_else_block$2(ctx) {
    	let button;
    	let t_value = /*spell*/ ctx[0].description + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn btn-light text-left align-top wrap w-100 border");
    			set_style(button, "min-height", "2.5em");
    			add_location(button, file$6, 75, 16, 2915);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_4*/ ctx[23], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*spell*/ 1 && t_value !== (t_value = /*spell*/ ctx[0].description + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(75:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (73:16) {#if editDescription}
    function create_if_block$6(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "class", "flex-grow-1 form-control");
    			add_location(textarea, file$6, 73, 16, 2729);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			/*textarea_binding*/ ctx[21](textarea);
    			set_input_value(textarea, /*spell*/ ctx[0].description);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "blur", /*blur_handler_1*/ ctx[20], false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[22])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*spell*/ 1) {
    				set_input_value(textarea, /*spell*/ ctx[0].description);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			/*textarea_binding*/ ctx[21](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(73:16) {#if editDescription}",
    		ctx
    	});

    	return block;
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
    	let t3_value = /*circles*/ ctx[9][/*spell*/ ctx[0].circle - 1] + "";
    	let t3;
    	let t4;
    	let t5;
    	let div2;
    	let t6;
    	let div3;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*editName*/ ctx[4]) return create_if_block_3$2;
    		return create_else_block_1$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*caster*/ ctx[2] == 'magician') return create_if_block_1$5;
    		if (/*caster*/ ctx[2] == 'theurge') return create_if_block_2$4;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1 && current_block_type_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*editDescription*/ ctx[5]) return create_if_block$6;
    		return create_else_block$2;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_2(ctx);

    	const block = {
    		c: function create() {
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
    			t6 = space();
    			div3 = element("div");
    			if_block2.c();
    			attr_dev(button0, "class", "badge btn btn-light");
    			add_location(button0, file$6, 55, 16, 1611);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$6, 47, 12, 1167);
    			attr_dev(button1, "class", "badge btn btn-dark w-100 text-left");
    			add_location(button1, file$6, 58, 20, 1792);
    			add_location(h5, file$6, 58, 16, 1788);
    			attr_dev(div1, "class", "d-flex mt-1 flex-wrap");
    			add_location(div1, file$6, 57, 12, 1735);
    			attr_dev(div2, "class", "d-flex mt-1");
    			add_location(div2, file$6, 69, 12, 2588);
    			attr_dev(div3, "class", "d-flex mt-1");
    			add_location(div3, file$6, 71, 12, 2647);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$6, 46, 8, 1130);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$6, 45, 4, 1102);
    			attr_dev(div6, "class", "col-md-6");
    			add_location(div6, file$6, 44, 0, 1074);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			if_block0.m(div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, button0);
    			append_dev(div4, t2);
    			append_dev(div4, div1);
    			append_dev(div1, h5);
    			append_dev(h5, button1);
    			append_dev(button1, t3);
    			append_dev(div1, t4);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div4, t5);
    			append_dev(div4, div2);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			if_block2.m(div3, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[17], false, false, false),
    					listen_dev(button1, "click", /*circleClick*/ ctx[10], false, false, false)
    				];

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
    					if_block0.m(div0, t0);
    				}
    			}

    			if (dirty & /*spell*/ 1 && t3_value !== (t3_value = /*circles*/ ctx[9][/*spell*/ ctx[0].circle - 1] + "")) set_data_dev(t3, t3_value);

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

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_2(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_2(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div3, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if_block0.d();

    			if (if_block1) {
    				if_block1.d();
    			}

    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
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
    	let inventoryClass;
    	let scrollClass;
    	let memoryClass;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Spell', slots, []);
    	let { actions } = $$props;
    	let { spell } = $$props;
    	let { caster } = $$props;
    	const circles = ['1st Circle', '2nd Circle', '3rd Circle', '4th Circle', '5th Circle'];
    	let input;
    	let editName = false;
    	let editDescription = false;

    	function circleClick(e) {
    		$$invalidate(0, spell.circle += e.shiftKey ? -1 : 1, spell);
    		if (spell.circle > 5) $$invalidate(0, spell.circle = 1, spell); else if (spell.circle < 1) $$invalidate(0, spell.circle = 5, spell);
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

    	const writable_props = ['actions', 'spell', 'caster'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Spell> was created with unknown prop '${key}'`);
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
    	const blur_handler_1 = () => $$invalidate(5, editDescription = false);

    	function textarea_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(3, input);
    		});
    	}

    	function textarea_input_handler() {
    		spell.description = this.value;
    		$$invalidate(0, spell);
    	}

    	const click_handler_4 = () => $$invalidate(5, editDescription = true);

    	$$self.$$set = $$props => {
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('spell' in $$props) $$invalidate(0, spell = $$props.spell);
    		if ('caster' in $$props) $$invalidate(2, caster = $$props.caster);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		actions,
    		spell,
    		caster,
    		circles,
    		input,
    		editName,
    		editDescription,
    		circleClick,
    		setInventory,
    		setMemory,
    		memoryClass,
    		scrollClass,
    		inventoryClass
    	});

    	$$self.$inject_state = $$props => {
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('spell' in $$props) $$invalidate(0, spell = $$props.spell);
    		if ('caster' in $$props) $$invalidate(2, caster = $$props.caster);
    		if ('input' in $$props) $$invalidate(3, input = $$props.input);
    		if ('editName' in $$props) $$invalidate(4, editName = $$props.editName);
    		if ('editDescription' in $$props) $$invalidate(5, editDescription = $$props.editDescription);
    		if ('memoryClass' in $$props) $$invalidate(6, memoryClass = $$props.memoryClass);
    		if ('scrollClass' in $$props) $$invalidate(7, scrollClass = $$props.scrollClass);
    		if ('inventoryClass' in $$props) $$invalidate(8, inventoryClass = $$props.inventoryClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*spell*/ 1) {
    			$$invalidate(8, inventoryClass = spell.inventory ? 'btn-dark' : 'btn-light border');
    		}

    		if ($$self.$$.dirty & /*spell*/ 1) {
    			$$invalidate(7, scrollClass = spell.scroll ? 'btn-dark' : 'btn-light border');
    		}

    		if ($$self.$$.dirty & /*spell*/ 1) {
    			$$invalidate(6, memoryClass = spell.memorized ? 'btn-dark' : 'btn-light border');
    		}
    	};

    	return [
    		spell,
    		actions,
    		caster,
    		input,
    		editName,
    		editDescription,
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
    		blur_handler_1,
    		textarea_binding,
    		textarea_input_handler,
    		click_handler_4
    	];
    }

    class Spell extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { actions: 1, spell: 0, caster: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spell",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*actions*/ ctx[1] === undefined && !('actions' in props)) {
    			console.warn("<Spell> was created without expected prop 'actions'");
    		}

    		if (/*spell*/ ctx[0] === undefined && !('spell' in props)) {
    			console.warn("<Spell> was created without expected prop 'spell'");
    		}

    		if (/*caster*/ ctx[2] === undefined && !('caster' in props)) {
    			console.warn("<Spell> was created without expected prop 'caster'");
    		}
    	}

    	get actions() {
    		throw new Error("<Spell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Spell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spell() {
    		throw new Error("<Spell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spell(value) {
    		throw new Error("<Spell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get caster() {
    		throw new Error("<Spell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set caster(value) {
    		throw new Error("<Spell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Spells.svelte generated by Svelte v3.48.0 */
    const file$5 = "src\\components\\Spells.svelte";

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

    // (112:24) {#if spells.urdr == 0}
    function create_if_block_3$1(ctx) {
    	let div;
    	let h3;
    	let span0;
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

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			span0 = element("span");
    			span0.textContent = "Memory palace";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(/*space*/ ctx[1]);
    			t3 = space();
    			span2 = element("span");
    			span2.textContent = "/";
    			t5 = space();
    			button = element("button");
    			t6 = text(t6_value);
    			attr_dev(span0, "class", "align-self-center font-weight-bold mr-1");
    			add_location(span0, file$5, 113, 32, 3715);
    			add_location(h3, file$5, 113, 28, 3711);
    			attr_dev(span1, "class", "align-self-center btn badge-light border ml-auto");
    			toggle_class(span1, "bg-danger", /*space*/ ctx[1] < 0);
    			add_location(span1, file$5, 114, 28, 3824);
    			attr_dev(span2, "class", "align-self-center mx-1");
    			add_location(span2, file$5, 115, 28, 3959);
    			attr_dev(button, "class", "align-self-center btn btn-dark");
    			add_location(button, file$5, 116, 28, 4034);
    			attr_dev(div, "class", "d-flex col-md-6");
    			add_location(div, file$5, 112, 24, 3652);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(div, t5);
    			append_dev(div, button);
    			append_dev(button, t6);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*memoryClick*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*space*/ 2) set_data_dev(t2, /*space*/ ctx[1]);

    			if (dirty & /*space*/ 2) {
    				toggle_class(span1, "bg-danger", /*space*/ ctx[1] < 0);
    			}

    			if (dirty & /*spells*/ 1 && t6_value !== (t6_value = /*spells*/ ctx[0].memory + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(112:24) {#if spells.urdr == 0}",
    		ctx
    	});

    	return block;
    }

    // (120:24) {#if spells.urdr > 0}
    function create_if_block_2$3(ctx) {
    	let div;
    	let h3;
    	let span;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let t4_value = /*spells*/ ctx[0].burden + "";
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			span = element("span");
    			span.textContent = "Burden";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "↓";
    			t3 = space();
    			button1 = element("button");
    			t4 = text(t4_value);
    			attr_dev(span, "class", "align-self-center font-weight-bold");
    			add_location(span, file$5, 121, 52, 4347);
    			set_style(h3, "width", "5em");
    			add_location(h3, file$5, 121, 28, 4323);
    			attr_dev(button0, "class", "align-self-center btn btn-light border border-dark ml-auto");
    			add_location(button0, file$5, 122, 28, 4444);
    			attr_dev(button1, "class", "align-self-center btn btn-dark");
    			toggle_class(button1, "bg-danger", /*spells*/ ctx[0].burden > /*spells*/ ctx[0].urdr);
    			add_location(button1, file$5, 123, 28, 4591);
    			attr_dev(div, "class", "d-flex col-md-6");
    			add_location(div, file$5, 120, 24, 4264);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, span);
    			append_dev(div, t1);
    			append_dev(div, button0);
    			append_dev(div, t3);
    			append_dev(div, button1);
    			append_dev(button1, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*burdenDownClick*/ ctx[10], false, false, false),
    					listen_dev(button1, "click", /*burdenClick*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*spells*/ 1 && t4_value !== (t4_value = /*spells*/ ctx[0].burden + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*spells*/ 1) {
    				toggle_class(button1, "bg-danger", /*spells*/ ctx[0].burden > /*spells*/ ctx[0].urdr);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(120:24) {#if spells.urdr > 0}",
    		ctx
    	});

    	return block;
    }

    // (127:24) {#if spells.memory == 0}
    function create_if_block_1$4(ctx) {
    	let div;
    	let h3;
    	let span;
    	let t1;
    	let button;
    	let t2_value = /*spells*/ ctx[0].urdr + "";
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			span = element("span");
    			span.textContent = "Urdr";
    			t1 = space();
    			button = element("button");
    			t2 = text(t2_value);
    			attr_dev(span, "class", "align-self-center font-weight-bold");
    			add_location(span, file$5, 128, 32, 4933);
    			add_location(h3, file$5, 128, 28, 4929);
    			attr_dev(button, "class", "align-self-center btn btn-dark ml-auto");
    			add_location(button, file$5, 129, 28, 5028);
    			attr_dev(div, "class", "d-flex col-md-6");
    			add_location(div, file$5, 127, 24, 4870);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, span);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*urdrClick*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*spells*/ 1 && t2_value !== (t2_value = /*spells*/ ctx[0].urdr + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(127:24) {#if spells.memory == 0}",
    		ctx
    	});

    	return block;
    }

    // (133:24) {#if spells.memory > 0}
    function create_if_block$5(ctx) {
    	let div;
    	let h3;
    	let span0;
    	let t1;
    	let span1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			span0 = element("span");
    			span0.textContent = "In Spellbook";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(/*inventory*/ ctx[6]);
    			attr_dev(span0, "class", "align-self-center font-weight-bold");
    			add_location(span0, file$5, 134, 32, 5327);
    			add_location(h3, file$5, 134, 28, 5323);
    			attr_dev(span1, "class", "align-self-center btn badge-light border ml-auto");
    			add_location(span1, file$5, 135, 28, 5430);
    			attr_dev(div, "class", "d-flex col-md-6");
    			add_location(div, file$5, 133, 24, 5264);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inventory*/ 64) set_data_dev(t2, /*inventory*/ ctx[6]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(133:24) {#if spells.memory > 0}",
    		ctx
    	});

    	return block;
    }

    // (144:32) {#each filters() as f}
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

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();

    			attr_dev(button, "class", button_class_value = "dropdown-item " + (/*spells*/ ctx[0].show == /*f*/ ctx[20].val
    			? selectedStyle
    			: ''));

    			add_location(button, file$5, 144, 32, 6057);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "blur", /*clearMenu*/ ctx[11], false, false, false),
    					listen_dev(button, "click", click_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*filters*/ 16 && t0_value !== (t0_value = /*f*/ ctx[20].text + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*spells, filters*/ 17 && button_class_value !== (button_class_value = "dropdown-item " + (/*spells*/ ctx[0].show == /*f*/ ctx[20].val
    			? selectedStyle
    			: ''))) {
    				attr_dev(button, "class", button_class_value);
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
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(144:32) {#each filters() as f}",
    		ctx
    	});

    	return block;
    }

    // (157:24) {#each filtered as spell (spell.id)}
    function create_each_block$2(key_1, ctx) {
    	let first;
    	let spell;
    	let current;

    	spell = new Spell({
    			props: {
    				spell: /*spell*/ ctx[17],
    				caster: /*caster*/ ctx[5],
    				actions: /*spellActions*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(spell.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(spell, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const spell_changes = {};
    			if (dirty & /*filtered*/ 8) spell_changes.spell = /*spell*/ ctx[17];
    			if (dirty & /*caster*/ 32) spell_changes.caster = /*caster*/ ctx[5];
    			spell.$set(spell_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spell.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spell.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(spell, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(157:24) {#each filtered as spell (spell.id)}",
    		ctx
    	});

    	return block;
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
    	let if_block1 = /*spells*/ ctx[0].urdr > 0 && create_if_block_2$3(ctx);
    	let if_block2 = /*spells*/ ctx[0].memory == 0 && create_if_block_1$4(ctx);
    	let if_block3 = /*spells*/ ctx[0].memory > 0 && create_if_block$5(ctx);
    	let each_value_1 = /*filters*/ ctx[4]();
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = /*filtered*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*spell*/ ctx[17].id;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
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

    			attr_dev(div0, "class", "row");
    			add_location(div0, file$5, 110, 20, 3561);
    			attr_dev(button0, "class", "dropdown-toggle btn btn-light border mb-1 mr-1");
    			add_location(button0, file$5, 141, 28, 5727);
    			attr_dev(div1, "class", "dropdown-menu");
    			set_style(div1, "display", /*menu*/ ctx[2] == 'filters' ? 'block' : 'none', false);
    			add_location(div1, file$5, 142, 28, 5887);
    			attr_dev(div2, "class", "dropdown");
    			add_location(div2, file$5, 140, 24, 5675);
    			attr_dev(button1, "class", "btn btn-light border mb-1 mr-1");
    			add_location(button1, file$5, 153, 24, 6526);
    			attr_dev(div3, "class", "d-flex mt-2");
    			add_location(div3, file$5, 139, 20, 5624);
    			attr_dev(div4, "class", "row mt-2");
    			add_location(div4, file$5, 155, 20, 6656);
    			attr_dev(div5, "class", "card-body");
    			add_location(div5, file$5, 109, 16, 3516);
    			attr_dev(div6, "class", "card");
    			add_location(div6, file$5, 108, 12, 3480);
    			attr_dev(div7, "class", "col-12");
    			add_location(div7, file$5, 107, 8, 3446);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$5, 106, 4, 3419);
    			attr_dev(div9, "class", "container-fluid");
    			add_location(div9, file$5, 105, 0, 3384);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t1);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div0, t2);
    			if (if_block3) if_block3.m(div0, null);
    			append_dev(div5, t3);
    			append_dev(div5, div3);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t5);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div1, null);
    			}

    			append_dev(div3, t6);
    			append_dev(div3, button1);
    			append_dev(div5, t8);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "blur", /*clearMenu*/ ctx[11], false, false, false),
    					listen_dev(button0, "click", /*click_handler*/ ctx[14], false, false, false),
    					listen_dev(button1, "click", /*add*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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
    					if_block1 = create_if_block_2$3(ctx);
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
    					if_block2 = create_if_block_1$4(ctx);
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
    				each_value_1 = /*filters*/ ctx[4]();
    				validate_each_argument(each_value_1);
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
    				set_style(div1, "display", /*menu*/ ctx[2] == 'filters' ? 'block' : 'none', false);
    			}

    			if (dirty & /*filtered, caster, spellActions*/ 168) {
    				each_value = /*filtered*/ ctx[3];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each1_lookup, div4, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
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
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
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

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Spells', slots, []);
    	let { spells } = $$props;

    	const spellActions = {
    		delete: spell => {
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

    	const writable_props = ['spells'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Spells> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, menu = 'filters');
    	const click_handler_1 = f => $$invalidate(0, spells.show = f.val, spells);

    	$$self.$$set = $$props => {
    		if ('spells' in $$props) $$invalidate(0, spells = $$props.spells);
    	};

    	$$self.$capture_state = () => ({
    		Spell,
    		spells,
    		selectedStyle,
    		maxMemory,
    		maxUrdr,
    		spellActions,
    		menu,
    		add,
    		burdenClick,
    		burdenDownClick,
    		clearMenu,
    		memoryClick,
    		refresh,
    		urdrClick,
    		space,
    		filtered,
    		filters,
    		caster,
    		inventory
    	});

    	$$self.$inject_state = $$props => {
    		if ('spells' in $$props) $$invalidate(0, spells = $$props.spells);
    		if ('menu' in $$props) $$invalidate(2, menu = $$props.menu);
    		if ('space' in $$props) $$invalidate(1, space = $$props.space);
    		if ('filtered' in $$props) $$invalidate(3, filtered = $$props.filtered);
    		if ('filters' in $$props) $$invalidate(4, filters = $$props.filters);
    		if ('caster' in $$props) $$invalidate(5, caster = $$props.caster);
    		if ('inventory' in $$props) $$invalidate(6, inventory = $$props.inventory);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Spells extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { spells: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spells",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*spells*/ ctx[0] === undefined && !('spells' in props)) {
    			console.warn("<Spells> was created without expected prop 'spells'");
    		}
    	}

    	get spells() {
    		throw new Error("<Spells>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spells(value) {
    		throw new Error("<Spells>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Trait.svelte generated by Svelte v3.48.0 */
    const file$4 = "src\\components\\Trait.svelte";

    // (39:16) {:else}
    function create_else_block$1(ctx) {
    	let h2;
    	let button;
    	let t_value = /*trait*/ ctx[0].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "badge btn btn-light w-100 text-left");
    			add_location(button, file$4, 40, 20, 1048);
    			attr_dev(h2, "class", "flex-grow-1");
    			add_location(h2, file$4, 39, 16, 1002);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*trait*/ 1 && t_value !== (t_value = /*trait*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(39:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (37:16) {#if editName}
    function create_if_block_2$2(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control mb-1 mr-1");
    			add_location(input_1, file$4, 37, 16, 846);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			set_input_value(input_1, /*trait*/ ctx[0].name);
    			/*input_1_binding*/ ctx[9](input_1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*blur_handler*/ ctx[7], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[8])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*trait*/ 1 && input_1.value !== /*trait*/ ctx[0].name) {
    				set_input_value(input_1, /*trait*/ ctx[0].name);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[9](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(37:16) {#if editName}",
    		ctx
    	});

    	return block;
    }

    // (48:20) {#if trait.level < 3}
    function create_if_block_1$3(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("+1D");
    			attr_dev(button, "class", button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 1 ? 'btn-dark' : 'btn-light'));
    			add_location(button, file$4, 48, 20, 1487);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*trait*/ 1 && button_class_value !== (button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 1 ? 'btn-dark' : 'btn-light'))) {
    				attr_dev(button, "class", button_class_value);
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
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(48:20) {#if trait.level < 3}",
    		ctx
    	});

    	return block;
    }

    // (51:20) {#if trait.level == 2}
    function create_if_block$4(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("+1D");
    			attr_dev(button, "class", button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 2 ? 'btn-dark' : 'btn-light'));
    			add_location(button, file$4, 51, 20, 1704);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*trait*/ 1 && button_class_value !== (button_class_value = "border border-dark btn " + (/*trait*/ ctx[0].used >= 2 ? 'btn-dark' : 'btn-light'))) {
    				attr_dev(button, "class", button_class_value);
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
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(51:20) {#if trait.level == 2}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div6;
    	let div5;
    	let div4;
    	let div0;
    	let t0;
    	let h2;
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
    		if (/*editName*/ ctx[2]) return create_if_block_2$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*trait*/ ctx[0].level < 3 && create_if_block_1$3(ctx);
    	let if_block2 = /*trait*/ ctx[0].level == 2 && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			h2 = element("h2");
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
    			attr_dev(button0, "class", "badge btn btn-dark mr-1");
    			add_location(button0, file$4, 43, 36, 1238);
    			attr_dev(h2, "class", "ml-auto");
    			add_location(h2, file$4, 43, 16, 1218);
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$4, 35, 12, 776);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$4, 46, 16, 1399);
    			attr_dev(button1, "class", button1_class_value = "border border-dark btn " + (/*trait*/ ctx[0].checks >= 1 ? 'btn-dark' : 'btn-light'));
    			add_location(button1, file$4, 55, 20, 1947);
    			attr_dev(button2, "class", button2_class_value = "border border-dark btn " + (/*trait*/ ctx[0].checks >= 2 ? 'btn-dark' : 'btn-light'));
    			add_location(button2, file$4, 56, 20, 2101);
    			attr_dev(button3, "class", button3_class_value = "btn " + (/*trait*/ ctx[0].usedAgainst ? 'btn-dark' : 'btn-light') + " border border-dark");
    			add_location(button3, file$4, 57, 20, 2255);
    			attr_dev(div2, "class", "btn-group ml-1");
    			add_location(div2, file$4, 54, 16, 1897);
    			attr_dev(button4, "class", "btn btn-light border border-dark ml-auto");
    			add_location(button4, file$4, 59, 16, 2452);
    			attr_dev(div3, "class", "d-flex");
    			add_location(div3, file$4, 45, 12, 1361);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$4, 34, 8, 739);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$4, 33, 4, 711);
    			attr_dev(div6, "class", "col-md-6");
    			add_location(div6, file$4, 32, 0, 683);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			if_block0.m(div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(h2, button0);
    			append_dev(button0, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t3);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, button1);
    			append_dev(button1, t5);
    			append_dev(div2, t6);
    			append_dev(div2, button2);
    			append_dev(button2, t7);
    			append_dev(div2, t8);
    			append_dev(div2, button3);
    			append_dev(button3, t9);
    			append_dev(div3, t10);
    			append_dev(div3, button4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*levelClick*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*click_handler_3*/ ctx[13], false, false, false),
    					listen_dev(button2, "click", /*click_handler_4*/ ctx[14], false, false, false),
    					listen_dev(button3, "click", /*click_handler_5*/ ctx[15], false, false, false),
    					listen_dev(button4, "click", /*click_handler_6*/ ctx[16], false, false, false)
    				];

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
    					if_block0.m(div0, t0);
    				}
    			}

    			if (dirty & /*trait*/ 1 && t1_value !== (t1_value = /*trait*/ ctx[0].level + "")) set_data_dev(t1, t1_value);

    			if (/*trait*/ ctx[0].level < 3) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$3(ctx);
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
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty & /*trait*/ 1 && button2_class_value !== (button2_class_value = "border border-dark btn " + (/*trait*/ ctx[0].checks >= 2 ? 'btn-dark' : 'btn-light'))) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (dirty & /*trait*/ 1 && button3_class_value !== (button3_class_value = "btn " + (/*trait*/ ctx[0].usedAgainst ? 'btn-dark' : 'btn-light') + " border border-dark")) {
    				attr_dev(button3, "class", button3_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
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

    const maxLevel = 3;

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Trait', slots, []);
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

    	const writable_props = ['actions', 'trait'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Trait> was created with unknown prop '${key}'`);
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

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		actions,
    		trait,
    		maxLevel,
    		editName,
    		input,
    		levelClick,
    		setChecks,
    		setUsed
    	});

    	$$self.$inject_state = $$props => {
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('trait' in $$props) $$invalidate(0, trait = $$props.trait);
    		if ('editName' in $$props) $$invalidate(2, editName = $$props.editName);
    		if ('input' in $$props) $$invalidate(3, input = $$props.input);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Trait extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { actions: 1, trait: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trait",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*actions*/ ctx[1] === undefined && !('actions' in props)) {
    			console.warn("<Trait> was created without expected prop 'actions'");
    		}

    		if (/*trait*/ ctx[0] === undefined && !('trait' in props)) {
    			console.warn("<Trait> was created without expected prop 'trait'");
    		}
    	}

    	get actions() {
    		throw new Error("<Trait>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Trait>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get trait() {
    		throw new Error("<Trait>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set trait(value) {
    		throw new Error("<Trait>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Traits.svelte generated by Svelte v3.48.0 */
    const file$3 = "src\\components\\Traits.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (42:12) {#if traits.length < 4}
    function create_if_block$3(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Add trait";
    			attr_dev(button, "class", "btn btn-light border mb-1");
    			add_location(button, file$3, 44, 20, 1128);
    			attr_dev(div0, "class", "col-md-12");
    			add_location(div0, file$3, 43, 16, 1083);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$3, 42, 12, 1048);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*add*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(42:12) {#if traits.length < 4}",
    		ctx
    	});

    	return block;
    }

    // (50:16) {#each traits as trait (trait.id)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let trait;
    	let current;

    	trait = new Trait({
    			props: {
    				trait: /*trait*/ ctx[6],
    				actions: /*traitActions*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(trait.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(trait, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const trait_changes = {};
    			if (dirty & /*traits*/ 1) trait_changes.trait = /*trait*/ ctx[6];
    			trait.$set(trait_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(trait.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(trait.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(trait, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(50:16) {#each traits as trait (trait.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div9;
    	let div8;
    	let div2;
    	let div0;
    	let button0;
    	let t1;
    	let t2;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t3;
    	let div7;
    	let div6;
    	let div5;
    	let div3;
    	let h5;
    	let t5;
    	let button1;
    	let t7;
    	let div4;
    	let p0;
    	let t9;
    	let ul0;
    	let li0;
    	let t11;
    	let li1;
    	let t13;
    	let li2;
    	let t15;
    	let p1;
    	let t17;
    	let ul1;
    	let li3;
    	let t19;
    	let li4;
    	let t21;
    	let li5;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*traits*/ ctx[0].length < 4 && create_if_block$3(ctx);
    	let each_value = /*traits*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*trait*/ ctx[6].id;
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "?";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div3 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Traits";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "✗";
    			t7 = space();
    			div4 = element("div");
    			p0 = element("p");
    			p0.textContent = "Traits grant bonuses by level:";
    			t9 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "Level 1 traits grant +1D to a relevent test once per session";
    			t11 = space();
    			li1 = element("li");
    			li1.textContent = "Level 2 traits grant +1D to a relevent test twice per session";
    			t13 = space();
    			li2 = element("li");
    			li2.textContent = "Level 3 traits grant +1s to all relevent tests";
    			t15 = space();
    			p1 = element("p");
    			p1.textContent = "Each trait can be used once per session to generate up to two checks.";
    			t17 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			li3.textContent = "One check is generated when used to apply a -1D penalty to an independent or versus test";
    			t19 = space();
    			li4 = element("li");
    			li4.textContent = "Two checks are generated when used to grant an opponent a +2D advantage in a versus test";
    			t21 = space();
    			li5 = element("li");
    			li5.textContent = "Two checks are generated when used to break a tie in an opponent's favor in a versus test";
    			attr_dev(button0, "class", "btn badge btn-light border border-dark");
    			add_location(button0, file$3, 39, 16, 879);
    			attr_dev(div0, "class", "btn-group position-topright");
    			add_location(div0, file$3, 38, 12, 820);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$3, 48, 12, 1280);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$3, 37, 8, 783);
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$3, 58, 24, 1821);
    			attr_dev(button1, "class", "close");
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$3, 59, 24, 1882);
    			attr_dev(div3, "class", "modal-header");
    			add_location(div3, file$3, 57, 20, 1769);
    			add_location(p0, file$3, 62, 24, 2089);
    			add_location(li0, file$3, 64, 28, 2186);
    			add_location(li1, file$3, 65, 28, 2285);
    			add_location(li2, file$3, 66, 28, 2385);
    			add_location(ul0, file$3, 63, 24, 2152);
    			add_location(p1, file$3, 68, 24, 2497);
    			add_location(li3, file$3, 70, 28, 2633);
    			add_location(li4, file$3, 71, 28, 2760);
    			add_location(li5, file$3, 72, 28, 2887);
    			add_location(ul1, file$3, 69, 24, 2599);
    			attr_dev(div4, "class", "modal-body");
    			add_location(div4, file$3, 61, 20, 2039);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file$3, 56, 16, 1720);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file$3, 55, 12, 1660);
    			attr_dev(div7, "class", "modal fade");
    			attr_dev(div7, "tabindex", "-1");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-labelledby", "traits");
    			attr_dev(div7, "aria-hidden", "true");
    			toggle_class(div7, "show", /*showHelp*/ ctx[1]);
    			set_style(div7, "display", /*showHelp*/ ctx[1] ? 'block' : 'none', false);
    			add_location(div7, file$3, 54, 8, 1484);
    			attr_dev(div8, "class", "card");
    			add_location(div8, file$3, 36, 4, 755);
    			attr_dev(div9, "id", "$" + this.id);
    			attr_dev(div9, "class", "container-fluid");
    			add_location(div9, file$3, 35, 0, 704);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div2);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(div2, t1);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div8, t3);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, h5);
    			append_dev(div3, t5);
    			append_dev(div3, button1);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, p0);
    			append_dev(div4, t9);
    			append_dev(div4, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t11);
    			append_dev(ul0, li1);
    			append_dev(ul0, t13);
    			append_dev(ul0, li2);
    			append_dev(div4, t15);
    			append_dev(div4, p1);
    			append_dev(div4, t17);
    			append_dev(div4, ul1);
    			append_dev(ul1, li3);
    			append_dev(ul1, t19);
    			append_dev(ul1, li4);
    			append_dev(ul1, t21);
    			append_dev(ul1, li5);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*traits*/ ctx[0].length < 4) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(div2, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*traits, traitActions*/ 5) {
    				each_value = /*traits*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}

    			if (dirty & /*showHelp*/ 2) {
    				toggle_class(div7, "show", /*showHelp*/ ctx[1]);
    			}

    			if (dirty & /*showHelp*/ 2) {
    				set_style(div7, "display", /*showHelp*/ ctx[1] ? 'block' : 'none', false);
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
    			if (detaching) detach_dev(div9);
    			if (if_block) if_block.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

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
    	validate_slots('Traits', slots, []);
    	let { traits } = $$props;

    	const traitActions = {
    		delete: trait => {
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

    	const writable_props = ['traits'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Traits> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, showHelp = true);
    	const click_handler_1 = () => $$invalidate(1, showHelp = false);

    	$$self.$$set = $$props => {
    		if ('traits' in $$props) $$invalidate(0, traits = $$props.traits);
    	};

    	$$self.$capture_state = () => ({
    		Trait,
    		traits,
    		traitActions,
    		showHelp,
    		add
    	});

    	$$self.$inject_state = $$props => {
    		if ('traits' in $$props) $$invalidate(0, traits = $$props.traits);
    		if ('showHelp' in $$props) $$invalidate(1, showHelp = $$props.showHelp);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Traits extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { traits: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Traits",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*traits*/ ctx[0] === undefined && !('traits' in props)) {
    			console.warn("<Traits> was created without expected prop 'traits'");
    		}
    	}

    	get traits() {
    		throw new Error("<Traits>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set traits(value) {
    		throw new Error("<Traits>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Wise.svelte generated by Svelte v3.48.0 */
    const file$2 = "src\\components\\Wise.svelte";

    // (24:0) {:else}
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
    		if (/*editName*/ ctx[3]) return create_if_block_2$1;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
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
    			attr_dev(div0, "class", "d-flex");
    			add_location(div0, file$2, 27, 12, 770);
    			attr_dev(button0, "class", button0_class_value = "btn " + (/*wise*/ ctx[0].pass ? 'btn-dark' : 'btn-light') + " border border-dark");
    			add_location(button0, file$2, 36, 20, 1264);
    			attr_dev(button1, "class", button1_class_value = "btn " + (/*wise*/ ctx[0].fail ? 'btn-dark' : 'btn-light') + " border border-dark");
    			add_location(button1, file$2, 37, 20, 1417);
    			attr_dev(button2, "class", button2_class_value = "btn " + (/*wise*/ ctx[0].fate ? 'btn-dark' : 'btn-light') + " border border-dark");
    			add_location(button2, file$2, 38, 20, 1570);
    			attr_dev(button3, "class", button3_class_value = "btn " + (/*wise*/ ctx[0].persona ? 'btn-dark' : 'btn-light') + " border border-dark");
    			add_location(button3, file$2, 39, 20, 1723);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$2, 35, 16, 1219);
    			attr_dev(button4, "class", "btn btn-light border ml-auto");
    			add_location(button4, file$2, 41, 16, 1908);
    			attr_dev(div2, "class", "d-flex");
    			add_location(div2, file$2, 34, 12, 1181);
    			attr_dev(div3, "class", "card-body");
    			add_location(div3, file$2, 26, 8, 733);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$2, 25, 4, 705);
    			attr_dev(div5, "class", "col-md-6");
    			add_location(div5, file$2, 24, 0, 677);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			if_block.m(div0, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(button0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, button1);
    			append_dev(button1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, button2);
    			append_dev(button2, t5);
    			append_dev(div1, t6);
    			append_dev(div1, button3);
    			append_dev(button3, t7);
    			append_dev(div2, t8);
    			append_dev(div2, button4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_3*/ ctx[13], false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[14], false, false, false),
    					listen_dev(button2, "click", /*click_handler_5*/ ctx[15], false, false, false),
    					listen_dev(button3, "click", /*click_handler_6*/ ctx[16], false, false, false),
    					listen_dev(button4, "click", /*click_handler_7*/ ctx[17], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (dirty & /*wise*/ 1 && button1_class_value !== (button1_class_value = "btn " + (/*wise*/ ctx[0].fail ? 'btn-dark' : 'btn-light') + " border border-dark")) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty & /*wise*/ 1 && button2_class_value !== (button2_class_value = "btn " + (/*wise*/ ctx[0].fate ? 'btn-dark' : 'btn-light') + " border border-dark")) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (dirty & /*wise*/ 1 && button3_class_value !== (button3_class_value = "btn " + (/*wise*/ ctx[0].persona ? 'btn-dark' : 'btn-light') + " border border-dark")) {
    				attr_dev(button3, "class", button3_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(24:0) {:else}",
    		ctx
    	});

    	return block;
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
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			t0 = space();
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "class", "btn btn-light border ml-auto mb-1");
    			add_location(button, file$2, 21, 4, 555);
    			attr_dev(div, "class", "d-flex");
    			add_location(div, file$2, 15, 0, 245);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(15:0) {#if wise.old}",
    		ctx
    	});

    	return block;
    }

    // (31:16) {:else}
    function create_else_block_2(ctx) {
    	let h2;
    	let button;
    	let t_value = /*wise*/ ctx[0].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "badge btn btn-light w-100 text-left");
    			add_location(button, file$2, 31, 40, 1014);
    			attr_dev(h2, "class", "flex-grow-1");
    			add_location(h2, file$2, 31, 16, 990);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*wise*/ 1 && t_value !== (t_value = /*wise*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(31:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (29:16) {#if editName}
    function create_if_block_2$1(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control mb-1");
    			add_location(input_1, file$2, 29, 16, 840);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			set_input_value(input_1, /*wise*/ ctx[0].name);
    			/*input_1_binding_1*/ ctx[11](input_1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*blur_handler_1*/ ctx[9], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler_1*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*wise*/ 1 && input_1.value !== /*wise*/ ctx[0].name) {
    				set_input_value(input_1, /*wise*/ ctx[0].name);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding_1*/ ctx[11](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(29:16) {#if editName}",
    		ctx
    	});

    	return block;
    }

    // (19:4) {:else}
    function create_else_block(ctx) {
    	let button;
    	let t_value = /*wise*/ ctx[0].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn btn-light border mb-1 mr-1 w-100 text-left");
    			add_location(button, file$2, 19, 4, 422);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*wise*/ 1 && t_value !== (t_value = /*wise*/ ctx[0].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(19:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:4) {#if editName}
    function create_if_block_1$2(ctx) {
    	let input_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "class", "form-control mb-1 mr-1");
    			add_location(input_1, file$2, 17, 4, 291);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    			set_input_value(input_1, /*wise*/ ctx[0].name);
    			/*input_1_binding*/ ctx[6](input_1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "blur", /*blur_handler*/ ctx[4], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*wise*/ 1 && input_1.value !== /*wise*/ ctx[0].name) {
    				set_input_value(input_1, /*wise*/ ctx[0].name);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    			/*input_1_binding*/ ctx[6](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(17:4) {#if editName}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*wise*/ ctx[0].old) return create_if_block$2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
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
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	validate_slots('Wise', slots, []);
    	let { actions } = $$props;
    	let { wise } = $$props;
    	let input;
    	let editName = false;

    	afterUpdate(() => {
    		if (input) input.focus();
    	});

    	const writable_props = ['actions', 'wise'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Wise> was created with unknown prop '${key}'`);
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

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		actions,
    		wise,
    		input,
    		editName
    	});

    	$$self.$inject_state = $$props => {
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('wise' in $$props) $$invalidate(0, wise = $$props.wise);
    		if ('input' in $$props) $$invalidate(2, input = $$props.input);
    		if ('editName' in $$props) $$invalidate(3, editName = $$props.editName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Wise extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { actions: 1, wise: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Wise",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*actions*/ ctx[1] === undefined && !('actions' in props)) {
    			console.warn("<Wise> was created without expected prop 'actions'");
    		}

    		if (/*wise*/ ctx[0] === undefined && !('wise' in props)) {
    			console.warn("<Wise> was created without expected prop 'wise'");
    		}
    	}

    	get actions() {
    		throw new Error("<Wise>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Wise>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wise() {
    		throw new Error("<Wise>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wise(value) {
    		throw new Error("<Wise>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Wises.svelte generated by Svelte v3.48.0 */
    const file$1 = "src\\components\\Wises.svelte";

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

    // (50:12) {#if current.length < 4}
    function create_if_block_1$1(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Add wise";
    			attr_dev(button, "class", "btn btn-light border mb-1");
    			add_location(button, file$1, 52, 20, 1250);
    			attr_dev(div0, "class", "col-md-12");
    			add_location(div0, file$1, 51, 16, 1205);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$1, 50, 12, 1170);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*add*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(50:12) {#if current.length < 4}",
    		ctx
    	});

    	return block;
    }

    // (58:16) {#each current as wise (wise.id)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let wise;
    	let current;

    	wise = new Wise({
    			props: {
    				wise: /*wise*/ ctx[9],
    				actions: /*wiseActions*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(wise.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(wise, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const wise_changes = {};
    			if (dirty & /*current*/ 4) wise_changes.wise = /*wise*/ ctx[9];
    			wise.$set(wise_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wise.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wise.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(wise, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(58:16) {#each current as wise (wise.id)}",
    		ctx
    	});

    	return block;
    }

    // (64:4) {#if old.length > 0}
    function create_if_block$1(ctx) {
    	let div2;
    	let div1;
    	let h4;
    	let t1;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*old*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*wise*/ ctx[9].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Previous Wises";
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h4, file$1, 66, 12, 1699);
    			attr_dev(div0, "class", "d-flex flex-column");
    			add_location(div0, file$1, 67, 12, 1736);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$1, 65, 8, 1662);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$1, 64, 4, 1634);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, h4);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*old, wiseActions*/ 10) {
    				each_value = /*old*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, outro_and_destroy_block, create_each_block, null, get_each_context);
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
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(64:4) {#if old.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (69:16) {#each old as wise (wise.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let wise;
    	let current;

    	wise = new Wise({
    			props: {
    				wise: /*wise*/ ctx[9],
    				actions: /*wiseActions*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(wise.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(wise, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const wise_changes = {};
    			if (dirty & /*old*/ 2) wise_changes.wise = /*wise*/ ctx[9];
    			wise.$set(wise_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wise.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wise.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(wise, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(69:16) {#each old as wise (wise.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div9;
    	let div3;
    	let div2;
    	let div0;
    	let button0;
    	let t1;
    	let t2;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t3;
    	let t4;
    	let div8;
    	let div7;
    	let div6;
    	let div4;
    	let h5;
    	let t6;
    	let button1;
    	let t8;
    	let div5;
    	let p0;
    	let t10;
    	let p1;
    	let t12;
    	let ul;
    	let li0;
    	let strong0;
    	let t14;
    	let t15;
    	let li1;
    	let strong1;
    	let t17;
    	let t18;
    	let p2;
    	let t19;
    	let strong2;
    	let t21;
    	let strong3;
    	let t23;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*current*/ ctx[2].length < 4 && create_if_block_1$1(ctx);
    	let each_value_1 = /*current*/ ctx[2];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*wise*/ ctx[9].id;
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	let if_block1 = /*old*/ ctx[1].length > 0 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "?";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Wises";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "✗";
    			t8 = space();
    			div5 = element("div");
    			p0 = element("p");
    			p0.textContent = "Wises can be used to help others in place of a relevent skill. Doing so isolates the helping character from receiving conditions from the test.";
    			t10 = space();
    			p1 = element("p");
    			p1.textContent = "Wises can be used to salvage a failed roll:";
    			t12 = space();
    			ul = element("ul");
    			li0 = element("li");
    			strong0 = element("strong");
    			strong0.textContent = "Deeper understanding";
    			t14 = text(" Spend a point of fate to reroll a single failed die");
    			t15 = space();
    			li1 = element("li");
    			strong1 = element("strong");
    			strong1.textContent = "Of course!";
    			t17 = text(" Spend a point of persona to reroll all failed dice");
    			t18 = space();
    			p2 = element("p");
    			t19 = text("Once a wise has been used to help another in a failed and successful test, as well as ");
    			strong2 = element("strong");
    			strong2.textContent = "deeper understanding";
    			t21 = text(" \r\n                        and ");
    			strong3 = element("strong");
    			strong3.textContent = "of course!";
    			t23 = text(", the wise may be replaced with another, or a test for advancement may be marked for a skill related\r\n                        to the wise.");
    			attr_dev(button0, "class", "btn badge btn-light border border-dark");
    			add_location(button0, file$1, 47, 16, 1000);
    			attr_dev(div0, "class", "btn-group position-topright");
    			add_location(div0, file$1, 46, 12, 941);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$1, 56, 12, 1401);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$1, 45, 8, 904);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$1, 44, 4, 876);
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$1, 79, 20, 2285);
    			attr_dev(button1, "class", "close");
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$1, 80, 20, 2341);
    			attr_dev(div4, "class", "modal-header");
    			add_location(div4, file$1, 78, 16, 2237);
    			add_location(p0, file$1, 83, 20, 2536);
    			add_location(p1, file$1, 84, 20, 2708);
    			add_location(strong0, file$1, 86, 28, 2814);
    			add_location(li0, file$1, 86, 24, 2810);
    			add_location(strong1, file$1, 87, 28, 2938);
    			add_location(li1, file$1, 87, 24, 2934);
    			add_location(ul, file$1, 85, 20, 2780);
    			add_location(strong2, file$1, 90, 110, 3185);
    			add_location(strong3, file$1, 91, 28, 3253);
    			add_location(p2, file$1, 89, 20, 3070);
    			attr_dev(div5, "class", "modal-body");
    			add_location(div5, file$1, 82, 16, 2490);
    			attr_dev(div6, "class", "modal-content");
    			add_location(div6, file$1, 77, 12, 2192);
    			attr_dev(div7, "class", "modal-dialog");
    			attr_dev(div7, "role", "document");
    			add_location(div7, file$1, 76, 8, 2136);
    			attr_dev(div8, "class", "modal fade");
    			attr_dev(div8, "tabindex", "-1");
    			attr_dev(div8, "role", "dialog");
    			attr_dev(div8, "aria-labelledby", "wises");
    			attr_dev(div8, "aria-hidden", "true");
    			toggle_class(div8, "show", /*showHelp*/ ctx[0]);
    			set_style(div8, "display", /*showHelp*/ ctx[0] ? 'block' : 'none', false);
    			add_location(div8, file$1, 75, 4, 1965);
    			attr_dev(div9, "class", "container-fluid");
    			add_location(div9, file$1, 43, 0, 841);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(div2, t1);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div9, t3);
    			if (if_block1) if_block1.m(div9, null);
    			append_dev(div9, t4);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, h5);
    			append_dev(div4, t6);
    			append_dev(div4, button1);
    			append_dev(div6, t8);
    			append_dev(div6, div5);
    			append_dev(div5, p0);
    			append_dev(div5, t10);
    			append_dev(div5, p1);
    			append_dev(div5, t12);
    			append_dev(div5, ul);
    			append_dev(ul, li0);
    			append_dev(li0, strong0);
    			append_dev(li0, t14);
    			append_dev(ul, t15);
    			append_dev(ul, li1);
    			append_dev(li1, strong1);
    			append_dev(li1, t17);
    			append_dev(div5, t18);
    			append_dev(div5, p2);
    			append_dev(p2, t19);
    			append_dev(p2, strong2);
    			append_dev(p2, t21);
    			append_dev(p2, strong3);
    			append_dev(p2, t23);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*current*/ ctx[2].length < 4) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div2, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*current, wiseActions*/ 12) {
    				each_value_1 = /*current*/ ctx[2];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div1, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
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
    					if_block1.m(div9, t4);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*showHelp*/ 1) {
    				toggle_class(div8, "show", /*showHelp*/ ctx[0]);
    			}

    			if (dirty & /*showHelp*/ 1) {
    				set_style(div8, "display", /*showHelp*/ ctx[0] ? 'block' : 'none', false);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			if (if_block0) if_block0.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block1) if_block1.d();
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
    	let current;
    	let old;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Wises', slots, []);
    	let { wises } = $$props;

    	const wiseActions = {
    		delete: wise => {
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

    	const writable_props = ['wises'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Wises> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, showHelp = true);
    	const click_handler_1 = () => $$invalidate(0, showHelp = false);

    	$$self.$$set = $$props => {
    		if ('wises' in $$props) $$invalidate(5, wises = $$props.wises);
    	};

    	$$self.$capture_state = () => ({
    		Wise,
    		wises,
    		wiseActions,
    		showHelp,
    		add,
    		refresh,
    		old,
    		current
    	});

    	$$self.$inject_state = $$props => {
    		if ('wises' in $$props) $$invalidate(5, wises = $$props.wises);
    		if ('showHelp' in $$props) $$invalidate(0, showHelp = $$props.showHelp);
    		if ('old' in $$props) $$invalidate(1, old = $$props.old);
    		if ('current' in $$props) $$invalidate(2, current = $$props.current);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Wises extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { wises: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Wises",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*wises*/ ctx[5] === undefined && !('wises' in props)) {
    			console.warn("<Wises> was created without expected prop 'wises'");
    		}
    	}

    	get wises() {
    		throw new Error("<Wises>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wises(value) {
    		throw new Error("<Wises>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */
    const file = "src\\App.svelte";

    // (46:26) 
    function create_if_block_9(ctx) {
    	let wises;
    	let current;

    	wises = new Wises({
    			props: { wises: /*model*/ ctx[0].wises },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(wises.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wises, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wises_changes = {};
    			if (dirty & /*model*/ 1) wises_changes.wises = /*model*/ ctx[0].wises;
    			wises.$set(wises_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wises.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wises.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wises, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(46:26) ",
    		ctx
    	});

    	return block;
    }

    // (44:27) 
    function create_if_block_8(ctx) {
    	let traits;
    	let current;

    	traits = new Traits({
    			props: { traits: /*model*/ ctx[0].traits },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(traits.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(traits, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const traits_changes = {};
    			if (dirty & /*model*/ 1) traits_changes.traits = /*model*/ ctx[0].traits;
    			traits.$set(traits_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(traits.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(traits.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(traits, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(44:27) ",
    		ctx
    	});

    	return block;
    }

    // (42:27) 
    function create_if_block_7(ctx) {
    	let spells;
    	let current;

    	spells = new Spells({
    			props: { spells: /*model*/ ctx[0].spells },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(spells.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(spells, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const spells_changes = {};
    			if (dirty & /*model*/ 1) spells_changes.spells = /*model*/ ctx[0].spells;
    			spells.$set(spells_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spells.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spells.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(spells, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(42:27) ",
    		ctx
    	});

    	return block;
    }

    // (40:27) 
    function create_if_block_6(ctx) {
    	let skills;
    	let current;

    	skills = new Skills({
    			props: {
    				skills: /*model*/ ctx[0].skills,
    				bluckTries: /*model*/ ctx[0].abilities.nature.current
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skills.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skills, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const skills_changes = {};
    			if (dirty & /*model*/ 1) skills_changes.skills = /*model*/ ctx[0].skills;
    			if (dirty & /*model*/ 1) skills_changes.bluckTries = /*model*/ ctx[0].abilities.nature.current;
    			skills.$set(skills_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skills.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skills.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skills, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(40:27) ",
    		ctx
    	});

    	return block;
    }

    // (38:26) 
    function create_if_block_5(ctx) {
    	let notes;
    	let current;

    	notes = new Notes({
    			props: { notes: /*model*/ ctx[0].notes },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(notes.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(notes, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const notes_changes = {};
    			if (dirty & /*model*/ 1) notes_changes.notes = /*model*/ ctx[0].notes;
    			notes.$set(notes_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(notes.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(notes.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(notes, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(38:26) ",
    		ctx
    	});

    	return block;
    }

    // (36:30) 
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
    		source: "(36:30) ",
    		ctx
    	});

    	return block;
    }

    // (34:28) 
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
    		source: "(34:28) ",
    		ctx
    	});

    	return block;
    }

    // (32:24) 
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
    		source: "(32:24) ",
    		ctx
    	});

    	return block;
    }

    // (30:32) 
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
    		source: "(30:32) ",
    		ctx
    	});

    	return block;
    }

    // (28:1) {#if tab == 'abilities'}
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
    		source: "(28:1) {#if tab == 'abilities'}",
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
    			add_location(link, file, 21, 1, 738);
    			attr_dev(main, "id", "app");
    			add_location(main, file, 24, 0, 966);
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
    		Notes,
    		Skills,
    		Spells,
    		Traits,
    		Wises,
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