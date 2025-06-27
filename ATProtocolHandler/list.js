const params = new URLSearchParams(window.location.search);
const aturl = params.get("aturl") || "";

const sites = [
  {
    name: "atproto.at",
    url: `https://atproto.at/viewer?uri=${aturl}`
  },
  {
    name: "ATProtoViewer",
    url: `https://corkiejp.github.io/ATProtoViewer/index.html?uri=${aturl}`
  },
  {
    name: "SkyThread",
    url: `https://blue.mackuba.eu/skythread/?q=${aturl}`
  },
  {
    name: "pdsls",
    url: `https://pdsls.dev/${aturl}`
  },
  {
    name: "atp.tools",
    url: `https://atp.tools/${aturl}`
  },
  {
    name: "skyview.social",
    url: `https://skyview.social/?url=${aturl}`
  }  
];




const ul = document.getElementById("site-list");
sites.forEach(site => {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = site.url;
  a.textContent = site.name;
  a.target = "_blank";
  li.appendChild(a);
  ul.appendChild(li);
});
