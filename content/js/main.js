Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil(((this - onejan) / 86400000 + onejan.getDay() + 1) / 7);
};

const weekDays = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];

async function getData(offset) {
    var schoolName = "Skola";
    const url = `https://rss2html.evla03.repl.co/feed.json?url=https://skolmaten.se/${(
        (await browser.storage.sync.get("schoolName")).schoolName || ""
    ).toLowerCase()}/rss/weeks/?offset=${offset || 0}`;
    const response = await fetch(url);
    const json = await response.json();
    schoolName = json.feed.title;
    if (response.status >= 300 || response.status < 200) {
        return;
    }
    return [
        json.entries.map((item, i) => {
            return { dataHtml: item.summary, date: new Date(item.published) };
        }),
        schoolName,
    ];
}

async function populateData(data, schoolName) {
    if (!data) {
        return;
    }

    if (data.length <= 0) {
        if (offset > 0) {
            alert("Denna veckan finns inte");
            offset--;
            refreshData();
        } else if (offset < 0) {
            alert("Denna veckan finns inte");
            offset++;
            refreshData();
        } else {
            alert("Denna veckan finns inte");
            offset = 0;
            refreshData();
        }
    }

    const sections = document.querySelectorAll("section");
    document.querySelector("h1#school-title").textContent = schoolName;
    const postWeek = data[0].date.getWeek();
    const currentWeek = new Date().getWeek();
    document.querySelector("h2#displayed-week").textContent = `Vecka ${postWeek} ${postWeek == currentWeek ? "(denna veckan)" : ""}`;
    
    data.map((item, i) => {
        sections[i].querySelector("div.data").innerHTML = item.dataHtml;
        const dateDiv = sections[i].querySelector("div.date");
        dateDiv.innerHTML = "";
        const daySpan = document.createElement("span");
        daySpan.textContent = weekDays[item.date.getDay() - 1];
        daySpan.classList.add("weekday");
        const dateSpan = document.createElement("span");
        dateSpan.textContent = `${item.date.getFullYear()}-${item.date.getMonth() + 1}-${item.date.getDate()}`;
        dateDiv.appendChild(daySpan);
        dateDiv.appendChild(dateSpan);
    });
}
var offset = 0;

function refreshData() {
    browser.storage.sync.get("schoolName").then((data) => {
        document.querySelector("input#school-name").value = data.schoolName;
    });
    getData(offset).then((data) => {
        window.sessionStorage.setItem("cachedData", data);
        populateData(data[0], data[1]);
    });
}

document.querySelector("#back").addEventListener("click", () => {
    offset--;
    refreshData();
});
document.querySelector("#forward").addEventListener("click", () => {
    offset++;
    refreshData();
});

document.querySelector("form#school-name-form").addEventListener("submit", (event) => {
    event.preventDefault();
    browser.storage.sync.set({ schoolName: document.querySelector("input#school-name").value }).then(async () => {
        alert(`Skola ändrad till ${(await browser.storage.sync.get("schoolName")).schoolName}`);
        location.reload();
    });
});

refreshData();
