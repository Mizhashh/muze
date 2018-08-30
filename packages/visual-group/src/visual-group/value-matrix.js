class ValueMatrix {
    constructor (matrixArr) {
        const instancesById = {};

        this.matrix(matrixArr);
        this.filter(() => true);

        this.each((el) => {
            const cellValue = el.valueOf();
            if (cellValue && cellValue.id) {
                const id = cellValue.id();
                instancesById[id] = cellValue;
            }
        });

        this.instancesById(instancesById);
    }

    instancesById (...id) {
        if (id.length) {
            this._instancesById = id[0];
            return this;
        }
        return this._instancesById;
    }

    matrix (...matrix) {
        if (matrix.length) {
            this._matrix = matrix[0];
            return this;
        }
        return this._matrix;
    }

    filter (...fn) {
        if (fn.length) {
            this._filterFn = fn[0];
            return this;
        }
        return this._filterFn;
    }

    width () {
        let rowWidth = 0;

        this.matrix().forEach((row) => {
            let currentRowWidth = 0;
            row.forEach((cell) => {
                currentRowWidth += cell.getLogicalSpace().width;
            });
            rowWidth = Math.max(rowWidth, currentRowWidth);
        });
        return rowWidth;
    }

    height () {
        let rowHeight = 0;

        this.matrix().forEach((row) => {
            let currentRowHeight = 0;
            row.forEach((cell) => {
                currentRowHeight = Math.max(currentRowHeight, cell.getLogicalSpace().height);
            });
            rowHeight += currentRowHeight;
        });
        return rowHeight;
    }

    each (fn) {
        const matrix = this.matrix();
        const filterFn = this.filter();

        matrix.forEach((row, rIndex) => {
            row.forEach((col, cIndex) => {
                if (filterFn(col)) {
                    fn(col, rIndex, cIndex, matrix);
                }
            });
        });
        return this;
    }

    findPlaceHolderById (id) {
        return this.instancesById()[id];
    }

    getMatrixArray () {
        return this.matrix();
    }
}

export default ValueMatrix;
