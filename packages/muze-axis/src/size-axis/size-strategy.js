import { numberInterpolator, piecewiseInterpolator } from 'muze-utils';
import { CONTINOUS, DISCRETE } from '../enums/constants';
import { LINEAR, THRESHOLD } from '../enums/scale-type';

const indexedDomain = (domain) => {
    const uniqueVals = domain;
    const retDomain = domain.map((d, i) => (i) / (domain.length - 1));
    return { domain: retDomain, uniqueVals, scaleDomain: [0, 1] };
};

const normalDomain = (domain) => {
    const uniqueVals = domain;
    return { uniqueVals, domain };
};

const steppedDomain = (domain, intervals) => {
    let newIntervals = [];
    if (intervals instanceof Array) {
        newIntervals = intervals.slice().sort();
    } else {
        const interpolator = numberInterpolator()(...domain);
        for (let i = 0; i < intervals; i++) {
            newIntervals[i] = interpolator(i / (intervals - 1));
        }
    }
    if (newIntervals[0] < domain[0]) {
        newIntervals.shift();
    }
    const retDomain = newIntervals;
    return { uniqueVals: newIntervals, domain: retDomain, nice: true };
};

const discreteRange = (domainValue, scale, domain) => {
    const numVal = (domainValue - domain[0]) / (domain[domain.length - 1] - domain[0]);
    const interpolator = numberInterpolator()(...scale.range());
    return interpolator(numVal);
};

const pieceWiseRange = (domainValue, scale, domain, uniqueVals) => {
    const index = uniqueVals.indexOf(domainValue);
    const numVal = domain[index];
    const fn = piecewiseInterpolator()(numberInterpolator(), [...scale.range()]);
    return fn(numVal);
};

const normalRange = (domainValue, scale) => scale(domainValue);

const strategies = {
    [`${DISCRETE}-${CONTINOUS}`]: {
        scale: LINEAR,
        domain: indexedDomain,
        range: pieceWiseRange
    },
    [`${CONTINOUS}-${CONTINOUS}`]: {
        scale: LINEAR,
        domain: normalDomain,
        range: normalRange
    },
    [`${CONTINOUS}-${DISCRETE}`]: {
        scale: THRESHOLD,
        domain: steppedDomain,
        range: discreteRange
    }
};

export const strategyGetter = (domainType, rangeType) =>
     strategies[`${domainType}-${rangeType}`];
