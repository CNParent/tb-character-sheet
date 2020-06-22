class Traits extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.map((x,i) => this.add(new Trait(`traits_${i}`, { trait: x, edit: false }))).reduce((a,b) => `${a}${b}`, '')}
                </div>
            </div>
        `;
    }
}