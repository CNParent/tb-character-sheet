class TagList extends Component {
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
        if(this.state.edit != undefined) return '';

        return String.raw`
            <button class="btn badge badge-light border border-dark p-2 m-1" data-add="">add</button>
        `;
    }

    drawEditor() {
        if(this.state.edit === undefined) return '';

        let text = '';
        if(this.state.edit < this.state.items.length) 
            text = this.state.items[this.state.edit];

        return String.raw`
            <input id="${this.id}_input" class="form-control" value="${text}" />
        `;
    }

    drawItem(item, index){
        if(this.state.edit == index) return String.raw`
            <span class="btn badge badge-light border border-dark p-2 my-1 mr-1">${item}</span>
        `;;

        return String.raw`
            <button class="btn badge badge-dark p-2 my-1 mr-1" data-item="${index}">${item}</button>
        `;
    }

    initialize() {
        super.initialize();

        this.find('input').blur(e => {
            this.state.items[this.state.edit] = $(e.target).val();
            if(!this.state.items[this.state.edit])
                this.state.items.splice(this.state.edit, 1);

            this.state.edit = undefined;
            this.update();
        });

        this.find('[data-item]').click((e) => {
            let i = $(e.target).attr('data-item');
            this.state.edit = i;
            this.update();
        });

        this.find('[data-add]').click((e) => {
            this.state.edit = this.state.items.length;
            this.update();
        });

        if(this.state.edit != undefined) this.find('input').focus();
    }
}