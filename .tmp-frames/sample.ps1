Add-Type -AssemblyName System.Drawing

function Get-TopColors {
    param([string]$Path, [int]$Top = 14)

    $bmp = [System.Drawing.Bitmap]::FromFile($Path)
    $counts = @{}
    for ($y = 0; $y -lt $bmp.Height; $y += 3) {
        for ($x = 0; $x -lt $bmp.Width; $x += 3) {
            $c = $bmp.GetPixel($x, $y)
            $key = '{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B
            if ($counts.ContainsKey($key)) { $counts[$key]++ } else { $counts[$key] = 1 }
        }
    }
    $bmp.Dispose()

    $total = ($counts.Values | Measure-Object -Sum).Sum
    Write-Output "=== $([System.IO.Path]::GetFileName($Path)) ==="
    $counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First $Top | ForEach-Object {
        $pct = [math]::Round(100 * $_.Value / $total, 2)
        Write-Output ("#{0}  {1}%" -f $_.Key, $pct)
    }
    Write-Output ""
}

Get-ChildItem "F:\BubbleCore\.tmp-frames" -Filter *.png | ForEach-Object { Get-TopColors $_.FullName }
