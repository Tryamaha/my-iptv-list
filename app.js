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
let currentGroup = "All";
let currentHls = null;

async function loadM3U() {
  showLoading();

  for (const playlist of playlists) {
    try {
      const res = await fetch(playlist);
      const text = await res.text();

      const newChannels = parseM3U(text);

      allChannels = [...allChannels, ...newChannels];
      allChannels = Array.from(
        new Map(allChannels.map(ch => [ch.url, ch])).values()
      );

      allChannels.sort((a, b) => a.name.localeCompare(b.name, "tr"));

      renderCategories();
      renderChannels();

      await sleep(250);
    } catch (e) {
      console.log("Playlist yüklenemedi:", playlist);
    }
  }
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
        group: group && group[1] ? group[1] : "Diğer",
        logo: logo && logo[1] ? logo[1] : "",
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

function renderCategories() {
  const box = document.getElementById("categories");
  const groups = [...new Set(allChannels.map(c => c.group))].filter(Boolean);

  const mainGroups = ["All", ...groups.slice(0, 60)];

  box.innerHTML = "";

  mainGroups.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "catBtn";
    btn.innerText = cat;

    if (cat === currentGroup) {
      btn.style.border = "1px solid #ff2d55";
    }

    btn.onclick = () => {
      currentGroup = cat;
      renderCategories();
      renderChannels();
    };

    box.appendChild(btn);
  });
}

function renderChannels() {
  const box = document.getElementById("channels");
  const search = document.getElementById("search").value.toLowerCase().trim();

  let list = currentGroup === "All"
    ? allChannels
    : allChannels.filter(c => c.group === currentGroup);

  if (search) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.group.toLowerCase().includes(search)
    );
  }

  const visibleList = list.slice(0, 500);

  if (visibleList.length === 0) {
    box.innerHTML = "<div class='channel'>Kanal bulunamadı</div>";
    return;
  }

  box.innerHTML = "";

  visibleList.forEach(ch => {
    const div = document.createElement("div");
    div.className = "channel";

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        ${
          ch.logo
            ? `<img src="${ch.logo}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:#222;">`
            : `<div style="width:44px;height:44px;border-radius:8px;background:#222;display:flex;align-items:center;justify-content:center;">TV</div>`
        }
        <div>
          <div class="name">${escapeHtml(ch.name)}</div>
          <div class="group">${escapeHtml(ch.group)}</div>
        </div>
      </div>
    `;

    div.onclick = () => playChannel(ch.url);
    box.appendChild(div);
  });

  if (list.length > 500) {
    const more = document.createElement("div");
    more.className = "channel";
    more.innerHTML = `İlk 500 kanal gösteriliyor. Arama yaparak diğer kanalları bulabilirsin. Toplam: ${list.length}`;
    box.appendChild(more);
  }
}

function playChannel(url) {
  const video = document.getElementById("player");

  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();

  if (window.Hls && Hls.isSupported()) {
    currentHls = new Hls({
      enableWorker: true,
      lowLatencyMode: true
    });

    currentHls.loadSource(url);
    currentHls.attachMedia(video);

    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    currentHls.on(Hls.Events.ERROR, () => {
      console.log("Yayın oynatma hatası:", url);
    });
  } else {
    video.src = url;
    video.play().catch(() => {});
  }
}

function showLoading() {
  document.getElementById("channels").innerHTML =
    "<div class='channel'>Kanallar yükleniyor...</div>";
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

document.getElementById("search").addEventListener("input", renderChannels);

loadM3U();
