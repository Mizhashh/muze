import { VisualUnit } from '@chartshq/visual-unit';
import {
     initializeCacheMaps,
     headerCreator,
     extractUnitConfig,
     setFacetsAndProjections
} from './group-utils';
import {
     ROW, COL, LEFT, RIGHT, COLOR, SIZE, SHAPE, DETAIL, CELL, X_AXES, Y_AXES, ENTRY_CELLS, EXIT_CELLS, INITIALIZED,
     AXIS, UNIT, BEFORE_UPDATE, UPDATED, VALUE_MATRIX, FACET_HEADERS
} from '../enums/constants';
import { createValueCells, computeMatrices } from './cell-creator';
/**
 * Resolves the matrices from configuration provided
 *
 * @export
 * @class MatrixResolver
 */
export default class MatrixResolver {

    /**
     * Creates an instance of MatrixResolver.
     * @param {Object} dependencies needed to run the resolver
     * @memberof MatrixResolver
     */
    constructor (dependencies) {
        this._registry = {};
        this._layerConfig = [];
        this._matrixLayers = [];
        this._dependencies = dependencies;
        this._rowMatrix = [];
        this._columnMatrix = [];
        this._valueMatrix = [];
        this._facets = {};
        this._projections = {};
        this._datamodelTransform = {};
        this._units = [];
        this._cacheMaps = {};
        this._axes = {
            x: {},
            y: {},
            color: [],
            size: [],
            shape: []
        };

        this.cacheMaps(initializeCacheMaps());
    }

