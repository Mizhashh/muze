import Variable from './variable';

export default class SimpleVariable extends Variable {
    constructor (text) {
        super();
        this.oneVar(text);
    }

    oneVar (...oneV) {
        if (oneV.length) {
            this._oneVar = oneV[0];
            return this;
        }
        return this._oneVar;
    }

    data (...dm) {
        if (dm.length) {
            this._data = dm[0];
            return this;
        }
        return this._data;
    }

    toString () {
        return this.oneVar();
    }

    numberFormat () {
        const uid = this.data().getFieldsConfig()[this.oneVar()].index;
        const formatter = this.data().getFieldspace().fields[uid]._ref;

        return this.type() === 'measure' ? formatter.numberFormat() : val => val;
    }

    getMembers () {
        return [this.oneVar()];
    }

    type () {
        const fieldDef = this.data().getFieldsConfig()[this.oneVar()].def;
        return fieldDef.type;
    }

    subtype () {
        const fieldDef = this.data().getFieldsConfig()[this.oneVar()].def;
        return fieldDef.subtype || fieldDef.type;
    }

    getMinDiff () {
        const fieldSpace = this.data().getFieldspace();
        return fieldSpace.fieldsObj()[this.oneVar()].getMinDiff();
    }
}
