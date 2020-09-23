async function getData(schoolId, offset) {
    var schoolName = "Skola";
    if (!schoolId || schoolId == "") {
        return Promise.reject("Error: Det angivna idt är ogiltligt");
    }

    const url = `https://skolmaten.se/${schoolId.toLowerCase()}/?fmt=json&offset=${offset || 0}`;
    const response = await fetch(url);

    if (response.status >= 300 || response.status < 200) {
        return Promise.reject("Error " + response.status + ": " + response.statusText);
    }

    const json = await response.json();

    schoolName = json.school.name || schoolName;
    return [
        json.weeks[0].days.map((item) => {
            return { items: item.items, date: item.date, weekday: item.week_day };
        }),
        schoolName,
        json.weeks[0].week,
    ];
}

async function getSchools() {
    const url = "https://skolmaten.se/?fmt=json";
    const response = await fetch(url);
    if (response.status >= 300 || response.status < 200) {
        return Promise.reject("Error " + response.status + ": " + response.statusText);
    }

    const json = await response.json();
    const schoolList = [];
    for (const province of json.provinces) {
        for (const district of province.districts) {
            for (const school of district.schools) {
                schoolList.push({ id: school.url.slice(1, -1), name: school.name, district: district.name });
            }
        }
    }
    return schoolList.sort((a, b) => (a.name > b.name ? 1 : -1));
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getData") {
        return getData(message.schoolId, message.offset);
    } else if (message.type === "getSchools") {
        return getSchools();
    }

    return Promise.reject();
});
