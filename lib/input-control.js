class InputControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="form-row form-group input-group">
                    <div class="input-group-prepend col-4 p-0">
                        <label for="${this.id}_input" class="input-group-text w-100">${this.state.label}</label>
                    </div>
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