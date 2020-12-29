class Notes extends Component{
    draw(){
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col">
                        <div class="card">
                            <div class="card-body">
                                ${this.drawControls()}
                                <div class="row mt-2">
                                    ${this.state.notes
                                        .map((x,i) => this.add(new Note(`${this.id}_notes_${i}`, {
                                            show: this.showNote(x),
                                            collapse: true,
                                            note: x,
                                            remove: () => this.state.notes.splice(i, 1)
                                        }))).reduce((a,b) => `${a}${b}`, '')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawControls() {
        return String.raw`
            <button id="${this.id}_add" class="btn btn-light border">Add note</button>
            <div class="d-flex">
                <input id="${this.id}_filter" class="form-control" placeholder="filter" value="${this.state.filter}">
            </div>
        `;
    }

    showNote(note) {
        if(!this.state.filter) return true;

        return note.title.toLowerCase().indexOf(this.state.filter) != -1
            || note.content.toLowerCase().indexOf(this.state.filter) != -1;
    }

    initialize() {
        super.initialize();

        _(`#${this.id}_add`)[0].onclick = e => {
            this.state.notes.splice(0, 0, {
                title: 'New note',
                date: (new Date()).toISOString(),
                content: 'Enter your notes here'
            });

            this.update();
        };

        _(`#${this.id}_filter`)[0].onchange = e => {
            this.state.filter = this.textValue(e.target.value.toLowerCase());
            this.update();
        };
    }
}