class TextAreaControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="col">
                <div class="form-row form-group input-group">
                    <div class="input-group-prepend col-4 p-0">
                        <label for="${this.id}_textarea" class="input-group-text w-100">${this.state.label}</label>
                    </div>
                    <textarea id="${this.id}_textarea" name="${this.id}" class="form-control col-8">${this.state.value}</textarea>
                </div>
            </div>
        `;
    }

    initialize() {
        let textarea = $(`#${this.id}_textarea`);
        textarea.change(() => this.state.set(textarea.val()));
    }
} 