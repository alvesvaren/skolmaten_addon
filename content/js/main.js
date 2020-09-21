Date.prototype.getWeek = function () {
    const d = new Date(this);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const weekDays = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
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

async function populateData(data, schoolName) {
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
    const postWeek = new Date(data[0].date).getWeek();
    const currentWeek = new Date().getWeek();
    document.querySelector("h2#displayed-week").textContent = `Vecka ${postWeek} ${postWeek == currentWeek ? "(denna veckan)" : ""}`;

    data.forEach((item, i) => {
        item.date = new Date(item.date);
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
            browser.runtime.sendMessage({ type: "getData", schoolId: name, offset: offset }).then((message) => {
                if (message && message.length == 2) {
                    const [data, schoolName] = message;
                    populateData(data, schoolName);
                }
            }).catch((errorMsg) => {
                alert(errorMsg);
            });
            document.querySelector("input#school-name").value = name;
        })
        .catch((errorMsg) => {
            document.querySelector("h1#school-title").textContent = "Ange skolmaten-id:";
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
    setSchool(document.querySelector("input#school-name").value).then(async () => {
        alert(`Skola ändrad till ${await getSchool()}`);
        location.reload();
    });
});

refreshData();
