export const wmSettings = {
 xmonad:{file:'xmonad.hs',dir:'~/.config/xmonad/',protocol:'x11',check:'xmonad --recompile',reload:'xmonad --recompile && xmonad --restart',features:['border','gaps']},
 dwm:{file:'config.h',dir:'dwm-6.8/',protocol:'x11',check:'make',reload:'make install PREFIX="$HOME/.local"',features:['border','font','bar']},
 i3:{file:'config',dir:'~/.config/i3/',protocol:'x11',check:'i3 -C -c ~/.config/i3/config',reload:'i3-msg reload',features:['border','gaps','font','bar']},
 sway:{file:'config',dir:'~/.config/sway/',protocol:'wayland',check:'sway --validate --config ~/.config/sway/config',reload:'swaymsg reload',features:['border','gaps','font','bar']},
 hyprland:{file:'hyprland.lua',dir:'~/.config/hypr/',protocol:'wayland',check:'Hyprland --verify-config -c ~/.config/hypr/hyprland.lua',reload:'hyprctl reload',features:['border','gaps','animation']},
 niri:{file:'config.kdl',dir:'~/.config/niri/',protocol:'wayland',check:'niri validate',reload:'',features:['border','gaps','animation']},
 labwc:{file:'rc.xml',dir:'~/.config/labwc/',protocol:'wayland',check:'xmllint --noout ~/.config/labwc/rc.xml',reload:'labwc --reconfigure',features:['border','font']},
 awesome:{file:'rc.lua',dir:'~/.config/awesome/',protocol:'x11',check:'awesome --check -c ~/.config/awesome/rc.lua',reload:'',features:['border','gaps','font','bar']}
};
export const legacyHyprlandSettings = {
 ...wmSettings.hyprland,file:'hyprland.conf',check:'Hyprland --verify-config -c ~/.config/hypr/hyprland.conf'
};
export const palettes = {
 dark:['#101923','#deebf2','#71dce3','#314353'],
 light:['#eef4f7','#152732','#166d77','#9aabb4'],
 nord:['#2e3440','#eceff4','#88c0d0','#4c566a'],
 gruvbox:['#282828','#ebdbb2','#fabd2f','#665c54'],
 custom:['#101923','#deebf2','#71dce3','#314353']
};

const keys = ['b','d','q','Return','a','c','e','f','g','i','m','n','o','p','s','t','u','v','w','y','z','F2','F3','F5','F6','F7','F8','F9','F10','F11','F12'];
const actionKeys = ['browser','terminal','close','launcher'];
export const keyOptions = keys;
export const defaultKeys = {browser:'b',terminal:'Return',close:'q',launcher:'d'};
const nums = [1,2,3,4,5,6,7,8,9];
const fonts = ['monospace','sans-serif','DejaVu Sans','DejaVu Sans Mono','JetBrains Mono'];
const terminalCommands = ['xterm','foot','kitty','alacritty'];
const browserCommands = ['firefox','firefox-esr','google-chrome','google-chrome-stable','chromium','chromium-browser'];
const wallpaperPath = '$HOME/Pictures/wallpaper.jpg';

function integer(raw, defaultValue, max) {
 return raw !== '' && Number.isInteger(Number(raw)) && Number(raw)>=0 && Number(raw)<=max ? Number(raw) : defaultValue;
}

