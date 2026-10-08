(() => {
  "use strict";
  const menus = Array.from(document.querySelectorAll("details.tools-menu"));
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const active = document.activeElement;
    for (const menu of menus) {
      if (!menu.open) continue;
      menu.open = false;
      if (menu.contains(active)) {
        menu.querySelector("summary")?.focus();
        event.preventDefault();
      }
    }
  });
  document.addEventListener("click", event => {
    for (const menu of menus) {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    }
  });
})();
