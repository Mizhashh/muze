import GenericBehaviour from './generic';
import { getMergedSet } from '../../helper';
import * as SELECTION from '../../enums/selection';

/**
 * Abstract class which only add the current row ids in the selection set and doesn't retain the previous added
 * row ids in the entry set. This type of behaviour is needed when we want interaction on only the row ids which we
 * have selected currently.
 *
 * To create a volatile behaviour we need to extend this class, and give a formal name to the class.
 * ```
 *  class HighlightBehaviour extends VolatileBehaviour {
 *      static formalName () {
 *          return 'highlight';
 *      }
 *  }
 * ```
 *
 * @public
 * @class
 * @extends GenericBehaviour
 * @namespace Muze
 */
export default class VolatileBehaviour extends GenericBehaviour {
    setSelectionSet (addSet, selectionSet) {
        if (addSet === null) {
            selectionSet.reset();
        } else if (addSet.length) {
            // new add set
            const existingAddSet = addSet.filter(d => selectionSet._set[d] === SELECTION.SELECTION_NEW_ENTRY
                    || selectionSet._set[d] === SELECTION.SELECTION_OLD_ENTRY);
            selectionSet.updateExit();
            const { entrySet } = selectionSet.getSets();
            selectionSet.reset(getMergedSet(entrySet));
            selectionSet.add(addSet);
            selectionSet.update(existingAddSet);
        } else {
            selectionSet.remove(selectionSet.getCompleteSet());
        }
    }
}
