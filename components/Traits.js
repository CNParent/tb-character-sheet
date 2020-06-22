class Traits extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid row">
                <div class="row">
                    ${this.state.map((x,i) => this.add(new Trait(`traits_${i}`, x))).reduce((a,b) => `${a}${b}`, '')}
                </div>
            </div>
        `;
    }
}