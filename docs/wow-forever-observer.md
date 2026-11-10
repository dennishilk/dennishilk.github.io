# WoW Forever Observer

## Display status, 10 November 2026

The DE/EN article now places the character panel immediately below the opening paragraph, before the author’s retrospective. The panel retains the public character render and manually confirmed level 14, and it has slots for experience, item level, professions and equipment. The original story and dated screenshots remain separate from dynamic data. There is no active automatic feed yet, so the display does not claim to be live.

A small browser adapter at `assets/blog/wow-forever/observer.js` reads only a same-origin public JSON snapshot at:

`/world-observer/data/wow-forever-dennis-hilk.json`

When absent, invalid or expired, it leaves the labelled manual baseline visible. The snapshot must contain `schema_version: 1`, `source: "blizzard-forever-eu"`, `last_success_at` and `expires_at` ISO timestamps, and `character: {name: "Dennis", surname: "Hilk", level, experience?, average_item_level?, last_login_timestamp?}`. Optional `professions` is an array of `{name, skill_points, max_skill_points}`; optional `equipment` is an array of `{slot, name, item_level?}`. No tokens or OAuth secrets may be exported. The browser reloads on visit and at most every 15 minutes while the tab is visible; the *server* may refresh the JSON hourly. Client-side updates do not request Blizzard directly.

The author tested client credentials on Worldnode and received a valid access token on 10 November 2026. An authenticated call to the EU Forever profile route returned Dennis Hilk, level 14, Undead Paladin, Horde, Normal, and the equipment and professions subresources were also read successfully. This establishes the route and schema as working with the author’s registered application on that date, not guaranteed official long-term support or permitted long-term archival.


## Data source assessment, 10 November 2026

| Source | Access | Update behavior and use |
| --- | --- | --- |
| [WoWArmory.gg profile](https://wowarmory.gg/forever/eu/character/dennis-hilk) | Public, unauthenticated human-facing page. The [terms](https://wowarmory.gg/terms-of-use) allow linking and prohibit overloading the site with bulk automated requests. No supported machine API or permitted polling rate was verified for this service. | [Forever search](https://wowarmory.gg/forever) says profiles appear from level 10 after logout. The [source notes](https://wowarmory.gg/data-sources) describe server-side snapshots and no guaranteed refresh when opening a profile. Link out to it. |
| [Battle.net developer documentation](https://develop.battle.net/documentation/world-of-warcraft/profile-apis) | Blizzard requires a Battle.net developer registration and an application client. For public profile calls, the planned authentication is a server-side OAuth client-credentials grant. Use an authorized client and confirm the Forever interface before enabling the job. | A [community report](https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334) reports a Forever EU profile namespace, level 10 and logout requirements, and character equipment, specializations, professions, statistics and achievement endpoints. The author has verified that this Forever EU route works for his own character, but Forever-specific rate limits and long-term support are still unverified. |
| Owner’s screenshots and journal | Manually dated by the author. | The permanent history can use independently recorded observations such as the screenshot in the article. |

The [Blizzard Developer API Terms](https://www.blizzard.com/en-us/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use) state a general ceiling of 36,000 calls per hour, subject to changes by Blizzard. The terms also set a maximum 30-day TTL for data pulled from the APIs and explain a WoW character-validation option. Before enabling automatic history, confirm how that option applies to historical records and derived milestones. Until then, cap API-derived history below 30 days and keep it out of permanent Git history and backups.

## Integration on Worldnode

- The authenticated Forever EU profile and equipment/professions subresource calls were tested successfully with a registered application on 10 November 2026. Before scheduling, finish the collector and confirm provider rules. Keep the client secret on Debian 13 Worldnode in the collector’s service credentials. Obtain and reuse the short-lived token on the server. Serve a same-origin static JSON export containing only display fields.
- Once the provider’s limits and terms are confirmed, start with hourly checks for this one character. Fetch the summary and supported subresources at a low rate. Honor any stricter limit and `Retry-After`. Treat unavailable fields as unknown. Distinguish time checked, time successfully synchronized and source observation time. Only display a source timestamp if the provider actually supplies it and its meaning is known.
- Validate profile identity and keep the last usable snapshot on transient failure while it is within the allowed retention period. Mark it stale and leave the last successful sync timestamp untouched. Invalidate and remove the affected data when the source confirms deletion or withdrawal. Rotate retained data and expire derived history with the underlying records until longer retention is confirmed.
- Publish the latest snapshot and bounded history atomically outside Git, following the existing World Observer deployment model. Store level, equipment by slot, talent selection, professions, selected statistics and achievement changes only where the verified source exposes them. Give optional fields their own freshness when they update independently.
- Append a dated milestone on the first successful observation of a higher level. Record the observed level and collection time. Do not interpolate intermediate levels or equate the observation with the in-game level-up time. A repeated snapshot must not create another milestone.
- Keep the static article panel usable if automated data is absent or expired. The collector requires neither access to the game process nor automated requests to the third-party armory.

No collector or timer is active in this release.
