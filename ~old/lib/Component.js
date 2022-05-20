class Component {

    children = [];

    htmlMap = [
        { key: /&/, value: '&amp;' },
        { key: /</, value: '&lt;' },
        { key: />/, value: '&gt;' },
        { key: /"/, value: '&quot;' },
        { key: /'/, value: '&#39;' },
        { key: /\//, value: '&#x2F;' },
        { key: /`/, value: '&#x60;' },
        { key: /=/, value: '&#x3D;' }
    ];
    
    constructor(id, state) {
        this.state = state;
        this.id = id;
        this.parent = this;
    }

    add(c = new Component()) {
        if(!c.id) throw "missing component id";

        this.children.push(c);
        c.parent = this;
        if(!c.state) c.state = this.state[c.id];
        
        return c.draw();
    }

    draw() {
        return String.raw`<div id="${this.id}"></div>`;
    }

    find(selector) {
        return _(`#${this.id} ${selector}`);
    }

    initialize() {
        this.children.map((x) => x.initialize());
        
        this.find('textarea').map(x => x.onkeyup = x.onfocus = null);
        this.find('textarea').map(x => x.onkeyup = x.onfocus = e => {
            if(Number(x.style.height.replace('px', '')) > x.scrollHeight)
                return;

            x.style.height = `${x.scrollHeight + 5}px`;
        });
    };

    update() {
        this.children = [];
        let element = _(`#${this.id}`)[0];
        if(element) element.outerHTML = this.draw();

        this.initialize();
    }

    textValue(val) {
        this.htmlMap.map(x => val = val.replace(x.key, x.value));
        return val;
    }
}
