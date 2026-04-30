const m3uUrl = "./index.m3u?nocache=" + Date.now();

let allChannels = [];
let currentGroup = "All";

async function loadM3U() {
  try {
    const res = await fetch(m3uUrl);
    const text = await res.text();
    console.log(text);
    parseM3U(text);
  } catch (e) {
    document.getElementById("channels").innerHTML =
      "<div class='channel'>M3U yüklenemedi</div>";
  }
}

function parseM3U(data) {
  const lines = data.replace(/\r/g, "").split("\n");
  let info = null;

  for (let line of lines) {
    line = line.trim();

    if (line.startsWith("#EXTINF")) {
      const group = line.match(/group-title="([^"]*)"/);
      const logo = line.match(/tvg-logo="([^"]*)"/);
      const name = line.includes(",") ? line.split(",").pop().trim() : "Kanal";

      info = {
        name: name,
        group: group ? group[1] : "Diğer",
        logo: logo ? logo[1] : ""
      };
    }

    if (line.startsWith("http") && info) {
      info.url = line;
      allChannels.push(info);
      info = null;
    }
  }

  renderCategories();
  renderChannels();
}

function renderCategories() {
  const box = document.getElementById("categories");
  const cats = ["All", ...new Set(allChannels.map(c => c.group))];

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
  const search = document.getElementById("search").value.toLowerCase();

  let list = currentGroup === "All"
    ? allChannels
    : allChannels.filter(c => c.group === currentGroup);

  list = list.filter(c => c.name.toLowerCase().includes(search));

  if (list.length === 0) {
    box.innerHTML = "<div class='channel'>Kanal bulunamadı</div>";
    return;
  }

  box.innerHTML = "";

  list.forEach(ch => {
    const div = document.createElement("div");
    div.className = "channel";
    div.innerHTML = `
      <div class="name">${ch.name}</div>
      <div class="group">${ch.group}</div>
    `;
    div.onclick = () => playChannel(ch.url);
    box.appendChild(div);
  });
}

function playChannel(url) {
  const video = document.getElementById("player");

  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play();
    });
  } else {
    video.src = url;
    video.play();
  }
}

document.getElementById("search").addEventListener("input", renderChannels);

loadM3U();
