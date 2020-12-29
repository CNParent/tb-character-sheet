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
        return this.add(new Item(`${this.id}_item_${index}`, {
            edit: this.state.edit && this.state.edit.item == item,
            item: item,
            delete: this.deleteItem(index),
            exit: this.stopEdit,
            select: this.selectItem(item, index),
            move: (val) => this.moveItem(item, index, val)
        }));
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

    deleteItem(index) {
        return () => {
            this.state.container.items.splice(index, 1);
            this.parent.state.edit = undefined;
            this.parent.update();
        }
    }

    moveItem(item, index, val) {
        this.state.container.items.splice(index, 1);

        index += val;
        if (index < 0) index = this.state.container.items.length;
        else if (index > this.state.container.items.length) index = 0;

        this.state.container.items.splice(index, 0, item);
        this.parent.update();
    }

    selectItem(item, index) {
        return () => {
            if(this.state.edit && !this.state.edit.item.text)
                this.state.edit.container.items.splice(this.state.edit.index, 1);
                
            this.parent.state.edit = {
                index: index,
                item: item,
                container: this.state.container
            };

            this.parent.update();
        }
    }

    stopEdit = () => {
        this.parent.state.edit = undefined;
        this.parent.update();
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

        _(`#${this.id}_delete`).map(x => x.addEventListener('click', e => {
            if(!confirm(`Delete ${this.state.container.name}?`)) return;

            this.state.delete();
        }));

        _(`#${this.id}_hide`).map(x => x.addEventListener('click', e => {
            this.state.container.hide = true;
            this.parent.update();
        }));

        _(`#${this.id}_sort`).map(x => x.addEventListener('click', e => {
            this.state.container.items.sort((a,b) => a.text.localeCompare(b.text));
            this.update();
        }));

        _(`#${this.id}_name`).map(x => x.addEventListener('blur', e => {
            this.state.container.name = this.textValue(x.value);
            this.state.editName = undefined;
            this.update();
        }));

        this.find('[data-new]').map(x => x.addEventListener('click', e => {
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
        }));

        this.find('[data-pack]').map(x => x.addEventListener('click', e => {
            let isBackpack = this.state.container.name == 'Backpack';
            this.state.container.name = isBackpack ? 'Satchel' : 'Backpack';
            this.state.container.size = isBackpack ? 3 : 6;
            this.update();
        }));

        this.find('[data-rename]').map(x => x.addEventListener('click', e => {
            this.state.editName = true;
            this.update();
        }));

        if(this.state.edit != undefined || this.state.editName) this.find('input')[0]?.focus();
    }
}