class Inventory extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.map((x, i) => this.add(new Container(`${this.id}_container_${i}`, x))).reduce((a,b) => `${a}${b}`, '')}
                </div> 
            <div>
        `;
    }
}