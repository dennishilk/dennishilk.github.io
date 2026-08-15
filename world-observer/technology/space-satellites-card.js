(function () {
  "use strict";

  const latestUrl = "/world-observer/dashboard/latest/space-satellites.json";

  function removePlannedDuplicate() {
    const container = document.getElementById("technology-planned-groups");
    if (!container) return false;
    for (const section of container.querySelectorAll("section")) {
      const heading = section.querySelector("h2");
      if (heading?.textContent.trim() === "Space Technology") {
        section.remove();
        return true;
      }
    }
    return false;
  }

  const planned = document.getElementById("technology-planned-groups");
  if (planned) {
    removePlannedDuplicate();
    const observer = new MutationObserver(() => {
      if (removePlannedDuplicate()) observer.disconnect();
    });
    observer.observe(planned, { childList: true, subtree: true });
  }

  async function loadCard() {
    const status = document.getElementById("technology-space-status");
    const groups = document.getElementById("technology-space-groups");
    const starlink = document.getElementById("technology-space-starlink");
    const epoch = document.getElementById("technology-space-epoch");
    if (!status || !groups || !starlink || !epoch) return;

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
    } catch (error) {
      status.textContent = "WAITING FOR SNAPSHOT";
      groups.textContent = "—";
      starlink.textContent = "—";
      epoch.textContent = "—";
    }
  }

  loadCard();
}());
