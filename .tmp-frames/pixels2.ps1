Add-Type -AssemblyName System.Drawing

function Sample-Pixel {
    param([string]$Path, [int]$X, [int]$Y, [string]$Label)
    $bmp = [System.Drawing.Bitmap]::FromFile($Path)
    $c = $bmp.GetPixel([Math]::Min($X, $bmp.Width-1), [Math]::Min($Y, $bmp.Height-1))
    Write-Output ("{0,-28} #{1:X2}{2:X2}{3:X2}  rgb({1},{2},{3})  {4}x{5}" -f $Label, $c.R, $c.G, $c.B, $bmp.Width, $bmp.Height)
    $bmp.Dispose()
}

$f1 = "F:\BubbleCore\.tmp-frames\f_01.jpg"
$f3 = "F:\BubbleCore\.tmp-frames\f_03.jpg"
$f5 = "F:\BubbleCore\.tmp-frames\f_05.jpg"
$f7 = "F:\BubbleCore\.tmp-frames\f_07.jpg"
$f13 = "F:\BubbleCore\.tmp-frames\f_13.jpg"
$f17 = "F:\BubbleCore\.tmp-frames\f_17.jpg"
$f18 = "F:\BubbleCore\.tmp-frames\f_18.jpg"

Write-Output "=== f01 HERO ==="
Sample-Pixel $f1 80 200 "hero left orange"
Sample-Pixel $f1 200 250 "hero left2"
Sample-Pixel $f1 550 250 "hero mid"
Sample-Pixel $f1 900 250 "hero right teal"
Sample-Pixel $f1 1000 400 "hero far right"
Sample-Pixel $f1 80 80 "ticker"
Sample-Pixel $f1 500 80 "nav bg"
Sample-Pixel $f1 550 500 "cream below"
Sample-Pixel $f1 200 180 "headline white?"
Sample-Pixel $f1 300 180 "20% yellow?"

Write-Output "`n=== f03 CARDS ==="
Sample-Pixel $f3 80 80 "page bg"
Sample-Pixel $f3 200 350 "card"
Sample-Pixel $f3 150 280 "purple blob?"
Sample-Pixel $f3 400 280 "green blob?"
Sample-Pixel $f3 650 280 "red blob?"
Sample-Pixel $f3 900 280 "blue blob?"
Sample-Pixel $f3 200 80 "heading dark"
Sample-Pixel $f3 80 150 "beverages orange label"

Write-Output "`n=== f05 MENU ==="
Sample-Pixel $f5 80 80 "bg"
Sample-Pixel $f5 80 220 "active cat"
Sample-Pixel $f5 80 280 "hover cat?"
Sample-Pixel $f5 400 400 "card"
Sample-Pixel $f5 500 500 "price"
Sample-Pixel $f5 980 500 "plus btn"
Sample-Pixel $f5 1000 850 "scroll teal?"

Write-Output "`n=== f07 ORANGE WAVE ==="
Sample-Pixel $f7 500 700 "orange wave"
Sample-Pixel $f7 200 200 "cream"
Sample-Pixel $f7 500 350 "our material orange"

Write-Output "`n=== f13 PACKAGES ==="
Sample-Pixel $f13 80 80 "cream"
Sample-Pixel $f13 200 400 "card"
Sample-Pixel $f13 500 800 "footer orange"
Sample-Pixel $f13 200 250 "eyebrow orange"
Sample-Pixel $f13 800 400 "teal tag?"

Write-Output "`n=== f17 ARABIC HERO ==="
Sample-Pixel $f17 100 300 "left spheres"
Sample-Pixel $f17 800 250 "right teal text?"
Sample-Pixel $f17 200 200 "gradient"
Sample-Pixel $f17 900 200 "gradient right"

Write-Output "`n=== f18 HERO ==="
Sample-Pixel $f18 100 200 "teal top"
Sample-Pixel $f18 100 500 "orange bottom"
Sample-Pixel $f18 550 200 "mid"
Sample-Pixel $f18 900 400 "cta navy?"
