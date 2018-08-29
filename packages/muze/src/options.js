/**
 * @module
 * This is the global options semantics based on which setters getters are created and reactivity is initiated.
 * Format
 *  PROPERTY_NAME: {
 *      value: // default value of the property,
 *      meta: {
 *          typeCheck: // The setter value will be checked using this. If the value is function then the setter value
 *                     // is passed as args.
 *          typeExpected: // The output of typecheck action will be tested against this. Truthy value will set the
 *                       // value to the setter
 *          sanitization: // Need for sanitization before type is checked
 *      }
 *  }
 */

import { intSanitizer, mergeRecursive, DataModel } from 'muze-utils';
import { DEFAULT_CONFIG } from './defaults';

export default {
    data: {
        value: null,
        meta: {
            typeCheck: d => d instanceof DataModel
        }
    },
    width: {
        value: 0,
        meta: {
            sanitization: intSanitizer,
            typeCheck: Number.isInteger
        }
    },
    height: {
        value: 0,
        meta: {
            sanitization: intSanitizer,
            typeCheck: Number.isInteger
        }
    },
    minUnitWidth: {
        value: 150,
        meta: {
            sanitization: intSanitizer,
            typeCheck: Number.isInteger
        }
    },
    minUnitHeight: {
        value: 150,
        meta: {
            sanitization: intSanitizer,
            typeCheck: Number.isInteger
        }
    },
    config: {
        value: null,
        meta: {
            typeCheck: 'constructor',
            typeExpected: 'Object',
            sanitization: (config, oldConfig) => {
                const oldConf = mergeRecursive({}, oldConfig);
                const defConfig = mergeRecursive(oldConf, DEFAULT_CONFIG);
                const newConf = mergeRecursive(defConfig, config);
                return newConf;
            }

        }
    }
};
