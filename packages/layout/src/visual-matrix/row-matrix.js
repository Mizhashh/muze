import { mergeRecursive } from 'muze-utils';
import {
    extraCellsRemover,
    combineMatrices,
    spaceTakenByColumn,
    getDistributedHeight,
    computeLogicalSpace,
    createMatrixEachLevel
  } from '../utils';
import { ROW_ROOT } from '../enums/constants';
import VisualMatrix from './visual-matrix';

/**
 * This class used to create column / row matrix for GridLayout
 *
 * @class VisualMatrix
 */
export default class RowVisualMatrix extends VisualMatrix {

    /**
     *Creates an instance of VisualMatrix.
     * @param {any} matrix Two set of matrices
     * @param {any} [config={}] Configuration for VisualMatrix
     * @memberof VisualMatrix
     */
    constructor (matrix, config = {}) {
        super(matrix, config);

        this._breakPointer = (matrix[0].length > 0 ? matrix[0][0].length : 0);
        this._layoutMatrix = combineMatrices([matrix[0] || [], matrix[1] || []], this.config());

        // Create Tree
        this._tree = {
            key: ROW_ROOT,
            values: this.createTree()
        };
        this._logicalSpace = this.setLogicalSpace();
    }

    /**
     * Computes the logical space taken by the entire matrixTree
     *
     * @return {Object} Logical space taken
     * @memberof VisualMatrix
     */
    setLogicalSpace () {
        const matrixTree = this.tree();
        createMatrixEachLevel(matrixTree, false);
        return computeLogicalSpace(matrixTree, this.config(), this.maxMeasures());
    }

    computeViewableSpaces (measures) {
        const {
            maxHeights,
            maxWidths,
            height
        } = measures;
        return this.viewableMatrix.map((matrixInst, i) => {
            const cellDimOptions = { matrixInst, maxWidths, maxHeights, matrixIndex: i };
            const { widths, rowHeights, columnWidths } = this.getCellDimensions(cellDimOptions);
            const heightMeasures = [height, height];
            const columnMeasures = widths;

            return {
                rowHeights: {
                    primary: rowHeights[0],
                    secondary: rowHeights[1]
                },
                columnWidths: {
                    primary: columnWidths[0],
                    secondary: columnWidths[1]
                },
                height: {
                    primary: heightMeasures[0],
                    secondary: heightMeasures[1]
                },
                width: {
                    primary: columnMeasures[0],
                    secondary: columnMeasures[1]
                }
            };
        });
    }

    /**
     *
     *
     * @return
     * @memberof VisualMatrix
     */
    removeExtraCells () {
        const {
            isTransposed,
            extraCellLengths
        } = this.config();
        const matrix = this._layoutMatrix;
        const tree = mergeRecursive({}, this.tree());
        const begCellLen = extraCellLengths[0];
        const endCellLen = extraCellLengths[1] || Number.NEGATIVE_INFINITY;
        const layoutMatrix = !isTransposed ? extraCellsRemover(matrix, begCellLen, endCellLen) :
        matrix.slice(0).map(e => extraCellsRemover(e, begCellLen, endCellLen));

        tree.values = extraCellsRemover(tree.values, begCellLen, endCellLen);
        tree.matrix = extraCellsRemover(tree.matrix, begCellLen, endCellLen);

        return {
            tree,
            layoutMatrix
        };
    }

    getPriorityDistribution (matrix, availableWidth, maxWidths, currentWidth) {
        const priority = this.config().priority;
        const primaryMatrixLength = this.primaryMatrix().length ? this.primaryMatrix()[0].length : 0;
        const matrixLen = matrix[0].length;
        const dist = [];
        let remainaingAvailWidth = availableWidth;
        let remainaingWidth = currentWidth;
        let conditions = [];
        let divider = 2;

        if (priority === 2) {
            conditions = [primaryMatrixLength - 1, primaryMatrixLength];
            divider = Math.min(3, matrixLen);
        } else {
            conditions = priority === 0 ? [primaryMatrixLength - 1] : [primaryMatrixLength];
            divider = Math.min(2, matrixLen);
        }
        conditions.forEach((i) => {
            dist[i] = Math.min(maxWidths[i], availableWidth / divider);
            remainaingAvailWidth = availableWidth - dist[i];
            remainaingWidth = currentWidth - dist[i];
        });
        matrix[0].forEach((e, i) => {
            if (conditions.indexOf(i) === -1) {
                dist[i] = remainaingAvailWidth * (maxWidths[i] / remainaingWidth);
            }
        });
        return dist;
    }

    /**
     * Distibutes the given space row wisely
     *
     * @param {Object} options Redistribution information
     * @memberof VisualMatrix
     */
    redistributeViewSpaces (options) {
        let cWidths = [];
        let rHeights = [];
        let mHeight = 0;
        const maxMeasures = this.maxMeasures();
        const {
            isDistributionEqual,
            distribution,
            isTransposed,
            gutter
        } = this.config();
        const { matrix, width, height, maxHeights, maxWidths } = options;
        mHeight = spaceTakenByColumn(matrix, this._lastLevelKey).height;
        const maxWidth = maxMeasures.reduce((t, n) => {
            t += n;
            return t;
        });

        if (maxWidth > 0) {
            cWidths = this.getPriorityDistribution(matrix, width, maxMeasures, maxWidth);
        } else {
            cWidths = maxMeasures.map(() => 0);
        }
        rHeights = getDistributedHeight({
            matrix,
            cIdx: this._lastLevelKey,
            height: mHeight,
            availableHeight: height,
            isDistributionEqual,
            distribution,
            isTransposed,
            gutter
        });
        maxWidths.push(cWidths);
        maxHeights.push(rHeights);
        return { maxWidths, maxHeights };
    }

    /**
     * Dispatch the calculated cell dimensions to all the cells
     *
     * @param {Object} options cell dimension information
     * @return {Object} row and column heights / widths
     * @memberof VisualMatrix
     */
    getCellDimensions (options) {
        const {
            unitMeasures: measures
        } = this.config();
        const borderWidth = measures.border;
        const { matrixInst, maxWidths, maxHeights, matrixIndex } = options;
        const matrix = matrixInst.matrix;
        const rowHeights = [[0], [0]];
        const columnWidths = [[0], [0]];
        const heights = [0, 0];
        const widths = [0, 0];
        const breakPointer = this._breakPointer;

        matrix.forEach((row, rIdx) => {
            row.forEach((cell, cIdx) => {
                const colHeight = maxHeights[matrixIndex][rIdx] || 0;
                const colWidth = maxWidths[matrixIndex][cIdx];

                cell.setAvailableSpace(colWidth, colHeight - borderWidth);

                if (rIdx === 0 && cIdx < breakPointer) {
                    columnWidths[0][cIdx] = colWidth;
                    widths[0] = (widths[0] || 0) + colWidth;
                } else if (rIdx === 0 && cIdx >= breakPointer) {
                    columnWidths[1][cIdx - breakPointer] = colWidth;
                    widths[1] = (widths[1] || 0) + colWidth;
                }
                if (cIdx === this._lastLevelKey) {
                    rowHeights[0][rIdx] = colHeight;
                    rowHeights[1][rIdx] = colHeight;
                }
            });
        });
        return {
            heights,
            widths,
            rowHeights,
            columnWidths
        };
    }
}

