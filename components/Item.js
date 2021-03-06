class Item extends Component {

    btnStyle = 'btn border border-dark align-self-start';

    draw() {
        return String.raw`
            <div id="${this.id}">
                ${this.drawItem()}
                ${this.drawEdit()}
            </div>
        `;
    }

    drawItem() {
        if(this.state.edit) return '';

        let item = this.state.item;
        let size = item.stackSize ? item.size + 1 : item.size;
        return String.raw`
            <span class="d-flex btn-group mb-1 w-100" style="min-height: ${size * 2.5}em;">
                <span class="btn btn-light text-left border border-dark flex-grow-1">
                    <span>${item.text}</span>
                    ${this.drawStack()}
                </span>
                <button id="${this.id}_select" class="btn btn-light border border-dark flex-grow-0">${item.size}</button>
            </span>
        `;
    }

    drawEdit() {
        if(!this.state.edit) return '';

        let item = this.state.item;
        if(item.stackSize === undefined) {
            item.stackSize = 0;
            item.stack = 0;
        }

        return String.raw`
            <div class="btn bg-light mb-1 p-0 w-100 border">
                <div class="d-flex m-1">
                    <input id="${this.id}_itemname" class="form-control flex-grow-1" style="min-width: 0px;" value="${item.text}">
                    <button id="${this.id}_exit" class="${this.btnStyle} btn-light ml-1">Done</button>
                </div>
                ${this.drawEditDetails()}
            </div>
        `;
    }

    drawEditDetails() {
        let item = this.state.item;
        return String.raw`
            <div class="d-flex m-1 align-items-center">
                <span id="${this.id}_size" class="${this.btnStyle} btn-dark">${item.size}</span>
                <span class="ml-1">Size</span>
                <div class="btn-group ml-auto">
                    <button data-size="1" class="${this.btnStyle}">&uarr;</button>
                    <button data-size="-1" class="${this.btnStyle}">&darr;</button>
                </div>
            </div>
            <div class="d-flex m-1 align-items-center">
                <span id="${this.id}_stackSize" class="${this.btnStyle} btn-dark">${item.stackSize}</span>
                <span class="ml-1">Uses</span>
                <div class="btn-group ml-auto">
                    <button data-stack-size="1" class="${this.btnStyle}">&uarr;</button>
                    <button data-stack-size="-1" class="${this.btnStyle}">&darr;</button>
                </div>
            </div>
            <div class="d-flex m-1 align-items-center">
                <div class="btn-group">
                    <button data-move="-1" class="${this.btnStyle} btn-light">&uarr;</button>
                    <button data-move="1" class="${this.btnStyle} btn-light">&darr;</button>
                </div>
                <button id="${this.id}_delete" class="${this.btnStyle} btn-light ml-auto">Delete</button>
            </div>
        `;
    }

    drawStack() {
        if(!this.state.item.stackSize) return '';

        return String.raw`
            <div class="d-flex mt-2">
                ${this.add(new Bubbles(`${this.id}_stack`, {
                    count: this.state.item.stackSize,
                    value: this.state.item.stack,
                    label: 'Used',
                    set: (val) => { this.state.item.stack = val }
                }))}
            </div>
        `;
    }

    initialize() {
        super.initialize();

        _(`#${this.id}_delete`).map(x => x.onclick = () => this.state.delete());
        _(`#${this.id}_exit`).map(x => x.onclick = () => this.state.exit());
        _(`#${this.id}_select`).map(x => x.onclick = () => this.state.select());

        _(`#${this.id}_itemname`).map(x => x.onblur = e => {
            this.state.item.text = this.textValue(x.value);
        });

        this.find('[data-move]').map(x => x.onclick = e => {
            let val = Number(x.dataset.move);
            this.state.move(val);
        });

        this.find('[data-size]').map(x => x.onclick = e => {
            let item = this.state.item;
            item.size += Number(x.dataset.size);
            if(item.size < 1) item.size = this.parent.space();
            if(this.parent.space() < 0) item.size = 1;

            this.parent.update();
        });
        
        this.find('[data-stack-size]').map(x => x.onclick = e => {
            let item = this.state.item;
            item.stackSize += Number(x.dataset.stackSize);
            if(item.stackSize < 0) item.stackSize = 0;

            this.parent.update();
        });
    }
}