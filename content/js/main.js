Date.prototype.getWeek = function () {
    this.setUTCDate(this.getUTCDate() + 4 - (this.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(this.getUTCFullYear(), 0, 1));
    return Math.ceil(((this - yearStart) / 86400000 + 1) / 7);
};

const weekDays = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
var offset = 0;

async function getData(offset) {
    var schoolName = "Skola";
    const schoolId = await getSchool();
    if (!schoolId || schoolId == "") {
        return;
    }

    const url = `https://rss2html.evla03.repl.co/feed.json?url=https://skolmaten.se/${schoolId.toLowerCase()}/rss/weeks/?offset=${offset || 0}`;
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
        alert("Denna veckan finns inte");
        if (offset > 0) {
            offset--;
        } else if (offset < 0) {
            offset++;
        } else {
            offset = 0;
        }
        refreshData();
    }

    const sections = document.querySelectorAll("section");
    document.querySelector("h1#school-title").textContent = schoolName;
    const postWeek = data[0].date.getWeek();
    const currentWeek = new Date().getWeek();
    document.querySelector("h2#displayed-week").textContent = `Vecka ${postWeek} ${postWeek == currentWeek ? "(denna veckan)" : ""}`;

    data.map((item, i) => {
        sections[i].querySelector("div.data").innerHTML = filterXSS(item.dataHtml);
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

function refreshData() {
    getSchool()
        .then((name) => {
            document.querySelector("input#school-name").value = name;
        })
        .catch(() => {
            document.querySelector("h1#school-title").textContent = "Ange ett skol-id";
        });
    getData(offset).then((data) => {
        populateData(data[0], data[1]);
    });
}

async function setSchool(name) {
    return browser.storage.sync.set({ schoolName: name });
}
async function getSchool() {
    const schoolName = (await browser.storage.sync.get("schoolName")).schoolName;
    if (schoolName) return schoolName;
    return Promise.reject();
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
    setSchool(document.querySelector("input#school-name").value).then(async () => {
        alert(`Skola ändrad till ${await getSchool()}`);
        location.reload();
    });
});

refreshData();
