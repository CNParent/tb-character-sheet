class TextAreaControl extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="col">
                <div class="form-row form-group">
                    <label for="${this.id}_textarea">${this.state.label}</label>
                    <textarea id="${this.id}_textarea" name="${this.id}" class="form-control">${this.state.value}</textarea>
                </div>
            </div>
        `;
    }

    initialize() {
        let textarea = $(`#${this.id}_textarea`);
        textarea.change(() => this.state.set(textarea.val()));
    }
} 