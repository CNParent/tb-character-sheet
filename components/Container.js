class Container extends Component {
    draw() {
        return String.raw`
            <div class="col-lg-4 col-md-6 my-1">
                <div class="card">
                    <div class="card-header p-2">
                        <h5 class="m-0"><span class="card-title">${this.state.name}</span></h5>
                    </div>
                    <div class="card-body">
                    </div>
                </div>
            </div>
        `;
    }
}