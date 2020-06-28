class Navbar extends Component{

    tabs = [
        { id: 'abilities', label: 'Abilities' },
        { id: 'advancement', label: 'Advancement' },
        { id: 'bio', label: 'Bio' },
        { id: 'circles', label: 'Circles' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'skills', label: 'Skills' },
        { id: 'traits', label: 'Traits' },
        { id: 'wises', label: 'Wises' }
    ]

    characters = [...new Array(window.localStorage.length)].map((x,i) => window.localStorage.key(i))

    draw() {
        return String.raw`
            <nav id="${this.id}" class="navbar navbar-expand-md navbar-light bg-light">
                <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#${this.id}_nav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div id="${this.id}_nav" class="collapse navbar-collapse">
                    <ul class="navbar-nav mr-auto">
                        ${this.tabs.map((t) => this.drawTab(t)).reduce((a,b) => `${a}${b}`)}
                        <li class="nav-item dropdown">
                            <a href="#" class="nav-link dropdown-toggle" id="${this.id}_characters" data-toggle="dropdown" >Characters</a>
                            <div class="dropdown-menu">
                                ${this.characters.map(x => String.raw`<a href="#" data-character="${x}" class="dropdown-item">${x}</a>`).reduce((a,b) => `${a}${b}`, '')}
                            </div>
                        </li>
                    </ul>
                    <div class="navbar-nav">
                        <a id="${this.id}_saveconfirm" class="nav-item nav-link text-success" hidden="hidden">${this.parent.state.bio.name} saved</a>
                        <div class="nav-item dropdown">
                            <button class="dropdown-toggle btn btn-light border border-dark" id="${this.id}_options" data-toggle="dropdown" >Options</button>
                            <div class="dropdown-menu">
                                <a id="${this.id}_save" href="#" class="dropdown-item">Save</a>
                                <a id="${this.id}_export" href="#" class="dropdown-item">Export</a>
                                <a id="${this.id}_import" href="#" class="dropdown-item">Import</a>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }

    drawTab = (t) => String.raw`
        <a href="#" data-tab="${t.id}" class="nav-item nav-link ${this.state.tab == t.id ? 'active' : ''}">${t.label}</a>
    `;

    initialize() {
        super.initialize();

        $(`#${this.id}_save`).click(e => {
            if(!this.parent.state.bio.name) {
                alert('Cannot save an unnamed character');
                return;
            }

            localStorage.setItem(this.parent.state.bio.name, JSON.stringify(this.parent.state));
            this.update();

            $(`#${this.id}_saveconfirm`).removeAttr('hidden');
        });

        this.find('[data-character]').click(e => {
            this.parent.state = JSON.parse(localStorage.getItem($(e.target).attr('data-character')));
            this.parent.update();
        });

        this.find('[data-tab]').click(e => {
            this.state.tab = $(e.target).attr('data-tab');
            this.parent.update();
        });
    }
}
