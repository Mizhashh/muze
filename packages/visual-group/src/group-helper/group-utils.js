import { Store, dataSelect, FieldType } from 'muze-utils';
import { DATA_UPDATE_COUNTER } from '../enums/defaults';
import { Variable } from '../variable';
import { PolarEncoder, CartesianEncoder } from '../encoder';
import {
    DIMENSION,
    MEASURE,
    ORDINAL,
    LINEAR,
    ROW,
    COLUMN,
    COL,
    LEFT,
    RIGHT,
    TOP,
    BOTTOM,
    COLOR,
    SIZE,
    TEMPORAL,
    SHAPE,
    INTERACTION,
    GRID_LINES,
    GRID_BANDS,
    HEADER,
    FACET,
    X,
    Y,
    POLAR
} from '../enums/constants';

/**
 * Creates an instance of a store which contains the arguments to make the class reactive
 *
 * @return {Object} instance of store
 * @memberof VisualGroup
 */
export const initStore = () => new Store({
    [DATA_UPDATE_COUNTER]: DATA_UPDATE_COUNTER
});

export const isDistributionEqual = arr => [...arr[0], ...arr[1]].reduce((isEqual, row) => {
    const rowType = row.type();

    if (rowType === MEASURE || rowType === TEMPORAL) {
        isEqual = true;
    }
    return isEqual;
}, false);

export const initializeCacheMaps = () => ({
    cellMap: new Map(),
    xAxesMap: new Map(),
    yAxesMap: new Map(),
    entryCellMap: new Map(),
    exitCellMap: new Map()
});

export const getAxisKey = (axisName, id, scaleType) => `${axisName}-axis-${id}-${scaleType}`;

export const getCellKey = (rowId, columnId) => `cell-${rowId}-${columnId}`;

export const extractUnitConfig = (config) => {
    const unitConfig = {};
    const attrNames = [INTERACTION, GRID_LINES, GRID_BANDS];

    attrNames.forEach((attr) => {
        if (config[attr] !== undefined) {
            unitConfig[attr] = config[attr];
        }
    });
    return unitConfig;
};

export const getHeaderText = (headers, index, rowLength) => {
    let header = '';

    if (index === rowLength - 1 && headers.length > rowLength) {
        for (let i = index; i < headers.length - 1; i++) {
            header += `${headers[i].toString()} / `;
        }
        header += headers[headers.length - 1].toString();
        return header;
    } else if (headers[index]) {
        return headers[index].toString();
    }
    return '';
};

export const headerCreator = (fields, fieldHeaders, TextCell, labelManager) => {
    const headers = fields.length > 0 ? fields[0].map((label, i) => new TextCell({ type: HEADER }, { labelManager })
                    .source(getHeaderText(fieldHeaders, i, fields[0].length))) : [];
    return headers;
};

export const findInGroup = (variable, allFields) => {
    let channel = null;

    [COLOR, SIZE, SHAPE].forEach((e) => {
        if (this.store.get(e) && variable === this.store.get(e)[0]) {
            channel = e;
        }
    });

    if (channel) {
        return { channel };
    }
    [ROW, COL].forEach((facetType) => {
        allFields[`${facetType}Facets`].forEach((e) => {
            if (e.toString() === variable) {
                channel = { channel: FACET, type: facetType === COL ? COLUMN : ROW };
            }
        });
    });

    if (channel) {
        return channel;
    }

    [ROW, COL].forEach((projType) => {
        allFields[`${projType}Projections`].forEach((e) => {
            e.forEach((m) => {
                if (m.toString() === variable) {
                    channel = projType === COL ? X : Y;
                }
            });
        });
    });

    if (channel) {
        return { channel };
    }
    return null;
};

export const getAxisType = (fieldsConfig, field) => {
    let fieldType = ORDINAL;

    if (field && fieldsConfig[field].def.type !== DIMENSION) {
        fieldType = LINEAR;
    }
    return fieldType;
};

