// Asks before leaving YouTube, so a stray click on the icon does nothing.
const $ = (id) => document.getElementById(id);

// Runs inside the YouTube tab. Fails on a tab that's still loading; then we just start from the beginning.
async function videoTime(tabId, pause) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [pause],
      func: (pause) => {
        const video = document.querySelector("video");
        if (pause) video?.pause();
        return Math.floor(video?.currentTime ?? 0);
      },
    });
    return result;
  } catch {
    return 0;
  }
}

async function openTab(url, tab) {
  await chrome.tabs.create({ url, index: tab.index + 1 });
  window.close();
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const id = videoId(tab.url); // tab.url is only visible on YouTube (host_permissions), undefined elsewhere

  if (!id) {
    $("none").hidden = false;
    $("home").onclick = (e) => {
      e.preventDefault();
      openTab(FOCUSLEARN, tab);
    };
    return;
  }

  $("video").hidden = false;
  $("thumb").src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  $("title").textContent = tab.title.replace(/^\(\d+\)\s*/, "").replace(/ - YouTube$/, "") || "YouTube video";
  const t = await videoTime(tab.id, false);
  $("meta").textContent = t ? `Continues from ${fmtTime(t)}, YouTube will pause` : "Starts from the beginning";

  $("open").onclick = async () => {
    $("open").disabled = true;
    const now = await videoTime(tab.id, true); // re-read: the video kept playing while the popup was open
    openTab(`${FOCUSLEARN}/watch/${id}${now ? `?t=${now}` : ""}`, tab);
  };
})();
