"use strict";

Date.prototype.getWeek = function () {
    const d = new Date(this);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
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

async function populateData(data, stationName) {
    if (!data || !stationName) {
        return;
    }

    document.querySelector("h1#school-title").textContent = stationName;

    const currentWeek = new Date().getWeek();
    const postWeek = currentWeek + offset;
    document.querySelector("h2#displayed-week").textContent = `Vecka ${postWeek}${postWeek == currentWeek ? " (denna veckan)" : ""}`;

    const menuElement = document.querySelector("#menu");
    menuElement.innerHTML = "";

    // document.querySelector("span#message").textContent = data.length < 1 ? "Meny saknas" : "";
    data.forEach((item, i) => {
        const listItem = document.createElement("li");
        // item.date = new Date(item.date);
        // sections[i].querySelector("div.data").innerHTML = filterXSS(item.dataHtml);
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
        const meals = item.meals;

        meals.forEach((meal) => {
            const mealSpan = document.createElement("p");
            mealSpan.textContent = meal;
            dataDiv.appendChild(mealSpan);
        });
        daySpan.textContent = weekDays[item.date.getDay() - 1];
        dateSpan.textContent = `${item.date.getFullYear()}-${item.date.getMonth() + 1}-${item.date.getDate()}`;
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

async function populateStationList(schools, currentId) {
    const list = document.querySelector("#school-list");
    list.innerHTML = "";
    schools = schools.slice();
    if (schools.length > 50) {
        schools = schools.slice(0, 50);
        schools.push({ name: "Alla resultat visas inte, använd sökfältet", dead: true });
    }
    if (currentId && schools.length <= 0) {
        schools.push({ name: "Inga skolor hittades", dead: true });
    }
    schools.forEach((school) => {
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

function refreshData() {
    getSavedStation()
        .then((name) => {
            browser.runtime
                .sendMessage({ type: "getMenu", id: name, year: new Date().getFullYear(), week: new Date().getWeek() + offset })
                .then((message) => {
                    if (message && message.length == 2) {
                        const [data, stationName] = message;
                        populateData(data, stationName);
                    }
                })
                .catch((errorMsg) => {
                    console.error(errorMsg);
                });
            document.querySelector("#current-school").textContent = name;
        })
        .catch((errorMsg) => {
            console.warn(errorMsg);
            document.querySelector("#current-school").textContent = "ej inställt";
            document.querySelector("h1#school-title").textContent = "Välj skola";
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

document.querySelector("#set-school").addEventListener("click", (event) => {
    document.querySelector("#school-overlay").classList.add("visible");
    document.querySelector("main").classList.add("hidden");

    if (schools.length <= 0) {
        browser.runtime.sendMessage({ type: "getStations" }).then((message) => {
            schools = message;
            document.querySelector("input#search-school").value = "";
            populateStationList(schools);
        });
    }
});

document.querySelector("#set-school-done").addEventListener("click", (event) => {
    document.querySelector("#school-overlay").classList.remove("visible");
    document.querySelector("main").classList.remove("hidden");
});

document.querySelector("input#search-school").addEventListener(
    "input",
    (event) => {
        populateStationList(
            schools.filter((school) => (school.name + school.id).toLowerCase().includes(event.target.value)),
            event.target.value
        );
    },
    { capture: false }
);

refreshData();
