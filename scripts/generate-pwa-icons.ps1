Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

function New-RoundedRectPath {
  param(
    [float]$x,
    [float]$y,
    [float]$width,
    [float]$height,
    [float]$radius
  )

  $diameter = $radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-PointF {
  param([float]$x, [float]$y)
  return New-Object System.Drawing.PointF($x, $y)
}

function Save-QuranuIcon {
  param(
    [int]$size,
    [string]$outputPath
  )

  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $scale = $size / 512.0
  $contentScale = if ($size -le 16) { 1.12 } elseif ($size -le 32) { 1.08 } else { 1.0 }

  function Map-Content([float]$value) {
    return (((($value - 256.0) * $contentScale) + 256.0) * $scale)
  }

  $bgRect = New-Object System.Drawing.RectangleF (24 * $scale), (24 * $scale), (464 * $scale), (464 * $scale)
  $bgStart = [System.Drawing.ColorTranslator]::FromHtml("#FFF8EE")
  $bgEnd = [System.Drawing.ColorTranslator]::FromHtml("#F1E4CF")
  $strokeStart = [System.Drawing.ColorTranslator]::FromHtml("#14968B")
  $strokeEnd = [System.Drawing.ColorTranslator]::FromHtml("#0A5C56")
  $accentStart = [System.Drawing.ColorTranslator]::FromHtml("#F8B84A")
  $accentEnd = [System.Drawing.ColorTranslator]::FromHtml("#E59D2C")
  $borderColor = [System.Drawing.ColorTranslator]::FromHtml("#DCC8A8")

  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-PointF (72 * $scale) (52 * $scale)),
    (New-PointF (434 * $scale) (458 * $scale)),
    $bgStart,
    $bgEnd
  )
  $bgPath = New-RoundedRectPath (24 * $scale) (24 * $scale) (464 * $scale) (464 * $scale) (120 * $scale)
  $graphics.FillPath($bgBrush, $bgPath)

  $borderPen = New-Object System.Drawing.Pen $borderColor, (12 * $scale)
  $graphics.DrawPath($borderPen, $bgPath)

  $qBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-PointF (132 * $scale) (122 * $scale)),
    (New-PointF (378 * $scale) (392 * $scale)),
    $strokeStart,
    $strokeEnd
  )
  $qPen = New-Object System.Drawing.Pen $qBrush, (32 * $scale * $contentScale)
  $qPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $qRect = New-Object System.Drawing.RectangleF (Map-Content 143.3), (Map-Content 143.3), (223.3 * $scale * $contentScale), (223.3 * $scale * $contentScale)
  $graphics.DrawEllipse($qPen, $qRect)

  $tailPen = New-Object System.Drawing.Pen $qBrush, (28 * $scale * $contentScale)
  $tailPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $tailPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($tailPen, (Map-Content 350.5), (Map-Content 350.5), (Map-Content 401), (Map-Content 401))

  $uPen = New-Object System.Drawing.Pen $qBrush, (30 * $scale * $contentScale)
  $uPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $uPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $uPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $uPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $uPath.AddLine((Map-Content 209), (Map-Content 176), (Map-Content 209), (Map-Content 277.5))
  $uPath.AddArc((Map-Content 209), (Map-Content 224), (107 * $scale * $contentScale), (107 * $scale * $contentScale), 180, 180)
  $uPath.AddLine((Map-Content 316), (Map-Content 277.5), (Map-Content 316), (Map-Content 176))
  $graphics.DrawPath($uPen, $uPath)

  $accentBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-PointF (180 * $scale) (154 * $scale)),
    (New-PointF (318 * $scale) (334 * $scale)),
    $accentStart,
    $accentEnd
  )
  $accentPen = New-Object System.Drawing.Pen $accentBrush, (18 * $scale * $contentScale)
  $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($accentPen, (Map-Content 303.5), (Map-Content 185.5), (Map-Content 334), (Map-Content 155))
  $graphics.FillEllipse($accentBrush, (Map-Content 316), (Map-Content 137), (36 * $scale * $contentScale), (36 * $scale * $contentScale))

  $directory = Split-Path -Parent $outputPath
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }

  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $accentBrush.Dispose()
  $accentPen.Dispose()
  $uPath.Dispose()
  $uPen.Dispose()
  $tailPen.Dispose()
  $qPen.Dispose()
  $qBrush.Dispose()
  $borderPen.Dispose()
  $bgPath.Dispose()
  $bgBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$iconsRoot = Join-Path $root "assets\\icons"

$targets = @(
  @{ Size = 512; Path = (Join-Path $iconsRoot "icon-512-v2.png") },
  @{ Size = 192; Path = (Join-Path $iconsRoot "icon-192-v2.png") },
  @{ Size = 180; Path = (Join-Path $iconsRoot "apple-touch-icon-v2.png") },
  @{ Size = 32; Path = (Join-Path $iconsRoot "favicon-32-v2.png") },
  @{ Size = 16; Path = (Join-Path $iconsRoot "favicon-16-v2.png") }
)

foreach ($target in $targets) {
  Save-QuranuIcon -size $target.Size -outputPath $target.Path
}

Get-ChildItem $iconsRoot\icon-512-v2.png, $iconsRoot\icon-192-v2.png, $iconsRoot\apple-touch-icon-v2.png, $iconsRoot\favicon-32-v2.png, $iconsRoot\favicon-16-v2.png |
  Select-Object Name, Length, LastWriteTime
