const button = document.createElement("a");
button.target = "_blank";
button.rel = "noopener";
// "F" tile matching the toolbar icon, then the label.
const tile = document.createElement("span");
tile.textContent = "F";
Object.assign(tile.style, {
  display: "grid",
  placeItems: "center",
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  background: "#142145",
  color: "#fbfaf6",
  fontSize: "14px",
});
button.append(tile, "Open in FocusLearn ↗");
Object.assign(button.style, {
  position: "fixed",
  right: "24px",
  bottom: "24px",
  zIndex: "2147483647",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 18px 8px 8px",
  borderRadius: "999px",
  background: "#fbfaf6",
  color: "#1a2130",
  font: "600 15px/1 system-ui, sans-serif",
  textDecoration: "none",
  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.3)",
  transition: "transform 0.2s",
});
button.addEventListener("mouseenter", () => (button.style.transform = "translateY(-2px)"));
button.addEventListener("mouseleave", () => (button.style.transform = ""));

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
