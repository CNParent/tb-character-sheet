class App extends Component {
    draw = () => String.raw`
        <div id="${this.id}">
            ${this.add(new Navbar('navbar'))}
            ${this.drawContent()}
        </div>
    `;

    drawContent = () => {
        if (this.state.navbar.tab == 'abilities') return this.add(new Abilities('abilities'))
        if (this.state.navbar.tab == 'advancement') return this.add(new Advancement('advancement'))
        if (this.state.navbar.tab == 'bio') return this.add(new Bio('bio'));
    }
}