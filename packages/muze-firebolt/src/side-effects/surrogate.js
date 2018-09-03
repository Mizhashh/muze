import GenericSideEffect from './generic';

/**
 * Abstract class which needs to be inherited by all side effects which can modify elements in the visual unit like
 * changing the color of plots, or updating the chart with new data on any interaction.
 *
 * @public
 * @class
 * @extends GenericSideEffect
 * @namespace Muze
 */
export default class SurrogateSideEffect extends GenericSideEffect {
    /**
     * Applies any interaction style to the dom elements of plots.
     *
     * ```
     *      sideEffect.applyInteractionStyle({
     *          uids: [0, 1, 2]
     *      }, 'fade', true);
     * ```
     *
     * @public
     *
     * @param {Object} set Object containing the information of the selected or unselected plots.
     * @param {Array} set.uids Array of unique row ids of plot elements. on which interaction style needs to be
     * applied.
     * @param {string} interactionType Type of interaction style like highlight, fade, or focus.
     * @param {boolean} apply Should the style be applied or removed from the elements.
     *
     * @return {SurrogateSideEffect} Instance of surrogate side effect.
     */
    applyInteractionStyle (set, interactionType, apply) {
        const layers = this.firebolt.context.layers();
        layers.forEach(layer => layer.config().interactive !== false &&
            layer.applyInteractionStyle(interactionType, set.uids, apply));

        return this;
    }
}
