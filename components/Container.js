class Container extends Component {

    btnStyle = 'btn border border-dark align-self-start';

    canAdd = () => ['custom', 'pockets'].find(x => x == this.state.container.format);

    draw() {
        if(this.state.container.hide) return '';

        return String.raw`
            <div id="${this.id}" class="col-lg-3 col-md-4 col-sm-6 my-1">
                <div class="card">
                    <div class="card-header p-2 d-flex">
                        ${this.drawName()}
                        <div class="btn-group ml-auto">
                            <span id="${this.id}_hide" class="${this.smallButton()}">hide</span>
                            <span id="${this.id}_sort" class="${this.smallButton()}">a &rarr; z</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-column">
                            ${this.state.container.items.map((x,i) => this.drawItem(x,i)).reduce((a,b) => `${a}${b}`, '')}
                            ${this.drawEmptySlots()}
                        </div>
                        <div class="d-flex">
                            ${this.drawDelete()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawDelete() {
        if(this.state.container.format != 'custom') return'';

        return String.raw`
            <button id="${this.id}_delete" class="btn btn-light border ml-auto">Delete</button>
        `;
    }

    drawEdit() {
        let item = this.state.edit.item;
        if(item.stackSize === undefined) {
            item.stackSize = 0;
            item.stack = 0;
        }

        return String.raw`
            <div class="btn bg-light mb-1 p-0 border">
                <div class="d-flex m-1">
                    <input id="${this.id}_itemname" class="form-control flex-grow-1" value="${item.text}">
                    <button id="${this.id}_exit" class="${this.btnStyle} btn-light ml-1">&cross;</button>
                </div>
                ${this.drawEditDetails()}
            </div>
        `;
    }

    drawEditDetails() {
        let item = this.state.edit.item;
        return String.raw`
            <div class="d-flex m-1">
                <span id="${this.id}_size" class="${this.btnStyle} btn-dark">${item.size}</span>
                <span class="ml-1">Size</span>
                <div class="btn-group ml-auto">
                    <button data-size="1" class="${this.btnStyle}">&uarr;</button>
                    <button data-size="-1" class="${this.btnStyle}">&darr;</button>
                </div>
            </div>
            <div class="d-flex m-1">
                <span id="${this.id}_stackSize" class="${this.btnStyle} btn-dark">${item.stackSize}</span>
                <span class="ml-1">Uses</span>
                <div class="btn-group ml-auto">
                    <button data-stack-size="1" class="${this.btnStyle}">&uarr;</button>
                    <button data-stack-size="-1" class="${this.btnStyle}">&darr;</button>
                </div>
            </div>
            <div class="d-flex m-1">
                <div class="btn-group">
                    <button data-move="-1" class="${this.btnStyle} btn-light">&uarr;</button>
                    <button data-move="1" class="${this.btnStyle} btn-light">&darr;</button>
                </div>
                <button id="${this.id}_deleteItem" class="${this.btnStyle} btn-light ml-auto">Delete</button>
            </div>
        `;
    }

    drawEmptySlots() {
        if(this.space() < 1 && !this.canAdd()) return '';

        let attr = 'data-new';
        let style = 'btn-light';
        if(this.state.edit && !this.canTransfer()) {
            style = 'disabled btn-secondary';
            attr = "disabled";
        }

        return String.raw`
            <span ${attr} class="btn ${style} border mb-1" style="height: ${2.5 * this.space()}em;"></span>
        `;
    }

    drawItem(item, index) {
        if(this.state.edit && this.state.edit.item == item) 
            return this.drawEdit();

        let size = item.stackSize ? item.size + 1 : item.size;
        return String.raw`
            <span data-edit="${index}" class="btn btn-light text-left border border-dark mb-1" style="min-height: ${size * 2.5}em;">
                <span>${item.text}</span>
                ${this.drawStack(item, index)}
            </span>
        `;
    }

    drawStack(item, index) {
        if(!item.stackSize) return '';

        return String.raw`
            <div class="d-flex mt-2">
                ${this.add(new Bubbles(`${this.id}_item_${index}_stack`, {
                    count: item.stackSize,
                    value: item.stack,
                    label: 'Used',
                    set: (val) => { item.stack = val }
                }))}
            </div>
        `;
    }

    drawName() {
        if(this.state.container.format == 'pack') return String.raw`
            <h4 data-pack="" class="flex-grow-1 m-0">
                <span class="badge btn btn-light text-left card-title w-100 mb-0">${this.state.container.name}</span>
            </h4>
        `;

        if(this.state.container.format == 'custom' && this.state.editName) return String.raw`
            <input id="${this.id}_name" class="form-control" value="${this.state.container.name}">
        `;

        if(this.state.container.format == 'custom') return String.raw`
            <h4 data-rename="" class="flex-grow-1 m-0">
                <span class="badge btn btn-light text-left card-title w-100 mb-0">${this.state.container.name}</span>
            </h4>
        `;

        return String.raw`
            <h5 class="m-0">
                <span class="card-title mb-0">${this.state.container.name}</span>
            </h5>
        `;
    }

    canTransfer = () => this.state.edit
        && this.state.edit.container != this.state.container
        && (this.space() >= this.state.edit.item.size || this.canAdd());

    current = () => this.state.container.items.reduce((a,b) => a + b.size, 0);

    space = () => {
        if(this.canAdd()) return 1;

        let max = this.state.container.size;
        return max - this.current();
    }

    smallButton = () => 'badge btn btn-light border border-dark align-self-center p-2';

    initialize() {
        super.initialize();

        $(`#${this.id}_delete`).click(e => {
            if(!confirm(`Delete ${this.state.container.name}?`)) return;

            this.state.delete();
        });

        $(`#${this.id}_hide`).click(e => {
            this.state.container.hide = true;
            this.parent.update();
        });

        $(`#${this.id}_sort`).click(e => {
            this.state.container.items.sort((a,b) => a.text.localeCompare(b.text));
            this.update();
        });

        $(`#${this.id}_deleteItem`).click(e => {
            this.state.container.items.splice(this.state.edit.index, 1);
            this.parent.state.edit = undefined;
            this.parent.update();
        });

        $(`#${this.id}_exit`).click(e => {
            if(!this.state.edit.item.text) 
                this.state.container.items.splice(this.state.edit.index, 1);

            this.parent.state.edit = undefined;
            this.parent.update();
        });

        $(`#${this.id}_itemname`).blur(e => {
            this.state.edit.item.text = this.textValue($(e.target).val());
        });

        $(`#${this.id}_name`).blur(e => {
            this.state.container.name = this.textValue($(e.target).val());
            this.state.editName = undefined;
            this.update();
        });

        this.find('[data-edit]').click(e => {
            if(this.state.edit && !this.state.edit.item.text)
                this.state.edit.container.items.splice(this.state.edit.index, 1);

            let index = $(e.target).data('edit');
            if(index === undefined) index = $(e.target).parents('[data-edit]').data('edit');
            if(index === undefined) return;
                
            this.parent.state.edit = {
                index: index,
                item: this.state.container.items[index],
                container: this.state.container
            };
            this.parent.update();
        });

        this.find('[data-new]').click(e => {
            if(this.state.edit && !this.state.edit.item.text) {
                this.state.edit.container.items.splice(this.state.edit.index, 1);
                this.state.edit = undefined;
            }

            if(this.canTransfer()) {
                this.state.container.items.push(this.state.edit.item);
                this.state.edit.container.items.splice(this.state.edit.index, 1);
                this.parent.state.edit = undefined;
                this.parent.update();
            } else if(this.space() > 0) {
                this.parent.state.edit = {
                    item: { text: '', size: 1 },
                    index: this.state.container.items.length,
                    container: this.state.container
                };
                this.state.container.items.push(this.parent.state.edit.item);
                this.parent.update();
            }
        });

        this.find('[data-pack]').click(e => {
            let isBackpack = this.state.container.name == 'Backpack';
            this.state.container.name = isBackpack ? 'Satchel' : 'Backpack';
            this.state.container.size = isBackpack ? 3 : 6;
            this.update();
        });

        this.find('[data-rename]').click(e => {
            this.state.editName = true;
            this.update();
        });

        this.find('[data-size]').click(e => {
            let item = this.state.edit.item;
            item.size += Number($(e.target).data('size'));
            if(item.size < 1) item.size = 1;
            if(this.space() < 0) item.size = 1;

            this.parent.update();
        });

        this.find('[data-move]').click(e => {
            let edit = this.parent.state.edit;
            this.state.container.items.splice(edit.index, 1);

            edit.index += Number($(e.target).data('move'));
            if (edit.index < 0) edit.index = this.state.container.items.length;
            else if (edit.index > this.state.container.items.length) edit.index = 0;

            this.state.container.items.splice(edit.index, 0, edit.item);
            this.parent.update();
        });
        
        this.find('[data-stack-size]').click(e => {
            let item = this.state.edit.item;
            item.stackSize += Number($(e.target).data('stack-size'));
            if(item.stackSize < 0) item.stackSize = 0;

            this.parent.update();
        });

        if(this.state.edit != undefined || this.state.editName) this.find('input').focus();
    }
}