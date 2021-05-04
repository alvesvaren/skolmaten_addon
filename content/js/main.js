"use strict";

Date.prototype.getWeek = function () {
    var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const weekDays = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
var schools = [];
var offset = 0;

if (browser.theme) {
    browser.theme.getCurrent().then((theme) => {
        document.body.style.setProperty("--foreground", theme.colors.popup_text || "unset");
        document.body.style.setProperty("--background", theme.colors.popup || "unset");
        document.body.style.setProperty("--border", theme.colors.popup_border || "unset");
    });
}

function getRelativeDate() {
    const relativeDate = new Date();
    relativeDate.setDate(relativeDate.getDate() + offset * 7 - relativeDate.getDay() + 1);
    return relativeDate;
}

/** Save the station to extension storage
 * @param {number} stationId */
async function setSavedStation(stationId) {
    return browser.storage.sync.set({ stationId: stationId });
}
async function getSavedStation() {
    const stationId = (await browser.storage.sync.get("stationId")).stationId;
    if (!stationId) {
        throw new Error("No station was set");
    }

    return stationId;
}

function openSetStation() {
    document.querySelector("#school-overlay").classList.add("visible");
    document.querySelector("main").classList.add("hidden");

    if (schools.length <= 0) {
        browser.runtime.sendMessage({ type: "getStations" }).then((message) => {
            schools = message;
            document.querySelector("input#search-school").value = "";
            populateStationList(schools);
        });
    }
}

/** Fill the DOM with the relevant data
 * @param {any[]} data
 * @param {string} stationName */
async function populateData(data, stationName) {
    if (!data || !stationName) {
        return;
    }

    document.querySelector("h1#school-title").textContent = stationName;

    const currentWeek = new Date().getWeek();
    const relativeDate = getRelativeDate();
    const postWeek = relativeDate.getWeek();
    var displayedWeek = `Vecka ${postWeek}`;
    displayedWeek += postWeek == currentWeek ? " (denna veckan)" : "";
    displayedWeek += relativeDate.getFullYear() != new Date().getFullYear() ? ` (${relativeDate.getFullYear()})` : "";

    document.querySelector("h2#displayed-week").textContent = displayedWeek;

    const menuElement = document.querySelector("#menu");
    menuElement.innerHTML = "";

    data.forEach((item, i) => {
        const listItem = document.createElement("li");
        const dateDiv = document.createElement("div");
        const dataDiv = document.createElement("div");
        const daySpan = document.createElement("span");
        const dateSpan = document.createElement("span");
        dateDiv.classList.add("date");
        dataDiv.classList.add("data");
        daySpan.classList.add("weekday");

        dateDiv.appendChild(daySpan);
        dateDiv.appendChild(dateSpan);
        listItem.appendChild(dateDiv);
        listItem.appendChild(dataDiv);
        menuElement.appendChild(listItem);

        /** @type {string[]} */
        const meals = item.meals.length > 0 ? item.meals : ["Meny saknas"];

        meals.forEach((meal) => {
            const mealSpan = document.createElement("p");
            mealSpan.textContent = meal;
            dataDiv.appendChild(mealSpan);
        });
        item.date = new Date(item.date);
        var [year, month, day] = [item.date.getFullYear(), item.date.getMonth() + 1, item.date.getDate()];
        month = month < 10 ? "0" + month : month;
        day = day < 10 ? "0" + day : day;

        daySpan.textContent = weekDays[item.date.getDay() - 1];
        dateSpan.textContent = `${year}-${month}-${day}`;
    });
}

/** @param {Event} event */
function handleStationListItemClicked(event) {
    const id = event.target.getAttribute("data-id");
    setSavedStation(id).then(() => {
        document.querySelector("#current-school").textContent = id;
        refreshData();
    });
}

/** Populate the station list with the provided stations
 * @param {any[]} stations
 * @param {number} currentId */
async function populateStationList(stations, currentId) {
    const list = document.querySelector("#school-list");
    list.innerHTML = "";
    stations = stations.slice();
    if (stations.length > 50) {
        stations = stations.slice(0, 50);
        stations.push({ name: "Alla resultat visas inte, använd sökfältet", dead: true });
    }
    if (currentId && stations.length <= 0) {
        stations.push({ name: "Inga skolor matchar din sökning", dead: true });
    }
    stations.forEach((school) => {
        const item = document.createElement("li");
        if (school.dead) {
            item.textContent = `${school.name}`;
            item.classList.add("dead");
        } else {
            item.textContent = `${school.name} (${school.collection})`;
            item.setAttribute("data-id", school.id);
            item.addEventListener("click", handleStationListItemClicked);
        }
        list.appendChild(item);
    });
}

/** Fetch new data and handle displaying it in the DOM */
async function refreshData() {
    document.querySelectorAll("#back, #forward").forEach((e) => e.setAttribute("disabled", ""));
    try {
        const name = await getSavedStation();
        try {
            const relativeDate = getRelativeDate();
            const message = await browser.runtime.sendMessage({
                type: "getMenu",
                id: name,
                year: relativeDate.getFullYear(),
                week: relativeDate.getWeek(),
            });
            if (message && message.length == 2) {
                const [data, stationName] = message;
                populateData(data, stationName);
            }
            document.querySelector("#current-school").textContent = name;
        } catch (error) {
            alert(error);
            console.error(error);
        }
    } catch (error) {
        console.warn(error);
        document.querySelector("#current-school").textContent = "ej inställt";
        document.querySelector("h1#school-title").textContent = "Välj skola";
        document.querySelector("h2#displayed-week").textContent = 'Klicka på knappen "Välj skola" för att välja skola';
        openSetStation();
    }
    document.querySelectorAll("#back, #forward").forEach((e) => e.removeAttribute("disabled"));
}

document.querySelector("#back").addEventListener("click", () => {
    offset--;
    refreshData();
});
document.querySelector("#forward").addEventListener("click", () => {
    offset++;
    refreshData();
});

document.querySelector("#set-school").addEventListener("click", () => {
    openSetStation();
});

document.querySelector("#set-school-done").addEventListener("click", () => {
    document.querySelector("#school-overlay").classList.remove("visible");
    document.querySelector("main").classList.remove("hidden");
});

document.querySelector("input#search-school").addEventListener(
    "input",
    (event) => {
        const query = event.target.value.toLowerCase();
        populateStationList(
            schools.filter((school) => (school.name + school.id).toLowerCase().includes(query)),
            query
        );
    },
    { capture: false }
);

refreshData();
