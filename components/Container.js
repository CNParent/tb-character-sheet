class Container extends Component {

    canAdd = () => ['custom', 'pockets'].find(x => x == this.state.container.format);

    draw() {
        if(this.state.container.hide) return '';

        return String.raw`
            <div id="${this.id}" class="col-lg-3 col-md-4 col-sm-6 my-1">
                <div class="card">
                    <div class="card-header p-2 d-flex">
                        ${this.drawName()}
                        <div class="btn-group ml-auto">
                            ${this.drawAdd()}
                            <span id="${this.id}_hide" class="${this.smallButton()}">hide</span>
                            <span id="${this.id}_sort" class="${this.smallButton()}">a &rarr; z</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-column">
                            ${this.state.container.items.map((x,i) => this.drawItem(x,i)).reduce((a,b) => `${a}${b}`, '')}
                            ${this.drawEmptySlots()}
                        </div>
                        ${this.drawDelete()}
                    </div>
                </div>
            </div>
        `;
    }
    
    drawAdd() {
        if(!this.canAdd()) return '';

        if(this.state.container.size == 1) 
            return String.raw`
                <span id="${this.id}_add" class="${this.smallButton()}">more space</span>
            `;

        return String.raw`
            <span id="${this.id}_add" class="${this.smallButton()}">more space</span>
            <span id="${this.id}_del" class="${this.smallButton()}">less space</span>
        `;
    }

    drawDelete() {
        if(this.state.container.format != 'custom') return'';

        return String.raw`
            <button id="${this.id}_delete" class="btn btn-light border border-dark">Delete</button>
        `;
    }

    drawEdit() {
        let item = this.state.container.items[this.state.edit];
        let btnStyle = 'btn border border-dark align-self-start';
        return String.raw`
            <div class="btn bg-light d-flex mb-1 p-0 border border-dark" style="height: ${item.size * 2.5}em;">
                <div class="input-group">
                    <input id="${this.id}_itemname" class="form-control" value="${item.text}">
                    <div class="input-group-append">
                        <button id="${this.id}_size" class="${btnStyle} btn-dark">${item.size}</button>
                        <button id="${this.id}_exit" class="${btnStyle} btn-light">&cross;</button>
                    </div>
                </div>
            </div>
        `;
    }

    drawEmptySlots() {
        if(this.space() < 1) return '';

        let index = this.state.container.items.length;
        if(this.state.edit == index) return this.drawEdit();

        return String.raw`
            <span data-edit="${index}" class="btn btn-light border border-dark mb-1" style="height: ${2.5 * this.space()}em;"></span>
        `;
    }

    drawItem(item, index) {
        if(this.state.edit == index) return this.drawEdit();

        return String.raw`
            <span data-edit="${index}" class="btn btn-light text-left border border-dark mb-1" style="height: ${item.size * 2.5}em;">${item.text}</span>
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

    space = () => {
        let current = this.state.container.items.reduce((a,b) => a + b.size, 0);
        let max = this.state.container.size;
        return max - current;
    }

    smallButton = () => 'badge btn btn-light border border-dark align-self-center';

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.container.size++;
            this.update();
        });

        $(`#${this.id}_del`).click(e => {
            if(this.state.container.size == 1) return;

            this.state.container.size--;
            this.update();
        });

        $(`#${this.id}_delete`).click(e => {
            if(!confirm(`Delete ${this.state.container.name}?`)) return;

            this.state.delete();
        })

        $(`#${this.id}_hide`).click(e => {
            this.state.container.hide = true;
            this.parent.update();
        });

        $(`#${this.id}_sort`).click(e => {
            this.state.container.items.sort((a,b) => a.text.localeCompare(b.text));
            this.update();
        });

        $(`#${this.id}_exit`).click(e => {
            if(!$(`#${this.id}_name`).val() || !this.state.container.items[this.state.edit].text) 
                this.state.container.items.splice(this.state.edit, 1);

            this.state.edit = undefined;
            this.update();
        });

        $(`#${this.id}_size`).click(e => {
            let item = this.state.container.items[this.state.edit];
            item.size += e.originalEvent.shiftKey ? -1 : 1;
            if(item.size < 1) item.size = 1;
            if(this.space() < 0) item.size = 1;

            this.update();
        });

        $(`#${this.id}_itemname`).on('change', e => this.state.container.items[this.state.edit].text = $(e.target).val());

        $(`#${this.id}_name`).on('change', e => {
            this.state.container.name = $(e.target).val();
            this.state.editName = undefined;
            this.update();
        });

        this.find('[data-edit]').click(e => {
            if(this.state.edit) {
                if(!this.state.container.items[this.state.edit].text)
                    this.state.container.items.splice(this.state.edit, 1);

                this.state.edit = undefined;
                this.update();
            } else {
                this.state.edit = $(e.target).attr('data-edit');
                if(!this.state.container.items[this.state.edit])
                    this.state.container.items.push({ text: '', size: 1 });

                this.update();
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
        })
    }
}