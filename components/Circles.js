class Circles extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col-md-6">
                        ${this.add(new Circle('friends', { items: this.state.friends, title: 'Friends' }))}
                    </div>
                    <div class="col-md-6">
                        ${this.add(new Circle('enemies', { items: this.state.enemies, title: 'Enemies' }))}
                    </div>
                </div>
            </div>
        `;
    }
}