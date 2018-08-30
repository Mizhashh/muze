import { ERROR_MSG, mergeRecursive } from 'muze-utils';
import { transformFields } from './field-sanitizer';
import { getHeaderAxisFrom } from '../group-helper/group-utils';
import { ROW, COLUMN } from '../enums/constants';

export default class VisualEncoder {
    createAxis () {
        throw new Error(ERROR_MSG.INTERFACE_IMPL);
    }

    setCommonDomain () {
        throw new Error(ERROR_MSG.INTERFACE_IMPL);
    }

    getLayerConfig () {
        throw new Error(ERROR_MSG.INTERFACE_IMPL);
    }

    fieldInfo (...info) {
        if (info.length) {
            this._fieldInfo = mergeRecursive(this._fieldInfo || {}, info[0]);
            return this;
        }
        return this._fieldInfo;
    }

    fieldSanitizer (datamodel, config) {
        this.fieldInfo(transformFields(datamodel, config));
        return this.fieldInfo();
    }

    axisFrom (...params) {
        if (params.length) {
            this._axisFrom = params[0];
            return this;
        }
        return this._axisFrom;
    }

    headerFrom (...params) {
        if (params.length) {
            this._headerFrom = params[0];
            return this;
        }
        return this.__headerFrom;
    }

    setAxisAndHeaders (axisFrom = {}, fields) {
        const [rowHeader, rowAxis] = getHeaderAxisFrom(ROW, fields.rows, axisFrom);
        const [colHeader, colAxis] = getHeaderAxisFrom(COLUMN, fields.columns, axisFrom);

        this.axisFrom({
            row: rowAxis,
            column: colAxis
        });
        this.headerFrom({
            row: rowHeader,
            column: colHeader
        });
        return this;
    }
}
