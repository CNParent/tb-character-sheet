class Navbar extends Component{

    tabs = [
        { id: 'condition', label: 'Condition' },
        { id: 'abilities', label: 'Abilities' },
        { id: 'skills', label: 'Skills' },
        { id: 'traits', label: 'Traits' },
        { id: 'wises', label: 'Wises' },
        { id: 'advancement', label: 'Advancement' },
        { id: 'bio', label: 'Bio' },
        { id: 'circles', label: 'Circles' }
    ]

    draw() {
        return String.raw`
            <nav id="${this.id}" class="navbar navbar-expand-md navbar-light bg-light">
                <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#${this.id}_nav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div id="${this.id}_nav" class="collapse navbar-collapse">
                    <div class="navbar-nav">
                        ${this.tabs.map((t) => this.drawTab(t)).reduce((a,b) => `${a}${b}`)}
                    </div>
                </div>
            </nav>
        `;
    }

    drawTab = (t) => String.raw`
        <a href="#" data-tab="${t.id}" class="nav-item nav-link ${this.state.tab == t.id ? 'active' : ''}">${t.label}</a>
    `;

    initialize() {
        $(`#${this.id} [data-tab]`).click(this.navigate);
    }

    navigate = (e) => {
        this.state.tab = $(e.target).attr('data-tab');
        this.parent.update();
    }
}
