const domParser = new DOMParser();

async function getData(schoolId, offset) {
    var schoolName = "Skola";
    if (!schoolId || schoolId == "") {
        return Promise.reject("Error: Det angivna idt är ogiltligt");
    }

    const url = `https://skolmaten.se/${schoolId.toLowerCase()}/rss/weeks/?offset=${offset || 0}`;
    const response = await fetch(url);

    if (response.status >= 300 || response.status < 200) {
        return Promise.reject("Error " + response.status + ": " + response.statusText);
    }

    const dom = domParser.parseFromString(await response.text(), "text/xml");

    schoolName = dom.querySelector("rss > channel > title").textContent || schoolName;
    return [
        Array.from(dom.querySelectorAll("rss item")).map((item) => {
            return { dataHtml: item.querySelector("description").textContent, date: item.querySelector("pubDate").textContent };
        }),
        schoolName,
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
                schoolList.push({ id: school.url.replaceAll("/", ""), name: school.name, district: district.name });
            }
        }
    }
    return schoolList.sort((a,b) => a.name > b.name ? 1 : -1);
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getData") {
        return getData(message.schoolId, message.offset);
    } else if (message.type === "getSchools") {
        return getSchools();
    }

    return Promise.reject();
});
