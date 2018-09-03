import { makeElement } from 'muze-utils';

import GenericSideEffect from './generic';

/**
 * This is a class which must be inherited by any side effect which needs to add a new element on interaction. This
 * class has the definition of common functionalities required by all spawnable side effects like -
 * - Creating a new dom element.
 * - Getting the drawing information.
 *
 * @class
 * @extends GenericSideEffect
 * @public
 * @namespace Muze
 */
export default class SpawnableSideEffect extends GenericSideEffect {
    createElement (container, elemType, data, className, callbacks) {
        return makeElement(container, elemType, data, className, callbacks);
    }

    /**
     * Returns the drawing information for creating an element.
     *
     * @public
     *
     * @return {Object} Drawing information.
     *  ```
     *      {
     *          sideEffectGroup:  // Container element where the side effect element needs to be created.
     *          width: // Width of the container
     *          height: // Height of the container
     *          htmlContainer: // parent html container of the svg container.
     *          svgContainer: // svg container of the visual unit.
     *          parentContainer: // Parent layout container of all the visual units.
     *     }
     */
    drawingContext (...drawingContext) {
        if (drawingContext.length) {
            this._drawingContext = drawingContext[0];
            return this;
        }
        return this._drawingContext();
    }

    show () {
        return this;
    }

    hide () {
        return this;
    }
}
