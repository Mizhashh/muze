import Variable from './variable';

class ComposedVars extends Variable {
    constructor (...texts) {
        super(...texts);
        this.vars(texts);
    }

    vars (...params) {
        if (params.length) {
            this._vars = params[0];
            return this;
        }
        return this._vars;
    }

    data (...dm) {
        if (dm.length) {
            this.vars().forEach(d => d.data(dm[0]));
            return this;
        }
        return this._data;
    }

    getMembers () {
        const vars = this.vars();
        return vars.map(member => member.getMembers()[0]);
    }

    type () {
        return this.vars()[0].type();
    }

    toString () {
        return this.vars().map(d => d.toString()).join(',');
    }

    numberFormat () {
        return this.vars()[0].numberFormat();
    }

    subtype () {
        return this.vars()[0].subtype();
    }

    getMinDiff () {
        return this.vars()[0].getMinDiff();
    }
}

export default ComposedVars;
