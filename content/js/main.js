Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil(((this - onejan) / 86400000 + onejan.getDay() + 1) / 7);
};

const weekDays = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];

async function getData(offset) {
    var schoolName = "Skola";
    const url = "https://rss2html.evla03.repl.co/feed.json?url=https://skolmaten.se/ljungviksskolan/rss/weeks/?offset=" + offset || 0;
    const response = await fetch(url);
    const json = await response.json();
    schoolName = json.feed.title;
    return [
        json.entries.map((item, i) => {
            return { dataHtml: item.summary, date: new Date(item.published) };
        }),
        schoolName,
    ];
}

function populateData(data, schoolName) {
    const sections = document.querySelectorAll("section");
    document.querySelector("h1#school-title").textContent = schoolName;
    const postWeek = data[0].date.getWeek();
    document.querySelector("h2#displayed-week").textContent = `Vecka ${postWeek} ${postWeek == (new Date()).getWeek() ? "(denna veckan)" : ""}`;
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
    // const cachedData = window.sessionStorage.getItem("cachedData");
    // if (cachedData) {
    //     populateData(cachedData[0], cachedData[1]);
    // }
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

refreshData();
