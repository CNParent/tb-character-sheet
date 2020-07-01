class Note extends Component {
    draw() {
        if(!this.state.show) return '';

        return String.raw`
            <div id="${this.id}" class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            ${this.drawTitle()}
                            <h5 class="ml-1"><span class="badge badge-light border">${dateUtil.shortDate(this.dateValue())}</span></h5>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawTitle() {
        return String.raw`
            <h4 class="flex-grow-1"><button data-edit="title" class="badge btn btn-light w-100 text-left">${this.state.note.title}</button></h4>
        `;
    }

    dateValue = () => new Date(this.state.note.date);
}