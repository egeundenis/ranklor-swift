// GLOBALS
let allData = {};
let currentAlbum = null;
let songs = [];
let ranking = [];
let compareIndex = { left: 0, right: 1 };
let mergeSortQueue = [];

// ---------------------------------------------------------------------------
// LOAD database.txt
// ---------------------------------------------------------------------------

async function loadDatabase() {
    const text = await fetch("database.txt").then(r => r.text());
    const lines = text.split("\n");

    let current = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith("--- Album:")) {
            current = line.replace("--- Album:", "").trim();
            allData[current] = [];
        } else if (line.startsWith("-- Track") || line.startsWith("-(Deluxe) Track") || line.startsWith("-(Deluxe)") || line.startsWith("- (Deluxe) Track")) {
            const split = line.split(":");
            if (split.length >= 2) {
                const title = split.slice(1).join(":").trim();
                allData[current].push(title);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// START RANKING WHEN ALBUM CLICKED
// ---------------------------------------------------------------------------

async function initAlbumButtons() {
    await loadDatabase();

    const cards = document.querySelectorAll(".album-card");

    cards.forEach(card => {
        card.addEventListener("click", () => {
            const album = card.querySelector("strong").innerText.trim();

            if (!allData[album]) {
                alert("Album not found in database.txt: " + album);
                return;
            }

            startRanking(album);
        });
    });
}

// ---------------------------------------------------------------------------
// START RANKING PROCESS
// ---------------------------------------------------------------------------

function startRanking(albumName) {
    currentAlbum = albumName;
    songs = [...allData[albumName]];

    if (songs.length < 2) {
        alert("Not enough songs in this album to rank.");
        return;
    }

    document.getElementById("album-selection-view").style.display = "none";
    document.getElementById("ranking-view").style.display = "flex";

    ranking = mergeSortSetup(songs);
    showNextComparison();
}

// ---------------------------------------------------------------------------
// MERGE SORT–BASED RANKING SETUP
// ---------------------------------------------------------------------------

function mergeSortSetup(array) {
    const queue = [];

    function split(arr) {
        if (arr.length === 1) return arr;
        const mid = Math.floor(arr.length / 2);
        const left = split(arr.slice(0, mid));
        const right = split(arr.slice(mid));
        queue.push([left, right, []]); // left, right, merged
        return [...left, ...right];
    }

    split(array);
    mergeSortQueue = queue.reverse();
    return [];
}

// ---------------------------------------------------------------------------
// UI COMPARISON DISPLAY
// ---------------------------------------------------------------------------

function showNextComparison() {
    if (mergeSortQueue.length === 0) {
        // Finished
        rankingFinished();
        return;
    }

    const [left, right, merged] = mergeSortQueue[0];

    const leftSong = left[0];
    const rightSong = right[0];

    document.getElementById("leftSong").innerText = leftSong;
    document.getElementById("rightSong").innerText = rightSong;

    document.getElementById("currentAlbumTitle").innerText = currentAlbum;
}

// ---------------------------------------------------------------------------
// HANDLE USER CHOICE
// ---------------------------------------------------------------------------

document.getElementById("chooseLeft").onclick = () => choose("left");
document.getElementById("chooseRight").onclick = () => choose("right");

function choose(side) {
    let [left, right, merged] = mergeSortQueue[0];

    if (side === "left") {
        merged.push(left.shift());
    } else {
        merged.push(right.shift());
    }

    if (left.length === 0 && right.length === 0) {
        mergeSortQueue.shift();
        mergedAll(merged);
    }

    showNextComparison();
}

function mergedAll(result) {
    if (ranking.length === 0) ranking = result;
    else ranking = ranking.concat(result);
}

// ---------------------------------------------------------------------------
// FINISH & DISPLAY RANKED LIST
// ---------------------------------------------------------------------------

function rankingFinished() {
    document.getElementById("ranking-view").style.display = "none";
    document.getElementById("result-view").style.display = "block";

    const list = document.getElementById("resultList");
    list.innerHTML = "";

    ranking.forEach((song, i) => {
        const li = document.createElement("li");
        li.innerText = `${i + 1}. ${song}`;
        list.appendChild(li);
    });
}

// ---------------------------------------------------------------------------
// STARTUP
// ---------------------------------------------------------------------------

window.onload = () => {
    initAlbumButtons();
};
