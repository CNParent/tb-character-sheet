class Inventory extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.map((x, i) => this.add(new Container(`${this.id}_container_${i}`, { container: x }))).reduce((a,b) => `${a}${b}`, '')}
                    ${this.drawHidden()}
                </div> 
            <div>
        `;
    }

    drawHidden() {
        if(this.state.filter(x => x.hide).length == 0) return '';

        return String.raw`
            <div class="col-lg-3 col-md-4 col-sm-6 my-1">
                <div class="card">
                    <div class="card-header p-2">
                        <h5 class="m-0">Containers</h5>
                    </div>
                    <div class="card-body d-flex flex-column">
                        ${this.state.map((x,i) => this.drawHiddenButton(x, i)).reduce((a,b) => `${a}${b}`, '')}
                    </div>
                </div>
            </div>
        `;
    }

    drawHiddenButton(container, index) {
        if(!container.hide) return '';

        return String.raw`
            <span data-show="${index}" class="btn btn-light">${container.name}</span>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-show]').on('click touch', e => {
            let index = $(e.target).attr('data-show');
            this.state[index].hide = false;
            this.update();
        });
    }
}