import { Factory, internal } from '@chialab/synapse';

export class Session extends Factory {
    initialize(...args) {
        return super.initialize(...args)
            .then(() =>
                this.getUser()
                    .catch(() => {
                        this.factory('api').logout();
                        return Promise.resolve();
                    })
            );
    }

    getUser() {
        if (this.user) {
            return Promise.resolve(this.user);
        }
        if (!this.factory('api').token) {
            return Promise.reject();
        }
        if (!internal(this).userPromise) {
            const Collection = this.factory('registry').getCollection('users');
            internal(this).userPromise = this.initClass(Collection)
                .then((table) =>
                    this.factory('api').me()
                        .then((res) =>
                            table.model()
                                .then((model) => 
                                    model.setFromResponse(res.data)
                                        .then(() => {
                                            this.user = model;
                                            internal(this).userPromise = null;
                                            return Promise.resolve(model);
                                        })
                                )
                        )
                );
        }
        return internal(this).userPromise;
    }

    isLogged() {
        return !!this.user;
    }

    login(username, password) {
        const apiFactory = this.factory('api');
        return apiFactory.auth(username, password)
            .then((res) =>
                this.onLoginResponse(res)
            );
    }

    onLoginResponse(res) {
        if (res.meta) {
            const Collection = this.factory('registry').getCollection('users');
            return this.initClass(Collection)
                .then((table) =>
                    table.model()
                        .then((model) =>
                            model.setFromResponse(res.data)
                                .then(() => {
                                    this.user = model;
                                    this.trigger('login', this.user);
                                    return Promise.resolve(model);
                                })
                        )
                );
        }
        return Promise.reject();
    }

    logout() {
        this.user = null;
        localStorage.removeItem('user.id');
        const apiFactory = this.factory('api');
        apiFactory.logout();
        this.trigger('logout');
    }

    renew() {
        const apiFactory = this.factory('api');
        return apiFactory.renew()
            .then((res) =>
                this.onLoginResponse(res, this.user.id)
            );
    }
}
