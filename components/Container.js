class Container extends Component {

    draw() {
        if(this.state.container.hide) return '';

        return String.raw`
            <div id="${this.id}" class="col-lg-3 col-md-4 col-sm-6 my-1">
                <div class="card">
                    <div class="card-header p-2 d-flex">
                        <h5 class="m-0"><span class="card-title mb-0">${this.state.container.name}</span></h5>
                        <div class="btn-group ml-auto">
                            ${this.drawAdd()}
                            <span id="${this.id}_hide" class="${this.smallButton()}">hide</span>
                            <span id="${this.id}_sort" class="${this.smallButton()}">a &rarr; z</span>
                        </div>
                        <span class="badge badge-dark ml-1 align-self-center">${this.state.container.items.reduce((a,b) => a.size + b.size, 0)} / ${this.state.container.size}</span>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-column">
                            ${this.items().map(x => this.drawItem(x)).reduce((a,b) => `${a}${b}`, '')}
                            ${this.drawEmptySlots()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawAdd() {
        if(this.state.container.format != 'pockets') return '';

        return String.raw`<span id="${this.id}_add" class="${this.smallButton()}">add space</span>`;
    }

    drawEdit() {
        return String.raw`
        `;
    }

    drawEmptySlots() {
        return [...new Array(this.state.container.size - this.items().length)]
            .map(x => this.drawEmptySlot())
            .reduce((a,b) => `${a}${b}`, '');
    }

    drawEmptySlot() {
        return String.raw`
            <span class="btn btn-light text-left">&lt;Empty&gt;</span>
        `;
    }

    drawItem(x) {
        let text = x.placeholder ? `(${x.text})` : x.text;
        let classes = x.placeholder ? 'bg-light' : 'btn btn-light text-left';
        return String.raw`
            <span class="${classes}">${text}</span>
        `;
    }

    items = () => this.state.container.items
        .map(x => [...new Array(x.size)].map((y,i) => { return { item: x, placeholder: i > 0 }}))
        .reduce((a,b) => a.concat(b), []);

    smallButton = () => 'badge btn btn-light border border-dark align-self-center';

    initialize() {
        super.initialize();

        $(`#${this.id}_hide`).on('click touch', e => {
            this.state.container.hide = true;
            this.parent.update();
        });
    }
}