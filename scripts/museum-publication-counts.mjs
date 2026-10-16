// Catalog totals are derived from cards so adding an exhibit cannot stale older builders.
export function refreshCatalogCounts(html){
 const cards=[...html.matchAll(/<a class="catalog-card [^"]+"[^>]*data-category="([^"]+)"/g)],total=cards.length;
 let index=0;html=html.replace(/(class="catalog-number" aria-hidden="true">)\d+/g,(_,p)=>p+String(++index).padStart(2,'0'));
 html=html.replace(/\d+ interactive exhibits\./g,total+' interactive exhibits.').replace(/\d+ interaktive Ausstellungen\./g,total+' interaktive Ausstellungen.');
 html=html.replace(/(id="catalog-count"[^>]*>)\d+ exhibits/,(_,p)=>p+total+' exhibits');
 html=html.replace(/(<button[^>]*data-filter="([^"]+)"[\s\S]*?class="filter-count">)\d+/g,(_,p,category)=>p+(category==='all'?total:cards.filter(c=>c[1]===category).length));
 return html;
}
