class Circle extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card">
                <div class="card-body d-flex flex-column">
                    <h2>${this.state.title}</h2>
                    ${this.state.items.map((x, i) => this.listItem(x, i)).reduce((a,b) => `${a}${b}`,'')}
                    ${this.drawNew()}
                </div>
            </div>
        `;
    }

    listItem(item, index) {
        if(this.state.edit != index)
            return String.raw`
                <div class="d-flex w-100 p-1 bg-light">
                    <div data-edit="${index}" class="btn btn-light flex-grow-1 text-left">${item}</div>
                    <button data-remove="${index}" class="btn btn-light border border-dark">Delete</button>
                </div>
            `;

        return this.drawEdit(item, index);
    }

    drawNew() {
        if(this.state.edit != this.state.items.length ) return String.raw`
            <button data-add="" class="btn btn-light border border-dark my-1">Add</button>
        `;

        return this.drawEdit('', this.state.items.length);
    }

    drawEdit(text, index) {
        return String.raw`
            <div class="input-group my-1">
                <input data-name="" class="form-control" value="${text}">
                <div class="input-group-append">
                    <button data-confirm="${index}" class="btn btn-light border border-dark">&check;</button>
                    <button data-cancel="${index}" class="btn btn-light border border-dark">&cross;</button>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();
        this.find('[data-add]').on('click touch', e => {
            this.state.edit = this.state.items.length;
            this.update();
        });

        this.find('[data-cancel]').on('click touch', e => {
            this.state.edit = undefined;
            this.update();
        });

        this.find('[data-confirm]').on('click touch', e => {
            let index = $(e.target).attr('data-confirm');
            let value = this.find('[data-name]').val();
            if(this.state.items.length == index) this.state.items.push(value);
            else this.state.items[index] = value;

            this.state.edit = undefined;
            this.update();
        });

        this.find('[data-edit]').on('click touch', e => {
            this.state.edit = $(e.target).attr('data-edit');
            this.update();
        });

        this.find('[data-remove]').on('click touch', e => {
            this.state.items.splice($(e.target).attr('data-remove'), 1);
            this.update();
        });
    }
}