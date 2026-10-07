const button = document.createElement("a");
button.textContent = "Open in FocusLearn ↗";
button.target = "_blank";
button.rel = "noopener";
Object.assign(button.style, {
  position: "fixed",
  right: "24px",
  bottom: "24px",
  zIndex: "2147483647",
  padding: "12px 20px",
  borderRadius: "999px",
  background: "#161616",
  color: "#efeeeb",
  font: "500 14px/1 system-ui, sans-serif",
  textDecoration: "none",
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
});

// Leave YouTube's copy paused and start FocusLearn where you were.
function handOff() {
  const video = document.querySelector("video");
  const t = Math.floor(video?.currentTime ?? 0);
  video?.pause();
  return `${FOCUSLEARN}/watch/${videoId(location.href)}${t ? `?t=${t}` : ""}`;
}

button.addEventListener("click", () => (button.href = handOff()));

// YouTube navigates without reloading the page, so re-check on every navigation.
function update() {
  const id = videoId(location.href);
  if (id) {
    button.href = `${FOCUSLEARN}/watch/${id}`;
    if (!button.isConnected) document.body.append(button);
  } else button.remove();
}

update();
document.addEventListener("yt-navigate-finish", update);
