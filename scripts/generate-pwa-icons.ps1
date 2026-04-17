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
  $qPen = New-Object System.Drawing.Pen $qBrush, (32 * $scale)
  $qPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $qRect = New-Object System.Drawing.RectangleF (143.3 * $scale), (143.3 * $scale), (223.3 * $scale), (223.3 * $scale)
  $graphics.DrawEllipse($qPen, $qRect)

  $tailPen = New-Object System.Drawing.Pen $qBrush, (28 * $scale)
  $tailPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $tailPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($tailPen, (350.5 * $scale), (350.5 * $scale), (401 * $scale), (401 * $scale))

  $uPen = New-Object System.Drawing.Pen $qBrush, (30 * $scale)
  $uPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $uPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $uPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $uPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $uPath.AddLine((209 * $scale), (176 * $scale), (209 * $scale), (277.5 * $scale))
  $uPath.AddArc((209 * $scale), (224 * $scale), (107 * $scale), (107 * $scale), 180, 180)
  $uPath.AddLine((316 * $scale), (277.5 * $scale), (316 * $scale), (176 * $scale))
  $graphics.DrawPath($uPen, $uPath)

  $accentBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-PointF (180 * $scale) (154 * $scale)),
    (New-PointF (318 * $scale) (334 * $scale)),
    $accentStart,
    $accentEnd
  )
  $accentPen = New-Object System.Drawing.Pen $accentBrush, (18 * $scale)
  $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($accentPen, (303.5 * $scale), (185.5 * $scale), (334 * $scale), (155 * $scale))
  $graphics.FillEllipse($accentBrush, (316 * $scale), (137 * $scale), (36 * $scale), (36 * $scale))

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
