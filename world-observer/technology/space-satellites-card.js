(function () {
  "use strict";

  const latestUrl = "/world-observer/dashboard/latest/space-satellites.json";
  const spaceHref = "/world-observer/technology/space-satellites.html";

  function activateSpaceCard() {
    const card = document.getElementById("technology-space-card")
      || document.querySelector(`a.technology-observer-card[href="${spaceHref}"]`);
    if (!card) return;
    card.classList.add("active");
    card.classList.remove("planned", "signal-unavailable");
  }

  function removePlannedDuplicate() {
    const container = document.getElementById("technology-planned-groups");
    if (!container) return false;

    let removed = false;
    for (const section of [...container.querySelectorAll("section")]) {
      const heading = section.querySelector("h2");
      const spaceCard = section.querySelector(".observer-category h3");
      if (heading?.textContent.trim() === "Space Technology" || spaceCard?.textContent.trim() === "Space / Satellites") {
        section.remove();
        removed = true;
      }
    }
    return removed;
  }

  const planned = document.getElementById("technology-planned-groups");
  if (planned) {
    removePlannedDuplicate();
    const observer = new MutationObserver(() => {
      removePlannedDuplicate();
      activateSpaceCard();
    });
    observer.observe(planned, { childList: true, subtree: true });
  }

  window.addEventListener("load", () => {
    removePlannedDuplicate();
    activateSpaceCard();
  }, { once: true });

  async function loadCard() {
    const status = document.getElementById("technology-space-status");
    const groups = document.getElementById("technology-space-groups");
    const starlink = document.getElementById("technology-space-starlink");
    const epoch = document.getElementById("technology-space-epoch");
    if (!status || !groups || !starlink || !epoch) return;

    activateSpaceCard();

    try {
      const response = await fetch(latestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data?.observer !== "space-satellites") throw new Error("unexpected payload");
      status.textContent = String(data.data_status || data.status || "unknown").toUpperCase();
      groups.textContent = Number.isInteger(data?.summary?.groups_available)
        ? `${data.summary.groups_available}/${data.summary.groups_requested}`
        : "—";
      starlink.textContent = Number.isInteger(data?.groups?.starlink?.record_count)
        ? new Intl.NumberFormat("en-US").format(data.groups.starlink.record_count)
        : "—";
      epoch.textContent = typeof data?.summary?.freshest_selected_group_epoch_utc === "string"
        ? data.summary.freshest_selected_group_epoch_utc.replace("T", " ").replace("Z", " UTC")
        : "—";
      activateSpaceCard();
    } catch (error) {
      status.textContent = "WAITING FOR SNAPSHOT";
      groups.textContent = "—";
      starlink.textContent = "—";
      epoch.textContent = "—";
      activateSpaceCard();
    }
  }

  activateSpaceCard();
  loadCard();
}());
