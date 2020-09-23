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

async function setSchool(name) {
    return browser.storage.sync.set({ schoolName: name });
}
async function getSchool() {
    const schoolName = (await browser.storage.sync.get("schoolName")).schoolName;
    if (schoolName) return schoolName;
    return Promise.reject("School name was not stored");
}

async function populateData(data, schoolName, week) {
    if (!data || !schoolName) {
        return;
    }

    if (data.length < 1) {
        alert("Denna veckan finns inte");
        if (offset > 0) {
            offset--;
        } else if (offset < 0) {
            offset++;
        } else {
            offset = 0;
        }
        refreshData();
        return;
    }

    const sections = document.querySelectorAll("section");
    document.querySelector("h1#school-title").textContent = schoolName;
    const currentWeek = new Date().getWeek();
    document.querySelector("h2#displayed-week").textContent = `Vecka ${week} ${week == currentWeek ? "(denna veckan)" : ""}`;

    data.forEach((item, i) => {
        const items = item.items.reduce((result, element, index, array) => {
            result.push(element);
            if (index < array.length - 1) {
                result.push(document.createElement("br"));
            }
            return result;
        }, []);
        items.forEach((item) => {
            sections[i].querySelector("div.data").appendChild(item);
        });
        const dateDiv = sections[i].querySelector("div.date");
        dateDiv.innerHTML = "";

        const daySpan = document.createElement("span");
        daySpan.textContent = weekDays[item.weekday];
        daySpan.classList.add("weekday");

        const dateSpan = document.createElement("span");
        dateSpan.textContent = item.date;

        dateDiv.appendChild(daySpan);
        dateDiv.appendChild(dateSpan);
    });
}
/**
 *
 * @param {Event} event
 */
function handleSchoolListItemClicked(event) {
    const id = event.target.getAttribute("data-id");
    setSchool(id).then(() => {
        document.querySelector("#current-school").textContent = id;
        refreshData();
    });
}

async function populateSchoolList(schools, currentId) {
    const list = document.querySelector("#school-list");
    list.innerHTML = "";
    schools = schools.slice();
    if (schools.length > 50) {
        schools = schools.slice(0, 50);
        schools.push({ name: "Alla resultat visas inte, använd sökfältet", dead: true });
    }
    if (currentId && schools.length <= 0) {
        schools.push({ name: "Manuellt från sökfältet", district: currentId, id: currentId });
    }
    schools.forEach((school) => {
        const item = document.createElement("li");
        if (school.dead) {
            item.textContent = `${school.name}`;
            item.classList.add("dead");
        } else {
            item.textContent = `${school.name} (${school.district})`;
            item.setAttribute("data-id", school.id);
            item.addEventListener("click", handleSchoolListItemClicked);
        }
        list.appendChild(item);
    });
}

function refreshData() {
    getSchool()
        .then((name) => {
            browser.runtime
                .sendMessage({ type: "getData", schoolId: name, offset: offset })
                .then((message) => {
                    if (message && message.length == 2) {
                        const [data, schoolName, week] = message;
                        populateData(data, schoolName, week);
                    }
                })
                .catch((errorMsg) => {
                    alert(errorMsg);
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
        browser.runtime.sendMessage({ type: "getSchools" }).then((message) => {
            schools = message;
            document.querySelector("input#search-school").value = "";
            populateSchoolList(schools);
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
        populateSchoolList(
            schools.filter((school) => (school.name + school.id).toLowerCase().includes(event.target.value)),
            event.target.value
        );
    },
    { capture: false }
);

refreshData();
