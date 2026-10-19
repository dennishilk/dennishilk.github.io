
import XMonad
import Data.List (find)
import Data.Monoid (All(..))
import qualified Data.Map as M
import qualified XMonad.StackSet as W

import XMonad.Actions.AfterDrag (afterDrag)
import XMonad.Actions.Navigation2D (withNavigation2DConfig, windowSwap, Direction2D(..))
import XMonad.Actions.UpdateFocus (focusOnMouseMove, focusUnderPointer)
import XMonad.Hooks.EwmhDesktops (ewmh, ewmhFullscreen)
import XMonad.Hooks.ManageDocks (avoidStruts, docks)
import XMonad.Hooks.ManageHelpers (isDialog)
import XMonad.Layout.MouseResizableTile (mouseResizableTile, mouseResizableTileMirrored)
import XMonad.Layout.Spacing (spacingRaw, Border(..))
import XMonad.Util.EZConfig (additionalKeysP)
import XMonad.Util.SpawnOnce (spawnOnce)

myStartupHook :: X ()
myStartupHook = do
  spawnOnce "bash \"$HOME/.config/cthulhu/monitors.sh\""
  spawnOnce "picom --backend xrender --daemon"
  spawnOnce "dunst"
  spawnOnce "xsetroot -cursor_name left_ptr"
  spawnOnce "xmobar ~/.xmobarrc"

mouseScreenHook :: Event -> X All
mouseScreenHook MotionEvent { ev_x = x, ev_y = y, ev_window = w } = do
  root <- asks theRoot
  if w /= root then pure (All True) else do
    ws <- gets windowset
    let screens = W.current ws : W.visible ws
        inside sc =
          let r = screenRect (W.screenDetail sc)
              px = fromIntegral x :: Int
              py = fromIntegral y :: Int
              left = fromIntegral (rect_x r) :: Int
              top = fromIntegral (rect_y r) :: Int
              right = left + fromIntegral (rect_width r)
              bottom = top + fromIntegral (rect_height r)
          in px >= left && px < right && py >= top && py < bottom
    case find inside screens of
      Just sc | W.screen sc /= W.screen (W.current ws) ->
        windows (W.view (W.tag (W.workspace sc)))
      _ -> pure ()
    pure (All True)
mouseScreenHook _ = pure (All True)

moveToScreenAndTile :: Window -> X ()
moveToScreenAndTile w = do
  d <- asks display
  root <- asks theRoot
  (_, _, _, px, py, _, _, _) <- io $ queryPointer d root
  destination <- pointScreen (fromIntegral px) (fromIntegral py)
  case destination of
    Just sc -> windows (W.sink w . W.shiftWin (W.tag (W.workspace sc)) w)
    Nothing -> windows (W.sink w)

myMouseBindings (XConfig { modMask = modm }) = M.fromList
  [ ((modm, button1), \w -> focus w >> mouseMoveWindow w >> afterDrag (moveToScreenAndTile w))
  , ((modm, button2), \w -> focus w >> windows W.shiftMaster)
  , ((modm, button3), \w -> focus w >> mouseResizeWindow w >> windows W.shiftMaster)
  ]

toggleFloat :: Window -> X ()
toggleFloat w = do
  floating <- gets (W.floating . windowset)
  if M.member w floating
    then windows (W.sink w)
    else windows (W.float w (W.RationalRect 0.15 0.15 0.7 0.7))

main :: IO ()
main = xmonad $ ewmhFullscreen $ ewmh $ withNavigation2DConfig def $ docks $ def
  { modMask     = mod4Mask
  , terminal    = "kitty"
  , borderWidth = 2
  , normalBorderColor = "#393836"
  , focusedBorderColor = "#87a987"
  , startupHook = myStartupHook
  , focusFollowsMouse = True
  , mouseBindings = myMouseBindings
  , rootMask = rootMask def .|. pointerMotionMask
  , handleEventHook = handleEventHook def <+> focusOnMouseMove <+> mouseScreenHook
  , manageHook = manageHook def <+> (isDialog --> doFloat)
  , layoutHook = avoidStruts $ spacingRaw False (Border 8 8 8 8) True (Border 6 6 6 6) True $ (mouseResizableTile ||| mouseResizableTileMirrored ||| Full)
  }
  `additionalKeysP`
  [ ("M-t",        spawn "thunar")
  , ("M-m",        spawn "mousepad")
  , ("M-f", withFocused toggleFloat)
  , ("M-<Left>", focusUnderPointer >> windowSwap L False)
  , ("M-<Right>", focusUnderPointer >> windowSwap R False)
  , ("M-<Return>", spawn "kitty")
  , ("M-q",        kill)
  , ("M-b",        spawn "google-chrome-stable")
  , ("M-o",        spawn "obs")
  , ("M-v",        spawn "code")
  , ("M-d",        spawn "rofi -show drun")
  , ("<Print>", spawn "mkdir -p ~/Bilder/Screenshots && maim -s ~/Bilder/Screenshots/$(date +%Y-%m-%d_%H-%M-%S).png")

  , ("<XF86AudioRaiseVolume>", spawn "$HOME/.local/bin/cthulhu-audio up")
  , ("<XF86AudioLowerVolume>", spawn "$HOME/.local/bin/cthulhu-audio down")
  , ("<XF86AudioMute>",        spawn "$HOME/.local/bin/cthulhu-audio mute")
  , ("<XF86AudioMicMute>",     spawn "$HOME/.local/bin/cthulhu-audio mic")

  , ("M-C-r", spawn "xmonad --recompile && xmonad --restart")
  ]
