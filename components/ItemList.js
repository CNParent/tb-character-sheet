class ItemList extends Component {
    draw(){
        return String.raw`
            <div id="${this.id}">
                <div class="d-flex flex-wrap">
                    ${this.state.items.map((x,i) => this.drawItem(x, i)).reduce((a,b) => `${a}${b}`, '')}
                    ${this.drawAdd()}
                </div>
                ${this.drawEditor()}
            </div>
        `;
    }

    drawAdd() {
        if(this.state.edit) return '';

        return String.raw`
            <div class="btn-group m-1">
                <span class="btn badge badge-light border border-dark" data-add="">add</span>
            </div>
        `;
    }

    drawEditor() {
        if(this.state.edit === undefined) return '';

        let text = '';
        if(this.state.edit < this.state.items.length) 
            text = this.state.items[this.state.edit];

        return String.raw`
            <div class="form-row form-group input-group">
                <input id="${this.id}_input" class="form-control" value="${text}" />
                <div class="input-group-append">
                    <button class="btn btn-light border border-dark" data-done="">&check;</button>
                    <button class="btn btn-light border border-dark" data-cancel="">&cross;</button>
                </div>
            </div>
        `;
    }

    drawItem(item, index){
        if(this.state.edit == index) return String.raw`
            <div class="btn-group my-1 mr-1">
                <span class="btn badge badge-light border border-dark">${item}</span>
                <span class="btn badge badge-dark" data-cancel="">&cross;</span>
            </div>
        `;;

        return String.raw`
            <div class="btn-group my-1 mr-1">
                <span class="btn badge badge-dark" data-item="${index}">${item}</span>
                <span class="btn badge badge-light border border-dark" data-index="${index}">&cross;</span>
            </div>
        `;
    }

    initialize() {
        this.find('[data-cancel]').on('click touch', (e) => {
            this.state.edit = undefined;
            this.update();
        });

        this.find('[data-done]').on('click touch', (e) => {
            let value = $(`#${this.id}_input`).val();
            if(this.state.edit < this.state.items.length) this.state.items[this.state.edit] = value;
            else this.state.items.push(value);

            this.state.edit = undefined;
            this.update();
        });

        this.find('[data-index]').on('click touch', (e) => {
            let i = $(e.target).attr('data-index');
            this.state.items.splice(i, 1);
            this.update();
        });

        this.find('[data-item]').on('click touch', (e) => {
            let i = $(e.target).attr('data-item');
            this.state.edit = i;
            this.update();
        });

        this.find('[data-add]').on('click touch', (e) => {
            this.state.edit = this.state.items.length;
            this.update();
        });
    }
}