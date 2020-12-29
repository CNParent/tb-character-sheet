class Bio extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            ${this.input('Name', 'name')}
                            ${this.input('Stock', 'stock')}
                            ${this.input('Class', 'classValue')}
                            ${this.input('Home', 'home')}
                            ${this.input('Raiment', 'raiment')}
                            ${this.input('Epithet', 'epithet')}
                            ${this.input('Parents', 'parents')}
                            ${this.input('Mentor', 'mentor')}
                            ${this.input("Age", 'age')}
                            ${this.input('Level', 'level')}
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            ${this.textArea('Belief', 'belief')}
                            ${this.textArea('Creed', 'creed')}
                            ${this.textArea('Goal', 'goal')}
                            ${this.textArea('Instinct', 'instinct')}
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    input(label, prop) {
        if(this.state.edit == prop) return String.raw`
            <div class="d-flex mb-1 border-bottom col-lg-3 col-md-4">
                <span class="align-self-center text-right mr-1 py-2 font-weight-bold" style="width: 4.5em; height: 2.5em;">${label}</span>
                <input data-input="${prop}" class="flex-grow-1 form-control" value="${this.state[prop]}">
            </div>
        `;

        return String.raw`
            <div class="d-flex mb-1 border-bottom col-lg-3 col-md-4">
                <span class="align-self-center text-right border-right pr-1 py-2 font-weight-bold" style="width: 4.5em;">${label}</span>
                <button data-edit="${prop}" class="flex-grow-1 btn btn-light text-left">${this.state[prop]}</button>
            </div>
        `;
    }

    textArea(label, prop) {
        if(this.state.edit == prop) return String.raw`
            <div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
                <span class="py-2 border-bottom font-weight-bold">${label}</span>
                <textarea data-input="${prop}" class="flex-grow-1 form-control">${this.state[prop]}</textarea>
            </div>
        `;

        return String.raw`
            <div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
                <span class="py-2 border-bottom font-weight-bold">${label}</span>
                <button data-edit="${prop}" class="btn btn-light text-left align-top wrap" style="min-height: 2.5em;">${this.state[prop]}</button>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-edit]').map(x => x.addEventListener('click', e => {
            this.state.edit = x.dataset.edit;
            this.update();
        }));

        this.find('[data-input]').map(x => x.addEventListener('blur', e => {
            let prop = x.dataset.input;
            this.state[prop] = this.textValue(x.value);
            this.state.edit = false;
            this.update();
        }));

        if(this.state.edit) this.find('[data-input]')[0]?.focus();
    }
}
