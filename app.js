const playlists = [
  "./index.m3u?nocache=" + Date.now(),
  "https://iptv-org.github.io/iptv/countries/tr.m3u",
  "https://iptv-org.github.io/iptv/categories/sports.m3u",
  "https://iptv-org.github.io/iptv/categories/documentary.m3u",
  "https://iptv-org.github.io/iptv/categories/movies.m3u",
  "https://iptv-org.github.io/iptv/categories/news.m3u",
  "https://iptv-org.github.io/iptv/categories/music.m3u",
  "https://iptv-org.github.io/iptv/categories/kids.m3u",
  "https://iptv-org.github.io/iptv/countries/us.m3u",
  "https://iptv-org.github.io/iptv/countries/gb.m3u"
];

let allChannels = [];
let currentSection = "All";
let currentHls = null;
let favorites = JSON.parse(localStorage.getItem("iptv_favorites") || "[]");

const elChannels = document.getElementById("channels");
const elCategories = document.getElementById("categories");
const elSearch = document.getElementById("search");
const elStatus = document.getElementById("status");
const elNowTitle = document.getElementById("nowTitle");
const elNowGroup = document.getElementById("nowGroup");
const player = document.getElementById("player");

async function loadM3U() {
  setStatus("Kanallar yükleniyor...");

  for (const playlist of playlists) {
    try {
      const res = await fetch(playlist);
      const text = await res.text();
      const parsed = parseM3U(text);

      allChannels = [...allChannels, ...parsed];
      allChannels = Array.from(new Map(allChannels.map(ch => [ch.url, ch])).values());
      allChannels.sort((a, b) => a.name.localeCompare(b.name, "tr"));

      renderAll();
      setStatus(`${allChannels.length} kanal yüklendi`);
      await sleep(200);
    } catch (e) {
      console.log("Playlist yüklenemedi:", playlist);
    }
  }

  setStatus(`${allChannels.length} kanal hazır`);
}

function parseM3U(data) {
  const lines = data.replace(/\r/g, "").split("\n");
  const channels = [];
  let info = null;

  for (let line of lines) {
    line = line.trim();

    if (line.startsWith("#EXTINF")) {
      const group = line.match(/group-title="([^"]*)"/);
      const logo = line.match(/tvg-logo="([^"]*)"/);
      const name = line.includes(",") ? line.split(",").pop().trim() : "Kanal";

      info = {
        name: name || "Kanal",
        group: group?.[1] || "Diğer",
        logo: logo?.[1] || "",
        url: ""
      };
    }

    if (line.startsWith("http") && info) {
      info.url = line;
      channels.push(info);
      info = null;
    }
  }

  return channels;
}

function renderAll() {
  renderCategories();
  renderChannels();
}

function renderCategories() {
  const groups = [...new Set(allChannels.map(c => c.group))].filter(Boolean).slice(0, 40);
  const cats = ["All", ...groups];

  elCategories.innerHTML = "";

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "catBtn" + (cat === currentSection ? " active" : "");
    btn.innerText = cat;
    btn.onclick = () => {
      currentSection = cat;
      updateNavButtons();
      renderAll();
    };
    elCategories.appendChild(btn);
  });
}

function renderChannels() {
  let list = getFilteredChannels();

  if (list.length === 0) {
    elChannels.innerHTML = `<div class="card loading">Kanal bulunamadı</div>`;
    return;
  }

  const visible = list.slice(0, 600);

  elChannels.innerHTML = visible.map(ch => {
    const fav = favorites.includes(ch.url) ? "⭐" : "☆";

    return `
      <div class="card" onclick="playChannel('${encodeURIComponent(ch.url)}','${escapeAttr(ch.name)}','${escapeAttr(ch.group)}')">
        <span class="fav" onclick="event.stopPropagation();toggleFavorite('${encodeURIComponent(ch.url)}')">${fav}</span>
        ${
          ch.logo
            ? `<img class="logo" src="${escapeAttr(ch.logo)}" onerror="this.style.display='none'">`
            : `<div class="logo" style="display:flex;align-items:center;justify-content:center;">TV</div>`
        }
        <div class="card-title">${escapeHtml(ch.name)}</div>
        <div class="card-group">${escapeHtml(ch.group)}</div>
      </div>
    `;
  }).join("");

  if (list.length > 600) {
    elChannels.innerHTML += `<div class="card loading">İlk 600 kanal gösteriliyor. Arama ile daraltabilirsin. Toplam: ${list.length}</div>`;
  }
}

function getFilteredChannels() {
  const q = elSearch.value.toLowerCase().trim();

  let list = allChannels;

  if (currentSection === "Favoriler") {
    list = allChannels.filter(c => favorites.includes(c.url));
  } else if (currentSection !== "All") {
    list = allChannels.filter(c =>
      c.group.toLowerCase().includes(currentSection.toLowerCase())
    );
  }

  if (q) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q)
    );
  }

  return list;
}

function playChannel(encodedUrl, name, group) {
  const url = decodeURIComponent(encodedUrl);

  elNowTitle.innerText = name;
  elNowGroup.innerText = group;

  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  player.pause();
  player.removeAttribute("src");
  player.load();

  if (window.Hls && Hls.isSupported()) {
    currentHls = new Hls({ enableWorker: true, lowLatencyMode: true });
    currentHls.loadSource(url);
    currentHls.attachMedia(player);
    currentHls.on(Hls.Events.MANIFEST_PARSED, () => player.play().catch(() => {}));
  } else {
    player.src = url;
    player.play().catch(() => {});
  }
}

function toggleFavorite(encodedUrl) {
  const url = decodeURIComponent(encodedUrl);

  if (favorites.includes(url)) {
    favorites = favorites.filter(x => x !== url);
  } else {
    favorites.push(url);
  }

  localStorage.setItem("iptv_favorites", JSON.stringify(favorites));
  renderChannels();
}

function updateNavButtons() {
  document.querySelectorAll(".nav").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === currentSection);
  });
}

document.querySelectorAll(".nav").forEach(btn => {
  btn.onclick = () => {
    currentSection = btn.dataset.section;
    updateNavButtons();
    renderAll();
  };
});

elSearch.addEventListener("input", renderChannels);

function setStatus(text) {
  elStatus.innerText = text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(text) {
  return escapeHtml(text).replaceAll("`", "&#096;");
}

loadM3U();
