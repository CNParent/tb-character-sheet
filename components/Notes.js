class Notes extends Component{
    draw(){
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col">
                        <div class="card">
                            <div class="card-body">
                                ${this.drawControls()}
                                <div class="row">
                                    ${this.state.notes
                                        .map((x,i) => this.add(new Note(`${this.id}_notes_${i}`, {
                                            show: true,
                                            collapse: true,
                                            note: x
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
            <div class="d-flex">
                <button id="${this.id}_add" class="btn btn-light border">Add note</button>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.notes.splice(0, 0, {
                title: 'New note',
                date: (new Date()).toISOString(),
                content: ''
            });

            this.update();
        });
    }
}