const playlists = [
  "./index.m3u?nocache=" + Date.now(),

  "https://iptv-org.github.io/iptv/index.m3u",
  "https://iptv-org.github.io/iptv/categories/sports.m3u",
  "https://iptv-org.github.io/iptv/categories/movies.m3u",
  "https://iptv-org.github.io/iptv/categories/documentary.m3u",
  "https://iptv-org.github.io/iptv/categories/kids.m3u",
  "https://iptv-org.github.io/iptv/categories/news.m3u",
  "https://iptv-org.github.io/iptv/categories/music.m3u",
  "https://iptv-org.github.io/iptv/categories/entertainment.m3u",

  "https://iptv-org.github.io/iptv/countries/tr.m3u",
  "https://iptv-org.github.io/iptv/countries/us.m3u",
  "https://iptv-org.github.io/iptv/countries/gb.m3u",
  "https://iptv-org.github.io/iptv/countries/de.m3u",
  "https://iptv-org.github.io/iptv/countries/fr.m3u",
  "https://iptv-org.github.io/iptv/countries/es.m3u",
  "https://iptv-org.github.io/iptv/countries/it.m3u",
  "https://iptv-org.github.io/iptv/countries/nl.m3u",
  "https://iptv-org.github.io/iptv/countries/pt.m3u",
  "https://iptv-org.github.io/iptv/countries/br.m3u",
  "https://iptv-org.github.io/iptv/countries/mx.m3u",
  "https://iptv-org.github.io/iptv/countries/ar.m3u",
  "https://iptv-org.github.io/iptv/countries/ca.m3u",
  "https://iptv-org.github.io/iptv/countries/au.m3u",
  "https://iptv-org.github.io/iptv/countries/jp.m3u",
  "https://iptv-org.github.io/iptv/countries/kr.m3u",
  "https://iptv-org.github.io/iptv/countries/in.m3u",
  "https://iptv-org.github.io/iptv/countries/ae.m3u",
  "https://iptv-org.github.io/iptv/countries/sa.m3u",
  "https://iptv-org.github.io/iptv/countries/eg.m3u"
];

let allChannels = [];
let currentGroup = "All";

async function loadM3U() {
  document.getElementById("channels").innerHTML =
    "<div class='channel'>Kanallar yükleniyor...</div>";

  for (const url of playlists) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      parseM3U(text);
    } catch (e) {
      console.log("Yüklenemedi:", url);
    }
  }

  allChannels = allChannels.filter(
    (ch, i, arr) => i === arr.findIndex(x => x.url === ch.url)
  );

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
        logo: logo && logo[1] ? logo[1] : ""
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

  list = list.filter(c =>
    c.name.toLowerCase().includes(search) ||
    c.group.toLowerCase().includes(search)
  );

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
        ${ch.logo ? `<img src="${ch.logo}" style="width:46px;height:46px;object-fit:contain;border-radius:8px;background:#222;">` : ""}
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
