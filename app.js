const m3uUrl = "https://raw.githubusercontent.com/Tryamaha/my-iptv-list/main/index.m3u";

let allChannels = [];
let currentGroup = "All";

async function loadM3U() {
  const res = await fetch(m3uUrl);
  const text = await res.text();
  parseM3U(text);
}

function parseM3U(data) {
  const lines = data.split("\n");
  let temp = {};

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith("#EXTINF")) {
      let groupMatch = line.match(/group-title="(.*?)"/);
      let name = line.split(",").pop();

      temp = {
        name: name,
        group: groupMatch ? groupMatch[1] : "Diğer"
      };
    }

    if (line.startsWith("http")) {
      temp.url = line;
      allChannels.push(temp);
    }
  }

  renderCategories();
  renderChannels();
}

function renderCategories() {
  const cats = ["All", ...new Set(allChannels.map(c => c.group))];
  const box = document.getElementById("categories");
  box.innerHTML = "";

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "catBtn";
    btn.innerText = cat;
    btn.onclick = () => {
      currentGroup = cat;
      renderChannels();
    };
    box.appendChild(btn);
  });
}

function renderChannels() {
  const box = document.getElementById("channels");
  box.innerHTML = "";

  let filtered = currentGroup === "All"
    ? allChannels
    : allChannels.filter(c => c.group === currentGroup);

  const search = document.getElementById("search").value.toLowerCase();
  filtered = filtered.filter(c => c.name.toLowerCase().includes(search));

  filtered.forEach(ch => {
    const div = document.createElement("div");
    div.className = "channel";
    div.innerHTML = `<div class="name">${ch.name}</div><div class="group">${ch.group}</div>`;
    div.onclick = () => playChannel(ch.url);
    box.appendChild(div);
  });
}

function playChannel(url) {
  const video = document.getElementById("player");

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    video.play();
  } else {
    video.src = url;
    video.play();
  }
}

document.getElementById("search").addEventListener("input", renderChannels);

loadM3U();
