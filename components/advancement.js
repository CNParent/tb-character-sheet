class Advancement extends Component {

    levels = [
        { level: 1, fate: 0, persona: 0 },
        { level: 2, fate: 3, persona: 3 },
        { level: 3, fate: 7, persona: 6 },
        { level: 4, fate: 13, persona: 9 },
        { level: 5, fate: 22, persona: 12 },
        { level: 6, fate: 31, persona: 16 },
        { level: 7, fate: 41, persona: 20 },
        { level: 8, fate: 52, persona: 24 },
        { level: 9, fate: 64, persona: 28 },
        { level: 10, fate: 77, persona: 32 }
    ]

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            ${this.input('Fate (current)', 'currentFate')}
                            ${this.input('Fate (spent)', 'spentFate')}
                        </div>
                        <div class="row">
                            ${this.input('Persona (current)', 'currentPersona')}
                            ${this.input('Personal (spent)', 'spentPersona')}
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <table class="table table-striped table-hover table-sm">
                            <thead>
                                <tr>
                                    <th>Level</th>
                                    <th>Fate</th>
                                    <th>Persona</th>
                                    <th class="col">Level Title and Benefit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.levels.map(this.row).reduce((a,b) => `${a}${b}`, '')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    row = (level, index) => {
        let value = this.state.levels.length > index ? this.state.levels[index] : '';
        return String.raw`
            <tr>
                <td>${level.level}</td>
                <td>${level.fate}</td>
                <td>${level.persona}</td>
                <td><input class="form-control" id="${this.id}_levels_${index}" value="${value}" /></td>
            </tr>
        `;
    }

    initialize() {
        super.initialize();
        $(`${this.id} td input`).change((e) => {
            let i = Number(e.target.id.split('_')[2]);
            this.state.levels[i] = $(e.target).val();
        });
    }
}