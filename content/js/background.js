const domParser = new DOMParser();

async function getData(schoolId, offset) {
    var schoolName = "Skola";
    if (!schoolId || schoolId == "") {
        return;
    }

    const url = `https://skolmaten.se/${schoolId.toLowerCase()}/rss/weeks/?offset=${offset || 0}`;
    const response = await fetch(url);

    if (response.status >= 300 || response.status < 200) {
        return;
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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getData") {
        return getData(message.schoolId, message.offset)
    }
})