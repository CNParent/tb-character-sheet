class InputControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="form-row form-group input-group">
                    <label for="${this.id}_input" class="col-4 col-form-label input-group-text">${this.state.label}:</label>
                    <input id="${this.id}_input" class="form-control col-8" value="${this.state.value}" />
                </div>
            </div>
        `;
    }

    initialize() { 
        let input = $(`#${this.id}_input`);
        input.change((e) => this.state.set(input.val()));
    }
}