export const retriveDomainFromData = (datamodel, fieldName) => {
    const field = datamodel.getFieldspace().fields.find(d => d._ref.name === fieldName.toString());
    return field.domain();
};

export const mutateAxesFromMap = (cacheMaps, axes) => {
    let xAxes = null;
    let yAxes = null;
    const {
        xAxesMap,
        yAxesMap
    } = cacheMaps;
    const {
        x: xAxisSet,
        y: yAxisSet
    } = axes;

    xAxisSet && xAxisSet.forEach((axisId) => {
        const xAxis = xAxesMap.get(axisId);
        xAxes = xAxes || [];
        xAxes.push(xAxis);
    });

    yAxisSet && yAxisSet.forEach((axisId) => {
        const yAxis = yAxesMap.get(axisId);
        yAxes = yAxes || [];
        yAxes.push(yAxis);
    });

    return {
        xAxes, yAxes
    };
};

export const getEncoder = (layers) => {
    let encoder = new CartesianEncoder();

    if (layers) {
        // Figuring out the kind of layers the group will have
        encoder = layers.every(e => e.mark === 'arc') ? new PolarEncoder() : encoder;
    }
    return encoder;
};

export const getHeaderAxisFrom = (type, fields, userAxisFromConfig) => {
    let axisFrom = userAxisFromConfig[type];
    let headerFrom = '';
    const options = type === ROW ? [LEFT, RIGHT] : [BOTTOM, TOP];
    const [firstField, secondField] = fields;
    const firstFieldType = i => (firstField.length ? firstField[i].type() : null);
    const secondFieldType = i => (secondField.length ? secondField[i].type() : null);

    if (firstFieldType(firstField.length - 1) === DIMENSION && secondFieldType(0) === DIMENSION) {
        headerFrom = axisFrom ? options[1 - options.indexOf(axisFrom)] : options[1];

        if (type === COLUMN && (firstField[firstField.length - 1].toString() === secondField[0].toString())) {
            axisFrom = TOP;
        } else {
            axisFrom = axisFrom || options[0];
        }
    } else if (secondFieldType(secondField.length - 1) === DIMENSION) {
        headerFrom = type === ROW ? RIGHT : BOTTOM;
        axisFrom = type === ROW ? RIGHT : BOTTOM;
    } else {
        headerFrom = type === ROW ? LEFT : TOP;
        axisFrom = type === ROW ? LEFT : TOP;
    }
    if (firstFieldType(firstField.length - 1) === MEASURE && secondFieldType(0) === MEASURE) {
        axisFrom = type === ROW ? LEFT : TOP;
    } else if (secondFieldType(0) === MEASURE) {
        axisFrom = type === ROW ? RIGHT : BOTTOM;
    } else if (firstFieldType(firstField.length - 1) === MEASURE) {
        axisFrom = type === ROW ? LEFT : TOP;
    }
    return [headerFrom, axisFrom];
};

export const setFacetsAndProjections = (context, fieldInfo, encoder) => {
    const {
        fields,
        type
    } = fieldInfo;
    const { facets, projections } = encoder.simpleEncoder.getFacetsAndProjections(fields, type);

    context.facets({ [`${type}Facets`]: facets });
    context.projections({ [`${type}Projections`]: projections });

    return { facets, projections, fields };
};

/**
 * Creates a selection set from a data set with corresponding attributes
 *
 * @param {Selection} sel contains previous selection.
 * @param {Object} appendObj Object to be appended.
 * @param {Array} data Data based on which the selection is entered/updated/removed.
 * @param {Function} idFn Unique identifier method.
 *
 * @return {Selection} Merged selection
 */
export const createSelection = (sel, appendObj, data, idFn) => {
    let selection = sel || dataSelect([]);

    selection = selection.data(data, idFn);

    const enter = selection.enter().append(appendObj);
    const mergedSelection = enter.merge(selection);

    selection.exit() && selection.exit().remove();
    return mergedSelection;
};

