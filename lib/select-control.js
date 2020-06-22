class SelectControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="form-row form-group input-group">
                    <div class="input-group-prepend col-4 p-0">
                        <label for="${this.id}_select" class="input-group-text w-100">${this.state.label}</label>
                    </div>
                    <select id="${this.id}_select" name="${this.id}" class="form-control col-8">
                        ${this.state.options.map((o) => `<option ${this.state.value == o ? 'selected' : ''} value="${o}">${o}</option>`).reduce((a,b) => `${a}${b}`)}
                    </select>
                </div>
            </div>
        `;
    }

    initialize() {
        let select = $(`#${this.id}_select`);
        select.change(() => this.state.set(select.val()));
    }
} 