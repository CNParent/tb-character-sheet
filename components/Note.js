class Note extends Component {
    draw() {
        if(!this.state.show) return '';
        if(this.state.collapse) return String.raw`
            <div id="${this.id}" class="col-12 d-flex">
                ${this.drawTitle()}
                <button data-collapse="" class="badge btn btn-light border ml-1 p-2">${dateUtil.shortDate(this.dateValue())}</button>
            </div>
        `;

        return String.raw`
            <div id="${this.id}" class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            ${this.drawTitleEditor()}
                            <button data-collapse="" class="badge btn btn-light border ml-1 p-2">hide</button>
                        </div>
                        ${this.drawContent()}
                    </div>
                </div>
            </div>
        `;
    }

    drawContent() {
        if(this.state.edit == 'content') return String.raw`
            <div class="d-flex">
                <textarea class="flex-grow-1 form-control">${this.state.note.content}</textarea>
            </div>
        `;

        return String.raw`
            <div class="d-flex">
                <button data-edit="content" class="btn btn-light text-left align-top wrap w-100 border" style="min-height: 2.5em;">${this.state.note.content}</button>
            </div>
        `;
    }

    drawTitle() {
        let data = this.state.collapse ? 'data-collapse=""' : 'data-edit="title"';
        return String.raw`
            <h4 class="flex-grow-1 m-0"><button ${data} class="badge btn btn-light w-100 text-left" style="min-height: 2.2em;">${this.state.note.title}</button></h4>
        `;
    }

    drawTitleEditor() {
        if(this.state.edit == 'title') return String.raw`
            <input class="form-control" value="${this.state.note.title}">
        `;

        return this.drawTitle();
    }

    dateValue = () => new Date(this.state.note.date);

    initialize() {
        super.initialize();

        this.find('[data-collapse]').click(e => {
            this.state.collapse = !this.state.collapse;
            this.update();
        });

        this.find('[data-edit]').click(e => {
            this.state.edit = $(e.target).data('edit');
            this.update();
        });

        this.find('input').blur(this.completeEdit);
        this.find('textarea').blur(this.completeEdit);

        if(this.state.edit == 'title') this.find('input').focus();
        if(this.state.edit == 'content') this.find('textarea').focus();
    }

    completeEdit = e => {
        this.state.note[this.state.edit] = $(e.target).val();
        if(!this.state.note.title) {
            this.state.remove();
            this.parent.update();
            return;
        }

        this.state.edit = false;
        this.update();
    };
}