const getRowBorders = (left, right) => {
    const borders = {};
    borders.top = false;
    borders.bottom = false;
    if (left.length > 1 || right.length > 1) {
        borders.top = true;
        borders.bottom = true;
    }
    return borders;
};

const getColumnsBorders = (top, bottom) => {
    const borders = {};
    borders.left = false;
    borders.right = false;
    if (top.length || bottom.length) {
        if ((top[0] && top[0].length > 1) || (bottom[0] && bottom[0].length > 1)) {
            borders.left = true;
            borders.right = true;
        }
    }
    return borders;
};

const getValueBorders = (rows, columns) => {
    const borders = { top: true, left: true, bottom: true, right: true };
    const borderTypeRow = [LEFT, RIGHT];
    const borderTypeCol = [TOP, BOTTOM];
    rows.forEach((e, i) => {
        if (e[0] && e[0].length) {
            borders[borderTypeRow[i]] = true;
        } else {
            borders[borderTypeRow[i]] = false;
        }
    });
    columns.forEach((e, i) => {
        if (e.length) {
            borders[borderTypeCol[i]] = true;
        } else {
            borders[borderTypeCol[i]] = false;
        }
    });

    return borders;
};

export const getBorders = (matrices, encoder) => {
    let showRowBorders = { top: false, bottom: false };
    let showColBorders = { left: false, right: false };
    let showValueBorders = { top: false, bottom: false, left: false, right: false };
    const {
        rows,
        columns,
        values: valueMatrix
    } = matrices;
    const [leftRows, rightRows] = rows;
    const [topColumns, bottomColumns] = columns;
    const {
        rowDimensions,
        columnDimensions,
        rowTemporalFields,
        columnTemporalFields,
        columnMeasures,
        rowMeasures
    } = encoder.fieldInfo();
    const allDimensionLength = rowDimensions.length + columnDimensions.length;
    const allMeasuresLength = rowMeasures.length + columnMeasures.length;
    const allTemporalFieldsLength = rowTemporalFields.length + columnTemporalFields.length;

    if (encoder.constructor.type() === POLAR) {
        if (!allDimensionLength) {
            return { showRowBorders, showColBorders, showValueBorders };
        }
    } else if (!allMeasuresLength && !allTemporalFieldsLength && allDimensionLength <= 2) {
        return { showRowBorders, showColBorders, showValueBorders };
    }

    showRowBorders = getRowBorders(leftRows, rightRows);
    showColBorders = getColumnsBorders(topColumns, bottomColumns);
    showValueBorders = getValueBorders([leftRows, rightRows], [topColumns, bottomColumns]);

    if (valueMatrix.length > 1) {
        showValueBorders.top = true;
        showValueBorders.bottom = true;
    }
    if (valueMatrix.length && valueMatrix[0].length > 1) {
        showValueBorders.left = true;
        showValueBorders.right = true;
    }
    return { showRowBorders, showColBorders, showValueBorders };
};

export const getFieldsFromSuppliedLayers = (suppliedLayerConfig, fieldsConfig) => {
    let fields = [];
    const encodingArr = suppliedLayerConfig.map((conf) => {
        if (conf.def instanceof Array) {
            return conf.def.map(def => def.encoding);
        }
        return conf.def.encoding || {};
    });
    fields = [...fields, [].concat(...encodingArr.map(enc => Object.values(enc).map(d => d.field)))];
    fields = fields.filter(field => fieldsConfig[field] && fieldsConfig[field].def.type === FieldType.DIMENSION);
    return fields;
};

export const extractFields = (facetsAndProjections, layerFields) => {
    const fields = Object.values(facetsAndProjections).map((arr) => {
        const flattenArray = [].concat(...arr);
        return [].concat(...flattenArray.map((field) => {
            if (field instanceof Variable) {
                return field.getMembers();
            }
            return field;
        }));
    });
    return [].concat(...fields, ...layerFields);
};
