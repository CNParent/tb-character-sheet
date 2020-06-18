class SelectControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="form-row form-group">
                    <label for="${this.id}_select" class="col-4 col-form-label">${this.state.label}:</label>
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