Add-Type -AssemblyName System.Drawing

function Sample-Pixel {
    param([string]$Path, [int]$X, [int]$Y, [string]$Label)
    $bmp = [System.Drawing.Bitmap]::FromFile($Path)
    $c = $bmp.GetPixel([Math]::Min($X, $bmp.Width-1), [Math]::Min($Y, $bmp.Height-1))
    Write-Output ("{0,-22} #{1:X2}{2:X2}{3:X2}  rgb({1},{2},{3})  {4}x{5} at {6},{7}" -f $Label, $c.R, $c.G, $c.B, $bmp.Width, $bmp.Height, $X, $Y)
    $bmp.Dispose()
}

# Full frames
$teal = "F:\BubbleCore\.tmp-frames\hi_teal.png"
$orange = "F:\BubbleCore\.tmp-frames\hi_orange.png"
$cards = "F:\BubbleCore\.tmp-frames\hi_cards.png"
$pdp = "F:\BubbleCore\.tmp-frames\hi_pdp.png"

Write-Output "=== TEAL HERO ==="
Sample-Pixel $teal 200 200 "hero teal left"
Sample-Pixel $teal 400 180 "hero teal mid"
Sample-Pixel $teal 1600 200 "hero orange right"
Sample-Pixel $teal 950 80 "nav bg"
Sample-Pixel $teal 100 80 "logo area"
Sample-Pixel $teal 900 700 "cream below"

Write-Output "`n=== ORANGE BAND ==="
Sample-Pixel $orange 400 700 "orange band"
Sample-Pixel $orange 200 200 "cream bg"
Sample-Pixel $orange 950 80 "nav"
Sample-Pixel $orange 1600 80 "location pill"

Write-Output "`n=== CARDS ==="
Sample-Pixel $cards 80 80 "cream bg"
Sample-Pixel $cards 400 400 "card white?"
Sample-Pixel $cards 200 500 "orange section?"
Sample-Pixel $cards 1000 80 "nav"

Write-Output "`n=== PDP ==="
Sample-Pixel $pdp 80 80 "cream"
Sample-Pixel $pdp 1400 400 "price orange?"
Sample-Pixel $pdp 1600 700 "add btn?"
Sample-Pixel $pdp 200 250 "active cat?"