    /**
     * Set:  Registers placeholders, Get: return {Object} those placeholders
     *
     * @param {Object} placeholders cells that will construct the group
     * @return {Object} Either current instance or the set of placeholders
     * @memberof MatrixResolver
     */
    registry (...placeholders) {
        if (placeholders.length) {
            Object.entries(placeholders[0]).forEach((val) => {
                this._registry[val[0]] = val[1];
            });
            return this;
        }
        return this._registry;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    dependencies (...dep) {
        if (dep.length) {
            this._dependencies = dep[0];
            return this;
        }
        return this._dependencies;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    units (...unitArr) {
        if (unitArr.length) {
            this._units = unitArr[0];
            return this;
        }
        return this._units;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} layer configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    layerConfig (...config) {
        if (config.length) {
            this._layerConfig = config[0];
            return this;
        }
        return this._layerConfig;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    matrixLayers (...layers) {
        if (layers.length) {
            this._matrixLayers = layers[0];
            return this;
        }
        return this._matrixLayers;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    datamodelTransform (...transform) {
        if (transform.length) {
            this._datamodelTransform = transform[0];
            return this;
        }
        return this._datamodelTransform;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    cacheMaps (...maps) {
        if (maps.length) {
            [CELL, X_AXES, Y_AXES, ENTRY_CELLS, EXIT_CELLS].forEach((e) => {
                this._cacheMaps[`${e}Map`] = maps[0][`${e}Map`] || this._cacheMaps[`${e}Map`];
            });
            return this;
        }
        return this._cacheMaps;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    rowCells (...cells) {
        if (cells.length) {
            this._rowCells = cells[0];
            return this;
        }
        return this._rowCells;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    colCells (...cells) {
        if (cells.length) {
            this._colCells = cells[0];
            return this;
        }
        return this._colCells;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    axes (...axes) {
        if (axes.length) {
            this._axes = Object.assign({}, this._axes, axes[0]);
            return this;
        }
        return this._axes;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    rowMatrix (...rowMat) {
        if (rowMat.length) {
            this._rowMatrix = rowMat[0];
            return this;
        }
        return this._rowMatrix;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    columnMatrix (...colMat) {
        if (colMat.length) {
            this._columnMatrix = colMat[0];
            return this;
        }
        return this._columnMatrix;
    }

    /**
     * Used to set the layer config from outside or get current layer info
     *
     * @param {Object} type configuration of layer provided externally
     * @return {Object} either the layer or current instance
     * @memberof MatrixResolver
     */
    valueMatrix (...valMat) {
        if (valMat.length) {
            this._valueMatrix = valMat[0];
            return this;
        }
        return this._valueMatrix;
    }

    facets (...facets) {
        if (facets.length) {
            Object.entries(facets[0]).forEach((e) => {
                this._facets[e[0]] = e[1];
            });
            return this;
        }
        return this._facets;
    }

    projections (...projections) {
        if (projections.length) {
            Object.entries(projections[0]).forEach((e) => {
                this._projections[e[0]] = e[1];
            });
            return this;
        }
        return this._projections;
    }

    optionalProjections (config, layerConfig) {
        const otherEncodings = {};
        const optionalProjections = [];
        const otherEncodingTypes = [SIZE, COLOR, SHAPE];

        otherEncodingTypes.forEach((type) => {
            if (config[type] && config[type].field) {
                const enc = config[type];
                otherEncodings[type] = enc.field;
                optionalProjections.push(enc.field);
            }
        });

        if (config[DETAIL]) {
            optionalProjections.push(...config.detail);
        }

        if (layerConfig.length) {
            layerConfig.forEach((layer) => {
                if (layer.encoding) {
                    Object.values(layer.encoding).forEach((enc) => {
                        if (enc && optionalProjections.indexOf(enc.field) === -1) {
                            optionalProjections.push(enc.field ? enc.field : enc);
                        }
                    });
                }
            });
        }
        this.projections({ optionalProjections });
        return otherEncodings;
    }

    horizontalAxis (rows, encoder) {
        if (rows) {
            this._horizontalAxis = setFacetsAndProjections(this, { type: ROW, fields: rows }, encoder);
            return this;
        }
        return this._horizontalAxis;
    }

    verticalAxis (columns, encoder) {
        if (columns) {
            this._verticalAxis = setFacetsAndProjections(this, { type: COL, fields: columns }, encoder);
            return this;
        }
        return this._verticalAxis;
    }

    /**
     * Gets the class definition of a particular cell type(if the particular type has been extended, that particular
     * definition is returned)
     *
     * @param {Object} cell cell whose class definition is to be retrieved
     * @return {Object} cell definition
     * @memberof MatrixResolver
     */
    getCellDef (cell) {
        const registry = this.registry();

        Object.values(registry).forEach((e) => {
            if (e.prototype instanceof cell) {
                cell = e;
            }
        });
        return cell;
    }

    /**
     * Return a visual cell creator along with its axis information to be injected to the datamodel creation
     * function
     *
     * @param {Object} context Attached instance
     *
     * @return {Object} Created cell
     *
     * @memberof MatrixResolver
     */
    valueCellsCreator (context) {
        // reset matrix layers
        this.matrixLayers([]);

        return (datamodel, fieldInfo, facets) => createValueCells(context, datamodel, fieldInfo, facets);
    }

    /**
     * Callback to be applied on each cell of a matrix of a particular type
     *
     * @param {string} matrixType type of matrix on which callback is to be applied
     * @param {Function} callback function to be applied to each cell
     *
     * @memberof MatrixResolver
     */
    forEach (matrixType, callback) {
        this[matrixType]().forEach((row, rIndex) => {
            row.forEach((col, cIndex) => {
                callback(rIndex, cIndex, col);
            });
        });
    }

    getAllFields () {
        const retObj = this.projections();

        Object.entries(this.facets()).forEach((e) => {
            retObj[e[0]] = e[1];
        });
        return retObj;
    }

    resetSimpleAxes () {
        return this.axes({
            x: new Set(),
            y: new Set()
        });
    }

    createUnits (componentRegistry, config) {
        const {
            globalConfig,
            alias
        } = config;
        const {
            layerRegistry,
            sideEffectRegistry
        } = componentRegistry;
        const {
            smartlabel: smartLabel,
            lifeCycleManager
        } = this.dependencies();
        // Provide the source for the matrix
        const units = [];
        // Setting unit configuration
        const unitConfig = extractUnitConfig(globalConfig || {});

        this.forEach(VALUE_MATRIX, (i, j, el) => {
            let unit = el.source();
            if (!unit) {
                unit = VisualUnit.create({
                    layerRegistry,
                    sideEffectRegistry
                }, {
                    smartLabel,
                    lifeCycleManager
                });
                el.source(unit);
                units.push(unit);
            }
            unit.parentAlias(alias);
            el.config(unitConfig);
        });

        lifeCycleManager.notify({ client: units, action: INITIALIZED, formalName: UNIT });
        return this.units(units);
    }

    setDomains (config, datamodel, encoders) {
        const {
            color,
            shape,
            size,
            globalConfig
        } = config;
        const groupBy = globalConfig.autoGroupBy;
        const {
            rowFacets,
            colFacets
        } = this.getAllFields();
        const encoding = {
            color,
            shape,
            size
        };
        const facetFields = [...rowFacets.map(e => e.toString()), ...colFacets.map(e => e.toString())];
        const retContext = {
            domains: encoders.simpleEncoder.getRetinalFieldsDomain(datamodel, encoding, facetFields, groupBy),
            axes: this.axes(),
            encoding
        };
        encoders.retinalEncoder.setCommonDomain(retContext);
        return this;
    }

    getRetinalAxes () {
        const {
            color,
            shape,
            size
        } = this.axes();

        return {
            color: [...color],
            shape: [...shape],
            size: [...size]
        };
    }

    getSimpleAxes (type) {
        return this.axes()[`${type}`];
    }

    createRetinalAxes (fieldsConfig, config, encoders) {
        const layerConfig = this.layerConfig();
        this.optionalProjections(config, layerConfig);
        const retinalAxes = encoders.retinalEncoder.createAxis({
            fieldsConfig,
            config,
            axes: this.axes()
        });
        const {
            lifeCycleManager
        } = this.dependencies();

        [COLOR, SHAPE, SIZE].forEach((e) => {
            this.axes()[e] = retinalAxes[e];
        });

        lifeCycleManager.notify({ client: this.axes(), action: INITIALIZED, formalName: AXIS });
        lifeCycleManager.notify({ client: this.units(), action: BEFORE_UPDATE, formalName: UNIT });

        const units = [];
        const matrixLayers = this.matrixLayers();

        this.forEach(VALUE_MATRIX, (i, j, el) => {
            el.axes(retinalAxes);
            el.source() && el.source().retinalFields(config);
            el.layerDef(encoders.retinalEncoder.getLayerConfig(config, matrixLayers[i][j]));
            el.updateModel();

            units.push(el.source());
        });

        lifeCycleManager.notify({ client: units, action: UPDATED, formalName: UNIT });
        return this;
    }

    createHeaders (placeholders, fieldNames) {
        let bottomLeft = [];
        let bottomRight = [];
        const {
            rows,
            columns
        } = placeholders;
        const {
            smartlabel: labelManager,
            lifeCycleManager
        } = this.dependencies();
        const TextCell = this.getCellDef(this.registry().TextCell);
        const BlankCell = this.getCellDef(this.registry().BlankCell);
        const [leftRows, rightRows] = rows;
        const [topCols, bottomCols] = columns;
        const rowHeaders = fieldNames.rows;
        // Headers and footers are created based on the rows. Thereafter, using the column information
        // they are tabularized into the current structure
        const headers = {
            left: headerCreator(leftRows, rowHeaders[0], TextCell, labelManager),
            right: headerCreator(rightRows, rowHeaders[1], TextCell, labelManager)
        };
        const footers = {
            left: leftRows.length > 0 ? leftRows[0].map(() => new BlankCell()) : [],
            right: rightRows.length > 0 ? rightRows[0].map(() => new BlankCell()) : []
        };
        const [topLeft, topRight] = [LEFT, RIGHT].map(type => topCols.map((col, i) => {
            if (i === topCols.length - 1) {
                return headers[type];
            }
            return footers[type];
        }));

        // Creating only bottom matrices if there is no information on the top
        if (topCols.length === 0) {
            [bottomLeft, bottomRight] = [LEFT, RIGHT].map(type => bottomCols.map((col, i) => {
                if (i === 0) {
                    return headers[type];
                }
                return footers[type];
            }));
        } else {
            bottomLeft = bottomCols.map(() => (leftRows.length > 0 ? leftRows[0].map(() => new BlankCell()) : []));
            bottomRight = bottomCols.map(() => (rightRows.length > 0 ? rightRows[0].map(() => new BlankCell()) : []));
        }

        lifeCycleManager.notify({
            client: [topLeft, topRight, bottomLeft, bottomRight],
            action: INITIALIZED,
            formalName: FACET_HEADERS
        });

        return { topLeft, topRight, bottomLeft, bottomRight };
    }

    getMatrices (datamodel, config, componentRegistry, encoders) {
        const context = {
            datamodel,
            componentRegistry,
            encoders,
            resolver: this
        };

        return computeMatrices(context, config);
    }
}
