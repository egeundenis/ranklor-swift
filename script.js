// --- CONFIGURATION ---
const ALBUM_IMAGES = {
    "Taylor Swift": "icons/debut.png",
    "Fearless": "icons/fearless.png",
    "Speak Now": "icons/speaknow.png",
    "Red": "icons/red.png",
    "1989": "icons/1989.png",
    "reputation": "icons/reputation.png",
    "Lover": "icons/lover.png",
    "folklore": "icons/folklore.png",
    "evermore": "icons/evermore.png",
    "Midnights": "icons/midnights.png",
    "The Tortured Poets Department": "icons/thetorturedpoetsdepartmant.png",
    "The Life of a Showgirl": "icons/thelifeofashowgirl.png"
};

// --- GLOBAL STATE ---
let allAlbumData = {};
let currentAlbumName = "";

// Sorting State
let queue = [];        // Array of arrays (sorted lists we are merging)
let currentMerge = {
    listA: [],
    listB: [],
    merged: [],
    finalQueue: []     // Where merged lists go to wait for the next pass
};

// --- INITIALIZATION ---
window.onload = async () => {
    await loadDatabase();
    renderAlbumGrid();

    // Attach event listeners
    document.getElementById('btn-left').onclick = () => handleVote('left');
    document.getElementById('btn-right').onclick = () => handleVote('right');
    document.getElementById('copy-btn').onclick = copyToClipboard;
    document.getElementById('restart-btn').onclick = () => location.reload();

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const section = document.getElementById('ranking-interface');
        if (section.classList.contains('hidden')) return;

        if (e.key === 'ArrowLeft') handleVote('left');
        else if (e.key === 'ArrowRight') handleVote('right');
    });
};

