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
let loadedUrls = new Set();

async function loadM3U() {
  document.getElementById("channels").innerHTML =
    "<div class='channel'>Kanallar yükleniyor...</div>";

  for (let i = 0; i < playlists.length; i++) {
    try {
      const res = await fetch(playlists[i]);
      const text = await res.text();
      parseM3U(text);

      allChannels = allChannels.filter(ch => {
        if (loadedUrls.has(ch.url)) return false;
        loadedUrls.add(ch.url);
        return true;
      });

      if (i === 0 || i === 1) {
        renderCategories();
        renderChannels();
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log("Hata:", playlists[i]);
    }
  }

  allChannels.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  renderCategories();
  renderChannels();
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
        name: name || "Kanal",
        group: group && group[1] ? group[1] : "Diğer",
        logo: logo && logo[1] ? logo[1] : "",
        url: ""
      };
    }

    if (line.startsWith("http") && info) {
      info.url = line;
      allChannels.push(info);
      info = null;
    }
  }
}

function renderCategories() {
  const box = document.getElementById("categories");
  const cats = ["All", ...new Set(allChannels.map(c => c.group).slice(0,50))];

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

  list = list.filter(c =>
    c.name.toLowerCase().includes(search) ||
    c.group.toLowerCase().includes(search)
  );

  list = list.slice(0, 300);

  if (list.length === 0) {
    box.innerHTML = "<div class='channel'>Kanal bulunamadı</div>";
    return;
  }

  box.innerHTML = "";

  list.forEach(ch => {
    const div = document.createElement("div");
    div.className = "channel";

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        ${ch.logo ? `<img src="${ch.logo}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:#222;">` : ""}
        <div>
          <div class="name">${ch.name}</div>
          <div class="group">${ch.group}</div>
        </div>
      </div>
    `;

    div.onclick = () => playChannel(ch.url);
    box.appendChild(div);
  });
}

function playChannel(url) {
  const video = document.getElementById("player");

  if (window.currentHls) {
    window.currentHls.destroy();
    window.currentHls = null;
  }

  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls();
    window.currentHls = hls;
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
  } else {
    video.src = url;
    video.play();
  }
}

document.getElementById("search").addEventListener("input", renderChannels);

loadM3U();
