class TextAreaControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="col">
                <div class="form-row form-group input-group">
                    <label for="${this.id}_textarea" class="col-4 col-form-label input-group-text">${this.state.label}</label>
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