export function normalize(options) {
 const settings = options.wm==='hyprland' && options.legacyHyprland===true ? legacyHyprlandSettings
  : Object.hasOwn(wmSettings,options.wm) ? wmSettings[options.wm] : null;
 if (!settings || !browserCommands.includes(options.browser) || !terminalCommands.includes(options.terminal)) throw new Error('selection');
 const shortcuts = Object.fromEntries(actionKeys.map(action => [action,options.shortcuts?.[action] ?? defaultKeys[action]]));
 if (Object.values(shortcuts).some(key=>!keys.includes(key))) throw new Error('reserved');
 if (new Set(Object.values(shortcuts)).size!==actionKeys.length) throw new Error('duplicate');
 const preset = Object.hasOwn(palettes,options.preset) ? options.preset : 'dark';
 const selected = preset==='custom' && options.colors?.length===4 ? options.colors : palettes[preset];
 const colors = selected.map((color,i)=>/^#[a-f\d]{6}$/i.test(color) ? color : palettes[preset][i]);
 const [background,foreground,active,inactive] = colors;
 return {...options,...settings,shortcuts,alt:options.mod==='alt',wallpaper:options.wallpaper===true,
  background,foreground,active,inactive,bar:options.bar!=='off',bottom:options.bar==='bottom',
  font:fonts.includes(options.font)?options.font:'monospace',fontSize:Math.max(6,integer(options.fontSize,10,28)),
  border:integer(options.border,2,8),gaps:integer(options.gaps,6,32),animations:options.animations===true};
}

function xmonad(c) {
 const k=c.shortcuts;
 const wall=c.wallpaper?`  , startupHook = spawn "feh --bg-fill \\\"${wallpaperPath}\\\""
`:'';
 return { [c.file]:`import XMonad
import XMonad.Layout.Spacing (spacing)
import XMonad.Util.EZConfig (additionalKeysP)

main :: IO ()
main = xmonad $ (def
  { modMask = ${c.alt?'mod1Mask':'mod4Mask'}
  , terminal = "${c.terminal}"
  , borderWidth = ${c.border}
  , normalBorderColor = "${c.inactive}"
  , focusedBorderColor = "${c.active}"
  , layoutHook = spacing ${c.gaps} (layoutHook def)
${wall}  }) \`additionalKeysP\`
  [ ("M-${k.terminal==='Return'?'<Return>':k.terminal.startsWith('F')?'<'+k.terminal+'>':k.terminal}", spawn "${c.terminal}")
${[['browser',`spawn "${c.browser}"`],['close','kill'],['launcher','spawn "dmenu_run"']].map(([action,code])=>{
  const key=k[action]; return `  , ("M-${key==='Return'?'<Return>':key.startsWith('F')?'<'+key+'>':key}", ${code})`;
 }).join('\n')}
  , ("M-S-r", spawn "xmonad --recompile && xmonad --restart")
  ]
` };
}

function tiling(c) {
 const wayland=c.protocol==='wayland';
 const launch=wayland?'wofi --show drun':'dmenu_run';
 const key=c.shortcuts;
 const bar=c.bar?`\nbar {
    position ${c.bottom?'bottom':'top'}
    font pango:${c.font} ${c.fontSize}
    colors {
        background ${c.background}
        statusline ${c.foreground}
        focused_workspace ${c.active} ${c.active} ${c.background}
        inactive_workspace ${c.inactive} ${c.background} ${c.foreground}
    }
}
`:'';
 const wall=c.wallpaper ? wayland?`output * bg ~/Pictures/wallpaper.jpg fill
`:`exec --no-startup-id feh --bg-fill "${wallpaperPath}"\
` : '';
 return {[c.file]:`# ${wayland?'Sway':'i3'} starter configuration
set $mod ${c.alt?'Mod1':'Mod4'}
font pango:${c.font} ${c.fontSize}
floating_modifier $mod
default_border pixel ${c.border}
gaps inner ${c.gaps}
client.focused ${c.active} ${c.active} ${c.background} ${c.active} ${c.active}
client.unfocused ${c.inactive} ${c.background} ${c.foreground} ${c.inactive} ${c.inactive}
${wall}bindsym $mod+${key.terminal} exec ${c.terminal}
bindsym $mod+${key.browser} exec ${c.browser}
bindsym $mod+${key.launcher} exec ${launch}
bindsym $mod+${key.close} kill
bindsym $mod+Shift+r reload
bindsym $mod+Shift+e exit
bindsym $mod+h split h
bindsym $mod+l split v
bindsym $mod+Left focus left
bindsym $mod+Right focus right
bindsym $mod+Up focus up
bindsym $mod+Down focus down
bindsym $mod+Shift+space floating toggle
bindsym $mod+Tab focus mode_toggle
${nums.map(n=>`bindsym $mod+${n} workspace number ${n}\nbindsym $mod+Shift+${n} move container to workspace number ${n}`).join('\n')}
${bar}`};
}

function hyprland(c) {
 if (c.legacyHyprland===true) return hyprlang(c);
 const key=c.shortcuts;
 const rgba=color=>`"rgba(${color.slice(1)}ff)"`;
 return {[c.file]:`-- Hyprland 0.57 Lua configuration
local mod = "${c.alt?'ALT':'SUPER'}"
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = "auto" })
hl.config({
    general = {
        gaps_in = ${c.gaps}, gaps_out = ${c.gaps}, border_size = ${c.border},
        col = { active_border = ${rgba(c.active)}, inactive_border = ${rgba(c.inactive)} },
    },
    animations = { enabled = ${c.animations} },
})
${c.wallpaper?`hl.on("hyprland.start", function()
    hl.exec_cmd('swaybg -i "${wallpaperPath}" -m fill')
end)
`:''}hl.bind(mod .. " + ${key.terminal}", hl.dsp.exec_cmd("${c.terminal}"))
hl.bind(mod .. " + ${key.browser}", hl.dsp.exec_cmd("${c.browser}"))
hl.bind(mod .. " + ${key.launcher}", hl.dsp.exec_cmd("wofi --show drun"))
hl.bind(mod .. " + ${key.close}", hl.dsp.window.close())
hl.bind(mod .. " + SHIFT + R", hl.dsp.exec_cmd("hyprctl reload"))
hl.bind(mod .. " + SHIFT + E", hl.dsp.exit())
for _, direction in ipairs({"left", "right", "up", "down"}) do
    hl.bind(mod .. " + " .. direction, hl.dsp.focus({ direction = direction }))
end
for i = 1, 9 do
    hl.bind(mod .. " + " .. i, hl.dsp.focus({ workspace = i }))
    hl.bind(mod .. " + SHIFT + " .. i, hl.dsp.window.move({ workspace = i }))
end
`};
}

function hyprlang(c) {
 const key=c.shortcuts;
 const rgba=color=>`rgba(${color.slice(1)}ff)`;
 return {[c.file]:`# Hyprland 0.53/0.55 (Hyprlang)
$mod = ${c.alt?'ALT':'SUPER'}
monitor = , preferred, auto, auto

general {
    gaps_in = ${c.gaps}
    gaps_out = ${c.gaps}
    border_size = ${c.border}
    col.active_border = ${rgba(c.active)}
    col.inactive_border = ${rgba(c.inactive)}
}

animations {
    enabled = ${c.animations?1:0}
}

${c.wallpaper?`exec-once = swaybg -i "${wallpaperPath}" -m fill\n`:''}bind = $mod, ${key.terminal}, exec, ${c.terminal}
bind = $mod, ${key.browser}, exec, ${c.browser}
bind = $mod, ${key.launcher}, exec, wofi --show drun
bind = $mod, ${key.close}, killactive,
bind = $mod SHIFT, R, exec, hyprctl reload
bind = $mod SHIFT, E, exit,
bind = $mod, left, movefocus, l
bind = $mod, right, movefocus, r
bind = $mod, up, movefocus, u
bind = $mod, down, movefocus, d
${nums.map(n=>`bind = $mod, ${n}, workspace, ${n}\nbind = $mod SHIFT, ${n}, movetoworkspace, ${n}`).join('\n')}
`};
}

function niri(c) {
 const key=c.shortcuts, mod=c.alt?'Alt':'Super';
 const bind=k=>k.length===1?k.toUpperCase():k;
 return {[c.file]:`// niri 25.11+ configuration
layout {
    gaps ${c.gaps}
    focus-ring { off; }
    border {
        width ${c.border}
        active-color "${c.active}"
        inactive-color "${c.inactive}"
    }
}
${c.animations?'':'animations { off; }\n'}${c.wallpaper?`spawn-at-startup "sh" "-c" "exec swaybg -i \\\"${wallpaperPath}\\\" -m fill"\n`:''}
binds {
    ${mod}+${bind(key.terminal)} { spawn "${c.terminal}"; }
    ${mod}+${bind(key.browser)} { spawn "${c.browser}"; }
    ${mod}+${bind(key.launcher)} { spawn "wofi" "--show" "drun"; }
    ${mod}+${bind(key.close)} repeat=false { close-window; }
    ${mod}+Shift+E { quit; }
    ${mod}+Left { focus-column-left; }
    ${mod}+Right { focus-column-right; }
    ${mod}+Up { focus-window-or-workspace-up; }
    ${mod}+Down { focus-window-or-workspace-down; }
${nums.map(n=>`    ${mod}+${n} { focus-workspace ${n}; }\n    ${mod}+Shift+${n} { move-window-to-workspace ${n}; }`).join('\n')}
}
`};
}

function labwc(c) {
 const key=c.shortcuts, mod=c.alt?'A':'W';
 const legacy=c.legacyLabwc===true;
 const execute=command=>legacy
  ?`<action name="Execute"><command>${command}</command></action>`
  :`<action name="Execute" command="${command}" />`;
 const result = {[c.file]:`<?xml version="1.0"?>
<labwc_config>
  <theme>
${legacy?'    <name>linux-companion</name>\n':''}    <font place="ActiveWindow"><name>${c.font}</name><size>${c.fontSize}</size></font>
    <font place="InactiveWindow"><name>${c.font}</name><size>${c.fontSize}</size></font>
  </theme>
${legacy?'':'  <desktops number="9" />\n'}  <keyboard>
    <keybind key="${mod}-${key.terminal}">${execute(c.terminal)}</keybind>
    <keybind key="${mod}-${key.browser}">${execute(c.browser)}</keybind>
    <keybind key="${mod}-${key.launcher}">${execute('wofi --show drun')}</keybind>
    <keybind key="${mod}-${key.close}"><action name="Close" /></keybind>
    <keybind key="${mod}-S-r"><action name="Reconfigure" /></keybind>
    <keybind key="${mod}-S-e"><action name="Exit" /></keybind>
    <keybind key="${mod}-Tab"><action name="NextWindow" /></keybind>
${legacy?'':nums.map(n=>`    <keybind key="${mod}-${n}"><action name="GoToDesktop" to="${n}" /></keybind>\n`).join('')}  </keyboard>
</labwc_config>
`,
 [legacy?'themerc':'themerc-override']:`border.width: ${c.border}
window.active.border.color: ${c.active}
window.inactive.border.color: ${c.inactive}
`};
 if (c.wallpaper) result.autostart=`swaybg -i "${wallpaperPath}" -m fill &\n`;
 return result;
}

function awesome(c) {
 const key=c.shortcuts;
 return {[c.file]:`local awful = require("awful")
require("awful.autofocus")
local gears = require("gears")
local beautiful = require("beautiful")
local wibox = require("wibox")
local mod = "${c.alt?'Mod1':'Mod4'}"
beautiful.init({
    font = "${c.font} ${c.fontSize}",
    bg_normal = "${c.background}", fg_normal = "${c.foreground}",
    bg_focus = "${c.active}", fg_focus = "${c.background}",
    border_width = ${c.border}, useless_gap = ${c.gaps},
    border_normal = "${c.inactive}", border_focus = "${c.active}",
})
awful.layout.layouts = { awful.layout.suit.tile, awful.layout.suit.floating }
awful.screen.connect_for_each_screen(function(s)
    awful.tag({"1", "2", "3", "4", "5", "6", "7", "8", "9"}, s, awful.layout.layouts[1])
${c.bar?`    s.bar = awful.wibar({ position = "${c.bottom?'bottom':'top'}", screen = s })
    s.bar:setup({
        awful.widget.taglist({ screen = s, filter = awful.widget.taglist.filter.all }),
        wibox.widget.textclock(),
        layout = wibox.layout.fixed.horizontal,
    })
`:''}end)
local bindings = gears.table.join(
    awful.key({mod}, "${key.terminal}", function() awful.spawn("${c.terminal}") end),
    awful.key({mod}, "${key.browser}", function() awful.spawn("${c.browser}") end),
    awful.key({mod}, "${key.launcher}", function() awful.spawn("dmenu_run") end),
    awful.key({mod}, "${key.close}", function() if client.focus then client.focus:kill() end end),
    awful.key({mod, "Shift"}, "r", awesome.restart),
    awful.key({mod, "Shift"}, "e", awesome.quit),
    awful.key({mod}, "j", function() awful.client.focus.byidx(1) end),
    awful.key({mod}, "k", function() awful.client.focus.byidx(-1) end)
)
for i = 1, 9 do
    bindings = gears.table.join(bindings,
        awful.key({mod}, tostring(i), function()
            local tag = awful.screen.focused().tags[i]
            if tag then tag:view_only() end
        end),
        awful.key({mod, "Shift"}, tostring(i), function()
            local focused = client.focus
            if focused and focused.screen.tags[i] then
                focused:move_to_tag(focused.screen.tags[i])
            end
        end))
end
root.keys(bindings)
awful.rules.rules = {
    { rule = {}, properties = {
        border_width = beautiful.border_width, border_color = beautiful.border_normal,
        focus = awful.client.focus.filter, raise = true, screen = awful.screen.preferred,
        placement = awful.placement.no_overlap + awful.placement.no_offscreen,
        buttons = gears.table.join(
            awful.button({}, 1, function(c) c:emit_signal("request::activate", "mouse_click", {raise = true}) end),
            awful.button({mod}, 1, function(c) awful.mouse.client.move(c) end),
            awful.button({mod}, 3, function(c) awful.mouse.client.resize(c) end)
        ),
    }},
}
client.connect_signal("focus", function(c) c.border_color = beautiful.border_focus end)
client.connect_signal("unfocus", function(c) c.border_color = beautiful.border_normal end)
${c.wallpaper?`awful.spawn.with_shell('feh --bg-fill "${wallpaperPath}"')\n`:''}`};
}

function dwm(c) {
 const header = `/* Based on upstream dwm 6.8 config.def.h.
MIT/X Consortium License

© 2010-2026 Hiltjo Posthuma <hiltjo@codemadness.org>
© 2006-2019 Anselm R Garbe <anselm@garbe.ca>
© 2006-2009 Jukka Salmi <jukka at salmi dot ch>
© 2006-2007 Sander van Dijk <a dot h dot vandijk at gmail dot com>
© 2007-2011 Peter Hartlich <sgkkr at hartlich dot com>
© 2007-2009 Szabolcs Nagy <nszabolcs at gmail dot com>
© 2007-2009 Christof Musik <christof at sendfax dot de>
© 2007-2009 Premysl Hruby <dfenze at gmail dot com>
© 2007-2008 Enno Gottox Boland <gottox at s01 dot de>
© 2008 Martin Hurton <martin dot hurton at gmail dot com>
© 2008 Neale Pickett <neale dot woozle dot org>
© 2009 Mate Nagy <mnagy at port70 dot net>
© 2010-2012 Connor Lane Smith <cls@lubutu.com>
© 2011 Christoph Lohmann <20h@r-36.net>
© 2015-2016 Quentin Rameau <quinq@fifth.space>
© 2015-2016 Eric Pruitt <eric.pruitt@gmail.com>
© 2016-2017 Markus Teich <markus.teich@stusta.mhn.de>
© 2020-2022 Chris Down <chris@chrisdown.name>

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/

/* appearance */
static const unsigned int borderpx  = ${c.border};        /* border pixel of windows */
static const unsigned int snap      = 32;       /* snap pixel */
static const int showbar            = ${Number(c.bar)};        /* 0 means no bar */
static const int topbar             = ${Number(!c.bottom)};        /* 0 means bottom bar */
static const char *fonts[]          = { "${c.font}:size=${c.fontSize}" };
static const char dmenufont[]       = "${c.font}:size=${c.fontSize}";
static const char col_gray1[]       = "${c.background}";
static const char col_gray2[]       = "${c.inactive}";
static const char col_gray3[]       = "${c.foreground}";
static const char col_gray4[]       = "${c.background}";
static const char col_cyan[]        = "${c.active}";
static const char *colors[][3]      = {
	/*               fg         bg         border   */
	[SchemeNorm] = { col_gray3, col_gray1, col_gray2 },
	[SchemeSel]  = { col_gray4, col_cyan,  col_cyan  },
};

/* tagging */
static const char *tags[] = { "1", "2", "3", "4", "5", "6", "7", "8", "9" };

static const Rule rules[] = {
	{ NULL, NULL, NULL, 0, 0, -1 },
};

/* layout(s) */
static const float mfact     = 0.55; /* factor of master area size [0.05..0.95] */
static const int nmaster     = 1;    /* number of clients in master area */
static const int resizehints = 1;    /* 1 means respect size hints in tiled resizals */
static const int lockfullscreen = 1; /* 1 will force focus on the fullscreen window */
static const int refreshrate = 120;  /* refresh rate (per second) for client move/resize */

static const Layout layouts[] = {
	/* symbol     arrange function */
	{ "[]=",      tile },    /* first entry is default */
	{ "><>",      NULL },    /* no layout function means floating behavior */
	{ "[M]",      monocle },
};

/* key definitions */
#define MODKEY ${c.alt?'Mod1Mask':'Mod4Mask'}
#define TAGKEYS(KEY,TAG) \\
	{ MODKEY,                       KEY,      view,           {.ui = 1 << TAG} }, \\
	{ MODKEY|ControlMask,           KEY,      toggleview,     {.ui = 1 << TAG} }, \\
	{ MODKEY|ShiftMask,             KEY,      tag,            {.ui = 1 << TAG} }, \\
	{ MODKEY|ControlMask|ShiftMask, KEY,      toggletag,      {.ui = 1 << TAG} },

/* helper for spawning shell commands in the pre dwm-5.0 fashion */
#define SHCMD(cmd) { .v = (const char*[]){ "/bin/sh", "-c", cmd, NULL } }

/* commands */
static char dmenumon[2] = "0"; /* component of dmenucmd, manipulated in spawn() */
static const char *dmenucmd[] = { "dmenu_run", "-m", dmenumon, "-fn", dmenufont, "-nb", col_gray1, "-nf", col_gray3, "-sb", col_cyan, "-sf", col_gray4, NULL };
static const char *termcmd[]  = { "${c.terminal}", NULL };
static const char *browsercmd[] = { "${c.browser}", NULL };

static const Key keys[] = {
    { MODKEY, XK_${c.shortcuts.terminal}, spawn, {.v = termcmd} },
    { MODKEY, XK_${c.shortcuts.browser}, spawn, {.v = browsercmd} },
    { MODKEY, XK_${c.shortcuts.launcher}, spawn, {.v = dmenucmd} },
    { MODKEY, XK_${c.shortcuts.close}, killclient, {0} },
    { MODKEY|ShiftMask, XK_e, quit, {0} },
    { MODKEY|ShiftMask, XK_Return, zoom, {0} },
	/* modifier                     key        function        argument */
	{ MODKEY,                       XK_j,      focusstack,     {.i = +1 } },
	{ MODKEY,                       XK_k,      focusstack,     {.i = -1 } },
	{ MODKEY,                       XK_Tab,    view,           {0} },
	{ MODKEY,                       XK_space,  setlayout,      {0} },
	{ MODKEY|ShiftMask,             XK_space,  togglefloating, {0} },
	{ MODKEY,                       XK_0,      view,           {.ui = ~0 } },
	{ MODKEY|ShiftMask,             XK_0,      tag,            {.ui = ~0 } },
	{ MODKEY,                       XK_comma,  focusmon,       {.i = -1 } },
	{ MODKEY,                       XK_period, focusmon,       {.i = +1 } },
	{ MODKEY|ShiftMask,             XK_comma,  tagmon,         {.i = -1 } },
	{ MODKEY|ShiftMask,             XK_period, tagmon,         {.i = +1 } },
	TAGKEYS(                        XK_1,                      0)
	TAGKEYS(                        XK_2,                      1)
	TAGKEYS(                        XK_3,                      2)
	TAGKEYS(                        XK_4,                      3)
	TAGKEYS(                        XK_5,                      4)
	TAGKEYS(                        XK_6,                      5)
	TAGKEYS(                        XK_7,                      6)
	TAGKEYS(                        XK_8,                      7)
	TAGKEYS(                        XK_9,                      8)
};

/* button definitions */
/* click can be ClkTagBar, ClkLtSymbol, ClkStatusText, ClkWinTitle, ClkClientWin, or ClkRootWin */
static const Button buttons[] = {
	/* click                event mask      button          function        argument */
	{ ClkLtSymbol,          0,              Button1,        setlayout,      {0} },
	{ ClkLtSymbol,          0,              Button3,        setlayout,      {.v = &layouts[2]} },
	{ ClkWinTitle,          0,              Button2,        zoom,           {0} },
	{ ClkStatusText,        0,              Button2,        spawn,          {.v = termcmd } },
	{ ClkClientWin,         MODKEY,         Button1,        movemouse,      {0} },
	{ ClkClientWin,         MODKEY,         Button2,        togglefloating, {0} },
	{ ClkClientWin,         MODKEY,         Button3,        resizemouse,    {0} },
	{ ClkTagBar,            0,              Button1,        view,           {0} },
	{ ClkTagBar,            0,              Button3,        toggleview,     {0} },
	{ ClkTagBar,            MODKEY,         Button1,        tag,            {0} },
	{ ClkTagBar,            MODKEY,         Button3,        toggletag,      {0} },
};

`;
 const files = {[c.file]:header};
 if (c.wallpaper) files['xinitrc.dwm'] = `#!/bin/sh
feh --bg-fill "${wallpaperPath}"
exec "$HOME/.local/bin/dwm"
`;
 return files;
}

const render = {xmonad,dwm,i3:tiling,sway:tiling,hyprland,niri,labwc,awesome};
export function generate(options) {
 const config=normalize(options);
 return render[config.wm](config);
}
