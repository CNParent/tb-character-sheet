class Circle extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card">
                <div class="card-body">
                    <div class="d-flex flex-column">
                        <h2>${this.state.title}</h2>
                        ${this.state.items.map((x, i) => this.listItem(x, i)).reduce((a,b) => `${a}${b}`,'')}
                    </div>
                    <div class="btn-group">
                        <button data-add="" class="btn btn-light border my-1">Add</button>
                        <button data-sort="" class="btn btn-light border my-1">a &rarr; z</button>
                    </div>
                </div>
            </div>
        `;
    }

    listItem(item, index) {
        if(this.state.edit != index)
            return String.raw`
                <button data-edit="${index}" class="btn btn-light border-bottom text-left">${item}</button>
            `;

        return this.drawEdit(item, index);
    }

    drawEdit(text) {
        return String.raw`
            <input data-name="" class="form-control my-1" value="${text}">
        `;
    }

    initialize() {
        super.initialize();

        this.find('input').blur(e => {
            this.state.items[this.state.edit] = this.textValue($(e.target).val());
            if(!this.state.items[this.state.edit]) {
                this.state.items.splice(this.state.edit, 1);
            }

            this.state.edit = undefined;
            this.update();
        });

        this.find('[data-add]').click(e => {
            this.state.edit = this.state.items.length;
            this.state.items.push('');
            this.update();
        });

        this.find('[data-edit]').click(e => {
            this.state.edit = $(e.target).attr('data-edit');
            this.update();
        });

        this.find('[data-sort]').click(e => {
            this.state.items.sort((a,b) => a.localeCompare(b));
            this.update();
        });

        if (this.state.edit != undefined) this.find('input').focus();
    }
}