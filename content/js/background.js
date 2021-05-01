const entrypoint = "https://skolmaten.se/api/4/";

/** Get menu for a school
 * @param {number} id The school id
 * @param {number} year The requested year
 * @param {number} week The requested week
 * @returns A list of id for each day, with the corresponding dates */
async function getMenu(id, year, week) {
    const url = entrypoint + `menu/?station=${id}&year=${year}&weekOfYear=${week}&count=1`;
    const response = await fetch(url, {
        headers: {
            "client-token": "lzsjjh3l5o4pnz265tqy",
            "client-version-token": "p1ksed0ntpvhqd54ktzn",
            "api-version": "4.0",
            locale: "sv_SE",
        },
    });

    if (!response.ok) {
        throw new Error(response.status + ": " + response.statusText);
    }

    const data = await response.json();

    const meals = [];

    for (const item of data.menu.weeks[0].days) {
        const date = new Date(item.year, item.month - 1, item.day);
        meals.push({ date: date, meals: [] });
        for (var meal of item.meals || []) {
            meals[meals.length - 1].meals.push(meal.value);
        }
    }
    return [meals, data.menu.station.name];
}

async function getStations() {
    const url = entrypoint + "stations/index/";
    const response = await fetch(url, {
        headers: {
            "client-token": "lzsjjh3l5o4pnz265tqy",
            "client-version-token": "p1ksed0ntpvhqd54ktzn",
            "api-version": "4.0",
            locale: "sv_SE",
        },
    });

    if (!response.ok) {
        throw new Error(response.status + ": " + response.statusText);
    }

    const json = await response.json();
    const stationList = [];
    for (const collection of json) {
        for (const station of collection.s) {
            stationList.push({ id: station.i, name: station.n, collection: collection.n });
        }
    }

    // This is probably pretty slow hehe
    return stationList.sort((a, b) => (a.name > b.name ? 1 : -1));
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getMenu") {
        return getMenu(message.id, message.year, message.week);
    } else if (message.type === "getStations") {
        return getStations();
    }

    throw new Error("unknown browser runtime message");
});
