class Component {

    children = [];
    
    constructor(id, state) {
        this.state = state;
        this.id = id;
        this.parent = this;
    }

    add(c = new Component()) {
        if(!c.id) throw "missing component id";

        this.children.push(c);
        c.parent = this;
        if(!c.state) {
            if(!this.state[c.id]) this.state[c.id] = {};
            c.state = this.state[c.id];
        } 
        
        return c.draw();
    }

    draw() {
        return String.raw`<div id="${this.id}"></div>`;
    }

    find(selector) {
        return $(`#${this.id} ${selector}`);
    }

    initialize() {
        this.children.map((x) => x.initialize());
    };

    update() {
        this.children = [];
        let element = $(`#${this.id}`)[0];
        if(element) element.outerHTML = this.draw();

        this.initialize();
    }
}