// --- DATABASE PARSING ---
async function loadDatabase() {
    try {
        const text = await fetch("https://egeundenis.github.io/ranklor-swift/assets/database.txt").then(r => r.text());
        const lines = text.split("\n");
        let currentAlbum = null;

        lines.forEach(line => {
            // Remove citations like 
            let cleanLine = line.replace(/\//g, "").trim();

            if (cleanLine.startsWith("--- Album:")) {
                currentAlbum = cleanLine.replace("--- Album:", "").trim();
                allAlbumData[currentAlbum] = [];
            } else if ((cleanLine.startsWith("-- Track") || cleanLine.startsWith("- (Deluxe)")) && currentAlbum) {
                // Extract song title after the colon
                const parts = cleanLine.split(":");
                if (parts.length > 1) {
                    // Rejoin in case song title has a colon, remove extra formatting
                    let songTitle = parts.slice(1).join(":").trim();
                    if (songTitle) allAlbumData[currentAlbum].push(songTitle);
                }
            }
        });
    } catch (e) {
        alert("Error loading database.txt. Make sure it exists.");
        console.error(e);
    }
}

// --- RENDER ALBUMS ---
function renderAlbumGrid() {
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";

    Object.keys(allAlbumData).forEach(album => {
        // Fallback image if not in mapping
        const imgSrc = ALBUM_IMAGES[album] || "icons/default.png";

        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <img src="${imgSrc}" alt="${album}" onerror="this.src='https://placehold.co/150?text=Album'"/>
            <div>${album}</div>
        `;

        card.addEventListener('click', () => {
            // Highlight selected
            document.querySelectorAll('.album-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            startRanking(album);
        });

        grid.appendChild(card);
    });
}

// --- RANKING LOGIC (Iterative Merge Sort) ---

function startRanking(album) {
    currentAlbumName = album;
    const songs = allAlbumData[album];

    if (!songs || songs.length < 2) {
        alert("Not enough songs to rank!");
        return;
    }

    // Initialize Queue: treat every song as a sorted list of length 1
    // Shuffle slightly to make initial matchups less predictable? 
    // (Optional, currently keeping tracklist order)
    queue = songs.map(song => [song]);

    // UI Setup
    document.getElementById('ranking-interface').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('ranking-interface').scrollIntoView({ behavior: 'smooth' });

    setupNextMerge();
}

function setupNextMerge() {
    // If we have nothing left to merge in the main queue
    if (queue.length < 2) {
        // If we have items in the "next pass" queue (finalQueue), swap them in
        if (currentMerge.finalQueue && currentMerge.finalQueue.length > 0) {
            // If the main queue had 1 straggler, add it to the next pass
            if (queue.length === 1) {
                currentMerge.finalQueue.push(queue[0]);
            }
            queue = currentMerge.finalQueue;
            currentMerge.finalQueue = []; // Reset for new pass
            setupNextMerge(); // Recurse
        } else {
            // WE ARE DONE! Queue[0] is the final sorted list
            finishRanking(queue[0]);
        }
        return;
    }

    // Pull the first two lists off the queue to merge them
    currentMerge.listA = queue.shift();
    currentMerge.listB = queue.shift();
    currentMerge.merged = [];

    updateComparisonUI();
}

function updateComparisonUI() {
    const songA = currentMerge.listA[0];
    const songB = currentMerge.listB[0];

    // If one list is empty, auto-complete this specific merge
    if (!songA || !songB) {
        finishCurrentPair();
        return;
    }

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    // Fade out
    btnLeft.style.opacity = '0';
    btnLeft.style.transform = 'translateY(10px)';
    btnRight.style.opacity = '0';
    btnRight.style.transform = 'translateY(10px)';

    setTimeout(() => {
        btnLeft.innerText = songA;
        btnRight.innerText = songB;

        // Fade in
        btnLeft.style.opacity = '1';
        btnLeft.style.transform = 'translateY(0)';
        btnRight.style.opacity = '1';
        btnRight.style.transform = 'translateY(0)';
    }, 200);

    updateProgress();
}

function handleVote(side) {
    if (side === 'left') {
        // User picked A. Push A to merged, remove from listA
        currentMerge.merged.push(currentMerge.listA.shift());
    } else {
        // User picked B. Push B to merged, remove from listB
        currentMerge.merged.push(currentMerge.listB.shift());
    }
    updateComparisonUI();
}

function finishCurrentPair() {
    // One list is empty, push remaining items from the other
    if (currentMerge.listA.length > 0) currentMerge.merged.push(...currentMerge.listA);
    if (currentMerge.listB.length > 0) currentMerge.merged.push(...currentMerge.listB);

    // This pair is merged. Push result to the "waiting room" (finalQueue)
    if (!currentMerge.finalQueue) currentMerge.finalQueue = [];
    currentMerge.finalQueue.push(currentMerge.merged);

    // Go to next pair in the main queue
    setupNextMerge();
}

// --- RESULTS ---

function finishRanking(sortedList) {
    document.getElementById('ranking-interface').classList.add('hidden');
    const resultSection = document.getElementById('results-section');
    resultSection.classList.remove('hidden');

    const container = document.getElementById('final-list-container');
    container.innerHTML = "";

    sortedList.forEach((song, index) => {
        const row = document.createElement('div');
        row.className = 'rank-item';
        row.innerHTML = `<span class="rank-num">#${index + 1}</span> <span>${song}</span>`;
        container.appendChild(row);
    });

    resultSection.scrollIntoView({ behavior: 'smooth' });

    // Confetti effect!
    if (window.confetti) {
        window.confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#ec4899', '#f43f5e']
        });
    }
}

function copyToClipboard() {
    const list = document.querySelectorAll('.rank-item');
    let text = `My ${currentAlbumName} Ranking:\n\n`;
    list.forEach(item => {
        text += `${item.innerText}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        const originalText = btn.innerText;
        btn.innerText = "✅ Copied!";
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

function updateProgress() {
    // Rough estimate of progress based on songs remaining to be compared vs total
    // It's hard to be exact with Merge Sort without pre-calculating, 
    // so we'll just animate a little bar to show activity.
    const bar = document.getElementById('progress-fill');
    let w = parseFloat(bar.style.width) || 0;
    if (w < 95) bar.style.width = (w + 2) + "%";
    document.getElementById('progress-text').innerText = "Ranking...";
}