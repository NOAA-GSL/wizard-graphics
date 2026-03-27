import RBush from 'rbush';

export const dys = [
    5, 4, 3, 2, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.025, 0.01, 0,
];
const population_limit = [
    2000000, 1000000, 800000, 600000, 400000, 200000, 100000, 50000, 25000, 10000, 5000, 4000, 3000,
    2000, 500, 0,
];

export function computeProgressiveDisclosure(citylist, debug = false) {
    // Compute the progresive disclosure
    const t0 = performance.now();
    const bushes = {};
    const lastInsert = [];
    const citylistTmp = [...citylist];
    for (const i in dys) {
        const dy = parseFloat(dys[i]);
        const limitPopulation = population_limit[i];

        bushes[dy] = new RBush();

        // Now try to add new cities using the new dy
        bushes[dy] = tryTOAddCitiesToDomain(
            bushes[dy],
            citylistTmp,
            dy,
            limitPopulation,
            lastInsert,
        );

        if (debug) {
            const list = bushes[dy].all();
            console.log(
                'citylist:',
                dy,
                list.length,
                citylistTmp.length,
                Math.round(performance.now() - t0),
            );
        }
    }

    // Make the index file
    const indexes = {};
    for (const dy of dys) {
        indexes[dy] = [];
        const list = bushes[dy].all();
        for (const obj of list) {
            indexes[dy].push(obj.idx);
        }
    }

    // If a city pops up at one dy (say 2), then disappears (say 1), this is becuase a higher
    // ranked city is replacing it.  To avoid this, we remove cities that are in a higher order
    // rank but no in the lower order rank
    for (const i in dys) {
        if (i == 0) continue;
        const idx1 = indexes[dys[i - 1]];
        const idx2 = indexes[dys[i]];
        // Find the differences between the two
        const diffArray = idx1.filter((num) => !idx2.includes(num));
        // Now remove these difference values from ALL higher order dy
        for (let j = i - 1; j >= 0; j--) {
            indexes[dys[j]] = indexes[dys[j]].filter((num) => !diffArray.includes(num));
        }
    }

    //
    // Build City trees with RBush(), takes about 50 ms
    const tree = {};
    const t1 = performance.now();
    for (let dy in indexes) {
        const items = [];
        dy = parseFloat(dy);
        for (const i of indexes[dy]) {
            const { name } = citylist[i];
            const dx = (name.length * dy) / 2;
            items.push({
                minX: parseFloat(citylist[i].lon) - dx,
                maxX: parseFloat(citylist[i].lon) + dx,
                minY: parseFloat(citylist[i].lat) - dy,
                maxY: parseFloat(citylist[i].lat) + dy,
                ...citylist[i],
            });
        }
        tree[dy] = new RBush();
        tree[dy].load(items);
    }

    console.log('Progressive Disclosure Creation Time:', performance.now() - t0);

    return tree;
}

function tryTOAddCitiesToDomain(t, citylist, dy, limitPopulation) {
    // Insert one by one
    for (let i = 0; i < citylist.length; i++) {
        let { name, population, lon, lat } = citylist[i];
        const ignorePopulation = citylist[i].ignorePopulation ?? false;
        lon = parseFloat(lon);
        lat = parseFloat(lat);
        population = parseFloat(population);
        if (!ignorePopulation && population < limitPopulation) {
            continue;
        }

        const dx = (name.length * dy) / 2;
        const item = {
            minX: lon - dx,
            maxX: lon + dx,
            minY: lat - dy,
            maxY: lat + dy,
            idx: i,
        };

        if (!t.collides(item)) {
            t.insert(item);
        }
    }
    return t;
}
