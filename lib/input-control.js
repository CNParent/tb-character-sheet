class InputControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="form-row form-group">
                    <label for="${this.id}_input" class="col-4 col-form-label">${this.state.label}</label>
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