class Container extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="col-lg-4 col-md-6 my-1">
                <div class="card">
                    <div class="card-header p-2 d-flex">
                        <h5 class="m-0"><span class="card-title mb-0">${this.state.container.name}</span></h5>
                        <div class="btn-group ml-auto">
                            ${this.drawAdd()}
                            <span class="${this.smallButton()}">a &rarr; z</span>
                        </div>
                        <span class="badge badge-dark ml-1 align-self-center">${this.state.container.items.reduce((a,b) => a.size + b.size, 0)} / ${this.state.container.size}</span>
                    </div>
                    <div class="card-body">
                        ${this.drawContents()}
                    </div>
                </div>
            </div>
        `;
    }

    drawAdd() {
        if(this.isFull()) return '';

        return String.raw`<span id="${this.id}_add" class="${this.smallButton()}">add item</span>`;
    }

    drawContents() {
        return String.raw`
            <div class="d-flex flex-column">
                
            </div>
        `;
    }

    drawEdit() {
        if(this.state.edit == undefined) return '';

        return '';
    }

    smallButton = () => 'badge btn btn-light border border-dark align-self-center';

    isFull = () => this.state.container.items.reduce((a,b) => a.size + b.size, 0) == this.state.size;
}